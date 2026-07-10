/**
 * Kiosk — user location helpers and platform mapping (no refresh lifecycle).
 */
(function (global) {
  "use strict";

  var ENGINE_BASE = "design-system/content-engine/";
  var boot = null;

  function getBoot() {
    if (boot) return boot;
    if (!global.WDS || !global.WDS.appBoot || !global.WDS.appBoot.create) return null;
    boot = global.WDS.appBoot.create({ base: ENGINE_BASE, promptMount: null, skipPrompt: true });
    return boot;
  }

  function num(meas) {
    if (meas == null) return null;
    if (typeof meas === "number" && isFinite(meas)) return meas;
    if (typeof meas === "object" && meas.value != null) return Number(meas.value);
    return null;
  }

  function platformToKioskModules(platform) {
    if (!platform) return null;
    var pkg = platform.weatherRef || platform.weather;
    var cur = pkg && pkg.current;
    var daily = pkg && pkg.daily && pkg.daily[0];
    var hourly = pkg && pkg.hourly;
    var dl = platform.daylight;
    var photo = global.WDS && global.WDS.photographyConditions && global.WDS.photographyConditions.fromPlatform
      ? global.WDS.photographyConditions.fromPlatform(platform)
      : null;
    var hours = [];
    var hourlyArr = Array.isArray(hourly) ? hourly : (hourly && hourly.nextHours ? hourly.nextHours : []);
    if (hourlyArr.length) {
      for (var i = 0; i < Math.min(6, hourlyArr.length); i++) {
        var row = hourlyArr[i];
        hours.push({
          time: row.time,
          temperatureF: num(row.temperature),
          conditions: row.conditions && row.conditions.summary ? row.conditions.summary : null
        });
      }
    }
    var wx = pkg ? {
      timezone: (pkg.meta && pkg.meta.timezone) || platform.timezone || "America/New_York",
      current: {
        temperatureF: num(cur && cur.temperature),
        feelsLikeF: num(cur && cur.feelsLike),
        humidity: num(cur && cur.humidity),
        windMph: num(cur && cur.wind && cur.wind.speed),
        windGustMph: num(cur && cur.wind && cur.wind.gust),
        cloudCover: num(cur && cur.cloudCover),
        uvIndex: num(cur && cur.uvIndex),
        conditions: cur && cur.conditions ? cur.conditions.summary : null,
        observedAt: (pkg.meta && pkg.meta.fetchedAt) || new Date().toISOString()
      },
      forecast: {
        highF: daily ? num(daily.temperature && daily.temperature.max) : null,
        lowF: daily ? num(daily.temperature && daily.temperature.min) : null,
        precipProbability: daily && daily.precipitation ? num(daily.precipitation.probability) : null,
        summary: daily && daily.conditions ? daily.conditions.summary : null
      },
      hourly: { nextHours: hours, note: "Next hours at your location" },
      sun: dl ? {
        sunrise: dl.sunrise,
        sunset: dl.sunset,
        sunriseFormatted: dl.sunriseFormatted,
        sunsetFormatted: dl.sunsetFormatted
      } : null,
      moon: dl ? { phase: dl.moonPhase, illumination: dl.moonIllumination } : null,
      userLocation: true
    } : null;
    return {
      weather: wx,
      airQuality: platform.airQuality || null,
      alerts: platform.alerts || null,
      usgsWater: platform.usgsWater || null,
      photography: photo,
      daylight: dl || null
    };
  }

  function applyUserPackage(platform, loc) {
    var mods = platformToKioskModules(platform);
    global.__WAYPOINT_KIOSK_LOC__ = loc || global.__WAYPOINT_KIOSK_LOC__ || null;
    global.__WAYPOINT_KIOSK_PLATFORM__ = platform || null;
    global.__WAYPOINT_KIOSK_USER_MODULES__ = mods;
    global.__WAYPOINT_KIOSK_WEATHER__ = mods && mods.weather;
    return mods;
  }

  function mountRefreshDebug(diag) {
    var host = global.document.getElementById("swk");
    if (!host) return;
    var panel = global.document.getElementById("swk-refresh-debug");
    if (!panel) {
      panel = global.document.createElement("aside");
      panel.id = "swk-refresh-debug";
      panel.className = "swk-refresh-debug";
      panel.setAttribute("aria-label", "Kiosk refresh diagnostics");
      host.appendChild(panel);
    }
    var rows = [
      ["Build", diag.buildId || "—"],
      ["Coords", diag.coordinates ? diag.coordinates.lat + ", " + diag.coordinates.lng : "—"],
      ["Context ID", diag.locationContextId || "—"],
      ["Interval", diag.refreshIntervalMs + " ms"],
      ["Generation", String(diag.generation)],
      ["In flight", String(diag.inFlight)],
      ["Failures", String(diag.failureCount)],
      ["Last attempt", diag.lastAttemptAt || "—"],
      ["Last success", diag.lastSuccessAt || "—"],
      ["Next refresh", diag.nextRefreshAt || "—"],
      ["Conditions updated", diag.conditionsUpdatedAt || "—"],
      ["Engine published", diag.enginePublishedAt || "—"],
      ["Error", diag.latestError || "—"]
    ];
    var modRows = "";
    if (diag.moduleResults) {
      Object.keys(diag.moduleResults).forEach(function (name) {
        var mod = diag.moduleResults[name];
        modRows += "<tr><td>" + name + "</td><td>" + (mod.status || "—") + "</td><td>" + (mod.updatedAt || "—") + "</td></tr>";
      });
    }
    panel.innerHTML =
      "<h2>Kiosk refresh debug</h2>" +
      "<table><tbody>" +
      rows.map(function (row) {
        return "<tr><th>" + row[0] + "</th><td>" + row[1] + "</td></tr>";
      }).join("") +
      "</tbody></table>" +
      (modRows ? "<h3>Modules</h3><table><tbody>" + modRows + "</tbody></table>" : "");
  }

  global.KioskBoot = {
    ENGINE_BASE: ENGINE_BASE,
    getBoot: getBoot,
    platformToKioskModules: platformToKioskModules,
    applyUserPackage: applyUserPackage,
    mountRefreshDebug: mountRefreshDebug
  };
})(window);
