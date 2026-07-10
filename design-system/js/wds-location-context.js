/**
 * Location context — session identity, module validation, and render guards.
 * Every location-sensitive package must match the active user context before render.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 3;
  var COORD_TOLERANCE = 0.05;
  var MAX_MODULE_AGE_MS = 6 * 60 * 60 * 1000;

  var activeContext = null;
  var sessionCounter = 0;

  function roundCoord(n) {
    return Math.round(Number(n) * 1000) / 1000;
  }

  function isFiniteCoord(n) {
    return isFinite(Number(n));
  }

  function coordsMatch(a, b, tolerance) {
    tolerance = tolerance != null ? tolerance : COORD_TOLERANCE;
    if (!a || !b) return false;
    if (!isFiniteCoord(a.lat) || !isFiniteCoord(a.lng)) return false;
    if (!isFiniteCoord(b.lat) || !isFiniteCoord(b.lng)) return false;
    return Math.abs(Number(a.lat) - Number(b.lat)) <= tolerance &&
      Math.abs(Number(a.lng) - Number(b.lng)) <= tolerance;
  }

  function localDateInZone(timeZone, date) {
    date = date || new Date();
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    } catch (e) {
      return null;
    }
  }

  function utcOffsetLabel(timeZone, date) {
    date = date || new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        timeZoneName: "shortOffset"
      }).formatToParts(date);
      var off = parts.find(function (p) { return p.type === "timeZoneName"; });
      return off ? off.value : null;
    } catch (e2) {
      return null;
    }
  }

  function fromLocation(loc) {
    loc = loc || {};
    if (!isFiniteCoord(loc.lat) || !isFiniteCoord(loc.lng)) return null;
    var tz = loc.timezone || loc.tz || null;
    var ctx = {
      schemaVersion: SCHEMA_VERSION,
      sessionId: ++sessionCounter,
      lat: roundCoord(loc.lat),
      lng: roundCoord(loc.lng),
      timezone: tz,
      localDate: tz ? localDateInZone(tz) : null,
      utcOffset: tz ? utcOffsetLabel(tz) : null,
      source: loc.source || "unknown",
      label: loc.displayTitle || loc.placeLabel || loc.name || null,
      createdAt: new Date().toISOString()
    };
    ctx.id = buildId(ctx);
    return ctx;
  }

  function buildId(ctx) {
    if (!ctx) return null;
    return [
      "v" + SCHEMA_VERSION,
      roundCoord(ctx.lat),
      roundCoord(ctx.lng),
      ctx.timezone || "unknown"
    ].join("|");
  }

  function setActive(loc, timezone) {
    var next = fromLocation(Object.assign({}, loc || {}, {
      timezone: timezone || (loc && loc.timezone) || null
    }));
    if (!next) return null;
    activeContext = next;
    return next;
  }

  function getActive() {
    return activeContext;
  }

  function attachModule(moduleName, data, ctx, meta) {
    if (!data || typeof data !== "object") return data;
    ctx = ctx || activeContext;
    meta = meta || {};
    data.locationContextId = ctx && ctx.id ? ctx.id : null;
    data.locationSessionId = ctx && ctx.sessionId != null ? ctx.sessionId : null;
    data.requestLat = meta.requestLat != null ? roundCoord(meta.requestLat) : (ctx ? ctx.lat : null);
    data.requestLng = meta.requestLng != null ? roundCoord(meta.requestLng) : (ctx ? ctx.lng : null);
    data.dataLat = meta.dataLat != null ? roundCoord(meta.dataLat) : data.requestLat;
    data.dataLng = meta.dataLng != null ? roundCoord(meta.dataLng) : data.requestLng;
    data.timezone = meta.timezone || (ctx && ctx.timezone) || data.timezone || null;
    data.localDate = meta.localDate || (ctx && ctx.localDate) || data.localDate || null;
    data.utcOffset = meta.utcOffset || (ctx && ctx.utcOffset) || data.utcOffset || null;
    data.moduleSource = meta.moduleSource || data.moduleSource || data.source || null;
    data.cacheSource = meta.cacheSource || data.cacheSource || "live";
    data.cachedAt = meta.cachedAt || data.cachedAt || new Date().toISOString();
    data.sourceClassification = meta.sourceClassification || "user-oip";
    return data;
  }

  function validateModule(moduleName, data, ctx) {
    ctx = ctx || activeContext;
    var result = {
      module: moduleName,
      eligible: false,
      reason: null,
      contextId: ctx && ctx.id ? ctx.id : null,
      moduleContextId: data && data.locationContextId ? data.locationContextId : null
    };
    if (!ctx) {
      result.reason = "no-active-location-context";
      return result;
    }
    if (!data) {
      result.reason = "module-data-missing";
      return result;
    }
    if (data.sourceClassification === "engine" || data.sourceClassification === "live-engine") {
      result.reason = "engine-data-not-user-facing";
      return result;
    }
    if (data.locationContextId && data.locationContextId !== ctx.id) {
      result.reason = "location-context-id-mismatch";
      return result;
    }
    if (data.locationSessionId != null && data.locationSessionId !== ctx.sessionId) {
      result.reason = "location-session-stale";
      return result;
    }
    var reqLat = data.requestLat != null ? data.requestLat : data.dataLat;
    var reqLng = data.requestLng != null ? data.requestLng : data.dataLng;
    if (!coordsMatch({ lat: reqLat, lng: reqLng }, ctx)) {
      result.reason = "request-coordinates-mismatch";
      return result;
    }
    if (data.timezone && ctx.timezone && data.timezone !== ctx.timezone) {
      result.reason = "timezone-mismatch";
      return result;
    }
    if (data.cachedAt) {
      var age = Date.now() - Date.parse(data.cachedAt);
      if (isFinite(age) && age > MAX_MODULE_AGE_MS) {
        result.reason = "module-cache-expired";
        return result;
      }
    }
    result.eligible = true;
    result.reason = null;
    return result;
  }

  function validateDaylight(daylight, ctx) {
    var base = validateModule("daylight", daylight, ctx);
    if (!base.eligible) return base;
    if (!daylight.sunriseFormatted && !daylight.sunrise) {
      base.eligible = false;
      base.reason = "daylight-missing-sunrise";
      return base;
    }
    if (daylight.localDate && ctx && ctx.localDate && daylight.localDate !== ctx.localDate) {
      base.eligible = false;
      base.reason = "daylight-local-date-mismatch";
      return base;
    }
    return base;
  }

  function validateUsgsWater(usgs, ctx) {
    var base = validateModule("usgsWater", usgs, ctx);
    if (!base.eligible) return base;
    if (!usgs.nearest) {
      base.eligible = true;
      base.reason = usgs.status === "no-nearby" ? null : "no-nearest-gauge";
      return base;
    }
    var n = usgs.nearest;
    if (n.lat != null && n.lng != null && ctx) {
      var distKm = haversineKm(ctx.lat, ctx.lng, n.lat, n.lng);
      if (distKm > 80.5) {
        base.eligible = false;
        base.reason = "gauge-outside-50-miles";
        return base;
      }
      if (/,\s*KS\b/i.test(n.siteName || "") && ctx.lat > 37 && ctx.lng > -85) {
        base.eligible = false;
        base.reason = "kansas-gauge-for-eastern-user";
        return base;
      }
    }
    return base;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
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

  function invalidateCaches() {
    var US = global.WDS && global.WDS.usgsWater;
    if (US && US.clearCache) US.clearCache();
    var RI = global.WDS && global.WDS.regionalIntelligence;
    if (RI && RI.engine && RI.engine.clearCache) RI.engine.clearCache();
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.resetLastPackage) {
      OIP.resetLastPackage();
    } else if (OIP) {
      OIP.lastPackageReset = true;
    }
  }

  function auditRows(platform, ctx) {
    ctx = ctx || activeContext;
    if (!platform || !ctx) return [];
    var rows = [];
    function push(name, data, validator) {
      var v = validator ? validator(data, ctx) : validateModule(name, data, ctx);
      rows.push({
        module: name,
        userLat: ctx.lat,
        userLng: ctx.lng,
        requestLat: data && data.requestLat != null ? data.requestLat : "—",
        requestLng: data && data.requestLng != null ? data.requestLng : "—",
        dataLat: data && data.dataLat != null ? data.dataLat : "—",
        dataLng: data && data.dataLng != null ? data.dataLng : "—",
        contextId: ctx.id,
        moduleContextId: data && data.locationContextId ? data.locationContextId : "—",
        timezone: data && data.timezone ? data.timezone : (ctx.timezone || "—"),
        utcOffset: data && data.utcOffset ? data.utcOffset : (ctx.utcOffset || "—"),
        source: data && data.moduleSource ? data.moduleSource : "—",
        cacheSource: data && data.cacheSource ? data.cacheSource : "—",
        cacheAge: data && data.cachedAt ? data.cachedAt : "—",
        eligible: v.eligible,
        rejectionReason: v.reason || "—"
      });
    }
    var wx = platform.weatherRef;
    if (wx && wx.meta) {
      push("weather", attachModule("weather", {}, ctx, {
        requestLat: ctx.lat,
        requestLng: ctx.lng,
        dataLat: wx.meta.lat,
        dataLng: wx.meta.lng,
        timezone: wx.meta.timezone,
        moduleSource: wx.meta.provider,
        sourceClassification: "user-oip"
      }));
    }
    if (platform.daylight) push("daylight", platform.daylight, validateDaylight);
    if (platform.usgsWater) push("usgsWater", platform.usgsWater, validateUsgsWater);
    if (platform.airQuality) push("airQuality", platform.airQuality);
    return rows;
  }

  global.WDS = global.WDS || {};
  global.WDS.locationContext = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    COORD_TOLERANCE: COORD_TOLERANCE,
    fromLocation: fromLocation,
    buildId: buildId,
    setActive: setActive,
    getActive: getActive,
    attachModule: attachModule,
    validateModule: validateModule,
    validateDaylight: validateDaylight,
    validateUsgsWater: validateUsgsWater,
    coordsMatch: coordsMatch,
    localDateInZone: localDateInZone,
    utcOffsetLabel: utcOffsetLabel,
    invalidateCaches: invalidateCaches,
    auditRows: auditRows
  };
})(window);
