/**
 * Dashboard Rebuild — product shell (Phase 3).
 * Workspace + Today Outside + library Customize; OIP hydrates live widgets.
 * Internal glance mode (#/kiosk) retained without user-facing Kiosk chrome.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + 06-routing.md
 */
(function (global) {
  "use strict";

  var VERSION = "4.1.0-rc3-s2-refinement";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function ensureCustomizeDraft(view) {
    var Prefs = api("dashboardRebuildPrefs");
    if (!Prefs) return;
    if (view === "customize") {
      if (Prefs.beginDraft && (!Prefs.isDrafting || !Prefs.isDrafting())) {
        Prefs.beginDraft();
      }
    } else if (Prefs.isDrafting && Prefs.isDrafting() && Prefs.discardDraft) {
      /* Leaving customize without Save discards unsaved draft. */
      Prefs.discardDraft();
    }
  }

  function focusCustomizeEntry(host) {
    if (!host || typeof host.querySelector !== "function") return;
    var entry = host.querySelector("[data-wdb-r-customize-entry]");
    if (entry && typeof entry.focus === "function") {
      try {
        entry.focus({ preventScroll: true });
      } catch (e) {
        try {
          entry.focus();
        } catch (e2) {
          /* noop */
        }
      }
    }
  }

  function prefersReducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }

  function parseView(hash) {
    hash = String(hash == null ? (global.location && global.location.hash) || "" : hash);
    hash = hash.replace(/^#/, "");
    if (!hash || hash === "/" || hash === "workspace") return "workspace";
    if (hash === "/customize" || hash === "customize") return "customize";
    if (hash === "/kiosk" || hash === "kiosk") return "kiosk";
    if (hash.indexOf("customize") >= 0) return "customize";
    if (hash.indexOf("kiosk") >= 0) return "kiosk";
    return "workspace";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function todayContext(options) {
    options = options || {};
    var ctx = options.placeContext || {};
    var platform = options.platform || null;
    var Data = api("dashboardRebuildData");
    var Prefs = api("dashboardRebuildPrefs");
    var interests =
      options.interests ||
      (Prefs && Prefs.load ? Prefs.load().interests : null);
    var pack =
      Data && Data.fromPlatform
        ? Data.fromPlatform(platform, ctx, { now: options.now, interests: interests })
        : null;
    var trust = ctx.trust || "waiting";
    var lines = null;
    if (pack && pack.today) {
      trust = pack.today.trust || trust;
      lines = pack.today.lines;
    }
    if (!platform && (trust === "pending" || ctx.source === "pending")) trust = "waiting";
    return {
      placeLabel: ctx.placeLabel || ctx.displayTitle || ctx.name,
      trust: trust,
      now: options.now,
      lines: lines,
      platform: platform,
      interests: interests,
      /* Reuse brief from fromPlatform — avoid a second generate() on render. */
      intelligence: pack && pack.today ? pack.today.intelligence : null
    };
  }

  function renderShell(options) {
    options = options || {};
    var view = options.view || "workspace";
    var ctx = options.placeContext || {};
    var platform = options.platform || null;
    var Today = api("dashboardRebuildToday");
    var Workspace = api("dashboardRebuildWorkspace");
    var Customize = api("dashboardRebuildCustomize");
    var Kiosk = api("dashboardRebuildKiosk");
    var Prefs = api("dashboardRebuildPrefs");
    var prefs = Prefs && Prefs.load ? Prefs.load() : null;
    var kioskActive = view === "kiosk";
    var lazy = options.lazy === true;
    var animate = options.animate === true && !prefersReducedMotion();

    var todayHtml =
      Today && Today.render ? Today.render(todayContext(options)) : "";

    var mainHtml = "";
    if (view === "customize") {
      mainHtml =
        Customize && Customize.render
          ? Customize.render({
              prefs: prefs,
              platform: platform,
              libraryFilter:
                options.libraryFilter ||
                (Customize.getLibraryFilter && Customize.getLibraryFilter()) ||
                "all",
              animate: animate
            })
          : "";
    } else {
      mainHtml =
        (kioskActive && Kiosk && Kiosk.renderChrome ? Kiosk.renderChrome() : "") +
        (Workspace && Workspace.renderWorkspace
          ? Workspace.renderWorkspace({
              prefs: prefs,
              customize: false,
              platform: platform,
              lazy: lazy,
              animate: animate
            })
          : "");
    }

    var deepenHtml = "";
    if (view === "workspace") {
      var Deepen = api("dashboardRebuildDeepeners");
      deepenHtml = Deepen && Deepen.render ? Deepen.render() : "";
    }

    /* Local nav (Workspace · Customize) lives in app shell — no duplicate bar. */
    return (
      '<div class="wdb-r" data-wdb-r data-view="' +
      escapeHtml(view) +
      '"' +
      (kioskActive ? ' data-kiosk="true"' : "") +
      (platform ? ' data-hydrated="true"' : "") +
      ">" +
      todayHtml +
      mainHtml +
      deepenHtml +
      "</div>"
    );
  }

  var mountState = {
    host: null,
    view: "workspace",
    placeContext: null,
    platform: null,
    bound: false,
    libraryFilter: "all"
  };

  function applyKioskMode(view) {
    var Kiosk = api("dashboardRebuildKiosk");
    if (!Kiosk) return;
    if (view === "kiosk") {
      if (!Kiosk.isActive()) {
        Kiosk.enter({
          root: mountState.host && mountState.host.querySelector("[data-wdb-r]"),
          applyPreset: false,
          onRefresh: function () {
            try {
              var OIP = api("outdoorIntelligence");
              if (OIP && OIP.refresh) OIP.refresh();
              else paint();
            } catch (e) {
              paint();
            }
          }
        });
      }
    } else if (Kiosk.isActive()) {
      Kiosk.exit();
    }
  }

  function paint(options) {
    options = options || {};
    if (!mountState.host) return;
    ensureCustomizeDraft(mountState.view);
    var animate = options.animate !== false && !prefersReducedMotion();
    var html = renderShell({
      view: mountState.view,
      placeContext: mountState.placeContext || {},
      platform: mountState.platform || null,
      now: new Date(),
      lazy: mountState.view !== "customize",
      animate: animate,
      libraryFilter: mountState.libraryFilter
    });
    mountState.host.innerHTML = html;
    mountState.host.removeAttribute("aria-busy");
    mountState.host.classList.add("wdb-r-ready");
    if (animate) {
      if (mountState.host.classList && typeof mountState.host.classList.add === "function") {
        mountState.host.classList.add("wdb-r--settling");
      }
      var clearSettling = function () {
        if (!mountState.host || !mountState.host.classList) return;
        if (typeof mountState.host.classList.remove === "function") {
          mountState.host.classList.remove("wdb-r--settling");
        }
      };
      if (typeof global.requestAnimationFrame === "function") {
        global.requestAnimationFrame(clearSettling);
      } else {
        clearSettling();
      }
    }
    applyKioskMode(mountState.view);
    var Customize = api("dashboardRebuildCustomize");
    var Workspace = api("dashboardRebuildWorkspace");
    if (mountState.view === "customize" && Customize && Customize.bind) {
      Customize.bind(mountState.host, function (_next, meta) {
        if (meta && meta.filter) mountState.libraryFilter = meta.filter;
        if (meta && meta.navigate === "workspace") {
          setView("workspace");
          if (typeof global.requestAnimationFrame === "function") {
            global.requestAnimationFrame(function () {
              focusCustomizeEntry(mountState.host);
            });
          } else {
            focusCustomizeEntry(mountState.host);
          }
          return;
        }
        paint({ animate: true });
      });
    }
    if (Workspace && Workspace.bindLazy && mountState.view !== "customize") {
      Workspace.bindLazy(mountState.host, { platform: mountState.platform || null });
    }
    if (mountState.view === "workspace") {
      var Deepen = api("dashboardRebuildDeepeners");
      if (Deepen && Deepen.bind) {
        Deepen.bind(mountState.host, {});
      }
    }
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-rebuild-paint", {
          detail: {
            view: mountState.view,
            version: VERSION,
            hydrated: !!mountState.platform
          }
        })
      );
    } catch (e) {
      /* noop */
    }
  }

  function setView(view) {
    var nextView = parseView(
      view === "workspace" || view === "customize" || view === "kiosk"
        ? "#/" + (view === "workspace" ? "" : view)
        : view
    );
    mountState.view = nextView;
    if (global.history && global.location) {
      var nextHash =
        mountState.view === "workspace"
          ? "#/"
          : "#/" + mountState.view;
      if (String(global.location.hash || "") !== nextHash) {
        try {
          global.history.replaceState(null, "", nextHash);
        } catch (e) {
          global.location.hash = nextHash;
        }
      }
    }
    paint({ animate: true });
  }

  function setPlaceContext(ctx) {
    mountState.placeContext = ctx || null;
    paint();
  }

  function setPlatform(platform) {
    mountState.platform = platform || null;
    paint();
  }

  function onHashChange() {
    var next = parseView();
    if (next !== mountState.view) {
      mountState.view = next;
      paint({ animate: true });
    } else {
      applyKioskMode(next);
    }
  }

  function bindRouting() {
    if (mountState.bound) return;
    mountState.bound = true;
    global.addEventListener("hashchange", onHashChange);
  }

  function mount(host, options) {
    options = options || {};
    if (!host) return null;
    mountState.host = host;
    mountState.placeContext = options.placeContext || null;
    mountState.platform = options.platform || null;
    mountState.view = parseView(options.view || (global.location && global.location.hash) || "#/");
    mountState.libraryFilter = "all";
    bindRouting();
    paint({ animate: false });
    return host.querySelector("[data-wdb-r]");
  }

  function unmount() {
    var Kiosk = api("dashboardRebuildKiosk");
    if (Kiosk && Kiosk.isActive()) Kiosk.exit();
    if (mountState.host) {
      mountState.host.innerHTML = "";
      mountState.host = null;
    }
    mountState.platform = null;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuild = {
    version: VERSION,
    parseView: parseView,
    renderShell: renderShell,
    mount: mount,
    unmount: unmount,
    setView: setView,
    setPlaceContext: setPlaceContext,
    setPlatform: setPlatform,
    paint: paint,
    getView: function () {
      return mountState.view;
    },
    getPlatform: function () {
      return mountState.platform;
    }
  };
})(typeof window !== "undefined" ? window : global);
