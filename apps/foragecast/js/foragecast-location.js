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

  function isUsablePlacePart(value) {
    if (global.WDS && global.WDS.location && global.WDS.location.isUsablePlacePart) {
      return global.WDS.location.isUsablePlacePart(value);
    }
    if (value == null) return false;
    var s = String(value).trim();
    if (!s) return false;
    if (/^(null|undefined|n\/?a|unknown|none)$/i.test(s)) return false;
    if (/^null\s*,/i.test(s) || /^undefined\s*,/i.test(s)) return false;
    return true;
  }

  function formatRegionLabel(loc) {
    if (!loc) return "Set a place to personalize";
    if (global.WDS && global.WDS.location && global.WDS.location.formatRegionLabel) {
      var platformLabel = global.WDS.location.formatRegionLabel(loc);
      if (isUsablePlacePart(platformLabel) && !/^default region$/i.test(platformLabel)) {
        return platformLabel;
      }
    }
    var name = loc.displayTitle || loc.placeLabel || loc.city || loc.county || loc.name;
    if (name != null) name = String(name).trim();
    if (!isUsablePlacePart(name)) {
      if (isUsablePlacePart(loc.stateCode) || isUsablePlacePart(loc.state)) {
        return "Location in " + (loc.stateCode || loc.state);
      }
      if (loc.lat != null && loc.lng != null && formatCoords(loc.lat, loc.lng)) {
        return formatCoords(loc.lat, loc.lng);
      }
      return "Set a place to personalize";
    }
    var region = loc.stateCode || loc.state;
    if (region && name.indexOf(String(region)) === -1) return name + ", " + region;
    return name;
  }

  function locationNote(loc) {
    loc = loc || read();
    if (global.WDS && global.WDS.location && global.WDS.location.formatStatusLine) {
      var line = global.WDS.location.formatStatusLine(loc);
      if (isUsablePlacePart(line) && !/^null/i.test(line)) return line;
    }
    if (!loc) return "Location unavailable — set a place in Settings or allow location.";
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

  function reliabilityState(platform, loc) {
    loc = loc || read();
    var weather = platform && platform.modules && platform.modules.weather;
    var offline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offline) return { id: "offline", label: "Offline", detail: "Showing last known educational model when available." };
    if (!loc || loc.unavailable || loc.source === "unavailable") {
      return { id: "location-unavailable", label: "Location unavailable", detail: "Set a place to personalize weather and season signals." };
    }
    if (weather && (weather.status === "live" || weather.isLive || weather.current)) {
      return { id: "ready", label: "Ready", detail: "Live weather linked for this place." };
    }
    if (weather && (weather.status === "cached" || weather.fromCache)) {
      return { id: "cached", label: "Cached", detail: "Using a recent weather package — freshness may lag." };
    }
    if (platform && platform._error) {
      return { id: "provider-unavailable", label: "Provider unavailable", detail: String(platform._error) };
    }
    if (!weather) {
      return { id: "provider-unavailable", label: "Weather unavailable", detail: "Species outlook uses season models only until weather responds." };
    }
    return { id: "ready", label: "Ready", detail: "Educational outlook ready for this place." };
  }

  global.ForageCastLocation = {
    read: read,
    formatCoords: formatCoords,
    formatRegionLabel: formatRegionLabel,
    locationNote: locationNote,
    applyToHomeData: applyToHomeData,
    applyToConditions: applyToConditions,
    mapLabel: mapLabel,
    reliabilityState: reliabilityState,
    isUsablePlacePart: isUsablePlacePart
  };
})(window);
