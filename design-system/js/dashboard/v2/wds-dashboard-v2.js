/**
 * Dashboard Version 2 — Today Outside orchestrator.
 * Feature flag: localStorage waypoint-dashboard-v2 (default on; set "0" for V1-only shell).
 */
(function (global) {
  "use strict";

  var FLAG_KEY = "waypoint-dashboard-v2";

  function isEnabled() {
    try {
      var v = global.localStorage && global.localStorage.getItem(FLAG_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (e) { /* noop */ }
    return true;
  }

  function setEnabled(on) {
    try {
      if (global.localStorage) global.localStorage.setItem(FLAG_KEY, on ? "1" : "0");
    } catch (e2) { /* noop */ }
  }

  function buildPayload(ctx) {
    var Model = global.WDS && global.WDS.dashboardV2Model;
    var Brief = global.WDS && global.WDS.dashboardV2Briefing;
    var Act = global.WDS && global.WDS.dashboardV2Activity;
    var TL = global.WDS && global.WDS.dashboardV2Timeline;
    var Obs = global.WDS && global.WDS.dashboardV2Observe;
    var Trust = global.WDS && global.WDS.dashboardV2Trust;
    var Prefs = global.WDS && global.WDS.dashboardV2Prefs;
    if (!Model || !Brief) return null;

    var prefs = Prefs && Prefs.load ? Prefs.load() : {};
    var model = Model.normalizeFromContext(ctx);
    var cache = Trust && Trust.readCache ? Trust.readCache(model) : null;

    var briefing = Brief.build(model, prefs);
    if (!model.weather.live && cache && cache.briefing) {
      briefing = cache.briefing;
      briefing.partial = true;
    }

    var payload = {
      model: model,
      prefs: prefs,
      briefing: briefing,
      activities: Act && Act.recommend ? Act.recommend(model, prefs) : [],
      windows: Act && Act.buildWindows ? Act.buildWindows(model, prefs) : [],
      timeline: TL && TL.build ? TL.build(model) : [],
      observe: Obs && Obs.cards ? Obs.cards(model) : [],
      providers: Trust && Trust.providerRows ? Trust.providerRows(model) : []
    };

    if (Trust && Trust.writeCache && model.weather.live) {
      Trust.writeCache(model, { briefing: briefing });
    }
    return payload;
  }

  function render(ctx) {
    if (!isEnabled()) return "";
    var payload = buildPayload(ctx);
    if (!payload) return "";
    var R = global.WDS && global.WDS.dashboardV2Render;
    if (!R) return "";

    return (
      '<div class="wdb-v2" data-wdb-v2 data-dashboard-version="2">' +
        R.renderHeader(payload.model) +
        '<a class="wdb-v2-jump" href="#wdb-v2-brief-title">Skip to Today Outside briefing</a>' +
        R.renderOverviewPanels(payload.model) +
        R.renderBriefing(payload.briefing) +
        R.renderTimeline(payload.timeline) +
        R.renderWindows(payload.windows) +
        R.renderActivities(payload.activities, payload.prefs) +
        R.renderAlertsUnified(payload.model, payload.briefing) +
        R.renderRiverIntel(payload.model) +
        R.renderPhotoIntel(payload.model) +
        R.renderObserve(payload.observe) +
        R.renderTrust(payload.providers) +
      "</div>"
    );
  }

  function bind(root) {
    if (!root) return;
    var host = root.querySelector("[data-wdb-v2]");
    if (!host || host._wdbV2Bound) return;
    host._wdbV2Bound = true;

    host.addEventListener("click", function (e) {
      var tabBtn = e.target.closest("[data-wdb-v2-goto-tab]");
      if (tabBtn && host.contains(tabBtn)) {
        e.preventDefault();
        var tab = tabBtn.getAttribute("data-wdb-v2-goto-tab");
        var recovery = root.querySelector("[data-wdb-recovery]");
        var Rec = global.WDS && global.WDS.dashboardRecovery;
        if (recovery && Rec && Rec.switchTab && tab) {
          Rec.switchTab(root, tab, root._wdbMountOpts || {});
          var panelBtn = recovery.querySelector('[data-wdb-tab="' + tab + '"]');
          if (panelBtn) {
            try {
              panelBtn.focus();
            } catch (err) { /* noop */ }
          }
        }
      }

      if (e.target.closest("#wdb-v2-refresh")) {
        e.preventDefault();
        if (global.WDS && global.WDS.location && global.WDS.location.refreshLocationInBackground) {
          global.WDS.location.refreshLocationInBackground();
        }
        if (global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.refresh) {
          global.WDS.outdoorIntelligence.refresh({ force: true });
        }
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2 = {
    VERSION: "2.0.0",
    FLAG_KEY: FLAG_KEY,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    buildPayload: buildPayload,
    render: render,
    bind: bind
  };
})(window);
