/**
 * Dashboard V3 — saved named layouts.
 * Presets: Daily Brief, Photography, Hiking, Storm Watching, Astronomy, Rivers.
 * Users can create additional layouts via API (UI may be minimal).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-v3-layouts-v1";
  var ACTIVE_KEY = "waypoint-dashboard-v3-active-layout";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  var PRESETS = [
    {
      id: "daily-brief",
      name: "Daily Brief",
      description: "Essentials for heading outside today.",
      builtin: true,
      enabled: [
        "wx-current",
        "wx-hourly",
        "wx-severe",
        "astro-sun",
        "hike-conditions",
        "air-aqi",
        "air-uv",
        "alert-nws"
      ],
      sizes: { "wx-current": "lg", "hike-conditions": "md", "alert-nws": "md" }
    },
    {
      id: "photography",
      name: "Photography",
      description: "Light windows and photo readiness.",
      builtin: true,
      enabled: [
        "photo-conditions",
        "photo-landscape",
        "astro-golden",
        "photo-light",
        "photo-clarity",
        "wx-current",
        "air-uv",
        "astro-sun"
      ],
      sizes: { "photo-conditions": "lg", "astro-golden": "md" }
    },
    {
      id: "hiking",
      name: "Hiking",
      description: "Trail comfort, daylight, and exposure.",
      builtin: true,
      enabled: [
        "hike-conditions",
        "hike-comfort",
        "hike-daylight",
        "hike-rain",
        "air-aqi",
        "air-uv",
        "wx-current",
        "alert-nws"
      ],
      sizes: { "hike-conditions": "lg", "hike-daylight": "sm" }
    },
    {
      id: "storm-watching",
      name: "Storm Watching",
      description: "Alerts, precip, and wind for unsettled weather.",
      builtin: true,
      enabled: [
        "wx-severe",
        "alert-storm",
        "alert-nws",
        "wx-hourly",
        "wx-precip",
        "wx-wind",
        "hike-rain"
      ],
      sizes: { "wx-severe": "lg", "alert-storm": "md", "wx-hourly": "md" }
    },
    {
      id: "astronomy",
      name: "Astronomy",
      description: "Sun, moon, and night-sky clarity.",
      builtin: true,
      enabled: [
        "astro-sun",
        "astro-moon-phase",
        "astro-golden",
        "astro-night-sky",
        "astro-cloud-stargaze",
        "air-visibility",
        "wx-current"
      ],
      sizes: { "astro-night-sky": "lg", "astro-moon-phase": "md" }
    },
    {
      id: "rivers",
      name: "Rivers",
      description: "Gauges, stage, flow, and flood context.",
      builtin: true,
      enabled: [
        "river-nearby",
        "river-level",
        "river-trend",
        "river-flood",
        "river-rain",
        "wx-precip",
        "alert-flood"
      ],
      sizes: { "river-nearby": "lg", "river-level": "md" }
    }
  ];

  function slugify(name) {
    return String(name || "layout")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "layout";
  }

  function readStore() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, custom: [] };
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return { version: 1, custom: [] };
      return {
        version: 1,
        custom: Array.isArray(parsed.custom) ? parsed.custom : []
      };
    } catch (e) {
      return { version: 1, custom: [] };
    }
  }

  function writeStore(store) {
    try {
      if (global.localStorage) {
        global.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: 1, custom: store.custom || [] })
        );
      }
    } catch (e) { /* noop */ }
    try {
      global.dispatchEvent(new CustomEvent("wds:dashboard-v3-layouts-change", { detail: list() }));
    } catch (e2) { /* noop */ }
  }

  function normalizeLayout(layout) {
    layout = layout || {};
    var Cat = api("dashboardV2Widgets");
    var allIds = Cat && Cat.all ? Cat.all().map(function (w) { return w.id; }) : [];
    var enabled = (layout.enabled || []).filter(function (id) {
      return !allIds.length || allIds.indexOf(id) >= 0;
    });
    var order = Array.isArray(layout.order) && layout.order.length ? layout.order.slice() : enabled.slice();
    var seen = {};
    order = order.filter(function (id) {
      if (seen[id] || enabled.indexOf(id) < 0) return false;
      seen[id] = true;
      return true;
    });
    enabled.forEach(function (id) {
      if (!seen[id]) order.push(id);
    });
    var sizes = {};
    var src = layout.sizes || {};
    order.forEach(function (id) {
      var s = src[id];
      sizes[id] = ["sm", "md", "lg", "xl"].indexOf(s) >= 0 ? s : "md";
    });
    return {
      id: layout.id || slugify(layout.name),
      name: layout.name || "Custom layout",
      description: layout.description || "",
      builtin: !!layout.builtin,
      enabled: enabled,
      order: order,
      sizes: sizes,
      hidden: Array.isArray(layout.hidden) ? layout.hidden.slice() : [],
      densify: layout.densify || "comfortable",
      groupByCategory: layout.groupByCategory !== false
    };
  }

  function presets() {
    return PRESETS.map(function (p) {
      return normalizeLayout(p);
    });
  }

  function list() {
    var store = readStore();
    return presets().concat(
      (store.custom || []).map(function (c) {
        return normalizeLayout(Object.assign({}, c, { builtin: false }));
      })
    );
  }

  function get(id) {
    if (!id) return null;
    var all = list();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function getActiveId() {
    try {
      return (global.localStorage && global.localStorage.getItem(ACTIVE_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function setActiveId(id) {
    try {
      if (global.localStorage) {
        if (id) global.localStorage.setItem(ACTIVE_KEY, id);
        else global.localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (e) { /* noop */ }
  }

  /**
   * Apply a named layout to prefs + V3 layout engine.
   */
  function apply(id, opts) {
    opts = opts || {};
    var layout = typeof id === "string" ? get(id) : normalizeLayout(id);
    if (!layout) return null;
    var P = api("dashboardV2Prefs");
    var Layout = api("dashboardV3Layout");
    if (P && P.save) {
      var prefs = P.load ? P.load() : {};
      prefs.enabled = layout.enabled.slice();
      prefs.order = layout.order.slice();
      prefs.hidden = (layout.hidden || []).slice();
      P.save(prefs);
    }
    if (Layout && Layout.save) {
      Layout.save({
        version: 1,
        order: layout.order.slice(),
        sizes: Object.assign({}, layout.sizes),
        densify: layout.densify,
        groupByCategory: layout.groupByCategory
      });
    }
    if (layout.id) setActiveId(layout.id);
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-v3-layout-applied", { detail: layout })
      );
    } catch (e) { /* noop */ }
    if (opts.refresh !== false) {
      var V3 = api("dashboardV3");
      var V2 = api("dashboardV2");
      var root = opts.root || (global.document && global.document.querySelector("[data-wdb-v3], [data-wdb-v2]"));
      if (root) {
        if (V3 && V3.refresh) V3.refresh(root.closest ? root.closest("[data-wds-dashboard], body") || root : root);
        else if (V2 && V2.refresh) V2.refresh(root);
      }
    }
    return layout;
  }

  /**
   * Create or update a custom named layout from current prefs/layout state.
   */
  function save(nameOrLayout, maybeLayout) {
    var layout;
    if (typeof nameOrLayout === "string") {
      layout = normalizeLayout(
        Object.assign({}, maybeLayout || snapshotCurrent(), {
          name: nameOrLayout,
          id: (maybeLayout && maybeLayout.id) || slugify(nameOrLayout)
        })
      );
    } else {
      layout = normalizeLayout(nameOrLayout || snapshotCurrent());
    }
    layout.builtin = false;
    if (!layout.id) layout.id = slugify(layout.name);

    var store = readStore();
    var found = -1;
    for (var i = 0; i < store.custom.length; i++) {
      if (store.custom[i].id === layout.id) {
        found = i;
        break;
      }
    }
    var record = {
      id: layout.id,
      name: layout.name,
      description: layout.description,
      enabled: layout.enabled,
      order: layout.order,
      sizes: layout.sizes,
      hidden: layout.hidden,
      densify: layout.densify,
      groupByCategory: layout.groupByCategory
    };
    if (found >= 0) store.custom[found] = record;
    else store.custom.push(record);
    writeStore(store);
    setActiveId(layout.id);
    return get(layout.id);
  }

  /** Alias for save — create additional layouts later */
  function create(name, layout) {
    return save(name, layout);
  }

  function remove(id) {
    var store = readStore();
    var before = store.custom.length;
    store.custom = store.custom.filter(function (c) {
      return c.id !== id;
    });
    if (store.custom.length === before) return false;
    writeStore(store);
    if (getActiveId() === id) setActiveId(null);
    return true;
  }

  function snapshotCurrent() {
    var P = api("dashboardV2Prefs");
    var Layout = api("dashboardV3Layout");
    var prefs = P && P.load ? P.load() : { enabled: [], order: [], hidden: [] };
    var selected = P && P.selectedIds ? P.selectedIds(prefs) : prefs.enabled || [];
    var layout = Layout && Layout.load ? Layout.load(selected) : { order: selected, sizes: {} };
    return {
      name: "My layout",
      enabled: (prefs.enabled || []).slice(),
      order: (layout.order || selected).slice(),
      sizes: Object.assign({}, layout.sizes || {}),
      hidden: (prefs.hidden || []).slice(),
      densify: layout.densify || "comfortable",
      groupByCategory: layout.groupByCategory !== false
    };
  }

  function renderPicker(activeId) {
    activeId = activeId || getActiveId();
    var items = list();
    return (
      '<div class="wdb-v3-layouts" data-wdb-v3-layouts>' +
      '<label class="wdb-v3-layouts__label" for="wdb-v3-layout-select">Saved layout</label>' +
      '<div class="wdb-v3-layouts__row">' +
      '<select id="wdb-v3-layout-select" class="wdb-v3-layouts__select" data-wdb-v3-layout-select>' +
      '<option value="">— Current board —</option>' +
      items
        .map(function (L) {
          return (
            '<option value="' +
            L.id +
            '"' +
            (L.id === activeId ? " selected" : "") +
            ">" +
            L.name +
            (L.builtin ? "" : " (custom)") +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" data-wdb-v3-layout-apply>Apply</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-layout-save>Save as…</button>' +
      "</div>" +
      '<p class="wdb-v3-layouts__hint">Presets: Daily Brief, Photography, Hiking, Storm Watching, Astronomy, Rivers. Create more anytime.</p>' +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Layouts = {
    VERSION: "3.1.0",
    STORAGE_KEY: STORAGE_KEY,
    ACTIVE_KEY: ACTIVE_KEY,
    PRESETS: PRESETS,
    presets: presets,
    list: list,
    get: get,
    getActiveId: getActiveId,
    setActiveId: setActiveId,
    apply: apply,
    save: save,
    create: create,
    remove: remove,
    snapshotCurrent: snapshotCurrent,
    normalizeLayout: normalizeLayout,
    renderPicker: renderPicker
  };
})(window);
