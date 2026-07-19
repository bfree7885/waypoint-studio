/**
 * Waypoint Studio — Shared Places service
 * Bridges active WDS.location with saved / recent / favorite places.
 *
 *   WDS.platformPlaces.current()
 *   WDS.platformPlaces.saved()
 *   WDS.platformPlaces.recent()
 *   WDS.platformPlaces.favorites()
 *   WDS.platformPlaces.saveCurrent(label)
 *   WDS.platformPlaces.remember(loc)
 *   WDS.platformPlaces.fromLocationState(state)
 */
(function (global) {
  "use strict";

  var RECENT_KEY = "waypoint-platform-recent-places-v1";
  var MAX_RECENT = 20;

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

  function stores() {
    return global.WDS && global.WDS.platform;
  }

  function fromLocationState(state) {
    if (!state) return null;
    return {
      label: state.displayName || state.name || state.city || state.county || "Current location",
      lat: state.lat != null ? state.lat : state.latitude,
      lng: state.lng != null ? state.lng : state.longitude,
      city: state.city || null,
      county: state.county || null,
      state: state.state || state.stateCode || null,
      country: state.country || "US",
      source: state.source || "location",
      privacy: "private"
    };
  }

  function current() {
    var Loc = global.WDS && global.WDS.location;
    if (Loc && Loc.getState) {
      return fromLocationState(Loc.getState());
    }
    if (Loc && Loc.readStored) {
      return fromLocationState(Loc.readStored());
    }
    return null;
  }

  function saved() {
    var S = stores();
    return S && S.Locations ? S.Locations.list() : [];
  }

  function recent() {
    return read(RECENT_KEY, []);
  }

  function remember(loc) {
    if (!loc || (loc.lat == null && loc.lng == null && !loc.label)) return false;
    var entry = {
      id: loc.id || ("recent_" + Date.now()),
      label: loc.label || "Recent place",
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city || null,
      county: loc.county || null,
      state: loc.state || null,
      source: loc.source || "recent",
      rememberedAt: new Date().toISOString()
    };
    var all = recent().filter(function (r) {
      if (entry.lat != null && r.lat != null) {
        return Math.abs(r.lat - entry.lat) > 0.0008 || Math.abs(r.lng - entry.lng) > 0.0008;
      }
      return r.label !== entry.label;
    });
    all.unshift(entry);
    return write(RECENT_KEY, all.slice(0, MAX_RECENT));
  }

  function saveCurrent(label) {
    var S = stores();
    var cur = current();
    if (!S || !S.Locations || !cur) return null;
    var place = S.Locations.create({
      label: label || cur.label,
      lat: cur.lat,
      lng: cur.lng,
      city: cur.city,
      county: cur.county,
      state: cur.state,
      country: cur.country,
      source: "current"
    });
    S.Locations.save(place);
    remember(place);
    return place;
  }

  function favorites() {
    return saved().filter(function (p) {
      return p.favorite === true || p.kind === "favorite";
    });
  }

  function markFavorite(id, on) {
    var S = stores();
    if (!S || !S.Locations) return false;
    var place = S.Locations.list().filter(function (p) { return p.id === id; })[0];
    if (!place) return false;
    place.favorite = on !== false;
    place.kind = place.favorite ? "favorite" : place.kind;
    return S.Locations.save(place);
  }

  function syncRecentFromActive() {
    var cur = current();
    if (cur && cur.lat != null) remember(cur);
  }

  // Soft-bind: when location module publishes changes, remember recent
  if (typeof document !== "undefined") {
    document.addEventListener("wds:location-change", function () {
      try { syncRecentFromActive(); } catch (e) { /* ignore */ }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.platformPlaces = {
    version: "1.0.0",
    RECENT_KEY: RECENT_KEY,
    current: current,
    saved: saved,
    recent: recent,
    favorites: favorites,
    remember: remember,
    saveCurrent: saveCurrent,
    markFavorite: markFavorite,
    fromLocationState: fromLocationState,
    syncRecentFromActive: syncRecentFromActive
  };
})(typeof window !== "undefined" ? window : globalThis);
