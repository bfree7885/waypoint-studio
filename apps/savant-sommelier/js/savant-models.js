/**
 * Savant Sommelier — vineyard & wine catalog foundations.
 */
(function (global) {
  "use strict";

  var WINERY_KEY = "waypoint-savant-wineries-v1";
  var WINE_KEY = "waypoint-savant-wines-v1";
  var SITE_KEY = "waypoint-savant-sites-v1";

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

  function createSite(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "site_" + uuid(),
      label: partial.label || "Site",
      lat: partial.lat != null ? partial.lat : null,
      lng: partial.lng != null ? partial.lng : null,
      elevationM: null,
      slopeDeg: null,
      aspect: null,
      hardinessZone: null,
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  function createWinery(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "winery_" + uuid(),
      name: partial.name || "Winery",
      region: partial.region || null,
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  function createWine(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.0.0",
      id: "wine_" + uuid(),
      name: partial.name || "Wine",
      varietal: partial.varietal || null,
      wineryId: partial.wineryId || null,
      vintage: partial.vintage || null,
      notes: partial.notes || null,
      privacy: "private",
      createdAt: new Date().toISOString()
    };
  }

  global.WaypointSavant = {
    WINERY_KEY: WINERY_KEY,
    WINE_KEY: WINE_KEY,
    SITE_KEY: SITE_KEY,
    createSite: createSite,
    createWinery: createWinery,
    createWine: createWine,
    listSites: function () { return read(SITE_KEY); },
    listWineries: function () { return read(WINERY_KEY); },
    listWines: function () { return read(WINE_KEY); },
    saveSite: function (site) {
      var all = read(SITE_KEY).filter(function (s) { return s.id !== site.id; });
      all.unshift(site);
      return write(SITE_KEY, all.slice(0, 100));
    },
    saveWinery: function (w) {
      var all = read(WINERY_KEY).filter(function (x) { return x.id !== w.id; });
      all.unshift(w);
      return write(WINERY_KEY, all.slice(0, 200));
    },
    saveWine: function (w) {
      var all = read(WINE_KEY).filter(function (x) { return x.id !== w.id; });
      all.unshift(w);
      return write(WINE_KEY, all.slice(0, 400));
    }
  };
})(window);
