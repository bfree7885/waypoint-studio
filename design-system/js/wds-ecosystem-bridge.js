/**
 * Waypoint ecosystem bridge — shares Outdoor Intelligence Engine briefing with Scenes.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "waypoint-outdoor-context-v1";

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function snapshotFromBriefing(briefing, loc) {
    var OIE = global.WDS && global.WDS.outdoorIntelligenceEngine;
    if (OIE && OIE.toPhotoCoachSnapshot) {
      return OIE.toPhotoCoachSnapshot(briefing);
    }
    return snapshotFromPackage(briefing && briefing.platform, loc);
  }

  function snapshotFromPackage(pkg, loc) {
    if (!pkg) return null;
    var OIE = global.WDS && global.WDS.outdoorIntelligenceEngine;
    if (OIE && OIE.build && OIE.toPhotoCoachSnapshot) {
      return OIE.toPhotoCoachSnapshot(OIE.build({ platform: pkg, location: loc }));
    }
    var wx = pkg.weatherRef;
    var cur = wx && wx.current;
    var dl = pkg.daylight;
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      location: {
        city: loc && loc.city,
        county: loc && (loc.county || loc.name),
        state: loc && (loc.state || loc.stateCode),
        lat: loc && loc.lat,
        lng: loc && loc.lng
      },
      weather: cur ? {
        temp: num(cur.temperature),
        feels: num(cur.feelsLike),
        conditions: cur.conditions && cur.conditions.summary,
        humidity: num(cur.humidity),
        windMph: cur.wind && num(cur.wind.speed),
        trust: "Live",
        source: "Open-Meteo"
      } : null,
      daylight: dl ? {
        sunrise: dl.sunriseFormatted,
        sunset: dl.sunsetFormatted,
        goldenHour: dl.goldenHour,
        blueHour: dl.blueHour,
        moonPhase: dl.moonPhase,
        trust: "Live"
      } : null
    };
  }

  function saveFromBriefing(briefing, loc) {
    var snap = snapshotFromBriefing(briefing, loc);
    if (!snap) return null;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) { /* quota */ }
    return snap;
  }

  function save(pkg, loc) {
    var OIE = global.WDS && global.WDS.outdoorIntelligenceEngine;
    if (OIE && OIE.build && OIE.toPhotoCoachSnapshot) {
      return saveFromBriefing(OIE.build({ platform: pkg, location: loc }), loc);
    }
    var snap = snapshotFromPackage(pkg, loc);
    if (!snap) return null;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) { /* quota */ }
    return snap;
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function bindOip() {
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (!OIP || !OIP.onChange) return;
    OIP.onChange(function (pkg) {
      var loc = global.WDS && global.WDS.location && global.WDS.location.getState
        ? global.WDS.location.getState()
        : null;
      save(pkg, loc);
    });
  }

  if (global.document) {
    global.document.addEventListener("wds:outdoor-intelligence-change", function (e) {
      var loc = global.WDS && global.WDS.location && global.WDS.location.getState
        ? global.WDS.location.getState()
        : null;
      save(e.detail, loc);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.ecosystemBridge = {
    STORAGE_KEY: STORAGE_KEY,
    snapshotFromPackage: snapshotFromPackage,
    snapshotFromBriefing: snapshotFromBriefing,
    saveFromBriefing: saveFromBriefing,
    save: save,
    load: load,
    bindOip: bindOip
  };
})(window);
