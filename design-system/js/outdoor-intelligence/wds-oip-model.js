/**
 * Waypoint Outdoor Intelligence Platform — canonical model (V2)
 * Single package shape for homepage, ForageCast, Fieldry, and future apps.
 */
(function (global) {
  "use strict";

  var VERSION = "2.0.0";

  var SLICES = Object.freeze({
    location: "location",
    region: "region",
    weather: "weather",
    calendar: "calendar",
    phenology: "phenology",
    daylight: "daylight",
    elevation: "elevation",
    species: "species",
    observations: "observations",
    conservation: "conservation",
    research: "research",
    ethics: "ethics",
    geography: "geography",
    rainfall: "rainfall"
  });

  function engineDefaults() {
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.getDefaults) {
      return RI.engine.getDefaults();
    }
    return null;
  }

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
    var args = ["[WDS.outdoorIntelligence]"].concat(Array.prototype.slice.call(arguments));
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

  function normalizeSpeciesEntry(entry) {
    if (!entry) return null;
    if (typeof entry === "string") return { name: entry, status: "", note: "" };
    return {
      name: entry.name || entry.commonName || "",
      status: entry.status || "",
      note: entry.note || ""
    };
  }

  function emptyCollection() {
    return { status: "placeholder", items: [] };
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
      elevation: { feet: null, note: null, available: false },
      geography: {
        ecoregion: null,
        bioregion: null,
        dominantForest: null,
        watersheds: []
      },
      calendar: { season: null, month: null, weekOf: null },
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
      rainfall: { recent: null },
      phenology: {
        status: "placeholder",
        stage: null,
        summary: null,
        notes: [],
        watch: { activeNow: [], ending: [], comingSoon: [] }
      },
      species: { status: "placeholder", active: [], ending: [], comingSoon: [] },
      observations: emptyCollection(),
      conservation: { status: "placeholder", current: null },
      research: { status: "placeholder", current: null },
      ethics: { status: "active", version: null },
      weatherRef: null,
      legacy: null
    };
  }

  function applyFallback(pkg, defaults) {
    defaults = defaults || engineDefaults();
    if (!defaults) return pkg;
    pkg.meta.regionId = defaults.regionId;
    pkg.meta.contentBundleId = defaults.contentBundleId;
    pkg.meta.isFallbackLocation = true;
    pkg.location.source = "fallback";
    pkg.location.latitude = defaults.latitude;
    pkg.location.longitude = defaults.longitude;
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
    }
    if (defaults.season) pkg.calendar.season = defaults.season;
    if (defaults.bioregion) pkg.geography.bioregion = defaults.bioregion;
    pkg.calendar.month = monthFromDate(new Date(), null);
    return pkg;
  }

  function buildFallbackLocationState() {
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.buildFallbackLocationState) {
      return RI.engine.buildFallbackLocationState();
    }
    return null;
  }

  function normalizePackage(raw) {
    var pkg = emptyPackage();
    if (!raw || typeof raw !== "object") return applyFallback(pkg);

    if (raw.meta) Object.assign(pkg.meta, raw.meta);
    if (raw.location) Object.assign(pkg.location, raw.location);
    if (raw.region) Object.assign(pkg.region, raw.region);
    if (raw.county) Object.assign(pkg.county, raw.county);
    if (raw.state) Object.assign(pkg.state, raw.state);
    if (raw.country) Object.assign(pkg.country, raw.country);
    if (raw.elevation) Object.assign(pkg.elevation, raw.elevation);
    if (raw.geography) Object.assign(pkg.geography, raw.geography);
    if (raw.calendar) Object.assign(pkg.calendar, raw.calendar);
    if (raw.daylight) Object.assign(pkg.daylight, raw.daylight);
    if (raw.weather) Object.assign(pkg.weather, raw.weather);
    if (raw.phenology) Object.assign(pkg.phenology, raw.phenology);
    if (raw.conservation) Object.assign(pkg.conservation, raw.conservation);
    if (raw.research) Object.assign(pkg.research, raw.research);

    pkg.timezone = raw.timezone != null ? raw.timezone : pkg.timezone;
    pkg.rainfall = raw.rainfall || pkg.rainfall;

    if (raw.species) {
      pkg.species.status = raw.species.status || pkg.species.status;
      ["active", "ending", "comingSoon"].forEach(function (key) {
        pkg.species[key] = Array.isArray(raw.species[key])
          ? raw.species[key].map(normalizeSpeciesEntry).filter(function (s) { return s && s.name; })
          : [];
      });
    }

    if (raw.observations) {
      pkg.observations.status = raw.observations.status || pkg.observations.status;
      pkg.observations.items = Array.isArray(raw.observations.items) ? raw.observations.items : [];
    }

    if (!isFiniteCoord(pkg.location.latitude) || !isFiniteCoord(pkg.location.longitude)) {
      devLog("normalize: invalid coordinates — applying index default");
      applyFallback(pkg);
    }

    pkg.location.source = normalizeLocationSource(pkg.location.source, pkg.meta.isFallbackLocation);

    if (!pkg.calendar.month) {
      pkg.calendar.month = monthFromDate(new Date(), pkg.calendar.weekOf);
    }
    if (!pkg.timezone && pkg.daylight.timezone) pkg.timezone = pkg.daylight.timezone;
    if (!pkg.meta.assembledAt) pkg.meta.assembledAt = new Date().toISOString();
    if (!Array.isArray(pkg.geography.watersheds)) pkg.geography.watersheds = [];

    pkg.weatherRef = raw.weatherRef !== undefined ? raw.weatherRef : null;
    pkg.legacy = raw.legacy !== undefined ? raw.legacy : null;
    return pkg;
  }

  function getSlice(pkg, sliceName) {
    pkg = normalizePackage(pkg);
    if (!sliceName || sliceName === SLICES.location) {
      return {
        source: pkg.location.source,
        latitude: pkg.location.latitude,
        longitude: pkg.location.longitude,
        accuracyM: pkg.location.accuracyM,
        distanceKm: pkg.location.distanceKm,
        isFallback: pkg.meta.isFallbackLocation
      };
    }
    if (sliceName === SLICES.region) {
      return {
        id: pkg.region.id,
        label: pkg.region.label,
        county: pkg.county,
        state: pkg.state,
        country: pkg.country
      };
    }
    return pkg[sliceName] != null ? pkg[sliceName] : null;
  }

  function toContext(pkg) {
    pkg = normalizePackage(pkg);
    return {
      version: VERSION,
      latitude: pkg.location.latitude,
      longitude: pkg.location.longitude,
      regionLabel: pkg.region.label,
      regionId: pkg.region.id,
      county: pkg.county.name,
      state: pkg.state.name,
      stateCode: pkg.state.code,
      country: pkg.country.name,
      countryCode: pkg.country.code,
      timezone: pkg.timezone,
      elevationFt: pkg.elevation.available ? pkg.elevation.feet : null,
      locationSource: pkg.location.source,
      isFallbackLocation: pkg.meta.isFallbackLocation,
      season: pkg.calendar.season,
      month: pkg.calendar.month,
      weekOf: pkg.calendar.weekOf,
      daylight: pkg.daylight,
      weather: pkg.weather,
      species: pkg.species,
      phenology: pkg.phenology,
      observations: pkg.observations,
      conservation: pkg.conservation,
      research: pkg.research,
      ethics: pkg.ethics,
      geography: pkg.geography,
      rainfall: pkg.rainfall,
      weatherRef: pkg.weatherRef
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorIntelligence = global.WDS.outdoorIntelligence || {};
  Object.assign(global.WDS.outdoorIntelligence, {
    VERSION: VERSION,
    DEFAULT_REGION_ID: function () {
      var d = engineDefaults();
      return d ? d.regionId : null;
    },
    SLICES: SLICES,
    get FALLBACK() {
      return engineDefaults() || {};
    },
    model: {
      VERSION: VERSION,
      SLICES: SLICES,
      get FALLBACK() {
        return engineDefaults() || {};
      },
      emptyPackage: emptyPackage,
      normalizePackage: normalizePackage,
      normalizeLocationSource: normalizeLocationSource,
      normalizeSpeciesEntry: normalizeSpeciesEntry,
      buildFallbackLocationState: buildFallbackLocationState,
      applyFallback: applyFallback,
      getSlice: getSlice,
      toContext: toContext,
      monthFromDate: monthFromDate,
      isFiniteCoord: isFiniteCoord,
      isDev: isDev,
      devLog: devLog
    }
  });
})(window);
