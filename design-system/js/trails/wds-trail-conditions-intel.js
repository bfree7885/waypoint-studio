/**
 * Live trail conditions intelligence — weather impacts, advisories, photo ops, hiking windows.
 */
(function (global) {
  "use strict";

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return num(meas.value);
    return null;
  }

  function level(score) {
    if (score >= 3) return "high";
    if (score >= 2) return "moderate";
    if (score >= 1) return "low";
    return "minimal";
  }

  function chip(label, value, status) {
    return { label: label, value: value, status: status || "minimal" };
  }

  function weatherContext(platform) {
    var ref = platform && platform.weatherRef;
    var cur = ref && ref.current;
    var today = ref && ref.daily && ref.daily[0];
    var live = !!(ref && ref.meta && !ref.meta.isPlaceholder);
    var cond = ((cur && cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var temp = num(cur && cur.temperature);
    var feels = num(cur && cur.feelsLike);
    if (feels == null) feels = temp;
    var wind = cur && cur.wind ? num(cur.wind.speed) : null;
    var gust = cur && cur.wind ? num(cur.wind.gust) : null;
    var pop = num(cur && cur.precipitation && cur.precipitation.probability);
    if (pop == null && today && today.precipitation) pop = num(today.precipitation.probability);
    var rain = platform && platform.rainfall && platform.rainfall.recent;
    var rainAmt = rain ? num(rain.amount) : null;
    return {
      live: live,
      temp: temp,
      feels: feels,
      wind: wind,
      gust: gust,
      pop: pop,
      cond: cond,
      rainAmt: rainAmt,
      rainy: /rain|shower|drizzle|storm|thunder/.test(cond)
    };
  }

  function computeWeatherImpacts(wx, platform) {
    var impacts = [];
    var mudScore = 0;
    if (wx.rainAmt != null && wx.rainAmt > 0.5) mudScore += 2;
    else if (wx.rainAmt != null && wx.rainAmt > 0.15) mudScore += 1;
    if (wx.rainy) mudScore += 2;
    else if (wx.pop != null && wx.pop >= 50) mudScore += 1;
    impacts.push(chip("Mud risk", level(mudScore), level(mudScore)));

    var floodScore = 0;
    var usgs = platform && platform.usgsWater;
    if (usgs && usgs.nearest) {
      if (usgs.nearest.stageFt != null && usgs.nearest.stageFt > 8) floodScore += 1;
      if (usgs.nearest.dischargeCfs != null && usgs.nearest.dischargeCfs > 2000) floodScore += 1;
    }
    if (wx.rainAmt != null && wx.rainAmt > 1.5) floodScore += 2;
    else if (wx.rainy || (wx.pop != null && wx.pop >= 70)) floodScore += 1;
    impacts.push(chip("Flooding", level(floodScore), level(floodScore)));

    var heatScore = 0;
    if (wx.feels != null && wx.feels >= 90) heatScore = 3;
    else if (wx.feels != null && wx.feels >= 82) heatScore = 2;
    else if (wx.feels != null && wx.feels >= 75) heatScore = 1;
    impacts.push(chip("Heat stress", level(heatScore), level(heatScore)));

    var iceScore = 0;
    if (wx.feels != null && wx.feels <= 28) iceScore += 2;
    if (/ice|freez|snow|sleet|wintry/.test(wx.cond)) iceScore += 3;
    else if (wx.feels != null && wx.feels <= 35) iceScore += 1;
    impacts.push(chip("Ice / snow", level(iceScore), level(iceScore)));

    var windScore = 0;
    var w = wx.gust != null ? wx.gust : wx.wind;
    if (w != null && w >= 30) windScore = 3;
    else if (w != null && w >= 20) windScore = 2;
    else if (w != null && w >= 14) windScore = 1;
    impacts.push(chip("Wind exposure", level(windScore), level(windScore)));

    var stormScore = 0;
    if (/thunder|lightning/.test(wx.cond)) stormScore = 3;
    else if (wx.pop != null && wx.pop >= 70) stormScore = 2;
    else if (wx.pop != null && wx.pop >= 45) stormScore = 1;
    var alerts = platform && platform.alerts;
    if (alerts && alerts.items && alerts.items.length) {
      var severe = alerts.items.some(function (a) {
        return /severe|warning|watch|thunder|flood|wind/i.test((a.event || "") + (a.headline || ""));
      });
      if (severe) stormScore = Math.max(stormScore, 2);
    }
    impacts.push(chip("Storm risk", level(stormScore), level(stormScore)));

    return impacts;
  }

  function crossingWarnings(platform, trailPkg) {
    var warnings = [];
    var usgs = platform && platform.usgsWater;
    if (usgs && usgs.nearest && usgs.status !== "unavailable") {
      var n = usgs.nearest;
      var parts = [];
      if (n.stageFt != null) parts.push(n.stageFt + " ft stage");
      if (n.dischargeCfs != null) parts.push(n.dischargeCfs + " cfs");
      var elevated = (n.stageFt != null && n.stageFt > 6) ||
        (n.dischargeCfs != null && n.dischargeCfs > 1500);
      warnings.push({
        type: "gauge",
        headline: n.siteName || "Nearby stream gauge",
        detail: parts.length ? parts.join(" · ") : "USGS provisional reading",
        status: elevated ? "caution" : "clear",
        source: "usgs"
      });
    }
    var cons = platform && platform.conservation;
    if (cons && cons.current && /bridge|crossing|ford|stream|creek/i.test(
      (cons.current.title || "") + " " + (cons.current.summary || "")
    )) {
      warnings.push({
        type: "editorial",
        headline: cons.current.title,
        detail: cons.current.summary,
        status: "caution",
        source: "editorial"
      });
    }
    if (trailPkg && trailPkg.waterfalls && trailPkg.waterfalls.length) {
      warnings.push({
        type: "feature",
        headline: trailPkg.waterfalls.length + " waterfall" + (trailPkg.waterfalls.length === 1 ? "" : "s") + " nearby",
        detail: "Stream crossings near " + trailPkg.waterfalls.slice(0, 2).map(function (w) { return w.name; }).join(", "),
        status: "caution",
        source: "openstreetmap"
      });
    }
    return warnings;
  }

  function closureNotices(platform) {
    var notices = [];
    var alerts = platform && platform.alerts;
    if (alerts && alerts.items && alerts.items.length) {
      alerts.items.forEach(function (a) {
        if (/closure|closed|park|forest|trail|area/i.test((a.event || "") + (a.headline || ""))) {
          notices.push({
            headline: a.headline || a.event,
            detail: (a.description || "").split("\n")[0].slice(0, 160),
            status: "caution",
            source: "nws",
            agency: a.senderName || "NWS"
          });
        }
      });
    }
    var cons = platform && platform.conservation;
    if (cons && cons.current) {
      var text = (cons.current.title || "") + " " + (cons.current.summary || "");
      if (/clos|detour|maintenance|construction|burn|fire/i.test(text)) {
        notices.push({
          headline: cons.current.title,
          detail: cons.current.summary,
          status: /clos|detour|fire/i.test(text) ? "closed" : "caution",
          source: "editorial",
          agency: cons.current.agency || "Regional conservation"
        });
      }
    }
    return notices.slice(0, 4);
  }

  function trailAdvisories(platform) {
    var items = [];
    var obs = platform && platform.observations;
    if (obs && obs.items) {
      obs.items.forEach(function (note) {
        if (/trail|hike|path|mud|ice|bear|tick|closure/i.test((note.title || "") + " " + (note.body || ""))) {
          items.push({
            headline: note.title,
            detail: note.body ? note.body.split(".").slice(0, 2).join(".") + "." : "",
            source: "editorial"
          });
        }
      });
    }
    return items.slice(0, 3);
  }

  function hikingWindow(platform) {
    var dl = platform && platform.daylight;
    if (!dl) return { status: "unavailable", summary: "Sun times unavailable" };
    return {
      status: "live",
      sunrise: dl.sunriseFormatted || dl.sunrise,
      sunset: dl.sunsetFormatted || dl.sunset,
      goldenHour: dl.goldenHour || null,
      blueHour: dl.blueHour || null,
      summary: dl.goldenHour
        ? "Best light: " + dl.goldenHour
        : (dl.sunriseFormatted && dl.sunsetFormatted
          ? dl.sunriseFormatted + " – " + dl.sunsetFormatted
          : "Check daylight for turnaround time")
    };
  }

  function seasonLabel(platform) {
    var label = (platform && platform.calendar && platform.calendar.season) || "";
    var lower = String(label).toLowerCase();
    if (/fall|autumn/.test(lower)) return "fall";
    if (/spring/.test(lower)) return "spring";
    if (/summer/.test(lower)) return "summer";
    if (/winter/.test(lower)) return "winter";
    var m = new Date().getMonth() + 1;
    if (m >= 9 && m <= 11) return "fall";
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    return "winter";
  }

  function photoOpportunities(platform, trailPkg, wx) {
    var ops = [];
    var season = seasonLabel(platform);
    if (trailPkg && trailPkg.waterfalls && trailPkg.waterfalls.length) {
      ops.push({
        kind: "waterfall",
        label: "Waterfalls",
        detail: trailPkg.waterfalls.slice(0, 2).map(function (w) {
          return w.name + " (" + w.distanceMi + " mi)";
        }).join(" · "),
        status: "live"
      });
    }
    if (trailPkg && trailPkg.viewpoints && trailPkg.viewpoints.length) {
      ops.push({
        kind: "overlook",
        label: "Scenic overlooks",
        detail: trailPkg.viewpoints.slice(0, 2).map(function (v) {
          return v.name + " (" + v.distanceMi + " mi)";
        }).join(" · "),
        status: "live"
      });
    }
    var phen = platform && platform.phenology;
    if (season === "fall" || (phen && /color|foliage|maple/i.test(JSON.stringify(phen)))) {
      ops.push({
        kind: "fall-color",
        label: "Fall color",
        detail: season === "fall" ? "Peak season possible on ridgelines and hardwood slopes" : "Regional foliage cues",
        status: phen ? "estimated" : "seasonal"
      });
    }
    if (/fog|mist/.test(wx.cond)) {
      ops.push({ kind: "macro", label: "Macro / forest", detail: "Fog softens contrast for moss and creek detail", status: "live" });
    } else if (wx.live && wx.pop != null && wx.pop < 30) {
      ops.push({ kind: "macro", label: "Macro potential", detail: "Dry tread — good for forest floor and fungi documentation", status: "estimated" });
    }
    var dl = platform && platform.daylight;
    var moon = dl && dl.moonIllumination != null ? Number(dl.moonIllumination) : null;
    var cloud = platform && platform.weatherRef && platform.weatherRef.current
      ? num(platform.weatherRef.current.cloudCover) : null;
    if (moon != null && moon < 25 && (cloud == null || cloud < 40)) {
      ops.push({ kind: "night-sky", label: "Night sky", detail: "Low moonlight · seek dark-sky pockets away from trailhead glare", status: "estimated" });
    } else if (moon != null && moon < 50) {
      ops.push({ kind: "night-sky", label: "Night sky", detail: "Moderate moon — Milky Way may need late hours", status: "estimated" });
    }
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    if (OW && OW.photographyConditions && platform.weatherRef) {
      var photo = OW.photographyConditions(platform.weatherRef, platform);
      if (photo && photo.level === "excellent") {
        ops.push({ kind: "light", label: "Light quality", detail: photo.summary, status: "live" });
      }
    }
    return ops.slice(0, 6);
  }

  function enrichTrail(trail, impacts) {
    return Object.assign({}, trail, { weatherImpacts: impacts });
  }

  function analyze(platform, trailPkg) {
    trailPkg = trailPkg || (platform && platform.trailConditions) || null;
    var wx = weatherContext(platform);
    var impacts = computeWeatherImpacts(wx, platform);
    var trails = (trailPkg && trailPkg.trails) ? trailPkg.trails.map(function (t) {
      return enrichTrail(t, impacts);
    }) : [];
    return {
      status: trailPkg && trailPkg.status ? trailPkg.status : "unavailable",
      trails: trails,
      trailCount: trails.length,
      weatherImpacts: impacts,
      hasLiveWeather: wx.live,
      crossingWarnings: crossingWarnings(platform, trailPkg),
      closures: closureNotices(platform),
      advisories: trailAdvisories(platform),
      hikingWindow: hikingWindow(platform),
      photoOps: photoOpportunities(platform, trailPkg, wx),
      trailMeta: trailPkg && trailPkg.meta ? trailPkg.meta : null,
      summary: trailPkg && trailPkg.summary ? trailPkg.summary : null,
      attribution: trailPkg && trailPkg.attribution ? trailPkg.attribution : "OpenStreetMap",
      provider: trailPkg && trailPkg.provider ? trailPkg.provider : null
    };
  }

  function summary(live) {
    if (!live) return null;
    var parts = [];
    if (live.trailCount) parts.push(live.trailCount + " nearby trail" + (live.trailCount === 1 ? "" : "s"));
    var high = (live.weatherImpacts || []).filter(function (c) { return c.status === "high" || c.status === "moderate"; });
    if (high.length) parts.push(high[0].label + " " + high[0].status);
    if (live.closures && live.closures.length) parts.push("closure notice");
    return parts.length ? parts.join(" · ") : (live.summary || "Trail conditions");
  }

  global.WDS = global.WDS || {};
  global.WDS.trailConditionsIntel = {
    analyze: analyze,
    summary: summary,
    computeWeatherImpacts: computeWeatherImpacts,
    weatherContext: weatherContext
  };
})(window);
