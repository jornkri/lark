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
  0: { label: "Grøntareal",   icon: "https://img.icons8.com/color/48/nature--v1.png",    color: "#B2DC8A", typeField: "GrontarealType"   },
  1: { label: "Vegetasjon",   icon: "https://img.icons8.com/color/48/rainforest.png",     color: "#5E9E44", typeField: "VegetasjonType"    },
  2: { label: "Tre",          icon: "https://img.icons8.com/color/48/deciduous-tree.png", color: "#2D7038", typeField: null                },
  3: { label: "Sti / vei",    icon: "https://img.icons8.com/color/48/road.png",           color: "#C8A878", typeField: "StiType"           },
  4: { label: "Hard flate",   icon: "https://img.icons8.com/color/48/bricks.png",         color: "#D0CBBB", typeField: "HardFlateType"     },
  5: { label: "Vann",         icon: "https://img.icons8.com/color/48/lake.png",           color: "#96C8E0", typeField: "VannType"          },
  6: { label: "Møblering",    icon: "https://img.icons8.com/color/48/park-bench.png",     color: "#C87832", typeField: "MobleringType"     },
  7: { label: "Konstruksjon", icon: "https://img.icons8.com/color/48/brick-wall.png",     color: "#BCAB82", typeField: "KonstruksjonsType" },
};

const CUSTOM_COLORS = {
  esriGeometryPolygon:  "#A090C8",
  esriGeometryPolyline: "#7080B0",
  esriGeometryPoint:    "#B06090",
};

const GEOM_TOOL = {
  esriGeometryPolygon:  "polygon",
  esriGeometryPolyline: "polyline",
  esriGeometryPoint:    "point",
};

const STATUS_OPTS = [
  { code: "PLAN",  label: "Planlagt"        },
  { code: "EKSIS", label: "Eksisterende"    },
  { code: "UNDER", label: "Under utbygging" },
  { code: "FJER",  label: "Skal fjernes"   },
];

const BASEMAPS = [
  { id: "topo-vector",    label: "Topo"    },
  { id: "hybrid",         label: "Flyfoto" },
  { id: "streets-vector", label: "Kart"    },
  { id: "gray-vector",    label: "Grå"     },
];

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

// ── Icon renderer (handles both icons8 URL and emoji fallback) ────────────────

