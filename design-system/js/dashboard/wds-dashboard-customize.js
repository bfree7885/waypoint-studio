/**
 * Dashboard customize panel — show/hide, reorder, favorites, groups.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSettings() {
    return global.WDS && global.WDS.dashboardSettings;
  }

  function getRegistry() {
    return global.WDS && global.WDS.dashboardWidgets;
  }

  function getCategories() {
    return global.WDS && global.WDS.dashboardCategories;
  }

  function sortedWidgetIds(settings) {
    var R = getRegistry();
    if (!R) return [];
    var S = getSettings();
    return R.defaultDefs().slice().sort(function (a, b) {
      return S.widgetOrder(settings, a) - S.widgetOrder(settings, b);
    }).map(function (d) { return d.id; });
  }

  function renderToggle(checked, id) {
    return (
      '<label class="wdb-switch" aria-label="Show widget">' +
        '<input type="checkbox" class="wdb-switch__input" data-widget-visible="' + escapeHtml(id) + '"' +
          (checked ? " checked" : "") + ">" +
        '<span class="wdb-switch__track"><span class="wdb-switch__thumb"></span></span>' +
      "</label>"
    );
  }

  function renderWidgetRow(def, settings) {
    var S = getSettings();
    var w = settings.widgets[def.id] || {};
    var visible = w.visible !== false;
    var fav = S.isFavorite(settings, def.id);
    var groups = settings.customGroups || [];
    var groupOpts = '<option value="">Default section</option>' +
      groups.map(function (g) {
        var sel = w.group === g.id ? " selected" : "";
        return '<option value="' + escapeHtml(g.id) + '"' + sel + ">" + escapeHtml(g.label) + "</option>";
      }).join("");

    return (
      '<li class="wdb-settings__row" draggable="true" data-widget-id="' + escapeHtml(def.id) + '">' +
        '<span class="wdb-settings__drag" aria-hidden="true" title="Drag to reorder">⋮⋮</span>' +
        '<span class="wdb-settings__icon" aria-hidden="true">' + escapeHtml(def.icon) + "</span>" +
        '<span class="wdb-settings__name">' + escapeHtml(def.title) + "</span>" +
        '<button type="button" class="wdb-settings__star' + (fav ? " wdb-settings__star--on" : "") +
          '" data-widget-favorite="' + escapeHtml(def.id) + '" aria-label="' +
          (fav ? "Remove from favorites" : "Add to favorites") + '" title="Favorite">★</button>' +
        (groups.length
          ? '<select class="wdb-settings__group-select" data-widget-group="' + escapeHtml(def.id) +
              '" aria-label="Assign group">' + groupOpts + "</select>"
          : "") +
        renderToggle(visible, def.id) +
      "</li>"
    );
  }

  function renderWidgetsTab(settings) {
    var R = getRegistry();
    if (!R) return "";
    var ids = sortedWidgetIds(settings);
    var byId = {};
    R.defaultDefs().forEach(function (d) { byId[d.id] = d; });
    return (
      '<div class="wdb-settings__pane" data-pane="widgets">' +
        '<p class="wdb-settings__hint">Drag to reorder. Star favorites for quick access at the top.</p>' +
        '<ul class="wdb-settings__list wdb-settings__list--sortable" data-sortable="widgets">' +
          ids.map(function (id) { return byId[id] ? renderWidgetRow(byId[id], settings) : ""; }).join("") +
        "</ul>" +
      "</div>"
    );
  }

  function renderSectionsTab(settings) {
    var C = getCategories();
    if (!C) return "";
    var order = settings.sectionOrder && settings.sectionOrder.length
      ? settings.sectionOrder.slice()
      : C.defaultSectionOrder();
    return (
      '<div class="wdb-settings__pane" data-pane="sections" hidden>' +
        '<p class="wdb-settings__hint">Drag sections to change their order on the dashboard.</p>' +
        '<ul class="wdb-settings__list wdb-settings__list--sortable" data-sortable="sections">' +
          order.map(function (id) {
            return (
              '<li class="wdb-settings__row wdb-settings__row--section" draggable="true" data-section-id="' +
                escapeHtml(id) + '">' +
                '<span class="wdb-settings__drag" aria-hidden="true">⋮⋮</span>' +
                '<span class="wdb-settings__name">' + escapeHtml(C.label(id)) + "</span>" +
              "</li>"
            );
          }).join("") +
        "</ul>" +
      "</div>"
    );
  }

  function renderGroupsTab(settings) {
    var groups = settings.customGroups || [];
    return (
      '<div class="wdb-settings__pane" data-pane="groups" hidden>' +
        '<p class="wdb-settings__hint">Create custom groups to organize widgets outside default sections.</p>' +
        '<ul class="wdb-settings__group-list">' +
          groups.map(function (g) {
            var count = (g.widgetIds || []).length;
            return (
              '<li class="wdb-settings__group-item">' +
                '<span class="wdb-settings__group-label">' + escapeHtml(g.label) + "</span>" +
                '<span class="wdb-settings__group-count">' + count + " widget" + (count === 1 ? "" : "s") + "</span>" +
                '<button type="button" class="wdb-settings__group-delete" data-group-delete="' +
                  escapeHtml(g.id) + '" aria-label="Delete group">×</button>' +
              "</li>"
            );
          }).join("") +
        "</ul>" +
        '<div class="wdb-settings__new-group">' +
          '<input type="text" class="wdb-settings__group-input" id="wdb-new-group-label" placeholder="Group name" maxlength="40">' +
          '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" data-group-create>Create group</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderPanelBody(settings) {
    return renderWidgetsTab(settings) + renderSectionsTab(settings) + renderGroupsTab(settings);
  }

  function renderPresetsBar() {
    var S = getSettings();
    var presets = S && S.PRESETS ? S.PRESETS : {};
    var keys = Object.keys(presets);
    if (!keys.length) return "";
    return (
      '<div class="wdb-settings__presets">' +
        '<p class="wdb-settings__presets-label">Quick layouts</p>' +
        '<div class="wdb-settings__presets-row">' +
          keys.map(function (key) {
            return '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-preset="' +
              escapeHtml(key) + '">' + escapeHtml(presets[key].label) + "</button>";
          }).join("") +
        "</div>" +
      "</div>"
    );
  }

  function renderPanel() {
    var S = getSettings();
    var settings = S ? S.load() : { widgets: {}, favorites: [], customGroups: [] };
    var count = S ? S.visibleCount(settings) : 0;
    return (
      '<dialog class="wdb-settings" id="wds-dashboard-settings" aria-labelledby="wdb-settings-title">' +
        '<form method="dialog" class="wdb-settings__form" id="wdb-settings-form">' +
          '<header class="wdb-settings__head">' +
            '<h2 id="wdb-settings-title">Customize dashboard</h2>' +
            '<p class="wdb-settings__lead">' + count + ' widgets visible · saved on this device</p>' +
          "</header>" +
          renderPresetsBar() +
          '<nav class="wdb-settings__tabs" role="tablist" aria-label="Customization">' +
            '<button type="button" class="wdb-settings__tab wdb-settings__tab--active" role="tab" aria-selected="true" data-tab="widgets">Widgets</button>' +
            '<button type="button" class="wdb-settings__tab" role="tab" aria-selected="false" data-tab="sections">Sections</button>' +
            '<button type="button" class="wdb-settings__tab" role="tab" aria-selected="false" data-tab="groups">Groups</button>' +
          "</nav>" +
          '<div class="wdb-settings__body">' + renderPanelBody(settings) + "</div>" +
          '<footer class="wdb-settings__foot">' +
            '<button type="button" class="wds-btn wds-btn--ghost" data-settings-reset>Reset defaults</button>' +
            '<button type="submit" class="wds-btn wds-btn--primary" value="done">Done</button>' +
          "</footer>" +
        "</form>" +
      "</dialog>"
    );
  }

  function switchTab(panel, tabId) {
    panel.querySelectorAll(".wdb-settings__tab").forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === tabId;
      btn.classList.toggle("wdb-settings__tab--active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    panel.querySelectorAll(".wdb-settings__pane").forEach(function (pane) {
      pane.hidden = pane.getAttribute("data-pane") !== tabId;
    });
  }

  function refreshPanel(panel) {
    var S = getSettings();
    if (!S || !panel) return;
    var form = panel.querySelector(".wdb-settings__form");
    if (!form) return;
    var settings = S.load();
    var body = form.querySelector(".wdb-settings__body");
    var activeTab = panel.querySelector(".wdb-settings__tab--active");
    var tabId = activeTab ? activeTab.getAttribute("data-tab") : "widgets";
    var lead = form.querySelector(".wdb-settings__lead");
    if (lead) lead.textContent = S.visibleCount(settings) + " widgets visible · saved on this device";
    if (body) {
      body.innerHTML = renderPanelBody(settings);
      switchTab(panel, tabId);
      bindSortables(panel, panel._wdbOnChange);
    }
  }

  function bindDragSort(list, onReorder) {
    if (!list || list._wdbDragBound) return;
    list._wdbDragBound = true;
    var dragEl = null;
    list.addEventListener("dragstart", function (e) {
      var row = e.target.closest(".wdb-settings__row");
      if (!row || !list.contains(row)) return;
      dragEl = row;
      row.classList.add("wdb-settings__row--dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragend", function () {
      if (dragEl) dragEl.classList.remove("wdb-settings__row--dragging");
      dragEl = null;
      list.querySelectorAll(".wdb-settings__row--over").forEach(function (el) {
        el.classList.remove("wdb-settings__row--over");
      });
    });
    list.addEventListener("dragover", function (e) {
      e.preventDefault();
      var row = e.target.closest(".wdb-settings__row");
      if (!row || row === dragEl || !list.contains(row)) return;
      list.querySelectorAll(".wdb-settings__row--over").forEach(function (el) {
        if (el !== row) el.classList.remove("wdb-settings__row--over");
      });
      row.classList.add("wdb-settings__row--over");
    });
    list.addEventListener("drop", function (e) {
      e.preventDefault();
      var row = e.target.closest(".wdb-settings__row");
      if (!dragEl || !row || dragEl === row) return;
      var rows = Array.prototype.slice.call(list.querySelectorAll(".wdb-settings__row"));
      var from = rows.indexOf(dragEl);
      var to = rows.indexOf(row);
      if (from < 0 || to < 0) return;
      if (from < to) list.insertBefore(dragEl, row.nextSibling);
      else list.insertBefore(dragEl, row);
      onReorder(from, to);
    });
  }

  function bindSortables(panel, onChange) {
    var S = getSettings();
    bindDragSort(panel.querySelector('[data-sortable="widgets"]'), function (from, to) {
      var settings = S.load();
      S.reorderIds(settings, sortedWidgetIds(settings), from, to);
      S.save(settings);
      if (onChange) onChange(settings);
    });
    bindDragSort(panel.querySelector('[data-sortable="sections"]'), function (from, to) {
      var settings = S.load();
      S.reorderSectionOrder(settings, from, to);
      S.save(settings);
      if (onChange) onChange(settings);
    });
  }

  function bindPanel(root, onChange) {
    var panel = document.getElementById("wds-dashboard-settings");
    if (!panel) return null;
    panel._wdbOnChange = onChange;
    if (panel._wdbCustomizeBound) return panel;
    panel._wdbCustomizeBound = true;
    var form = panel.querySelector(".wdb-settings__form");
    if (!form) return panel;

    switchTab(panel, "widgets");
    bindSortables(panel, onChange);

    form.addEventListener("click", function (e) {
      var S = getSettings();
      if (!S) return;
      var tabBtn = e.target.closest(".wdb-settings__tab");
      if (tabBtn) {
        switchTab(panel, tabBtn.getAttribute("data-tab"));
        return;
      }
      var presetBtn = e.target.closest("[data-preset]");
      if (presetBtn && S.applyPreset) {
        var pid = presetBtn.getAttribute("data-preset");
        var pSettings = S.load();
        S.applyPreset(pSettings, pid);
        S.save(pSettings);
        refreshPanel(panel);
        if (onChange) onChange(pSettings);
        return;
      }
      var favBtn = e.target.closest("[data-widget-favorite]");
      if (favBtn) {
        var fid = favBtn.getAttribute("data-widget-favorite");
        var fSettings = S.load();
        S.toggleFavorite(fSettings, fid);
        S.save(fSettings);
        favBtn.classList.toggle("wdb-settings__star--on", S.isFavorite(fSettings, fid));
        if (onChange) onChange(fSettings);
        return;
      }
      if (e.target.closest("[data-group-create]")) {
        var input = panel.querySelector("#wdb-new-group-label");
        var label = input && input.value.trim();
        if (!label) return;
        var gSettings = S.load();
        S.createGroup(gSettings, label);
        S.save(gSettings);
        if (input) input.value = "";
        refreshPanel(panel);
        if (onChange) onChange(gSettings);
        return;
      }
      var delBtn = e.target.closest("[data-group-delete]");
      if (delBtn) {
        var gid = delBtn.getAttribute("data-group-delete");
        var dSettings = S.load();
        S.deleteGroup(dSettings, gid);
        S.save(dSettings);
        refreshPanel(panel);
        if (onChange) onChange(dSettings);
        return;
      }
      if (e.target.closest("[data-settings-reset]")) {
        if (!global.confirm("Reset dashboard to default layout? This cannot be undone.")) return;
        var rSettings = S.reset();
        refreshPanel(panel);
        if (onChange) onChange(rSettings);
      }
    });

    form.addEventListener("change", function (e) {
      var S = getSettings();
      if (!S) return;
      var vis = e.target.closest("[data-widget-visible]");
      if (vis) {
        var id = vis.getAttribute("data-widget-visible");
        var settings = S.load();
        S.setWidgetVisible(settings, id, vis.checked);
        S.save(settings);
        var lead = panel.querySelector(".wdb-settings__lead");
        if (lead) lead.textContent = S.visibleCount(settings) + " widgets visible · saved on this device";
        if (onChange) onChange(settings);
        return;
      }
      var grp = e.target.closest("[data-widget-group]");
      if (grp) {
        var wid = grp.getAttribute("data-widget-group");
        var gSettings = S.load();
        S.assignWidgetGroup(gSettings, wid, grp.value || null);
        S.save(gSettings);
        if (onChange) onChange(gSettings);
      }
    });

    panel.addEventListener("close", function () {
      if (onChange) onChange(getSettings().load());
    });

    return panel;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardCustomize = {
    renderPanel: renderPanel,
    bindPanel: bindPanel,
    refreshPanel: refreshPanel
  };
})(window);
