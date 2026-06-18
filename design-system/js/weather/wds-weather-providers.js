/**
 * Waypoint Studio — Weather providers
 * Each provider maps external API responses to the normalized WDS weather package.
 * Only the placeholder provider returns data without configuration.
 */
(function (global) {
  "use strict";

  var W = global.WDS && global.WDS.weather;
  if (!W) return;

  var Err = W.WeatherProviderError;
  var m = W.measurement;
  var w = W.wind;
  var p = W.precipitation;
  var c = W.conditions;

  function notConfigured(id, hint) {
    return Promise.reject(new Err(id, "NOT_CONFIGURED", hint || "Provider is not configured. Call WDS.weather.configure() with credentials or endpoints."));
  }

  function isoAt(date, hour, minute) {
    var d = new Date(date);
    d.setHours(hour, minute || 0, 0, 0);
    return d.toISOString();
  }

  function buildPlaceholderPackage(ctx) {
    var units = W.UNITS[ctx.units] || W.UNITS.us;
    var hints = ctx.hints || {};
    var high = W.parseTemperatureString(hints.high) || 72;
    var low = W.parseTemperatureString(hints.low) || 52;
    var now = new Date();
    var today = now.toISOString().slice(0, 10);
    var currentTemp = Math.round((high + low) / 2);
    var summary = hints.conditions || "Partly cloudy with valley fog at dawn";

    var hourly = [];
    for (var h = 0; h < 24; h += 1) {
      var t = low + (high - low) * Math.sin(((h - 6) / 24) * Math.PI * 2);
      t = Math.round(t);
      var pop = h >= 14 && h <= 18 ? 45 : 10;
      hourly.push({
        time: isoAt(now, h),
        temperature: m(t, units.temperature),
        feelsLike: m(t - 1, units.temperature),
        humidity: m(68 + (h < 8 ? 12 : 0), "%"),
        wind: w(6 + (h > 12 ? 4 : 0), 220 + h, null, units),
        precipitation: p(pop, pop > 30 ? "light" : "none", pop > 30 ? 0.05 : 0, units),
        cloudCover: m(h < 7 ? 85 : 40 + (h % 5) * 8, "%"),
        pressure: m(30.12, units.pressure),
        uvIndex: m(h >= 10 && h <= 15 ? 6 : 0, "index"),
        conditions: c(h < 7 ? "Valley fog" : (pop > 30 ? "Showers possible" : "Partly cloudy"), h < 7 ? "fog" : "partly-cloudy-day")
      });
    }

    var daily = [];
    for (var d = 0; d < 7; d += 1) {
      var dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() + d);
      var dateStr = dayDate.toISOString().slice(0, 10);
      var dayHigh = high + (d % 3) - 1;
      var dayLow = low + (d % 2);
      daily.push({
        date: dateStr,
        temperatureHigh: m(dayHigh, units.temperature),
        temperatureLow: m(dayLow, units.temperature),
        humidity: m(65 + d, "%"),
        wind: w(8 + d, 200, 14, units),
        precipitation: p(d === 5 ? 55 : 15, d === 5 ? "moderate" : "none", d === 5 ? 0.35 : 0, units),
        cloudCover: m(35 + d * 5, "%"),
        pressure: m(30.1 - d * 0.02, units.pressure),
        uvIndex: m(6, "index"),
        conditions: c(d === 5 ? "Thunderstorms possible" : "Partly cloudy", d === 5 ? "thunderstorm" : "partly-cloudy-day"),
        sunrise: isoAt(dayDate, 5, 42),
        sunset: isoAt(dayDate, 20, 18)
      });
    }

    return W.normalizePackage({
      meta: {
        provider: "placeholder",
        lat: ctx.lat,
        lng: ctx.lng,
        timezone: ctx.timezone || "America/New_York",
        units: ctx.units || "us",
        attribution: "Sample data for UI preview",
        isPlaceholder: true
      },
      current: {
        observedAt: now.toISOString(),
        temperature: m(currentTemp, units.temperature),
        feelsLike: m(currentTemp - 2, units.temperature),
        humidity: m(72, "%"),
        wind: w(8, 220, 14, units),
        precipitation: p(20, "none", 0, units),
        cloudCover: m(45, "%"),
        pressure: m(30.12, units.pressure),
        uvIndex: m(5, "index"),
        conditions: c(summary.split("·")[0].trim() || summary, "partly-cloudy-day"),
        sunrise: isoAt(now, 5, 42),
        sunset: isoAt(now, 20, 18)
      },
      hourly: hourly,
      daily: daily
    });
  }

  function mapOpenMeteoResponse(data, ctx) {
    var units = W.UNITS[ctx.units] || W.UNITS.us;
    var cur = data.current || {};
    var hourly = (data.hourly && data.hourly.time || []).map(function (time, i) {
      return {
        time: time,
        temperature: m(data.hourly.temperature_2m[i], units.temperature),
        humidity: m(data.hourly.relative_humidity_2m[i], "%"),
        wind: w(data.hourly.wind_speed_10m[i], data.hourly.wind_direction_10m[i], data.hourly.wind_gusts_10m && data.hourly.wind_gusts_10m[i], units),
        precipitation: p(data.hourly.precipitation_probability && data.hourly.precipitation_probability[i], "none", data.hourly.precipitation[i], units),
        cloudCover: m(data.hourly.cloud_cover[i], "%"),
        pressure: m(data.hourly.surface_pressure && data.hourly.surface_pressure[i] / (units.pressure === "inHg" ? 33.8639 : 1), units.pressure),
        uvIndex: m(data.hourly.uv_index && data.hourly.uv_index[i], "index"),
        conditions: c("", "unknown")
      };
    });
    var daily = (data.daily && data.daily.time || []).map(function (date, i) {
      return {
        date: date,
        temperatureHigh: m(data.daily.temperature_2m_max[i], units.temperature),
        temperatureLow: m(data.daily.temperature_2m_min[i], units.temperature),
        precipitation: p(null, "none", data.daily.precipitation_sum[i], units),
        uvIndex: m(data.daily.uv_index_max && data.daily.uv_index_max[i], "index"),
        sunrise: data.daily.sunrise && data.daily.sunrise[i],
        sunset: data.daily.sunset && data.daily.sunset[i],
        conditions: c("", "unknown")
      };
    });
    return W.normalizePackage({
      meta: { provider: "open-meteo", lat: ctx.lat, lng: ctx.lng, units: ctx.units, isPlaceholder: false, attribution: "Open-Meteo" },
      current: {
        observedAt: cur.time,
        temperature: m(cur.temperature_2m, units.temperature),
        humidity: m(cur.relative_humidity_2m, "%"),
        wind: w(cur.wind_speed_10m, cur.wind_direction_10m, cur.wind_gusts_10m, units),
        cloudCover: m(cur.cloud_cover, "%"),
        pressure: m(cur.surface_pressure && cur.surface_pressure / (units.pressure === "inHg" ? 33.8639 : 1), units.pressure),
        uvIndex: m(cur.uv_index, "index"),
        precipitation: p(null, "none", cur.precipitation, units),
        conditions: c("", "unknown"),
        sunrise: data.daily && data.daily.sunrise && data.daily.sunrise[0],
        sunset: data.daily && data.daily.sunset && data.daily.sunset[0]
      },
      hourly: hourly,
      daily: daily
    });
  }

  function mapOpenWeatherResponse(data, ctx) {
    var units = W.UNITS[ctx.units] || W.UNITS.us;
    var cur = data.current || {};
    var hourly = (data.hourly || []).map(function (row) {
      return {
        time: new Date(row.dt * 1000).toISOString(),
        temperature: m(row.temp, units.temperature),
        feelsLike: m(row.feels_like, units.temperature),
        humidity: m(row.humidity, "%"),
        wind: w(row.wind_speed, row.wind_deg, row.wind_gust, units),
        precipitation: p((row.pop || 0) * 100, row.rain ? "light" : "none", row.rain && row.rain["1h"], units),
        cloudCover: m(row.clouds, "%"),
        pressure: m(row.pressure / (units.pressure === "inHg" ? 33.8639 : 1), units.pressure),
        uvIndex: m(row.uvi, "index"),
        conditions: c(row.weather && row.weather[0] && row.weather[0].description, row.weather && row.weather[0] && row.weather[0].main)
      };
    });
    var daily = (data.daily || []).map(function (row) {
      return {
        date: new Date(row.dt * 1000).toISOString().slice(0, 10),
        temperatureHigh: m(row.temp && row.temp.max, units.temperature),
        temperatureLow: m(row.temp && row.temp.min, units.temperature),
        humidity: m(row.humidity, "%"),
        wind: w(row.wind_speed, row.wind_deg, row.wind_gust, units),
        precipitation: p((row.pop || 0) * 100, row.rain ? "light" : "none", row.rain, units),
        cloudCover: m(row.clouds, "%"),
        pressure: m(row.pressure / (units.pressure === "inHg" ? 33.8639 : 1), units.pressure),
        uvIndex: m(row.uvi, "index"),
        conditions: c(row.weather && row.weather[0] && row.weather[0].description, row.weather && row.weather[0] && row.weather[0].main),
        sunrise: row.sunrise ? new Date(row.sunrise * 1000).toISOString() : null,
        sunset: row.sunset ? new Date(row.sunset * 1000).toISOString() : null
      };
    });
    return W.normalizePackage({
      meta: { provider: "openweather", lat: ctx.lat, lng: ctx.lng, units: ctx.units, isPlaceholder: false, attribution: "OpenWeather" },
      current: {
        observedAt: cur.dt ? new Date(cur.dt * 1000).toISOString() : null,
        temperature: m(cur.temp, units.temperature),
        feelsLike: m(cur.feels_like, units.temperature),
        humidity: m(cur.humidity, "%"),
        wind: w(cur.wind_speed, cur.wind_deg, cur.wind_gust, units),
        precipitation: p(null, cur.rain ? "light" : "none", cur.rain && cur.rain["1h"], units),
        cloudCover: m(cur.clouds, "%"),
        pressure: m(cur.pressure / (units.pressure === "inHg" ? 33.8639 : 1), units.pressure),
        uvIndex: m(cur.uvi, units),
        conditions: c(cur.weather && cur.weather[0] && cur.weather[0].description, cur.weather && cur.weather[0] && cur.weather[0].main),
        sunrise: data.daily && data.daily[0] && data.daily[0].sunrise ? new Date(data.daily[0].sunrise * 1000).toISOString() : null,
        sunset: data.daily && data.daily[0] && data.daily[0].sunset ? new Date(data.daily[0].sunset * 1000).toISOString() : null
      },
      hourly: hourly,
      daily: daily
    });
  }

  function mapNwsResponse(points, forecast, hourly, ctx) {
    var units = W.UNITS[ctx.units] || W.UNITS.us;
    var periods = (forecast && forecast.properties && forecast.properties.periods) || [];
    var currentPeriod = periods[0] || {};
    var daily = [];
    for (var i = 0; i < periods.length && daily.length < 7; i += 2) {
      var day = periods[i];
      var night = periods[i + 1];
      daily.push({
        date: day.startTime ? day.startTime.slice(0, 10) : null,
        temperatureHigh: m(day.temperature, units.temperature),
        temperatureLow: m(night && night.temperature, units.temperature),
        wind: w(day.windSpeed && parseInt(day.windSpeed, 10), day.windDirection, null, units),
        precipitation: p(null, "none", null, units),
        conditions: c(day.shortForecast, day.icon),
        sunrise: null,
        sunset: null
      });
    }
    var hourlyRows = (hourly && hourly.properties && hourly.properties.periods) || [];
    var hourlyPkg = hourlyRows.slice(0, 24).map(function (row) {
      return {
        time: row.startTime,
        temperature: m(row.temperature, units.temperature),
        wind: w(row.windSpeed && parseInt(row.windSpeed, 10), row.windDirection, null, units),
        precipitation: p(row.probabilityOfPrecipitation && row.probabilityOfPrecipitation.value, "none", null, units),
        conditions: c(row.shortForecast, row.icon)
      };
    });
    return W.normalizePackage({
      meta: { provider: "nws", lat: ctx.lat, lng: ctx.lng, units: ctx.units, isPlaceholder: false, attribution: "National Weather Service" },
      current: {
        observedAt: currentPeriod.startTime,
        temperature: m(currentPeriod.temperature, units.temperature),
        wind: w(currentPeriod.windSpeed && parseInt(currentPeriod.windSpeed, 10), currentPeriod.windDirection, null, units),
        conditions: c(currentPeriod.shortForecast, currentPeriod.icon),
        precipitation: p(currentPeriod.probabilityOfPrecipitation && currentPeriod.probabilityOfPrecipitation.value, "none", null, units)
      },
      hourly: hourlyPkg,
      daily: daily
    });
  }

  function mapVisualCrossingResponse(data, ctx) {
    var units = W.UNITS[ctx.units] || W.UNITS.us;
    var cur = data.currentConditions || {};
    var days = data.days || [];
    var today = days[0] || {};
    var hourly = (today.hours || []).map(function (row) {
      return {
        time: row.datetimeEpoch ? new Date(row.datetimeEpoch * 1000).toISOString() : null,
        temperature: m(row.temp, units.temperature),
        feelsLike: m(row.feelslike, units.temperature),
        humidity: m(row.humidity, "%"),
        wind: w(row.windspeed, row.winddir, row.windgust, units),
        precipitation: p(row.precipprob, row.preciptype || "none", row.precip, units),
        cloudCover: m(row.cloudcover, "%"),
        pressure: m(row.pressure, units.pressure),
        uvIndex: m(row.uvindex, "index"),
        conditions: c(row.conditions, row.icon)
      };
    });
    var daily = days.map(function (row) {
      return {
        date: row.datetime,
        temperatureHigh: m(row.tempmax, units.temperature),
        temperatureLow: m(row.tempmin, units.temperature),
        humidity: m(row.humidity, "%"),
        wind: w(row.windspeed, row.winddir, row.windgust, units),
        precipitation: p(row.precipprob, row.preciptype || "none", row.precip, units),
        cloudCover: m(row.cloudcover, "%"),
        pressure: m(row.pressure, units.pressure),
        uvIndex: m(row.uvindex, "index"),
        conditions: c(row.conditions, row.icon),
        sunrise: row.sunrise,
        sunset: row.sunset
      };
    });
    return W.normalizePackage({
      meta: { provider: "visual-crossing", lat: ctx.lat, lng: ctx.lng, units: ctx.units, isPlaceholder: false, attribution: "Visual Crossing" },
      current: {
        observedAt: cur.datetimeEpoch ? new Date(cur.datetimeEpoch * 1000).toISOString() : null,
        temperature: m(cur.temp, units.temperature),
        feelsLike: m(cur.feelslike, units.temperature),
        humidity: m(cur.humidity, "%"),
        wind: w(cur.windspeed, cur.winddir, cur.windgust, units),
        precipitation: p(cur.precipprob, cur.preciptype || "none", cur.precip, units),
        cloudCover: m(cur.cloudcover, "%"),
        pressure: m(cur.pressure, units.pressure),
        uvIndex: m(cur.uvindex, "index"),
        conditions: c(cur.conditions, cur.icon),
        sunrise: today.sunrise,
        sunset: today.sunset
      },
      hourly: hourly,
      daily: daily
    });
  }

  var PROVIDERS = {
    placeholder: {
      id: "placeholder",
      label: "Placeholder (preview data)",
      requiresCredentials: false,
      fetch: function (ctx) {
        return Promise.resolve(buildPlaceholderPackage(ctx));
      }
    },
    "open-meteo": {
      id: "open-meteo",
      label: "Open-Meteo",
      requiresCredentials: false,
      mapResponse: mapOpenMeteoResponse,
      fetch: function (ctx) {
        var cfg = ctx.config || {};
        var base = cfg.endpoint || "https://api.open-meteo.com/v1/forecast";
        var params = new URLSearchParams({
          latitude: ctx.lat,
          longitude: ctx.lng,
          current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,surface_pressure,uv_index,precipitation",
          hourly: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,precipitation,cloud_cover,surface_pressure,uv_index",
          daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset",
          timezone: ctx.timezone || "auto",
          temperature_unit: ctx.units === "metric" ? "celsius" : "fahrenheit",
          wind_speed_unit: ctx.units === "metric" ? "kmh" : "mph",
          precipitation_unit: ctx.units === "metric" ? "mm" : "inch"
        });
        return fetch(base + "?" + params.toString(), { signal: ctx.signal })
          .then(function (res) {
            if (!res.ok) throw new Err("open-meteo", "HTTP_ERROR", "Open-Meteo request failed");
            return res.json();
          })
          .then(function (data) {
            return mapOpenMeteoResponse(data, ctx);
          });
      }
    },
    openweather: {
      id: "openweather",
      label: "OpenWeather",
      requiresCredentials: true,
      mapResponse: mapOpenWeatherResponse,
      fetch: function (ctx) {
        var cfg = ctx.config || {};
        if (!cfg.apiKey) return notConfigured("openweather", "OpenWeather requires apiKey in WDS.weather.configure({ providers: { openweather: { apiKey } } }).");
        var base = cfg.endpoint || "https://api.openweathermap.org/data/3.0/onecall";
        var params = new URLSearchParams({
          lat: ctx.lat,
          lon: ctx.lng,
          appid: cfg.apiKey,
          units: ctx.units === "metric" ? "metric" : "imperial"
        });
        return fetch(base + "?" + params.toString(), { signal: ctx.signal })
          .then(function (res) {
            if (!res.ok) throw new Err("openweather", "HTTP_ERROR", "OpenWeather request failed");
            return res.json();
          })
          .then(function (data) {
            return mapOpenWeatherResponse(data, ctx);
          });
      }
    },
    nws: {
      id: "nws",
      label: "National Weather Service",
      requiresCredentials: false,
      mapResponse: mapNwsResponse,
      fetch: function (ctx) {
        var cfg = ctx.config || {};
        var headers = { Accept: "application/geo+json" };
        if (cfg.userAgent) headers["User-Agent"] = cfg.userAgent;
        var pointsUrl = (cfg.pointsEndpoint || "https://api.weather.gov/points/") + ctx.lat.toFixed(4) + "," + ctx.lng.toFixed(4);
        return fetch(pointsUrl, { headers: headers, signal: ctx.signal })
          .then(function (res) {
            if (!res.ok) throw new Err("nws", "HTTP_ERROR", "NWS points lookup failed");
            return res.json();
          })
          .then(function (points) {
            var forecastUrl = points.properties && points.properties.forecast;
            var hourlyUrl = points.properties && points.properties.forecastHourly;
            return Promise.all([
              points,
              forecastUrl ? fetch(forecastUrl, { headers: headers, signal: ctx.signal }).then(function (r) { return r.json(); }) : null,
              hourlyUrl ? fetch(hourlyUrl, { headers: headers, signal: ctx.signal }).then(function (r) { return r.json(); }) : null
            ]);
          })
          .then(function (parts) {
            return mapNwsResponse(parts[0], parts[1], parts[2], ctx);
          });
      }
    },
    "visual-crossing": {
      id: "visual-crossing",
      label: "Visual Crossing",
      requiresCredentials: true,
      mapResponse: mapVisualCrossingResponse,
      fetch: function (ctx) {
        var cfg = ctx.config || {};
        if (!cfg.apiKey) return notConfigured("visual-crossing", "Visual Crossing requires apiKey in WDS.weather.configure({ providers: { \"visual-crossing\": { apiKey } } }).");
        var base = cfg.endpoint || "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
        var path = base + "/" + ctx.lat + "," + ctx.lng;
        var params = new URLSearchParams({
          key: cfg.apiKey,
          unitGroup: ctx.units === "metric" ? "metric" : "us",
          include: "current,days,hours",
          elements: "datetime,temp,tempmax,tempmin,feelslike,humidity,windspeed,winddir,windgust,precip,precipprob,preciptype,cloudcover,pressure,uvindex,conditions,icon,sunrise,sunset"
        });
        return fetch(path + "?" + params.toString(), { signal: ctx.signal })
          .then(function (res) {
            if (!res.ok) throw new Err("visual-crossing", "HTTP_ERROR", "Visual Crossing request failed");
            return res.json();
          })
          .then(function (data) {
            return mapVisualCrossingResponse(data, ctx);
          });
      }
    }
  };

  W.providers = PROVIDERS;
  W.buildPlaceholderPackage = buildPlaceholderPackage;
})(window);
