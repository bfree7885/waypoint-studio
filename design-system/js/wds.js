/**
 * Waypoint Studio Design System — JS bundle loader
 * Loads core modules in order. For products without a bundler.
 */
(function () {
  "use strict";
  var base = document.currentScript && document.currentScript.src
    ? document.currentScript.src.replace(/\/[^/]+$/, "/")
    : "design-system/js/";

  ["wds-core.js", "wds-research-integrity.js", "wds-provenance.js", "ethics/wds-outdoor-ethics.js", "wds-icons.js", "wds-tabs.js", "wds-upload.js", "wds-search.js", "wds-gallery.js", "species/wds-wskb-core.js", "species/wds-wskb-render.js", "wds-species.js", "wds-nav.js", "wds-education.js", "wds-education-factory.js", "wds-education-topic.js", "wds-location.js", "wds-map-view.js", "wds-species-spotlight.js", "weather/wds-weather-core.js", "weather/wds-daylight-utils.js", "weather/wds-outdoor-weather-intel.js", "weather/wds-sky-dashboard-intel.js", "weather/wds-weather-providers.js", "weather/wds-weather-service.js", "wds-weather-ui.js", "weather/wds-outdoor-weather-ui.js", "weather/wds-sky-dashboard-ui.js", "wildlife/wds-wildlife-dashboard-intel.js", "wildlife/wds-wildlife-dashboard-ui.js", "trails/wds-trail-dashboard-intel.js", "trails/wds-trail-dashboard-ui.js", "water/wds-water-dashboard-intel.js", "water/wds-water-dashboard-ui.js", "flora/wds-flora-dashboard-intel.js", "flora/wds-foraging-dashboard-intel.js", "flora/wds-flora-dashboard-ui.js", "flora/wds-foraging-dashboard-ui.js", "regional-intelligence/wds-regional-intelligence-engine.js", "regional-intelligence/wds-regional-intelligence-core.js", "regional-intelligence/wds-regional-intelligence-sources.js", "outdoor-intelligence/wds-oip-model.js", "outdoor-intelligence/wds-oip-location.js", "outdoor-intelligence/wds-oip-sources.js", "outdoor-intelligence/wds-oip-adapters.js", "outdoor-intelligence/wds-oip-service.js", "regional-intelligence/wds-regional-intelligence-v2-core.js", "regional-intelligence/wds-regional-intelligence-service.js", "observations/wds-wos-core.js", "wds-happening-now.js", "wds-dashboard.js", "dashboard/wds-dashboard-categories.js", "dashboard/wds-dashboard-widget-data.js", "dashboard/wds-dashboard-widgets.js", "dashboard/wds-dashboard-highlights.js", "dashboard/wds-dashboard-catalog.js", "dashboard/wds-dashboard-settings.js", "dashboard/wds-dashboard-engine.js", "wds-content-engine.js", "wds-ecosystem.js"].forEach(function (file) {
    var s = document.createElement("script");
    s.src = base + file;
    s.defer = true;
    document.head.appendChild(s);
  });
})();
