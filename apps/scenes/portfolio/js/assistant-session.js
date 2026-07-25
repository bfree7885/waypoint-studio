/**
 * Waypoint Scenes — Portfolio Assistant · Candidate session model + store
 *
 * localStorage key: waypoint-scenes-portfolio-candidate-sessions-v1
 * Sessions store refs + assistant output + user decisions ONLY (no blobs).
 *
 * Core guarantee: recomputation (reanalyze) refreshes assistant suggestions
 * but NEVER overwrites explicit user decisions. Assistant suggestion and user
 * decision are stored separately so the UI can show both.
 */
(function (global) {
  "use strict";

  var SESSIONS_KEY = "waypoint-scenes-portfolio-candidate-sessions-v1";
  var META_KEY = "waypoint-scenes-portfolio-candidate-sessions-meta-v1";
  var SCHEMA_VERSION = "1.0.0";
  var MAX_SESSIONS = 50;

  function Recommend() {
    return global.WaypointScenesAssistantRecommend;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "cs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
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

  function createDecision(partial) {
    partial = partial || {};
    return {
      status: partial.status || null, // strong | supporting | later | excluded | null
      category: partial.category || null, // user-chosen category override
      preferredInGroup: !!partial.preferredInGroup,
      addedToPortfolioIds: Array.isArray(partial.addedToPortfolioIds) ? partial.addedToPortfolioIds.slice() : [],
      dismissed: !!partial.dismissed,
      decidedAt: partial.decidedAt || nowIso()
    };
  }

  function normalizeSession(row) {
    row = row || {};
    return {
      schemaVersion: row.schemaVersion || SCHEMA_VERSION,
      id: row.id || uuid(),
      title: row.title || "Candidate review",
      createdAt: row.createdAt || nowIso(),
      updatedAt: row.updatedAt || nowIso(),
      source: row.source || { type: "library", ref: null, label: "Your Photo Library" },
      imageIds: Array.isArray(row.imageIds) ? row.imageIds.slice() : [],
      analysisVersion: row.analysisVersion || null,
      analyzedAt: row.analyzedAt || null,
      recommendations: row.recommendations || {},
      groups: Array.isArray(row.groups) ? row.groups : [],
      order: Array.isArray(row.order) ? row.order : [],
      decisions: row.decisions || {},
      destinationPortfolioIds: Array.isArray(row.destinationPortfolioIds) ? row.destinationPortfolioIds.slice() : [],
      status: row.status || null,
      message: row.message || null
    };
  }

  function create() {
    var sessions = [];
    var ready = false;

    function byId(id) {
      for (var i = 0; i < sessions.length; i++) if (sessions[i].id === id) return sessions[i];
      return null;
    }

    function persist() {
      writeJson(SESSIONS_KEY, sessions.slice(0, MAX_SESSIONS));
      writeJson(META_KEY, { schemaVersion: SCHEMA_VERSION, updatedAt: nowIso() });
    }

    function touch(s) {
      s.updatedAt = nowIso();
      return s;
    }

    function init() {
      var raw = readJson(SESSIONS_KEY, []);
      sessions = (Array.isArray(raw) ? raw : []).map(normalizeSession);
      ready = true;
      return Promise.resolve({ sessionCount: sessions.length });
    }

    /**
     * @param {{source:object, images:object[], title?:string, destinationPortfolioIds?:string[]}} input
     */
    function startSession(input) {
      input = input || {};
      var images = input.images || [];
      var result = Recommend().analyze(images, {});
      var s = normalizeSession({
        title: input.title || (input.source && input.source.label) || "Candidate review",
        source: input.source || { type: "library", ref: null, label: "Your Photo Library" },
        imageIds: images.map(function (img) { return img.id; }),
        analysisVersion: result.analysisVersion,
        analyzedAt: result.analyzedAt,
        recommendations: result.recommendations,
        groups: result.groups,
        order: result.order,
        status: result.status,
        message: result.message,
        decisions: {},
        destinationPortfolioIds: input.destinationPortfolioIds || []
      });
      sessions.unshift(s);
      persist();
      return s;
    }

    /**
     * Refresh assistant output without disturbing user decisions.
     */
    function reanalyze(sessionId, images) {
      var s = byId(sessionId);
      if (!s) return null;
      images = images || [];
      var result = Recommend().analyze(images, {
        previous: {
          analysisVersion: s.analysisVersion,
          recommendations: s.recommendations
        }
      });
      s.imageIds = images.map(function (img) { return img.id; });
      s.analysisVersion = result.analysisVersion;
      s.analyzedAt = result.analyzedAt;
      s.recommendations = result.recommendations;
      s.groups = result.groups;
      s.order = result.order;
      s.status = result.status;
      s.message = result.message;
      // decisions intentionally preserved
      touch(s);
      persist();
      return s;
    }

    function setDecision(sessionId, imageId, patch) {
      var s = byId(sessionId);
      if (!s || !imageId) return null;
      var existing = s.decisions[imageId] || createDecision({});
      var next = createDecision({
        status: patch.status !== undefined ? patch.status : existing.status,
        category: patch.category !== undefined ? patch.category : existing.category,
        preferredInGroup: patch.preferredInGroup !== undefined ? patch.preferredInGroup : existing.preferredInGroup,
        addedToPortfolioIds: patch.addedToPortfolioIds !== undefined ? patch.addedToPortfolioIds : existing.addedToPortfolioIds,
        dismissed: patch.dismissed !== undefined ? patch.dismissed : existing.dismissed,
        decidedAt: nowIso()
      });
      s.decisions[imageId] = next;
      touch(s);
      persist();
      return next;
    }

    function clearDecision(sessionId, imageId) {
      var s = byId(sessionId);
      if (!s) return null;
      if (s.decisions[imageId]) {
        delete s.decisions[imageId];
        touch(s);
        persist();
      }
      return s;
    }

    /** Mark one image as the preferred frame within its similar group. */
    function setPreferredInGroup(sessionId, groupId, imageId) {
      var s = byId(sessionId);
      if (!s) return null;
      var group = s.groups.filter(function (g) { return g.id === groupId; })[0];
      if (!group) return null;
      group.imageIds.forEach(function (id) {
        var pref = id === imageId;
        var dec = s.decisions[id] || createDecision({});
        dec.preferredInGroup = pref;
        dec.decidedAt = nowIso();
        s.decisions[id] = dec;
      });
      touch(s);
      persist();
      return s;
    }

    function recordAddedToPortfolio(sessionId, imageId, portfolioId) {
      var s = byId(sessionId);
      if (!s) return null;
      var dec = s.decisions[imageId] || createDecision({});
      if (dec.addedToPortfolioIds.indexOf(portfolioId) < 0) dec.addedToPortfolioIds.push(portfolioId);
      if (!dec.status) dec.status = "strong";
      dec.decidedAt = nowIso();
      s.decisions[imageId] = dec;
      if (s.destinationPortfolioIds.indexOf(portfolioId) < 0) s.destinationPortfolioIds.push(portfolioId);
      touch(s);
      persist();
      return dec;
    }

    function deleteSession(sessionId) {
      var before = sessions.length;
      sessions = sessions.filter(function (x) { return x.id !== sessionId; });
      if (sessions.length === before) return false;
      persist();
      return true;
    }

    /**
     * Effective category for an image: user override wins over assistant.
     */
    function effectiveCategory(session, imageId) {
      var dec = session.decisions[imageId];
      if (dec && dec.category) return dec.category;
      var rec = session.recommendations[imageId];
      return rec ? rec.category : null;
    }

    return {
      id: "ScenesAssistantSessions",
      version: SCHEMA_VERSION,
      init: init,
      isReady: function () { return ready; },
      list: function () { return sessions.slice(); },
      get: byId,
      startSession: startSession,
      reanalyze: reanalyze,
      setDecision: setDecision,
      clearDecision: clearDecision,
      setPreferredInGroup: setPreferredInGroup,
      recordAddedToPortfolio: recordAddedToPortfolio,
      deleteSession: deleteSession,
      effectiveCategory: effectiveCategory
    };
  }

  var singleton = null;

  global.WaypointScenesAssistantSessions = {
    SESSIONS_KEY: SESSIONS_KEY,
    META_KEY: META_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_SESSIONS: MAX_SESSIONS,
    createDecision: createDecision,
    normalizeSession: normalizeSession,
    create: create,
    getShared: function () {
      if (!singleton) singleton = create();
      return singleton;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
