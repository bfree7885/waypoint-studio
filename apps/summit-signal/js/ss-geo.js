/**
 * Distance and nearby-summit helpers. Pure functions; no data fetching.
 */
(function (global) {
  "use strict";

  var EARTH_KM = 6371;

  function isFiniteNumber(n) {
    return typeof n === "number" && isFinite(n);
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    if (![lat1, lng1, lat2, lng2].every(isFiniteNumber)) return null;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_KM * c;
  }

  function formatDistanceKm(km) {
    if (!isFiniteNumber(km)) return null;
    if (km < 1) return Math.round(km * 1000) + " m";
    if (km < 10) return km.toFixed(1) + " km";
    return Math.round(km) + " km";
  }

  /**
   * Nearby SOTA summits relative to a selected summit.
   * Distance is from summit to summit (not trailhead).
   */
  function nearbySummits(origin, summits, options) {
    var opts = options || {};
    var limit = typeof opts.limit === "number" ? opts.limit : 8;
    if (!origin || !isFiniteNumber(origin.lat) || !isFiniteNumber(origin.lng) || !Array.isArray(summits)) {
      return [];
    }
    var originId = origin.id || origin.reference;
    var ranked = [];
    for (var i = 0; i < summits.length; i += 1) {
      var s = summits[i];
      if (!s || s.id === originId || s.reference === originId) continue;
      if (!isFiniteNumber(s.lat) || !isFiniteNumber(s.lng)) continue;
      var km = haversineKm(origin.lat, origin.lng, s.lat, s.lng);
      if (km == null) continue;
      ranked.push({
        summit: s,
        distanceKm: km,
        distanceLabel: formatDistanceKm(km)
      });
    }
    ranked.sort(function (a, b) {
      return a.distanceKm - b.distanceKm;
    });
    return ranked.slice(0, limit);
  }

  var api = {
    haversineKm: haversineKm,
    formatDistanceKm: formatDistanceKm,
    nearbySummits: nearbySummits
  };

  global.SignalTerrainSotaGeo = api;
  var ns = global.SignalTerrainSota || (global.SignalTerrainSota = {});
  ns.Geo = api;
})(typeof window !== "undefined" ? window : globalThis);
