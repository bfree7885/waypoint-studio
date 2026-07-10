/**
 * Kiosk — user location bootstrap + full OIP at detected coordinates.
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var MODULE_TIMEOUT_MS = 15000;
  var BOOT_TIMEOUT_MS = 22000;

  function waitFor(checkFn, label, maxMs) {
    maxMs = maxMs != null ? maxMs : MODULE_TIMEOUT_MS;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      function tick() {
        if (checkFn()) {
          resolve();
          return;
        }
        if (Date.now() - started >= maxMs) {
          reject(new Error(label + " timed out"));
          return;
        }
        requestAnimationFrame(tick);
      }
      tick();
    });
  }

  function withTimeout(promise, ms, message) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error(message || "timed out"));
      }, ms);
      promise.then(function (value) {
        clearTimeout(timer);
        resolve(value);
      }).catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function unavailableLoc() {
    if (window.WDS && WDS.location && WDS.location.unavailableState) {
      return WDS.location.unavailableState();
    }
    return {
      source: "unavailable",
      unavailable: true,
      displayTitle: "Location unavailable",
      placeLabel: "Location unavailable",
      lat: null,
      lng: null
    };
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
    var hourlyArr = Array.isArray(hourly) ? hourly : (hourly && hourly.nextHours ? hourly.nextHours : []);
    if (hourlyArr.length) {
      for (var i = 0; i < Math.min(6, hourlyArr.length); i++) {
        var row = hourlyArr[i];
        hours.push({
          time: row.time,
          temperatureF: num(row.temperature),
          conditions: row.conditions && row.conditions.summary ? row.conditions.summary : null
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

  function fetchPlatform(loc) {
    return waitFor(function () {
      return !!(window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.get);
    }, "outdoor intelligence", MODULE_TIMEOUT_MS).then(function () {
      if (WDS.outdoorIntelligence.configure) {
        WDS.outdoorIntelligence.configure({
          contentEngineBase: ENGINE_BASE,
          includeWeather: true
        });
      }
      if (WDS.weather && WDS.weather.configure) {
        WDS.weather.configure({ provider: "open-meteo", fallback: false });
      }
      return WDS.outdoorIntelligence.get({
        location: loc,
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      }).then(function (platform) {
        var LE = WDS.liveEngine;
        if (!LE || !LE.fetchEngineContext || !LE.mergeEngineContext) return platform;
        return LE.fetchEngineContext().then(function (engineCtx) {
          return LE.mergeEngineContext(platform, engineCtx, loc);
        });
      });
    });
  }

  function publishReady(loc) {
    window.__WAYPOINT_KIOSK_BOOT_DONE__ = true;
    document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", {
      detail: {
        location: loc,
        platform: window.__WAYPOINT_KIOSK_PLATFORM__,
        weather: window.__WAYPOINT_KIOSK_WEATHER__
      }
    }));
  }

  function bootKiosk() {
    window.__WAYPOINT_KIOSK_BOOT_DONE__ = false;

    withTimeout(
      waitFor(function () {
        return !!(
          window.WDS &&
          WDS.location && WDS.location.bootstrap &&
          WDS.ipGeolocation && WDS.ipGeolocation.lookup
        );
      }, "location services", MODULE_TIMEOUT_MS).then(function () {
        return WDS.location.bootstrap({
          base: ENGINE_BASE,
          promptMount: null,
          skipPrompt: true,
          skipEnrich: true
        });
      }),
      BOOT_TIMEOUT_MS,
      "Kiosk location bootstrap timed out"
    )
      .then(function (loc) {
        window.__WAYPOINT_KIOSK_LOC__ = loc || unavailableLoc();
        publishReady(window.__WAYPOINT_KIOSK_LOC__);

        if (!loc || loc.lat == null || loc.lng == null || loc.source === "unavailable") {
          window.__WAYPOINT_KIOSK_PLATFORM__ = null;
          window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
          window.__WAYPOINT_KIOSK_WEATHER__ = null;
          return;
        }

        withTimeout(fetchPlatform(loc), BOOT_TIMEOUT_MS, "Kiosk weather bootstrap timed out")
          .then(function (platform) {
            window.__WAYPOINT_KIOSK_PLATFORM__ = platform;
            var mods = platformToKioskModules(platform);
            window.__WAYPOINT_KIOSK_USER_MODULES__ = mods;
            window.__WAYPOINT_KIOSK_WEATHER__ = mods && mods.weather;
            if (window.WDS && WDS.locationDebug && WDS.locationDebug.mount) {
              WDS.locationDebug.mount(loc, platform, document.getElementById("swk"));
            }
            document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", {
              detail: {
                location: loc,
                platform: platform,
                weather: window.__WAYPOINT_KIOSK_WEATHER__
              }
            }));
          })
          .catch(function (err) {
            console.warn("[Waypoint kiosk] weather bootstrap failed:", err && err.message ? err.message : err);
            window.__WAYPOINT_KIOSK_PLATFORM__ = null;
            window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
            window.__WAYPOINT_KIOSK_WEATHER__ = null;
          });
      })
      .catch(function (err) {
        console.warn("[Waypoint kiosk] location bootstrap failed:", err && err.message ? err.message : err);
        window.__WAYPOINT_KIOSK_LOC__ = unavailableLoc();
        window.__WAYPOINT_KIOSK_PLATFORM__ = null;
        window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
        window.__WAYPOINT_KIOSK_WEATHER__ = null;
        publishReady(window.__WAYPOINT_KIOSK_LOC__);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootKiosk);
  } else {
    bootKiosk();
  }
})();
