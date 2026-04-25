import { LAYER_DEFINITIONS } from "../config/dataModel.js";

export const COORD_SYSTEMS = [
  { id: "EPSG:25832", label: "UTM sone 32N (ETRS89) – EPSG:25832" },
  { id: "EPSG:25833", label: "UTM sone 33N (ETRS89) – EPSG:25833" },
  { id: "EPSG:4326",  label: "WGS 84 geografisk – EPSG:4326" },
  { id: "EPSG:3857",  label: "Web Mercator – EPSG:3857" },
];

export const GEOM_LABELS = {
  esriGeometryPolygon:  "Polygon",
  esriGeometryPolyline: "Linje",
  esriGeometryPoint:    "Punkt",
};

const DEFAULT_ICONS = {
  0: "https://img.icons8.com/color/48/nature--v1.png",
  1: "https://img.icons8.com/color/48/rainforest.png",
  2: "https://img.icons8.com/color/48/deciduous-tree.png",
  3: "https://img.icons8.com/color/48/road.png",
  4: "https://img.icons8.com/color/48/bricks.png",
  5: "https://img.icons8.com/color/48/lake.png",
  6: "https://img.icons8.com/color/48/park-bench.png",
  7: "https://img.icons8.com/color/48/brick-wall.png",
};

const LAYER_META_DEFAULTS = {
  0: { displayName: "Grøntareal",   typeField: "GrontarealType" },
  1: { displayName: "Vegetasjon",   typeField: "VegetasjonType" },
  2: { displayName: "Tre",          typeField: null },
  3: { displayName: "Sti / vei",    typeField: "StiType" },
  4: { displayName: "Hard flate",   typeField: "HardFlateType" },
  5: { displayName: "Vann",         typeField: "VannType" },
  6: { displayName: "Møblering",    typeField: "MobleringType" },
  7: { displayName: "Konstruksjon", typeField: "KonstruksjonsType" },
};

function getBuiltinCodes(def, typeField) {
  if (!typeField) return [];
  const field = def.fields.find((f) => f.name === typeField);
  return field?.domain?.codedValues?.map((cv) => cv.code) ?? [];
}

export function isCustomLayerId(id) {
  return typeof id === "string" && id.startsWith("c");
}

export function makeCustomLayerId() {
  return "c" + Date.now();
}

export function buildDefaultConfig() {
  const layers = {};
  const layerOrder = [];

  for (const def of LAYER_DEFINITIONS) {
    const meta = LAYER_META_DEFAULTS[def.id];
    layers[def.id] = {
      enabled:            true,
      displayName:        meta.displayName,
      icon:               DEFAULT_ICONS[def.id] ?? "https://img.icons8.com/color/48/add-layer.png",
      enabledSubtypes:    getBuiltinCodes(def, meta.typeField),
      domainRenames:      {},
      customDomainValues: [],
    };
    layerOrder.push(def.id);
  }

  return {
    appName:     "LARK",
    projectName: "",
    coordSystem: "EPSG:25832",
    layerOrder,
    layers,
  };
}

export function loadConfig() {
  const defaults = buildDefaultConfig();
  let stored;
  try {
    const raw = localStorage.getItem("lark_app_config");
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    return defaults;
  }
  if (!stored) return defaults;

  // Merge standard layers
  const mergedLayers = {};
  for (const def of LAYER_DEFINITIONS) {
    const id = def.id;
    const defCfg = defaults.layers[id];
    const storedCfg = stored.layers?.[id] ?? stored.layers?.[String(id)];
    mergedLayers[id] = storedCfg ? { ...defCfg, ...storedCfg } : defCfg;
  }

  // Carry over custom layers from stored (string keys starting with "c")
  for (const [key, val] of Object.entries(stored.layers ?? {})) {
    if (isCustomLayerId(key)) mergedLayers[key] = val;
  }

  // Rebuild layerOrder: preserve stored order, fill missing standards, append new customs
  const storedOrder   = Array.isArray(stored.layerOrder) ? stored.layerOrder : [];
  const standardIds   = LAYER_DEFINITIONS.map((d) => d.id);
  const validStd      = storedOrder.filter((id) => !isCustomLayerId(id) && standardIds.includes(Number(id)));
  const missingStd    = standardIds.filter((id) => !validStd.map(Number).includes(id));
  const validCustom   = storedOrder.filter((id) => isCustomLayerId(id) && mergedLayers[id]);

  return {
    appName:     stored.appName     ?? defaults.appName,
    projectName: stored.projectName ?? defaults.projectName,
    coordSystem: stored.coordSystem ?? defaults.coordSystem,
    layerOrder:  [...validStd, ...missingStd, ...validCustom],
    layers:      mergedLayers,
  };
}

export function saveConfig(config) {
  localStorage.setItem("lark_app_config", JSON.stringify(config));
}
