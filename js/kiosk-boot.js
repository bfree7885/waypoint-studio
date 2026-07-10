/**
 * Kiosk — user location bootstrap + full OIP at detected coordinates.
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var boot = null;

  function getBoot() {
    if (boot) return boot;
    if (!window.WDS || !WDS.appBoot || !WDS.appBoot.create) return null;
    boot = WDS.appBoot.create({ base: ENGINE_BASE, promptMount: null });
    return boot;
  }

  function waitForBoot() {
    return new Promise(function (resolve) {
      function check() {
        if (getBoot()) resolve();
        else requestAnimationFrame(check);
      }
      check();
    });
  }

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return Number(meas.value);
    return null;
  }

  function platformToKioskModules(platform) {
    if (!platform) return null;
    var pkg = platform.weatherRef || platform.weather;
    var cur = pkg && pkg.current;
    var daily = pkg && pkg.daily && pkg.daily[0];
    var hourly = pkg && pkg.hourly;
    var dl = platform.daylight;
    var photo = window.WDS && WDS.photographyConditions && WDS.photographyConditions.fromPlatform
      ? WDS.photographyConditions.fromPlatform(platform)
      : null;
    var hours = [];
    if (hourly && hourly.time) {
      for (var i = 0; i < Math.min(6, hourly.time.length); i++) {
        hours.push({
          time: hourly.time[i],
          temperatureF: num(hourly.temperature && hourly.temperature[i]),
          conditions: hourly.conditions && hourly.conditions[i]
            ? (hourly.conditions[i].summary || hourly.conditions[i])
            : null
        });
      }
    }
    var wx = pkg ? {
      timezone: (pkg.meta && pkg.meta.timezone) || platform.timezone || "America/New_York",
      current: {
        temperatureF: num(cur && cur.temperature),
        feelsLikeF: num(cur && cur.feelsLike),
        humidity: num(cur && cur.humidity),
        windMph: num(cur && cur.wind && cur.wind.speed),
        windGustMph: num(cur && cur.wind && cur.wind.gust),
        cloudCover: num(cur && cur.cloudCover),
        uvIndex: num(cur && cur.uvIndex),
        conditions: cur && cur.conditions ? cur.conditions.summary : null,
        observedAt: (pkg.meta && pkg.meta.fetchedAt) || new Date().toISOString()
      },
      forecast: {
        highF: daily ? num(daily.temperature && daily.temperature.max) : null,
        lowF: daily ? num(daily.temperature && daily.temperature.min) : null,
        precipProbability: daily && daily.precipitation ? num(daily.precipitation.probability) : null,
        summary: daily && daily.conditions ? daily.conditions.summary : null
      },
      hourly: { nextHours: hours, note: "Next hours at your location" },
      sun: dl ? {
        sunrise: dl.sunrise,
        sunset: dl.sunset,
        sunriseFormatted: dl.sunriseFormatted,
        sunsetFormatted: dl.sunsetFormatted
      } : null,
      moon: dl ? { phase: dl.moonPhase, illumination: dl.moonIllumination } : null,
      userLocation: true
    } : null;
    return {
      weather: wx,
      airQuality: platform.airQuality || null,
      alerts: platform.alerts || null,
      usgsWater: platform.usgsWater || null,
      photography: photo,
      daylight: dl || null
    };
  }

  function bootKiosk() {
    waitForBoot()
      .then(function () {
        var B = getBoot();
        return B.bootstrapLocation();
      })
      .then(function (loc) {
        window.__WAYPOINT_KIOSK_LOC__ = loc;
        if (!loc || loc.lat == null || loc.lng == null) {
          window.__WAYPOINT_KIOSK_PLATFORM__ = null;
          window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
          window.__WAYPOINT_KIOSK_WEATHER__ = null;
          return loc;
        }
        return getBoot().fetchPlatform(loc).then(function (platform) {
          window.__WAYPOINT_KIOSK_PLATFORM__ = platform;
          var mods = platformToKioskModules(platform);
          window.__WAYPOINT_KIOSK_USER_MODULES__ = mods;
          window.__WAYPOINT_KIOSK_WEATHER__ = mods && mods.weather;
          if (window.WDS && WDS.locationDebug && WDS.locationDebug.mount) {
            WDS.locationDebug.mount(loc, platform, document.getElementById("swk"));
          }
          return loc;
        });
      })
      .then(function (loc) {
        document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", {
          detail: {
            location: loc,
            platform: window.__WAYPOINT_KIOSK_PLATFORM__,
            weather: window.__WAYPOINT_KIOSK_WEATHER__
          }
        }));
      })
      .catch(function () {
        document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", { detail: {} }));
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootKiosk);
  } else {
    bootKiosk();
  }
})();
