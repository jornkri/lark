import IdentityManager from "@arcgis/core/identity/IdentityManager.js";
import { SERVICE_NAME, LAYER_DEFINITIONS } from "../config/dataModel.js";

const PORTAL_URL = "https://www.arcgis.com";
const STORAGE_KEY = "lark_service_url";

async function getCredentials() {
  const cred = await IdentityManager.getCredential(`${PORTAL_URL}/sharing`);
  return { token: cred.token, username: cred.userId };
}

async function findExistingService(username, token) {
  const params = new URLSearchParams({
    q: `title:"${SERVICE_NAME}" AND owner:${username} AND type:"Feature Service"`,
    num: "1",
    f: "json",
    token,
  });
  const res = await fetch(`${PORTAL_URL}/sharing/rest/search?${params}`);
  const data = await res.json();
  if (data.error) throw new Error(`Søk feilet: ${JSON.stringify(data.error)}`);
  return data.results?.[0] ?? null;
}

async function deleteServiceItem(itemId, username, token) {
  const body = new URLSearchParams({ f: "json", token });
  await fetch(
    `${PORTAL_URL}/sharing/rest/content/users/${username}/items/${itemId}/delete`,
    { method: "POST", body }
  );
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

// Legger til ett lag om gangen – unngår domenekonflikter i batch
async function addLayersToService(serviceUrl, token, onStatus) {
  const adminUrl = toAdminUrl(serviceUrl);

  for (const layerDef of LAYER_DEFINITIONS) {
    const layer = stripLayerMeta(layerDef);
    onStatus?.(`Oppretter lag: ${layer.name}…`);

    const payload = JSON.stringify({ layers: [layer] });
    const body = new URLSearchParams({ addToDefinition: payload, f: "json", token });

    const res = await fetch(`${adminUrl}/addToDefinition`, { method: "POST", body });
    const text = await res.text();
    console.log(`[LARK] addToDefinition [${layer.name}]:`, text);

    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error(`Ugyldig svar fra AGOL: ${text.slice(0, 300)}`); }

    if (data.error) {
      const details = Array.isArray(data.error.details)
        ? data.error.details.join(" | ")
        : "";
      const msg = data.error.message || data.error.description || JSON.stringify(data.error);
      throw new Error(`Lag «${layer.name}» feilet: ${msg} ${details}`.trim());
    }
  }
}

async function serviceHasLayers(serviceUrl, token) {
  const params = new URLSearchParams({ f: "json", token });
  const res = await fetch(`${serviceUrl}?${params}`);
  const data = await res.json();
  return (data.layers?.length ?? 0) > 0;
}

export async function ensureLarkService(onStatus) {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  const { token, username } = await getCredentials();

  onStatus?.("Søker etter eksisterende LARK-tjeneste…");
  const existing = await findExistingService(username, token);

  if (existing?.url) {
    const hasLayers = await serviceHasLayers(existing.url, token);
    if (hasLayers) {
      localStorage.setItem(STORAGE_KEY, existing.url);
      return existing.url;
    }
    // Tom tjeneste fra mislykket forsøk – slett og start på nytt
    onStatus?.("Sletter ufullstendig tjeneste…");
    await deleteServiceItem(existing.id, username, token);
  }

  onStatus?.("Oppretter Feature Service i ArcGIS Online…");
  const created = await createFeatureService(username, token);
  const serviceUrl = created.serviceurl ?? created.encodedServiceURL;

  // Vent til tjenesten er klar
  await new Promise((r) => setTimeout(r, 2000));

  await addLayersToService(serviceUrl, token, onStatus);

  localStorage.setItem(STORAGE_KEY, serviceUrl);
  return serviceUrl;
}

export function clearServiceCache() {
  localStorage.removeItem(STORAGE_KEY);
}
