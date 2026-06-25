/**
 * Fieldry — local WOS observation storage (device only)
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-fieldry-observations-v1";
  var DEVICE_KEY = "waypoint-fieldry-device-id";
  var APP_VERSION = "1.0.0-mvp";

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

  function readAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalize).sort(function (a, b) {
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
      contentBundleId: loc && loc.contentBundle
    });
    return hydrateFromContext(obs, platform, loc);
  }

  function save(obs) {
    var O = wos();
    if (!O) throw new Error("WOS module not loaded");
    obs = normalize(ensureFieldryMeta(obs));
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
    return {
      total: list.length,
      speciesCount: Object.keys(species).length,
      habitatCount: Object.keys(habitats).length,
      countyCount: Object.keys(counties).length
    };
  }

  global.FieldryStorage = {
    APP_VERSION: APP_VERSION,
    getDeviceId: getDeviceId,
    list: readAll,
    get: get,
    createDraft: createDraft,
    hydrateFromContext: hydrateFromContext,
    save: save,
    remove: remove,
    getStats: getStats
  };
})(window);
