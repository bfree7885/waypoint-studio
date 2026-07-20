/**
 * Dashboard V3 — category architecture registry.
 * Supports Photography, Weather, Hiking, Rivers, Air Quality, Astronomy,
 * Wildlife, Travel, Emergency, Favorites. Not every category needs widgets yet.
 */
(function (global) {
  "use strict";

  var CATEGORIES = [
    { id: "photography", label: "Photography", order: 10, icon: "camera", description: "Light, windows, and field photo readiness." },
    { id: "weather", label: "Weather", order: 20, icon: "cloud", description: "Conditions, forecast, wind, and precip." },
    { id: "hiking", label: "Hiking", order: 30, icon: "trail", description: "Trail comfort, daylight, and exposure." },
    { id: "rivers", label: "Rivers", order: 40, icon: "water", description: "Gauges, stage, flow, and flood context." },
    { id: "air", label: "Air Quality", order: 50, icon: "air", description: "AQI, UV, and environmental air cues." },
    { id: "astronomy", label: "Astronomy", order: 60, icon: "moon", description: "Sun, moon, twilight, and night sky." },
    { id: "wildlife", label: "Wildlife", order: 70, icon: "leaf", description: "Seasonal wildlife and migration cues." },
    { id: "travel", label: "Travel", order: 80, icon: "map", description: "Trip planning and regional travel context." },
    { id: "emergency", label: "Emergency", order: 90, icon: "alert", description: "Alerts, hazards, and safety cautions." },
    { id: "favorites", label: "Favorites", order: 100, icon: "star", description: "Pinned widgets and saved preferences." }
  ];

  /** Map legacy V2 category ids → V3 ids */
  var LEGACY_MAP = {
    alerts: "emergency",
    seasonal: "wildlife",
    "air-quality": "air"
  };

  function normalizeId(id) {
    if (!id) return null;
    if (LEGACY_MAP[id]) return LEGACY_MAP[id];
    return id;
  }

  function byId(id) {
    var nid = normalizeId(id);
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === nid || CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function all() {
    return CATEGORIES.slice().sort(function (a, b) {
      return a.order - b.order;
    });
  }

  function ids() {
    return all().map(function (c) {
      return c.id;
    });
  }

  function register(category) {
    if (!category || !category.id) return false;
    var existing = byId(category.id);
    if (existing) {
      Object.assign(existing, category);
      return true;
    }
    CATEGORIES.push({
      id: category.id,
      label: category.label || category.id,
      order: category.order != null ? category.order : 500,
      icon: category.icon || "dot",
      description: category.description || ""
    });
    return true;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Categories = {
    VERSION: "3.0.0",
    CATEGORIES: CATEGORIES,
    LEGACY_MAP: LEGACY_MAP,
    normalizeId: normalizeId,
    byId: byId,
    all: all,
    ids: ids,
    register: register
  };
})(window);
