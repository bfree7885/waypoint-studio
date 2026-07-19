/**
 * Waypoint Volunteer — private planning / saved opportunities.
 * Statuses: interested | planning | registered | completed | favorite | hidden | dismissed | remind-later
 */
(function (global) {
  "use strict";

  var KEY = "waypoint-volunteer-planning-v1";
  var STATUSES = [
    "interested",
    "planning",
    "registered",
    "completed",
    "favorite",
    "hidden",
    "dismissed",
    "remind-later"
  ];

  var DEFAULT = {
    version: 1,
    items: {},
    visited: {},
    updatedAt: null
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function load() {
    try {
      var ls = global.localStorage;
      var raw = ls && ls.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var parsed = JSON.parse(raw);
      var out = clone(DEFAULT);
      if (parsed.items) out.items = parsed.items;
      if (parsed.visited) out.visited = parsed.visited;
      out.updatedAt = parsed.updatedAt || null;
      return out;
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  function persist(state) {
    state.updatedAt = new Date().toISOString();
    try {
      if (global.localStorage) global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
    return state;
  }

  function setStatus(id, status, extra) {
    if (STATUSES.indexOf(status) === -1) throw new Error("Unknown status: " + status);
    var state = load();
    var prev = state.items[id] || { id: id, statuses: [], note: "", updatedAt: null };
    var statuses = prev.statuses.slice();
    if (status === "hidden" || status === "dismissed") {
      statuses = [status];
    } else {
      statuses = statuses.filter(function (s) {
        return s !== "hidden" && s !== "dismissed" && s !== status;
      });
      statuses.push(status);
    }
    state.items[id] = Object.assign({}, prev, extra || {}, {
      id: id,
      statuses: statuses,
      updatedAt: new Date().toISOString()
    });
    return persist(state);
  }

  function clearStatus(id, status) {
    var state = load();
    var prev = state.items[id];
    if (!prev) return state;
    prev.statuses = (prev.statuses || []).filter(function (s) {
      return s !== status;
    });
    if (!prev.statuses.length && !prev.note) delete state.items[id];
    else state.items[id] = prev;
    return persist(state);
  }

  function markVisited(id) {
    var state = load();
    state.visited[id] = new Date().toISOString();
    return persist(state);
  }

  function hasStatus(id, status) {
    var item = load().items[id];
    return !!(item && item.statuses && item.statuses.indexOf(status) !== -1);
  }

  function isHidden(id) {
    return hasStatus(id, "hidden") || hasStatus(id, "dismissed");
  }

  function listByStatus(status) {
    var state = load();
    return Object.keys(state.items).filter(function (id) {
      return (state.items[id].statuses || []).indexOf(status) !== -1;
    });
  }

  function getItem(id) {
    return load().items[id] || null;
  }

  function clearAll() {
    try {
      if (global.localStorage) global.localStorage.removeItem(KEY);
    } catch (e) {}
    return clone(DEFAULT);
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerPlanning = {
    KEY: KEY,
    STATUSES: STATUSES,
    load: load,
    setStatus: setStatus,
    clearStatus: clearStatus,
    markVisited: markVisited,
    hasStatus: hasStatus,
    isHidden: isHidden,
    listByStatus: listByStatus,
    getItem: getItem,
    clearAll: clearAll
  };
})(window);
