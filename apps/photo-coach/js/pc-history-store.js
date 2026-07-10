/**
 * Photo Coach — local critique history (no cloud).
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "photo-coach-critiques-v1";
  var MAX_ITEMS = 40;
  var THUMB_MAX = 180;

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function makeThumbnail(imageUrl) {
    return new Promise(function (resolve) {
      if (!imageUrl) {
        resolve(null);
        return;
      }
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          var scale = THUMB_MAX / Math.max(img.naturalWidth, img.naturalHeight);
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = function () { resolve(null); };
      img.src = imageUrl;
    });
  }

  function save(entry) {
    entry = entry || {};
    return makeThumbnail(entry.imageDataUrl || entry.thumbnailSource).then(function (thumb) {
      var record = {
        id: entry.id || entry.critique && entry.critique.id || "pc-" + Date.now().toString(36),
        filename: entry.filename || (entry.critique && entry.critique.filename) || "photo",
        analyzedAt: entry.analyzedAt || (entry.critique && entry.critique.analyzedAt) || new Date().toISOString(),
        score: entry.score != null ? entry.score : (entry.critique && entry.critique.score),
        thumbnail: thumb || entry.thumbnail || null,
        critique: entry.critique || null
      };
      if (record.critique && record.critique._signals) {
        var copy = Object.assign({}, record.critique);
        delete copy._signals;
        record.critique = copy;
      }
      var all = loadAll().filter(function (r) { return r.id !== record.id; });
      all.unshift(record);
      saveAll(all);
      return record;
    });
  }

  function list() {
    return loadAll();
  }

  function get(id) {
    return loadAll().filter(function (r) { return r.id === id; })[0] || null;
  }

  function remove(id) {
    saveAll(loadAll().filter(function (r) { return r.id !== id; }));
  }

  global.PhotoCoachHistoryStore = {
    STORAGE_KEY: STORAGE_KEY,
    save: save,
    list: list,
    get: get,
    remove: remove
  };
})(window);
