#!/usr/bin/env node
/**
 * Waypoint Studio — canonical Home / Dashboard loader
 *
 * Loads only modules required for Rebuild Home (shell, nav, location,
 * weather/OIP hydrate, customize, kiosk hash mode, deepeners).
 * Obsolete Dashboard generations (V1/V2/V3/Outdoor OS/Recovery) remain in
 * Git under design-system/js/dashboard/ but are NOT registered here.
 *
 * Used by: /index.html and /apps/dashboard/index.html
 */
(function () {
  "use strict";
  var base = document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/\/[^/]+$/, "/")
    : "design-system/js/";

  function versionQuery() {
    if (window.WDS && window.WDS.build && window.WDS.build.getVersionQuery) {
      return window.WDS.build.getVersionQuery();
    }
    var src = document.currentScript && document.currentScript.src;
    var match = src && src.match(/[?&]v=([^&]+)/);
    return match ? "?v=" + decodeURIComponent(match[1]) : "";
  }

  var vq = versionQuery();

  /** @type {string[]} Canonical Rebuild Home module list — keep in sync with automation/test-canonical-dashboard-loader.mjs */
  var HOME_MODULES = [
    "wds-core.js",
    "wds-research-integrity.js",
    "wds-provenance.js",
    "ethics/wds-outdoor-ethics.js",
    "wds-icons.js",
    "platform/wds-app-nav-config.js",
    "platform/wds-app-nav.js",
    "platform/wds-app-shell.js",
    "platform/wds-security-baseline.js",
    "platform/wds-platform-resilience.js",
    "platform/wds-platform-ui.js",
    "wds-us-states.js",
    "wds-geocode-service.js",
    "wds-ip-geolocation.js",
    "dashboard/wds-us-national-context.js",
    "wds-runtime-migration.js",
    "wds-location-context.js",
    "wds-platform-guard.js",
    "wds-location.js",
    "weather/wds-weather-core.js",
    "weather/wds-daylight-utils.js",
    "weather/wds-weather-providers.js",
    "weather/wds-weather-service.js",
    "weather/wds-nws-alerts-service.js",
    "weather/wds-air-quality-service.js",
    "weather/wds-elevation-service.js",
    "water/wds-usgs-water-service.js",
    "trails/wds-trail-conditions-service.js",
    "regional-intelligence/wds-regional-intelligence-engine.js",
    "regional-intelligence/wds-regional-intelligence-core.js",
    "regional-intelligence/wds-regional-intelligence-sources.js",
    "outdoor-intelligence/wds-oip-model.js",
    "outdoor-intelligence/wds-oip-location.js",
    "outdoor-intelligence/wds-oip-sources.js",
    "outdoor-intelligence/wds-oip-adapters.js",
    "outdoor-intelligence/wds-oip-service.js",
    "outdoor-intelligence/wds-live-engine-feed.js",
    "dashboard/wds-dashboard-reliability.js",
    "dashboard/rebuild/wds-dashboard-rebuild-data.js",
    "dashboard/rebuild/wds-dashboard-rebuild-registry.js",
    "dashboard/rebuild/wds-dashboard-rebuild-prefs.js",
    "dashboard/rebuild/wds-dashboard-rebuild-today.js",
    "dashboard/rebuild/wds-dashboard-rebuild-workspace.js",
    "dashboard/rebuild/wds-dashboard-rebuild-customize.js",
    "dashboard/rebuild/wds-dashboard-rebuild-kiosk.js",
    "dashboard/rebuild/wds-dashboard-rebuild-deepeners.js",
    "dashboard/rebuild/wds-dashboard-rebuild.js",
    "platform/wds-take.js"
  ];

  // Expose for tests / measurement without executing loaders twice.
  window.WDS = window.WDS || {};
  window.WDS.homeLoader = {
    version: "1.0.0-canonical-rebuild",
    modules: HOME_MODULES.slice()
  };

  HOME_MODULES.forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file + vq;
    s.async = false;
    if (window.WDS && window.WDS.build && window.WDS.build.trackScript) {
      window.WDS.build.trackScript(s);
    }
    document.head.appendChild(s);
  });
})();
