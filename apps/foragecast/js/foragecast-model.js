/**
 * ForageCast prediction model — local placeholder logic
 */
(function (global) {
  "use strict";

  var DAY_OF_YEAR = dayOfYearFromDate(new Date());

  function dayOfYearFromDate(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    return Math.floor(diff / 86400000);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function seasonScore(species) {
    var diff = Math.abs(DAY_OF_YEAR - species.peakDayOfYear);
    var spread = species.seasonSpread || 30;
    return clamp(1 - diff / (spread * 1.8), 0, 1);
  }

  function temperatureScore(species, tempInput) {
    var ideal = species.idealTemp != null ? species.idealTemp : 0.6;
    return clamp(1 - Math.abs(tempInput - ideal) * 2.2, 0, 1);
  }

  function levelFromScore(score) {
    if (score >= 0.62) return "high";
    if (score >= 0.38) return "moderate";
    return "low";
  }

  function confidenceFromScore(score, factorSpread) {
    var spread = factorSpread || 0;
    if (spread > 0.35) return { level: "low", label: "Low confidence", reason: "Factors disagree — ground truth matters more than the model this week." };
    if (score >= 0.55 && spread < 0.2) return { level: "high", label: "Moderate confidence", reason: "Season and moisture mostly agree — still verify outdoors." };
    if (score < 0.35) return { level: "moderate", label: "Moderate confidence", reason: "Low readiness is clear, but local microclimates can surprise." };
    return { level: "moderate", label: "Moderate confidence", reason: "Placeholder model — treat as a reading guide, not a forecast." };
  }

  function computeFactorBreakdown(species, zone, conditions) {
    var affinity = (species.zoneAffinity && species.zoneAffinity[zone.id]) || {};
    var season = seasonScore(species);
    var factors = {
      seasonTiming: season,
      recentRainfall: conditions.inputs.recentRainfall,
      temperature: temperatureScore(species, conditions.inputs.temperature),
      soilMoisture: conditions.inputs.soilMoisture,
      elevation: affinity.elevation != null ? affinity.elevation : 0.5,
      slopeAspect: affinity.slopeAspect != null ? affinity.slopeAspect : 0.5,
      treeAssociation: affinity.treeAssociation != null ? affinity.treeAssociation : 0.5,
      landCover: affinity.landCover != null ? affinity.landCover : 0.5
    };
    return factors;
  }

  function weightedScore(species, factors) {
    var weights = species.factorWeights;
    var total = 0;
    var sum = 0;
    var values = [];
    Object.keys(weights).forEach(function (key) {
      var w = weights[key];
      var v = factors[key] != null ? factors[key] : 0.5;
      total += v * w;
      sum += w;
      values.push(v);
    });
    var score = sum ? total / sum : 0;
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    var variance = values.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / values.length;
    return { score: score, spread: Math.sqrt(variance) };
  }

  function computeZonePrediction(species, zone, conditions) {
    var factors = computeFactorBreakdown(species, zone, conditions);
    var result = weightedScore(species, factors);
    return {
      zoneId: zone.id,
      score: result.score,
      level: levelFromScore(result.score),
      factors: factors
    };
  }

  function computeCountyPrediction(species, zones, conditions) {
    var zoneResults = zones.map(function (zone) {
      return computeZonePrediction(species, zone, conditions);
    });
    zoneResults.sort(function (a, b) { return b.score - a.score; });

    var topZones = zoneResults.slice(0, 3);
    var countyScore = zoneResults.reduce(function (sum, z) { return sum + z.score; }, 0) / zoneResults.length;
    var factors = computeFactorBreakdown(species, zones[0], conditions);
    var factorResult = weightedScore(species, factors);
    var level = levelFromScore(countyScore);
    var confidence = confidenceFromScore(countyScore, factorResult.spread);

    var narratives = species.scoreNarratives || {};
    var explanation = narratives[level] || "Readiness reflects season, moisture, and habitat alignment for Pike County this week.";

    var topFactorEntries = Object.keys(factors).map(function (key) {
      return { key: key, value: factors[key], weight: species.factorWeights[key] || 0 };
    });
    topFactorEntries.sort(function (a, b) { return (b.value * b.weight) - (a.value * a.weight); });

    var whyFactors = topFactorEntries.slice(0, 3).map(function (f) {
      return factorReason(f.key, f.value, conditions);
    });

    return {
      readinessScore: Math.round(countyScore * 100),
      level: level,
      explanation: explanation,
      confidence: confidence,
      factors: factors,
      factorWeights: species.factorWeights,
      whyFactors: whyFactors,
      zoneResults: zoneResults,
      topZones: topZones,
      lookForOutside: species.lookForOutside || [],
      lessonNext: species.lessonNext,
      investigation: species.investigation
    };
  }

  function factorReason(key, value, conditions) {
    var labels = {
      seasonTiming: value >= 0.6 ? "Within the seasonal window for this species." : "Outside peak season — timing is the limiting factor.",
      recentRainfall: value >= 0.6 ? "Recent rain (" + (conditions.labels.recentRainfall || "adequate") + ") supports fruiting." : "Dry spell — moisture may be limiting.",
      temperature: value >= 0.6 ? "Temperatures align with species preference." : "Warmth or cool snap may be slowing activity.",
      soilMoisture: value >= 0.6 ? "Soil moisture favorable in many draws." : "Ridge tops and south slopes drying faster.",
      elevation: value >= 0.6 ? "Elevation bands in county match habitat." : "Wrong elevation band for this week.",
      slopeAspect: value >= 0.6 ? "North slopes and shaded draws holding moisture." : "South aspects drying — check north slopes instead.",
      treeAssociation: value >= 0.6 ? "Associated trees present in mapped zones." : "Host trees sparse in highest-scoring areas.",
      landCover: value >= 0.6 ? "Land cover types align with species needs." : "Land cover mismatch in key zones."
    };
    return labels[key] || "Factor contributing to score.";
  }

  global.ForageCastModel = {
    dayOfYear: DAY_OF_YEAR,
    computeCountyPrediction: computeCountyPrediction,
    computeZonePrediction: computeZonePrediction,
    levelFromScore: levelFromScore
  };
})(typeof window !== "undefined" ? window : global);
