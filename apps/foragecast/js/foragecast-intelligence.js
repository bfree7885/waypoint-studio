/**
 * ForageCast Outdoor Intelligence — interpret conditions & species status.
 * Educational local index + live weather when available.
 * Never invents observations; labels uncertainty honestly.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s);
  }

  function dayOfYear(d) {
    d = d || new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function seasonPhase(species, doy) {
    doy = doy != null ? doy : (global.ForageCastModel && ForageCastModel.dayOfYear) || dayOfYear();
    var peak = species.peakDayOfYear;
    var spread = species.seasonSpread || 30;
    var diff = doy - peak;
    var abs = Math.abs(diff);
    if (abs > spread * 1.6) {
      return diff < 0
        ? { id: "beginning", label: "Beginning", note: "Season has not opened yet for this species." }
        : { id: "ending", label: "Ending", note: "Season has largely passed for typical elevations." };
    }
    if (diff < -spread * 0.55) {
      return { id: "developing", label: "Developing", note: "Conditions may be building toward the seasonal window." };
    }
    if (abs <= spread * 0.35) {
      return { id: "peak", label: "Peak", note: "Within the core seasonal window — still verify outdoors." };
    }
    if (diff > 0) {
      return { id: "declining", label: "Declining", note: "Past peak timing; cooler or moister microclimates may linger." };
    }
    return { id: "developing", label: "Developing", note: "Approaching the seasonal window." };
  }

  function weatherModule(platform) {
    return (platform && platform.modules && platform.modules.weather) ||
      (platform && platform.weather) ||
      null;
  }

  function liveWeatherAvailable(platform) {
    var w = weatherModule(platform);
    if (!w) return false;
    if (w.status === "live" || w.isLive) return true;
    if (w.current || (w.daily && w.daily.length)) return true;
    return false;
  }

  /**
   * Interpret environmental conditions into plain-language briefing bullets.
   * Uses live weather when present; otherwise states uncertainty.
   */
  function interpretConditions(platform, conditions, homeData) {
    var bullets = [];
    var live = liveWeatherAvailable(platform);
    var wx = global.ForageCastToday && ForageCastToday.weatherSignals
      ? ForageCastToday.weatherSignals(platform, homeData)
      : {};
    var weather = weatherModule(platform);
    var daily = weather && weather.daily;
    var current = weather && weather.current;
    var rainfall = platform && platform.rainfall;
    var source = live ? "live-weather" : "model-and-editorial";

    if (!live) {
      bullets.push({
        text: "Live weather is unavailable right now — treating environmental signals as uncertain.",
        why: "Open-Meteo (or the configured provider) did not return a usable package. Recommendations stay cautious.",
        tone: "uncertain",
        source: source
      });
    }

    if (live && wx.rainSoon && wx.rainInchesHint) {
      bullets.push({
        text: "Soil moisture should rise after roughly " + wx.rainInchesHint + "\" of forecast rainfall.",
        why: "Wet litter and damp soil after rain often improve short-term conditions for moisture-loving fungi — still verify outdoors.",
        tone: "favorable",
        source: source
      });
    } else if (live && wx.rainRecentHint) {
      bullets.push({
        text: "Recent rainfall leaves soil moisture elevated in sheltered ground.",
        why: "North slopes, ravines, and leaf litter hold moisture longer than exposed ridges after rain.",
        tone: "favorable",
        source: source
      });
    } else if (live && !wx.rainSoon && !wx.rainRecentHint && wx.hot) {
      bullets.push({
        text: "Dry, warm conditions reduce likelihood despite seasonal timing.",
        why: "Heat and evaporation dry litter quickly — fruiting signals weaken on exposed aspects until moisture returns.",
        tone: "caution",
        source: source
      });
    }

    if (live && wx.rainSoon) {
      bullets.push({
        text: "Rain is in the near-term forecast" +
          (wx.rainInchesHint ? " (about " + wx.rainInchesHint + "\" possible)." : "."),
        why: "Forecast precipitation can lift soil moisture and reduce the need to irrigate cultivated beds.",
        tone: "favorable",
        source: source
      });
    } else if (live && wx.rainRecentHint) {
      bullets.push({
        text: "Recent moisture signals remain elevated in the regional package.",
        why: "Soil moisture after rainfall often supports fungal fruiting and softens leaf litter — confirm on the ground.",
        tone: "favorable",
        source: source
      });
    } else if (live) {
      bullets.push({
        text: "No strong rainfall pulse is showing in the next day of the forecast.",
        why: "Without fresh moisture, south aspects and ridges often dry first; check shaded draws instead.",
        tone: "neutral",
        source: source
      });
    }

    if (rainfall && rainfall.recent && rainfall.recent.summary) {
      bullets.push({
        text: "Rainfall context: " + rainfall.recent.summary,
        why: "Recent rainfall is one of the strongest short-term foraging signals when season timing also aligns.",
        tone: "neutral",
        source: source
      });
    } else if (conditions && conditions.labels && conditions.labels.recentRainfall) {
      bullets.push({
        text: "Model rainfall label: " + conditions.labels.recentRainfall,
        why: live
          ? "Live package did not include a rainfall summary; using hydrated model labels cautiously."
          : "This label comes from the educational conditions model — not a live gauge reading.",
        tone: "uncertain",
        source: "model"
      });
    }

    if (live && wx.hot) {
      bullets.push({
        text: "Heat stress is likely after mid-day.",
        why: "High daytime highs increase evaporation and can shut down soft fungi on exposed slopes.",
        tone: "caution",
        source: source
      });
    }

    if (live && wx.frostRisk) {
      bullets.push({
        text: "Overnight lows approach frost risk.",
        why: "Near-freezing nights can damage open blossoms and pause some fungal activity.",
        tone: "caution",
        source: source
      });
    }

    if (live && current && current.temperature != null) {
      bullets.push({
        text: "Current temperature near " + Math.round(Number(current.temperature)) + "°" +
          (current.conditions ? " · " + current.conditions : ""),
        why: "Temperature relative to each species’ preferred band shapes the educational readiness index.",
        tone: "neutral",
        source: source
      });
    } else if (conditions && conditions.labels && conditions.labels.temperature) {
      bullets.push({
        text: "Temperature context: " + conditions.labels.temperature,
        why: "Without a live reading, this is an educational model label for the week.",
        tone: "uncertain",
        source: "model"
      });
    }

    if (conditions && conditions.labels && conditions.labels.soilMoisture) {
      bullets.push({
        text: "Soil moisture: " + conditions.labels.soilMoisture,
        why: "Moisture held in ravines and north slopes often outlasts ridge tops after warm spells.",
        tone: /elevat|moist|favor/i.test(conditions.labels.soilMoisture) ? "favorable" : "neutral",
        source: live ? source : "model"
      });
    }

    if (daily && daily.length > 1) {
      var todayP = Number(daily[0].precipitationSum != null ? daily[0].precipitationSum : daily[0].precipMm);
      var laterP = Number(daily[2] && (daily[2].precipitationSum != null ? daily[2].precipitationSum : daily[2].precipMm));
      if (!isNaN(todayP) && !isNaN(laterP) && laterP + 1 < todayP) {
        bullets.push({
          text: "A drying trend is possible later this week.",
          why: "Forecast precipitation drops after the near term — scouting sooner may be wiser than waiting.",
          tone: "caution",
          source: source
        });
      } else if (!isNaN(todayP) && !isNaN(laterP) && laterP > todayP + 2) {
        bullets.push({
          text: "Conditions may improve later this week if forecast moisture arrives.",
          why: "Higher precipitation later in the forecast can recharge litter and soil — still not a guarantee of fruiting.",
          tone: "favorable",
          source: source
        });
      }
    }

    if (!bullets.length) {
      bullets.push({
        text: "Not enough environmental data to interpret today’s conditions confidently.",
        why: "ForageCast will not invent a weather story. Try again when the location and weather providers respond.",
        tone: "uncertain",
        source: "none"
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      liveWeather: live,
      source: source,
      bullets: bullets.slice(0, 8)
    };
  }

  function weekTrend(species, prediction) {
    var phase = seasonPhase(species);
    var level = prediction && prediction.level;
    if (phase.id === "peak" && (level === "high" || level === "moderate")) {
      return {
        label: "Hold or brief peak",
        detail: "If moisture holds, the next several days remain the best window — then expect decline."
      };
    }
    if (phase.id === "developing") {
      return {
        label: "Building",
        detail: "Watch for rain and favorable overnight lows; readiness may rise if moisture arrives."
      };
    }
    if (phase.id === "declining" || phase.id === "ending") {
      return {
        label: "Winding down",
        detail: "Expect fewer productive sites; cooler microclimates may linger briefly."
      };
    }
    if (phase.id === "beginning") {
      return {
        label: "Still early",
        detail: "Use this week to learn habitat rather than expect harvest."
      };
    }
    return {
      label: "Uncertain",
      detail: "Trend depends on weather that is not fully available right now."
    };
  }

  function buildSpeciesCards(speciesList, zones, conditions) {
    if (global.ForageCastOIE && ForageCastOIE.engine) {
      return ForageCastOIE.engine.buildSummary({
        speciesList: speciesList,
        zones: zones,
        conditions: conditions
      }).species;
    }
    if (!global.ForageCastModel || !speciesList || !zones || !conditions) return [];
    return speciesList.map(function (species) {
      var prediction = ForageCastModel.computeCountyPrediction(species, zones, conditions);
      var phase = seasonPhase(species);
      var confLabel = prediction.confidence && prediction.confidence.label
        ? prediction.confidence.label.replace(/ confidence/i, "")
        : prediction.level;
      var why = (prediction.whyFactors && prediction.whyFactors[0]) ||
        (prediction.confidence && prediction.confidence.reason) ||
        prediction.explanation;
      return {
        id: species.id,
        name: species.name,
        scientificName: species.scientificName,
        level: prediction.level,
        confidenceLabel: confLabel,
        confidenceReason: prediction.confidence && prediction.confidence.reason,
        phase: phase,
        explanation: prediction.explanation,
        why: why,
        whyFactors: prediction.whyFactors || [],
        readinessScore: prediction.readinessScore,
        trend: weekTrend(species, prediction),
        preferredHabitat: species.preferredHabitat ||
          ((species.investigation && species.investigation.where) || ""),
        lookAlikes: species.lookAlikes || [],
        ethicalHarvest: species.ethicalHarvest ||
          ((species.investigation && species.investigation.doNotDisturb) || []),
        identification: species.lookForOutside || [],
        href: "species.html?id=" + encodeURIComponent(species.id),
        prediction: prediction
      };
    }).sort(function (a, b) {
      var order = { high: 0, moderate: 1, low: 2 };
      return (order[a.level] != null ? order[a.level] : 9) - (order[b.level] != null ? order[b.level] : 9) ||
        b.readinessScore - a.readinessScore;
    });
  }

  function buildSummary(options) {
    options = options || {};
    if (global.ForageCastOIE && ForageCastOIE.engine) {
      return ForageCastOIE.engine.buildSummary(options);
    }
    var speciesList = options.speciesList || [];
    var zones = options.zones || [];
    var conditions = options.conditions || {};
    var platform = options.platform || null;
    var homeData = options.homeData || null;
    var cards = buildSpeciesCards(speciesList, zones, conditions);
    var briefing = interpretConditions(platform, conditions, homeData);
    var statements = [];

    cards.slice(0, 5).forEach(function (card) {
      statements.push({
        kind: "species",
        speciesId: card.id,
        text: card.name + ": " + card.confidenceLabel + " confidence (" + card.level + " alignment)",
        why: card.why,
        href: card.href,
        level: card.level
      });
    });

    briefing.bullets.forEach(function (b) {
      statements.push({
        kind: "condition",
        text: b.text,
        why: b.why,
        tone: b.tone,
        level: b.tone === "caution" ? "low" : b.tone === "favorable" ? "high" : "moderate"
      });
    });

    var locName = (options.location && (options.location.name || options.location.county)) ||
      (conditions.region && conditions.region.county) ||
      "your area";

    return {
      title: "Today’s foraging summary",
      question: "What should I be looking for today, and why?",
      locationLabel: locName,
      liveWeather: briefing.liveWeather,
      generatedAt: new Date().toISOString(),
      honesty: briefing.liveWeather
        ? "Species alignment uses an educational local index. Weather bullets use the live provider when available."
        : "Species alignment uses an educational local index. Live weather was unavailable — environmental statements stay uncertain.",
      species: cards,
      briefing: briefing,
      statements: statements,
      topActions: options.todayPlan && options.todayPlan.actions
        ? options.todayPlan.actions.slice(0, 4)
        : []
    };
  }

  function timelineForSpecies(species) {
    var phases = ["beginning", "developing", "peak", "declining", "ending"];
    var current = seasonPhase(species);
    return {
      speciesId: species.id,
      name: species.name,
      seasonWindow: species.seasonWindow,
      current: current,
      phases: phases.map(function (id) {
        return {
          id: id,
          label: id.charAt(0).toUpperCase() + id.slice(1),
          active: current.id === id
        };
      })
    };
  }

  global.ForageCastIntelligence = {
    seasonPhase: seasonPhase,
    interpretConditions: interpretConditions,
    buildSpeciesCards: buildSpeciesCards,
    buildSummary: buildSummary,
    timelineForSpecies: timelineForSpecies,
    weekTrend: weekTrend,
    liveWeatherAvailable: liveWeatherAvailable
  };
})(typeof window !== "undefined" ? window : globalThis);
