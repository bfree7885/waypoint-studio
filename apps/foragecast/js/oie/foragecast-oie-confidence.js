/**
 * ForageCast OIE — Layer 4: Confidence calculations + transparency answers.
 */
(function (global) {
  "use strict";

  function levelFromScore(score, spread, live) {
    if (!live && spread > 0.28) {
      return {
        level: "low",
        label: "Low confidence",
        band: "low"
      };
    }
    if (score >= 0.62 && spread < 0.22) {
      return { level: "high", label: "High confidence", band: "high" };
    }
    if (score >= 0.38) {
      return { level: "moderate", label: "Moderate confidence", band: "moderate" };
    }
    return { level: "low", label: "Low confidence", band: "low" };
  }

  function explainConfidence(scored, derived, previousScored) {
    derived = derived || { signals: {}, liveWeather: false };
    var conf = levelFromScore(scored.score, scored.factorSpread, derived.liveWeather);
    var drivers = scored.topDrivers || [];
    var limiters = scored.limitingFactors || [];

    var whyHigh = [];
    var whyLow = [];
    if (conf.band === "high") {
      whyHigh.push("Seasonal timing and moisture-related factors mostly agree.");
      drivers.forEach(function (d) {
        if (d.value >= 0.55) {
          whyHigh.push(d.label + " is supportive (weighted contribution leading the score).");
        }
      });
    } else if (conf.band === "moderate") {
      whyHigh.push("Some factors align, but not strongly enough for high confidence.");
      whyLow.push("Factor disagreement or mid-range seasonal timing keeps certainty tempered.");
    } else {
      whyLow.push("Key drivers are weak or conflicting for this species right now.");
      limiters.forEach(function (d) {
        whyLow.push(d.label + " is currently limiting.");
      });
      if (!derived.liveWeather) {
        whyLow.push("Live weather was unavailable — scores stay educational and cautious.");
      }
    }

    var changedSinceYesterday = [];
    if (previousScored && previousScored.score != null) {
      var delta = scored.score - previousScored.score;
      if (Math.abs(delta) >= 0.05) {
        changedSinceYesterday.push(
          (delta > 0 ? "Suitability rose" : "Suitability fell") +
            " by about " + Math.round(Math.abs(delta) * 100) + " index points versus the prior cached reading."
        );
      } else {
        changedSinceYesterday.push("Suitability is little changed versus the prior cached reading.");
      }
    } else {
      var sig = derived.signals || {};
      if (sig.rainfallTrend && sig.rainfallTrend !== "unknown") {
        changedSinceYesterday.push("Rainfall trend signal: " + sig.rainfallTrend.replace(/-/g, " ") + ".");
      }
      if (sig.soilMoisturePersistence) {
        changedSinceYesterday.push("Soil moisture persistence: " + sig.soilMoisturePersistence + ".");
      }
      if (!changedSinceYesterday.length) {
        changedSinceYesterday.push(
          "No prior day cache yet — comparing against environmental signals from this load only."
        );
      }
    }

    var wouldImprove = [
      "Sustained moisture without extreme mid-day heat",
      "Overnight temperatures nearer this species’ preferred band",
      "Seasonal timing moving closer to the peak window"
    ];
    var wouldReduce = [
      "Extended drying of litter and shallow soil",
      "Hard heat after noon on exposed slopes",
      "Moving further outside the seasonal window"
    ];
    if ((derived.signals || {}).extendedDrought) {
      wouldImprove.unshift("A meaningful rainfall pulse that recharges soil moisture");
      wouldReduce.unshift("Another dry stretch without recharge");
    }

    return {
      band: conf.band,
      label: conf.label,
      level: conf.level,
      score: scored.score,
      readinessScore: scored.readinessScore,
      whyHigh: whyHigh,
      whyLow: whyLow,
      changedSinceYesterday: changedSinceYesterday,
      wouldImprove: wouldImprove,
      wouldReduce: wouldReduce,
      topDrivers: drivers,
      limitingFactors: limiters,
      evidenceQuality: derived.evidenceQuality || "unknown"
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.confidence = {
    levelFromScore: levelFromScore,
    explainConfidence: explainConfidence
  };
})(typeof window !== "undefined" ? window : globalThis);
