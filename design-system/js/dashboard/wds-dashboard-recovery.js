/**
 * Dashboard Product Recovery shell — Today's Summary + instant tabs.
 * Tabs switch with CSS only; specialty mounts run lazily on first visit.
 */
(function (global) {
  "use strict";

  var STORAGE_TAB = "waypoint-dashboard-recovery-tab-v1";
  var ENABLED_KEY = "waypoint-dashboard-recovery-v1";

  var TABS = [
    { id: "today", label: "Today" },
    { id: "weather", label: "Weather" },
    { id: "photography", label: "Photography" },
    { id: "rivers", label: "Rivers" },
    { id: "air", label: "Air" },
    { id: "sun-moon", label: "Sun & Moon" },
    { id: "alerts", label: "Alerts" },
    { id: "settings", label: "Settings" }
  ];

  /** Widget ids rendered inside each detail tab (not Today). */
  var TAB_WIDGETS = {
    weather: ["outdoor-weather"],
    photography: ["photography-conditions-dashboard"],
    rivers: ["water-dashboard"],
    air: ["air-quality"],
    "sun-moon": ["sun-moon-dashboard"],
    alerts: [],
    settings: []
  };

  var TAB_QUESTIONS = {
    today: "What is happening outside, and what should I consider today?",
    weather: "What are the measurable conditions right now and ahead?",
    photography: "How is the light for making photographs?",
    rivers: "What are nearby water levels doing?",
    air: "How is the air to breathe and exert outdoors?",
    "sun-moon": "When are sunrise, sunset, and moon cues?",
    alerts: "Are there official weather warnings?",
    settings: "How do I tune location and dashboard preferences?"
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isEnabled() {
    try {
      var forced = global.localStorage && global.localStorage.getItem(ENABLED_KEY);
      if (forced === "0") return false;
      if (forced === "1") return true;
    } catch (e) { /* noop */ }
    return true; // Product Recovery default
  }

  function readStoredTab() {
    try {
      var t = global.localStorage && global.localStorage.getItem(STORAGE_TAB);
      if (t && TABS.some(function (x) { return x.id === t; })) return t;
    } catch (e) { /* noop */ }
    return "today";
  }

  function storeTab(id) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_TAB, id);
    } catch (e) { /* noop */ }
  }

  function mark(name) {
    try {
      if (global.performance && performance.mark) performance.mark(name);
    } catch (e) { /* noop */ }
  }

  function measure(name, start, end) {
    try {
      if (global.performance && performance.measure) {
        performance.measure(name, start, end);
      }
    } catch (e) { /* noop */ }
  }

  function getDef(id) {
    var W = global.WDS && global.WDS.dashboardWidgets;
    return W && W.get ? W.get(id) : null;
  }

  function renderWidgetSafe(def, ctx, settings) {
    var DE = global.WDS && global.WDS.dashboardEngine;
    if (!def || !DE) return "";
    // Use engine's private path via refreshWidget HTML: call catalog getData + minimal article
    // Prefer reusing renderDashboard pieces — expose via temporary: settings widgets
    var data = def.getData ? def.getData(ctx) : { status: "empty" };
    var cfg = (settings.widgets && settings.widgets[def.id]) || {};
    // Access renderWidget through a thin re-render: build article like engine
    return renderWidgetArticle(def, data, cfg);
  }

  function renderWidgetArticle(def, data, userConfig) {
    // Mirror engine article chrome for mounts (keep behavior identical)
    userConfig = userConfig || {};
    data = data || {};
    var EF = global.WDS && global.WDS.educationalFallback;
    var body;
    if (data.mountKind) {
      var loading = EF && EF.mountHtml
        ? EF.mountHtml(data.mountKind)
        : '<p class="wdb-widget__empty">Loading…</p>';
      body =
        '<div class="wdb-widget__mount wds-weather-mount" data-wds-weather-mount="' +
        escapeHtml(data.mountKind) +
        '" aria-live="polite" aria-busy="true">' +
        loading +
        "</div>";
    } else if (data.status === "loading" || data.status === "educational" || data.status === "unavailable" || data.status === "error") {
      body = (data.educationalHtml) ||
        (EF && EF.renderUnavailable ? EF.renderUnavailable(EF.topicForWidget ? EF.topicForWidget(def.id, def.category) : "weather") : "<p>Unavailable</p>");
    } else {
      var html = "";
      if (data.highlight) html += '<p class="wdb-widget__highlight">' + escapeHtml(data.highlight) + "</p>";
      if (data.body) html += '<p class="wdb-widget__body-text">' + escapeHtml(data.body) + "</p>";
      if (data.items && data.items.length) {
        html += "<ul class=\"wdb-widget__list\">" + data.items.map(function (item) {
          return "<li>" + escapeHtml(typeof item === "string" ? item : (item.text || item.name || "")) + "</li>";
        }).join("") + "</ul>";
      }
      body = html || (EF && EF.render ? EF.render("weather") : "<p>No data</p>");
    }
    var tag = data.tag || { label: "—", className: "" };
    var collapsed = !!userConfig.collapsed;
    return (
      '<article class="wdb-widget wdb-widget--' + escapeHtml(def.id) +
        (def.tier === "anchor" ? " wdb-widget--anchor wdb-widget--full" : "") +
        (collapsed ? " wdb-widget--collapsed" : "") +
        '" id="widget-' + escapeHtml(def.id) + '" data-widget-id="' + escapeHtml(def.id) + '">' +
        '<header class="wdb-widget__head">' +
          '<span class="wdb-widget__icon" aria-hidden="true">' + escapeHtml(def.icon || "") + "</span>" +
          '<div class="wdb-widget__titles">' +
            '<h3 class="wdb-widget__title">' + escapeHtml(def.title) + "</h3>" +
          "</div>" +
          '<span class="wdb-widget__tag ' + escapeHtml(tag.className) + '">' + escapeHtml(tag.label) + "</span>" +
          '<button type="button" class="wdb-widget__refresh" data-widget-refresh="' + escapeHtml(def.id) +
            '" aria-label="Refresh ' + escapeHtml(def.title) + '" title="Refresh">↻</button>' +
        "</header>" +
        '<div class="wdb-widget__body">' + body + "</div>" +
      "</article>"
    );
  }

  function renderAlertsPanel(ctx) {
    var platform = (ctx && ctx.platform) || {};
    var alerts = platform.alerts;
    var items = alerts && alerts.items ? alerts.items : [];
    if (!alerts || alerts.status === "loading" || (!platform.meta || !platform.meta.hydratedAt)) {
      return '<div class="wdb-alerts-panel"><p class="wdb-tab-panel__empty">Checking for National Weather Service alerts…</p></div>';
    }
    if (!items.length) {
      return (
        '<div class="wdb-alerts-panel wdb-alerts-panel--clear">' +
          '<p class="wdb-alerts-panel__clear">No active weather alerts for this area.</p>' +
          '<p class="wdb-tab-panel__hint">Official watches and warnings from the NWS appear here when issued.</p>' +
        "</div>"
      );
    }
    var list = items.map(function (a) {
      return (
        '<article class="wdb-alert-card">' +
          "<h3>" + escapeHtml(a.event || "Alert") + "</h3>" +
          (a.headline ? "<p>" + escapeHtml(a.headline) + "</p>" : "") +
          (a.severity ? '<p class="wdb-alert-card__sev">Severity: ' + escapeHtml(a.severity) + "</p>" : "") +
        "</article>"
      );
    }).join("");
    return '<div class="wdb-alerts-panel" role="list">' + list + "</div>";
  }

  function renderTablist(activeId) {
    var buttons = TABS.map(function (tab) {
      var on = tab.id === activeId;
      return (
        '<button type="button" role="tab" class="wdb-recovery-tabs__tab' + (on ? " is-active" : "") +
          '" id="wdb-tab-btn-' + escapeHtml(tab.id) +
          '" data-wdb-tab="' + escapeHtml(tab.id) +
          '" aria-selected="' + (on ? "true" : "false") +
          '" aria-controls="wdb-panel-' + escapeHtml(tab.id) +
          '" tabindex="' + (on ? "0" : "-1") + '">' +
          escapeHtml(tab.label) +
        "</button>"
      );
    }).join("");
    return (
      '<div class="wdb-recovery-tabs" data-wdb-recovery-tabs>' +
        '<div class="wdb-recovery-tabs__list" role="tablist" aria-label="Dashboard topics" data-wdb-tablist>' +
          buttons +
        "</div>" +
      "</div>"
    );
  }

  function renderSettingsPanel() {
    return (
      '<div class="wdb-settings-panel" data-wdb-settings-panel>' +
        '<p class="wdb-tab-panel__intro">' + escapeHtml(TAB_QUESTIONS.settings) + "</p>" +
        '<ul class="wdb-settings-panel__list">' +
          "<li>Use <strong>Use my location</strong> or <strong>Change location</strong> above for place context.</li>" +
          "<li>Each topic tab answers one outdoor question — Today interprets; Weather holds the gauges.</li>" +
          "<li>Providers fail independently; usable panels stay available when one feed is down.</li>" +
        "</ul>" +
        '<p class="wdb-settings-panel__actions">' +
          '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" id="wds-dashboard-settings-open">Customize panels</button> ' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="../../settings.html">Studio settings</a>' +
        "</p>" +
      "</div>"
    );
  }

  function renderPanel(tabId, activeId, ctx, settings) {
    var on = tabId === activeId;
    var inner = "";
    var question = TAB_QUESTIONS[tabId];
    if (tabId === "today") {
      var TS = global.WDS && global.WDS.todaySummary;
      inner = TS && TS.renderTodayPanel ? TS.renderTodayPanel(ctx) : "";
    } else if (tabId === "alerts") {
      inner =
        (question ? '<p class="wdb-tab-panel__intro">' + escapeHtml(question) + "</p>" : "") +
        renderAlertsPanel(ctx);
    } else if (tabId === "settings") {
      inner = renderSettingsPanel();
    } else {
      var ids = TAB_WIDGETS[tabId] || [];
      inner =
        (question ? '<p class="wdb-tab-panel__intro">' + escapeHtml(question) + "</p>" : "") +
        '<div class="wdb-tab-panel-inner wdb-grid" data-wds-dashboard-grid="' + escapeHtml(tabId) + '">';
      ids.forEach(function (wid) {
        var def = getDef(wid);
        if (def) inner += renderWidgetSafe(def, ctx, settings);
      });
      inner += "</div>";
      if (!ids.length) {
        inner = '<p class="wdb-tab-panel__empty">Nothing to show in this tab.</p>';
      }
    }
    return (
      '<div class="wdb-recovery-panel' + (on ? " is-active" : "") +
        '" role="tabpanel" id="wdb-panel-' + escapeHtml(tabId) +
        '" aria-labelledby="wdb-tab-btn-' + escapeHtml(tabId) +
        '" data-wdb-tab-panel="' + escapeHtml(tabId) +
        '" data-wdb-mounted="' +
        (tabId === "today" || tabId === "alerts" || tabId === "settings" ? "1" : "0") +
        '"' +
        (on ? "" : " hidden") + ">" +
        inner +
      "</div>"
    );
  }

  function renderDashboard(options) {
    options = options || {};
    var S = global.WDS && global.WDS.dashboardSettings;
    var settings = options.settings || (S && S.load()) || { widgets: {} };
    var DE = global.WDS && global.WDS.dashboardEngine;
    var ctx = DE && DE.buildContext ? DE.buildContext(options) : {
      platform: options.platform || null,
      bundle: options.bundle || {},
      location: options.location || null
    };
    var active = readStoredTab();
    var TS = global.WDS && global.WDS.todaySummary;
    var summaryHtml = TS && TS.render ? TS.render(ctx) : "";

    var panels = TABS.map(function (t) {
      return renderPanel(t.id, active, ctx, settings);
    }).join("");

    mark("wdb-structure-html");

    return (
      '<div class="wdb-recovery" data-wdb-recovery>' +
        summaryHtml +
        renderTablist(active) +
        '<div class="wdb-recovery-panels">' + panels + "</div>" +
      "</div>"
    );
  }

  function activePanel(root) {
    return root && root.querySelector(".wdb-recovery-panel.is-active");
  }

  function ensurePanelMounted(root, panel, options) {
    if (!panel || !root) return Promise.resolve();
    var tabId = panel.getAttribute("data-wdb-tab-panel");
    if (tabId === "today" || tabId === "alerts" || tabId === "settings") {
      panel.setAttribute("data-wdb-mounted", "1");
      return Promise.resolve();
    }
    if (panel.getAttribute("data-wdb-mounted") === "1") {
      return Promise.resolve();
    }
    var DE = global.WDS && global.WDS.dashboardEngine;
    if (!DE || !DE.mountWidgets) {
      panel.setAttribute("data-wdb-mounted", "1");
      return Promise.resolve();
    }
    mark("wdb-tab-mount-start-" + tabId);
    // Mount only within this panel to avoid touching other tabs
    return DE.mountWidgets(panel, options).then(function () {
      panel.setAttribute("data-wdb-mounted", "1");
      mark("wdb-tab-mount-end-" + tabId);
      measure("wdb-tab-mount-" + tabId, "wdb-tab-mount-start-" + tabId, "wdb-tab-mount-end-" + tabId);
    }).catch(function () {
      panel.setAttribute("data-wdb-mounted", "1");
    });
  }

  function switchTab(root, tabId, options) {
    if (!root || !tabId) return;
    var buttons = root.querySelectorAll("[data-wdb-tab]");
    var panels = root.querySelectorAll("[data-wdb-tab-panel]");
    buttons.forEach(function (btn) {
      var on = btn.getAttribute("data-wdb-tab") === tabId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.setAttribute("tabindex", on ? "0" : "-1");
    });
    var target = null;
    panels.forEach(function (panel) {
      var on = panel.getAttribute("data-wdb-tab-panel") === tabId;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
      if (on) target = panel;
    });
    storeTab(tabId);
    ensurePanelMounted(root, target, options || root._wdbMountOpts || {});
  }

  function bind(root, options) {
    if (!root) return;
    var host = root.querySelector("[data-wdb-recovery]") || root;
    if (host._wdbRecoveryBound) return;
    host._wdbRecoveryBound = true;

    host.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-wdb-tab]");
      if (!btn || !host.contains(btn)) return;
      e.preventDefault();
      switchTab(root, btn.getAttribute("data-wdb-tab"), options || root._wdbMountOpts);
      btn.focus();
    });

    host.addEventListener("keydown", function (e) {
      var tablist = e.target.closest("[data-wdb-tablist]");
      if (!tablist || !host.contains(tablist)) return;
      var buttons = Array.prototype.slice.call(tablist.querySelectorAll("[data-wdb-tab]"));
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var next = i;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % buttons.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = buttons.length - 1;
      else return;
      e.preventDefault();
      buttons[next].focus();
      switchTab(root, buttons[next].getAttribute("data-wdb-tab"), options || root._wdbMountOpts);
    });

    // Mount active detail tab only (Today/Alerts need no specialty mount)
    var panel = activePanel(host);
    ensurePanelMounted(root, panel, options || root._wdbMountOpts);
    mark("wdb-recovery-bound");
  }

  /**
   * After full HTML refresh, mount only the visible tab's specialty widgets.
   * Replaces eager mountAll across the entire dashboard.
   */
  function mountRecovery(root, options) {
    bind(root, options);
    var panel = activePanel(root.querySelector("[data-wdb-recovery]") || root);
    return ensurePanelMounted(root, panel, options);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRecovery = {
    isEnabled: isEnabled,
    TABS: TABS,
    renderDashboard: renderDashboard,
    bind: bind,
    switchTab: switchTab,
    mountRecovery: mountRecovery,
    mark: mark,
    measure: measure
  };
})(window);
