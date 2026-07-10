/**
 * Kiosk — user location bootstrap + full OIP at detected coordinates.
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var MODULE_TIMEOUT_MS = 15000;
  var LOCATION_TIMEOUT_MS = 22000;
  var WEATHER_TIMEOUT_MS = 45000;
  var WEATHER_RETRIES = 2;

  var bootState = {
    phase: "BOOTING",
    location: null,
    platform: null,
    normalized: null,
    lastError: null,
    updatedAt: null
  };

  function setPhase(phase, err) {
    bootState.phase = phase;
    bootState.lastError = err && err.message ? err.message : (err || null);
    bootState.updatedAt = new Date().toISOString();
    window.__WAYPOINT_KIOSK_STATE__ = Object.assign({}, bootState);
  }

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

  function normalizeApi() {
    return window.WDS && WDS.kioskNormalize ? WDS.kioskNormalize : null;
  }

  function applyNormalized(loc, platform) {
    var N = normalizeApi();
    if (!N) return null;
    var normalized = N.normalizePlatform(platform, loc);
    window.__WAYPOINT_KIOSK_LOC__ = loc;
    window.__WAYPOINT_KIOSK_PLATFORM__ = platform;
    window.__WAYPOINT_KIOSK_USER_MODULES__ = normalized.modules;
    window.__WAYPOINT_KIOSK_NORMALIZED__ = normalized;
    window.__WAYPOINT_KIOSK_WEATHER__ = normalized.modules.weather;
    bootState.location = loc;
    bootState.platform = platform;
    bootState.normalized = normalized;
    return normalized;
  }

  function fetchPlatform(loc, attempt) {
    attempt = attempt || 0;
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
        if (!platform) {
          if (attempt < WEATHER_RETRIES) {
            return delay(400).then(function () { return fetchPlatform(loc, attempt + 1); });
          }
          return null;
        }
        var LE = WDS.liveEngine;
        if (!LE || !LE.fetchEngineContext || !LE.mergeEngineContext) return platform;
        return LE.fetchEngineContext().then(function (engineCtx) {
          return LE.mergeEngineContext(platform, engineCtx, loc);
        });
      });
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function publishReady(detail) {
    window.__WAYPOINT_KIOSK_BOOT_DONE__ = bootState.phase !== "BOOTING" &&
      bootState.phase !== "RESOLVING_LOCATION";
    document.dispatchEvent(new CustomEvent("waypoint:kiosk-location-ready", {
      detail: Object.assign({
        phase: bootState.phase,
        location: bootState.location,
        platform: bootState.platform,
        normalized: bootState.normalized,
        weather: window.__WAYPOINT_KIOSK_WEATHER__
      }, detail || {})
    }));
  }

  function onPlatformUpdate(platform) {
    if (!bootState.location || bootState.location.lat == null) return;
    if (!platform) return;
    applyNormalized(bootState.location, platform);
    var N = normalizeApi();
    var wxReady = N && N.moduleReady(bootState.normalized.modules.weather, "weather");
    setPhase(wxReady ? "READY" : "PARTIAL");
    publishReady({ reason: "platform-update" });
  }

  function subscribeOip() {
    if (!window.WDS || !WDS.outdoorIntelligence || !WDS.outdoorIntelligence.onChange) return;
    if (window.__WAYPOINT_KIOSK_OIP_SUB__) return;
    window.__WAYPOINT_KIOSK_OIP_SUB__ = true;
    WDS.outdoorIntelligence.onChange(function (platform) {
      onPlatformUpdate(platform);
    });
  }

  function loadConditions(loc) {
    setPhase("LOADING_CONDITIONS");
    publishReady({ reason: "conditions-loading" });

    return withTimeout(fetchPlatform(loc), WEATHER_TIMEOUT_MS, "Kiosk weather bootstrap timed out")
      .then(function (platform) {
        if (!platform) {
          setPhase("PARTIAL", "Outdoor intelligence returned no platform package");
          publishReady({ reason: "conditions-partial" });
          return;
        }
        applyNormalized(loc, platform);
        if (window.WDS && WDS.locationDebug && WDS.locationDebug.mount) {
          WDS.locationDebug.mount(loc, platform, document.getElementById("swk"));
        }
        var N = normalizeApi();
        var wxReady = N && N.moduleReady(bootState.normalized.modules.weather, "weather");
        setPhase(wxReady ? "READY" : "PARTIAL");
        publishReady({ reason: "conditions-ready" });
      })
      .catch(function (err) {
        console.warn("[Waypoint kiosk] weather bootstrap failed:", err && err.message ? err.message : err);
        var last = WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
          ? WDS.outdoorIntelligence.getLast()
          : null;
        if (last) {
          onPlatformUpdate(last);
        } else {
          setPhase("PARTIAL", err);
          publishReady({ reason: "conditions-failed" });
        }
      });
  }

  function bootKiosk() {
    window.__WAYPOINT_KIOSK_BOOT_DONE__ = false;
    setPhase("BOOTING");
    subscribeOip();

    withTimeout(
      waitFor(function () {
        return !!(
          window.WDS &&
          WDS.location && WDS.location.bootstrap &&
          WDS.ipGeolocation && WDS.ipGeolocation.lookup
        );
      }, "location services", MODULE_TIMEOUT_MS).then(function () {
        setPhase("RESOLVING_LOCATION");
        return WDS.location.bootstrap({
          base: ENGINE_BASE,
          promptMount: null,
          skipPrompt: true,
          skipEnrich: true
        });
      }),
      LOCATION_TIMEOUT_MS,
      "Kiosk location bootstrap timed out"
    )
      .then(function (loc) {
        var resolved = loc || unavailableLoc();
        window.__WAYPOINT_KIOSK_LOC__ = resolved;
        bootState.location = resolved;

        if (!loc || loc.lat == null || loc.lng == null || loc.source === "unavailable") {
          setPhase("FAILED", "Location unavailable");
          window.__WAYPOINT_KIOSK_PLATFORM__ = null;
          window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
          window.__WAYPOINT_KIOSK_NORMALIZED__ = null;
          window.__WAYPOINT_KIOSK_WEATHER__ = null;
          publishReady({ reason: "location-unavailable" });
          return;
        }

        publishReady({ reason: "location-ready" });
        return loadConditions(resolved);
      })
      .catch(function (err) {
        console.warn("[Waypoint kiosk] location bootstrap failed:", err && err.message ? err.message : err);
        var loc = unavailableLoc();
        window.__WAYPOINT_KIOSK_LOC__ = loc;
        bootState.location = loc;
        setPhase("FAILED", err);
        window.__WAYPOINT_KIOSK_PLATFORM__ = null;
        window.__WAYPOINT_KIOSK_USER_MODULES__ = null;
        window.__WAYPOINT_KIOSK_NORMALIZED__ = null;
        window.__WAYPOINT_KIOSK_WEATHER__ = null;
        publishReady({ reason: "location-failed" });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootKiosk);
  } else {
    bootKiosk();
  }
})();
