/**
 * Waypoint Studio — shared local platform stores
 * Profile, saved locations, collections, settings.
 * Private by default. No followers, likes, or rankings.
 */
(function (global) {
  "use strict";

  var PROFILE_KEY = "waypoint-platform-profile-v1";
  var LOCATIONS_KEY = "waypoint-platform-locations-v1";
  var COLLECTIONS_KEY = "waypoint-platform-collections-v1";
  var SETTINGS_KEY = "waypoint-platform-settings-v1";

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
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

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function emptyProfile() {
    return {
      schemaVersion: "1.0.0",
      id: "local-user",
      displayName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacy: { visibility: "private", shareObservations: false },
      preferences: {
        homeApp: null,
        measurementSystem: "imperial",
        theme: "system"
      },
      linkedApps: {}
    };
  }

  function emptySettings() {
    return {
      schemaVersion: "1.1.0",
      updatedAt: new Date().toISOString(),
      accessibility: {
        reduceMotion: false,
        denserType: false
      },
      notifications: {
        enabled: false,
        localRemindersOnly: true
      },
      units: {
        measurementSystem: "imperial",
        temperature: "fahrenheit",
        coordinateFormat: "dd"
      },
      maps: {
        preferOfflineTiles: false,
        defaultZoomHint: "region"
      },
      theme: {
        mode: "system"
      },
      data: {
        allowAnonymousAggregates: false,
        allowResearchExport: false,
        syncEnabled: false
      },
      subscription: {
        readiness: true,
        active: false,
        plan: null
      }
    };
  }

  var Profile = {
    load: function () {
      var p = read(PROFILE_KEY, null);
      return p || (write(PROFILE_KEY, emptyProfile()), emptyProfile());
    },
    save: function (profile) {
      profile = profile || this.load();
      profile.updatedAt = new Date().toISOString();
      return write(PROFILE_KEY, profile);
    },
    setDisplayName: function (name) {
      var p = this.load();
      p.displayName = name || null;
      return this.save(p);
    }
  };

  var Locations = {
    list: function () {
      return read(LOCATIONS_KEY, []);
    },
    save: function (loc) {
      if (!loc) return false;
      var all = this.list().filter(function (l) { return l.id !== loc.id; });
      if (!loc.id) loc.id = "loc_" + uuid();
      loc.updatedAt = new Date().toISOString();
      if (!loc.createdAt) loc.createdAt = loc.updatedAt;
      if (!loc.privacy) loc.privacy = "private";
      all.unshift(loc);
      return write(LOCATIONS_KEY, all.slice(0, 50));
    },
    remove: function (id) {
      return write(LOCATIONS_KEY, this.list().filter(function (l) { return l.id !== id; }));
    },
    create: function (partial) {
      partial = partial || {};
      return {
        id: "loc_" + uuid(),
        label: partial.label || "Saved place",
        lat: partial.lat != null ? partial.lat : null,
        lng: partial.lng != null ? partial.lng : null,
        city: partial.city || null,
        county: partial.county || null,
        state: partial.state || null,
        country: partial.country || null,
        privacy: partial.privacy || "private",
        source: partial.source || "manual",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  };

  var Collections = {
    list: function () {
      return read(COLLECTIONS_KEY, []);
    },
    save: function (collection) {
      if (!collection) return false;
      var all = this.list().filter(function (c) { return c.id !== collection.id; });
      if (!collection.id) collection.id = "col_" + uuid();
      collection.updatedAt = new Date().toISOString();
      if (!collection.createdAt) collection.createdAt = collection.updatedAt;
      if (!collection.privacy) collection.privacy = "private";
      if (!Array.isArray(collection.itemIds)) collection.itemIds = [];
      all.unshift(collection);
      return write(COLLECTIONS_KEY, all.slice(0, 40));
    },
    create: function (partial) {
      partial = partial || {};
      return {
        id: "col_" + uuid(),
        title: partial.title || "Untitled collection",
        appId: partial.appId || null,
        kind: partial.kind || "general",
        itemIds: partial.itemIds || [],
        privacy: partial.privacy || "private",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    },
    addItem: function (collectionId, itemId) {
      var col = this.list().filter(function (c) { return c.id === collectionId; })[0];
      if (!col) return false;
      if (col.itemIds.indexOf(itemId) < 0) col.itemIds.push(itemId);
      return this.save(col);
    },
    favorites: function (appId) {
      var all = this.list();
      var fav = all.filter(function (c) {
        return c.kind === "favorites" && (!appId || c.appId === appId);
      })[0];
      if (fav) return fav;
      fav = this.create({ title: "Favorites", kind: "favorites", appId: appId || null });
      this.save(fav);
      return fav;
    }
  };

  var Settings = {
    load: function () {
      var s = read(SETTINGS_KEY, null);
      if (s) return s;
      var created = emptySettings();
      write(SETTINGS_KEY, created);
      return created;
    },
    save: function (settings) {
      settings = settings || this.load();
      settings.updatedAt = new Date().toISOString();
      return write(SETTINGS_KEY, settings);
    },
    patch: function (partial) {
      var s = this.load();
      Object.keys(partial || {}).forEach(function (k) {
        if (partial[k] && typeof partial[k] === "object" && !Array.isArray(partial[k])) {
          s[k] = Object.assign({}, s[k] || {}, partial[k]);
        } else {
          s[k] = partial[k];
        }
      });
      return this.save(s);
    }
  };

  global.WDS = global.WDS || {};
  global.WDS.platform = Object.assign(global.WDS.platform || {}, {
    PROFILE_KEY: PROFILE_KEY,
    LOCATIONS_KEY: LOCATIONS_KEY,
    COLLECTIONS_KEY: COLLECTIONS_KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    Profile: Profile,
    Locations: Locations,
    Collections: Collections,
    Settings: Settings
  });
})(typeof window !== "undefined" ? window : global);
