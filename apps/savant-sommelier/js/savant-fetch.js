/**
 * Savant Sommelier — fetch helpers (delegates to WDS.platformUi).
 */
(function (global) {
  "use strict";

  function getJson(url, options) {
    if (global.WDS && WDS.platformUi && WDS.platformUi.getJson) {
      return WDS.platformUi.getJson(url, Object.assign({ maxAgeMs: 10 * 60 * 1000 }, options || {}));
    }
    options = options || {};
    return fetch(url, options.fetchOptions || {}).then(function (res) {
      if (!res.ok) {
        var err = new Error("HTTP " + res.status + " for " + url);
        err.status = res.status;
        throw err;
      }
      return res.json().then(function (data) {
        return {
          data: data,
          freshness: { source: "network", ageMs: 0, fetchedAt: Date.now(), stale: false }
        };
      });
    });
  }

  function clearCache() {
    if (global.WDS && WDS.platformUi && WDS.platformUi.clearCache) {
      WDS.platformUi.clearCache();
    }
  }

  global.SavantFetch = {
    getJson: getJson,
    clearCache: clearCache,
    DEFAULT_TIMEOUT_MS: (global.WDS && WDS.platformUi && WDS.platformUi.DEFAULT_TIMEOUT_MS) || 8000
  };
})(typeof window !== "undefined" ? window : globalThis);
