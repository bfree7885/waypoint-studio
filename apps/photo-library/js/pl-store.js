/**
 * Waypoint Photo Library — IndexedDB media + localStorage metadata
 *
 * Keys:
 *   localStorage  waypoint-photo-library-index-v1
 *   localStorage  waypoint-photo-library-collections-v1
 *   localStorage  waypoint-photo-library-meta-v1
 *   IndexedDB     waypoint-photo-library-media-v1  store: media
 *
 * Does not delete legacy Photo Coach / HL keys. Migration is additive.
 */
(function (global) {
  "use strict";

  var INDEX_KEY = "waypoint-photo-library-index-v1";
  var COLLECTIONS_KEY = "waypoint-photo-library-collections-v1";
  var META_KEY = "waypoint-photo-library-meta-v1";
  var PHOTO_DB = "waypoint-photo-library-media-v1";
  var PHOTO_STORE = "media";
  var MAX_INDEX = 2000;

  function Models() {
    return global.WaypointPhotoLibraryModels;
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

  function loadIndex() {
    var M = Models();
    var raw = readJson(INDEX_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (row) {
      return M ? M.createLibraryImage(row) : row;
    });
  }

  function saveIndex(images) {
    var list = (images || []).slice(0, MAX_INDEX);
    return writeJson(INDEX_KEY, list);
  }

  function loadCollections() {
    var M = Models();
    var raw = readJson(COLLECTIONS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (row) {
      return M ? M.createCollection(row) : row;
    });
  }

  function saveCollections(cols) {
    return writeJson(COLLECTIONS_KEY, cols || []);
  }

  function loadMeta() {
    return Object.assign(
      {
        schemaVersion: "1.0.0",
        migratedAt: null,
        migrationVersion: 0
      },
      readJson(META_KEY, {})
    );
  }

  function saveMeta(meta) {
    return writeJson(META_KEY, meta || {});
  }

  function openPhotoDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB is not available in this browser."));
        return;
      }
      var req = global.indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () {
        reject(req.error || new Error("Photo Library media store failed to open."));
      };
    });
  }

  function putMedia(id, blob, kind) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readwrite");
        tx.objectStore(PHOTO_STORE).put({
          id: id,
          blob: blob,
          kind: kind || "original",
          updatedAt: new Date().toISOString()
        });
        tx.oncomplete = function () { resolve(id); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getMedia(id) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readonly");
        var req = tx.objectStore(PHOTO_STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function deleteMedia(id) {
    return openPhotoDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(PHOTO_STORE, "readwrite");
        tx.objectStore(PHOTO_STORE).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  global.WaypointPhotoLibraryStore = {
    INDEX_KEY: INDEX_KEY,
    COLLECTIONS_KEY: COLLECTIONS_KEY,
    META_KEY: META_KEY,
    PHOTO_DB: PHOTO_DB,
    PHOTO_STORE: PHOTO_STORE,
    MAX_INDEX: MAX_INDEX,
    loadIndex: loadIndex,
    saveIndex: saveIndex,
    loadCollections: loadCollections,
    saveCollections: saveCollections,
    loadMeta: loadMeta,
    saveMeta: saveMeta,
    openPhotoDb: openPhotoDb,
    putMedia: putMedia,
    getMedia: getMedia,
    deleteMedia: deleteMedia
  };
})(typeof window !== "undefined" ? window : globalThis);
