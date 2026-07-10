/**
 * Kiosk normalization — stable visitor-facing schema from OIP platform packages.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;
  var ENGINE_PUBLISH = { lat: 39.8283, lng: -98.5795 };
  var ENGINE_TOLERANCE = 0.2;

  function isEnginePublishPoint(lat, lng) {
    if (!isFinite(Number(lat)) || !isFinite(Number(lng))) return false;
    return Math.abs(Number(lat) - ENGINE_PUBLISH.lat) <= ENGINE_TOLERANCE &&
      Math.abs(Number(lng) - ENGINE_PUBLISH.lng) <= ENGINE_TOLERANCE;
  }

  function isEngineWeather(pkg, loc) {
    if (!pkg || !pkg.meta) return false;
    if (pkg.meta.provider === "waypoint-live-engine" || pkg.meta.liveFeed === true) return true;
    if (isFinite(Number(pkg.meta.lat)) && isEnginePublishPoint(pkg.meta.lat, pkg.meta.lng) &&
        loc && isFinite(Number(loc.lat)) && !isEnginePublishPoint(loc.lat, loc.lng)) {
      return true;
    }
    return false;
  }

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null && isFinite(Number(meas.value))) return Number(meas.value);
    return null;
  }

  function hasCoords(loc) {
    return !!(loc && isFinite(Number(loc.lat)) && isFinite(Number(loc.lng)));
  }

  function normalizeLocation(loc) {
    if (!loc) {
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        timezone: null,
        label: "Location unavailable",
        source: "unavailable",
        resolvedAt: null,
        unavailable: true
      };
    }
    return {
      latitude: isFinite(Number(loc.lat)) ? Number(loc.lat) : null,
      longitude: isFinite(Number(loc.lng)) ? Number(loc.lng) : null,
      accuracy: loc.accuracy != null ? Number(loc.accuracy) : null,
      timezone: loc.timezone || null,
      label: loc.displayTitle || loc.placeLabel || null,
      source: loc.source || "unknown",
      resolvedAt: loc.detectedAt || loc.timestamp ? new Date(loc.detectedAt || loc.timestamp).toISOString() : null,
      unavailable: loc.unavailable || loc.source === "unavailable" ||
        !isFinite(Number(loc.lat)) || !isFinite(Number(loc.lng))
    };
  }

  function weatherPackage(platform, loc) {
    if (!platform) return null;
    var pkg = platform.weatherRef || platform.weather;
    if (!pkg || (pkg.meta && pkg.meta.isPlaceholder)) return null;
    if (isEngineWeather(pkg, loc)) return null;
    if (pkg.status === "unavailable" || pkg.status === "refreshing") return null;
    return pkg;
  }

  function normalizeHourly(pkg, timezone) {
    var hourly = pkg && pkg.hourly;
    var rows = Array.isArray(hourly) ? hourly : (hourly && hourly.nextHours ? hourly.nextHours : []);
    var out = [];
    for (var i = 0; i < Math.min(6, rows.length); i++) {
      var row = rows[i];
      out.push({
        time: row.time,
        temperatureF: num(row.temperatureF != null ? row.temperatureF : row.temperature),
        conditions: row.conditions && row.conditions.summary ? row.conditions.summary :
          (typeof row.conditions === "string" ? row.conditions : null)
      });
    }
    return {
      nextHours: out,
      note: out.length ? "Next hours at your location" : "Hourly forecast unavailable",
      timezone: timezone || null,
      status: out.length ? "live" : "unavailable"
    };
  }

  function normalizeDaily(pkg) {
    var daily = pkg && pkg.daily && pkg.daily[0];
    if (!daily) return { highF: null, lowF: null, precipProbability: null, summary: null };
    var high = num(daily.temperatureHigh != null ? daily.temperatureHigh : (daily.temperature && daily.temperature.max));
    var low = num(daily.temperatureLow != null ? daily.temperatureLow : (daily.temperature && daily.temperature.min));
    return {
      highF: high,
      lowF: low,
      precipProbability: num(daily.precipitation && daily.precipitation.probability),
      summary: daily.conditions && daily.conditions.summary ? daily.conditions.summary : null
    };
  }

  function normalizeWeather(platform, loc) {
    var pkg = weatherPackage(platform, loc);
    if (!pkg) {
      return {
        status: "unavailable",
        timezone: (platform && platform.timezone) || (loc && loc.timezone) || null,
        current: null,
        forecast: null,
        hourly: { nextHours: [], note: "Hourly forecast unavailable", status: "unavailable" },
        sun: null,
        moon: null,
        userLocation: hasCoords(loc)
      };
    }
    var cur = pkg.current || {};
    var dl = platform && platform.daylight;
    var tz = (pkg.meta && pkg.meta.timezone) || (platform && platform.timezone) ||
      (dl && dl.timezone) || (loc && loc.timezone) || null;
    var current = {
      temperatureF: num(cur.temperature),
      feelsLikeF: num(cur.feelsLike),
      humidity: num(cur.humidity),
      windMph: num(cur.wind && cur.wind.speed),
      windGustMph: num(cur.wind && cur.wind.gust),
      cloudCover: num(cur.cloudCover),
      uvIndex: num(cur.uvIndex),
      conditions: cur.conditions ? cur.conditions.summary : null,
      observedAt: (pkg.meta && pkg.meta.fetchedAt) || cur.observedAt || null
    };
    var hasCurrent = current.temperatureF != null || !!current.conditions;
    return {
      status: hasCurrent ? "live" : "unavailable",
      timezone: tz,
      current: hasCurrent ? current : null,
      forecast: normalizeDaily(pkg),
      hourly: normalizeHourly(pkg, tz),
      sun: dl ? {
        sunrise: dl.sunrise,
        sunset: dl.sunset,
        sunriseFormatted: dl.sunriseFormatted,
        sunsetFormatted: dl.sunsetFormatted,
        status: "live"
      } : null,
      moon: dl && dl.moonPhase ? {
        phase: dl.moonPhase,
        illumination: dl.moonIllumination,
        status: "live"
      } : null,
      userLocation: hasCoords(loc),
      provider: pkg.meta && pkg.meta.provider ? pkg.meta.provider : null
    };
  }

  function normalizeAirQuality(aq) {
    if (!aq || aq.status === "unavailable") {
      return { status: "unavailable", usAqi: null, category: null, pm25: null };
    }
    var value = aq.usAqi != null ? aq.usAqi : aq.aqi;
    if (value == null && aq.status !== "empty") {
      return { status: "unavailable", usAqi: null, category: aq.category || null, pm25: aq.pm25 != null ? aq.pm25 : null };
    }
    return {
      status: "live",
      usAqi: value != null ? Number(value) : null,
      category: aq.category || null,
      pm25: aq.pm25 != null ? aq.pm25 : null,
      summary: aq.summary || null
    };
  }

  function normalizeAlerts(alerts) {
    if (!alerts || alerts.status === "unavailable") {
      return { status: "unavailable", items: [], count: 0 };
    }
    var items = Array.isArray(alerts.items) ? alerts.items : [];
    return {
      status: items.length ? "live" : "empty",
      items: items,
      count: alerts.count != null ? alerts.count : items.length,
      summary: alerts.summary || null
    };
  }

  function normalizeRiver(usgs) {
    if (!usgs || usgs.status === "unavailable") {
      return { status: "unavailable", nearest: null };
    }
    if (usgs.status === "no-nearby" || !usgs.nearest) {
      return { status: "no-nearby", nearest: null, summary: usgs.summary || null };
    }
    return {
      status: "live",
      nearest: usgs.nearest,
      siteCount: usgs.siteCount,
      summary: usgs.summary || null
    };
  }

  function normalizePhotography(platform) {
    var photo = global.WDS && global.WDS.photographyConditions && global.WDS.photographyConditions.fromPlatform
      ? global.WDS.photographyConditions.fromPlatform(platform)
      : null;
    if (!photo || photo.status === "unavailable") {
      return { status: "unavailable", score: null, summary: null };
    }
    return photo;
  }

  function normalizePlatform(platform, loc) {
    var normalizedLoc = normalizeLocation(loc);
    var weather = normalizeWeather(platform, loc);
    var modules = {
      weather: weather,
      airQuality: normalizeAirQuality(platform && platform.airQuality),
      alerts: normalizeAlerts(platform && platform.alerts),
      usgsWater: normalizeRiver(platform && platform.usgsWater),
      photography: normalizePhotography(platform),
      daylight: platform && platform.daylight ? platform.daylight : null
    };
    var blockStatus = platform && platform.meta && platform.meta.blockStatus ? platform.meta.blockStatus : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      location: normalizedLoc,
      modules: modules,
      blockStatus: blockStatus,
      platformMeta: platform && platform.meta ? {
        hydratedAt: platform.meta.hydratedAt,
        contentSource: platform.meta.contentSource,
        moduleSources: platform.meta.moduleSources || null
      } : null
    };
  }

  function moduleReady(mod, key) {
    if (!mod) return false;
    if (key === "weather") return mod.status === "live" && mod.current != null;
    if (key === "airQuality") return mod.status === "live" && mod.usAqi != null;
    if (key === "alerts") return mod.status === "live" || mod.status === "empty";
    if (key === "usgsWater") return mod.status === "live" || mod.status === "no-nearby";
    if (key === "photography") return mod.status === "live" || mod.status === "estimated";
    if (key === "hourly") return mod.nextHours && mod.nextHours.length > 0;
    return mod.status === "live";
  }

  function bootPhase(state) {
    var phase = state && state.phase ? state.phase : "BOOTING";
    return phase;
  }

  global.WDS = global.WDS || {};
  global.WDS.kioskNormalize = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    num: num,
    normalizeLocation: normalizeLocation,
    normalizePlatform: normalizePlatform,
    normalizeWeather: normalizeWeather,
    normalizeAirQuality: normalizeAirQuality,
    normalizeAlerts: normalizeAlerts,
    normalizeRiver: normalizeRiver,
    moduleReady: moduleReady,
    bootPhase: bootPhase
  };
})(typeof window !== "undefined" ? window : global);
