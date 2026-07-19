/**
 * ForageCast OIE — Layer 3: Species suitability scoring (transparent weights).
 */
(function (global) {
  "use strict";

  var DEFAULT_WEIGHTS = {
    recentPrecipitation: 0.18,
    temperaturePattern: 0.14,
    humidity: 0.10,
    soilMoisture: 0.16,
    seasonalTiming: 0.24,
    elevation: 0.06,
    slopeAspect: 0.06,
    canopy: 0.06
  };

  var FACTOR_LABELS = {
    recentPrecipitation: "Recent precipitation",
    temperaturePattern: "Temperature patterns",
    humidity: "Humidity",
    soilMoisture: "Soil moisture",
    seasonalTiming: "Seasonal timing",
    elevation: "Elevation (future-ready)",
    slopeAspect: "Slope / aspect (future-ready)",
    canopy: "Canopy conditions (future-ready)"
  };

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function dayOfYear() {
    if (global.ForageCastModel && ForageCastModel.dayOfYear) return ForageCastModel.dayOfYear;
    var d = new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function seasonTimingForSpecies(species) {
    var peak = species.peakDayOfYear;
    var spread = species.seasonSpread || 30;
    var doy = dayOfYear();
    var diff = Math.abs(doy - peak);
    return clamp(1 - diff / (spread * 1.8), 0, 1);
  }

  function temperatureFit(species, tempFactor) {
    var ideal = species.idealTemp != null ? species.idealTemp : 0.6;
    return clamp(1 - Math.abs(tempFactor - ideal) * 2.2, 0, 1);
  }

  /**
   * Map species.factorWeights (legacy model keys) into OIE factor weights when present.
   */
  function resolveWeights(species) {
    var w = Object.assign({}, DEFAULT_WEIGHTS);
    var legacy = species.factorWeights || {};
    if (legacy.recentRainfall != null) w.recentPrecipitation = legacy.recentRainfall;
    if (legacy.temperature != null) w.temperaturePattern = legacy.temperature;
    if (legacy.soilMoisture != null) w.soilMoisture = legacy.soilMoisture;
    if (legacy.seasonTiming != null) w.seasonalTiming = legacy.seasonTiming;
    if (legacy.elevation != null) w.elevation = legacy.elevation;
    if (legacy.slopeAspect != null) w.slopeAspect = legacy.slopeAspect;
    // Normalize
    var sum = 0;
    Object.keys(w).forEach(function (k) { sum += w[k]; });
    if (sum > 0) {
      Object.keys(w).forEach(function (k) { w[k] = w[k] / sum; });
    }
    return w;
  }

  function scoreSpecies(species, derived, zones, conditions) {
    derived = derived || { factors: {} };
    var env = derived.factors || {};
    var weights = resolveWeights(species);

    var factorValues = {
      recentPrecipitation: env.recentPrecipitation != null ? env.recentPrecipitation : 0.5,
      temperaturePattern: temperatureFit(species, env.temperaturePattern != null ? env.temperaturePattern : 0.5),
      humidity: env.humidity != null ? env.humidity : 0.5,
      soilMoisture: env.soilMoisture != null ? env.soilMoisture : 0.5,
      seasonalTiming: seasonTimingForSpecies(species),
      elevation: env.elevation != null ? env.elevation : 0.5,
      slopeAspect: env.slopeAspect != null ? env.slopeAspect : 0.5,
      canopy: env.canopy != null ? env.canopy : 0.5
    };

    // Optional zone affinity blend for future spatial readiness (neutral average today)
    if (zones && zones.length && species.zoneAffinity && global.ForageCastModel) {
      var zoneScores = zones.map(function (z) {
        return ForageCastModel.computeZonePrediction(species, z, conditions || { inputs: factorValues });
      });
      var meanZone = zoneScores.reduce(function (a, z) { return a + z.score; }, 0) / zoneScores.length;
      // Soft blend: keep factor transparency primary
      factorValues._zoneBlend = meanZone;
    }

    var contributions = [];
    var total = 0;
    Object.keys(weights).forEach(function (key) {
      var value = factorValues[key];
      var weight = weights[key];
      var contribution = value * weight;
      total += contribution;
      contributions.push({
        key: key,
        label: FACTOR_LABELS[key] || key,
        value: value,
        weight: weight,
        contribution: contribution,
        futureReady: key === "elevation" || key === "slopeAspect" || key === "canopy"
      });
    });
    contributions.sort(function (a, b) { return b.contribution - a.contribution; });

    var values = contributions.map(function (c) { return c.value; });
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    var variance = values.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / values.length;
    var spread = Math.sqrt(variance);

    var level = total >= 0.62 ? "high" : total >= 0.38 ? "moderate" : "low";

    return {
      speciesId: species.id,
      name: species.name,
      score: total,
      readinessScore: Math.round(total * 100),
      level: level,
      factorValues: factorValues,
      weights: weights,
      contributions: contributions,
      topDrivers: contributions.filter(function (c) { return !c.futureReady; }).slice(0, 3),
      limitingFactors: contributions
        .filter(function (c) { return !c.futureReady; })
        .slice()
        .sort(function (a, b) { return a.value - b.value; })
        .slice(0, 2),
      factorSpread: spread,
      zoneBlend: factorValues._zoneBlend != null ? factorValues._zoneBlend : null
    };
  }

  function scoreAll(speciesList, derived, zones, conditions) {
    return (speciesList || []).map(function (sp) {
      return scoreSpecies(sp, derived, zones, conditions);
    }).sort(function (a, b) {
      return b.score - a.score;
    });
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.scoring = {
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    FACTOR_LABELS: FACTOR_LABELS,
    scoreSpecies: scoreSpecies,
    scoreAll: scoreAll,
    resolveWeights: resolveWeights
  };
})(typeof window !== "undefined" ? window : globalThis);
