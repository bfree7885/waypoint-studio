/**
 * Waypoint Dashboard — widget registry
 * Widgets register via WDS.dashboardWidgets.register() in wds-dashboard-catalog.js
 */
(function (global) {
  "use strict";

  var registry = {};

  function register(def) {
    if (!def || !def.id) return;
    registry[def.id] = def;
  }

  function get(id) {
    return registry[id] || null;
  }

  function all() {
    return Object.keys(registry).map(function (id) { return registry[id]; });
  }

  function defaultDefs() {
    return all().sort(function (a, b) {
      return (a.defaultOrder || 0) - (b.defaultOrder || 0);
    });
  }

  function byCategory(categoryId) {
    return defaultDefs().filter(function (d) { return d.category === categoryId; });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardWidgets = {
    register: register,
    get: get,
    all: all,
    defaultDefs: defaultDefs,
    byCategory: byCategory
  };
})(window);
