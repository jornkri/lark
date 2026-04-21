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
  if (data.error) throw new Error(`Søk feilet: ${data.error.message}`);
  return data.results?.[0] ?? null;
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
  if (!data.success) throw new Error(`Opprettelse av tjeneste feilet: ${data.error?.message}`);
  return data;
}

async function addLayersToService(serviceUrl, token) {
  const body = new URLSearchParams({
    addToDefinition: JSON.stringify({ layers: LAYER_DEFINITIONS }),
    f: "json",
    token,
  });

  const res = await fetch(`${serviceUrl}/addToDefinition`, { method: "POST", body });
  const data = await res.json();
  if (data.error) throw new Error(`Lagoppretting feilet: ${data.error.message}`);
  return data;
}

export async function ensureLarkService(onStatus) {
  // Return cached URL if still valid
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  const { token, username } = await getCredentials();

  onStatus?.("Søker etter eksisterende LARK-tjeneste...");
  const existing = await findExistingService(username, token);
  if (existing?.url) {
    localStorage.setItem(STORAGE_KEY, existing.url);
    return existing.url;
  }

  onStatus?.("Oppretter Feature Service i ArcGIS Online...");
  const created = await createFeatureService(username, token);
  const serviceUrl = created.serviceurl ?? created.encodedServiceURL;

  onStatus?.("Oppretter kartlag og domenelister...");
  await addLayersToService(serviceUrl, token);

  localStorage.setItem(STORAGE_KEY, serviceUrl);
  return serviceUrl;
}

export function clearServiceCache() {
  localStorage.removeItem(STORAGE_KEY);
}
