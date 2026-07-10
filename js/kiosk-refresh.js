/**
 * Kiosk refresh controller — user-location OIP + engine health on a self-scheduling loop.
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var DEFAULT_REFRESH_MS = 5 * 60 * 1000;
  var REFRESH_TIMEOUT_MS = 45000;
  var BACKOFF_BASE_MS = 15000;
  var BACKOFF_MAX_MS = 5 * 60 * 1000;
  var WAKE_GAP_MS = 60000;
  var KANSAS_RIVER = /WHITE ROCK|BURR OAK,\s*KS/i;

  var state = {
    refreshIntervalMs: DEFAULT_REFRESH_MS,
    generation: 0,
    inFlight: false,
    failureCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    nextRefreshAt: null,
    lastError: null,
    conditionsUpdatedAt: null,
    renderedAt: null,
    enginePublishedAt: null,
    moduleResults: {},
    location: null,
    locationContextId: null,
    platform: null,
    userModules: null,
    engineContext: null,
    timerId: null,
    lastWakeAt: Date.now(),
    buildId: null
  };

  function parseTestInterval() {
    try {
      var params = new URLSearchParams(global.location.search || "");
      var ms = Number(params.get("kioskTestRefreshMs"));
      if (isFinite(ms) && ms >= 500 && ms <= 60000) return ms;
    } catch (e) { /* noop */ }
    return DEFAULT_REFRESH_MS;
  }

  function isDebugRefresh() {
    try {
      return /(?:^|[?&])debug=refresh(?:&|$)/.test(global.location.search || "") ||
        /(?:^|[?&])debug=location(?:&|$)/.test(global.location.search || "");
    } catch (e) {
      return false;
    }
  }

  function getBuildId() {
    var build = global.__WAYPOINT_BUILD__;
    return build && build.commit ? build.commit : null;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getBoot() {
    return global.KioskBoot && global.KioskBoot.getBoot ? global.KioskBoot.getBoot() : null;
  }

  function configurePlatform() {
    if (global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.configure) {
      global.WDS.outdoorIntelligence.configure({
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      });
    }
    if (global.WDS && global.WDS.weather && global.WDS.weather.configure) {
      global.WDS.weather.configure({ provider: "open-meteo", fallback: false });
    }
  }

  function waitForBoot() {
    return new Promise(function (resolve) {
      function check() {
        if (getBoot()) {
          configurePlatform();
          resolve();
          return;
        }
        global.requestAnimationFrame(check);
      }
      check();
    });
  }

  function getLocationState() {
    if (!global.WDS || !global.WDS.location || !global.WDS.location.getState) return null;
    return global.WDS.location.getState();
  }

  function locationContextId(loc) {
    if (!loc || loc.lat == null || loc.lng == null) return null;
    var LC = global.WDS && global.WDS.locationContext;
    if (!LC || !LC.fromLocation) return null;
    var ctx = LC.fromLocation(loc);
    return ctx && ctx.id ? ctx.id : null;
  }

  function coordsChanged(a, b) {
    if (!a || !b) return false;
    var LC = global.WDS && global.WDS.locationContext;
    if (LC && LC.coordsMatch) return !LC.coordsMatch(a, b);
    return Number(a.lat) !== Number(b.lat) || Number(a.lng) !== Number(b.lng);
  }

  function invalidateUserCaches() {
    var LC = global.WDS && global.WDS.locationContext;
    if (LC && LC.invalidateCaches) LC.invalidateCaches();
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.resetLastPackage) OIP.resetLastPackage();
  }

  function ensureLocation(reason) {
    var boot = getBoot();
    if (!boot) return Promise.reject(new Error("Kiosk boot is not available"));
    var existing = getLocationState();
    if (existing && existing.lat != null && existing.lng != null) {
      if (global.WDS.location.refreshLocationInBackground && reason !== "initial") {
        global.WDS.location.refreshLocationInBackground(null, ENGINE_BASE);
      }
      return Promise.resolve(getLocationState() || existing);
    }
    return boot.bootstrapLocation();
  }

  function fetchUserPlatform(loc, generation) {
    var boot = getBoot();
    if (!boot) return Promise.reject(new Error("Kiosk boot is not available"));
    var reqLoc = Object.assign({}, loc, {
      refreshReason: "kiosk-refresh",
      kioskGeneration: generation,
      refreshAt: Date.now()
    });
    return boot.fetchPlatform(reqLoc).then(function (platform) {
      if (!platform) return null;
      var PG = global.WDS && global.WDS.platformGuard;
      if (PG && PG.sanitizeUserPlatform) {
        platform = PG.sanitizeUserPlatform(platform, loc);
      }
      if (platformContainsKansasLeak(platform, loc)) {
        throw new Error("Rejected engine river data in user kiosk package");
      }
      return platform;
    });
  }

  function platformContainsKansasLeak(platform, loc) {
    if (!platform) return false;
    try {
      var raw = JSON.stringify(platform.usgsWater || platform);
      if (!KANSAS_RIVER.test(raw)) return false;
      if (!loc || loc.lat == null) return true;
      return Number(loc.lat) > 37 && Number(loc.lng) > -85;
    } catch (e) {
      return false;
    }
  }


  function extractConditionsUpdatedAt(platform) {
    if (!platform) return null;
    var wx = platform.weatherRef || platform.weather;
    if (wx && wx.meta && wx.meta.fetchedAt) return wx.meta.fetchedAt;
    if (platform.meta && platform.meta.hydratedAt) return platform.meta.hydratedAt;
    return null;
  }

  function criticalModulesLive(platform) {
    var bs = platform && platform.meta && platform.meta.blockStatus;
    if (bs && bs.weather === "live") return true;
    var wx = platform && (platform.weatherRef || platform.weather);
    return !!(wx && wx.current);
  }

  function extractModuleResults(platform) {
    var bs = (platform && platform.meta && platform.meta.blockStatus) || {};
    var hydratedAt = platform && platform.meta && platform.meta.hydratedAt;
    var names = ["weather", "daylight", "alerts", "airQuality", "elevation", "usgsWater"];
    var out = {};
    names.forEach(function (name) {
      out[name] = {
        status: bs[name] || "unknown",
        critical: name === "weather" || name === "daylight",
        updatedAt: hydratedAt || null
      };
    });
    return out;
  }

  function applyUserPackage(platform, loc) {
    if (!global.KioskBoot || !global.KioskBoot.applyUserPackage) return null;
    return global.KioskBoot.applyUserPackage(platform, loc);
  }

  function publishDiagnostics() {
    var diag = {
      buildId: state.buildId || getBuildId(),
      coordinates: state.location && state.location.lat != null
        ? { lat: state.location.lat, lng: state.location.lng }
        : null,
      locationContextId: state.locationContextId,
      refreshIntervalMs: state.refreshIntervalMs,
      lastAttemptAt: state.lastAttemptAt,
      lastSuccessAt: state.lastSuccessAt,
      nextRefreshAt: state.nextRefreshAt,
      inFlight: state.inFlight,
      generation: state.generation,
      failureCount: state.failureCount,
      latestError: state.lastError,
      conditionsUpdatedAt: state.conditionsUpdatedAt,
      renderedAt: state.renderedAt,
      enginePublishedAt: state.enginePublishedAt,
      packageTimestamp: state.conditionsUpdatedAt,
      moduleResults: state.moduleResults
    };
    global.__WAYPOINT_KIOSK_REFRESH__ = Object.assign({
      getState: function () { return Object.assign({}, state, { moduleResults: Object.assign({}, state.moduleResults) }); },
      refreshNow: function (reason) { return runRefresh(reason || "manual"); },
      REFRESH_MS: state.refreshIntervalMs
    }, diag);
    if (isDebugRefresh() && global.KioskBoot && global.KioskBoot.mountRefreshDebug) {
      global.KioskBoot.mountRefreshDebug(diag);
    }
    return diag;
  }

  function dispatchRefresh(detail) {
    state.renderedAt = nowIso();
    publishDiagnostics();
    try {
      global.document.dispatchEvent(new CustomEvent("waypoint:kiosk-refresh", { detail: detail }));
    } catch (e) { /* noop */ }
  }

  function scheduleNext(delayMs) {
    if (state.timerId) global.clearTimeout(state.timerId);
    if (delayMs == null) {
      delayMs = state.failureCount > 0
        ? Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, state.failureCount - 1))
        : state.refreshIntervalMs;
    }
    state.nextRefreshAt = new Date(Date.now() + delayMs).toISOString();
    state.timerId = global.setTimeout(function () {
      runRefresh("scheduled");
    }, delayMs);
    publishDiagnostics();
  }

  function runRefresh(reason) {
    if (state.inFlight) return state.inFlightPromise;
    state.generation += 1;
    var generation = state.generation;
    state.inFlight = true;
    state.lastAttemptAt = nowIso();
    publishDiagnostics();

    var timeout = new Promise(function (_, reject) {
      global.setTimeout(function () {
        reject(new Error("Kiosk refresh timed out"));
      }, REFRESH_TIMEOUT_MS);
    });

    state.inFlightPromise = Promise.race([doRefresh(generation, reason || "scheduled"), timeout])
      .catch(function (err) {
        state.failureCount += 1;
        state.lastError = err && err.message ? err.message : String(err);
        dispatchRefresh({
          reason: reason,
          error: state.lastError,
          partial: !!(state.userModules || state.platform),
          location: state.location,
          platform: state.platform,
          userModules: state.userModules,
          engineContext: state.engineContext,
          conditionsUpdatedAt: state.conditionsUpdatedAt,
          enginePublishedAt: state.enginePublishedAt,
          refresh: publishDiagnostics()
        });
      })
      .finally(function () {
        state.inFlight = false;
        scheduleNext();
      });

    return state.inFlightPromise;
  }

  function doRefresh(generation, reason) {
    if (global.WDS && global.WDS.runtimeMigration && global.WDS.runtimeMigration.watchdog) {
      global.WDS.runtimeMigration.watchdog();
    }

    var prevLoc = state.location;
    return ensureLocation(reason).then(function (loc) {
      if (generation !== state.generation) return null;
      if (coordsChanged(prevLoc, loc)) {
        invalidateUserCaches();
        state.platform = null;
        state.userModules = null;
        state.conditionsUpdatedAt = null;
      }
      state.location = loc;
      state.locationContextId = locationContextId(loc);

      return fetchUserPlatform(loc, generation).then(function (platform) {
        if (generation !== state.generation) return null;

        var userModules = null;
        var partial = false;
        var error = null;

        if (platform) {
          userModules = applyUserPackage(platform, loc);
          state.platform = platform;
          state.userModules = userModules;
          state.engineContext = platform.engineContext || state.engineContext;
          var eng = platform.engineContext && platform.engineContext.engine;
          state.enginePublishedAt = eng && eng.updatedAt ? eng.updatedAt : state.enginePublishedAt;
          state.conditionsUpdatedAt = extractConditionsUpdatedAt(platform);
          state.moduleResults = extractModuleResults(platform);
          if (criticalModulesLive(platform)) {
            state.failureCount = 0;
            state.lastError = null;
            state.lastSuccessAt = nowIso();
          } else {
            partial = true;
            error = "Critical weather/daylight modules unavailable";
            state.failureCount += 1;
            state.lastError = error;
          }
        } else {
          partial = !!(state.userModules || state.platform);
          error = "User conditions fetch failed";
          state.failureCount += 1;
          state.lastError = error;
          platform = state.platform;
          userModules = state.userModules;
        }

        if (global.WDS && global.WDS.locationDebug && global.WDS.locationDebug.mount && loc) {
          global.WDS.locationDebug.mount(loc, platform, global.document.getElementById("swk"));
        }

        dispatchRefresh({
          reason: reason,
          error: error,
          partial: partial,
          location: loc,
          platform: platform,
          userModules: userModules || state.userModules,
          engineContext: state.engineContext,
          conditionsUpdatedAt: state.conditionsUpdatedAt,
          enginePublishedAt: state.enginePublishedAt,
          refresh: publishDiagnostics()
        });
        return true;
      });
    });
  }

  function isStale() {
    if (!state.conditionsUpdatedAt) return true;
    var age = Date.now() - Date.parse(state.conditionsUpdatedAt);
    return !Number.isFinite(age) || age > state.refreshIntervalMs;
  }

  function onWake(reason) {
    var gap = Date.now() - state.lastWakeAt;
    state.lastWakeAt = Date.now();
    if (isStale() || gap > WAKE_GAP_MS) {
      runRefresh(reason);
    }
  }

  function bindWakeHandlers() {
    global.document.addEventListener("visibilitychange", function () {
      if (global.document.visibilityState === "visible") onWake("visibility");
    });
    global.addEventListener("pageshow", function (ev) {
      if (ev && ev.persisted && global.WDS && global.WDS.runtimeMigration &&
          global.WDS.runtimeMigration.handleBfcacheRestore) {
        global.WDS.runtimeMigration.handleBfcacheRestore();
      }
      onWake("pageshow");
    });
    global.addEventListener("online", function () { runRefresh("online"); });
    global.addEventListener("focus", function () {
      if (isStale()) runRefresh("focus");
    });
  }

  function init() {
    state.refreshIntervalMs = parseTestInterval();
    state.buildId = getBuildId();
    publishDiagnostics();
    bindWakeHandlers();
    runRefresh("initial");
  }

  publishDiagnostics();

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", function () {
      waitForBoot().then(init);
    });
  } else {
    waitForBoot().then(init);
  }
})(window);
