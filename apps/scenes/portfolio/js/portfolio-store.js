/**
 * Waypoint Scenes — Portfolio local store
 *
 * localStorage key: waypoint-scenes-portfolios-v1
 * Portfolios reference Photo Library image ids; they do not store blobs.
 */
(function (global) {
  "use strict";

  var PORTFOLIOS_KEY = "waypoint-scenes-portfolios-v1";
  var META_KEY = "waypoint-scenes-portfolios-meta-v1";
  var MAX_PORTFOLIOS = 100;

  function Models() {
    return global.WaypointScenesPortfolioModels;
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

  function loadPortfolios() {
    var M = Models();
    var raw = readJson(PORTFOLIOS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (row) {
      return M ? M.createPortfolio(row) : row;
    });
  }

  function savePortfolios(list) {
    var clipped = (list || []).slice(0, MAX_PORTFOLIOS);
    return writeJson(PORTFOLIOS_KEY, clipped);
  }

  function loadMeta() {
    return Object.assign(
      {
        schemaVersion: "1.0.0",
        updatedAt: null
      },
      readJson(META_KEY, {})
    );
  }

  function saveMeta(meta) {
    return writeJson(META_KEY, meta || {});
  }

  global.WaypointScenesPortfolioStore = {
    PORTFOLIOS_KEY: PORTFOLIOS_KEY,
    META_KEY: META_KEY,
    MAX_PORTFOLIOS: MAX_PORTFOLIOS,
    loadPortfolios: loadPortfolios,
    savePortfolios: savePortfolios,
    loadMeta: loadMeta,
    saveMeta: saveMeta
  };
})(typeof window !== "undefined" ? window : globalThis);
