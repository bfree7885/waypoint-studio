/**
 * Kiosk — user location bootstrap + weather at detected coordinates.
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var WMO = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm hail", 99: "Thunderstorm heavy hail"
  };

  function waitFor(fn) {
    return new Promise(function (resolve) {
      function check() {
        if (fn()) resolve();
        else requestAnimationFrame(check);
      }
      check();
    });
  }

  function wmoLabel(code) {
    return WMO[code] || "Conditions";
  }

  function fetchUserWeather(lat, lng) {
    var url = "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,uv_index",
      hourly: "temperature_2m,weather_code,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset",
      timezone: "auto",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      forecast_days: "2"
    }).toString();
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("Weather HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var cur = data.current || {};
      var daily = data.daily || {};
      var hourly = data.hourly || {};
      var hours = [];
      if (hourly.time) {
        for (var i = 0; i < Math.min(6, hourly.time.length); i++) {
          hours.push({
            time: hourly.time[i],
            temperatureF: hourly.temperature_2m ? hourly.temperature_2m[i] : null,
            conditions: wmoLabel(hourly.weather_code ? hourly.weather_code[i] : null)
          });
        }
      }
      return {
        timezone: data.timezone || "America/New_York",
        current: {
          temperatureF: cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null,
          feelsLikeF: cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null,
          humidity: cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : null,
          windMph: cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null,
          windGustMph: cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) : null,
          cloudCover: cur.cloud_cover != null ? Math.round(cur.cloud_cover) : null,
          uvIndex: cur.uv_index != null ? Math.round(cur.uv_index) : null,
          conditions: wmoLabel(cur.weather_code),
          observedAt: cur.time || new Date().toISOString()
        },
        forecast: {
          highF: daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : null,
          lowF: daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : null,
          precipProbability: daily.precipitation_probability_max
            ? Math.round(daily.precipitation_probability_max[0]) : null,
          summary: wmoLabel(daily.weather_code ? daily.weather_code[0] : null)
        },
        hourly: { nextHours: hours, note: "Next hours at your location" },
        sun: daily.sunrise && daily.sunset ? {
          sunrise: daily.sunrise[0],
          sunset: daily.sunset[0],
          sunriseFormatted: null,
          sunsetFormatted: null
        } : null,
        userLocation: true
      };
    });
  }

  function boot() {
    waitFor(function () { return window.WDS && WDS.location && WDS.location.bootstrap; })
      .then(function () {
        return WDS.location.bootstrap({ base: ENGINE_BASE, promptMount: null });
      })
      .then(function (loc) {
        window.__WAYPOINT_KIOSK_LOC__ = loc;
        if (!loc || loc.lat == null || loc.lng == null) return null;
        return fetchUserWeather(loc.lat, loc.lng).then(function (wx) {
          window.__WAYPOINT_KIOSK_WEATHER__ = wx;
          return loc;
        });
      })
      .then(function (loc) {
        document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", {
          detail: { location: loc, weather: window.__WAYPOINT_KIOSK_WEATHER__ }
        }));
      })
      .catch(function () {
        document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", { detail: {} }));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
