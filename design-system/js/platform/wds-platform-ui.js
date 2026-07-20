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
    if (global.WDS && WDS.resilience && WDS.resilience.fetchOnce) {
      return WDS.resilience.fetchOnce(url, options);
    }
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
    if (global.WDS && WDS.resilience && WDS.resilience.getJson) {
      return WDS.resilience.getJson(url, options);
    }
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

  function clearCache(key) {
    if (global.WDS && WDS.resilience && WDS.resilience.clearCache) {
      WDS.resilience.clearCache(key);
    }
    if (!key) memoryCache = {};
    else delete memoryCache[key];
  }

  function freshnessHtml(freshness) {
    var label = global.WDS && WDS.resilience && WDS.resilience.formatFreshness
      ? WDS.resilience.formatFreshness(freshness)
      : (freshness && freshness.source) || "";
    return label ? '<p class="wds-honesty wds-freshness">' + escapeHtml(label) + "</p>" : "";
  }

  function skeletonHtml(lines) {
    lines = lines || 3;
    var html = '<div class="wds-skeleton" aria-hidden="true">';
    for (var i = 0; i < lines; i++) {
      var extra =
        i === 0 ? " wds-skeleton__line--title" : i === lines - 1 ? " wds-skeleton__line--short" : "";
      html += '<div class="wds-skeleton__line' + extra + '"></div>';
    }
    return html + "</div>";
  }

  function emptyHtml(opts) {
    opts = opts || {};
    if (typeof opts === "string") opts = { text: opts };
    var title = opts.title
      ? '<p class="wds-state__title">' + escapeHtml(opts.title) + "</p>"
      : "";
    var text =
      '<p class="wds-state wds-empty-inline">' +
      escapeHtml(opts.text || "Nothing here yet.") +
      "</p>";
    var hint = opts.hint
      ? '<p class="wds-state__hint">' + escapeHtml(opts.hint) + "</p>"
      : "";
    var actions = "";
    if (opts.actionHref && opts.actionLabel) {
      actions =
        '<div class="wds-state__actions">' +
        '<a class="wds-btn wds-btn--primary" href="' +
        escapeHtml(opts.actionHref) +
        '">' +
        escapeHtml(opts.actionLabel) +
        "</a></div>";
    }
    return (
      '<div class="wds-state" role="status">' + title + text + hint + actions + "</div>"
    );
  }

  /**
   * Full-page empty guidance (preferred over blank main).
   */
  function emptyPageHtml(opts) {
    opts = opts || {};
    var actions = "";
    if (opts.actionHref && opts.actionLabel) {
      actions =
        '<div class="wds-empty-page__actions">' +
        '<a class="wds-btn wds-btn--primary" href="' +
        escapeHtml(opts.actionHref) +
        '">' +
        escapeHtml(opts.actionLabel) +
        "</a>";
      if (opts.secondaryHref && opts.secondaryLabel) {
        actions +=
          '<a class="wds-btn wds-btn--ghost" href="' +
          escapeHtml(opts.secondaryHref) +
          '">' +
          escapeHtml(opts.secondaryLabel) +
          "</a>";
      }
      actions += "</div>";
    }
    return (
      '<div class="wds-empty-page" role="status">' +
      (opts.eyebrow
        ? '<p class="wds-empty-page__eyebrow">' + escapeHtml(opts.eyebrow) + "</p>"
        : "") +
      '<h2 class="wds-empty-page__title">' +
      escapeHtml(opts.title || "Nothing here yet") +
      "</h2>" +
      '<p class="wds-empty-page__text">' +
      escapeHtml(
        opts.text ||
          "When you add something, it will appear here. You can also explore related Studio apps from the Apps menu."
      ) +
      "</p>" +
      actions +
      "</div>"
    );
  }

  function errorHtml(opts) {
    opts = opts || {};
    if (typeof opts === "string") opts = { text: opts };
    var kind = opts.kind || "error";
    var titleMap = {
      error: "Something went wrong",
      timeout: "This is taking longer than expected",
      offline: "You appear to be offline",
      permission: "Permission needed",
      unavailable: "This service is unavailable right now",
      empty: "No results",
      provider: "A data provider is unavailable"
    };
    var hintMap = {
      timeout: "You can retry, or keep browsing with whatever already loaded.",
      offline: "Cached information may still be available. Retry when you reconnect.",
      permission: "Check browser settings, then try again.",
      unavailable: "This is a temporary provider issue — not a problem with your data.",
      provider: "Live conditions may be delayed. Retry shortly, or continue with cached information if shown.",
      error: "A short wait and retry usually helps."
    };
    var title = opts.title || titleMap[kind] || titleMap.error;
    var hint =
      opts.hint ||
      (opts.cached
        ? "Showing the last saved information while we try again."
        : hintMap[kind] || "");
    var provider =
      opts.provider
        ? '<p class="wds-honesty" data-wds-provider-status>Provider: ' +
          escapeHtml(opts.provider) +
          (opts.providerStatus ? " — " + escapeHtml(opts.providerStatus) : "") +
          "</p>"
        : "";
    var recovery = "";
    if (opts.recoveryHref && opts.recoveryLabel) {
      recovery =
        '<p class="wds-state__hint"><a href="' +
        escapeHtml(opts.recoveryHref) +
        '">' +
        escapeHtml(opts.recoveryLabel) +
        "</a></p>";
    } else if (opts.support !== false && (kind === "error" || kind === "unavailable" || kind === "provider")) {
      recovery =
        '<p class="wds-state__hint"><a href="/contact.html?category=bug">Report a problem</a> · <a href="/support.html">Support</a></p>';
    }
    var actions = "";
    if (opts.retry) {
      actions =
        '<div class="wds-state__actions">' +
        '<button type="button" class="wds-btn wds-btn--secondary" data-wds-retry>' +
        escapeHtml(opts.retryLabel || "Try again") +
        "</button></div>";
    }
    return (
      '<div class="wds-state" role="alert"' +
      (opts.busy ? ' aria-busy="true"' : "") +
      ">" +
      '<p class="wds-state__title">' +
      escapeHtml(title) +
      "</p>" +
      '<p class="wds-error">' +
      escapeHtml(opts.text || "Please try again.") +
      "</p>" +
      (hint ? '<p class="wds-state__hint">' + escapeHtml(hint) + "</p>" : "") +
      provider +
      (opts.cached
        ? '<p class="wds-honesty">Using cached data — may not reflect the latest conditions.</p>'
        : "") +
      recovery +
      actions +
      "</div>"
    );
  }

  function loadingHtml(msg, opts) {
    opts = opts || {};
    var cls = opts.inline ? "wds-loading wds-loading--inline" : "wds-loading";
    var detail = opts.detail
      ? '<p class="wds-state__hint">' + escapeHtml(opts.detail) + "</p>"
      : "";
    if (opts.skeleton) {
      return (
        '<div class="' +
        cls +
        '" role="status" aria-live="polite"' +
        (opts.busy !== false ? ' aria-busy="true"' : "") +
        ">" +
        '<p>' +
        escapeHtml(msg || "Loading…") +
        "</p>" +
        detail +
        skeletonHtml(opts.lines || 4) +
        "</div>"
      );
    }
    return (
      '<p class="' +
      cls +
      '"' +
      (opts.busy !== false ? ' aria-busy="true"' : "") +
      ">" +
      escapeHtml(msg || "Loading…") +
      "</p>" +
      detail
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
    if (err.code === "provider" || err.provider) return "provider";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
    if (err.status === 401 || err.status === 403) return "permission";
    if (err.status === 404 || err.status >= 500) return "unavailable";
    return "error";
  }

  global.WDS = global.WDS || {};
  global.WDS.escapeHtml = escapeHtml;
  global.WDS.platformUi = {
    version: "2.1.0",
    escapeHtml: escapeHtml,
    getJson: getJson,
    clearCache: clearCache,
    fetchWithTimeout: fetchWithTimeout,
    loadingHtml: loadingHtml,
    skeletonHtml: skeletonHtml,
    emptyHtml: emptyHtml,
    emptyPageHtml: emptyPageHtml,
    errorHtml: errorHtml,
    honestyHtml: honestyHtml,
    freshnessHtml: freshnessHtml,
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
