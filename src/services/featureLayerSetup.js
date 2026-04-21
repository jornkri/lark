import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import { SERVICE_NAME, LAYER_DEFINITIONS } from "../config/dataModel.js";

const PORTAL_URL = "https://www.arcgis.com";
const STORAGE_KEY = "lark_service_url";

async function getCredentials() {
  const cred = await IdentityManager.getCredential(`${PORTAL_URL}/sharing`);
  return { token: cred.token, username: cred.userId };
}

async function findExistingService(username, token) {
  // Content API is more reliable than search (no indexing delay)
  let start = 1;
  while (true) {
    const params = new URLSearchParams({ f: "json", token, num: "100", start: String(start) });
    const res = await fetch(`${PORTAL_URL}/sharing/rest/content/users/${username}?${params}`);
    const data = await res.json();
    if (!data.error) {
      const item = (data.items ?? []).find(
        (i) => i.title === SERVICE_NAME && i.type === "Feature Service"
      );
      if (item) return item;
      if (data.nextStart === -1 || (data.items ?? []).length < 100) break;
      start = data.nextStart;
    } else {
      break;
    }
  }
  // Fallback: search API (may lag behind)
  const searchParams = new URLSearchParams({
    q: `title:"${SERVICE_NAME}" AND owner:${username} AND type:"Feature Service"`,
    num: "1",
    f: "json",
    token,
  });
  const searchRes = await fetch(`${PORTAL_URL}/sharing/rest/search?${searchParams}`);
  const searchData = await searchRes.json();
  return searchData.results?.[0] ?? null;
}

async function createFeatureService(username, token) {
  const createParameters = {
    name: SERVICE_NAME,
    serviceDescription: "Landskapsplan opprettet med LARK",
    hasStaticData: false,
    maxRecordCount: 10000,
    supportedQueryFormats: "JSON",
    capabilities: "Query,Editing,Create,Update,Delete,Sync",
    allowGeometryUpdates: true,
    units: "esriMeters",
    xssPreventionInfo: {
      xssPreventionEnabled: true,
      xssPreventionRule: "InputOutput",
      xssInputRule: "rejectInvalid",
    },
  };
  const body = new URLSearchParams({
    createParameters: JSON.stringify(createParameters),
    outputType: "featureService",
    f: "json",
    token,
  });
  const res = await fetch(
    `${PORTAL_URL}/sharing/rest/content/users/${username}/createService`,
    { method: "POST", body }
  );
  const data = await res.json();
  if (!data.success) throw new Error(`Opprettelse feilet: ${JSON.stringify(data.error)}`);
  return data;
}

// Schema-operasjoner krever /rest/admin/services/ (ikke /rest/services/)
function toAdminUrl(serviceUrl) {
  return serviceUrl.replace("/rest/services/", "/rest/admin/services/");
}

function stripLayerMeta({ id: _id, drawingInfo: _di, allowGeometryUpdates: _ag, ...rest }) {
  return rest;
}

async function getExistingLayerCount(serviceUrl, token) {
  const params = new URLSearchParams({ f: "json", token });
  const res = await fetch(`${serviceUrl}?${params}`);
  const data = await res.json();
  return data.layers?.length ?? 0;
}

// Legger til lag fra og med `startIndex` – kan gjenoppta etter delvis feil
async function addLayersToService(serviceUrl, token, onStatus, startIndex = 0) {
  const adminUrl = toAdminUrl(serviceUrl);
  const remaining = LAYER_DEFINITIONS.slice(startIndex);

  for (const layerDef of remaining) {
    const layer = stripLayerMeta(layerDef);
    onStatus?.(`Oppretter lag ${layerDef.id + 1}/${LAYER_DEFINITIONS.length}: ${layer.name}…`);

    const body = new URLSearchParams({
      addToDefinition: JSON.stringify({ layers: [layer] }),
      f: "json",
      token,
    });

    const res = await fetch(`${adminUrl}/addToDefinition`, { method: "POST", body });
    const text = await res.text();
    console.log(`[LARK] addToDefinition [${layer.name}]:`, text);

    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error(`Ugyldig svar: ${text.slice(0, 300)}`); }

    if (data.error) {
      const details = Array.isArray(data.error.details)
        ? data.error.details.join(" | ")
        : "";
      const msg = data.error.message || data.error.description || JSON.stringify(data.error);
      throw new Error(`Lag «${layer.name}» feilet: ${msg} ${details}`.trim());
    }
  }
}

export async function ensureLarkService(onStatus) {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  const { token, username } = await getCredentials();

  onStatus?.("Søker etter eksisterende LARK-tjeneste…");
  const existing = await findExistingService(username, token);

  let serviceUrl;

  if (existing?.url) {
    serviceUrl = existing.url;
    const existingCount = await getExistingLayerCount(serviceUrl, token);

    if (existingCount >= LAYER_DEFINITIONS.length) {
      // Alle lag finnes – tjenesten er klar
      localStorage.setItem(STORAGE_KEY, serviceUrl);
      return serviceUrl;
    }

    // Delvis provisjonert – fortsett fra der det stoppet
    onStatus?.(`Fortsetter lagoppretting (${existingCount}/${LAYER_DEFINITIONS.length} ferdig)…`);
    await addLayersToService(serviceUrl, token, onStatus, existingCount);
  } else {
    onStatus?.("Oppretter Feature Service i ArcGIS Online…");
    let created;
    try {
      created = await createFeatureService(username, token);
    } catch (e) {
      if (e.message?.includes("already exists")) {
        // Tjenesten finnes men dukket ikke opp i innholdssøket (f.eks. indeksforsinkelse).
        // Vent litt og prøv å finne den igjen.
        onStatus?.("Tjeneste finnes allerede – søker på nytt…");
        await new Promise((r) => setTimeout(r, 3000));
        const retry = await findExistingService(username, token);
        if (!retry?.url) {
          throw new Error(
            `Tjenesten «${SERVICE_NAME}» eksisterer allerede i din ArcGIS Online-konto, ` +
            `men kan ikke hentes automatisk. Gå til arcgis.com/home/content.html og slett ` +
            `elementet «${SERVICE_NAME}», og last deretter siden på nytt.`
          );
        }
        serviceUrl = retry.url;
        const existingCount = await getExistingLayerCount(serviceUrl, token);
        if (existingCount < LAYER_DEFINITIONS.length) {
          await addLayersToService(serviceUrl, token, onStatus, existingCount);
        }
        localStorage.setItem(STORAGE_KEY, serviceUrl);
        return serviceUrl;
      }
      throw e;
    }
    serviceUrl = created.serviceurl ?? created.encodedServiceURL;

    // Vent til tjenesten er tilgjengelig
    await new Promise((r) => setTimeout(r, 2000));
    await addLayersToService(serviceUrl, token, onStatus, 0);
  }

  localStorage.setItem(STORAGE_KEY, serviceUrl);
  return serviceUrl;
}

export function clearServiceCache() {
  localStorage.removeItem(STORAGE_KEY);
}
