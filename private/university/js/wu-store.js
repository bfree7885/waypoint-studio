/**
 * Waypoint University — IndexedDB store (local-first).
 * Nodes, edges, media blobs, revisions snapshot hooks, export/import.
 */
(function (global) {
  "use strict";

  function Schema() {
    return global.WU && global.WU.Schema;
  }

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function openDb() {
    var S = Schema();
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(S.DB_NAME, S.DB_VERSION);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains("nodes")) {
          var nodes = db.createObjectStore("nodes", { keyPath: "id" });
          nodes.createIndex("by_kind", "kind", { unique: false });
          nodes.createIndex("by_updated", "updatedAt", { unique: false });
          nodes.createIndex("by_opened", "lastOpenedAt", { unique: false });
          nodes.createIndex("by_bookmark", "bookmarked", { unique: false });
        }
        if (!db.objectStoreNames.contains("edges")) {
          var edges = db.createObjectStore("edges", { keyPath: "id" });
          edges.createIndex("by_from", "fromId", { unique: false });
          edges.createIndex("by_to", "toId", { unique: false });
          edges.createIndex("by_type", "type", { unique: false });
        }
        if (!db.objectStoreNames.contains("media")) {
          db.createObjectStore("media", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("revisions")) {
          var rev = db.createObjectStore("revisions", { keyPath: "id" });
          rev.createIndex("by_node", "nodeId", { unique: false });
          rev.createIndex("by_at", "createdAt", { unique: false });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB open failed"));
      };
    });
  }

  var dbPromise = null;
  function db() {
    if (!dbPromise) dbPromise = openDb();
    return dbPromise;
  }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error);
      };
      tx.onabort = function () {
        reject(tx.error || new Error("aborted"));
      };
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function normalizeNode(partial) {
    partial = partial || {};
    var now = nowIso();
    var q = partial.question || {};
    var src = partial.source || {};
    var research = partial.research || {};
    var queue = partial.queue || {};
    return {
      schemaVersion: Schema().SCHEMA,
      id: partial.id || "wu_" + uuid(),
      kind: partial.kind || "idea",
      title: partial.title != null ? String(partial.title) : "Untitled",
      body: partial.body != null ? String(partial.body) : "",
      summary: partial.summary != null ? String(partial.summary) : "",
      tags: Array.isArray(partial.tags) ? partial.tags : [],
      categories: Array.isArray(partial.categories) ? partial.categories : [],
      projects: Array.isArray(partial.projects) ? partial.projects : [],
      pathId: partial.pathId || null,
      status: partial.status || "active",
      pinned: !!partial.pinned,
      bookmarked: !!partial.bookmarked,
      sourceUrl: partial.sourceUrl || null,
      mediaIds: Array.isArray(partial.mediaIds) ? partial.mediaIds : [],
      review: {
        enabled: !!(partial.review && partial.review.enabled),
        dueAt: (partial.review && partial.review.dueAt) || null,
        intervalDays: (partial.review && partial.review.intervalDays) || null
      },
      question: {
        status: q.status || (partial.kind === "question" ? "open" : null),
        confidence: q.confidence != null && q.confidence !== "" ? Number(q.confidence) : null,
        evidence: q.evidence || null,
        resolution: q.resolution || null,
        sources: Array.isArray(q.sources) ? q.sources : []
      },
      source: {
        citation: src.citation || null,
        authors: src.authors || null,
        year: src.year || null,
        readingStatus: src.readingStatus || null,
        confidence: src.confidence != null && src.confidence !== "" ? Number(src.confidence) : null
      },
      research: {
        stage: research.stage || null,
        nextAction: research.nextAction || null,
        conclusions: research.conclusions || null
      },
      queue: {
        reading: !!queue.reading,
        researchInbox: !!queue.researchInbox,
        focusToday: !!queue.focusToday
      },
      capture: partial.capture || null,
      meta: partial.meta && typeof partial.meta === "object" ? partial.meta : {},
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now,
      lastOpenedAt: partial.lastOpenedAt || null
    };
  }

  function normalizeEdge(partial) {
    partial = partial || {};
    return {
      schemaVersion: Schema().SCHEMA,
      id: partial.id || "wue_" + uuid(),
      fromId: partial.fromId,
      toId: partial.toId,
      type: partial.type || "relates-to",
      note: partial.note || null,
      createdAt: partial.createdAt || nowIso()
    };
  }

  async function getMeta(key, fallback) {
    var database = await db();
    var val = await reqToPromise(database.transaction("meta").objectStore("meta").get(key));
    return val ? val.value : fallback;
  }

  async function setMeta(key, value) {
    var database = await db();
    var tx = database.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key: key, value: value, updatedAt: nowIso() });
    await txDone(tx);
  }

  async function saveRevision(node) {
    if (!node || !node.id) return;
    var database = await db();
    var tx = database.transaction("revisions", "readwrite");
    var store = tx.objectStore("revisions");
    store.put({
      id: "rev_" + uuid(),
      nodeId: node.id,
      title: node.title,
      body: node.body,
      kind: node.kind,
      createdAt: nowIso()
    });
    // Cap revisions per node (~20) — lightweight history foundation
    var idx = store.index("by_node");
    var all = await reqToPromise(idx.getAll(node.id));
    if (all && all.length > 20) {
      all.sort(function (a, b) {
        return String(a.createdAt).localeCompare(String(b.createdAt));
      });
      var drop = all.slice(0, all.length - 20);
      drop.forEach(function (r) {
        store.delete(r.id);
      });
    }
    await txDone(tx);
  }

  async function putNode(node, opts) {
    opts = opts || {};
    var n = normalizeNode(node);
    n.updatedAt = nowIso();
    if (!opts.skipRevision) {
      try {
        var prev = await getNode(n.id);
        if (prev && (prev.body !== n.body || prev.title !== n.title)) {
          await saveRevision(prev);
        }
      } catch (e) { /* first save */ }
    }
    var database = await db();
    var tx = database.transaction("nodes", "readwrite");
    tx.objectStore("nodes").put(n);
    await txDone(tx);
    await setMeta("lastWriteAt", nowIso());
    return n;
  }

  async function getNode(id) {
    var database = await db();
    return reqToPromise(database.transaction("nodes").objectStore("nodes").get(id));
  }

  async function deleteNode(id) {
    var database = await db();
    var tx = database.transaction(["nodes", "edges"], "readwrite");
    tx.objectStore("nodes").delete(id);
    var edges = tx.objectStore("edges");
    var fromIdx = edges.index("by_from");
    var toIdx = edges.index("by_to");
    var froms = await reqToPromise(fromIdx.getAll(id));
    var tos = await reqToPromise(toIdx.getAll(id));
    froms.concat(tos).forEach(function (e) {
      edges.delete(e.id);
    });
    await txDone(tx);
    await setMeta("lastWriteAt", nowIso());
  }

  async function listNodes() {
    var database = await db();
    return reqToPromise(database.transaction("nodes").objectStore("nodes").getAll());
  }

  async function putEdge(edge) {
    var e = normalizeEdge(edge);
    if (!e.fromId || !e.toId) throw new Error("Edge requires fromId and toId");
    var database = await db();
    var tx = database.transaction("edges", "readwrite");
    tx.objectStore("edges").put(e);
    await txDone(tx);
    // Undirected types: also ensure reverse exists optionally — caller can add both
    await setMeta("lastWriteAt", nowIso());
    return e;
  }

  async function deleteEdge(id) {
    var database = await db();
    var tx = database.transaction("edges", "readwrite");
    tx.objectStore("edges").delete(id);
    await txDone(tx);
  }

  async function listEdges() {
    var database = await db();
    return reqToPromise(database.transaction("edges").objectStore("edges").getAll());
  }

  async function edgesFor(nodeId) {
    var database = await db();
    var store = database.transaction("edges").objectStore("edges");
    var a = await reqToPromise(store.index("by_from").getAll(nodeId));
    var b = await reqToPromise(store.index("by_to").getAll(nodeId));
    var seen = {};
    var out = [];
    a.concat(b).forEach(function (e) {
      if (seen[e.id]) return;
      seen[e.id] = true;
      out.push(e);
    });
    return out;
  }

  async function putMedia(record) {
    var database = await db();
    var rec = Object.assign(
      {
        id: record.id || "wum_" + uuid(),
        createdAt: nowIso()
      },
      record
    );
    var tx = database.transaction("media", "readwrite");
    tx.objectStore("media").put(rec);
    await txDone(tx);
    return rec;
  }

  async function getMedia(id) {
    var database = await db();
    return reqToPromise(database.transaction("media").objectStore("media").get(id));
  }

  async function touchOpened(id) {
    var n = await getNode(id);
    if (!n) return null;
    n.lastOpenedAt = nowIso();
    var saved = await putNode(n, { skipRevision: true });
    try {
      var recent = (await getMeta("recentViews", [])) || [];
      recent = [id].concat(
        recent.filter(function (x) {
          return x !== id;
        })
      ).slice(0, 30);
      await setMeta("recentViews", recent);
    } catch (e) { /* ignore */ }
    return saved;
  }

  async function recentViewIds() {
    return (await getMeta("recentViews", [])) || [];
  }

  async function exportBundle() {
    var nodes = await listNodes();
    var edges = await listEdges();
    return {
      schemaVersion: Schema().SCHEMA,
      exportedAt: nowIso(),
      privacy: "private",
      product: "waypoint-university",
      nodes: nodes,
      edges: edges,
      note: "Media blobs are not included in JSON export in Foundation — use full backup when added."
    };
  }

  async function importBundle(bundle, mode) {
    if (!bundle || !Array.isArray(bundle.nodes)) {
      return { ok: false, error: "Invalid bundle" };
    }
    mode = mode || "merge";
    if (mode === "replace") {
      var database = await db();
      var tx = database.transaction(["nodes", "edges"], "readwrite");
      tx.objectStore("nodes").clear();
      tx.objectStore("edges").clear();
      await txDone(tx);
    }
    var count = 0;
    for (var i = 0; i < bundle.nodes.length; i++) {
      await putNode(bundle.nodes[i], { skipRevision: true });
      count++;
    }
    if (Array.isArray(bundle.edges)) {
      for (var j = 0; j < bundle.edges.length; j++) {
        await putEdge(bundle.edges[j]);
      }
    }
    await setMeta("lastImportAt", nowIso());
    return { ok: true, nodes: count };
  }

  async function ensurePathTemplates() {
    var nodes = await listNodes();
    var existing = {};
    nodes.forEach(function (n) {
      if (n.kind === "path" && n.meta && n.meta.slug) existing[n.meta.slug] = true;
    });
    var created = [];
    var templates = Schema().PATH_TEMPLATES;
    for (var i = 0; i < templates.length; i++) {
      var t = templates[i];
      if (existing[t.slug]) continue;
      var node = await putNode({
        kind: "path",
        title: t.title,
        body:
          "# " +
          t.title +
          "\n\nEmpty learning path. Add topics, concepts, and questions — then link them here.\n\n> Cross-link freely with other disciplines.\n",
        tags: ["learning-path"],
        categories: ["path"],
        meta: { slug: t.slug, template: true }
      });
      created.push(node);
    }
    await setMeta("pathsSeeded", true);
    return created;
  }

  async function bootstrap() {
    await db();
    var seeded = await getMeta("pathsSeeded", false);
    if (!seeded) await ensurePathTemplates();
    await setMeta("schemaVersion", Schema().SCHEMA);
    return { ok: true };
  }

  async function listRevisions(nodeId) {
    var database = await db();
    return reqToPromise(
      database.transaction("revisions").objectStore("revisions").index("by_node").getAll(nodeId)
    );
  }

  global.WU = global.WU || {};
  global.WU.Store = {
    bootstrap: bootstrap,
    normalizeNode: normalizeNode,
    normalizeEdge: normalizeEdge,
    putNode: putNode,
    getNode: getNode,
    deleteNode: deleteNode,
    listNodes: listNodes,
    putEdge: putEdge,
    deleteEdge: deleteEdge,
    listEdges: listEdges,
    edgesFor: edgesFor,
    putMedia: putMedia,
    getMedia: getMedia,
    touchOpened: touchOpened,
    exportBundle: exportBundle,
    importBundle: importBundle,
    ensurePathTemplates: ensurePathTemplates,
    getMeta: getMeta,
    setMeta: setMeta,
    listRevisions: listRevisions,
    recentViewIds: recentViewIds,
    uuid: uuid,
    nowIso: nowIso
  };
})(typeof window !== "undefined" ? window : globalThis);
