/**
 * Dashboard Rebuild RC3 — Outdoor Intelligence Engine (v1).
 * Pure, deterministic interpretation of OIP platform data for Today Outside.
 * Never fabricates live numbers; missing inputs lower confidence and redistribute weights.
 *
 * Algorithm authority: docs/rebuild-2026/dashboard-rc3-sprint1-owner-review.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-rc3-s1";
  var LEVELS = ["Excellent", "Good", "Fair", "Poor"];
  var CONFIDENCE = ["High", "Moderate", "Limited"];

  /**
   * Outdoor Score factor weights (sum = 100 when all present).
   * Missing factors are dropped and remaining weights renormalized.
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

  var WINDOW_IDS = ["hiking", "photography", "wildlife", "stargazing"];

  var BANNED =
    /\bperfect\b|\bamazing\b|\bepic\b|\bmust[- ]see\b|don['’]t miss|you should definitely|homework|assignment|go now|do this\b/i;

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

  function levelFromScore(score) {
    if (score == null) return "Fair";
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Poor";
  }

  function confidenceLabel(key) {
    if (key === "high") return "High";
    if (key === "moderate") return "Moderate";
    return "Limited";
  }

  function hourBand(hr) {
    if (hr == null || !isFinite(hr)) return null;
    if (hr < 8) return "early morning";
    if (hr < 11) return "through late morning";
    if (hr < 12) return "before noon";
    if (hr < 14) return "early afternoon";
    if (hr < 16) return "early afternoon";
    if (hr < 17) return "after 4 PM";
    if (hr < 19) return "near sunset";
    if (hr < 21) return "near sunset";
    return "this evening";
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

    return {
      now: now,
      weatherLive: weatherLive,
      fromCache: !!(platform && platform.meta && platform.meta.fromCache),
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
      hourly: (wx && Array.isArray(wx.hourly) ? wx.hourly : []).slice(0, 48)
    };
  }

  function factorScoreTemperature(s) {
    var t = s.feelsF != null ? s.feelsF : s.tempF;
    if (t == null) return null;
    if (t >= 55 && t <= 72) return { score: 96, note: "Comfortable air temperatures" };
    if (t >= 48 && t <= 78) return { score: 84, note: "Mild outdoor temperatures" };
    if (t >= 38 && t <= 85) return { score: 68, note: "Workable with layers or shade" };
    if (t >= 28 && t <= 90) return { score: 48, note: "Hot or cold enough to shorten outings" };
    return { score: 28, note: "Extreme heat or cold limits outdoor time" };
  }

  function factorScorePrecip(s) {
    var p = s.precipProb;
    var cond = String(s.conditions || "").toLowerCase();
    if (/thunder|lightning|storm/.test(cond)) {
      return { score: 18, note: "Storm language in current conditions" };
    }
    if (p == null && !cond) return null;
    if (p == null) {
      if (/rain|shower|drizzle/.test(cond)) return { score: 42, note: "Precipitation in the sky summary" };
      return { score: 78, note: "No strong rain signal in the sky summary" };
    }
    if (p < 15) return { score: 95, note: "Low precip chance (" + round(p) + "%)" };
    if (p < 35) return { score: 78, note: "Modest precip chance (" + round(p) + "%)" };
    if (p < 55) return { score: 55, note: "Precip chance near " + round(p) + "%" };
    if (p < 75) return { score: 35, note: "Elevated precip chance (" + round(p) + "%)" };
    return { score: 18, note: "High precip chance (" + round(p) + "%)" };
  }

  function factorScoreWind(s) {
    if (s.windMph == null) return null;
    var w = s.windMph;
    if (w < 8) return { score: 94, note: "Light winds" };
    if (w < 15) return { score: 78, note: "Moderate breeze (" + round(w) + " mph)" };
    if (w < 22) return { score: 55, note: "Breezy (" + round(w) + " mph)" };
    if (w < 30) return { score: 35, note: "Strong wind (" + round(w) + " mph)" };
    return { score: 18, note: "Very strong wind (" + round(w) + " mph)" };
  }

  function factorScoreHumidity(s) {
    if (s.humidity == null) return null;
    var h = s.humidity;
    if (h >= 35 && h <= 65) return { score: 92, note: "Comfortable humidity" };
    if (h < 35) return { score: 72, note: "Dry air (" + round(h) + "%)" };
    if (h <= 80) return { score: 62, note: "Humid air (" + round(h) + "%)" };
    return { score: 40, note: "Very humid (" + round(h) + "%)" };
  }

  function factorScoreClouds(s) {
    if (s.cloudPct == null) return null;
    var c = s.cloudPct;
    /* Neutral-friendly: mixed clouds often pleasant; extremes slightly lower. */
    if (c >= 25 && c <= 70) return { score: 88, note: "Mixed cloud cover" };
    if (c < 25) return { score: 80, note: "Mostly clear skies" };
    if (c < 85) return { score: 70, note: "Mostly cloudy" };
    return { score: 55, note: "Heavy cloud cover" };
  }

  function factorScoreUv(s) {
    if (s.uv == null) return null;
    var u = s.uv;
    if (u < 3) return { score: 90, note: "Low UV (" + round(u) + ")" };
    if (u < 6) return { score: 78, note: "Moderate UV (" + round(u) + ")" };
    if (u < 8) return { score: 58, note: "High UV (" + round(u) + ") — shade helps midday" };
    if (u < 11) return { score: 40, note: "Very high UV (" + round(u) + ")" };
    return { score: 25, note: "Extreme UV (" + round(u) + ")" };
  }

  function factorScoreAqi(s) {
    if (s.aqi == null) return null;
    var a = s.aqi;
    if (a <= 50) return { score: 95, note: "Good air quality (US AQI " + round(a) + ")" };
    if (a <= 100) return { score: 72, note: "Moderate air quality (US AQI " + round(a) + ")" };
    if (a <= 150) return { score: 45, note: "Unhealthy for sensitive groups (US AQI " + round(a) + ")" };
    if (a <= 200) return { score: 25, note: "Unhealthy air (US AQI " + round(a) + ")" };
    return { score: 12, note: "Very unhealthy air (US AQI " + round(a) + ")" };
  }

  function factorScoreAlerts(s) {
    if (s.alertCount == null) return null;
    /* Explicit zero is informative when alerts feed is present; unknown stays null. */
    if (s.alertCount === 0 && s._alertsKnown) {
      return { score: 96, note: "No active weather alerts" };
    }
    if (s.alertCount === 0) return null;
    if (s.alertCount === 1) return { score: 28, note: "One active alert — read official guidance" };
    return { score: 12, note: s.alertCount + " active alerts — prioritize official guidance" };
  }

  function factorScoreRivers(s) {
    if (!s.riverLive) return null;
    var t = String(s.riverTrend || "");
    if (/flood|rapid|high|rise|rising|danger/.test(t)) {
      return { score: 22, note: "Nearby gauge suggests elevated or rising flow" };
    }
    if (/fall|falling|low|normal|stable|steady/.test(t)) {
      return { score: 82, note: "Nearby gauge reads manageable (" + (s.riverNote || "local site") + ")" };
    }
    return { score: 65, note: "River gauge available — check locally before water plans" };
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

  /**
   * Outdoor Score 0–100 from weighted factors. Documents each contribution.
   */
  function computeOutdoorScore(signals) {
    signals = signals || {};
    var factors = [];
    var weightSum = 0;
    var weighted = 0;
    var missing = [];

    Object.keys(SCORE_WEIGHTS).forEach(function (key) {
      var fn = FACTOR_FNS[key];
      var result = fn ? fn(signals) : null;
      var weight = SCORE_WEIGHTS[key];
      if (!result || result.score == null) {
        missing.push(key);
        return;
      }
      factors.push({
        id: key,
        weight: weight,
        score: clamp(result.score, 0, 100),
        note: result.note
      });
      weightSum += weight;
      weighted += result.score * weight;
    });

    if (!weightSum || !factors.length) {
      return {
        value: null,
        display: "—",
        label: "Unavailable",
        confidence: "Limited",
        factors: [],
        missing: missing.slice(),
        algorithm: SCORE_WEIGHTS,
        summary: "Outdoor Score needs live weather before it can settle."
      };
    }

    var value = round(weighted / weightSum);
    var presentCount = factors.length;
    var totalKeys = Object.keys(SCORE_WEIGHTS).length;
    var conf = "High";
    if (presentCount < 4 || !signals.weatherLive) conf = "Limited";
    else if (presentCount < 6 || signals.fromCache || missing.indexOf("aqi") >= 0) conf = "Moderate";

    return {
      value: value,
      display: String(value) + "/100",
      label: levelFromScore(value),
      confidence: conf,
      factors: factors.map(function (f) {
        return {
          id: f.id,
          weight: f.weight,
          weightShare: round((f.weight / weightSum) * 100),
          score: f.score,
          note: f.note
        };
      }),
      missing: missing,
      algorithm: SCORE_WEIGHTS,
      summary:
        conf === "Limited"
          ? "Score is provisional — several inputs are still settling."
          : "Weighted from available weather, air, UV, and alert signals."
    };
  }

  function activityBase(signals) {
    var score = 72;
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
      notes.push("Comfortable temperatures");
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

  function tuneActivity(id, signals, base) {
    var score = base.score;
    var notes = base.notes.slice();
    var limits = base.limits.slice();
    var available = true;
    var confKey = signals.weatherLive ? (signals.fromCache ? "moderate" : "high") : "limited";

    if (id === "photography") {
      if (signals.cloudPct != null && signals.cloudPct >= 35 && signals.cloudPct <= 80) {
        score += 12;
        notes.push("Soft, diffuse light likely");
      } else if (signals.cloudPct != null && signals.cloudPct < 20) {
        score -= 6;
        notes.push("Hard midday contrast on clear skies");
      }
      if (signals.goldenHourEvening || signals.goldenHour) {
        score += 8;
        notes.push("Golden hour window available");
      }
      if (/fog|mist/.test(String(signals.conditions || "").toLowerCase())) {
        score += 14;
        notes.push("Fog softens woodland and water scenes");
      }
    }

    if (id === "birding" || id === "wildlife") {
      if (signals.windMph != null && signals.windMph < 10) {
        score += 10;
        notes.push("Calm air helps hearing and movement cues");
      }
      if (signals.sunrise) notes.push("Activity often peaks near sunrise");
      if (signals.precipProb != null && signals.precipProb >= 50) {
        score -= 8;
        limits.push("Rain may quiet wildlife");
      }
      if (signals.feelsF != null && signals.feelsF >= 40 && signals.feelsF <= 78) score += 6;
    }

    if (id === "hiking") {
      if (signals.feelsF != null && signals.feelsF >= 45 && signals.feelsF <= 72) {
        score += 10;
        notes.push("Mild trail temperatures");
      }
      if (signals.windMph != null && signals.windMph >= 22) {
        score -= 10;
        limits.push("Exposed ridges may feel windier");
      }
    }

    if (id === "trailRunning") {
      if (signals.feelsF != null && signals.feelsF >= 40 && signals.feelsF <= 68) {
        score += 10;
        notes.push("Cooler air favors exertion");
      }
      if (signals.feelsF != null && signals.feelsF >= 82) {
        score -= 14;
        limits.push("Heat raises exertion stress");
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
        notes.push("Gauge data available" + (signals.riverNote ? " (" + signals.riverNote + ")" : ""));
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
        notes.push("Workable outdoor temperatures");
      }
      if (signals.precipProb != null && signals.precipProb >= 50) {
        score -= 10;
        limits.push("Rain may interrupt yard work");
      }
      if (signals.uv != null && signals.uv >= 8) {
        score -= 6;
        notes.push("High UV — shade breaks help");
      }
    }

    if (id === "camping") {
      if (signals.precipProb != null && signals.precipProb < 30 && signals.feelsF != null && signals.feelsF >= 45 && signals.feelsF <= 78) {
        score += 10;
        notes.push("Dry, mild overnight setup looks reasonable");
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
        notes.push("Clearer skies favor stars");
      } else if (signals.cloudPct != null && signals.cloudPct >= 70) {
        score -= 22;
        limits.push("Clouds will limit the night sky");
      }
      if (signals.moonIllumination != null && signals.moonIllumination > 70) {
        score -= 12;
        limits.push("Bright moon washes faint stars");
      } else if (signals.moonIllumination != null && signals.moonIllumination < 40) {
        score += 8;
        notes.push("Lower moon brightness helps dark-sky views");
      }
      if (signals.cloudPct == null && signals.moonIllumination == null) confKey = "limited";
    }

    if (id === "generalOutdoor") {
      if (signals.feelsF != null && signals.feelsF >= 50 && signals.feelsF <= 78) {
        score += 8;
        notes.push("Pleasant for unhurried outdoor time");
      }
    }

    score = clamp(score, 5, 98);
    var level = levelFromScore(score);
    if (!signals.weatherLive) {
      level = "Fair";
      confKey = "limited";
      limits = limits.length ? limits : ["Live weather not available yet"];
    }

    var explanation =
      notes[0] ||
      limits[0] ||
      (available ? "Based on current weather and air signals" : "Waiting on supporting data");

    return {
      id: id,
      label: ACTIVITY_LABELS[id] || id,
      level: level,
      score: score,
      confidence: confidenceLabel(confKey),
      explanation: calm(explanation) || "Based on available conditions",
      notes: notes.slice(0, 3).map(calm).filter(Boolean),
      limits: limits.slice(0, 3).map(calm).filter(Boolean),
      available: available,
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
      /* Prefer dawn/dusk hours when time known */
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

  function practicalFromHourly(id, signals) {
    var hourly = signals.hourly || [];
    if (!hourly.length) return null;
    var nowMs = signals.now ? signals.now.getTime() : Date.now();
    var best = null;
    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t || isNaN(t.getTime())) return;
      if (t.getTime() < nowMs - 600000) return;
      if (t.getTime() > nowMs + 36 * 3600000) return;
      var localHour = t.getHours();
      var row = {
        time: h.time,
        precipitation: h.precipitation,
        wind: h.wind,
        cloudCover: h.cloudCover,
        feelsLike: h.feelsLike,
        temperature: h.temperature,
        _localHour: localHour
      };
      var sc = hourlyScoreFor(id, row, signals);
      if (!best || sc > best.score) {
        best = { score: sc, hour: localHour, time: t };
      }
    });
    if (!best) return null;
    return {
      band: hourBand(best.hour),
      confidence: hourly.length >= 6 ? "Moderate" : "Limited",
      source: "hourly"
    };
  }

  function fallbackWindow(id, signals) {
    if (id === "photography") {
      var gh = rangeStart(signals.goldenHourEvening) || signals.goldenHour;
      if (gh) {
        var phr = parseClockHour(gh);
        return {
          band: phr != null ? hourBand(phr) : "near sunset",
          confidence: "Moderate",
          source: "daylight",
          detail: calm("Golden hour softens color and shadow.")
        };
      }
      return {
        band: "near sunset",
        confidence: "Limited",
        source: "heuristic",
        detail: calm("Without hourly light data, late-day light is the usual photography window.")
      };
    }
    if (id === "wildlife") {
      return {
        band: signals.sunrise ? "early morning" : "early morning",
        confidence: signals.sunrise ? "Moderate" : "Limited",
        source: signals.sunrise ? "daylight" : "heuristic",
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
        band: signals.sunset ? "this evening" : "this evening",
        confidence: conf,
        source: signals.cloudPct != null ? "conditions" : "heuristic",
        detail: calm(detail)
      };
    }
    /* hiking */
    if (signals.feelsF != null && signals.feelsF >= 82) {
      return {
        band: "early morning",
        confidence: signals.weatherLive ? "Moderate" : "Limited",
        source: "temperature",
        detail: calm("Cooler morning hours ease heat on the trail.")
      };
    }
    if (signals.precipProb != null && signals.precipProb >= 45) {
      return {
        band: "early morning",
        confidence: "Moderate",
        source: "precipitation",
        detail: calm("Earlier hours often stay drier when rain risk rises later.")
      };
    }
    return {
      band: "through late morning",
      confidence: signals.weatherLive ? "Moderate" : "Limited",
      source: "heuristic",
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
      if (fromHourly && fromHourly.confidence === "Limited") confidence = "Limited";
      var label =
        id === "hiking"
          ? "Hiking"
          : id === "photography"
            ? "Photography"
            : id === "wildlife"
              ? "Wildlife"
              : "Stargazing";
      return {
        id: id,
        label: label,
        window: chosen.band,
        confidence: confidence,
        explanation:
          calm((fb && fb.detail) || "") ||
          calm("Practical timing band from available forecast cues — not a precise appointment."),
        precision: "band",
        source: chosen.source || "heuristic"
      };
    });
  }

  function waypointTake(signals, score, activities) {
    signals = signals || {};
    if (!signals.weatherLive) {
      return {
        text: "Conditions are still arriving for this place. The instruments below will settle as weather and air hydrate — nothing here is invented while we wait.",
        confidence: "Limited"
      };
    }

    var top = (activities || [])
      .filter(function (a) {
        return a.available !== false && (a.level === "Excellent" || a.level === "Good");
      })
      .slice()
      .sort(function (a, b) {
        return (b.score || 0) - (a.score || 0);
      });

    var parts = [];
    if (signals.alertCount > 0) {
      parts.push(
        "Official alerts are active nearby — read those first, then treat the rest of this briefing as secondary."
      );
    } else if (score && score.value != null && score.value >= 80) {
      parts.push(
        "A strong day for unhurried outdoor time" +
          (signals.conditions ? " under " + String(signals.conditions).toLowerCase() : "") +
          "."
      );
    } else if (score && score.value != null && score.value >= 60) {
      parts.push("A workable outdoor day with a few tradeoffs to watch.");
    } else if (score && score.value != null) {
      parts.push("Outdoor plans benefit from shorter routes and flexible timing today.");
    } else {
      parts.push("Outdoor guidance is provisional while key signals settle.");
    }

    if (top[0]) {
      parts.push(top[0].label + " looks " + top[0].level.toLowerCase() + " — " + top[0].explanation + ".");
    }
    if (signals.aqi != null && signals.aqi > 100) {
      parts.push("Air quality is elevated; ease prolonged exertion if you are sensitive.");
    } else if (signals.uv != null && signals.uv >= 7) {
      parts.push("UV is elevated midday — shade and cover help.");
    }

    var text = calm(parts.join(" "));
    if (!text) {
      text = "Read the instruments below; guidance stays provisional when signals conflict.";
    }
    var conf = "Moderate";
    if (score && score.confidence === "High" && signals.aqiLive) conf = "High";
    if (score && score.confidence === "Limited") conf = "Limited";
    if (signals.fromCache) conf = "Moderate";

    return { text: text, confidence: conf };
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
      lines.push("Air temperature reads " + round(signals.tempF) + "°F.");
    }

    if (score && score.value != null) {
      lines.push("Outdoor Score " + score.display + " (" + score.label.toLowerCase() + ").");
    }

    if (signals.precipProb != null && signals.precipProb >= 40) {
      lines.push("Precip chance near " + round(signals.precipProb) + "%.");
    } else if (signals.windMph != null && signals.windMph >= 15) {
      lines.push("Winds near " + round(signals.windMph) + " mph.");
    } else if (signals.windMph != null && signals.windMph < 8) {
      lines.push("Winds remain light.");
    }

    if (signals.aqiCategory) {
      lines.push("Air quality is " + String(signals.aqiCategory) + ".");
    } else if (signals.aqi != null) {
      lines.push("US AQI reads " + round(signals.aqi) + ".");
    }

    if (signals.uv != null && signals.uv >= 6) {
      lines.push("UV index near " + round(signals.uv) + ".");
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
      lines.push("Hiking window leans " + hikeWin.window + ".");
    }

    var photo = (activities || []).filter(function (a) {
      return a.id === "photography";
    })[0];
    if (photo && (photo.level === "Excellent" || photo.level === "Good")) {
      lines.push("Photography looks " + photo.level.toLowerCase() + ".");
    }

    var astro = (activities || []).filter(function (a) {
      return a.id === "astronomy";
    })[0];
    if (astro && signals.cloudPct != null) {
      if (signals.cloudPct <= 30) lines.push("Favorable for stars later.");
      else if (signals.cloudPct >= 70) lines.push("Clouds will limit the night sky.");
    }

    if (signals.goldenHourEvening) {
      var gh = rangeStart(signals.goldenHourEvening);
      if (gh) lines.push("Golden hour begins at " + gh + ".");
    }

    if (signals.riverLive && signals.riverTrend) {
      lines.push("Nearby river gauge: " + signals.riverTrend + ".");
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
        explanation: a.explanation
      };
    });

    return {
      title: "Explain why",
      confidence: (score && score.confidence) || "Limited",
      summary:
        (score && score.summary) ||
        "Guidance uses only the signals present in this load — missing inputs are listed, not invented.",
      contributing: contributing,
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
    var signals = normalizeSignals(platform, now);
    var score = computeOutdoorScore(signals);
    var activities = recommendActivities(signals);
    var windows = bestTimeWindows(signals);
    var take = waypointTake(signals, score, activities);
    var lines = composeSummaryLines(signals, score, activities, windows);
    var explanation = buildExplanation(signals, score, activities, windows, take);

    return {
      version: VERSION,
      ready: !!signals.weatherLive,
      lines: lines,
      score: score,
      activities: activities,
      windows: windows,
      take: take,
      explanation: explanation,
      confidence: score.confidence,
      signals: {
        weatherLive: signals.weatherLive,
        fromCache: signals.fromCache,
        tempF: signals.tempF,
        precipProb: signals.precipProb,
        windMph: signals.windMph,
        aqi: signals.aqi,
        uv: signals.uv,
        alertCount: signals.alertCount,
        riverLive: signals.riverLive
      }
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildIntelligence = {
    version: VERSION,
    SCORE_WEIGHTS: SCORE_WEIGHTS,
    ACTIVITY_IDS: ACTIVITY_IDS.slice(),
    LEVELS: LEVELS.slice(),
    CONFIDENCE: CONFIDENCE.slice(),
    extractSignals: extractSignals,
    computeOutdoorScore: computeOutdoorScore,
    recommendActivities: recommendActivities,
    bestTimeWindows: bestTimeWindows,
    waypointTake: waypointTake,
    composeSummaryLines: composeSummaryLines,
    buildExplanation: buildExplanation,
    generate: generate,
    levelFromScore: levelFromScore,
    hourBand: hourBand
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global);
