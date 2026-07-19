/**
 * Waypoint Outdoor Intelligence Platform — shared adapters
 * V1 compatibility, region resolution, and app hydration helpers.
 */
(function (global) {
  "use strict";

  var OIP = global.WDS && global.WDS.outdoorIntelligence;

  function resolveRegionId(options) {
    options = options || {};
    var loc = options.location;
    if (options.regionId) return options.regionId;
    if (loc && loc.contentBundle) return loc.contentBundle;
    if (loc && loc.regionId) return loc.regionId;
    if (global.WDS && global.WDS.location && global.WDS.location.getDefaultRegionId) {
      var fromLoc = global.WDS.location.getDefaultRegionId();
      if (fromLoc) return fromLoc;
    }
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.resolveDefaultRegionId) {
      var fromRi = RI.resolveDefaultRegionId();
      if (fromRi) return fromRi;
    }
    if (OIP && typeof OIP.DEFAULT_REGION_ID === "function") {
      return OIP.DEFAULT_REGION_ID();
    }
    return null;
  }

  function v1LayerFromOipBundle(layer) {
    if (!layer) return {};
    return {
      meta: layer.meta,
      region: layer.region,
      county: layer.county,
      state: layer.state,
      coordinates: layer.location
        ? { latitude: layer.location.latitude, longitude: layer.location.longitude }
        : undefined,
      geography: layer.geography
        ? {
            elevationFt: layer.elevation && layer.elevation.feet,
            elevationNote: layer.elevation && layer.elevation.note,
            ecoregion: layer.geography.ecoregion,
            bioregion: layer.geography.bioregion,
            dominantForest: layer.geography.dominantForest,
            watersheds: layer.geography.watersheds || []
          }
        : undefined,
      season: layer.calendar
        ? { label: layer.calendar.season, weekOf: layer.calendar.weekOf }
        : undefined,
      phenology: layer.phenology
        ? { stage: layer.phenology.stage, summary: layer.phenology.summary }
        : undefined,
      weather: layer.weather,
      rainfall: layer.rainfall,
      daylight: layer.daylight,
      species: layer.species ? { active: layer.species.active || [] } : undefined
    };
  }

  function v1LayerFromOipLocation(layer) {
    if (!layer || !layer.location) return v1LayerFromOipBundle(layer);
    return v1LayerFromOipBundle(layer);
  }

  function engineLayerFromOipBundle(layer) {
    if (!layer) return {};
    var out = {
      meta: layer.meta,
      region: layer.region,
      county: layer.county,
      state: layer.state,
      calendar: layer.calendar,
      timezone: layer.timezone
    };
    if (layer.elevation) {
      out.elevation = {
        status: layer.elevation.available ? "editorial" : "placeholder",
        feet: layer.elevation.feet,
        note: layer.elevation.note,
        available: layer.elevation.available
      };
    }
    if (layer.geography) {
      out.geography = {
        status: layer.geography.ecoregion || layer.geography.bioregion ? "editorial" : "placeholder",
        ecoregion: layer.geography.ecoregion,
        bioregion: layer.geography.bioregion,
        dominantForest: layer.geography.dominantForest,
        watersheds: layer.geography.watersheds || []
      };
    }
    if (layer.daylight) out.daylight = Object.assign({ status: "editorial" }, layer.daylight);
    if (layer.weather) out.weather = Object.assign({}, layer.weather);
    if (layer.phenology) out.phenology = Object.assign({}, layer.phenology);
    return out;
  }

  function speciesToOutlookList(species) {
    if (!species || !species.active || !species.active.length) return [];
    return species.active.map(function (entry) {
      return {
        species: entry.name,
        status: entry.status || "active",
        note: entry.note || ""
      };
    });
  }

  function hydrateRegionalStatus(regionalStatus, platform) {
    regionalStatus = regionalStatus || {};
    if (!platform) return regionalStatus;
    var w = platform.weather || {};
    var isLive = w.status === "live" || w.isLive;
    regionalStatus.weather = Object.assign({}, regionalStatus.weather || {}, {
      label: isLive ? "Live conditions" : (regionalStatus.weather && regionalStatus.weather.label) || "Regional snapshot",
      high: w.high || (regionalStatus.weather && regionalStatus.weather.high),
      low: w.low || (regionalStatus.weather && regionalStatus.weather.low),
      conditions: w.conditions || w.summary || (regionalStatus.weather && regionalStatus.weather.conditions)
    });
    if (platform.rainfall && platform.rainfall.recent && platform.rainfall.recent.summary) {
      regionalStatus.weather.soilMoisture = platform.rainfall.recent.summary;
    }
    var outlook = speciesToOutlookList(platform.species);
    if (outlook.length) regionalStatus.fruitingOutlook = outlook;
    if (platform.phenology && platform.phenology.summary && !regionalStatus.summary) {
      regionalStatus.summary = platform.phenology.summary;
    }
    return regionalStatus;
  }

  function hydrateConditions(conditions, platform, loc) {
    conditions = conditions || {};
    conditions.inputs = conditions.inputs || {};
    conditions.labels = conditions.labels || {};
    if (!platform) {
      conditions._hydration = { liveWeather: false, note: "No platform package" };
      return conditions;
    }
    if (platform.calendar) {
      if (platform.calendar.weekOf) conditions.weekOf = platform.calendar.weekOf;
      if (platform.calendar.season) conditions.seasonNote = platform.calendar.season;
    }

    var weather = platform.modules && platform.modules.weather
      ? platform.modules.weather
      : platform.weather;
    var live = !!(weather && (weather.status === "live" || weather.isLive || weather.current ||
      (weather.daily && weather.daily.length)));
    var changed = [];

    if (live && weather) {
      var daily0 = weather.daily && weather.daily[0];
      var precip = daily0
        ? Number(daily0.precipitationSum != null ? daily0.precipitationSum : daily0.precipMm)
        : NaN;
      if (!isNaN(precip)) {
        // Map mm toward 0–1 educational input (≈25mm ≈ strong pulse)
        conditions.inputs.recentRainfall = Math.max(0.15, Math.min(0.95, precip / 25));
        conditions.labels.recentRainfall = (precip / 25.4).toFixed(2) + " in forecast day-0 precip (live)";
        changed.push("Rainfall input refreshed from live forecast precipitation.");
      }
      var tmin = daily0 ? Number(daily0.temperatureMin != null ? daily0.temperatureMin : daily0.tMin) : NaN;
      var tmax = daily0 ? Number(daily0.temperatureMax != null ? daily0.temperatureMax : daily0.tMax) : NaN;
      var tavg = !isNaN(tmin) && !isNaN(tmax) ? (tmin + tmax) / 2
        : (weather.current && weather.current.temperature != null
          ? Number(weather.current.temperature)
          : NaN);
      if (!isNaN(tavg)) {
        // Map ~40–85°F into 0.2–0.9 educational band
        var f = tavg > 45 ? tavg : (tavg * 9 / 5 + 32);
        conditions.inputs.temperature = Math.max(0.2, Math.min(0.95, (f - 40) / 45));
        conditions.labels.temperature = "About " + Math.round(f) + "°F (live day average / current)";
        changed.push("Temperature input refreshed from live weather.");
      }
      if (platform.rainfall && platform.rainfall.recent && platform.rainfall.recent.summary) {
        conditions.labels.soilMoisture = platform.rainfall.recent.summary;
        var wet = /moist|elevat|wet|favor|inch/i.test(String(platform.rainfall.recent.summary));
        conditions.inputs.soilMoisture = wet
          ? Math.max(conditions.inputs.soilMoisture || 0.5, 0.62)
          : Math.min(conditions.inputs.soilMoisture || 0.5, 0.48);
        changed.push("Soil moisture label refreshed from rainfall module.");
      }
      if (tmax >= 30 || (weather.current && Number(weather.current.temperature) >= 86)) {
        changed.push("Heat after mid-day may dry exposed slopes faster than shaded draws.");
      }
    }

    if (loc && loc.elevationFt != null && conditions.inputs) {
      var baseElev = (platform.elevation && platform.elevation.feet) || 1200;
      var delta = (loc.elevationFt - baseElev) / 800;
      conditions.inputs.temperature = Math.max(0.2, Math.min(0.95, (conditions.inputs.temperature || 0.5) - delta * 0.08));
      conditions.inputs.soilMoisture = Math.max(0.2, Math.min(0.95, (conditions.inputs.soilMoisture || 0.5) + delta * 0.05));
    }
    if (platform.region || (platform.county && platform.state)) {
      conditions.region = {
        county: (platform.county && platform.county.name) || (conditions.region && conditions.region.county),
        state: (platform.state && platform.state.name) || (conditions.region && conditions.region.state),
        bioregion: (platform.geography && platform.geography.bioregion) ||
          (conditions.region && conditions.region.bioregion)
      };
    }

    if (changed.length) {
      conditions.whatChangedThisWeek = changed.concat(
        (conditions.whatChangedThisWeek || []).filter(function (line) {
          return changed.indexOf(line) === -1;
        })
      ).slice(0, 6);
    }

    conditions._platform = platform;
    conditions._hydration = {
      liveWeather: live,
      note: live
        ? "Model inputs partially refreshed from live weather"
        : "Live weather unavailable — educational model inputs retained with uncertainty"
    };
    return conditions;
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorIntelligence = global.WDS.outdoorIntelligence || {};
  global.WDS.outdoorIntelligence.adapters = {
    resolveRegionId: resolveRegionId,
    v1LayerFromOipBundle: v1LayerFromOipBundle,
    v1LayerFromOipLocation: v1LayerFromOipLocation,
    engineLayerFromOipBundle: engineLayerFromOipBundle,
    speciesToOutlookList: speciesToOutlookList,
    hydrateRegionalStatus: hydrateRegionalStatus,
    hydrateConditions: hydrateConditions
  };
})(window);
