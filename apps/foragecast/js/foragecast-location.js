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

  function formatRegionLabel(loc) {
    if (!loc) return "Regional location unavailable";
    var name = loc.displayTitle || loc.placeLabel || loc.city || loc.name;
    if (name != null) name = String(name).trim();
    if (!name || /^null$/i.test(name) || /^undefined$/i.test(name)) {
      if (loc.stateCode || loc.state) return "Location in " + (loc.stateCode || loc.state);
      return "Regional location unavailable";
    }
    var region = loc.stateCode || loc.state;
    if (region && name.indexOf(String(region)) === -1) return name + ", " + region;
    return name;
  }

  function locationNote(loc) {
    loc = loc || read();
    if (global.WDS && global.WDS.location) {
      return global.WDS.location.formatStatusLine(loc);
    }
    if (!loc) return "Regional location unavailable";
    return formatRegionLabel(loc);
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
    return formatRegionLabel(loc) + " · schematic zones";
  }

  global.ForageCastLocation = {
    read: read,
    formatCoords: formatCoords,
    formatRegionLabel: formatRegionLabel,
    locationNote: locationNote,
    applyToHomeData: applyToHomeData,
    applyToConditions: applyToConditions,
    mapLabel: mapLabel
  };
})(window);
