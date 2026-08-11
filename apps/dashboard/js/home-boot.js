/**
 * Dashboard Rebuild Phase 2 — shell boot + OIP hydrate for four live widgets.
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
  var hydrateBound = false;
  var hydrateGen = 0;

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
    var src = String(loc.source || "unknown");
    var fromCache = !!(loc.cacheUsed || loc.refreshReason === "cache-fallback");
    var trust = "cached";
    if (src === "unavailable") trust = "unavailable";
    else if (fromCache) trust = "cached";
    else if (src === "geo" || src === "gps" || src === "manual") trust = "live";
    else if (src === "ip") trust = "estimated";
    else if (src === "cached" || src === "storage") trust = "cached";
    return {
      placeLabel: loc.displayTitle || loc.name || "Place not set",
      trust: trust,
      source: src,
      lat: loc.lat,
      lng: loc.lng,
      timezone: loc.timezone || null,
      displayTitle: loc.displayTitle || loc.name || null,
      name: loc.name || null
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
    if (isSafeEarlyLocation(loc)) {
      hydratePlatform(loc);
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

  function configurePlatform() {
    if (!window.WDS || !WDS.outdoorIntelligence) return;
    if (WDS.outdoorIntelligence.configure) {
      WDS.outdoorIntelligence.configure({
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      });
    }
    if (WDS.weather && WDS.weather.configure) {
      /* Prefer Open-Meteo; NWS recovery runs if the primary package is a placeholder. */
      WDS.weather.configure({ provider: "open-meteo", fallback: true });
    }
  }

  function enrichPlatformWeather(platform, loc) {
    if (!platform || !window.WDS || !WDS.weather || !WDS.weather.getForecast) {
      return Promise.resolve(platform);
    }
    var wx = platform.weatherRef;
    var needsRecovery = !wx || (wx.meta && wx.meta.isPlaceholder);
    if (!needsRecovery) return Promise.resolve(platform);

    var prev = null;
    try {
      if (WDS.weather.getActiveProvider) {
        var active = WDS.weather.getActiveProvider();
        prev = active && active.id ? active.id : "open-meteo";
      }
      if (WDS.weather.setProvider) WDS.weather.setProvider("nws");
    } catch (e) {
      return Promise.resolve(platform);
    }

    return WDS.weather
      .getForecast({
        location: loc,
        lat: loc && loc.lat,
        lng: loc && loc.lng,
        timezone: (loc && loc.timezone) || (platform.daylight && platform.daylight.timezone),
        fallback: false
      })
      .then(function (liveWx) {
        if (liveWx && liveWx.meta && !liveWx.meta.isPlaceholder) {
          platform.weatherRef = liveWx;
          liveWx.meta = liveWx.meta || {};
          liveWx.meta.fallbackFrom = liveWx.meta.fallbackFrom || "open-meteo";
          liveWx.meta.fallbackReason = liveWx.meta.fallbackReason || "primary-unavailable";
          if (WDS.daylightUtils && WDS.daylightUtils.enrichFromWeather) {
            platform.daylight = WDS.daylightUtils.enrichFromWeather(
              liveWx,
              platform.daylight || {}
            );
          }
          if (platform.meta && platform.meta.blockStatus) {
            platform.meta.blockStatus.weather = "live";
          }
        }
        return platform;
      })
      .catch(function () {
        return platform;
      })
      .then(function (pkg) {
        try {
          if (WDS.weather.setProvider) WDS.weather.setProvider(prev || "open-meteo");
        } catch (e2) {
          /* noop */
        }
        return pkg;
      });
  }

  function applyPlatform(platform) {
    if (!window.WDS || !WDS.dashboardRebuild || !WDS.dashboardRebuild.setPlatform) return;
    WDS.dashboardRebuild.setPlatform(platform || null);
    try {
      if (window.performance && performance.mark) {
        performance.mark("wdb-rebuild-platform-ready");
      }
    } catch (e) {
      /* noop */
    }
  }

  function hydratePlatform(loc) {
    if (!window.WDS || !WDS.outdoorIntelligence || !WDS.outdoorIntelligence.get) return;
    if (!isSafeEarlyLocation(loc)) return;
    configurePlatform();
    var gen = ++hydrateGen;
    WDS.outdoorIntelligence
      .get({
        location: loc,
        contentEngineBase: ENGINE_BASE,
        includeWeather: true
      })
      .then(function (platform) {
        return enrichPlatformWeather(platform, loc);
      })
      .then(function (platform) {
        if (gen !== hydrateGen) return;
        applyPlatform(platform);
      })
      .catch(function () {
        if (gen !== hydrateGen) return;
        /* Keep shell honest — widgets show unavailable without inventing. */
        applyPlatform(null);
      });
  }

  function bindHydrateListeners() {
    if (hydrateBound || !window.WDS) return;
    hydrateBound = true;
    if (WDS.outdoorIntelligence && WDS.outdoorIntelligence.onChange) {
      WDS.outdoorIntelligence.onChange(function (platform) {
        applyPlatform(platform);
      });
    }
    if (WDS.location && WDS.location.onChange) {
      WDS.location.onChange(function (loc) {
        if (loc) updatePlace(loc);
      });
    }
  }

  function bootstrapPlace() {
    if (!window.WDS || !WDS.location || !WDS.location.bootstrap) return;
    bindHydrateListeners();
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
    if (kiosk) {
      if (isSafeEarlyLocation(early)) hydratePlatform(early);
      return;
    }
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
