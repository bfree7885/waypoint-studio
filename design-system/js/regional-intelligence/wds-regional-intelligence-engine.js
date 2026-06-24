/**
 * Waypoint Studio — Regional Intelligence Engine
 *
 * Core platform service: location resolution, county/state lookup, and assembly
 * of the normalized Regional Intelligence object.
 *
 * Default region is read from regions-index.json — never hardcoded in app logic.
 *
 *   WDS.regionalIntelligence.engine.configure(options)
 *   WDS.regionalIntelligence.engine.get(request)
 *   WDS.regionalIntelligence.engine.resolveLocation(request)
 *   WDS.regionalIntelligence.engine.lookupCounty(query)
 *   WDS.regionalIntelligence.engine.lookupRegion(regionId)
 *   WDS.regionalIntelligence.engine.getDefaultRegion()
 *   WDS.regionalIntelligence.engine.getLast()
 *   WDS.regionalIntelligence.engine.onChange(fn)
 */
(function (global) {
  "use strict";

  var VERSION = "2.0.0";

  var engineConfig = {
    contentEngineBase: "design-system/content-engine/",
    includeWeather: false
  };

  var indexCache = null;
  var defaultsCache = null;
  var lastPackage = null;
  var lastRequest = null;
  var changeListeners = [];

  function isDev() {
    if (global.WDS && global.WDS.DEBUG) return true;
    try {
      var host = global.location && global.location.hostname;
      return host === "localhost" || host === "127.0.0.1";
    } catch (e) {
      return false;
    }
  }

  function devLog() {
    if (!isDev()) return;
    var args = ["[WDS.regionalIntelligence.engine]"].concat(Array.prototype.slice.call(arguments));
    console.log.apply(console, args);
  }

  function isFiniteCoord(n) {
    return isFinite(Number(n));
  }

  function normalizeLocationSource(source, isDefault) {
    if (isDefault || source === "default") return "fallback";
    if (source === "geo") return "browser";
    if (source === "manual") return "manual";
    if (source === "browser" || source === "fallback") return source;
    return "fallback";
  }

  function monthFromDate(date, weekOf) {
    if (weekOf) {
      var parts = String(weekOf).split("-");
      if (parts.length >= 2) {
        var m = parseInt(parts[1], 10);
        if (m >= 1 && m <= 12) return m;
      }
    }
    return (date || new Date()).getMonth() + 1;
  }

  function emptyPackage() {
    return {
      meta: {
        version: VERSION,
        assembledAt: null,
        regionId: null,
        contentBundleId: null,
        isFallbackLocation: false,
        sources: {}
      },
      location: {
        source: "fallback",
        latitude: null,
        longitude: null,
        accuracyM: null,
        distanceKm: null
      },
      region: { id: null, label: null },
      county: { name: null, stateCode: null },
      state: { name: null, code: null },
      country: { name: "United States", code: "US" },
      timezone: null,
      coordinates: { latitude: null, longitude: null },
      elevation: {
        status: "placeholder",
        feet: null,
        note: null,
        available: false
      },
      geography: {
        status: "placeholder",
        ecoregion: null,
        bioregion: null,
        dominantForest: null,
        watersheds: []
      },
      calendar: {
        season: null,
        month: null,
        weekOf: null
      },
      daylight: {
        status: "placeholder",
        sunrise: null,
        sunset: null,
        dayLengthHours: null,
        timezone: null,
        source: null
      },
      weather: {
        status: "placeholder",
        summary: null,
        conditions: null,
        high: null,
        low: null,
        precipitationProbability: null,
        source: null,
        isLive: false
      },
      phenology: {
        status: "placeholder",
        stage: null,
        summary: null,
        notes: []
      }
    };
  }

  function configure(options) {
    options = options || {};
    if (options.contentEngineBase) {
      engineConfig.contentEngineBase = options.contentEngineBase.replace(/\/?$/, "/");
    }
    if (options.includeWeather != null) engineConfig.includeWeather = !!options.includeWeather;
    devLog("configure", engineConfig);
    return Object.assign({}, engineConfig);
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Regional intelligence engine: failed to load " + url);
      return res.json();
    });
  }

  function loadRegionsIndex(base) {
    base = (base || engineConfig.contentEngineBase).replace(/\/?$/, "/");
    if (indexCache && indexCache._base === base) {
      return Promise.resolve(indexCache);
    }
    if (global.WDS && global.WDS.location && global.WDS.location.loadIndex) {
      return global.WDS.location.loadIndex(base).then(function (index) {
        index._base = base;
        indexCache = index;
        defaultsCache = null;
        return index;
      });
    }
    return fetchJson(base + "regions-index.json").then(function (index) {
      index._base = base;
      indexCache = index;
      defaultsCache = null;
      return index;
    });
  }

  function findRegionById(index, id) {
    if (global.WDS && global.WDS.location && global.WDS.location.findRegionById) {
      return global.WDS.location.findRegionById(index, id);
    }
    return (index.regions || []).find(function (r) { return r.id === id; }) || null;
  }

  function getDefaultRegion(index) {
    index = index || indexCache;
    if (!index) return null;
    var id = index.defaultRegionId || index.defaultBundleId;
    var region = id ? findRegionById(index, id) : null;
    if (!region && index.regions && index.regions.length) {
      region = index.regions[0];
    }
    return region;
  }

  function regionToLocationState(region, source) {
    if (!region) return null;
    source = source || "fallback";
    var isFallback = source === "fallback" || source === "default";
    return {
      source: isFallback ? "default" : source,
      regionId: region.id,
      contentBundle: region.contentBundle || region.id,
      name: region.name,
      state: region.state,
      stateCode: region.stateCode,
      bioregion: region.bioregion || "",
      lat: region.lat,
      lng: region.lng,
      elevationFt: region.elevationFt,
      mapExtent: region.mapExtent || null,
      weather: region.weather || null,
      seasonNote: region.seasonNote || null,
      isDefault: isFallback,
      distanceKm: 0,
      timestamp: Date.now()
    };
  }

  function getDefaults(index) {
    if (defaultsCache && (!index || index === indexCache)) return defaultsCache;
    var region = getDefaultRegion(index);
    if (!region) return null;
    defaultsCache = {
      regionId: region.id,
      contentBundleId: region.contentBundle || region.id,
      regionLabel: region.name + (region.stateCode ? ", " + region.stateCode : ""),
      county: region.name,
      state: region.state,
      stateCode: region.stateCode,
      country: "United States",
      countryCode: "US",
      latitude: region.lat,
      longitude: region.lng,
      elevationFt: region.elevationFt,
      timezone: region.timezone || null,
      season: region.seasonNote || null,
      bioregion: region.bioregion || null
    };
    return defaultsCache;
  }

  function buildFallbackLocationState(index) {
    return regionToLocationState(getDefaultRegion(index), "fallback");
  }

  function lookupCounty(query, base) {
    return loadRegionsIndex(base).then(function (index) {
      if (global.WDS && global.WDS.location && global.WDS.location.searchRegions) {
        return global.WDS.location.searchRegions(query, index);
      }
      query = (query || "").toLowerCase().trim();
      return (index.regions || []).find(function (r) {
        var label = (r.name + ", " + r.stateCode).toLowerCase();
        return label === query || r.name.toLowerCase() === query;
      }) || null;
    });
  }

  function lookupRegion(regionId, base) {
    return loadRegionsIndex(base).then(function (index) {
      return findRegionById(index, regionId);
    });
  }

  function lookupByCoords(lat, lng, base) {
    return loadRegionsIndex(base).then(function (index) {
      if (global.WDS && global.WDS.location && global.WDS.location.nearestRegion) {
        return global.WDS.location.nearestRegion(index, lat, lng);
      }
      var best = null;
      var bestDist = Infinity;
      (index.regions || []).forEach(function (r) {
        var d = Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2);
        if (d < bestDist) {
          bestDist = d;
          best = r;
        }
      });
      return { region: best, distanceKm: null };
    });
  }

  function resolveLocation(request) {
    request = request || {};
    var base = request.contentEngineBase || engineConfig.contentEngineBase;
    var loc = request.location;

    if (loc && isFiniteCoord(loc.lat) && isFiniteCoord(loc.lng)) {
      devLog("resolveLocation: provided", loc.source);
      return Promise.resolve(loc);
    }

    if (!loc && global.WDS && global.WDS.location) {
      loc = global.WDS.location.getState();
      if (loc && isFiniteCoord(loc.lat) && isFiniteCoord(loc.lng)) {
        devLog("resolveLocation: WDS.location state", loc.source);
        return Promise.resolve(loc);
      }
    }

    return loadRegionsIndex(base).then(function (index) {
      if (global.WDS && global.WDS.location && global.WDS.location.defaultState) {
        var fallback = global.WDS.location.defaultState(index);
        devLog("resolveLocation: index default", fallback.name);
        return fallback;
      }
      var state = buildFallbackLocationState(index);
      devLog("resolveLocation: engine default", state && state.name);
      return state;
    }).catch(function (err) {
      devLog("resolveLocation failed", err && err.message);
      var minimal = buildFallbackLocationState(null);
      if (minimal) return minimal;
      return regionToLocationState({
        id: "unknown",
        name: "Unknown",
        state: "",
        stateCode: "",
        lat: 0,
        lng: 0
      }, "fallback");
    });
  }

  function applyDefaults(pkg, defaults) {
    if (!defaults) return pkg;
    pkg.meta.regionId = defaults.regionId;
    pkg.meta.contentBundleId = defaults.contentBundleId;
    pkg.meta.isFallbackLocation = true;
    pkg.location.source = "fallback";
    pkg.location.latitude = defaults.latitude;
    pkg.location.longitude = defaults.longitude;
    pkg.coordinates.latitude = defaults.latitude;
    pkg.coordinates.longitude = defaults.longitude;
    pkg.region.id = defaults.regionId;
    pkg.region.label = defaults.regionLabel;
    pkg.county.name = defaults.county;
    pkg.county.stateCode = defaults.stateCode;
    pkg.state.name = defaults.state;
    pkg.state.code = defaults.stateCode;
    pkg.country.name = defaults.country;
    pkg.country.code = defaults.countryCode;
    if (defaults.timezone) pkg.timezone = defaults.timezone;
    if (defaults.elevationFt != null) {
      pkg.elevation.feet = defaults.elevationFt;
      pkg.elevation.available = true;
      pkg.elevation.status = "editorial";
    }
    if (defaults.season) pkg.calendar.season = defaults.season;
    if (defaults.bioregion) {
      pkg.geography.bioregion = defaults.bioregion;
      pkg.geography.status = "editorial";
    }
    pkg.calendar.month = monthFromDate(new Date(), pkg.calendar.weekOf);
    return pkg;
  }

  function buildFromLocation(loc) {
    var pkg = emptyPackage();
    if (!loc) return pkg;

    var source = normalizeLocationSource(loc.source, loc.isDefault);
    var label = loc.name ? loc.name + (loc.stateCode ? ", " + loc.stateCode : "") : null;

    pkg.meta.regionId = loc.regionId || loc.contentBundle;
    pkg.meta.contentBundleId = loc.contentBundle || loc.regionId;
    pkg.meta.isFallbackLocation = source === "fallback";
    pkg.meta.sources.location = source;

    pkg.location.source = source;
    pkg.location.latitude = Number(loc.lat);
    pkg.location.longitude = Number(loc.lng);
    pkg.location.accuracyM = loc.accuracy != null ? Number(loc.accuracy) : null;
    pkg.location.distanceKm = loc.distanceKm != null ? Number(loc.distanceKm) : null;

    pkg.coordinates.latitude = pkg.location.latitude;
    pkg.coordinates.longitude = pkg.location.longitude;

    pkg.region.id = pkg.meta.regionId;
    pkg.region.label = label;
    pkg.county.name = loc.name;
    pkg.county.stateCode = loc.stateCode;
    pkg.state.name = loc.state;
    pkg.state.code = loc.stateCode;

    if (loc.elevationFt != null && isFinite(Number(loc.elevationFt))) {
      pkg.elevation.feet = Number(loc.elevationFt);
      pkg.elevation.available = true;
      pkg.elevation.status = "editorial";
    }

    if (loc.bioregion) {
      pkg.geography.bioregion = loc.bioregion;
      pkg.geography.status = "editorial";
    }

    if (loc.seasonNote) {
      pkg.calendar.season = loc.seasonNote;
    }

    if (loc.weather) {
      pkg.weather.status = "editorial";
      pkg.weather.high = loc.weather.high || null;
      pkg.weather.low = loc.weather.low || null;
      pkg.weather.conditions = loc.weather.conditions || null;
      pkg.weather.source = "regions-index";
    }

    return pkg;
  }

  function enrichFromBundle(pkg, bundle) {
    if (!bundle) return pkg;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.sources && OIP.adapters && OIP.sources.fromContentBundle) {
      var layer = OIP.adapters.engineLayerFromOipBundle(OIP.sources.fromContentBundle(bundle));
      return mergePackage(pkg, layer);
    }
    var region = bundle.region || {};
    var profile = bundle.regionalIntelligenceProfile || {};
    var two = bundle.thisWeekOutdoors || {};
    var editorialWeather = two.weather || null;

    if (region.id) {
      pkg.meta.regionId = region.id;
      pkg.meta.contentBundleId = region.id;
      pkg.region.id = region.id;
    }
    if (region.name) {
      pkg.region.label = region.name + (region.stateCode ? ", " + region.stateCode : "");
      pkg.county.name = region.name;
      pkg.county.stateCode = region.stateCode;
      pkg.state.name = region.state;
      pkg.state.code = region.stateCode;
    }

    pkg.meta.sources.bundle = region.id || "content-bundle";

    if (profile.elevationFt != null) {
      pkg.elevation.feet = Number(profile.elevationFt);
      pkg.elevation.note = profile.elevationNote || null;
      pkg.elevation.available = isFinite(pkg.elevation.feet);
      pkg.elevation.status = "editorial";
    }

    if (profile.ecoregion || region.bioregion) {
      pkg.geography.ecoregion = profile.ecoregion || region.bioregion || null;
      pkg.geography.bioregion = region.bioregion || pkg.geography.bioregion;
      pkg.geography.dominantForest = profile.dominantForest || null;
      pkg.geography.watersheds = region.watersheds || [];
      pkg.geography.status = "editorial";
    }

    if (bundle.season) pkg.calendar.season = bundle.season;
    if (bundle.weekOf) {
      pkg.calendar.weekOf = bundle.weekOf;
      pkg.calendar.month = monthFromDate(null, bundle.weekOf);
    }

    if (profile.phenologyStage || (bundle.seasonalWatch && bundle.seasonalWatch.title)) {
      pkg.phenology.status = "editorial";
      pkg.phenology.stage = profile.phenologyStage || bundle.season || null;
      pkg.phenology.summary = bundle.seasonalWatch && bundle.seasonalWatch.title
        ? bundle.seasonalWatch.title
        : null;
      pkg.phenology.notes = [];
      if (profile.phenologyStage) pkg.phenology.notes.push(profile.phenologyStage);
    }

    if (profile.daylight) {
      pkg.daylight.status = "editorial";
      pkg.daylight.sunrise = profile.daylight.sunrise || null;
      pkg.daylight.sunset = profile.daylight.sunset || null;
      pkg.daylight.dayLengthHours = profile.daylight.dayLengthHours != null
        ? profile.daylight.dayLengthHours
        : null;
      pkg.daylight.timezone = profile.daylight.timezone || null;
      pkg.daylight.source = profile.daylight.source || "editorial";
      if (profile.daylight.timezone) pkg.timezone = profile.daylight.timezone;
    }

    if (editorialWeather && pkg.weather.status !== "live") {
      pkg.weather.status = "editorial";
      pkg.weather.high = editorialWeather.high || pkg.weather.high;
      pkg.weather.low = editorialWeather.low || pkg.weather.low;
      pkg.weather.conditions = editorialWeather.conditions || pkg.weather.conditions;
      pkg.weather.source = "content-bundle";
    }

    return pkg;
  }

  function mergePackage(base, layer) {
    if (!layer) return base;
    var pkg = JSON.parse(JSON.stringify(base));
    function deepMerge(target, source) {
      Object.keys(source).forEach(function (key) {
        var val = source[key];
        if (val === undefined) return;
        if (val && typeof val === "object" && !Array.isArray(val)) {
          target[key] = deepMerge(target[key] && typeof target[key] === "object" ? Object.assign({}, target[key]) : {}, val);
        } else if (val !== null) {
          target[key] = val;
        }
      });
      return target;
    }
    return deepMerge(pkg, layer);
  }

  function normalizePackage(raw, defaults) {
    var pkg = emptyPackage();
    if (!raw || typeof raw !== "object") {
      return defaults ? applyDefaults(pkg, defaults) : pkg;
    }
    pkg = mergePackage(pkg, raw);

    if (!isFiniteCoord(pkg.location.latitude) || !isFiniteCoord(pkg.location.longitude)) {
      devLog("normalize: invalid coordinates — applying index default");
      if (defaults) applyDefaults(pkg, defaults);
      else {
        var cached = getDefaults();
        if (cached) applyDefaults(pkg, cached);
      }
    }

    pkg.location.source = normalizeLocationSource(pkg.location.source, pkg.meta.isFallbackLocation);
    pkg.coordinates.latitude = pkg.location.latitude;
    pkg.coordinates.longitude = pkg.location.longitude;

    if (!pkg.calendar.month) {
      pkg.calendar.month = monthFromDate(new Date(), pkg.calendar.weekOf);
    }
    if (!pkg.timezone && pkg.daylight.timezone) {
      pkg.timezone = pkg.daylight.timezone;
    }
    if (!pkg.meta.assembledAt) {
      pkg.meta.assembledAt = new Date().toISOString();
    }
    if (!Array.isArray(pkg.geography.watersheds)) {
      pkg.geography.watersheds = [];
    }

    return pkg;
  }

  function loadBundle(regionId, base) {
    if (global.WDS && global.WDS.contentEngine && global.WDS.contentEngine.loadRegion) {
      return global.WDS.contentEngine.loadRegion(regionId, base);
    }
    return fetchJson(base.replace(/\/?$/, "/") + "regions/" + regionId + ".json");
  }

  function normalizeRequest(request) {
    request = request || {};
    var defaults = getDefaults();
    return {
      location: request.location || null,
      bundle: request.bundle || null,
      regionId: request.regionId ||
        (request.location && request.location.contentBundle) ||
        (defaults && defaults.contentBundleId) ||
        (indexCache && indexCache.defaultRegionId),
      contentEngineBase: request.contentEngineBase || engineConfig.contentEngineBase
    };
  }

  function notifyChange(pkg) {
    changeListeners.forEach(function (fn) {
      try { fn(pkg); } catch (e) { /* noop */ }
    });
    if (global.document && global.CustomEvent) {
      try {
        global.document.dispatchEvent(new CustomEvent("wds:regional-intelligence-change", { detail: pkg }));
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

  function assemble(loc, bundle, defaults) {
    var pkg = buildFromLocation(loc);
    if (bundle) pkg = enrichFromBundle(pkg, bundle);
    return normalizePackage(pkg, defaults);
  }

  function get(request) {
    var req = normalizeRequest(request);
    lastRequest = req;

    return loadRegionsIndex(req.contentEngineBase).then(function (index) {
      var defaults = getDefaults(index);
      return resolveLocation(req).then(function (loc) {
        req.location = loc;
        if (req.bundle) {
          var applied = req.bundle;
          if (global.WDS && global.WDS.location && global.WDS.location.applyToBundle) {
            applied = global.WDS.location.applyToBundle(req.bundle, loc);
          }
          var pkg = assemble(loc, applied, defaults);
          lastPackage = pkg;
          devLog("get complete (bundle provided)", pkg.region.label, pkg.location.source);
          notifyChange(pkg);
          return pkg;
        }
        var regionId = req.regionId || (loc && loc.contentBundle) || (defaults && defaults.contentBundleId);
        return loadBundle(regionId, req.contentEngineBase).then(function (bundle) {
          if (global.WDS && global.WDS.location && global.WDS.location.applyToBundle) {
            bundle = global.WDS.location.applyToBundle(bundle, loc);
          }
          var pkg = assemble(loc, bundle, defaults);
          lastPackage = pkg;
          devLog("get complete", pkg.region.label, pkg.location.source);
          notifyChange(pkg);
          return pkg;
        }).catch(function (err) {
          devLog("bundle load failed — location-only package", err && err.message);
          var pkg = assemble(loc, null, defaults);
          lastPackage = pkg;
          notifyChange(pkg);
          return pkg;
        });
      });
    });
  }

  function getLast() {
    return lastPackage ? normalizePackage(lastPackage, getDefaults()) : null;
  }

  function clearCache() {
    lastPackage = null;
    lastRequest = null;
    indexCache = null;
    defaultsCache = null;
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

  var RI = global.WDS && global.WDS.regionalIntelligence;
  if (!RI) {
    global.WDS = global.WDS || {};
    RI = global.WDS.regionalIntelligence = {};
  }

  RI.engine = {
    VERSION: VERSION,
    configure: configure,
    emptyPackage: emptyPackage,
    normalizePackage: normalizePackage,
    normalizeLocationSource: normalizeLocationSource,
    loadRegionsIndex: loadRegionsIndex,
    getDefaultRegion: getDefaultRegion,
    getDefaults: getDefaults,
    buildFallbackLocationState: buildFallbackLocationState,
    regionToLocationState: regionToLocationState,
    lookupCounty: lookupCounty,
    lookupRegion: lookupRegion,
    lookupByCoords: lookupByCoords,
    resolveLocation: resolveLocation,
    buildFromLocation: buildFromLocation,
    enrichFromBundle: enrichFromBundle,
    assemble: assemble,
    get: get,
    getLast: getLast,
    clearCache: clearCache,
    refresh: refresh,
    onChange: onChange,
    monthFromDate: monthFromDate,
    isDev: isDev,
    devLog: devLog
  };
})(window);
