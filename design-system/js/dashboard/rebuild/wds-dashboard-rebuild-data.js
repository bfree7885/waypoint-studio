/**
 * Dashboard Rebuild Phase 3 — widget data adapters + Today Outside lines.
 * Reads OIP / weather / daylight / air; never fabricates live numbers.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var LIVE_IDS = ["ph-conditions", "ph-light", "ph-air", "ph-astronomy"];
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
      precipProb: cur.precipitation ? num(cur.precipitation.probability) : null,
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

  function conditionsPayload(platform) {
    var cur = weatherCurrent(platform);
    if (!cur) {
      return {
        trust: platform ? "unavailable" : "waiting",
        status: platform ? "unavailable" : "waiting",
        message: "Waiting for weather data.",
        facts: null
      };
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
      current: cur
    };
  }

  function lightPayload(platform) {
    var dl = daylightSlice(platform);
    if (!dl || (!dl.sunriseFormatted && !dl.sunrise && !dl.sunsetFormatted && !dl.sunset)) {
      return {
        trust: platform ? "unavailable" : "waiting",
        status: platform ? "unavailable" : "waiting",
        message: platform
          ? "Light windows unavailable for this place right now."
          : "Sunrise and light windows will appear here.",
        facts: null
      };
    }
    var facts = [];
    var sunrise = dl.sunriseFormatted || dl.sunrise;
    var sunset = dl.sunsetFormatted || dl.sunset;
    if (sunrise) facts.push({ label: "Sunrise", value: String(sunrise) });
    if (sunset) facts.push({ label: "Sunset", value: String(sunset) });
    if (dl.goldenHourEvening || dl.goldenHour) {
      facts.push({
        label: "Golden hour",
        value: String(dl.goldenHourEvening || dl.goldenHour)
      });
    }
    if (dl.blueHourEvening || dl.blueHour) {
      facts.push({
        label: "Blue hour",
        value: String(dl.blueHourEvening || dl.blueHour)
      });
    }
    var estimated =
      dl.goldenHourStatus === "estimated" ||
      dl.blueHourStatus === "estimated" ||
      dl.status === "live";
    return {
      trust: estimated ? "estimated" : dl.status === "editorial" ? "partial" : "live",
      status: "live",
      message: null,
      facts: facts,
      daylight: dl
    };
  }

  function airPayload(platform) {
    var aq = airSlice(platform);
    if (!aq) {
      return {
        trust: platform ? "unavailable" : "waiting",
        status: platform ? "unavailable" : "waiting",
        message: "Air quality unavailable for this place right now.",
        facts: null
      };
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

  function astronomyPayload(platform) {
    var dl = daylightSlice(platform);
    var cur = weatherCurrent(platform);
    var phase = dl && (dl.moonPhase || null);
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var moonrise = dl && (dl.moonrise || null);
    var moonset = dl && (dl.moonset || null);
    var cloud = cur && cur.cloudPct != null ? cur.cloudPct : null;
    var sky = nightSkyNote(cloud, illum);

    if (!phase && illum == null && !moonrise && !moonset && cloud == null) {
      return {
        trust: platform ? "unavailable" : "waiting",
        status: platform ? "unavailable" : "waiting",
        message: "Sky context will appear here.",
        facts: null
      };
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
    else facts.push({ label: "Moonrise", value: "Not reported" });
    if (moonset) facts.push({ label: "Moonset", value: String(moonset) });
    if (sky) facts.push({ label: "Night sky", value: sky });
    if (cloud != null) facts.push({ label: "Cloud cover", value: Math.round(cloud) + "%" });

    var trust = "partial";
    if (phase || illum != null) trust = "estimated";
    if (cur && cur.live && (phase || cloud != null)) trust = "partial";

    return {
      trust: trust,
      status: "live",
      message: null,
      facts: facts,
      moon: { phase: phase, illumination: illum, rise: moonrise, set: moonset },
      nightSky: sky
    };
  }

  function buildWidgetPayload(id, platform) {
    if (id === "ph-conditions") return conditionsPayload(platform);
    if (id === "ph-light") return lightPayload(platform);
    if (id === "ph-air") return airPayload(platform);
    if (id === "ph-astronomy") return astronomyPayload(platform);
    return null;
  }

  function bannedLine(line) {
    return /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|best activity|homework|assignment|go now|coaching/i.test(
      String(line || "")
    );
  }

  /**
   * Max 8 concise observational bullets from implemented widget data.
   */
  function composeTodayLines(platform) {
    var lines = [];
    var cond = conditionsPayload(platform);
    var light = lightPayload(platform);
    var air = airPayload(platform);
    var astro = astronomyPayload(platform);

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
      if (c.precipProb != null && c.precipProb >= 40) {
        lines.push("Precip chance near " + Math.round(c.precipProb) + "%.");
      }
    }

    if (light.status === "live" && light.daylight) {
      var dl = light.daylight;
      var ghStart = rangeStart(dl.goldenHourEvening);
      if (ghStart) lines.push("Golden hour begins at " + ghStart + ".");
      else if (dl.goldenHour) lines.push("Golden hour: " + String(dl.goldenHour) + ".");
      var bhStart = rangeStart(dl.blueHourEvening);
      if (bhStart) lines.push("Blue hour softens around " + bhStart + ".");
      var sunset = dl.sunsetFormatted || dl.sunset;
      if (sunset) lines.push("Sunset is at " + String(sunset) + ".");
      var sunrise = dl.sunriseFormatted || dl.sunrise;
      if (sunrise && lines.length < 5) {
        lines.push("Sunrise was at " + String(sunrise) + ".");
      }
    }

    if (air.status === "live" && air.air && air.air.category) {
      lines.push("Air quality is " + String(air.air.category) + ".");
      if (air.air.aqi != null) {
        lines.push("US AQI reads " + Math.round(air.air.aqi) + ".");
      }
    }

    if (astro.status === "live") {
      if (astro.moon && astro.moon.phase) {
        lines.push("The moon is a " + String(astro.moon.phase).toLowerCase() + ".");
      }
      if (astro.moon && astro.moon.illumination != null) {
        lines.push("Moon illumination near " + Math.round(astro.moon.illumination) + "%.");
      }
      if (astro.moon && astro.moon.rise) {
        lines.push("The moon rises at " + String(astro.moon.rise) + ".");
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
      "Light and air settle independently."
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
    if (platform && lines === waitingTodayLines()) {
      /* keep platform trust even if lines thin */
    }
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
          (location && (location.displayTitle || location.placeLabel || location.name)) || null
      },
      platform: platform || null,
      location: location || null
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildData = {
    version: "3.0.0-phase3",
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
