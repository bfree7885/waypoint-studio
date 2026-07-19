/**
 * Savant Sommelier — extended cellar / site / wishlist models (local-first).
 */
(function (global) {
  "use strict";

  var WINERY_KEY = "waypoint-savant-wineries-v1";
  var WINE_KEY = "waypoint-savant-wines-v1";
  var SITE_KEY = "waypoint-savant-sites-v1";
  var WISH_KEY = "waypoint-savant-wishlist-v1";
  var SETTINGS_KEY = "waypoint-savant-settings-v1";

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

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s || {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function createSite(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.1.0",
      id: partial.id || ("site_" + uuid()),
      label: partial.label || "Site",
      lat: partial.lat != null ? Number(partial.lat) : null,
      lng: partial.lng != null ? Number(partial.lng) : null,
      elevationM: partial.elevationM != null ? Number(partial.elevationM) : null,
      slopeDeg: partial.slopeDeg != null ? Number(partial.slopeDeg) : null,
      aspect: partial.aspect || null,
      hardinessZone: partial.hardinessZone || null,
      notes: partial.notes || null,
      privacy: partial.privacy || "private",
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function createWinery(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.1.0",
      id: partial.id || ("winery_" + uuid()),
      name: partial.name || "Winery",
      region: partial.region || null,
      country: partial.country || null,
      privacy: partial.privacy || "private",
      createdAt: partial.createdAt || new Date().toISOString()
    };
  }

  function createWine(partial) {
    partial = partial || {};
    return {
      schemaVersion: "1.1.0",
      id: partial.id || ("wine_" + uuid()),
      name: partial.name || "Wine",
      varietal: partial.varietal || null,
      blend: partial.blend || null,
      style: partial.style || null,
      region: partial.region || null,
      country: partial.country || null,
      wineryId: partial.wineryId || null,
      wineryName: partial.wineryName || null,
      vintage: partial.vintage || null,
      quantity: partial.quantity != null ? Number(partial.quantity) : 1,
      purchasePrice: partial.purchasePrice != null ? Number(partial.purchasePrice) : null,
      purchaseDate: partial.purchaseDate || null,
      location: partial.location || null,
      drinkFrom: partial.drinkFrom || null,
      drinkTo: partial.drinkTo || null,
      rating: partial.rating != null ? Number(partial.rating) : null,
      notes: partial.notes || null,
      tastingNotes: partial.tastingNotes || null,
      foodPairings: partial.foodPairings || [],
      favorite: !!partial.favorite,
      photoDataUrl: partial.photoDataUrl || null,
      privacy: partial.privacy || "private",
      createdAt: partial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function upsert(key, item, cap) {
    var all = read(key).filter(function (x) { return x.id !== item.id; });
    item.updatedAt = new Date().toISOString();
    all.unshift(item);
    return write(key, all.slice(0, cap));
  }

  function remove(key, id) {
    return write(key, read(key).filter(function (x) { return x.id !== id; }));
  }

  function searchWines(query, filters) {
    filters = filters || {};
    var q = String(query || "").toLowerCase().trim();
    return read(WINE_KEY).filter(function (w) {
      if (filters.favorite && !w.favorite) return false;
      if (filters.varietal && String(w.varietal || "").toLowerCase() !== String(filters.varietal).toLowerCase()) return false;
      if (filters.style && String(w.style || "").toLowerCase() !== String(filters.style).toLowerCase()) return false;
      if (!q) return true;
      var blob = [w.name, w.varietal, w.blend, w.style, w.region, w.country, w.wineryName, w.notes, w.tastingNotes, w.location]
        .join(" ").toLowerCase();
      return blob.indexOf(q) !== -1;
    });
  }

  function cellarStats() {
    var wines = read(WINE_KEY);
    var bottles = wines.reduce(function (n, w) { return n + (Number(w.quantity) || 0); }, 0);
    var spent = wines.reduce(function (n, w) {
      var p = Number(w.purchasePrice);
      var q = Number(w.quantity) || 0;
      return n + (isFinite(p) ? p * q : 0);
    }, 0);
    return {
      wineCount: wines.length,
      bottleCount: bottles,
      favoriteCount: wines.filter(function (w) { return w.favorite; }).length,
      wishlistCount: read(WISH_KEY).length,
      siteCount: read(SITE_KEY).length,
      estimatedSpend: Math.round(spent * 100) / 100
    };
  }

  function clearAllLocal() {
    [WINERY_KEY, WINE_KEY, SITE_KEY, WISH_KEY].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    });
    return true;
  }

  global.WaypointSavant = {
    WINERY_KEY: WINERY_KEY,
    WINE_KEY: WINE_KEY,
    SITE_KEY: SITE_KEY,
    WISH_KEY: WISH_KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    createSite: createSite,
    createWinery: createWinery,
    createWine: createWine,
    listSites: function () { return read(SITE_KEY); },
    listWineries: function () { return read(WINERY_KEY); },
    listWines: function () { return read(WINE_KEY); },
    listWishlist: function () { return read(WISH_KEY); },
    saveSite: function (site) { return upsert(SITE_KEY, createSite(site), 100); },
    saveWinery: function (w) { return upsert(WINERY_KEY, createWinery(w), 200); },
    saveWine: function (w) { return upsert(WINE_KEY, createWine(w), 400); },
    saveWishlistItem: function (item) {
      item = item || {};
      item.id = item.id || ("wish_" + uuid());
      item.createdAt = item.createdAt || new Date().toISOString();
      return upsert(WISH_KEY, item, 200);
    },
    removeWine: function (id) { return remove(WINE_KEY, id); },
    removeSite: function (id) { return remove(SITE_KEY, id); },
    removeWishlistItem: function (id) { return remove(WISH_KEY, id); },
    searchWines: searchWines,
    cellarStats: cellarStats,
    readSettings: readSettings,
    saveSettings: saveSettings,
    clearAllLocal: clearAllLocal
  };
})(typeof window !== "undefined" ? window : globalThis);
