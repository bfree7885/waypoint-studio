/**
 * Waypoint Scenes — Portfolio Coach · Persistence
 *
 * localStorage key: waypoint-scenes-portfolio-coach-v1
 * Stores comparative coaching sessions: pair refs, generated points,
 * user decisions, personal notes, helpful/dismissed flags, role overrides.
 * Never stores blobs. Never silently mutates portfolios or originals.
 *
 * Decisions are explicit and survive re-generation of coaching points.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "waypoint-scenes-portfolio-coach-v1";
  var META_KEY = "waypoint-scenes-portfolio-coach-meta-v1";
  var SCHEMA_VERSION = "1.0.0";
  var MAX_SESSIONS = 40;
  var MAX_NOTES = 200;

  function Compare() {
    return global.WaypointScenesCoachCompare;
  }
  function Generate() {
    return global.WaypointScenesCoachGenerate;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "pc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
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

  /**
   * User decision for a coaching comparison — never applied silently to portfolios.
   */
  function createDecision(partial) {
    partial = partial || {};
    return {
      preference: partial.preference || null, // prefer-a | prefer-b | keep-both | keep-neither | null
      roles: {
        a: (partial.roles && partial.roles.a) || null,
        b: (partial.roles && partial.roles.b) || null
      },
      roleOverride: !!(partial.roleOverride),
      addedImageIds: Array.isArray(partial.addedImageIds) ? partial.addedImageIds.slice() : [],
      replacedImageId: partial.replacedImageId || null,
      helpfulPointIds: Array.isArray(partial.helpfulPointIds) ? partial.helpfulPointIds.slice() : [],
      dismissedPointIds: Array.isArray(partial.dismissedPointIds) ? partial.dismissedPointIds.slice() : [],
      decidedAt: partial.decidedAt || nowIso()
    };
  }

  function createNote(partial) {
    partial = partial || {};
    return {
      id: partial.id || uuid(),
      text: String(partial.text || "").trim().slice(0, 500),
      imageIds: Array.isArray(partial.imageIds) ? partial.imageIds.slice() : [],
      sessionId: partial.sessionId || null,
      createdAt: partial.createdAt || nowIso(),
      updatedAt: partial.updatedAt || nowIso()
    };
  }

  function normalizeSession(row) {
    row = row || {};
    return {
      schemaVersion: row.schemaVersion || SCHEMA_VERSION,
      id: row.id || uuid(),
      createdAt: row.createdAt || nowIso(),
      updatedAt: row.updatedAt || nowIso(),
      assistantSessionId: row.assistantSessionId || null,
      portfolioId: row.portfolioId || null,
      imageIdA: row.imageIdA || null,
      imageIdB: row.imageIdB || null,
      source: row.source || "manual", // similar-group | manual | nearby | portfolio-alt | sequence
      groupId: row.groupId || null,
      analysisVersion: row.analysisVersion || null,
      generatedAt: row.generatedAt || null,
      status: row.status || null,
      message: row.message || null,
      points: Array.isArray(row.points) ? row.points : [],
      compareSummary: row.compareSummary || null,
      decision: row.decision ? createDecision(row.decision) : createDecision({}),
      noteIds: Array.isArray(row.noteIds) ? row.noteIds.slice() : []
    };
  }

  function create() {
    var sessions = [];
    var notes = [];
    var ready = false;

    function byId(id) {
      for (var i = 0; i < sessions.length; i++) if (sessions[i].id === id) return sessions[i];
      return null;
    }

    function noteById(id) {
      for (var i = 0; i < notes.length; i++) if (notes[i].id === id) return notes[i];
      return null;
    }

    function persist() {
      writeJson(STORE_KEY, {
        schemaVersion: SCHEMA_VERSION,
        sessions: sessions.slice(0, MAX_SESSIONS),
        notes: notes.slice(0, MAX_NOTES)
      });
      writeJson(META_KEY, { schemaVersion: SCHEMA_VERSION, updatedAt: nowIso() });
    }

    function touch(s) {
      s.updatedAt = nowIso();
      return s;
    }

    function init() {
      var raw = readJson(STORE_KEY, { sessions: [], notes: [] });
      if (Array.isArray(raw)) {
        // legacy accidental array shape
        sessions = raw.map(normalizeSession);
        notes = [];
      } else {
        sessions = (raw.sessions || []).map(normalizeSession);
        notes = (raw.notes || []).map(createNote);
      }
      ready = true;
      return Promise.resolve({ sessionCount: sessions.length, noteCount: notes.length });
    }

    /**
     * Open or refresh a coaching comparison.
     * @param {{imgA, imgB, portfolio?, libraryImages?, group?, source?, assistantSessionId?, portfolioId?, previousDecision?}} input
     */
    function openComparison(input) {
      input = input || {};
      var cmp = Compare().comparePair(input.imgA, input.imgB, {
        portfolio: input.portfolio || null,
        libraryImages: input.libraryImages || [],
        group: input.group || null,
        source: input.source || "manual"
      });
      var gen = Generate().generate(cmp, {});
      var existing = null;
      if (input.reuseId) existing = byId(input.reuseId);
      // Prefer matching open pair under same assistant session
      if (!existing && input.assistantSessionId) {
        existing = sessions.filter(function (s) {
          return (
            s.assistantSessionId === input.assistantSessionId &&
            ((s.imageIdA === cmp.imageIdA && s.imageIdB === cmp.imageIdB) ||
              (s.imageIdA === cmp.imageIdB && s.imageIdB === cmp.imageIdA))
          );
        })[0];
      }

      var decision = existing ? createDecision(existing.decision) : createDecision(input.previousDecision || {});
      var s = normalizeSession({
        id: existing ? existing.id : undefined,
        createdAt: existing ? existing.createdAt : undefined,
        assistantSessionId: input.assistantSessionId || (existing && existing.assistantSessionId) || null,
        portfolioId: input.portfolioId || (input.portfolio && input.portfolio.id) || (existing && existing.portfolioId) || null,
        imageIdA: cmp.imageIdA,
        imageIdB: cmp.imageIdB,
        source: input.source || cmp.source || "manual",
        groupId: cmp.groupId,
        analysisVersion: gen.analysisVersion,
        generatedAt: gen.generatedAt,
        status: gen.status,
        message: gen.message,
        points: gen.points,
        compareSummary: gen.compare,
        decision: decision,
        noteIds: existing ? existing.noteIds : []
      });

      if (existing) {
        for (var i = 0; i < sessions.length; i++) {
          if (sessions[i].id === existing.id) {
            sessions[i] = touch(s);
            break;
          }
        }
      } else {
        sessions.unshift(touch(s));
      }
      persist();
      return s;
    }

    function setPreference(sessionId, preference) {
      var s = byId(sessionId);
      if (!s) return null;
      var allowed = { "prefer-a": 1, "prefer-b": 1, "keep-both": 1, "keep-neither": 1 };
      if (preference && !allowed[preference]) return null;
      s.decision = createDecision({
        preference: preference,
        roles: s.decision.roles,
        roleOverride: s.decision.roleOverride,
        addedImageIds: s.decision.addedImageIds,
        replacedImageId: s.decision.replacedImageId,
        helpfulPointIds: s.decision.helpfulPointIds,
        dismissedPointIds: s.decision.dismissedPointIds
      });
      touch(s);
      persist();
      return s.decision;
    }

    function setRoles(sessionId, roleA, roleB, isOverride) {
      var s = byId(sessionId);
      if (!s) return null;
      s.decision = createDecision({
        preference: s.decision.preference,
        roles: { a: roleA || null, b: roleB || null },
        roleOverride: isOverride !== false,
        addedImageIds: s.decision.addedImageIds,
        replacedImageId: s.decision.replacedImageId,
        helpfulPointIds: s.decision.helpfulPointIds,
        dismissedPointIds: s.decision.dismissedPointIds
      });
      touch(s);
      persist();
      return s.decision;
    }

    function markPoint(sessionId, pointId, kind) {
      var s = byId(sessionId);
      if (!s || !pointId) return null;
      var helpful = s.decision.helpfulPointIds.slice();
      var dismissed = s.decision.dismissedPointIds.slice();
      if (kind === "helpful") {
        if (helpful.indexOf(pointId) < 0) helpful.push(pointId);
        dismissed = dismissed.filter(function (id) { return id !== pointId; });
      } else if (kind === "dismiss") {
        if (dismissed.indexOf(pointId) < 0) dismissed.push(pointId);
        helpful = helpful.filter(function (id) { return id !== pointId; });
      }
      s.decision = createDecision({
        preference: s.decision.preference,
        roles: s.decision.roles,
        roleOverride: s.decision.roleOverride,
        addedImageIds: s.decision.addedImageIds,
        replacedImageId: s.decision.replacedImageId,
        helpfulPointIds: helpful,
        dismissedPointIds: dismissed
      });
      touch(s);
      persist();
      return s.decision;
    }

    function recordAdded(sessionId, imageId) {
      var s = byId(sessionId);
      if (!s || !imageId) return null;
      var ids = s.decision.addedImageIds.slice();
      if (ids.indexOf(imageId) < 0) ids.push(imageId);
      s.decision = createDecision({
        preference: s.decision.preference,
        roles: s.decision.roles,
        roleOverride: s.decision.roleOverride,
        addedImageIds: ids,
        replacedImageId: s.decision.replacedImageId,
        helpfulPointIds: s.decision.helpfulPointIds,
        dismissedPointIds: s.decision.dismissedPointIds
      });
      touch(s);
      persist();
      return s.decision;
    }

    function recordReplace(sessionId, removedId, addedId) {
      var s = byId(sessionId);
      if (!s) return null;
      var ids = s.decision.addedImageIds.slice();
      if (addedId && ids.indexOf(addedId) < 0) ids.push(addedId);
      s.decision = createDecision({
        preference: s.decision.preference,
        roles: s.decision.roles,
        roleOverride: s.decision.roleOverride,
        addedImageIds: ids,
        replacedImageId: removedId || null,
        helpfulPointIds: s.decision.helpfulPointIds,
        dismissedPointIds: s.decision.dismissedPointIds
      });
      touch(s);
      persist();
      return s.decision;
    }

    function addNote(sessionId, text, imageIds) {
      var s = byId(sessionId);
      if (!s) return null;
      var note = createNote({
        text: text,
        imageIds: imageIds || [s.imageIdA, s.imageIdB],
        sessionId: sessionId
      });
      if (!note.text) return null;
      notes.unshift(note);
      s.noteIds.unshift(note.id);
      touch(s);
      persist();
      return note;
    }

    function notesForImage(imageId) {
      return notes.filter(function (n) {
        return (n.imageIds || []).indexOf(imageId) >= 0;
      });
    }

    function notesForSession(sessionId) {
      var s = byId(sessionId);
      if (!s) return [];
      return (s.noteIds || []).map(noteById).filter(Boolean);
    }

    function deleteSession(sessionId) {
      var before = sessions.length;
      sessions = sessions.filter(function (x) { return x.id !== sessionId; });
      if (sessions.length === before) return false;
      persist();
      return true;
    }

    return {
      id: "ScenesPortfolioCoach",
      version: SCHEMA_VERSION,
      init: init,
      isReady: function () { return ready; },
      list: function () { return sessions.slice(); },
      get: byId,
      openComparison: openComparison,
      setPreference: setPreference,
      setRoles: setRoles,
      markPoint: markPoint,
      recordAdded: recordAdded,
      recordReplace: recordReplace,
      addNote: addNote,
      notesForImage: notesForImage,
      notesForSession: notesForSession,
      listNotes: function () { return notes.slice(); },
      deleteSession: deleteSession
    };
  }

  var singleton = null;

  global.WaypointScenesCoachStore = {
    STORE_KEY: STORE_KEY,
    META_KEY: META_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_SESSIONS: MAX_SESSIONS,
    createDecision: createDecision,
    createNote: createNote,
    normalizeSession: normalizeSession,
    create: create,
    getShared: function () {
      if (!singleton) singleton = create();
      return singleton;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
