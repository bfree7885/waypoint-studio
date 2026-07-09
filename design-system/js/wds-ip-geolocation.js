/**
 * IP geolocation fallback — used when browser geolocation is denied or unavailable.
 * USA-focused; returns coordinates + city/region when possible.
 */
(function (global) {
  "use strict";

  var CACHE_TTL_MS = 30 * 60 * 1000;
  var cache = null;

  function lookup(options) {
    options = options || {};
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return Promise.resolve(Object.assign({}, cache.data, { fromCache: true }));
    }

    return fetch("https://ipwho.is/", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("IP geolocation HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || data.success === false) {
          throw new Error((data && data.message) || "IP geolocation failed");
        }
        if (data.country_code && String(data.country_code).toUpperCase() !== "US") {
          throw new Error("IP geolocation outside United States");
        }
        var lat = Number(data.latitude);
        var lng = Number(data.longitude);
        if (!isFinite(lat) || !isFinite(lng)) {
          throw new Error("IP geolocation returned invalid coordinates");
        }
        var pkg = {
          lat: lat,
          lng: lng,
          accuracy: null,
          city: data.city || null,
          region: data.region || null,
          stateCode: data.region_code || null,
          country: data.country_code || "US",
          isp: data.connection && data.connection.isp ? data.connection.isp : null,
          meta: {
            provider: "ipwho.is",
            fetchedAt: new Date().toISOString()
          }
        };
        cache = { at: Date.now(), data: pkg };
        return pkg;
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.ipGeolocation = { lookup: lookup };
})(window);
