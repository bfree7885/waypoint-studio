/**
 * Dashboard V2 — Waypoint’s Take (deterministic rules engine).
 * No paid AI API. Practical, calm, evidence-based bullets.
 *
 * Priority: Safety → time-sensitive → outdoor opportunities →
 * photography → hiking → environment → rivers/seasonal.
 */
(function (global) {
  "use strict";

  function num(v) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.num ? M.num(v) : (typeof v === "number" && isFinite(v) ? v : null);
  }

  function alertMatch(items, re) {
    return (items || []).filter(function (a) {
      var t = ((a.event || "") + " " + (a.headline || "")).toLowerCase();
      return re.test(t);
    });
  }

  function hikingSummary(model) {
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var wx = model.platform && model.platform.weatherRef;
    if (OW && OW.hikingComfort && wx && model.weather.live) {
      return OW.hikingComfort(wx);
    }
    var Act = global.WDS && global.WDS.dashboardV2Activity;
    if (Act && Act.scoreActivity) {
      var scored = Act.scoreActivity("hike", model, {});
      return {
        level: scored.suitability,
        summary: scored.reason || scored.positives[0] || "Hiking suitability assessed from weather",
        detail: (scored.limits || []).join("; ")
      };
    }
    return null;
  }

  /**
   * @param {object} input
   * @returns {{ bullets: string[], traces: object[], trustNote: string|null, count: number }}
   */
  function generateWaypointsTake(input) {
    input = input || {};
    var model = input.model || input;
    var weather = input.weather || model.weather || {};
    var hourly = input.hourly || weather.hourly || [];
    var alerts = input.alerts || model.alerts || { items: [] };
    var astronomy = input.astronomy || {
      daylight: model.daylight,
      moon: model.moon
    };
    var photography = input.photography || model.photography || {};
    var hiking = input.hiking || hikingSummary(model);
    var airQuality = input.airQuality || model.air || {};
    var uv = input.uv != null ? input.uv : (weather.current && weather.current.uv);
    var rivers = input.rivers || model.rivers || {};
    var seasonal = input.seasonal || { season: model.season };
    var trust = input.trust || (model.provider && model.provider.trust) || "partial";
    var location = input.location || model.location || {};
    var currentTime = input.currentTime ? new Date(input.currentTime) : new Date();

    var bullets = [];
    var traces = [];
    var trustNote = null;
    var items = alerts.items || [];
    var c = weather.current || {};
    var hasHazard = items.length > 0;

    function push(priority, text, rule, data) {
      bullets.push({ priority: priority, text: text });
      traces.push({ rule: rule, text: text, data: data || null });
    }

    if (trust === "offline") {
      trustNote = "Offline — showing cached or incomplete cues only.";
      push(0, "You appear offline. Treat any readings as cached and verify conditions before heading out.", "trust-offline");
    } else if (trust === "cached" || (model.provider && model.provider.fromCache && !weather.live)) {
      trustNote = "Cached data — live providers have not refreshed yet.";
      push(0, "Data may be cached. Prefer confirming time-sensitive plans after a live refresh.", "trust-cached");
    } else if (trust === "partial" || trust === "provider-unavailable" || (!weather.live && trust !== "live")) {
      trustNote = "Partial data — some providers are still loading or unavailable.";
      push(0, "Some layers are partial or still loading; interpretation below uses only available evidence.", "trust-partial");
    }

    /* Safety first */
    if (items.length) {
      var top = items[0];
      push(
        1,
        "Active alert: " + (top.event || "Weather alert") +
          (top.headline ? " — " + String(top.headline).slice(0, 120) : "") +
          ". Check official guidance before outdoor plans.",
        "alert-active",
        { event: top.event }
      );
    }

    var flood = alertMatch(items, /flood/);
    if (flood.length) {
      push(1, "Flood-related alert is in effect — avoid flood-prone roads, low crossings, and rising water.", "alert-flood");
    }
    var heat = alertMatch(items, /heat|excessive heat/);
    if (heat.length) {
      push(1, "Heat advisory or warning is active — limit midday exertion and carry water.", "alert-heat");
    }
    var fire = alertMatch(items, /fire weather|red flag/);
    if (fire.length) {
      push(1, "Fire weather alert is active — watch open flame restrictions and smoke.", "alert-fire");
    }
    var storm = alertMatch(items, /thunder|severe|tornado|lightning/);
    if (storm.length) {
      push(1, "Storm or severe weather alert is active — postpone exposed ridgelines and open water.", "alert-storm");
    }

    if (airQuality.live && airQuality.aqi != null && airQuality.aqi >= 101) {
      push(
        1,
        "Air quality is elevated (AQI " + Math.round(airQuality.aqi) +
          (airQuality.category ? ", " + airQuality.category : "") +
          ") — shorten hard outdoor effort if sensitive.",
        "aqi-elevated",
        { aqi: airQuality.aqi }
      );
    }

    if (c.feelsF != null && c.feelsF >= 90) {
      push(1, "Feels-like temperature is near " + Math.round(c.feelsF) + "° — heat stress risk for long hikes.", "heat-stress");
    } else if (c.feelsF != null && c.feelsF <= 20) {
      push(1, "Very cold feels-like temperature (~" + Math.round(c.feelsF) + "°) — dress for wind and frost exposure.", "cold-stress");
    }

    /* Time-sensitive */
    var daylight = astronomy.daylight || model.daylight || {};
    if (daylight.sunset) {
      push(2, "Sunset around " + daylight.sunset + " — plan return with daylight remaining.", "sunset", { sunset: daylight.sunset });
    }
    if (daylight.goldenHour) {
      push(2, "Golden hour window: " + daylight.goldenHour + ".", "golden-hour");
    }

    if (weather.live && c.precipProb != null && c.precipProb >= 50) {
      push(2, "Rain chance around " + Math.round(c.precipProb) + "% — pack a shell if you’ll be out longer than an hour.", "precip-now");
    } else if (hourly.length) {
      var wetSoon = hourly.slice(0, 6).some(function (h) {
        var p = h.precipitation ? num(h.precipitation.probability) : num(h.precipProb);
        return p != null && p >= 55;
      });
      if (wetSoon) {
        push(2, "Hourly forecast shows a higher rain chance within the next few hours.", "precip-hourly");
      }
    }

    if (uv != null && uv >= 6) {
      push(2, "UV is elevated (UV " + Math.round(uv) + ") — shade and sunscreen matter for midday trails.", "uv-high");
    }

    /* Outdoor opportunities */
    if (weather.live && c.tempF != null) {
      var feels = c.feelsF != null ? c.feelsF : c.tempF;
      var cond = c.conditions || "conditions updating";
      var place = location.label ? " near " + location.label : "";
      push(
        3,
        "Now" + place + ": about " + Math.round(c.tempF) + "°" +
          (feels != null && Math.round(feels) !== Math.round(c.tempF) ? " (feels " + Math.round(feels) + "°)" : "") +
          ", " + cond +
          (c.windMph != null ? ", wind ~" + Math.round(c.windMph) + " mph" : "") + ".",
        "current-conditions"
      );
    }

    /* Photography */
    if (photography.live && photography.summary) {
      push(
        4,
        "Photography: " + photography.summary +
          (photography.level ? " (" + photography.level + ")" : "") + ".",
        "photography"
      );
    }

    /* Hiking */
    if (hiking && hiking.summary) {
      push(
        5,
        "Hiking: " + hiking.summary +
          (hiking.level ? " — " + hiking.level : "") +
          (hiking.detail ? ". " + String(hiking.detail).slice(0, 100) : ""),
        "hiking"
      );
    }

    /* Environment */
    if (airQuality.live && airQuality.aqi != null && airQuality.aqi < 101) {
      push(
        6,
        "Air quality looks manageable (AQI " + Math.round(airQuality.aqi) +
          (airQuality.category ? ", " + airQuality.category : "") + ").",
        "aqi-ok"
      );
    }

    /* Rivers / seasonal */
    if (rivers.live && rivers.sites && rivers.sites[0]) {
      var site = rivers.sites[0];
      var stage = site.stageFt != null ? site.stageFt.toFixed(1) + " ft" : null;
      var flow = site.flowCfs != null ? Math.round(site.flowCfs) + " cfs" : null;
      push(
        7,
        "Nearest gauge (" + (site.name || "USGS") + "): " +
          [stage, flow, site.trend].filter(Boolean).join(", ") +
          (site.stale ? " — reading may be stale" : "") + ".",
        "river-gauge"
      );
    }

    if (seasonal && seasonal.season) {
      var moon = astronomy.moon || model.moon || {};
      var seasonLine = "Seasonally " + seasonal.season;
      if (moon.phase) seasonLine += "; moon is " + moon.phase;
      if (moon.illumination != null) seasonLine += " (~" + Math.round(moon.illumination) + "% lit)";
      seasonLine += ".";
      push(8, seasonLine, "seasonal");
    }

    /* Cap: 5–8 unless active hazard */
    var max = hasHazard ? 10 : 8;
    var min = 5;
    bullets.sort(function (a, b) {
      return a.priority - b.priority;
    });

    var texts = [];
    var seen = {};
    for (var i = 0; i < bullets.length && texts.length < max; i++) {
      var t = String(bullets[i].text || "").replace(/\s+/g, " ").trim();
      if (!t || seen[t]) continue;
      seen[t] = true;
      texts.push(t);
    }

    while (texts.length < min) {
      if (!weather.live) {
        texts.push("Waiting on live weather to refine outdoor guidance for this hour.");
      } else {
        texts.push("Conditions look ordinary for the hour — use the selected widgets for detail.");
      }
      if (texts.length >= min) break;
      texts.push("Re-check alerts and air quality if plans extend past midday.");
      break;
    }

    return {
      title: "Waypoint’s Take",
      bullets: texts.slice(0, max),
      traces: traces,
      trustNote: trustNote,
      count: texts.length,
      generatedAt: currentTime.toISOString()
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Take = {
    generateWaypointsTake: generateWaypointsTake
  };
  global.generateWaypointsTake = generateWaypointsTake;
})(window);
