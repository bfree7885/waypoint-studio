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
  var activeGeneration = 0;
  var DEFAULT_PROVIDER_TIMEOUT_MS = 8000;
  var providerTelemetry = [];

  function withTimeout(promise, ms, label) {
    ms = ms || DEFAULT_PROVIDER_TIMEOUT_MS;
    return new Promise(function (resolve) {
      var settled = false;
      var started = Date.now();
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        providerTelemetry.push({ provider: label || "provider", status: "timeout", at: new Date().toISOString() });
        if (global.WDS && WDS.resilience && WDS.resilience.recordProvider) {
          WDS.resilience.recordProvider(label || "provider", {
            status: "timeout",
            lastFailAt: Date.now(),
            lastError: "timeout",
            lastLatencyMs: ms
          });
        }
        resolve({ ok: false, reason: "timeout", label: label || "provider" });
      }, ms);
      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (global.WDS && WDS.resilience && WDS.resilience.recordProvider) {
          WDS.resilience.recordProvider(label || "provider", {
            status: "healthy",
            lastOkAt: Date.now(),
            lastLatencyMs: Date.now() - started,
            lastError: null
          });
        }
        resolve({ ok: true, value: value, label: label || "provider" });
      }).catch(function (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        providerTelemetry.push({
          provider: label || "provider",
          status: "error",
          message: err && err.message ? err.message : "failed",
          at: new Date().toISOString()
        });
        if (global.WDS && WDS.resilience && WDS.resilience.recordProvider) {
          WDS.resilience.recordProvider(label || "provider", {
            status: "degraded",
            lastFailAt: Date.now(),
            lastError: err && err.message ? err.message : "failed",
            lastLatencyMs: Date.now() - started
          });
        }
        resolve({ ok: false, reason: "error", error: err, label: label || "provider" });
      });
    });
  }

  function settleProvider(promise, label, timeoutMs) {
    return withTimeout(promise || Promise.resolve(null), timeoutMs, label).then(function (result) {
      if (!result.ok) return null;
      return result.value == null ? null : result.value;
    });
  }


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

  function coordsFromRequest(req, pkg) {
    if (req && req.location) {
      var loc = req.location;
      // Provisional / national educational shells must not drive point APIs
      if (loc.useNationalFallback || loc.contentMode === "national-educational" || loc.source === "pending") {
        return null;
      }
      if (M.isFiniteCoord(loc.lat) && M.isFiniteCoord(loc.lng)) {
        var lat = Number(loc.lat);
        var lng = Number(loc.lng);
        if (lat === 0 && lng === 0) return null;
        return { lat: lat, lng: lng };
      }
    }
    return coordsFromPkg(pkg);
  }

  function activateLocationContext(req, pkg, weatherPkg) {
    var LC = global.WDS && global.WDS.locationContext;
    if (!LC || !LC.setActive) return null;
    var coords = coordsFromRequest(req, pkg);
    if (!coords) return null;
    var tz = (weatherPkg && weatherPkg.meta && weatherPkg.meta.timezone) ||
      (pkg && pkg.timezone) ||
      (req.location && req.location.timezone) ||
      null;
    return LC.setActive(Object.assign({}, req.location || {}, coords), tz);
  }

  function coordsFromPkg(pkg) {
    if (!pkg) return null;
    var lat = pkg.location ? pkg.location.latitude : (pkg.coordinates && pkg.coordinates.latitude);
    var lng = pkg.location ? pkg.location.longitude : (pkg.coordinates && pkg.coordinates.longitude);
    if (!M.isFiniteCoord(lat) || !M.isFiniteCoord(lng)) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }

  function resolveAirQuality(request, pkg) {
    var AQ = global.WDS && global.WDS.airQuality;
    if (!AQ || !AQ.fetchCurrent) return Promise.resolve(null);
    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    return AQ.fetchCurrent({ lat: coords.lat, lng: coords.lng });
  }

  function resolveAlerts(request, pkg) {
    var NWS = global.WDS && global.WDS.nwsAlerts;
    if (!NWS || !NWS.fetchActive) return Promise.resolve(null);
    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    return NWS.fetchActive({ lat: coords.lat, lng: coords.lng });
  }

  function resolveWeather(request, pkg) {
    if (!request.includeWeather) return Promise.resolve(null);
    var W = global.WDS && global.WDS.weather;
    if (!W || !W.getForecast) return Promise.resolve(null);
    if (!pkg) return Promise.resolve(null);

    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    var lat = coords.lat;
    var lng = coords.lng;

    var national = request.location && (request.location.useNationalFallback || request.location.contentMode === "national-educational");
    var hints = null;
    if (!national) {
      hints = request.weatherHints;
      if (!hints && pkg.weather && pkg.weather.status === "editorial") {
        hints = {
          high: pkg.weather.high,
          low: pkg.weather.low,
          conditions: pkg.weather.conditions
        };
      }
    }

    return W.getForecast({
      lat: lat,
      lng: lng,
      intelligence: pkg.legacy || pkg,
      location: request.location,
      hints: hints,
      timezone: pkg.timezone || (pkg.daylight && pkg.daylight.timezone),
      fallback: true
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

  function resolveElevation(request, pkg) {
    var EL = global.WDS && global.WDS.elevation;
    if (!EL || !EL.fetchElevation) return Promise.resolve(null);
    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    return EL.fetchElevation(coords);
  }

  function resolveUsgsWater(request, pkg) {
    var US = global.WDS && global.WDS.usgsWater;
    if (!US || !US.fetchNearestGauge) return Promise.resolve(null);
    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    return US.fetchNearestGauge(coords);
  }

  function resolveTrails(request, pkg) {
    var TC = global.WDS && global.WDS.trailConditions;
    if (!TC || !TC.fetchNearby) return Promise.resolve(null);
    var coords = coordsFromRequest(request, pkg);
    if (!coords) return Promise.resolve(null);
    return TC.fetchNearby({ lat: coords.lat, lng: coords.lng });
  }

  function finalizePlatformPackage(pkg, weatherPkg, alertsPkg, airQualityPkg, elevationPkg, usgsWaterPkg, trailPkg, req, generation) {
    if (generation != null && generation !== activeGeneration) {
      M.devLog("stale OIP response ignored", generation, activeGeneration);
      return null;
    }
    var hadCoords = !!coordsFromRequest(req, pkg);
    activateLocationContext(req || lastRequest, pkg, weatherPkg);
    if (weatherPkg) {
      pkg = M.normalizePackage(S.mergeLayers(pkg, S.fromWeatherPackage(weatherPkg)));
      pkg.weatherRef = weatherPkg;
      if (weatherPkg.meta) {
        weatherPkg.meta.dataCoordSource = "user";
        weatherPkg.meta.requestLat = req && req.location ? Number(req.location.lat) : weatherPkg.meta.lat;
        weatherPkg.meta.requestLng = req && req.location ? Number(req.location.lng) : weatherPkg.meta.lng;
      }
    }
    if (alertsPkg) {
      pkg = M.normalizePackage(S.mergeLayers(pkg, S.fromAlertsPackage(alertsPkg)));
    }
    if (airQualityPkg) {
      pkg = M.normalizePackage(S.mergeLayers(pkg, S.fromAirQualityPackage(airQualityPkg)));
    }
    if (elevationPkg && elevationPkg.meters != null) {
      if (!pkg.location) pkg.location = {};
      pkg.location.elevationMeters = elevationPkg.meters;
      pkg.location.elevation = elevationPkg;
    }
    if (usgsWaterPkg) {
      pkg.usgsWater = usgsWaterPkg;
    }
    if (trailPkg) {
      pkg.trailConditions = trailPkg;
    }
    if (pkg.daylight && global.WDS && global.WDS.locationContext) {
      var LC = global.WDS.locationContext;
      var ctx = LC.getActive && LC.getActive();
      if (ctx && LC.attachModule) {
        LC.attachModule("daylight", pkg.daylight, ctx);
      }
    }
    pkg.legacy = S.toLegacyV1(pkg);
    pkg.meta.sources = Object.assign({}, pkg.meta.sources || {}, {
      weather: weatherPkg && weatherPkg.meta ? weatherPkg.meta.provider : "none",
      alerts: alertsPkg && alertsPkg.meta ? alertsPkg.meta.provider : "none",
      airQuality: airQualityPkg && airQualityPkg.meta ? airQualityPkg.meta.provider : "none",
      elevation: elevationPkg ? elevationPkg.provider : "none",
      usgsWater: usgsWaterPkg ? usgsWaterPkg.provider : "none",
      trailConditions: trailPkg && trailPkg.provider ? trailPkg.provider : "none",
      regionalIntelligence: "engine"
    });
    pkg.meta.providerTelemetry = providerTelemetry.slice();
    pkg.meta.hydratedAt = new Date().toISOString();
    pkg.meta.contentSource = "user-oip";
    pkg.meta.liveFeed = false;
    pkg.meta.moduleSources = {
      weather: weatherPkg && weatherPkg.meta ? weatherPkg.meta.provider + " (user)" : "unavailable",
      alerts: alertsPkg && alertsPkg.status === "live" ? "nws (user)" :
        (alertsPkg && alertsPkg.status === "empty" ? "nws-empty (user)" :
          (hadCoords ? "unavailable" : "skipped-no-coords")),
      airQuality: airQualityPkg && airQualityPkg.status === "live" ? "open-meteo-aq (user)" :
        (hadCoords ? "unavailable" : "skipped-no-coords"),
      elevation: elevationPkg && elevationPkg.meters != null ? "elevation (user)" :
        (hadCoords ? "unavailable" : "skipped-no-coords"),
      usgsWater: usgsWaterPkg && usgsWaterPkg.nearest ? "usgs-iv (user)" :
        (usgsWaterPkg && usgsWaterPkg.status === "no-nearby" ? "usgs-no-nearby (user)" :
          (hadCoords ? "unavailable" : "skipped-no-coords")),
      trailConditions: trailPkg && trailPkg.status === "live" ? "openstreetmap-overpass (user)" :
        (trailPkg && trailPkg.status === "empty" ? "openstreetmap-empty (user)" : "pending"),
      daylight: weatherPkg ? "oip-derived (user)" : "unavailable",
      photography: "oie-derived (user)"
    };
    function blockFor(pkgVal, liveTest, emptyStatuses) {
      if (!hadCoords && !liveTest(pkgVal)) return "skipped";
      if (liveTest(pkgVal)) return "live";
      if (pkgVal && emptyStatuses && emptyStatuses.indexOf(pkgVal.status) >= 0) return pkgVal.status;
      if (!pkgVal) return hadCoords ? "unavailable" : "skipped";
      if (pkgVal.status === "unavailable") return "unavailable";
      return "unavailable";
    }
    pkg.meta.blockStatus = {
      weather: weatherPkg && weatherPkg.meta && !weatherPkg.meta.isPlaceholder ? "live" : "unavailable",
      alerts: blockFor(alertsPkg, function (p) {
        return p && (p.status === "live" || p.status === "empty");
      }, ["empty"]),
      airQuality: blockFor(airQualityPkg, function (p) {
        return p && p.status === "live";
      }),
      elevation: blockFor(elevationPkg, function (p) {
        return p && p.meters != null;
      }),
      usgsWater: blockFor(usgsWaterPkg, function (p) {
        return p && p.nearest;
      }, ["no-nearby"]),
      // Trails hydrate later — pending must not force Partial on first paint
      trailConditions: trailPkg && trailPkg.status === "live" ? "live" :
        (trailPkg && trailPkg.status === "empty" ? "empty" : "pending")
    };
    // Normalize no-nearby
    if (usgsWaterPkg && usgsWaterPkg.status === "no-nearby") {
      pkg.meta.blockStatus.usgsWater = "no-nearby";
    }
    if (alertsPkg && alertsPkg.status === "empty") {
      pkg.meta.blockStatus.alerts = "empty";
    }
    if (trailPkg && trailPkg.meta) {
      if (trailPkg.meta.cached || trailPkg.meta.stale) {
        pkg.meta.fromCache = true;
        pkg.meta.stale = !!trailPkg.meta.stale;
      }
    }
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(pkg);
    lastPackage = pkg;
    M.devLog("get complete", pkg.region.label, pkg.location.source, pkg.weather.status);
    var RI = global.WDS && global.WDS.researchIntegrity;
    if (RI && RI.annotatePackage) RI.annotatePackage(pkg);
    var OE = global.WDS && global.WDS.outdoorEthics;
    if (OE && OE.annotatePackage) OE.annotatePackage(pkg);
    notifyChange(pkg);
    return pkg;
  }

  function applyTrailSlice(pkg, trailPkg) {
    if (!pkg || !pkg.meta) return pkg;
    pkg.trailConditions = trailPkg || null;
    if (!pkg.meta.blockStatus) pkg.meta.blockStatus = {};
    if (!pkg.meta.moduleSources) pkg.meta.moduleSources = {};
    if (!pkg.meta.sources) pkg.meta.sources = {};
    if (trailPkg && trailPkg.status === "live") {
      pkg.meta.blockStatus.trailConditions = "live";
      pkg.meta.moduleSources.trailConditions = "openstreetmap-overpass (user)";
      pkg.meta.sources.trailConditions = trailPkg.provider || "openstreetmap-overpass";
    } else if (trailPkg && trailPkg.status === "empty") {
      pkg.meta.blockStatus.trailConditions = "empty";
      pkg.meta.moduleSources.trailConditions = "openstreetmap-empty (user)";
      pkg.meta.sources.trailConditions = trailPkg.provider || "openstreetmap-overpass";
    } else {
      pkg.meta.blockStatus.trailConditions = "unavailable";
      pkg.meta.moduleSources.trailConditions = "unavailable";
      pkg.meta.sources.trailConditions = "none";
    }
    if (trailPkg && trailPkg.meta && (trailPkg.meta.cached || trailPkg.meta.stale)) {
      pkg.meta.fromCache = true;
      pkg.meta.stale = !!trailPkg.meta.stale;
    }
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(pkg);
    return pkg;
  }

  function scheduleTrailEnrichment(req, core, generation) {
    settleProvider(resolveTrails(req, core), "trailConditions", 75000).then(function (trailPkg) {
      if (generation !== activeGeneration || !lastPackage) return;
      applyTrailSlice(lastPackage, trailPkg);
      M.devLog("trails late hydrate", trailPkg && trailPkg.status);
      notifyChange(lastPackage);
    });
  }

  function enrichFromEngine(core, req, generation) {
    var national = req.location && (req.location.useNationalFallback || req.location.contentMode === "national-educational");
    var regionId = (core.meta && core.meta.contentBundleId) ||
      (core.meta && core.meta.regionId) ||
      req.regionId;

    providerTelemetry = [];
    // Trails stay off the critical Promise.all so weather/AQ/alerts can paint first.
    return Promise.all([
      settleProvider(resolveWeather(req, intelForWeather(core)), "weather"),
      settleProvider(resolveAlerts(req, core), "alerts"),
      settleProvider(resolveAirQuality(req, core), "airQuality"),
      settleProvider(resolveElevation(req, core), "elevation"),
      settleProvider(resolveUsgsWater(req, core), "usgsWater")
    ]).then(function (parts) {
      var weatherPkg = parts[0];
      var alertsPkg = parts[1];
      var airQualityPkg = parts[2];
      var elevationPkg = parts[3];
      var usgsWaterPkg = parts[4];
      var trailPkg = null;

      function finalizeAndSchedule(pkgBase) {
        var pkg = finalizePlatformPackage(
          pkgBase,
          weatherPkg,
          alertsPkg,
          airQualityPkg,
          elevationPkg,
          usgsWaterPkg,
          trailPkg,
          req,
          generation
        );
        if (pkg) scheduleTrailEnrichment(req, core, generation);
        return pkg;
      }

      if (national) {
        var UN = global.WDS && global.WDS.usNational;
        var layer = UN && UN.buildPlatformLayer ? UN.buildPlatformLayer(req.location) : {};
        return finalizeAndSchedule(M.normalizePackage(S.mergeLayers(core, layer)));
      }
      if (req.bundle) {
        return finalizeAndSchedule(
          M.normalizePackage(S.mergeLayers(core, S.fromPlatformExtensions(req.bundle)))
        );
      }
      return loadBundle(regionId, req.contentEngineBase).then(function (bundle) {
        return finalizeAndSchedule(
          M.normalizePackage(S.mergeLayers(core, S.fromPlatformExtensions(bundle)))
        );
      }).catch(function (err) {
        M.devLog("platform extensions failed — engine core only", err && err.message);
        return finalizeAndSchedule(M.normalizePackage(core));
      });
    });
  }

  function get(request) {
    var req = normalizeRequest(request);
    lastRequest = req;
    activeGeneration += 1;
    var generation = activeGeneration;
    var Rel = global.WDS && global.WDS.dashboardReliability;
    var online = Rel && Rel.isOnline ? Rel.isOnline() : true;

    if (!online && lastPackage) {
      var cached = M.normalizePackage(lastPackage);
      cached.meta = cached.meta || {};
      cached.meta.fromCache = true;
      cached.meta.stale = true;
      cached.meta.connectivity = "offline";
      cached.meta.trust = "cached";
      if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(cached);
      M.devLog("offline — returning cached package");
      notifyChange(cached);
      return Promise.resolve(cached);
    }
    if (!online && !lastPackage) {
      var empty = M.emptyPackage();
      empty.meta.unavailable = true;
      empty.meta.connectivity = "offline";
      empty.meta.trust = "offline";
      empty.meta.error = "offline-no-cache";
      empty.meta.hydratedAt = new Date().toISOString();
      empty.meta.blockStatus = {
        weather: "unavailable",
        alerts: "unavailable",
        airQuality: "unavailable",
        elevation: "unavailable",
        usgsWater: "unavailable",
        trailConditions: "unavailable"
      };
      empty.location.source = "unavailable";
      if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(empty);
      notifyChange(empty);
      return Promise.resolve(empty);
    }

    if (global.WDS && global.WDS.locationContext && global.WDS.locationContext.invalidateCaches) {
      if (req.location && req.location.refreshReason === "user-change") {
        global.WDS.locationContext.invalidateCaches();
      }
    }
    var E = global.WDS && global.WDS.regionalIntelligence && global.WDS.regionalIntelligence.engine;
    if (!E || !E.get) {
      return Promise.reject(new Error("Outdoor intelligence engine is not available"));
    }
    return E.get(req).then(function (core) {
      return enrichFromEngine(core, req, generation).then(function (pkg) {
        if (!pkg && lastPackage) {
          var stale = M.normalizePackage(lastPackage);
          stale.meta = stale.meta || {};
          stale.meta.fromCache = true;
          stale.meta.stale = true;
          var PG = global.WDS && global.WDS.platformGuard;
          if (PG && PG.sanitizeUserPlatform) {
            stale = PG.sanitizeUserPlatform(stale, req.location);
          }
          if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(stale);
          return stale;
        }
        return pkg;
      });
    }).catch(function (err) {
      M.devLog("get failed — unavailable package", err && err.message);
      providerTelemetry.push({
        provider: "oip",
        status: "error",
        message: err && err.message ? err.message : "get failed",
        at: new Date().toISOString()
      });
      if (lastPackage) {
        var failedCache = M.normalizePackage(lastPackage);
        failedCache.meta = failedCache.meta || {};
        failedCache.meta.fromCache = true;
        failedCache.meta.stale = true;
        failedCache.meta.trust = "cached";
        failedCache.meta.lastError = err && err.message ? String(err.message) : "oip-get-failed";
        if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(failedCache);
        notifyChange(failedCache);
        return failedCache;
      }
      // Do not silently substitute Pike County (or any default region) as the user's location.
      var pkg = M.emptyPackage();
      pkg.meta.unavailable = true;
      pkg.meta.isFallbackLocation = false;
      pkg.meta.error = err && err.message ? String(err.message) : "oip-get-failed";
      pkg.meta.providerTelemetry = providerTelemetry.slice();
      pkg.meta.hydratedAt = new Date().toISOString();
      pkg.meta.blockStatus = {
        weather: "unavailable",
        alerts: "unavailable",
        airQuality: "unavailable",
        elevation: "unavailable",
        usgsWater: "unavailable"
      };
      pkg.location.source = "unavailable";
      pkg.location.latitude = null;
      pkg.location.longitude = null;
      if (Rel && Rel.applyConnectivityMeta) Rel.applyConnectivityMeta(pkg);
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
    activeGeneration += 1;
    var US = global.WDS && global.WDS.usgsWater;
    if (US && US.clearCache) US.clearCache();
    var TC = global.WDS && global.WDS.trailConditions;
    if (TC && TC.clearCache) TC.clearCache();
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.clearCache) RI.engine.clearCache();
  }

  function resetLastPackage() {
    lastPackage = null;
    activeGeneration += 1;
  }

  function refresh() {
    if (!lastRequest) return get();
    return get(lastRequest);
  }

  if (global.WDS && global.WDS.location && global.WDS.location.onChange && !OIP._locationBound) {
    OIP._locationBound = true;
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
    resetLastPackage: resetLastPackage,
    onChange: onChange,
    refresh: refresh,
    getProviderTelemetry: function () { return providerTelemetry.slice(); },
    adoptPackage: function (pkg) {
      if (!pkg) return null;
      pkg = M.normalizePackage(pkg);
      var PG = global.WDS && global.WDS.platformGuard;
      if (PG && PG.sanitizeUserPlatform) {
        pkg = PG.sanitizeUserPlatform(pkg, lastRequest && lastRequest.location);
      }
      lastPackage = pkg;
      notifyChange(pkg);
      return pkg;
    }
  });
})(window);
