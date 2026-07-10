/**
 * Runtime migration — upgrades persistent browser profiles from pre-fix builds.
 * Clears stale geographic packages, coordinates cross-tab reload, and guards open tabs.
 */
(function (global) {
  "use strict";

  var MIGRATION_STATE_KEY = "waypoint-runtime-migration";
  var ACTIVE_BUILD_KEY = "waypoint-active-build";
  var MIGRATE_PARAM = "wds-migrate";
  var CHANNEL_NAME = "waypoint-runtime-migration";
  var KANSAS_RIVER = /WHITE ROCK|BURR OAK,\s*KS/i;
  var KANSAS_SUN = /6:14\s*AM|9:04\s*PM/;

  var STALE_LOCAL_KEYS = [
    "waypoint-briefing-snapshot-v1",
    "waypointDebugSnapshot",
    "wds-location-v1",
    "wds-location-v2",
    "waypoint-oip-last-package-v1",
    "waypoint-usgs-cache-v1",
    "waypoint-daylight-cache-v1",
    "waypoint-weather-cache-v1"
  ];

  var STALE_SESSION_KEYS = [
    "waypoint-outdoor-context-v1"
  ];

  var KEEP_LOCAL_PREFIXES = [
    "wds-location-v3",
    "wds-location-prompted",
    "waypoint-dashboard-widgets",
    "waypoint-dashboard-favorites",
    "waypoint-debug-location",
    MIGRATION_STATE_KEY,
    ACTIVE_BUILD_KEY
  ];

  function buildInfo() {
    return (global.__WAYPOINT_BUILD__ || (global.WDS && global.WDS.build && global.WDS.build.info) || null);
  }

  function shouldKeepLocalKey(key) {
    if (!key) return false;
    return KEEP_LOCAL_PREFIXES.some(function (prefix) {
      return key === prefix || key.indexOf(prefix) === 0;
    });
  }

  function readMigrationState() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(MIGRATION_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeMigrationState(state) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(state));
      }
    } catch (e) { /* noop */ }
  }

  function writeActiveBuild(commit) {
    try {
      if (global.localStorage && commit) {
        global.localStorage.setItem(ACTIVE_BUILD_KEY, commit);
      }
    } catch (e) { /* noop */ }
  }

  function isMigrateReload() {
    try {
      return /(?:^|[?&])wds-migrate=1(?:&|$)/.test(global.location && global.location.search);
    } catch (e) {
      return false;
    }
  }

  function needsMigration(info, stored) {
    info = info || buildInfo();
    if (!info) return false;
    if (!stored) return true;
    if (stored.epoch != null && info.migrationEpoch != null && stored.epoch < info.migrationEpoch) return true;
    if (stored.loaderVersion != null && info.loaderVersion != null && stored.loaderVersion < info.loaderVersion) return true;
    if (stored.locationSchema != null && info.locationSchema != null && stored.locationSchema < info.locationSchema) return true;
    if (stored.build && info.commit && stored.build !== info.commit) return true;
    if (stored.build && info.minRecoveryBuild && stored.build !== info.minRecoveryBuild &&
        stored.build !== info.commit) return true;
    return false;
  }

  function packageLooksEngine(snapshot) {
    if (!snapshot) return false;
    try {
      var raw = typeof snapshot === "string" ? snapshot : JSON.stringify(snapshot);
      if (KANSAS_RIVER.test(raw)) return true;
      if (KANSAS_SUN.test(raw) && /America\/Chicago|39\.8|-98\.5/i.test(raw)) return true;
      if (/live-engine|engine-publish|waypoint-live-engine/i.test(raw)) return true;
    } catch (e) { /* noop */ }
    return false;
  }

  function clearStaleCaches() {
    var removed = { local: [], session: [] };
    try {
      if (global.localStorage) {
        STALE_LOCAL_KEYS.forEach(function (key) {
          if (global.localStorage.getItem(key) != null) {
            global.localStorage.removeItem(key);
            removed.local.push(key);
          }
        });
        var purge = [];
        for (var i = 0; i < global.localStorage.length; i++) {
          var k = global.localStorage.key(i);
          if (!k || shouldKeepLocalKey(k)) continue;
          if (/oip|usgs|daylight|weather|briefing|outdoor-context|live-engine|live\.json/i.test(k)) {
            purge.push(k);
          }
        }
        purge.forEach(function (key) {
          global.localStorage.removeItem(key);
          removed.local.push(key);
        });
      }
    } catch (e) { /* noop */ }
    try {
      if (global.sessionStorage) {
        STALE_SESSION_KEYS.forEach(function (key) {
          if (global.sessionStorage.getItem(key) != null) {
            global.sessionStorage.removeItem(key);
            removed.session.push(key);
          }
        });
        var spurge = [];
        for (var j = 0; j < global.sessionStorage.length; j++) {
          var sk = global.sessionStorage.key(j);
          if (!sk) continue;
          if (/oip|usgs|daylight|weather|briefing|outdoor-context|live-engine/i.test(sk)) {
            spurge.push(sk);
          }
        }
        spurge.forEach(function (key) {
          global.sessionStorage.removeItem(key);
          removed.session.push(key);
        });
      }
    } catch (e2) { /* noop */ }
    return removed;
  }

  function invalidateRuntimeModules() {
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.resetLastPackage) OIP.resetLastPackage();
    else if (OIP && OIP.clearCache) OIP.clearCache();
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.clearCache) RI.engine.clearCache();
    var LC = global.WDS && global.WDS.locationContext;
    if (LC && LC.invalidateCaches) LC.invalidateCaches();
    var US = global.WDS && global.WDS.usgsWater;
    if (US && US.clearCache) US.clearCache();
  }

  function migrationReloadUrl(info) {
    var url;
    try {
      url = new URL(global.location.href);
    } catch (e) {
      return null;
    }
    url.searchParams.set(MIGRATE_PARAM, "1");
    if (info && info.commit) url.searchParams.set("v", info.commit);
    return url.toString();
  }

  function stripMigrationParam() {
    try {
      var url = new URL(global.location.href);
      if (!url.searchParams.has(MIGRATE_PARAM)) return;
      url.searchParams.delete(MIGRATE_PARAM);
      global.history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (e) { /* noop */ }
  }

  function runEarlyBootstrap(info) {
    info = info || buildInfo();
    if (!info || !global.localStorage) return { action: "skip", reason: "no-build-info" };
    var stored = readMigrationState();
    var migrateReload = isMigrateReload();

    if (migrateReload) {
      writeMigrationState({
        epoch: info.migrationEpoch,
        build: info.commit,
        loaderVersion: info.loaderVersion,
        locationSchema: info.locationSchema,
        migratedAt: new Date().toISOString(),
        via: "reload"
      });
      writeActiveBuild(info.commit);
      stripMigrationParam();
      return { action: "complete-reload", stored: stored };
    }

    var staleOutdoor = false;
    try {
      staleOutdoor = packageLooksEngine(global.sessionStorage && global.sessionStorage.getItem("waypoint-outdoor-context-v1"));
    } catch (e) { /* noop */ }

    if (!needsMigration(info, stored) && !staleOutdoor) {
      writeActiveBuild(info.commit);
      return { action: "current", stored: stored };
    }

    var removed = clearStaleCaches();
    writeMigrationState({
      epoch: info.migrationEpoch,
      build: info.commit,
      loaderVersion: info.loaderVersion,
      locationSchema: info.locationSchema,
      stagedAt: new Date().toISOString(),
      pendingReload: true
    });

    var target = migrationReloadUrl(info);
    if (target) {
      global.location.replace(target);
      return { action: "reload", removed: removed, stored: stored };
    }
    return { action: "reload-failed", removed: removed, stored: stored };
  }

  function onModulesReady() {
    var info = buildInfo();
    if (!info) return;
    invalidateRuntimeModules();
    writeActiveBuild(info.commit);
    writeMigrationState({
      epoch: info.migrationEpoch,
      build: info.commit,
      loaderVersion: info.loaderVersion,
      locationSchema: info.locationSchema,
      migratedAt: new Date().toISOString(),
      modulesReadyAt: new Date().toISOString()
    });
    broadcast({ type: "runtime-ready", commit: info.commit });
  }

  function watchdog() {
    var info = buildInfo();
    if (!info) {
      forceHardReload("missing-build-metadata");
      return;
    }
    var active = null;
    try {
      active = global.localStorage && global.localStorage.getItem(ACTIVE_BUILD_KEY);
    } catch (e) { /* noop */ }
    if (active && active !== info.commit) {
      forceHardReload("active-build-mismatch");
      return;
    }
    var body = global.document && global.document.body ? global.document.body.innerText : "";
    if (KANSAS_RIVER.test(body)) {
      clearStaleCaches();
      invalidateRuntimeModules();
      if (global.WDS && global.WDS.contentEngine && global.WDS.location) {
        var loc = global.WDS.location.getState && global.WDS.location.getState();
        if (loc && global.WDS.contentEngine.init) {
          try { global.WDS.contentEngine.init({ location: loc, mount: document.getElementById("wds-content-engine") }); } catch (e2) { /* noop */ }
        }
      }
      if (KANSAS_RIVER.test(body)) forceHardReload("kansas-river-visible");
    }
  }

  function forceHardReload(reason) {
    var info = buildInfo();
    var target = migrationReloadUrl(info || { commit: "recover" });
    if (!target) return;
  try {
      if (global.sessionStorage) global.sessionStorage.setItem("waypoint-last-reload-reason", reason || "unknown");
    } catch (e) { /* noop */ }
    global.location.replace(target);
  }

  function handleBfcacheRestore() {
    clearStaleCaches();
    invalidateRuntimeModules();
    forceHardReload("bfcache-restore");
  }

  function broadcast(msg) {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        var ch = new BroadcastChannel(CHANNEL_NAME);
        ch.postMessage(msg);
        ch.close();
      }
    } catch (e) { /* noop */ }
  }

  function installCrossTabListeners() {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        var channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = function (ev) {
          var data = ev && ev.data;
          var info = buildInfo();
          if (!data || !info) return;
          if (data.type === "runtime-ready" && data.commit && data.commit !== info.commit) {
            forceHardReload("cross-tab-build-update");
          }
          if (data.type === "force-reload") {
            forceHardReload(data.reason || "cross-tab-force");
          }
        };
      }
    } catch (e) { /* noop */ }

    try {
      if (global.addEventListener) {
        global.addEventListener("storage", function (ev) {
          if (!ev || ev.key !== ACTIVE_BUILD_KEY || !ev.newValue) return;
          var info = buildInfo();
          if (info && ev.newValue !== info.commit) {
            forceHardReload("storage-build-update");
          }
        });
      }
    } catch (e2) { /* noop */ }
  }

  function diagnose() {
    var info = buildInfo();
    var stored = readMigrationState();
    var scriptLoads = global.WDS && global.WDS.build && global.WDS.build.getScriptLoads
      ? global.WDS.build.getScriptLoads() : [];
    var staleScripts = scriptLoads.filter(function (s) {
      return s.url && info && info.commit && s.url.indexOf("?v=" + info.commit) < 0 &&
        /\/design-system\/js\//.test(s.url);
    });
    return {
      build: info,
      migrationState: stored,
      needsMigration: needsMigration(info, stored),
      migrateReload: isMigrateReload(),
      activeBuild: (function () {
        try { return global.localStorage && global.localStorage.getItem(ACTIVE_BUILD_KEY); } catch (e) { return null; }
      })(),
      staleScriptLoads: staleScripts,
      outdoorContextEngine: packageLooksEngine(
        global.sessionStorage && global.sessionStorage.getItem("waypoint-outdoor-context-v1")
      ),
      oipLastPackage: !!(global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.getLast &&
        global.WDS.outdoorIntelligence.getLast())
    };
  }

  installCrossTabListeners();

  global.WDS = global.WDS || {};
  global.WDS.runtimeMigration = {
    MIGRATION_STATE_KEY: MIGRATION_STATE_KEY,
    ACTIVE_BUILD_KEY: ACTIVE_BUILD_KEY,
    runEarlyBootstrap: runEarlyBootstrap,
    onModulesReady: onModulesReady,
    watchdog: watchdog,
    handleBfcacheRestore: handleBfcacheRestore,
    clearStaleCaches: clearStaleCaches,
    invalidateRuntimeModules: invalidateRuntimeModules,
    diagnose: diagnose,
    forceHardReload: forceHardReload,
    needsMigration: needsMigration
  };
})(typeof window !== "undefined" ? window : globalThis);
