/**
 * Waypoint Outdoor Intelligence Platform — service
 *
 * Public API (single source of truth for regional outdoor context):
 *
 *   WDS.outdoorIntelligence.configure(options)
 *   WDS.outdoorIntelligence.get(request)       → Promise<OutdoorIntelligencePackage>
 *   WDS.outdoorIntelligence.getContext(request) → Promise<flat context>
 *   WDS.outdoorIntelligence.getSlice(name, request)
 *   WDS.outdoorIntelligence.resolveLocation(request)
 *   WDS.outdoorIntelligence.getLast()
 *   WDS.outdoorIntelligence.clearCache()
 *   WDS.outdoorIntelligence.onChange(fn)
 *   WDS.outdoorIntelligence.refresh()
 *
 * Apps should call get() — never assemble sources directly.
 */
(function (global) {
  "use strict";

  var OIP = global.WDS && global.WDS.outdoorIntelligence;
  if (!OIP || !OIP.model || !OIP.sources || !OIP.location) return;

  var M = OIP.model;
  var S = OIP.sources;

  var serviceConfig = {
    contentEngineBase: "design-system/content-engine/",
    includeWeather: true,
    defaultRegionId: null
  };

  var lastPackage = null;
  var lastRequest = null;
  var changeListeners = [];

  function resolveDefaultRegionId() {
    if (serviceConfig.defaultRegionId) return serviceConfig.defaultRegionId;
    var E = global.WDS && global.WDS.regionalIntelligence && global.WDS.regionalIntelligence.engine;
    if (E && E.getDefaults) {
      var d = E.getDefaults();
      if (d && d.regionId) return d.regionId;
    }
    if (typeof OIP.DEFAULT_REGION_ID === "function") {
      return OIP.DEFAULT_REGION_ID();
    }
    return OIP.DEFAULT_REGION_ID || null;
  }

  function configure(options) {
    options = options || {};
    if (options.contentEngineBase) {
      serviceConfig.contentEngineBase = options.contentEngineBase.replace(/\/?$/, "/");
    }
    if (options.includeWeather != null) serviceConfig.includeWeather = !!options.includeWeather;
    if (options.defaultRegionId) serviceConfig.defaultRegionId = options.defaultRegionId;
    M.devLog("configure", serviceConfig);
    return Object.assign({}, serviceConfig);
  }

  function notifyChange(pkg) {
    changeListeners.forEach(function (fn) {
      try { fn(pkg); } catch (e) { /* noop */ }
    });
    if (global.document && global.CustomEvent) {
      try {
        global.document.dispatchEvent(new CustomEvent("wds:outdoor-intelligence-change", { detail: pkg }));
      } catch (e) { /* noop */ }
    }
  }

  function onChange(fn) {
    if (typeof fn !== "function") return function () {};
    changeListeners.push(fn);
    return function () {
      changeListeners = changeListeners.filter(function (f) { return f !== fn; });
    };
  }

  function normalizeRequest(request) {
    request = request || {};
    var regionId = request.regionId ||
      (request.location && request.location.contentBundle);
    if (!regionId && OIP.adapters && OIP.adapters.resolveRegionId) {
      regionId = OIP.adapters.resolveRegionId(request);
    }
    if (!regionId) regionId = resolveDefaultRegionId();
    return {
      location: request.location || null,
      bundle: request.bundle || null,
      regionId: regionId,
      contentEngineBase: request.contentEngineBase || serviceConfig.contentEngineBase,
      includeWeather: request.includeWeather != null ? request.includeWeather : serviceConfig.includeWeather,
      weatherHints: request.weatherHints || null
    };
  }

  function loadBundle(regionId, base) {
    if (global.WDS && global.WDS.contentEngine && global.WDS.contentEngine.loadRegion) {
      return global.WDS.contentEngine.loadRegion(regionId, base);
    }
    return fetch(base.replace(/\/?$/, "/") + "regions/" + regionId + ".json").then(function (res) {
      if (!res.ok) throw new Error("Outdoor intelligence: failed to load bundle " + regionId);
      return res.json();
    });
  }

  function resolveWeather(request, pkg) {
    if (!request.includeWeather) return Promise.resolve(null);
    var W = global.WDS && global.WDS.weather;
    if (!W || !W.getForecast) return Promise.resolve(null);
    if (!pkg) return Promise.resolve(null);

    var lat = pkg.location ? pkg.location.latitude : (pkg.coordinates && pkg.coordinates.latitude);
    var lng = pkg.location ? pkg.location.longitude : (pkg.coordinates && pkg.coordinates.longitude);
    if (!M.isFiniteCoord(lat) || !M.isFiniteCoord(lng)) return Promise.resolve(null);

    var hints = request.weatherHints;
    if (!hints && pkg.weather && pkg.weather.status === "editorial") {
      hints = {
        high: pkg.weather.high,
        low: pkg.weather.low,
        conditions: pkg.weather.conditions
      };
    }

    return W.getForecast({
      intelligence: pkg.legacy || pkg,
      location: request.location,
      hints: hints,
      timezone: pkg.timezone || (pkg.daylight && pkg.daylight.timezone),
      fallback: false
    }).catch(function () {
      return null;
    });
  }

  function intelForWeather(pkg) {
    if (!pkg) return null;
    if (pkg.legacy) return pkg.legacy;
    return {
      coordinates: {
        latitude: pkg.location && pkg.location.latitude,
        longitude: pkg.location && pkg.location.longitude
      },
      weather: pkg.weather,
      daylight: pkg.daylight
    };
  }

  function finalizePlatformPackage(pkg, weatherPkg) {
    if (weatherPkg) {
      pkg = M.normalizePackage(S.mergeLayers(pkg, S.fromWeatherPackage(weatherPkg)));
      pkg.weatherRef = weatherPkg;
    }
    pkg.legacy = S.toLegacyV1(pkg);
    pkg.meta.sources = Object.assign({}, pkg.meta.sources || {}, {
      weather: weatherPkg && weatherPkg.meta ? weatherPkg.meta.provider : "none",
      regionalIntelligence: "engine"
    });
    lastPackage = pkg;
    M.devLog("get complete", pkg.region.label, pkg.location.source, pkg.weather.status);
    var RI = global.WDS && global.WDS.researchIntegrity;
    if (RI && RI.annotatePackage) RI.annotatePackage(pkg);
    var OE = global.WDS && global.WDS.outdoorEthics;
    if (OE && OE.annotatePackage) OE.annotatePackage(pkg);
    notifyChange(pkg);
    return pkg;
  }

  function enrichFromEngine(core, req) {
    var regionId = (core.meta && core.meta.contentBundleId) ||
      (core.meta && core.meta.regionId) ||
      req.regionId;

    return resolveWeather(req, intelForWeather(core)).then(function (weatherPkg) {
      if (req.bundle) {
        return finalizePlatformPackage(
          M.normalizePackage(S.mergeLayers(core, S.fromPlatformExtensions(req.bundle))),
          weatherPkg
        );
      }
      return loadBundle(regionId, req.contentEngineBase).then(function (bundle) {
        return finalizePlatformPackage(
          M.normalizePackage(S.mergeLayers(core, S.fromPlatformExtensions(bundle))),
          weatherPkg
        );
      }).catch(function (err) {
        M.devLog("platform extensions failed — engine core only", err && err.message);
        return finalizePlatformPackage(M.normalizePackage(core), weatherPkg);
      });
    });
  }

  function get(request) {
    var req = normalizeRequest(request);
    lastRequest = req;
    var E = global.WDS && global.WDS.regionalIntelligence && global.WDS.regionalIntelligence.engine;
    if (!E || !E.get) {
      return Promise.reject(new Error("Outdoor intelligence engine is not available"));
    }
    return E.get(req).then(function (core) {
      return enrichFromEngine(core, req);
    }).catch(function (err) {
      M.devLog("get failed — minimal fallback", err && err.message);
      var fallback = M.buildFallbackLocationState();
      if (!fallback) return Promise.reject(err);
      var pkg = M.normalizePackage(S.mergeLayers(S.fromLocationState(fallback)));
      pkg.legacy = S.toLegacyV1(pkg);
      lastPackage = pkg;
      notifyChange(pkg);
      return pkg;
    });
  }

  function getContext(request) {
    return get(request).then(function (pkg) {
      return M.toContext(pkg);
    });
  }

  function getSlice(sliceName, request) {
    return get(request).then(function (pkg) {
      return M.getSlice(pkg, sliceName);
    });
  }

  function getLast() {
    return lastPackage ? M.normalizePackage(lastPackage) : null;
  }

  function clearCache() {
    lastPackage = null;
    lastRequest = null;
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.clearCache) RI.engine.clearCache();
  }

  function refresh() {
    if (!lastRequest) return get();
    return get(lastRequest);
  }

  if (global.WDS && global.WDS.location && global.WDS.location.onChange) {
    global.WDS.location.onChange(function () {
      if (lastRequest) refresh();
    });
  }

  Object.assign(OIP, {
    configure: configure,
    get: get,
    getContext: getContext,
    getSlice: getSlice,
    resolveLocation: OIP.location.resolve,
    getLast: getLast,
    clearCache: clearCache,
    onChange: onChange,
    refresh: refresh
  });
})(window);
