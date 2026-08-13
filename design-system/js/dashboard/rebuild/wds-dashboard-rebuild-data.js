/**
 * Dashboard Rebuild — widget data adapters + Today Outside lines.
 * Reads OIP / weather / daylight / air / alerts; never fabricates live numbers.
 * Depth attack: CORE / SKY+LIGHT / AIR / WEATHER AWARENESS / OUTDOOR FIELD derived.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + APP-SURFACE-ARCHITECTURE
 */
(function (global) {
  "use strict";

  var LIVE_IDS = [
    "ph-conditions",
    "ph-next-hours",
    "ph-doorway",
    "ph-alerts",
    "ph-air",
    "ph-precip-window",
    "ph-uv",
    "ph-light",
    "ph-astronomy",
    "ph-wind",
    "ph-comfort",
    "ph-day-range"
  ];
  var MAX_TODAY_LINES = 8;

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function isLiveWidget(id) {
    return LIVE_IDS.indexOf(id) >= 0;
  }

  function platformTrust(platform) {
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (Rel && Rel.classifyPackageTrust) {
      var t = Rel.classifyPackageTrust(platform);
      if (t === "live" || t === "partial" || t === "cached" || t === "offline") return t;
      if (t === "provider-unavailable" || t === "unavailable") return "unavailable";
      if (t === "estimated") return "partial";
    }
    if (!platform) return "waiting";
    if (platform.meta && platform.meta.fromCache) return "cached";
    if (platform.meta && platform.meta.stale) return "cached";
    return "partial";
  }

  function weatherPkg(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    return wx;
  }

  function weatherCurrent(platform) {
    var wx = weatherPkg(platform);
    if (!wx) return null;
    var cur = wx.current || {};
    return {
      live: true,
      tempF: num(cur.temperature),
      feelsF: num(cur.feelsLike) != null ? num(cur.feelsLike) : num(cur.temperature),
      humidity: num(cur.humidity),
      windMph: cur.wind ? num(cur.wind.speed) : null,
      windGust: cur.wind ? num(cur.wind.gust) : null,
      windDir: cur.wind ? num(cur.wind.direction) : null,
      cloudPct: num(cur.cloudCover),
      precipProb: cur.precipitation ? num(cur.precipitation.probability) : null,
      precipAmt: cur.precipitation && cur.precipitation.amount ? num(cur.precipitation.amount) : null,
      precipIntensity: cur.precipitation ? cur.precipitation.intensity : null,
      pressure: num(cur.pressure),
      uvIndex: num(cur.uvIndex),
      conditions: (cur.conditions && cur.conditions.summary) || "",
      meta: wx.meta || {}
    };
  }

  function daylightSlice(platform) {
    return (platform && platform.daylight) || null;
  }

  function airSlice(platform) {
    var aq = platform && platform.airQuality;
    if (!aq || aq.status !== "live") return null;
    var aqi = aq.usAqi != null ? aq.usAqi : aq.aqi;
    if (aqi == null && !aq.category) return null;
    return {
      live: true,
      aqi: num(aqi),
      category: aq.category || null,
      pm25: aq.pm25 != null ? num(aq.pm25) : null,
      summary: aq.summary || null
    };
  }

  function alertsSlice(platform) {
    return (platform && platform.alerts) || null;
  }

  function formatHourLabel(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (!isFinite(d.getTime())) return String(iso);
      return d.toLocaleTimeString(undefined, { hour: "numeric" });
    } catch (e) {
      return String(iso);
    }
  }

  function upcomingHours(platform, count) {
    var wx = weatherPkg(platform);
    if (!wx || !Array.isArray(wx.hourly) || !wx.hourly.length) return [];
    var now = Date.now() - 20 * 60 * 1000;
    var out = [];
    for (var i = 0; i < wx.hourly.length && out.length < (count || 6); i++) {
      var h = wx.hourly[i];
      var t = h && h.time ? Date.parse(h.time) : NaN;
      if (!isFinite(t) || t < now) continue;
      out.push({
        time: h.time,
        label: formatHourLabel(h.time),
        tempF: num(h.temperature),
        precipProb: h.precipitation ? num(h.precipitation.probability) : null,
        cloudPct: num(h.cloudCover),
        windMph: h.wind ? num(h.wind.speed) : null,
        uvIndex: num(h.uvIndex),
        conditions: (h.conditions && h.conditions.summary) || ""
      });
    }
    return out;
  }

  function todayDaily(platform) {
    var wx = weatherPkg(platform);
    if (!wx || !Array.isArray(wx.daily) || !wx.daily.length) return null;
    return wx.daily[0] || null;
  }

  function rangeStart(range) {
    if (!range) return null;
    var s = String(range);
    var parts = s.split(/\s*[–—-]\s*/);
    return parts[0] ? parts[0].trim() : null;
  }

  function windLabel(mph) {
    if (mph == null) return null;
    if (mph < 8) return "light";
    if (mph < 15) return "moderate";
    return "strong";
  }

  function nightSkyNote(cloudPct, illum) {
    if (cloudPct == null) return null;
    if (cloudPct <= 30 && (illum == null || illum < 40)) return "Favorable for stars";
    if (cloudPct >= 70) return "Clouds will limit the night sky";
    return "Mixed night sky";
  }

  function isNightContext(platform) {
    var dl = daylightSlice(platform);
    if (!dl) return false;
    var now = Date.now();
    function parseT(v) {
      if (!v) return null;
      var t = Date.parse(v);
      return isFinite(t) ? t : null;
    }
    var rise = parseT(dl.sunrise) || parseT(dl.sunriseISO);
    var set = parseT(dl.sunset) || parseT(dl.sunsetISO);
    if (rise != null && set != null) {
      if (set < rise) return now >= set || now < rise;
      return now < rise || now >= set;
    }
    var h = new Date().getHours();
    return h < 6 || h >= 20;
  }

  function skyGraphicState(conditions, cloudPct, platform) {
    var c = String(conditions || "").toLowerCase();
    if (/thunder|storm|severe/.test(c)) return "storm";
    if (/heavy.?rain|downpour/.test(c)) return "heavy-rain";
    if (/snow|sleet|blizzard/.test(c)) return "snow";
    if (/fog|mist|haze/.test(c)) return "fog";
    if (/rain|drizzle|shower/.test(c)) return "rain";
    if (/wind|breez|gust/.test(c) && !/cloud|clear|part|rain/.test(c)) return "wind";
    if (/overcast/.test(c) || (cloudPct != null && cloudPct >= 85)) return "cloudy";
    if (/part/.test(c) || (cloudPct != null && cloudPct >= 45 && cloudPct < 85)) return "partly";
    if (/clear|sunny|fair/.test(c) || (cloudPct != null && cloudPct < 45)) {
      return isNightContext(platform) ? "clear-night" : "clear";
    }
    if (cloudPct == null) return "partly";
    if (cloudPct >= 85) return "cloudy";
    if (cloudPct >= 45) return "partly";
    return isNightContext(platform) ? "clear-night" : "clear";
  }

  function lightGraphicKind(dl) {
    if (!dl) return { kind: "sun", state: "sunrise" };
    var now = Date.now();
    function parseT(v) {
      if (!v) return null;
      var t = Date.parse(v);
      return isFinite(t) ? t : null;
    }
    var rise = parseT(dl.sunrise) || parseT(dl.sunriseISO);
    var set = parseT(dl.sunset) || parseT(dl.sunsetISO);
    if (rise != null && set != null) {
      var hourMs = 60 * 60 * 1000;
      if (now < rise - 0.4 * hourMs || now >= set + 0.75 * hourMs) {
        return { kind: "sun", state: "night", illum: "night" };
      }
      if (now < rise + 0.75 * hourMs) return { kind: "sun", state: "sunrise", illum: "golden" };
      if (now >= set - 0.35 * hourMs && now < set + 0.4 * hourMs) {
        return { kind: "sun", state: "sunset", illum: "golden" };
      }
      if (now >= set - 1.1 * hourMs) return { kind: "sun", state: "golden", illum: "golden" };
      if (now >= set + 0.4 * hourMs) return { kind: "sun", state: "blue-hour", illum: "blue" };
      return { kind: "sun", state: "day", illum: "clear-day" };
    }
    var h = new Date().getHours();
    if (h < 5 || h >= 21) return { kind: "sun", state: "night", illum: "night" };
    if (h >= 5 && h < 8) return { kind: "sun", state: "sunrise", illum: "golden" };
    if (h >= 8 && h < 16) return { kind: "sun", state: "day", illum: "clear-day" };
    if (h >= 16 && h < 18) return { kind: "sun", state: "golden", illum: "golden" };
    if (h >= 18 && h < 19) return { kind: "sun", state: "sunset", illum: "golden" };
    return { kind: "sun", state: "blue-hour", illum: "blue" };
  }

  function waitingOrUnavailable(platform, waitingMsg, unavailableMsg) {
    return {
      trust: platform ? "unavailable" : "waiting",
      status: platform ? "unavailable" : "waiting",
      message: platform ? unavailableMsg : waitingMsg,
      facts: null
    };
  }

  function conditionsPayload(platform) {
    var cur = weatherCurrent(platform);
    if (!cur) {
      return waitingOrUnavailable(
        platform,
        "Waiting for weather data.",
        "Weather temporarily unavailable."
      );
    }
    var facts = [];
    if (cur.tempF != null) facts.push({ label: "Temp", value: Math.round(cur.tempF) + "°F" });
    if (cur.feelsF != null && cur.tempF != null && Math.round(cur.feelsF) !== Math.round(cur.tempF)) {
      facts.push({ label: "Feels like", value: Math.round(cur.feelsF) + "°F" });
    }
    if (cur.conditions) facts.push({ label: "Sky", value: cur.conditions });
    if (cur.windMph != null) facts.push({ label: "Wind", value: Math.round(cur.windMph) + " mph" });
    if (cur.humidity != null) facts.push({ label: "Humidity", value: Math.round(cur.humidity) + "%" });
    if (cur.precipProb != null) facts.push({ label: "Precip chance", value: Math.round(cur.precipProb) + "%" });
    if (!facts.length) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Weather temporarily unavailable.",
        facts: null
      };
    }
    var trust = platform && platform.meta && platform.meta.fromCache ? "cached" : "live";
    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      current: cur,
      graphic: { kind: "sky", state: skyGraphicState(cur.conditions, cur.cloudPct, platform) }
    };
  }

  function lightPayload(platform) {
    var dl = daylightSlice(platform);
    if (!dl || (!dl.sunriseFormatted && !dl.sunrise && !dl.sunsetFormatted && !dl.sunset)) {
      return waitingOrUnavailable(
        platform,
        "Sunrise and light windows will appear here.",
        "Light windows unavailable for this place right now."
      );
    }
    var facts = [];
    var sunrise = dl.sunriseFormatted || dl.sunrise;
    var sunset = dl.sunsetFormatted || dl.sunset;
    if (sunrise) facts.push({ label: "Sunrise", value: String(sunrise) });
    if (sunset) facts.push({ label: "Sunset", value: String(sunset) });
    if (dl.goldenHourEvening || dl.goldenHour) {
      facts.push({
        label: "Golden hour",
        value: String(dl.goldenHourEvening || dl.goldenHour),
        note: dl.goldenHourStatus === "estimated" ? "Estimated" : null
      });
    }
    if (dl.blueHourEvening || dl.blueHour) {
      facts.push({
        label: "Blue hour",
        value: String(dl.blueHourEvening || dl.blueHour),
        note: dl.blueHourStatus === "estimated" ? "Estimated" : null
      });
    }
    var windowEstimated =
      dl.goldenHourStatus === "estimated" || dl.blueHourStatus === "estimated";
    var trust = "live";
    if (dl.status === "editorial") trust = "partial";
    else if (windowEstimated) trust = "estimated";
    else if (dl.status === "live" || sunrise || sunset) trust = "live";
    var g = lightGraphicKind(dl);
    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      daylight: dl,
      graphic: g
    };
  }

  function airPayload(platform) {
    var aq = airSlice(platform);
    if (!aq) {
      return waitingOrUnavailable(
        platform,
        "Air quality unavailable for this place right now.",
        "Air quality unavailable for this place right now."
      );
    }
    var facts = [];
    if (aq.category) facts.push({ label: "Quality", value: String(aq.category) });
    if (aq.aqi != null) facts.push({ label: "US AQI", value: String(Math.round(aq.aqi)) });
    if (aq.pm25 != null) facts.push({ label: "PM2.5", value: String(Math.round(aq.pm25)) + " µg/m³" });
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      air: aq,
      graphic: { kind: "aqi", value: aq.aqi }
    };
  }

  function astronomyPayload(platform) {
    var dl = daylightSlice(platform);
    var cur = weatherCurrent(platform);
    var phase = dl && (dl.moonPhase || null);
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var phaseValue = dl && dl.moonPhaseValue != null ? num(dl.moonPhaseValue) : null;
    var moonrise = dl && (dl.moonrise || null);
    var moonset = dl && (dl.moonset || null);
    var cloud = cur && cur.cloudPct != null ? cur.cloudPct : null;
    var sky = nightSkyNote(cloud, illum);

    if (!phase && illum == null && phaseValue == null && !moonrise && !moonset && cloud == null) {
      return waitingOrUnavailable(platform, "Sky context will appear here.", "Sky context will appear here.");
    }

    var facts = [];
    if (phase) facts.push({ label: "Moon", value: String(phase) });
    if (illum != null) {
      facts.push({
        label: "Illumination",
        value: Math.round(illum) + "%",
        note: "Computed"
      });
    }
    if (moonrise) facts.push({ label: "Moonrise", value: String(moonrise) });
    if (moonset) facts.push({ label: "Moonset", value: String(moonset) });
    if (sky) facts.push({ label: "Night sky", value: sky, note: "Derived" });
    if (cloud != null) facts.push({ label: "Cloud cover", value: Math.round(cloud) + "%" });

    var trust = "partial";
    if (phase || illum != null || phaseValue != null) trust = "estimated";
    if (cur && cur.live && (phase || cloud != null)) trust = "partial";

    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      moon: { phase: phase, illumination: illum, phaseValue: phaseValue, rise: moonrise, set: moonset },
      nightSky: sky,
      graphic: {
        kind: "moon",
        value: illum != null ? illum : (phaseValue != null ? Math.round((phaseValue <= 0.5 ? phaseValue * 2 : (1 - phaseValue) * 2) * 100) : null),
        phase: phase,
        phaseValue: phaseValue
      }
    };
  }

  function alertsPayload(platform) {
    var al = alertsSlice(platform);
    if (!al) {
      return waitingOrUnavailable(
        platform,
        "Checking official alerts…",
        "Alerts are unavailable for this place right now."
      );
    }
    if (al.status === "empty" || (al.status === "live" && !(al.items && al.items.length))) {
      return {
        trust: "live",
        status: "live",
        message: null,
        facts: [{ label: "Status", value: "No active alerts" }],
        alerts: { count: 0, items: [] },
        graphic: { kind: "alert", active: false }
      };
    }
    if (al.status === "unavailable") {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Official alerts could not load right now.",
        facts: null
      };
    }
    var items = (al.items || []).slice(0, 4);
    var facts = items.map(function (item, idx) {
      var title = item.event || item.headline || "Weather alert";
      var sev = item.severity ? String(item.severity) : "";
      return {
        label: idx === 0 ? "Active" : "Also",
        value: sev ? title + " · " + sev : title
      };
    });
    if (!facts.length) {
      return {
        trust: "live",
        status: "live",
        message: null,
        facts: [{ label: "Status", value: "No active alerts" }],
        alerts: { count: 0, items: [] },
        graphic: { kind: "alert", active: false }
      };
    }
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      alerts: { count: items.length, items: items },
      graphic: {
        kind: "alert",
        active: !!(items && items.length),
        event: (items[0] && (items[0].event || items[0].headline)) || ""
      }
    };
  }

  function nextHoursPayload(platform) {
    var hours = upcomingHours(platform, 4);
    if (!hours.length) {
      return waitingOrUnavailable(
        platform,
        "Hourly outlook will appear here.",
        "Hourly outlook unavailable for this place right now."
      );
    }
    var facts = hours.map(function (h) {
      var parts = [];
      if (h.tempF != null) parts.push(Math.round(h.tempF) + "°F");
      if (h.precipProb != null) parts.push(Math.round(h.precipProb) + "% precip");
      if (h.conditions) parts.push(String(h.conditions));
      return {
        label: h.label || "Soon",
        value: parts.join(" · ") || "Settling"
      };
    });
    return {
      trust: platform && platform.meta && platform.meta.fromCache ? "cached" : "live",
      status: "live",
      message: null,
      facts: facts,
      hours: hours,
      graphic: { kind: "hours" }
    };
  }

  function precipGraphic(cur, peak) {
    var cond = cur && cur.conditions ? String(cur.conditions) : "";
    var ptype = /snow|sleet|blizzard|flurr/i.test(cond)
      ? "snow"
      : /rain|drizzle|shower|storm/i.test(cond)
        ? "rain"
        : "none";
    var nowProb = cur && cur.precipProb != null ? Number(cur.precipProb) : 0;
    if (!isFinite(nowProb)) nowProb = 0;
    var peakProb = peak && peak.precipProb != null ? Number(peak.precipProb) : nowProb;
    if (!isFinite(peakProb)) peakProb = nowProb;
    /* Visual authority is NOW — never substitute peak chance into current artwork. */
    return {
      kind: "precip",
      probability: nowProb,
      nowProbability: nowProb,
      peakProbability: peakProb,
      amount: cur && cur.precipAmt,
      intensity: (cur && cur.precipIntensity) || null,
      conditions: cond,
      precipType: ptype
    };
  }

  function precipWindowPayload(platform) {
    var hours = upcomingHours(platform, 12);
    var cur = weatherCurrent(platform);
    if (!hours.length && !(cur && cur.precipProb != null)) {
      return waitingOrUnavailable(
        platform,
        "Rain timing will appear when hourly precip arrives.",
        "Rain timing unavailable for this place right now."
      );
    }
    var peak = null;
    var soon = null;
    hours.forEach(function (h) {
      if (h.precipProb == null) return;
      if (!peak || h.precipProb > peak.precipProb) peak = h;
      if (h.precipProb >= 40 && !soon) soon = h;
    });
    var facts = [];
    if (cur && cur.precipProb != null) {
      facts.push({ label: "Now", value: Math.round(cur.precipProb) + "% chance" });
    }
    if (soon) {
      facts.push({
        label: "Elevated",
        value: Math.round(soon.precipProb) + "% around " + soon.label,
        note: "Live hourly"
      });
    } else if (peak && peak.precipProb != null) {
      facts.push({
        label: "Peak (12h)",
        value: Math.round(peak.precipProb) + "% around " + peak.label,
        note: "Live hourly"
      });
    }
    if (!facts.length) {
      return {
        trust: "live",
        status: "live",
        message: null,
        facts: [{ label: "Outlook", value: "No elevated precip in the next hours" }],
        graphic: precipGraphic(cur, peak)
      };
    }
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      graphic: precipGraphic(cur, peak)
    };
  }

  function uvPayload(platform) {
    var cur = weatherCurrent(platform);
    var day = todayDaily(platform);
    var nowUv = cur && cur.uvIndex != null ? cur.uvIndex : null;
    var maxUv = day ? num(day.uvIndex) : null;
    if (nowUv == null && maxUv == null) {
      var hours = upcomingHours(platform, 8);
      for (var i = 0; i < hours.length; i++) {
        if (hours[i].uvIndex != null) {
          nowUv = hours[i].uvIndex;
          break;
        }
      }
    }
    if (nowUv == null && maxUv == null) {
      return waitingOrUnavailable(
        platform,
        "UV will appear when the provider reports it.",
        "UV is unavailable for this place right now."
      );
    }
    var facts = [];
    if (nowUv != null) facts.push({ label: "Now", value: String(Math.round(nowUv * 10) / 10) });
    if (maxUv != null) facts.push({ label: "Today max", value: String(Math.round(maxUv * 10) / 10) });
    var label = nowUv != null ? nowUv : maxUv;
    var band =
      label < 3 ? "Low" : label < 6 ? "Moderate" : label < 8 ? "High" : label < 11 ? "Very high" : "Extreme";
    facts.push({ label: "Band", value: band, note: "Derived" });
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      graphic: { kind: "uv", value: label }
    };
  }

  function windPayload(platform) {
    var cur = weatherCurrent(platform);
    if (!cur || (cur.windMph == null && cur.windGust == null)) {
      return waitingOrUnavailable(
        platform,
        "Wind will appear with weather.",
        "Wind is unavailable for this place right now."
      );
    }
    var facts = [];
    if (cur.windMph != null) facts.push({ label: "Speed", value: Math.round(cur.windMph) + " mph" });
    if (cur.windGust != null) facts.push({ label: "Gusts", value: Math.round(cur.windGust) + " mph" });
    var feel = windLabel(cur.windMph);
    if (feel) facts.push({ label: "Feel", value: feel, note: "Derived" });
    return {
      trust: platform && platform.meta && platform.meta.fromCache ? "cached" : "live",
      status: "live",
      message: null,
      facts: facts,
      graphic: {
        kind: "wind",
        speed: cur.windMph,
        gust: cur.windGust,
        direction: cur.windDir
      }
    };
  }

  function comfortPayload(platform) {
    var cur = weatherCurrent(platform);
    if (!cur || cur.tempF == null) {
      return waitingOrUnavailable(
        platform,
        "Comfort reading settles with temperature.",
        "Comfort reading unavailable right now."
      );
    }
    var facts = [];
    facts.push({ label: "Air", value: Math.round(cur.tempF) + "°F" });
    if (cur.feelsF != null) {
      facts.push({ label: "Feels like", value: Math.round(cur.feelsF) + "°F" });
    }
    if (cur.humidity != null) facts.push({ label: "Humidity", value: Math.round(cur.humidity) + "%" });
    var delta =
      cur.feelsF != null && cur.tempF != null ? Math.round(cur.feelsF) - Math.round(cur.tempF) : 0;
    var note =
      Math.abs(delta) >= 3
        ? delta > 0
          ? "Feels warmer than the air reading"
          : "Feels cooler than the air reading"
        : "Air and feel are close";
    facts.push({ label: "Reading", value: note, note: "Derived" });
    return {
      trust: "derived",
      status: "live",
      message: null,
      facts: facts,
      graphic: { kind: "comfort" }
    };
  }

  function dayRangePayload(platform) {
    var day = todayDaily(platform);
    var high = day ? num(day.temperatureHigh) : null;
    var low = day ? num(day.temperatureLow) : null;
    var precip = day && day.precipitation ? num(day.precipitation.probability) : null;
    var wxSummary = platform && platform.weather;
    if (high == null && wxSummary && wxSummary.high != null) high = num(wxSummary.high);
    if (low == null && wxSummary && wxSummary.low != null) low = num(wxSummary.low);
    if (high == null && low == null) {
      return waitingOrUnavailable(
        platform,
        "Today’s range will appear with the daily forecast.",
        "Today’s range unavailable for this place right now."
      );
    }
    var facts = [];
    if (high != null) facts.push({ label: "High", value: Math.round(high) + "°F" });
    if (low != null) facts.push({ label: "Low", value: Math.round(low) + "°F" });
    if (precip != null) facts.push({ label: "Precip max", value: Math.round(precip) + "%" });
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      graphic: { kind: "range" }
    };
  }

  function doorwayPayload(platform) {
    if (!platform) {
      return waitingOrUnavailable(
        null,
        "Before-you-go notes settle as instruments arrive.",
        "Before-you-go notes unavailable right now."
      );
    }

    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (Intel && typeof Intel.analyze === "function") {
      try {
        var analysis = Intel.analyze(platform, null);
        var byo = analysis && analysis.beforeYouGo;
        if (byo && byo.brief) {
          var facts = (byo.facts && byo.facts.length ? byo.facts : []).slice(0, 4);
          return {
            trust: "derived",
            status: "live",
            message: null,
            brief: byo.brief,
            facts: facts,
            signals: byo.signals || [],
            evidence: byo.evidence || [],
            happeningNow: analysis.happeningNow || [],
            toolLinks: analysis.toolLinks || [],
            envState: analysis.state || null,
            graphic: { kind: "doorway" }
          };
        }
      } catch (e) {
        /* Fall through to legacy doorway composition */
      }
    }

    var facts = [];
    var alerts = alertsPayload(platform);
    if (alerts.status === "live" && alerts.alerts && alerts.alerts.count > 0) {
      facts.push({
        label: "Alerts",
        value: alerts.alerts.count + " active",
        note: "Live"
      });
    } else if (alerts.status === "live") {
      facts.push({ label: "Alerts", value: "None active", note: "Live" });
    }

    var precip = precipWindowPayload(platform);
    if (precip.status === "live" && precip.facts && precip.facts.length) {
      var elev = precip.facts.filter(function (f) {
        return f.label === "Elevated" || f.label === "Peak (12h)";
      })[0];
      if (elev) facts.push({ label: "Precip", value: elev.value, note: "Live" });
    }

    var air = airPayload(platform);
    if (air.status === "live" && air.air && air.air.category) {
      facts.push({ label: "Air", value: String(air.air.category), note: "Live" });
    }

    var uv = uvPayload(platform);
    if (uv.status === "live" && uv.facts) {
      var now = uv.facts.filter(function (f) {
        return f.label === "Now" || f.label === "Today max";
      })[0];
      if (now) facts.push({ label: "UV", value: now.value, note: "Live" });
    }

    var wind = windPayload(platform);
    if (wind.status === "live" && wind.facts) {
      var speed = wind.facts.filter(function (f) {
        return f.label === "Speed";
      })[0];
      if (speed) facts.push({ label: "Wind", value: speed.value, note: "Live" });
    }

    var light = lightPayload(platform);
    if (light.status === "live" && light.daylight) {
      var sunset = light.daylight.sunsetFormatted || light.daylight.sunset;
      if (sunset) facts.push({ label: "Sunset", value: String(sunset), note: "Live" });
    }

    if (!facts.length) {
      return {
        trust: "waiting",
        status: "waiting",
        message: "Before-you-go notes settle as instruments arrive.",
        facts: null,
        graphic: { kind: "doorway" }
      };
    }
    return {
      trust: "derived",
      status: "live",
      message: null,
      facts: facts.slice(0, 6),
      graphic: { kind: "doorway" }
    };
  }

  function buildWidgetPayload(id, platform) {
    if (id === "ph-conditions") return conditionsPayload(platform);
    if (id === "ph-light") return lightPayload(platform);
    if (id === "ph-air") return airPayload(platform);
    if (id === "ph-astronomy") return astronomyPayload(platform);
    if (id === "ph-alerts") return alertsPayload(platform);
    if (id === "ph-next-hours") return nextHoursPayload(platform);
    if (id === "ph-precip-window") return precipWindowPayload(platform);
    if (id === "ph-uv") return uvPayload(platform);
    if (id === "ph-wind") return windPayload(platform);
    if (id === "ph-comfort") return comfortPayload(platform);
    if (id === "ph-day-range") return dayRangePayload(platform);
    if (id === "ph-doorway") return doorwayPayload(platform);
    return null;
  }

  function bannedLine(line) {
    return /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|best activity|homework|assignment|go now|coaching/i.test(
      String(line || "")
    );
  }

  function composeTodayLines(platform) {
    var lines = [];
    var cond = conditionsPayload(platform);
    var light = lightPayload(platform);
    var air = airPayload(platform);
    var astro = astronomyPayload(platform);
    var alerts = alertsPayload(platform);
    var precip = precipWindowPayload(platform);
    var next = nextHoursPayload(platform);

    if (alerts.status === "live" && alerts.alerts && alerts.alerts.count > 0) {
      var top = alerts.alerts.items[0];
      var title = (top && (top.event || top.headline)) || "Weather alert";
      lines.push(alerts.alerts.count + " official alert" + (alerts.alerts.count > 1 ? "s" : "") + ": " + title + ".");
    }

    if (cond.status === "live" && cond.current) {
      var c = cond.current;
      if (c.tempF != null && c.conditions) {
        lines.push(Math.round(c.tempF) + "°F under " + String(c.conditions).toLowerCase() + ".");
      } else if (c.tempF != null) {
        lines.push("Air temperature reads " + Math.round(c.tempF) + "°F.");
      } else if (c.conditions) {
        lines.push("Sky looks " + String(c.conditions).toLowerCase() + ".");
      }
      if (
        c.feelsF != null &&
        c.tempF != null &&
        Math.abs(Math.round(c.feelsF) - Math.round(c.tempF)) >= 3
      ) {
        lines.push("It feels closer to " + Math.round(c.feelsF) + "°F.");
      }
      var wind = windLabel(c.windMph);
      if (wind === "light") lines.push("Winds remain light.");
      else if (wind === "moderate" && c.windMph != null) {
        lines.push("Winds around " + Math.round(c.windMph) + " mph.");
      } else if (wind === "strong" && c.windMph != null) {
        lines.push("Winds near " + Math.round(c.windMph) + " mph.");
      }
      if (c.humidity != null && c.humidity >= 70) {
        lines.push("Humidity sits near " + Math.round(c.humidity) + "%.");
      }
      if (c.cloudPct != null && c.cloudPct >= 60) {
        lines.push("Cloud cover near " + Math.round(c.cloudPct) + "%.");
      }
    }

    if (precip.status === "live" && precip.facts) {
      precip.facts.forEach(function (f) {
        if (f.label === "Elevated" || f.label === "Peak (12h)") {
          lines.push("Precip: " + f.value + ".");
        }
      });
    }

    if (next.status === "live" && next.hours && next.hours[0] && next.hours[0].tempF != null) {
      lines.push(
        "Next hour near " +
          Math.round(next.hours[0].tempF) +
          "°F" +
          (next.hours[0].label ? " (" + next.hours[0].label + ")" : "") +
          "."
      );
    }

    if (light.status === "live" && light.daylight) {
      var dl = light.daylight;
      var sunset = dl.sunsetFormatted || dl.sunset;
      if (sunset) lines.push("Sunset is at " + String(sunset) + ".");
      var ghStart = rangeStart(dl.goldenHourEvening);
      if (ghStart) lines.push("Golden hour begins at " + ghStart + ".");
    }

    if (air.status === "live" && air.air && air.air.category) {
      lines.push("Air quality is " + String(air.air.category) + ".");
    }

    if (astro.status === "live") {
      if (astro.moon && astro.moon.phase) {
        lines.push("The moon is a " + String(astro.moon.phase).toLowerCase() + ".");
      }
      if (astro.nightSky) lines.push(astro.nightSky + ".");
    }

    var clean = [];
    lines.forEach(function (line) {
      if (!line || bannedLine(line)) return;
      if (clean.indexOf(line) >= 0) return;
      clean.push(line);
    });
    return clean.slice(0, MAX_TODAY_LINES);
  }

  function waitingTodayLines() {
    return [
      "Summary settling as place and weather arrive.",
      "Conditions will appear here.",
      "Soon and before-you-go notes settle independently."
    ];
  }

  function fromPlatform(platform, location) {
    var widgets = Object.create(null);
    LIVE_IDS.forEach(function (id) {
      widgets[id] = buildWidgetPayload(id, platform);
    });
    var lines = platform ? composeTodayLines(platform) : waitingTodayLines();
    if (!lines.length) lines = waitingTodayLines();
    var trust = platform ? platformTrust(platform) : "waiting";
    var liveCount = LIVE_IDS.filter(function (id) {
      return widgets[id] && widgets[id].status === "live";
    }).length;
    if (platform && liveCount > 0 && liveCount < LIVE_IDS.length && trust === "live") {
      trust = "partial";
    }
    if (platform && liveCount === 0) trust = "unavailable";

    var intel = null;
    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (Intel && typeof Intel.analyze === "function" && platform) {
      try {
        intel = Intel.analyze(platform, location || null);
      } catch (e) {
        intel = null;
      }
    }

    return {
      widgets: widgets,
      today: {
        lines: lines,
        trust: trust,
        placeLabel:
          (location && (location.displayTitle || location.placeLabel || location.name)) || null
      },
      platform: platform || null,
      location: location || null,
      intel: intel
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildData = {
    version: "4.1.0-instrument-intelligence",
    liveIds: LIVE_IDS.slice(),
    isLiveWidget: isLiveWidget,
    fromPlatform: fromPlatform,
    buildWidgetPayload: buildWidgetPayload,
    composeTodayLines: composeTodayLines,
    waitingTodayLines: waitingTodayLines,
    platformTrust: platformTrust,
    bannedLine: bannedLine
  };
})(typeof window !== "undefined" ? window : global);
