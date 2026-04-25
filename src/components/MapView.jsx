import { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import { on } from "@arcgis/core/core/reactiveUtils.js";
import { ensureLarkService, provisionCustomLayers } from "../services/featureLayerSetup.js";
import { saveConfig, isCustomLayerId } from "../services/appConfig.js";
import { signOut, getPortalUser } from "../services/auth.js";
import { LAYER_DEFINITIONS } from "../config/dataModel.js";
import EditPanel from "./EditPanel.jsx";

// Draw order: polygons first (bottom), then lines, then points (top)
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

const EDIT_ACTION = {
  title: "Rediger objekt",
  id: "edit-feature",
  className: "esri-icon-edit",
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
    actions: [EDIT_ACTION, DELETE_ACTION],
  };
}

function buildCustomPopupTemplate(clientId, layerCfg) {
  const fieldInfos = [];
  if (layerCfg.typeField) fieldInfos.push({ fieldName: layerCfg.typeField, label: "Type" });
  fieldInfos.push(
    { fieldName: "Navn",        label: "Navn"        },
    { fieldName: "Status",      label: "Status"      },
    { fieldName: "Beskrivelse", label: "Beskrivelse" },
  );
  return {
    title: layerCfg.displayName,
    content: [{ type: "fields", fieldInfos }],
    actions: [EDIT_ACTION, DELETE_ACTION],
  };
}

// Symbology for standard layers
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

// Default symbology for custom layers by geometry type
const CUSTOM_RENDERERS = {
  esriGeometryPolygon:  { type: "simple", symbol: { type: "simple-fill", color: [160, 130, 210, 170], outline: { type: "simple-line", color: [100, 60, 160, 220], width: 1.5 } } },
  esriGeometryPolyline: { type: "simple", symbol: { type: "simple-line", color: [110, 60, 180, 255], width: 3 } },
  esriGeometryPoint:    { type: "simple", symbol: { type: "simple-marker", style: "circle", color: [130, 80, 210, 255], size: 12, outline: { type: "simple-line", color: [70, 30, 140, 255], width: 2 } } },
};

export default function MapViewComponent({ config, onSignOut, onOpenConfig, onConfigUpdate }) {
  const mapRef = useRef(null);
  const [status,      setStatus]      = useState("Initialiserer…");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [user,        setUser]        = useState(null);
  const [mapView,     setMapView]     = useState(null);
  const [layersById,  setLayersById]  = useState(null);
  const [editRequest, setEditRequest] = useState(null);

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

        // Provision any custom layers that don't have an AGOL layer ID yet
        const updatedLayers = await provisionCustomLayers(serviceUrl, config?.layers, setStatus);
        if (destroyed) return;

        let effectiveConfig = config;
        if (updatedLayers !== config?.layers) {
          effectiveConfig = { ...config, layers: updatedLayers };
          saveConfig(effectiveConfig);
          onConfigUpdate?.(effectiveConfig);
        }

        setStatus("Bygger kart…");

        // Standard feature layers in draw order
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

        // Custom feature layers (already provisioned)
        const customEntries = Object.entries(effectiveConfig?.layers ?? {}).filter(
          ([key, val]) => isCustomLayerId(key) && val.agolLayerId != null && val.enabled !== false
        );

        const customFeatureLayers = customEntries.map(([key, val]) =>
          new FeatureLayer({
            url: `${serviceUrl}/${val.agolLayerId}`,
            title: val.displayName,
            outFields: ["*"],
            renderer: CUSTOM_RENDERERS[val.geometryType] ?? CUSTOM_RENDERERS["esriGeometryPoint"],
            popupTemplate: buildCustomPopupTemplate(key, val),
          })
        );

        const map = new Map({
          basemap: "topo-vector",
          layers: [...featureLayers, ...customFeatureLayers],
        });

        view = new MapView({
          container: mapRef.current,
          map,
          center: [10.75, 59.91],
          zoom: 15,
          ui: { components: [] },
          popup: {
            dockEnabled: true,
            dockOptions: { position: "bottom-right", breakpoint: false },
          },
        });

        await view.when();
        if (destroyed) { view.destroy(); return; }

        // Build layersById: standard layers keyed by numeric ID, custom by clientId string
        const byId = {};
        featureLayers.forEach((layer, i) => { byId[LAYER_ORDER[i]] = layer; });
        customEntries.forEach(([key], i) => { byId[key] = customFeatureLayers[i]; });

        // Popup actions
        on(
          () => view.popup,
          "trigger-action",
          async (event) => {
            const feature = view.popup.selectedFeature;
            if (!feature) return;

            if (event.action.id === "delete-feature") {
              if (!feature.layer?.applyEdits) return;
              try {
                await feature.layer.applyEdits({ deleteFeatures: [feature] });
                view.popup.close();
              } catch (e) {
                console.error("Sletting feilet:", e);
              }
            }

            if (event.action.id === "edit-feature") {
              const layerEntry = Object.entries(byId).find(([, l]) => l === feature.layer);
              if (!layerEntry) return;
              view.popup.close();
              const rawKey = layerEntry[0];
              // Preserve string key for custom layers; convert to number for standard
              const layerId = isCustomLayerId(rawKey) ? rawKey : Number(rawKey);
              setEditRequest({ graphic: feature, layerId });
            }
          }
        );

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = () => { signOut(); onSignOut(); };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Topplinje */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="app-logo">{config?.appName || "LARK"}</span>
          <span className="app-subtitle">{config?.projectName || "Landskapsplanlegger"}</span>
        </div>
        <div className="top-bar-right">
          {user && <span className="username">{user.fullName}</span>}
          <button className="sign-out-btn" title="Innstillinger" onClick={onOpenConfig}>⚙</button>
          <button className="sign-out-btn" onClick={handleSignOut}>Logg ut</button>
        </div>
      </div>

      {/* Kart */}
      <div ref={mapRef} className="map-container" />

      {/* Zoom-knapper */}
      {mapView && (
        <div className="zoom-controls">
          <button className="zoom-btn" title="Zoom inn" onClick={() => mapView.zoom++}>+</button>
          <button className="zoom-btn" title="Zoom ut" onClick={() => mapView.zoom--}>−</button>
        </div>
      )}

      {/* Redigeringspanel */}
      {mapView && layersById && !loading && (
        <div className="edit-panel-wrapper">
          <EditPanel
            view={mapView}
            layersById={layersById}
            config={config}
            editRequest={editRequest}
            onEditDone={() => setEditRequest(null)}
          />
        </div>
      )}

      {/* Esri-attribut */}
      <div className="esri-attribution">
        Powered by <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>
      </div>

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
