/**
 * Air quality — Open-Meteo Air Quality API (US AQI).
 */
(function (global) {
  "use strict";

  var CACHE_TTL_MS = 15 * 60 * 1000;
  var cache = Object.create(null);

  function cacheKey(lat, lng) {
    return lat.toFixed(2) + "," + lng.toFixed(2);
  }

  function aqiCategory(aqi) {
    var n = Number(aqi);
    if (!isFinite(n)) return { label: "Unknown", level: "unknown" };
    if (n <= 50) return { label: "Good", level: "good" };
    if (n <= 100) return { label: "Moderate", level: "moderate" };
    if (n <= 150) return { label: "Unhealthy for sensitive groups", level: "sensitive" };
    if (n <= 200) return { label: "Unhealthy", level: "unhealthy" };
    if (n <= 300) return { label: "Very unhealthy", level: "very-unhealthy" };
    return { label: "Hazardous", level: "hazardous" };
  }

  function buildPackage(data, lat, lng, status, error) {
    var cur = data && data.current;
    var aqi = cur && cur.us_aqi != null ? Math.round(Number(cur.us_aqi)) : null;
    var pm25 = cur && cur.pm2_5 != null ? Math.round(cur.pm2_5 * 10) / 10 : null;
    var cat = aqiCategory(aqi);
    var pkg = {
      status: status,
      aqi: aqi,
      pm25: pm25,
      category: cat.label,
      categoryLevel: cat.level,
      meta: {
        provider: "open-meteo-air-quality",
        attribution: "Open-Meteo Air Quality",
        fetchedAt: new Date().toISOString(),
        lat: lat,
        lng: lng
      }
    };
    if (error) pkg.error = error;
    if (status === "live" && aqi != null) {
      pkg.summary = "AQI " + aqi + " — " + cat.label;
    } else if (status === "unavailable") {
      pkg.summary = "Air quality unavailable";
    }
    return pkg;
  }

  function fetchCurrent(request) {
    request = request || {};
    var lat = Number(request.lat);
    var lng = Number(request.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return Promise.reject(new Error("WDS.airQuality.fetchCurrent requires coordinates"));
    }

    var key = cacheKey(lat, lng);
    var cached = cache[key];
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }

    var url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
      encodeURIComponent(lat) + "&longitude=" + encodeURIComponent(lng) +
      "&current=us_aqi,pm2_5&timezone=auto";

    return fetch(url, { signal: request.signal })
      .then(function (res) {
        if (!res.ok) throw new Error("Air quality HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var pkg = buildPackage(data, lat, lng, "live");
        cache[key] = { at: Date.now(), data: pkg };
        return pkg;
      })
      .catch(function (err) {
        return buildPackage(null, lat, lng, "unavailable", err && err.message);
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.airQuality = { fetchCurrent: fetchCurrent, aqiCategory: aqiCategory };
})(window);
