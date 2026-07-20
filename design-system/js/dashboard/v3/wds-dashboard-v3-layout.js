/**
 * Dashboard V3 — layout engine.
 * Responsive grid, ordering, variable sizes, and hooks for future
 * drag-and-drop / saved layouts (DnD not fully implemented this sprint).
 */
(function (global) {
  "use strict";

  var LAYOUT_KEY = "waypoint-dashboard-v3-layout-v1";
  var SIZES = ["sm", "md", "lg", "xl"];

  function defaultLayout(widgetIds) {
    return {
      version: 1,
      order: (widgetIds || []).slice(),
      sizes: {},
      densify: "comfortable",
      groupByCategory: true
    };
  }

  function load(widgetIds) {
    var base = defaultLayout(widgetIds);
    try {
      var raw = global.localStorage && global.localStorage.getItem(LAYOUT_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return base;
      if (Array.isArray(parsed.order)) base.order = parsed.order.slice();
      if (parsed.sizes && typeof parsed.sizes === "object") base.sizes = parsed.sizes;
      if (parsed.densify) base.densify = parsed.densify;
      if (typeof parsed.groupByCategory === "boolean") base.groupByCategory = parsed.groupByCategory;
    } catch (e) { /* noop */ }
    return normalize(base, widgetIds);
  }

  function normalize(layout, widgetIds) {
    layout = layout || defaultLayout(widgetIds);
    var ids = widgetIds || layout.order || [];
    var seen = {};
    var order = [];
    (layout.order || []).forEach(function (id) {
      if (seen[id] || ids.indexOf(id) < 0) return;
      seen[id] = true;
      order.push(id);
    });
    ids.forEach(function (id) {
      if (!seen[id]) order.push(id);
    });
    layout.order = order;
    var sizes = {};
    order.forEach(function (id) {
      var s = layout.sizes && layout.sizes[id];
      sizes[id] = SIZES.indexOf(s) >= 0 ? s : "md";
    });
    layout.sizes = sizes;
    return layout;
  }

  function save(layout) {
    var next = normalize(layout);
    try {
      if (global.localStorage) {
        global.localStorage.setItem(
          LAYOUT_KEY,
          JSON.stringify({
            version: 1,
            order: next.order,
            sizes: next.sizes,
            densify: next.densify,
            groupByCategory: next.groupByCategory
          })
        );
      }
    } catch (e) { /* noop */ }
    try {
      global.dispatchEvent(new CustomEvent("wds:dashboard-v3-layout-change", { detail: next }));
    } catch (e2) { /* noop */ }
    return next;
  }

  function reset(widgetIds) {
    try {
      if (global.localStorage) global.localStorage.removeItem(LAYOUT_KEY);
    } catch (e) { /* noop */ }
    return save(defaultLayout(widgetIds));
  }

  function sizeFor(layout, widgetId, widgetMeta) {
    if (layout && layout.sizes && layout.sizes[widgetId]) return layout.sizes[widgetId];
    if (widgetMeta && widgetMeta.size) return widgetMeta.size;
    if (widgetMeta && widgetMeta.defaultSize) return widgetMeta.defaultSize;
    return "md";
  }

  function orderedIds(layout, selectedIds) {
    return normalize(layout, selectedIds).order.filter(function (id) {
      return selectedIds.indexOf(id) >= 0;
    });
  }

  /**
   * Future DnD hook — registers drop targets without implementing full drag UI.
   * Sprint 2+ can bind pointer handlers to [data-layout-item].
   */
  function registerDnDHooks(root, handlers) {
    if (!root) return function () {};
    handlers = handlers || {};
    root.setAttribute("data-wdb-v3-dnd-ready", "1");
    root.setAttribute("data-wdb-v3-dnd-enabled", "0");
    if (handlers.onReady) handlers.onReady(root);
    return function unregister() {
      try {
        root.removeAttribute("data-wdb-v3-dnd-ready");
        root.removeAttribute("data-wdb-v3-dnd-enabled");
      } catch (e) { /* noop */ }
    };
  }

  /**
   * Wrap widget HTML into a responsive layout grid.
   */
  function renderGrid(itemsHtml, opts) {
    opts = opts || {};
    var densify = opts.densify || "comfortable";
    return (
      '<div class="wdb-v3-layout" data-wdb-v3-layout data-densify="' +
      densify +
      '" data-dnd-hooks="ready">' +
      '<div class="wdb-v3-layout__grid" role="list">' +
      (itemsHtml || "") +
      "</div></div>"
    );
  }

  function wrapItem(html, id, size) {
    return (
      '<div class="wdb-v3-layout__item wdb-v3-layout__item--' +
      (size || "md") +
      '" role="listitem" data-layout-item="' +
      id +
      '" data-size="' +
      (size || "md") +
      '">' +
      html +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Layout = {
    VERSION: "3.0.0",
    LAYOUT_KEY: LAYOUT_KEY,
    SIZES: SIZES,
    defaultLayout: defaultLayout,
    load: load,
    save: save,
    reset: reset,
    normalize: normalize,
    sizeFor: sizeFor,
    orderedIds: orderedIds,
    registerDnDHooks: registerDnDHooks,
    renderGrid: renderGrid,
    wrapItem: wrapItem
  };
})(window);
