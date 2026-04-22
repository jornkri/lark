import { useEffect, useRef, useState } from "react";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";

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

const GEOM_TOOL = {
  esriGeometryPolygon:  "polygon",
  esriGeometryPolyline: "polyline",
  esriGeometryPoint:    "point",
};

const STATUS_OPTS = [
  { code: "PLAN",  label: "Planlagt"       },
  { code: "EKSIS", label: "Eksisterende"   },
  { code: "UNDER", label: "Under utbygging"},
  { code: "FJER",  label: "Skal fjernes"  },
];

function getTypeOpts(layerId, fieldName) {
  if (!fieldName) return [];
  const def = LAYER_DEFINITIONS.find(d => d.id === layerId);
  return def?.fields.find(f => f.name === fieldName)?.domain?.codedValues ?? [];
}

export default function EditPanel({ view, layersById }) {
  const [activeId, setActiveId] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | drawing | form
  const [pendingGeom, setPendingGeom] = useState(null);
  const [attrs, setAttrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [saved, setSaved] = useState(false);

  const sketchRef = useRef(null);
  const tempLayerRef = useRef(null);

  useEffect(() => {
    if (!view) return;
    const gl = new GraphicsLayer({ listMode: "hide" });
    view.map.add(gl);
    tempLayerRef.current = gl;
    return () => { gl.removeAll(); view.map.remove(gl); };
  }, [view]);

  useEffect(() => () => { sketchRef.current?.cancel(); sketchRef.current?.destroy(); }, []);

  function pickLayer(id) {
    cancelDraw();
    setActiveId(id);
    setPhase("idle");
    setPendingGeom(null);
    setAttrs({});
    setErr(null);
    setSaved(false);
  }

  function startDraw() {
    const def = LAYER_DEFINITIONS.find(d => d.id === activeId);
    const sk = new SketchViewModel({
      view,
      layer: tempLayerRef.current,
      snappingOptions: {
        enabled: true,
        selfEnabled: true,
        featureSources: Object.values(layersById).map(l => ({ layer: l, enabled: true })),
      },
    });
    sketchRef.current = sk;
    setPhase("drawing");
    sk.create(GEOM_TOOL[def.geometryType]);
    sk.on("create", evt => {
      if (evt.state === "complete") {
        const geom = evt.graphic.geometry;
        setPendingGeom(geom);
        if (geom.type === "polygon") {
          const areaSqm = Math.abs(geometryEngine.geodesicArea(geom, "square-meters"));
          setAttrs(a => ({ ...a, Areal_m2: Math.round(areaSqm * 10) / 10 }));
        }
        setPhase("form");
        sk.destroy();
        sketchRef.current = null;
      } else if (evt.state === "cancel") {
        setPhase("idle");
        sk.destroy();
        sketchRef.current = null;
      }
    });
  }

  function cancelDraw() {
    sketchRef.current?.cancel();
    sketchRef.current?.destroy();
    sketchRef.current = null;
    tempLayerRef.current?.removeAll();
    setPhase("idle");
    setPendingGeom(null);
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const result = await layersById[activeId].applyEdits({
        addFeatures: [new Graphic({ geometry: pendingGeom, attributes: attrs })],
      });
      const e = result.addFeatureResults[0]?.error;
      if (e) throw new Error(e.message ?? JSON.stringify(e));
      tempLayerRef.current?.removeAll();
      setPhase("idle");
      setPendingGeom(null);
      setAttrs({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  function setAttr(key, val) { setAttrs(a => ({ ...a, [key]: val })); }

  const meta = activeId !== null ? LAYER_META[activeId] : null;
  const typeOpts = meta ? getTypeOpts(activeId, meta.typeField) : [];

  return (
    <div className="ep">
      <p className="ep-section-label">Tegnelag</p>

      <div className="ep-layers">
        {LAYER_DEFINITIONS.map(def => {
          const m = LAYER_META[def.id];
          return (
            <button
              key={def.id}
              className={"ep-layer-btn" + (activeId === def.id ? " active" : "")}
              onClick={() => pickLayer(def.id)}
            >
              <span className="ep-swatch" style={{ background: m.color }} />
              {m.label}
            </button>
          );
        })}
      </div>

      {activeId !== null && (
        <div className="ep-body">
          {phase === "idle" && (
            <button className="ep-draw-btn" onClick={startDraw}>
              + Tegn {meta.label}
            </button>
          )}

          {phase === "drawing" && (
            <div className="ep-hint">
              <p>Klikk i kartet for å starte</p>
              <p className="ep-hint-sub">Dobbelklikk / Enter for å fullføre</p>
              <button className="ep-btn-ghost" onClick={cancelDraw}>Avbryt</button>
            </div>
          )}

          {phase === "form" && (
            <div className="ep-form">
              <p className="ep-section-label">Egenskaper</p>

              {typeOpts.length > 0 && (
                <label className="ep-field">
                  Type
                  <select value={attrs[meta.typeField] ?? ""} onChange={e => setAttr(meta.typeField, e.target.value)}>
                    <option value="">– velg –</option>
                    {typeOpts.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                  </select>
                </label>
              )}

              {attrs.Areal_m2 != null && (
                <div className="ep-areal">
                  Areal: <strong>{attrs.Areal_m2.toLocaleString("nb-NO")} m²</strong>
                </div>
              )}

              <label className="ep-field">
                Navn
                <input placeholder="Valgfritt" value={attrs.Navn ?? ""} onChange={e => setAttr("Navn", e.target.value)} />
              </label>

              <label className="ep-field">
                Status
                <select value={attrs.Status ?? ""} onChange={e => setAttr("Status", e.target.value)}>
                  <option value="">– velg –</option>
                  {STATUS_OPTS.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                </select>
              </label>

              <label className="ep-field">
                Beskrivelse
                <textarea rows={2} placeholder="Valgfritt" value={attrs.Beskrivelse ?? ""} onChange={e => setAttr("Beskrivelse", e.target.value)} />
              </label>

              {err && <p className="ep-error">{err}</p>}

              <div className="ep-form-actions">
                <button className="ep-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? "Lagrer…" : "Lagre"}
                </button>
                <button className="ep-btn-ghost" onClick={cancelDraw}>Avbryt</button>
              </div>
            </div>
          )}

          {saved && <p className="ep-saved">✓ Lagret</p>}
        </div>
      )}
    </div>
  );
}
