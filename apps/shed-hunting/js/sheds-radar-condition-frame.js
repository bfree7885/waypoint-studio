/**
 * Sheds RADAR P2 — RadarConditionFrame adapter.
 *
 * Reuses existing Weather / Condition Snapshot derivation.
 * Does NOT fetch Open-Meteo. Does NOT invent missing snow/temp.
 *
 * Spec: docs/sheds/SHEDS-RADAR-P2.md
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;
  /** Mid of the 60–90 min inspection recommendation. */
  var FRESH_MS = 75 * 60 * 1000;
  var VERSION = "radar-condition-frame-1.0";

  function finiteNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  function clipStr(v, max) {
    if (v == null) return null;
    var s = String(v).replace(/^\s+|\s+$/g, "");
    if (!s) return null;
    return s.slice(0, max || 240);
  }

  function dayOfYearFromDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    var start = Date.UTC(d.getUTCFullYear(), 0, 1);
    return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000) + 1;
  }

  function localDateFromDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    var y = d.getFullYear();
    var mo = d.getMonth() + 1;
    var day = d.getDate();
    return y + "-" + String(mo).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  function emptyFrame(opts) {
    opts = opts || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      version: VERSION,
      fetchedAt: opts.fetchedAt || null,
      sourceTimestamp: opts.sourceTimestamp || null,
      validAt: opts.validAt || null,
      lat: finiteNum(opts.lat) ? opts.lat : null,
      lon: finiteNum(opts.lon) ? opts.lon : null,
      anchorSource: clipStr(opts.anchorSource, 40),
      freshness: opts.freshness || "unavailable",
      limitations: Array.isArray(opts.limitations) ? opts.limitations.slice() : [],
      tempC: null,
      dailyMinC: null,
      dailyMaxC: null,
      snowDepthKnown: false,
      snowDepthM: null,
      snowDepthSource: null,
      precipNowMm: null,
      precipMm24h: null,
      snowfallSumCm: null,
      freezeThawStatus: null,
      freezeThaw: {
        nightMinC: null,
        dayMaxC: null,
        source: null,
        detail: null
      },
      tempTrendStatus: null,
      tempTrend: {
        deltaC: null,
        lookbackHours: null,
        detail: null
      },
      snowCoverStatus: null,
      seasonCategory: null,
      localDate: null,
      dayOfYear: null
    };
  }

  function resolveFreshness(opts) {
    opts = opts || {};
    if (opts.offline) return "offline";
    if (!opts.fetchedAt && !opts.sourceTimestamp) return "unavailable";
    var stamp = opts.fetchedAt || opts.sourceTimestamp;
    var t = new Date(stamp).getTime();
    if (!isFinite(t)) return "unavailable";
    var now = opts.now instanceof Date ? opts.now.getTime() : Date.now();
    if (!isFinite(now)) now = Date.now();
    if (now - t > FRESH_MS) return "stale";
    return "fresh";
  }

  function seasonFromTiming(lat, lng, when) {
    var Timing = global.WaypointShedsTiming;
    if (!Timing || typeof Timing.evaluate !== "function") return null;
    try {
      var timing = Timing.evaluate({
        lat: lat,
        lng: lng,
        date: when instanceof Date ? when : new Date(when || Date.now())
      });
      if (!timing) return null;
      var Hunt = global.WaypointShedsTodayHunt;
      if (Hunt && typeof Hunt.seasonCategory === "function") {
        return Hunt.seasonCategory(timing);
      }
      return timing.season || timing.phaseId || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Build frame from existing Weather.parseForecast package (no network).
   */
  function fromWeatherPackage(wx, opts) {
    opts = opts || {};
    var limitations = [];
    var offline = !!opts.offline;
    if (!wx || wx.ready === false) {
      var bad = emptyFrame({
        lat: opts.lat,
        lon: opts.lon,
        anchorSource: opts.anchorSource,
        freshness: offline ? "offline" : "unavailable",
        limitations: [
          offline
            ? "Weather unavailable offline — showing landscape foundation only."
            : "Current conditions unavailable — showing landscape foundation only."
        ]
      });
      return bad;
    }

    var fetchedAt = wx.fetchedAt || opts.fetchedAt || null;
    var freshness = resolveFreshness({
      fetchedAt: fetchedAt,
      sourceTimestamp: fetchedAt,
      now: opts.now,
      offline: offline
    });
    if (offline) freshness = "offline";

    var ft = wx.freezeThaw || {};
    var trend = wx.tempTrend || {};
    var snow = wx.snowCover || {};

    if (!wx.snowDepthKnown) {
      limitations.push(
        "Snow depth is unavailable from the weather point — missing depth is not clear ground."
      );
    } else {
      limitations.push(
        "Snow conditions are based on point weather data for this map area, not a snow raster."
      );
    }
    if (!ft.status || ft.status === "insufficient") {
      limitations.push("Freeze/thaw status could not be derived from available temperatures.");
    }
    if (!trend.status || trend.status === "unknown") {
      limitations.push("Temperature trend is unknown from the hourly sample.");
    }

    var when = opts.now instanceof Date ? opts.now : fetchedAt ? new Date(fetchedAt) : new Date();
    var season = opts.seasonCategory || seasonFromTiming(opts.lat, opts.lon, when);

    return {
      schemaVersion: SCHEMA_VERSION,
      version: VERSION,
      fetchedAt: fetchedAt,
      sourceTimestamp: fetchedAt,
      validAt: when && !isNaN(when.getTime()) ? when.toISOString() : fetchedAt,
      lat: finiteNum(opts.lat) ? Number(opts.lat) : null,
      lon: finiteNum(opts.lon) ? Number(opts.lon) : finiteNum(opts.lng) ? Number(opts.lng) : null,
      anchorSource: clipStr(opts.anchorSource, 40),
      freshness: freshness,
      limitations: limitations,
      tempC: finiteNum(wx.tempC) ? wx.tempC : null,
      dailyMinC: finiteNum(wx.dailyMinC) ? wx.dailyMinC : null,
      dailyMaxC: finiteNum(wx.dailyMaxC) ? wx.dailyMaxC : null,
      snowDepthKnown: !!wx.snowDepthKnown,
      snowDepthM: wx.snowDepthKnown && finiteNum(wx.snowDepthM) ? wx.snowDepthM : null,
      snowDepthSource: clipStr(wx.snowDepthSource, 40),
      precipNowMm: finiteNum(wx.precipNowMm) ? wx.precipNowMm : null,
      precipMm24h: finiteNum(wx.precipMm24h) ? wx.precipMm24h : null,
      snowfallSumCm: finiteNum(wx.snowfallSumCm)
        ? wx.snowfallSumCm
        : finiteNum(wx.snowMm)
          ? wx.snowMm
          : null,
      freezeThawStatus: ft.status || null,
      freezeThaw: {
        nightMinC: finiteNum(ft.nightMinC) ? ft.nightMinC : null,
        dayMaxC: finiteNum(ft.dayMaxC) ? ft.dayMaxC : null,
        source: clipStr(ft.source, 40),
        detail: clipStr(ft.detail, 320)
      },
      tempTrendStatus: trend.status || null,
      tempTrend: {
        deltaC: finiteNum(trend.deltaC) ? trend.deltaC : null,
        lookbackHours: finiteNum(trend.lookbackHours) ? trend.lookbackHours : null,
        detail: clipStr(trend.detail, 320)
      },
      snowCoverStatus: snow.status || (wx.snowDepthKnown ? "unknown" : "unavailable"),
      seasonCategory: season ? clipStr(season, 40) : null,
      localDate: localDateFromDate(when),
      dayOfYear: dayOfYearFromDate(when)
    };
  }

  /**
   * Optional path from Condition Snapshot (facts + derived already normalized).
   */
  function fromConditionSnapshot(snap, opts) {
    opts = opts || {};
    if (!snap || typeof snap !== "object") {
      return fromWeatherPackage(null, opts);
    }
    var facts = snap.facts || {};
    var derived = snap.derived || {};
    var ft = derived.freezeThaw || {};
    var snow = derived.snowCover || {};
    var acq = snap.acquisition || {};
    var loc = snap.location || {};
    var wxLike = {
      ready: acq.status === "ok",
      fetchedAt: acq.fetchedAt || snap.validAt || snap.createdAt || null,
      tempC: facts.airTemperatureC,
      dailyMinC: facts.recentMinTemperatureC,
      dailyMaxC: facts.recentMaxTemperatureC,
      precipNowMm: facts.precipitationNowMm,
      precipMm24h: facts.precipitationMm24h,
      snowfallSumCm: facts.snowfallSumCm,
      snowDepthKnown: !!facts.snowDepthKnown,
      snowDepthM: facts.snowDepthM,
      snowDepthSource: "condition-snapshot",
      snowCover: {
        status: snow.status || (facts.snowDepthKnown ? "unknown" : "unavailable")
      },
      freezeThaw: {
        status: ft.classification || "insufficient",
        nightMinC: ft.nightMinC,
        dayMaxC: ft.dayMaxC,
        source: ft.evidenceSource,
        detail: null
      },
      tempTrend: {
        status: facts.temperatureTrendStatus || "unknown",
        deltaC: facts.temperatureTrendDeltaC,
        lookbackHours: facts.temperatureTrendLookbackHours,
        detail: null
      }
    };
    return fromWeatherPackage(wxLike, {
      lat: opts.lat != null ? opts.lat : loc.lat,
      lon: opts.lon != null ? opts.lon : loc.lng,
      lng: opts.lng != null ? opts.lng : loc.lng,
      anchorSource: opts.anchorSource || "condition-snapshot",
      now: opts.now,
      offline: opts.offline || acq.status === "offline",
      seasonCategory:
        opts.seasonCategory ||
        (snap.season && (snap.season.phaseId || snap.season.phaseLabel)) ||
        null
    });
  }

  /**
   * Conditions object for SearchPriorityToday.normalizeConditions / evaluateCell.
   */
  function toModelConditions(frame) {
    if (!frame) return null;
    return {
      freezeThawStatus: frame.freezeThawStatus || null,
      tempTrendStatus: frame.tempTrendStatus || null,
      snowCoverStatus: frame.snowCoverStatus || null,
      seasonCategory: frame.seasonCategory || null
    };
  }

  /**
   * Fresh frame with at least one actionable derived condition fact.
   * Season alone does not drive TODAY intensity.
   */
  function canDriveTodaySurface(frame) {
    if (!frame || frame.freshness !== "fresh") return false;
    var ft = frame.freezeThawStatus;
    var trend = frame.tempTrendStatus;
    var snow = frame.snowCoverStatus;
    var ftOk = ft && ft !== "insufficient" && ft !== "unknown";
    var trendOk = trend && trend !== "unknown";
    var snowOk = snow && snow !== "unavailable" && snow !== "unknown";
    return !!(ftOk || trendOk || snowOk);
  }

  function statusMessage(frame, surfaceMode) {
    surfaceMode = surfaceMode || "today";
    if (surfaceMode === "landscape") {
      return "Landscape — static geography only (no current-condition modifiers).";
    }
    if (!frame) return "Showing landscape — current conditions unavailable.";
    if (frame.freshness === "offline") {
      return "Showing landscape — offline; current conditions unavailable.";
    }
    if (frame.freshness === "stale") {
      return "Showing landscape — current conditions are stale.";
    }
    if (frame.freshness === "unavailable" || !canDriveTodaySurface(frame)) {
      return "Showing landscape — current conditions unavailable.";
    }
    var stamp = frame.sourceTimestamp || frame.fetchedAt;
    var clock = stamp ? String(stamp) : "unknown time";
    return "Today — relative search interest with conditions as of " + clock + ".";
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    FRESH_MS: FRESH_MS,
    VERSION: VERSION,
    emptyFrame: emptyFrame,
    resolveFreshness: resolveFreshness,
    fromWeatherPackage: fromWeatherPackage,
    fromConditionSnapshot: fromConditionSnapshot,
    toModelConditions: toModelConditions,
    canDriveTodaySurface: canDriveTodaySurface,
    statusMessage: statusMessage
  };

  global.WaypointShedsRadarConditionFrame = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
