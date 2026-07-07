/**
 * Waypoint ecosystem bridge — shares outdoor context between Dashboard and Scenes.
 * Lightweight sessionStorage snapshot; no PII beyond coordinates user already chose.
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

  function snapshotFromPackage(pkg, loc) {
    if (!pkg) return null;
    var wx = pkg.weatherRef;
    var cur = wx && wx.current;
    var dl = pkg.daylight;
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = wx && OW && OW.analyze ? OW.analyze(wx, pkg) : null;
    var BP = global.WDS && global.WDS.briefingPackage;
    var doc = BP && BP.compose ? BP.compose({ platform: pkg, location: loc }) : null;

    return {
      version: 1,
      savedAt: new Date().toISOString(),
      location: {
        city: loc && loc.city,
        county: loc && (loc.county || loc.name),
        state: loc && (loc.state || loc.stateCode),
        lat: loc && loc.lat,
        lng: loc && loc.lng,
        elevationMeters: (pkg.location && pkg.location.elevationMeters) ||
          (loc && loc.elevationMeters)
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
        moonIllumination: dl.moonIllumination,
        trust: "Live",
        source: "Open-Meteo"
      } : null,
      airQuality: pkg.airQuality && pkg.airQuality.usAqi != null ? {
        usAqi: pkg.airQuality.usAqi,
        category: pkg.airQuality.category,
        trust: "Live",
        source: "Open-Meteo Air Quality"
      } : null,
      photography: intel && intel.photography ? {
        summary: intel.photography.summary,
        detail: intel.photography.detail,
        level: intel.photography.level,
        trust: "Estimated"
      } : null,
      hiking: intel && intel.hiking ? {
        summary: intel.hiking.summary,
        detail: intel.hiking.detail,
        level: intel.hiking.level,
        trust: "Estimated"
      } : null,
      water: pkg.usgsWater && pkg.usgsWater.nearest ? {
        siteName: pkg.usgsWater.nearest.siteName,
        stageFt: pkg.usgsWater.nearest.stageFt,
        dischargeCfs: pkg.usgsWater.nearest.dischargeCfs,
        trust: "Live",
        source: "USGS IV (provisional)"
      } : null,
      alerts: pkg.alerts && pkg.alerts.items && pkg.alerts.items.length ? {
        count: pkg.alerts.items.length,
        headline: pkg.alerts.items[0].event || pkg.alerts.items[0].headline,
        trust: "Live",
        source: "NWS"
      } : null,
      outdoorScore: intel && intel.scores && intel.scores.outdoor
        ? intel.scores.outdoor.value
        : null,
      briefingHeadline: doc ? doc.headline : null,
      challenge: doc && doc.challenge ? doc.challenge.summary : null
    };
  }

  function save(pkg, loc) {
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
    save: save,
    load: load,
    bindOip: bindOip
  };
})(window);
