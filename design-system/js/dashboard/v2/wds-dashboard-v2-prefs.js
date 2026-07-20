/**
 * Dashboard V2 — widget layout preferences (localStorage, no account).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-v2-widgets-v1";
  var LEGACY_PREFS_KEY = "waypoint-dashboard-v2-prefs-v1";

  var DEFAULT_ACTIVITIES = [
    "walk",
    "hike",
    "photography",
    "wildlife",
    "birding",
    "gardening",
    "stargazing"
  ];

  function Cat() {
    return global.WDS && global.WDS.dashboardV2Widgets;
  }

  function defaults() {
    var cat = Cat();
    var enabled = cat && cat.defaultEnabledIds ? cat.defaultEnabledIds() : [];
    var order = cat && cat.all ? cat.all().map(function (w) {
      return w.id;
    }) : enabled.slice();
    return {
      version: 1,
      enabled: enabled.slice(),
      order: order,
      activities: DEFAULT_ACTIVITIES.slice(),
      tempComfortMinF: 50,
      tempComfortMaxF: 78,
      rainTolerance: "moderate",
      windToleranceMph: 20,
      airQualitySensitive: false,
      uvSensitive: false,
      units: "imperial",
      locationBehavior: "remember",
      briefingDetail: "standard",
      notifications: { enabled: false }
    };
  }

  function normalizeOrder(order, allIds) {
    var seen = {};
    var next = [];
    (order || []).forEach(function (id) {
      if (seen[id] || allIds.indexOf(id) < 0) return;
      seen[id] = true;
      next.push(id);
    });
    allIds.forEach(function (id) {
      if (!seen[id]) next.push(id);
    });
    return next;
  }

  function load() {
    var base = defaults();
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) {
          var allIds = Cat() && Cat().all ? Cat().all().map(function (w) {
            return w.id;
          }) : base.enabled;
          base.enabled = Array.isArray(parsed.enabled) ? parsed.enabled.filter(function (id) {
            return allIds.indexOf(id) >= 0;
          }) : base.enabled;
          base.order = normalizeOrder(parsed.order, allIds);
          return base;
        }
      }
    } catch (e) { /* noop */ }

    try {
      var legacy = global.localStorage && global.localStorage.getItem(LEGACY_PREFS_KEY);
      if (legacy) {
        var old = JSON.parse(legacy);
        if (old && Array.isArray(old.favoritePanels)) {
          var map = {
            weather: ["wx-current", "wx-hourly", "wx-severe"],
            "sun-moon": ["astro-sun", "astro-golden", "astro-moon-phase"],
            air: ["air-aqi"],
            uv: ["air-uv"],
            rivers: ["river-nearby"],
            alerts: ["wx-severe", "alert-nws"],
            photography: ["photo-conditions"]
          };
          var migrated = [];
          old.favoritePanels.forEach(function (p) {
            (map[p] || []).forEach(function (id) {
              if (migrated.indexOf(id) < 0) migrated.push(id);
            });
          });
          if (migrated.length) base.enabled = migrated;
        }
      }
    } catch (e2) { /* noop */ }

    return base;
  }

  function save(prefs) {
    var base = defaults();
    var next = Object.assign(base, prefs || {});
    var allIds = Cat() && Cat().all ? Cat().all().map(function (w) {
      return w.id;
    }) : next.enabled;
    next.enabled = (next.enabled || []).filter(function (id) {
      return allIds.indexOf(id) >= 0;
    });
    next.order = normalizeOrder(next.order, allIds);
    try {
      if (global.localStorage) {
        global.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: 1,
            enabled: next.enabled,
            order: next.order
          })
        );
      }
    } catch (e) { /* noop */ }
    try {
      global.dispatchEvent(new CustomEvent("wds:dashboard-v2-widgets-change", { detail: next }));
    } catch (e2) { /* noop */ }
    return next;
  }

  function reset() {
    try {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* noop */ }
    return save(defaults());
  }

  function selectedIds(prefs) {
    prefs = prefs || load();
    var enabled = {};
    (prefs.enabled || []).forEach(function (id) {
      enabled[id] = true;
    });
    return (prefs.order || []).filter(function (id) {
      return enabled[id];
    });
  }

  function enabledCount(prefs) {
    return (prefs && prefs.enabled ? prefs.enabled : []).length;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Prefs = {
    STORAGE_KEY: STORAGE_KEY,
    defaults: defaults,
    load: load,
    save: save,
    reset: reset,
    selectedIds: selectedIds,
    enabledCount: enabledCount
  };
})(window);
