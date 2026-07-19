/**
 * Waypoint Studio — Outdoor Intelligence Platform loader
 * Minimal script bundle for apps that need full user-coordinate OIP.
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

  [
    "platform/wds-platform-resilience.js",
    "platform/wds-platform-ui.js",
    "platform/wds-platform-stores.js",
    "platform/wds-platform-observations.js",
    "platform/wds-platform-places.js",
    "platform/wds-platform-search.js",
    "platform/wds-platform-notifications.js",
    "platform/wds-platform-graph.js",
    "platform/wds-platform-workflows.js",
    "platform/wds-platform-identity.js",
    "wds-us-states.js",
    "wds-geocode-service.js",
    "wds-ip-geolocation.js",
    "dashboard/wds-us-national-context.js",
    "wds-runtime-migration.js",
    "wds-location-context.js",
    "wds-platform-guard.js",
    "wds-render-audit.js",
    "wds-location.js",
    "wds-location-debug.js",
    "wds-research-integrity.js",
    "wds-provenance.js",
    "ethics/wds-outdoor-ethics.js",
    "weather/wds-weather-core.js",
    "weather/wds-daylight-utils.js",
    "weather/wds-weather-providers.js",
    "weather/wds-weather-service.js",
    "weather/wds-nws-alerts-service.js",
    "weather/wds-air-quality-service.js",
    "weather/wds-elevation-service.js",
    "water/wds-usgs-water-service.js",
    "weather/wds-outdoor-weather-intel.js",
    "weather/wds-sky-dashboard-intel.js",
    "weather/wds-photography-conditions.js",
    "regional-intelligence/wds-regional-intelligence-engine.js",
    "regional-intelligence/wds-regional-intelligence-core.js",
    "regional-intelligence/wds-regional-intelligence-sources.js",
    "outdoor-intelligence/wds-oip-model.js",
    "outdoor-intelligence/wds-oip-location.js",
    "outdoor-intelligence/wds-oip-sources.js",
    "outdoor-intelligence/wds-oip-adapters.js",
    "outdoor-intelligence/wds-oip-service.js",
    "outdoor-intelligence/wds-live-engine-feed.js",
    "outdoor-intelligence/wds-oie-core.js",
    "outdoor-intelligence/wds-oie-weather-rules.js",
    "outdoor-intelligence/wds-oie-photography-rules.js",
    "outdoor-intelligence/wds-oie-nature-rules.js",
    "outdoor-intelligence/wds-oie-missions.js",
    "outdoor-intelligence/wds-oie-engine.js",
    "regional-intelligence/wds-regional-intelligence-v2-core.js",
    "regional-intelligence/wds-regional-intelligence-service.js",
    "species/wds-wskb-core.js",
    "species/wds-wskb-render.js",
    "observations/wds-wos-core.js",
    "observations/wds-wos-extensions.js",
    "wds-app-boot.js"
  ].forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file + vq;
    s.async = false;
    if (window.WDS && window.WDS.build && window.WDS.build.trackScript) {
      window.WDS.build.trackScript(s);
    }
    document.head.appendChild(s);
  });
})();
