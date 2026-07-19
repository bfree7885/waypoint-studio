/**
 * Savant Sommelier — Vineyard Intelligence engine.
 * Property analysis + Future Vineyard horizons with explanation layer.
 * Scenario estimates — not certified agronomy or precision climate downscaling.
 */
(function (global) {
  "use strict";

  var METRIC_WHY = {
    elevation: "Elevation influences temperature, frost timing, and growing-season length.",
    slope: "Slope affects cold-air drainage, erosion risk, and workable vineyard rows.",
    aspect: "Aspect changes solar exposure and afternoon heat — critical for ripening cool-climate grapes.",
    terrain: "Terrain context frames whether a site traps cold air or sheds it.",
    drainage: "Poor drainage raises disease pressure and winter injury risk for roots.",
    solarExposure: "Solar exposure drives photosynthesis and berry ripening pace.",
    gdd: "Growing Degree Days summarize heat available to ripen fruit for a given cultivar.",
    hardinessZone: "USDA hardiness zones approximate winter cold extremes vines must survive.",
    climateClass: "Climate class is a teaching shorthand for maritime vs continental heat patterns.",
    rainfall: "Rainfall shapes water availability and fungal disease pressure.",
    humidity: "Humidity elevates mildew and rot risk during bloom and veraison.",
    heatAccumulation: "Heat accumulation supports ripening but excess can mute acidity and aromatics.",
    coldAccumulation: "Winter chill and cold accumulation relate to dormancy and freeze injury risk.",
    springFrost: "Spring frost can destroy young shoots and erase a crop year.",
    fallFrost: "Early fall frost can halt late ripening before physiological maturity.",
    wind: "Wind can reduce disease pressure but also stress canopies and increase water demand.",
    diseasePressure: "Disease pressure combines humidity, rainfall, and canopy density risk.",
    waterAvailability: "Water availability balances drought stress against dilution and vigor.",
    seasonLength: "Season length must fit the grape’s ripening window between last and first frost."
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function aspectLabel(deg) {
    if (deg == null || !isFinite(deg)) return { label: "unknown", solar: "uncertain" };
    var d = ((Number(deg) % 360) + 360) % 360;
    if (d >= 337.5 || d < 22.5) return { label: "north", solar: "low" };
    if (d < 67.5) return { label: "northeast", solar: "low-moderate" };
    if (d < 112.5) return { label: "east", solar: "moderate" };
    if (d < 157.5) return { label: "southeast", solar: "moderate-high" };
    if (d < 202.5) return { label: "south", solar: "high" };
    if (d < 247.5) return { label: "southwest", solar: "high" };
    if (d < 292.5) return { label: "west", solar: "moderate-high" };
    return { label: "northwest", solar: "low-moderate" };
  }

  function estimateGddF(lat, elevationM, aspectSolar) {
    lat = Math.abs(Number(lat) || 40);
    elevationM = Number(elevationM) || 200;
    var base = 4200 - lat * 55 - elevationM * 1.1;
    if (aspectSolar === "high") base += 180;
    else if (aspectSolar === "moderate-high") base += 90;
    else if (aspectSolar === "low") base -= 160;
    else if (aspectSolar === "low-moderate") base -= 80;
    return Math.round(clamp(base, 1200, 4800));
  }

  function hardinessFromLat(lat, elevationM) {
    lat = Math.abs(Number(lat) || 40);
    elevationM = Number(elevationM) || 200;
    var zone = 13 - lat / 5.5 - elevationM / 400;
    zone = clamp(Math.round(zone * 2) / 2, 3, 10);
    return String(zone);
  }

  function climateClass(lat, rainfallMm) {
    lat = Math.abs(Number(lat) || 40);
    rainfallMm = Number(rainfallMm) || 900;
    if (lat < 35 && rainfallMm < 500) return "warm-arid / mediterranean-leaning";
    if (lat < 42 && rainfallMm < 700) return "warm-temperate / mediterranean-leaning";
    if (lat >= 45) return "cool-continental / maritime-border";
    return "temperate / mixed continental-maritime";
  }

  function metric(id, label, value, unit, confidence, detail) {
    return {
      id: id,
      label: label,
      value: value,
      unit: unit || null,
      confidence: confidence,
      whyItMatters: METRIC_WHY[id] || detail || "",
      detail: detail || null
    };
  }

  /**
   * Analyze a property from coordinates + optional terrain hints.
   * Uses educational estimators when live DEM/climate layers are absent.
   */
  function analyzeProperty(input) {
    input = input || {};
    var lat = input.lat != null ? Number(input.lat) : null;
    var lng = input.lng != null ? Number(input.lng) : null;
    var elevationM = input.elevationM != null ? Number(input.elevationM) : (lat != null ? Math.round(80 + Math.abs(lat) * 4) : null);
    var slopeDeg = input.slopeDeg != null ? Number(input.slopeDeg) : 4;
    var aspectDeg = input.aspectDeg != null ? Number(input.aspectDeg) : (input.aspect != null && !isNaN(Number(input.aspect)) ? Number(input.aspect) : 180);
    var aspect = aspectLabel(aspectDeg);
    var rainfallMm = input.rainfallMm != null ? Number(input.rainfallMm) : 850;
    var humidity = input.humidity != null ? Number(input.humidity) : 65;
    var gdd = input.gddF != null ? Number(input.gddF) : (lat != null ? estimateGddF(lat, elevationM, aspect.solar) : null);
    var zone = input.hardinessZone || (lat != null ? hardinessFromLat(lat, elevationM) : null);
    var seasonLength = input.seasonLengthDays != null ? Number(input.seasonLengthDays) : (gdd != null ? Math.round(140 + (gdd - 2000) / 40) : null);
    var drainage = slopeDeg >= 6 ? "good (sloped)" : slopeDeg >= 3 ? "moderate" : "watch — flatter sites may need careful water management";
    var disease = humidity >= 70 || rainfallMm >= 1000 ? "elevated" : humidity >= 55 ? "moderate" : "lower";
    var springFrost = elevationM != null && elevationM < 150 && slopeDeg < 3 ? "elevated (cold-air pooling risk)" : "moderate";
    var fallFrost = gdd != null && gdd < 2200 ? "earlier frost risk for late grapes" : "typical for latitude";
    var water = rainfallMm < 500 ? "limited — irrigation often considered" : rainfallMm > 1200 ? "abundant — canopy and disease management matter" : "generally adequate with seasonal variability";
    var confidence = lat != null && lng != null
      ? (input.elevationM != null && input.gddF != null ? "moderate" : "educational-estimate")
      : "low";

    var metrics = [
      metric("elevation", "Elevation", elevationM, "m", confidence, "Estimated or provided site elevation."),
      metric("slope", "Slope", slopeDeg, "°", input.slopeDeg != null ? "user/site" : "educational-estimate", "Steeper slopes drain cold air; very steep sites complicate operations."),
      metric("aspect", "Aspect", aspect.label + (aspectDeg != null ? " (~" + Math.round(aspectDeg) + "°)" : ""), null, input.aspectDeg != null ? "user/site" : "educational-estimate", "Solar class: " + aspect.solar + "."),
      metric("terrain", "Terrain", slopeDeg >= 8 ? "hillside" : slopeDeg >= 3 ? "rolling" : "valley / gentle", null, "educational-estimate", null),
      metric("drainage", "Drainage", drainage, null, "educational-estimate", null),
      metric("solarExposure", "Solar exposure", aspect.solar, null, "derived", null),
      metric("gdd", "Growing Degree Days", gdd, "°F·day (approx.)", confidence, "Base-50°F educational estimate unless overridden."),
      metric("hardinessZone", "USDA Hardiness Zone", zone, null, confidence, "Approximate from latitude/elevation when not provided."),
      metric("climateClass", "Climate classification", climateClass(lat, rainfallMm), null, "educational-estimate", null),
      metric("rainfall", "Rainfall", rainfallMm, "mm/yr (approx.)", input.rainfallMm != null ? "provided" : "educational-estimate", null),
      metric("humidity", "Humidity", humidity, "% (growing season approx.)", input.humidity != null ? "provided" : "educational-estimate", null),
      metric("heatAccumulation", "Heat accumulation", gdd != null ? (gdd >= 3000 ? "high" : gdd >= 2300 ? "moderate-high" : gdd >= 1800 ? "moderate" : "cool") : "unknown", null, confidence, null),
      metric("coldAccumulation", "Cold / winter risk", zone != null && Number(zone) <= 5 ? "significant winter cold" : zone != null && Number(zone) <= 7 ? "moderate winter cold" : "milder winters", null, confidence, null),
      metric("springFrost", "Spring frost", springFrost, null, "educational-estimate", null),
      metric("fallFrost", "Fall frost", fallFrost, null, "educational-estimate", null),
      metric("wind", "Wind", input.wind || "site-dependent (not modeled precisely here)", null, "low", "Live wind layers are future architecture."),
      metric("diseasePressure", "Disease pressure", disease, null, "educational-estimate", null),
      metric("waterAvailability", "Water availability", water, null, "educational-estimate", null),
      metric("seasonLength", "Growing season length", seasonLength, "days (approx.)", confidence, null)
    ];

    return {
      version: "1.0.0",
      analyzedAt: new Date().toISOString(),
      site: {
        lat: lat,
        lng: lng,
        label: input.label || "Selected site",
        elevationM: elevationM,
        slopeDeg: slopeDeg,
        aspectDeg: aspectDeg
      },
      confidence: confidence,
      honesty: "Metrics marked educational-estimate are teaching models for product recovery — not surveyed DEM, weather-station normals, or certified vineyard advice.",
      metrics: metrics,
      summaryWhy: buildPropertySummary(metrics, aspect, gdd, disease)
    };
  }

  function buildPropertySummary(metrics, aspect, gdd, disease) {
    var parts = [];
    if (aspect && aspect.solar) {
      parts.push("Solar exposure trends " + aspect.solar + " based on aspect, which shapes ripening pace.");
    }
    if (gdd != null) {
      parts.push("Approximate heat accumulation near " + gdd + " GDD helps screen which grapes can ripen here.");
    }
    parts.push("Disease pressure looks " + disease + " from humidity/rainfall heuristics — canopy management would matter in wetter years.");
    return parts.join(" ");
  }

  function scoreGrape(grape, gdd, disease, humidity, horizonWarmingC) {
    var ideal = grape.idealGddF || [2000, 3000];
    var mid = (ideal[0] + ideal[1]) / 2;
    var warmedGdd = gdd + horizonWarmingC * 180;
    var dist = Math.abs(warmedGdd - mid);
    var span = (ideal[1] - ideal[0]) / 2 || 400;
    var heatScore = clamp(100 - (dist / span) * 45, 15, 96);

    if (warmedGdd < ideal[0]) heatScore -= 8;
    if (warmedGdd > ideal[1]) heatScore -= 10;

    var diseasePenalty = 0;
    if (grape.diseaseSensitivity === "high" && (disease === "elevated" || humidity >= 70)) diseasePenalty = 12;
    else if (grape.diseaseSensitivity === "moderate" && disease === "elevated") diseasePenalty = 6;

    var heatStress = warmedGdd > ideal[1] + 200 ? "elevated" : warmedGdd > ideal[1] ? "rising" : "acceptable";
    var freezeRisk = grape.frostSensitivity === "high" ? "watch spring frost" : "moderate";
    var score = clamp(Math.round(heatScore - diseasePenalty), 10, 95);

    return {
      grapeId: grape.id,
      name: grape.name,
      score: score,
      confidence: "scenario-estimate",
      climateSuitability: score >= 75 ? "favorable" : score >= 55 ? "marginal-to-favorable" : "challenging",
      expectedQuality: score >= 80 ? "high potential when farming matches site" : score >= 60 ? "variable — vintage and farming dependent" : "often constrained by climate fit",
      heatStress: heatStress,
      diseasePressure: diseasePenalty >= 10 ? "elevated for this grape" : disease === "elevated" ? "site disease pressure elevated" : "moderate",
      freezeRisk: freezeRisk,
      waterDemand: grape.waterDemand || "moderate",
      growingChallenges: challengesFor(grape, warmedGdd, ideal, disease),
      expectedChanges: null,
      why: explainGrape(grape, gdd, warmedGdd, ideal, disease, horizonWarmingC, score),
      notes: grape.notes
    };
  }

  function challengesFor(grape, warmedGdd, ideal, disease) {
    var c = [];
    if (warmedGdd < ideal[0]) c.push("Insufficient heat for reliable ripening in cooler years.");
    if (warmedGdd > ideal[1]) c.push("Excess heat may soften acidity and push alcohol.");
    if (grape.diseaseSensitivity === "high" && disease === "elevated") c.push("High fungal pressure for thin-skinned or compact clusters.");
    if (grape.frostSensitivity === "high") c.push("Spring frost protection may be important.");
    if (!c.length) c.push("Manage canopy and water to keep balance as seasons vary.");
    return c;
  }

  function explainGrape(grape, baseGdd, warmedGdd, ideal, disease, warmingC, score) {
    var name = grape.name;
    var delta = Math.round(warmedGdd - baseGdd);
    var parts = [];

    if (warmingC <= 0) {
      if (baseGdd >= ideal[0] && baseGdd <= ideal[1]) {
        parts.push(name + " suitability looks relatively strong today because estimated heat accumulation (~" + baseGdd + " GDD) sits inside its preferred window (" + ideal[0] + "–" + ideal[1] + ").");
      } else if (baseGdd < ideal[0]) {
        parts.push(name + " is cooler than ideal today — estimated ~" + baseGdd + " GDD is below the preferred " + ideal[0] + "–" + ideal[1] + " window, so ripening may be inconsistent.");
      } else {
        parts.push(name + " may already face warmth pressure — estimated ~" + baseGdd + " GDD exceeds the preferred " + ideal[0] + "–" + ideal[1] + " window.");
      }
    } else {
      if (warmedGdd > baseGdd && grape.heatPreference === "warm") {
        parts.push(name + " suitability is improving in this scenario because warming (~+" + warmingC.toFixed(2) + "°C, ~+" + delta + " GDD) increases heat accumulation while winter injury risk remains within a broadly acceptable teaching band.");
      } else if (grape.heatPreference === "cool" && warmedGdd > ideal[1]) {
        parts.push(name + " is becoming less suitable due to increasing summer heat (scenario ~" + Math.round(warmedGdd) + " GDD) and " + (disease === "elevated" ? "elevated disease pressure." : "rising heat stress on cool-climate freshness."));
      } else if (grape.id === "riesling" || grape.heatPreference === "cool") {
        parts.push(name + " can remain a long-term option where nighttime cooling and retained acidity still matter — even as heat rises modestly, cool-climate structure can stay relevant if humidity and disease are managed.");
      } else {
        parts.push(name + " shifts with scenario warming (~+" + warmingC.toFixed(2) + "°C): projected ~" + Math.round(warmedGdd) + " GDD versus preferred " + ideal[0] + "–" + ideal[1] + ".");
      }
    }

    if (disease === "elevated" && grape.diseaseSensitivity === "high") {
      parts.push("Humidity/rainfall heuristics raise disease pressure, which weighs more heavily on " + name + ".");
    }

    parts.push("Scenario score " + score + "% is an educational fit index — not a yield or quality guarantee.");
    return parts.join(" ");
  }

  function futureVineyard(analysis, grapeModels, options) {
    options = options || {};
    analysis = analysis || analyzeProperty(options.site || {});
    grapeModels = grapeModels || { grapes: [], warmingScenarioCPerDecade: 0.25, horizonsYears: [0, 5, 10, 15, 20, 25] };
    var grapes = grapeModels.grapes || [];
    var perDecade = grapeModels.warmingScenarioCPerDecade != null ? grapeModels.warmingScenarioCPerDecade : 0.25;
    var horizons = grapeModels.horizonsYears || [0, 5, 10, 15, 20, 25];
    var gddMetric = (analysis.metrics || []).find(function (m) { return m.id === "gdd"; });
    var diseaseMetric = (analysis.metrics || []).find(function (m) { return m.id === "diseasePressure"; });
    var humidityMetric = (analysis.metrics || []).find(function (m) { return m.id === "humidity"; });
    var gdd = gddMetric && gddMetric.value != null ? Number(gddMetric.value) : 2400;
    var disease = diseaseMetric ? String(diseaseMetric.value) : "moderate";
    var humidity = humidityMetric && humidityMetric.value != null ? Number(humidityMetric.value) : 65;

    var timeline = horizons.map(function (years) {
      var warmingC = (years / 10) * perDecade;
      var scored = grapes.map(function (g) {
        return scoreGrape(g, gdd, disease, humidity, warmingC);
      }).sort(function (a, b) { return b.score - a.score; });

      scored.forEach(function (s) {
        if (years === 0) {
          s.expectedChanges = "Baseline for comparison — no multi-decade warming applied.";
        } else {
          s.expectedChanges = "Compared with today, this +" + warmingC.toFixed(2) + "°C educational scenario shifts heat accumulation and stress balance for " + s.name + ".";
        }
      });

      return {
        yearsAhead: years,
        label: years === 0 ? "Today" : years + " years",
        warmingC: Math.round(warmingC * 100) / 100,
        confidence: "scenario-estimate",
        honesty: "Future decades use a simple warming heuristic (" + perDecade + "°C/decade), not a full climate model downscaling.",
        recommended: scored.slice(0, 4),
        all: scored
      };
    });

    return {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      analysisRef: {
        site: analysis.site,
        confidence: analysis.confidence
      },
      honesty: grapeModels.honesty || "Educational grape climate preference models. Not site-certified agronomy advice.",
      timeline: timeline,
      explainLayer: "Every grape recommendation includes a why paragraph — never a bare percentage alone."
    };
  }

  global.SavantVineyard = {
    METRIC_WHY: METRIC_WHY,
    analyzeProperty: analyzeProperty,
    futureVineyard: futureVineyard,
    aspectLabel: aspectLabel,
    estimateGddF: estimateGddF
  };
})(typeof window !== "undefined" ? window : globalThis);
