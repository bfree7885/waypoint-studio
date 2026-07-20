/**
 * Dashboard V2 — customize widgets panel (browse, enable, reorder, reset).
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function Cat() {
    return global.WDS && global.WDS.dashboardV2Widgets;
  }

  function Prefs() {
    return global.WDS && global.WDS.dashboardV2Prefs;
  }

  function renderToggle(checked, id, name) {
    return (
      '<label class="wdb-v2-custom__switch" aria-label="Show ' +
      esc(name) +
      '">' +
      '<input type="checkbox" class="wdb-v2-custom__switch-input" data-v2-widget-toggle="' +
      esc(id) +
      '"' +
      (checked ? " checked" : "") +
      ">" +
      '<span class="wdb-v2-custom__switch-track" aria-hidden="true"></span>' +
      "</label>"
    );
  }

  function renderWidgetRow(widget, prefs, model) {
    var CatMod = Cat();
    var state = CatMod && CatMod.resolveAvailability ? CatMod.resolveAvailability(widget, model) : widget.availability;
    var label = CatMod && CatMod.availabilityLabel ? CatMod.availabilityLabel(state) : state;
    var on = (prefs.enabled || []).indexOf(widget.id) >= 0;
    return (
      '<li class="wdb-v2-custom__row" draggable="true" data-v2-widget-id="' +
      esc(widget.id) +
      '">' +
      '<span class="wdb-v2-custom__drag" aria-hidden="true" title="Drag to reorder">⋮⋮</span>' +
      '<div class="wdb-v2-custom__meta">' +
      '<span class="wdb-v2-custom__name">' +
      esc(widget.name) +
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
      '<div class="wdb-v2-custom__move" role="group" aria-label="Reorder ' +
      esc(widget.name) +
      '">' +
      '<button type="button" class="wdb-v2-custom__move-btn" data-v2-move="up" aria-label="Move ' +
      esc(widget.name) +
      ' up">↑</button>' +
      '<button type="button" class="wdb-v2-custom__move-btn" data-v2-move="down" aria-label="Move ' +
      esc(widget.name) +
      ' down">↓</button>' +
      "</div>" +
      renderToggle(on, widget.id, widget.name) +
      "</li>"
    );
  }

  function renderCategory(cat, prefs, model) {
    var CatMod = Cat();
    if (!CatMod) return "";
    var widgets = CatMod.inCategory(cat.id);
    var order = prefs.order || [];
    widgets.sort(function (a, b) {
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
    return (
      '<section class="wdb-v2-custom__cat" data-v2-category="' +
      esc(cat.id) +
      '" aria-labelledby="wdb-v2-custom-cat-' +
      esc(cat.id) +
      '">' +
      '<h3 class="wdb-v2-custom__cat-title" id="wdb-v2-custom-cat-' +
      esc(cat.id) +
      '">' +
      esc(cat.label) +
      "</h3>" +
      '<ul class="wdb-v2-custom__list" data-v2-sortable="widgets">' +
      widgets
        .map(function (w) {
          return renderWidgetRow(w, prefs, model);
        })
        .join("") +
      "</ul>" +
      "</section>"
    );
  }

  function renderPanel(prefs, model) {
    var CatMod = Cat();
    var P = Prefs();
    prefs = prefs || (P && P.load ? P.load() : { enabled: [], order: [] });
    var count = P && P.enabledCount ? P.enabledCount(prefs) : (prefs.enabled || []).length;
    var cats = CatMod && CatMod.categories ? CatMod.categories() : [];
    return (
      '<dialog class="wdb-v2-custom" id="wdb-v2-customize" aria-labelledby="wdb-v2-customize-title">' +
      '<form method="dialog" class="wdb-v2-custom__form" id="wdb-v2-customize-form">' +
      '<header class="wdb-v2-custom__head">' +
      '<h2 id="wdb-v2-customize-title">Customize Dashboard</h2>' +
      '<p class="wdb-v2-custom__lead"><span data-v2-selected-count>' +
      count +
      "</span> widgets selected · saved on this device</p>" +
      "</header>" +
      '<div class="wdb-v2-custom__body">' +
      cats
        .map(function (c) {
          return renderCategory(c, prefs, model);
        })
        .join("") +
      "</div>" +
      '<footer class="wdb-v2-custom__foot">' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-v2-reset>Reset defaults</button>' +
      '<button type="button" class="wds-btn wds-btn--secondary" data-v2-apply>Apply</button>' +
      '<button type="submit" class="wds-btn wds-btn--primary" value="done">Done</button>' +
      "</footer>" +
      "</form>" +
      "</dialog>"
    );
  }

  function readPrefsFromPanel(panel) {
    var P = Prefs();
    var prefs = P && P.load ? P.load() : { enabled: [], order: [] };
    var enabled = [];
    panel.querySelectorAll("[data-v2-widget-toggle]").forEach(function (input) {
      if (input.checked) enabled.push(input.getAttribute("data-v2-widget-toggle"));
    });
    var order = [];
    panel.querySelectorAll("[data-v2-widget-id]").forEach(function (row) {
      order.push(row.getAttribute("data-v2-widget-id"));
    });
    prefs.enabled = enabled;
    prefs.order = order;
    return prefs;
  }

  function updateCount(panel, prefs) {
    var P = Prefs();
    var el = panel.querySelector("[data-v2-selected-count]");
    if (el) el.textContent = String(P && P.enabledCount ? P.enabledCount(prefs) : (prefs.enabled || []).length);
  }

  function bindDrag(list) {
    if (!list || list._v2DragBound) return;
    list._v2DragBound = true;
    var dragId = null;
    list.addEventListener("dragstart", function (e) {
      var row = e.target.closest("[data-v2-widget-id]");
      if (!row || e.target.closest("button, input, label")) return;
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

  function moveRow(row, direction) {
    if (!row) return false;
    if (direction === "up") {
      var prev = row.previousElementSibling;
      if (prev) {
        row.parentNode.insertBefore(row, prev);
        return true;
      }
    } else if (direction === "down") {
      var next = row.nextElementSibling;
      if (next) {
        row.parentNode.insertBefore(next, row);
        return true;
      }
    }
    return false;
  }

  function applyAndRefresh(root, panel) {
    var P = Prefs();
    if (!P || !P.save) return;
    var prefs = readPrefsFromPanel(panel);
    P.save(prefs);
    updateCount(panel, prefs);
    var V2 = global.WDS && global.WDS.dashboardV2;
    if (V2 && V2.refresh && root) V2.refresh(root);
  }

  function ensurePanel(root, model) {
    var existing = document.getElementById("wdb-v2-customize");
    if (existing) existing.remove();
    var wrap = document.createElement("div");
    wrap.innerHTML = renderPanel(Prefs() && Prefs().load ? Prefs().load() : null, model);
    var panel = wrap.firstElementChild;
    document.body.appendChild(panel);
    panel.querySelectorAll("[data-v2-sortable]").forEach(bindDrag);
    return panel;
  }

  function open(root, model) {
    var panel = ensurePanel(root, model);
    panel._v2Root = root;
    panel._v2Model = model;
    if (typeof panel.showModal === "function") panel.showModal();
    else panel.setAttribute("open", "open");
    var first = panel.querySelector("[data-v2-widget-toggle]");
    if (first) first.focus();
  }

  function bind(root) {
    if (!root || root._v2CustomizeBound) return;
    root._v2CustomizeBound = true;

    root.addEventListener("click", function (e) {
      if (e.target.closest("#wdb-v2-customize-open")) {
        e.preventDefault();
        var model = root._wdbV2Model;
        open(root, model);
      }
    });

    document.addEventListener("click", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.open) return;
      var formRoot = panel._v2Root || root;

      if (e.target.closest("[data-v2-reset]")) {
        e.preventDefault();
        var P = Prefs();
        if (P && P.reset) {
          P.reset();
          ensurePanel(formRoot, panel._v2Model);
          var next = document.getElementById("wdb-v2-customize");
          if (next && typeof next.showModal === "function") next.showModal();
          var V2 = global.WDS && global.WDS.dashboardV2;
          if (V2 && V2.refresh) V2.refresh(formRoot);
        }
      }

      if (e.target.closest("[data-v2-apply]")) {
        e.preventDefault();
        applyAndRefresh(formRoot, panel);
      }

      var moveBtn = e.target.closest("[data-v2-move]");
      if (moveBtn) {
        e.preventDefault();
        var row = moveBtn.closest("[data-v2-widget-id]");
        if (moveRow(row, moveBtn.getAttribute("data-v2-move"))) {
          applyAndRefresh(formRoot, panel);
          moveBtn.focus();
        }
      }

      if (e.target.matches("[data-v2-widget-toggle]")) {
        applyAndRefresh(formRoot, panel);
      }
    });

    document.addEventListener("change", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.open) return;
      if (e.target && e.target.matches("[data-v2-widget-toggle]")) {
        applyAndRefresh(panel._v2Root || root, panel);
      }
    });

    document.addEventListener("dragend", function (e) {
      var panel = document.getElementById("wdb-v2-customize");
      if (!panel || !panel.open) return;
      if (e.target && e.target.closest && e.target.closest("[data-v2-widget-id]")) {
        applyAndRefresh(panel._v2Root || root, panel);
      }
    });

    document.addEventListener("close", function (e) {
      if (e.target && e.target.id === "wdb-v2-customize") {
        var panel = e.target;
        var formRoot = panel._v2Root || root;
        applyAndRefresh(formRoot, panel);
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Customize = {
    renderPanel: renderPanel,
    open: open,
    bind: bind
  };
})(window);
