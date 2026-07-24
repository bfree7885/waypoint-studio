/**
 * Dashboard Rebuild — widget data adapters + Today Outside lines (RC3 Sprint 6).
 * Reads OIP / weather / daylight / air / alerts / USGS; never fabricates live numbers.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var LIVE_IDS = [
    "ph-conditions",
    "ph-hourly",
    "ph-daily",
    "ph-alerts",
    "ph-wind",
    "ph-rain",
    "ph-light",
    "ph-golden",
    "ph-blue",
    "ph-photo",
    "ph-air",
    "ph-uv",
    "ph-moon",
    "ph-stargazing",
    "ph-rivers"
  ];

  /** Map observational line families → tiles that must be enabled to include them. */
  var LINE_TILE_KEYS = {
    conditions: ["ph-conditions"],
    wind: ["ph-wind", "ph-conditions"],
    rain: ["ph-rain", "ph-conditions"],
    light: ["ph-light"],
    golden: ["ph-golden", "ph-light"],
    blue: ["ph-blue", "ph-light"],
    air: ["ph-air"],
    uv: ["ph-uv"],
    moon: ["ph-moon", "ph-stargazing"],
    stars: ["ph-stargazing", "ph-moon"],
    alerts: ["ph-alerts"],
    rivers: ["ph-rivers"],
    hourly: ["ph-hourly"],
    daily: ["ph-daily"],
    photo: ["ph-photo"]
  };

  var MAX_TODAY_LINES = 8;

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
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

  function weatherCurrent(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    var cur = wx.current || {};
    return {
      live: true,
      tempF: num(cur.temperature),
      feelsF: num(cur.feelsLike) != null ? num(cur.feelsLike) : num(cur.temperature),
      humidity: num(cur.humidity),
      windMph: cur.wind ? num(cur.wind.speed) : null,
      windGust: cur.wind ? num(cur.wind.gust) : null,
      cloudPct: num(cur.cloudCover),
      precipProb:
        cur.precipitation != null
          ? num(cur.precipitation.probability)
          : wx.daily && wx.daily[0] && wx.daily[0].precipitation
            ? num(wx.daily[0].precipitation.probability)
            : null,
      precipIn: cur.precipitation ? num(cur.precipitation.amount) : null,
      uvIndex: num(cur.uvIndex),
      conditions: (cur.conditions && cur.conditions.summary) || "",
      meta: wx.meta || {}
    };
  }

  function weatherHourly(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    return Array.isArray(wx.hourly) ? wx.hourly : [];
  }

  function weatherDaily(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    return Array.isArray(wx.daily) ? wx.daily : [];
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

  function riversSlice(platform) {
    return (platform && (platform.usgsWater || platform.rivers || platform.water)) || null;
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

  function uvLabel(uv) {
    if (uv == null) return null;
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very high";
    return "Extreme";
  }

  function formatClock(value) {
    if (value == null || value === "") return null;
    if (typeof value === "string" && /[ap]m/i.test(value) && value.indexOf("T") < 0) {
      return value;
    }
    try {
      var d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return String(value);
    }
  }

  function weatherTrust(platform, cur) {
    if (platform && platform.meta && platform.meta.fromCache) return "cached";
    if (cur && cur.meta && cur.meta.fromCache) return "cached";
    return "live";
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
    if (cur.humidity != null) facts.push({ label: "Humidity", value: Math.round(cur.humidity) + "%" });
    if (!facts.length) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Weather temporarily unavailable.",
        facts: null
      };
    }
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      current: cur
    };
  }

  function hourlyPayload(platform) {
    var hours = weatherHourly(platform);
    var cur = weatherCurrent(platform);
    if (!hours || !hours.length) {
      if (cur && cur.tempF != null) {
        return {
          trust: weatherTrust(platform, cur),
          status: "live",
          message: null,
          facts: [
            { label: "Now", value: Math.round(cur.tempF) + "°F" },
            {
              label: "Next hours",
              value: "Hourly detail not reported yet"
            }
          ],
          hourly: []
        };
      }
      return waitingOrUnavailable(
        platform,
        "Hourly forecast will appear here.",
        "Hourly forecast unavailable for this place right now."
      );
    }
    var facts = [];
    hours.slice(0, 4).forEach(function (h, idx) {
      var temp = num(h.temperature);
      var precip = h.precipitation ? num(h.precipitation.probability) : null;
      var label = formatClock(h.time) || "Hour " + (idx + 1);
      var parts = [];
      if (temp != null) parts.push(Math.round(temp) + "°F");
      if (precip != null) parts.push(Math.round(precip) + "% precip");
      if (h.conditions && h.conditions.summary) parts.push(String(h.conditions.summary));
      if (parts.length) facts.push({ label: label, value: parts.join(" · ") });
    });
    if (!facts.length) {
      return waitingOrUnavailable(
        platform,
        "Hourly forecast will appear here.",
        "Hourly forecast unavailable for this place right now."
      );
    }
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      hourly: hours
    };
  }

  function dailyPayload(platform) {
    var days = weatherDaily(platform);
    var cur = weatherCurrent(platform);
    var day0 = days && days[0] ? days[0] : null;
    if (!day0 && !cur) {
      return waitingOrUnavailable(
        platform,
        "Daily outlook will appear here.",
        "Daily outlook unavailable for this place right now."
      );
    }
    var facts = [];
    var high = day0 ? num(day0.temperatureHigh != null ? day0.temperatureHigh : day0.temperatureMax) : null;
    var low = day0 ? num(day0.temperatureLow != null ? day0.temperatureLow : day0.temperatureMin) : null;
    var precip = day0 && day0.precipitation ? num(day0.precipitation.probability) : null;
    var summary =
      (day0 && day0.conditions && day0.conditions.summary) || (cur && cur.conditions) || "";
    if (high != null) facts.push({ label: "High", value: Math.round(high) + "°F" });
    if (low != null) facts.push({ label: "Low", value: Math.round(low) + "°F" });
    if (summary) facts.push({ label: "Sky", value: String(summary) });
    if (precip != null) facts.push({ label: "Precip chance", value: Math.round(precip) + "%" });
    if (!facts.length && cur && cur.tempF != null) {
      facts.push({ label: "Now", value: Math.round(cur.tempF) + "°F" });
      facts.push({ label: "Outlook", value: "Daily range not reported yet" });
    }
    if (!facts.length) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Daily outlook unavailable for this place right now.",
        facts: null
      };
    }
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      daily: day0
    };
  }

  function windPayload(platform) {
    var cur = weatherCurrent(platform);
    if (!cur || cur.windMph == null) {
      return waitingOrUnavailable(
        platform,
        "Wind readings will appear here.",
        "Wind unavailable for this place right now."
      );
    }
    var facts = [];
    facts.push({ label: "Speed", value: Math.round(cur.windMph) + " mph" });
    if (cur.windGust != null) facts.push({ label: "Gusts", value: Math.round(cur.windGust) + " mph" });
    var feel = windLabel(cur.windMph);
    if (feel) facts.push({ label: "Feel", value: feel.charAt(0).toUpperCase() + feel.slice(1) });
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      current: cur
    };
  }

  function rainPayload(platform) {
    var cur = weatherCurrent(platform);
    var days = weatherDaily(platform);
    var day0 = days && days[0] ? days[0] : null;
    var precipProb =
      (cur && cur.precipProb != null
        ? cur.precipProb
        : day0 && day0.precipitation
          ? num(day0.precipitation.probability)
          : null);
    var precipIn = cur && cur.precipIn != null ? cur.precipIn : null;
    if (precipProb == null && precipIn == null && !cur) {
      return waitingOrUnavailable(
        platform,
        "Rain chance will appear here.",
        "Precipitation context unavailable for this place right now."
      );
    }
    if (precipProb == null && precipIn == null) {
      return {
        trust: weatherTrust(platform, cur),
        status: "live",
        message: null,
        facts: [{ label: "Precip", value: "Not reported" }],
        current: cur
      };
    }
    var facts = [];
    if (precipProb != null) facts.push({ label: "Chance", value: Math.round(precipProb) + "%" });
    if (precipIn != null) facts.push({ label: "Amount", value: precipIn.toFixed(2) + " in" });
    if (cur && cur.conditions) facts.push({ label: "Sky", value: cur.conditions });
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      current: cur
    };
  }

  function lightPayload(platform) {
    var dl = daylightSlice(platform);
    if (!dl || (!dl.sunriseFormatted && !dl.sunrise && !dl.sunsetFormatted && !dl.sunset)) {
      return waitingOrUnavailable(
        platform,
        "Sunrise and sunset will appear here.",
        "Sunrise and sunset unavailable for this place right now."
      );
    }
    var facts = [];
    var sunrise = dl.sunriseFormatted || formatClock(dl.sunrise);
    var sunset = dl.sunsetFormatted || formatClock(dl.sunset);
    if (sunrise) facts.push({ label: "Sunrise", value: String(sunrise) });
    if (sunset) facts.push({ label: "Sunset", value: String(sunset) });
    return {
      trust: dl.status === "editorial" ? "partial" : "live",
      status: "live",
      message: null,
      facts: facts,
      daylight: dl
    };
  }

  function goldenPayload(platform) {
    var dl = daylightSlice(platform);
    var value = dl && (dl.goldenHourEvening || dl.goldenHour);
    if (!value) {
      return waitingOrUnavailable(
        platform,
        "Golden hour will appear here.",
        "Golden hour unavailable for this place right now."
      );
    }
    var facts = [{ label: "Evening", value: String(dl.goldenHourEvening || dl.goldenHour) }];
    if (dl.goldenHour && dl.goldenHourEvening && dl.goldenHour !== dl.goldenHourEvening) {
      facts.unshift({ label: "Windows", value: String(dl.goldenHour) });
    }
    var trust = dl.goldenHourStatus === "estimated" ? "estimated" : "live";
    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      daylight: dl
    };
  }

  function bluePayload(platform) {
    var dl = daylightSlice(platform);
    var value = dl && (dl.blueHourEvening || dl.blueHour);
    if (!value) {
      return waitingOrUnavailable(
        platform,
        "Blue hour will appear here.",
        "Blue hour unavailable for this place right now."
      );
    }
    var facts = [{ label: "Evening", value: String(dl.blueHourEvening || dl.blueHour) }];
    if (dl.blueHour && dl.blueHourEvening && dl.blueHour !== dl.blueHourEvening) {
      facts.unshift({ label: "Windows", value: String(dl.blueHour) });
    }
    var trust = dl.blueHourStatus === "estimated" ? "estimated" : "live";
    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      daylight: dl
    };
  }

  function photoPayload(platform) {
    var cur = weatherCurrent(platform);
    var dl = daylightSlice(platform);
    if (!cur && !dl) {
      return waitingOrUnavailable(
        platform,
        "Photo conditions will appear here.",
        "Photo conditions unavailable for this place right now."
      );
    }
    var facts = [];
    if (cur && cur.cloudPct != null) {
      facts.push({ label: "Cloud cover", value: Math.round(cur.cloudPct) + "%" });
    }
    if (cur && cur.windMph != null) {
      facts.push({ label: "Wind", value: Math.round(cur.windMph) + " mph" });
    }
    if (dl && (dl.goldenHourEvening || dl.goldenHour)) {
      facts.push({
        label: "Golden hour",
        value: String(dl.goldenHourEvening || dl.goldenHour)
      });
    }
    if (cur && cur.conditions) facts.push({ label: "Sky", value: cur.conditions });
    if (!facts.length) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Photo conditions unavailable for this place right now.",
        facts: null
      };
    }
    var trust = "partial";
    if (cur && cur.live) trust = weatherTrust(platform, cur);
    if (dl && (dl.goldenHourStatus === "estimated" || dl.blueHourStatus === "estimated")) {
      trust = "estimated";
    }
    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      current: cur,
      daylight: dl
    };
  }

  function airPayload(platform) {
    var aq = airSlice(platform);
    if (!aq) {
      return waitingOrUnavailable(
        platform,
        "Air quality will appear here.",
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
      air: aq
    };
  }

  function uvPayload(platform) {
    var cur = weatherCurrent(platform);
    var days = weatherDaily(platform);
    var day0 = days && days[0] ? days[0] : null;
    var uv = cur && cur.uvIndex != null ? cur.uvIndex : day0 ? num(day0.uvIndex) : null;
    if (uv == null) {
      return waitingOrUnavailable(
        platform,
        "UV index will appear here.",
        "UV index unavailable for this place right now."
      );
    }
    var facts = [
      { label: "UV index", value: String(Math.round(uv * 10) / 10) },
      { label: "Level", value: uvLabel(uv) }
    ];
    return {
      trust: weatherTrust(platform, cur),
      status: "live",
      message: null,
      facts: facts,
      uv: uv
    };
  }

  function moonPayload(platform) {
    var dl = daylightSlice(platform);
    var phase = dl && (dl.moonPhase || null);
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var moonrise = dl && (dl.moonrise || null);
    var moonset = dl && (dl.moonset || null);
    if (!phase && illum == null && !moonrise && !moonset) {
      return waitingOrUnavailable(
        platform,
        "Moon context will appear here.",
        "Moon context unavailable for this place right now."
      );
    }
    var facts = [];
    if (phase) facts.push({ label: "Phase", value: String(phase) });
    if (illum != null) {
      facts.push({
        label: "Illumination",
        value: Math.round(illum) + "%",
        note: "Computed"
      });
    }
    if (moonrise) facts.push({ label: "Moonrise", value: String(moonrise) });
    else facts.push({ label: "Moonrise", value: "Not reported" });
    if (moonset) facts.push({ label: "Moonset", value: String(moonset) });
    return {
      trust: phase || illum != null ? "estimated" : "partial",
      status: "live",
      message: null,
      facts: facts,
      moon: { phase: phase, illumination: illum, rise: moonrise, set: moonset }
    };
  }

  function stargazingPayload(platform) {
    var dl = daylightSlice(platform);
    var cur = weatherCurrent(platform);
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var cloud = cur && cur.cloudPct != null ? cur.cloudPct : null;
    var sky = nightSkyNote(cloud, illum);
    if (sky == null && cloud == null && illum == null && !(dl && dl.moonPhase)) {
      return waitingOrUnavailable(
        platform,
        "Stargazing context will appear here.",
        "Stargazing context unavailable for this place right now."
      );
    }
    var facts = [];
    if (sky) facts.push({ label: "Night sky", value: sky });
    if (cloud != null) facts.push({ label: "Cloud cover", value: Math.round(cloud) + "%" });
    if (illum != null) {
      facts.push({
        label: "Moon light",
        value: Math.round(illum) + "%",
        note: "Computed"
      });
    }
    if (dl && dl.moonPhase) facts.push({ label: "Moon", value: String(dl.moonPhase) });
    return {
      trust: cloud != null ? weatherTrust(platform, cur) : "estimated",
      status: "live",
      message: null,
      facts: facts,
      nightSky: sky
    };
  }

  function alertsPayload(platform) {
    var alerts = alertsSlice(platform);
    if (!alerts) {
      return waitingOrUnavailable(
        platform,
        "Alerts will appear here.",
        "Alert status unavailable for this place right now."
      );
    }
    var items = alerts.items || alerts.features || alerts.alerts || [];
    if (alerts.status === "unavailable" && !items.length) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "Alert status unavailable for this place right now.",
        facts: null
      };
    }
    if (!items.length) {
      return {
        trust: alerts.status === "live" || alerts.status === "empty" ? "live" : "partial",
        status: "live",
        message: null,
        facts: [{ label: "Status", value: "No active alerts" }],
        alerts: alerts
      };
    }
    var facts = [];
    facts.push({
      label: "Active",
      value: items.length + (items.length === 1 ? " alert" : " alerts")
    });
    items.slice(0, 3).forEach(function (item, idx) {
      var title =
        (item && (item.event || item.title || item.headline || item.name)) ||
        "Alert " + (idx + 1);
      var severity = item && (item.severity || item.urgency || item.severity);
      facts.push({
        label: "Alert",
        value: severity ? String(title) + " (" + String(severity) + ")" : String(title)
      });
    });
    return {
      trust: "live",
      status: "live",
      message: null,
      facts: facts,
      alerts: alerts
    };
  }

  function riversPayload(platform) {
    var rivers = riversSlice(platform);
    if (!rivers) {
      return waitingOrUnavailable(
        platform,
        "River gauge readings will appear here.",
        "River gauge unavailable for this place right now."
      );
    }
    if (rivers.status === "no-nearby" || (!rivers.nearest && rivers.status === "no-nearby")) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: rivers.disclaimer || "No monitored USGS gauge within range.",
        facts: null
      };
    }
    var site = rivers.nearest || (rivers.sites && rivers.sites[0]) || null;
    if (!site) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "River gauge unavailable for this place right now.",
        facts: null
      };
    }
    var name = site.name || site.siteName || site.stationName || "Nearest USGS gauge";
    var stage = num(site.stageFt != null ? site.stageFt : site.gageHeight != null ? site.gageHeight : site.stage);
    var flow = num(
      site.flowCfs != null
        ? site.flowCfs
        : site.dischargeCfs != null
          ? site.dischargeCfs
          : site.streamflow != null
            ? site.streamflow
            : site.discharge
    );
    var trend = site.trend || site.interpretation || null;
    var facts = [{ label: "Gauge", value: String(name) }];
    if (stage != null) facts.push({ label: "Stage", value: stage.toFixed(1) + " ft" });
    if (flow != null) facts.push({ label: "Flow", value: Math.round(flow) + " cfs" });
    if (trend) facts.push({ label: "Trend", value: String(trend) });
    if (facts.length < 2) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "River gauge reading incomplete for this place right now.",
        facts: null
      };
    }
    return {
      trust: rivers.trust === "Live" || rivers.status !== "unavailable" ? "live" : "partial",
      status: "live",
      message: null,
      facts: facts,
      river: site
    };
  }

  function buildWidgetPayload(id, platform) {
    if (id === "ph-conditions") return conditionsPayload(platform);
    if (id === "ph-hourly") return hourlyPayload(platform);
    if (id === "ph-daily") return dailyPayload(platform);
    if (id === "ph-alerts") return alertsPayload(platform);
    if (id === "ph-wind") return windPayload(platform);
    if (id === "ph-rain") return rainPayload(platform);
    if (id === "ph-light") return lightPayload(platform);
    if (id === "ph-golden") return goldenPayload(platform);
    if (id === "ph-blue") return bluePayload(platform);
    if (id === "ph-photo") return photoPayload(platform);
    if (id === "ph-air") return airPayload(platform);
    if (id === "ph-uv") return uvPayload(platform);
    if (id === "ph-moon") return moonPayload(platform);
    if (id === "ph-stargazing") return stargazingPayload(platform);
    if (id === "ph-rivers") return riversPayload(platform);
    return null;
  }

  function bannedLine(line) {
    return /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|best activity|homework|assignment|go now|coaching|coming soon|waiting for/i.test(
      String(line || "")
    );
  }

  function enabledSet(options) {
    options = options || {};
    if (Array.isArray(options.enabled) && options.enabled.length) {
      var set = Object.create(null);
      options.enabled.forEach(function (id) {
        set[id] = true;
      });
      return set;
    }
    return null;
  }

  function tileEnabled(enabled, keys) {
    if (!enabled) return true;
    for (var i = 0; i < keys.length; i++) {
      if (enabled[keys[i]]) return true;
    }
    return false;
  }

  /**
   * Max 8 concise observational bullets from enabled widget data only.
   */
  function composeTodayLines(platform, options) {
    var lines = [];
    var enabled = enabledSet(options);
    var cond = conditionsPayload(platform);
    var light = lightPayload(platform);
    var golden = goldenPayload(platform);
    var blue = bluePayload(platform);
    var air = airPayload(platform);
    var moon = moonPayload(platform);
    var stars = stargazingPayload(platform);
    var wind = windPayload(platform);
    var rain = rainPayload(platform);
    var uv = uvPayload(platform);
    var alerts = alertsPayload(platform);
    var rivers = riversPayload(platform);

    function push(key, line) {
      if (!line || bannedLine(line)) return;
      if (!tileEnabled(enabled, LINE_TILE_KEYS[key] || [])) return;
      if (lines.indexOf(line) >= 0) return;
      lines.push(line);
    }

    if (cond.status === "live" && cond.current) {
      var c = cond.current;
      if (c.tempF != null && c.conditions) {
        push("conditions", Math.round(c.tempF) + "°F under " + String(c.conditions).toLowerCase() + ".");
      } else if (c.tempF != null) {
        push("conditions", "Air temperature reads " + Math.round(c.tempF) + "°F.");
      } else if (c.conditions) {
        push("conditions", "Sky looks " + String(c.conditions).toLowerCase() + ".");
      }
      if (
        c.feelsF != null &&
        c.tempF != null &&
        Math.abs(Math.round(c.feelsF) - Math.round(c.tempF)) >= 3
      ) {
        push("conditions", "It feels closer to " + Math.round(c.feelsF) + "°F.");
      }
      if (c.humidity != null && c.humidity >= 70) {
        push("conditions", "Humidity sits near " + Math.round(c.humidity) + "%.");
      }
      if (c.cloudPct != null && c.cloudPct >= 60) {
        push("conditions", "Cloud cover near " + Math.round(c.cloudPct) + "%.");
      }
    }

    if (wind.status === "live" && wind.current && wind.current.windMph != null) {
      var wfeel = windLabel(wind.current.windMph);
      if (wfeel === "light") push("wind", "Winds remain light.");
      else if (wfeel === "moderate") {
        push("wind", "Winds around " + Math.round(wind.current.windMph) + " mph.");
      } else if (wfeel === "strong") {
        push("wind", "Winds near " + Math.round(wind.current.windMph) + " mph.");
      }
    }

    if (rain.status === "live" && rain.current && rain.current.precipProb != null && rain.current.precipProb >= 40) {
      push("rain", "Precip chance near " + Math.round(rain.current.precipProb) + "%.");
    }

    if (light.status === "live" && light.daylight) {
      var sunset = light.daylight.sunsetFormatted || light.daylight.sunset;
      var sunrise = light.daylight.sunriseFormatted || light.daylight.sunrise;
      if (sunset) push("light", "Sunset is at " + String(sunset) + ".");
      if (sunrise && lines.length < 5) push("light", "Sunrise was at " + String(sunrise) + ".");
    }

    if (golden.status === "live" && golden.daylight) {
      var ghStart = rangeStart(golden.daylight.goldenHourEvening);
      if (ghStart) push("golden", "Golden hour begins at " + ghStart + ".");
      else if (golden.daylight.goldenHour) {
        push("golden", "Golden hour: " + String(golden.daylight.goldenHour) + ".");
      }
    }

    if (blue.status === "live" && blue.daylight) {
      var bhStart = rangeStart(blue.daylight.blueHourEvening);
      if (bhStart) push("blue", "Blue hour softens around " + bhStart + ".");
    }

    if (air.status === "live" && air.air && air.air.category) {
      push("air", "Air quality is " + String(air.air.category) + ".");
      if (air.air.aqi != null) push("air", "US AQI reads " + Math.round(air.air.aqi) + ".");
    }

    if (uv.status === "live" && uv.uv != null) {
      push("uv", "UV index reads " + String(Math.round(uv.uv * 10) / 10) + " (" + uvLabel(uv.uv) + ").");
    }

    if (moon.status === "live") {
      if (moon.moon && moon.moon.phase) {
        push("moon", "The moon is a " + String(moon.moon.phase).toLowerCase() + ".");
      }
      if (moon.moon && moon.moon.illumination != null) {
        push("moon", "Moon illumination near " + Math.round(moon.moon.illumination) + "%.");
      }
      if (moon.moon && moon.moon.rise) {
        push("moon", "The moon rises at " + String(moon.moon.rise) + ".");
      }
    }

    if (stars.status === "live" && stars.nightSky) {
      push("stars", stars.nightSky + ".");
    }

    if (alerts.status === "live" && alerts.alerts) {
      var alertItems = alerts.alerts.items || [];
      if (alertItems.length) {
        push(
          "alerts",
          alertItems.length === 1
            ? "One weather alert is active."
            : alertItems.length + " weather alerts are active."
        );
      } else {
        push("alerts", "No active weather alerts.");
      }
    }

    if (rivers.status === "live" && rivers.river) {
      var site = rivers.river;
      var stage = num(site.stageFt != null ? site.stageFt : site.gageHeight);
      if (stage != null) {
        push("rivers", "Nearest river gauge reads " + stage.toFixed(1) + " ft.");
      } else if (site.name || site.siteName) {
        push("rivers", "Nearest river gauge: " + String(site.name || site.siteName) + ".");
      }
    }

    return lines.slice(0, MAX_TODAY_LINES);
  }

  function waitingTodayLines() {
    return [
      "Summary settling as place and weather arrive.",
      "Conditions will appear here.",
      "Light and air settle independently."
    ];
  }

  function fromPlatform(platform, location, options) {
    options = options || {};
    var Prefs = global.WDS && global.WDS.dashboardRebuildPrefs;
    var enabled =
      options.enabled ||
      (Prefs && Prefs.load ? Prefs.load().enabled : null) ||
      LIVE_IDS.slice();
    var widgets = Object.create(null);
    LIVE_IDS.forEach(function (id) {
      widgets[id] = buildWidgetPayload(id, platform);
    });
    var Intel = global.WDS && global.WDS.dashboardRebuildIntelligence;
    var interests =
      options.interests ||
      (Prefs && Prefs.load ? Prefs.load().interests : null) ||
      (Intel && Intel.DEFAULT_INTERESTS ? Intel.DEFAULT_INTERESTS : ["general"]);
    var brief = null;
    if (platform && Intel && Intel.generate) {
      try {
        brief = Intel.generate(platform, { now: options.now, interests: interests });
      } catch (e) {
        brief = null;
      }
    }
    var lines = platform
      ? composeTodayLines(platform, { enabled: enabled })
      : waitingTodayLines();
    if (!lines.length) lines = waitingTodayLines();
    var trust = platform ? platformTrust(platform) : "waiting";
    var liveCount = LIVE_IDS.filter(function (id) {
      return widgets[id] && widgets[id].status === "live";
    }).length;
    if (platform && liveCount > 0 && liveCount < LIVE_IDS.length && trust === "live") {
      trust = "partial";
    }
    if (platform && liveCount === 0) trust = "unavailable";

    return {
      widgets: widgets,
      today: {
        lines: lines,
        trust: trust,
        placeLabel:
          (location && (location.displayTitle || location.placeLabel || location.name)) || null,
        intelligence: brief,
        enabled: enabled.slice ? enabled.slice() : enabled
      },
      platform: platform || null,
      location: location || null
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildData = {
    version: "3.3.0-rc3-s6",
    liveIds: LIVE_IDS.slice(),
    fromPlatform: fromPlatform,
    buildWidgetPayload: buildWidgetPayload,
    composeTodayLines: composeTodayLines,
    waitingTodayLines: waitingTodayLines,
    platformTrust: platformTrust,
    bannedLine: bannedLine
  };
})(typeof window !== "undefined" ? window : global);
