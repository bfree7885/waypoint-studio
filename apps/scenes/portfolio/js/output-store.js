/**
 * Waypoint Scenes — Portfolio Website Output · Store
 * localStorage persistence for website projects + lightweight export history.
 * Does not retain ZIP blobs.
 */
(function (global) {
  "use strict";

  var PROJECTS_KEY = "waypoint-scenes-portfolio-website-projects-v1";
  var HISTORY_KEY = "waypoint-scenes-portfolio-website-export-history-v1";
  var META_KEY = "waypoint-scenes-portfolio-website-meta-v1";
  var MAX_PROJECTS = 80;
  var MAX_HISTORY = 40;

  function Models() {
    return global.WaypointScenesPortfolioOutputModels;
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

  function loadProjects() {
    var M = Models();
    var raw = readJson(PROJECTS_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (row) {
      return M ? M.createProject(row) : row;
    });
  }

  function saveProjects(list) {
    return writeJson(PROJECTS_KEY, (list || []).slice(0, MAX_PROJECTS));
  }

  function loadHistory() {
    var M = Models();
    var raw = readJson(HISTORY_KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (row) {
      return M ? M.createExportHistoryEntry(row) : row;
    });
  }

  function saveHistory(list) {
    return writeJson(HISTORY_KEY, (list || []).slice(0, MAX_HISTORY));
  }

  function appendHistory(entry) {
    var list = loadHistory();
    list.unshift(entry);
    saveHistory(list);
    return entry;
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

  global.WaypointScenesPortfolioOutputStore = {
    PROJECTS_KEY: PROJECTS_KEY,
    HISTORY_KEY: HISTORY_KEY,
    META_KEY: META_KEY,
    MAX_PROJECTS: MAX_PROJECTS,
    MAX_HISTORY: MAX_HISTORY,
    loadProjects: loadProjects,
    saveProjects: saveProjects,
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    appendHistory: appendHistory,
    loadMeta: loadMeta,
    saveMeta: saveMeta
  };
})(typeof window !== "undefined" ? window : globalThis);
