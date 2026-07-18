/**
 * SignalTerrain shared research workspace — local-first.
 * One implementation for Radio & Cyber. No separate domain stacks.
 */
(function (global) {
  "use strict";

  var STORE_KEY = "st_research_workspace_v01";
  var seedItems = [];

  function storage() {
    try {
      return global.localStorage;
    } catch (e) {
      return null;
    }
  }

  function readStore() {
    var s = storage();
    if (!s) return { items: [], updatedAt: null };
    try {
      var raw = s.getItem(STORE_KEY);
      if (!raw) return { items: [], updatedAt: null };
      return JSON.parse(raw);
    } catch (e) {
      return { items: [], updatedAt: null };
    }
  }

  function writeStore(doc) {
    var s = storage();
    if (!s) return false;
    doc.updatedAt = new Date().toISOString();
    s.setItem(STORE_KEY, JSON.stringify(doc));
    return true;
  }

  function allItems() {
    var local = readStore().items || [];
    var byId = {};
    seedItems.forEach(function (it) {
      byId[it.id] = it;
    });
    local.forEach(function (it) {
      byId[it.id] = it;
    });
    return Object.keys(byId).map(function (k) {
      return byId[k];
    });
  }

  function loadSeed(items) {
    seedItems = (items || []).slice();
    return seedItems;
  }

  function list(filter) {
    filter = filter || {};
    return allItems().filter(function (it) {
      if (filter.kind && it.kind !== filter.kind) return false;
      if (filter.domain && it.domain !== filter.domain && it.domain !== "shared") return false;
      if (filter.subjectId) {
        var ids = it.subjectIds || it.memberIds || [];
        if (ids.indexOf(filter.subjectId) === -1) return false;
      }
      if (filter.tag) {
        if (!(it.tags || []).some(function (t) {
          return t === filter.tag || (t && t.id === filter.tag);
        }))
          return false;
      }
      return true;
    });
  }

  function get(id) {
    return (
      allItems().filter(function (it) {
        return it.id === id;
      })[0] || null
    );
  }

  function upsert(item) {
    if (!item || !item.id) throw new Error("research item requires id");
    var doc = readStore();
    var items = doc.items || [];
    var found = false;
    items = items.map(function (it) {
      if (it.id === item.id) {
        found = true;
        return Object.assign({}, it, item, { updatedAt: new Date().toISOString() });
      }
      return it;
    });
    if (!found) {
      items.push(
        Object.assign(
          {
            meta: { version: "0.1.0", status: "local" },
            updatedAt: new Date().toISOString(),
            domain: "cyber"
          },
          item
        )
      );
    }
    doc.items = items;
    writeStore(doc);
    return get(item.id);
  }

  function remove(id) {
    var doc = readStore();
    doc.items = (doc.items || []).filter(function (it) {
      return it.id !== id;
    });
    writeStore(doc);
    return true;
  }

  function isBookmarked(subjectId) {
    return list({ kind: "bookmark", subjectId: subjectId }).length > 0;
  }

  function toggleBookmark(subjectId, title, opts) {
    opts = opts || {};
    var existing = list({ kind: "bookmark", subjectId: subjectId })[0];
    if (existing) {
      remove(existing.id);
      return { bookmarked: false, item: null };
    }
    var item = upsert({
      id: "rw_local_bm_" + String(subjectId).replace(/[^a-z0-9_-]/gi, "_").slice(0, 40),
      kind: "bookmark",
      title: title || subjectId,
      subjectIds: [subjectId],
      tags: opts.tags || ["cyber"],
      domain: opts.domain || "cyber",
      readingStatus: opts.readingStatus || "unread"
    });
    return { bookmarked: true, item: item };
  }

  function setReadingStatus(itemId, status) {
    var it = get(itemId);
    if (!it) return null;
    return upsert(Object.assign({}, it, { readingStatus: status }));
  }

  function addNote(subjectId, body, title) {
    var subjects = [];
    if (subjectId) subjects.push(subjectId);
    return upsert({
      id: "rw_local_note_" + Date.now().toString(36),
      kind: "note",
      title: title || "Note",
      body: body || "",
      subjectIds: subjects,
      domain: "cyber",
      private: true
    });
  }

  function ensureCollection(id, title, memberIds) {
    var existing = get(id);
    if (existing) {
      var members = existing.memberIds || [];
      (memberIds || []).forEach(function (m) {
        if (members.indexOf(m) === -1) members.push(m);
      });
      return upsert(Object.assign({}, existing, { memberIds: members }));
    }
    return upsert({
      id: id,
      kind: "collection",
      title: title || "Collection",
      memberIds: memberIds || [],
      domain: "cyber"
    });
  }

  function addToCollection(collectionId, subjectId) {
    var col = get(collectionId);
    if (!col) {
      col = ensureCollection(collectionId, "Saved", [subjectId]);
      return col;
    }
    var members = (col.memberIds || []).slice();
    if (members.indexOf(subjectId) === -1) members.push(subjectId);
    return upsert(Object.assign({}, col, { memberIds: members }));
  }

  function pinTimeline(subjectId, title) {
    return upsert({
      id: "rw_local_pin_" + String(subjectId).replace(/[^a-z0-9_-]/gi, "_").slice(0, 40),
      kind: "timeline-pin",
      title: title || subjectId,
      subjectIds: [subjectId],
      domain: "cyber"
    });
  }

  function cite(subjectId, label, url) {
    return upsert({
      id: "rw_local_cite_" + Date.now().toString(36),
      kind: "source-entry",
      title: label || "Citation",
      url: url || null,
      subjectIds: [subjectId],
      sourceClass: "technical",
      domain: "cyber"
    });
  }

  function recordActivity(activityType, title, opts) {
    opts = opts || {};
    return upsert({
      id: "rw_local_act_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      kind: "activity",
      title: title || activityType || "Activity",
      activityType: activityType || null,
      body: opts.body || null,
      subjectIds: opts.subjectIds || [],
      domain: opts.domain || "cyber",
      private: true,
      tags: opts.tags || ["activity"]
    });
  }

  function createInvestigation(title, opts) {
    opts = opts || {};
    var id =
      opts.id ||
      "rw_inv_" +
        String(title || "investigation")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) +
        "_" +
        Date.now().toString(36);
    var item = upsert({
      id: id,
      kind: "investigation",
      title: title || "Investigation",
      body: opts.body || "",
      tags: opts.tags || [],
      subjectIds: opts.subjectIds || [],
      tasks: opts.tasks || [],
      investigationStatus: opts.investigationStatus || "open",
      citationIds: opts.citationIds || [],
      attachmentRefs: opts.attachmentRefs || [],
      relatedInvestigationIds: opts.relatedInvestigationIds || [],
      domain: "cyber",
      private: true,
      createdAt: new Date().toISOString()
    });
    recordActivity("investigation-updated", "Opened investigation: " + item.title, {
      subjectIds: [item.id]
    });
    return item;
  }

  function createWatchlist(title, opts) {
    opts = opts || {};
    var id =
      opts.id ||
      "rw_watch_" +
        String(title || "watch")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) +
        "_" +
        Date.now().toString(36);
    return upsert({
      id: id,
      kind: "watchlist",
      title: title || "Watchlist",
      body: opts.body || "",
      tags: opts.tags || [],
      watchKinds: opts.watchKinds || [],
      watchTargetIds: opts.watchTargetIds || [],
      subjectIds: opts.subjectIds || opts.watchTargetIds || [],
      query: opts.query || null,
      domain: "cyber",
      private: true,
      createdAt: new Date().toISOString()
    });
  }

  function addQueueItem(title, opts) {
    opts = opts || {};
    return upsert({
      id: opts.id || "rw_queue_" + Date.now().toString(36),
      kind: "queue-item",
      title: title || "Reading item",
      body: opts.body || "",
      subjectIds: opts.subjectIds || [],
      relatedInvestigationIds: opts.relatedInvestigationIds || [],
      readingStatus: opts.readingStatus || "unread",
      priority: opts.priority || "normal",
      difficulty: opts.difficulty || "intro",
      estimateMinutes: opts.estimateMinutes || 15,
      tags: opts.tags || ["reading-queue"],
      domain: "cyber",
      private: true
    });
  }

  function updateNote(id, body, title) {
    var existing = get(id);
    if (!existing || existing.kind !== "note") {
      return addNote(null, body, title);
    }
    var versions = (existing.versions || []).slice();
    if (existing.body) {
      versions.push({ at: existing.updatedAt || new Date().toISOString(), body: existing.body });
      if (versions.length > 40) versions = versions.slice(-40);
    }
    var next = upsert(
      Object.assign({}, existing, {
        title: title || existing.title,
        body: body,
        versions: versions
      })
    );
    recordActivity("note-updated", "Updated note: " + next.title, { subjectIds: [next.id] });
    return next;
  }

  function linkNoteToSubjects(noteId, subjectIds) {
    var note = get(noteId);
    if (!note) return null;
    var ids = (note.subjectIds || []).slice();
    (subjectIds || []).forEach(function (s) {
      if (ids.indexOf(s) === -1) ids.push(s);
    });
    return upsert(Object.assign({}, note, { subjectIds: ids }));
  }

  function notesForSubject(subjectId) {
    return list({ kind: "note", subjectId: subjectId });
  }

  function matchWatchlist(watchlist, entities) {
    watchlist = watchlist || {};
    entities = entities || [];
    var kinds = watchlist.watchKinds || [];
    var targets = watchlist.watchTargetIds || watchlist.subjectIds || [];
    var q = String(watchlist.query || "").toLowerCase().trim();
    var hits = [];
    entities.forEach(function (e) {
      if (!e || !e.id) return;
      var reasons = [];
      if (targets.indexOf(e.id) >= 0) {
        reasons.push("Exact watched id " + e.id);
      }
      if (kinds.length && kinds.indexOf(e.kind) >= 0) {
        reasons.push("Watched kind “" + e.kind + "”");
      }
      if (q) {
        var blob = ((e.title || "") + " " + (e.summary || "") + " " + (e.kind || "")).toLowerCase();
        if (blob.indexOf(q) >= 0) reasons.push("Query match “" + q + "”");
      }
      if (reasons.length) {
        hits.push({
          entityId: e.id,
          title: e.title || e.id,
          kind: e.kind,
          reasons: reasons,
          explanation:
            "Surfaced because your watchlist “" +
            (watchlist.title || watchlist.id) +
            "” matched: " +
            reasons.join("; ") +
            "."
        });
      }
    });
    return hits;
  }

  function cacheGet(key) {
    var s = storage();
    if (!s) return null;
    try {
      var raw = s.getItem("st_research_cache_" + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(key, value) {
    var s = storage();
    if (!s) return false;
    try {
      s.setItem(
        "st_research_cache_" + key,
        JSON.stringify({ at: new Date().toISOString(), value: value })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainResearch = {
    loadSeed: loadSeed,
    list: list,
    get: get,
    upsert: upsert,
    remove: remove,
    isBookmarked: isBookmarked,
    toggleBookmark: toggleBookmark,
    setReadingStatus: setReadingStatus,
    addNote: addNote,
    updateNote: updateNote,
    linkNoteToSubjects: linkNoteToSubjects,
    notesForSubject: notesForSubject,
    ensureCollection: ensureCollection,
    addToCollection: addToCollection,
    pinTimeline: pinTimeline,
    cite: cite,
    recordActivity: recordActivity,
    createInvestigation: createInvestigation,
    createWatchlist: createWatchlist,
    addQueueItem: addQueueItem,
    matchWatchlist: matchWatchlist,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    STORE_KEY: STORE_KEY
  };
})(typeof window !== "undefined" ? window : globalThis);
