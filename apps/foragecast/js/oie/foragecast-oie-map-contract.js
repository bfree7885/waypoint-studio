/**
 * ForageCast OIE — Map intelligence contract (architecture only).
 * Defines interfaces for future spatial layers. Does not render unfinished features.
 */
(function (global) {
  "use strict";

  /**
   * Future overlay kinds the UI may request once data exists.
   */
  var OVERLAY_KINDS = [
    { id: "heat-map", label: "Heat maps", status: "contract-ready" },
    { id: "habitat-suitability", label: "Habitat suitability", status: "contract-ready" },
    { id: "species-overlay", label: "Species overlays", status: "contract-ready" },
    { id: "observation-density", label: "Observation density", status: "planned" },
    { id: "public-land", label: "Public land overlays", status: "planned" },
    { id: "terrain-suitability", label: "Terrain-derived suitability", status: "planned" }
  ];

  /**
   * Build a spatial request object without executing unfinished map work.
   */
  function createSpatialRequest(opts) {
    opts = opts || {};
    return {
      version: "0.1.0",
      requestedAt: new Date().toISOString(),
      speciesId: opts.speciesId || null,
      bbox: opts.bbox || null,
      overlays: (opts.overlays || []).filter(function (id) {
        return OVERLAY_KINDS.some(function (k) { return k.id === id; });
      }),
      derivedRef: opts.derivedRef || null,
      scoredRef: opts.scoredRef || null,
      note: "Architectural request only — no unfinished overlay is rendered."
    };
  }

  /**
   * Project current OIE scores onto schematic zones for today’s educational map.
   * This is not a georeferenced heat map.
   */
  function schematicSuitability(scored, zones, species) {
    if (!global.ForageCastModel || !species || !zones) {
      return {
        kind: "schematic-suitability",
        status: "unavailable",
        cells: []
      };
    }
    var conditions = {
      inputs: {
        recentRainfall: scored.factorValues.recentPrecipitation,
        temperature: scored.factorValues.temperaturePattern,
        soilMoisture: scored.factorValues.soilMoisture,
        seasonTiming: scored.factorValues.seasonalTiming
      },
      labels: {},
      region: {}
    };
    var cells = zones.map(function (zone) {
      var zr = ForageCastModel.computeZonePrediction(species, zone, conditions);
      return {
        zoneId: zone.id,
        name: zone.name,
        score: zr.score,
        level: zr.level,
        futureOverlays: ["habitat-suitability", "species-overlay"]
      };
    });
    return {
      kind: "schematic-suitability",
      status: "educational-schematic",
      speciesId: species.id,
      cells: cells,
      contract: OVERLAY_KINDS
    };
  }

  function describeFoundation() {
    return {
      version: "0.1.0",
      overlays: OVERLAY_KINDS,
      createSpatialRequest: "ForageCastOIE.map.createSpatialRequest",
      schematicSuitability: "ForageCastOIE.map.schematicSuitability",
      note: "Clean seams for heat maps, habitat suitability, species overlays, observation density, public land, and terrain suitability — implement when data exists."
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.map = {
    OVERLAY_KINDS: OVERLAY_KINDS,
    createSpatialRequest: createSpatialRequest,
    schematicSuitability: schematicSuitability,
    describeFoundation: describeFoundation
  };
})(typeof window !== "undefined" ? window : globalThis);
