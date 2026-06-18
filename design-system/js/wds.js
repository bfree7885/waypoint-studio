/**
 * Waypoint Studio Design System — JS bundle loader
 * Loads core modules in order. For products without a bundler.
 */
(function () {
  "use strict";
  var base = document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/\/[^/]+$/, "/")
    : "design-system/js/";

  ["wds-core.js", "wds-icons.js", "wds-tabs.js", "wds-upload.js", "wds-search.js", "wds-gallery.js", "wds-species.js", "wds-nav.js", "wds-education.js", "wds-education-factory.js", "wds-location.js", "wds-map-view.js", "wds-species-spotlight.js", "weather/wds-weather-core.js", "weather/wds-weather-providers.js", "weather/wds-weather-service.js", "wds-weather-ui.js", "regional-intelligence/wds-regional-intelligence-core.js", "regional-intelligence/wds-regional-intelligence-sources.js", "regional-intelligence/wds-regional-intelligence-service.js", "wds-content-engine.js", "wds-ecosystem.js"].forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file;
    s.defer = true;
    document.head.appendChild(s);
  });
})();
