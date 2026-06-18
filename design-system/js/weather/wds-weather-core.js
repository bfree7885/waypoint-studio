/**
 * Waypoint Studio — Weather core
 * Normalized weather package schema and helpers. Provider-agnostic.
 */
(function (global) {
  "use strict";

  var UNITS = {
    us: {
      temperature: "F",
      wind: "mph",
      pressure: "inHg",
      precipitation: "in",
      distance: "mi"
    },
    metric: {
      temperature: "C",
      wind: "km/h",
      pressure: "hPa",
      precipitation: "mm",
      distance: "km"
    }
  };

  function WeatherProviderError(providerId, code, message) {
    this.name = "WeatherProviderError";
    this.providerId = providerId;
    this.code = code;
    this.message = message || code;
  }
  WeatherProviderError.prototype = Object.create(Error.prototype);

  function measurement(value, unit) {
    if (value == null || value === "") return null;
    return { value: Number(value), unit: unit || "" };
  }

  function wind(speed, direction, gust, units) {
    units = units || UNITS.us;
    return {
      speed: measurement(speed, units.wind),
      direction: direction == null ? null : { value: Number(direction), unit: "deg", label: directionLabel(direction) },
      gust: gust == null ? null : measurement(gust, units.wind)
    };
  }

  function directionLabel(deg) {
    var dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    var idx = Math.round(((Number(deg) % 360) + 360) % 360 / 22.5) % 16;
    return dirs[idx];
  }

  function precipitation(probability, intensity, amount, units) {
    units = units || UNITS.us;
    return {
      probability: probability == null ? null : Number(probability),
      intensity: intensity || "none",
      amount: amount == null ? null : measurement(amount, units.precipitation)
    };
  }

  function conditions(summary, icon) {
    return {
      summary: summary || "",
      icon: icon || "unknown"
    };
  }

  function emptyPackage() {
    return {
      meta: {
        provider: null,
        fetchedAt: null,
        lat: null,
        lng: null,
        timezone: null,
        units: "us",
        attribution: null,
        isPlaceholder: false
      },
      current: {
        observedAt: null,
        temperature: null,
        feelsLike: null,
        humidity: null,
        wind: null,
        precipitation: null,
        cloudCover: null,
        pressure: null,
        uvIndex: null,
        conditions: conditions("", "unknown"),
        sunrise: null,
        sunset: null
      },
      hourly: [],
      daily: []
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizePackage(raw) {
    var base = emptyPackage();
    if (!raw || typeof raw !== "object") return base;

    if (raw.meta) {
      Object.keys(base.meta).forEach(function (key) {
        if (raw.meta[key] !== undefined) base.meta[key] = raw.meta[key];
      });
    }

    if (raw.current) {
      Object.keys(base.current).forEach(function (key) {
        if (raw.current[key] !== undefined) base.current[key] = raw.current[key];
      });
      if (raw.current.conditions) {
        base.current.conditions = conditions(
          raw.current.conditions.summary,
          raw.current.conditions.icon
        );
      }
    }

    base.hourly = Array.isArray(raw.hourly) ? raw.hourly.map(function (h) {
      return Object.assign({
        time: null,
        temperature: null,
        feelsLike: null,
        humidity: null,
        wind: null,
        precipitation: null,
        cloudCover: null,
        pressure: null,
        uvIndex: null,
        conditions: conditions("", "unknown")
      }, h);
    }) : [];

    base.daily = Array.isArray(raw.daily) ? raw.daily.map(function (d) {
      return Object.assign({
        date: null,
        temperatureHigh: null,
        temperatureLow: null,
        humidity: null,
        wind: null,
        precipitation: null,
        cloudCover: null,
        pressure: null,
        uvIndex: null,
        conditions: conditions("", "unknown"),
        sunrise: null,
        sunset: null
      }, d);
    }) : [];

    return base;
  }

  function parseTemperatureString(str) {
    if (!str || typeof str !== "string") return null;
    var match = str.match(/(-?\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  }

  global.WDS = global.WDS || {};
  global.WDS.weather = global.WDS.weather || {};
  Object.assign(global.WDS.weather, {
    UNITS: UNITS,
    WeatherProviderError: WeatherProviderError,
    measurement: measurement,
    wind: wind,
    precipitation: precipitation,
    conditions: conditions,
    emptyPackage: emptyPackage,
    normalizePackage: normalizePackage,
    parseTemperatureString: parseTemperatureString,
    directionLabel: directionLabel,
    clone: clone
  });
})(window);
