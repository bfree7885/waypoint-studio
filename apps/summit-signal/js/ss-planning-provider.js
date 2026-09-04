/**
 * Hiking / activation-planning data boundary.
 *
 * V0.1 does not integrate trail, parking, routing, or DEM sources.
 * This module returns honest not-integrated placeholders so Summit Detail
 * can show the product direction without fabricating AllTrails-like data.
 *
 * Future sources (not implemented): OSM-derived trails, public land /
 * open government datasets, licensed routing providers. Never scrape
 * AllTrails or assume AllTrails data can be copied.
 */
(function (global) {
  "use strict";

  var NOT_INTEGRATED_REASON =
    "Not yet integrated. SignalTerrain has not retrieved trail, parking, or routing data for this summit.";

  var ACTIVATION_ZONE_REASON =
    "The SOTA Activation Zone is typically the area within about 25 m vertically of the summit. " +
    "An overlay needs a reliable elevation model. V0.1 does not draw a zone from guessed contours.";

  var FIELDS = [
    { id: "trailhead", label: "Trailhead" },
    { id: "parking", label: "Parking" },
    { id: "hikingRoute", label: "Hiking route" },
    { id: "distance", label: "Distance" },
    { id: "elevationGain", label: "Elevation gain" },
    { id: "estimatedHikingTime", label: "Estimated hiking time" },
    { id: "activationZone", label: "Activation zone" }
  ];

  function field(id, label, extraReason) {
    return {
      id: id,
      label: label,
      status: "not-integrated",
      value: null,
      display: "Not yet integrated",
      reason: extraReason || NOT_INTEGRATED_REASON
    };
  }

  /**
   * Planning payload for a summit. Never invents trail/parking/hike numbers.
   * @param {object} [_summit] reserved for future per-summit lookups
   */
  function getPlanning(_summit) {
    var items = {};
    for (var i = 0; i < FIELDS.length; i += 1) {
      var f = FIELDS[i];
      items[f.id] = field(
        f.id,
        f.label,
        f.id === "activationZone" ? ACTIVATION_ZONE_REASON : NOT_INTEGRATED_REASON
      );
    }
    return {
      status: "not-integrated",
      provider: "signalterrain-sota-planning-v0",
      intendedSources: [
        "OpenStreetMap-derived trail and trailhead data",
        "public land / open government datasets",
        "licensed routing / elevation providers"
      ],
      forbiddenSources: ["AllTrails scraping", "invented hike stats"],
      items: items,
      fields: FIELDS.slice()
    };
  }

  var api = {
    FIELDS: FIELDS,
    getPlanning: getPlanning
  };

  global.SignalTerrainSotaPlanning = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Planning = api;
})(typeof window !== "undefined" ? window : globalThis);
