/**
 * Waypoint Studio — Platform Resilience
 * Timeouts, retries, backoff, request coalescing, provider health,
 * offline detection, persistent cache fallback, freshness helpers.
 * No provider should freeze the UI.
 */
(function (global) {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 8000;
  var DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
  var DEFAULT_RETRIES = 1;
  var DEFAULT_BACKOFF_MS = 400;
  var PERSIST_PREFIX = "wds.resilience.cache.v1:";
  var PERSIST_MAX_ENTRIES = 40;

  var memoryCache = {};
  var inflight = {};
  var providers = {};
  var offlineListeners = [];
  var isOffline = typeof navigator !== "undefined" ? navigator.onLine === false : false;

  function now() {
    return Date.now();
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function jitter(ms) {
    var base = Math.max(0, Number(ms) || 0);
    return Math.round(base * (0.7 + Math.random() * 0.6));
  }

  function isOnline() {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine !== false;
  }

  function recordProvider(id, patch) {
    if (!id) return;
    var cur = providers[id] || {
      id: id,
      status: "unknown",
      ok: 0,
      fail: 0,
      lastOkAt: null,
      lastFailAt: null,
      lastError: null,
      lastLatencyMs: null
    };
    Object.keys(patch || {}).forEach(function (k) {
      cur[k] = patch[k];
    });
    providers[id] = cur;
    return cur;
  }

  function providerSnapshot() {
    return Object.keys(providers).map(function (id) {
      return Object.assign({}, providers[id]);
    });
  }

  function formatFreshness(freshness) {
    freshness = freshness || {};
    var age = freshness.ageMs != null ? freshness.ageMs : 0;
    var secs = Math.round(age / 1000);
    var ageLabel = secs < 5 ? "just now" : secs < 60 ? secs + "s ago" : Math.round(secs / 60) + "m ago";
    var source = freshness.source || "unknown";
    if (freshness.stale) return "Cached · stale (" + ageLabel + ")";
    if (source === "memory-cache") return "Cached · " + ageLabel;
    if (source === "persistent-cache") return "Offline cache · " + ageLabel;
    if (source === "network") return "Live · " + ageLabel;
    return source + " · " + ageLabel;
  }

  function readPersistent(key) {
    try {
      if (!global.sessionStorage) return null;
      var raw = sessionStorage.getItem(PERSIST_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writePersistent(key, data, at) {
    try {
      if (!global.sessionStorage) return;
      sessionStorage.setItem(
        PERSIST_PREFIX + key,
        JSON.stringify({ data: data, at: at || now() })
      );
      // Best-effort prune
      var keys = [];
      for (var i = 0; i < sessionStorage.length; i++) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf(PERSIST_PREFIX) === 0) keys.push(k);
      }
      if (keys.length > PERSIST_MAX_ENTRIES) {
        keys.sort();
        keys.slice(0, keys.length - PERSIST_MAX_ENTRIES).forEach(function (k) {
          try { sessionStorage.removeItem(k); } catch (e2) { /* ignore */ }
        });
      }
    } catch (e) { /* quota */ }
  }

  function fetchOnce(url, options) {
    options = options || {};
    var timeoutMs = options.timeoutMs != null ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var externalSignal = options.signal;
    var fetchOpts = Object.assign({}, options.fetchOptions || {});
    if (controller) fetchOpts.signal = controller.signal;

    if (externalSignal) {
      if (externalSignal.aborted) {
        var aborted = new Error("Aborted");
        aborted.code = "aborted";
        return Promise.reject(aborted);
      }
      externalSignal.addEventListener("abort", function () {
        try { if (controller) controller.abort(); } catch (e) { /* ignore */ }
      });
    }

    var started = now();
    var fetchPromise = fetch(url, fetchOpts).then(function (res) {
      if (!res.ok) {
        var err = new Error("HTTP " + res.status + " for " + url);
        err.status = res.status;
        err.latencyMs = now() - started;
        throw err;
      }
      var ctype = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
      if (options.asText || ctype.indexOf("application/json") === -1 && options.expectJson === false) {
        return res.text();
      }
      return res.json();
    });

    if (!controller) return fetchPromise;

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        try { controller.abort(); } catch (e) { /* ignore */ }
        var err = new Error("Timed out after " + timeoutMs + "ms: " + url);
        err.code = "timeout";
        err.latencyMs = timeoutMs;
        reject(err);
      }, timeoutMs);
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function shouldRetry(err, attempt, maxRetries) {
    if (attempt >= maxRetries) return false;
    if (!err) return false;
    if (err.code === "aborted") return false;
    if (err.code === "timeout") return true;
    if (err.status >= 500) return true;
    if (err.status === 429) return true;
    if (!err.status && err.message && /network|failed|fetch/i.test(err.message)) return true;
    return false;
  }

  function fetchWithRetry(url, options) {
    options = options || {};
    var retries = options.retries != null ? options.retries : DEFAULT_RETRIES;
    var backoff = options.backoffMs != null ? options.backoffMs : DEFAULT_BACKOFF_MS;
    var providerId = options.providerId || null;
    var attempt = 0;

    function run() {
      if (!isOnline() && !options.allowOfflineNetwork) {
        var offlineErr = new Error("Offline — cannot reach " + url);
        offlineErr.code = "offline";
        return Promise.reject(offlineErr);
      }
      var started = now();
      return fetchOnce(url, options).then(function (data) {
        var latency = now() - started;
        if (providerId) {
          recordProvider(providerId, {
            status: "healthy",
            ok: (providers[providerId] && providers[providerId].ok || 0) + 1,
            lastOkAt: now(),
            lastLatencyMs: latency,
            lastError: null
          });
        }
        return data;
      }).catch(function (err) {
        if (providerId) {
          recordProvider(providerId, {
            status: err.code === "timeout" ? "timeout" : "degraded",
            fail: (providers[providerId] && providers[providerId].fail || 0) + 1,
            lastFailAt: now(),
            lastError: String(err && err.message || err),
            lastLatencyMs: err && err.latencyMs != null ? err.latencyMs : now() - started
          });
        }
        if (shouldRetry(err, attempt, retries)) {
          attempt += 1;
          return sleep(jitter(backoff * Math.pow(2, attempt - 1))).then(run);
        }
        throw err;
      });
    }

    return run();
  }

  /**
   * Coalesce identical in-flight requests; memory + session cache; retries.
   */
  function getJson(url, options) {
    options = options || {};
    var cacheKey = options.cacheKey || url;
    var maxAgeMs = options.maxAgeMs != null ? options.maxAgeMs : DEFAULT_MAX_AGE_MS;
    var coalesce = options.coalesce !== false;
    var persist = options.persist !== false;

    var mem = memoryCache[cacheKey];
    if (mem && now() - mem.at < maxAgeMs) {
      return Promise.resolve({
        data: mem.data,
        freshness: {
          source: "memory-cache",
          ageMs: now() - mem.at,
          fetchedAt: mem.at,
          stale: false
        }
      });
    }

    if (coalesce && inflight[cacheKey]) {
      return inflight[cacheKey];
    }

    var request = fetchWithRetry(url, options)
      .then(function (data) {
        var at = now();
        memoryCache[cacheKey] = { data: data, at: at };
        if (persist) writePersistent(cacheKey, data, at);
        return {
          data: data,
          freshness: { source: "network", ageMs: 0, fetchedAt: at, stale: false }
        };
      })
      .catch(function (err) {
        if (mem) {
          return {
            data: mem.data,
            freshness: {
              source: "stale-cache",
              ageMs: now() - mem.at,
              fetchedAt: mem.at,
              stale: true,
              error: String(err && err.message || err)
            }
          };
        }
        var persisted = persist ? readPersistent(cacheKey) : null;
        if (persisted && persisted.data != null) {
          memoryCache[cacheKey] = { data: persisted.data, at: persisted.at };
          return {
            data: persisted.data,
            freshness: {
              source: "persistent-cache",
              ageMs: now() - persisted.at,
              fetchedAt: persisted.at,
              stale: true,
              error: String(err && err.message || err)
            }
          };
        }
        throw err;
      })
      .finally(function () {
        delete inflight[cacheKey];
      });

    if (coalesce) inflight[cacheKey] = request;
    return request;
  }

  function getJsonAll(urls, options) {
    return Promise.all(
      (urls || []).map(function (u) {
        return getJson(u, options).then(
          function (pack) { return { ok: true, url: u, pack: pack }; },
          function (err) { return { ok: false, url: u, error: err }; }
        );
      })
    );
  }

  function clearCache(key) {
    if (key) {
      delete memoryCache[key];
      delete inflight[key];
      try {
        if (global.sessionStorage) sessionStorage.removeItem(PERSIST_PREFIX + key);
      } catch (e) { /* ignore */ }
      return;
    }
    memoryCache = {};
    inflight = {};
  }

  function onOfflineChange(fn) {
    if (typeof fn === "function") offlineListeners.push(fn);
    return function () {
      offlineListeners = offlineListeners.filter(function (f) { return f !== fn; });
    };
  }

  function notifyOffline(offline) {
    isOffline = !!offline;
    offlineListeners.forEach(function (fn) {
      try { fn(isOffline); } catch (e) { /* ignore */ }
    });
    try {
      var root = global.document && document.documentElement;
      if (root) root.dataset.wdsOffline = isOffline ? "true" : "false";
      var banner = global.document && document.getElementById("wds-offline-banner");
      if (banner) banner.hidden = !isOffline;
    } catch (e2) { /* ignore */ }
  }

  function ensureOfflineBanner() {
    if (typeof document === "undefined") return;
    if (document.getElementById("wds-offline-banner")) return;
    var el = document.createElement("div");
    el.id = "wds-offline-banner";
    el.className = "wds-offline-banner";
    el.setAttribute("role", "status");
    el.hidden = isOnline();
    el.textContent = "You appear offline. Showing cached data when available.";
    if (document.body) document.body.insertBefore(el, document.body.firstChild);
    else document.addEventListener("DOMContentLoaded", function () {
      if (!document.getElementById("wds-offline-banner")) {
        document.body.insertBefore(el, document.body.firstChild);
      }
    });
  }

  function bindOffline() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", function () { notifyOffline(false); });
    window.addEventListener("offline", function () { notifyOffline(true); });
    notifyOffline(!isOnline());
    ensureOfflineBanner();
  }

  function providerHealthHtml() {
    var rows = providerSnapshot();
    if (!rows.length) {
      return '<p class="wds-honesty">No provider calls recorded in this session yet.</p>';
    }
    return (
      '<ul class="wds-provider-health">' +
      rows.map(function (p) {
        return (
          "<li><strong>" + String(p.id) + "</strong> — " + String(p.status) +
          (p.lastLatencyMs != null ? " · " + p.lastLatencyMs + "ms" : "") +
          (p.lastError ? " · " + String(p.lastError) : "") +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  /**
   * Debounce helper for incremental search / filter inputs.
   */
  function debounce(fn, waitMs) {
    var t = null;
    waitMs = waitMs != null ? waitMs : 160;
    function wrapped() {
      var ctx = this;
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        fn.apply(ctx, args);
      }, waitMs);
    }
    wrapped.cancel = function () {
      if (t) clearTimeout(t);
      t = null;
    };
    return wrapped;
  }

  // Auto-bind in browsers
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindOffline);
    } else {
      bindOffline();
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.resilience = {
    version: "1.0.0",
    DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    DEFAULT_MAX_AGE_MS: DEFAULT_MAX_AGE_MS,
    getJson: getJson,
    getJsonAll: getJsonAll,
    fetchWithRetry: fetchWithRetry,
    fetchOnce: fetchOnce,
    clearCache: clearCache,
    formatFreshness: formatFreshness,
    recordProvider: recordProvider,
    providerSnapshot: providerSnapshot,
    providerHealthHtml: providerHealthHtml,
    isOnline: isOnline,
    onOfflineChange: onOfflineChange,
    ensureOfflineBanner: ensureOfflineBanner,
    sleep: sleep,
    debounce: debounce
  };
})(typeof window !== "undefined" ? window : globalThis);
