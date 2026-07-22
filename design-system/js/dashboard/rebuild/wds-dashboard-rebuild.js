/**
 * Dashboard Rebuild — product shell (Phase 1).
 * Workspace + Today Outside + Customize + Kiosk routing — no live widgets.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + 06-routing.md
 */
(function (global) {
  "use strict";

  var VERSION = "1.1.0-phase1-polish";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
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

  function renderShell(options) {
    options = options || {};
    var view = options.view || "workspace";
    var ctx = options.placeContext || {};
    var Today = api("dashboardRebuildToday");
    var Workspace = api("dashboardRebuildWorkspace");
    var Customize = api("dashboardRebuildCustomize");
    var Kiosk = api("dashboardRebuildKiosk");
    var Prefs = api("dashboardRebuildPrefs");
    var prefs = Prefs && Prefs.load ? Prefs.load() : null;
    var kioskActive = view === "kiosk";

    var todayHtml =
      Today && Today.render
        ? Today.render({
            placeLabel: ctx.placeLabel || ctx.displayTitle || ctx.name,
            trust: ctx.trust || (ctx.source === "pending" ? "pending" : "unavailable"),
            now: options.now
          })
        : "";

    var mainHtml = "";
    if (view === "customize") {
      mainHtml =
        Customize && Customize.render
          ? Customize.render({ prefs: prefs })
          : "";
    } else {
      mainHtml =
        (kioskActive && Kiosk && Kiosk.renderChrome ? Kiosk.renderChrome() : "") +
        (Workspace && Workspace.renderWorkspace
          ? Workspace.renderWorkspace({
              prefs: prefs,
              customize: false
            })
          : "");
    }

    /* Local nav (Workspace · Customize · Kiosk) lives in app shell — no duplicate bar. */
    return (
      '<div class="wdb-r" data-wdb-r data-view="' +
      escapeHtml(view) +
      '"' +
      (kioskActive ? ' data-kiosk="true"' : "") +
      ">" +
      todayHtml +
      mainHtml +
      "</div>"
    );
  }

  var mountState = {
    host: null,
    view: "workspace",
    placeContext: null,
    bound: false
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
            paint();
          }
        });
      }
    } else if (Kiosk.isActive()) {
      Kiosk.exit();
    }
  }

  function paint() {
    if (!mountState.host) return;
    var html = renderShell({
      view: mountState.view,
      placeContext: mountState.placeContext || {},
      now: new Date()
    });
    mountState.host.innerHTML = html;
    mountState.host.removeAttribute("aria-busy");
    mountState.host.classList.add("wdb-r-ready");
    applyKioskMode(mountState.view);
    var Customize = api("dashboardRebuildCustomize");
    if (mountState.view === "customize" && Customize && Customize.bind) {
      Customize.bind(mountState.host, function () {
        paint();
      });
    }
    try {
      global.dispatchEvent(
        new CustomEvent("wds:dashboard-rebuild-paint", {
          detail: { view: mountState.view, version: VERSION }
        })
      );
    } catch (e) {
      /* noop */
    }
  }

  function setView(view) {
    mountState.view = parseView(view === "workspace" || view === "customize" || view === "kiosk" ? "#/" + (view === "workspace" ? "" : view) : view);
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
    paint();
  }

  function setPlaceContext(ctx) {
    mountState.placeContext = ctx || null;
    paint();
  }

  function onHashChange() {
    var next = parseView();
    if (next !== mountState.view) {
      mountState.view = next;
      paint();
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
    mountState.view = parseView(options.view || (global.location && global.location.hash) || "#/");
    bindRouting();
    paint();
    return host.querySelector("[data-wdb-r]");
  }

  function unmount() {
    var Kiosk = api("dashboardRebuildKiosk");
    if (Kiosk && Kiosk.isActive()) Kiosk.exit();
    if (mountState.host) {
      mountState.host.innerHTML = "";
      mountState.host = null;
    }
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
    paint: paint,
    getView: function () {
      return mountState.view;
    }
  };
})(typeof window !== "undefined" ? window : global);
