/**
 * Integration registry — production-ready slots for external data providers.
 * Honest status: live | partial | pending | educational
 */
(function (global) {
  "use strict";

  var INTEGRATIONS = {
    weather: { provider: "Open-Meteo", endpoint: "api.open-meteo.com/v1/forecast", status: "live", trust: "Live" },
    airQuality: { provider: "Open-Meteo Air Quality", endpoint: "air-quality-api.open-meteo.com", status: "live", trust: "Live" },
    nwsAlerts: { provider: "NWS", endpoint: "api.weather.gov/alerts/active", status: "live", trust: "Live" },
    elevation: { provider: "Open-Meteo DEM", endpoint: "api.open-meteo.com/v1/elevation", status: "live", trust: "Live" },
    geocode: { provider: "Nominatim", endpoint: "nominatim.openstreetmap.org/reverse", status: "live", trust: "Live" },
    usgsStreamflow: { provider: "USGS Water Services", endpoint: "waterservices.usgs.gov/nwis/iv", status: "live", trust: "Live", note: "Provisional IV data" },
    nearbyTrails: { provider: "OpenStreetMap Overpass", endpoint: "overpass-api.de/api/interpreter", status: "live", trust: "Live", note: "Named trails within ~20 mi; verify on the ground" },
    usgsLakes: { provider: "USGS Lake Levels", endpoint: "waterservices.usgs.gov", status: "pending", trust: "Not yet available" },
    recreationGov: { provider: "Recreation.gov", endpoint: "ridb.recreation.gov/api/v1", status: "pending", trust: "Not yet available" },
    npsAlerts: { provider: "NPS API", endpoint: "developer.nps.gov/api/v1", status: "pending", trust: "Not yet available", note: "API key required" },
    usfsTrails: { provider: "USFS / Forest Service", endpoint: "data.fs.usda.gov", status: "pending", trust: "Not yet available" },
    blmLands: { provider: "BLM", endpoint: "gis.blm.gov", status: "pending", trust: "Not yet available" },
    ebird: { provider: "eBird", endpoint: "api.ebird.org/v2", status: "pending", trust: "Not yet available", note: "API key required" },
    smoke: { provider: "AirNow Fire/Smoke", endpoint: "airnowapi.org", status: "pending", trust: "Not yet available", note: "Partial via AQI proxy" },
    tides: { provider: "NOAA CO-OPS", endpoint: "api.tidesandcurrents.noaa.gov", status: "pending", trust: "Not yet available" }
  };

  function get(id) {
    return INTEGRATIONS[id] || null;
  }

  function statusForCategory(category) {
    var map = {
      trails: ["nearbyTrails", "recreationGov", "npsAlerts", "usfsTrails"],
      water: ["usgsStreamflow", "usgsLakes", "tides"],
      wildlife: ["ebird"],
      safety: ["nwsAlerts", "airQuality", "smoke"]
    };
    var keys = map[category] || [];
    return keys.map(function (k) {
      var i = INTEGRATIONS[k];
      return i ? { id: k, provider: i.provider, status: i.status, trust: i.trust, note: i.note || "" } : null;
    }).filter(Boolean);
  }

  function widgetFooter(category) {
    var items = statusForCategory(category);
    if (!items.length) return "";
    var live = items.filter(function (i) { return i.status === "live"; });
    var pending = items.filter(function (i) { return i.status === "pending"; });
    if (live.length && !pending.length) return live.map(function (i) { return i.provider; }).join(" · ");
    if (pending.length) {
      return pending[0].provider + " · Not yet available";
    }
    return "";
  }

  global.WDS = global.WDS || {};
  global.WDS.integrations = {
    all: INTEGRATIONS,
    get: get,
    statusForCategory: statusForCategory,
    widgetFooter: widgetFooter
  };
})(window);
