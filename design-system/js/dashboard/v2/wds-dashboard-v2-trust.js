/**
 * Dashboard V2 — provider trust center + cache.
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "waypoint-dashboard-v2-cache-v1";
  var CACHE_SCHEMA = 1;
  var FRESH_MS = 5 * 60 * 1000;
  var STALE_MS = 60 * 60 * 1000;

  function cacheKey(model) {
    var loc = model && model.location;
    if (!loc || !loc.coordsOk) return "national";
    return [loc.lat.toFixed(2), loc.lng.toFixed(2)].join(",");
  }

  function readCache(model) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== CACHE_SCHEMA) return null;
      if (parsed.key !== cacheKey(model)) return null;
      var age = Date.now() - new Date(parsed.storedAt).getTime();
      if (age > STALE_MS) return null;
      parsed.ageMs = age;
      parsed.stale = age > FRESH_MS;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeCache(model, payload) {
    try {
      if (!global.localStorage || !model) return;
      global.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          schema: CACHE_SCHEMA,
          key: cacheKey(model),
          storedAt: new Date().toISOString(),
          briefing: payload.briefing || null,
          modelMeta: {
            locationLabel: model.location.label,
            trust: model.provider.trust
          }
        })
      );
    } catch (e2) { /* noop */ }
  }

  function providerRows(model) {
    var meta = model.provider || {};
    var blocks = meta.blockStatus || {};
    var Reg = global.WDS && global.WDS.integrations;
    var rows = [];

    function row(id, label, blockKey) {
      var st = blocks[blockKey || id] || "unknown";
      var reg = Reg && Reg.get ? Reg.get(id) : null;
      var state = "unavailable";
      if (st === "live") state = meta.fromCache ? "cached" : "live";
      else if (st === "loading") state = "delayed";
      else if (st === "unavailable") state = "unavailable";
      else if (st === "error") state = "error";
      else if (st === "partial") state = "partial";
      rows.push({
        id: id,
        provider: reg ? reg.provider : label,
        status: state,
        lastOk: meta.hydratedAt || null,
        age: meta.hydratedAt ? formatAge(meta.hydratedAt) : "—",
        note: reg && reg.note ? reg.note : ""
      });
    }

    row("weather", "Weather", "weather");
    row("airQuality", "Air quality", "airQuality");
    row("nwsAlerts", "Alerts", "alerts");
    row("usgsStreamflow", "Rivers", "usgsWater");
    row("elevation", "Elevation", "elevation");
    row("nearbyTrails", "Trails", "trailConditions");
    row("geocode", "Place names", "geocode");

    if (meta.connectivity === "offline") {
      rows.forEach(function (r) {
        if (r.status === "live") r.status = "cached";
      });
    }

    return rows;
  }

  function formatAge(iso) {
    try {
      var ms = Date.now() - new Date(iso).getTime();
      if (ms < 60000) return "just now";
      if (ms < 3600000) return Math.round(ms / 60000) + " min ago";
      return Math.round(ms / 3600000) + " hr ago";
    } catch (e) {
      return "—";
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Trust = {
    CACHE_KEY: CACHE_KEY,
    readCache: readCache,
    writeCache: writeCache,
    providerRows: providerRows,
    FRESH_MS: FRESH_MS,
    STALE_MS: STALE_MS
  };
})(window);
