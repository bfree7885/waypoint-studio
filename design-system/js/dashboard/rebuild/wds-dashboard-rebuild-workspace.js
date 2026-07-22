/**
 * Dashboard Rebuild — widget workspace layout framework (Phase 2).
 * Frames + registry render; live widgets hydrate from OIP independently.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  function Registry() {
    return global.WDS && global.WDS.dashboardRebuildRegistry;
  }

  function Prefs() {
    return global.WDS && global.WDS.dashboardRebuildPrefs;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderWidgetFrame(widget, prefs, options) {
    options = options || {};
    var reg = Registry();
    var size =
      (prefs && prefs.sizes && prefs.sizes[widget.id]) ||
      widget.size ||
      "md";
    if (reg && reg.normalizeSize) size = reg.normalizeSize(size);
    var data = reg && reg.getData
      ? reg.getData(widget.id, { platform: options.platform || null })
      : { trust: "waiting", message: "Data will appear here." };
    var body =
      reg && reg.render
        ? reg.render(widget, data)
        : reg && reg.renderPlaceholder
          ? reg.renderPlaceholder(widget, data)
          : '<p class="wdb-r-widget__status">Data will appear here.</p>';
    var customize = !!options.customize;
    var controls = "";
    if (customize) {
      controls =
        '<div class="wdb-r-widget__controls">' +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="move-up" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Move ' +
        escapeHtml(widget.title) +
        ' earlier">Earlier</button>' +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="move-down" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Move ' +
        escapeHtml(widget.title) +
        ' later">Later</button>' +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="size-cycle" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Change size for ' +
        escapeHtml(widget.title) +
        '">Size: ' +
        escapeHtml(size) +
        "</button>" +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="hide" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Hide ' +
        escapeHtml(widget.title) +
        '">Hide</button>' +
        "</div>";
    }
    return (
      '<article class="wdb-r-widget wdb-r-widget--' +
      escapeHtml(size) +
      '" data-widget-id="' +
      escapeHtml(widget.id) +
      '" data-category="' +
      escapeHtml(widget.category || "") +
      '" data-size="' +
      escapeHtml(size) +
      '">' +
      '<header class="wdb-r-widget__head">' +
      "<h3 class=\"wdb-r-widget__title\">" +
      escapeHtml(widget.title) +
      "</h3>" +
      '<p class="wdb-r-widget__cat">' +
      escapeHtml(widget.category || "") +
      "</p>" +
      "</header>" +
      body +
      controls +
      "</article>"
    );
  }

  function renderWorkspace(options) {
    options = options || {};
    var reg = Registry();
    var prefsApi = Prefs();
    var prefs = options.prefs || (prefsApi && prefsApi.load ? prefsApi.load() : null);
    var ids =
      options.ids ||
      (prefsApi && prefsApi.visibleOrdered ? prefsApi.visibleOrdered(prefs) : []);
    var customize = !!options.customize;
    var widgets = [];
    ids.forEach(function (id) {
      var w = reg && reg.get ? reg.get(id) : null;
      if (w) {
        widgets.push(
          renderWidgetFrame(w, prefs, {
            customize: customize,
            platform: options.platform || null
          })
        );
      }
    });
    var empty = "";
    if (!widgets.length) {
      empty =
        '<p class="wdb-r-workspace__empty" role="status">' +
        (customize
          ? "No widgets visible. Add one from the catalog below."
          : "Your workspace is empty. Open Customize to choose what you see.") +
        "</p>";
    }
    return (
      '<section class="wdb-r-workspace" data-wdb-r-workspace aria-labelledby="wdb-r-workspace-title"' +
      (customize ? ' data-customize="true"' : "") +
      ">" +
      '<header class="wdb-r-workspace__header">' +
      "<div>" +
      '<h2 id="wdb-r-workspace-title" class="wdb-r-workspace__title">Workspace</h2>' +
      '<p class="wdb-r-workspace__lede">Your outdoor instruments — facts first, each settling on its own.</p>' +
      "</div>" +
      "</header>" +
      '<div class="wdb-r-workspace__grid" data-wdb-r-grid>' +
      widgets.join("") +
      empty +
      "</div>" +
      "</section>"
    );
  }

  function mount(host, options) {
    if (!host) return null;
    host.innerHTML = renderWorkspace(options);
    return host.querySelector("[data-wdb-r-workspace]");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildWorkspace = {
    version: "2.0.0-phase2",
    renderWorkspace: renderWorkspace,
    renderWidgetFrame: renderWidgetFrame,
    mount: mount
  };
})(typeof window !== "undefined" ? window : global);
