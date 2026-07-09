/**
 * Waypoint Studio homepage — location-aware dashboard boot
 */
(function () {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var DEBUG_COMMIT = (function () {
    var feed = window.WDS && WDS.liveEngine && WDS.liveEngine.getLast && WDS.liveEngine.getLast();
    if (feed && feed.engineVersion) return "engine-" + feed.engineVersion;
    return "local";
  });
  var DEBUG_BUILD_TIME = new Date().toISOString();
  var DEBUG_KEY = "waypointDebugSnapshot";
  var BANNED_TERMS = ["coming soon", "assignment", "homework", "lesson", "educational"];
  var DASHBOARD_REFRESH_MS = 5 * 60 * 1000;
  var dashboardTimer = null;

  function txt(el) {
    return (el && el.textContent ? el.textContent : "").replace(/\s+/g, " ").trim();
  }

  function unique(items) {
    var out = [];
    var seen = Object.create(null);
    (items || []).forEach(function (item) {
      var key = String(item || "").trim();
      if (!key) return;
      var lc = key.toLowerCase();
      if (seen[lc]) return;
      seen[lc] = true;
      out.push(key);
    });
    return out;
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.hidden) return false;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === "none" || style.visibility === "hidden" || style.opacity === "0")) return false;
    return !!(el.offsetParent || (style && style.position === "fixed"));
  }

  function sectionLabel(el) {
    if (!el) return "";
    var header = el.querySelector("h1, h2, h3");
    var label = txt(header);
    if (label) return label;
    label = txt(el);
    if (label.length > 90) label = label.slice(0, 90) + "...";
    return label;
  }

  function collectDebugSnapshot() {
    var headings = unique(Array.prototype.slice.call(document.querySelectorAll("h1, h2, h3"))
      .filter(isVisible)
      .map(txt));
    var sections = unique(Array.prototype.slice.call(document.querySelectorAll("section[id], section[data-section-id], [data-section-id], [data-widget-id]"))
      .filter(isVisible)
      .map(function (el) {
        var id = el.getAttribute("id") || el.getAttribute("data-section-id") || el.getAttribute("data-widget-id") || "";
        var label = sectionLabel(el);
        return label ? id + " :: " + label : id;
      }));
    var bodyText = txt(document.body).toLowerCase();
    var bannedHits = BANNED_TERMS.filter(function (term) { return bodyText.indexOf(term) >= 0; });
    var hasWeather = !!(window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast &&
      (function () {
        var pkg = WDS.outdoorIntelligence.getLast();
        return pkg && pkg.meta && pkg.meta.blockStatus && pkg.meta.blockStatus.weather === "live";
      })());
    var hasLocation = !!(window.WDS && WDS.location && WDS.location.getState && (function () {
      var loc = WDS.location.getState();
      return loc && isFinite(Number(loc.lat)) && isFinite(Number(loc.lng));
    })());
    var ebirdSlice = window.WDS && WDS.outdoorIntelligence && WDS.outdoorIntelligence.getLast
      ? (function () {
          var pkg = WDS.outdoorIntelligence.getLast();
          return pkg && pkg.ebird ? pkg.ebird : null;
        })()
      : null;

    return {
      commitHash: typeof DEBUG_COMMIT === "function" ? DEBUG_COMMIT() : DEBUG_COMMIT,
      buildTime: DEBUG_BUILD_TIME,
      activePageTitle: document.title || "",
      capturedAt: new Date().toISOString(),
      headings: headings,
      sectionsRendered: sections,
      liveWeatherLoaded: hasWeather,
      locationLoaded: hasLocation,
      ebirdStatus: ebirdSlice && ebirdSlice.status ? ebirdSlice.status : "unavailable",
      ebirdObservations: ebirdSlice && Array.isArray(ebirdSlice.observations) ? ebirdSlice.observations.length : 0,
      bannedTextPresent: bannedHits.length > 0,
      bannedTextHits: bannedHits
    };
  }

  function publishDebugSnapshot() {
    var snap = collectDebugSnapshot();
    window.__WAYPOINT_DEBUG__ = snap;
    try {
      localStorage.setItem(DEBUG_KEY, JSON.stringify(snap));
    } catch (e) { /* noop */ }
  }

  function wireDebugSnapshot() {
    publishDebugSnapshot();
    var mount = document.getElementById("wds-content-engine") || document.body;
    if (!mount) return;
    var debounced = null;
    var obs = new MutationObserver(function () {
      if (debounced) clearTimeout(debounced);
      debounced = setTimeout(publishDebugSnapshot, 300);
    });
    obs.observe(mount, { childList: true, subtree: true, characterData: true });
    setInterval(publishDebugSnapshot, 5000);
  }

  function startDashboard(loc) {
    if (!window.WDS || !WDS.contentEngine) return;
    WDS.contentEngine.init({
      base: ENGINE_BASE,
      mount: document.getElementById("wds-content-engine"),
      wrapMain: false,
      location: loc,
      includeCitizenScience: false,
      includeMethodology: true,
      onLocationChange: function (newLoc) {
        startDashboard(newLoc);
      }
    });
  }

  function scheduleDashboardRefresh() {
    if (dashboardTimer) clearInterval(dashboardTimer);
    dashboardTimer = setInterval(function () {
      if (!window.WDS || !WDS.location || !WDS.location.getState) return;
      var state = WDS.location.getState();
      if (!state) return;
      startDashboard(state);
    }, DASHBOARD_REFRESH_MS);
  }

  function showBootError() {
    var mount = document.getElementById("wds-content-engine");
    if (mount) {
      mount.innerHTML =
        '<div class="wdb-boot-error" role="alert">' +
          "<p>We couldn't load your dashboard. Check your connection and try again.</p>" +
          '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button>' +
        "</div>";
      mount.removeAttribute("aria-busy");
    }
  }

  function boot() {
    if (!window.WDS || !WDS.location || !WDS.contentEngine ||
        !WDS.outdoorIntelligence || typeof WDS.outdoorIntelligence.get !== "function" ||
        !WDS.weather || typeof WDS.weather.getForecast !== "function") {
      requestAnimationFrame(boot);
      return;
    }
    if (WDS.outdoorIntelligence && WDS.outdoorIntelligence.configure) {
      WDS.outdoorIntelligence.configure({
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      });
    } else if (WDS.regionalIntelligence && WDS.regionalIntelligence.configure) {
      WDS.regionalIntelligence.configure({ contentEngineBase: ENGINE_BASE });
    }
    if (WDS.weather && WDS.weather.configure) {
      WDS.weather.configure({ provider: "open-meteo", fallback: false });
    }
    if (WDS.ecosystemBridge && WDS.ecosystemBridge.bindOip) {
      WDS.ecosystemBridge.bindOip();
    }
    WDS.location.bootstrap({
      base: ENGINE_BASE,
      promptMount: document.getElementById("wds-location-prompt")
    }).then(startDashboard).catch(function () {
      if (window.WDS && WDS.location) {
        WDS.location.loadIndex(ENGINE_BASE).then(function (index) {
          startDashboard(WDS.location.defaultState(index));
        }).catch(showBootError);
        return;
      }
      showBootError();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wireDebugSnapshot();
      boot();
      scheduleDashboardRefresh();
    });
  } else {
    wireDebugSnapshot();
    boot();
    scheduleDashboardRefresh();
  }
})();
