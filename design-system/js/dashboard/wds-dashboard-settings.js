/**
 * Dashboard settings v3 — local persistence (no login, no cloud).
 * Favorites, custom groups, widget order, section order, collapse state.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-widgets-v3";
  var LEGACY_V2 = "waypoint-dashboard-widgets-v2";
  var LEGACY_V1 = "waypoint-dashboard-widgets-v1";
  var VERSION = 3;

  function getRegistry() {
    return global.WDS && global.WDS.dashboardWidgets;
  }

  function getCategories() {
    return global.WDS && global.WDS.dashboardCategories;
  }

  function slugId(label) {
    return "group-" + String(label || "group").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) +
      "-" + Date.now().toString(36).slice(-4);
  }

  function defaultSettings() {
    var R = getRegistry();
    if (!R) {
      return { version: VERSION, widgets: {}, sectionOrder: [], favorites: [], customGroups: [], sectionCollapsed: {} };
    }
    var widgets = {};
    R.defaultDefs().forEach(function (def) {
      widgets[def.id] = {
        visible: def.defaultVisible !== false,
        order: def.defaultOrder || 0,
        collapsed: !!def.defaultCollapsed,
        group: null
      };
    });
    var C = getCategories();
    return {
      version: VERSION,
      widgets: widgets,
      sectionOrder: C ? C.defaultSectionOrder() : [],
      favorites: [],
      customGroups: [],
      sectionCollapsed: {}
    };
  }

  function mergeWidgetDefaults(base, parsed) {
    Object.keys(base.widgets).forEach(function (id) {
      if (parsed.widgets && parsed.widgets[id]) {
        base.widgets[id] = Object.assign({}, base.widgets[id], parsed.widgets[id]);
        if (base.widgets[id].group === undefined) base.widgets[id].group = null;
      }
    });
    return base;
  }

  function applyDashboardMigrations(base, parsed) {
    if (!parsed.widgets) return base;
    var hideIfNew = function (newId, legacyIds, order) {
      if (!parsed.widgets[newId]) {
        base.widgets[newId] = { visible: true, order: order, collapsed: false, group: null };
        legacyIds.forEach(function (wid) {
          if (base.widgets[wid] && parsed.widgets[wid] && parsed.widgets[wid].visible !== false) {
            base.widgets[wid] = Object.assign({}, base.widgets[wid], { visible: false });
          }
        });
      }
    };
    hideIfNew("outdoor-weather", ["current-weather", "hourly-forecast", "weekly-forecast", "wind", "uv-index"], 1);
    hideIfNew("sun-moon-dashboard", ["sunrise", "sunset", "golden-hour", "blue-hour", "moon-phase", "moonrise", "moonset"], 100);
    hideIfNew("photography-conditions-dashboard", ["sunrise-quality", "sunset-quality", "fog-potential", "cloud-cover", "milky-way", "aurora"], 700);
    hideIfNew("wildlife-dashboard", ["wildlife-activity", "bird-migration", "amphibian-activity", "insect-activity"], 200);
    hideIfNew("trail-dashboard", ["trail-conditions", "trail-closures", "park-alerts", "parking-updates"], 600);
    hideIfNew("water-dashboard", ["river-levels", "stream-flow", "water-temperature", "flood-status"], 500);
    hideIfNew("foraging-dashboard", ["mushroom-outlook", "berry-conditions", "seasonal-edibles", "recent-rainfall"], 300);
    hideIfNew("flora-dashboard", ["bloom-calendar", "tree-phenology", "wildflower-activity", "fall-color"], 400);
    hideIfNew("safety-dashboard", ["tick-activity", "mosquito-activity", "fire-danger", "heat-risk", "storm-risk", "uv-index", "air-quality"], 900);
    return base;
  }

  function loadRaw(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function load() {
    try {
      var parsed = loadRaw(STORAGE_KEY);
      if (!parsed) {
        parsed = loadRaw(LEGACY_V2) || loadRaw(LEGACY_V1);
        if (parsed && !parsed.favorites) {
          parsed.favorites = [];
          parsed.customGroups = [];
          parsed.sectionCollapsed = parsed.sectionCollapsed || {};
          Object.keys(parsed.widgets || {}).forEach(function (id) {
            if (parsed.widgets[id].group === undefined) parsed.widgets[id].group = null;
          });
        }
      }
      if (!parsed || !parsed.widgets) return defaultSettings();
      var base = defaultSettings();
      mergeWidgetDefaults(base, parsed);
      base.favorites = Array.isArray(parsed.favorites) ? parsed.favorites.slice() : [];
      base.customGroups = Array.isArray(parsed.customGroups) ? parsed.customGroups.slice() : [];
      base.sectionCollapsed = parsed.sectionCollapsed && typeof parsed.sectionCollapsed === "object"
        ? Object.assign({}, parsed.sectionCollapsed) : {};
      applyDashboardMigrations(base, parsed);
      if (parsed.sectionOrder && parsed.sectionOrder.length) {
        base.sectionOrder = parsed.sectionOrder.slice();
      }
      base.version = VERSION;
      return base;
    } catch (e) {
      return defaultSettings();
    }
  }

  function save(settings) {
    settings.version = VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    global.dispatchEvent(new CustomEvent("wds:dashboard-settings-change", { detail: settings }));
  }

  function reset() {
    var s = defaultSettings();
    save(s);
    return s;
  }

  function widgetOrder(settings, def) {
    var w = settings.widgets[def.id];
    return w && w.order != null ? w.order : def.defaultOrder;
  }

  function isVisible(settings, def) {
    var w = settings.widgets[def.id];
    return !w || w.visible !== false;
  }

  function sortDefs(defs, settings) {
    return defs.slice().sort(function (a, b) {
      return widgetOrder(settings, a) - widgetOrder(settings, b);
    });
  }

  function enabledWidgets(settings) {
    settings = settings || load();
    var R = getRegistry();
    if (!R) return [];
    return sortDefs(
      R.defaultDefs().filter(function (def) { return isVisible(settings, def); }),
      settings
    );
  }

  function widgetIdsInGroups(settings) {
    var ids = {};
    (settings.customGroups || []).forEach(function (g) {
      (g.widgetIds || []).forEach(function (id) { ids[id] = g.id; });
    });
    return ids;
  }

  function isFavorite(settings, id) {
    return (settings.favorites || []).indexOf(id) >= 0;
  }

  function favoriteWidgets(settings) {
    settings = settings || load();
    var R = getRegistry();
    if (!R) return [];
    var favSet = {};
    (settings.favorites || []).forEach(function (id) { favSet[id] = true; });
    return sortDefs(
      R.defaultDefs().filter(function (def) {
        return favSet[def.id] && isVisible(settings, def) &&
          def.tier !== "vital" && def.tier !== "anchor";
      }),
      settings
    );
  }

  function customGroupSections(settings) {
    settings = settings || load();
    var R = getRegistry();
    if (!R) return [];
    return (settings.customGroups || []).map(function (g) {
      var widgets = (g.widgetIds || [])
        .map(function (id) { return R.get(id); })
        .filter(function (def) {
          return def && isVisible(settings, def) && !isFavorite(settings, def.id) &&
            def.tier !== "vital" && def.tier !== "anchor";
        });
      return {
        id: g.id,
        label: g.label,
        isCustomGroup: true,
        widgets: sortDefs(widgets, settings)
      };
    }).filter(function (g) { return g.widgets.length; });
  }

  function excludedFromCategory(settings, def) {
    if (def.tier === "vital" || def.tier === "anchor") return false;
    if (isFavorite(settings, def.id)) return true;
    var grouped = widgetIdsInGroups(settings);
    if (grouped[def.id]) return true;
    if (settings.widgets[def.id] && settings.widgets[def.id].group) return true;
    return false;
  }

  function enabledWidgetsBySection(settings, subset) {
    settings = settings || load();
    var C = getCategories();
    var enabled = subset || enabledWidgets(settings);
    var order = (settings.sectionOrder && settings.sectionOrder.length)
      ? settings.sectionOrder
      : (C ? C.defaultSectionOrder() : []);
    var sections = C ? C.ordered(order) : [];
    return sections.map(function (cat) {
      return {
        id: cat.id,
        label: cat.label,
        widgets: sortDefs(
          enabled.filter(function (def) {
            return def.category === cat.id && !excludedFromCategory(settings, def);
          }),
          settings
        )
      };
    });
  }

  function setWidgetVisible(settings, id, visible) {
    if (!settings.widgets[id]) settings.widgets[id] = {};
    settings.widgets[id].visible = visible;
    return settings;
  }

  function toggleFavorite(settings, id) {
    settings.favorites = settings.favorites || [];
    var i = settings.favorites.indexOf(id);
    if (i >= 0) settings.favorites.splice(i, 1);
    else settings.favorites.push(id);
    return settings;
  }

  function createGroup(settings, label) {
    settings.customGroups = settings.customGroups || [];
    var g = { id: slugId(label), label: label || "My group", widgetIds: [] };
    settings.customGroups.push(g);
    return g;
  }

  function deleteGroup(settings, groupId) {
    settings.customGroups = (settings.customGroups || []).filter(function (g) { return g.id !== groupId; });
    Object.keys(settings.widgets).forEach(function (id) {
      if (settings.widgets[id].group === groupId) settings.widgets[id].group = null;
    });
    return settings;
  }

  function assignWidgetGroup(settings, widgetId, groupId) {
    if (!settings.widgets[widgetId]) settings.widgets[widgetId] = {};
    settings.widgets[widgetId].group = groupId || null;
    settings.customGroups = settings.customGroups || [];
    settings.customGroups.forEach(function (g) {
      g.widgetIds = (g.widgetIds || []).filter(function (id) { return id !== widgetId; });
    });
    if (groupId) {
      var g = settings.customGroups.filter(function (x) { return x.id === groupId; })[0];
      if (g) {
        if (!g.widgetIds) g.widgetIds = [];
        if (g.widgetIds.indexOf(widgetId) < 0) g.widgetIds.push(widgetId);
      }
    }
    return settings;
  }

  function reorderIds(settings, ids, fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return settings;
    var list = ids.slice();
    var item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    list.forEach(function (id, i) {
      if (!settings.widgets[id]) settings.widgets[id] = {};
      settings.widgets[id].order = (i + 1) * 10;
    });
    return settings;
  }

  function reorderSectionOrder(settings, fromIndex, toIndex) {
    var order = (settings.sectionOrder || []).slice();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= order.length) return settings;
    var item = order.splice(fromIndex, 1)[0];
    order.splice(toIndex, 0, item);
    settings.sectionOrder = order;
    return settings;
  }

  function toggleSectionCollapsed(settings, sectionId) {
    settings.sectionCollapsed = settings.sectionCollapsed || {};
    settings.sectionCollapsed[sectionId] = !settings.sectionCollapsed[sectionId];
    return settings;
  }

  function visibleCount(settings) {
    return enabledWidgets(settings).length;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardSettings = {
    STORAGE_KEY: STORAGE_KEY,
    VERSION: VERSION,
    load: load,
    save: save,
    reset: reset,
    enabledWidgets: enabledWidgets,
    enabledWidgetsBySection: enabledWidgetsBySection,
    favoriteWidgets: favoriteWidgets,
    customGroupSections: customGroupSections,
    setWidgetVisible: setWidgetVisible,
    toggleFavorite: toggleFavorite,
    createGroup: createGroup,
    deleteGroup: deleteGroup,
    assignWidgetGroup: assignWidgetGroup,
    reorderIds: reorderIds,
    reorderSectionOrder: reorderSectionOrder,
    toggleSectionCollapsed: toggleSectionCollapsed,
    isFavorite: isFavorite,
    visibleCount: visibleCount,
    widgetOrder: widgetOrder
  };
})(window);
