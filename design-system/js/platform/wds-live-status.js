/**
 * Waypoint Live Data Status — reusable honesty strip for any live feed.
 *
 * Reports: last updated · source · Healthy / Warning / Offline · retry · graceful failure.
 * Never fabricates freshness. Prefer explicit Unknown over silent omission.
 *
 * @see docs/quality/live-data-sources.md
 * @see docs/quality/live-data-reliability-owner-review.md
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});

  var STATES = {
    HEALTHY: "healthy",
    WARNING: "warning",
    OFFLINE: "offline",
    UNKNOWN: "unknown",
    LOADING: "loading"
  };

  var STATE_LABELS = {
    healthy: "Healthy",
    warning: "Warning",
    offline: "Offline",
    unknown: "Unknown",
    loading: "Loading"
  };

  /** Soft age thresholds (ms). Callers may override via spec.maxAgeMs / warnAgeMs. */
  var DEFAULT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  var DEFAULT_WARN_AGE_MS = 3 * 60 * 60 * 1000;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeState(raw) {
    if (raw == null || raw === "") return STATES.UNKNOWN;
    var s = String(raw).toLowerCase().replace(/[\s_]+/g, "-");
    if (
      s === "healthy" ||
      s === "ok" ||
      s === "live" ||
      s === "fresh" ||
      s === "ready"
    ) {
      return STATES.HEALTHY;
    }
    if (
      s === "warning" ||
      s === "warn" ||
      s === "partial" ||
      s === "stale" ||
      s === "degraded" ||
      s === "healthy-degraded" ||
      s === "cached" ||
      s === "fallback" ||
      s === "sample-demo" ||
      s === "demo" ||
      s === "sample"
    ) {
      return STATES.WARNING;
    }
    if (
      s === "offline" ||
      s === "unavailable" ||
      s === "error" ||
      s === "failed" ||
      s === "timeout" ||
      s === "empty"
    ) {
      return STATES.OFFLINE;
    }
    if (s === "loading" || s === "pending" || s === "in-progress") {
      return STATES.LOADING;
    }
    if (s === "unknown" || s === "planned") return STATES.UNKNOWN;
    return STATES.UNKNOWN;
  }

  function parseTime(iso) {
    if (!iso) return NaN;
    var t = Date.parse(iso);
    return isFinite(t) ? t : NaN;
  }

  function ageMs(iso, now) {
    var t = parseTime(iso);
    if (!isFinite(t)) return null;
    return (now != null ? now : Date.now()) - t;
  }

  function formatUpdatedAt(iso, now) {
    var t = parseTime(iso);
    if (!isFinite(t)) return null;
    var age = (now != null ? now : Date.now()) - t;
    if (age < 0) age = 0;
    var sec = Math.floor(age / 1000);
    if (sec < 45) return "just now";
    if (sec < 90) return "about 1 minute ago";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + " minutes ago";
    var hr = Math.floor(min / 60);
    if (hr < 36) return hr === 1 ? "about 1 hour ago" : hr + " hours ago";
    var day = Math.floor(hr / 24);
    return day === 1 ? "about 1 day ago" : day + " days ago";
  }

  function applyAgePolicy(state, updatedAt, opts) {
    opts = opts || {};
    var age = ageMs(updatedAt);
    if (age == null) return state;
    var maxAge = opts.maxAgeMs != null ? opts.maxAgeMs : DEFAULT_MAX_AGE_MS;
    var warnAge = opts.warnAgeMs != null ? opts.warnAgeMs : DEFAULT_WARN_AGE_MS;
    if (state === STATES.OFFLINE || state === STATES.LOADING) return state;
    if (age > maxAge) return STATES.OFFLINE;
    if (age > warnAge && state === STATES.HEALTHY) return STATES.WARNING;
    return state;
  }

  /**
   * Normalize any feed into a status spec.
   * @param {object} partial
   */
  function createSpec(partial) {
    partial = partial || {};
    var state = normalizeState(partial.state);
    if (partial.updatedAt && !partial.skipAgePolicy) {
      state = applyAgePolicy(state, partial.updatedAt, partial);
    }
    return {
      id: partial.id || null,
      label: partial.label || "Live data",
      source: partial.source || null,
      state: state,
      updatedAt: partial.updatedAt || null,
      message: partial.message || null,
      retry: partial.retry || null,
      compact: !!partial.compact,
      details: partial.details || null
    };
  }

  function fromArticlesHealth(health, data, opts) {
    opts = opts || {};
    var status = (health && health.status) || (data ? "unknown" : "unavailable");
    var stale =
      !!(data && data.retainedPrevious) ||
      status === "stale" ||
      (typeof opts.isStale === "function" && opts.isStale(data));
    var state =
      status === "ok" && !stale
        ? STATES.HEALTHY
        : status === "partial" || status === "stale" || stale
          ? STATES.WARNING
          : status === "unavailable" || !data
            ? STATES.OFFLINE
            : STATES.UNKNOWN;
    var okFeeds = 0;
    var enabled = 0;
    ((health && health.feeds) || []).forEach(function (f) {
      if (!f || f.enabled === false) return;
      enabled += 1;
      if (f.ok) okFeeds += 1;
    });
    var message = null;
    if (state === STATES.HEALTHY) {
      message = enabled ? okFeeds + " of " + enabled + " enabled feeds responded" : "Curated feed package loaded";
    } else if (state === STATES.WARNING) {
      message = stale
        ? "Showing last successful curation until the next refresh"
        : enabled
          ? okFeeds + " of " + enabled + " enabled feeds responded"
          : "Partial refresh";
    } else if (state === STATES.OFFLINE) {
      message = "Article feeds are temporarily unavailable. Waypoint will not invent stories.";
    }
    return createSpec({
      id: "articles-rss",
      label: "Articles",
      source: "Curated publisher RSS (GitHub Actions every 12h)",
      state: state,
      updatedAt: (data && data.generatedAt) || (health && health.checkedAt) || null,
      message: message,
      retry: {
        available: true,
        label: "Refresh page",
        hint: "Reload to fetch the latest committed articles.json / health.json"
      },
      skipAgePolicy: true,
      maxAgeMs: opts.maxAgeMs,
      warnAgeMs: opts.warnAgeMs
    });
  }

  function fromLiveEngine(health, feed, opts) {
    opts = opts || {};
    var overall = (health && health.overall && health.overall.status) || null;
    var state;
    if (!feed && !health) state = STATES.OFFLINE;
    else if (overall) state = normalizeState(overall);
    else if (feed && feed.updatedAt) state = STATES.HEALTHY;
    else state = STATES.UNKNOWN;
    var message =
      (health && health.overall && health.overall.message) ||
      (feed ? null : "Live engine package unavailable");
    var sources = (feed && feed.meta && feed.meta.sources) || [];
    var sourceLabel =
      sources.length > 0
        ? sources
            .map(function (s) {
              return typeof s === "string" ? s : s && (s.name || s.provider);
            })
            .filter(Boolean)
            .slice(0, 4)
            .join(", ")
        : "Waypoint Live Engine (Open-Meteo, NWS, derived modules)";
    return createSpec({
      id: "live-engine",
      label: "Outdoor live engine",
      source: sourceLabel,
      state: state,
      updatedAt:
        (feed && feed.updatedAt) ||
        (health && health.overall && health.overall.lastSuccessfulRefresh) ||
        (health && health.generatedAt) ||
        null,
      message: message,
      retry: {
        available: true,
        label: "Retry",
        hint: "Engine refreshes on a ~30 minute schedule; reload to re-read data/live.json"
      },
      maxAgeMs: opts.maxAgeMs != null ? opts.maxAgeMs : 3 * 60 * 60 * 1000,
      warnAgeMs: opts.warnAgeMs != null ? opts.warnAgeMs : 90 * 60 * 1000
    });
  }

  function fromCyberLive(doc, opts) {
    opts = opts || {};
    var meta = (doc && doc.meta) || {};
    var providers = (doc && doc.providers) || [];
    var trust = meta.trustState || null;
    var state = normalizeState(trust);
    if (!doc) state = STATES.OFFLINE;
    var ok = providers.filter(function (p) {
      return p.status === "ok";
    }).length;
    var failed = providers.filter(function (p) {
      return p.status === "error" || p.status === "timeout" || p.status === "failed";
    }).length;
    var planned = providers.filter(function (p) {
      return p.status === "planned";
    }).length;
    var message =
      ok +
      " providers ok" +
      (failed ? " · " + failed + " unavailable" : "") +
      (planned ? " · " + planned + " planned (not faked live)" : "");
    if (!doc || !(doc.records && doc.records.length)) {
      if (state !== STATES.OFFLINE) state = STATES.WARNING;
      message = "No verified cyber intelligence has been retrieved yet";
    }
    return createSpec({
      id: "signalterrain-cyber",
      label: "Cyber intelligence",
      source: "Verified public providers (CISA, NVD, vendor advisories, status RSS)",
      state: state,
      updatedAt: meta.generatedAt || meta.updatedAt || null,
      message: message,
      retry: {
        available: true,
        label: "Reload",
        hint: "Re-read data/cyber/live.json; scheduled engine publishes when configured"
      },
      maxAgeMs: opts.maxAgeMs != null ? opts.maxAgeMs : 24 * 60 * 60 * 1000,
      warnAgeMs: opts.warnAgeMs != null ? opts.warnAgeMs : 6 * 60 * 60 * 1000
    });
  }

  function fromGlobalSignalsHome(home, opts) {
    opts = opts || {};
    if (!home) {
      return createSpec({
        id: "global-signals",
        label: "Global Signals",
        source: "Labeled Global Signals datasets",
        state: STATES.OFFLINE,
        message: "Dashboard package could not be loaded",
        retry: { available: true, label: "Retry", hint: "Reload the page" }
      });
    }
    var mode = home.mode || "unknown";
    var state =
      mode === "live"
        ? STATES.HEALTHY
        : mode === "sample-demo" || mode === "demo" || mode === "sample"
          ? STATES.WARNING
          : normalizeState(mode);
    var message =
      (home.honesty && home.honesty.banner) ||
      home.modeLabel ||
      (mode === "sample-demo"
        ? "Sample / demo dashboard — labeled datasets only, not a live news feed"
        : null);
    return createSpec({
      id: "global-signals",
      label: "Global Signals",
      source:
        mode === "live"
          ? "Live ingestion adapters (see data/global-signals/ingestion/status.json when present)"
          : "Curated sample / demo datasets on this branch",
      state: state,
      updatedAt: home.updatedAt || home.generatedAt || null,
      message: message,
      retry:
        mode === "live"
          ? {
              available: true,
              label: "Reload",
              hint: "Ingestion cadence is documented in live-data-sources.md"
            }
          : null,
      skipAgePolicy: mode !== "live",
      maxAgeMs: opts.maxAgeMs,
      warnAgeMs: opts.warnAgeMs
    });
  }

  /**
   * Client-side feed (e.g. Sheds Open-Meteo weather or map tiles).
   * @param {object} opts
   */
  function fromClientFeed(opts) {
    opts = opts || {};
    var state = normalizeState(opts.state);
    if (opts.ok === false) state = STATES.OFFLINE;
    else if (opts.ok === true && state === STATES.UNKNOWN) state = STATES.HEALTHY;
    if (opts.loading) state = STATES.LOADING;
    return createSpec({
      id: opts.id || "client-feed",
      label: opts.label || "Live feed",
      source: opts.source || null,
      state: state,
      updatedAt: opts.updatedAt || null,
      message: opts.message || null,
      retry: opts.retry || null,
      compact: opts.compact,
      maxAgeMs: opts.maxAgeMs,
      warnAgeMs: opts.warnAgeMs,
      skipAgePolicy: opts.skipAgePolicy
    });
  }

  function retryHtml(spec) {
    if (!spec.retry || !spec.retry.available) return "";
    var label = spec.retry.label || "Retry";
    var hint = spec.retry.hint || "";
    return (
      '<button type="button" class="wds-live-status__retry" data-wds-live-retry="' +
      esc(spec.id || "") +
      '"' +
      (hint ? ' title="' + esc(hint) + '"' : "") +
      ">" +
      esc(label) +
      "</button>"
    );
  }

  function renderHtml(spec) {
    spec = createSpec(spec);
    var relative = formatUpdatedAt(spec.updatedAt);
    var stateLabel = STATE_LABELS[spec.state] || STATE_LABELS.unknown;
    var updatedText = relative
      ? "Updated " + relative
      : spec.updatedAt
        ? "Updated " + esc(String(spec.updatedAt))
        : "Updated time unknown";
    var sourceText = spec.source ? "Source · " + spec.source : "Source · not disclosed";
    return (
      '<div class="wds-live-status' +
      (spec.compact ? " wds-live-status--compact" : "") +
      '" role="status" data-wds-live-status data-state="' +
      esc(spec.state) +
      '"' +
      (spec.id ? ' data-feed="' + esc(spec.id) + '"' : "") +
      (spec.updatedAt ? ' data-updated-at="' + esc(spec.updatedAt) + '"' : "") +
      ">" +
      '<span class="wds-live-status__dot" aria-hidden="true"></span>' +
      '<div class="wds-live-status__body">' +
      '<p class="wds-live-status__primary">' +
      '<span class="wds-live-status__state">' +
      esc(stateLabel) +
      "</span>" +
      '<span class="wds-live-status__sep" aria-hidden="true">·</span>' +
      '<span class="wds-live-status__label">' +
      esc(spec.label) +
      "</span>" +
      '<span class="wds-live-status__sep" aria-hidden="true">·</span>' +
      '<span class="wds-live-status__updated">' +
      (spec.updatedAt
        ? '<time datetime="' + esc(spec.updatedAt) + '">' + esc(updatedText) + "</time>"
        : esc(updatedText)) +
      "</span>" +
      "</p>" +
      '<p class="wds-live-status__source">' +
      esc(sourceText) +
      "</p>" +
      (spec.message
        ? '<p class="wds-live-status__message">' + esc(spec.message) + "</p>"
        : "") +
      (spec.details
        ? '<p class="wds-live-status__details">' + esc(spec.details) + "</p>"
        : "") +
      "</div>" +
      retryHtml(spec) +
      "</div>"
    );
  }

  function mount(el, spec, options) {
    if (!el) return null;
    options = options || {};
    el.innerHTML = renderHtml(spec);
    var root = el.querySelector("[data-wds-live-status]") || el.firstElementChild;
    if (options.onRetry && root) {
      var btn = root.querySelector("[data-wds-live-retry]");
      if (btn) {
        btn.addEventListener("click", function (ev) {
          ev.preventDefault();
          options.onRetry(createSpec(spec), ev);
        });
      }
    }
    return root;
  }

  function update(el, spec, options) {
    return mount(el, spec, options);
  }

  NS.liveStatus = {
    STATES: STATES,
    STATE_LABELS: STATE_LABELS,
    DEFAULT_MAX_AGE_MS: DEFAULT_MAX_AGE_MS,
    DEFAULT_WARN_AGE_MS: DEFAULT_WARN_AGE_MS,
    normalizeState: normalizeState,
    formatUpdatedAt: formatUpdatedAt,
    ageMs: ageMs,
    createSpec: createSpec,
    fromArticlesHealth: fromArticlesHealth,
    fromLiveEngine: fromLiveEngine,
    fromCyberLive: fromCyberLive,
    fromGlobalSignalsHome: fromGlobalSignalsHome,
    fromClientFeed: fromClientFeed,
    renderHtml: renderHtml,
    render: renderHtml,
    mount: mount,
    update: update
  };
})(typeof window !== "undefined" ? window : globalThis);
