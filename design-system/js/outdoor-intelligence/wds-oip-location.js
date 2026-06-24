/**
 * Waypoint Outdoor Intelligence Platform — location resolution
 * Delegates to WDS.regionalIntelligence.engine when available.
 */
(function (global) {
  "use strict";

  var OIP = global.WDS && global.WDS.outdoorIntelligence;
  if (!OIP || !OIP.model) return;

  var M = OIP.model;

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
    }

    var base = request.contentEngineBase || "design-system/content-engine/";
    if (global.WDS && global.WDS.location && global.WDS.location.loadIndex) {
      return global.WDS.location.loadIndex(base).then(function (index) {
        var fallback = global.WDS.location.defaultState(index);
        M.devLog("resolveLocation: fallback via regions index", fallback.name);
        return fallback;
      }).catch(function () {
        M.devLog("resolveLocation: index load failed — engine default");
        return M.buildFallbackLocationState();
      });
    }

    M.devLog("resolveLocation: WDS.location unavailable — engine default");
    return Promise.resolve(M.buildFallbackLocationState());
  }

  function isFiniteCoord(n) {
    return isFinite(Number(n));
  }

  M.isFiniteCoord = isFiniteCoord;

  OIP.location = {
    resolve: resolveLocation,
    fallbackState: M.buildFallbackLocationState
  };
})(window);
