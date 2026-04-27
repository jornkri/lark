import { useEffect, useRef, useState } from "react";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import * as geodeticLength from "@arcgis/core/geometry/operators/geodeticLengthOperator.js";
import * as geodeticArea from "@arcgis/core/geometry/operators/geodeticAreaOperator.js";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";
import { isCustomLayerId } from "../services/appConfig.js";

// ── Static layer metadata (colors & type-field names for standard layers) ────

const LAYER_META = {
  0: { label: "Grøntareal",   color: "#B2DC8A", typeField: "GrontarealType"   },
  1: { label: "Vegetasjon",   color: "#5E9E44", typeField: "VegetasjonType"    },
  2: { label: "Tre",          color: "#2D7038", typeField: null                },
  3: { label: "Sti / vei",    color: "#C8A878", typeField: "StiType"           },
  4: { label: "Hard flate",   color: "#D0CBBB", typeField: "HardFlateType"     },
  5: { label: "Vann",         color: "#96C8E0", typeField: "VannType"          },
  6: { label: "Møblering",    color: "#C87832", typeField: "MobleringType"     },
  7: { label: "Konstruksjon", color: "#BCAB82", typeField: "KonstruksjonsType" },
};

const LAYER_ICONS = {
  0: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C9 7 6 10 6 14a6 6 0 0012 0c0-4-3-7-6-11z"/>
      <line x1="12" y1="22" x2="12" y2="14"/>
    </svg>
  ),
  1: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18c0-3 2-5 5-5 1 0 2 .3 2.8.8A4.5 4.5 0 0116.5 14c2.5 0 4.5 2 4.5 4H3z"/>
      <path d="M10 13c0-3 1.5-5 4-6"/>
      <path d="M14 13c0-3-1-5-2-6"/>
    </svg>
  ),
  2: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L3 17h18L12 3z"/>
      <rect x="10" y="17" width="4" height="4" rx="0.5"/>
    </svg>
  ),
  3: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21L9 3"/>
      <path d="M19 21L15 3"/>
      <line x1="12" y1="7" x2="12" y2="10" strokeDasharray="2 1.5"/>
      <line x1="12" y1="13" x2="12" y2="16" strokeDasharray="2 1.5"/>
    </svg>
  ),
  4: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="0.5"/>
      <rect x="13" y="3" width="8" height="8" rx="0.5"/>
      <rect x="3" y="13" width="8" height="8" rx="0.5"/>
      <rect x="13" y="13" width="8" height="8" rx="0.5"/>
    </svg>
  ),
  5: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3C9 8 6 11 6 15a6 6 0 0012 0c0-4-3-7-6-12z"/>
    </svg>
  ),
  6: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="2.5" rx="1.25"/>
      <path d="M7 12.5v5M17 12.5v5"/>
      <path d="M5 17.5h14"/>
      <path d="M7 10.5V7h10v3.5"/>
    </svg>
  ),
  7: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="15" rx="1"/>
      <path d="M3 10h18M3 14h18"/>
      <path d="M8 10v4M16 10v4M8 14v7M16 14v7"/>
    </svg>
  ),
};

