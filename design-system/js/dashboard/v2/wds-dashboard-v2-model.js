/**
 * Dashboard V2 — normalized contracts from OIP / location context.
 * Validates at boundaries; never publishes invalid place names.
 */
(function (global) {
  "use strict";

  var INVALID_LABEL_RE =
    /^(null|undefined|unknown)(\s*,\s*(null|undefined|unknown))?$/i;
  var BANNED_COORD_LABEL_RE = /^0\s*,\s*0$/;

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isValidCoords(lat, lng) {
    lat = Number(lat);
    lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return false;
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    var Loc = global.WDS && global.WDS.location;
    if (Loc && Loc.isLegacyDefault && Loc.isLegacyDefault({ lat: lat, lng: lng })) return false;
    if (Loc && Loc.isEnginePublishPoint && Loc.isEnginePublishPoint(lat, lng)) return false;
    return true;
  }

  function sanitizeLabel(raw) {
    if (raw == null) return "";
    var s = String(raw).replace(/\s+/g, " ").trim();
    if (!s) return "";
    if (INVALID_LABEL_RE.test(s)) return "";
    if (BANNED_COORD_LABEL_RE.test(s)) return "";
    if (/null,\s*ny/i.test(s)) return "";
    return s;
  }

  function sourceLabel(source) {
    var map = {
      browser: "Current device location",
      geo: "Current device location",
      manual: "Manually selected location",
      saved: "Saved location",
      ip: "Approximate location (IP)",
      cache: "Cached location",
      fallback: "Default location",
      pending: "Resolving location…",
      unavailable: "Location unavailable"
    };
    return map[source] || (source ? String(source) : "Location");
  }

  function formatLocation(loc) {
    loc = loc || {};
    var parts = [];
    var city = sanitizeLabel(loc.city);
    var county = sanitizeLabel(loc.county);
    var state = sanitizeLabel(loc.stateCode || loc.state);
    if (city) parts.push(city);
    if (county && county !== city) parts.push(county);
    if (state) parts.push(state);
    var joined = parts.join(", ");
    if (joined) return joined;
    var title = sanitizeLabel(loc.displayTitle || loc.placeLabel || loc.name);
    if (title && !/finding your location/i.test(title)) return title;
    if (loc.useNationalFallback) return "United States overview";
    if (isValidCoords(loc.lat, loc.lng)) {
      return (
        "Near " +
        Math.abs(loc.lat).toFixed(2) +
        "°" +
        (loc.lat >= 0 ? "N" : "S") +
        ", " +
        Math.abs(loc.lng).toFixed(2) +
        "°" +
        (loc.lng >= 0 ? "E" : "W")
      );
    }
    return "Approximate location";
  }

  function seasonLabel(lat) {
    var UN = global.WDS && global.WDS.usNational;
    if (UN && UN.seasonLabel) return UN.seasonLabel(lat);
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  }

  function normalizeWeather(platform) {
    var wx = platform && platform.weatherRef;
    var cur = (wx && wx.current) || {};
    var hourly = (wx && wx.hourly) || [];
    var daily = (wx && wx.daily) || [];
    var live = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    return {
      live: live,
      current: {
        tempF: num(cur.temperature),
        feelsF: num(cur.feelsLike) != null ? num(cur.feelsLike) : num(cur.temperature),
        humidity: num(cur.humidity),
        windMph: cur.wind ? num(cur.wind.speed) : null,
        windGust: cur.wind ? num(cur.wind.gust) : null,
        cloudPct: num(cur.cloudCover),
        visibilityMi: num(cur.visibility),
        uv: num(cur.uvIndex),
        precipProb: cur.precipitation ? num(cur.precipitation.probability) : null,
        precipAmt: cur.precipitation ? num(cur.precipitation.amount) : null,
        conditions: (cur.conditions && cur.conditions.summary) || ""
      },
      hourly: hourly,
      daily: daily,
      meta: wx && wx.meta ? wx.meta : {}
    };
  }

  function normalizeRivers(platform) {
    var water = platform && (platform.water || platform.usgsWater);
    if (!water || water.status !== "live" || !water.sites || !water.sites.length) {
      return { live: false, sites: [] };
    }
    return {
      live: true,
      sites: water.sites.slice(0, 6).map(function (s) {
        return {
          name: s.name || s.siteName || "Gauge",
          distanceMi: num(s.distanceMi != null ? s.distanceMi : s.distance),
          stageFt: num(s.gageHeight != null ? s.gageHeight : s.stage),
          flowCfs: num(s.streamflow != null ? s.streamflow : s.discharge),
          trend: s.trend || s.interpretation || null,
          observedAt: s.observedAt || s.retrievedAt || null,
          stale: !!s.stale,
          source: "USGS"
        };
      })
    };
  }

  function normalizeAlerts(platform) {
    var alerts = platform && platform.alerts;
    var items = (alerts && alerts.items) || [];
    return {
      status: alerts && alerts.status ? alerts.status : "unknown",
      items: items.map(function (a) {
        return {
          event: a.event || "Alert",
          headline: a.headline || "",
          severity: a.severity || "",
          effective: a.effective || a.onset || null,
          expires: a.expires || a.ends || null,
          area: a.areaDesc || a.area || "",
          summary: a.description ? String(a.description).slice(0, 280) : "",
          url: a.url || a.uri || null,
          source: "NWS"
        };
      })
    };
  }

  function normalizeAir(platform) {
    var aq = platform && platform.airQuality;
    if (!aq) return { live: false };
    var aqi = aq.usAqi != null ? aq.usAqi : aq.aqi;
    return {
      live: aq.status === "live" || aqi != null,
      aqi: num(aqi),
      category: aq.category || null,
      pm25: aq.pm25 != null ? num(aq.pm25) : null
    };
  }

  function normalizeDaylight(platform) {
    var dl = (platform && platform.daylight) || {};
    return {
      sunrise: dl.sunriseFormatted || dl.sunrise || null,
      sunset: dl.sunsetFormatted || dl.sunset || null,
      goldenHour: dl.goldenHour || null,
      blueHour: dl.blueHour || null,
      civilTwilightEnd: dl.civilTwilightEnd || null,
      dayLengthMin: num(dl.dayLengthMinutes)
    };
  }

  function normalizeMoon(platform) {
    var m = (platform && platform.moon) || (platform && platform.calendar && platform.calendar.moon) || {};
    return {
      phase: m.phaseLabel || m.phase || null,
      illumination: num(m.illumination != null ? m.illumination : m.illuminationPct),
      rise: m.moonrise || m.rise || null,
      set: m.moonset || m.set || null
    };
  }

  function normalizePhotography(platform, weather) {
    var PC = global.WDS && global.WDS.photographyConditions;
    if (PC && PC.fromPlatform) {
      var p = PC.fromPlatform(platform);
      if (p) {
        return {
          live: p.status !== "unavailable",
          score: p.score,
          summary: p.summary || "",
          detail: p.detail || "",
          level: p.status || p.level || "unknown"
        };
      }
    }
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var wx = platform && platform.weatherRef;
    var r = OW && OW.photographyConditions && wx ? OW.photographyConditions(wx, platform) : null;
    return r
      ? { live: true, summary: r.summary, detail: r.detail, level: r.level }
      : { live: false, summary: "", detail: "", level: "unknown" };
  }

  function normalizeProviderMeta(platform) {
    var meta = (platform && platform.meta) || {};
    var Rel = global.WDS && global.WDS.dashboardReliability;
    var trust = Rel && Rel.classifyPackageTrust ? Rel.classifyPackageTrust(platform) : "unknown";
    return {
      hydratedAt: meta.hydratedAt || null,
      fromCache: !!meta.fromCache,
      connectivity: meta.connectivity || "unknown",
      trust: trust,
      blockStatus: meta.blockStatus || {},
      moduleSources: meta.moduleSources || {}
    };
  }

  function normalizeFromContext(ctx) {
    ctx = ctx || {};
    var loc = ctx.location || {};
    var platform = ctx.platform || {};
    var lat = loc.lat != null ? Number(loc.lat) : platform.location && platform.location.latitude;
    var lng = loc.lng != null ? Number(loc.lng) : platform.location && platform.location.longitude;
    var coordsOk = isValidCoords(lat, lng);
    return {
      schemaVersion: "2.0.0",
      builtAt: new Date().toISOString(),
      location: {
        label: formatLocation(loc),
        source: loc.source || (platform.location && platform.location.source) || "pending",
        sourceLabel: sourceLabel(loc.source || (platform.location && platform.location.source)),
        lat: coordsOk ? lat : null,
        lng: coordsOk ? lng : null,
        coordsOk: coordsOk,
        timezone: loc.timezone || platform.timezone || null
      },
      season: seasonLabel(coordsOk ? lat : null),
      weather: normalizeWeather(platform),
      air: normalizeAir(platform),
      daylight: normalizeDaylight(platform),
      moon: normalizeMoon(platform),
      rivers: normalizeRivers(platform),
      alerts: normalizeAlerts(platform),
      photography: normalizePhotography(platform),
      rainfall: platform.rainfall || null,
      provider: normalizeProviderMeta(platform),
      platform: platform
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Model = {
    num: num,
    escapeHtml: escapeHtml,
    isValidCoords: isValidCoords,
    formatLocation: formatLocation,
    sourceLabel: sourceLabel,
    sanitizeLabel: sanitizeLabel,
    normalizeFromContext: normalizeFromContext
  };
})(window);
