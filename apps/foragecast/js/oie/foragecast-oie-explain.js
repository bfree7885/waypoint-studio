/**
 * ForageCast OIE — Layer 5: Natural-language explanations.
 * Opportunities, momentum, forecast intelligence, naturalist insights.
 */
(function (global) {
  "use strict";

  function momentumFrom(scored, derived, confidence) {
    var sig = (derived && derived.signals) || {};
    var score = scored.score;
    var drying = sig.dryingPeriod || sig.extendedDrought;
    var wetImproving = sig.rainfallTrend === "improving-later" || sig.rainfallTrend === "wet-pulse";
    var soilGood = sig.soilMoisturePersistence === "favorable";

    var id = "stable";
    var label = "Stable";
    var why = "Near-term signals are mixed or steady — expect similar suitability unless weather shifts.";

    if (wetImproving && score >= 0.4 && !drying) {
      id = score >= 0.55 ? "rapidly-improving" : "improving";
      label = id === "rapidly-improving" ? "Rapidly improving" : "Improving";
      why = "Forecast or recent moisture is reinforcing seasonal timing for this species.";
    } else if (drying || sig.rainfallTrend === "drying-after-pulse") {
      id = score < 0.45 ? "rapidly-declining" : "declining";
      label = id === "rapidly-declining" ? "Rapidly declining" : "Declining";
      why = "Drying pressure is rising — exposed habitats usually fade first.";
    } else if (soilGood && (confidence.band === "high" || confidence.band === "moderate")) {
      id = "stable";
      label = "Stable";
      why = "Moisture persistence is holding; suitability should remain similar for a short window.";
    } else if (!derived.liveWeather) {
      id = "stable";
      label = "Uncertain trend";
      why = "Without live forecast rows, directional momentum stays tentative.";
    }

    return { id: id, label: label, why: why };
  }

  function opportunityLine(species, scored, confidence, momentum) {
    var driver = (confidence.topDrivers && confidence.topDrivers[0]) || null;
    var limiter = (confidence.limitingFactors && confidence.limitingFactors[0]) || null;
    var why;
    if (confidence.band === "high") {
      why = "High confidence due to " +
        (driver ? driver.label.toLowerCase() : "aligned seasonal and moisture factors") +
        (driver && driver.value >= 0.6 ? " remaining supportive" : "") + ".";
    } else if (confidence.band === "moderate") {
      why = "Moderate confidence. " +
        (driver ? driver.label + " still helps" : "Some factors help") +
        (limiter ? ", but " + limiter.label.toLowerCase() + " is holding the score back" : "") + ".";
    } else {
      why = "Low confidence because " +
        (limiter ? limiter.label.toLowerCase() + " is weak" : "key factors are poorly aligned") +
        ((derivedDrought(confidence)) ? " after dry pressure" : "") + ".";
    }
    return {
      speciesId: species.id,
      name: species.name,
      level: scored.level,
      confidenceLabel: confidence.label.replace(/ confidence/i, ""),
      confidenceBand: confidence.band,
      text: species.name + " — " + confidence.label.replace(/ confidence/i, "") + " confidence. " + why,
      why: why,
      momentum: momentum,
      href: "species.html?id=" + encodeURIComponent(species.id),
      topDrivers: confidence.topDrivers,
      confidence: confidence
    };
  }

  function derivedDrought(confidence) {
    return (confidence.wouldReduce || []).some(function (x) {
      return /dry/i.test(x);
    });
  }

  function forecastIntelligence(derived, observations) {
    var lines = [];
    var sig = (derived && derived.signals) || {};
    var metrics = (derived && derived.metrics) || {};
    var live = derived && derived.liveWeather;

    if (!live) {
      lines.push({
        text: "Forecast intelligence is limited until live weather returns.",
        why: "ForageCast will not invent Tuesday rain or warm-night stories without provider data."
      });
      return lines;
    }

    if (sig.rainfallTrend === "improving-later") {
      lines.push({
        text: "Conditions likely improve after expected rainfall later in the forecast window.",
        why: "Later-day precip rises versus the near term — soil recharge may follow if amounts materialize."
      });
    }
    if (sig.rainfallTrend === "drying-after-pulse") {
      lines.push({
        text: "Dry conditions later this week will likely reduce productivity on exposed slopes.",
        why: "Near-term moisture fades in the forecast; litter dries fastest on south aspects."
      });
    }
    if (sig.rainfallTrend === "wet-pulse" && metrics.precipNearMm != null && metrics.precipNearMm >= 12) {
      lines.push({
        text: "Heavy rainfall may temporarily limit access even when moisture favors fungi.",
        why: "High near-term precip can leave trails slick and stream edges unsafe."
      });
    }
    if (sig.nighttimeCooling === "warm-nights") {
      lines.push({
        text: "Warm nights may extend the current biological window for heat-tolerant species.",
        why: "Limited overnight cooling keeps metabolism and moisture dynamics active longer."
      });
    }
    if (sig.nighttimeCooling === "cool-nights" || sig.nighttimeCooling === "frost-risk") {
      lines.push({
        text: "Cooler nights may slow soft fungal flush on open ground while sheltered draws hold longer.",
        why: "Nighttime cooling changes evaporation and mycelial activity at the surface."
      });
    }
    if (sig.heatAccumulation && /quickly/i.test(sig.heatAccumulation.label || "")) {
      lines.push({
        text: "Heat is accumulating quickly — mid-day stress may cut short morning opportunity windows.",
        why: sig.heatAccumulation.label
      });
    }
    if (!lines.length) {
      lines.push({
        text: "Near-term forecast looks relatively steady — watch for local showers that models may miss.",
        why: "No strong directional precip or overnight signal stood out in the provider rows."
      });
    }
    return lines.slice(0, 4);
  }

  function naturalistInsights(derived) {
    var sig = (derived && derived.signals) || {};
    var insights = [];
    if (sig.nighttimeCooling === "warm-nights") {
      insights.push("Extended warm nights often favor continued fungal activity when litter stays moist.");
    }
    if (sig.dryingPeriod || sig.extendedDrought) {
      insights.push("Repeated drying cycles may reduce fruiting on ridges while north-facing slopes remain worth a look.");
    }
    if (sig.soilMoisturePersistence === "favorable") {
      insights.push("North-facing slopes and ravines typically remain moist longer after the same rainfall.");
    }
    if (sig.temperatureSwing === "large") {
      insights.push("Large day–night temperature swings can stress soft fungi on exposed litter.");
    }
    if (sig.humidityPersistence === "high") {
      insights.push("Persistent humidity helps litter stay workable — still confirm species carefully.");
    }
    if (!insights.length) {
      insights.push("Microclimates matter: the same county can hold both dry ridges and wet draws on one afternoon.");
    }
    return insights.slice(0, 3).map(function (text) {
      return { text: text };
    });
  }

  function interpretEnvironment(derived) {
    var sig = (derived && derived.signals) || {};
    var bullets = [];
    var map = {
      rainfallTrend: {
        "wet-pulse": "A recent or near-term rainfall pulse is in play.",
        "improving-later": "Rainfall looks more helpful later in the forecast than today.",
        "drying-after-pulse": "A drying period is setting in after earlier moisture.",
        "extended-dry": "Extended dry conditions are reducing moisture suitability.",
        "stable-modest": "Precipitation looks modest and relatively steady.",
        "model-moist": "Educational model moisture is elevated (live weather unavailable).",
        "model-dry": "Educational model moisture is low (live weather unavailable).",
        "model-moderate": "Educational model moisture is moderate (live weather unavailable)."
      },
      soilMoisturePersistence: {
        favorable: "Soil moisture appears to be persisting in favorable ranges.",
        mixed: "Soil moisture persistence is mixed across habitats.",
        declining: "Soil moisture persistence is declining.",
        uncertain: "Soil moisture persistence is uncertain."
      }
    };

    if (map.rainfallTrend[sig.rainfallTrend]) {
      bullets.push({
        text: map.rainfallTrend[sig.rainfallTrend],
        why: "Rainfall trend is derived from provider daily precip or educational model inputs.",
        tone: /dry|declin/i.test(sig.rainfallTrend) ? "caution" : /wet|improv|moist|favor/i.test(sig.rainfallTrend) ? "favorable" : "neutral"
      });
    }
    if (map.soilMoisturePersistence[sig.soilMoisturePersistence]) {
      bullets.push({
        text: map.soilMoisturePersistence[sig.soilMoisturePersistence],
        why: "Persistence is inferred — not a buried soil probe reading.",
        tone: sig.soilMoisturePersistence === "favorable" ? "favorable"
          : sig.soilMoisturePersistence === "declining" ? "caution" : "neutral"
      });
    }
    if (sig.heatAccumulation && sig.heatAccumulation.label) {
      bullets.push({
        text: sig.heatAccumulation.label + ".",
        why: "Growing-degree style heat accumulation uses recent forecast day temperatures.",
        tone: /quickly/i.test(sig.heatAccumulation.label) ? "caution" : "neutral"
      });
    }
    if (sig.nighttimeCooling && sig.nighttimeCooling !== "unknown") {
      bullets.push({
        text: "Nighttime cooling pattern: " + sig.nighttimeCooling.replace(/-/g, " ") + ".",
        why: "Overnight lows shape evaporation and biological activity at the litter surface.",
        tone: sig.nighttimeCooling === "frost-risk" ? "caution" : "neutral"
      });
    }
    if (sig.humidityPersistence && sig.humidityPersistence !== "unknown") {
      bullets.push({
        text: "Humidity persistence is " + sig.humidityPersistence + ".",
        why: "Humidity helps explain whether litter stays workable between rains.",
        tone: sig.humidityPersistence === "low" ? "caution" : "neutral"
      });
    }
    if (sig.phenologicalTiming) {
      bullets.push({
        text: "Phenological timing context: " + String(sig.phenologicalTiming).replace(/-/g, " ") + ".",
        why: "Calendar season and day-of-year frame which species windows are even plausible.",
        tone: "neutral"
      });
    }
    if (!derived.liveWeather) {
      bullets.unshift({
        text: "Live weather is unavailable — environmental interpretation stays cautious.",
        why: "Provider package missing; ForageCast will not fabricate a field briefing.",
        tone: "uncertain"
      });
    }
    return {
      liveWeather: !!derived.liveWeather,
      source: derived.evidenceQuality,
      bullets: bullets.slice(0, 8)
    };
  }

  function buildNarratives(bundle) {
    var speciesList = bundle.speciesList || [];
    var scoredList = bundle.scoredList || [];
    var derived = bundle.derived;
    var byId = {};
    speciesList.forEach(function (s) { byId[s.id] = s; });

    var opportunities = scoredList.map(function (scored) {
      var species = byId[scored.speciesId];
      var confidence = global.ForageCastOIE.confidence.explainConfidence(
        scored,
        derived,
        bundle.previousById && bundle.previousById[scored.speciesId]
      );
      var momentum = momentumFrom(scored, derived, confidence);
      return opportunityLine(species, scored, confidence, momentum);
    });

    return {
      opportunities: opportunities,
      briefing: interpretEnvironment(derived),
      forecast: forecastIntelligence(derived, bundle.observations),
      insights: naturalistInsights(derived),
      momentumSummary: opportunities.slice(0, 3).map(function (o) {
        return {
          speciesId: o.speciesId,
          name: o.name,
          momentum: o.momentum
        };
      })
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.explain = {
    momentumFrom: momentumFrom,
    forecastIntelligence: forecastIntelligence,
    naturalistInsights: naturalistInsights,
    interpretEnvironment: interpretEnvironment,
    buildNarratives: buildNarratives
  };
})(typeof window !== "undefined" ? window : globalThis);