const CUSTOM_COLORS = {
  esriGeometryPolygon:  "#A090C8",
  esriGeometryPolyline: "#7080B0",
  esriGeometryPoint:    "#B06090",
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const TYPE_COLORS = {
  0: { PARK:"#8ac854", NATUR:"#5e9e44", LEIK:"#c8d840", IDRETT:"#50b848", KIRKEG:"#708050", KOLON:"#a0c040", SKOLE:"#78b838", HUNDE:"#90b840", BUFFER:"#88a870", ANNET:"#b2dc8a" },
  1: { PLEN:"#90c858", ENG:"#98c060",   BLOM:"#a8c040", BUSK:"#507838",   HEKK:"#3e6830",   TREG:"#588040",  SKOG:"#2e5820",  BAMB:"#609030",  KLATR:"#509030", ANNET:"#5e9e44" },
  3: { GANG:"#d8c090", SYKK:"#c09050",  GS:"#c8b070",   TUR:"#b89058",    NAT:"#a87840",     KJORE:"#909090", ANNET:"#c8a878" },
  4: { PLASS:"#d8d0c8", PARK:"#9898a8", TERR:"#c8c0b0", SKATE:"#8898b8",  BALL:"#a8b890",    SCEN:"#c0b090",  ANNET:"#d0cbbb" },
  5: { DAM:"#6098c8",  BASS:"#7ab8e0",  FONT:"#a0d0f0",  BEKK:"#5888b8",  REGNB:"#7898b8",   ANNET:"#96c8e0" },
  6: { BENK:"#c07830", BORD:"#a06028",  SOPP:"#707080",  BEL:"#d8b020",   SYKK:"#7080a0",    FLAGG:"#c03828", SKILT:"#b09050", DRIKK:"#50a0c0", GRILL:"#806040", STEIN:"#9090a0", LEIK:"#e09838", ANNET:"#c87832" },
  7: { MUR:"#a09060",  GJERDE:"#909880", PERG:"#c0b080", PAVI:"#d0c090",  LESKUR:"#b0a068",  TRAPP:"#a09068", BRO:"#8098a0",   PLATT:"#c8a870", ANNET:"#bcab82" },
};

function getTypeColor(layerId, code) {
  return TYPE_COLORS[layerId]?.[code] ?? LAYER_META[layerId]?.color ?? "#8ab870";
}

const _ico = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const DOTS_ICON = _ico(<><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></>);

const TYPE_ICONS = {
  0: {
    PARK:   _ico(<><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></>),
    NATUR:  _ico(<><path d="M2 20L8 9l4 6 3-4 7 9H2z"/></>),
    LEIK:   _ico(<><line x1="5" y1="3" x2="5" y2="13"/><line x1="19" y1="3" x2="19" y2="13"/><line x1="5" y1="3" x2="19" y2="3"/><path d="M12 8l-1.5 7h3L12 8z"/></>),
    IDRETT: _ico(<><circle cx="12" cy="12" r="9"/><path d="M12 3c-2 4-2 14 0 18M12 3c2 4 2 14 0 18M3 12c4-2 14-2 18 0"/></>),
    KIRKEG: _ico(<><line x1="12" y1="3" x2="12" y2="21"/><line x1="5" y1="8" x2="19" y2="8"/><path d="M8 21h8"/></>),
    KOLON:  _ico(<><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M8 13V9M12 13V7M16 13V9"/><path d="M6 9c0-2 2-3 6-3s6 1 6 3"/></>),
    SKOLE:  _ico(<><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M9 9V6h6v3"/><line x1="12" y1="4" x2="12" y2="6"/><line x1="10" y1="15" x2="14" y2="15"/><line x1="12" y1="13" x2="12" y2="17"/></>),
    HUNDE:  _ico(<><circle cx="12" cy="15" r="4"/><circle cx="7" cy="9" r="2.5"/><circle cx="12" cy="7" r="2.5"/><circle cx="17" cy="9" r="2.5"/></>),
    BUFFER: _ico(<><path d="M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7l8-4z"/></>),
    ANNET:  DOTS_ICON,
  },
  1: {
    PLEN:   _ico(<><line x1="3" y1="20" x2="21" y2="20"/><path d="M6 20v-5M9 20v-7M12 20v-6M15 20v-7M18 20v-5"/></>),
    ENG:    _ico(<><line x1="3" y1="18" x2="21" y2="18"/><path d="M7 18v-5c0-3 3-5 3-5M10 18v-3"/><path d="M17 18v-5c0-3-3-5-3-5M14 18v-3"/><circle cx="7" cy="9" r="1.5"/><circle cx="17" cy="9" r="1.5"/></>),
    BLOM:   _ico(<><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12H7M17 12h2M7.1 7.1l1.4 1.4M15.5 15.5l1.4 1.4M7.1 16.9l1.4-1.4M15.5 8.5l1.4-1.4"/></>),
    BUSK:   _ico(<><path d="M4 19c0-4 2.5-7 6-8a4 4 0 008 0c3.5 1 6 4 6 8H4z"/></>),
    HEKK:   _ico(<><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M3 13c2.5-3.5 5-3.5 7.5 0s5 0 7.5 0"/></>),
    TREG:   _ico(<><circle cx="8" cy="12" r="5"/><circle cx="16" cy="10" r="5"/><circle cx="12" cy="16" r="4"/></>),
    SKOG:   _ico(<><path d="M5 20l4-11 4 11z"/><path d="M13 20l4-12 4 12z"/><line x1="9" y1="20" x2="13" y2="20"/></>),
    BAMB:   _ico(<><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="5" x2="15" y2="21"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="14" x2="15" y2="14"/><path d="M9 3c1-1 2-1 3 0"/><path d="M15 5c-1-1-2-1-3 0"/></>),
    KLATR:  _ico(<><path d="M8 20c0-5 2-8 4-10 2-2 4-5 4-9"/><path d="M12 10c-2 0-4-1-4-3"/><path d="M12 15c2 0 4-1 4-3"/></>),
    ANNET:  DOTS_ICON,
  },
  3: {
    GANG:   _ico(<><circle cx="12" cy="4" r="2.5"/><path d="M12 6.5v5.5l-3 6M12 12l3 6M9.5 10h5"/></>),
    SYKK:   _ico(<><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M6 15l6-8 6 8M12 7h4"/></>),
    GS:     _ico(<><circle cx="5" cy="5" r="2"/><path d="M5 7v5l-2 4M5 11l2 4"/><circle cx="18" cy="15" r="3.5"/><circle cx="11" cy="15" r="3.5"/><path d="M14.5 15l-2-5h3"/></>),
    TUR:    _ico(<><circle cx="12" cy="4" r="2.5"/><path d="M12 6.5v5.5M9 10l-2 10M15 10l2 10M7 8l-3 8"/></>),
    NAT:    _ico(<><path d="M9 7c-1 2 0 5 3 5s4-3 3-5c-1-2-6-1-6 0z"/><path d="M15 18l-3-6M9 18l3-6M9 18h6"/></>),
    KJORE:  _ico(<><rect x="2" y="10" width="20" height="9" rx="2"/><path d="M7 10V8a2 2 0 012-2h6a2 2 0 012 2v2"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></>),
    ANNET:  DOTS_ICON,
  },
  4: {
    PLASS:  _ico(<><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="10" y1="3" x2="10" y2="21"/><line x1="17" y1="3" x2="17" y2="21"/></>),
    PARK:   _ico(<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M10 7h4a3 3 0 010 6h-4V7z"/></>),
    TERR:   _ico(<><path d="M4 20h4v-5h4v-5h4v-5h4"/></>),
    SKATE:  _ico(<><rect x="3" y="12" width="18" height="4" rx="2"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M10 12l5-7"/></>),
    BALL:   _ico(<><circle cx="12" cy="12" r="9"/><path d="M12 3c-2 4-2 14 0 18M12 3c2 4 2 14 0 18M3 12c4-2 14-2 18 0"/></>),
    SCEN:   _ico(<><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M8 13V9h8v4"/><path d="M6 9c0-2 6-4 6-4s6 2 6 4"/></>),
    ANNET:  DOTS_ICON,
  },
  5: {
    DAM:    _ico(<><path d="M5 16c0-4.5 3-9 7-9s7 4.5 7 9c0 2-3 3-7 3s-7-1-7-3z"/><path d="M8 14c1 1.5 6 1.5 7 0"/></>),
    BASS:   _ico(<><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M3 13c3-2 6 0 9 0s6-2 9 0"/></>),
    FONT:   _ico(<><line x1="12" y1="20" x2="12" y2="11"/><path d="M12 11c-2-3-5-4-7-3"/><path d="M12 11c2-3 5-4 7-3"/><path d="M8 8c-1-2-3-2-3 0"/><path d="M16 8c1-2 3-2 3 0"/><line x1="9" y1="20" x2="15" y2="20"/></>),
    BEKK:   _ico(<><path d="M3 12c2-3 4 0 6 0s4-3 6 0 4 3 6 0"/><path d="M3 16c2-3 4 0 6 0s4-3 6 0 4 3 6 0"/></>),
    REGNB:  _ico(<><path d="M12 3c-3.5 5-6 8-6 12a6 6 0 0012 0c0-4-2.5-7-6-12z"/></>),
    ANNET:  DOTS_ICON,
  },
  6: {
    BENK:   _ico(<><rect x="3" y="10" width="18" height="2.5" rx="1.25"/><path d="M7 12.5v5M17 12.5v5"/><path d="M5 17.5h14"/></>),
    BORD:   _ico(<><ellipse cx="12" cy="10" rx="9" ry="4"/><line x1="12" y1="14" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/></>),
    SOPP:   _ico(<><path d="M4 12c0-4 3.6-8 8-8s8 4 8 8H4z"/><line x1="12" y1="12" x2="12" y2="20"/><line x1="9" y1="20" x2="15" y2="20"/></>),
    BEL:    _ico(<><line x1="12" y1="9" x2="12" y2="20"/><path d="M9 12c0-3 6-3 6 0H9z"/><circle cx="12" cy="6" r="2.5"/><line x1="9" y1="20" x2="15" y2="20"/></>),
    SYKK:   _ico(<><line x1="7" y1="7" x2="7" y2="17"/><line x1="17" y1="7" x2="17" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/><path d="M5 7a2 2 0 014 0"/><path d="M15 7a2 2 0 014 0"/></>),
    FLAGG:  _ico(<><line x1="6" y1="3" x2="6" y2="21"/><path d="M6 3l13 5-13 5"/></>),
    SKILT:  _ico(<><rect x="8" y="4" width="12" height="8" rx="1"/><path d="M8 8H5l3-4"/><line x1="14" y1="12" x2="14" y2="20"/></>),
    DRIKK:  _ico(<><path d="M8 6h8v7a4 4 0 01-8 0V6z"/><path d="M16 9h3v3a3 3 0 01-3 0"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></>),
    GRILL:  _ico(<><ellipse cx="12" cy="10" rx="8" ry="3.5"/><path d="M4 10l-1.5 8M20 10l1.5 8M8 13l-1 7M16 13l1 7M7 20h10"/></>),
    STEIN:  _ico(<><path d="M5 18c0-3.5 3-8 7-8s7 4.5 7 8H5z"/><path d="M8 14c1-1.5 5-1.5 7 0"/></>),
    LEIK:   _ico(<><rect x="5" y="4" width="5" height="10" rx="1"/><path d="M10 14l7 6"/><line x1="4" y1="4" x2="11" y2="4"/><circle cx="7.5" cy="2.5" r="1.5"/></>),
    ANNET:  DOTS_ICON,
  },
  7: {
    MUR:    _ico(<><rect x="3" y="5" width="18" height="14" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="5" x2="9" y2="10"/><line x1="15" y1="5" x2="15" y2="10"/><line x1="6" y1="10" x2="6" y2="15"/><line x1="18" y1="10" x2="18" y2="15"/><line x1="9" y1="15" x2="9" y2="19"/><line x1="15" y1="15" x2="15" y2="19"/></>),
    GJERDE: _ico(<><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="6" y1="7" x2="6" y2="18"/><line x1="12" y1="7" x2="12" y2="18"/><line x1="18" y1="7" x2="18" y2="18"/><path d="M5 7l1 3M11 7l1 3M17 7l1 3"/></>),
    PERG:   _ico(<><line x1="3" y1="9" x2="21" y2="9"/><path d="M6 5v4M10 5v4M14 5v4M18 5v4"/><rect x="3" y="9" width="18" height="11" rx="1" strokeDasharray="3 2"/></>),
    PAVI:   _ico(<><path d="M3 10l9-7 9 7"/><rect x="5" y="10" width="14" height="10" rx="1"/><line x1="9" y1="20" x2="9" y2="10"/><line x1="15" y1="20" x2="15" y2="10"/></>),
    LESKUR: _ico(<><rect x="3" y="8" width="18" height="2" rx="1"/><line x1="4" y1="10" x2="4" y2="18"/><line x1="20" y1="10" x2="20" y2="18"/><line x1="4" y1="18" x2="20" y2="18"/><line x1="12" y1="10" x2="12" y2="18"/></>),
    TRAPP:  _ico(<><path d="M4 20h4v-5h4v-5h4v-5h4"/></>),
    BRO:    _ico(<><line x1="3" y1="16" x2="21" y2="16"/><path d="M6 16c0-4 2-7 6-7s6 3 6 7"/><line x1="6" y1="16" x2="6" y2="9"/><line x1="18" y1="16" x2="18" y2="9"/><line x1="3" y1="9" x2="21" y2="9"/></>),
    PLATT:  _ico(<><rect x="3" y="8" width="18" height="12" rx="1"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="16" x2="21" y2="16"/><line x1="8" y1="8" x2="8" y2="20"/><line x1="16" y1="8" x2="16" y2="20"/></>),
    ANNET:  DOTS_ICON,
  },
};

const GEOM_TOOL = {
  esriGeometryPolygon:  "polygon",
  esriGeometryPolyline: "polyline",
  esriGeometryPoint:    "point",
};

// Custom-layer fallback domain for Status
const CUSTOM_STATUS_DOMAIN = {
  codedValues: [
    { code: "PLAN",  name: "Planlagt"         },
    { code: "UNDER", name: "Under utbygging"  },
    { code: "EKSIS", name: "Eksisterende"     },
    { code: "FJER",  name: "Skal fjernes"     },
  ],
};

// ── Draw tool definitions per geometry type ───────────────────────────────────

const DRAW_TOOLS = {
  esriGeometryPolygon: [
    { key: "polygon",          label: "Polygon",   icon: "⬡", sketchTool: "polygon",   opts: { mode: "hybrid"   } },
    { key: "rectangle",        label: "Rektangel", icon: "▭",  sketchTool: "rectangle", opts: {}                   },
    { key: "circle",           label: "Sirkel",    icon: "◯",  sketchTool: "circle",    opts: {}                   },
    { key: "freehand-polygon", label: "Frihånd",   icon: "〰", sketchTool: "polygon",   opts: { mode: "freehand" } },
  ],
  esriGeometryPolyline: [
    { key: "polyline",          label: "Linje",   icon: "╱",  sketchTool: "polyline", opts: { mode: "hybrid"   } },
    { key: "freehand-polyline", label: "Frihånd", icon: "〰", sketchTool: "polyline", opts: { mode: "freehand" } },
  ],
  esriGeometryPoint: [
    { key: "point", label: "Punkt", icon: "•", sketchTool: "point", opts: {} },
  ],
};

function getTools(geomType) { return DRAW_TOOLS[geomType] ?? []; }

// Returns editable field definitions for the attrs step, excluding typeField and auto-calculated fields
function getAttrFields(layerId) {
  if (isCustomLayerId(layerId)) {
    return [
      { name: "Status",      alias: "Status",      type: "esriFieldTypeString", domain: CUSTOM_STATUS_DOMAIN },
      { name: "Navn",        alias: "Navn",        type: "esriFieldTypeString" },
      { name: "Beskrivelse", alias: "Beskrivelse", type: "esriFieldTypeString" },
    ];
  }
  const def = LAYER_DEFINITIONS.find((d) => d.id === layerId);
  if (!def) return [];
  const typeFieldName = LAYER_META[layerId]?.typeField;
  const skipFields = new Set(["OBJECTID", "GlobalID", "Shape_Area", "Shape_Length", "Areal_m2", typeFieldName].filter(Boolean));
  return def.fields.filter((f) => !skipFields.has(f.name) && f.editable !== false);
}

// ── TypePicker — card grid for type selection ─────────────────────────────────

function TypePicker({ opts, value, onChange, layerId }) {
  return (
    <div className="ep-type-grid">
      {opts.map((o) => {
        const color = getTypeColor(layerId, o.code);
        const icon  = TYPE_ICONS[layerId]?.[o.code] ?? DOTS_ICON;
        return (
          <button
            key={o.code}
            className={"ep-type-card" + (value === o.code ? " selected" : "")}
            onClick={() => onChange(o.code)}
          >
            <span className="ep-type-flik" style={{ background: color }} />
            <span className="ep-type-card-body">
              {icon}
              <span className="ep-type-card-label">{o.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── FieldInput — renders a single attr field ──────────────────────────────────

function FieldInput({ field, value, onChange }) {
  const opts = field.domain?.codedValues;

  if (opts) {
    if (opts.length <= 6) {
      return (
        <div className="ep-field">
          <span className="ep-field-label">{field.alias}</span>
          <div className="ep-pill-group">
            {opts.map((o) => (
              <button
                key={o.code}
                className={"ep-pill" + (value === o.code ? " selected" : "")}
                onClick={() => onChange(value === o.code ? "" : o.code)}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <label className="ep-field">
        {field.alias}
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">– velg –</option>
          {opts.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
        </select>
      </label>
    );
  }

  if (field.name === "Beskrivelse") {
    return (
      <label className="ep-field">
        {field.alias}
        <textarea rows={2} placeholder="Valgfritt" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  if (field.type === "esriFieldTypeDouble" || field.type === "esriFieldTypeInteger") {
    return (
      <label className="ep-field">
        {field.alias}
        <input type="number" min="0" step={field.type === "esriFieldTypeInteger" ? "1" : "any"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </label>
    );
  }

  return (
    <label className="ep-field">
      {field.alias}
      <input type="text" placeholder="Valgfritt" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLayerInfo(id, config) {
  if (isCustomLayerId(id)) {
    const cfg = config?.layers?.[id] ?? {};
    return {
      label:     cfg.displayName ?? "Tilpasset lag",
      color:     CUSTOM_COLORS[cfg.geometryType] ?? "#9090A8",
      typeField: cfg.typeField   ?? null,
    };
  }
  const base = LAYER_META[id] ?? {};
  return {
    label:     config?.layers?.[id]?.displayName ?? base.label,
    color:     base.color,
    typeField: base.typeField ?? null,
  };
}

function getGeomType(id, config) {
  if (isCustomLayerId(id)) return config?.layers?.[id]?.geometryType;
  return LAYER_DEFINITIONS.find((d) => d.id === id)?.geometryType;
}

function getTypeOpts(id, typeField, config) {
  if (!typeField) return [];
  const layerCfg = config?.layers?.[id] ?? {};
  const renames  = layerCfg.domainRenames      ?? {};
  const custom   = layerCfg.customDomainValues ?? [];
  const enabled  = layerCfg.enabledSubtypes;

  let baseOpts = [];
  if (!isCustomLayerId(id)) {
    const def = LAYER_DEFINITIONS.find((d) => d.id === id);
    baseOpts  = def?.fields.find((f) => f.name === typeField)?.domain?.codedValues ?? [];
  }

  const allOpts = [
    ...baseOpts.map((cv) => ({ code: cv.code, name: renames[cv.code] ?? cv.name })),
    ...custom.map((cv)   => ({ code: cv.code, name: renames[cv.code] ?? cv.name })),
  ];

  return enabled ? allOpts.filter((o) => enabled.includes(o.code)) : allOpts;
}

function formatLength(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  if (m >= 100)  return `${Math.round(m)} m`;
  return `${m.toFixed(1)} m`;
}

function formatArea(sqm) {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} daa`;
  return `${Math.round(sqm)} m²`;
}

// ── SVG segment label ─────────────────────────────────────────────────────────

function makeLabelGraphic(p1, p2, text, sr) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const segLen = Math.sqrt(dx * dx + dy * dy);
  if (segLen < 1e-10) return null;

  let angleDeg = Math.atan2(-dy, dx) * 180 / Math.PI;
  if (angleDeg >  90) angleDeg -= 180;
  if (angleDeg < -90) angleDeg += 180;

  const BW   = Math.max(50, text.length * 7.5 + 22);
  const BH   = 20;
  const diag = Math.ceil(Math.sqrt(BW * BW + BH * BH)) + 4;
  const CX   = diag / 2, CY = diag / 2;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diag}" height="${diag}">`,
    `<g transform="rotate(${angleDeg},${CX},${CY})">`,
    `<rect x="${CX - BW / 2}" y="${CY - BH / 2}" width="${BW}" height="${BH}"`,
    ` rx="4" ry="4" fill="white" stroke="#111" stroke-width="1.5"/>`,
    `<text x="${CX}" y="${CY + 1}" font-family="Arial,sans-serif"`,
    ` font-size="10" font-weight="bold" fill="#111"`,
    ` text-anchor="middle" dominant-baseline="central">${text}</text>`,
    `</g></svg>`,
  ].join("");

  const mapAngle = Math.atan2(dy, dx);
  const d        = 20;

  return new Graphic({
    geometry: { type: "point", x: (p1[0] + p2[0]) / 2, y: (p1[1] + p2[1]) / 2, spatialReference: sr },
    symbol: {
      type:    "picture-marker",
      url:     "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
      width:   diag,
      height:  diag,
      xoffset: -d * Math.sin(mapAngle),
      yoffset:  d * Math.cos(mapAngle),
    },
  });
}

function buildSegmentLabels(geometry) {
  if (!geodeticLength.isLoaded()) return [];
  const sr     = geometry.spatialReference;
  const labels = [];

  const processRing = (pts, closing) => {
    const end = closing ? pts.length : pts.length - 1;
    for (let i = 0; i < end; i++) {
      const p1  = pts[i], p2 = pts[(i + 1) % pts.length];
      const seg = new Polyline({ paths: [[p1, p2]], spatialReference: sr });
      const len = Math.abs(geodeticLength.execute(seg, { unit: "meters" }));
      if (len < 0.01) continue;
      const g = makeLabelGraphic(p1, p2, formatLength(len), sr);
      if (g) labels.push(g);
    }
  };

  if (geometry.type === "polyline")
    (geometry.paths ?? []).forEach((p) => processRing(p, false));
  else if (geometry.type === "polygon")
    (geometry.rings ?? []).forEach((r) => processRing(r, true));

  return labels;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditPanel({ view, layersById, config, editRequest, onEditDone }) {
  const [phase,          setPhase]          = useState("idle");
  const [activeId,       setActiveId]       = useState(null);
  const [editingFeature, setEditingFeature] = useState(null);
  const [pendingGeom,    setPendingGeom]    = useState(null);
  const [attrs,          setAttrs]          = useState({});
  const [saving,         setSaving]         = useState(false);
  const [err,            setErr]            = useState(null);
  const [saved,          setSaved]          = useState(false);
  const [visibility,     setVisibility]     = useState(() =>
    Object.fromEntries(LAYER_DEFINITIONS.map((d) => [d.id, true]))
  );
  const [liveMeasure,  setLiveMeasure]  = useState(null);
  const [activeTool,   setActiveTool]   = useState(null); // tool key from DRAW_TOOLS
  const [collapsed,    setCollapsed]    = useState(true);

  const sketchRef              = useRef(null);
  const tempLayerRef           = useRef(null);
  const labelLayerRef          = useRef(null);
  const rafRef                 = useRef(null);
  const pendingGeomRef         = useRef(null);
  const geomEditReturnPhaseRef = useRef("edit");
  const startGeomEditRef       = useRef(null);

  // ── Layer + operator setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!view) return;
    const tempGl  = new GraphicsLayer({ listMode: "hide" });
    const labelGl = new GraphicsLayer({ listMode: "hide" });
    view.map.add(tempGl);
    view.map.add(labelGl);
    tempLayerRef.current  = tempGl;
    labelLayerRef.current = labelGl;
    geodeticLength.load();
    geodeticArea.load();
    return () => {
      tempGl.removeAll();  view.map?.remove(tempGl);
      labelGl.removeAll(); view.map?.remove(labelGl);
    };
  }, [view]);

  // ── Sync map visibility with config ────────────────────────────────────────
  useEffect(() => {
    if (!config?.layers || !layersById) return;
    Object.entries(layersById).forEach(([key, layer]) => {
      const cfg = config.layers[key] ?? config.layers[Number(key)];
      if (cfg && cfg.enabled === false) layer.visible = false;
    });
  }, [config, layersById]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to edit requests from popup ──────────────────────────────────────
  useEffect(() => {
    if (!editRequest) return;
    const { graphic, layerId } = editRequest;
    resetSketch(); clearLabels();

    const a    = graphic.attributes ?? {};
    const info = getLayerInfo(layerId, config);
    setActiveId(layerId);
    setEditingFeature(graphic);
    setAttrs({
      Navn:        a.Navn        ?? "",
      Status:      a.Status      ?? "",
      Beskrivelse: a.Beskrivelse ?? "",
      ...(a.Areal_m2 != null ? { Areal_m2: a.Areal_m2 } : {}),
      ...(info.typeField ? { [info.typeField]: a[info.typeField] ?? "" } : {}),
    });
    setPendingGeom(null);
    setPhase("edit");
    setErr(null);
    setSaved(false);
    setCollapsed(false);
  }, [editRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { resetSketch(); }, []);

  // ── Klikk på tegnet polygon i form-fasen for å starte geom-redigering ─────
  useEffect(() => {
    if (phase !== "form" || !view || !tempLayerRef.current) return;
    const tempLayer = tempLayerRef.current;
    const handle = view.on("click", async (evt) => {
      const result = await view.hitTest(evt, { include: [tempLayer] });
      if (result.results.length > 0) startGeomEditRef.current("form");
    });
    return () => handle.remove();
  }, [phase, view]); // eslint-disable-line

  // ── Sketch helpers ──────────────────────────────────────────────────────────
  function resetSketch() {
    sketchRef.current?.cancel();
    sketchRef.current?.destroy();
    sketchRef.current = null;
    tempLayerRef.current?.removeAll();
  }

  function clearLabels() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    pendingGeomRef.current = null;
    labelLayerRef.current?.removeAll();
  }

  function updateLabels(geometry, skipMapLabels = false) {
    if (!geometry || !labelLayerRef.current) return;
    if (!geodeticLength.isLoaded() || !geodeticArea.isLoaded()) return;

    if (geometry.type === "polyline") {
      const total = Math.abs(geodeticLength.execute(geometry, { unit: "meters" }));
      setLiveMeasure({ type: "length", value: total });
    } else if (geometry.type === "polygon") {
      const area = Math.abs(geodeticArea.execute(geometry, { unit: "square-meters" }));
      setLiveMeasure({ type: "area", value: area });
    } else {
      setLiveMeasure(null);
    }

    if (skipMapLabels) {
      labelLayerRef.current.removeAll();
      return;
    }

    pendingGeomRef.current = geometry;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const geom = pendingGeomRef.current;
      if (!geom || !labelLayerRef.current) return;
      const labels = buildSegmentLabels(geom);
      labelLayerRef.current.removeAll();
      if (labels.length) labelLayerRef.current.addMany(labels);
    });
  }

  // ── Layer selection ─────────────────────────────────────────────────────────
  function pickLayer(id) {
    if (id === activeId && !collapsed) { setCollapsed(true); return; }
    resetSketch(); clearLabels();
    setActiveId(id); setEditingFeature(null); setPendingGeom(null);
    setAttrs({}); setErr(null); setSaved(false); setLiveMeasure(null);
    const geomType = getGeomType(id, config);
    setActiveTool(getTools(geomType)[0]?.key ?? null);
    const typeField = LAYER_META[id]?.typeField;
    setPhase(typeField ? "type-select" : "attrs");
    setCollapsed(false);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────
  function startDraw(toolKey) {
    const geomType = getGeomType(activeId, config);
    const toolDef  = getTools(geomType).find((t) => t.key === toolKey);
    if (!toolDef) return;

    const isFreehand = toolKey.includes("freehand");

    const sk = new SketchViewModel({
      view,
      layer: tempLayerRef.current,
      snappingOptions: {
        enabled: true, selfEnabled: true,
        featureSources: Object.values(layersById).map((l) => ({ layer: l, enabled: true })),
      },
    });

    // Apply type-based symbol color
    const typeField = isCustomLayerId(activeId) ? null : (LAYER_META[activeId]?.typeField ?? null);
    const typeCode  = typeField ? attrs[typeField] : null;
    const hex = isCustomLayerId(activeId)
      ? (CUSTOM_COLORS[geomType] ?? "#8ab870")
      : getTypeColor(activeId, typeCode);
    const [r, g, b] = hexToRgb(hex);
    if (geomType === "esriGeometryPolygon") {
      sk.polygonSymbol = { type: "simple-fill", color: [r, g, b, 140], outline: { type: "simple-line", color: [r, g, b, 220], width: 1.8 } };
    } else if (geomType === "esriGeometryPolyline") {
      sk.polylineSymbol = { type: "simple-line", color: [r, g, b, 230], width: 2.5 };
    } else if (geomType === "esriGeometryPoint") {
      sk.pointSymbol = { type: "simple-marker", color: [r, g, b, 200], outline: { type: "simple-line", color: [r, g, b, 255], width: 1.5 }, size: 10 };
    }

    sketchRef.current = sk;
    setActiveTool(toolKey);
    setPhase("drawing"); setLiveMeasure(null);
    sk.create(toolDef.sketchTool, toolDef.opts);

    sk.on("create", (evt) => {
      if (evt.state === "active") {
        updateLabels(evt.graphic?.geometry, isFreehand);
      } else if (evt.state === "complete") {
        const geom = evt.graphic.geometry;
        clearLabels(); setLiveMeasure(null);
        setPendingGeom(geom);
        if (geom.type === "polygon") {
          const sqm = Math.abs(geodeticArea.execute(geom, { unit: "square-meters" }));
          setAttrs((a) => ({ ...a, Areal_m2: Math.round(sqm * 10) / 10 }));
        }
        setPhase("form"); sk.destroy(); sketchRef.current = null;
      } else if (evt.state === "cancel") {
        clearLabels(); setLiveMeasure(null);
        setPhase("idle"); sk.destroy(); sketchRef.current = null;
      }
    });
  }

  function cancelDraw() {
    resetSketch(); clearLabels(); setLiveMeasure(null);
    setPhase("idle"); setPendingGeom(null);
  }

  // ── Geometry edit (new OR existing feature) ───────────────────────────────
  function startGeomEdit(returnPhase = "edit") {
    const sourceGeom = pendingGeom ?? editingFeature?.geometry;
    if (!sourceGeom) return;

    geomEditReturnPhaseRef.current = returnPhase;

    const tmpGraphic = new Graphic({ geometry: sourceGeom });
    tempLayerRef.current.removeAll();
    tempLayerRef.current.add(tmpGraphic);
    clearLabels();

    const sk = new SketchViewModel({
      view,
      layer: tempLayerRef.current,
      snappingOptions: {
        enabled: true, selfEnabled: true,
        featureSources: Object.values(layersById).map((l) => ({ layer: l, enabled: true })),
      },
    });
    sketchRef.current = sk;
    setPhase("edit-geom"); setLiveMeasure(null);
    sk.update([tmpGraphic], { tool: "reshape" });

    sk.on("update", (evt) => {
      if (evt.state === "active") {
        updateLabels(evt.graphics[0]?.geometry);
      } else if (evt.state === "complete") {
        const geom = evt.graphics[0].geometry;
        clearLabels(); setLiveMeasure(null);
        setPendingGeom(geom);
        if (geom.type === "polygon") {
          const sqm = Math.abs(geodeticArea.execute(geom, { unit: "square-meters" }));
          setAttrs((a) => ({ ...a, Areal_m2: Math.round(sqm * 10) / 10 }));
        }
        setPhase(returnPhase); sk.destroy(); sketchRef.current = null;
      } else if (evt.state === "cancel") {
        clearLabels(); setLiveMeasure(null);
        setPhase(returnPhase); sk.destroy(); sketchRef.current = null;
      }
    });
  }

  // Keep ref current so click handler always calls latest closure
  startGeomEditRef.current = startGeomEdit;

  function cancelEdit() {
    resetSketch(); clearLabels(); setLiveMeasure(null);
    setEditingFeature(null); setPendingGeom(null);
    setPhase("idle"); setAttrs({}); setErr(null);
    setCollapsed(true);
    onEditDone?.();
  }

  // ── Save new feature ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true); setErr(null);
    try {
      const result = await layersById[activeId].applyEdits({
        addFeatures: [new Graphic({ geometry: pendingGeom, attributes: attrs })],
      });
      const e = result.addFeatureResults[0]?.error;
      if (e) throw new Error(e.message ?? JSON.stringify(e));
      tempLayerRef.current?.removeAll();
      setPhase("idle"); setPendingGeom(null); setAttrs({});
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  // ── Update existing feature ─────────────────────────────────────────────────
  async function handleUpdate() {
    setSaving(true); setErr(null);
    try {
      const updatedGraphic = editingFeature.clone();
      Object.assign(updatedGraphic.attributes, attrs);
      if (pendingGeom) updatedGraphic.geometry = pendingGeom;

      const result = await layersById[activeId].applyEdits({
        updateFeatures: [updatedGraphic],
      });
      const e = result.updateFeatureResults[0]?.error;
      if (e) throw new Error(e.message ?? JSON.stringify(e));
      tempLayerRef.current?.removeAll();
      setPhase("idle"); setEditingFeature(null); setPendingGeom(null); setAttrs({});
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      setCollapsed(true);
      onEditDone?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function setAttr(key, val) { setAttrs((a) => ({ ...a, [key]: val })); }

  function toggleVisibility(id) {
    const layer = layersById[id];
    if (!layer) return;
    const next = !visibility[id];
    layer.visible = next;
    setVisibility((v) => ({ ...v, [id]: next }));
  }


  // ── Derived ─────────────────────────────────────────────────────────────────
  const meta           = activeId !== null ? getLayerInfo(activeId, config) : null;
  const typeOpts       = meta ? getTypeOpts(activeId, meta.typeField, config) : [];
  const activeGeomType = activeId !== null ? getGeomType(activeId, config) : null;

  // Layer IDs to show in the sidebar: standard (config-ordered + filtered) + provisioned custom
  const standardIds = (config?.layerOrder ?? LAYER_DEFINITIONS.map((d) => d.id))
    .filter((id) => !isCustomLayerId(id) && config?.layers?.[id]?.enabled !== false);

  const customIds = Object.entries(config?.layers ?? {})
    .filter(([key, val]) => isCustomLayerId(key) && val.enabled !== false && val.agolLayerId != null)
    .map(([key]) => key);

  const visibleLayerIds = [...standardIds, ...customIds];
  const attrFields      = activeId !== null ? getAttrFields(activeId) : [];

  // ── Render ──────────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="ep-icon-strip">
        {visibleLayerIds.map((id) => {
          const info = getLayerInfo(id, config);
          const icon = !isCustomLayerId(id)
            ? LAYER_ICONS[id]
            : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12,3 21,20 3,20"/>
              </svg>
            );
          return (
            <button
              key={String(id)}
              className={"ep-icon-btn" + (activeId === id ? " active" : "")}
              title={info.label}
              onClick={() => pickLayer(id)}
            >
              {icon}
            </button>
          );
        })}
      </div>
    );
  }

  const selectedTypeName = meta?.typeField ? typeOpts.find((o) => o.code === attrs[meta.typeField])?.name : null;

  return (
    <div className="ep">
      {/* ── Theme header ── */}
      <div className="ep-theme-header">
        <div className="ep-theme-dot" style={{ background: meta?.color ?? "#8ab870" }} />
        <span className="ep-theme-name">{meta?.label ?? "Tegning"}</span>
        <button className="ep-close-btn" title="Lukk" onClick={() => setCollapsed(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {activeId !== null && (
        <div className="ep-body">

          {/* ── Step 1: Type selection ── */}
          {phase === "type-select" && (
            <div>
              <p className="ep-step-label">Velg type</p>
              <TypePicker
                opts={typeOpts}
                layerId={activeId}
                value={attrs[meta.typeField] ?? ""}
                onChange={(code) => { setAttr(meta.typeField, code); setPhase("attrs"); }}
              />
            </div>
          )}

          {/* ── Step 2: Attributes ── */}
          {phase === "attrs" && (
            <div>
              {meta?.typeField && (
                <button className="ep-back-btn" onClick={() => setPhase("type-select")}>
                  ← {selectedTypeName ?? "Endre type"}
                </button>
              )}
              <div className="ep-attrs-fields">
                {attrFields.map((field) => (
                  <FieldInput
                    key={field.name}
                    field={field}
                    value={attrs[field.name] ?? ""}
                    onChange={(val) => setAttr(field.name, val)}
                  />
                ))}
              </div>
              <button className="ep-tegn-btn" onClick={() => setPhase("idle")}>
                Tegn →
              </button>
            </div>
          )}

          {/* ── Step 3: Draw tool grid ── */}
          {phase === "idle" && activeGeomType && (
            <div>
              <button className="ep-back-btn" onClick={() => setPhase("attrs")}>← Egenskaper</button>
              <div className="ep-tool-grid">
                {getTools(activeGeomType).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className="ep-tool-tile"
                    onClick={() => startDraw(t.key)}
                    title={t.label}
                  >
                    <span className="ep-tool-tile-icon">{t.icon}</span>
                    <span className="ep-tool-tile-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Drawing in progress ── */}
          {phase === "drawing" && (() => {
            const toolDef  = getTools(activeGeomType).find((t) => t.key === activeTool);
            const isFreehand = activeTool?.includes("freehand");
            const isVertex   = !isFreehand && activeGeomType !== "esriGeometryPoint";
            return (
              <div className="ep-drawing-state">
                {toolDef && (
                  <div className="ep-active-tool-badge">
                    <span className="ep-active-tool-icon">{toolDef.icon}</span>
                    <span>{toolDef.label}</span>
                  </div>
                )}
                <p className="ep-drawing-hint">
                  {isFreehand
                    ? "Hold nede og dra — slipp for å fullføre"
                    : activeGeomType === "esriGeometryPoint"
                      ? "Klikk for å plassere punkt"
                      : "Klikk for punkter · dobbelklikk for å fullføre"}
                </p>
                {liveMeasure && (
                  <div className="ep-live-measure">
                    {liveMeasure.type === "length" ? formatLength(liveMeasure.value) : formatArea(liveMeasure.value)}
                  </div>
                )}
                <div className="ep-drawing-actions">
                  {isVertex && (
                    <button type="button" className="ep-drawing-action-btn" onClick={() => sketchRef.current?.undo()} title="Angre siste punkt">
                      ↩ Angre
                    </button>
                  )}
                  <button type="button" className="ep-drawing-action-btn ep-drawing-action-cancel" onClick={cancelDraw}>
                    × Avbryt
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── After draw: area + save ── */}
          {phase === "form" && (
            <div>
              {attrs.Areal_m2 != null && (
                <div className="ep-areal">Areal: <strong>{Number(attrs.Areal_m2).toLocaleString("nb-NO")} m²</strong></div>
              )}
              <button className="ep-geom-btn" onClick={() => startGeomEdit("form")}>✏ Rediger geometri</button>
              {err && <p className="ep-error">{err}</p>}
              <div className="ep-form-actions">
                <button className="ep-btn-save" onClick={handleSave} disabled={saving}>{saving ? "Lagrer…" : "Lagre"}</button>
                <button className="ep-btn-ghost" onClick={cancelDraw}>Avbryt</button>
              </div>
            </div>
          )}

          {/* ── Edit existing feature (from popup) ── */}
          {phase === "edit" && (
            <div>
              {typeOpts.length > 0 && (
                <div className="ep-edit-type-section">
                  <p className="ep-step-label">Type</p>
                  <TypePicker
                    opts={typeOpts}
                    layerId={activeId}
                    value={attrs[meta.typeField] ?? ""}
                    onChange={(code) => setAttr(meta.typeField, code)}
                  />
                </div>
              )}
              <div className="ep-attrs-fields">
                {attrFields.map((field) => (
                  <FieldInput
                    key={field.name}
                    field={field}
                    value={attrs[field.name] ?? ""}
                    onChange={(val) => setAttr(field.name, val)}
                  />
                ))}
              </div>
              {attrs.Areal_m2 != null && (
                <div className="ep-areal">Areal: <strong>{Number(attrs.Areal_m2).toLocaleString("nb-NO")} m²</strong></div>
              )}
              <button className="ep-geom-btn" onClick={startGeomEdit}>✏ Rediger geometri</button>
              {pendingGeom && <p className="ep-hint-sub" style={{ marginBottom: "0.4rem" }}>Ny geometri klar</p>}
              {err && <p className="ep-error">{err}</p>}
              <div className="ep-form-actions">
                <button className="ep-btn-save" onClick={handleUpdate} disabled={saving}>{saving ? "Lagrer…" : "Oppdater"}</button>
                <button className="ep-btn-ghost" onClick={cancelEdit}>Avbryt</button>
              </div>
            </div>
          )}

          {/* ── Geometry edit in progress ── */}
          {phase === "edit-geom" && (
            <div className="ep-drawing-state">
              <div className="ep-active-tool-badge">
                <span className="ep-active-tool-icon">✏</span>
                <span>Rediger geometri</span>
              </div>
              <p className="ep-drawing-hint">Dra i punkter for å omforme · klikk utenfor for å fullføre</p>
              {liveMeasure && (
                <div className="ep-live-measure">
                  {liveMeasure.type === "length" ? formatLength(liveMeasure.value) : formatArea(liveMeasure.value)}
                </div>
              )}
              <div className="ep-drawing-actions">
                <button type="button" className="ep-drawing-action-btn ep-drawing-action-confirm" onClick={() => sketchRef.current?.complete()} title="Bekreft geometri">
                  ✓ Ferdig
                </button>
                <button type="button" className="ep-drawing-action-btn" onClick={() => sketchRef.current?.undo()} title="Angre siste endring">
                  ↩ Angre
                </button>
                <button type="button" className="ep-drawing-action-btn ep-drawing-action-cancel" onClick={() => { resetSketch(); clearLabels(); setLiveMeasure(null); setPhase(geomEditReturnPhaseRef.current); }}>
                  × Avbryt
                </button>
              </div>
            </div>
          )}

          {saved && <p className="ep-saved">✓ Lagret</p>}
        </div>
      )}

    </div>
  );
}
