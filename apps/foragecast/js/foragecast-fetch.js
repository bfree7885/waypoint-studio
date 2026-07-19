/**
 * ForageCast fetch helpers — timeouts, cache awareness, clear failures.
 * No endless loaders; callers must render error/offline states.
 */
(function (global) {
  "use strict";

  var memoryCache = {};
  var DEFAULT_TIMEOUT_MS = 8000;

  function now() {
    return Date.now();
  }

  function fetchWithTimeout(url, options) {
    options = options || {};
    var timeoutMs = options.timeoutMs != null ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    var fetchOpts = Object.assign({}, options.fetchOptions || {}, controller ? { signal: controller.signal } : {});

    var fetchPromise = fetch(url, fetchOpts).then(function (res) {
      if (!res.ok) {
        var err = new Error("HTTP " + res.status + " for " + url);
        err.status = res.status;
        throw err;
      }
      return res.json();
    });

    if (!controller) {
      return fetchPromise;
    }

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        try {
          controller.abort();
        } catch (e) { /* ignore */ }
        var err = new Error("Timed out after " + timeoutMs + "ms: " + url);
        err.code = "timeout";
        reject(err);
      }, timeoutMs);
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function getJson(url, options) {
    options = options || {};
    var cacheKey = options.cacheKey || url;
    var maxAgeMs = options.maxAgeMs != null ? options.maxAgeMs : 5 * 60 * 1000;
    var cached = memoryCache[cacheKey];
    if (cached && now() - cached.at < maxAgeMs) {
      return Promise.resolve({
        data: cached.data,
        freshness: {
          source: "memory-cache",
          ageMs: now() - cached.at,
          fetchedAt: cached.at,
          stale: false
        }
      });
    }

    return fetchWithTimeout(url, options)
      .then(function (data) {
        memoryCache[cacheKey] = { data: data, at: now() };
        return {
          data: data,
          freshness: {
            source: "network",
            ageMs: 0,
            fetchedAt: now(),
            stale: false
          }
        };
      })
      .catch(function (err) {
        if (cached) {
          return {
            data: cached.data,
            freshness: {
              source: "stale-cache",
              ageMs: now() - cached.at,
              fetchedAt: cached.at,
              stale: true,
              error: err.message || String(err)
            }
          };
        }
        throw err;
      });
  }

  function clearCache(key) {
    if (key) delete memoryCache[key];
    else memoryCache = {};
  }

  function formatFreshness(freshness) {
    if (!freshness) return "Freshness unknown";
    if (freshness.source === "memory-cache") {
      var mins = Math.round((freshness.ageMs || 0) / 60000);
      return mins <= 0 ? "Cached just now" : "Cached · " + mins + " min ago";
    }
    if (freshness.source === "stale-cache") {
      return "Offline / stale cache · " + (freshness.error || "using last good data");
    }
    return "Live fetch";
  }

  global.ForageCastFetch = {
    fetchWithTimeout: fetchWithTimeout,
    getJson: getJson,
    clearCache: clearCache,
    formatFreshness: formatFreshness,
    DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS
  };
})(typeof window !== "undefined" ? window : globalThis);
