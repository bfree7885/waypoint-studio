/**
 * Dashboard V2 — local-first preferences (no account).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-v2-prefs-v1";

  var DEFAULT_ACTIVITIES = [
    "walk",
    "hike",
    "photography",
    "wildlife",
    "birding",
    "gardening",
    "stargazing"
  ];

  var DEFAULT_PANELS = [
    "weather",
    "sun-moon",
    "air",
    "uv",
    "rivers",
    "alerts",
    "photography"
  ];

  function defaults() {
    return {
      version: 1,
      activities: DEFAULT_ACTIVITIES.slice(),
      tempComfortMinF: 50,
      tempComfortMaxF: 78,
      rainTolerance: "moderate",
      windToleranceMph: 20,
      airQualitySensitive: false,
      uvSensitive: false,
      favoritePanels: DEFAULT_PANELS.slice(),
      units: "imperial",
      locationBehavior: "remember",
      briefingDetail: "standard",
      notifications: { enabled: false }
    };
  }

  function load() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      return Object.assign(defaults(), parsed || {});
    } catch (e) {
      return defaults();
    }
  }

  function save(prefs) {
    var next = Object.assign(defaults(), prefs || {});
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e2) { /* noop */ }
    return next;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Prefs = {
    STORAGE_KEY: STORAGE_KEY,
    defaults: defaults,
    load: load,
    save: save
  };
})(window);
