# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build
npm run preview   # preview production build
```

## Architecture

**LARK** is a React + Vite single-page app for landscape planners. It uses ArcGIS Maps SDK for JavaScript (`@arcgis/core`) for maps and editing, and stores all spatial data as Hosted Feature Layers in the authenticated user's ArcGIS Online account.

### Auth flow

`src/services/auth.js` registers an `OAuthInfo` with client ID `NeupWdxW2ksdQT59` against `https://www.arcgis.com`. On load, `App.jsx` calls `checkSignIn()` which uses `IdentityManager.checkSignInStatus()`. If not signed in, the user sees `LoginPage`, which calls `signIn()` → redirect-based OAuth. After returning, the app re-checks sign-in status.

### First-run provisioning

`src/services/featureLayerSetup.js` → `ensureLarkService(onStatus)`:
1. Checks `localStorage` for a cached service URL (`lark_service_url`).
2. If not cached, calls ArcGIS REST `createService` API to create a Feature Service named `LARK_Landskapsplan` in the user's AGOL account.
3. POSTs `addToDefinition` with all 8 layer definitions to provision the schema.
4. Caches the service URL in `localStorage`.

If you need to re-provision (e.g. schema changed), call `clearServiceCache()` from `featureLayerSetup.js`.

### Data model

`src/config/dataModel.js` is the single source of truth for all layer schemas. It exports:
- `SERVICE_NAME` — the AGOL service name (`"LARK_Landskapsplan"`)
- `LAYER_DEFINITIONS` — array of 8 layer definition objects, each with `id`, `geometryType`, `fields` (with embedded domain objects), and `drawingInfo`

Layer IDs are stable and used directly as URL suffixes (`${serviceUrl}/${def.id}`). The layer order in `MapView.jsx` (`LAYER_ORDER`) controls draw order: polygons (0,4,5,7), then lines (3), then points (2,6), bottom to top.

All domain lists are defined inline in `dataModel.js` as `codedValue` objects and embedded directly into field definitions — no separate domain registration step needed.

### Map component

`src/components/MapView.jsx` initialises the `MapView` inside a `useEffect` with a `destroyed` flag to handle React strict-mode double-invocation safely. The cleanup function calls `view.destroy()`.

The Esri `Editor` widget is added with:
- `snappingOptions.enabled: true` with all feature layers as sources
- `snappingOptions.selfEnabled: true` for self-snapping while drawing

### ArcGIS CSS

`@arcgis/core/assets/esri/themes/light/main.css` is imported in `src/main.jsx`. React StrictMode is intentionally **not** used (removed from `main.jsx`) to avoid double-initialising the ArcGIS `MapView`.

### OAuth redirect URI

For local dev, `http://localhost:5173` must be registered as an allowed redirect URI for app ID `NeupWdxW2ksdQT59` at https://developers.arcgis.com/applications/. Add the production URL when deploying.
