/**
 * Dashboard Rebuild — product shell (Phase 3).
 * Workspace + Today Outside + library Customize; OIP hydrates live widgets.
 * Below-fold briefing is Dashboard-native only (no cross-product promo).
 * Internal glance mode (#/kiosk) retained without user-facing Kiosk chrome.
 * Ambient Mode (#/ambient) is a Dashboard view over a normalized snapshot.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + 06-routing.md
 * + docs/APP-SURFACE-ARCHITECTURE.md
 */
(function (global) {
  "use strict";

  var VERSION = "3.5.0-ambient-history";

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
    if (hash === "/ambient" || hash === "ambient") return "ambient";
    if (hash.indexOf("customize") >= 0) return "customize";
    if (hash.indexOf("kiosk") >= 0) return "kiosk";
    if (hash.indexOf("ambient") >= 0) return "ambient";
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
    var pack =
      Data && Data.fromPlatform ? Data.fromPlatform(platform, ctx, options.now || null) : null;
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
      intel: pack && pack.intel ? pack.intel : null,
      location: ctx
    };
  }

  function hasLiveWeather(platform) {
    var wx = platform && platform.weatherRef;
    return !!(wx && wx.meta && !wx.meta.isPlaceholder);
  }

  function renderDiscoverQuiet() {
    return (
      '<section class="wdb-r-discover-quiet" data-wdb-r-discover-quiet aria-labelledby="wdb-r-discover-quiet-title">' +
      '<p class="wdb-r-discover-quiet__kicker">Discover</p>' +
      '<h2 id="wdb-r-discover-quiet-title" class="wdb-r-discover-quiet__title">Nothing unusually strong</h2>' +
      '<p class="wdb-r-discover-quiet__lede">No significant weather, sky, or natural events are active or approaching in the near term. Live instruments are still worth a look.</p>' +
      "</section>"
    );
  }

  function eventContext(options) {
    options = options || {};
    var ctx = options.placeContext || {};
    return {
      platform: options.platform || null,
      location: ctx,
      placeContext: ctx,
      now: options.now || new Date(),
      catalog: options.catalog || null
    };
  }

  function hasUpcomingDiscoverEvents(options) {
    var Events = api("dashboardRebuildEvents");
    if (!Events || typeof Events.resolveEvents !== "function") return false;
    try {
      var list = Events.resolveEvents(eventContext(options));
      return Array.isArray(list) && list.length > 0;
    } catch (e) {
      return false;
    }
  }

  function eventsCatalogReady(options) {
    if (options && options.catalog) return true;
    var NE = api("naturalEvents");
    if (!NE) return true;
    return !!(NE.getCatalog && NE.getCatalog());
  }

  function happeningContext(options) {
    options = options || {};
    var ctx = todayContext(options);
    var signals = ctx.intel && ctx.intel.happeningNow ? ctx.intel.happeningNow : null;
    /* Prefer a clock-aligned analyze when an explicit now is supplied (tests + paint). */
    if (options.now && ctx.platform) {
      var Intel = api("dashboardRebuildIntel");
      if (Intel && typeof Intel.analyze === "function") {
        try {
          var analysis = Intel.analyze(ctx.platform, ctx.location || null, options.now);
          signals = (analysis && analysis.happeningNow) || signals;
          ctx.intel = analysis || ctx.intel;
        } catch (e) {
          /* keep pack intel */
        }
      }
    }
    return {
      platform: ctx.platform,
      intel: ctx.intel,
      signals: signals,
      now: options.now || new Date(),
      location: ctx.location,
      placeContext: options.placeContext || null
    };
  }

  var ambientHistoryPaintQueued = false;

  function queueAmbientHistoryPaint() {
    if (ambientHistoryPaintQueued) return;
    if (mountState.view !== "ambient" || !mountState.host) return;
    ambientHistoryPaintQueued = true;
    var Store = api("dashboardRebuildAmbientStore");
    if (!Store || typeof Store.hydrate !== "function") {
      ambientHistoryPaintQueued = false;
      return;
    }
    Store.hydrate().then(
      function () {
        ambientHistoryPaintQueued = false;
        if (mountState.view === "ambient" && mountState.host) paint({ animate: false });
      },
      function () {
        ambientHistoryPaintQueued = false;
      }
    );
  }

  function attachAmbientHistory(snapshot) {
    if (!snapshot) return snapshot;
    snapshot.meta = snapshot.meta || {};
    var Store = api("dashboardRebuildAmbientStore");
    var Changes = api("dashboardRebuildAmbientChanges");
    var previous = null;
    if (Store) {
      if (Store.isHydrated && Store.isHydrated()) {
        var rec = Store.reference ? Store.reference(snapshot) : null;
        previous = rec && rec.snapshot ? rec.snapshot : null;
      } else {
        queueAmbientHistoryPaint();
      }
      if (Store.remember) {
        try {
          Store.remember(snapshot);
        } catch (e) {
          /* fail open */
        }
      }
    }
    var changes = { status: "warming", items: [], referenceCapturedAt: null, windowLabel: "" };
    if (Changes && typeof Changes.diff === "function") {
      changes = Changes.diff(previous, snapshot);
      snapshot.meta.changeDetection = true;
      if (typeof Changes.decorateSnapshot === "function") {
        snapshot = Changes.decorateSnapshot(snapshot, changes);
      }
    } else {
      snapshot.meta.history = false;
      snapshot.meta.changeDetection = false;
    }
    return snapshot;
  }

  function renderShell(options) {
    options = options || {};
    var view = options.view || "workspace";
    var ctx = options.placeContext || {};
    var platform = options.platform || null;
    var Today = api("dashboardRebuildToday");
    var Happening = api("dashboardRebuildHappening");
    var Events = api("dashboardRebuildEvents");
    var Workspace = api("dashboardRebuildWorkspace");
    var Customize = api("dashboardRebuildCustomize");
    var Kiosk = api("dashboardRebuildKiosk");
    var Prefs = api("dashboardRebuildPrefs");
    var prefs = Prefs && Prefs.load ? Prefs.load() : null;
    var kioskActive = view === "kiosk";
    var ambientActive = view === "ambient";
    var lazy = options.lazy === true;
    var animate = options.animate === true && !prefersReducedMotion();

    if (ambientActive) {
      var Snap = api("dashboardRebuildAmbientSnapshot");
      var Ambient = api("dashboardRebuildAmbient");
      var snapshot =
        Snap && typeof Snap.compose === "function"
          ? Snap.compose({
              platform: platform,
              placeContext: ctx,
              now: options.now || new Date(),
              catalog: options.catalog || null
            })
          : null;
      if (snapshot) snapshot = attachAmbientHistory(snapshot);
      var ambientHtml =
        Ambient && Ambient.render
          ? Ambient.render(snapshot)
          : '<p class="wdb-r-ambient__missing">Ambient is unavailable in this build.</p>';
      return (
        '<div class="wdb-r" data-wdb-r data-view="ambient"' +
        (platform ? ' data-hydrated="true"' : "") +
        ">" +
        ambientHtml +
        "</div>"
      );
    }

    var todayHtml =
      Today && Today.render ? Today.render(todayContext(options)) : "";

    var happeningHtml = "";
    var quietHtml = "";
    var eventsHtml = "";
    if (view === "workspace" || view === "kiosk") {
      happeningHtml =
        Happening && Happening.render ? Happening.render(happeningContext(options)) : "";
      eventsHtml =
        Events && Events.render ? Events.render(eventContext(options)) : "";
      /* Quiet Discover strip: all supported categories empty, live weather hydrated,
         and the events catalog has actually loaded (unknown/in-flight is not “none”). */
      if (
        !happeningHtml &&
        !eventsHtml &&
        hasLiveWeather(platform) &&
        !hasUpcomingDiscoverEvents(options) &&
        eventsCatalogReady(options)
      ) {
        quietHtml = renderDiscoverQuiet();
      }
    }

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
      eventsHtml +
      happeningHtml +
      quietHtml +
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

  var ambientRefreshTimer = null;
  var AMBIENT_REFRESH_MS = 5 * 60 * 1000;

  function stopAmbientRefresh() {
    if (ambientRefreshTimer) {
      clearInterval(ambientRefreshTimer);
      ambientRefreshTimer = null;
    }
  }

  function startAmbientRefresh() {
    stopAmbientRefresh();
    var ms = AMBIENT_REFRESH_MS;
    var Kiosk = api("dashboardRebuildKiosk");
    if (Kiosk && typeof Kiosk.refreshMs === "function") {
      try {
        ms = Kiosk.refreshMs();
      } catch (e) {
        ms = AMBIENT_REFRESH_MS;
      }
    }
    ambientRefreshTimer = setInterval(function () {
      if (global.document && global.document.hidden) return;
      try {
        var OIP = api("outdoorIntelligence");
        if (OIP && OIP.refresh) OIP.refresh();
        else paint({ animate: false });
      } catch (e) {
        paint({ animate: false });
      }
    }, ms);
  }

  function applyAmbientMode(view) {
    var root = global.document && global.document.documentElement;
    if (view === "ambient") {
      if (root) {
        root.setAttribute("data-wdb-r-ambient", "true");
        if (root.classList && typeof root.classList.add === "function") {
          root.classList.add("wdb-r-ambient-mode");
        }
      }
      startAmbientRefresh();
    } else {
      if (root) {
        root.removeAttribute("data-wdb-r-ambient");
        if (root.classList && typeof root.classList.remove === "function") {
          root.classList.remove("wdb-r-ambient-mode");
        }
      }
      stopAmbientRefresh();
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
    applyAmbientMode(mountState.view);
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
    if (
      Workspace &&
      Workspace.bindLazy &&
      mountState.view !== "customize" &&
      mountState.view !== "ambient"
    ) {
      Workspace.bindLazy(mountState.host, { platform: mountState.platform || null });
    }
    if (mountState.view === "workspace" || mountState.view === "kiosk") {
      var Happening = api("dashboardRebuildHappening");
      if (Happening && Happening.bind) {
        Happening.bind(mountState.host);
      }
      var Events = api("dashboardRebuildEvents");
      if (Events && Events.bind) {
        Events.bind(mountState.host);
      }
      var Depth = api("dashboardRebuildDepth");
      if (Depth && Depth.bind) {
        Depth.bind(mountState.host);
      }
    }
    if (mountState.view === "workspace") {
      var Deepen = api("dashboardRebuildDeepeners");
      var deepenCtx = {
        platform: mountState.platform || null,
        placeContext: mountState.placeContext || null,
        location: mountState.placeContext || null,
        now: null
      };
      var runDeepen = function () {
        if (Deepen && Deepen.bind) {
          Deepen.bind(mountState.host, deepenCtx);
        }
      };
      if (Deepen && Deepen.ensureCatalog) {
        Deepen.ensureCatalog(runDeepen);
      } else {
        runDeepen();
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
      view === "workspace" || view === "customize" || view === "kiosk" || view === "ambient"
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

  function refreshEventsCatalog() {
    var NE = api("naturalEvents");
    if (!NE || typeof NE.loadCatalog !== "function") return;
    if (NE.getCatalog && NE.getCatalog()) return;
    ensureEventsCatalog(function () {
      if (mountState.host) paint({ animate: false });
    });
  }

  function setPlaceContext(ctx) {
    mountState.placeContext = ctx || null;
    paint();
    refreshEventsCatalog();
  }

  function setPlatform(platform) {
    mountState.platform = platform || null;
    paint();
    refreshEventsCatalog();
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

  function ensureEventsCatalog(done) {
    var NE = api("naturalEvents");
    if (!NE || typeof NE.loadCatalog !== "function") {
      if (done) done();
      return;
    }
    if (NE.getCatalog && NE.getCatalog()) {
      if (done) done();
      return;
    }
    try {
      var p = NE.loadCatalog();
      if (p && typeof p.then === "function") {
        p.then(
          function () {
            if (done) done();
          },
          function () {
            if (done) done();
          }
        );
        return;
      }
    } catch (e) {
      /* omit events rather than invent */
    }
    if (done) done();
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
    refreshEventsCatalog();
    return host.querySelector("[data-wdb-r]");
  }

  function unmount() {
    var Kiosk = api("dashboardRebuildKiosk");
    if (Kiosk && Kiosk.isActive()) Kiosk.exit();
    applyAmbientMode("workspace");
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
