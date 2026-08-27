/**
 * Waypoint Studio — Application Shell
 * Global header + Apps launcher + local feature navigation + footer.
 */
(function (global) {
  "use strict";

  var launcherOpen = false;
  var launcherFocusHandler = null;
  var FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function (el) {
      return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" &&
        el.offsetParent !== null;
    });
  }

  function trapFocus(panel) {
    releaseFocusTrap();
    if (!panel) return;
    launcherFocusHandler = function (e) {
      if (!launcherOpen || e.key !== "Tab") return;
      var nodes = focusables(panel);
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", launcherFocusHandler, true);
  }

  function releaseFocusTrap() {
    if (launcherFocusHandler) {
      document.removeEventListener("keydown", launcherFocusHandler, true);
      launcherFocusHandler = null;
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function Nav() {
    return global.WDS && global.WDS.appNav;
  }

  function iconMark(id) {
    var letter = String(id || "A").charAt(0).toUpperCase();
    return '<span class="was-app-icon" aria-hidden="true">' + esc(letter) + "</span>";
  }

  function renderLauncher(depth, activeId) {
    var NavApi = Nav();
    if (!NavApi) return "";
    var groups = NavApi.appsByCategory();
    var sections = groups.map(function (g) {
      var cards = g.apps.map(function (app) {
        var href = NavApi.startHereHref
          ? NavApi.startHereHref(app, depth)
          : NavApi.resolveRoute(app.route, depth);
        if (!href) href = NavApi.resolveRoute(app.route, depth);
        var current = app.id === activeId;
        var status = app.status || "live";
        var statusChip = "";
        if (status === "foundation") statusChip = '<span class="was-launcher__status">Early look</span>';
        else if (status === "planned") statusChip = '<span class="was-launcher__status">Coming later</span>';
        else if (status !== "live") statusChip = '<span class="was-launcher__status">' + esc(status) + "</span>";
        return (
          '<a class="was-launcher__app' + (current ? " is-current" : "") + '" href="' + esc(href) + '"' +
            (current ? ' aria-current="page"' : "") + ">" +
            iconMark(app.icon || app.id) +
            '<span class="was-launcher__app-copy">' +
              "<strong>" + esc(app.shortTitle || app.title) + "</strong>" +
              statusChip +
              "<span>" + esc(app.purpose || app.description || "") + "</span>" +
            "</span>" +
          "</a>"
        );
      }).join("");
      return (
        '<section class="was-launcher__group" aria-labelledby="was-cat-' + esc(g.id) + '">' +
          '<h3 class="was-launcher__cat" id="was-cat-' + esc(g.id) + '">' + esc(g.label) + "</h3>" +
          '<div class="was-launcher__grid">' + cards + "</div>" +
        "</section>"
      );
    }).join("");

    return (
      '<div class="was-launcher" id="was-launcher" hidden>' +
        '<div class="was-launcher__backdrop" data-was-close tabindex="-1"></div>' +
        '<div class="was-launcher__panel" role="dialog" aria-modal="true" aria-labelledby="was-launcher-title">' +
          '<header class="was-launcher__head">' +
            '<h2 id="was-launcher-title">Explore</h2>' +
            '<button type="button" class="was-launcher__close" data-was-close aria-label="Close explore menu">Close</button>' +
          "</header>" +
          '<div class="was-launcher__body">' + sections + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderGlobalHeader(options) {
    options = options || {};
    var NavApi = Nav();
    // Path detection is source of truth — legacy data-shell-depth attrs are apps-era
    // (1 ⇒ ../../) and break /articles/ and /side-trails/ when forced to 0.
    var depth = NavApi ? NavApi.depthFromPath() : (options.depth != null ? options.depth : 0);
    if (options.depth != null && options.forceDepth) depth = options.depth;
    var brandHref = NavApi ? NavApi.studioHomeHref(depth) : "../../";
    var brandName = (NavApi && NavApi.config().brand && NavApi.config().brand.name) || "Waypoint Studio";
    var active = options.app || (NavApi ? NavApi.detectApp() : null);
    var activeId = active && active.id;
    var quiet = !!options.quietChrome;
    // Quiet Home: keep Explore launcher hidden, but always expose architecture primary nav
    // so Side Trails (and peers) remain one click from the main site shell.
    var hideExplore = quiet || !!options.hideApps;
    var cfg = NavApi && NavApi.config ? NavApi.config() : {};
    var primary = (cfg.studioPrimaryNav || []).map(function (item) {
      var href = NavApi && NavApi.resolveRoute
        ? NavApi.resolveRoute(item.href, depth)
        : item.href;
      var pathNow = String((global.location && global.location.pathname) || "");
      // Front door (/) is studio-home — do not mark Dashboard current there.
      var onDashboard =
        activeId === "dashboard" || /\/apps\/dashboard(\/|$)/i.test(pathNow);
      var onDeck = /\/side-trails\/waypoint-deck(\/|$)/i.test(pathNow) || activeId === "waypoint-deck";
      var current =
        ((item.id === "home" || item.id === "dashboard") && onDashboard) ||
        (item.id === "scenes" && (activeId === "scenes" || activeId === "photo-coach")) ||
        (item.id === "sheds" && activeId === "sheds") ||
        (item.id === "articles" && /\/articles(\/|$)/.test(pathNow)) ||
        (item.id === "deck" && onDeck) ||
        (item.id === "support" && /support\.html$/i.test(pathNow)) ||
        (item.id === "about" && /about\.html$/i.test(pathNow));
      return (
        '<a class="was-primary-nav__link" href="' + esc(href) + '"' +
          (item.hint ? ' title="' + esc(item.hint) + '"' : "") +
          (current ? ' aria-current="page"' : "") +
          ">" + esc(item.label) + "</a>"
      );
    }).join("");

    return (
      '<header class="was-global' + (quiet ? " was-global--quiet" : "") + '" data-was-global' +
        (quiet ? ' data-was-quiet-chrome="1"' : "") + ">" +
        '<div class="was-global__inner">' +
          '<a class="was-brand" href="' + esc(brandHref) + '">' +
            '<span class="was-brand__mark" aria-hidden="true"></span>' +
            '<span class="was-brand__name">' + esc(brandName) + "</span>" +
          "</a>" +
          (primary
            ? '<button type="button" class="was-nav-toggle" id="was-nav-toggle" aria-expanded="false" aria-controls="was-primary-nav">' +
                '<span class="was-nav-toggle__label">Menu</span>' +
              "</button>" +
              '<nav class="was-primary-nav" id="was-primary-nav" aria-label="Primary">' + primary + "</nav>"
            : "") +
          (hideExplore
            ? ""
            : '<div class="was-global__actions">' +
              '<button type="button" class="was-apps-btn" id="was-apps-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="was-launcher">' +
                '<span class="was-apps-btn__label">Explore</span>' +
              "</button>" +
            "</div>") +
        "</div>" +
        (hideExplore ? "" : renderLauncher(depth, activeId)) +
      "</header>"
    );
  }

  function renderLocalNav(options) {
    options = options || {};
    var NavApi = Nav();
    if (!NavApi) return "";
    var depth = options.depth != null ? options.depth : NavApi.depthFromPath();
    var app = options.app || NavApi.detectApp();
    if (!app || options.hideLocal) return "";
    var feature = options.feature || NavApi.detectFeature(app);
    var features = app.features || [];
    if (!features.length) {
      return (
        '<div class="was-local" data-was-local>' +
          '<div class="was-local__inner">' +
            '<p class="was-local__app">' + esc(app.title) + "</p>" +
          "</div>" +
        "</div>"
      );
    }
    var useShort = !!(app && app.id === "scenes");
    var links = features.map(function (feat) {
      var href = NavApi.featureHref(feat, depth, app);
      var current = feature && feature.id === feat.id;
      var label = useShort && feat.shortLabel ? feat.shortLabel : feat.label;
      var titleAttr = useShort && feat.shortLabel && feat.shortLabel !== feat.label
        ? ' title="' + esc(feat.label) + '"'
        : "";
      return (
        '<a href="' + esc(href) + '"' +
          (current ? ' aria-current="page" class="is-current"' : "") +
          titleAttr +
          ">" + esc(label) + "</a>"
      );
    }).join("");

    return (
      '<div class="was-local' + (useShort ? " was-local--scenes-compact" : "") + '" data-was-local>' +
        '<div class="was-local__inner">' +
          '<p class="was-local__app">' + esc(app.title) + "</p>" +
          '<nav class="was-local__nav" aria-label="' + esc(app.title) + '">' +
            links +
          "</nav>" +
        "</div>" +
      "</div>"
    );
  }

  function studioPageHref(home, page) {
    home = home || "./";
    if (home === "./" || home === "." || home === "") return page;
    return String(home).replace(/\/?$/, "/") + page;
  }

  /**
   * Product-scoped Contact: Home keeps Contact inside the quiet Rebuild shell.
   * Other products keep studio-root contact.html (current App Shell, not legacy chrome).
   */
  function contactPageHref(options, query) {
    options = options || {};
    var NavApi = Nav();
    var depth = options.depth != null ? options.depth : (NavApi ? NavApi.depthFromPath() : 1);
    var app =
      Object.prototype.hasOwnProperty.call(options, "app")
        ? options.app
        : NavApi
          ? NavApi.detectApp()
          : null;
    var productSlug = (app && app.id) || options.product || "";
    var home = NavApi ? NavApi.studioHomeHref(depth) : "../../";
    var q = query ? String(query) : "";
    if (q && q.charAt(0) !== "?") q = "?" + q;
    if (productSlug === "dashboard") {
      var pathNow = "";
      try {
        pathNow = String((global.location && global.location.pathname) || "");
      } catch (e) { /* noop */ }
      if (/\/apps\/dashboard(\/|$)/.test(pathNow)) {
        return "contact.html" + q;
      }
      var dash =
        NavApi && NavApi.resolveRoute
          ? NavApi.resolveRoute("apps/dashboard/", depth)
          : studioPageHref(home, "apps/dashboard/");
      return studioPageHref(dash, "contact.html") + q;
    }
    return studioPageHref(home, "contact.html") + q;
  }

  function renderFooter(options) {
    options = options || {};
    var NavApi = Nav();
    var depth = options.depth != null ? options.depth : (NavApi ? NavApi.depthFromPath() : 1);
    var app =
      Object.prototype.hasOwnProperty.call(options, "app")
        ? options.app
        : NavApi
          ? NavApi.detectApp()
          : null;
    var productName = (app && app.title) || options.productName || "Waypoint Studio";
    var home = NavApi ? NavApi.studioHomeHref(depth) : "../../";
    var contactBase = contactPageHref(options, "");
    // Home RC1.2 — minimal trust footer (Contact · Privacy Policy · Terms).
    // Brand/home live in header/nav; do not reintroduce historical site IA here.
    return (
      '<footer class="was-footer wds-footer">' +
        "<p>" + esc(productName) + " · Private by default · Waypoint Studio</p>" +
        '<p class="was-footer__links">' +
          '<a href="' + esc(contactBase) + '">Contact</a>' +
          '<a href="' + esc(studioPageHref(home, "privacy.html")) + '">Privacy Policy</a>' +
          '<a href="' + esc(studioPageHref(home, "terms.html")) + '">Terms of Service</a>' +
        "</p>" +
      "</footer>"
    );
  }

  function setLauncher(open) {
    launcherOpen = !!open;
    var root = document.getElementById("was-launcher");
    var btn = document.getElementById("was-apps-btn");
    var panel = root && root.querySelector(".was-launcher__panel");
    if (root) {
      if (launcherOpen) root.removeAttribute("hidden");
      else root.setAttribute("hidden", "hidden");
    }
    if (btn) btn.setAttribute("aria-expanded", launcherOpen ? "true" : "false");
    document.documentElement.classList.toggle("was-launcher-open", launcherOpen);
    if (launcherOpen) {
      trapFocus(panel);
      var closeBtn = panel && panel.querySelector(".was-launcher__close");
      if (closeBtn) closeBtn.focus();
    } else {
      releaseFocusTrap();
      if (btn) btn.focus();
    }
  }

  var navOpen = false;

  function setPrimaryNav(open) {
    navOpen = !!open;
    var header = document.querySelector("[data-was-global], .was-global");
    var btn = document.getElementById("was-nav-toggle");
    var nav = document.getElementById("was-primary-nav");
    if (header) header.classList.toggle("is-nav-open", navOpen);
    document.documentElement.classList.toggle("was-nav-open", navOpen);
    if (btn) {
      btn.setAttribute("aria-expanded", navOpen ? "true" : "false");
      var lab = btn.querySelector(".was-nav-toggle__label");
      if (lab) lab.textContent = navOpen ? "Close" : "Menu";
    }
    if (nav) {
      if (navOpen) nav.removeAttribute("hidden");
    }
    if (navOpen) {
      var first = nav && nav.querySelector("a");
      if (first) first.focus();
    } else if (btn) {
      btn.focus();
    }
  }

  function bindPrimaryNav() {
    var root = document.documentElement;
    if (!root || root.getAttribute("data-was-nav-bound") === "1") return;
    root.setAttribute("data-was-nav-bound", "1");
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest && t.closest("#was-nav-toggle")) {
        e.preventDefault();
        setPrimaryNav(!navOpen);
        return;
      }
      if (navOpen && t.closest && t.closest(".was-primary-nav__link")) {
        setPrimaryNav(false);
        return;
      }
      if (navOpen && t.closest && !t.closest(".was-global")) {
        setPrimaryNav(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navOpen) {
        setPrimaryNav(false);
      }
    });
  }

  function bindLauncher(root) {
    root = root && root.nodeType === 1 ? root : document.documentElement;
    if (!root || root.getAttribute("data-was-bound") === "1") return;
    root.setAttribute("data-was-bound", "1");
    root.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest && t.closest("#was-apps-btn")) {
        e.preventDefault();
        setLauncher(!launcherOpen);
        return;
      }
      if (t.closest && t.closest("[data-was-close]")) {
        e.preventDefault();
        setLauncher(false);
        return;
      }
      if (t.closest && t.closest(".was-launcher__app")) {
        setLauncher(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && launcherOpen) setLauncher(false);
    });
  }

  function updateLocalCurrent() {
    var NavApi = Nav();
    if (!NavApi) return;
    var app = NavApi.detectApp();
    var feature = NavApi.detectFeature(app);
    var nav = document.querySelector(".was-local__nav");
    if (!nav || !feature) return;
    nav.querySelectorAll("a").forEach(function (a) {
      var label = (a.textContent || "").trim();
      var match = feature.label === label;
      if (match) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
      a.classList.toggle("is-current", match);
    });
  }

  function mount(options) {
    options = options || {};
    var NavApi = Nav();
    // Prefer live path depth. Explicit options.depth only when forceDepth is set.
    // Legacy shellDepth / data-shell-depth used an apps-only encoding and are ignored.
    var depth = NavApi
      ? NavApi.depthFromPath()
      : (options.depth != null ? options.depth : 1);
    if (options.forceDepth && options.depth != null) depth = options.depth;
    var app = options.appId && NavApi ? NavApi.byId(options.appId) : (NavApi ? NavApi.detectApp() : null);
    if (options.appId && !app && NavApi) app = NavApi.byId(options.appId);
    options = Object.assign({}, options, { depth: depth, app: app });

    var shell = document.querySelector("[data-wds-app-shell], [data-wds-platform-shell]");
    var globalHost = document.querySelector("[data-wds-app-global], [data-wds-platform-nav]");
    var localHost = document.querySelector("[data-wds-app-local]");
    var footerHost = document.querySelector("[data-wds-app-footer], [data-wds-platform-footer]");

    if (globalHost) {
      globalHost.outerHTML = renderGlobalHeader(options);
    } else if (shell && !document.querySelector("[data-was-global]")) {
      shell.insertAdjacentHTML("afterbegin", renderGlobalHeader(options) + (options.hideLocal ? "" : renderLocalNav(options)));
    }

    if (localHost) {
      localHost.outerHTML = options.hideLocal ? "" : renderLocalNav(options);
    } else if (document.querySelector("[data-was-global]") && !document.querySelector("[data-was-local]") && !options.hideLocal) {
      var g = document.querySelector("[data-was-global]");
      if (g) g.insertAdjacentHTML("afterend", renderLocalNav(options));
    }

    if (footerHost) {
      footerHost.outerHTML = renderFooter(options);
    }

    bindLauncher(document);
    bindPrimaryNav();
    if (shell) {
      shell.classList.add("was-shell");
      if (app) shell.setAttribute("data-active-app", app.id);
    }
  }

  function autoMount() {
    var el = document.querySelector("[data-wds-app-shell], [data-wds-platform-shell]");
    if (!el) return;
    var product = el.getAttribute("data-product") ||
      el.getAttribute("data-app") ||
      (document.documentElement && document.documentElement.getAttribute("data-product")) ||
      null;
    // Map legacy product ids
    var map = {
      scenes: "scenes",
      "photo-coach": "scenes",
      "animal-vision": "scenes",
      "hidden-landscapes": "scenes",
      "shed-hunting": "sheds",
      dashboard: "dashboard",
      studio: "dashboard",
      "studio-home": null,
      "waypoint-deck": "waypoint-deck"
    };
    var appId = map[product];
    if (appId === undefined) appId = product;
    mount({
      appId: appId,
      productName: el.getAttribute("data-product-name"),
      hideLocal: el.getAttribute("data-hide-local") === "true",
      hideApps: el.getAttribute("data-hide-apps") === "true",
      quietChrome: el.getAttribute("data-quiet-chrome") === "true"
    });
  }

  // Backward-compatible platform shell API
  function renderTopbar(options) {
    options = options || {};
    return renderGlobalHeader(options) + (options.hideLocal ? "" : renderLocalNav(options));
  }

  global.WDS = global.WDS || {};
  global.WDS.appShell = {
    mount: mount,
    autoMount: autoMount,
    renderGlobalHeader: renderGlobalHeader,
    renderLocalNav: renderLocalNav,
    renderFooter: renderFooter,
    contactPageHref: contactPageHref,
    updateLocalCurrent: updateLocalCurrent,
    setLauncher: setLauncher
  };

  global.WDS.platformShell = {
    renderTopbar: renderTopbar,
    renderFooter: renderFooter,
    mount: mount,
    autoMount: autoMount
  };

  global.WDS.nav = global.WDS.nav || {};
  global.WDS.nav.renderPlatformTopbar = renderTopbar;
  global.WDS.nav.renderPlatformFooter = renderFooter;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoMount);
    } else {
      autoMount();
    }
  }

  if (global.addEventListener) {
    global.addEventListener("hashchange", function () {
      updateLocalCurrent();
    });
  }
})(typeof window !== "undefined" ? window : global);
