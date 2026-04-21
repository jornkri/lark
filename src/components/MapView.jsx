import { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Editor from "@arcgis/core/widgets/Editor.js";
import LayerList from "@arcgis/core/widgets/LayerList.js";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery.js";
import Expand from "@arcgis/core/widgets/Expand.js";
import ScaleBar from "@arcgis/core/widgets/ScaleBar.js";
import { ensureLarkService } from "../services/featureLayerSetup.js";
import { signOut, getPortalUser } from "../services/auth.js";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";

// Layer display order: polygons first, then lines, then points
const LAYER_ORDER = [0, 4, 5, 7, 1, 3, 2, 6];

export default function MapViewComponent({ onSignOut }) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState("Initialiserer…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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
              title: def.name.replace(/_/g, " "),
              outFields: ["*"],
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

        // ── Editor med snapping, true curves og målehjelp ─────────────────
        const editor = new Editor({
          view,
          snappingOptions: {
            enabled: true,
            selfEnabled: true,
            featureSources: featureLayers.map((layer) => ({
              layer,
              enabled: true,
            })),
          },
          supportingWidgetDefaults: {
            sketch: {
              // Aktiver true curves og hjelpetekst
              defaultUpdateOptions: {
                tool: "reshape",
                enableRotation: true,
                enableScaling: true,
                toggleToolOnClick: false,
              },
              defaultCreateOptions: {
                hasZ: false,
              },
              visibleElements: {
                undoRedoMenu: true,
              },
            },
          },
        });
        view.ui.add(editor, "top-right");

        // ── Lagvelger ─────────────────────────────────────────────────────
        const layerList = new LayerList({
          view,
          listItemCreatedFunction: (event) => {
            event.item.actionsSections = [
              [{ title: "Zoom til lag", className: "esri-icon-zoom-in-magnifying-glass", id: "zoom-to" }],
            ];
          },
        });
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
