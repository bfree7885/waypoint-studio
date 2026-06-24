/**
 * Waypoint Studio — Regional intelligence core
 * Normalized regional context schema. Provider- and app-agnostic.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  function resolveDefaultRegionId() {
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.getDefaults) {
      var d = RI.engine.getDefaults();
      if (d && d.regionId) return d.regionId;
    }
    return null;
  }

  function emptyPackage() {
    return {
      meta: {
        version: VERSION,
        assembledAt: null,
        regionId: null,
        contentBundleId: null,
        scope: null,
        isPlaceholder: true,
        sources: {}
      },
      region: { id: null, label: null },
      county: { name: null, stateCode: null },
      state: { name: null, code: null },
      coordinates: { latitude: null, longitude: null },
      geography: {
        elevationFt: null,
        elevationNote: null,
        ecoregion: null,
        bioregion: null,
        dominantForest: null,
        watersheds: []
      },
      season: { label: null, weekOf: null },
      phenology: { stage: null, summary: null },
      weather: {
        summary: null,
        high: null,
        low: null,
        conditions: null,
        source: null,
        isLive: false
      },
      rainfall: { recent: null },
      daylight: {
        sunrise: null,
        sunset: null,
        dayLengthHours: null,
        timezone: null,
        source: null
      },
      species: { active: [] },
      weatherRef: null
    };
  }

  function mergeDefined(target, source) {
    if (!source || typeof source !== "object") return target;
    Object.keys(source).forEach(function (key) {
      if (source[key] !== undefined) target[key] = source[key];
    });
    return target;
  }

  function normalizeSpeciesEntry(entry) {
    if (!entry) return null;
    if (typeof entry === "string") {
      return { name: entry, status: "", note: "" };
    }
    return {
      name: entry.name || entry.commonName || "",
      status: entry.status || "",
      note: entry.note || ""
    };
  }

  function normalizePackage(raw) {
    var base = emptyPackage();
    if (!raw || typeof raw !== "object") return base;

    if (raw.meta) mergeDefined(base.meta, raw.meta);
    if (raw.region) mergeDefined(base.region, raw.region);
    if (raw.county) mergeDefined(base.county, raw.county);
    if (raw.state) mergeDefined(base.state, raw.state);
    if (raw.coordinates) mergeDefined(base.coordinates, raw.coordinates);
    if (raw.geography) mergeDefined(base.geography, raw.geography);
    if (raw.season) mergeDefined(base.season, raw.season);
    if (raw.phenology) mergeDefined(base.phenology, raw.phenology);
    if (raw.weather) mergeDefined(base.weather, raw.weather);
    if (raw.rainfall) {
      base.rainfall = raw.rainfall;
      if (raw.rainfall.recent === undefined) base.rainfall.recent = null;
    }
    if (raw.daylight) mergeDefined(base.daylight, raw.daylight);
    if (raw.species) {
      base.species.active = Array.isArray(raw.species.active)
        ? raw.species.active.map(normalizeSpeciesEntry).filter(Boolean)
        : [];
    }
    if (raw.weatherRef !== undefined) base.weatherRef = raw.weatherRef;

    if (!Array.isArray(base.geography.watersheds)) {
      base.geography.watersheds = [];
    }

    return base;
  }

  /** Flat field map for lightweight consumers */
  function toFlatView(pkg) {
    pkg = normalizePackage(pkg);
    return {
      region: pkg.region.label,
      regionId: pkg.region.id,
      county: pkg.county.name,
      state: pkg.state.name,
      stateCode: pkg.state.code,
      latitude: pkg.coordinates.latitude,
      longitude: pkg.coordinates.longitude,
      elevation: pkg.geography.elevationFt,
      ecoregion: pkg.geography.ecoregion,
      dominantForest: pkg.geography.dominantForest,
      currentSeason: pkg.season.label,
      phenologyStage: pkg.phenology.stage,
      currentWeather: pkg.weather,
      activeSpecies: pkg.species.active,
      recentRainfall: pkg.rainfall.recent,
      daylight: pkg.daylight
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.regionalIntelligence = global.WDS.regionalIntelligence || {};
  var RI = global.WDS.regionalIntelligence;
  Object.assign(RI, {
    VERSION: VERSION,
    resolveDefaultRegionId: resolveDefaultRegionId,
    emptyPackage: emptyPackage,
    normalizePackage: normalizePackage,
    normalizeSpeciesEntry: normalizeSpeciesEntry,
    toFlatView: toFlatView
  });
  Object.defineProperty(RI, "DEFAULT_REGION_ID", {
    configurable: true,
    enumerable: true,
    get: resolveDefaultRegionId
  });
})(window);
