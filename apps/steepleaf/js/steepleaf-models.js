/**
 * Steepleaf — tea catalog & brew journal foundations.
 */
(function (global) {
  "use strict";

  var TEA_KEY = "waypoint-steepleaf-teas-v1";
  var BREW_KEY = "waypoint-steepleaf-brews-v1";

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function createTea(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "tea_" + uuid(),
      name: partial.name || "Untitled tea",
      type: partial.type || null,
      origin: partial.origin || null,
      flavorNotes: partial.flavorNotes || [],
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  function createBrew(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "brew_" + uuid(),
      teaId: partial.teaId || null,
      brewedAt: partial.brewedAt || new Date().toISOString(),
      waterTempC: partial.waterTempC != null ? partial.waterTempC : null,
      steepSeconds: partial.steepSeconds != null ? partial.steepSeconds : null,
      rating: partial.rating != null ? partial.rating : null,
      notes: partial.notes || null,
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  global.WaypointSteepleaf = {
    TEA_KEY: TEA_KEY,
    BREW_KEY: BREW_KEY,
    createTea: createTea,
    createBrew: createBrew,
    listTeas: function () { return read(TEA_KEY); },
    listBrews: function () { return read(BREW_KEY); },
    saveTea: function (tea) {
      var all = read(TEA_KEY).filter(function (t) { return t.id !== tea.id; });
      all.unshift(tea);
      return write(TEA_KEY, all.slice(0, 200));
    },
    saveBrew: function (brew) {
      var all = read(BREW_KEY).filter(function (b) { return b.id !== brew.id; });
      all.unshift(brew);
      return write(BREW_KEY, all.slice(0, 300));
    }
  };
})(window);
