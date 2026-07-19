/**
 * Waypoint Volunteer — weather context for Opportunity Intelligence.
 * Uses Open-Meteo directly with graceful degradation (Demo/Unavailable honesty).
 */
(function (global) {
  "use strict";

  var DEFAULT_CENTER = { lat: 41.35, lon: -74.91, label: "Pike County area (sample)" };

  function emptyWeather() {
    return {
      available: false,
      source: "unavailable",
      temperatureF: null,
      precipProbability: null,
      precipMm: null,
      weatherCode: null,
      windMph: null,
      isRaining: false,
      isHeavyRain: false,
      isHot: false,
      isCold: false,
      isCool: false,
      isFair: true,
      isWindy: false,
      tags: ["unknown"],
      sunrise: null,
      sunset: null,
      hoursUntilSunset: null,
      isDaytime: true,
      afternoonRainLikely: false
    };
  }

  function seasonOf(d) {
    var m = d.getMonth();
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    if (m >= 8 && m <= 10) return "fall";
    return "winter";
  }

  function cToF(c) {
    return Math.round((c * 9) / 5 + 32);
  }

  function hoursUntil(iso, now) {
    if (!iso) return null;
    var ms = new Date(iso).getTime() - now.getTime();
    if (ms < 0) return 0;
    return Math.round((ms / 3600000) * 10) / 10;
  }

  function derive(raw, now) {
    var w = emptyWeather();
    if (!raw || !raw.current) return w;
    var cur = raw.current;
    var daily = (raw.daily && raw.daily) || {};
    var tempC = cur.temperature_2m;
    var precip = cur.precipitation || 0;
    var code = cur.weather_code;
    var wind = cur.wind_speed_10m || 0;
    var tempF = cToF(tempC);
    w.available = true;
    w.source = "live";
    w.temperatureF = tempF;
    w.precipMm = precip;
    w.weatherCode = code;
    w.windMph = Math.round(wind * 0.621371);
    w.isRaining = precip >= 0.2 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    w.isHeavyRain = precip >= 2.5 || (code >= 63 && code <= 67) || code === 82;
    w.isHot = tempF >= 86;
    w.isCold = tempF <= 35;
    w.isCool = tempF >= 45 && tempF <= 68;
    w.isFair = !w.isRaining && !w.isHot && tempF >= 40;
    w.isWindy = w.windMph >= 20;
    w.sunrise = daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : null;
    w.sunset = daily.sunset && daily.sunset[0] ? daily.sunset[0] : null;
    w.hoursUntilSunset = hoursUntil(w.sunset, now);
    w.isDaytime = w.hoursUntilSunset == null ? true : w.hoursUntilSunset > 0;
    if (raw.hourly && raw.hourly.precipitation_probability) {
      var probs = raw.hourly.precipitation_probability.slice(0, 12);
      var maxP = Math.max.apply(null, probs.length ? probs : [0]);
      w.precipProbability = maxP;
      w.afternoonRainLikely = maxP >= 55;
    }
    var tags = [];
    if (w.isHeavyRain || w.isRaining) tags.push("rain", "wet");
    if (w.isHot) tags.push("hot");
    if (w.isCold) tags.push("cold");
    if (w.isCool) tags.push("cool");
    if (w.isFair && !w.isRaining) tags.push("fair", "dry");
    if (w.isWindy) tags.push("wind");
    if (!tags.length) tags.push("fair");
    w.tags = tags;
    return w;
  }

  function fetchContext(opts) {
    opts = opts || {};
    var now = opts.now || new Date();
    var lat = opts.lat != null ? opts.lat : DEFAULT_CENTER.lat;
    var lon = opts.lon != null ? opts.lon : DEFAULT_CENTER.lon;
    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      encodeURIComponent(lat) +
      "&longitude=" +
      encodeURIComponent(lon) +
      "&current=temperature_2m,precipitation,weather_code,wind_speed_10m" +
      "&hourly=precipitation_probability&daily=sunrise,sunset&timezone=auto&forecast_days=1";

    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("weather http " + r.status);
        return r.json();
      })
      .then(function (raw) {
        var weather = derive(raw, now);
        return {
          now: now,
          season: seasonOf(now),
          location: {
            lat: lat,
            lon: lon,
            label: opts.label || DEFAULT_CENTER.label,
            hasFix: !!(opts.lat && opts.lon),
            source: opts.lat != null ? "user-or-demo" : "demo-default"
          },
          weather: weather,
          dayOfWeek: now.getDay(),
          isWeekend: now.getDay() === 0 || now.getDay() === 6,
          honesty: weather.available ? "live" : "unavailable"
        };
      })
      .catch(function () {
        var weather = emptyWeather();
        return {
          now: now,
          season: seasonOf(now),
          location: {
            lat: lat,
            lon: lon,
            label: opts.label || DEFAULT_CENTER.label,
            hasFix: false,
            source: "demo-default"
          },
          weather: weather,
          dayOfWeek: now.getDay(),
          isWeekend: now.getDay() === 0 || now.getDay() === 6,
          honesty: "unavailable"
        };
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerWeather = {
    DEFAULT_CENTER: DEFAULT_CENTER,
    emptyWeather: emptyWeather,
    seasonOf: seasonOf,
    fetchContext: fetchContext
  };
})(window);
