/**
 * ForageCast — location helpers (delegates to WDS.location + OIP)
 */
(function (global) {
  "use strict";

  function read() {
    if (!global.WDS || !global.WDS.location) return null;
    return global.WDS.location.getState() || global.WDS.location.readStored();
  }

  function formatCoords(lat, lng) {
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.formatCoords(lat, lng);
    }
    return "";
  }

  function locationNote(loc) {
    loc = loc || read();
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.formatStatusLine(loc);
    }
    if (!loc) return "Regional location unavailable";
    return loc.name + ", " + (loc.stateCode || loc.state);
  }

  function applyToHomeData(data, loc, platform) {
    loc = loc || read();
    if (!data || !loc) return data;
    if (global.WDS && global.WDS.location) {
      data = global.WDS.location.applyToBundle(data, loc);
    }
    data._location = loc;
    if (platform) {
      data._platform = platform;
      data.season = platform.calendar && platform.calendar.season;
      data.weekOf = platform.calendar && platform.calendar.weekOf;
      var OIP = global.WDS && global.WDS.outdoorIntelligence;
      if (OIP && OIP.adapters && OIP.adapters.hydrateRegionalStatus) {
        data.regionalStatus = OIP.adapters.hydrateRegionalStatus(data.regionalStatus, platform);
      }
    }
    return data;
  }

  function applyToConditions(conditions, loc, platform) {
    loc = loc || read();
    if (!conditions) return conditions;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.adapters && OIP.adapters.hydrateConditions) {
      return OIP.adapters.hydrateConditions(conditions, platform, loc);
    }
    conditions._location = loc;
    return conditions;
  }

  function mapLabel(loc) {
    loc = loc || read();
    if (!loc) return "Regional map";
    if (loc.source === "geo" && global.WDS && global.WDS.location) {
      return global.WDS.location.formatCoords(loc.lat, loc.lng) + " · schematic zones";
    }
    return loc.name + ", " + loc.stateCode + " · schematic zones";
  }

  global.ForageCastLocation = {
    read: read,
    formatCoords: formatCoords,
    locationNote: locationNote,
    applyToHomeData: applyToHomeData,
    applyToConditions: applyToConditions,
    mapLabel: mapLabel
  };
})(window);
