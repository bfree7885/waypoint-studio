/**
 * Waypoint Live Engine feed — prefers server-generated data/live.json.
 * Falls back silently when the file is missing or stale / empty.
 */
(function (global) {
  "use strict";

  var LIVE_URL = "data/live.json";
  var HEALTH_URL = "data/health.json";
  var MAX_AGE_MS = 3 * 60 * 60 * 1000;
  var lastFeed = null;
  var lastHealth = null;
  var lastError = null;

  function fetchHealth(url) {
    url = url || HEALTH_URL;
    var bust = (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
    return fetch(url + bust, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("health.json HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        lastHealth = data;
        return data;
      })
      .catch(function () {
        return null;
      });
  }

  function fetchEngineContext() {
    return Promise.all([fetchLive(), fetchHealth()]).then(function (parts) {
      var feed = parts[0];
      var health = parts[1];
      if (!feed) return null;
      return toEngineContext(feed, health);
    });
  }

  function toEngineContext(feed, health) {
    if (!feed) return null;
    return {
      engine: {
        version: feed.engineVersion,
        name: feed.engine || "waypoint-live-engine",
        updatedAt: feed.updatedAt,
        nextScheduledUpdate: feed.nextScheduledUpdate,
        publishLocation: feed.location || null,
        timezone: feed.timezone || null
      },
      health: health ? {
        overall: health.overall || null,
        modules: health.modules || null,
        publish: health.publish || null,
        generatedAt: health.generatedAt || null,
        nextScheduledUpdate: health.nextScheduledUpdate || null
      } : null,
      operational: {
        isFresh: isFresh(feed),
        sources: (feed.meta && feed.meta.sources) || [],
        failures: (feed.meta && feed.meta.failures) || []
      }
    };
  }

  function buildModuleSources(platform) {
    platform = platform || {};
    var wx = platform.weatherRef;
    var sources = {
      weather: wx && wx.meta && wx.meta.provider
        ? wx.meta.provider + " (user)"
        : (platform.weather && platform.weather.status === "live" ? "oip (user)" : "unavailable"),
      alerts: platform.alerts && platform.alerts.status === "live"
        ? "nws (user)"
        : (platform.alerts && platform.alerts.status === "unavailable" ? "nws-unavailable" : "unavailable"),
      airQuality: platform.airQuality && platform.airQuality.status === "live"
        ? "open-meteo-aq (user)"
        : "unavailable",
      usgsWater: platform.usgsWater && platform.usgsWater.nearest
        ? "usgs-iv (user)"
        : (platform.usgsWater && platform.usgsWater.status === "no-nearby" ? "usgs-no-nearby (user)" : "unavailable"),
      daylight: platform.daylight ? "oip-derived (user)" : "unavailable",
      elevation: platform.location && platform.location.elevationMeters != null
        ? "elevation (user)"
        : "unavailable",
      photography: "oie-derived (user)",
      engineHealth: platform.engineContext ? "live-engine metadata" : "unavailable"
    };
    return sources;
  }

  function mergeEngineContext(platform, engineCtx, userLoc) {
    if (!platform) return null;
    platform.meta = Object.assign({}, platform.meta || {});
    platform.meta.contentSource = "user-oip";
    platform.meta.liveFeed = false;
    if (userLoc && isFinite(Number(userLoc.lat)) && isFinite(Number(userLoc.lng))) {
      platform.location = Object.assign({}, platform.location || {}, {
        latitude: Number(userLoc.lat),
        longitude: Number(userLoc.lng),
        source: userLoc.source || "user",
        label: userLoc.displayTitle || userLoc.placeLabel || null
      });
      if (platform.weatherRef && platform.weatherRef.meta) {
        platform.weatherRef.meta = Object.assign({}, platform.weatherRef.meta, {
          lat: Number(userLoc.lat),
          lng: Number(userLoc.lng),
          dataCoordSource: "user"
        });
      }
    }
    if (engineCtx) {
      platform.engineContext = engineCtx;
      platform.meta.engineHealth = engineCtx.health && engineCtx.health.overall;
      platform.meta.engineStatus = engineCtx.health && engineCtx.health.overall &&
        engineCtx.health.overall.label;
      platform.meta.engineUpdatedAt = engineCtx.engine && engineCtx.engine.updatedAt;
      platform.meta.enginePublishLocation = engineCtx.engine && engineCtx.engine.publishLocation;
      platform.meta.engineOperational = engineCtx.operational;
      platform.meta.engineModuleStatus = engineCtx.health && engineCtx.health.modules;
    }
    platform.meta.moduleSources = buildModuleSources(platform);
    return platform;
  }

  function fetchLive(url) {
    url = url || LIVE_URL;
    var bust = (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
    return fetch(url + bust, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("live.json HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data !== "object") throw new Error("live.json empty");
        lastFeed = data;
        lastError = null;
        return data;
      })
      .catch(function (err) {
        lastError = err && err.message ? err.message : "live.json unavailable";
        return null;
      });
  }

  function isFresh(feed, maxAgeMs) {
    if (!feed || !feed.updatedAt) return false;
    var t = Date.parse(feed.updatedAt);
    if (!isFinite(t)) return false;
    return Date.now() - t <= (maxAgeMs != null ? maxAgeMs : MAX_AGE_MS);
  }

  function usable(feed) {
    return !!(feed && (feed.current || feed.sun || feed.airQuality));
  }

  function roundMeas(value, unit) {
    if (value == null || !isFinite(Number(value))) return null;
    return { value: Number(value), unit: unit };
  }

  function toWeatherPackage(feed) {
    if (!feed || !feed.current) return null;
    var cur = feed.current;
    var hourly = [];
    if (feed.hourly && Array.isArray(feed.hourly.nextHours)) {
      hourly = feed.hourly.nextHours.map(function (h) {
        return {
          time: h.time,
          temperature: roundMeas(h.temperatureF, "°F"),
          precipitation: {
            probability: h.precipProbability,
            intensity: null,
            amount: null
          },
          conditions: { summary: h.conditions || "", icon: "unknown" }
        };
      });
    }
    var daily = [{
      date: (feed.sun && feed.sun.sunrise ? String(feed.sun.sunrise).slice(0, 10) : null),
      temperatureHigh: roundMeas(feed.forecast && feed.forecast.highF, "°F"),
      temperatureLow: roundMeas(feed.forecast && feed.forecast.lowF, "°F"),
      precipitation: {
        probability: feed.forecast && feed.forecast.precipProbability,
        intensity: null,
        amount: null
      },
      sunrise: feed.sun && feed.sun.sunrise,
      sunset: feed.sun && feed.sun.sunset,
      moonPhase: feed.moon && feed.moon.phaseValue,
      conditions: { summary: (feed.current && feed.current.conditions) || "", icon: "unknown" }
    }];

    return {
      meta: {
        provider: "waypoint-live-engine",
        lat: feed.location && feed.location.lat,
        lng: feed.location && feed.location.lng,
        timezone: feed.timezone,
        units: "us",
        isPlaceholder: false,
        attribution: "Waypoint Live Engine",
        fetchedAt: feed.updatedAt,
        liveFeed: true
      },
      current: {
        observedAt: cur.observedAt,
        temperature: roundMeas(cur.temperatureF, "°F"),
        feelsLike: roundMeas(cur.feelsLikeF, "°F"),
        humidity: roundMeas(cur.humidity, "%"),
        wind: {
          speed: roundMeas(cur.windMph, "mph"),
          gust: roundMeas(cur.windGustMph, "mph"),
          direction: null
        },
        cloudCover: roundMeas(cur.cloudCover, "%"),
        uvIndex: roundMeas(cur.uvIndex, "index"),
        precipitation: {
          probability: feed.forecast && feed.forecast.precipProbability,
          intensity: null,
          amount: roundMeas(cur.precipIn, "in")
        },
        conditions: { summary: cur.conditions || "", icon: "unknown" },
        sunrise: feed.sun && feed.sun.sunrise,
        sunset: feed.sun && feed.sun.sunset
      },
      hourly: hourly,
      daily: daily
    };
  }

  function toAirQuality(feed) {
    var aq = feed && feed.airQuality;
    if (!aq || aq.usAqi == null) {
      return { status: "unavailable", aqi: null, usAqi: null, category: null, meta: { provider: "none" } };
    }
    return {
      status: "live",
      aqi: aq.usAqi,
      usAqi: aq.usAqi,
      pm25: aq.pm25,
      category: aq.category,
      summary: "AQI " + aq.usAqi + (aq.category ? " — " + aq.category : ""),
      meta: {
        provider: "open-meteo-air-quality",
        attribution: "Open-Meteo Air Quality via Live Engine",
        fetchedAt: feed.updatedAt
      }
    };
  }

  function toDaylight(feed) {
    if (!feed || !feed.sun) return null;
    var DU = global.WDS && global.WDS.daylightUtils;
    var weatherPkg = toWeatherPackage(feed);
    if (DU && DU.fromWeatherPackage && weatherPkg) {
      return DU.fromWeatherPackage(weatherPkg, {});
    }
    return {
      status: "live",
      sunrise: feed.sun.sunrise,
      sunset: feed.sun.sunset,
      sunriseFormatted: feed.sun.sunriseFormatted,
      sunsetFormatted: feed.sun.sunsetFormatted,
      moonPhase: feed.moon && feed.moon.phase,
      moonIllumination: feed.moon && feed.moon.illumination,
      timezone: feed.timezone
    };
  }

  function toUsgsWater(feed) {
    var river = feed.modules && feed.modules.river_gauges && feed.modules.river_gauges.data;
    if (!river || river.status === "unavailable" || river.status === "no-nearby" || !river.nearest) {
      if (river && river.status === "no-nearby") {
        return {
          nearest: null,
          siteCount: 0,
          source: "USGS Water Services",
          provider: "usgs-iv",
          trust: "Unavailable",
          status: "no-nearby",
          fallbackReason: river.fallbackReason || "no-gauge-within-50-miles",
          disclaimer: "No monitored USGS gauge within 50 miles",
          fetchedAt: feed.updatedAt
        };
      }
      return null;
    }
    return {
      nearest: river.nearest,
      siteCount: river.siteCount,
      source: "USGS Water Services",
      provider: "usgs-iv",
      trust: "Live",
      disclaimer: river.disclaimer || "Provisional USGS data — subject to revision",
      fetchedAt: feed.updatedAt
    };
  }

  function toAlerts(feed) {
    var alerts = feed.modules && feed.modules.alerts && feed.modules.alerts.data;
    if (!alerts || alerts.status === "unavailable") {
      return { status: "unavailable", items: [], count: 0 };
    }
    return {
      status: "live",
      count: alerts.count != null ? alerts.count : (alerts.items || []).length,
      items: alerts.items || [],
      meta: { provider: "nws", attribution: "National Weather Service via Live Engine", fetchedAt: feed.updatedAt }
    };
  }

  function toEbird(feed) {
    var birds = feed.modules && feed.modules.ebird && feed.modules.ebird.data;
    if (!birds) {
      return { status: "unavailable", summary: "Regional estimate only — bird feed unavailable", observations: [], count: 0 };
    }
    return {
      status: birds.status || "unavailable",
      summary: birds.summary || "Regional estimate only — bird feed unavailable",
      observations: Array.isArray(birds.observations) ? birds.observations : [],
      count: birds.count != null ? birds.count : (Array.isArray(birds.observations) ? birds.observations.length : 0),
      provider: birds.provider || "eBird"
    };
  }

  function toPlatform(feed, loc) {
    throw new Error(
      "liveEngine.toPlatform is disabled for user-facing surfaces. " +
      "Dashboard and kiosk must use WDS.outdoorIntelligence.get() at user coordinates."
    );
  }

  function toPlatformEngineDiagnostics(feed, loc) {
    if (!usable(feed)) return null;
    var weatherRef = toWeatherPackage(feed);
    var aq = toAirQuality(feed);
    var daylight = toDaylight(feed);
    var usgs = toUsgsWater(feed);
    var alertsPkg = toAlerts(feed);
    var ebirdPkg = toEbird(feed);
    var locInfo = feed.location || {};
    var platform = {
      meta: {
        hydratedAt: feed.updatedAt,
        contentMode: "live-engine",
        liveFeed: true,
        liveUpdatedAt: feed.updatedAt,
        sources: {
          weather: weatherRef ? "waypoint-live-engine" : "none",
          airQuality: aq.status === "live" ? "open-meteo-air-quality" : "none",
          liveEngine: "waypoint-live-engine",
          usgsWater: usgs ? "usgs-iv" : "none",
          ebird: ebirdPkg.status === "live" ? "ebird" : "none"
        },
        providerTelemetry: (feed.meta && feed.meta.failures || []).map(function (f) {
          return { provider: f.source, status: "error", message: f.error, at: feed.updatedAt };
        }),
        blockStatus: {
          weather: weatherRef ? "live" : "unavailable",
          alerts: alertsPkg.status === "live" ? "live" : "unavailable",
          airQuality: aq.status === "live" ? "live" : "unavailable",
          elevation: "unavailable",
          usgsWater: usgs ? "live" : "unavailable",
          ebird: ebirdPkg.status === "live" ? "live" : "unavailable"
        },
        liveSources: feed.meta && feed.meta.sources || [],
        liveFailures: feed.meta && feed.meta.failures || []
      },
      location: {
        latitude: locInfo.lat != null ? locInfo.lat : (loc && loc.lat),
        longitude: locInfo.lng != null ? locInfo.lng : (loc && loc.lng),
        source: "live-engine"
      },
      region: {
        id: locInfo.id || (loc && loc.regionId),
        label: locInfo.label || locInfo.name || (loc && loc.name)
      },
      timezone: feed.timezone,
      weather: weatherRef
        ? {
            status: "live",
            summary: feed.forecast && feed.forecast.summary,
            conditions: feed.current && feed.current.conditions,
            high: feed.forecast && feed.forecast.highF != null ? feed.forecast.highF + "°F" : null,
            low: feed.forecast && feed.forecast.lowF != null ? feed.forecast.lowF + "°F" : null,
            precipitationProbability: feed.forecast && feed.forecast.precipProbability,
            source: "Waypoint Live Engine",
            isLive: true
          }
        : { status: "unavailable" },
      daylight: daylight,
      airQuality: aq,
      alerts: alertsPkg,
      usgsWater: usgs,
      ebird: ebirdPkg,
      weatherRef: weatherRef,
      liveFeed: feed
    };
    return platform;
  }

  function getLast() {
    return lastFeed;
  }

  function getLastError() {
    return lastError;
  }

  global.WDS = global.WDS || {};
  global.WDS.liveEngine = {
    LIVE_URL: LIVE_URL,
    HEALTH_URL: HEALTH_URL,
    MAX_AGE_MS: MAX_AGE_MS,
    fetchLive: fetchLive,
    fetchHealth: fetchHealth,
    fetchEngineContext: fetchEngineContext,
    isFresh: isFresh,
    usable: usable,
    toEngineContext: toEngineContext,
    mergeEngineContext: mergeEngineContext,
    buildModuleSources: buildModuleSources,
    toPlatform: toPlatform,
    toPlatformEngineDiagnostics: toPlatformEngineDiagnostics,
    toWeatherPackage: toWeatherPackage,
    getLast: getLast,
    getLastHealth: function () { return lastHealth; },
    getLastError: getLastError
  };
})(window);
