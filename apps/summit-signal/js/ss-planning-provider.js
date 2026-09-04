/**
 * Hiking / activation-planning data boundary.
 *
 * V0.2 fills candidate OSM access (trails, trailheads, parking) when an
 * access catalog is provided. Route / gain / time / activation-zone stay
 * not-integrated. Never invents AllTrails-like hike stats.
 */
(function (global) {
  "use strict";

  var NOT_INTEGRATED_REASON =
    "Not yet integrated. SignalTerrain has not retrieved trail, parking, or routing data for this summit.";

  var ACTIVATION_ZONE_REASON =
    "The SOTA Activation Zone is typically the area within about 25 m vertically of the summit. " +
    "An overlay needs a reliable elevation model. V0.2 does not draw a zone from guessed contours.";

  var ROUTE_REASON =
    "Hiking route, hike distance, elevation gain, and estimated time are not calculated in V0.2. " +
    "Nearby mapped paths are candidate access features, not a recommended route.";

  var FIELDS = [
    { id: "trailhead", label: "Trailhead" },
    { id: "parking", label: "Parking" },
    { id: "hikingRoute", label: "Hiking route" },
    { id: "distance", label: "Distance" },
    { id: "elevationGain", label: "Elevation gain" },
    { id: "estimatedHikingTime", label: "Estimated hiking time" },
    { id: "activationZone", label: "Activation zone" }
  ];

  var LATER_IDS = ["hikingRoute", "distance", "elevationGain", "estimatedHikingTime", "activationZone"];

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

  function laterFields() {
    var items = {};
    for (var i = 0; i < FIELDS.length; i += 1) {
      var f = FIELDS[i];
      if (LATER_IDS.indexOf(f.id) === -1) continue;
      items[f.id] = field(
        f.id,
        f.label,
        f.id === "activationZone" ? ACTIVATION_ZONE_REASON : ROUTE_REASON
      );
    }
    return items;
  }

  function summarizeList(kind, catalog) {
    var AccessModel = global.SignalTerrainSotaAccessModel;
    if (!catalog) {
      return {
        id: kind,
        status: "not-integrated",
        value: null,
        display: "Not yet integrated",
        reason: NOT_INTEGRATED_REASON,
        features: []
      };
    }
    if (catalog.status === "pending") {
      return {
        id: kind,
        status: "pending",
        value: null,
        display: "Looking up mapped access…",
        reason: null,
        features: []
      };
    }
    if (catalog.status === "unavailable") {
      return {
        id: kind,
        status: "unavailable",
        value: null,
        display: "OpenStreetMap data unavailable",
        reason: catalog.reason || "OpenStreetMap data unavailable",
        features: []
      };
    }
    var list =
      kind === "trails"
        ? catalog.trails || []
        : kind === "trailheads"
          ? catalog.trailheads || []
          : catalog.parking || [];
    var routes = kind === "trails" ? catalog.namedHikingRoutes || [] : [];
    if (catalog.status === "empty" || (list.length === 0 && routes.length === 0)) {
      var emptyLabel =
        kind === "trails"
          ? "No mapped paths found in this search area"
          : kind === "trailheads"
            ? "No mapped trailheads found in this search area"
            : "No mapped parking found in this search area";
      return {
        id: kind,
        status: "empty",
        value: [],
        display: emptyLabel,
        reason: emptyLabel + ". OpenStreetMap may be incomplete.",
        features: []
      };
    }
    var count = list.length;
    var unnamed = AccessModel && kind === "trails" ? AccessModel.unnamedTrailCount(list) : 0;
    var names = AccessModel && kind === "trails" ? AccessModel.namedTrailNames(list, routes, 8) : [];
    var display;
    if (kind === "trails") {
      display =
        count +
        " mapped path" +
        (count === 1 ? "" : "s") +
        " nearby" +
        (unnamed ? " · " + unnamed + " unnamed" : "");
    } else if (kind === "trailheads") {
      display = count + " mapped trailhead" + (count === 1 ? "" : "s") + " nearby";
    } else {
      display = count + " mapped parking area" + (count === 1 ? "" : "s") + " nearby";
    }
    return {
      id: kind,
      status: "ok",
      value: list,
      display: display,
      names: names,
      unnamedCount: unnamed,
      features: list,
      namedHikingRoutes: routes
    };
  }

  /**
   * Planning payload for a summit.
   * Pass an access catalog from SignalTerrainSotaAccess.loadAccess when V0.2 data exists.
   */
  function getPlanning(summit, accessCatalog) {
    var items = laterFields();
    var access = summarizeList("trails", accessCatalog);
    var trailheads = summarizeList("trailheads", accessCatalog);
    var parking = summarizeList("parking", accessCatalog);
    items.trailhead = {
      id: "trailhead",
      label: "Trailheads",
      status: trailheads.status,
      value: trailheads.status === "ok" ? trailheads.features : null,
      display: trailheads.display,
      reason: trailheads.reason || null,
      features: trailheads.features || []
    };
    items.parking = {
      id: "parking",
      label: "Parking",
      status: parking.status,
      value: parking.status === "ok" ? parking.features : null,
      display: parking.display,
      reason: parking.reason || null,
      features: parking.features || []
    };
    var status;
    if (!accessCatalog) status = "not-integrated";
    else if (accessCatalog.status === "pending") status = "pending";
    else if (accessCatalog.status === "unavailable") status = "unavailable";
    else if (accessCatalog.status === "empty") status = "empty";
    else status = "ok";
    return {
      status: status,
      provider: "signalterrain-sota-planning-v0",
      accessStatus: accessCatalog ? accessCatalog.status : "not-integrated",
      access: access,
      trailheads: trailheads,
      parking: parking,
      caveat: (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CAVEAT) || "",
      candidateNote:
        (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CANDIDATE_NOTE) || "",
      query: accessCatalog && accessCatalog.query ? accessCatalog.query : null,
      retrievedAt: accessCatalog && accessCatalog.retrievedAt ? accessCatalog.retrievedAt : null,
      intendedSources: [
        "OpenStreetMap-derived trail and trailhead data",
        "public land / open government datasets",
        "licensed routing / elevation providers"
      ],
      forbiddenSources: ["AllTrails scraping", "invented hike stats", "fabricated routes"],
      items: items,
      fields: FIELDS.slice()
    };
  }

  var api = {
    FIELDS: FIELDS,
    LATER_IDS: LATER_IDS,
    getPlanning: getPlanning
  };

  global.SignalTerrainSotaPlanning = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Planning = api;
})(typeof window !== "undefined" ? window : globalThis);
