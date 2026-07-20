/**
 * Dashboard V3 — Kiosk / fullscreen outdoor display controller.
 * Same data model as the dashboard. Auto-refresh, live clock, sticky Brief,
 * minimal chrome. Layout rotation architecture is ready; full rotation is opt-in.
 */
(function (global) {
  "use strict";

  var VERSION = "3.1.0";
  var REFRESH_MS = 5 * 60 * 1000;
  var CLOCK_MS = 1000;
  var ROTATION_MS = 90 * 1000;
  var ROTATION_FLAG = "waypoint-dashboard-v3-kiosk-rotate";
  var REFRESH_FLAG = "waypoint-dashboard-v3-kiosk-refresh-ms";

  var state = {
    active: false,
    clockTimer: null,
    refreshTimer: null,
    rotationTimer: null,
    root: null,
    bound: false,
    rotationIndex: 0
  };

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }

  function refreshIntervalMs() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(REFRESH_FLAG);
      var n = raw ? parseInt(raw, 10) : REFRESH_MS;
      if (!isFinite(n) || n < 60000) return REFRESH_MS;
      return n;
    } catch (e) {
      return REFRESH_MS;
    }
  }

  function rotationEnabled() {
    try {
      var v = global.localStorage && global.localStorage.getItem(ROTATION_FLAG);
      return v === "1";
    } catch (e) {
      return false;
    }
  }

  function setRotationEnabled(on) {
    try {
      if (global.localStorage) {
        if (on) global.localStorage.setItem(ROTATION_FLAG, "1");
        else global.localStorage.removeItem(ROTATION_FLAG);
      }
    } catch (e) { /* noop */ }
    return !!on;
  }

  /**
   * Named layout presets for future kiosk rotation.
   * Sprint 5 ships architecture + manual apply; auto-rotate is opt-in via flag.
   */
  function applyPreset(presetId) {
    /* Prefer named saved layouts from Sprint 2+ when present */
    var Layouts = api("dashboardV3Layouts");
    if (Layouts && Layouts.apply && (presetId === "daily-brief" || (Layouts.get && Layouts.get(presetId)))) {
      try {
        return Layouts.apply(presetId);
      } catch (e0) { /* fall through */ }
    }
    var Layout = api("dashboardV3Layout");
    if (!Layout || !Layout.load || !Layout.save) return null;
    var Prefs = api("dashboardV2Prefs");
    var ids = Prefs && Prefs.selectedIds ? Prefs.selectedIds(Prefs.load()) : [];
    var layout = Layout.load(ids);
    var preset = layoutPresets().filter(function (p) {
      return p.id === presetId;
    })[0];
    if (!preset) return layout;
    layout.densify = preset.densify;
    layout.groupByCategory = preset.groupByCategory;
    Layout.save(layout);
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-v3-kiosk-preset", { detail: { preset: preset, layout: layout } })
      );
    } catch (e) { /* noop */ }
    return layout;
  }

  function layoutPresets() {
    var Layouts = api("dashboardV3Layouts");
    if (Layouts && Layouts.presets) {
      try {
        var named = Layouts.presets();
        if (named && named.length) {
          return named.map(function (p) {
            return {
              id: p.id,
              label: p.name || p.label || p.id,
              densify: p.densify || "comfortable",
              groupByCategory: p.groupByCategory !== false
            };
          });
        }
      } catch (e) { /* fall through */ }
    }
    return [
      {
        id: "brief-first",
        label: "Brief first",
        densify: "comfortable",
        groupByCategory: true
      },
      {
        id: "dense-conditions",
        label: "Dense conditions",
        densify: "compact",
        groupByCategory: true
      },
      {
        id: "flat-grid",
        label: "Flat grid",
        densify: "comfortable",
        groupByCategory: false
      }
    ];
  }

  function rotateLayout() {
    if (reducedMotion()) return;
    var presets = layoutPresets();
    if (!presets.length) return;
    state.rotationIndex = (state.rotationIndex + 1) % presets.length;
    applyPreset(presets[state.rotationIndex].id);
    var root = state.root;
    var V2 = api("dashboardV2");
    if (root && V2 && V2.refresh) V2.refresh(root);
  }

  function formatClock(now) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
  }

  function formatDate(now) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(now);
  }

  function tickClock() {
    var host = state.root && (state.root.querySelector("[data-wdb-v3]") || state.root.querySelector("[data-wdb-v2]"));
    if (!host) return;
    var now = new Date();
    var clock = host.querySelector("[data-wdb-v3-clock]");
    var dateEl = host.querySelector("[data-wdb-v3-clock-date]");
    if (clock) {
      var next = formatClock(now);
      if (clock.textContent !== next) clock.textContent = next;
      if (clock.getAttribute("datetime") !== now.toISOString()) {
        clock.setAttribute("datetime", now.toISOString());
      }
    }
    if (dateEl) {
      var d = formatDate(now);
      if (dateEl.textContent !== d) dateEl.textContent = d;
    }
  }

  function isHidden() {
    try {
      return !!(global.document && document.hidden);
    } catch (e) {
      return false;
    }
  }

  function requestDataRefresh() {
    if (isHidden()) return;
    if (global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.refresh) {
      global.WDS.outdoorIntelligence.refresh({ force: true });
    } else {
      var V2 = api("dashboardV2");
      if (state.root && V2 && V2.refresh) V2.refresh(state.root);
    }
  }

  function updateConnectivityBanner() {
    var host = state.root && (state.root.querySelector("[data-wdb-v3]") || state.root.querySelector("[data-wdb-v2]"));
    if (!host) return;
    var banner = host.querySelector("[data-wdb-v3-connectivity]");
    if (!banner) return;
    var Rel = api("dashboardReliability");
    var online = Rel && Rel.isOnline ? Rel.isOnline() : (typeof navigator === "undefined" || navigator.onLine !== false);
    banner.hidden = !!online;
    banner.setAttribute("data-state", online ? "online" : "offline");
    if (!online) {
      banner.textContent = "Offline — showing cached outdoor readings when available. Reconnect to refresh.";
    }
  }

  function clearTimers() {
    if (state.clockTimer) {
      clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
    if (state.rotationTimer) {
      clearInterval(state.rotationTimer);
      state.rotationTimer = null;
    }
  }

  function startTimers() {
    clearTimers();
    tickClock();
    state.clockTimer = setInterval(tickClock, CLOCK_MS);
    state.refreshTimer = setInterval(requestDataRefresh, refreshIntervalMs());
    if (rotationEnabled() && !reducedMotion()) {
      state.rotationTimer = setInterval(rotateLayout, ROTATION_MS);
    }
  }

  function setDocumentKiosk(on) {
    try {
      if (document && document.documentElement) {
        document.documentElement.classList.toggle("wdb-v3-kiosk", !!on);
        document.documentElement.classList.toggle("wdb-v2-kiosk", !!on);
        document.documentElement.setAttribute("data-wdb-kiosk", on ? "1" : "0");
      }
    } catch (e) { /* noop */ }
  }

  function onKeydown(e) {
    if (!state.active) return;
    if (e.key === "Escape") {
      var V2 = api("dashboardV2");
      if (V2 && V2.toggleKiosk && document.fullscreenElement) {
        e.preventDefault();
        V2.toggleKiosk();
      }
    }
  }

  function onVisibility() {
    if (!state.active) return;
    if (isHidden()) return;
    tickClock();
    updateConnectivityBanner();
  }

  function onOnline() {
    updateConnectivityBanner();
    if (state.active) requestDataRefresh();
  }

  function onOffline() {
    updateConnectivityBanner();
  }

  function onKioskModeChange(e) {
    var on = !!(e && e.detail && e.detail.kiosk);
    if (on) activate(state.root);
    else deactivate();
  }

  function bindGlobal() {
    if (state.bound) return;
    state.bound = true;
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("visibilitychange", onVisibility);
    global.addEventListener("online", onOnline);
    global.addEventListener("offline", onOffline);
    global.addEventListener("wds:dashboard-kiosk-change", onKioskModeChange);
  }

  function unbindGlobal() {
    if (!state.bound) return;
    state.bound = false;
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("visibilitychange", onVisibility);
    global.removeEventListener("online", onOnline);
    global.removeEventListener("offline", onOffline);
    global.removeEventListener("wds:dashboard-kiosk-change", onKioskModeChange);
  }

  function activate(root) {
    state.root = root || state.root || document;
    state.active = true;
    setDocumentKiosk(true);
    bindGlobal();
    startTimers();
    updateConnectivityBanner();
    tickClock();
    try {
      global.dispatchEvent(new CustomEvent("wds:dashboard-v3-kiosk-active", { detail: { active: true } }));
    } catch (e) { /* noop */ }
  }

  function deactivate() {
    state.active = false;
    clearTimers();
    setDocumentKiosk(false);
    try {
      global.dispatchEvent(new CustomEvent("wds:dashboard-v3-kiosk-active", { detail: { active: false } }));
    } catch (e) { /* noop */ }
  }

  /**
   * Attach to a dashboard recovery/root host. Safe to call repeatedly.
   */
  function bind(root) {
    state.root = root || state.root || document;
    bindGlobal();
    var Engine = api("dashboardV2Engine");
    var on = Engine && Engine.isKioskMode ? Engine.isKioskMode() : false;
    if (on) activate(state.root);
    else updateConnectivityBanner();
  }

  function unbind() {
    deactivate();
    unbindGlobal();
    state.root = null;
  }

  function isActive() {
    return !!state.active;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Kiosk = {
    VERSION: VERSION,
    REFRESH_MS: REFRESH_MS,
    ROTATION_MS: ROTATION_MS,
    ROTATION_FLAG: ROTATION_FLAG,
    layoutPresets: layoutPresets,
    applyPreset: applyPreset,
    rotateLayout: rotateLayout,
    rotationEnabled: rotationEnabled,
    setRotationEnabled: setRotationEnabled,
    activate: activate,
    deactivate: deactivate,
    bind: bind,
    unbind: unbind,
    isActive: isActive,
    tickClock: tickClock,
    updateConnectivityBanner: updateConnectivityBanner,
    requestDataRefresh: requestDataRefresh
  };
})(window);
