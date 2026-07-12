/**
 * Waypoint Knowledge Platform — core
 *
 * Shared knowledge backbone for every Waypoint Studio application.
 * Apps query WDS.knowledge instead of maintaining duplicate reference copies.
 *
 *   WDS.knowledge.configure({ base })
 *   WDS.knowledge.loadIndex()
 *   WDS.knowledge.loadDomains()
 *   WDS.knowledge.preloadDemo()
 *   WDS.knowledge.get(id)
 *   WDS.knowledge.list({ domain, category, kind })
 *   WDS.knowledge.search(query, options)  — via search module
 *   WDS.knowledge.related(id, options)    — via relationships module
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SCHEMA_ID = "https://waypoint.studio/schemas/knowledge/v1";
  var DEFAULT_BASE = "knowledge/";

  var config = { base: DEFAULT_BASE };
  var indexCache = null;
  var domainsCache = null;
  var recordCache = {};
  var bundleLoaded = false;

  function configure(options) {
    options = options || {};
    if (options.base) config.base = String(options.base).replace(/\/?$/, "/");
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Knowledge: failed to load " + url);
      return res.json();
    });
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    entry.domains = entry.domains || [];
    entry.categories = entry.categories || [];
    entry.tags = entry.tags || [];
    entry.names = entry.names || { common: entry.id };
    if (!entry.names.aliases) entry.names.aliases = [];
    if (!entry.extensions) entry.extensions = {};
    if (entry.wskbId === undefined) entry.wskbId = null;
    if (!entry.search) entry.search = { keywords: [], boost: 1 };
    if (!entry.related) entry.related = [];
    return entry;
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return fetchJson(config.base + "index.json").then(function (data) {
      indexCache = data;
      return data;
    });
  }

  function loadDomains() {
    if (domainsCache) return Promise.resolve(domainsCache);
    return fetchJson(config.base + "domains.json").then(function (data) {
      domainsCache = data;
      return data;
    });
  }

  function loadRecord(id) {
    if (!id) return Promise.resolve(null);
    if (recordCache[id]) return Promise.resolve(recordCache[id]);
    return fetchJson(config.base + "records/" + id + ".json")
      .then(function (data) {
        recordCache[id] = normalizeEntry(data);
        return recordCache[id];
      })
      .catch(function () {
        // Fall back to index summary hydrated as a thin entry
        return loadIndex().then(function (idx) {
          var row = (idx.entries || []).filter(function (e) { return e.id === id; })[0];
          if (!row) return null;
          var thin = normalizeEntry({
            meta: {
              version: "1.0.0",
              schema: SCHEMA_ID,
              updatedAt: idx.updatedAt || new Date().toISOString(),
              status: "sample",
              provenance: "sample"
            },
            id: row.id,
            kind: row.kind,
            domains: row.domains,
            categories: row.categories,
            names: {
              common: row.common,
              scientific: row.scientific || null,
              aliases: []
            },
            description: "Summary entry from knowledge index.",
            tags: row.tags || [],
            wskbId: row.wskbId || null
          });
          recordCache[id] = thin;
          return thin;
        });
      });
  }

  function preloadFromBundle(bundle) {
    bundle = bundle || {};
    (bundle.records || []).forEach(function (rec) {
      var n = normalizeEntry(rec);
      if (n && n.id) recordCache[n.id] = n;
    });
    bundleLoaded = true;
    return Promise.resolve(Object.keys(recordCache).length);
  }

  function preloadDemo() {
    if (bundleLoaded && Object.keys(recordCache).length) {
      return Promise.resolve(Object.keys(recordCache).length);
    }
    return fetchJson(config.base + "samples/demo-bundle.json").then(preloadFromBundle);
  }

  /**
   * In-memory inject for tests / Node without fetch.
   */
  function ingestFixtures(fixtures) {
    fixtures = fixtures || {};
    if (fixtures.index) indexCache = fixtures.index;
    if (fixtures.domains) domainsCache = fixtures.domains;
    if (fixtures.bundle) preloadFromBundle(fixtures.bundle);
    if (fixtures.relationships && global.WDS && global.WDS.knowledgeRelationships) {
      global.WDS.knowledgeRelationships.ingest(fixtures.relationships);
    }
  }

  function getSync(id) {
    return recordCache[id] || null;
  }

  function get(id) {
    if (recordCache[id]) return Promise.resolve(recordCache[id]);
    return loadRecord(id);
  }

  function list(filter) {
    filter = filter || {};
    function fromCache() {
      var ids = Object.keys(recordCache);
      var rows = ids.map(function (id) { return recordCache[id]; });
      return rows.filter(function (e) {
        if (!e) return false;
        if (filter.domain && e.domains.indexOf(filter.domain) < 0) return false;
        if (filter.kind && e.kind !== filter.kind) return false;
        if (filter.category && (e.categories || []).indexOf(filter.category) < 0) return false;
        if (filter.tag && (e.tags || []).indexOf(filter.tag) < 0) return false;
        return true;
      });
    }

    if (Object.keys(recordCache).length) {
      return Promise.resolve(fromCache());
    }

    return preloadDemo().then(fromCache);
  }

  function indexEntries() {
    return loadIndex().then(function (idx) {
      return idx.entries || [];
    });
  }

  /**
   * Resolve species detail: prefer WSKB when linked.
   */
  function resolveSpeciesDetail(entry) {
    if (!entry) return Promise.resolve(null);
    if (!entry.wskbId || !global.WDS || !global.WDS.wskb) {
      return Promise.resolve({ knowledge: entry, wskb: null });
    }
    return global.WDS.wskb.get(entry.wskbId).then(function (wskb) {
      return { knowledge: entry, wskb: wskb };
    });
  }

  global.WDS = global.WDS || {};
  var existingKnowledge = global.WDS.knowledge || {};
  global.WDS.knowledge = Object.assign({}, existingKnowledge, {
    VERSION: VERSION,
    SCHEMA_ID: SCHEMA_ID,
    configure: configure,
    loadIndex: loadIndex,
    loadDomains: loadDomains,
    loadRecord: loadRecord,
    preloadFromBundle: preloadFromBundle,
    preloadDemo: preloadDemo,
    ingestFixtures: ingestFixtures,
    get: get,
    getSync: getSync,
    list: list,
    indexEntries: indexEntries,
    resolveSpeciesDetail: resolveSpeciesDetail,
    _cache: function () { return recordCache; }
  });
  // Re-attach satellites if they loaded earlier and exposed reattach hooks
  if (global.WDS.knowledgeSearch && global.WDS.knowledgeSearch.search) {
    global.WDS.knowledge.search = global.WDS.knowledgeSearch.search;
  }
  if (global.WDS.knowledgeRelationships) {
    if (global.WDS.knowledgeRelationships.related) {
      global.WDS.knowledge.related = global.WDS.knowledgeRelationships.related;
    }
    if (global.WDS.knowledgeRelationships.path) {
      global.WDS.knowledge.path = global.WDS.knowledgeRelationships.path;
    }
  }
})(typeof window !== "undefined" ? window : global);
