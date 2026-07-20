/**
 * Dashboard Version 2 — customizable category widgets + Waypoint’s Take.
 * Feature flag: localStorage waypoint-dashboard-v2 (default on; set "0" for V1-only shell).
 * Dashboard and Kiosk share WDS.dashboardV2Engine for prefs / registry / trust / cache.
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
    var Prefs = global.WDS && global.WDS.dashboardV2Prefs;
    var Take = global.WDS && global.WDS.dashboardV2Take;
    var Trust = global.WDS && global.WDS.dashboardV2Trust;
    if (!Model) return null;

    var prefs = Prefs && Prefs.load ? Prefs.load() : {};
    var model = Model.normalizeFromContext(ctx);
    var selectedIds = Prefs && Prefs.selectedIds ? Prefs.selectedIds(prefs) : [];

    var take = Take && Take.generateWaypointsTake
      ? Take.generateWaypointsTake({
          model: model,
          weather: model.weather,
          hourly: model.weather.hourly,
          alerts: model.alerts,
          astronomy: { daylight: model.daylight, moon: model.moon },
          photography: model.photography,
          airQuality: model.air,
          uv: model.weather.current && model.weather.current.uv,
          rivers: model.rivers,
          seasonal: { season: model.season },
          trust: model.provider.trust,
          location: model.location,
          currentTime: new Date()
        })
      : { bullets: [], trustNote: null };

    if (Trust && Trust.writeCache && model.weather.live) {
      Trust.writeCache(model, { take: take });
    }

    return {
      model: model,
      prefs: prefs,
      selectedIds: selectedIds,
      take: take,
      providers: Trust && Trust.providerRows ? Trust.providerRows(model) : []
    };
  }

  function render(ctx, opts) {
    if (!isEnabled()) return "";
    var V3 = global.WDS && global.WDS.dashboardV3;
    if (V3 && V3.isEnabled && V3.isEnabled() && V3.render) {
      return V3.render(ctx, opts || {});
    }
    var Engine = global.WDS && global.WDS.dashboardV2Engine;
    if (Engine && Engine.renderBoard) {
      return Engine.renderBoard(ctx, opts || {});
    }
    var payload = buildPayload(ctx);
    if (!payload) return "";
    var R = global.WDS && global.WDS.dashboardV2Render;
    if (!R) return "";
    var kiosk = !!(opts && opts.kiosk);

    return (
      '<div class="wdb-v2' + (kiosk ? " wdb-v2--kiosk" : "") +
        '" data-wdb-v2 data-dashboard-version="2" data-wdb-v2-layout="widgets">' +
        R.renderHeader(payload.model, { kiosk: kiosk }) +
        '<a class="wdb-v2-jump" href="#wdb-v2-take-title">Skip to Waypoint’s Take</a>' +
        R.renderWidgets(payload.model, payload.selectedIds) +
        R.renderWaypointsTake(payload.take) +
        R.renderTrust(payload.providers) +
      "</div>"
    );
  }

  function refresh(root) {
    if (!root) return;
    var host = root.querySelector("[data-wdb-v3]") || root.querySelector("[data-wdb-v2]");
    if (!host) return;
    var DE = global.WDS && global.WDS.dashboardEngine;
    var opts = root._wdbMountOpts || {};
    var ctx = DE && DE.buildContext
      ? DE.buildContext(opts)
      : { platform: opts.platform || null, location: opts.location || null, bundle: opts.bundle || {} };
    var Engine = global.WDS && global.WDS.dashboardV2Engine;
    var kiosk = Engine && Engine.isKioskMode ? Engine.isKioskMode() : false;
    var html = render(ctx, { kiosk: kiosk });
    if (!html) return;
    var payload = buildPayload(ctx);
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var next = tmp.firstElementChild;
    host.replaceWith(next);
    root._wdbV2Model = payload && payload.model;
    bind(root);
    var Custom = global.WDS && global.WDS.dashboardV2Customize;
    if (Custom && Custom.bind) Custom.bind(root);
    var V3 = global.WDS && global.WDS.dashboardV3;
    if (V3 && V3.bind) V3.bind(root);
  }

  function toggleKiosk() {
    var Engine = global.WDS && global.WDS.dashboardV2Engine;
    var entering = !(document.fullscreenElement);
    try {
      if (entering) {
        if (Engine && Engine.setKioskMode) Engine.setKioskMode(true);
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        if (Engine && Engine.setKioskMode) Engine.setKioskMode(false);
      }
    } catch (e) {
      if (Engine && Engine.setKioskMode) Engine.setKioskMode(entering);
    }
  }

  function bind(root) {
    if (!root) return;
    var host = root.querySelector("[data-wdb-v3]") || root.querySelector("[data-wdb-v2]");
    if (!host) return;

    var payloadModel = null;
    try {
      var DE = global.WDS && global.WDS.dashboardEngine;
      var opts = root._wdbMountOpts || {};
      var ctx = DE && DE.buildContext
        ? DE.buildContext(opts)
        : { platform: opts.platform || null, location: opts.location || null };
      var payload = buildPayload(ctx);
      payloadModel = payload && payload.model;
      root._wdbV2Model = payloadModel;
    } catch (err) { /* noop */ }

    if (host._wdbV2Bound) return;
    host._wdbV2Bound = true;

    var Custom = global.WDS && global.WDS.dashboardV2Customize;
    if (Custom && Custom.bind) Custom.bind(root);
    var V3 = global.WDS && global.WDS.dashboardV3;
    if (V3 && V3.bind) V3.bind(root);

    if (!document._wdbV2FsBound) {
      document._wdbV2FsBound = true;
      document.addEventListener("fullscreenchange", function () {
        var Engine = global.WDS && global.WDS.dashboardV2Engine;
        if (!Engine || !Engine.setKioskMode) return;
        if (!document.fullscreenElement) Engine.setKioskMode(false);
        else Engine.setKioskMode(true);
      });
    }

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
            } catch (err2) { /* noop */ }
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

      if (e.target.closest("#wdb-v2-kiosk")) {
        e.preventDefault();
        toggleKiosk();
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2 = {
    VERSION: "2.2.0",
    FLAG_KEY: FLAG_KEY,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    buildPayload: buildPayload,
    render: render,
    refresh: refresh,
    bind: bind,
    toggleKiosk: toggleKiosk
  };
})(window);
