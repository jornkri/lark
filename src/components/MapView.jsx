import { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import LayerList from "@arcgis/core/widgets/LayerList.js";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery.js";
import Expand from "@arcgis/core/widgets/Expand.js";
import ScaleBar from "@arcgis/core/widgets/ScaleBar.js";
import { on } from "@arcgis/core/core/reactiveUtils.js";
import { ensureLarkService } from "../services/featureLayerSetup.js";
import { signOut, getPortalUser } from "../services/auth.js";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";
import EditPanel from "./EditPanel.jsx";

// Layer display order: polygons first (bottom), then lines, then points (top)
const LAYER_ORDER = [0, 4, 5, 7, 1, 3, 2, 6];

const LAYER_TITLES = {
  0: "Grøntareal",
  1: "Vegetasjon",
  2: "Tre",
  3: "Sti / vei",
  4: "Hard flate",
  5: "Vann",
  6: "Møblering",
  7: "Konstruksjon",
};

const DELETE_ACTION = {
  title: "Slett objekt",
  id: "delete-feature",
  className: "esri-icon-trash",
};

function buildPopupTemplate(def) {
  const fieldInfos = def.fields
    .filter((f) => f.name !== "OBJECTID")
    .map((f) => ({ fieldName: f.name, label: f.alias }));
  return {
    title: LAYER_TITLES[def.id],
    content: [{ type: "fields", fieldInfos }],
    actions: [DELETE_ACTION],
  };
}

// Symbology matching the AGOL drawingInfo colours
const LAYER_RENDERERS = {
  0: { type: "simple", symbol: { type: "simple-fill", color: [178, 220, 138, 190], outline: { type: "simple-line", color: [88, 148, 58, 220], width: 1.5 } } },
  1: { type: "simple", symbol: { type: "simple-fill", color: [94, 158, 68, 210],   outline: { type: "simple-line", color: [35, 95, 22, 255],   width: 1.2 } } },
  2: { type: "simple", symbol: { type: "simple-marker", style: "circle",  color: [45, 112, 56, 255],  size: 16, outline: { type: "simple-line", color: [148, 210, 120, 255], width: 2.5 } } },
  3: { type: "simple", symbol: { type: "simple-line",   color: [200, 168, 120, 255], width: 3 } },
  4: { type: "simple", symbol: { type: "simple-fill", color: [208, 203, 187, 175], outline: { type: "simple-line", color: [148, 142, 126, 255], width: 1   } } },
  5: { type: "simple", symbol: { type: "simple-fill", color: [150, 200, 224, 190], outline: { type: "simple-line", color: [52, 138, 196, 255],  width: 1.5 } } },
  6: { type: "simple", symbol: { type: "simple-marker", style: "diamond", color: [200, 120, 50, 255],  size: 10, outline: { type: "simple-line", color: [120, 65, 10, 255],   width: 1.5 } } },
  7: { type: "simple", symbol: { type: "simple-fill", color: [188, 168, 130, 200], outline: { type: "simple-line", color: [108, 80, 44, 255],   width: 1.8 } } },
};

export default function MapViewComponent({ onSignOut }) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState("Initialiserer…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [mapView, setMapView] = useState(null);
  const [layersById, setLayersById] = useState(null);

  useEffect(() => {
    let view = null;
    let destroyed = false;

    async function init() {
      try {
        setStatus("Henter brukerinfo…");
        const portalUser = await getPortalUser();
        if (destroyed) return;
        setUser(portalUser);

        setStatus("Klargjør kartlag…");
        const serviceUrl = await ensureLarkService(setStatus);
        if (destroyed) return;

        setStatus("Bygger kart…");

        const orderedDefs = LAYER_ORDER.map((id) =>
          LAYER_DEFINITIONS.find((d) => d.id === id)
        );

        const featureLayers = orderedDefs.map(
          (def) =>
            new FeatureLayer({
              url: `${serviceUrl}/${def.id}`,
              title: LAYER_TITLES[def.id],
              outFields: ["*"],
              renderer: LAYER_RENDERERS[def.id],
              popupTemplate: buildPopupTemplate(def),
            })
        );

        const map = new Map({
          basemap: "topo-vector",
          layers: featureLayers,
        });

        view = new MapView({
          container: mapRef.current,
          map,
          center: [10.75, 59.91],
          zoom: 15,
          ui: { components: ["zoom", "compass", "attribution"] },
          popup: {
            dockEnabled: true,
            dockOptions: { position: "bottom-right", breakpoint: false },
          },
        });

        await view.when();
        if (destroyed) { view.destroy(); return; }

        // ── Slett-handling fra popup (reactiveUtils.on – v5.0 pattern) ────
        on(
          () => view.popup,
          "trigger-action",
          async (event) => {
            if (event.action.id !== "delete-feature") return;
            const feature = view.popup.selectedFeature;
            if (!feature) return;
            const layer = feature.layer;
            if (!layer?.applyEdits) return;
            try {
              await layer.applyEdits({ deleteFeatures: [feature] });
              view.popup.close();
            } catch (e) {
              console.error("Sletting feilet:", e);
            }
          }
        );

        // ── Lagvelger ─────────────────────────────────────────────────────
        const layerList = new LayerList({ view });
        const layerExpand = new Expand({
          view,
          content: layerList,
          expandIcon: "layers",
          expandTooltip: "Kartlag",
          expanded: false,
        });
        view.ui.add(layerExpand, "top-left");

        // ── Bakgrunnskart ──────────────────────────────────────────────────
        const basemapGallery = new BasemapGallery({ view });
        const basemapExpand = new Expand({
          view,
          content: basemapGallery,
          expandIcon: "basemap",
          expandTooltip: "Bakgrunnskart",
          expanded: false,
        });
        view.ui.add(basemapExpand, "top-left");

        // ── Målestokk ──────────────────────────────────────────────────────
        const scaleBar = new ScaleBar({ view, unit: "metric" });
        view.ui.add(scaleBar, "bottom-left");

        // ── Eksponer view og lag til EditPanel ─────────────────────────────
        const byId = {};
        featureLayers.forEach((layer, i) => { byId[LAYER_ORDER[i]] = layer; });
        if (!destroyed) {
          setLayersById(byId);
          setMapView(view);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!destroyed) {
          setError(err.message ?? "Ukjent feil");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      view?.destroy();
    };
  }, []);

  const handleSignOut = () => {
    signOut();
    onSignOut();
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Topplinje */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="app-logo">LARK</span>
          <span className="app-subtitle">Landskapsplanlegger</span>
        </div>
        <div className="top-bar-right">
          {user && <span className="username">{user.fullName}</span>}
          <button className="sign-out-btn" onClick={handleSignOut}>
            Logg ut
          </button>
        </div>
      </div>

      {/* Kart */}
      <div ref={mapRef} className="map-container" />

      {/* Redigeringspanel (React-basert, bruker SketchViewModel – ikke Calcite) */}
      {mapView && layersById && !loading && (
        <div className="edit-panel-wrapper">
          <EditPanel view={mapView} layersById={layersById} />
        </div>
      )}

      {/* Laste-overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner" />
            <p>{status}</p>
          </div>
        </div>
      )}

      {/* Feil-overlay */}
      {error && (
        <div className="error-overlay">
          <div className="error-box">
            <h3>Noe gikk galt</h3>
            <p>{error}</p>
            <button onClick={handleSignOut}>Logg ut og prøv igjen</button>
          </div>
        </div>
      )}
    </div>
  );
}
