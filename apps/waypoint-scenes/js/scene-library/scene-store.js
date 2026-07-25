/**
 * Waypoint Scenes — Scene Library persistence.
 *
 * Index lives in localStorage (cheap metadata). Photo thumbnails and original
 * references stay as URLs / library IDs so we never serialize hundreds of
 * full-resolution images into localStorage.
 */
(function (global) {
  "use strict";

  var INDEX_KEY = "waypoint-scene-library-index-v1";
  var META_KEY = "waypoint-scene-library-meta-v1";
  var MAX_SCENES = 500;

  function loadIndex() {
    try {
      var raw = global.localStorage.getItem(INDEX_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveIndex(scenes) {
    var list = Array.isArray(scenes) ? scenes.slice(0, MAX_SCENES) : [];
    try {
      global.localStorage.setItem(INDEX_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadMeta() {
    try {
      var raw = global.localStorage.getItem(META_KEY);
      return raw ? JSON.parse(raw) : { schemaVersion: "1.0.0", seededAt: null };
    } catch (e) {
      return { schemaVersion: "1.0.0", seededAt: null };
    }
  }

  function saveMeta(meta) {
    try {
      global.localStorage.setItem(META_KEY, JSON.stringify(meta || {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getById(id) {
    var index = loadIndex();
    for (var i = 0; i < index.length; i++) {
      if (index[i].id === id) return index[i];
    }
    return null;
  }

  function upsert(scene) {
    if (!scene || !scene.id) return false;
    var index = loadIndex();
    var found = false;
    for (var i = 0; i < index.length; i++) {
      if (index[i].id === scene.id) {
        index[i] = scene;
        found = true;
        break;
      }
    }
    if (!found) index.unshift(scene);
    return saveIndex(index);
  }

  function remove(id) {
    var index = loadIndex().filter(function (s) { return s.id !== id; });
    return saveIndex(index);
  }

  function clear() {
    try {
      global.localStorage.removeItem(INDEX_KEY);
      global.localStorage.removeItem(META_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.WaypointSceneStore = {
    INDEX_KEY: INDEX_KEY,
    META_KEY: META_KEY,
    MAX_SCENES: MAX_SCENES,
    loadIndex: loadIndex,
    saveIndex: saveIndex,
    loadMeta: loadMeta,
    saveMeta: saveMeta,
    getById: getById,
    upsert: upsert,
    remove: remove,
    clear: clear
  };
})(typeof window !== "undefined" ? window : globalThis);