function LayerIcon({ icon, className }) {
  if (!icon) return null;
  if (icon.startsWith("http"))
    return <img className={className} src={icon} alt="" />;
  return <span className={className}>{icon}</span>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLayerInfo(id, config) {
  if (isCustomLayerId(id)) {
    const cfg = config?.layers?.[id] ?? {};
    return {
      label:     cfg.displayName ?? "Tilpasset lag",
      icon:      cfg.icon        ?? "https://img.icons8.com/color/48/add-layer.png",
      color:     CUSTOM_COLORS[cfg.geometryType] ?? "#9090A8",
      typeField: cfg.typeField   ?? null,
    };
  }
  const base = LAYER_META[id] ?? {};
  return {
    label:     config?.layers?.[id]?.displayName ?? base.label,
    icon:      config?.layers?.[id]?.icon        ?? base.icon,
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
  const [basemap,      setBasemap]      = useState("topo-vector");
  const [liveMeasure,  setLiveMeasure]  = useState(null);
  const [activeTool,   setActiveTool]   = useState(null); // tool key from DRAW_TOOLS
  const [collapsed,    setCollapsed]    = useState(false);

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
    resetSketch(); clearLabels();
    setActiveId(id); setEditingFeature(null); setPendingGeom(null);
    setPhase("idle"); setAttrs({}); setErr(null); setSaved(false); setLiveMeasure(null);
    const geomType = getGeomType(id, config);
    setActiveTool(getTools(geomType)[0]?.key ?? null);
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

  function switchBasemap(id) { view.map.basemap = id; setBasemap(id); }

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

  // Shared attribute form
  function AttrForm({ onSave, onCancel, saveLabel }) {
    return (
      <div className="ep-form">
        <p className="ep-section-label">Egenskaper</p>

        {typeOpts.length > 0 && (
          <label className="ep-field">
            Type
            <select value={attrs[meta.typeField] ?? ""} onChange={(e) => setAttr(meta.typeField, e.target.value)}>
              <option value="">– velg –</option>
              {typeOpts.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
            </select>
          </label>
        )}

        {attrs.Areal_m2 != null && (
          <div className="ep-areal">Areal: <strong>{Number(attrs.Areal_m2).toLocaleString("nb-NO")} m²</strong></div>
        )}

        <label className="ep-field">
          Navn
          <input placeholder="Valgfritt" value={attrs.Navn ?? ""} onChange={(e) => setAttr("Navn", e.target.value)} />
        </label>

        <label className="ep-field">
          Status
          <select value={attrs.Status ?? ""} onChange={(e) => setAttr("Status", e.target.value)}>
            <option value="">– velg –</option>
            {STATUS_OPTS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </select>
        </label>

        <label className="ep-field">
          Beskrivelse
          <textarea rows={2} placeholder="Valgfritt" value={attrs.Beskrivelse ?? ""} onChange={(e) => setAttr("Beskrivelse", e.target.value)} />
        </label>

        {err && <p className="ep-error">{err}</p>}

        <div className="ep-form-actions">
          <button className="ep-btn-save" onClick={onSave} disabled={saving}>
            {saving ? "Lagrer…" : saveLabel}
          </button>
          <button className="ep-btn-ghost" onClick={onCancel}>Avbryt</button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="ep ep-strip">
        <button className="ep-strip-toggle" title="Åpne panel" onClick={() => setCollapsed(false)}>›</button>
        <div className="ep-strip-sep" />
        {visibleLayerIds.map((id) => {
          const info = getLayerInfo(id, config);
          return (
            <div
              key={String(id)}
              className={"ep-strip-dot" + (activeId === id ? " active" : "")}
              style={{ background: info.color }}
              title={info.label}
              onClick={() => { setCollapsed(false); pickLayer(id); }}
            />
          );
        })}
        {activeId !== null && (
          <>
            <div className="ep-strip-sep" />
            {getTools(getGeomType(activeId, config)).map((t) => (
              <span key={t.key} className="ep-strip-tool" title={t.label}>{t.icon}</span>
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="ep">
      <button className="ep-strip-toggle ep-strip-toggle-close" title="Minimer panel" onClick={() => setCollapsed(true)}>‹</button>
      <p className="ep-section-label">Kartlag</p>

      <div className="ep-layers">
        {visibleLayerIds.map((id) => {
          const info    = getLayerInfo(id, config);
          const visible = visibility[id] !== false;
          return (
            <div key={String(id)} className="ep-layer-row">
              <button
                className={"ep-layer-btn" + (activeId === id ? " active" : "") + (visible ? "" : " hidden-layer")}
                onClick={() => pickLayer(id)}
              >
                <LayerIcon icon={info.icon} className="ep-layer-icon" />
                <span className="ep-swatch" style={{ background: info.color, opacity: visible ? 1 : 0.35 }} />
                {info.label}
              </button>
              <button
                className={"ep-eye-btn" + (visible ? "" : " ep-eye-off")}
                title={visible ? "Skjul lag" : "Vis lag"}
                onClick={() => toggleVisibility(id)}
              >
                {visible ? "👁" : "🚫"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="ep-divider" />
      <p className="ep-section-label">Tegning</p>

      {activeId === null && (
        <p className="ep-hint-sub" style={{ padding: "0.3rem 0" }}>
          Velg et lag over for å tegne. Klikk et objekt og velg "Rediger objekt" for å redigere.
        </p>
      )}

      {activeId !== null && (
        <div className="ep-body">

          {/* ── Idle – tool grid ── */}
          {phase === "idle" && activeGeomType && (
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
          )}

          {/* ── Drawing – expanded controls ── */}
          {phase === "drawing" && (() => {
            const toolDef = getTools(activeGeomType).find((t) => t.key === activeTool);
            const isFreehand = activeTool?.includes("freehand");
            const isVertex = !isFreehand && activeGeomType !== "esriGeometryPoint";
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
                    {liveMeasure.type === "length"
                      ? formatLength(liveMeasure.value)
                      : formatArea(liveMeasure.value)}
                  </div>
                )}
                <div className="ep-drawing-actions">
                  {isVertex && (
                    <button
                      type="button"
                      className="ep-drawing-action-btn"
                      onClick={() => sketchRef.current?.undo()}
                      title="Angre siste punkt"
                    >
                      ↩ Angre
                    </button>
                  )}
                  <button
                    type="button"
                    className="ep-drawing-action-btn ep-drawing-action-cancel"
                    onClick={cancelDraw}
                  >
                    × Avbryt
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Attribute form – new feature ── */}
          {phase === "form" && (
            <div>
              <button className="ep-geom-btn" onClick={() => startGeomEdit("form")}>
                ✏ Rediger geometri
              </button>
              <AttrForm onSave={handleSave} onCancel={cancelDraw} saveLabel="Lagre" />
            </div>
          )}

          {/* ── Edit existing ── */}
          {phase === "edit" && (
            <div>
              <div className="ep-edit-badge">
                Redigerer: <strong><LayerIcon icon={meta.icon} className="ep-layer-icon" /> {meta.label}</strong>
              </div>
              <button className="ep-geom-btn" onClick={startGeomEdit}>
                ✏ Rediger geometri
              </button>
              {pendingGeom && (
                <p className="ep-hint-sub" style={{ marginBottom: "0.4rem" }}>Ny geometri klar</p>
              )}
              <AttrForm onSave={handleUpdate} onCancel={cancelEdit} saveLabel="Oppdater" />
            </div>
          )}

          {/* ── Geometry edit in progress ── */}
          {phase === "edit-geom" && (
            <div className="ep-drawing-state">
              <div className="ep-active-tool-badge">
                <span className="ep-active-tool-icon">✏</span>
                <span>Rediger geometri</span>
              </div>
              <p className="ep-drawing-hint">
                Dra i punkter for å omforme · klikk utenfor for å fullføre
              </p>
              {liveMeasure && (
                <div className="ep-live-measure">
                  {liveMeasure.type === "length"
                    ? formatLength(liveMeasure.value)
                    : formatArea(liveMeasure.value)}
                </div>
              )}
              <div className="ep-drawing-actions">
                <button
                  type="button"
                  className="ep-drawing-action-btn ep-drawing-action-confirm"
                  onClick={() => sketchRef.current?.complete()}
                  title="Bekreft geometri"
                >
                  ✓ Ferdig
                </button>
                <button
                  type="button"
                  className="ep-drawing-action-btn"
                  onClick={() => sketchRef.current?.undo()}
                  title="Angre siste endring"
                >
                  ↩ Angre
                </button>
                <button
                  type="button"
                  className="ep-drawing-action-btn ep-drawing-action-cancel"
                  onClick={() => {
                    resetSketch(); clearLabels(); setLiveMeasure(null);
                    setPhase(geomEditReturnPhaseRef.current);
                  }}
                >
                  × Avbryt
                </button>
              </div>
            </div>
          )}

          {saved && <p className="ep-saved">✓ Lagret</p>}
        </div>
      )}

      <div className="ep-divider" />
      <p className="ep-section-label">Bakgrunnskart</p>
      <div className="ep-basemaps">
        {BASEMAPS.map((b) => (
          <button
            key={b.id}
            className={"ep-basemap-btn" + (basemap === b.id ? " active" : "")}
            onClick={() => switchBasemap(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
