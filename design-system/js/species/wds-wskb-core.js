/**
 * Waypoint Species Knowledge Base (WSKB) — core API
 *
 *   WDS.wskb.configure({ base })
 *   WDS.wskb.loadIndex()
 *   WDS.wskb.get(id)
 *   WDS.wskb.search(query)
 *   WDS.wskb.preload(ids)
 *   WDS.wskb.preloadFromBundle(data)
 *   WDS.wskb.projectForSpotlight(record, overlay)
 *   WDS.wskb.profileHref(id, options)
 *   WDS.wskb.resolveModelId(id) — foragecast external id
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var SCHEMA_ID = "https://waypoint.studio/schemas/wskb/v1";
  var DEFAULT_BASE = "species/";

  var config = { base: DEFAULT_BASE };
  var indexCache = null;
  var recordCache = {};

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function configure(options) {
    options = options || {};
    if (options.base) config.base = options.base.replace(/\/?$/, "/");
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("WSKB: failed to load " + url);
      return res.json();
    });
  }

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return fetchJson(config.base + "index.json").then(function (data) {
      indexCache = data;
      return data;
    });
  }

  function loadRecord(id) {
    if (!id) return Promise.resolve(null);
    if (recordCache[id]) return Promise.resolve(recordCache[id]);
    return fetchJson(config.base + "records/" + id + ".json").then(function (data) {
      recordCache[id] = normalizeRecord(data);
      return recordCache[id];
    }).catch(function () {
      return null;
    });
  }

  function preload(ids) {
    var unique = (ids || []).filter(function (id, i, arr) {
      return id && arr.indexOf(id) === i;
    });
    return Promise.all(unique.map(loadRecord));
  }

  function collectSpeciesIdsFromBundle(data) {
    var ids = [];
    var block = data && data.speciesSpotlight;
    if (!block) return ids;
    var entries = block.entries || block.queue || [];
    entries.forEach(function (e) {
      if (e && e.speciesId) ids.push(e.speciesId);
    });
    return ids;
  }

  function preloadFromBundle(data) {
    return loadIndex().then(function () {
      return preload(collectSpeciesIdsFromBundle(data));
    });
  }

  function get(id) {
    return recordCache[id] || null;
  }

  function getSync(id) {
    return recordCache[id] || null;
  }

  function normalizeRecord(raw) {
    if (!raw || !raw.id) return raw;
    raw.meta = raw.meta || {};
    raw.meta.version = VERSION;
    raw.meta.schema = SCHEMA_ID;
    return raw;
  }

  function formatLookalikes(list) {
    if (!list || !list.length) return "";
    return list.map(function (la) {
      var line = la.name;
      if (la.distinction) line += " — " + la.distinction;
      return line;
    }).join("; ");
  }

  function profileHref(id, options) {
    options = options || {};
    var base = options.base || config.base;
    return base + "profile.html?id=" + encodeURIComponent(id);
  }

  function projectForSpotlight(record, overlay) {
    overlay = overlay || {};
    if (!record) return overlay;

    var media = (record.media && record.media[0]) || {};
    if (overlay.image) media = overlay.image;

    var learn = overlay.learnMore;
    if (!learn) {
      learn = {
        href: profileHref(record.id, overlay._profileBase ? { base: overlay._profileBase } : {}),
        label: "Full species profile"
      };
    }

    return {
      id: overlay.id || record.id,
      speciesId: record.id,
      commonName: record.names && record.names.common,
      scientificName: record.names && record.names.scientific,
      spotlightLabel: overlay.spotlightLabel || "Species spotlight",
      title: overlay.title || (record.education && record.education.summary) || "",
      habitat: overlay.habitat || (record.habitat && record.habitat.summary) || "",
      timing: overlay.timing || (record.phenology && record.phenology.activePeriod) || "",
      whereToLook: overlay.whereToLook || overlay.where || "",
      whyThisWeek: overlay.whyThisWeek || "",
      identification: overlay.identification || (record.identification && record.identification.fieldMarks) || [],
      lookAlikes: overlay.lookAlikes || formatLookalikes(record.identification && record.identification.lookAlikes),
      ecologicalRole: overlay.ecologicalRole || (record.ecology && record.ecology.role) || "",
      observationTips: overlay.observationTips || (record.ethics && record.ethics.observation) || [],
      conservationNote: overlay.conservationNote || (record.ethics && record.ethics.conservation) || "",
      image: media,
      learnMore: learn,
      scope: overlay.scope,
      _wskb: true
    };
  }

  function enrichSpotlightEntry(entry, options) {
    if (!entry) return entry;
    var speciesId = entry.speciesId || entry.wskbId;
    if (!speciesId) return entry;
    var record = getSync(speciesId);
    if (!record) return entry;
    options = options || {};
    var merged = projectForSpotlight(record, entry);
    if (options.profileBase) merged.learnMore = entry.learnMore || {
      href: profileHref(speciesId, { base: options.profileBase }),
      label: "Full species profile"
    };
    return merged;
  }

  function search(query) {
    query = String(query || "").trim().toLowerCase();
    if (!query || !indexCache) return [];
    return (indexCache.species || []).filter(function (s) {
      return (
        (s.id && s.id.indexOf(query) >= 0) ||
        (s.common && s.common.toLowerCase().indexOf(query) >= 0) ||
        (s.scientific && s.scientific.toLowerCase().indexOf(query) >= 0)
      );
    });
  }

  function resolveModelId(wskbId) {
    var rec = getSync(wskbId);
    return rec && rec.externalIds && rec.externalIds.foragecastModel;
  }

  function findByExternalId(key, value) {
    var found = null;
    Object.keys(recordCache).forEach(function (id) {
      var rec = recordCache[id];
      if (rec && rec.externalIds && rec.externalIds[key] === value) found = rec;
    });
    return found;
  }

  global.WDS = global.WDS || {};
  global.WDS.wskb = {
    VERSION: VERSION,
    SCHEMA_ID: SCHEMA_ID,
    configure: configure,
    loadIndex: loadIndex,
    loadRecord: loadRecord,
    preload: preload,
    preloadFromBundle: preloadFromBundle,
    get: get,
    getSync: getSync,
    search: search,
    profileHref: profileHref,
    projectForSpotlight: projectForSpotlight,
    enrichSpotlightEntry: enrichSpotlightEntry,
    resolveModelId: resolveModelId,
    findByExternalId: findByExternalId,
    escapeHtml: escapeHtml
  };
})(typeof window !== "undefined" ? window : global);
