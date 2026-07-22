/**
 * Dashboard Rebuild Phase 1 — shell boot.
 * Mounts rebuild workspace immediately; does not boot Outdoor OS.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + 06-routing.md
 */
(function () {
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

  var BOOT_DEADLINE = Date.now() + 15000;
  var mounted = false;

  function placeContextFromLoc(loc) {
    if (!loc) {
      return {
        placeLabel: "Place not set",
        trust: "unavailable",
        source: "unavailable"
      };
    }
    if (loc.source === "pending" || loc.useNationalFallback) {
      return {
        placeLabel: loc.displayTitle || loc.name || "Finding place…",
        trust: "pending",
        source: loc.source || "pending"
      };
    }
    return {
      placeLabel: loc.displayTitle || loc.name || "Place not set",
      trust: loc.source === "unavailable" ? "unavailable" : "cached",
      source: loc.source || "unknown",
      lat: loc.lat,
      lng: loc.lng
    };
  }

  function showBootError() {
    var mount = document.getElementById("wds-content-engine");
    if (!mount) return;
    mount.innerHTML =
      '<div class="wdb-boot-error" role="alert">' +
      "<p>We couldn't open Dashboard. Check your connection and try again.</p>" +
      '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button>' +
      "</div>";
    mount.removeAttribute("aria-busy");
  }

  function mountShell(placeCtx) {
    if (!window.WDS || !WDS.dashboardRebuild || !WDS.dashboardRebuild.mount) {
      return false;
    }
    var host = document.getElementById("wds-content-engine");
    if (!host) return false;
    WDS.dashboardRebuild.mount(host, {
      placeContext: placeCtx || placeContextFromLoc(null)
    });
    mounted = true;
    try {
      if (window.performance && performance.mark) {
        performance.mark("wdb-rebuild-shell-ready");
      }
    } catch (e) {
      /* noop */
    }
    return true;
  }

  function updatePlace(loc) {
    if (!window.WDS || !WDS.dashboardRebuild) return;
    var ctx = placeContextFromLoc(loc);
    if (WDS.dashboardRebuild.setPlaceContext) {
      WDS.dashboardRebuild.setPlaceContext(ctx);
    } else if (!mounted) {
      mountShell(ctx);
    }
  }

  function isSafeEarlyLocation(loc) {
    if (!loc) return false;
    if (loc.lat == null || loc.lng == null || loc.lat === "" || loc.lng === "") return false;
    var lat = typeof loc.lat === "number" ? loc.lat : Number(loc.lat);
    var lng = typeof loc.lng === "number" ? loc.lng : Number(loc.lng);
    if (!isFinite(lat) || !isFinite(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    if (loc.source === "unavailable" || loc.source === "pending") return false;
    if (WDS.location && WDS.location.isLegacyDefault && WDS.location.isLegacyDefault(loc)) return false;
    if (WDS.location && WDS.location.isEnginePublishPoint && WDS.location.isEnginePublishPoint(lat, lng)) {
      return false;
    }
    return true;
  }

  function bootstrapPlace() {
    if (!window.WDS || !WDS.location || !WDS.location.bootstrap) return;
    var early = WDS.location.readStored ? WDS.location.readStored() : null;
    if (isSafeEarlyLocation(early)) {
      updatePlace(early);
    } else {
      updatePlace({
        displayTitle: "Place not set",
        source: "pending",
        useNationalFallback: true
      });
    }
    /* Place bootstrap is non-blocking for shell; kiosk must not surprise-prompt. */
    var kiosk =
      (location.hash || "").indexOf("kiosk") >= 0 ||
      (document.documentElement &&
        document.documentElement.getAttribute("data-wdb-r-kiosk") === "true");
    if (kiosk) return;
    WDS.location
      .bootstrap({
        base: ENGINE_BASE,
        promptMount: document.getElementById("wds-location-prompt")
      })
      .then(function (loc) {
        if (loc) updatePlace(loc);
        else if (isSafeEarlyLocation(early)) updatePlace(early);
      })
      .catch(function () {
        if (isSafeEarlyLocation(early)) updatePlace(early);
      });
  }

  function boot() {
    if (!window.WDS || !WDS.dashboardRebuild || typeof WDS.dashboardRebuild.mount !== "function") {
      if (Date.now() >= BOOT_DEADLINE) {
        showBootError();
        return;
      }
      requestAnimationFrame(boot);
      return;
    }
    mountShell(
      placeContextFromLoc({
        displayTitle: "Place not set",
        source: "pending"
      })
    );
    bootstrapPlace();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
