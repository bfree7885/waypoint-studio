/**
 * Waypoint Scenes — Auto Portfolio Builder · Session persistence
 *
 * localStorage key: waypoint-scenes-portfolio-builder-sessions-v1
 * Stores purpose, size, selection, order, roles, alternatives, omissions,
 * swaps, pins, cover, opening/closing, analysis version, regeneration history.
 * No blobs. Local-first.
 */
(function (global) {
  "use strict";

  var SESSIONS_KEY = "waypoint-scenes-portfolio-builder-sessions-v1";
  var META_KEY = "waypoint-scenes-portfolio-builder-sessions-meta-v1";
  var SCHEMA_VERSION = "1.0.0";
  var MAX_SESSIONS = 40;
  var MAX_HISTORY = 12;

  function Engine() {
    return global.WaypointScenesBuilderEngine;
  }
  function Catalog() {
    return global.WaypointScenesBuilderCatalog;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "pbs-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
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

  function emptyDecisions() {
    return Engine().normalizeDecisions({});
  }

  function normalizeSession(row) {
    row = row || {};
    return {
      schemaVersion: row.schemaVersion || SCHEMA_VERSION,
      id: row.id || uuid(),
      title: row.title || "Portfolio draft",
      createdAt: row.createdAt || nowIso(),
      updatedAt: row.updatedAt || nowIso(),
      source: row.source || { type: "library", ref: null, label: "Your Photo Library" },
      imageIds: Array.isArray(row.imageIds) ? row.imageIds.slice() : [],
      purposeId: row.purposeId || "general",
      sizeId: row.sizeId || "medium",
      customCount: row.customCount != null ? row.customCount : null,
      decisions: Engine().normalizeDecisions(row.decisions || {}),
      draft: row.draft || null,
      regenerationHistory: Array.isArray(row.regenerationHistory) ? row.regenerationHistory.slice(0, MAX_HISTORY) : [],
      targetPortfolioId: row.targetPortfolioId || null,
      saveMode: row.saveMode || "new", // new | rebuild
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

    function list() {
      return sessions.slice().sort(function (a, b) {
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
    }

    function get(id) {
      return byId(id);
    }

    /**
     * @param {{source, images, purposeId?, sizeId?, customCount?, title?, targetPortfolioId?, saveMode?, decisions?}} input
     */
    function startSession(input) {
      input = input || {};
      var images = input.images || [];
      var decisions = Engine().normalizeDecisions(input.decisions || {});
      var draft = Engine().buildDraft({
        images: images,
        purposeId: input.purposeId || "general",
        sizeId: input.sizeId || "medium",
        customCount: input.customCount,
        decisions: decisions
      });
      var s = normalizeSession({
        title: input.title || (input.source && input.source.label) || "Portfolio draft",
        source: input.source || { type: "library", ref: null, label: "Your Photo Library" },
        imageIds: images.map(function (img) {
          return img.id;
        }),
        purposeId: input.purposeId || "general",
        sizeId: input.sizeId || "medium",
        customCount: input.customCount != null ? input.customCount : null,
        decisions: decisions,
        draft: draft,
        targetPortfolioId: input.targetPortfolioId || null,
        saveMode: input.saveMode || (input.targetPortfolioId ? "rebuild" : "new"),
        status: draft.status,
        message: draft.message,
        regenerationHistory: [
          {
            at: nowIso(),
            mode: "initial",
            analysisVersion: draft.analysisVersion,
            selectedCount: (draft.order || []).length
          }
        ]
      });
      sessions.unshift(s);
      persist();
      return s;
    }

    function updateDecisions(id, patch) {
      var s = byId(id);
      if (!s) return null;
      var d = Engine().normalizeDecisions(Object.assign({}, s.decisions, patch || {}));
      s.decisions = d;
      touch(s);
      persist();
      return s;
    }

    /**
     * Regenerate draft.
     * mode: regenerate-remaining | rebuild
     * rebuild clears soft draft state but can preserve decisions unless resetDecisions.
     */
    function regenerate(id, images, options) {
      options = options || {};
      var s = byId(id);
      if (!s) return null;
      var mode = options.mode || "regenerate-remaining";
      var decisions = s.decisions;
      if (options.resetDecisions) {
        decisions = emptyDecisions();
        s.decisions = decisions;
      }
      if (mode === "rebuild" && options.clearManualOrder) {
        decisions.manualOrder = null;
        decisions.sequenceApplied = false;
      }
      // Preserve explicit decisions on regenerate-remaining
      var draft = Engine().buildDraft({
        images: images || [],
        purposeId: options.purposeId != null ? options.purposeId : s.purposeId,
        sizeId: options.sizeId != null ? options.sizeId : s.sizeId,
        customCount: options.customCount !== undefined ? options.customCount : s.customCount,
        decisions: decisions,
        previous: s.draft,
        mode: mode
      });
      if (options.purposeId != null) s.purposeId = options.purposeId;
      if (options.sizeId != null) s.sizeId = options.sizeId;
      if (options.customCount !== undefined) s.customCount = options.customCount;
      if (images && images.length) {
        s.imageIds = images.map(function (img) {
          return img.id;
        });
      }
      s.draft = draft;
      s.status = draft.status;
      s.message = draft.message;
      s.regenerationHistory = (s.regenerationHistory || [])
        .concat([
          {
            at: nowIso(),
            mode: mode,
            analysisVersion: draft.analysisVersion,
            selectedCount: (draft.order || []).length
          }
        ])
        .slice(-MAX_HISTORY);
      touch(s);
      persist();
      return s;
    }

    function setPurpose(id, purposeId) {
      var s = byId(id);
      if (!s) return null;
      s.purposeId = Catalog().purposeById(purposeId).id;
      touch(s);
      persist();
      return s;
    }

    function setSize(id, sizeId, customCount) {
      var s = byId(id);
      if (!s) return null;
      s.sizeId = sizeId || s.sizeId;
      if (customCount !== undefined) s.customCount = customCount;
      touch(s);
      persist();
      return s;
    }

    function applySuggestedSequence(id) {
      var s = byId(id);
      if (!s || !s.draft) return null;
      s.decisions.manualOrder = null;
      s.decisions.sequenceApplied = true;
      // Re-run with cleared manual order to get proposed sequence
      return s;
    }

    function setManualOrder(id, order) {
      var s = byId(id);
      if (!s) return null;
      s.decisions.manualOrder = Array.isArray(order) ? order.slice() : null;
      if (s.draft && s.decisions.manualOrder) {
        s.draft.order = s.decisions.manualOrder.filter(function (imageId) {
          return (s.draft.selectedIds || s.draft.order || []).indexOf(imageId) >= 0 ||
            (s.draft.order || []).indexOf(imageId) >= 0;
        });
        // Keep selectedIds aligned
        var set = Object.create(null);
        (s.draft.order || []).forEach(function (imageId) {
          set[imageId] = true;
        });
        (s.draft.selectedIds || []).forEach(function (imageId) {
          if (!set[imageId]) s.draft.order.push(imageId);
        });
        s.draft.selectedIds = s.draft.order.slice();
        s.draft.sequenceMode = "manual";
      }
      touch(s);
      persist();
      return s;
    }

    function swapIn(id, fromId, toId) {
      var s = byId(id);
      if (!s) return null;
      s.decisions.swaps = (s.decisions.swaps || []).concat([{ fromId: fromId, toId: toId, at: nowIso() }]);
      touch(s);
      persist();
      return s;
    }

    function remove(id) {
      sessions = sessions.filter(function (s) {
        return s.id !== id;
      });
      persist();
    }

    /**
     * Build portfolio payload from draft (does not persist portfolio — caller uses PortfolioEngine).
     */
    function toPortfolioInput(session, fields) {
      fields = fields || {};
      var d = session.draft || {};
      var order = d.order || [];
      var items = order.map(function (imageId) {
        var ex = (d.explanations && d.explanations[imageId]) || {};
        return {
          imageId: imageId,
          notes: fields.itemNotes && fields.itemNotes[imageId] ? fields.itemNotes[imageId] : null,
          selectionRationale: (ex.reasons || []).join(" "),
          source: "suggestion"
        };
      });
      return {
        title: fields.title || session.title || "Untitled portfolio",
        description: fields.description || null,
        purpose: fields.purpose || Catalog().purposeById(session.purposeId).label,
        notes: fields.notes || null,
        imageIds: order.slice(),
        coverImageId: d.coverImageId || order[0] || null,
        items: items
      };
    }

    return {
      init: init,
      list: list,
      get: get,
      startSession: startSession,
      updateDecisions: updateDecisions,
      regenerate: regenerate,
      setPurpose: setPurpose,
      setSize: setSize,
      applySuggestedSequence: applySuggestedSequence,
      setManualOrder: setManualOrder,
      swapIn: swapIn,
      remove: remove,
      toPortfolioInput: toPortfolioInput,
      isReady: function () {
        return ready;
      },
      emptyDecisions: emptyDecisions
    };
  }

  global.WaypointScenesBuilderSessions = {
    STORE_KEY: SESSIONS_KEY,
    META_KEY: META_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    create: create,
    normalizeSession: normalizeSession
  };
})(typeof window !== "undefined" ? window : globalThis);
