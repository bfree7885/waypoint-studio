/**
 * Waypoint Studio — Platform identity & settings consolidation helpers
 *
 * Ensures one profile / settings surface is usable, and lightly mirrors
 * common preferences without deleting per-app specialty stores.
 *
 *   WDS.platformIdentity.ensure()
 *   WDS.platformIdentity.displayName()
 *   WDS.platformIdentity.linkApp(appId, meta)
 *   WDS.platformIdentity.applyTheme()
 *   WDS.platformIdentity.measurementSystem()
 */
(function (global) {
  "use strict";

  function platform() {
    return global.WDS && global.WDS.platform;
  }

  function ensure() {
    var P = platform();
    if (!P || !P.Profile || !P.Settings) return null;
    var profile = P.Profile.load();
    var settings = P.Settings.load();

    // Expand settings schema safely
    var patched = false;
    if (!settings.units) {
      settings.units = {
        measurementSystem: (profile.preferences && profile.preferences.measurementSystem) || "imperial",
        temperature: "fahrenheit",
        coordinateFormat: "dd"
      };
      patched = true;
    }
    if (!settings.maps) {
      settings.maps = { preferOfflineTiles: false, defaultZoomHint: "region" };
      patched = true;
    }
    if (!settings.theme) {
      settings.theme = { mode: (profile.preferences && profile.preferences.theme) || "system" };
      patched = true;
    }
    if (!settings.notifications) {
      settings.notifications = { enabled: false, localRemindersOnly: true };
      patched = true;
    }
    if (patched) P.Settings.save(settings);

    if (!profile.linkedApps) profile.linkedApps = {};
    P.Profile.save(profile);

    // Seed graph architecture once
    try {
      var Graph = global.WDS && global.WDS.platformGraph;
      if (Graph && Graph.seedArchitecture && !localStorage.getItem("waypoint-platform-graph-seeded-v1")) {
        Graph.seedArchitecture();
        localStorage.setItem("waypoint-platform-graph-seeded-v1", "1");
      }
    } catch (e) { /* ignore */ }

    return { profile: profile, settings: settings };
  }

  function displayName() {
    var P = platform();
    if (!P) return null;
    var p = P.Profile.load();
    return p.displayName || null;
  }

  function linkApp(appId, meta) {
    var P = platform();
    if (!P || !appId) return false;
    var p = P.Profile.load();
    p.linkedApps = p.linkedApps || {};
    p.linkedApps[appId] = Object.assign(
      { linkedAt: new Date().toISOString() },
      meta || {}
    );
    return P.Profile.save(p);
  }

  function measurementSystem() {
    var P = platform();
    if (!P) return "imperial";
    var s = P.Settings.load();
    if (s.units && s.units.measurementSystem) return s.units.measurementSystem;
    var p = P.Profile.load();
    return (p.preferences && p.preferences.measurementSystem) || "imperial";
  }

  function applyTheme() {
    var P = platform();
    if (!P || typeof document === "undefined") return;
    var s = P.Settings.load();
    var mode = (s.theme && s.theme.mode) || "system";
    var root = document.documentElement;
    if (mode === "system") {
      delete root.dataset.wdsTheme;
    } else {
      root.dataset.wdsTheme = mode;
    }
    if (s.accessibility && s.accessibility.reduceMotion) {
      root.dataset.wdsReduceMotion = "true";
    } else {
      delete root.dataset.wdsReduceMotion;
    }
  }

  function mirrorSavantUnits() {
    // One-way soft mirror: if Savant has units and platform does not yet differ, skip overwrite
    try {
      var raw = localStorage.getItem("waypoint-savant-settings-v1");
      if (!raw) return;
      var savant = JSON.parse(raw);
      var P = platform();
      if (!P) return;
      var s = P.Settings.load();
      if (savant && savant.measurementSystem && s.units && !s.units._mirroredFrom) {
        s.units.measurementSystem = savant.measurementSystem;
        s.units._mirroredFrom = "savant";
        P.Settings.save(s);
      }
    } catch (e) { /* ignore */ }
  }

  global.WDS = global.WDS || {};
  global.WDS.platformIdentity = {
    version: "1.0.0",
    ensure: ensure,
    displayName: displayName,
    linkApp: linkApp,
    measurementSystem: measurementSystem,
    applyTheme: applyTheme,
    mirrorSavantUnits: mirrorSavantUnits
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        try {
          ensure();
          applyTheme();
        } catch (e) { /* ignore */ }
      });
    } else {
      try {
        ensure();
        applyTheme();
      } catch (e2) { /* ignore */ }
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
