/**
 * Reverse geocoding — Nominatim (OpenStreetMap). City/county for display only.
 */
(function (global) {
  "use strict";

  var DEFAULT_UA = "(waypoint.studio, contact@waypoint.studio)";
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  var cache = Object.create(null);

  function cacheKey(lat, lng) {
    return lat.toFixed(3) + "," + lng.toFixed(3);
  }

  function pickAddress(addr) {
    if (!addr) return {};
    return {
      city: addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || null,
      county: addr.county ? String(addr.county).replace(/\s+County$/i, "") : null,
      state: addr.state || null,
      stateCode: null,
      country: addr.country_code ? String(addr.country_code).toUpperCase() : null
    };
  }

  function inferStateCode(stateName) {
    var US = global.WDS && global.WDS.usStates;
    if (!US || !US.STATES || !stateName) return null;
    var lower = stateName.toLowerCase();
    for (var i = 0; i < US.STATES.length; i += 1) {
      if (US.STATES[i].name.toLowerCase() === lower) return US.STATES[i].code;
    }
    return null;
  }

  function reverse(request) {
    request = request || {};
    var lat = Number(request.lat);
    var lng = Number(request.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return Promise.reject(new Error("WDS.geocode.reverse requires coordinates"));
    }

    var key = cacheKey(lat, lng);
    var cached = cache[key];
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }

    var url = "https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=" +
      encodeURIComponent(lat.toFixed(6)) + "&lon=" + encodeURIComponent(lng.toFixed(6));

    return fetch(url, {
      headers: { "User-Agent": request.userAgent || DEFAULT_UA, Accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Geocode HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var picked = pickAddress(data.address);
        if (picked.state && !picked.stateCode) {
          picked.stateCode = inferStateCode(picked.state);
        }
        var pkg = {
          status: "live",
          city: picked.city,
          county: picked.county,
          state: picked.state,
          stateCode: picked.stateCode,
          country: picked.country,
          displayName: data.display_name || null,
          meta: {
            provider: "nominatim",
            attribution: "OpenStreetMap / Nominatim",
            fetchedAt: new Date().toISOString(),
            lat: lat,
            lng: lng
          }
        };
        cache[key] = { at: Date.now(), data: pkg };
        return pkg;
      })
      .catch(function (err) {
        return {
          status: "unavailable",
          meta: { provider: "nominatim", error: err && err.message }
        };
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.geocode = { reverse: reverse };
})(window);
