/**
 * Dashboard V2 — Today Outside briefing engine (deterministic, traceable).
 */
(function (global) {
  "use strict";

  var Model = function () {
    return global.WDS && global.WDS.dashboardV2Model;
  };

  function num(v) {
    return Model().num(v);
  }

  function trace(rule, text, data) {
    return { rule: rule, text: text, data: data || null };
  }

  function condLower(model) {
    return String((model.weather.current && model.weather.current.conditions) || "").toLowerCase();
  }

  function sectionFeel(model) {
    var c = model.weather.current || {};
    var parts = [];
    var cond = condLower(model);
    var temp = c.feelsF != null ? c.feelsF : c.tempF;
    var wind = c.windMph;
    var cloud = c.cloudPct;
    var hum = c.humidity;

    if (!model.weather.live) {
      return {
        text: "Live weather is still loading — cached or partial cues may appear below.",
        traces: [trace("weather-pending", "Awaiting live weather")]
      };
    }

    if (temp != null) {
      if (temp < 35) parts.push("Cold");
      else if (temp < 50) parts.push("Cool");
      else if (temp < 68) parts.push("Mild");
      else if (temp < 82) parts.push("Warm");
      else parts.push("Hot");
    }
    if (/rain|drizzle|shower/.test(cond)) parts.push("damp");
    else if (/snow|sleet|ice/.test(cond)) parts.push("wintry");
    else if (/fog|mist/.test(cond)) parts.push("misty");
    else if (/thunder|storm/.test(cond)) parts.push("stormy");
    else if (cloud != null && cloud >= 70) parts.push("overcast");
    else if (cloud != null && cloud >= 35) parts.push("partly cloudy");
    else parts.push("mostly clear");

    if (wind != null && wind < 6) parts.push("calm");
    else if (wind != null && wind >= 18) parts.push("breezy");
    if (hum != null && hum >= 80) parts.push("humid");

    var lead = parts.length ? parts.join(", ") + "." : "Conditions are updating.";
    var detail = [];
    if (cloud != null && cloud >= 50 && temp != null) {
      detail.push("Cloud cover is moderating temperature swings");
    }
    if (model.rainfall && model.rainfall.recent && num(model.rainfall.recent.amount) > 0.1) {
      detail.push(
        "Recent rainfall (" +
          model.rainfall.recent.amount +
          " " +
          (model.rainfall.recent.unit || "in") +
          " in the last " +
          (model.rainfall.recent.periodDays || 7) +
          " days) may leave trails and low ground wet"
      );
    } else if (/rain|drizzle/.test(cond)) {
      detail.push("Active precipitation is keeping surfaces wet");
    }
    if (temp != null && wind != null) {
      detail.push("Feels like " + Math.round(temp) + "° with wind near " + Math.round(wind) + " mph");
    }

    return {
      text: lead.charAt(0).toUpperCase() + lead.slice(1) + (detail.length ? " " + detail.join("; ") + "." : ""),
      traces: [
        trace("temp-feels", "Temperature band", { temp: temp }),
        trace("conditions", "Sky/surface", { conditions: c.conditions, cloud: cloud }),
        trace("wind", "Wind", { wind: wind })
      ]
    };
  }

  function sectionChanges(model) {
    var hourly = model.weather.hourly || [];
    var traces = [];
    var lines = [];
    if (!hourly.length) {
      return {
        text: "Hourly detail will clarify how the day evolves once live data arrives.",
        traces: [trace("hourly-missing", "No hourly series")]
      };
    }

    var now = Date.now();
    var slice = hourly.filter(function (h) {
      var t = h.time ? new Date(h.time).getTime() : 0;
      return t >= now - 3600000 && t <= now + 86400000;
    }).slice(0, 24);

    var rainStart = null;
    var rainEnd = null;
    var maxTemp = null;
    var maxTempTime = null;
    var maxWind = null;
    var maxUv = null;
    var maxUvTime = null;
    var clearing = false;

    slice.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      var pop = h.precipitation ? num(h.precipitation.probability) : null;
      var temp = num(h.temperature);
      var wind = h.wind ? num(h.wind.speed) : null;
      var uv = num(h.uvIndex);
      var cloud = num(h.cloudCover);
      if (pop != null && pop >= 50 && !rainStart) rainStart = t;
      if (rainStart && pop != null && pop < 30) rainEnd = t;
      if (temp != null && (maxTemp == null || temp > maxTemp)) {
        maxTemp = temp;
        maxTempTime = t;
      }
      if (wind != null && (maxWind == null || wind > maxWind)) maxWind = wind;
      if (uv != null && (maxUv == null || uv > maxUv)) {
        maxUv = uv;
        maxUvTime = t;
      }
      if (cloud != null && cloud < 40 && t && t.getHours() >= 11) clearing = true;
    });

    if (clearing) {
      lines.push("Clouds may thin after midday, brightening the afternoon");
      traces.push(trace("cloud-trend", "Afternoon clearing signal"));
    }
    if (rainStart) {
      lines.push("Rain risk increases around " + formatTime(rainStart));
      traces.push(trace("rain-start", "Hourly POP", { at: rainStart }));
    }
    if (rainEnd) {
      lines.push("Rain chance should ease after " + formatTime(rainEnd));
      traces.push(trace("rain-end", "Hourly POP drop", { at: rainEnd }));
    }
    if (maxTempTime && maxTemp != null) {
      lines.push(
        "Warmest stretch likely near " + formatTime(maxTempTime) + " (~" + Math.round(maxTemp) + "°)"
      );
      traces.push(trace("max-temp", "Hourly max", { temp: maxTemp, at: maxTempTime }));
    }
    if (maxUv != null && maxUv >= 5 && maxUvTime) {
      lines.push("Highest UV near " + formatTime(maxUvTime) + " (index ~" + Math.round(maxUv) + ")");
      traces.push(trace("max-uv", "Hourly UV", { uv: maxUv }));
    }
    if (model.daylight.sunset) {
      lines.push("Sunset around " + model.daylight.sunset + " — plan last light accordingly");
      traces.push(trace("sunset", "Daylight", model.daylight));
    }

    if (!lines.length) {
      lines.push("Conditions look fairly steady through the day — check hourly detail for shifts");
    }
    return { text: lines.join(". ") + ".", traces: traces };
  }

  function formatTime(d) {
    if (!d || !d.toLocaleTimeString) return "—";
    try {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return String(d).slice(11, 16);
    }
  }

  function sectionOpportunities(model, prefs) {
    var acts = global.WDS && global.WDS.dashboardV2Activity;
    var list = acts && acts.recommend ? acts.recommend(model, prefs) : [];
    var good = list.filter(function (a) {
      return a.suitability === "excellent" || a.suitability === "good";
    });
    if (!good.length) {
      return {
        text: "Limited strong outdoor windows right now — review cautions and hourly trends.",
        items: [],
        traces: [trace("activity-none", "No excellent/good activities")]
      };
    }
    var items = good.slice(0, 5).map(function (a) {
      return a.label + (a.bestWindow ? " — best " + a.bestWindow : "");
    });
    return {
      text: "Strongest possibilities: " + items.join("; ") + ".",
      items: items,
      traces: good.map(function (a) {
        return trace("activity-" + a.id, a.suitability, { positives: a.positives });
      })
    };
  }

  function sectionCaution(model) {
    var cautions = [];
    var traces = [];
    var c = model.weather.current || {};
    var cond = condLower(model);
    var feels = c.feelsF;
    var wind = c.windMph;
    var uv = c.uv;
    var aqi = model.air.aqi;

    (model.alerts.items || []).forEach(function (a) {
      cautions.push("Official alert: " + a.event + (a.severity ? " (" + a.severity + ")" : ""));
      traces.push(trace("nws-alert", a.event, a));
    });

    if (/thunder|lightning|storm/.test(cond)) {
      cautions.push("Thunderstorm risk — avoid exposed ridges and water");
      traces.push(trace("storm-cond", cond));
    }
    if (feels != null && feels >= 90) {
      cautions.push("Heat stress possible — hydrate and seek shade");
      traces.push(trace("heat", feels));
    }
    if (feels != null && feels <= 25) {
      cautions.push("Cold exposure risk — layer for wind and wet surfaces");
      traces.push(trace("cold", feels));
    }
    if (wind != null && wind >= 25) {
      cautions.push("High wind on open ground");
      traces.push(trace("wind", wind));
    }
    if (aqi != null && aqi > 100) {
      cautions.push("Elevated air quality index (" + aqi + ") — sensitive groups may want shorter exertion");
      traces.push(trace("aqi", aqi));
    }
    if (uv != null && uv >= 8) {
      cautions.push("Very high UV — sun protection important midday");
      traces.push(trace("uv", uv));
    }
    if (model.rivers.live && model.rivers.sites[0]) {
      var site = model.rivers.sites[0];
      var trend = String(site.trend || "").toLowerCase();
      if (/rapid|flood|high|rise/.test(trend)) {
        cautions.push("River " + site.name + " showing elevated or rising conditions — not a flood forecast");
        traces.push(trace("river-trend", site.trend, site));
      }
    }

    if (!cautions.length) {
      return {
        text: "No major cautions beyond normal outdoor awareness.",
        items: [],
        traces: [trace("caution-clear", "No triggers")]
      };
    }
    return { text: cautions.join(". ") + ".", items: cautions, traces: traces };
  }

  function sectionNoticing(model) {
    var notes = [];
    var traces = [];
    var photo = model.photography;
    var dl = model.daylight;
    var moon = model.moon;
    var c = model.weather.current || {};

    if (photo.live && (photo.level === "excellent" || /fog|diffuse|golden/i.test(photo.summary))) {
      notes.push("Photography: " + photo.summary);
      traces.push(trace("photo", photo.summary));
    }
    if (dl.goldenHour) {
      notes.push("Golden-hour light: " + dl.goldenHour);
      traces.push(trace("golden-hour", dl.goldenHour));
    }
    if (moon.illumination != null && moon.illumination >= 85) {
      notes.push("Bright moon tonight (" + Math.round(moon.illumination) + "% illuminated) — good for moonlit landscapes");
      traces.push(trace("moon-bright", moon.illumination));
    }
    if (c.visibilityMi != null && c.visibilityMi >= 10 && c.cloudPct != null && c.cloudPct < 30) {
      notes.push("Unusually clear air for distance views");
      traces.push(trace("visibility", c.visibilityMi));
    }
    if (model.season === "spring" && c.tempF != null && c.tempF >= 55) {
      notes.push(model.season.charAt(0).toUpperCase() + model.season.slice(1) + " warmth may accelerate green-up and insect activity");
      traces.push(trace("season", model.season));
    }
    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    if (Sky && Sky.analyze && model.platform) {
      var sky = Sky.analyze(model.platform.weatherRef, model.platform);
      if (sky && sky.fogPotential && /likely|possible/i.test(sky.fogPotential.headline)) {
        notes.push(sky.fogPotential.headline + " — " + sky.fogPotential.detail);
        traces.push(trace("fog-potential", sky.fogPotential.headline));
      }
    }

    if (!notes.length) {
      return {
        text: "No unusual signals flagged — still worth a careful look outside.",
        items: [],
        traces: [trace("notice-default", "No triggers")]
      };
    }
    return { text: notes.join(". ") + ".", items: notes, traces: traces };
  }

  function build(model, prefs) {
    model = model || {};
    prefs = prefs || {};
    var feel = sectionFeel(model);
    var changes = sectionChanges(model);
    var opps = sectionOpportunities(model, prefs);
    var caution = sectionCaution(model);
    var notice = sectionNoticing(model);

    var allTraces = []
      .concat(feel.traces, changes.traces, opps.traces, caution.traces, notice.traces);

    return {
      title: "Today Outside",
      ready: model.weather.live || model.provider.fromCache,
      partial: !model.weather.live && model.provider.fromCache,
      sections: {
        feel: { heading: "What it feels like", body: feel.text },
        changes: { heading: "What changes today", body: changes.text },
        opportunities: { heading: "Best opportunities", body: opps.text, items: opps.items },
        caution: { heading: "Use caution", body: caution.text, items: caution.items },
        noticing: { heading: "Worth noticing", body: notice.text, items: notice.items }
      },
      traces: allTraces,
      confidence: model.weather.live ? "live" : model.provider.fromCache ? "cached" : "partial"
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Briefing = { build: build, sectionFeel: sectionFeel };
})(window);
