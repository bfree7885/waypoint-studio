/**
 * Dashboard V3 — catalog bridge.
 * Patches the live V2 widget catalog to the V3 category architecture at runtime
 * so presentation stays coherent even if static catalog ids lag (alerts/seasonal).
 * Additive: travel + favorites stubs; remaps alerts→emergency, seasonal→wildlife.
 */
(function (global) {
  "use strict";

  var V3_CATEGORIES = [
    { id: "photography", label: "Photography", order: 10 },
    { id: "weather", label: "Weather", order: 20 },
    { id: "hiking", label: "Hiking", order: 30 },
    { id: "rivers", label: "Rivers", order: 40 },
    { id: "air", label: "Air Quality", order: 50 },
    { id: "astronomy", label: "Astronomy", order: 60 },
    { id: "wildlife", label: "Wildlife", order: 70 },
    { id: "travel", label: "Travel", order: 80 },
    { id: "emergency", label: "Emergency", order: 90 },
    { id: "favorites", label: "Favorites", order: 100 }
  ];

  var EXTRA_WIDGETS = [
    { id: "travel-weekend", category: "travel", name: "Weekend Outlook", description: "Weekend trip readiness from forecast cues.", availability: "derived", defaultEnabled: false, defaultOrder: 10, tab: "today" },
    { id: "travel-road", category: "travel", name: "Road / Access", description: "Road and access advisories — planned.", availability: "planned", defaultEnabled: false, defaultOrder: 20, tab: "today" },
    { id: "travel-parking", category: "travel", name: "Trailhead Parking", description: "Parking and access pressure — planned.", availability: "planned", defaultEnabled: false, defaultOrder: 30, tab: "today" },
    { id: "fav-pinned", category: "favorites", name: "Pinned Summary", description: "Quick view of your enabled essentials.", availability: "derived", defaultEnabled: false, defaultOrder: 10, tab: "today", size: "lg" },
    { id: "fav-saved-place", category: "favorites", name: "Saved Place", description: "Remembered place context — planned for accounts later.", availability: "planned", defaultEnabled: false, defaultOrder: 20, tab: "today" }
  ];

  var CATEGORY_REMAP = {
    alerts: "emergency",
    seasonal: "wildlife",
    "air-quality": "air"
  };

  function apply() {
    var Cat = global.WDS && global.WDS.dashboardV2Widgets;
    if (!Cat || !Cat.CATEGORIES || !Cat.WIDGETS) {
      return { ok: false, reason: "catalog-missing" };
    }
    if (Cat._v3Patched) return { ok: true, already: true };

    /* Replace category registry with V3 taxonomy */
    Cat.CATEGORIES.length = 0;
    V3_CATEGORIES.forEach(function (c) {
      Cat.CATEGORIES.push(Object.assign({}, c));
    });

    /* Remap widget category ids */
    Cat.WIDGETS.forEach(function (w) {
      if (CATEGORY_REMAP[w.category]) w.category = CATEGORY_REMAP[w.category];
    });

    /* Add architecture stubs if absent */
    EXTRA_WIDGETS.forEach(function (extra) {
      var exists = false;
      for (var i = 0; i < Cat.WIDGETS.length; i++) {
        if (Cat.WIDGETS[i].id === extra.id) {
          exists = true;
          break;
        }
      }
      if (!exists) Cat.WIDGETS.push(Object.assign({}, extra));
    });

    Cat._v3Patched = true;
    return { ok: true, categories: Cat.CATEGORIES.length, widgets: Cat.WIDGETS.length };
  }

  /* Auto-apply when catalog already loaded; otherwise expose for boot */
  var result = apply();

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Catalog = {
    VERSION: "3.0.0",
    V3_CATEGORIES: V3_CATEGORIES,
    EXTRA_WIDGETS: EXTRA_WIDGETS,
    CATEGORY_REMAP: CATEGORY_REMAP,
    apply: apply,
    lastResult: result
  };
})(window);
