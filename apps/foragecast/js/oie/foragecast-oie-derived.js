/**
 * ForageCast OIE — Layer 2: Derived environmental conditions.
 * Interprets raw observations into durable condition signals.
 */
(function (global) {
  "use strict";

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function avg(nums) {
    var list = nums.filter(function (n) { return n != null && isFinite(n); });
    if (!list.length) return null;
    return list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  }

  function sum(nums) {
    var list = nums.filter(function (n) { return n != null && isFinite(n); });
    if (!list.length) return null;
    return list.reduce(function (a, b) { return a + b; }, 0);
  }

  function dayOfYear(d) {
    d = d || new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  /**
   * Growing-degree-day proxy (°F base 50) from daily rows when available.
   */
  function heatAccumulation(daily) {
    var gdd = 0;
    var days = 0;
    (daily || []).slice(0, 5).forEach(function (d) {
      if (d.tMin == null || d.tMax == null) return;
      var tMinF = d.tMin > 45 ? d.tMin : d.tMin * 9 / 5 + 32;
      var tMaxF = d.tMax > 45 ? d.tMax : d.tMax * 9 / 5 + 32;
      // Heuristic: values > 45 treated as °F already (Open-Meteo often °C — convert if low).
      if (d.tMax < 45) {
        tMinF = d.tMin * 9 / 5 + 32;
        tMaxF = d.tMax * 9 / 5 + 32;
      }
      var mean = (tMinF + tMaxF) / 2;
      gdd += Math.max(0, mean - 50);
      days += 1;
    });
    if (!days) return { gddProxy: null, days: 0, label: "Heat accumulation unknown" };
    return {
      gddProxy: Math.round(gdd),
      days: days,
      label: gdd >= 60
        ? "Warmth is accumulating quickly over the near-term window"
        : gdd >= 25
          ? "Moderate heat accumulation over recent forecast days"
          : "Limited heat accumulation in the near-term window"
    };
  }

  function derive(observations) {
    observations = observations || {};
    var live = !!observations.liveWeather;
    var daily = (observations.weather && observations.weather.daily) || [];
    var current = (observations.weather && observations.weather.current) || {};
    var model = observations.model || { inputs: {}, labels: {} };

    var precip0 = daily[0] && daily[0].precipMm;
    var precip1 = daily[1] && daily[1].precipMm;
    var precip2 = daily[2] && daily[2].precipMm;
    var precip3to4 = sum([(daily[3] && daily[3].precipMm), (daily[4] && daily[4].precipMm)]);
    var precipNear = sum([precip0, precip1, precip2]);
    var precipLater = precip3to4;

    var tMin0 = daily[0] && daily[0].tMin;
    var tMax0 = daily[0] && daily[0].tMax;
    var tMinAvg = avg(daily.slice(0, 3).map(function (d) { return d.tMin; }));
    var tMaxAvg = avg(daily.slice(0, 3).map(function (d) { return d.tMax; }));
    var swing = (tMax0 != null && tMin0 != null) ? tMax0 - tMin0 : null;

    var humidityNow = current.humidity != null
      ? current.humidity
      : avg(daily.slice(0, 2).map(function (d) { return d.humidity; }));

    // Rainfall trend
    var rainfallTrend = "unknown";
    if (live && precipNear != null && precipLater != null) {
      if (precipNear >= 5 && precipLater + 1 < precipNear * 0.45) rainfallTrend = "drying-after-pulse";
      else if (precipLater > precipNear + 3) rainfallTrend = "improving-later";
      else if (precipNear >= 8) rainfallTrend = "wet-pulse";
      else if (precipNear < 1 && precipLater < 1) rainfallTrend = "extended-dry";
      else rainfallTrend = "stable-modest";
    } else if (!live && model.inputs.recentRainfall != null) {
      rainfallTrend = model.inputs.recentRainfall >= 0.62 ? "model-moist"
        : model.inputs.recentRainfall <= 0.35 ? "model-dry"
          : "model-moderate";
    }

    // Soil moisture persistence (derived, not a sensor)
    var soilPersistence = "uncertain";
    var soilScore = model.inputs.soilMoisture;
    if (live && precipNear != null) {
      if (precipNear >= 8 || (soilScore != null && soilScore >= 0.65)) soilPersistence = "favorable";
      else if (precipNear < 1 && (soilScore == null || soilScore < 0.45)) soilPersistence = "declining";
      else soilPersistence = "mixed";
    } else if (soilScore != null) {
      soilPersistence = soilScore >= 0.62 ? "favorable" : soilScore <= 0.38 ? "declining" : "mixed";
    }

    var drought = rainfallTrend === "extended-dry" || rainfallTrend === "model-dry";
    var dryingPeriod = rainfallTrend === "drying-after-pulse" || soilPersistence === "declining";

    var heat = heatAccumulation(daily);
    var nighttimeCooling = "unknown";
    if (tMinAvg != null) {
      // Treat as °C if values look like C
      var tMinF = tMinAvg < 45 ? tMinAvg * 9 / 5 + 32 : tMinAvg;
      if (tMinF <= 36) nighttimeCooling = "frost-risk";
      else if (tMinF <= 52) nighttimeCooling = "cool-nights";
      else if (tMinF >= 68) nighttimeCooling = "warm-nights";
      else nighttimeCooling = "moderate-nights";
    }

    var humidityPersistence = "unknown";
    if (humidityNow != null) {
      humidityPersistence = humidityNow >= 75 ? "high"
        : humidityNow >= 55 ? "moderate"
          : "low";
    }

    var tempSwing = "unknown";
    if (swing != null) {
      var swingF = Math.abs(swing) < 40 ? swing * 9 / 5 : swing; // rough if C delta
      if (Math.abs(swing) <= 20) swingF = swing * (swing < 20 ? 9 / 5 : 1);
      // Prefer absolute C delta interpretation when daily looks like C
      var delta = (tMax0 != null && tMax0 < 45) ? swing : swing;
      tempSwing = Math.abs(delta) >= 15 ? "large" : Math.abs(delta) >= 8 ? "moderate" : "narrow";
    }

    var doy = dayOfYear();
    var seasonalProgression = doy < 80 ? "early-year"
      : doy < 150 ? "spring-window"
        : doy < 220 ? "summer-window"
          : doy < 280 ? "late-summer-fall"
            : "late-year";

    var phenologyTiming = observations.calendar && observations.calendar.season
      ? String(observations.calendar.season)
      : seasonalProgression;

    // Normalized factors for scoring (0–1), prefer live-derived when present
    var factors = {
      recentPrecipitation: live && precipNear != null
        ? clamp(precipNear / 25, 0, 1)
        : (model.inputs.recentRainfall != null ? model.inputs.recentRainfall : 0.5),
      temperaturePattern: live && tMaxAvg != null
        ? clamp(((tMaxAvg < 45 ? tMaxAvg * 9 / 5 + 32 : tMaxAvg) - 40) / 45, 0.15, 0.95)
        : (model.inputs.temperature != null ? model.inputs.temperature : 0.5),
      humidity: humidityNow != null ? clamp(humidityNow / 100, 0, 1)
        : (soilScore != null ? soilScore : 0.5),
      soilMoisture: soilScore != null ? soilScore
        : (live && precipNear != null ? clamp(0.35 + precipNear / 40, 0.2, 0.9) : 0.5),
      seasonalTiming: model.inputs.seasonTiming != null ? model.inputs.seasonTiming : 0.5,
      // Future-ready placeholders — neutral until spatial inputs exist
      elevation: 0.5,
      slopeAspect: 0.5,
      canopy: 0.5
    };

    return {
      derivedAt: new Date().toISOString(),
      liveWeather: live,
      signals: {
        rainfallTrend: rainfallTrend,
        soilMoisturePersistence: soilPersistence,
        dryingPeriod: dryingPeriod,
        extendedDrought: drought,
        heatAccumulation: heat,
        nighttimeCooling: nighttimeCooling,
        humidityPersistence: humidityPersistence,
        temperatureSwing: tempSwing,
        seasonalProgression: seasonalProgression,
        phenologicalTiming: phenologyTiming
      },
      metrics: {
        precipNearMm: precipNear,
        precipLaterMm: precipLater,
        tMinAvg: tMinAvg,
        tMaxAvg: tMaxAvg,
        humidityNow: humidityNow,
        dayOfYear: doy
      },
      factors: factors,
      evidenceQuality: live ? "live-derived" : "model-estimated",
      rawRef: {
        modelLabels: model.labels,
        rainfallSummary: observations.rainfallModule && observations.rainfallModule.recentSummary
      }
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.derived = {
    derive: derive,
    heatAccumulation: heatAccumulation
  };
})(typeof window !== "undefined" ? window : globalThis);
