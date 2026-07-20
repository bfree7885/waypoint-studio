/**
 * NWS active alerts — api.weather.gov/alerts/active (point query)
 * Official outdoor safety layer; no API key required.
 */
(function (global) {
  "use strict";

  var DEFAULT_UA = "(waypointstudio.org, contact@waypointstudio.org)";
  var CACHE_TTL_MS = 5 * 60 * 1000;
  var cache = Object.create(null);

  function cacheKey(lat, lng) {
    return lat.toFixed(2) + "," + lng.toFixed(2);
  }

  function normalizeFeature(feature) {
    var p = (feature && feature.properties) || {};
    return {
      id: feature.id || p.id || null,
      event: p.event || "Weather alert",
      headline: p.headline || p.event || "",
      severity: p.severity || "Unknown",
      urgency: p.urgency || "",
      certainty: p.certainty || "",
      areaDesc: p.areaDesc || "",
      effective: p.effective || null,
      expires: p.expires || null,
      description: String(p.description || "").trim(),
      instruction: String(p.instruction || "").trim(),
      senderName: p.senderName || "National Weather Service"
    };
  }

  function severityRank(severity) {
    var order = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
    return order[severity] != null ? order[severity] : 5;
  }

  function sortAlerts(alerts) {
    return alerts.slice().sort(function (a, b) {
      var d = severityRank(a.severity) - severityRank(b.severity);
      if (d !== 0) return d;
      return String(b.effective || "").localeCompare(String(a.effective || ""));
    });
  }

  function buildPackage(alerts, lat, lng, status, error) {
    var pkg = {
      status: status,
      items: alerts,
      count: alerts.length,
      meta: {
        provider: "nws",
        attribution: "National Weather Service",
        fetchedAt: new Date().toISOString(),
        lat: lat,
        lng: lng
      }
    };
    if (error) pkg.error = error;
    if (status === "live" && alerts.length) {
      pkg.summary = alerts.length + " active NWS alert" + (alerts.length === 1 ? "" : "s");
    } else if (status === "empty") {
      pkg.summary = "No active NWS alerts for this location";
    } else if (status === "unavailable") {
      pkg.summary = "NWS alerts unavailable";
    }
    return pkg;
  }

  function fetchActive(request) {
    request = request || {};
    // Do not coerce null → 0 (Number(null)===0 caused point=0.0000,0.0000 on Dashboard cold start)
    if (request.lat == null || request.lng == null || request.lat === "" || request.lng === "") {
      return Promise.resolve(buildPackage([], null, null, "unavailable", "missing coordinates"));
    }
    var lat = typeof request.lat === "number" ? request.lat : Number(request.lat);
    var lng = typeof request.lng === "number" ? request.lng : Number(request.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return Promise.resolve(buildPackage([], null, null, "unavailable", "invalid coordinates"));
    }
    // Null Island is never a valid user location for this product
    if (lat === 0 && lng === 0) {
      return Promise.resolve(buildPackage([], lat, lng, "unavailable", "invalid coordinates"));
    }

    var key = cacheKey(lat, lng);
    var cached = cache[key];
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }

    var url = "https://api.weather.gov/alerts/active?point=" + lat.toFixed(4) + "," + lng.toFixed(4);
    var headers = {
      Accept: "application/geo+json",
      "User-Agent": request.userAgent || DEFAULT_UA
    };

    return fetch(url, { headers: headers, signal: request.signal })
      .then(function (res) {
        if (!res.ok) throw new Error("NWS alerts HTTP " + res.status);
        return res.json();
      })
      .then(function (geojson) {
        var alerts = sortAlerts((geojson.features || []).map(normalizeFeature));
        var status = alerts.length ? "live" : "empty";
        var pkg = buildPackage(alerts, lat, lng, status);
        cache[key] = { at: Date.now(), data: pkg };
        return pkg;
      })
      .catch(function (err) {
        return buildPackage([], lat, lng, "unavailable", err && err.message ? err.message : "fetch failed");
      });
  }

  function matchEvent(alert, pattern) {
    var hay = (
      (alert.event || "") + " " +
      (alert.headline || "") + " " +
      (alert.description || "")
    ).toLowerCase();
    return pattern.test(hay);
  }

  function filterByPattern(alertsPkg, pattern) {
    if (!alertsPkg || !alertsPkg.items || !alertsPkg.items.length) return [];
    return alertsPkg.items.filter(function (alert) {
      return matchEvent(alert, pattern);
    });
  }

  function clearCache() {
    cache = Object.create(null);
  }

  global.WDS = global.WDS || {};
  global.WDS.nwsAlerts = {
    fetchActive: fetchActive,
    filterByPattern: filterByPattern,
    matchEvent: matchEvent,
    clearCache: clearCache,
    normalizeFeature: normalizeFeature
  };
})(window);
