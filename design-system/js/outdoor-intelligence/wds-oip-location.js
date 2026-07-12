/**
 * Waypoint Outdoor Intelligence Platform — location resolution
 * Delegates to WDS.regionalIntelligence.engine when available.
 * Does not silently substitute Pike County / engine defaults.
 */
(function (global) {
  "use strict";

  var OIP = global.WDS && global.WDS.outdoorIntelligence;
  if (!OIP || !OIP.model) return;

  var M = OIP.model;

  function unavailableLocation() {
    return {
      source: "unavailable",
      lat: null,
      lng: null,
      displayTitle: "Location unavailable",
      placeLabel: "Location unavailable",
      unavailable: true,
      isFallbackLocation: false,
      timestamp: Date.now()
    };
  }

  function resolveLocation(request) {
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.resolveLocation) {
      return RI.engine.resolveLocation(request);
    }

    request = request || {};
    var loc = request.location;

    if (loc && isFinite(Number(loc.lat)) && isFinite(Number(loc.lng))) {
      M.devLog("resolveLocation: using provided location", loc.source);
      return Promise.resolve(loc);
    }

    if (!loc && global.WDS && global.WDS.location) {
      loc = global.WDS.location.getState();
      if (loc && isFinite(Number(loc.lat)) && isFinite(Number(loc.lng))) {
        M.devLog("resolveLocation: using WDS.location state", loc.source);
        return Promise.resolve(loc);
      }
      if (loc && loc.unavailable) {
        return Promise.resolve(loc);
      }
    }

    if (request.allowDefaultLocation === true && global.WDS && global.WDS.location && global.WDS.location.loadIndex) {
      var base = request.contentEngineBase || "design-system/content-engine/";
      return global.WDS.location.loadIndex(base).then(function (index) {
        var fallback = global.WDS.location.defaultState(index);
        fallback.isFallbackLocation = true;
        M.devLog("resolveLocation: explicit default", fallback.name);
        return fallback;
      }).catch(function () {
        return unavailableLocation();
      });
    }

    M.devLog("resolveLocation: unavailable (no silent default)");
    return Promise.resolve(unavailableLocation());
  }

  function isFiniteCoord(n) {
    return isFinite(Number(n));
  }

  M.isFiniteCoord = isFiniteCoord;

  OIP.location = {
    resolve: resolveLocation,
    fallbackState: M.buildFallbackLocationState,
    unavailableLocation: unavailableLocation
  };
})(window);
