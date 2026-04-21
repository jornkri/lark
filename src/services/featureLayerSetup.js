import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import { SERVICE_NAME, LAYER_DEFINITIONS } from "../config/dataModel.js";

const PORTAL_URL = "https://www.arcgis.com";
const STORAGE_KEY = "lark_service_url";

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getCredentials() {
  const cred = await IdentityManager.getCredential(`${PORTAL_URL}/sharing`);
  return { token: cred.token, username: cred.userId };
}

// ── Felt-normalisering ────────────────────────────────────────────────────────
// Dokumentasjonen krever sqlType, eksplisitt domain: null og defaultValue: null

const SQL_TYPE = {
  esriFieldTypeString:       "sqlTypeNVarchar",
  esriFieldTypeDouble:       "sqlTypeFloat",
  esriFieldTypeInteger:      "sqlTypeInteger",
  esriFieldTypeSmallInteger: "sqlTypeSmallInt",
  esriFieldTypeDate:         "sqlTypeOther",
  esriFieldTypeOID:          "sqlTypeOther",
  esriFieldTypeGlobalID:     "sqlTypeOther",
};

function normalizeField(f) {
  const out = {
    name:         f.name,
    type:         f.type,
    alias:        f.alias,
    sqlType:      SQL_TYPE[f.type] ?? "sqlTypeOther",
    nullable:     f.nullable ?? true,
    editable:     f.editable ?? true,
    domain:       f.domain ?? null,
    defaultValue: null,
  };
  if (f.length !== undefined) out.length = f.length;
  return out;
}

function buildLayerPayload(def) {
  return {
    name:                 def.name,
    geometryType:         def.geometryType,
    description:          def.description ?? "",
    hasZ:                 false,
    hasM:                 false,
    allowGeometryUpdates: true,
    hasAttachments:       false,
    htmlPopupType:        "esriServerHTMLPopupTypeNone",
    types:                [],
    relationships:        [],
    fields:               (def.fields ?? []).map(normalizeField),
  };
}

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

async function agolGet(url, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${url}?${qs}`);
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Ugyldig GET-svar fra ${url}: ${text.slice(0, 200)}`); }
}

async function agolPost(url, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(url, { method: "POST", body });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Ugyldig POST-svar fra ${url}: ${text.slice(0, 200)}`); }
}

function toAdminUrl(serviceUrl) {
  return serviceUrl.replace("/rest/services/", "/rest/admin/services/");
}

// ── Finn eksisterende tjeneste ───────────────────────────────────────────────

async function findExistingService(username, token) {
  // ── 1. Content API (root-mappe) ──────────────────────────────────────────
  let start = 1;
  while (true) {
    const data = await agolGet(
      `${PORTAL_URL}/sharing/rest/content/users/${username}`,
      { f: "json", token, num: "100", start: String(start) }
    );
    console.log("[LARK] content/users page", start, "→ items:", (data.items ?? []).map(i => `${i.title} (${i.type})`));
    const item = (data.items ?? []).find(
      (i) => i.title === SERVICE_NAME && i.type === "Feature Service"
    );
    if (item) { console.log("[LARK] Fant tjeneste via content API:", item); return item; }
    if (data.nextStart === -1 || (data.items ?? []).length < 100) break;
    start = data.nextStart;
  }

  // ── 2. Search API (fanger opp elementer i undermapper) ───────────────────
  const search = await agolGet(`${PORTAL_URL}/sharing/rest/search`, {
    q: `owner:${username} AND type:"Feature Service"`,
    num: "100",
    f: "json",
    token,
  });
  console.log("[LARK] search API →", (search.results ?? []).map(i => `${i.title} (${i.url})`));
  const found = (search.results ?? []).find((i) => i.title === SERVICE_NAME);
  if (found) { console.log("[LARK] Fant tjeneste via search:", found); return found; }

  // ── 3. Hent orgId fra portal og prøv kjente services-servere ────────────
  const portal = await agolGet(`${PORTAL_URL}/sharing/rest/portals/self`, { f: "json", token });
  const orgId = portal.id;
  console.log("[LARK] orgId:", orgId);
  if (orgId) {
    for (let n = 1; n <= 9; n++) {
      const url = `https://services${n}.arcgis.com/${orgId}/arcgis/rest/services/${SERVICE_NAME}/FeatureServer`;
      const info = await agolGet(url, { f: "json", token }).catch(() => null);
      if (info && !info.error) {
        console.log("[LARK] Fant tjeneste ved konstruert URL:", url);
        return { title: SERVICE_NAME, type: "Feature Service", url, id: null };
      }
    }
  }

  console.warn("[LARK] Fant ingen eksisterende tjeneste.");
  return null;
}

