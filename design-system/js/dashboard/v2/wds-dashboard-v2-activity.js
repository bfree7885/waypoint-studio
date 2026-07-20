/**
 * Dashboard V2 — activity intelligence + good-time-to-go windows.
 */
(function (global) {
  "use strict";

  var Model = function () {
    return global.WDS && global.WDS.dashboardV2Model;
  };

  function num(v) {
    return Model().num(v);
  }

  var CATALOG = [
    { id: "walk", label: "Walk" },
    { id: "hike", label: "Hike" },
    { id: "run", label: "Run" },
    { id: "bike", label: "Bike" },
    { id: "photography", label: "Photography" },
    { id: "wildlife", label: "Wildlife observation" },
    { id: "birding", label: "Birding" },
    { id: "gardening", label: "Gardening" },
    { id: "paddling", label: "Paddling" },
    { id: "fishing", label: "Fishing observation" },
    { id: "shed", label: "Shed searching" },
    { id: "foraging", label: "Foraging exploration" },
    { id: "stargazing", label: "Stargazing" },
    { id: "volunteer", label: "Outdoor volunteering" }
  ];

  function cond(model) {
    return String((model.weather.current && model.weather.current.conditions) || "").toLowerCase();
  }

  function scoreActivity(id, model, prefs) {
    prefs = prefs || {};
    var c = model.weather.current || {};
    var feels = c.feelsF;
    var wind = c.windMph;
    var pop = c.precipProb;
    var uv = c.uv;
    var aqi = model.air.aqi;
    var condStr = cond(model);
    var positives = [];
    var limits = [];
    var cautions = [];
    var suitability = "fair";
    var confidence = model.weather.live ? "high" : "low";

    if (!model.weather.live) {
      return {
        id: id,
        label: labelFor(id),
        suitability: "insufficient",
        confidence: "low",
        positives: [],
        limits: ["Live weather not available yet"],
        cautions: [],
        bestWindow: null,
        reason: "Insufficient data for a reliable rating"
      };
    }

    function addPos(t) {
      positives.push(t);
    }
    function addLim(t) {
      limits.push(t);
    }

    if (/thunder|lightning|storm/.test(condStr)) {
      limits.push("Thunderstorm conditions");
      suitability = "avoid";
    }
    if (pop != null && pop >= 60) limits.push("High rain chance (" + Math.round(pop) + "%)");
    if (wind != null && wind >= 25) limits.push("Strong wind (" + Math.round(wind) + " mph)");
    if (aqi != null && aqi > 150) limits.push("Poor air quality");
    if (prefs.airQualitySensitive && aqi != null && aqi > 100) limits.push("AQI above sensitive threshold");

    if (id === "walk" || id === "hike") {
      if (feels != null && feels >= 45 && feels <= 75 && (wind == null || wind < 18)) {
        addPos("Comfortable temperature");
        suitability = "good";
      }
      if (feels != null && feels >= 45 && feels <= 72 && (pop == null || pop < 35) && (wind == null || wind < 15)) {
        suitability = "excellent";
        addPos("Mild air and manageable wind");
      }
      if (/ice|snow|freez/.test(condStr)) addLim("Icy or snowy surfaces possible");
    }

    if (id === "run" || id === "bike") {
      if (feels != null && feels >= 40 && feels <= 70 && (wind == null || wind < 15)) {
        suitability = "good";
        addPos("Comfortable exertion temperatures");
      }
      if (feels != null && feels >= 85) addLim("Heat stress risk while exerting");
      if (wind != null && wind >= 20) addLim("Wind affects balance and effort");
    }

    if (id === "photography") {
      var p = model.photography;
      if (p.live) {
        addPos(p.summary || "Favorable light character");
        if (p.level === "excellent") suitability = "excellent";
        else if (p.level === "good") suitability = "good";
      }
      if (model.daylight.goldenHour) addPos("Golden hour: " + model.daylight.goldenHour);
      if (/clear/.test(condStr) && c.cloudPct != null && c.cloudPct < 20) addLim("Hard midday contrast");
    }

    if (id === "wildlife" || id === "birding") {
      if (model.daylight.sunrise) addPos("Activity often peaks near sunrise (" + model.daylight.sunrise + ")");
      if (wind != null && wind < 10) addPos("Calm air helps hearing and movement cues");
      if (/rain/.test(condStr)) addLim("Rain may reduce visibility and activity");
      if (suitability === "fair" && positives.length) suitability = "good";
    }

    if (id === "gardening") {
      if (feels != null && feels >= 50 && feels <= 80 && (pop == null || pop < 40)) {
        suitability = "good";
        addPos("Workable soil temperatures and lower rain risk");
      }
      if (feels != null && feels >= 88) addLim("Heat makes prolonged work uncomfortable");
    }

    if (id === "paddling" || id === "fishing") {
      if (wind != null && wind >= 15) addLim("Wind chop on open water");
      if (model.rivers.live && model.rivers.sites[0]) {
        var t = String(model.rivers.sites[0].trend || "").toLowerCase();
        if (/rise|high|rapid/.test(t)) {
          addLim("Elevated streamflow — not a safety forecast");
          cautions.push("Check official gauges and local guidance before entering water");
        } else {
          addPos("Stream conditions readable at nearby gauge");
        }
      }
      if (suitability === "fair" && !limits.length) suitability = "good";
    }

    if (id === "stargazing") {
      var nightClear = c.cloudPct != null && c.cloudPct < 40;
      if (model.moon.illumination != null && model.moon.illumination > 70) addLim("Bright moon reduces faint stars");
      if (nightClear) {
        addPos("Relatively clear sky this evening");
        suitability = "good";
      }
      if (model.daylight.sunset) addPos("Best after sunset (" + model.daylight.sunset + ")");
    }

    if (id === "shed" || id === "foraging") {
      if (model.season === "spring" || model.season === "fall") addPos(model.season + " season context");
      if (model.rainfall && model.rainfall.recent && num(model.rainfall.recent.amount) > 0.1) {
        addPos("Recent rain may improve ground conditions for careful searching");
      }
      if (/thunder/.test(condStr)) suitability = "avoid";
      else if (positives.length && suitability === "fair") suitability = "good";
    }

    if (limits.length >= 2 || suitability === "avoid") suitability = "poor";
    else if (limits.length === 1 && suitability === "excellent") suitability = "good";
    else if (limits.length >= 1 && suitability === "good") suitability = "fair";

    var bestWindow = pickBestWindow(id, model);

    return {
      id: id,
      label: labelFor(id),
      suitability: suitability,
      confidence: confidence,
      positives: positives.slice(0, 4),
      limits: limits.slice(0, 3),
      cautions: cautions,
      bestWindow: bestWindow ? bestWindow.label : null,
      bestWindowDetail: bestWindow,
      reason: positives[0] || limits[0] || "Based on current weather and light"
    };
  }

  function labelFor(id) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) return CATALOG[i].label;
    }
    return id;
  }

  function pickBestWindow(id, model) {
    var hourly = model.weather.hourly || [];
    if (!hourly.length) return null;
    var best = null;
    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t || t.getTime() < Date.now() - 600000) return;
      var pop = h.precipitation ? num(h.precipitation.probability) : 0;
      var wind = h.wind ? num(h.wind.speed) : 0;
      var cloud = num(h.cloudCover);
      var score = 50;
      if (pop != null && pop < 25) score += 15;
      if (wind != null && wind < 12) score += 10;
      if (id === "photography" && cloud != null && cloud >= 30 && cloud <= 80) score += 20;
      if (id === "stargazing" && t.getHours() >= 20 && cloud != null && cloud < 35) score += 25;
      if (id === "walk" || id === "hike") {
        var temp = num(h.temperature);
        if (temp != null && temp >= 50 && temp <= 75) score += 15;
      }
      if (!best || score > best.score) {
        best = { at: t, score: score, label: formatRange(t) };
      }
    });
    return best;
  }

  function formatRange(start) {
    if (!start) return null;
    var end = new Date(start.getTime() + 2 * 3600000);
    try {
      var a = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      var b = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return a + "–" + b;
    } catch (e) {
      return null;
    }
  }

  function recommend(model, prefs) {
    prefs = prefs || (global.WDS.dashboardV2Prefs && global.WDS.dashboardV2Prefs.load());
    var ids = (prefs && prefs.activities) || CATALOG.map(function (c) {
      return c.id;
    });
    return ids.map(function (id) {
      return scoreActivity(id, model, prefs);
    });
  }

  function buildWindows(model, prefs) {
    var acts = recommend(model, prefs);
    var windows = [];
    function pushWindow(kind, act, extra) {
      if (!act || !act.bestWindowDetail) return;
      var w = act.bestWindowDetail;
      windows.push({
        kind: kind,
        label: kind,
        start: w.at ? w.at.toISOString() : null,
        end: w.at ? new Date(w.at.getTime() + 2 * 3600000).toISOString() : null,
        display: act.bestWindow,
        reason: act.reason,
        confidence: act.confidence === "high" ? "Likely" : "Possible",
        caveat: act.limits[0] || null,
        activityId: act.id
      });
    }

    var photo = acts.filter(function (a) {
      return a.id === "photography";
    })[0];
    var walk = acts.filter(function (a) {
      return a.id === "walk";
    })[0];
    var hike = acts.filter(function (a) {
      return a.id === "hike";
    })[0];
    var star = acts.filter(function (a) {
      return a.id === "stargazing";
    })[0];

    var overall = walk && walk.suitability !== "insufficient" ? walk : hike;
    if (overall && overall.bestWindow) {
      windows.push({
        kind: "Best overall outdoor window",
        label: "Best overall outdoor window",
        display: overall.bestWindow,
        reason: overall.positives.join("; ") || overall.reason,
        confidence: overall.suitability === "excellent" ? "Known" : "Likely",
        caveat: overall.limits[0] || null,
        activityId: overall.id
      });
    }
    pushWindow("Best photography window", photo);
    pushWindow("Best walking window", walk);
    pushWindow("Best stargazing window", star);

    var hourly = model.weather.hourly || [];
    var lowRain = null;
    var lowWind = null;
    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t || t.getTime() < Date.now()) return;
      var pop = h.precipitation ? num(h.precipitation.probability) : 99;
      var wind = h.wind ? num(h.wind.speed) : 99;
      if (pop != null && pop <= 20 && (!lowRain || pop < lowRain.pop)) {
        lowRain = { at: t, pop: pop };
      }
      if (wind != null && wind <= 10 && (!lowWind || wind < lowWind.wind)) {
        lowWind = { at: t, wind: wind };
      }
    });
    if (lowRain) {
      windows.push({
        kind: "Lowest rain-risk window",
        label: "Lowest rain-risk window",
        display: formatRange(lowRain.at),
        reason: "Hourly precipitation probability near " + Math.round(lowRain.pop) + "%",
        confidence: "Likely",
        caveat: null
      });
    }
    if (lowWind) {
      windows.push({
        kind: "Best low-wind window",
        label: "Best low-wind window",
        display: formatRange(lowWind.at),
        reason: "Wind near " + Math.round(lowWind.wind) + " mph in hourly forecast",
        confidence: "Likely",
        caveat: null
      });
    }

    return windows.filter(function (w) {
      return w.display;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Activity = {
    CATALOG: CATALOG,
    recommend: recommend,
    scoreActivity: scoreActivity,
    buildWindows: buildWindows
  };
})(window);
