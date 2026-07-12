/**
 * Fieldry — local WOS observation storage (device only)
 * Schema family: waypoint-fieldry-observations-v1
 * Migration: idempotent enrichment of legacy records (category + extensions).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-fieldry-observations-v1";
  var DEVICE_KEY = "waypoint-fieldry-device-id";
  var MIGRATION_KEY = "waypoint-fieldry-migration-v2";
  var APP_VERSION = "1.1.0-mvp";
  var SCHEMA_VERSION = 2;

  var TYPE_TO_CATEGORY = {
    wildlife: "mammals",
    plant: "plants",
    fungi: "mushrooms",
    habitat: "other",
    phenology: "plants",
    weather: "weather",
    trail: "other",
    water: "other",
    sky: "clouds",
    sign: "mammals",
    other: "other"
  };

  function randomHex(len) {
    var out = "";
    var chars = "0123456789abcdef";
    for (var i = 0; i < len; i += 1) out += chars[Math.floor(Math.random() * 16)];
    return out;
  }

  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = "dev_" + randomHex(12);
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return "dev_ephemeral";
    }
  }

  function wos() {
    return global.WDS && global.WDS.observations;
  }

  function normalize(obs) {
    var O = wos();
    if (!O) return obs;
    return O.normalizeObservation(obs);
  }

  function ensureFieldryMeta(obs) {
    obs.meta = obs.meta || {};
    obs.meta.source = "fieldry";
    obs.meta.productId = "fieldry";
    obs.meta.appVersion = APP_VERSION;
    if (!obs.meta.fieldry || typeof obs.meta.fieldry !== "object") {
      obs.meta.fieldry = {};
    }
    return obs;
  }

  function ensureFieldryExtension(obs, partial) {
    ensureFieldryMeta(obs);
    var Ext = wos() && wos().extensions;
    var existing = (obs.extensions && obs.extensions.fieldry) || {};
    var meta = obs.meta.fieldry || {};
    var payload = Object.assign({}, existing, {
      category: meta.category || existing.category || "other",
      unidentified: !!meta.unidentified || !!existing.unidentified,
      identificationStatus: meta.identificationStatus || existing.identificationStatus ||
        (meta.unidentified || existing.unidentified ? "unidentified" : "identified"),
      tags: Array.isArray(meta.tags) ? meta.tags : (Array.isArray(existing.tags) ? existing.tags : []),
      knowledgeId: meta.knowledgeId || existing.knowledgeId || null,
      knowledgeCommon: meta.knowledgeCommon || existing.knowledgeCommon || null,
      knowledgeScientific: meta.knowledgeScientific || existing.knowledgeScientific || null,
      privacyLevel: meta.privacyLevel || existing.privacyLevel || "private",
      count: meta.count != null ? meta.count : (existing.count != null ? existing.count : null),
      mediaRefs: Array.isArray(meta.mediaRefs) ? meta.mediaRefs :
        (Array.isArray(existing.mediaRefs) ? existing.mediaRefs : [])
    }, partial || {});

    // Mirror into meta for older readers
    obs.meta.fieldry.category = payload.category;
    obs.meta.fieldry.unidentified = payload.unidentified;
    obs.meta.fieldry.identificationStatus = payload.identificationStatus;
    obs.meta.fieldry.tags = payload.tags;
    obs.meta.fieldry.knowledgeId = payload.knowledgeId;
    obs.meta.fieldry.knowledgeCommon = payload.knowledgeCommon;
    obs.meta.fieldry.knowledgeScientific = payload.knowledgeScientific;
    obs.meta.fieldry.privacyLevel = payload.privacyLevel;
    obs.meta.fieldry.count = payload.count;
    obs.meta.fieldry.mediaRefs = payload.mediaRefs;

    if (Ext && Ext.setExtension) {
      Ext.setExtension(obs, "fieldry", payload);
    } else {
      obs.extensions = obs.extensions || {};
      obs.extensions.fieldry = Object.assign({ schemaVersion: "1.0.0" }, payload);
    }
    return obs;
  }

  function migrateObservation(obs) {
    if (!obs || typeof obs !== "object") return { obs: obs, changed: false, preserved: false };
    try {
      obs = ensureFieldryMeta(obs);
      var meta = obs.meta.fieldry;
      var changed = false;

      if (!meta.category) {
        if (meta.observationType && TYPE_TO_CATEGORY[meta.observationType]) {
          meta.category = TYPE_TO_CATEGORY[meta.observationType];
          changed = true;
        } else {
          meta.category = "other";
          changed = true;
        }
      }

      if (!meta.privacyLevel) {
        meta.privacyLevel = "private";
        changed = true;
      }

      if (meta.unidentified == null) {
        meta.unidentified = false;
        changed = true;
      }

      ensureFieldryExtension(obs);
      changed = true;
      return { obs: normalize(obs), changed: changed, preserved: false };
    } catch (e) {
      // Preserve malformed records without discarding
      return { obs: obs, changed: false, preserved: true, error: String(e && e.message || e) };
    }
  }

  function migrateAll(force) {
    var flag = null;
    try { flag = localStorage.getItem(MIGRATION_KEY); } catch (e) { /* ignore */ }
    if (flag === String(SCHEMA_VERSION) && !force) {
      return { migrated: 0, preserved: 0, skipped: true };
    }

    var rawList;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        try { localStorage.setItem(MIGRATION_KEY, String(SCHEMA_VERSION)); } catch (e2) { /* ignore */ }
        return { migrated: 0, preserved: 0, skipped: false };
      }
      rawList = JSON.parse(raw);
      if (!Array.isArray(rawList)) {
        return { migrated: 0, preserved: 1, skipped: false, note: "non-array payload preserved" };
      }
    } catch (e) {
      return { migrated: 0, preserved: 1, skipped: false, note: "unreadable payload preserved" };
    }

    var out = [];
    var migrated = 0;
    var preserved = 0;
    rawList.forEach(function (item) {
      var result = migrateObservation(item);
      out.push(result.obs);
      if (result.preserved) preserved += 1;
      else if (result.changed) migrated += 1;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
      localStorage.setItem(MIGRATION_KEY, String(SCHEMA_VERSION));
    } catch (e3) {
      return { migrated: 0, preserved: preserved, skipped: false, error: String(e3) };
    }
    return { migrated: migrated, preserved: preserved, skipped: false };
  }

  function readAll() {
    migrateAll(false);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(function (item) {
        try {
          return normalize(ensureFieldryExtension(ensureFieldryMeta(item)));
        } catch (e) {
          return item;
        }
      }).sort(function (a, b) {
        var da = (a.observedAt && a.observedAt.date) || "";
        var db = (b.observedAt && b.observedAt.date) || "";
        if (da !== db) return db.localeCompare(da);
        var ta = (a.observedAt && a.observedAt.time) || "";
        var tb = (b.observedAt && b.observedAt.time) || "";
        return tb.localeCompare(ta);
      });
    } catch (e) {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function get(id) {
    return readAll().filter(function (o) { return o.id === id; })[0] || null;
  }

  function applyLocation(obs, loc) {
    if (!loc) return obs;
    if (loc.county && !obs.location.county) obs.location.county = loc.county;
    if (loc.state && !obs.location.state) obs.location.state = loc.state;
    if (loc.stateCode && !obs.location.stateCode) obs.location.stateCode = loc.stateCode;
    if (loc.contentBundle && !obs.meta.contentBundleId) {
      obs.meta.contentBundleId = loc.contentBundle;
    }
    return obs;
  }

  function hydrateFromContext(obs, platform, loc) {
    var O = wos();
    if (!O) return obs;
    obs = ensureFieldryMeta(obs);
    obs.observer.localDeviceId = obs.observer.localDeviceId || getDeviceId();
    obs = applyLocation(obs, loc);
    if (platform) {
      var ctx = O.contextFromPlatform(platform);
      if (!obs.context.season && ctx.season) obs.context.season = ctx.season;
      if (!obs.context.phenologyStage && ctx.phenologyStage) obs.context.phenologyStage = ctx.phenologyStage;
      if (!obs.context.month && ctx.month) obs.context.month = ctx.month;
      if (!obs.context.weekOf && ctx.weekOf) obs.context.weekOf = ctx.weekOf;
      if (!obs.context.regionalIntelligenceRef && ctx.regionalIntelligenceRef) {
        obs.context.regionalIntelligenceRef = ctx.regionalIntelligenceRef;
      }
      if (platform.meta && platform.meta.version) {
        obs.meta.regionalIntelligenceVersion = platform.meta.version;
      }
      if (platform.weather && !obs.context.weatherSnapshot) {
        obs.context.weatherSnapshot = O.weatherSnapshotFromPackage(platform.weather);
      }
    }
    return obs;
  }

  function createDraft(platform, loc) {
    var O = wos();
    if (!O) return null;
    var obs = O.emptyObservation({
      source: "fieldry",
      productId: "fieldry",
      anonymous: true,
      localDeviceId: getDeviceId(),
      county: loc && loc.county,
      state: loc && loc.state,
      stateCode: loc && loc.stateCode,
      contentBundleId: loc && loc.contentBundle,
      locationPrecision: "county"
    });
    obs = hydrateFromContext(obs, platform, loc);
    obs.meta.fieldry = {
      category: "",
      observationType: null,
      unidentified: false,
      identificationStatus: "identified",
      tags: [],
      knowledgeId: null,
      privacyLevel: "private",
      ethicalNotes: null
    };
    return ensureFieldryExtension(obs);
  }

  function save(obs) {
    var O = wos();
    if (!O) throw new Error("WOS module not loaded");
    obs = ensureFieldryExtension(ensureFieldryMeta(obs));
    obs = normalize(obs);
    // normalize preserves extensions; re-apply to keep mirrors fresh
    obs = ensureFieldryExtension(obs);
    var now = new Date().toISOString();
    var list = readAll();
    var idx = -1;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === obs.id) { idx = i; break; }
    }
    if (idx >= 0) {
      obs.meta.createdAt = list[idx].meta.createdAt || now;
      obs.meta.revision = Math.max(1, (list[idx].meta.revision || 1) + 1);
      obs.revisions = (list[idx].revisions || []).slice();
      obs.revisions.push({
        id: O.generateId("rev"),
        at: now,
        summary: "Edited in Fieldry"
      });
    } else {
      obs.meta.createdAt = obs.meta.createdAt || now;
      obs.meta.revision = 1;
    }
    obs.meta.updatedAt = now;
    if (idx >= 0) list[idx] = obs;
    else list.unshift(obs);
    writeAll(list);
    return obs;
  }

  function remove(id) {
    var list = readAll().filter(function (o) { return o.id !== id; });
    writeAll(list);
  }

  function getStats() {
    var list = readAll();
    var species = {};
    var habitats = {};
    var counties = {};
    list.forEach(function (obs) {
      var sp = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
      if (sp) species[sp.toLowerCase()] = true;
      var hab = obs.habitat && obs.habitat.label;
      if (hab) habitats[hab.toLowerCase()] = true;
      var county = obs.location && obs.location.county;
      if (county) counties[county.toLowerCase()] = true;
    });
    var life = global.WaypointFieldryLifeList
      ? global.WaypointFieldryLifeList.deriveLifeList(list)
      : [];
    return {
      total: list.length,
      speciesCount: Object.keys(species).length,
      uniqueSubjects: life.length,
      habitatCount: Object.keys(habitats).length,
      countyCount: Object.keys(counties).length
    };
  }

  function filterList(options) {
    options = options || {};
    var Life = global.WaypointFieldryLifeList;
    return readAll().filter(function (obs) {
      if (options.category && options.category !== "all") {
        if (!Life || Life.getCategory(obs) !== options.category) return false;
      }
      if (options.privacy && options.privacy !== "all") {
        var p = (Life && Life.fieldryExt(obs).privacyLevel) || "private";
        if (p !== options.privacy) return false;
      }
      if (options.identified === "identified" && Life && Life.isUnidentified(obs)) return false;
      if (options.identified === "unidentified" && Life && !Life.isUnidentified(obs)) return false;
      if (options.query) {
        var q = String(options.query).toLowerCase();
        var hay = [
          obs.taxon && obs.taxon.label,
          obs.taxon && obs.taxon.commonName,
          obs.taxon && obs.taxon.scientificName,
          obs.record && obs.record.notes,
          Life && Life.fieldryExt(obs).tags && Life.fieldryExt(obs).tags.join(" ")
        ].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (options.fromDate && obs.observedAt && obs.observedAt.date < options.fromDate) return false;
      if (options.toDate && obs.observedAt && obs.observedAt.date > options.toDate) return false;
      if (options.favoriteIds && options.favoriteIds.length) {
        if (options.favoriteIds.indexOf(obs.id) < 0) return false;
      }
      return true;
    });
  }

  global.FieldryStorage = {
    APP_VERSION: APP_VERSION,
    STORAGE_KEY: STORAGE_KEY,
    DEVICE_KEY: DEVICE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    getDeviceId: getDeviceId,
    list: readAll,
    filter: filterList,
    get: get,
    createDraft: createDraft,
    hydrateFromContext: hydrateFromContext,
    ensureFieldryExtension: ensureFieldryExtension,
    save: save,
    remove: remove,
    getStats: getStats,
    migrateAll: migrateAll
  };
})(typeof window !== "undefined" ? window : global);
