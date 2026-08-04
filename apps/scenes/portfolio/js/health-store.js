/**
 * Waypoint Scenes — Portfolio Health · Persistence
 *
 * localStorage key: waypoint-scenes-portfolio-health-v1
 * Stores analysis cache, insight decisions (save/dismiss/note/intentional/
 * not-relevant), enabled dimensions, last analysis date/version.
 * No blobs. No task manager / reminders / streaks.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "waypoint-scenes-portfolio-health-v1";
  var META_KEY = "waypoint-scenes-portfolio-health-meta-v1";
  var SCHEMA_VERSION = "1.0.0";
  var MAX_ANALYSES = 30;

  function Engine() {
    return global.WaypointScenesHealthEngine;
  }
  function Catalog() {
    return global.WaypointScenesHealthCatalog;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "ph-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readJson(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function emptyState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      insightState: Object.create(null),
      analyses: [],
      enabledDimensions: Catalog().DIMENSIONS.map(function (d) {
        return d.id;
      }),
      excludeIncompleteMetadataDimensions: false,
      lastScope: { type: "one", portfolioIds: [] },
      lastAnalyzedAt: null,
      lastAnalysisVersion: null
    };
  }

  function normalizeInsightState(row) {
    row = row || {};
    return {
      dismissed: !!row.dismissed,
      saved: !!row.saved,
      notRelevant: !!row.notRelevant,
      intentionalRepetition: !!row.intentionalRepetition,
      note: row.note ? String(row.note).slice(0, 500) : null,
      fingerprint: row.fingerprint || null,
      updatedAt: row.updatedAt || nowIso()
    };
  }

  function create() {
    var state = emptyState();
    var ready = false;

    function persist() {
      // insightState as plain object
      var insightState = {};
      Object.keys(state.insightState || {}).forEach(function (k) {
        insightState[k] = state.insightState[k];
      });
      writeJson(STORE_KEY, {
        schemaVersion: SCHEMA_VERSION,
        insightState: insightState,
        analyses: state.analyses.slice(0, MAX_ANALYSES),
        enabledDimensions: state.enabledDimensions.slice(),
        excludeIncompleteMetadataDimensions: !!state.excludeIncompleteMetadataDimensions,
        lastScope: state.lastScope,
        lastAnalyzedAt: state.lastAnalyzedAt,
        lastAnalysisVersion: state.lastAnalysisVersion
      });
      writeJson(META_KEY, { schemaVersion: SCHEMA_VERSION, updatedAt: nowIso() });
    }

    function init() {
      var raw = readJson(STORE_KEY, null);
      if (!raw) {
        state = emptyState();
      } else {
        state = emptyState();
        state.insightState = {};
        Object.keys(raw.insightState || {}).forEach(function (k) {
          state.insightState[k] = normalizeInsightState(raw.insightState[k]);
        });
        state.analyses = Array.isArray(raw.analyses) ? raw.analyses.slice(0, MAX_ANALYSES) : [];
        if (Array.isArray(raw.enabledDimensions) && raw.enabledDimensions.length) {
          state.enabledDimensions = raw.enabledDimensions.slice();
        }
        state.excludeIncompleteMetadataDimensions = !!raw.excludeIncompleteMetadataDimensions;
        state.lastScope = raw.lastScope || state.lastScope;
        state.lastAnalyzedAt = raw.lastAnalyzedAt || null;
        state.lastAnalysisVersion = raw.lastAnalysisVersion || null;
      }
      ready = true;
      return Promise.resolve({ ok: true });
    }

    function getState() {
      return state;
    }

    function setDimensions(ids, excludeIncomplete) {
      if (Array.isArray(ids) && ids.length) state.enabledDimensions = ids.slice();
      if (excludeIncomplete != null) state.excludeIncompleteMetadataDimensions = !!excludeIncomplete;
      persist();
      return state;
    }

    function setInsightFlags(insightId, patch) {
      var cur = normalizeInsightState(state.insightState[insightId]);
      patch = patch || {};
      if (patch.dismissed != null) cur.dismissed = !!patch.dismissed;
      if (patch.saved != null) cur.saved = !!patch.saved;
      if (patch.notRelevant != null) cur.notRelevant = !!patch.notRelevant;
      if (patch.intentionalRepetition != null) cur.intentionalRepetition = !!patch.intentionalRepetition;
      if (patch.note !== undefined) cur.note = patch.note ? String(patch.note).slice(0, 500) : null;
      if (patch.fingerprint) cur.fingerprint = patch.fingerprint;
      cur.updatedAt = nowIso();
      state.insightState[insightId] = cur;
      persist();
      return cur;
    }

    function restoreInsight(insightId) {
      return setInsightFlags(insightId, {
        dismissed: false,
        notRelevant: false
      });
    }

    /**
     * Run analysis and cache. Reuses cache when signature matches.
     */
    function runAnalysis(input, opts) {
      opts = opts || {};
      var force = !!opts.force;
      var payload = Object.assign({}, input, {
        enabledDimensions: state.enabledDimensions,
        excludeIncompleteMetadataDimensions: state.excludeIncompleteMetadataDimensions
      });
      var fresh = Engine().analyze(payload);
      if (!force) {
        var cached = state.analyses.filter(function (a) {
          return a.signature === fresh.signature && a.analysisVersion === fresh.analysisVersion;
        })[0];
        if (cached) {
          var mergedCached = Engine().mergePersisted(cached, { insightState: state.insightState });
          return mergedCached;
        }
      }
      // Stamp fingerprints into insightState keys for future merges
      fresh.insights.forEach(function (ins) {
        var prev = state.insightState[ins.id];
        if (!prev) {
          state.insightState[ins.id] = normalizeInsightState({
            fingerprint: ins.fingerprint,
            dismissed: false,
            saved: false
          });
        } else if (!prev.fingerprint) {
          prev.fingerprint = ins.fingerprint;
        }
      });
      var merged = Engine().mergePersisted(fresh, { insightState: state.insightState });
      // Update fingerprints after merge for changed insights
      merged.insights.forEach(function (ins) {
        var st = state.insightState[ins.id] || normalizeInsightState({});
        st.fingerprint = ins.fingerprint;
        state.insightState[ins.id] = st;
      });
      state.analyses = [merged].concat(
        state.analyses.filter(function (a) {
          return a.signature !== merged.signature;
        })
      ).slice(0, MAX_ANALYSES);
      state.lastAnalyzedAt = merged.generatedAt;
      state.lastAnalysisVersion = merged.analysisVersion;
      state.lastScope = {
        type: merged.scope,
        portfolioIds: merged.portfolioIds.slice()
      };
      persist();
      return merged;
    }

    function latestAnalysis() {
      return state.analyses[0] || null;
    }

    return {
      init: init,
      getState: getState,
      setDimensions: setDimensions,
      setInsightFlags: setInsightFlags,
      restoreInsight: restoreInsight,
      runAnalysis: runAnalysis,
      latestAnalysis: latestAnalysis,
      persist: persist,
      ready: function () {
        return ready;
      }
    };
  }

  global.WaypointScenesHealthStore = {
    STORE_KEY: STORE_KEY,
    META_KEY: META_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    create: create,
    uuid: uuid
  };
})(typeof window !== "undefined" ? window : globalThis);
