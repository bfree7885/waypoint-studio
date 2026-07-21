/**
 * Dashboard V3 — customize panel: Widget Library, board controls, saved layouts.
 * Add / remove / hide / restore / reorder / resize. DnD architecture ready via layout hooks.
 */
(function (global) {
  "use strict";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function esc(s) {
    var M = api("dashboardV2Model");
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function Prefs() {
    return api("dashboardV2Prefs");
  }

  function sizeSelect(widgetId, current) {
    var Layout = api("dashboardV3Layout");
    var sizes = (Layout && Layout.DISPLAY_SIZES) || ["sm", "md", "lg"];
    var labels = (Layout && Layout.SIZE_LABELS) || { sm: "Small", md: "Medium", lg: "Large" };
    return (
      '<label class="wdb-v3-custom__size">' +
      '<span class="wdb-v3-custom__size-label">Size</span>' +
      '<select data-wdb-v3-size="' +
      esc(widgetId) +
      '" aria-label="Resize widget">' +
      sizes
        .map(function (s) {
          return (
            '<option value="' +
            s +
            '"' +
            (s === current ? " selected" : "") +
            ">" +
            esc(labels[s] || s) +
            "</option>"
          );
        })
        .join("") +
      "</select></label>"
    );
  }

  function renderBoardRow(widget, prefs, layout, model) {
    var Cat = api("dashboardV2Widgets");
    var state = Cat && Cat.resolveAvailability ? Cat.resolveAvailability(widget, model) : widget.availability;
    var label = Cat && Cat.availabilityLabel ? Cat.availabilityLabel(state) : state;
    var hidden = (prefs.hidden || []).indexOf(widget.id) >= 0;
    var size =
      layout && layout.sizes && layout.sizes[widget.id]
        ? layout.sizes[widget.id]
        : widget.size || "md";
    if (size === "xl") size = "lg";

    return (
      '<li class="wdb-v3-custom__row wdb-v2-custom__row' +
      (hidden ? " is-hidden-widget" : "") +
      '" draggable="true" data-v2-widget-id="' +
      esc(widget.id) +
      '" data-wdb-v3-board-widget="' +
      esc(widget.id) +
      '">' +
      '<span class="wdb-v2-custom__drag" aria-hidden="true" title="Drag to reorder">⋮⋮</span>' +
      '<div class="wdb-v2-custom__meta">' +
      '<span class="wdb-v2-custom__name">' +
      esc(widget.name) +
      (hidden ? " (hidden)" : "") +
      "</span>" +
      '<span class="wdb-v2-custom__desc">' +
      esc(widget.description) +
      "</span>" +
      '<span class="wdb-v2-custom__avail wdb-v2-custom__avail--' +
      esc(state) +
      '">' +
      esc(label) +
      "</span>" +
      "</div>" +
      sizeSelect(widget.id, size) +
      '<div class="wdb-v2-custom__move" role="group" aria-label="Reorder ' +
      esc(widget.name) +
      '">' +
      '<button type="button" class="wdb-v2-custom__move-btn" data-v2-move="up" data-wdb-v3-move="up" aria-label="Move ' +
      esc(widget.name) +
      ' up">↑</button>' +
      '<button type="button" class="wdb-v2-custom__move-btn" data-v2-move="down" data-wdb-v3-move="down" aria-label="Move ' +
      esc(widget.name) +
      ' down">↓</button>' +
      "</div>" +
      '<div class="wdb-v3-custom__row-actions">' +
      (hidden
        ? '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" data-wdb-v3-restore="' +
          esc(widget.id) +
          '">Restore</button>'
        : '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-hide="' +
          esc(widget.id) +
          '">Hide</button>') +
      '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-remove="' +
      esc(widget.id) +
      '">Remove</button>' +
      "</div></li>"
    );
  }

  function renderBoardSection(prefs, model) {
    var Cat = api("dashboardV2Widgets");
    var Layout = api("dashboardV3Layout");
    var P = Prefs();
    prefs = prefs || (P && P.load ? P.load() : { enabled: [], order: [], hidden: [] });
    var enabled = prefs.enabled || [];
    var order = prefs.order || [];
    var layout = Layout && Layout.load ? Layout.load(enabled) : { sizes: {} };

    var widgets = enabled
      .slice()
      .sort(function (a, b) {
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(function (id) {
        return Cat && Cat.byId ? Cat.byId(id) : null;
      })
      .filter(Boolean);

    var hiddenCount = (prefs.hidden || []).length;

    return (
      '<section class="wdb-v3-custom__board" data-wdb-v3-custom-board>' +
      '<div class="wdb-v3-custom__board-head">' +
      "<h3>Your board</h3>" +
      '<p><span data-v2-selected-count data-wdb-v3-enabled-count>' +
      enabled.length +
      "</span> enabled" +
      (hiddenCount
        ? ' · <span data-wdb-v3-hidden-count>' + hiddenCount + "</span> hidden"
        : "") +
      " · saved on this device</p>" +
      (hiddenCount
        ? '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-restore-all>Restore all hidden</button>'
        : "") +
      "</div>" +
      (widgets.length
        ? '<ul class="wdb-v2-custom__list wdb-v3-custom__list" data-v2-sortable="widgets" data-wdb-v3-sortable="widgets">' +
          widgets
            .map(function (w) {
              return renderBoardRow(w, prefs, layout, model);
            })
            .join("") +
          "</ul>"
        : '<p class="wdb-v3-custom__empty">No widgets on the board yet. Add from the Widget Library.</p>') +
      "</section>"
    );
  }

  function renderPanel(prefs, model, opts) {
    opts = opts || {};
    var P = Prefs();
    prefs = prefs || (P && P.load ? P.load() : { enabled: [], order: [], hidden: [] });
    var Lib = api("dashboardV3Library");
    var Layouts = api("dashboardV3Layouts");
    var libraryHtml =
      Lib && Lib.renderBrowser
        ? Lib.renderBrowser({ category: opts.libraryCategory || "favorites", prefs: prefs, model: model })
        : "";
    var layoutsHtml = Layouts && Layouts.renderPicker ? Layouts.renderPicker(Layouts.getActiveId()) : "";

    return (
      '<dialog class="wdb-v2-custom wdb-v3-custom" id="wdb-v2-customize" data-wdb-v3-customize aria-labelledby="wdb-v2-customize-title">' +
      '<form method="dialog" class="wdb-v2-custom__form" id="wdb-v2-customize-form">' +
      '<header class="wdb-v2-custom__head">' +
      '<h2 id="wdb-v2-customize-title">Adjust what you see</h2>' +
      '<p class="wdb-v2-custom__lead">Personalize widgets, sizes, and saved layouts. No two boards need look the same.</p>' +
      "</header>" +
      '<div class="wdb-v2-custom__body wdb-v3-custom__body">' +
      layoutsHtml +
      renderBoardSection(prefs, model) +
      libraryHtml +
      "</div>" +
      '<footer class="wdb-v2-custom__foot">' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-v2-reset data-wdb-v3-reset>Reset defaults</button>' +
      '<button type="button" class="wds-btn wds-btn--secondary" data-v2-apply data-wdb-v3-apply>Apply</button>' +
      '<button type="submit" class="wds-btn wds-btn--primary" value="done">Done</button>' +
      "</footer>" +
      "</form></dialog>"
    );
  }

  function refreshRoot(root) {
    var V3 = api("dashboardV3");
    var V2 = api("dashboardV2");
    if (V3 && V3.refresh && root) V3.refresh(root);
    else if (V2 && V2.refresh && root) V2.refresh(root);
  }

  function rebuildPanel(root, model, opts) {
    var existing = document.getElementById("wdb-v2-customize");
    var wasOpen = existing && existing.open;
    if (existing) existing.remove();
    var wrap = document.createElement("div");
    wrap.innerHTML = renderPanel(Prefs() && Prefs().load ? Prefs().load() : null, model, opts);
    var panel = wrap.firstElementChild;
    document.body.appendChild(panel);
    panel._v2Root = root;
    panel._v2Model = model;
    panel._v3LibraryCategory = (opts && opts.libraryCategory) || "favorites";
    panel.querySelectorAll("[data-v2-sortable], [data-wdb-v3-sortable]").forEach(bindDrag);
    if (wasOpen) {
      if (typeof panel.showModal === "function") panel.showModal();
      else panel.setAttribute("open", "open");
    }
    return panel;
  }

  function ensurePanel(root, model, opts) {
    var existing = document.getElementById("wdb-v2-customize");
    if (existing) existing.remove();
    return rebuildPanel(root, model, opts);
  }

  function bindDrag(list) {
    if (!list || list._v3DragBound) return;
    list._v3DragBound = true;
    var dragId = null;
    list.addEventListener("dragstart", function (e) {
      var row = e.target.closest("[data-v2-widget-id]");
      if (!row || e.target.closest("button, input, label, select")) return;
      dragId = row.getAttribute("data-v2-widget-id");
      row.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragend", function (e) {
      var row = e.target.closest("[data-v2-widget-id]");
      if (row) row.classList.remove("is-dragging");
      dragId = null;
    });
    list.addEventListener("dragover", function (e) {
      e.preventDefault();
      var row = e.target.closest("[data-v2-widget-id]");
      if (!row || !dragId) return;
      var dragging = list.querySelector('[data-v2-widget-id="' + dragId + '"]');
      if (!dragging || dragging === row) return;
      var rect = row.getBoundingClientRect();
      var after = e.clientY > rect.top + rect.height / 2;
      if (after) row.after(dragging);
      else row.before(dragging);
    });
  }

  function syncOrderFromPanel(panel) {
    var P = Prefs();
    if (!P || !P.load) return;
    var prefs = P.load();
    var order = [];
    panel.querySelectorAll("[data-wdb-v3-board-widget], [data-v2-widget-id]").forEach(function (row) {
      var id = row.getAttribute("data-wdb-v3-board-widget") || row.getAttribute("data-v2-widget-id");
      if (id && order.indexOf(id) < 0) order.push(id);
    });
    if (!order.length) return prefs;
    /* Keep disabled widgets after board order */
    (prefs.order || []).forEach(function (id) {
      if (order.indexOf(id) < 0) order.push(id);
    });
    prefs.order = order;
    P.save(prefs);
    var Layout = api("dashboardV3Layout");
    if (Layout && Layout.save) {
      var layout = Layout.load(prefs.enabled || []);
      layout.order = order.filter(function (id) {
        return (prefs.enabled || []).indexOf(id) >= 0;
      });
      Layout.save(layout);
    }
    return prefs;
  }

  function open(root, model, opts) {
    var panel = ensurePanel(root, model, opts);
    panel._v2Root = root;
    panel._v2Model = model;
    if (typeof panel.showModal === "function") panel.showModal();
    else panel.setAttribute("open", "open");
    var focusEl =
      panel.querySelector("[data-wdb-v3-library-cat]") ||
      panel.querySelector("[data-wdb-v3-add]") ||
      panel.querySelector("select");
    if (focusEl) focusEl.focus();
  }

  function bind(root) {
    if (!root || root._v3CustomizeBound) return;
    root._v3CustomizeBound = true;
    /* Prefer V3 panel; still honor V2 open button ids */
    if (!root._v2CustomizeBound) {
      /* Prevent double-binding if V2 customize also binds later */
      root._v2CustomizeBound = true;
    }

    root.addEventListener("click", function (e) {
      if (
        e.target.closest("#wdb-v2-customize-open") ||
        e.target.closest("#wdb-v3-customize-open") ||
        e.target.closest("[data-wdb-v3-customize-trigger]")
      ) {
        e.preventDefault();
        open(root, root._wdbV2Model || root._wdbV3Model);
      }
    });

    document.addEventListener("click", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.hasAttribute("data-wdb-v3-customize")) return;
      if (!panel.open && !panel.hasAttribute("open")) return;
      var formRoot = panel._v2Root || root;
      var model = panel._v2Model;
      var P = Prefs();
      var Layout = api("dashboardV3Layout");
      var Layouts = api("dashboardV3Layouts");

      var catBtn = e.target.closest("[data-wdb-v3-library-cat]");
      if (catBtn) {
        e.preventDefault();
        rebuildPanel(formRoot, model, { libraryCategory: catBtn.getAttribute("data-wdb-v3-library-cat") });
        return;
      }

      if (e.target.closest("[data-wdb-v3-add]")) {
        e.preventDefault();
        var addId = e.target.closest("[data-wdb-v3-add]").getAttribute("data-wdb-v3-add");
        if (P && P.addWidget) P.addWidget(addId);
        rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        refreshRoot(formRoot);
        return;
      }

      if (e.target.closest("[data-wdb-v3-remove]")) {
        e.preventDefault();
        var remId = e.target.closest("[data-wdb-v3-remove]").getAttribute("data-wdb-v3-remove");
        if (P && P.removeWidget) P.removeWidget(remId);
        rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        refreshRoot(formRoot);
        return;
      }

      if (e.target.closest("[data-wdb-v3-hide]")) {
        e.preventDefault();
        var hideId = e.target.closest("[data-wdb-v3-hide]").getAttribute("data-wdb-v3-hide");
        if (P && P.hideWidget) P.hideWidget(hideId);
        rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        refreshRoot(formRoot);
        return;
      }

      if (e.target.closest("[data-wdb-v3-restore]")) {
        e.preventDefault();
        var restId = e.target.closest("[data-wdb-v3-restore]").getAttribute("data-wdb-v3-restore");
        if (P && P.restoreWidget) P.restoreWidget(restId);
        rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        refreshRoot(formRoot);
        return;
      }

      if (e.target.closest("[data-wdb-v3-restore-all]")) {
        e.preventDefault();
        if (P && P.restoreAllHidden) P.restoreAllHidden();
        rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        refreshRoot(formRoot);
        return;
      }

      var moveBtn = e.target.closest("[data-wdb-v3-move], [data-v2-move]");
      if (moveBtn && panel.contains(moveBtn)) {
        e.preventDefault();
        var row = moveBtn.closest("[data-v2-widget-id]");
        var dir = moveBtn.getAttribute("data-wdb-v3-move") || moveBtn.getAttribute("data-v2-move");
        if (row && dir === "up" && row.previousElementSibling) {
          row.parentNode.insertBefore(row, row.previousElementSibling);
        } else if (row && dir === "down" && row.nextElementSibling) {
          row.parentNode.insertBefore(row.nextElementSibling, row);
        }
        syncOrderFromPanel(panel);
        refreshRoot(formRoot);
        moveBtn.focus();
        return;
      }

      if (e.target.closest("[data-wdb-v3-layout-apply]")) {
        e.preventDefault();
        var sel = panel.querySelector("[data-wdb-v3-layout-select]");
        if (sel && sel.value && Layouts && Layouts.apply) {
          Layouts.apply(sel.value, { root: formRoot, refresh: true });
          rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        }
        return;
      }

      if (e.target.closest("[data-wdb-v3-layout-save]")) {
        e.preventDefault();
        var name = global.prompt ? global.prompt("Layout name", "My layout") : "My layout";
        if (name && Layouts && Layouts.save) {
          Layouts.save(name);
          rebuildPanel(formRoot, model, { libraryCategory: panel._v3LibraryCategory });
        }
        return;
      }

      if (e.target.closest("[data-v2-reset], [data-wdb-v3-reset]")) {
        e.preventDefault();
        if (P && P.reset) P.reset();
        if (Layout && Layout.reset) Layout.reset((P.load() || {}).enabled || []);
        if (Layouts && Layouts.setActiveId) Layouts.setActiveId(null);
        rebuildPanel(formRoot, model, { libraryCategory: "favorites" });
        refreshRoot(formRoot);
        return;
      }

      if (e.target.closest("[data-v2-apply], [data-wdb-v3-apply]")) {
        e.preventDefault();
        syncOrderFromPanel(panel);
        refreshRoot(formRoot);
      }
    });

    document.addEventListener("change", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.hasAttribute("data-wdb-v3-customize")) return;
      if (!panel.open && !panel.hasAttribute("open")) return;
      var formRoot = panel._v2Root || root;
      if (e.target && e.target.matches("[data-wdb-v3-size]")) {
        var id = e.target.getAttribute("data-wdb-v3-size");
        var size = e.target.value;
        var Layout = api("dashboardV3Layout");
        var P = Prefs();
        var prefs = P && P.load ? P.load() : { enabled: [] };
        if (Layout && Layout.setSize) Layout.setSize(id, size, prefs.enabled || []);
        refreshRoot(formRoot);
      }
    });

    document.addEventListener("dragend", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.hasAttribute("data-wdb-v3-customize")) return;
      if (!panel.open && !panel.hasAttribute("open")) return;
      if (e.target && e.target.closest && e.target.closest("[data-v2-widget-id]")) {
        syncOrderFromPanel(panel);
        refreshRoot(panel._v2Root || root);
      }
    });

    document.addEventListener("close", function (e) {
      if (e.target && e.target.id === "wdb-v2-customize" && e.target.hasAttribute("data-wdb-v3-customize")) {
        syncOrderFromPanel(e.target);
        refreshRoot(e.target._v2Root || root);
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Customize = {
    VERSION: "3.1.0",
    renderPanel: renderPanel,
    open: open,
    bind: bind
  };
})(window);
