import esriRequest from "@arcgis/core/request.js";
import Portal from "@arcgis/core/portal/Portal.js";
import { SERVICE_NAME, LAYER_DEFINITIONS } from "../config/dataModel.js";

const PORTAL_URL = "https://www.arcgis.com";
const STORAGE_KEY = "lark_service_url";

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

const SQL_TYPE = {
  esriFieldTypeString:       "sqlTypeNVarchar",
  esriFieldTypeDouble:       "sqlTypeFloat",
  esriFieldTypeInteger:      "sqlTypeInteger",
  esriFieldTypeSmallInteger: "sqlTypeSmallInt",
  esriFieldTypeDate:         "sqlTypeOther",
  esriFieldTypeOID:          "sqlTypeOther",
  esriFieldTypeGlobalID:     "sqlTypeOther",
};

// Normaliser hvert felt til det formatet AGOL forventer i addToDefinition
function normalizeField(field) {
  return {
    name:         field.name,
    type:         field.type,
    alias:        field.alias,
    sqlType:      SQL_TYPE[field.type] ?? "sqlTypeOther",
    length:       field.length ?? undefined,
    nullable:     field.nullable ?? true,
    editable:     field.editable ?? true,
    domain:       field.domain ?? null,
    defaultValue: null,
  };
}

// Bygg komplett lag-objekt som AGOL forventer
function buildLayerPayload(layerDef) {
  return {
    id:                   layerDef.id,
    name:                 layerDef.name,
    type:                 "Feature Layer",
    geometryType:         layerDef.geometryType,
    description:          layerDef.description ?? "",
    hasZ:                 false,
    hasM:                 false,
    allowGeometryUpdates: true,
    drawingInfo:          layerDef.drawingInfo ?? null,
    fields:               (layerDef.fields ?? []).map(normalizeField),
  };
}

// ── Portal/brukerinfo ────────────────────────────────────────────────────────

async function getPortalInfo() {
  const portal = new Portal({ url: PORTAL_URL });
  await portal.load();
  return { portal, username: portal.user.username };
}

// ── Finn eksisterende tjeneste ───────────────────────────────────────────────

async function findExistingService(username) {
  // Bruk content-API (ingen søkeindeks-forsinkelse), med paginering
  let start = 1;
  while (true) {
    const data = await esriRequest(
      `${PORTAL_URL}/sharing/rest/content/users/${username}`,
      { query: { f: "json", num: 100, start } }
    ).then((r) => r.data);

    const item = (data.items ?? []).find(
      (i) => i.title === SERVICE_NAME && i.type === "Feature Service"
    );
    if (item) return item;
    if (data.nextStart === -1 || (data.items ?? []).length < 100) break;
    start = data.nextStart;
  }
  return null;
}

// ── Opprett Feature Service ──────────────────────────────────────────────────

async function createFeatureService(username) {
  const createParameters = {
    name:                 SERVICE_NAME,
    serviceDescription:   "Landskapsplan opprettet med LARK",
    hasStaticData:        false,
    maxRecordCount:       10000,
    supportedQueryFormats: "JSON",
    capabilities:         "Query,Editing,Create,Update,Delete,Sync",
    allowGeometryUpdates: true,
    units:                "esriMeters",
    xssPreventionInfo: {
      xssPreventionEnabled: true,
      xssPreventionRule:    "InputOutput",
      xssInputRule:         "rejectInvalid",
    },
  };

  const data = await esriRequest(
    `${PORTAL_URL}/sharing/rest/content/users/${username}/createService`,
    {
      method: "post",
      body: {
        createParameters: JSON.stringify(createParameters),
        outputType:       "featureService",
        f:                "json",
      },
    }
  ).then((r) => r.data);

  if (!data.success) {
    throw new Error(`Opprettelse feilet: ${JSON.stringify(data.error ?? data)}`);
  }
  return data;
}

// ── Admin-URL for skjema-operasjoner ─────────────────────────────────────────

function toAdminUrl(serviceUrl) {
  return serviceUrl.replace("/rest/services/", "/rest/admin/services/");
}

// ── Legg til lag (ett om gangen) ─────────────────────────────────────────────

async function addLayersToService(serviceUrl, onStatus, startIndex = 0) {
  const adminUrl = toAdminUrl(serviceUrl);
  const toAdd = LAYER_DEFINITIONS.slice(startIndex);

  for (const layerDef of toAdd) {
    onStatus?.(`Oppretter lag ${layerDef.id + 1}/${LAYER_DEFINITIONS.length}: ${layerDef.name}…`);

    const payload = buildLayerPayload(layerDef);
    console.log(`[LARK] addToDefinition [${layerDef.name}]:`, JSON.stringify(payload));

    const data = await esriRequest(`${adminUrl}/addToDefinition`, {
      method: "post",
      body: {
        addToDefinition: JSON.stringify({ layers: [payload] }),
        f: "json",
      },
    }).then((r) => r.data);

    if (data.error) {
      const details = Array.isArray(data.error.details)
        ? data.error.details.join(" | ")
        : "";
      const msg = data.error.message || data.error.description || JSON.stringify(data.error);
      throw new Error(`Lag «${layerDef.name}» feilet: ${msg} ${details}`.trim());
    }
    if (!data.success) {
      throw new Error(`Lag «${layerDef.name}»: uventet svar: ${JSON.stringify(data)}`);
    }
  }
}

// ── Sjekk antall lag i eksisterende tjeneste ─────────────────────────────────

async function getExistingLayerCount(serviceUrl) {
  const data = await esriRequest(serviceUrl, { query: { f: "json" } }).then((r) => r.data);
  return data.layers?.length ?? 0;
}

// ── Hovedfunksjon ────────────────────────────────────────────────────────────

export async function ensureLarkService(onStatus) {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  onStatus?.("Henter portalinformasjon…");
  const { username } = await getPortalInfo();

  onStatus?.("Søker etter eksisterende LARK-tjeneste…");
  const existing = await findExistingService(username);

  let serviceUrl;

  if (existing?.url) {
    serviceUrl = existing.url;
    const existingCount = await getExistingLayerCount(serviceUrl);

    if (existingCount >= LAYER_DEFINITIONS.length) {
      localStorage.setItem(STORAGE_KEY, serviceUrl);
      return serviceUrl;
    }

    onStatus?.(`Fortsetter lagoppretting (${existingCount}/${LAYER_DEFINITIONS.length} ferdig)…`);
    await addLayersToService(serviceUrl, onStatus, existingCount);
  } else {
    onStatus?.("Oppretter Feature Service i ArcGIS Online…");
    const created = await createFeatureService(username);
    serviceUrl = created.serviceurl ?? created.encodedServiceURL;

    await new Promise((r) => setTimeout(r, 2000));
    await addLayersToService(serviceUrl, onStatus, 0);
  }

  localStorage.setItem(STORAGE_KEY, serviceUrl);
  return serviceUrl;
}

export function clearServiceCache() {
  localStorage.removeItem(STORAGE_KEY);
}
