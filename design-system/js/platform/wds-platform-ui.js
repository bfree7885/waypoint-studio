/**
 * Waypoint Studio — Platform UI helpers
 * escapeHtml, fetchJson, loading/empty/error markup, shared task nav renderer.
 */
(function (global) {
  "use strict";

  var memoryCache = {};
  var DEFAULT_TIMEOUT_MS = 8000;
  var DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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

    if (!controller) return fetchPromise;

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        try { controller.abort(); } catch (e) { /* ignore */ }
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
    var maxAgeMs = options.maxAgeMs != null ? options.maxAgeMs : DEFAULT_MAX_AGE_MS;
    var cached = memoryCache[cacheKey];
    if (cached && now() - cached.at < maxAgeMs) {
      return Promise.resolve({
        data: cached.data,
        freshness: { source: "memory-cache", ageMs: now() - cached.at, fetchedAt: cached.at, stale: false }
      });
    }
    return fetchWithTimeout(url, options)
      .then(function (data) {
        memoryCache[cacheKey] = { data: data, at: now() };
        return {
          data: data,
          freshness: { source: "network", ageMs: 0, fetchedAt: now(), stale: false }
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
              error: String(err && err.message || err)
            }
          };
        }
        throw err;
      });
  }

  function clearCache() {
    memoryCache = {};
  }

  function loadingHtml(msg, opts) {
    opts = opts || {};
    var cls = opts.inline ? "wds-loading wds-loading--inline" : "wds-loading";
    return '<p class="' + cls + '"' + (opts.busy !== false ? ' aria-busy="true"' : "") + ">" +
      escapeHtml(msg || "Loading…") + "</p>";
  }

  function skeletonHtml(lines) {
    lines = lines || 3;
    var html = '<div class="wds-skeleton" aria-hidden="true">';
    for (var i = 0; i < lines; i++) {
      var extra = i === 0 ? " wds-skeleton__line--title" : i === lines - 1 ? " wds-skeleton__line--short" : "";
      html += '<div class="wds-skeleton__line' + extra + '"></div>';
    }
    return html + "</div>";
  }

  function emptyHtml(opts) {
    opts = opts || {};
    if (typeof opts === "string") opts = { text: opts };
    var title = opts.title ? '<p class="wds-state__title">' + escapeHtml(opts.title) + "</p>" : "";
    var text = '<p class="wds-state wds-empty-inline">' + escapeHtml(opts.text || "Nothing here yet.") + "</p>";
    return '<div class="wds-state" role="status">' + title + text + "</div>";
  }

  function errorHtml(opts) {
    opts = opts || {};
    if (typeof opts === "string") opts = { text: opts };
    var kind = opts.kind || "error";
    var titleMap = {
      error: "Something went wrong",
      timeout: "Request timed out",
      offline: "You appear to be offline",
      permission: "Permission needed",
      unavailable: "Service unavailable",
      empty: "No results"
    };
    var title = opts.title || titleMap[kind] || titleMap.error;
    var actions = "";
    if (opts.retry) {
      actions =
        '<div class="wds-state__actions">' +
        '<button type="button" class="wds-btn wds-btn--secondary" data-wds-retry>' +
        escapeHtml(opts.retryLabel || "Retry") +
        "</button></div>";
    }
    return (
      '<div class="wds-state" role="alert">' +
      '<p class="wds-state__title">' + escapeHtml(title) + "</p>" +
      '<p class="wds-error">' + escapeHtml(opts.text || "Please try again.") + "</p>" +
      actions +
      "</div>"
    );
  }

  function honestyHtml(text) {
    return '<p class="wds-honesty">' + escapeHtml(text) + "</p>";
  }

  /**
   * @param {Array<[id, href, label]>} items
   * @param {string} active
   * @param {object} [opts]
   */
  function taskNav(items, active, opts) {
    opts = opts || {};
    var label = opts.ariaLabel || "Application tasks";
    var cls = opts.className || "wds-task-nav";
    return (
      '<nav class="' + cls + '" aria-label="' + escapeHtml(label) + '">' +
      (items || []).map(function (it) {
        var on = it[0] === active ? " is-active" : "";
        return (
          '<a class="wds-task-nav__link' + on + '" href="' + escapeHtml(it[1]) + '"' +
          (on ? ' aria-current="page"' : "") + ">" +
          escapeHtml(it[2]) +
          "</a>"
        );
      }).join("") +
      "</nav>"
    );
  }

  function classifyError(err) {
    if (!err) return "error";
    if (err.code === "timeout") return "timeout";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
    if (err.status === 401 || err.status === 403) return "permission";
    if (err.status === 404 || err.status >= 500) return "unavailable";
    return "error";
  }

  global.WDS = global.WDS || {};
  global.WDS.escapeHtml = escapeHtml;
  global.WDS.platformUi = {
    version: "1.0.0",
    escapeHtml: escapeHtml,
    getJson: getJson,
    clearCache: clearCache,
    fetchWithTimeout: fetchWithTimeout,
    loadingHtml: loadingHtml,
    skeletonHtml: skeletonHtml,
    emptyHtml: emptyHtml,
    errorHtml: errorHtml,
    honestyHtml: honestyHtml,
    taskNav: taskNav,
    classifyError: classifyError,
    DEFAULT_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    DEFAULT_MAX_AGE_MS: DEFAULT_MAX_AGE_MS
  };

  // Alias for apps that already expect WDS.core helpers
  if (global.WDS.core) {
    global.WDS.core.escapeHtml = escapeHtml;
  }
})(typeof window !== "undefined" ? window : globalThis);
