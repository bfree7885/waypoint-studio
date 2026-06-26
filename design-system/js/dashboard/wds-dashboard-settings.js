/**
 * Dashboard widget settings — local persistence, no accounts
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-dashboard-widgets-v2";
  var LEGACY_KEY = "waypoint-dashboard-widgets-v1";
  var VERSION = 2;

  function getRegistry() {
    return global.WDS && global.WDS.dashboardWidgets;
  }

  function getCategories() {
    return global.WDS && global.WDS.dashboardCategories;
  }

  function defaultSettings() {
    var R = getRegistry();
    if (!R) return { version: VERSION, widgets: {}, sectionOrder: [] };
    var widgets = {};
    R.defaultDefs().forEach(function (def) {
      widgets[def.id] = {
        visible: def.defaultVisible !== false,
        order: def.defaultOrder || 0,
        collapsed: !!def.defaultCollapsed
      };
    });
    var C = getCategories();
    return {
      version: VERSION,
      widgets: widgets,
      sectionOrder: C ? C.defaultSectionOrder() : []
    };
  }

  function migrateLegacy(parsed) {
    if (!parsed || !parsed.widgets) return null;
    var map = {
      "current-weather": true,
      forecast: { hourly: true, weekly: true },
      sun: { sunrise: true, sunset: true },
      "seasonal-watch": { "seasonal-edibles": true },
      "foraging-conditions": { "mushroom-outlook": true },
      "wildlife-activity": true,
      "trail-conditions": true,
      "photography-conditions": { "sunrise-quality": true, "cloud-cover": true },
      "fieldry-summary": { "recent-fieldry-observations": true },
      "research-notes": false,
      "regional-news": false
    };
    var widgets = defaultSettings().widgets;
    Object.keys(parsed.widgets).forEach(function (oldId) {
      var entry = parsed.widgets[oldId];
      if (oldId === "forecast") {
        ["hourly-forecast", "weekly-forecast"].forEach(function (id) {
          if (widgets[id]) widgets[id].visible = entry.visible !== false;
        });
        return;
      }
      if (widgets[oldId]) {
        widgets[oldId] = Object.assign({}, widgets[oldId], entry);
      }
    });
    return { version: VERSION, widgets: widgets, sectionOrder: defaultSettings().sectionOrder };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          var migrated = migrateLegacy(JSON.parse(legacy));
          if (migrated) {
            save(migrated);
            return migrated;
          }
        }
        return defaultSettings();
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.widgets) return defaultSettings();
      var base = defaultSettings();
      Object.keys(base.widgets).forEach(function (id) {
        if (parsed.widgets[id]) {
          base.widgets[id] = Object.assign({}, base.widgets[id], parsed.widgets[id]);
        }
      });
      if (!parsed.widgets["outdoor-weather"]) {
        base.widgets["outdoor-weather"] = { visible: true, order: 1, collapsed: false };
        ["current-weather", "hourly-forecast", "weekly-forecast", "wind", "uv-index"].forEach(function (wid) {
          if (base.widgets[wid] && parsed.widgets[wid] && parsed.widgets[wid].visible !== false) {
            base.widgets[wid] = Object.assign({}, base.widgets[wid], { visible: false });
          }
        });
      }
      if (!parsed.widgets["sun-moon-dashboard"]) {
        base.widgets["sun-moon-dashboard"] = { visible: true, order: 100, collapsed: false };
        ["sunrise", "sunset", "golden-hour", "blue-hour", "moon-phase", "moonrise", "moonset"].forEach(function (wid) {
          if (base.widgets[wid] && parsed.widgets[wid] && parsed.widgets[wid].visible !== false) {
            base.widgets[wid] = Object.assign({}, base.widgets[wid], { visible: false });
          }
        });
      }
      if (!parsed.widgets["photography-conditions-dashboard"]) {
        base.widgets["photography-conditions-dashboard"] = { visible: true, order: 700, collapsed: false };
        ["sunrise-quality", "sunset-quality", "fog-potential", "cloud-cover", "milky-way", "aurora"].forEach(function (wid) {
          if (base.widgets[wid] && parsed.widgets[wid] && parsed.widgets[wid].visible !== false) {
            base.widgets[wid] = Object.assign({}, base.widgets[wid], { visible: false });
          }
        });
      }
      if (!parsed.widgets["wildlife-dashboard"]) {
        base.widgets["wildlife-dashboard"] = { visible: true, order: 200, collapsed: false };
        ["wildlife-activity", "bird-migration", "amphibian-activity", "insect-activity"].forEach(function (wid) {
          if (base.widgets[wid] && parsed.widgets[wid] && parsed.widgets[wid].visible !== false) {
            base.widgets[wid] = Object.assign({}, base.widgets[wid], { visible: false });
          }
        });
      }
      if (parsed.sectionOrder && parsed.sectionOrder.length) {
        base.sectionOrder = parsed.sectionOrder;
      }
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
        widgets: enabled.filter(function (def) { return def.category === cat.id; })
      };
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
    var C = getCategories();
    if (!R || !C) return "";
    var sections = enabledWidgetsBySection(settings, R.defaultDefs());
    var blocks = sections.map(function (section) {
      var rows = section.widgets.map(function (def) {
        var w = settings.widgets[def.id] || {};
        var checked = w.visible !== false ? " checked" : "";
        return (
          '<li class="wdb-settings__row" data-widget-id="' + escapeHtml(def.id) + '">' +
            '<label class="wdb-settings__label">' +
              '<input type="checkbox" class="wdb-settings__check" data-widget-id="' + escapeHtml(def.id) + '"' + checked + ">" +
              '<span class="wdb-settings__icon" aria-hidden="true">' + escapeHtml(def.icon) + "</span>" +
              '<span class="wdb-settings__name">' + escapeHtml(def.title) + "</span>" +
            "</label>" +
          "</li>"
        );
      }).join("");
      if (!rows) return "";
      return (
        '<div class="wdb-settings__section" data-section-id="' + escapeHtml(section.id) + '">' +
          '<h3 class="wdb-settings__section-title">' + escapeHtml(section.label) + "</h3>" +
          '<ul class="wdb-settings__list">' + rows + "</ul>" +
        "</div>"
      );
    }).join("");

    return (
      '<dialog class="wdb-settings" id="wds-dashboard-settings" aria-labelledby="wdb-settings-title">' +
        '<form method="dialog" class="wdb-settings__form">' +
          '<header class="wdb-settings__head">' +
            '<h2 id="wdb-settings-title">Customize dashboard</h2>' +
            '<p class="wdb-settings__lead">Enable the widgets you need before heading outside. Saved on this device only.</p>' +
          "</header>" +
          '<div class="wdb-settings__sections">' + blocks + "</div>" +
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
    enabledWidgetsBySection: enabledWidgetsBySection,
    renderPanel: renderPanel,
    bindPanel: bindPanel
  };
})(window);
