/**
 * Waypoint Studio — Regional intelligence service
 * Public API for all Waypoint apps. Call get() — never assemble sources directly in UI.
 */
(function (global) {
  "use strict";

  var RI = global.WDS && global.WDS.regionalIntelligence;
  if (!RI || !RI.sources) return;

  var serviceConfig = {
    contentEngineBase: "design-system/content-engine/",
    includeWeather: true,
    defaultRegionId: RI.DEFAULT_REGION_ID
  };

  var lastSnapshot = null;

  function configure(options) {
    options = options || {};
    if (options.contentEngineBase) {
      serviceConfig.contentEngineBase = options.contentEngineBase.replace(/\/?$/, "/");
    }
    if (options.includeWeather != null) serviceConfig.includeWeather = !!options.includeWeather;
    if (options.defaultRegionId) serviceConfig.defaultRegionId = options.defaultRegionId;
    return Object.assign({}, serviceConfig);
  }

  function normalizeRequest(request) {
    request = request || {};
    var loc = request.location;
    if (!loc && global.WDS && global.WDS.location) {
      loc = global.WDS.location.getState();
    }
    return {
      location: loc,
      bundle: request.bundle || null,
      regionId: request.regionId ||
        (loc && loc.contentBundle) ||
        serviceConfig.defaultRegionId,
      contentEngineBase: request.contentEngineBase || serviceConfig.contentEngineBase,
      includeWeather: request.includeWeather != null
        ? request.includeWeather
        : serviceConfig.includeWeather,
      weatherHints: request.weatherHints || null
    };
  }

  function loadBundle(regionId, base) {
    if (global.WDS && global.WDS.contentEngine && global.WDS.contentEngine.loadRegion) {
      return global.WDS.contentEngine.loadRegion(regionId, base);
    }
    return fetch(base.replace(/\/?$/, "/") + "regions/" + regionId + ".json").then(function (res) {
      if (!res.ok) throw new Error("Regional intelligence: failed to load bundle " + regionId);
      return res.json();
    });
  }

  function resolveBundle(request) {
    if (request.bundle) {
      return Promise.resolve(request.bundle);
    }
    return loadBundle(request.regionId, request.contentEngineBase);
  }

  function applyLocationToBundle(bundle, loc) {
    if (loc && global.WDS && global.WDS.location && global.WDS.location.applyToBundle) {
      return global.WDS.location.applyToBundle(bundle, loc);
    }
    return bundle;
  }

  function resolveWeather(request, bundle, loc) {
    if (!request.includeWeather) return Promise.resolve(null);
    var W = global.WDS && global.WDS.weather;
    if (!W || !W.getForecast) return Promise.resolve(null);

    var lat = loc && loc.lat;
    var lng = loc && loc.lng;
    if (!isFinite(lat) || !isFinite(lng)) return Promise.resolve(null);

    var hints = request.weatherHints ||
      (bundle && bundle.thisWeekOutdoors && bundle.thisWeekOutdoors.weather) ||
      (loc && loc.weather);

    return W.getForecast({ lat: lat, lng: lng, hints: hints }).catch(function () {
      return null;
    });
  }

  function assemble(bundle, loc, weatherPkg) {
    var layers = [
      RI.sources.fromContentBundle(bundle),
      RI.sources.fromLocation(loc),
      weatherPkg ? RI.sources.fromWeatherPackage(weatherPkg) : null
    ];
    var pkg = RI.sources.mergeLayers.apply(null, layers);
    pkg.meta.assembledAt = new Date().toISOString();
    pkg.meta.isPlaceholder = !(weatherPkg && weatherPkg.meta && !weatherPkg.meta.isPlaceholder);
    pkg.meta.sources = Object.assign({}, pkg.meta.sources || {}, {
      weather: weatherPkg && weatherPkg.meta ? weatherPkg.meta.provider : "none"
    });
    return RI.normalizePackage(pkg);
  }

  function get(request) {
    var req = normalizeRequest(request);
    return resolveBundle(req).then(function (bundle) {
      bundle = applyLocationToBundle(bundle, req.location);
      return resolveWeather(req, bundle, req.location).then(function (weatherPkg) {
        var intel = assemble(bundle, req.location, weatherPkg);
        lastSnapshot = intel;
        return intel;
      });
    });
  }

  function getFromSnapshot(snapshot) {
    lastSnapshot = RI.normalizePackage(snapshot);
    return Promise.resolve(lastSnapshot);
  }

  function getLastSnapshot() {
    return lastSnapshot ? RI.normalizePackage(lastSnapshot) : null;
  }

  function clearCache() {
    lastSnapshot = null;
  }

  function loadSnapshot(regionId, base) {
    regionId = regionId || serviceConfig.defaultRegionId;
    base = (base || "design-system/regional-intelligence/snapshots/").replace(/\/?$/, "/");
    return fetch(base + regionId + ".json").then(function (res) {
      if (!res.ok) throw new Error("Regional intelligence: snapshot not found " + regionId);
      return res.json();
    }).then(getFromSnapshot);
  }

  Object.assign(RI, {
    configure: configure,
    get: get,
    getFromSnapshot: getFromSnapshot,
    getLastSnapshot: getLastSnapshot,
    loadSnapshot: loadSnapshot,
    clearCache: clearCache,
    assemble: assemble
  });
})(window);
