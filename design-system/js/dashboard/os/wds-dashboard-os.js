/**
 * Outdoor OS Dashboard — product presentation root.
 * Authority: DASHBOARD-PRODUCT-MANIFESTO.md → DASHBOARD-SCREEN-SPECIFICATION.md
 * Reuses V2 model/briefing/activity/timeline/trust engines; replaces Recovery/widget UI.
 * M3: panel focus trap, restore focus, quiet open/close, backdrop dismiss (no IA change).
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = (function () {
    var el = document.documentElement;
    if (el && el.getAttribute("data-content-engine-base")) {
      return el.getAttribute("data-content-engine-base");
    }
    if (/\/apps\/dashboard\//.test(String(location.pathname || ""))) {
      return "../../design-system/content-engine/";
    }
    return "design-system/content-engine/";
  })();

  function prefersReducedMotion() {
    try {
      return !!(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function buildView(options) {
    var V2 = global.WDS && global.WDS.dashboardV2;
    var Compose = global.WDS && global.WDS.dashboardOSCompose;
    if (!V2 || !Compose) return { mode: "loading", atmosphere: "neutral" };
    var payload = V2.buildPayload({
      platform: options.platform,
      location: options.location,
      bundle: options.bundle
    });
    if (!payload) return { mode: "loading", atmosphere: "neutral" };
    return Compose.compose(payload);
  }

  function renderDashboard(options) {
    options = options || {};
    var Render = global.WDS && global.WDS.dashboardOSRender;
    if (!Render) return "";
    var view = buildView(options);
    return Render.renderScreen(view);
  }

  function currentRoot(host) {
    return host && host.querySelector ? host.querySelector("[data-wdb-os]") : null;
  }

  function panelFocusables(host) {
    if (!host) return [];
    var nodes = host.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].offsetParent !== null || nodes[i] === document.activeElement) out.push(nodes[i]);
    }
    return out;
  }

  function setSheetInert(root, on) {
    var sheet = root && root.querySelector(".wdb-os__sheet");
    if (!sheet) return;
    if (on) {
      sheet.setAttribute("aria-hidden", "true");
      sheet.setAttribute("inert", "");
    } else {
      sheet.removeAttribute("aria-hidden");
      sheet.removeAttribute("inert");
    }
  }

  function finishClosePanel(root) {
    var host = root && root.querySelector("[data-wdb-os-panel-host]");
    if (!host) return;
    host.innerHTML = "";
    host.hidden = true;
    host.classList.remove("is-open", "is-closing");
    root.classList.remove("is-panel-open");
    setSheetInert(root, false);
    var restore = root._wdbOsFocusRestore;
    root._wdbOsFocusRestore = null;
    if (restore && typeof restore.focus === "function") {
      try {
        restore.focus({ preventScroll: true });
      } catch (e) {
        try {
          restore.focus();
        } catch (e2) { /* noop */ }
      }
    }
  }

  function closePanel(root) {
    var host = root && root.querySelector("[data-wdb-os-panel-host]");
    if (!host || host.hidden) return;
    if (prefersReducedMotion() || !host.classList.contains("is-open")) {
      finishClosePanel(root);
      return;
    }
    host.classList.add("is-closing");
    host.classList.remove("is-open");
    var done = false;
    var end = function () {
      if (done) return;
      done = true;
      host.removeEventListener("transitionend", onEnd);
      finishClosePanel(root);
    };
    var onEnd = function (ev) {
      if (ev.target !== host) return;
      end();
    };
    host.addEventListener("transitionend", onEnd);
    global.setTimeout(end, 280);
  }

  function openPanel(root, id, view, opener) {
    var Render = global.WDS && global.WDS.dashboardOSRender;
    var host = root.querySelector("[data-wdb-os-panel-host]");
    if (!Render || !host) return;
    root._wdbOsFocusRestore = opener || document.activeElement;
    host.innerHTML = Render.renderPanel(id, view);
    host.hidden = false;
    host.classList.remove("is-closing");
    root.classList.add("is-panel-open");
    setSheetInert(root, true);

    var panel = host.querySelector(".wdb-os-panel");
    var closeBtn = host.querySelector("[data-wdb-os-panel-close]");
    var focusTarget = closeBtn || (panel && panel.querySelector("h2, [tabindex], button, input"));

    var reveal = function () {
      host.classList.add("is-open");
      if (focusTarget) {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (e) {
          try {
            focusTarget.focus();
          } catch (e2) { /* noop */ }
        }
      }
    };

    if (prefersReducedMotion()) {
      reveal();
    } else {
      // Double rAF so the browser paints the closed state before transitioning.
      global.requestAnimationFrame(function () {
        global.requestAnimationFrame(reveal);
      });
    }
  }

  function setLocStatus(root, msg) {
    var el = root.querySelector("[data-wdb-os-loc-status]");
    if (el) el.textContent = msg || "";
  }

  function refreshOutside(root, options) {
    var DE = global.WDS && global.WDS.dashboardEngine;
    var Loc = global.WDS && global.WDS.location;
    var loc = Loc && Loc.getState ? Loc.getState() : options && options.location;
    var next = Object.assign({}, options || {}, { location: loc });
    if (DE && DE.refreshDashboard && root) {
      return DE.refreshDashboard(root, next);
    }
    return Promise.resolve();
  }

  /** Screen Spec §3.10 — Use my location via existing location engine. */
  function useMyLocation(root, options) {
    var Loc = global.WDS && global.WDS.location;
    if (!Loc || !Loc.requestGeolocationAndSave) {
      setLocStatus(root, "Location is unavailable in this browser.");
      return;
    }
    setLocStatus(root, "Requesting permission…");
    Loc.requestGeolocationAndSave(ENGINE_BASE)
      .then(function () {
        closePanel(currentRoot(root) || root.querySelector("[data-wdb-os]") || root);
        return refreshOutside(root, options);
      })
      .catch(function () {
        setLocStatus(root, "Could not use device location. Search a county or state instead.");
      });
  }

  /** Screen Spec §3.10 — search/choose via existing location search APIs. */
  function submitLocationSearch(root, options, query) {
    var Loc = global.WDS && global.WDS.location;
    var q = String(query || "").trim();
    if (!Loc || !q) {
      setLocStatus(root, "Enter a county or state.");
      return;
    }
    setLocStatus(root, "Looking up place…");
    var load = Loc.loadIndex ? Loc.loadIndex(ENGINE_BASE) : Promise.resolve(null);
    load
      .then(function (index) {
        var found = Loc.searchManualLocation ? Loc.searchManualLocation(q, index) : null;
        if (!found || !found.region) {
          setLocStatus(root, "No matching county or state. Try another spelling.");
          return null;
        }
        if (Loc.changeRegion) {
          return Loc.changeRegion(found.region.id, ENGINE_BASE);
        }
        if (Loc.resolveManual && Loc.writeStored) {
          return Loc.writeStored(Loc.resolveManual(found.region.id, index));
        }
        return null;
      })
      .then(function (loc) {
        if (!loc) return;
        closePanel(currentRoot(root) || root.querySelector("[data-wdb-os]") || root);
        return refreshOutside(root, options);
      })
      .catch(function () {
        setLocStatus(root, "Place lookup failed. Check your connection and try again.");
      });
  }

  function savePrefsFromForm(form, view) {
    var Prefs = global.WDS && global.WDS.dashboardV2Prefs;
    if (!Prefs || !form) return;
    var prefs = Prefs.load();
    var boxes = form.querySelectorAll('input[name="activity"]');
    var next = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked && boxes[i].value !== "volunteer") next.push(boxes[i].value);
    }
    prefs.activities = next;
    prefs.airQualitySensitive = !!(form.airQualitySensitive && form.airQualitySensitive.checked);
    prefs.uvSensitive = !!(form.uvSensitive && form.uvSensitive.checked);
    Prefs.save(prefs);
    view.prefs = prefs;
  }

  function bind(root, options) {
    if (!root) return;
    var os = currentRoot(root);
    if (!os || os._wdbOsBound) return;
    os._wdbOsBound = true;
    os._wdbOsView = buildView(options || {});
    os._wdbOsOptions = options || {};

    os.addEventListener("click", function (e) {
      var view = os._wdbOsView || buildView(os._wdbOsOptions || {});
      var close = e.target.closest("[data-wdb-os-panel-close]");
      if (close && os.contains(close)) {
        e.preventDefault();
        closePanel(os);
        return;
      }
      var backdrop = e.target.closest("[data-wdb-os-panel-backdrop]");
      if (backdrop && os.contains(backdrop)) {
        e.preventDefault();
        closePanel(os);
        return;
      }
      var geo = e.target.closest('[data-wdb-os-loc="geo"]');
      if (geo && os.contains(geo)) {
        e.preventDefault();
        useMyLocation(root, os._wdbOsOptions);
        return;
      }
      var open = e.target.closest("[data-wdb-os-open]");
      if (open && os.contains(open)) {
        e.preventDefault();
        openPanel(os, open.getAttribute("data-wdb-os-open"), view, open);
        return;
      }
      var action = e.target.closest("[data-wdb-os-action]");
      if (action && os.contains(action)) {
        e.preventDefault();
        var act = action.getAttribute("data-wdb-os-action");
        if (act === "use-location") useMyLocation(root, os._wdbOsOptions);
        else if (act === "prefs") openPanel(os, "prefs", view, action);
      }
    });

    os.addEventListener("submit", function (e) {
      var locForm = e.target.closest("[data-wdb-os-loc-search]");
      if (locForm && os.contains(locForm)) {
        e.preventDefault();
        var q = locForm.q ? locForm.q.value : "";
        submitLocationSearch(root, os._wdbOsOptions, q);
        return;
      }
      var form = e.target.closest("[data-wdb-os-prefs]");
      if (!form || !os.contains(form)) return;
      e.preventDefault();
      var view = os._wdbOsView || {};
      savePrefsFromForm(form, view);
      closePanel(os);
      refreshOutside(root, os._wdbOsOptions);
    });

    os.addEventListener("keydown", function (ev) {
      if (!os.classList.contains("is-panel-open")) return;
      var host = os.querySelector("[data-wdb-os-panel-host]");
      if (!host || host.hidden) return;

      if (ev.key === "Escape") {
        ev.preventDefault();
        closePanel(os);
        return;
      }

      if (ev.key !== "Tab") return;
      var list = panelFocusables(host);
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
    });
  }

  function mount(root, options) {
    options = options || {};
    var os = currentRoot(root);
    if (!os) return Promise.resolve();
    os._wdbOsView = buildView(options);
    os._wdbOsOptions = options;
    // Mark ready for quiet entrance (CSS); skip if reduced motion.
    if (!prefersReducedMotion()) {
      global.requestAnimationFrame(function () {
        os.classList.add("is-ready");
      });
    } else {
      os.classList.add("is-ready");
    }
    bind(root, options);
    return Promise.resolve();
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardOS = {
    VERSION: "os-1.3.0-m3-polish",
    renderDashboard: renderDashboard,
    buildView: buildView,
    mount: mount,
    bind: bind
  };
})(window);
