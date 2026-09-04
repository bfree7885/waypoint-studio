/**
 * Hiking / activation-planning data boundary.
 *
 * V0.2 fills candidate OSM access. V0.3 adds user-selected start + Valhalla
 * route + USGS 3DEP profile. Activation-zone polygons stay out. Never invents
 * hike stats or a "best" trailhead.
 */
(function (global) {
  "use strict";

  var NOT_INTEGRATED_REASON =
    "Not yet integrated. SignalTerrain has not retrieved trail, parking, or routing data for this summit.";

  var ACTIVATION_ZONE_REASON =
    "The SOTA Activation Zone is typically the area within about 25 m vertically of the summit. " +
    "V0.3 samples USGS 3DEP along a hike but does not draw a zone polygon. A contour, not a circle, is required.";

  var ROUTE_REASON =
    "Select a mapped parking area or trailhead, then choose Start hike here. SignalTerrain does not pick a best access point.";

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
  var HIKE_IDS = ["hikingRoute", "distance", "elevationGain", "estimatedHikingTime"];

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
   * accessCatalog: V0.2 OSM access.
   * hike: { selectedAccess, route, elevation } from V0.3 providers.
   */
  function getPlanning(summit, accessCatalog, hike) {
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
    applyHike(items, summit, hike);
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
      hikeStatus: hike && hike.route ? hike.route.status : "idle",
      access: access,
      trailheads: trailheads,
      parking: parking,
      hike: hike || null,
      caveat: (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CAVEAT) || "",
      candidateNote:
        (global.SignalTerrainSotaAccessModel && global.SignalTerrainSotaAccessModel.CANDIDATE_NOTE) || "",
      query: accessCatalog && accessCatalog.query ? accessCatalog.query : null,
      retrievedAt: accessCatalog && accessCatalog.retrievedAt ? accessCatalog.retrievedAt : null,
      intendedSources: [
        "OpenStreetMap-derived trail and trailhead data",
        "Valhalla pedestrian routing on OSM",
        "USGS 3DEP elevation"
      ],
      forbiddenSources: ["AllTrails scraping", "invented hike stats", "fabricated routes", "straight-line as hike distance"],
      items: items,
      fields: FIELDS.slice()
    };
  }

  function applyHike(items, summit, hike) {
    var route = hike && hike.route;
    var elev = hike && hike.elevation;
    var start = hike && hike.selectedAccess;
    if (!start && !route) {
      items.hikingRoute.display = "Not started";
      items.hikingRoute.reason = ROUTE_REASON;
      return;
    }
    if (route && route.status === "pending") {
      items.hikingRoute.status = "pending";
      items.hikingRoute.display = "Calculating pedestrian route…";
      items.distance.status = "pending";
      items.distance.display = "Calculating…";
      items.estimatedHikingTime.status = "pending";
      items.estimatedHikingTime.display = "Calculating…";
      items.elevationGain.status = "pending";
      items.elevationGain.display = "Waiting for route…";
      return;
    }
    if (route && (route.status === "unavailable" || route.status === "timeout" || route.status === "malformed" || route.status === "invalid-start" || route.status === "no-route")) {
      items.hikingRoute.status = route.status;
      items.hikingRoute.display = route.status === "no-route" ? "No pedestrian/hiking route found" : "Unavailable";
      items.hikingRoute.reason = route.reason;
      items.distance.status = route.status;
      items.distance.display = "Unavailable";
      items.distance.reason = "Route distance is not replaced with straight-line distance.";
      items.estimatedHikingTime.status = "unavailable";
      items.estimatedHikingTime.display = "Unavailable";
      items.elevationGain.status = "unavailable";
      items.elevationGain.display = "Unavailable";
      return;
    }
    if (route && route.status === "ok") {
      items.hikingRoute.status = "ok";
      items.hikingRoute.display = "Calculated pedestrian route";
      items.hikingRoute.value = route;
      items.hikingRoute.reason = route.attribution;
      items.distance.status = "ok";
      items.distance.display = route.distanceLabel || "Unavailable";
      items.distance.value = route.distanceKm;
      items.distance.reason = "Calculated route distance, not straight-line.";
      if (route.durationLabel) {
        items.estimatedHikingTime.status = "ok";
        items.estimatedHikingTime.display = route.durationLabel;
        items.estimatedHikingTime.value = route.durationSec;
        items.estimatedHikingTime.reason = "Valhalla pedestrian costing duration (estimate, rounded).";
      } else if (elev && (elev.status === "ok" || elev.status === "partial") && elev.gainM != null && route.distanceKm != null) {
        var sec = (route.distanceKm / 5 + elev.gainM / 600) * 3600;
        var Geo = global.SignalTerrainSotaGeo;
        var estimateLabel = null;
        try {
          if (Geo && typeof Geo.formatDurationEstimate === "function") {
            estimateLabel = Geo.formatDurationEstimate(sec);
          }
        } catch (e) {
          estimateLabel = null;
        }
        if (estimateLabel) {
          items.estimatedHikingTime.status = "ok";
          items.estimatedHikingTime.display = estimateLabel;
          items.estimatedHikingTime.value = sec;
          items.estimatedHikingTime.reason =
            "SignalTerrain estimate: distance(km)/5 + gain(m)/600 hours. Not a personal pace model.";
        } else {
          items.estimatedHikingTime.status = "unavailable";
          items.estimatedHikingTime.display = "Unavailable";
          items.estimatedHikingTime.reason = "Duration formatter unavailable.";
        }
      } else {
        items.estimatedHikingTime.status = "unavailable";
        items.estimatedHikingTime.display = "Unavailable";
        items.estimatedHikingTime.reason = "No legitimate duration from the router, and elevation is unavailable for an estimate.";
      }
      if (!elev || elev.status === "pending") {
        items.elevationGain.status = "pending";
        items.elevationGain.display = "Sampling USGS 3DEP…";
      } else if (elev.status === "ok" || elev.status === "partial") {
        items.elevationGain.status = elev.status;
        items.elevationGain.display = elev.gainLabel || "Unavailable";
        items.elevationGain.value = elev.gainM;
        items.elevationGain.reason = elev.methodology;
      } else {
        items.elevationGain.status = "unavailable";
        items.elevationGain.display = "Unavailable";
        items.elevationGain.reason = elev.reason || "Elevation data unavailable. The calculated route is still shown.";
      }
    }
  }

  var api = {
    FIELDS: FIELDS,
    LATER_IDS: LATER_IDS,
    HIKE_IDS: HIKE_IDS,
    getPlanning: getPlanning
  };

  global.SignalTerrainSotaPlanning = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Planning = api;
})(typeof window !== "undefined" ? window : globalThis);
