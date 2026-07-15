/**
 * Sheds — private field observations (local-first).
 * Schema: waypoint-sheds-observations-v1
 * Coordinates stay on-device. No public sharing in v0.1.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-sheds-observations-v1";
  var VIEW_KEY = "waypoint-sheds-map-view-v1";
  var MODEL_KEY = "waypoint-sheds-model-prefs-v1";
  var SCHEMA_VERSION = 1;
  var MAX_OBS = 500;

  var SPECIES_WHITETAIL = "odocoileus-virginianus";

  var OBSERVATION_TYPES = [
    { id: "shed_found", label: "Shed found", group: "find", marker: "shed" },
    { id: "deer_seen", label: "Deer seen", group: "wildlife", marker: "deer" },
    { id: "deer_sign", label: "Deer sign", group: "sign", marker: "sign" },
    { id: "trail_crossing", label: "Trail or crossing", group: "travel", marker: "trail" },
    { id: "bedding_area", label: "Bedding area", group: "habitat", marker: "bed" },
    { id: "feeding_area", label: "Feeding area", group: "habitat", marker: "feed" },
    { id: "fence_crossing", label: "Fence crossing", group: "travel", marker: "fence" },
    { id: "winter_concentration", label: "Winter concentration area", group: "habitat", marker: "winter" },
    { id: "search_completed", label: "Search completed", group: "effort", marker: "search" },
    { id: "access_issue", label: "Access issue", group: "access", marker: "access" },
    { id: "habitat_note", label: "Habitat note", group: "habitat", marker: "note" },
    { id: "other", label: "Other", group: "other", marker: "other" }
  ];

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function typeMeta(id) {
    for (var i = 0; i < OBSERVATION_TYPES.length; i++) {
      if (OBSERVATION_TYPES[i].id === id) return OBSERVATION_TYPES[i];
    }
    return OBSERVATION_TYPES[OBSERVATION_TYPES.length - 1];
  }

  function isFiniteCoord(n) {
    return typeof n === "number" && isFinite(n);
  }

  function validateObservation(obs) {
    if (!obs || typeof obs !== "object") return { ok: false, error: "Invalid observation." };
    if (!obs.id || typeof obs.id !== "string") return { ok: false, error: "Missing id." };
    if (!typeMeta(obs.type).id || obs.type !== typeMeta(obs.type).id) {
      if (!OBSERVATION_TYPES.some(function (t) { return t.id === obs.type; })) {
        return { ok: false, error: "Unknown observation type." };
      }
    }
    if (!obs.location || !isFiniteCoord(obs.location.lat) || !isFiniteCoord(obs.location.lng)) {
      return { ok: false, error: "Coordinates required." };
    }
    if (obs.location.lat < -90 || obs.location.lat > 90 || obs.location.lng < -180 || obs.location.lng > 180) {
      return { ok: false, error: "Coordinates out of range." };
    }
    return { ok: true };
  }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;
    var now = new Date().toISOString();
    var type = raw.type || "other";
    var obs = {
      schemaVersion: SCHEMA_VERSION,
      id: raw.id || ("obs_" + uuid()),
      type: type,
      speciesId: raw.speciesId || SPECIES_WHITETAIL,
      location: {
        lat: Number(raw.location && raw.location.lat),
        lng: Number(raw.location && raw.location.lng),
        precision: (raw.location && raw.location.precision) || "exact",
        privacy: "private"
      },
      privacy: "private",
      observedAt: raw.observedAt || now,
      note: raw.note != null ? String(raw.note) : "",
      confidence: raw.confidence || "uncertain",
      quantity: raw.quantity == null || raw.quantity === "" ? null : Number(raw.quantity),
      details: raw.details && typeof raw.details === "object" ? raw.details : {},
      createdAt: raw.createdAt || now,
      updatedAt: raw.updatedAt || now
    };
    if (type === "shed_found") {
      obs.details = Object.assign({
        side: "unknown",
        freshness: "unknown",
        antlerCount: 1,
        collected: false
      }, obs.details);
    }
    return obs;
  }

  function safeParseList(raw) {
    try {
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map(normalize).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function list() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return safeParseList(raw);
    } catch (e) {
      return [];
    }
  }

  function persist(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, MAX_OBS)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getById(id) {
    var all = list();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function create(partial) {
    var obs = normalize(Object.assign({}, partial, {
      id: "obs_" + uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    var check = validateObservation(obs);
    if (!check.ok) return { ok: false, error: check.error };
    var all = list();
    all.unshift(obs);
    if (!persist(all)) return { ok: false, error: "Could not save locally (storage full or blocked)." };
    return { ok: true, observation: obs };
  }

  function update(id, patch) {
    var all = list();
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { idx = i; break; }
    if (idx < 0) return { ok: false, error: "Observation not found." };
    var next = normalize(Object.assign({}, all[idx], patch, {
      id: id,
      createdAt: all[idx].createdAt,
      updatedAt: new Date().toISOString(),
      location: Object.assign({}, all[idx].location, patch.location || {}),
      details: Object.assign({}, all[idx].details || {}, patch.details || {})
    }));
    var check = validateObservation(next);
    if (!check.ok) return { ok: false, error: check.error };
    all[idx] = next;
    if (!persist(all)) return { ok: false, error: "Could not save locally." };
    return { ok: true, observation: next };
  }

  function remove(id) {
    var all = list().filter(function (o) { return o.id !== id; });
    if (!persist(all)) return { ok: false, error: "Could not update storage." };
    return { ok: true };
  }

  function exportJson() {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      privacy: "private-local",
      speciesFocus: SPECIES_WHITETAIL,
      observations: list()
    };
  }

  function loadMapView() {
    try {
      var raw = localStorage.getItem(VIEW_KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || !isFiniteCoord(v.lat) || !isFiniteCoord(v.lng)) return null;
      return {
        lat: v.lat,
        lng: v.lng,
        zoom: isFiniteCoord(v.zoom) ? v.zoom : 12
      };
    } catch (e) {
      return null;
    }
  }

  function saveMapView(view) {
    if (!view || !isFiniteCoord(view.lat) || !isFiniteCoord(view.lng)) return;
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify({
        lat: view.lat,
        lng: view.lng,
        zoom: view.zoom || 12,
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* ignore */ }
  }

  function defaultModelPrefs() {
    return {
      schemaVersion: 1,
      heatVisible: true,
      obsVisible: true,
      coverageVisible: true,
      showConfidence: false,
      opacity: 0.55,
      weights: {
        season: "balanced",
        slope: "balanced",
        aspect: "balanced",
        feeding: "balanced",
        bedding: "balanced",
        edges: "balanced",
        corridors: "balanced",
        deerSign: "balanced",
        fences: "balanced",
        searchHistory: "balanced",
        snow: "balanced"
      }
    };
  }

  function loadModelPrefs() {
    try {
      var raw = localStorage.getItem(MODEL_KEY);
      if (!raw) return defaultModelPrefs();
      var parsed = JSON.parse(raw);
      var base = defaultModelPrefs();
      return {
        schemaVersion: 1,
        heatVisible: parsed.heatVisible !== false,
        obsVisible: parsed.obsVisible !== false,
        coverageVisible: parsed.coverageVisible !== false,
        showConfidence: !!parsed.showConfidence,
        opacity: typeof parsed.opacity === "number" ? parsed.opacity : 0.55,
        weights: Object.assign({}, base.weights, parsed.weights || {})
      };
    } catch (e) {
      return defaultModelPrefs();
    }
  }

  function saveModelPrefs(prefs) {
    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify(prefs));
      return true;
    } catch (e) {
      return false;
    }
  }

  global.WaypointShedsObservations = {
    STORAGE_KEY: STORAGE_KEY,
    VIEW_KEY: VIEW_KEY,
    MODEL_KEY: MODEL_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    SPECIES_WHITETAIL: SPECIES_WHITETAIL,
    OBSERVATION_TYPES: OBSERVATION_TYPES,
    typeMeta: typeMeta,
    list: list,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    validate: validateObservation,
    normalize: normalize,
    exportJson: exportJson,
    loadMapView: loadMapView,
    saveMapView: saveMapView,
    defaultModelPrefs: defaultModelPrefs,
    loadModelPrefs: loadModelPrefs,
    saveModelPrefs: saveModelPrefs
  };
})(window);
