/**
 * ForageCast — location helpers (delegates to WDS.location)
 */
(function (global) {
  "use strict";

  var FALLBACK = {
    source: "default",
    regionId: "pike-county-pa",
    name: "Pike County",
    state: "Pennsylvania",
    stateCode: "PA",
    bioregion: "Northeastern Pennsylvania · Pocono Plateau · Delaware River Highlands",
    lat: 41.3312,
    lng: -75.038,
    isDefault: true
  };

  function read() {
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.getState() || global.WDS.location.readStored();
    }
    try {
      var raw = localStorage.getItem("wds-location-v1");
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }

  function formatCoords(lat, lng) {
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.formatCoords(lat, lng);
    }
    return "";
  }

  function locationNote(loc) {
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.formatStatusLine(loc || read() || FALLBACK);
    }
    loc = loc || read() || FALLBACK;
    if (loc.isDefault) return "Using default region: Pike County, PA";
    return loc.name + ", " + (loc.stateCode || loc.state);
  }

  function applyToHomeData(data, loc) {
    loc = loc || read() || FALLBACK;
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.applyToBundle(data, loc);
    }
    if (data.region) {
      data.region.county = loc.name;
      data.region.state = loc.state;
      if (loc.bioregion) data.region.bioregion = loc.bioregion;
    }
    if (loc.weather && data.regionalStatus && data.regionalStatus.weather) {
      data.regionalStatus.weather.high = loc.weather.high;
      data.regionalStatus.weather.low = loc.weather.low;
      data.regionalStatus.weather.conditions = loc.weather.conditions;
    }
    if (loc.seasonNote) data.season = loc.seasonNote;
    data._location = loc;
    return data;
  }

  function applyToConditions(conditions, loc) {
    loc = loc || read() || FALLBACK;
    conditions.region = {
      county: loc.name,
      state: loc.state,
      bioregion: loc.bioregion || (conditions.region && conditions.region.bioregion)
    };
    if (loc.weather) {
      conditions.labels = conditions.labels || {};
      conditions.labels.temperature = "Avg from regional snapshot · " + loc.name;
      if (loc.weather.conditions) {
        conditions.labels.soilMoisture = loc.weather.conditions;
      }
      if (loc.weather.high && loc.weather.low) {
        conditions.labels.recentRainfall = loc.weather.high + " / " + loc.weather.low + " · regional snapshot";
      }
    }
    if (loc.elevationFt && conditions.inputs) {
      var delta = (loc.elevationFt - 1200) / 800;
      conditions.inputs.temperature = Math.max(0.2, Math.min(0.95, conditions.inputs.temperature - delta * 0.08));
      conditions.inputs.soilMoisture = Math.max(0.2, Math.min(0.95, conditions.inputs.soilMoisture + delta * 0.05));
    }
    if (loc.seasonNote) conditions.seasonNote = loc.seasonNote;
    conditions._location = loc;
    return conditions;
  }

  function mapLabel(loc) {
    loc = loc || read() || FALLBACK;
    if (loc.source === "geo" && global.WDS && global.WDS.location) {
      return global.WDS.location.formatCoords(loc.lat, loc.lng) + " · schematic zones";
    }
    return loc.name + ", " + loc.stateCode + " · schematic zones";
  }

  global.ForageCastLocation = {
    read: read,
    DEFAULT: FALLBACK,
    formatCoords: formatCoords,
    locationNote: locationNote,
    applyToHomeData: applyToHomeData,
    applyToConditions: applyToConditions,
    mapLabel: mapLabel
  };
})(window);
