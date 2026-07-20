/**
 * Outdoor Brief Intelligence — observation model + plugin registry.
 * Modules register observe(ctx) → Observation[]; engine scores & summarizes.
 *
 * Future plugins (Wildlife, Trail, Citizen Science, Emergency AI) register the same way.
 * Future AI: optional enricher hooks — see docs/OUTDOOR-INTELLIGENCE-ENGINE.md.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var MAX_BULLETS = 8;

  /** Priority bands (lower = more important). Aligns with Waypoint’s Take. */
  var PRIORITY = {
    TRUST: 0,
    SAFETY: 1,
    TIME_SENSITIVE: 2,
    OPPORTUNITY: 3,
    PHOTO_HIKE: 4,
    ENVIRONMENT: 5,
    RIVERS_SEASONAL: 6
  };

  var CONFIDENCE = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

  var _plugins = [];
  var _enrichers = [];

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "object" && v.value != null) return num(v.value);
    var n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  /**
   * @param {object} opts
   * @returns {object} Observation
   */
  function observation(opts) {
    opts = opts || {};
    var confidence = normalizeConfidence(opts.confidence);
    var text = String(opts.text || "").replace(/\s+/g, " ").trim();
    var theme = String(opts.theme || opts.id || "general").toLowerCase();
    var priority =
      opts.priority != null && isFinite(Number(opts.priority))
        ? Number(opts.priority)
        : PRIORITY.ENVIRONMENT;
    return {
      id: opts.id || theme + "-" + priority,
      theme: theme,
      module: opts.module || "core",
      priority: priority,
      confidence: confidence,
      text: text,
      statement: text ? text + " [" + confidence + "]" : "",
      evidence: opts.evidence || null,
      source: opts.source || "",
      live: opts.live !== false
    };
  }

  function normalizeConfidence(c) {
    if (c == null) return CONFIDENCE.MEDIUM;
    var s = String(c);
    if (/^high$/i.test(s) || c === 1 || c >= 0.85) return CONFIDENCE.HIGH;
    if (/^low$/i.test(s) || c === 0 || c < 0.45) return CONFIDENCE.LOW;
    if (/^med/i.test(s)) return CONFIDENCE.MEDIUM;
    return CONFIDENCE.MEDIUM;
  }

  /**
   * Confidence from provider honesty — never claim High on cached/offline/partial.
   */
  function confidenceFromTrust(trust, liveEvidence) {
    trust = String(trust || "partial").toLowerCase();
    if (trust === "offline") return CONFIDENCE.LOW;
    if (trust === "cached" || trust === "provider-unavailable") return CONFIDENCE.LOW;
    if (trust === "partial" || trust === "unknown") {
      return liveEvidence ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
    }
    if (trust === "live" && liveEvidence) return CONFIDENCE.HIGH;
    if (trust === "live") return CONFIDENCE.MEDIUM;
    return liveEvidence ? CONFIDENCE.MEDIUM : CONFIDENCE.LOW;
  }

  /**
   * Register an observation plugin.
   * @param {{ id: string, module?: string, observe: function(object): Array|object|null }} plugin
   */
  function registerPlugin(plugin) {
    if (!plugin || !plugin.id || typeof plugin.observe !== "function") return false;
    var existing = _plugins.findIndex(function (p) {
      return p.id === plugin.id;
    });
    if (existing >= 0) _plugins[existing] = plugin;
    else _plugins.push(plugin);
    return true;
  }

  function unregisterPlugin(id) {
    _plugins = _plugins.filter(function (p) {
      return p.id !== id;
    });
  }

  function listPlugins() {
    return _plugins.map(function (p) {
      return { id: p.id, module: p.module || "core" };
    });
  }

  /**
   * Future AI / NLP enrichers — optional post-processors.
   * Must not invent facts; may only rephrase registered observations.
   * @param {{ id: string, enrich: function(Observation[], object): Observation[] }} enricher
   */
  function registerEnricher(enricher) {
    if (!enricher || !enricher.id || typeof enricher.enrich !== "function") return false;
    var existing = _enrichers.findIndex(function (e) {
      return e.id === enricher.id;
    });
    if (existing >= 0) _enrichers[existing] = enricher;
    else _enrichers.push(enricher);
    return true;
  }

  function collectFromPlugins(ctx) {
    var out = [];
    _plugins.forEach(function (plugin) {
      try {
        var result = plugin.observe(ctx);
        if (!result) return;
        var list = Array.isArray(result) ? result : [result];
        list.forEach(function (item) {
          if (!item) return;
          var obs =
            item.statement || item.text
              ? observation(
                  Object.assign({ module: plugin.module || plugin.id }, item)
                )
              : null;
          if (obs && obs.text) out.push(obs);
        });
      } catch (e) {
        /* plugin failure must not break brief */
      }
    });
    return out;
  }

  function runEnrichers(observations, ctx) {
    var list = observations.slice();
    _enrichers.forEach(function (en) {
      try {
        var next = en.enrich(list, ctx);
        if (Array.isArray(next)) list = next;
      } catch (e) { /* enricher optional */ }
    });
    return list;
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorBriefRegistry = {
    VERSION: VERSION,
    MAX_BULLETS: MAX_BULLETS,
    PRIORITY: PRIORITY,
    CONFIDENCE: CONFIDENCE,
    observation: observation,
    normalizeConfidence: normalizeConfidence,
    confidenceFromTrust: confidenceFromTrust,
    num: num,
    registerPlugin: registerPlugin,
    unregisterPlugin: unregisterPlugin,
    listPlugins: listPlugins,
    registerEnricher: registerEnricher,
    collectFromPlugins: collectFromPlugins,
    runEnrichers: runEnrichers,
    /** Test helper — clear plugins (keeps built-ins only if re-registered). */
    _resetForTests: function () {
      _plugins = [];
      _enrichers = [];
    },
    _pluginCount: function () {
      return _plugins.length;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
