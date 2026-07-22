/**
 * Dashboard Rebuild — customize mode (Phase 1 framework).
 * Add / remove / reorder / resize / presets / reset — no visual polish.
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

  function renderCatalog(prefs) {
    var reg = Registry();
    var prefsApi = Prefs();
    prefs = prefs || (prefsApi && prefsApi.load ? prefsApi.load() : { enabled: [] });
    var enabled = Object.create(null);
    (prefs.enabled || []).forEach(function (id) {
      enabled[id] = true;
    });
    var items = (reg && reg.all ? reg.all() : [])
      .map(function (w) {
        var on = !!enabled[w.id];
        return (
          '<li class="wdb-r-catalog__item" data-widget-id="' +
          escapeHtml(w.id) +
          '">' +
          '<div class="wdb-r-catalog__meta">' +
          "<strong>" +
          escapeHtml(w.title) +
          "</strong>" +
          '<span class="wdb-r-catalog__cat">' +
          escapeHtml(w.category) +
          "</span>" +
          "<p>" +
          escapeHtml(w.description || "") +
          "</p>" +
          "</div>" +
          '<button type="button" class="wdb-r-btn" data-wdb-r-action="' +
          (on ? "hide" : "show") +
          '" data-widget-id="' +
          escapeHtml(w.id) +
          '">' +
          (on ? "Remove" : "Add") +
          "</button>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="wdb-r-catalog" data-wdb-r-catalog aria-labelledby="wdb-r-catalog-title">' +
      '<h2 id="wdb-r-catalog-title">Widget catalog</h2>' +
      '<p class="wdb-r-catalog__lede">Choose what appears in your workspace. Widgets connect when providers are ready.</p>' +
      "<ul class=\"wdb-r-catalog__list\">" +
      items +
      "</ul>" +
      "</section>"
    );
  }

  function renderToolbar(prefs) {
    prefs = prefs || {};
    return (
      '<div class="wdb-r-customize-bar" data-wdb-r-customize-bar>' +
      '<p class="wdb-r-customize-bar__label">Customize workspace</p>' +
      '<div class="wdb-r-customize-bar__actions">' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="preset" data-preset="default">Default</button>' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="preset" data-preset="minimal">Minimal</button>' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="preset" data-preset="kiosk">Kiosk layout</button>' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="reset">Reset</button>' +
      '<a class="wdb-r-btn wdb-r-btn--link" href="#/">Done</a>' +
      "</div>" +
      '<p class="wdb-r-customize-bar__hint">Preset: ' +
      escapeHtml(prefs.preset || "default") +
      " · Saved on this device.</p>" +
      "</div>"
    );
  }

  function render(options) {
    options = options || {};
    var prefsApi = Prefs();
    var prefs = options.prefs || (prefsApi && prefsApi.load ? prefsApi.load() : {});
    var Workspace = global.WDS && global.WDS.dashboardRebuildWorkspace;
    var workspaceHtml =
      Workspace && Workspace.renderWorkspace
        ? Workspace.renderWorkspace({ prefs: prefs, customize: true })
        : "";
    return (
      '<div class="wdb-r-customize" data-wdb-r-customize>' +
      renderToolbar(prefs) +
      workspaceHtml +
      renderCatalog(prefs) +
      "</div>"
    );
  }

  function cycleSize(current) {
    var reg = Registry();
    var sizes = (reg && reg.sizes) || ["sm", "md", "lg", "anchor"];
    var i = sizes.indexOf(current);
    if (i < 0) return "md";
    return sizes[(i + 1) % sizes.length];
  }

  function handleAction(action, el) {
    var prefsApi = Prefs();
    if (!prefsApi) return null;
    var id = el && el.getAttribute("data-widget-id");
    if (action === "show" && id) return prefsApi.setEnabled(id, true);
    if (action === "hide" && id) return prefsApi.setEnabled(id, false);
    if (action === "move-up" && id) return prefsApi.move(id, -1);
    if (action === "move-down" && id) return prefsApi.move(id, 1);
    if (action === "size-cycle" && id) {
      var prefs = prefsApi.load();
      var next = cycleSize(prefs.sizes[id] || "md");
      return prefsApi.setSize(id, next);
    }
    if (action === "preset") {
      var preset = el && el.getAttribute("data-preset");
      return prefsApi.applyPreset(preset || "default");
    }
    if (action === "reset") return prefsApi.reset();
    return null;
  }

  function bind(root, onChange) {
    if (!root || root.__wdbRCustomizeBound) return;
    root.__wdbRCustomizeBound = true;
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var btn = t.closest("[data-wdb-r-action]");
      if (!btn || !root.contains(btn)) return;
      var action = btn.getAttribute("data-wdb-r-action");
      if (!action) return;
      if (btn.tagName === "A") return;
      ev.preventDefault();
      var next = handleAction(action, btn);
      if (typeof onChange === "function") onChange(next);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildCustomize = {
    version: "1.0.0-phase1",
    render: render,
    renderCatalog: renderCatalog,
    renderToolbar: renderToolbar,
    handleAction: handleAction,
    bind: bind,
    cycleSize: cycleSize
  };
})(typeof window !== "undefined" ? window : global);
