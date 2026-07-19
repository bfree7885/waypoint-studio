/**
 * Savant Sommelier — map intelligence contract (architecture only).
 * Prepares seams for parcels, soils, hydrology, climate, and terrain layers.
 * Does not render unfinished overlay products.
 */
(function (global) {
  "use strict";

  var OVERLAY_KINDS = [
    { id: "parcel-boundaries", label: "Parcel boundaries", status: "contract-ready" },
    { id: "soils", label: "Soils", status: "contract-ready" },
    { id: "hydrology", label: "Hydrology", status: "planned" },
    { id: "land-cover", label: "Land cover", status: "planned" },
    { id: "climate-layers", label: "Climate layers", status: "contract-ready" },
    { id: "terrain-layers", label: "Terrain layers (DEM / slope / aspect)", status: "contract-ready" },
    { id: "disease-pressure", label: "Disease pressure surfaces", status: "planned" },
    { id: "future-suitability", label: "Future vineyard suitability", status: "contract-ready" }
  ];

  function createSpatialRequest(opts) {
    opts = opts || {};
    return {
      version: "0.1.0",
      requestedAt: new Date().toISOString(),
      lat: opts.lat != null ? Number(opts.lat) : null,
      lng: opts.lng != null ? Number(opts.lng) : null,
      bbox: opts.bbox || null,
      overlays: (opts.overlays || []).filter(function (id) {
        return OVERLAY_KINDS.some(function (k) { return k.id === id; });
      }),
      analysisRef: opts.analysisRef || null,
      note: "Architectural request only — unfinished overlays are not rendered."
    };
  }

  function clickToAnalyze(lat, lng, label) {
    return {
      kind: "map-click",
      lat: Number(lat),
      lng: Number(lng),
      label: label || "Map selection",
      next: "SavantVineyard.analyzeProperty",
      spatialRequest: createSpatialRequest({
        lat: lat,
        lng: lng,
        overlays: ["terrain-layers", "climate-layers", "future-suitability"]
      })
    };
  }

  function describeFoundation() {
    return {
      version: "0.1.0",
      overlays: OVERLAY_KINDS,
      createSpatialRequest: "SavantMap.createSpatialRequest",
      clickToAnalyze: "SavantMap.clickToAnalyze",
      note: "Clean seams for parcel, soil, hydrology, land cover, climate, and terrain layers — implement when authoritative data exists."
    };
  }

  global.SavantMap = {
    OVERLAY_KINDS: OVERLAY_KINDS,
    createSpatialRequest: createSpatialRequest,
    clickToAnalyze: clickToAnalyze,
    describeFoundation: describeFoundation
  };
})(typeof window !== "undefined" ? window : globalThis);
