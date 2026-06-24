/**
 * Waypoint Studio — Outdoor Intelligence Platform loader
 * Minimal script bundle for apps that need OIP without the full design system.
 *
 * Loads: location → weather → regional intelligence engine → outdoor intelligence
 */
(function () {
  "use strict";
  var base = document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/\/[^/]+$/, "/")
    : "design-system/js/";

  [
    "wds-location.js",
    "wds-research-integrity.js",
    "wds-provenance.js",
    "ethics/wds-outdoor-ethics.js",
    "weather/wds-weather-core.js",
    "weather/wds-weather-providers.js",
    "weather/wds-weather-service.js",
    "regional-intelligence/wds-regional-intelligence-engine.js",
    "regional-intelligence/wds-regional-intelligence-core.js",
    "regional-intelligence/wds-regional-intelligence-sources.js",
    "outdoor-intelligence/wds-oip-model.js",
    "outdoor-intelligence/wds-oip-location.js",
    "outdoor-intelligence/wds-oip-sources.js",
    "outdoor-intelligence/wds-oip-adapters.js",
    "outdoor-intelligence/wds-oip-service.js",
    "regional-intelligence/wds-regional-intelligence-v2-core.js",
    "regional-intelligence/wds-regional-intelligence-service.js",
    "observations/wds-wos-core.js"
  ].forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file;
    s.defer = true;
    document.head.appendChild(s);
  });
})();
