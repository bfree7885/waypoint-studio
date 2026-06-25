/**
 * Dashboard widget settings — local persistence, no accounts
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-widgets-v1";
  var VERSION = 1;

  function getRegistry() {
    return global.WDS && global.WDS.dashboardWidgets;
  }

  function defaultSettings() {
    var R = getRegistry();
    if (!R) return { version: VERSION, widgets: {} };
    var widgets = {};
    R.defaultDefs().forEach(function (def) {
      widgets[def.id] = {
        visible: def.defaultVisible !== false,
        order: def.defaultOrder || 0,
        collapsed: !!def.defaultCollapsed
      };
    });
    return { version: VERSION, widgets: widgets };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings();
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.widgets) return defaultSettings();
      var base = defaultSettings();
      Object.keys(base.widgets).forEach(function (id) {
        if (parsed.widgets[id]) {
          base.widgets[id] = Object.assign({}, base.widgets[id], parsed.widgets[id]);
        }
      });
      return base;
    } catch (e) {
      return defaultSettings();
    }
  }

  function save(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    global.dispatchEvent(new CustomEvent("wds:dashboard-settings-change", { detail: settings }));
  }

  function reset() {
    var s = defaultSettings();
    save(s);
    return s;
  }

  function enabledWidgets(settings) {
    settings = settings || load();
    var R = getRegistry();
    if (!R) return [];
    return R.defaultDefs()
      .filter(function (def) {
        var w = settings.widgets[def.id];
        return !w || w.visible !== false;
      })
      .sort(function (a, b) {
        var oa = (settings.widgets[a.id] && settings.widgets[a.id].order != null)
          ? settings.widgets[a.id].order : a.defaultOrder;
        var ob = (settings.widgets[b.id] && settings.widgets[b.id].order != null)
          ? settings.widgets[b.id].order : b.defaultOrder;
        return oa - ob;
      });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderPanel(settings) {
    settings = settings || load();
    var R = getRegistry();
    if (!R) return "";
    var rows = R.defaultDefs().map(function (def) {
      var w = settings.widgets[def.id] || {};
      var checked = w.visible !== false ? " checked" : "";
      return (
        '<li class="wdb-settings__row" data-widget-id="' + escapeHtml(def.id) + '">' +
          '<label class="wdb-settings__label">' +
            '<input type="checkbox" class="wdb-settings__check" data-widget-id="' + escapeHtml(def.id) + '"' + checked + ">" +
            '<span class="wdb-settings__icon" aria-hidden="true">' + escapeHtml(def.icon) + "</span>" +
            '<span class="wdb-settings__name">' + escapeHtml(def.title) + "</span>" +
            '<span class="wdb-settings__cat">' + escapeHtml(def.category || "") + "</span>" +
          "</label>" +
        "</li>"
      );
    }).join("");

    return (
      '<dialog class="wdb-settings" id="wds-dashboard-settings" aria-labelledby="wdb-settings-title">' +
        '<form method="dialog" class="wdb-settings__form">' +
          '<header class="wdb-settings__head">' +
            '<h2 id="wdb-settings-title">Dashboard widgets</h2>' +
            '<p class="wdb-settings__lead">Choose what appears on your outdoor dashboard. Saved on this device only.</p>' +
          "</header>" +
          '<ul class="wdb-settings__list">' + rows + "</ul>" +
          '<footer class="wdb-settings__foot">' +
            '<button type="button" class="wds-btn wds-btn--ghost" id="wdb-settings-reset">Reset defaults</button>' +
            '<button type="submit" class="wds-btn wds-btn--primary" value="done">Done</button>' +
          "</footer>" +
        "</form>" +
      "</dialog>"
    );
  }

  function bindPanel(root, onChange) {
    if (!root) return;
    var dialog = root.querySelector("#wds-dashboard-settings");
    if (!dialog) {
      root.insertAdjacentHTML("beforeend", renderPanel());
      dialog = root.querySelector("#wds-dashboard-settings");
    }
    var settings = load();

    function emit() {
      save(settings);
      if (onChange) onChange(settings);
    }

    dialog.addEventListener("click", function (e) {
      if (e.target.id === "wdb-settings-reset") {
        e.preventDefault();
        settings = reset();
        dialog.outerHTML = renderPanel(settings);
        bindPanel(root, onChange);
      }
    });

    dialog.addEventListener("change", function (e) {
      var cb = e.target.closest(".wdb-settings__check");
      if (!cb) return;
      var id = cb.getAttribute("data-widget-id");
      if (!settings.widgets[id]) settings.widgets[id] = {};
      settings.widgets[id].visible = cb.checked;
      emit();
    });

    dialog.addEventListener("close", function () {
      emit();
    });

    return {
      open: function () {
        if (dialog.showModal) dialog.showModal();
      }
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardSettings = {
    STORAGE_KEY: STORAGE_KEY,
    load: load,
    save: save,
    reset: reset,
    enabledWidgets: enabledWidgets,
    renderPanel: renderPanel,
    bindPanel: bindPanel
  };
})(window);
