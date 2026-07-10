/**
 * Canonical photography conditions — derived from user-coordinate OIP platform only.
 * Shared by dashboard, kiosk, and Photo Coach.
 */
(function (global) {
  "use strict";

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return num(meas.value);
    return null;
  }

  function weatherPkg(platform) {
    if (!platform) return null;
    return platform.weatherRef || platform.weather || null;
  }

  function collectInputs(platform) {
    var pkg = weatherPkg(platform);
    var cur = pkg && pkg.current;
    var dl = platform && platform.daylight;
    var aqi = platform && platform.airQuality;
    var loc = platform && platform.location;
    return {
      lat: loc && loc.latitude != null ? Number(loc.latitude) : null,
      lng: loc && loc.longitude != null ? Number(loc.longitude) : null,
      cloudCover: num(cur && cur.cloudCover),
      conditions: cur && cur.conditions && cur.conditions.summary ? cur.conditions.summary : null,
      humidity: num(cur && cur.humidity),
      windMph: num(cur && cur.wind && cur.wind.speed),
      uv: num(cur && cur.uvIndex),
      visibility: num(cur && cur.visibility),
      usAqi: aqi && aqi.usAqi != null ? Number(aqi.usAqi) : null,
      aqiCategory: aqi && aqi.category ? aqi.category : null,
      goldenHour: dl && dl.goldenHour ? dl.goldenHour : null,
      blueHour: dl && dl.blueHour ? dl.blueHour : null,
      sunrise: dl && dl.sunriseFormatted ? dl.sunriseFormatted : (dl && dl.sunrise ? dl.sunrise : null),
      sunset: dl && dl.sunsetFormatted ? dl.sunsetFormatted : (dl && dl.sunset ? dl.sunset : null),
      moonPhase: dl && dl.moonPhase ? dl.moonPhase : null,
      moonIllumination: dl && dl.moonIllumination != null ? Number(dl.moonIllumination) : null,
      weatherProvider: pkg && pkg.meta && pkg.meta.provider ? pkg.meta.provider : null,
      dataCoordSource: pkg && pkg.meta && pkg.meta.dataCoordSource ? pkg.meta.dataCoordSource : "user"
    };
  }

  function fromPlatform(platform) {
    var pkg = weatherPkg(platform);
    if (!pkg || (pkg.meta && pkg.meta.isPlaceholder)) {
      return {
        status: "unavailable",
        score: null,
        cloudCover: null,
        summary: "Photography conditions unavailable — live weather required at your coordinates.",
        inputs: collectInputs(platform),
        trust: "Unavailable",
        source: "user-oip"
      };
    }

    var inputs = collectInputs(platform);
    var Intel = global.WDS && global.WDS.outdoorWeatherIntel;
    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    var intel = Intel && Intel.analyze ? Intel.analyze(pkg, platform) : null;
    var sky = Sky && Sky.analyze ? Sky.analyze(pkg, platform) : null;
    var photoRating = intel && intel.photography ? intel.photography : null;
    var score = intel && intel.scores && intel.scores.photography
      ? intel.scores.photography.value
      : null;

    if (score == null && inputs.cloudCover != null) {
      var cloud = Math.round(inputs.cloudCover);
      score = 50;
      if (cloud <= 15) score = 80;
      else if (cloud <= 55) score = 92;
      else if (cloud <= 85) score = 68;
      else score = 48;
    }
    if (score != null && inputs.usAqi != null) {
      if (inputs.usAqi >= 150) score = Math.min(score, 35);
      else if (inputs.usAqi >= 100) score = Math.min(score, 55);
    }

    var summary = photoRating && photoRating.summary
      ? photoRating.summary
      : (score != null && score >= 80 ? "Strong outdoor light conditions" : "Moderate outdoor light conditions");

    return {
      status: "estimated",
      score: score,
      cloudCover: inputs.cloudCover,
      summary: summary,
      detail: photoRating && photoRating.detail ? photoRating.detail : null,
      level: photoRating && photoRating.level ? photoRating.level : null,
      inputs: inputs,
      sky: sky,
      trust: "Live · OIP",
      source: "user-oip",
      moduleSource: inputs.weatherProvider || "open-meteo"
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.photographyConditions = {
    collectInputs: collectInputs,
    fromPlatform: fromPlatform
  };
})(window);
