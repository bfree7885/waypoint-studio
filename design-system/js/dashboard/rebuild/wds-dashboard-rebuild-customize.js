/**
 * Dashboard Rebuild — customize / widget library (Phase 3).
 * Polished library: categories, badges, favorites, columns, restore defaults.
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

  function activeFilter(prefs, options) {
    if (options && options.libraryFilter) return String(options.libraryFilter);
    return "all";
  }

  function renderFilterTabs(prefs, filter) {
    var reg = Registry();
    var cats = (reg && reg.libraryCategories ? reg.libraryCategories() : []).slice();
    var tabs =
      '<button type="button" class="wdb-r-library__tab' +
      (filter === "all" ? " is-active" : "") +
      '" data-wdb-r-action="library-filter" data-filter="all" role="tab" aria-selected="' +
      (filter === "all" ? "true" : "false") +
      '">All</button>';
    cats.forEach(function (cat) {
      var on = filter === cat.id;
      tabs +=
        '<button type="button" class="wdb-r-library__tab' +
        (on ? " is-active" : "") +
        '" data-wdb-r-action="library-filter" data-filter="' +
        escapeHtml(cat.id) +
        '" role="tab" aria-selected="' +
        (on ? "true" : "false") +
        '">' +
        escapeHtml(cat.label) +
        "</button>";
    });
    return (
      '<div class="wdb-r-library__tabs" role="tablist" aria-label="Widget library categories">' +
      tabs +
      "</div>"
    );
  }

  function renderCatalogItem(w, prefs) {
    var reg = Registry();
    var prefsApi = Prefs();
    var enabled = Object.create(null);
    (prefs.enabled || []).forEach(function (id) {
      enabled[id] = true;
    });
    var on = !!enabled[w.id];
    var fav = prefsApi && prefsApi.isFavorite ? prefsApi.isFavorite(w.id, prefs) : false;
    var avail = reg && reg.availability ? reg.availability(w) : { id: "coming-soon", label: "Coming Soon" };
    var icon =
      reg && reg.iconHtml
        ? reg.iconHtml(w)
        : '<span class="wdb-r-catalog__icon-fallback" aria-hidden="true">' +
          escapeHtml(String(w.title || "?").charAt(0)) +
          "</span>";
    var libLabel = "";
    var cats = reg && reg.libraryCategories ? reg.libraryCategories() : [];
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === w.libraryCategory) {
        libLabel = cats[i].label;
        break;
      }
    }
    return (
      '<li class="wdb-r-catalog__item" data-widget-id="' +
      escapeHtml(w.id) +
      '" data-library-category="' +
      escapeHtml(w.libraryCategory || "") +
      '">' +
      '<div class="wdb-r-catalog__icon" aria-hidden="true">' +
      icon +
      "</div>" +
      '<div class="wdb-r-catalog__meta">' +
      '<div class="wdb-r-catalog__title-row">' +
      "<strong>" +
      escapeHtml(w.title) +
      "</strong>" +
      '<span class="wdb-r-badge wdb-r-badge--' +
      escapeHtml(avail.id) +
      '">' +
      escapeHtml(avail.label) +
      "</span>" +
      "</div>" +
      '<span class="wdb-r-catalog__cat">' +
      escapeHtml(libLabel || w.category || "") +
      "</span>" +
      "<p>" +
      escapeHtml(w.description || "") +
      "</p>" +
      "</div>" +
      '<div class="wdb-r-catalog__actions">' +
      '<button type="button" class="wdb-r-btn wdb-r-btn--quiet' +
      (fav ? " is-active" : "") +
      '" data-wdb-r-action="favorite" data-widget-id="' +
      escapeHtml(w.id) +
      '" aria-pressed="' +
      (fav ? "true" : "false") +
      '" aria-label="' +
      (fav ? "Unpin " : "Favorite ") +
      escapeHtml(w.title) +
      '">' +
      (fav ? "Favorited" : "Favorite") +
      "</button>" +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="' +
      (on ? "hide" : "show") +
      '" data-widget-id="' +
      escapeHtml(w.id) +
      '" aria-label="' +
      (on ? "Remove " : "Add ") +
      escapeHtml(w.title) +
      ' from workspace">' +
      (on ? "Remove" : "Add") +
      "</button>" +
      "</div>" +
      "</li>"
    );
  }

  function renderCatalog(prefs, options) {
    options = options || {};
    var reg = Registry();
    var prefsApi = Prefs();
    prefs = prefs || (prefsApi && prefsApi.load ? prefsApi.load() : { enabled: [], favorites: [] });
    var filter = activeFilter(prefs, options);
    var items =
      reg && reg.byLibraryCategory
        ? reg.byLibraryCategory(filter, prefs)
        : reg && reg.all
          ? reg.all()
          : [];
    var list =
      items.length > 0
        ? items.map(function (w) {
            return renderCatalogItem(w, prefs);
          }).join("")
        : '<li class="wdb-r-catalog__empty" role="status">No widgets in this category yet.</li>';

    return (
      '<section class="wdb-r-catalog wdb-r-library" data-wdb-r-catalog data-filter="' +
      escapeHtml(filter) +
      '" aria-labelledby="wdb-r-catalog-title">' +
      '<h2 id="wdb-r-catalog-title">Widget library</h2>' +
      '<p class="wdb-r-catalog__lede">Add, remove, and favorite instruments for your outdoor workspace. Available widgets settle with live data; others stay Coming Soon.</p>' +
      renderFilterTabs(prefs, filter) +
      '<ul class="wdb-r-catalog__list" role="list">' +
      list +
      "</ul>" +
      "</section>"
    );
  }

  function renderColumnPicker(prefs) {
    var cols = Number(prefs && prefs.gridColumns) || 3;
    var options = (Prefs() && Prefs().columnOptions) || [1, 2, 3];
    var buttons = options
      .map(function (n) {
        var on = cols === n;
        return (
          '<button type="button" class="wdb-r-btn wdb-r-btn--quiet' +
          (on ? " is-active" : "") +
          '" data-wdb-r-action="columns" data-columns="' +
          n +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '" aria-label="' +
          n +
          " column layout\">" +
          n +
          "</button>"
        );
      })
      .join("");
    return (
      '<div class="wdb-r-customize-bar__columns" role="group" aria-label="Workspace columns">' +
      '<span class="wdb-r-customize-bar__columns-label">Columns</span>' +
      buttons +
      "</div>"
    );
  }

  function renderInterests(prefs) {
    var prefsApi = Prefs();
    var catalog =
      prefsApi && prefsApi.interestCatalog
        ? prefsApi.interestCatalog()
        : [];
    var enabled = Object.create(null);
    var order = (prefs && prefs.interests) || (prefsApi && prefsApi.defaultInterests ? prefsApi.defaultInterests() : ["general"]);
    order.forEach(function (id) {
      enabled[id] = true;
    });
    var priorityPreview = order
      .map(function (id, i) {
        var label = (prefsApi && prefsApi.interestLabels && prefsApi.interestLabels[id]) || id;
        return escapeHtml(String(i + 1) + ". " + label);
      })
      .join(" · ");

    var rows = catalog
      .map(function (item) {
        var on = !!enabled[item.id];
        var rank = order.indexOf(item.id);
        var rankLabel = on ? String(rank + 1) : "—";
        return (
          '<li class="wdb-r-interests__item' +
          (on ? " is-on" : "") +
          '" data-interest-id="' +
          escapeHtml(item.id) +
          '">' +
          '<div class="wdb-r-interests__meta">' +
          '<span class="wdb-r-interests__rank" aria-hidden="true">' +
          escapeHtml(rankLabel) +
          "</span>" +
          "<strong>" +
          escapeHtml(item.label) +
          "</strong>" +
          "</div>" +
          '<div class="wdb-r-interests__actions">' +
          '<button type="button" class="wdb-r-btn wdb-r-btn--quiet" data-wdb-r-action="interest-toggle" data-interest-id="' +
          escapeHtml(item.id) +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '" aria-label="' +
          (on ? "Disable " : "Enable ") +
          escapeHtml(item.label) +
          '">' +
          (on ? "On" : "Off") +
          "</button>" +
          '<button type="button" class="wdb-r-btn wdb-r-btn--quiet" data-wdb-r-action="interest-up" data-interest-id="' +
          escapeHtml(item.id) +
          '" aria-label="Raise priority of ' +
          escapeHtml(item.label) +
          '"' +
          (on && rank > 0 ? "" : " disabled") +
          ">Up</button>" +
          '<button type="button" class="wdb-r-btn wdb-r-btn--quiet" data-wdb-r-action="interest-down" data-interest-id="' +
          escapeHtml(item.id) +
          '" aria-label="Lower priority of ' +
          escapeHtml(item.label) +
          '"' +
          (on && rank >= 0 && rank < order.length - 1 ? "" : " disabled") +
          ">Down</button>" +
          "</div>" +
          "</li>"
        );
      })
      .join("");

    return (
      '<section class="wdb-r-interests" data-wdb-r-interests aria-labelledby="wdb-r-interests-title">' +
      '<div class="wdb-r-interests__head">' +
      '<h2 id="wdb-r-interests-title">My interests</h2>' +
      '<button type="button" class="wdb-r-btn wdb-r-btn--quiet" data-wdb-r-action="interests-reset">Restore interest defaults</button>' +
      "</div>" +
      '<p class="wdb-r-interests__lede">Shape Today Outside emphasis — photo windows, wildlife cues, astronomy darkness, and more. Enable several and rank your priorities. Alerts and public safety stay first.</p>' +
      '<p class="wdb-r-interests__preview" role="status" aria-live="polite"><span class="wdb-r-interests__preview-label">Priority preview</span> ' +
      (priorityPreview || "General Outdoors") +
      "</p>" +
      '<ul class="wdb-r-interests__list" role="list">' +
      rows +
      "</ul>" +
      "</section>"
    );
  }

  function renderToolbar(prefs) {
    prefs = prefs || {};
    return (
      '<div class="wdb-r-customize-bar" data-wdb-r-customize-bar tabindex="-1">' +
      '<p class="wdb-r-customize-bar__label" id="wdb-r-customize-heading">Customize workspace</p>' +
      '<div class="wdb-r-customize-bar__actions" role="group" aria-label="Layout presets">' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="preset" data-preset="default">Default</button>' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="preset" data-preset="minimal">Minimal</button>' +
      '<button type="button" class="wdb-r-btn" data-wdb-r-action="reset">Restore defaults</button>' +
      "</div>" +
      renderColumnPicker(prefs) +
      '<p class="wdb-r-customize-bar__hint">Preset: ' +
      escapeHtml(prefs.preset || "default") +
      " · " +
      escapeHtml(String(prefs.gridColumns || 3)) +
      " columns · Favorites rise to the top · Changes save when you tap Save.</p>" +
      '<div class="wdb-r-customize-bar__commit" role="group" aria-label="Save or cancel customization">' +
      '<button type="button" class="wdb-r-btn wdb-r-btn--primary" data-wdb-r-action="save">Save</button>' +
      '<button type="button" class="wdb-r-btn wdb-r-btn--quiet" data-wdb-r-action="cancel">Cancel</button>' +
      "</div>" +
      "</div>"
    );
  }

  var libraryFilterState = "all";

  function render(options) {
    options = options || {};
    var prefsApi = Prefs();
    var prefs = options.prefs || (prefsApi && prefsApi.load ? prefsApi.load() : {});
    var filter = options.libraryFilter || libraryFilterState || "all";
    libraryFilterState = filter;
    var Workspace = global.WDS && global.WDS.dashboardRebuildWorkspace;
    var workspaceHtml =
      Workspace && Workspace.renderWorkspace
        ? Workspace.renderWorkspace({
            prefs: prefs,
            customize: true,
            platform: options.platform || null,
            animate: !!options.animate
          })
        : "";
    return (
      '<div class="wdb-r-customize" data-wdb-r-customize>' +
      renderToolbar(prefs) +
      renderInterests(prefs) +
      workspaceHtml +
      renderCatalog(prefs, { libraryFilter: filter }) +
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
    var interestId = el && el.getAttribute("data-interest-id");
    if (action === "show" && id) return prefsApi.setEnabled(id, true);
    if (action === "hide" && id) return prefsApi.setEnabled(id, false);
    if (action === "move-up" && id) return prefsApi.move(id, -1);
    if (action === "move-down" && id) return prefsApi.move(id, 1);
    if (action === "favorite" && id) return prefsApi.toggleFavorite(id);
    if (action === "columns") {
      var cols = el && el.getAttribute("data-columns");
      return prefsApi.setGridColumns(cols);
    }
    if (action === "library-filter") {
      libraryFilterState = (el && el.getAttribute("data-filter")) || "all";
      return prefsApi.load();
    }
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
    if (action === "interest-toggle" && interestId) {
      var cur = prefsApi.load();
      var on = (cur.interests || []).indexOf(interestId) >= 0;
      return prefsApi.setInterestEnabled(interestId, !on);
    }
    if (action === "interest-up" && interestId) return prefsApi.moveInterest(interestId, -1);
    if (action === "interest-down" && interestId) return prefsApi.moveInterest(interestId, 1);
    if (action === "interests-reset") return prefsApi.resetInterests();
    if (action === "save") {
      if (prefsApi.commitDraft) prefsApi.commitDraft();
      return { __navigate: "workspace", __commit: true };
    }
    if (action === "cancel") {
      if (prefsApi.discardDraft) prefsApi.discardDraft();
      return { __navigate: "workspace", __discard: true };
    }
    return null;
  }

  function focusEditor(root) {
    if (!root || typeof root.querySelector !== "function") return;
    var bar = root.querySelector("[data-wdb-r-customize-bar]");
    if (bar && typeof bar.focus === "function") {
      try {
        bar.focus({ preventScroll: true });
      } catch (e) {
        try {
          bar.focus();
        } catch (e2) {
          /* noop */
        }
      }
    }
  }

  function bind(root, onChange) {
    if (!root) return;
    if (!root.__wdbRCustomizeBound) {
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
        if (typeof onChange === "function") {
          onChange(next, {
            action: action,
            filter: libraryFilterState,
            navigate: next && next.__navigate ? next.__navigate : null
          });
        }
      });
      root.addEventListener("keydown", function (ev) {
        if (!ev || ev.key !== "Escape") return;
        if (!root.querySelector("[data-wdb-r-customize]")) return;
        ev.preventDefault();
        var next = handleAction("cancel", null);
        if (typeof onChange === "function") {
          onChange(next, {
            action: "cancel",
            filter: libraryFilterState,
            navigate: "workspace"
          });
        }
      });
    }
    if (typeof global.requestAnimationFrame === "function") {
      global.requestAnimationFrame(function () {
        focusEditor(root);
      });
    } else {
      focusEditor(root);
    }
  }

  function getLibraryFilter() {
    return libraryFilterState || "all";
  }

  function setLibraryFilter(filter) {
    libraryFilterState = filter || "all";
    return libraryFilterState;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildCustomize = {
    version: "3.2.0-rc3-s5",
    render: render,
    renderCatalog: renderCatalog,
    renderToolbar: renderToolbar,
    renderInterests: renderInterests,
    handleAction: handleAction,
    bind: bind,
    focusEditor: focusEditor,
    cycleSize: cycleSize,
    getLibraryFilter: getLibraryFilter,
    setLibraryFilter: setLibraryFilter
  };
})(typeof window !== "undefined" ? window : global);
