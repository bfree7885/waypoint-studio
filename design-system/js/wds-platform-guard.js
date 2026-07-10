/**
 * Final rendering boundary — reject engine/stale/mismatched location-sensitive packages.
 */
(function (global) {
  "use strict";

  var ENGINE_PUBLISH = { lat: 39.8283, lng: -98.5795 };
  var ENGINE_TOLERANCE = 0.2;
  var REFRESHING_MSG = "Refreshing local conditions…";

  function LC() {
    return global.WDS && global.WDS.locationContext;
  }

  function isEnginePublishPoint(lat, lng) {
    if (!isFinite(Number(lat)) || !isFinite(Number(lng))) return false;
    return Math.abs(Number(lat) - ENGINE_PUBLISH.lat) <= ENGINE_TOLERANCE &&
      Math.abs(Number(lng) - ENGINE_PUBLISH.lng) <= ENGINE_TOLERANCE;
  }

  function userCoords(loc) {
    if (!loc) return null;
    if (isFinite(Number(loc.lat)) && isFinite(Number(loc.lng))) {
      return { lat: Number(loc.lat), lng: Number(loc.lng) };
    }
    return null;
  }

  function moduleCoords(data) {
    if (!data) return null;
    var lat = data.requestLat != null ? data.requestLat : data.dataLat;
    var lng = data.requestLng != null ? data.requestLng : data.dataLng;
    if (!isFinite(Number(lat)) || !isFinite(Number(lng))) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }

  function isEngineClassified(data, platform) {
    if (!data && !platform) return false;
    if (data && (data.sourceClassification === "engine" ||
      data.sourceClassification === "live-engine" ||
      data.sourceClassification === "engine-context")) return true;
    if (data && data.moduleSource && /live-engine|engine-publish/i.test(String(data.moduleSource))) return true;
    if (platform && platform.meta && platform.meta.liveFeed === true) return true;
    if (platform && platform.meta && platform.meta.contentMode === "live-engine") return true;
    if (platform && platform.meta && platform.meta.contentSource === "live-engine") return true;
    return false;
  }

  function rejectReason(moduleName, data, platform, userLoc) {
    var ctxApi = LC();
    var ctx = ctxApi && ctxApi.getActive ? ctxApi.getActive() : null;
    var user = userCoords(userLoc) || (ctx ? { lat: ctx.lat, lng: ctx.lng } : null);

    if (isEngineClassified(data, platform)) {
      return "engine-data-not-user-facing";
    }
    if (user && moduleCoords(data) && isEnginePublishPoint(moduleCoords(data).lat, moduleCoords(data).lng) &&
        !isEnginePublishPoint(user.lat, user.lng)) {
      return "engine-publish-coordinates";
    }
    if (ctxApi) {
      var validator = moduleName === "daylight" ? ctxApi.validateDaylight :
        moduleName === "usgsWater" ? ctxApi.validateUsgsWater :
          ctxApi.validateModule;
      if (validator) {
        var verdict = validator(moduleName, data, ctx);
        if (verdict && !verdict.eligible) return verdict.reason || "module-rejected";
      }
    }
    return null;
  }

  function stripModule(platform, key, reason, audit) {
    if (!platform || !platform[key]) return;
    audit.push({ module: key, action: "stripped", reason: reason });
    platform[key] = key === "usgsWater"
      ? { status: "refreshing", nearest: null, message: REFRESHING_MSG, rejectionReason: reason }
      : null;
    platform._locationGuardRejected = platform._locationGuardRejected || [];
    platform._locationGuardRejected.push({ module: key, reason: reason });
  }

  function sanitizeUserPlatform(platform, userLoc) {
    if (!platform) return platform;
    var audit = [];
    var loc = userLoc || null;

    if (platform.meta && (platform.meta.liveFeed === true || platform.meta.contentMode === "live-engine")) {
      ["daylight", "usgsWater", "weatherRef", "airQuality", "alerts"].forEach(function (key) {
        stripModule(platform, key, "platform-marked-live-engine", audit);
      });
      if (platform.weather) platform.weather = { status: "refreshing", summary: REFRESHING_MSG };
      platform.meta.liveFeed = false;
      platform.meta.contentSource = "user-oip";
    }

    if (platform.liveFeed) {
      delete platform.liveFeed;
    }

    var modules = [
      { key: "daylight", name: "daylight" },
      { key: "usgsWater", name: "usgsWater" },
      { key: "airQuality", name: "airQuality" },
      { key: "alerts", name: "alerts" }
    ];
    modules.forEach(function (mod) {
      var data = platform[mod.key];
      if (!data) return;
      var reason = rejectReason(mod.name, data, platform, loc);
      if (reason) stripModule(platform, mod.key, reason, audit);
    });

    var wx = platform.weatherRef;
    if (wx && wx.meta) {
      var wxReason = null;
      if (wx.meta.liveFeed === true || wx.meta.provider === "waypoint-live-engine") {
        wxReason = "engine-weather-package";
      } else if (loc && isFinite(Number(wx.meta.lat)) && isEnginePublishPoint(wx.meta.lat, wx.meta.lng) &&
          !isEnginePublishPoint(loc.lat, loc.lng)) {
        wxReason = "engine-publish-coordinates";
      }
      if (wxReason) {
        stripModule(platform, "weatherRef", wxReason, audit);
        if (platform.weather) platform.weather = { status: "refreshing", summary: REFRESHING_MSG };
      }
    }

    if (audit.length) {
      platform._locationGuardAudit = audit;
      platform._refreshingLocalConditions = true;
    }
    return platform;
  }

  function getValidatedDaylight(platform, userLoc) {
    if (!platform || !platform.daylight) return null;
    var reason = rejectReason("daylight", platform.daylight, platform, userLoc);
    return reason ? null : platform.daylight;
  }

  function getValidatedUsgs(platform, userLoc) {
    if (!platform || !platform.usgsWater) return null;
    var reason = rejectReason("usgsWater", platform.usgsWater, platform, userLoc);
    return reason ? null : platform.usgsWater;
  }

  function refreshingHtml(label) {
    return (
      '<p class="wdb-location-guard" role="status" data-location-guard="refreshing">' +
        escapeHtml(label || REFRESHING_MSG) +
      "</p>"
    );
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  global.WDS = global.WDS || {};
  global.WDS.platformGuard = {
    ENGINE_PUBLISH: ENGINE_PUBLISH,
    REFRESHING_MSG: REFRESHING_MSG,
    isEnginePublishPoint: isEnginePublishPoint,
    sanitizeUserPlatform: sanitizeUserPlatform,
    getValidatedDaylight: getValidatedDaylight,
    getValidatedUsgs: getValidatedUsgs,
    rejectReason: rejectReason,
    refreshingHtml: refreshingHtml
  };
})(window);
