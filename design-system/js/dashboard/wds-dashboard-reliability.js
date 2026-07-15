/**
 * Dashboard reliability — trust vocabulary, connectivity, mount deadlines.
 * Used by widget tags, educational fallbacks, engine settlement, and OIP meta.
 */
(function (global) {
  "use strict";

  var MOUNT_JOB_DEADLINE_MS = 12000;
  var FORECAST_MOUNT_TIMEOUT_MS = 8000;

  var TAGS = {
    loading: { label: "Loading", className: "wdb-widget__tag--loading" },
    live: { label: "Live", className: "wdb-widget__tag--live" },
    partial: { label: "Partial", className: "wdb-widget__tag--partial" },
    cached: { label: "Cached", className: "wdb-widget__tag--cached" },
    offline: { label: "Offline", className: "wdb-widget__tag--offline" },
    "provider-unavailable": {
      label: "Provider Unavailable",
      className: "wdb-widget__tag--unavailable"
    },
    error: { label: "Error", className: "wdb-widget__tag--error" },
    estimated: { label: "Estimated", className: "wdb-widget__tag--estimated" },
    editorial: { label: "Regional", className: "wdb-widget__tag--editorial" },
    local: { label: "Local", className: "wdb-widget__tag--local" }
  };

  var MOUNT_WAITING = {
    "outdoor-weather": "Waiting for weather provider…",
    current: "Waiting for weather provider…",
    hourly: "Waiting for hourly forecast…",
    daily: "Waiting for forecast…",
    forecast: "Waiting for forecast…",
    "sun-moon-dashboard": "Waiting for sun and moon data…",
    "sun-moon": "Waiting for sun and moon data…",
    "photography-dashboard": "Waiting for photography conditions…",
    "trail-dashboard": "Waiting for trail conditions…",
    "water-dashboard": "Waiting for river and water data…",
    "wildlife-dashboard": "Waiting for wildlife activity…",
    "flora-dashboard": "Waiting for flora conditions…",
    "foraging-dashboard": "Waiting for foraging conditions…",
    "safety-dashboard": "Waiting for safety conditions…",
    uv: "Waiting for UV index…",
    wind: "Waiting for wind data…",
    sunrise: "Waiting for sunrise…",
    sunset: "Waiting for sunset…",
    "cloud-cover": "Waiting for cloud cover…"
  };

  var MOUNT_UNAVAILABLE = {
    "outdoor-weather": "Weather temporarily unavailable",
    "sun-moon-dashboard": "Sun and moon data temporarily unavailable",
    "photography-dashboard": "Photography conditions temporarily unavailable",
    "trail-dashboard": "Trail data temporarily unavailable",
    "water-dashboard": "River data unavailable",
    "wildlife-dashboard": "Wildlife activity temporarily unavailable",
    "flora-dashboard": "Flora conditions temporarily unavailable",
    "foraging-dashboard": "Foraging conditions temporarily unavailable",
    "safety-dashboard": "Safety conditions temporarily unavailable"
  };

  function isOnline() {
    try {
      if (typeof navigator === "undefined") return true;
      if (typeof navigator.onLine !== "boolean") return true;
      return navigator.onLine !== false;
    } catch (e) {
      return true;
    }
  }

  function tagFor(state) {
    if (!state) return TAGS.estimated;
    if (TAGS[state]) return Object.assign({}, TAGS[state]);
    if (state === "unavailable" || state === "provider-unavailable") {
      return Object.assign({}, TAGS["provider-unavailable"]);
    }
    if (state === "success") return Object.assign({}, TAGS.live);
    if (state === "educational") return Object.assign({}, TAGS.estimated);
    return Object.assign({}, TAGS.estimated);
  }

  function waitingCopy(mountKind) {
    return MOUNT_WAITING[mountKind] || "Waiting for outdoor data…";
  }

  function unavailableCopy(mountKind, options) {
    options = options || {};
    if (options.state === "offline") {
      return "You appear to be offline. Cached conditions will show when available.";
    }
    if (options.state === "cached") {
      return "Showing the last known conditions from this device.";
    }
    if (options.state === "error") {
      return "Something went wrong loading this block. Other dashboard blocks continue to render.";
    }
    return MOUNT_UNAVAILABLE[mountKind] || "Provider temporarily unavailable for this block.";
  }

  function resolveOperationalState(options) {
    options = options || {};
    if (options.state) return options.state;
    if (options.pendingLive) return "loading";
    if (options.offline || (!isOnline() && !options.allowOnlineUnavailable)) return "offline";
    if (options.cached) return "cached";
    if (options.error) return "error";
    return "provider-unavailable";
  }

  function classifyBlockStatus(blockStatus) {
    if (!blockStatus) return "provider-unavailable";
    var keys = Object.keys(blockStatus);
    if (!keys.length) return "provider-unavailable";
    var live = 0;
    var bad = 0;
    keys.forEach(function (k) {
      var v = blockStatus[k];
      if (v === "live" || v === "empty" || v === "no-nearby") live += 1;
      else bad += 1;
    });
    if (live && bad) return "partial";
    if (live && !bad) return "live";
    return "provider-unavailable";
  }

  function classifyPackageTrust(pkg) {
    if (!pkg || !pkg.meta) return "provider-unavailable";
    if (pkg.meta.connectivity === "offline" || pkg.meta.trust === "offline") return "offline";
    if (pkg.meta.fromCache || pkg.meta.trust === "cached" || pkg.meta.stale) return "cached";
    if (pkg.meta.trust === "partial") return "partial";
    if (pkg.meta.error) return "error";
    if (pkg.meta.unavailable) return "provider-unavailable";
    var trust = classifyBlockStatus(pkg.meta.blockStatus);
    if (trust === "partial") return "partial";
    if (trust === "live") return "live";
    return "provider-unavailable";
  }

  function applyConnectivityMeta(pkg) {
    if (!pkg || !pkg.meta) return pkg;
    var online = isOnline();
    pkg.meta.connectivity = online ? "online" : "offline";
    if (!online) {
      if (pkg.meta.fromCache || pkg.meta.hydratedAt) {
        pkg.meta.trust = "cached";
        pkg.meta.fromCache = true;
      } else {
        pkg.meta.trust = "offline";
      }
      return pkg;
    }
    if (pkg.meta.fromCache || pkg.meta.stale) {
      pkg.meta.trust = "cached";
      return pkg;
    }
    var trust = classifyBlockStatus(pkg.meta.blockStatus);
    if (trust === "partial") pkg.meta.trust = "partial";
    else if (trust === "live") pkg.meta.trust = "live";
    else pkg.meta.trust = "provider-unavailable";
    return pkg;
  }

  function ageLabel(iso) {
    if (!iso) return null;
    try {
      var then = new Date(iso).getTime();
      if (!isFinite(then)) return null;
      var mins = Math.max(0, Math.round((Date.now() - then) / 60000));
      if (mins < 1) return "Updated just now";
      if (mins === 1) return "Updated 1 minute ago";
      if (mins < 60) return "Updated " + mins + " minutes ago";
      var hrs = Math.round(mins / 60);
      if (hrs === 1) return "Updated 1 hour ago";
      return "Updated " + hrs + " hours ago";
    } catch (e) {
      return null;
    }
  }

  function withDeadline(promise, ms) {
    ms = ms == null ? MOUNT_JOB_DEADLINE_MS : ms;
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({ ok: false, reason: "timeout" });
      }, ms);
      Promise.resolve(promise)
        .then(function (value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ ok: true, value: value });
        })
        .catch(function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ ok: false, reason: "error", error: err });
        });
    });
  }

  function raceForecast(forecastPromise, ms) {
    return withDeadline(forecastPromise, ms == null ? FORECAST_MOUNT_TIMEOUT_MS : ms).then(function (result) {
      if (!result.ok) return null;
      return result.value == null ? null : result.value;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardReliability = {
    MOUNT_JOB_DEADLINE_MS: MOUNT_JOB_DEADLINE_MS,
    FORECAST_MOUNT_TIMEOUT_MS: FORECAST_MOUNT_TIMEOUT_MS,
    TAGS: TAGS,
    isOnline: isOnline,
    tagFor: tagFor,
    waitingCopy: waitingCopy,
    unavailableCopy: unavailableCopy,
    resolveOperationalState: resolveOperationalState,
    classifyBlockStatus: classifyBlockStatus,
    classifyPackageTrust: classifyPackageTrust,
    applyConnectivityMeta: applyConnectivityMeta,
    ageLabel: ageLabel,
    withDeadline: withDeadline,
    raceForecast: raceForecast
  };
})(typeof window !== "undefined" ? window : globalThis);
