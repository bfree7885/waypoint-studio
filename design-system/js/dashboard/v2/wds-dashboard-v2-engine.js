/**
 * Dashboard V2 — shared engine for Dashboard + Kiosk.
 * Single source for registry, prefs, trust, cache, take, and board payload.
 */
(function (global) {
  "use strict";

  var KIOSK_FLAG = "waypoint-dashboard-v2-kiosk";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function isKioskMode() {
    try {
      if (global.localStorage && global.localStorage.getItem(KIOSK_FLAG) === "1") return true;
    } catch (e) { /* noop */ }
    try {
      if (document && document.documentElement && document.documentElement.classList.contains("wdb-v2-kiosk")) {
        return true;
      }
      if (document && document.fullscreenElement) return true;
    } catch (e2) { /* noop */ }
    return false;
  }

  function setKioskMode(on) {
    try {
      if (global.localStorage) {
        if (on) global.localStorage.setItem(KIOSK_FLAG, "1");
        else global.localStorage.removeItem(KIOSK_FLAG);
      }
    } catch (e) { /* noop */ }
    try {
      if (document && document.documentElement) {
        document.documentElement.classList.toggle("wdb-v2-kiosk", !!on);
      }
    } catch (e2) { /* noop */ }
    return !!on;
  }

  function loadPrefs() {
    var Prefs = api("dashboardV2Prefs");
    return Prefs && Prefs.load ? Prefs.load() : { enabled: [], order: [] };
  }

  function savePrefs(prefs) {
    var Prefs = api("dashboardV2Prefs");
    return Prefs && Prefs.save ? Prefs.save(prefs) : prefs;
  }

  function selectedIds(prefs) {
    var Prefs = api("dashboardV2Prefs");
    return Prefs && Prefs.selectedIds ? Prefs.selectedIds(prefs || loadPrefs()) : [];
  }

  function buildPayload(ctx, opts) {
    opts = opts || {};
    var V2 = api("dashboardV2");
    if (V2 && V2.buildPayload) {
      var payload = V2.buildPayload(ctx);
      if (payload) {
        payload.kiosk = !!(opts.kiosk || isKioskMode());
        payload.sharedKeys = storageKeys();
      }
      return payload;
    }
    return null;
  }

  function renderBoard(ctx, opts) {
    opts = opts || {};
    var V3 = api("dashboardV3");
    if (V3 && V3.isEnabled && V3.isEnabled() && V3.render && !global.WDS._wdbV3ForceV2) {
      return V3.render(ctx, opts);
    }
    var payload = buildPayload(ctx, opts);
    if (!payload) return "";
    var R = api("dashboardV2Render");
    if (!R) return "";
    var kiosk = !!(opts.kiosk || payload.kiosk);
    return (
      '<div class="wdb-v2' +
      (kiosk ? " wdb-v2--kiosk" : "") +
      '" data-wdb-v2 data-dashboard-version="2" data-wdb-v2-layout="widgets"' +
      (kiosk ? ' data-wdb-v2-kiosk="1"' : "") +
      ">" +
        R.renderHeader(payload.model, { kiosk: kiosk }) +
        '<a class="wdb-v2-jump" href="#wdb-v2-take-title">Skip to Waypoint’s Take</a>' +
        R.renderWidgets(payload.model, payload.selectedIds) +
        R.renderWaypointsTake(payload.take) +
        R.renderTrust(payload.providers) +
      "</div>"
    );
  }

  function storageKeys() {
    var Prefs = api("dashboardV2Prefs");
    var Trust = api("dashboardV2Trust");
    return {
      widgets: Prefs && Prefs.STORAGE_KEY ? Prefs.STORAGE_KEY : "waypoint-dashboard-v2-widgets-v1",
      cache: Trust && Trust.CACHE_KEY ? Trust.CACHE_KEY : "waypoint-dashboard-v2-cache-v1",
      flag: "waypoint-dashboard-v2",
      kiosk: KIOSK_FLAG
    };
  }

  function syncSnapshot() {
    var Prefs = api("dashboardV2Prefs");
    var Trust = api("dashboardV2Trust");
    var Cat = api("dashboardV2Widgets");
    var prefs = loadPrefs();
    return {
      keys: storageKeys(),
      prefs: prefs,
      selectedIds: selectedIds(prefs),
      categories: Cat && Cat.categories ? Cat.categories().map(function (c) {
        return c.id;
      }) : [],
      cacheKey: Trust && Trust.CACHE_KEY ? Trust.CACHE_KEY : null,
      kiosk: isKioskMode()
    };
  }

  /**
   * Mount the same V2 board into an arbitrary host (Dashboard or Kiosk).
   */
  function mount(host, ctx, opts) {
    if (!host) return null;
    opts = opts || {};
    var html = renderBoard(ctx, opts);
    if (!html) return null;
    host.innerHTML = html;
    var root = host.closest("[data-wdb-recovery]") || host;
    var V2 = api("dashboardV2");
    if (V2 && V2.bind) V2.bind(root);
    return host.querySelector("[data-wdb-v2]");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Engine = {
    VERSION: "2.1.0",
    KIOSK_FLAG: KIOSK_FLAG,
    isKioskMode: isKioskMode,
    setKioskMode: setKioskMode,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    selectedIds: selectedIds,
    buildPayload: buildPayload,
    renderBoard: renderBoard,
    mount: mount,
    storageKeys: storageKeys,
    syncSnapshot: syncSnapshot
  };
})(window);
