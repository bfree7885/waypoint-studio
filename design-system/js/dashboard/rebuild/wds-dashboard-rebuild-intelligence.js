/**
 * Dashboard Rebuild RC3 — Outdoor Intelligence Engine (Sprint 5 Personal Workspace).
 * Pure, deterministic interpretation of OIP platform data for Today Outside.
 * Never fabricates live numbers; missing inputs lower confidence and redistribute weights.
 * Discovery reuses the same generate() pack — no second network pass.
 * Interests reorder emphasis only — never hide alerts / public safety.
 *
 * Algorithm authority:
 *   docs/rebuild-2026/dashboard-rc3-sprint1-owner-review.md
 *   docs/rebuild-2026/dashboard-rc3-sprint2-owner-review.md
 *   docs/rebuild-2026/dashboard-rc3-sprint3-owner-review.md
 *   docs/rebuild-2026/dashboard-rc3-sprint4-owner-review.md
 *   docs/rebuild-2026/dashboard-rc3-sprint5-owner-review.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.4.0-rc3-s5";
  var LEVELS = ["Exceptional", "Excellent", "Good", "Mixed", "Challenging"];
  var CONFIDENCE = ["High", "Moderate", "Limited"];

  /**
   * Outdoor Score factor weights (sum = 100 when all present).
   * Missing factors are dropped and remaining weights renormalized.
   * Sprint 2: weights unchanged; factor curves recalibrated (see owner review).
   */
  var SCORE_WEIGHTS = {
    temperature: 18,
    precipitation: 16,
    wind: 10,
    humidity: 6,
    clouds: 6,
    uv: 10,
    aqi: 14,
    alerts: 12,
    rivers: 8
  };

  var FACTOR_LABELS = {
    temperature: "Air temperature",
    precipitation: "Precipitation",
    wind: "Wind",
    humidity: "Humidity",
    clouds: "Cloud cover",
    uv: "UV index",
    aqi: "Air quality",
    alerts: "Weather alerts",
    rivers: "Nearby rivers"
  };

  var ACTIVITY_IDS = [
    "photography",
    "birding",
    "wildlife",
    "hiking",
    "trailRunning",
    "fishing",
    "gardening",
    "camping",
    "astronomy",
    "generalOutdoor"
  ];

  var ACTIVITY_LABELS = {
    photography: "Photography",
    birding: "Birding",
    wildlife: "Wildlife",
    hiking: "Hiking",
    trailRunning: "Trail Running",
    fishing: "Fishing",
    gardening: "Gardening",
    camping: "Camping",
    astronomy: "Astronomy",
    generalOutdoor: "General Outdoor Time"
  };

  /** Compact decorative marks (not emoji) — paired with aria-hidden in UI. */
  var ACTIVITY_ICONS = {
    photography: "◇",
    birding: "◠",
    wildlife: "◎",
    hiking: "△",
    trailRunning: "▹",
    fishing: "≀",
    gardening: "∗",
    camping: "⌂",
    astronomy: "✦",
    generalOutdoor: "○"
  };

  var WINDOW_IDS = ["hiking", "photography", "wildlife", "stargazing"];

  var ACTIVITY_WINDOW_MAP = {
    hiking: "hiking",
    trailRunning: "hiking",
    photography: "photography",
    birding: "wildlife",
    wildlife: "wildlife",
    astronomy: "stargazing",
    camping: "hiking",
    gardening: "hiking",
    fishing: "hiking",
    generalOutdoor: "hiking"
  };

  /** Personal Workspace interest profiles (presentation priority only). */
  var INTEREST_IDS = [
    "photography",
    "hiking",
    "wildlife",
    "birding",
    "astronomy",
    "gardening",
    "fishing",
    "rivers",
    "weather",
    "general"
  ];

  var INTEREST_LABELS = {
    photography: "Photography",
    hiking: "Hiking",
    wildlife: "Wildlife",
    birding: "Birding",
    astronomy: "Astronomy",
    gardening: "Gardening",
    fishing: "Fishing",
    rivers: "Rivers & Water",
    weather: "Weather",
    general: "General Outdoors"
  };

  var DEFAULT_INTERESTS = ["general"];

  /** Interest → activity ids that should rise when that interest is enabled. */
  var INTEREST_ACTIVITY_MAP = {
    photography: ["photography"],
    hiking: ["hiking", "trailRunning", "camping"],
    wildlife: ["wildlife"],
    birding: ["birding"],
    astronomy: ["astronomy"],
    gardening: ["gardening"],
    fishing: ["fishing"],
    rivers: ["fishing"],
    weather: ["generalOutdoor"],
    general: ["generalOutdoor", "hiking", "photography", "wildlife"]
  };

  /** Interest → discovery card ids to emphasize (still never invent cards). */
  var INTEREST_DISCOVERY_MAP = {
    photography: ["photography", "sky"],
    hiking: ["nature", "seasonal", "sky"],
    wildlife: ["nature", "seasonal", "water"],
    birding: ["nature", "seasonal"],
    astronomy: ["astronomy", "sky"],
    gardening: ["seasonal", "nature"],
    fishing: ["water", "nature"],
    rivers: ["water", "nature"],
    weather: ["sky", "seasonal"],
    general: []
  };

  /** Interest → window ids. */
  var INTEREST_WINDOW_MAP = {
    photography: ["photography"],
    hiking: ["hiking"],
    wildlife: ["wildlife"],
    birding: ["wildlife"],
    astronomy: ["stargazing"],
    gardening: ["hiking"],
    fishing: ["hiking"],
    rivers: ["hiking"],
    weather: ["hiking", "photography"],
    general: []
  };

  /** Educational topic preference by interest. */
  var INTEREST_EDU_MAP = {
    photography: ["clouds", "uv", "moon"],
    hiking: ["humidity", "uv", "wind"],
    wildlife: ["wind", "aqi", "rivers"],
    birding: ["wind", "humidity"],
    astronomy: ["moon", "clouds"],
    gardening: ["humidity", "uv", "aqi"],
    fishing: ["rivers", "wind"],
    rivers: ["rivers", "humidity"],
    weather: ["clouds", "uv", "wind", "aqi"],
    general: []
  };

  var BANNED =
    /\bperfect\b|\bamazing\b|\bepic\b|\bmust[- ]see\b|don['’]t miss|you should definitely|homework|assignment|go now|do this\b/i;

  /** Minimum hourly rows before clock-range precision is offered. */
  var HOURLY_PRECISION_MIN = 6;
  var HOURLY_HIGH_CONF_MIN = 12;

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function clamp(n, lo, hi) {
    if (n == null || !isFinite(n)) return null;
    return Math.max(lo, Math.min(hi, n));
  }

  function round(n) {
    return Math.round(n);
  }

  function calm(text) {
    var s = String(text || "").replace(/\s+/g, " ").trim();
    if (!s || BANNED.test(s)) return "";
    return s;
  }

  /**
   * Score bands (Sprint 2):
   * 95–100 Exceptional · 85–94 Excellent · 70–84 Good · 55–69 Mixed · <55 Challenging
   */
  function levelFromScore(score) {
    if (score == null) return "Mixed";
    if (score >= 95) return "Exceptional";
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Mixed";
    return "Challenging";
  }

  function confidenceLabel(key) {
    if (key === "high") return "High";
    if (key === "moderate") return "Moderate";
    return "Limited";
  }

  function hourBand(hr) {
    if (hr == null || !isFinite(hr)) return null;
    if (hr < 8) return "Early Morning";
    if (hr < 11) return "Late Morning";
    if (hr < 12) return "Before Noon";
    if (hr < 14) return "Early Afternoon";
    if (hr < 16) return "Afternoon";
    if (hr < 17) return "Late Afternoon";
    if (hr < 19) return "Near Sunset";
    if (hr < 21) return "Near Sunset";
    return "This Evening";
  }

  function formatClock(date) {
    if (!date || isNaN(date.getTime())) return null;
    var h = date.getHours();
    var m = date.getMinutes();
    var suffix = h >= 12 ? "PM" : "AM";
    var hr12 = h % 12;
    if (hr12 === 0) hr12 = 12;
    if (m === 0) return String(hr12) + " " + suffix;
    return String(hr12) + ":" + (m < 10 ? "0" : "") + m + " " + suffix;
  }

  function formatClockRange(start, end) {
    var a = formatClock(start);
    var b = formatClock(end);
    if (!a || !b) return null;
    var samePeriod = /\b(AM|PM)$/i.test(a) && a.slice(-2) === b.slice(-2);
    if (samePeriod) {
      a = a.replace(/\s*(AM|PM)$/i, "");
    }
    return a + "–" + b;
  }

  function parseClockHour(label) {
    if (!label) return null;
    var m = String(label).match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
    if (!m) return null;
    var hr = Number(m[1]);
    var isPm = /pm/i.test(m[3]);
    if (hr === 12) hr = isPm ? 12 : 0;
    else if (isPm) hr += 12;
    return hr;
  }

  function rangeStart(range) {
    if (!range) return null;
    var parts = String(range).split(/\s*[–—-]\s*/);
    return parts[0] ? parts[0].trim() : null;
  }

  /**
   * Extract normalized signals from an OIP platform package.
   * Absent fields stay null — never invent.
   */
  function extractSignals(platform, now) {
    now = now || new Date();
    var wx = platform && platform.weatherRef;
    var cur = (wx && wx.current) || {};
    var daily0 = wx && wx.daily && wx.daily[0] ? wx.daily[0] : null;
    var dl = (platform && platform.daylight) || {};
    var aq = (platform && platform.airQuality) || null;
    var alerts = platform && platform.alerts;
    var rivers = platform && (platform.rivers || platform.water || platform.usgs);

    var weatherLive = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    var aqiLive = !!(aq && aq.status === "live");
    var alertItems =
      (alerts && (alerts.items || alerts.features || alerts.alerts)) || [];
    if (!Array.isArray(alertItems)) alertItems = [];

    var riverSites =
      (rivers && (rivers.sites || rivers.gauges || rivers.items)) || [];
    if (!Array.isArray(riverSites)) riverSites = [];

    var uv =
      num(cur.uvIndex) != null
        ? num(cur.uvIndex)
        : num(cur.uv) != null
          ? num(cur.uv)
          : daily0
            ? num(daily0.uvIndex)
            : null;

    var aqiVal = null;
    if (aqiLive) {
      aqiVal = aq.usAqi != null ? num(aq.usAqi) : num(aq.aqi);
    }

    var riverTrend = null;
    var riverNote = null;
    if (riverSites.length) {
      var site = riverSites[0];
      riverTrend = String(site.trend || site.status || "").toLowerCase() || null;
      if (site.name) riverNote = String(site.name);
      else if (site.siteName) riverNote = String(site.siteName);
    }

    var observedAt =
      (wx && wx.meta && (wx.meta.observedAt || wx.meta.fetchedAt || wx.meta.updatedAt)) ||
      (platform && platform.meta && platform.meta.fetchedAt) ||
      null;
    var ageHours = null;
    if (observedAt) {
      var obsMs = new Date(observedAt).getTime();
      if (!isNaN(obsMs)) ageHours = (now.getTime() - obsMs) / 3600000;
    }

    return {
      now: now,
      weatherLive: weatherLive,
      fromCache: !!(platform && platform.meta && platform.meta.fromCache),
      ageHours: ageHours,
      tempF: num(cur.temperature),
      feelsF: num(cur.feelsLike) != null ? num(cur.feelsLike) : num(cur.temperature),
      humidity: num(cur.humidity),
      windMph: cur.wind ? num(cur.wind.speed) : null,
      windGust: cur.wind ? num(cur.wind.gust) : null,
      cloudPct: num(cur.cloudCover),
      precipProb: cur.precipitation
        ? num(cur.precipitation.probability)
        : daily0 && daily0.precipitation
          ? num(daily0.precipitation.probability)
          : null,
      conditions: (cur.conditions && cur.conditions.summary) || "",
      uv: uv,
      aqi: aqiVal,
      aqiCategory: aqiLive ? aq.category || null : null,
      aqiLive: aqiLive,
      alertCount: alertItems.length,
      alertTitles: alertItems
        .slice(0, 3)
        .map(function (a) {
          return a.event || a.title || a.headline || a.name || "Alert";
        }),
      riverLive: riverSites.length > 0,
      riverTrend: riverTrend,
      riverNote: riverNote,
      sunrise: dl.sunriseFormatted || dl.sunrise || null,
      sunset: dl.sunsetFormatted || dl.sunset || null,
      goldenHourEvening: dl.goldenHourEvening || null,
      goldenHour: dl.goldenHour || null,
      blueHourEvening: dl.blueHourEvening || null,
      moonPhase: dl.moonPhase || null,
      moonIllumination: dl.moonIllumination != null ? num(dl.moonIllumination) : null,
      hourly: (wx && Array.isArray(wx.hourly) ? wx.hourly : []).slice(0, 48),
      /* Multi-day rows already in the weather package — no extra fetch. */
      dailyRows: (wx && Array.isArray(wx.daily) ? wx.daily : []).slice(0, 7).map(function (d) {
        if (!d) return null;
        return {
          precipProb: d.precipitation
            ? num(d.precipitation.probability)
            : num(d.precipProbability) != null
              ? num(d.precipProbability)
              : num(d.precipitationProbability),
          tempMax:
            num(d.temperatureMax) != null
              ? num(d.temperatureMax)
              : num(d.high) != null
                ? num(d.high)
                : num(d.tempMax),
          tempMin:
            num(d.temperatureMin) != null
              ? num(d.temperatureMin)
              : num(d.low) != null
                ? num(d.low)
                : num(d.tempMin),
          uv: num(d.uvIndex) != null ? num(d.uvIndex) : num(d.uv),
          conditions:
            (d.conditions && (d.conditions.summary || d.conditions)) ||
            d.summary ||
            null
        };
      }).filter(Boolean)
    };
  }

  /* ——— Factor curves (Sprint 2 calibration) ———
   * Peak scores reserved for narrow ideal bands so Exceptional (95+) is rare.
   * Mid “pleasant” bands land roughly Excellent / Good, not inflated near 95.
   * Documented in dashboard-rc3-sprint2-owner-review.md.
   */

  function factorScoreTemperature(s) {
    var t = s.feelsF != null ? s.feelsF : s.tempF;
    if (t == null) return null;
    if (t >= 58 && t <= 68) return { score: 100, note: "Sweet-spot air temperatures" };
    if (t >= 55 && t <= 72) return { score: 88, note: "Comfortable air temperatures" };
    if (t >= 48 && t <= 78) return { score: 76, note: "Mild outdoor temperatures" };
    if (t >= 38 && t <= 85) return { score: 62, note: "Workable with layers or shade" };
    if (t >= 28 && t <= 90) return { score: 44, note: "Hot or cold enough to shorten outings" };
    return { score: 24, note: "Extreme heat or cold limits outdoor time" };
  }

  function factorScorePrecip(s) {
    var p = s.precipProb;
    var cond = String(s.conditions || "").toLowerCase();
    if (/thunder|lightning|storm/.test(cond)) {
      return { score: 16, note: "Storm language in current conditions" };
    }
    if (p == null && !cond) return null;
    if (p == null) {
      if (/rain|shower|drizzle/.test(cond)) return { score: 40, note: "Precipitation in the sky summary" };
      return { score: 72, note: "No strong rain signal in the sky summary" };
    }
    if (p < 8) return { score: 100, note: "Very low precip chance (" + round(p) + "%)" };
    if (p < 15) return { score: 88, note: "Low precip chance (" + round(p) + "%)" };
    if (p < 35) return { score: 72, note: "Modest precip chance (" + round(p) + "%)" };
    if (p < 55) return { score: 52, note: "Precip chance near " + round(p) + "%" };
    if (p < 75) return { score: 32, note: "Elevated precip chance (" + round(p) + "%)" };
    return { score: 16, note: "High precip chance (" + round(p) + "%)" };
  }

  function factorScoreWind(s) {
    if (s.windMph == null) return null;
    var w = s.windMph;
    if (w < 5) return { score: 98, note: "Very light winds" };
    if (w < 8) return { score: 88, note: "Light winds" };
    if (w < 15) return { score: 74, note: "Moderate breeze (" + round(w) + " mph)" };
    if (w < 22) return { score: 52, note: "Breezy (" + round(w) + " mph)" };
    if (w < 30) return { score: 32, note: "Strong wind (" + round(w) + " mph)" };
    return { score: 16, note: "Very strong wind (" + round(w) + " mph)" };
  }

  function factorScoreHumidity(s) {
    if (s.humidity == null) return null;
    var h = s.humidity;
    if (h >= 40 && h <= 60) return { score: 96, note: "Comfortable humidity" };
    if (h >= 35 && h <= 65) return { score: 86, note: "Pleasant humidity" };
    if (h < 35) return { score: 70, note: "Dry air (" + round(h) + "%)" };
    if (h <= 80) return { score: 58, note: "Humid air (" + round(h) + "%)" };
    return { score: 36, note: "Very humid (" + round(h) + "%)" };
  }

  function factorScoreClouds(s) {
    if (s.cloudPct == null) return null;
    var c = s.cloudPct;
    if (c >= 30 && c <= 60) return { score: 92, note: "Balanced cloud cover" };
    if (c >= 25 && c <= 70) return { score: 82, note: "Mixed cloud cover" };
    if (c < 25) return { score: 76, note: "Mostly clear skies" };
    if (c < 85) return { score: 66, note: "Mostly cloudy" };
    return { score: 50, note: "Heavy cloud cover" };
  }

  function factorScoreUv(s) {
    if (s.uv == null) return null;
    var u = s.uv;
    if (u < 3) return { score: 95, note: "Low UV (" + round(u) + ")" };
    if (u < 6) return { score: 74, note: "Moderate UV (" + round(u) + ")" };
    if (u < 8) return { score: 54, note: "High UV (" + round(u) + ") — shade helps midday" };
    if (u < 11) return { score: 36, note: "Very high UV (" + round(u) + ")" };
    return { score: 22, note: "Extreme UV (" + round(u) + ")" };
  }

  function factorScoreAqi(s) {
    if (s.aqi == null) return null;
    var a = s.aqi;
    if (a <= 40) return { score: 98, note: "Clean air (US AQI " + round(a) + ")" };
    if (a <= 50) return { score: 90, note: "Good air quality (US AQI " + round(a) + ")" };
    if (a <= 100) return { score: 68, note: "Moderate air quality (US AQI " + round(a) + ")" };
    if (a <= 150) return { score: 42, note: "Unhealthy for sensitive groups (US AQI " + round(a) + ")" };
    if (a <= 200) return { score: 22, note: "Unhealthy air (US AQI " + round(a) + ")" };
    return { score: 10, note: "Very unhealthy air (US AQI " + round(a) + ")" };
  }

  function factorScoreAlerts(s) {
    if (s.alertCount == null) return null;
    if (s.alertCount === 0 && s._alertsKnown) {
      return { score: 98, note: "No active weather alerts" };
    }
    if (s.alertCount === 0) return null;
    if (s.alertCount === 1) return { score: 26, note: "One active alert — read official guidance" };
    return { score: 10, note: s.alertCount + " active alerts — prioritize official guidance" };
  }

  function factorScoreRivers(s) {
    if (!s.riverLive) return null;
    var t = String(s.riverTrend || "");
    if (/flood|rapid|high|rise|rising|danger/.test(t)) {
      return { score: 20, note: "Nearby gauge suggests elevated or rising flow" };
    }
    if (/fall|falling|low|normal|stable|steady/.test(t)) {
      return { score: 88, note: "Nearby gauge reads manageable (" + (s.riverNote || "local site") + ")" };
    }
    return { score: 62, note: "River gauge available — check locally before water plans" };
  }

  var FACTOR_FNS = {
    temperature: factorScoreTemperature,
    precipitation: factorScorePrecip,
    wind: factorScoreWind,
    humidity: factorScoreHumidity,
    clouds: factorScoreClouds,
    uv: factorScoreUv,
    aqi: factorScoreAqi,
    alerts: factorScoreAlerts,
    rivers: factorScoreRivers
  };

  function assessConfidence(signals, presentCount, missing, hourlyCount) {
    var reasons = [];
    var totalKeys = Object.keys(SCORE_WEIGHTS).length;
    var keyMissing = missing.filter(function (m) {
      return m === "aqi" || m === "precipitation" || m === "temperature" || m === "uv";
    });

    if (!signals.weatherLive) {
      reasons.push("Live weather has not settled yet");
      return { label: "Limited", reasons: reasons };
    }
    if (presentCount < 4) {
      reasons.push("Only " + presentCount + " of " + totalKeys + " score factors are present");
      return { label: "Limited", reasons: reasons };
    }

    var score = 0;
    if (presentCount >= 7) {
      score += 2;
      reasons.push(presentCount + " of " + totalKeys + " factors present");
    } else if (presentCount >= 5) {
      score += 1;
      reasons.push(presentCount + " of " + totalKeys + " factors present");
    } else {
      reasons.push("Thin factor set (" + presentCount + " of " + totalKeys + ")");
    }

    if (hourlyCount >= HOURLY_HIGH_CONF_MIN) {
      score += 2;
      reasons.push("Hourly forecast covers " + hourlyCount + " hours");
    } else if (hourlyCount >= HOURLY_PRECISION_MIN) {
      score += 1;
      reasons.push("Hourly forecast covers " + hourlyCount + " hours");
    } else if (hourlyCount > 0) {
      reasons.push("Hourly coverage is thin (" + hourlyCount + " rows)");
    } else {
      reasons.push("No hourly forecast rows in this load");
    }

    if (signals.fromCache) {
      score -= 1;
      reasons.push("Weather package is from cache");
    } else {
      score += 1;
      reasons.push("Weather package is live (not cache)");
    }

    if (signals.ageHours != null && signals.ageHours > 6) {
      score -= 1;
      reasons.push("Observations are more than 6 hours old");
    } else if (signals.ageHours != null && signals.ageHours <= 2) {
      score += 1;
      reasons.push("Observations look fresh");
    }

    if (signals.alertCount > 0) {
      reasons.push("Active alerts lower certainty for outdoor plans");
      score -= 1;
    }

    if (keyMissing.length) {
      reasons.push("Missing key inputs: " + keyMissing.join(", "));
      score -= 1;
    }

    if (score >= 4) return { label: "High", reasons: reasons };
    if (score >= 1) return { label: "Moderate", reasons: reasons };
    return { label: "Limited", reasons: reasons };
  }

  /**
   * Outdoor Score 0–100 from weighted factors. Documents each contribution.
   */
  function computeOutdoorScore(signals) {
    signals = signals || {};
    var factors = [];
    var weightSum = 0;
    var weighted = 0;
    var missing = [];
    var weakest = null;

    Object.keys(SCORE_WEIGHTS).forEach(function (key) {
      var fn = FACTOR_FNS[key];
      var result = fn ? fn(signals) : null;
      var weight = SCORE_WEIGHTS[key];
      if (!result || result.score == null) {
        missing.push(key);
        return;
      }
      var sc = clamp(result.score, 0, 100);
      factors.push({
        id: key,
        label: FACTOR_LABELS[key] || key,
        weight: weight,
        score: sc,
        note: result.note
      });
      weightSum += weight;
      weighted += result.score * weight;
      if (!weakest || sc < weakest.score) weakest = { id: key, score: sc };
    });

    if (!weightSum || !factors.length) {
      return {
        value: null,
        display: "—",
        label: "Unavailable",
        confidence: "Limited",
        confidenceReasons: ["Outdoor Score needs live weather before it can settle."],
        factors: [],
        missing: missing.slice(),
        algorithm: SCORE_WEIGHTS,
        summary: "Outdoor Score needs live weather before it can settle."
      };
    }

    var value = round(weighted / weightSum);

    /* Soft ceilings — Exceptional requires broad strength, not one lucky factor. */
    if (signals.alertCount > 0 && value > 84) value = 84;
    if (weakest && weakest.score < 40 && value >= 95) value = 94;
    if (factors.length < 5 && value >= 95) value = 94;

    var hourlyCount = signals.hourly ? signals.hourly.length : 0;
    var conf = assessConfidence(signals, factors.length, missing, hourlyCount);

    var summary;
    if (conf.label === "Limited") {
      summary = "Score is provisional — several inputs are still settling.";
    } else if (conf.label === "Moderate") {
      var limiter =
        conf.reasons.filter(function (r) {
          return /thin|missing|cache|old|alert|No hourly|not settled/i.test(r);
        })[0] ||
        conf.reasons[0] ||
        "some inputs are thinner than a full load";
      summary =
        "Weighted from available weather, air, UV, and alert signals. Confidence is moderate because " +
        String(limiter).toLowerCase() +
        ".";
    } else {
      summary = "Weighted from available weather, air, UV, and alert signals with solid coverage.";
    }

    return {
      value: value,
      display: String(value) + "/100",
      label: levelFromScore(value),
      confidence: conf.label,
      confidenceReasons: conf.reasons.slice(0, 5),
      factors: factors.map(function (f) {
        return {
          id: f.id,
          label: f.label,
          weight: f.weight,
          weightShare: round((f.weight / weightSum) * 100),
          score: f.score,
          note: f.note
        };
      }),
      missing: missing,
      algorithm: SCORE_WEIGHTS,
      summary: summary
    };
  }

  function activityBase(signals) {
    var score = 70;
    var notes = [];
    var limits = [];
    var cond = String(signals.conditions || "").toLowerCase();

    if (/thunder|lightning|storm/.test(cond)) {
      score -= 40;
      limits.push("Storm conditions");
    }
    if (signals.precipProb != null && signals.precipProb >= 60) {
      score -= 22;
      limits.push("Elevated rain chance");
    } else if (signals.precipProb != null && signals.precipProb >= 40) {
      score -= 10;
      limits.push("Some rain possible");
    }
    if (signals.windMph != null && signals.windMph >= 25) {
      score -= 18;
      limits.push("Strong wind");
    } else if (signals.windMph != null && signals.windMph >= 18) {
      score -= 8;
    }
    if (signals.aqi != null && signals.aqi > 150) {
      score -= 30;
      limits.push("Poor air quality");
    } else if (signals.aqi != null && signals.aqi > 100) {
      score -= 14;
      limits.push("Sensitive-group AQI");
    }
    if (signals.alertCount > 0) {
      score -= 20;
      limits.push("Active weather alert");
    }
    if (signals.feelsF != null && signals.feelsF >= 55 && signals.feelsF <= 75) {
      score += 8;
      notes.push("comfortable temperatures");
    }
    if (signals.feelsF != null && signals.feelsF >= 88) {
      score -= 16;
      limits.push("Heat stress risk");
    }
    if (signals.feelsF != null && signals.feelsF <= 28) {
      score -= 16;
      limits.push("Cold exposure risk");
    }

    return { score: score, notes: notes, limits: limits };
  }

  function fieldGuideSentence(id, label, level, notes, limits, available, signals) {
    if (!available) {
      return calm(
        label +
          " stays provisional here — " +
          (limits[0] ? limits[0].toLowerCase() : "supporting data has not arrived") +
          "."
      );
    }
    if (!signals.weatherLive) {
      return calm(label + " guidance is waiting on live weather for this place.");
    }

    var thanks = notes[0] || null;
    var watch = limits[0] || null;
    var name = label.toLowerCase();

    if (level === "Exceptional") {
      return calm(
        "Rarely this favorable for " +
          name +
          (thanks ? " — " + thanks : "") +
          (watch ? ". Still watch for " + watch.toLowerCase() : "") +
          "."
      );
    }
    if (level === "Excellent") {
      return calm(
        "Strong conditions for " +
          name +
          (thanks ? ", with " + thanks : "") +
          (watch ? " — keep an eye on " + watch.toLowerCase() : "") +
          "."
      );
    }
    if (level === "Good") {
      return calm(
        "A solid window for " +
          name +
          (thanks ? " given " + thanks : "") +
          (watch ? ". " + watch + " may shape timing" : "") +
          "."
      );
    }
    if (level === "Mixed") {
      return calm(
        "Mixed for " +
          name +
          (watch ? " — " + watch.toLowerCase() : thanks ? ", even with " + thanks : "") +
          "."
      );
    }
    return calm(
      "Tough stretch for " +
        name +
        (watch ? " with " + watch.toLowerCase() : "") +
        ". Shorter plans and flexible timing help."
    );
  }

  function tuneActivity(id, signals, base) {
    var score = base.score;
    var notes = base.notes.slice();
    var limits = base.limits.slice();
    var available = true;
    var confKey = signals.weatherLive ? (signals.fromCache ? "moderate" : "high") : "limited";

    if (id === "photography") {
      if (signals.cloudPct != null && signals.cloudPct >= 35 && signals.cloudPct <= 80) {
        score += 12;
        notes.push("soft, diffuse light");
      } else if (signals.cloudPct != null && signals.cloudPct < 20) {
        score -= 6;
        notes.push("hard midday contrast on clear skies");
      }
      if (signals.goldenHourEvening || signals.goldenHour) {
        score += 8;
        notes.push("a golden-hour window on the daylight schedule");
      }
      if (/fog|mist/.test(String(signals.conditions || "").toLowerCase())) {
        score += 14;
        notes.push("fog softening woodland and water scenes");
      }
    }

    if (id === "birding" || id === "wildlife") {
      if (signals.windMph != null && signals.windMph < 10) {
        score += 10;
        notes.push("calm air for hearing and movement cues");
      }
      if (signals.sunrise) notes.push("movement often peaking near sunrise");
      if (signals.precipProb != null && signals.precipProb >= 50) {
        score -= 8;
        limits.push("Rain may quiet wildlife");
      }
      if (signals.feelsF != null && signals.feelsF >= 40 && signals.feelsF <= 78) score += 6;
    }

    if (id === "hiking") {
      if (signals.feelsF != null && signals.feelsF >= 45 && signals.feelsF <= 72) {
        score += 10;
        notes.push("mild trail temperatures");
      }
      if (signals.feelsF != null && signals.feelsF >= 82) {
        score -= 8;
        notes.push("cooler morning hours before heat");
      }
      if (signals.windMph != null && signals.windMph >= 22) {
        score -= 10;
        limits.push("Exposed ridges may feel windier");
      }
    }

    if (id === "trailRunning") {
      if (signals.feelsF != null && signals.feelsF >= 40 && signals.feelsF <= 68) {
        score += 10;
        notes.push("cooler air that favors exertion");
      }
      if (signals.feelsF != null && signals.feelsF >= 82) {
        score -= 14;
        limits.push("Heat raises exertion stress");
        notes.push("morning before heat");
      }
      if (signals.humidity != null && signals.humidity >= 75) score -= 6;
    }

    if (id === "fishing") {
      if (!signals.riverLive) {
        available = false;
        confKey = "limited";
        notes = [];
        limits = ["No nearby river gauge in this package"];
        score = 50;
      } else {
        notes.push(
          "gauge data available" + (signals.riverNote ? " (" + signals.riverNote + ")" : "")
        );
        if (/flood|rapid|high|rise|rising/.test(String(signals.riverTrend || ""))) {
          score -= 25;
          limits.push("Elevated flow — verify before entering water");
        } else {
          score += 6;
        }
        if (signals.windMph != null && signals.windMph >= 15) {
          score -= 8;
          limits.push("Wind chop on open water");
        }
      }
    }

    if (id === "gardening") {
      if (signals.feelsF != null && signals.feelsF >= 50 && signals.feelsF <= 80) {
        score += 8;
        notes.push("workable outdoor temperatures");
      }
      if (signals.precipProb != null && signals.precipProb >= 50) {
        score -= 10;
        limits.push("Rain may interrupt yard work");
      }
      if (signals.uv != null && signals.uv >= 8) {
        score -= 6;
        notes.push("high UV — shade breaks help");
      }
    }

    if (id === "camping") {
      if (
        signals.precipProb != null &&
        signals.precipProb < 30 &&
        signals.feelsF != null &&
        signals.feelsF >= 45 &&
        signals.feelsF <= 78
      ) {
        score += 10;
        notes.push("dry, mild overnight setup looking reasonable");
      }
      if (signals.precipProb != null && signals.precipProb >= 55) {
        score -= 16;
        limits.push("Wet camping likely");
      }
      if (signals.windMph != null && signals.windMph >= 20) {
        score -= 12;
        limits.push("Wind complicates tents and stoves");
      }
      if (signals.alertCount > 0) score -= 10;
    }

    if (id === "astronomy") {
      if (signals.cloudPct != null && signals.cloudPct <= 30) {
        score += 14;
        notes.push("clearer skies favoring stars");
      } else if (signals.cloudPct != null && signals.cloudPct >= 70) {
        score -= 22;
        limits.push("Clouds will limit the night sky");
      }
      if (signals.moonIllumination != null && signals.moonIllumination > 70) {
        score -= 12;
        limits.push("Bright moon washes faint stars");
      } else if (signals.moonIllumination != null && signals.moonIllumination < 40) {
        score += 8;
        notes.push("lower moon brightness helping dark-sky views");
      }
      if (signals.cloudPct == null && signals.moonIllumination == null) confKey = "limited";
    }

    if (id === "generalOutdoor") {
      if (signals.feelsF != null && signals.feelsF >= 50 && signals.feelsF <= 78) {
        score += 8;
        notes.push("pleasant air for unhurried outdoor time");
      }
    }

    score = clamp(score, 5, 98);
    var level = levelFromScore(score);
    if (!signals.weatherLive) {
      level = "Mixed";
      confKey = "limited";
      limits = limits.length ? limits : ["Live weather not available yet"];
    }

    var label = ACTIVITY_LABELS[id] || id;
    var explanation = fieldGuideSentence(
      id,
      label,
      level,
      notes,
      limits,
      available,
      signals
    );

    return {
      id: id,
      label: label,
      icon: ACTIVITY_ICONS[id] || "○",
      level: level,
      score: score,
      confidence: confidenceLabel(confKey),
      explanation: explanation || calm("Based on available conditions"),
      recommendation: explanation,
      notes: notes.slice(0, 3).map(calm).filter(Boolean),
      limits: limits.slice(0, 3).map(calm).filter(Boolean),
      available: available,
      bestWindow: null,
      inputs: {
        tempF: signals.tempF,
        precipProb: signals.precipProb,
        windMph: signals.windMph,
        aqi: signals.aqi,
        cloudPct: signals.cloudPct,
        uv: signals.uv,
        alertCount: signals.alertCount,
        riverLive: signals.riverLive
      }
    };
  }

  function recommendActivities(signals) {
    var base = activityBase(signals || {});
    return ACTIVITY_IDS.map(function (id) {
      return tuneActivity(id, signals || {}, base);
    });
  }

  function hourlyScoreFor(id, hour, signals) {
    var pop = hour.precipitation ? num(hour.precipitation.probability) : null;
    var wind = hour.wind ? num(hour.wind.speed) : null;
    var cloud = num(hour.cloudCover);
    var temp = num(hour.feelsLike) != null ? num(hour.feelsLike) : num(hour.temperature);
    var score = 50;
    if (pop != null && pop < 20) score += 16;
    else if (pop != null && pop < 40) score += 6;
    else if (pop != null && pop >= 60) score -= 20;
    if (wind != null && wind < 12) score += 8;
    else if (wind != null && wind >= 20) score -= 12;

    if (id === "hiking" || id === "trailRunning") {
      if (temp != null && temp >= 48 && temp <= 72) score += 14;
      if (temp != null && temp >= 85) score -= 16;
    }
    if (id === "photography") {
      if (cloud != null && cloud >= 30 && cloud <= 80) score += 16;
      if (cloud != null && cloud < 15) score -= 4;
    }
    if (id === "wildlife") {
      if (wind != null && wind < 10) score += 12;
      if (hour._localHour != null) {
        var h = hour._localHour;
        if (h >= 5 && h <= 9) score += 14;
        if (h >= 17 && h <= 20) score += 10;
        if (h >= 11 && h <= 15) score -= 6;
      }
    }
    if (id === "stargazing") {
      if (cloud != null && cloud <= 30) score += 20;
      else if (cloud != null && cloud >= 70) score -= 25;
      if (hour._localHour != null && hour._localHour < 19) score -= 30;
      if (signals.moonIllumination != null && signals.moonIllumination > 70) score -= 10;
    }
    return score;
  }

  function scoredHourlyRows(id, signals) {
    var hourly = signals.hourly || [];
    var nowMs = signals.now ? signals.now.getTime() : Date.now();
    var rows = [];
    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t || isNaN(t.getTime())) return;
      if (t.getTime() < nowMs - 600000) return;
      if (t.getTime() > nowMs + 36 * 3600000) return;
      var localHour = t.getHours();
      var row = {
        time: h.time,
        date: t,
        precipitation: h.precipitation,
        wind: h.wind,
        cloudCover: h.cloudCover,
        feelsLike: h.feelsLike,
        temperature: h.temperature,
        _localHour: localHour
      };
      row.score = hourlyScoreFor(id, row, signals);
      rows.push(row);
    });
    return rows;
  }

  /**
   * When hourly coverage is reliable, return a practical clock range from the
   * best contiguous stretch. Otherwise null (caller uses band fallback).
   */
  function practicalFromHourly(id, signals) {
    var rows = scoredHourlyRows(id, signals);
    var hourlyLen = (signals.hourly || []).length;
    if (rows.length < 2 || hourlyLen < HOURLY_PRECISION_MIN) return null;

    var bestIdx = 0;
    rows.forEach(function (r, i) {
      if (r.score > rows[bestIdx].score) bestIdx = i;
    });

    var startIdx = bestIdx;
    var endIdx = bestIdx;
    while (startIdx > 0 && rows[startIdx - 1].score >= rows[bestIdx].score - 8) {
      startIdx -= 1;
    }
    while (endIdx < rows.length - 1 && rows[endIdx + 1].score >= rows[bestIdx].score - 8) {
      endIdx += 1;
    }

    /* Prefer a 1–3 hour practical window centered on the peak. */
    if (endIdx - startIdx > 2) {
      startIdx = Math.max(0, bestIdx - 1);
      endIdx = Math.min(rows.length - 1, bestIdx + 1);
    }

    var start = rows[startIdx].date;
    var end = new Date(rows[endIdx].date.getTime() + 60 * 60000);
    var range = formatClockRange(start, end);
    if (!range) return null;

    var conf = "Moderate";
    if (hourlyLen >= HOURLY_HIGH_CONF_MIN && signals.weatherLive && !signals.fromCache) {
      conf = "High";
    } else if (hourlyLen < HOURLY_PRECISION_MIN) {
      conf = "Limited";
    }

    return {
      band: range,
      confidence: conf,
      source: "hourly",
      precision: "range",
      detail: calm("Practical range from the hourly forecast — still a guide, not an appointment.")
    };
  }

  function fallbackWindow(id, signals) {
    if (id === "photography") {
      var gh = rangeStart(signals.goldenHourEvening) || signals.goldenHour;
      if (gh) {
        var phr = parseClockHour(gh);
        return {
          band: phr != null ? hourBand(phr) : "Near Sunset",
          confidence: "Moderate",
          source: "daylight",
          precision: "band",
          detail: calm("Golden hour softens color and shadow.")
        };
      }
      return {
        band: "Near Sunset",
        confidence: "Limited",
        source: "heuristic",
        precision: "band",
        detail: calm("Without hourly light data, late-day light is the usual photography window.")
      };
    }
    if (id === "wildlife") {
      return {
        band: "Early Morning",
        confidence: signals.sunrise ? "Moderate" : "Limited",
        source: signals.sunrise ? "daylight" : "heuristic",
        precision: "band",
        detail: calm(
          signals.sunrise
            ? "Wildlife movement often concentrates near sunrise (" + signals.sunrise + ")."
            : "Dawn and dusk are the usual wildlife windows when hourly cues are thin."
        )
      };
    }
    if (id === "stargazing") {
      var conf = "Limited";
      var detail = "Night-sky timing needs cloud and moon context.";
      if (signals.cloudPct != null && signals.cloudPct <= 40) {
        conf = "Moderate";
        detail = "Clearer skies favor waiting until full dark after sunset.";
      } else if (signals.cloudPct != null && signals.cloudPct >= 70) {
        detail = "Cloud cover will likely limit stars tonight.";
      }
      return {
        band: "This Evening",
        confidence: conf,
        source: signals.cloudPct != null ? "conditions" : "heuristic",
        precision: "band",
        detail: calm(detail)
      };
    }
    if (signals.feelsF != null && signals.feelsF >= 82) {
      return {
        band: "Early Morning",
        confidence: signals.weatherLive ? "Moderate" : "Limited",
        source: "temperature",
        precision: "band",
        detail: calm("Cooler morning hours ease heat on the trail.")
      };
    }
    if (signals.precipProb != null && signals.precipProb >= 45) {
      return {
        band: "Early Morning",
        confidence: "Moderate",
        source: "precipitation",
        precision: "band",
        detail: calm("Earlier hours often stay drier when rain risk rises later.")
      };
    }
    return {
      band: "Late Morning",
      confidence: signals.weatherLive ? "Moderate" : "Limited",
      source: "heuristic",
      precision: "band",
      detail: calm("Mild late-morning hours are a practical hiking default when hourly detail is thin.")
    };
  }

  function bestTimeWindows(signals) {
    signals = signals || {};
    return WINDOW_IDS.map(function (id) {
      var fromHourly = practicalFromHourly(id === "stargazing" ? "stargazing" : id, signals);
      var fb = fallbackWindow(id, signals);
      var chosen = fromHourly || fb;
      var confidence = chosen.confidence || "Limited";
      if (!signals.weatherLive) confidence = "Limited";
      if (!fromHourly && fb.confidence === "Limited") confidence = "Limited";
      var label =
        id === "hiking"
          ? "Hiking"
          : id === "photography"
            ? "Photography"
            : id === "wildlife"
              ? "Wildlife"
              : "Stargazing";
      var precision = chosen.precision || (fromHourly ? "range" : "band");
      return {
        id: id,
        label: label,
        window: chosen.band,
        confidence: confidence,
        explanation:
          calm((chosen && chosen.detail) || (fb && fb.detail) || "") ||
          calm("Practical timing from available forecast cues — not a precise appointment."),
        precision: precision,
        source: chosen.source || "heuristic"
      };
    });
  }

  function attachActivityWindows(activities, windows) {
    var byId = {};
    (windows || []).forEach(function (w) {
      byId[w.id] = w;
    });
    return (activities || []).map(function (a) {
      var mapId = ACTIVITY_WINDOW_MAP[a.id] || "hiking";
      var w = byId[mapId];
      var next = Object.assign({}, a);
      if (w) {
        next.bestWindow = w.window;
        next.bestWindowConfidence = w.confidence;
        next.bestWindowPrecision = w.precision;
      }
      return next;
    });
  }

  /* ——— Personal Workspace (RC3 Sprint 5) ———
   * Interests reorder presentation emphasis only. Alerts / public safety stay
   * highest priority. Cards and activities are never hidden for missing interests.
   */

  function normalizeInterestProfile(raw) {
    var seen = Object.create(null);
    var next = [];
    (Array.isArray(raw) ? raw : []).forEach(function (id) {
      id = String(id || "");
      if (!id || seen[id] || INTEREST_IDS.indexOf(id) < 0) return;
      seen[id] = true;
      next.push(id);
    });
    if (!next.length) return DEFAULT_INTERESTS.slice();
    return next;
  }

  function isBalancedInterests(interests) {
    interests = normalizeInterestProfile(interests);
    return interests.length === 1 && interests[0] === "general";
  }

  function interestPriorityIndex(id, interests) {
    var i = (interests || []).indexOf(id);
    return i < 0 ? 999 : i;
  }

  function bestMappedPriority(mappedIds, interests) {
    var best = 999;
    (mappedIds || []).forEach(function (mid) {
      var p = interestPriorityIndex(mid, interests);
      if (p < best) best = p;
    });
    return best;
  }

  function activityInterestPriority(activityId, interests) {
    var best = 999;
    (interests || []).forEach(function (interest, idx) {
      var mapped = INTEREST_ACTIVITY_MAP[interest] || [];
      if (mapped.indexOf(activityId) >= 0 && idx < best) best = idx;
    });
    return best;
  }

  function discoveryInterestPriority(cardId, interests) {
    var best = 999;
    (interests || []).forEach(function (interest, idx) {
      var mapped = INTEREST_DISCOVERY_MAP[interest] || [];
      if (mapped.indexOf(cardId) >= 0 && idx < best) best = idx;
    });
    return best;
  }

  function windowInterestPriority(windowId, interests) {
    var best = 999;
    (interests || []).forEach(function (interest, idx) {
      var mapped = INTEREST_WINDOW_MAP[interest] || [];
      if (mapped.indexOf(windowId) >= 0 && idx < best) best = idx;
    });
    return best;
  }

  function prioritizeActivities(activities, interests) {
    interests = normalizeInterestProfile(interests);
    if (isBalancedInterests(interests)) {
      return (activities || []).slice().sort(function (a, b) {
        return (b.score || 0) - (a.score || 0);
      });
    }
    return (activities || [])
      .slice()
      .sort(function (a, b) {
        var pa = activityInterestPriority(a.id, interests);
        var pb = activityInterestPriority(b.id, interests);
        if (pa !== pb) return pa - pb;
        return (b.score || 0) - (a.score || 0);
      });
  }

  function prioritizeWindows(windows, interests) {
    interests = normalizeInterestProfile(interests);
    if (isBalancedInterests(interests)) return (windows || []).slice();
    return (windows || [])
      .slice()
      .sort(function (a, b) {
        var pa = windowInterestPriority(a.id, interests);
        var pb = windowInterestPriority(b.id, interests);
        if (pa !== pb) return pa - pb;
        return String(a.id).localeCompare(String(b.id));
      });
  }

  function prioritizeDiscoveryCards(cards, interests) {
    interests = normalizeInterestProfile(interests);
    if (isBalancedInterests(interests)) return (cards || []).slice();
    return (cards || [])
      .slice()
      .sort(function (a, b) {
        var pa = discoveryInterestPriority(a.id, interests);
        var pb = discoveryInterestPriority(b.id, interests);
        if (pa !== pb) return pa - pb;
        return String(a.id).localeCompare(String(b.id));
      });
  }

  function opportunityKeyInterest(key) {
    if (!key) return null;
    if (key.indexOf("act-") === 0) {
      var act = key.slice(4);
      if (act === "photography") return "photography";
      if (act === "hiking" || act === "trailRunning" || act === "camping") return "hiking";
      if (act === "wildlife") return "wildlife";
      if (act === "birding") return "birding";
      if (act === "astronomy") return "astronomy";
      if (act === "gardening") return "gardening";
      if (act === "fishing") return "fishing";
      if (act === "generalOutdoor") return "general";
      return null;
    }
    if (key === "golden" || key === "soft-light") return "photography";
    if (key === "calm-wind") return "wildlife";
    if (key === "stars") return "astronomy";
    if (key === "river") return "rivers";
    if (key === "clean-air") return "weather";
    return null;
  }

  function primaryInterestLabel(interests) {
    interests = normalizeInterestProfile(interests);
    var id = interests[0];
    if (!id || id === "general") return null;
    return INTEREST_LABELS[id] || id;
  }

  function interestEmphasisCue(interests, signals) {
    interests = normalizeInterestProfile(interests);
    if (isBalancedInterests(interests)) return null;
    var top = interests[0];
    if (top === "photography") {
      return signals && signals.goldenHourEvening
        ? "For photography, late light is worth a glance."
        : "For photography, watch how light and cloud texture shift.";
    }
    if (top === "wildlife") {
      return "Wildlife noticing often rewards quieter edges and calmer air.";
    }
    if (top === "birding") {
      return "Birding often benefits from lighter wind and unhurried listening.";
    }
    if (top === "astronomy") {
      return "Astronomy hinges on darkness, moon, and evening cloud gaps.";
    }
    if (top === "hiking") {
      return "Hiking comfort follows air, sun, and flexible timing.";
    }
    if (top === "gardening") {
      return "Gardening days turn on sun strength, moisture, and gentle air.";
    }
    if (top === "fishing" || top === "rivers") {
      return "Water plans stay grounded in gauge context and local judgment.";
    }
    if (top === "weather") {
      return "Weather watching starts with sky, air, and any official alerts.";
    }
    return null;
  }

  function skyPhrase(signals) {
    var cond = String(signals.conditions || "").toLowerCase().trim();
    if (cond) return cond;
    if (signals.cloudPct == null) return null;
    if (signals.cloudPct <= 25) return "mostly clear skies";
    if (signals.cloudPct <= 60) return "mixed clouds";
    if (signals.cloudPct < 85) return "mostly cloudy skies";
    return "heavy cloud cover";
  }

  function airComfortPhrase(signals) {
    var t = signals.feelsF != null ? signals.feelsF : signals.tempF;
    if (t == null) return null;
    if (t >= 58 && t <= 68) return "sweet-spot air";
    if (t >= 55 && t <= 72) return "comfortable air";
    if (t >= 48 && t <= 78) return "mild air";
    if (t >= 38 && t <= 85) return "workable temperatures";
    if (t > 85) return "warm air that asks for shade and pacing";
    return "cool air that rewards layers";
  }

  /**
   * Waypoint's Take — short editorial from an experienced outdoor guide.
   * Avoids repeating activity-card explanations; speaks to the whole day.
   * Interests subtly shift emphasis; alerts always lead when present.
   */
  function waypointTake(signals, score, activities, dailyBrief, interests) {
    signals = signals || {};
    interests = normalizeInterestProfile(interests);
    if (!signals.weatherLive) {
      return {
        text: "Conditions are still arriving for this place. Nothing here is invented while weather and air settle — check back once the instruments hydrate.",
        confidence: "Limited"
      };
    }

    var top = (activities || [])
      .filter(function (a) {
        return (
          a.available !== false &&
          (a.level === "Exceptional" || a.level === "Excellent" || a.level === "Good")
        );
      })
      .slice()
      .sort(function (a, b) {
        var pa = activityInterestPriority(a.id, interests);
        var pb = activityInterestPriority(b.id, interests);
        if (pa !== pb) return pa - pb;
        return (b.score || 0) - (a.score || 0);
      });

    var parts = [];
    var sky = skyPhrase(signals);
    if (signals.alertCount > 0) {
      parts.push(
        "Start with the official alerts — they outrank any quiet suggestion below."
      );
    } else if (score && score.value != null && score.value >= 95) {
      parts.push(
        "This is one of those rare, generous outdoor days" +
          (sky ? " under " + sky : "") +
          " — leave room to wander and notice."
      );
    } else if (score && score.value != null && score.value >= 85) {
      parts.push(
        "A fine day to step outside" +
          (sky ? " under " + sky : "") +
          ". The conditions invite unhurried time in the open."
      );
    } else if (score && score.value != null && score.value >= 70) {
      parts.push(
        "Worth going out, with a few tradeoffs to read as you go" +
          (sky ? " — " + sky + " set the tone" : "") +
          "."
      );
    } else if (score && score.value != null && score.value >= 55) {
      parts.push(
        "A mixed day outdoors — shorter loops and flexible timing keep it pleasant."
      );
    } else if (score && score.value != null) {
      parts.push(
        "Today asks for care: shorter plans, honest pacing, and a willingness to turn back."
      );
    } else {
      parts.push("Outdoor guidance stays provisional while key signals settle.");
    }

    /* Prefer a distinctive activity cue over repeating Why Today Is Interesting. */
    if (top[0] && top[0].notes && top[0].notes[0]) {
      var note0 = String(top[0].notes[0]).replace(/\.$/, "");
      if (note0.toLowerCase() !== "comfortable temperatures") {
        parts.push(top[0].label + " benefits from " + note0 + ".");
      } else if (top[0].bestWindow) {
        parts.push(
          "If you go out, " +
            String(top[0].label).toLowerCase() +
            " around " +
            top[0].bestWindow.toLowerCase() +
            " is among the stronger bets."
        );
      }
    } else if (top[0] && top[0].bestWindow) {
      parts.push(
        top[0].label +
          " around " +
          String(top[0].bestWindow).toLowerCase() +
          " ranks among the stronger choices today."
      );
    } else if (top[0]) {
      parts.push(
        top[0].label + " ranks among the stronger choices on today's signals."
      );
    }

    var cue = interestEmphasisCue(interests, signals);
    if (cue && signals.alertCount === 0) {
      parts.push(cue);
    }

    if (signals.aqi != null && signals.aqi > 100) {
      parts.push("Ease prolonged exertion if you are sensitive to the air.");
    } else if (signals.uv != null && signals.uv >= 7) {
      parts.push("Midday sun runs strong — shade and cover help.");
    } else if (signals.feelsF != null && signals.feelsF >= 82) {
      parts.push("Heat builds later; morning hours are usually kinder.");
    }

    var text = calm(parts.join(" "));
    if (!text) {
      text = "Read the instruments below; guidance stays provisional when signals conflict.";
    }
    if (text.length > 320) {
      var cut = text.slice(0, 300);
      var last = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("—"));
      text = last > 120 ? cut.slice(0, last + 1) : cut.replace(/\s+\S*$/, "") + ".";
    }

    var conf = "Moderate";
    if (score && score.confidence === "High" && signals.aqiLive) conf = "High";
    if (score && score.confidence === "Limited") conf = "Limited";
    if (signals.fromCache) conf = "Moderate";

    return { text: text, confidence: conf };
  }

  function composeOutlook(signals, score, interests) {
    interests = normalizeInterestProfile(interests);
    if (!signals.weatherLive) {
      return calm(
        "Today's outlook is waiting on live weather for this place — nothing is invented while instruments settle."
      );
    }
    var bits = [];
    var comfort = airComfortPhrase(signals);
    var sky = skyPhrase(signals);
    if (signals.tempF != null && sky) {
      bits.push(round(signals.tempF) + "°F with " + sky);
    } else if (comfort && sky) {
      bits.push(comfort + " under " + sky);
    } else if (signals.tempF != null) {
      bits.push("Air near " + round(signals.tempF) + "°F");
    } else if (sky) {
      bits.push(sky.charAt(0).toUpperCase() + sky.slice(1));
    }

    if (signals.windMph != null && signals.windMph < 8) {
      bits.push("light wind");
    } else if (signals.windMph != null && signals.windMph >= 18) {
      bits.push("breezier air near " + round(signals.windMph) + " mph");
    }

    if (signals.precipProb != null && signals.precipProb < 20) {
      bits.push("a low rain chance");
    } else if (signals.precipProb != null && signals.precipProb >= 40) {
      bits.push("a precip chance near " + round(signals.precipProb) + "%");
    }

    if (signals.aqi != null && signals.aqi <= 50) {
      bits.push("clean-leaning air");
    } else if (signals.aqi != null && signals.aqi > 100) {
      bits.push("elevated air-quality readings");
    }

    var lead = bits.length ? bits.join(", ") : "Available outdoor signals";
    lead = lead.charAt(0).toUpperCase() + lead.slice(1);

    var close = "";
    if (score && score.value != null && score.value >= 85) {
      close = " — a comfortable stretch for unhurried time outside.";
    } else if (score && score.value != null && score.value >= 70) {
      close = " — generally favorable, with a few details worth reading as you go.";
    } else if (score && score.value != null && score.value >= 55) {
      close = " — mixed enough that shorter plans travel better.";
    } else if (score && score.value != null) {
      close = " — challenging enough that flexible timing and shorter routes help.";
    } else {
      close = " — guidance deepens as more signals arrive.";
    }

    if (signals.alertCount > 0) {
      close =
        " — official alerts are active, so treat this outlook as secondary to that guidance.";
    } else if (!isBalancedInterests(interests)) {
      var label = primaryInterestLabel(interests);
      if (label) {
        close =
          " — worth noticing through a " +
          String(label).toLowerCase() +
          " lens, while still leaving room to explore beyond it.";
      }
    }

    return calm(lead + close);
  }

  function composeOpportunities(signals, score, activities, windows, interests) {
    interests = normalizeInterestProfile(interests);
    var items = [];
    var seen = {};
    var usedNotes = {};

    function push(text, key) {
      var c = calm(text);
      if (!c || seen[key || c]) return;
      seen[key || c] = true;
      items.push({ text: c, key: key || c });
    }

    var ranked = (activities || [])
      .filter(function (a) {
        return (
          a &&
          a.available !== false &&
          (a.level === "Exceptional" || a.level === "Excellent" || a.level === "Good")
        );
      })
      .slice()
      .sort(function (a, b) {
        var pa = activityInterestPriority(a.id, interests);
        var pb = activityInterestPriority(b.id, interests);
        if (pa !== pb) return pa - pb;
        return (b.score || 0) - (a.score || 0);
      });

    ranked.slice(0, 4).forEach(function (a) {
      var win = a.bestWindow ? " · best around " + a.bestWindow : "";
      var note = null;
      (a.notes || []).forEach(function (n) {
        if (note) return;
        var key = String(n || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
        /* Skip the shared comfort note when many activities inherit it. */
        if (!key || key === "comfortable temperatures" || usedNotes[key]) return;
        usedNotes[key] = true;
        note = n;
      });
      var cue = note ? " — " + note : "";
      var verb =
        a.level === "Exceptional"
          ? "stands out"
          : a.level === "Excellent"
            ? "looks strong"
            : "looks workable";
      push(a.label + " " + verb + cue + win + ".", "act-" + a.id);
    });

    var photoWin = (windows || []).filter(function (w) {
      return w.id === "photography";
    })[0];
    if (photoWin && photoWin.window && signals.goldenHourEvening) {
      var gh = rangeStart(signals.goldenHourEvening);
      push(
        "Late light softens around " +
          (gh || photoWin.window) +
          " — a quiet window for color and shadow.",
        "golden"
      );
    }

    if (signals.windMph != null && signals.windMph < 8) {
      push("Calm air favors hearing birds and noticing small movement at the edges.", "calm-wind");
    }

    if (signals.cloudPct != null && signals.cloudPct >= 30 && signals.cloudPct <= 70) {
      push("Mixed cloud cover often means gentler light for walking and noticing texture.", "soft-light");
    }

    if (signals.aqi != null && signals.aqi <= 40) {
      push("Air quality is on the cleaner side for longer unhurried outings.", "clean-air");
    }

    if (
      signals.cloudPct != null &&
      signals.cloudPct <= 35 &&
      signals.moonIllumination != null &&
      signals.moonIllumination < 40
    ) {
      push("Clearer skies and a dimmer moon lean toward a better night-sky look later.", "stars");
    }

    if (signals.riverLive && /fall|falling|low|normal|stable|steady/.test(String(signals.riverTrend || ""))) {
      push(
        "A nearby river gauge reads manageable" +
          (signals.riverNote ? " (" + signals.riverNote + ")" : "") +
          " — useful context before water plans.",
        "river"
      );
    }

    if (!items.length && score && score.value != null && score.value >= 55) {
      push("General outdoor time remains workable if you keep plans flexible.", "general");
    }

    if (!isBalancedInterests(interests) && items.length > 1) {
      items.sort(function (a, b) {
        var ia = opportunityKeyInterest(a.key);
        var ib = opportunityKeyInterest(b.key);
        var pa = ia != null ? interestPriorityIndex(ia, interests) : 50;
        var pb = ib != null ? interestPriorityIndex(ib, interests) : 50;
        /* Unmapped exploration items stay available but after matched ones. */
        if (ia == null) pa = 40 + String(a.key).length % 9;
        if (ib == null) pb = 40 + String(b.key).length % 9;
        if (pa !== pb) return pa - pb;
        return 0;
      });
    }

    return items.slice(0, 5).map(function (row) {
      return row.text;
    });
  }

  function composeWatchList(signals, score, activities) {
    var items = [];
    var seen = {};

    function push(text, key) {
      var c = calm(text);
      if (!c || seen[key || c]) return;
      seen[key || c] = true;
      items.push(c);
    }

    if (signals.alertCount > 0) {
      var titles = (signals.alertTitles || []).filter(Boolean);
      push(
        titles.length
          ? "Official alert" +
            (signals.alertCount > 1 ? "s" : "") +
            " nearby" +
            (titles[0] ? " (" + titles[0] + ")" : "") +
            " — read guidance before outdoor plans."
          : "Official weather alerts are active nearby — read those first.",
        "alerts"
      );
    }

    if (signals.precipProb != null && signals.precipProb >= 45) {
      push(
        "Rain chance near " +
          round(signals.precipProb) +
          "% — a light shell and flexible timing help.",
        "precip"
      );
    }

    if (signals.uv != null && signals.uv >= 7) {
      push("UV climbs toward " + round(signals.uv) + " midday — shade and cover matter more then.", "uv");
    }

    if (signals.feelsF != null && signals.feelsF >= 85) {
      push("Heat stress risk rises later — cooler morning hours are kinder for exertion.", "heat");
    } else if (signals.feelsF != null && signals.feelsF <= 28) {
      push("Cold exposure can shorten outings — layers and shorter loops help.", "cold");
    }

    if (signals.windMph != null && signals.windMph >= 22) {
      push(
        "Stronger wind near " +
          round(signals.windMph) +
          " mph — exposed ridges and open water will feel it first.",
        "wind"
      );
    }

    if (signals.aqi != null && signals.aqi > 100) {
      push(
        "Air quality is elevated (US AQI " +
          round(signals.aqi) +
          ") — ease prolonged exertion if you are sensitive.",
        "aqi"
      );
    }

    if (signals.humidity != null && signals.humidity >= 80 && signals.feelsF != null && signals.feelsF >= 70) {
      push("High humidity can make mild heat feel heavier on longer walks.", "humidity");
    }

    if (/flood|rapid|high|rise|rising|danger/.test(String(signals.riverTrend || ""))) {
      push(
        "Nearby gauge suggests elevated or rising flow — verify before water plans.",
        "river-watch"
      );
    }

    if (signals.moonIllumination != null && signals.moonIllumination > 70) {
      var astro = (activities || []).filter(function (a) {
        return a.id === "astronomy";
      })[0];
      if (astro && (astro.level === "Mixed" || astro.level === "Challenging")) {
        push("A brighter moon will wash fainter stars even if clouds cooperate.", "moon");
      }
    }

    if (!items.length && score && score.confidence === "Limited") {
      push("Some instruments are still thin — treat timing guidance as provisional.", "thin");
    }

    if (!items.length) {
      push("No major cautions stand out from the signals currently available.", "none");
    }

    return items.slice(0, 4);
  }

  /**
   * One observation a hurried glance might miss — always grounded in present signals.
   */
  function composeInteresting(signals, score, activities, windows, interests) {
    interests = normalizeInterestProfile(interests);
    if (!signals.weatherLive) {
      return calm("Once live weather arrives, look for the quiet detail that does not shout from the headline numbers.");
    }

    var candidates = [];

    function pushCandidate(text, interestIds) {
      var c = calm(text);
      if (!c) return;
      candidates.push({
        text: c,
        priority: bestMappedPriority(interestIds || [], interests)
      });
    }

    if (
      signals.feelsF != null &&
      signals.tempF != null &&
      Math.abs(signals.feelsF - signals.tempF) >= 4
    ) {
      pushCandidate(
        "It feels closer to " +
          round(signals.feelsF) +
          "°F than the " +
          round(signals.tempF) +
          "°F reading — that gap often shapes how long you want to stay out.",
        ["weather", "hiking", "general"]
      );
    }

    if (signals.humidity != null && signals.humidity >= 70 && signals.feelsF != null && signals.feelsF >= 65) {
      pushCandidate(
        "Humidity near " +
          round(signals.humidity) +
          "% can make the air feel heavier than the thermometer alone suggests.",
        ["weather", "gardening", "hiking"]
      );
    }

    if (signals.cloudPct != null && signals.cloudPct >= 35 && signals.cloudPct <= 65 && signals.uv != null && signals.uv >= 5) {
      pushCandidate(
        "Broken clouds with UV near " +
          round(signals.uv) +
          " can surprise you — shade comes and goes more than a clear or overcast day.",
        ["photography", "weather", "hiking"]
      );
    }

    if (signals.windMph != null && signals.windMph < 8) {
      var wildlife = (activities || []).filter(function (a) {
        return a.id === "wildlife" || a.id === "birding";
      })[0];
      if (wildlife && (wildlife.level === "Excellent" || wildlife.level === "Good" || wildlife.level === "Exceptional")) {
        pushCandidate(
          "With light wind, early sound carries farther — a small advantage for noticing birds and edge movement.",
          ["wildlife", "birding"]
        );
      }
    }

    if (signals.goldenHourEvening) {
      var gh = rangeStart(signals.goldenHourEvening);
      if (gh) {
        pushCandidate(
          "Golden hour begins around " +
            gh +
            " — color deepens quickly, and the best light often lasts less than an hour.",
          ["photography"]
        );
      }
    }

    if (
      signals.cloudPct != null &&
      signals.cloudPct <= 30 &&
      signals.moonIllumination != null &&
      signals.moonIllumination < 35
    ) {
      pushCandidate(
        "A dimmer moon under clearer skies is easy to overlook at breakfast — it quietly improves the night sky later.",
        ["astronomy"]
      );
    }

    if (signals.uv != null && signals.uv >= 7 && signals.feelsF != null && signals.feelsF < 75) {
      pushCandidate(
        "The air may feel mild while UV still runs high (" +
          round(signals.uv) +
          ") — sun strength is not the same as heat.",
        ["weather", "gardening", "hiking"]
      );
    }

    var hikeWin = (windows || []).filter(function (w) {
      return w.id === "hiking";
    })[0];
    if (hikeWin && hikeWin.precision === "range" && hikeWin.window) {
      pushCandidate(
        "Hourly cues currently lean toward " +
          hikeWin.window +
          " for trail time — still a guide, not an appointment.",
        ["hiking"]
      );
    }

    if (signals.riverLive && signals.riverNote && signals.riverTrend) {
      pushCandidate(
        "The " +
          signals.riverNote +
          " gauge currently reads " +
          String(signals.riverTrend) +
          " — a local detail that rarely shows up in a sky summary.",
        ["rivers", "fishing", "wildlife"]
      );
    }

    if (!candidates.length && score && score.value != null) {
      pushCandidate(
        "Outdoor Score " +
          score.display +
          " summarizes many quiet inputs — expanding Explain why shows which ones carried the most weight.",
        ["general", "weather"]
      );
    }

    if (!candidates.length) {
      return calm("Even ordinary days hide a detail worth noticing once you are outside.");
    }

    candidates.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return 0;
    });

    /* Prefer interest-aligned candidates; keep a deterministic exploration fallback. */
    var pool = candidates;
    if (!isBalancedInterests(interests)) {
      var matched = candidates.filter(function (c) {
        return c.priority < 999;
      });
      if (matched.length) pool = matched;
    }
    var idx = 0;
    if (signals.tempF != null) idx = Math.abs(round(signals.tempF)) % pool.length;
    else if (signals.cloudPct != null) idx = Math.abs(round(signals.cloudPct)) % pool.length;
    return calm(pool[idx].text);
  }

  /**
   * Compact Daily Brief — insight layer on top of calibrated Outdoor Intelligence.
   * Every statement is derived from present signals / score / activities / windows.
   */
  function composeDailyBrief(signals, score, activities, windows, interests) {
    signals = signals || {};
    interests = normalizeInterestProfile(interests);
    var outlook = composeOutlook(signals, score, interests);
    var opportunities = composeOpportunities(signals, score, activities, windows, interests);
    var watch = composeWatchList(signals, score, activities);
    var interesting = composeInteresting(signals, score, activities, windows, interests);
    var ready = !!signals.weatherLive;

    return {
      ready: ready,
      outlook: outlook,
      opportunities: opportunities,
      watch: watch,
      interesting: interesting,
      confidence: (score && score.confidence) || (ready ? "Moderate" : "Limited")
    };
  }

  /* ——— Discovery (RC3 Sprint 4) ———
   * Quiet naturalist layer beside Daily Brief. Cards appear only when signals
   * support them. Educational Moment rotates one topic per local day.
   * This Week Outside reports only meaningful near-term / multi-day changes
   * already present in the weather package — never invents a forecast.
   */

  function dayKey(now) {
    now = now || new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    return (
      String(y) +
      "-" +
      (m < 10 ? "0" : "") +
      m +
      "-" +
      (d < 10 ? "0" : "") +
      d
    );
  }

  function dayOfYear(now) {
    now = now || new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  }

  function wordCount(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function trimWords(text, max) {
    var parts = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length <= max) return parts.join(" ");
    return parts.slice(0, max).join(" ");
  }

  function activityById(activities, id) {
    return (activities || []).filter(function (a) {
      return a && a.id === id;
    })[0];
  }

  function seasonLabel(now) {
    var m = (now || new Date()).getMonth();
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    if (m >= 8 && m <= 10) return "autumn";
    return "winter";
  }

  function pushCard(cards, id, title, text, confidence) {
    var t = calm(text);
    if (!t || t.length < 18) return;
    cards.push({
      id: id,
      title: title,
      text: t,
      confidence: confidence || "Moderate"
    });
  }

  function composeSkyCard(signals) {
    if (!signals.weatherLive) return null;
    var bits = [];
    if (signals.conditions) bits.push(String(signals.conditions).toLowerCase());
    if (signals.cloudPct != null) {
      if (signals.cloudPct <= 25) bits.push("mostly clear overhead");
      else if (signals.cloudPct <= 60) bits.push("mixed cloud cover near " + round(signals.cloudPct) + "%");
      else bits.push("heavier cloud cover near " + round(signals.cloudPct) + "%");
    }
    if (signals.precipProb != null && signals.precipProb >= 35) {
      bits.push("precip chance near " + round(signals.precipProb) + "%");
    } else if (signals.precipProb != null && signals.precipProb < 20) {
      bits.push("little rain signal in the near outlook");
    }
    if (!bits.length) return null;
    return {
      text:
        "Sky reads " +
        bits[0] +
        (bits.length > 1 ? ", with " + bits.slice(1).join(" and ") : "") +
        ".",
      confidence: signals.cloudPct != null || signals.precipProb != null ? "High" : "Moderate"
    };
  }

  function composeNatureCard(signals, activities) {
    if (!signals.weatherLive) return null;
    var bird = activityById(activities, "birding");
    var wild = activityById(activities, "wildlife");
    var bits = [];
    if (signals.windMph != null && signals.windMph < 8) {
      bits.push("lighter air helps hearing birdsong and soft movement");
    } else if (signals.windMph != null && signals.windMph >= 18) {
      bits.push("breezier air can quiet birdsong on open ridges");
    }
    if (signals.sunrise) bits.push("wildlife often concentrates near sunrise (" + signals.sunrise + ")");
    if (
      bird &&
      (bird.level === "Excellent" || bird.level === "Exceptional" || bird.level === "Good")
    ) {
      bits.push("birding guidance looks workable from present signals");
    } else if (
      wild &&
      (wild.level === "Excellent" || wild.level === "Exceptional" || wild.level === "Good")
    ) {
      bits.push("wildlife windows look workable from present signals");
    }
    if (signals.humidity != null && signals.humidity >= 75) {
      bits.push("humid air can make scent and insects more noticeable");
    }
    if (!bits.length) return null;
    return {
      text: bits.slice(0, 2).join("; ") + ".",
      confidence: signals.sunrise || signals.windMph != null ? "Moderate" : "Limited"
    };
  }

  function composePhotographyCard(signals, activities, windows) {
    if (!signals.weatherLive) return null;
    if (signals.cloudPct == null && !signals.goldenHourEvening && !signals.goldenHour) {
      return null;
    }
    var photo = activityById(activities, "photography");
    var photoWin = (windows || []).filter(function (w) {
      return w.id === "photography";
    })[0];
    var bits = [];
    if (signals.goldenHourEvening) {
      bits.push("golden hour around " + signals.goldenHourEvening);
    }
    if (signals.cloudPct != null && signals.cloudPct >= 30 && signals.cloudPct <= 70) {
      bits.push("mixed clouds often soften contrast for unhurried frames");
    } else if (signals.cloudPct != null && signals.cloudPct <= 25) {
      bits.push("clearer skies mean stronger midday contrast and sharper shadows");
    }
    if (photoWin && photoWin.window) {
      bits.push(
        photoWin.precision === "range"
          ? "photo window near " + photoWin.window
          : "photo window leans " + String(photoWin.window).toLowerCase()
      );
    }
    if (!bits.length) return null;
    return {
      text: bits.slice(0, 2).join("; ") + ".",
      confidence: signals.goldenHourEvening || signals.cloudPct != null ? "Moderate" : "Limited"
    };
  }

  function composeAstronomyCard(signals, activities) {
    if (signals.cloudPct == null && signals.moonIllumination == null && !signals.moonPhase) {
      return null;
    }
    var bits = [];
    if (signals.cloudPct != null) {
      if (signals.cloudPct <= 30) bits.push("clearer skies favor stars later");
      else if (signals.cloudPct >= 70) bits.push("cloud cover will mute the night sky");
      else bits.push("mixed clouds may open and close the night sky");
    }
    if (signals.moonIllumination != null) {
      if (signals.moonIllumination > 70) {
        bits.push("a brighter moon (" + round(signals.moonIllumination) + "% lit) washes fainter stars");
      } else if (signals.moonIllumination < 40) {
        bits.push(
          "moon light is modest" +
            (signals.moonPhase ? " (" + signals.moonPhase + ")" : "") +
            " — darker sky helps"
        );
      } else if (signals.moonPhase) {
        bits.push("moon phase reads " + signals.moonPhase);
      }
    } else if (signals.moonPhase) {
      bits.push("moon phase reads " + signals.moonPhase);
    }
    if (!bits.length) return null;
    return {
      text: bits.slice(0, 2).join("; ") + ".",
      confidence:
        signals.cloudPct != null || signals.moonIllumination != null ? "Moderate" : "Limited"
    };
  }

  function composeSeasonalCard(signals) {
    if (!signals.weatherLive && signals.tempF == null) return null;
    var season = seasonLabel(signals.now);
    var doy = dayOfYear(signals.now);
    var variants = {
      spring: [
        "Spring light lengthens quickly — early walks catch cooler air before midday warmth.",
        "This stretch of spring often mixes cool mornings with softer afternoon light."
      ],
      summer: [
        "Midsummer days run long; shade and earlier starts usually feel kinder than peak heat.",
        "Summer light holds late — golden hour arrives after a long afternoon."
      ],
      autumn: [
        "Autumn days shorten; cooler air and lower sun angles change what stands out outdoors.",
        "Fall light arrives at a lower angle — surfaces and color often read more clearly."
      ],
      winter: [
        "Winter days stay short; low sun and cooler air shape what feels inviting outside.",
        "Winter light stays low — brief clear windows can feel especially useful."
      ]
    };
    var pool = variants[season] || variants.summer;
    var text = pool[doy % pool.length];
    if (signals.tempF != null) {
      text +=
        " Air is near " +
        round(signals.tempF) +
        "°F in the present reading.";
    }
    return { text: text, confidence: signals.weatherLive ? "Moderate" : "Limited" };
  }

  function composeWaterCard(signals) {
    if (!signals.riverLive) return null;
    var trend = String(signals.riverTrend || "").toLowerCase();
    var site = signals.riverNote || "a nearby gauge";
    var text;
    if (/flood|rapid|high|rise|rising|danger/.test(trend)) {
      text =
        site +
        " suggests elevated or rising flow — useful context before water plans, not a substitute for local judgment.";
    } else if (/fall|falling|low|normal|stable|steady/.test(trend)) {
      text =
        site +
        " reads " +
        (trend || "manageable") +
        " — helpful context before shoreline or fishing plans.";
    } else {
      text =
        "A nearby river gauge (" +
        site +
        ") is in this package — check it before water plans.";
    }
    return { text: text, confidence: trend ? "Moderate" : "Limited" };
  }

  function composeDiscoveryCards(signals, score, activities, windows) {
    signals = signals || {};
    var cards = [];
    var sky = composeSkyCard(signals);
    if (sky) pushCard(cards, "sky", "Sky Today", sky.text, sky.confidence);
    var nature = composeNatureCard(signals, activities);
    if (nature) pushCard(cards, "nature", "Nature Today", nature.text, nature.confidence);
    var seasonal = composeSeasonalCard(signals);
    if (seasonal) pushCard(cards, "seasonal", "Seasonal Notes", seasonal.text, seasonal.confidence);
    var photo = composePhotographyCard(signals, activities, windows);
    if (photo) pushCard(cards, "photography", "Photography Notes", photo.text, photo.confidence);
    var astro = composeAstronomyCard(signals, activities);
    if (astro) pushCard(cards, "astronomy", "Astronomy Notes", astro.text, astro.confidence);
    var water = composeWaterCard(signals);
    if (water) pushCard(cards, "water", "Water Notes", water.text, water.confidence);
    return cards;
  }

  /**
   * Educational Moment bank — each topic has multiple phrasings so consecutive
   * days never share identical wording when the same topic rotates back.
   * A topic is eligible only when its supporting signal is present.
   */
  var EDUCATIONAL_TOPICS = [
    {
      id: "humidity",
      eligible: function (s) {
        return s.humidity != null;
      },
      variants: [
        function (s) {
          return s.humidity >= 70
            ? "Higher humidity can make mild temperatures feel heavier on longer walks — pace and shade often matter more than the thermometer alone."
            : s.humidity <= 35
              ? "Drier air can feel crisp; skin and airways may notice it sooner than the temperature suggests."
              : "Humidity sits in a comfortable middle range today, so air usually feels close to what the thermometer implies.";
        },
        function (s) {
          return (
            "Relative humidity near " +
            round(s.humidity) +
            "% shapes how warm or cool a stroll feels — moisture in the air changes comfort without changing the reading on the dial."
          );
        },
        function (s) {
          return s.humidity >= 75
            ? "Very humid air holds heat and can quiet scent trails for wildlife; shorter loops often feel kinder."
            : "Moisture in the air is moderate — a useful quiet cue when noticing how conditions feel on skin.";
        }
      ]
    },
    {
      id: "clouds",
      eligible: function (s) {
        return s.cloudPct != null;
      },
      variants: [
        function (s) {
          return s.cloudPct >= 70
            ? "Heavy cloud cover softens midday light and can mute night-sky views — useful when planning photography or stargazing."
            : s.cloudPct <= 25
              ? "Clearer skies mean stronger sun and sharper shadows midday — even light often arrives earlier or later instead."
              : "Mixed clouds often give pleasant, even light for walking and noticing — contrast stays gentler than under hard sun.";
        },
        function (s) {
          return (
            "Cloud cover near " +
            round(s.cloudPct) +
            "% changes how color and texture read outdoors — a quiet cue for both walks and photographs."
          );
        },
        function (s) {
          return s.cloudPct >= 50
            ? "More cloud than clear usually softens highlights; look for openings if you want stronger directional light."
            : "Fewer clouds leave light more directional — shadows become part of what you notice.";
        }
      ]
    },
    {
      id: "wind",
      eligible: function (s) {
        return s.windMph != null;
      },
      variants: [
        function (s) {
          return s.windMph >= 18
            ? "Breezier air can quiet birdsong and make ridges feel cooler than the valley — listening often works better in sheltered edges."
            : "Lighter wind helps hearing wildlife and keeps open water calmer — a small advantage for unhurried noticing.";
        },
        function (s) {
          return (
            "Winds near " +
            round(s.windMph) +
            " mph change how sound carries and how warm a hillside feels compared with a sheltered hollow."
          );
        },
        function (s) {
          return s.windMph < 8
            ? "Still air lets soft sounds travel farther — a good day to pause and listen before moving on."
            : "Moving air reshapes comfort on open ground; leeward edges often feel different from the forecast number alone.";
        }
      ]
    },
    {
      id: "uv",
      eligible: function (s) {
        return s.uv != null;
      },
      variants: [
        function (s) {
          return s.uv >= 7
            ? "Higher UV builds toward midday — shade, cover, and shorter exposed stretches help even when air feels mild."
            : "UV is modest enough that shade is optional for many short outings, though midday still concentrates exposure.";
        },
        function (s) {
          return (
            "UV near " +
            round(s.uv) +
            " is a quiet midday factor — it rises with sun angle even when temperature feels comfortable."
          );
        },
        function (s) {
          return s.uv >= 6
            ? "Sun strength matters separately from heat; brief shade breaks keep longer walks more comfortable."
            : "Lower UV leaves more flexibility for open paths — still worth noticing as the sun climbs.";
        }
      ]
    },
    {
      id: "rivers",
      eligible: function (s) {
        return !!s.riverLive;
      },
      variants: [
        function (s) {
          return s.riverNote
            ? "A nearby gauge (" +
                s.riverNote +
                ") is in this package — useful context before water plans, not a substitute for local judgment."
            : "A nearby river gauge is in this package — useful context before shoreline or fishing plans.";
        },
        function (s) {
          return (
            "River readings change with recent rain upstream. " +
            (s.riverTrend
              ? "Present trend language reads “" + s.riverTrend + ".”"
              : "Check the gauge before committing to water edges.")
          );
        },
        function (s) {
          return (
            "Water notes here come from an actual gauge" +
            (s.riverNote ? " at " + s.riverNote : "") +
            " — treat them as context, then verify conditions where you stand."
          );
        }
      ]
    },
    {
      id: "moon",
      eligible: function (s) {
        return s.moonIllumination != null || !!s.moonPhase;
      },
      variants: [
        function (s) {
          return s.moonIllumination != null && s.moonIllumination > 70
            ? "A brighter moon washes fainter stars; planets and brighter landmarks still stand out when clouds allow."
            : s.moonIllumination != null && s.moonIllumination < 40
              ? "With modest moonlight, darker skies help faint stars — cloud gaps become the practical limit."
              : "Moon phase shapes night contrast" +
                (s.moonPhase ? " (" + s.moonPhase + ")" : "") +
                " — useful when deciding whether stargazing is worth a short wait.";
        },
        function (s) {
          return (
            "Night-sky noticing depends on both clouds and moonlight" +
            (s.moonIllumination != null
              ? " (about " + round(s.moonIllumination) + "% lit)"
              : "") +
            " — neither alone tells the whole story."
          );
        },
        function (s) {
          return s.moonPhase
            ? "Moon phase reads " + s.moonPhase + " — a calm cue for how bright the night ground will feel."
            : "Moonlight level changes what the eye can pick out after dark without inventing a forecast.";
        }
      ]
    },
    {
      id: "aqi",
      eligible: function (s) {
        return s.aqi != null;
      },
      variants: [
        function (s) {
          return s.aqi <= 50
            ? "Air quality looks clean on the US AQI scale — a quiet green light for longer outdoor time when other signals agree."
            : s.aqi > 100
              ? "Elevated US AQI suggests shorter or gentler outdoor plans for sensitive people — check official guidance if you notice irritation."
              : "Moderate air quality is present — sensitive people may prefer shorter loops or lower effort.";
        },
        function (s) {
          return (
            "US AQI near " +
            round(s.aqi) +
            " is an independent signal from temperature — useful when deciding how hard or how long to stay outside."
          );
        },
        function (s) {
          return s.aqiCategory
            ? "Air quality category reads “" +
                s.aqiCategory +
                "” — trust official sources if you have respiratory sensitivity."
            : "Air quality is part of today’s package so outdoor comfort is not judged by temperature alone.";
        }
      ]
    },
    {
      id: "golden",
      eligible: function (s) {
        return !!(s.goldenHourEvening || s.goldenHour);
      },
      variants: [
        function (s) {
          var gh = s.goldenHourEvening || s.goldenHour;
          return (
            "Golden hour around " +
            gh +
            " softens contrast and warms color — a practical window for unhurried looking or photographs."
          );
        },
        function (s) {
          var gh = s.goldenHourEvening || s.goldenHour;
          return (
            "Low sun near " +
            gh +
            " often makes textures and edges easier to notice than under harsh midday light."
          );
        },
        function (s) {
          return (
            "Evening golden light is timed in this package" +
            (s.goldenHourEvening ? " (" + s.goldenHourEvening + ")" : "") +
            " — a small, dependable cue when the day otherwise feels ordinary."
          );
        }
      ]
    },
    {
      id: "precip",
      eligible: function (s) {
        return s.precipProb != null;
      },
      variants: [
        function (s) {
          return s.precipProb >= 45
            ? "A precip chance near " +
                round(s.precipProb) +
                "% does not guarantee rain where you stand — it does invite flexible timing and a light layer."
            : s.precipProb < 20
              ? "Rain signal is low in the present outlook — still watch sky changes, since local cells can differ from the percentage."
              : "Precip chance near " +
                round(s.precipProb) +
                "% is a modest cue — useful for packing, not a reason to cancel curiosity.";
        },
        function (s) {
          return (
            "Precipitation probability near " +
            round(s.precipProb) +
            "% is a planning cue, not a promise — short outdoor windows often still work between showers."
          );
        },
        function (s) {
          return s.precipProb >= 60
            ? "Elevated rain chances favor shorter loops and covered pauses rather than long exposed stretches."
            : "Lower rain odds leave more room for open paths — keep an eye on cloud motion anyway.";
        }
      ]
    }
  ];

  function composeEducationalMoment(signals, score, activities, interests) {
    signals = signals || {};
    interests = normalizeInterestProfile(interests);
    var eligible = EDUCATIONAL_TOPICS.filter(function (topic) {
      return topic.eligible(signals);
    });
    if (!eligible.length) {
      return {
        ready: false,
        topic: null,
        title: "Educational Moment",
        text: null,
        dayKey: dayKey(signals.now),
        wordCount: 0
      };
    }
    var doy = dayOfYear(signals.now);
    var preferred = [];
    if (!isBalancedInterests(interests)) {
      interests.forEach(function (interest) {
        (INTEREST_EDU_MAP[interest] || []).forEach(function (topicId) {
          eligible.forEach(function (topic) {
            if (topic.id === topicId && preferred.indexOf(topic) < 0) preferred.push(topic);
          });
        });
      });
    }
    var pool = preferred.length ? preferred : eligible;
    var topic = pool[doy % pool.length];
    var variantFn = topic.variants[doy % topic.variants.length];
    /* Offset variant by topic index so the same day+topic never collides with another topic’s wording. */
    var alt = topic.variants[(doy + topic.id.length) % topic.variants.length];
    var raw = calm((variantFn || alt)(signals, score, activities));
    if (!raw) raw = calm(alt(signals, score, activities));
    var text = trimWords(raw, 74);
    if (wordCount(text) > 75) text = trimWords(text, 75);
    return {
      ready: !!text,
      topic: topic.id,
      title: "Educational Moment",
      text: text || null,
      dayKey: dayKey(signals.now),
      wordCount: wordCount(text)
    };
  }

  function hourlyTrendNotes(signals) {
    var hourly = signals.hourly || [];
    if (hourly.length < 4) return [];
    var notes = [];
    var first = hourly[0];
    var mid = hourly[Math.min(hourly.length - 1, 6)];
    var later = hourly[Math.min(hourly.length - 1, 18)];
    var p0 = first && first.precipitation ? num(first.precipitation.probability) : null;
    var p1 = later && later.precipitation ? num(later.precipitation.probability) : null;
    if (p0 != null && p1 != null && p1 - p0 >= 25) {
      notes.push("Rain chances look higher later in the available hourly window.");
    } else if (p0 != null && p1 != null && p0 - p1 >= 25) {
      notes.push("Rain chances look lower later in the available hourly window.");
    }
    var t0 = first ? num(first.temperature) != null ? num(first.temperature) : num(first.feelsLike) : null;
    var t1 = mid ? num(mid.temperature) != null ? num(mid.temperature) : num(mid.feelsLike) : null;
    if (t0 != null && t1 != null && t1 - t0 >= 8) {
      notes.push("Temperatures trend warmer through the next several forecast hours.");
    } else if (t0 != null && t1 != null && t0 - t1 >= 8) {
      notes.push("Temperatures trend cooler through the next several forecast hours.");
    }
    var c0 = first ? num(first.cloudCover) : null;
    var c1 = later ? num(later.cloudCover) : null;
    if (c0 != null && c1 != null && c0 - c1 >= 25) {
      notes.push("Cloud cover looks like it may thin later in the hourly coverage.");
    } else if (c0 != null && c1 != null && c1 - c0 >= 25) {
      notes.push("Cloud cover looks like it may build later in the hourly coverage.");
    }
    return notes;
  }

  function dailyTrendNotes(signals) {
    var rows = signals.dailyRows || [];
    if (rows.length < 2) return [];
    var notes = [];
    var today = rows[0];
    var next = rows[1];
    var weekend = rows[Math.min(rows.length - 1, 2)];
    if (today.tempMax != null && next.tempMax != null && next.tempMax - today.tempMax >= 6) {
      notes.push("Tomorrow looks warmer at the daily high than today.");
    } else if (today.tempMax != null && next.tempMax != null && today.tempMax - next.tempMax >= 6) {
      notes.push("Tomorrow looks cooler at the daily high than today.");
    }
    if (today.precipProb != null && next.precipProb != null && next.precipProb - today.precipProb >= 25) {
      notes.push("Tomorrow carries a meaningfully higher precip chance than today.");
    } else if (
      today.precipProb != null &&
      next.precipProb != null &&
      today.precipProb - next.precipProb >= 25
    ) {
      notes.push("Tomorrow looks drier than today’s precip chance.");
    }
    if (
      weekend &&
      weekend !== next &&
      today.tempMax != null &&
      weekend.tempMax != null &&
      Math.abs(weekend.tempMax - today.tempMax) >= 8
    ) {
      notes.push(
        weekend.tempMax > today.tempMax
          ? "Later in the multi-day package trends warmer than today."
          : "Later in the multi-day package trends cooler than today."
      );
    }
    return notes;
  }

  function composeThisWeekOutside(signals, score) {
    signals = signals || {};
    var changes = [];
    hourlyTrendNotes(signals).forEach(function (n) {
      var c = calm(n);
      if (c && changes.indexOf(c) < 0) changes.push(c);
    });
    dailyTrendNotes(signals).forEach(function (n) {
      var c = calm(n);
      if (c && changes.indexOf(c) < 0) changes.push(c);
    });
    changes = changes.slice(0, 3);

    var season = seasonLabel(signals.now);
    var summary = null;
    if (changes.length) {
      summary =
        "Near-term changes stand out from the forecast hours already in this package — only shifts large enough to notice are listed.";
    } else if (signals.weatherLive && (signals.hourly || []).length >= 4) {
      summary =
        "Available hourly coverage does not show a large swing in temperature, clouds, or precip — conditions look comparatively steady.";
    } else if ((signals.dailyRows || []).length >= 2) {
      summary =
        "The multi-day package does not show a large day-to-day swing worth calling out yet.";
    } else if (signals.weatherLive) {
      summary =
        "Weekly detail is limited in this load — seasonal rhythm for " +
        season +
        " still shapes daylight and outdoor pacing.";
    } else {
      return {
        ready: false,
        title: "This Week Outside",
        summary: null,
        changes: []
      };
    }

    return {
      ready: true,
      title: "This Week Outside",
      summary: calm(summary),
      changes: changes,
      confidence: changes.length
        ? (signals.dailyRows || []).length >= 2 || (signals.hourly || []).length >= 12
          ? "Moderate"
          : "Limited"
        : "Limited"
    };
  }

  /**
   * Discovery pack — complements Daily Brief; never replaces it.
   * Interests reorder cards; unsupported cards stay omitted (never invented).
   */
  function composeDiscovery(signals, score, activities, windows, dailyBrief, interests) {
    signals = signals || {};
    interests = normalizeInterestProfile(interests);
    var cards = prioritizeDiscoveryCards(
      composeDiscoveryCards(signals, score, activities, windows),
      interests
    );
    var educationalMoment = composeEducationalMoment(signals, score, activities, interests);
    var thisWeekOutside = composeThisWeekOutside(signals, score);
    var ready = !!signals.weatherLive && (cards.length > 0 || !!(educationalMoment && educationalMoment.ready));

    return {
      ready: ready,
      cards: cards,
      educationalMoment: educationalMoment,
      thisWeekOutside: thisWeekOutside,
      confidence: (score && score.confidence) || (signals.weatherLive ? "Moderate" : "Limited"),
      /* dailyBrief passed for callers/tests — Discovery must not duplicate Brief prose. */
      briefInteresting: dailyBrief && dailyBrief.interesting ? dailyBrief.interesting : null
    };
  }

  function composeSummaryLines(signals, score, activities, windows) {
    var lines = [];
    if (!signals.weatherLive) {
      return [
        "Summary settling as place and weather arrive.",
        "Conditions will appear here.",
        "Light and air settle independently."
      ];
    }

    if (signals.tempF != null && signals.conditions) {
      lines.push(round(signals.tempF) + "°F under " + String(signals.conditions).toLowerCase() + ".");
    } else if (signals.tempF != null) {
      lines.push("Air near " + round(signals.tempF) + "°F.");
    }

    if (score && score.value != null) {
      lines.push(
        "Outdoor Score " + score.value + " — " + String(score.label).toLowerCase() + " overall."
      );
    }

    if (signals.precipProb != null && signals.precipProb >= 40) {
      lines.push("Rain chance near " + round(signals.precipProb) + "%.");
    } else if (signals.windMph != null && signals.windMph >= 15) {
      lines.push("Breezes near " + round(signals.windMph) + " mph.");
    } else if (signals.windMph != null && signals.windMph < 8) {
      lines.push("Winds stay light.");
    }

    if (signals.aqiCategory) {
      lines.push("Air quality: " + String(signals.aqiCategory).toLowerCase() + ".");
    } else if (signals.aqi != null) {
      lines.push("US AQI " + round(signals.aqi) + ".");
    }

    if (signals.uv != null && signals.uv >= 6) {
      lines.push("UV near " + round(signals.uv) + " toward midday.");
    }

    if (signals.alertCount > 0) {
      lines.push(
        signals.alertCount === 1
          ? "One weather alert is active — check official guidance."
          : signals.alertCount + " weather alerts are active — check official guidance."
      );
    }

    var hikeWin = (windows || []).filter(function (w) {
      return w.id === "hiking";
    })[0];
    if (hikeWin && hikeWin.window) {
      lines.push(
        hikeWin.precision === "range"
          ? "Trail window around " + hikeWin.window + "."
          : "Trail window leans " + String(hikeWin.window).toLowerCase() + "."
      );
    }

    var photo = (activities || []).filter(function (a) {
      return a.id === "photography";
    })[0];
    if (photo && (photo.level === "Exceptional" || photo.level === "Excellent" || photo.level === "Good")) {
      lines.push("Light favors photography.");
    }

    var astro = (activities || []).filter(function (a) {
      return a.id === "astronomy";
    })[0];
    if (astro && signals.cloudPct != null) {
      if (signals.cloudPct <= 30) lines.push("Clearer skies favor stars later.");
      else if (signals.cloudPct >= 70) lines.push("Clouds will mute the night sky.");
    }

    if (signals.goldenHourEvening) {
      var gh = rangeStart(signals.goldenHourEvening);
      if (gh) lines.push("Golden hour from " + gh + ".");
    }

    if (signals.riverLive && signals.riverTrend) {
      lines.push(
        "River gauge " +
          String(signals.riverTrend) +
          (signals.riverNote ? " (" + signals.riverNote + ")" : "") +
          "."
      );
    }

    var clean = [];
    lines.forEach(function (line) {
      var c = calm(line);
      if (!c) return;
      if (clean.indexOf(c) >= 0) return;
      clean.push(c);
    });
    return clean.slice(0, 8);
  }

  function buildExplanation(signals, score, activities, windows, take) {
    var contributing = (score && score.factors ? score.factors : []).map(function (f) {
      return {
        factor: f.id,
        label: f.label || FACTOR_LABELS[f.id] || f.id,
        weightShare: f.weightShare,
        score: f.score,
        note: f.note
      };
    });
    var missing = (score && score.missing) || [];
    var activityTop = (activities || []).slice(0, 4).map(function (a) {
      return {
        id: a.id,
        level: a.level,
        confidence: a.confidence,
        explanation: a.explanation,
        bestWindow: a.bestWindow
      };
    });

    var educational = [];
    if (signals) {
      if (signals.humidity != null) {
        educational.push({
          id: "humidity",
          label: "Humidity",
          text:
            signals.humidity >= 70
              ? "Higher humidity can make mild temperatures feel heavier on longer walks."
              : signals.humidity <= 35
                ? "Drier air can feel crisp; skin and airways may notice it sooner."
                : "Humidity is in a comfortable middle range for most unhurried outings."
        });
      }
      if (signals.cloudPct != null) {
        educational.push({
          id: "clouds",
          label: "Cloud cover",
          text:
            signals.cloudPct >= 70
              ? "Heavy cloud cover softens light and can mute night-sky views."
              : signals.cloudPct <= 25
                ? "Clearer skies mean stronger sun and sharper shadows midday."
                : "Mixed clouds often give pleasant, even light for walking and noticing."
        });
      }
      if (signals.windMph != null) {
        educational.push({
          id: "wind",
          label: "Wind",
          text:
            signals.windMph >= 18
              ? "Breezier air can quiet birdsong and make ridges feel cooler than the valley."
              : "Lighter wind helps hearing wildlife and keeps open water calmer."
        });
      }
      if (signals.uv != null) {
        educational.push({
          id: "uv",
          label: "UV",
          text:
            signals.uv >= 7
              ? "Higher UV builds toward midday — shade, cover, and shorter exposed stretches help."
              : "UV is modest enough that shade is optional for many short outings."
        });
      }
      if (signals.riverLive) {
        educational.push({
          id: "rivers",
          label: "Rivers",
          text: signals.riverNote
            ? "A nearby gauge (" +
              signals.riverNote +
              ") is in this package — useful context before water plans, not a substitute for local judgment."
            : "A nearby river gauge is in this package — useful context before water plans."
        });
      }
    }

    var confReasons =
      (score && score.confidenceReasons) ||
      [];

    return {
      title: "Explain why",
      confidence: (score && score.confidence) || "Limited",
      confidenceReasons: confReasons,
      summary:
        (score && score.summary) ||
        "Guidance uses only the signals present in this load — missing inputs are listed, not invented.",
      contributing: contributing,
      educational: educational.slice(0, 5),
      missing: missing,
      weights: SCORE_WEIGHTS,
      activities: activityTop,
      windows: (windows || []).map(function (w) {
        return {
          id: w.id,
          window: w.window,
          confidence: w.confidence,
          precision: w.precision,
          source: w.source
        };
      }),
      takeConfidence: take && take.confidence,
      inputs: {
        weatherLive: !!(signals && signals.weatherLive),
        fromCache: !!(signals && signals.fromCache),
        tempF: signals && signals.tempF,
        precipProb: signals && signals.precipProb,
        windMph: signals && signals.windMph,
        humidity: signals && signals.humidity,
        cloudPct: signals && signals.cloudPct,
        uv: signals && signals.uv,
        aqi: signals && signals.aqi,
        alertCount: signals && signals.alertCount,
        riverLive: signals && signals.riverLive,
        hourlyCount: signals && signals.hourly ? signals.hourly.length : 0
      }
    };
  }

  /**
   * Mark alerts feed as known when platform includes an alerts object
   * (even empty), so zero alerts can raise the alerts factor.
   */
  function normalizeSignals(platform, now) {
    var s = extractSignals(platform, now);
    if (platform && platform.alerts != null) s._alertsKnown = true;
    return s;
  }

  function generate(platform, options) {
    options = options || {};
    var now = options.now ? new Date(options.now) : new Date();
    var interests = normalizeInterestProfile(options.interests);
    var signals = normalizeSignals(platform, now);
    var score = computeOutdoorScore(signals);
    var activities = recommendActivities(signals);
    var windows = bestTimeWindows(signals);
    activities = attachActivityWindows(activities, windows);
    activities = prioritizeActivities(activities, interests);
    windows = prioritizeWindows(windows, interests);
    var dailyBrief = composeDailyBrief(signals, score, activities, windows, interests);
    var take = waypointTake(signals, score, activities, dailyBrief, interests);
    dailyBrief.take = take;
    var discovery = composeDiscovery(signals, score, activities, windows, dailyBrief, interests);
    var lines = composeSummaryLines(signals, score, activities, windows);
    var explanation = buildExplanation(signals, score, activities, windows, take);

    return {
      version: VERSION,
      ready: !!signals.weatherLive,
      lines: lines,
      score: score,
      activities: activities,
      windows: windows,
      dailyBrief: dailyBrief,
      discovery: discovery,
      take: take,
      explanation: explanation,
      confidence: score.confidence,
      interests: interests.slice(),
      personalization: {
        interests: interests.slice(),
        balanced: isBalancedInterests(interests)
      },
      signals: {
        weatherLive: signals.weatherLive,
        fromCache: signals.fromCache,
        tempF: signals.tempF,
        precipProb: signals.precipProb,
        windMph: signals.windMph,
        aqi: signals.aqi,
        uv: signals.uv,
        alertCount: signals.alertCount,
        riverLive: signals.riverLive,
        hourlyCount: signals.hourly ? signals.hourly.length : 0,
        dailyCount: signals.dailyRows ? signals.dailyRows.length : 0
      }
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildIntelligence = {
    version: VERSION,
    SCORE_WEIGHTS: SCORE_WEIGHTS,
    FACTOR_LABELS: FACTOR_LABELS,
    ACTIVITY_IDS: ACTIVITY_IDS.slice(),
    ACTIVITY_ICONS: ACTIVITY_ICONS,
    LEVELS: LEVELS.slice(),
    CONFIDENCE: CONFIDENCE.slice(),
    INTEREST_IDS: INTEREST_IDS.slice(),
    INTEREST_LABELS: INTEREST_LABELS,
    DEFAULT_INTERESTS: DEFAULT_INTERESTS.slice(),
    extractSignals: extractSignals,
    computeOutdoorScore: computeOutdoorScore,
    recommendActivities: recommendActivities,
    bestTimeWindows: bestTimeWindows,
    composeDailyBrief: composeDailyBrief,
    composeDiscovery: composeDiscovery,
    composeEducationalMoment: composeEducationalMoment,
    composeThisWeekOutside: composeThisWeekOutside,
    waypointTake: waypointTake,
    composeSummaryLines: composeSummaryLines,
    buildExplanation: buildExplanation,
    normalizeInterestProfile: normalizeInterestProfile,
    prioritizeActivities: prioritizeActivities,
    prioritizeWindows: prioritizeWindows,
    prioritizeDiscoveryCards: prioritizeDiscoveryCards,
    generate: generate,
    levelFromScore: levelFromScore,
    hourBand: hourBand,
    formatClockRange: formatClockRange,
    dayKey: dayKey,
    dayOfYear: dayOfYear,
    wordCount: wordCount
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global);