// ── Opprett Feature Service ──────────────────────────────────────────────────

async function createFeatureService(username, token) {
  const createParameters = {
    name:                  SERVICE_NAME,
    serviceDescription:    "Landskapsplan opprettet med LARK",
    hasStaticData:         false,
    maxRecordCount:        10000,
    supportedQueryFormats: "JSON",
    capabilities:          "Query,Editing,Create,Update,Delete,Sync",
    allowGeometryUpdates:  true,
    units:                 "esriMeters",
    spatialReference:      { wkid: 102100 },
    xssPreventionInfo: {
      xssPreventionEnabled: true,
      xssPreventionRule:    "InputOutput",
      xssInputRule:         "rejectInvalid",
    },
  };
  const data = await agolPost(
    `${PORTAL_URL}/sharing/rest/content/users/${username}/createService`,
    { createParameters: JSON.stringify(createParameters), outputType: "featureService", f: "json", token }
  );
  if (!data.success) throw new Error(`Opprettelse feilet: ${JSON.stringify(data.error ?? data)}`);
  return data;
}

// ── Antall lag i tjeneste ────────────────────────────────────────────────────

async function getExistingLayerCount(serviceUrl, token) {
  const data = await agolGet(serviceUrl, { f: "json", token });
  return data.layers?.length ?? 0;
}

// ── Legg til lag (ett om gangen) ─────────────────────────────────────────────

async function addLayersToService(serviceUrl, token, onStatus, startIndex = 0) {
  const adminUrl = toAdminUrl(serviceUrl);

  for (const def of LAYER_DEFINITIONS.slice(startIndex)) {
    onStatus?.(`Oppretter lag ${def.id + 1}/${LAYER_DEFINITIONS.length}: ${def.name}…`);
    const payload = buildLayerPayload(def);
    console.log(`[LARK] Layer payload [${def.name}]:`, JSON.stringify(payload, null, 2));

    const data = await agolPost(`${adminUrl}/addToDefinition`, {
      addToDefinition: JSON.stringify({ layers: [payload] }),
      f: "json",
      token,
    });

    if (data.error) {
      const details = Array.isArray(data.error.details)
        ? " | " + data.error.details.join(" | ")
        : "";
      const msg = data.error.message || data.error.description || JSON.stringify(data.error);
      throw new Error(`Lag «${def.name}» feilet: ${msg}${details}`);
    }
  }
}

// ── Hovedfunksjon ────────────────────────────────────────────────────────────

export async function ensureLarkService(onStatus) {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  onStatus?.("Autentiserer…");
  const { token, username } = await getCredentials();

  onStatus?.("Søker etter eksisterende LARK-tjeneste…");
  const existing = await findExistingService(username, token);

  let serviceUrl;

  if (existing?.url) {
    serviceUrl = existing.url;
    const existingCount = await getExistingLayerCount(serviceUrl, token);
    if (existingCount >= LAYER_DEFINITIONS.length) {
      localStorage.setItem(STORAGE_KEY, serviceUrl);
      return serviceUrl;
    }
    onStatus?.(`Fortsetter lagoppretting (${existingCount}/${LAYER_DEFINITIONS.length})…`);
    await addLayersToService(serviceUrl, token, onStatus, existingCount);
  } else {
    onStatus?.("Oppretter Feature Service i ArcGIS Online…");
    const created = await createFeatureService(username, token);
    serviceUrl = created.serviceurl ?? created.encodedServiceURL;
    await new Promise((r) => setTimeout(r, 3000));
    await addLayersToService(serviceUrl, token, onStatus, 0);
  }

  localStorage.setItem(STORAGE_KEY, serviceUrl);
  return serviceUrl;
}

export function clearServiceCache() {
  localStorage.removeItem(STORAGE_KEY);
}
