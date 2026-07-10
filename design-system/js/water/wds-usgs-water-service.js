/**
 * USGS Water Services — nearest stream gauge via IV (no API key).
 * Provisional data; subject to revision per USGS disclaimer.
 */
(function (global) {
  "use strict";

  var CACHE = {};
  var CACHE_MS = 15 * 60 * 1000;
  var CACHE_VERSION = 3;
  var MAX_GAUGE_DISTANCE_MILES = 50;
  var MAX_GAUGE_DISTANCE_KM = MAX_GAUGE_DISTANCE_MILES * 1.60934;

  function cacheKey(lat, lng) {
    return CACHE_VERSION + ":" + Number(lat).toFixed(2) + "," + Number(lng).toFixed(2);
  }

  function clearCache() {
    CACHE = {};
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bbox(lat, lng, delta) {
    delta = delta || 0.35;
    return [
      (lng - delta).toFixed(4),
      (lat - delta).toFixed(4),
      (lng + delta).toFixed(4),
      (lat + delta).toFixed(4)
    ].join(",");
  }

  function parseSeries(data) {
    var ts = data && data.value && data.value.timeSeries;
    if (!Array.isArray(ts)) return [];
    return ts.map(function (series) {
      var src = series.sourceInfo || {};
      var geo = src.geoLocation && src.geoLocation.geogLocation;
      var siteCode = src.siteCode && src.siteCode[0] ? src.siteCode[0].value : null;
      var varCode = series.variable && series.variable.variableCode &&
        series.variable.variableCode[0] ? series.variable.variableCode[0].value : null;
      var val = series.values && series.values[0] && series.values[0].value &&
        series.values[0].value[0] ? series.values[0].value[0] : null;
      return {
        siteId: siteCode,
        siteName: src.siteName || "USGS gauge",
        lat: geo ? Number(geo.latitude) : null,
        lng: geo ? Number(geo.longitude) : null,
        parameter: varCode,
        value: val ? Number(val.value) : null,
        unit: series.variable && series.variable.unit ? series.variable.unit.unitCode : null,
        observedAt: val ? val.dateTime : null,
        provisional: val && val.qualifiers && val.qualifiers.indexOf("P") >= 0
      };
    }).filter(function (s) { return s.siteId && s.value != null && isFinite(s.value); });
  }

  function mergeBySite(rows) {
    var map = {};
    rows.forEach(function (r) {
      if (!map[r.siteId]) {
        map[r.siteId] = {
          siteId: r.siteId,
          siteName: r.siteName,
          lat: r.lat,
          lng: r.lng,
          observedAt: r.observedAt,
          provisional: r.provisional
        };
      }
      if (r.parameter === "00060") {
        map[r.siteId].dischargeCfs = r.value;
        map[r.siteId].dischargeUnit = r.unit;
      }
      if (r.parameter === "00065") {
        map[r.siteId].stageFt = r.value;
        map[r.siteId].stageUnit = r.unit;
      }
      if (r.observedAt && (!map[r.siteId].observedAt || r.observedAt > map[r.siteId].observedAt)) {
        map[r.siteId].observedAt = r.observedAt;
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function fetchNearestGauge(coords) {
    if (!coords || !isFinite(coords.lat) || !isFinite(coords.lng)) {
      return Promise.resolve(null);
    }
    var key = cacheKey(coords.lat, coords.lng);
    var hit = CACHE[key];
    if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.pkg);

    var url = "https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=" +
      encodeURIComponent(bbox(coords.lat, coords.lng)) +
      "&parameterCd=00060,00065&siteStatus=active";

    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("usgs " + res.status);
      return res.json();
    }).then(function (data) {
      var sites = mergeBySite(parseSeries(data));
      if (!sites.length) return null;
      sites.forEach(function (s) {
        if (s.lat != null && s.lng != null) {
          s.distanceKm = distanceKm(coords.lat, coords.lng, s.lat, s.lng);
        } else {
          s.distanceKm = 9999;
        }
      });
      sites.sort(function (a, b) { return a.distanceKm - b.distanceKm; });
      var nearest = sites[0];
      if (!nearest || nearest.distanceKm > MAX_GAUGE_DISTANCE_KM) {
        return {
          nearest: null,
          siteCount: sites.length,
          source: "USGS Water Services",
          provider: "usgs-iv",
          trust: "Unavailable",
          status: "no-nearby",
          fallbackReason: "no-gauge-within-" + MAX_GAUGE_DISTANCE_MILES + "-miles",
          disclaimer: "No monitored USGS gauge within " + MAX_GAUGE_DISTANCE_MILES + " miles",
          fetchedAt: new Date().toISOString(),
          requestLat: coords.lat,
          requestLng: coords.lng,
          sourceClassification: "user-oip"
        };
      }
      var pkg = {
        nearest: nearest,
        siteCount: sites.length,
        source: "USGS Water Services",
        provider: "usgs-iv",
        trust: "Live",
        status: "live",
        disclaimer: "Provisional USGS data — subject to revision",
        fetchedAt: new Date().toISOString(),
        requestLat: coords.lat,
        requestLng: coords.lng,
        dataLat: coords.lat,
        dataLng: coords.lng,
        sourceClassification: "user-oip",
        cacheSource: "live"
      };
      var LC = global.WDS && global.WDS.locationContext;
      if (LC && LC.attachModule) {
        LC.attachModule("usgsWater", pkg, LC.getActive && LC.getActive(), {
          requestLat: coords.lat,
          requestLng: coords.lng,
          moduleSource: "usgs-iv",
          sourceClassification: "user-oip",
          cacheSource: pkg.cacheSource
        });
      }
      CACHE[key] = { at: Date.now(), pkg: pkg };
      return pkg;
    }).catch(function () {
      return null;
    });
  }

  function formatGauge(g) {
    if (!g || !g.nearest) return null;
    var n = g.nearest;
    var parts = [];
    if (n.stageFt != null) parts.push(n.stageFt + " ft stage");
    if (n.dischargeCfs != null) parts.push(n.dischargeCfs + " cfs");
    return {
      headline: n.siteName,
      detail: parts.join(" · ") + (n.distanceKm != null ? " · " + n.distanceKm.toFixed(1) + " km away" : ""),
      siteId: n.siteId,
      observedAt: n.observedAt
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.usgsWater = {
    MAX_GAUGE_DISTANCE_MILES: MAX_GAUGE_DISTANCE_MILES,
    MAX_GAUGE_DISTANCE_KM: MAX_GAUGE_DISTANCE_KM,
    fetchNearestGauge: fetchNearestGauge,
    formatGauge: formatGauge,
    clearCache: clearCache
  };
})(window);
