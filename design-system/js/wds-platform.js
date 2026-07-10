/**
 * Waypoint Studio — Outdoor Intelligence Platform loader
 * Minimal script bundle for apps that need full user-coordinate OIP.
 */
(function () {
  "use strict";
  var base = document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/\/[^/]+$/, "/")
    : "design-system/js/";

  [
    "wds-us-states.js",
    "wds-geocode-service.js",
    "wds-ip-geolocation.js",
    "dashboard/wds-us-national-context.js",
    "wds-location-context.js",
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
    "wds-app-boot.js"
  ].forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file;
    s.defer = true;
    document.head.appendChild(s);
  });
})();
