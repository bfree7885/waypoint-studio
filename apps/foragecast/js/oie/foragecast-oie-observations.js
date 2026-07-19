/**
 * ForageCast OIE — Layer 1: Raw environmental observations.
 * Extracts provider/model facts only. No interpretation.
 */
(function (global) {
  "use strict";

  function weatherModule(platform) {
    return (platform && platform.modules && platform.modules.weather) ||
      (platform && platform.weather) ||
      null;
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function dailyRow(d) {
    if (!d) return null;
    return {
      precipMm: num(d.precipitationSum != null ? d.precipitationSum : d.precipMm),
      tMin: num(d.temperatureMin != null ? d.temperatureMin : d.tMin),
      tMax: num(d.temperatureMax != null ? d.temperatureMax : d.tMax),
      humidity: num(d.humidity != null ? d.humidity : d.relativeHumidity),
      date: d.date || d.time || null
    };
  }

  /**
   * @returns {object} observations package
   */
  function collect(platform, conditions, loc) {
    var weather = weatherModule(platform);
    var live = !!(weather && (weather.status === "live" || weather.isLive || weather.current ||
      (weather.daily && weather.daily.length)));
    var daily = ((weather && weather.daily) || []).map(dailyRow).filter(Boolean);
    var current = weather && weather.current ? {
      temperature: num(weather.current.temperature),
      conditions: weather.current.conditions || weather.current.summary || null,
      humidity: num(weather.current.humidity != null ? weather.current.humidity : weather.current.relativeHumidity)
    } : null;

    var modelInputs = (conditions && conditions.inputs) || {};
    var modelLabels = (conditions && conditions.labels) || {};

    return {
      collectedAt: new Date().toISOString(),
      liveWeather: live,
      location: loc ? {
        name: loc.name || null,
        lat: loc.lat != null ? loc.lat : null,
        lng: loc.lng != null ? loc.lng : null,
        elevationFt: loc.elevationFt != null ? loc.elevationFt : null
      } : null,
      calendar: platform && platform.calendar ? {
        weekOf: platform.calendar.weekOf || null,
        season: platform.calendar.season || null
      } : {
        weekOf: conditions && conditions.weekOf,
        season: conditions && conditions.seasonNote
      },
      weather: {
        current: current,
        daily: daily,
        providerStatus: weather && (weather.status || (live ? "live" : "unknown"))
      },
      rainfallModule: platform && platform.rainfall ? {
        recentSummary: platform.rainfall.recent && platform.rainfall.recent.summary
          ? String(platform.rainfall.recent.summary)
          : null
      } : null,
      model: {
        inputs: {
          seasonTiming: num(modelInputs.seasonTiming),
          recentRainfall: num(modelInputs.recentRainfall),
          temperature: num(modelInputs.temperature),
          soilMoisture: num(modelInputs.soilMoisture)
        },
        labels: {
          recentRainfall: modelLabels.recentRainfall || null,
          temperature: modelLabels.temperature || null,
          soilMoisture: modelLabels.soilMoisture || null
        },
        whatChangedThisWeek: (conditions && conditions.whatChangedThisWeek) || [],
        hydration: (conditions && conditions._hydration) || null
      }
    };
  }

  global.ForageCastOIE = global.ForageCastOIE || {};
  global.ForageCastOIE.observations = {
    collect: collect,
    weatherModule: weatherModule
  };
})(typeof window !== "undefined" ? window : globalThis);
