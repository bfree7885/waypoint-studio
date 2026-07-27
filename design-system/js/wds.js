/**
 * Waypoint Studio Design System — JS bundle loader
 * Loads core modules in order. For products without a bundler.
 *
 * Home /apps/dashboard use design-system/js/wds-home.js (canonical Rebuild).
 * This loader no longer registers obsolete Dashboard V1/V2/V3/Outdoor OS/Recovery.
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

  // async=false preserves load/execution order for dynamically inserted scripts.
  // Without it, browsers treat appended scripts as unordered and OIP/weather APIs
  // can miss first-load hydration.
  // Intentionally omits: Dashboard V1 widgets, V2, V3, Outdoor OS, Recovery,
  // happening-now, dashboard-engine, content-engine, rebuild (see wds-home.js).
  [
    "wds-core.js",
    "wds-research-integrity.js",
    "wds-provenance.js",
    "ethics/wds-outdoor-ethics.js",
    "wds-icons.js",
    "wds-tabs.js",
    "wds-upload.js",
    "wds-search.js",
    "wds-gallery.js",
    "species/wds-wskb-core.js",
    "species/wds-wskb-render.js",
    "wds-species.js",
    "knowledge/wds-knowledge-core.js",
    "knowledge/wds-knowledge-search.js",
    "knowledge/wds-knowledge-relationships.js",
    "wds-nav.js",
    "platform/wds-platform-catalog.js",
    "platform/wds-platform-stores.js",
    "platform/wds-platform-observations.js",
    "platform/wds-platform-places.js",
    "platform/wds-platform-search.js",
    "platform/wds-platform-notifications.js",
    "platform/wds-platform-graph.js",
    "platform/wds-platform-workflows.js",
    "platform/wds-platform-identity.js",
    "platform/wds-platform-boot.js",
    "platform/wds-app-nav-config.js",
    "platform/wds-app-nav.js",
    "platform/wds-app-shell.js",
    "platform/wds-security-baseline.js",
    "platform/wds-platform-foundation.js",
    "platform/wds-platform-future-data.js",
    "platform/wds-platform-resilience.js",
    "platform/wds-platform-ui.js",
    "wds-education.js",
    "wds-education-factory.js",
    "wds-education-topic.js",
    "wds-us-states.js",
    "wds-geocode-service.js",
    "wds-ip-geolocation.js",
    "dashboard/wds-us-national-context.js",
    "dashboard/wds-integrations-registry.js",
    "wds-runtime-migration.js",
    "wds-location-context.js",
    "wds-platform-guard.js",
    "wds-render-audit.js",
    "wds-location.js",
    "wds-location-debug.js",
    "wds-map-view.js",
    "wds-species-spotlight.js",
    "weather/wds-weather-core.js",
    "weather/wds-daylight-utils.js",
    "weather/wds-outdoor-weather-intel.js",
    "weather/wds-sky-dashboard-intel.js",
    "weather/wds-photography-conditions.js",
    "weather/wds-weather-providers.js",
    "weather/wds-weather-service.js",
    "weather/wds-nws-alerts-service.js",
    "weather/wds-air-quality-service.js",
    "weather/wds-elevation-service.js",
    "water/wds-usgs-water-service.js",
    "trails/wds-trail-conditions-service.js",
    "wds-weather-ui.js",
    "weather/wds-outdoor-weather-ui.js",
    "weather/wds-sky-dashboard-ui.js",
    "wildlife/wds-wildlife-dashboard-intel.js",
    "wildlife/wds-wildlife-dashboard-ui.js",
    "trails/wds-trail-conditions-intel.js",
    "trails/wds-trail-dashboard-intel.js",
    "trails/wds-trail-dashboard-ui.js",
    "water/wds-water-dashboard-intel.js",
    "water/wds-water-dashboard-ui.js",
    "flora/wds-flora-dashboard-intel.js",
    "flora/wds-foraging-dashboard-intel.js",
    "flora/wds-flora-dashboard-ui.js",
    "flora/wds-foraging-dashboard-ui.js",
    "safety/wds-safety-dashboard-intel.js",
    "safety/wds-safety-dashboard-ui.js",
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
    "outdoor-intelligence/wds-oie-brief-registry.js",
    "outdoor-intelligence/wds-oie-brief-plugins.js",
    "outdoor-intelligence/wds-oie-brief-engine.js",
    "regional-intelligence/wds-regional-intelligence-v2-core.js",
    "regional-intelligence/wds-regional-intelligence-service.js",
    "observations/wds-wos-core.js",
    "observations/wds-wos-extensions.js",
    "dashboard/wds-dashboard-reliability.js",
    "platform/wds-take.js",
    "wds-ecosystem.js"
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
