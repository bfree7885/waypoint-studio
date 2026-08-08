/**
 * Sheds — Today's Search briefing (transparent condition scoring).
 * Facts vs analysis vs uncertainty are labeled. Never predicts exact deer locations
 * or guarantees sheds. Moon/light used only as weak daylight context when justified.
 */
(function (global) {
  "use strict";

  var DISCLAIMER =
    "Today’s Search is relative field guidance for when and where to walk — " +
    "not a prediction of deer locations or that sheds are present.";

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function parseDate(d) {
    if (d instanceof Date) return d;
    var t = new Date(d);
    return isNaN(t.getTime()) ? new Date() : t;
  }

  function hourLocal(date, tzOffsetMin) {
    var d = parseDate(date);
    if (typeof tzOffsetMin === "number" && isFinite(tzOffsetMin)) {
      var utc = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utc + tzOffsetMin * 60000).getHours() +
        new Date(utc + tzOffsetMin * 60000).getMinutes() / 60;
    }
    return d.getHours() + d.getMinutes() / 60;
  }

  function bandFromScore(score) {
    if (score >= 0.68) return "favorable";
    if (score >= 0.48) return "moderate";
    if (score >= 0.28) return "limited";
    return "uncertain";
  }

  function confidenceLabel(score, missingCount) {
    if (missingCount >= 3) return "Low";
    if (missingCount >= 1 || score < 0.35) return "Medium";
    if (score >= 0.7 && missingCount === 0) return "High";
    return "Medium";
  }

  function signal(id, label, kind, text) {
    return { id: id, label: label, kind: kind, text: text };
  }

  /**
   * Score one time-of-day window using weather + daylight facts.
   * Crepuscular windows are framed as common field attention periods — not certainty.
   */
  function scoreWindow(id, label, opts) {
    var wx = opts.weather || {};
    var season = opts.season || {};
    var nowH = opts.nowHour;
    var sunriseH = opts.sunriseHour;
    var sunsetH = opts.sunsetHour;
    var why = [];
    var uncertain = [];
    var score = 0.42;
    var facts = 0;
    var missing = 0;

    var centerH = id === "morning" ? 7.5 : id === "midday" ? 12.5 : 17.5;
    if (typeof sunriseH === "number" && id === "morning") centerH = sunriseH + 1.2;
    if (typeof sunsetH === "number" && id === "evening") centerH = sunsetH - 0.8;

    // Soft preference for dawn/dusk search windows (visibility + typical movement attention).
    if (id === "morning" || id === "evening") {
      score += 0.12;
      why.push("Many hunters watch dawn/dusk windows for movement and cooler air — not a location forecast.");
    } else {
      score -= 0.04;
      why.push("Midday can still work for shed searching; deer movement is often lower then.");
    }

    if (typeof sunriseH === "number" && typeof sunsetH === "number") {
      facts++;
      if (id === "morning") {
        why.push("Sunrise context available — early light and cooler temps often improve ground reading.");
      } else if (id === "evening") {
        why.push("Sunset context available — cooling late-day air is a common attention window.");
      }
    } else {
      missing++;
      uncertain.push("Sunrise/sunset unavailable for this location.");
    }

    var temp = wx.tempC;
    var wind = wx.windSpeedMs;
    var snow = wx.snowMm;
    var precip = wx.precipMm24h;
    var pressureTrend = wx.pressureTrend;

    if (typeof temp === "number") {
      facts++;
      if (temp <= 2 && (id === "morning" || id === "evening")) {
        score += 0.08;
        why.push("Cooling or near-freezing temps favor crust/contrast checks in open edges.");
      } else if (temp >= 12 && id === "midday") {
        score -= 0.06;
        why.push("Mild midday warmth can reduce ground contrast under leaf-out.");
      } else if (temp >= 12) {
        why.push("Mild temps — visibility may be harder under green cover.");
      }
    } else {
      missing++;
      uncertain.push("Temperature unavailable.");
    }

    if (typeof wind === "number") {
      facts++;
      if (wind >= 8) {
        score += id === "midday" ? 0.02 : 0.05;
        why.push("Stronger wind can move debris along fence lines and lee edges (analysis).");
      } else if (wind >= 4) {
        score += 0.03;
        why.push("Moderate breeze — fence lines and travel edges remain worth a look.");
      }
    } else {
      missing++;
    }

    if (typeof snow === "number") {
      facts++;
      if (snow > 8 && typeof temp === "number" && temp > 0) {
        score += 0.1;
        why.push("Recent snowmelt may expose south aspects and bare edges.");
      } else if (snow > 25) {
        score -= 0.08;
        why.push("Deeper snow can hide antlers — favor wind-scoured openings.");
      } else if (snow > 0.5) {
        score += 0.06;
        why.push("Light snow can improve ground contrast for spotting sheds.");
      }
    }

    if (typeof precip === "number") {
      facts++;
      if (precip >= 5 && precip < 25) {
        score += 0.04;
        why.push("Recent precipitation can change footing and expose mineral soil in trails.");
      } else if (precip >= 25) {
        score -= 0.05;
        why.push("Heavy recent rain may make soft ground and steep banks harder to search.");
      }
    }

    if (pressureTrend === "falling") {
      facts++;
      score += 0.04;
      why.push("Falling pressure suggests a weather transition — conditions may shift through the day.");
    } else if (pressureTrend === "rising") {
      facts++;
      score += 0.02;
      why.push("Rising pressure — stabilizing air after a transition.");
    } else if (pressureTrend == null) {
      missing++;
      uncertain.push("Pressure trend unavailable.");
    }

    if (season && season.phaseId === "peak_shed") {
      score += 0.08;
      why.push("Seasonal timing heuristic is nearer peak shed for this latitude.");
    } else if (season && (season.phaseId === "early_shed" || season.phaseId === "late_shed")) {
      score += 0.04;
      why.push("Seasonal timing is in an active shed-search window for this latitude.");
    } else if (season && season.phaseId === "pre_shed") {
      score -= 0.04;
      why.push("Early seasonal window — treat marks as reconnaissance.");
    } else if (season && season.phaseId === "post_shed") {
      why.push("Post-peak seasonal window — leftover finds favor overlooked cover.");
    } else {
      missing++;
      uncertain.push("Seasonal phase uncertain.");
    }

    // Soft boost if this window is "now" or soon
    if (typeof nowH === "number") {
      var dist = Math.abs(nowH - centerH);
      if (dist > 12) dist = 24 - dist;
      if (dist <= 1.5) {
        score += 0.06;
        why.push("This window overlaps the current clock time.");
      } else if (dist <= 3.5) {
        score += 0.03;
        why.push("This window is approaching or just passed.");
      }
    }

    score = clamp(score, 0.08, 0.92);
    var band = bandFromScore(score);
    return {
      id: id,
      label: label,
      score: Math.round(score * 100) / 100,
      band: band,
      why: why.slice(0, 4),
      uncertain: uncertain.slice(0, 3),
      factsUsed: facts,
      missingInputs: missing
    };
  }

  function terrainHints(season, weather, patterns) {
    var areas = [];
    var wx = weather || {};
    // Prefer user patterns when sufficient — they are the most grounded local signal.
    if (patterns && patterns.sufficient && patterns.topHabitats && patterns.topHabitats.length) {
      areas.push({
        label: patterns.topHabitats[0].label,
        kind: "observation",
        epistemic: "pattern",
        why: "Pattern derived from your private observations (" +
          patterns.topHabitats[0].count + " notes) — not a census."
      });
    }
    if (wx.snowMm != null && wx.snowMm > 8 && wx.tempC != null && wx.tempC > 0) {
      areas.push({
        label: "South-facing slopes & bare edges",
        kind: "terrain",
        epistemic: "analysis",
        why: "Snowmelt analysis — melt often exposes mineral soil and edges first."
      });
    }
    if (wx.windSpeedMs != null && wx.windSpeedMs >= 6) {
      areas.push({
        label: "Fence lines & lee edges",
        kind: "terrain",
        epistemic: "analysis",
        why: "Wind can concentrate light debris along fences and sheltered edges."
      });
    }
    if (season && (season.phaseId === "peak_shed" || season.phaseId === "late_shed")) {
      areas.push({
        label: "Thermal / winter cover edges",
        kind: "terrain",
        epistemic: "analysis",
        why: "Seasonal heuristic — winter concentration edges often repay careful walking."
      });
    }
    if (!areas.length) {
      areas.push({
        label: "Edges, travel corridors, and your prior notes",
        kind: "terrain",
        epistemic: "uncertain",
        why: "Limited environmental detail — lean on terrain literacy and local marks."
      });
    }
    return areas.slice(0, 4);
  }

  function buildSignals(weather, season, locationStatus, patterns) {
    var signals = [];
    var wx = weather || {};
    if (locationStatus === "denied") {
      signals.push(signal("location", "Location", "uncertain",
        "Location permission denied — briefing uses map center or last view, not live GPS."));
    } else if (locationStatus === "unavailable") {
      signals.push(signal("location", "Location", "uncertain",
        "Precise location unavailable — place yourself on the map when you can."));
    } else if (locationStatus === "ready") {
      signals.push(signal("location", "Location", "fact",
        "Using your current or last known position for nearby guidance."));
    }

    if (wx.source) {
      signals.push(signal("weather-source", "Weather source", "fact",
        "Live weather from Open-Meteo (current + short forecast)."));
    } else {
      signals.push(signal("weather-source", "Weather source", "uncertain",
        "Weather feed unavailable — season and local notes only."));
    }

    if (typeof wx.tempC === "number") {
      signals.push(signal("temp", "Temperature", "fact",
        Math.round(wx.tempC) + "°C now"));
    }
    if (typeof wx.windSpeedMs === "number") {
      signals.push(signal("wind", "Wind", "fact",
        Math.round(wx.windSpeedMs * 3.6) + " km/h"));
    }
    if (typeof wx.snowMm === "number") {
      signals.push(signal("snow", "Recent snow (3-day sum)", "fact",
        Math.round(wx.snowMm * 10) / 10 + " mm water-equivalent snowfall"));
    }
    if (typeof wx.precipMm24h === "number") {
      signals.push(signal("precip", "Recent precipitation", "fact",
        Math.round(wx.precipMm24h * 10) / 10 + " mm (approx. 24h)"));
    }
    if (wx.pressureTrend) {
      signals.push(signal("pressure", "Pressure trend", "analysis",
        "Surface pressure appears " + wx.pressureTrend + " (short-sample trend)."));
    }
    if (wx.sunriseLocal || wx.sunsetLocal) {
      signals.push(signal("daylight", "Daylight", "fact",
        "Sunrise " + (wx.sunriseLocal || "—") + " · Sunset " + (wx.sunsetLocal || "—")));
    }
    if (season && season.phase) {
      signals.push(signal("season", "Seasonal timing", "analysis",
        season.phase + " — " + (season.supportLine || "latitude heuristic, not a drop date.")));
    }
    if (patterns) {
      if (patterns.sufficient) {
        signals.push(signal("obs-patterns", "Your observations", "pattern",
          patterns.summary || "Enough private notes to mention time/place patterns."));
      } else {
        signals.push(signal("obs-patterns", "Your observations", "uncertain",
          patterns.insufficiencyReason ||
            "Not enough private observations yet for pattern-based Today’s Search."));
      }
    }
    return signals;
  }

  /**
   * @param {object} opts
   * @param {object|null} opts.weather
   * @param {object|null} opts.season
   * @param {'ready'|'denied'|'unavailable'|'loading'} opts.locationStatus
   * @param {'ready'|'loading'|'unavailable'} opts.weatherStatus
   * @param {Date|string} [opts.now]
   * @param {object|null} [opts.patterns] from WaypointShedsObservationPatterns
   * @param {object|null} [opts.plan] from planner
   */
  function build(opts) {
    opts = opts || {};
    var now = parseDate(opts.now || new Date());
    var weatherStatus = opts.weatherStatus || (opts.weather ? "ready" : "unavailable");
    var locationStatus = opts.locationStatus || "unavailable";
    var patterns = opts.patterns || null;
    var plan = opts.plan || null;

    if (weatherStatus === "loading" && locationStatus === "loading") {
      return {
        status: "loading",
        headline: "Reading today’s conditions…",
        favorability: "uncertain",
        confidence: "Low",
        confidenceWhy: "Waiting on location and weather.",
        timeWindows: [],
        areas: [],
        signals: [],
        uncertainties: ["Still loading live inputs."],
        observationInsight: patterns,
        recommendation: null,
        disclaimer: DISCLAIMER
      };
    }

    var wx = opts.weather || null;
    var season = opts.season || null;
    var sunriseH = wx && typeof wx.sunriseHour === "number" ? wx.sunriseHour : null;
    var sunsetH = wx && typeof wx.sunsetHour === "number" ? wx.sunsetHour : null;
    var nowH = hourLocal(now, wx && wx.utcOffsetMinutes);

    var windows = [
      scoreWindow("morning", "Morning", {
        weather: wx, season: season, nowHour: nowH, sunriseHour: sunriseH, sunsetHour: sunsetH
      }),
      scoreWindow("midday", "Midday", {
        weather: wx, season: season, nowHour: nowH, sunriseHour: sunriseH, sunsetHour: sunsetH
      }),
      scoreWindow("evening", "Evening", {
        weather: wx, season: season, nowHour: nowH, sunriseHour: sunriseH, sunsetHour: sunsetH
      })
    ];
    windows.sort(function (a, b) { return b.score - a.score; });

    var best = windows[0];
    var missing = 0;
    if (!wx) missing += 3;
    else {
      if (typeof wx.tempC !== "number") missing++;
      if (typeof wx.windSpeedMs !== "number") missing++;
      if (!wx.pressureTrend) missing++;
      if (sunriseH == null) missing++;
    }
    if (locationStatus === "denied" || locationStatus === "unavailable") missing++;
    if (!season) missing++;

    var favorability = best ? best.band : "uncertain";
    if (!wx && weatherStatus === "unavailable") favorability = "uncertain";

    var confidence = confidenceLabel(best ? best.score : 0.2, missing);
    var confidenceWhy = missing
      ? ("Confidence " + confidence + " — " + missing + " input gap(s) (weather, daylight, location, or season).")
      : ("Confidence " + confidence + " — live weather and daylight context available; still not find certainty.");

    var areas = terrainHints(season, wx, patterns);
    if (plan && plan.ok && plan.recommendation) {
      var r = plan.recommendation;
      areas.unshift({
        label: "Suggested pocket " +
          (r.bearingLabel ? r.bearingLabel + " " : "") +
          (r.distanceM != null ? ("~" + Math.round(r.distanceM) + " m") : "nearby"),
        kind: "planner",
        epistemic: "estimated",
        why: "Estimated opportunity from the biological walk-priority model + your coverage marks — not a deer GPS."
      });
      areas = areas.slice(0, 4);
    }

    var signals = buildSignals(wx, season, locationStatus, patterns);
    var uncertainties = [];
    windows.forEach(function (w) {
      w.uncertain.forEach(function (u) {
        if (uncertainties.indexOf(u) < 0) uncertainties.push(u);
      });
    });
    if (locationStatus === "denied") {
      uncertainties.push("Location denied — nearby suggestions use map center.");
    }
    if (!wx) {
      uncertainties.push("Without live weather, time-window ranking is mostly seasonal and daylight heuristics.");
    }
    if (!patterns || !patterns.sufficient) {
      uncertainties.push("Observation patterns need more private deer/sign notes before they influence Today’s Search.");
    }
    uncertainties.push("Deer movement and shed locations are never certain from weather alone.");

    var headline;
    if (locationStatus === "denied" && !wx) {
      headline = "Limited briefing — location denied, weather unavailable";
    } else if (!wx) {
      headline = "Seasonal briefing — weather unavailable";
    } else if (best.band === "favorable") {
      headline = "Good " + best.label.toLowerCase() + " opportunity";
    } else if (best.band === "moderate") {
      headline = best.label + " looks workable";
    } else if (best.band === "limited") {
      headline = "Limited window — " + best.label.toLowerCase() + " still best among today";
    } else {
      headline = "Uncertain conditions — proceed carefully";
    }

    var whyLead = (best.why && best.why[0]) || "Mixed inputs.";
    var status = "ready";
    if (weatherStatus === "loading") status = "partial";
    if (!wx && locationStatus === "denied") status = "location_denied";
    else if (!wx) status = "weather_unavailable";
    else if (locationStatus === "denied") status = "partial";

    return {
      status: status,
      headline: headline,
      summaryLine: whyLead + " — Confidence: " + confidence + ".",
      favorability: favorability,
      confidence: confidence,
      confidenceWhy: confidenceWhy,
      bestWindowId: best.id,
      timeWindows: windows,
      areas: areas,
      signals: signals,
      uncertainties: uncertainties.slice(0, 6),
      observationInsight: patterns,
      recommendation: plan && plan.ok ? plan.recommendation : null,
      disclaimer: DISCLAIMER,
      epistemicNote:
        "Labels: fact = measured/fetched · analysis = interpreted · pattern = from your notes · " +
        "estimated = model guidance · uncertain = missing or weak."
    };
  }

  global.WaypointShedsTodaysSearch = {
    build: build,
    scoreWindow: scoreWindow,
    bandFromScore: bandFromScore,
    DISCLAIMER: DISCLAIMER
  };
})(typeof window !== "undefined" ? window : globalThis);
