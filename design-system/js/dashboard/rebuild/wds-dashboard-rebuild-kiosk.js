/**
 * Dashboard Rebuild — internal glance / auto-refresh framework.
 * Kept for hash/deep-link and tests; not user-facing (Workspace is canonical).
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var DEFAULT_REFRESH_MS = 5 * 60 * 1000;
  var state = {
    active: false,
    refreshTimer: null,
    onRefresh: null,
    root: null
  };

  function Prefs() {
    return global.WDS && global.WDS.dashboardRebuildPrefs;
  }

  function refreshMs() {
    var prefs = Prefs() && Prefs().load ? Prefs().load() : null;
    var n = prefs && prefs.kioskRefreshMs;
    if (!isFinite(n) || n < 60000) return DEFAULT_REFRESH_MS;
    return n;
  }

  function reducedMotion() {
    try {
      return !!(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function setDocumentFlags(on) {
    var root = global.document && global.document.documentElement;
    if (!root) return;
    if (on) {
      root.setAttribute("data-wdb-r-kiosk", "true");
      root.classList.add("wdb-r-kiosk");
    } else {
      root.removeAttribute("data-wdb-r-kiosk");
      root.classList.remove("wdb-r-kiosk");
    }
  }

  function clearTimers() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
  }

  function startRefresh() {
    clearTimers();
    if (!state.active) return;
    var ms = refreshMs();
    state.refreshTimer = setInterval(function () {
      if (global.document && global.document.hidden) return;
      if (typeof state.onRefresh === "function") {
        try {
          state.onRefresh({ reason: "kiosk-timer", at: Date.now() });
        } catch (e) {
          /* noop */
        }
      }
      try {
        global.dispatchEvent(
          new CustomEvent("wds:dashboard-rebuild-kiosk-refresh", {
            detail: { at: Date.now() }
          })
        );
      } catch (e2) {
        /* noop */
      }
    }, ms);
  }

  function enter(options) {
    options = options || {};
    state.active = true;
    state.onRefresh = options.onRefresh || null;
    state.root = options.root || null;
    setDocumentFlags(true);
    if (state.root) state.root.setAttribute("data-kiosk", "true");
    /* Apply kiosk layout prefs when requested — does not invent data. */
    if (options.applyPreset !== false && Prefs() && Prefs().applyPreset) {
      try {
        Prefs().applyPreset("kiosk");
      } catch (e) {
        /* noop */
      }
    }
    startRefresh();
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-rebuild-kiosk", {
          detail: { active: true, refreshMs: refreshMs() }
        })
      );
    } catch (e2) {
      /* noop */
    }
    return { active: true, refreshMs: refreshMs(), reducedMotion: reducedMotion() };
  }

  function exit() {
    state.active = false;
    state.onRefresh = null;
    clearTimers();
    setDocumentFlags(false);
    if (state.root) {
      state.root.removeAttribute("data-kiosk");
      state.root = null;
    }
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-rebuild-kiosk", {
          detail: { active: false }
        })
      );
    } catch (e) {
      /* noop */
    }
    return { active: false };
  }

  function isActive() {
    return !!state.active;
  }

  /**
   * Layout constraints for kiosk presentation (framework only).
   */
  function constraints() {
    return {
      hideCustomize: true,
      largeType: true,
      lowChrome: true,
      requirePresetPlace: true,
      noLocationPrompt: true,
      refreshMs: refreshMs(),
      pauseWhenHidden: true
    };
  }

  /**
   * No user-facing Kiosk chrome — Workspace is the only public mode label.
   * Internal mode still applies constraints / refresh via enter().
   */
  function renderChrome() {
    return "";
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildKiosk = {
    version: "1.0.0-rc3",
    enter: enter,
    exit: exit,
    isActive: isActive,
    constraints: constraints,
    renderChrome: renderChrome,
    refreshMs: refreshMs,
    DEFAULT_REFRESH_MS: DEFAULT_REFRESH_MS
  };
})(typeof window !== "undefined" ? window : global);
