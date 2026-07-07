/**
 * Elevation — Open-Meteo digital elevation model (no API key).
 */
(function (global) {
  "use strict";

  var cache = {};
  var CACHE_MS = 24 * 60 * 60 * 1000;

  function cacheKey(lat, lng) {
    return Number(lat).toFixed(3) + "," + Number(lng).toFixed(3);
  }

  function fetchElevation(coords) {
    if (!coords || !isFinite(coords.lat) || !isFinite(coords.lng)) {
      return Promise.resolve(null);
    }
    var key = cacheKey(coords.lat, coords.lng);
    var hit = cache[key];
    if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.pkg);

    var url = "https://api.open-meteo.com/v1/elevation?latitude=" +
      encodeURIComponent(coords.lat) + "&longitude=" + encodeURIComponent(coords.lng);

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("elevation " + res.status);
      return res.json();
    }).then(function (data) {
      var meters = data && data.elevation && data.elevation[0];
      if (!isFinite(meters)) return null;
      var pkg = {
        meters: Math.round(meters),
        feet: Math.round(meters * 3.28084),
        source: "open-meteo-dem",
        provider: "Open-Meteo DEM",
        fetchedAt: new Date().toISOString(),
        trust: "Live"
      };
      cache[key] = { at: Date.now(), pkg: pkg };
      return pkg;
    }).catch(function () {
      return null;
    });
  }

  function formatElevation(pkg) {
    if (!pkg || pkg.meters == null) return "—";
    return pkg.meters + " m (" + pkg.feet + " ft)";
  }

  global.WDS = global.WDS || {};
  global.WDS.elevation = {
    fetchElevation: fetchElevation,
    formatElevation: formatElevation
  };
})(window);
