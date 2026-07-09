/**
 * U.S. national dashboard context — coordinate-primary, no false locality.
 * Used when the user is outside the Pike County local bundle footprint.
 */
(function (global) {
  "use strict";

  var LOCAL_BUNDLE_ID = "pike-county-pa";
  var BUNDLE_MATCH_KM = 50;
  var CONTENT_MODE_LOCAL = "local-bundle";
  var CONTENT_MODE_NATIONAL = "national-educational";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCoords(lat, lng) {
    if (lat == null || lng == null) return "";
    var latStr = (lat >= 0 ? lat.toFixed(2) + "°N" : Math.abs(lat).toFixed(2) + "°S");
    var lngStr = (lng >= 0 ? lng.toFixed(2) + "°E" : Math.abs(lng).toFixed(2) + "°W");
    return latStr + ", " + lngStr;
  }

  function climateZone(lat) {
    if (!isFinite(lat)) return "temperate";
    if (lat >= 50) return "subarctic";
    if (lat <= 23.5) return "tropical";
    if (lat <= 30) return "subtropical";
    if (lat >= 42) return "cool-temperate";
    return "temperate";
  }

  function seasonLabel(lat, month) {
    month = month || (new Date().getMonth() + 1);
    var zone = climateZone(lat);
    if (zone === "tropical") {
      if (month >= 6 && month <= 10) return "wet / warm season";
      return "dry / cooler season";
    }
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
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

  function pikeRegion(index) {
    if (!index || !index.regions) return null;
    for (var i = 0; i < index.regions.length; i += 1) {
      if (index.regions[i].id === LOCAL_BUNDLE_ID) return index.regions[i];
    }
    return null;
  }

  function isLocalBundleEligible(loc, index) {
    if (!loc || !isFinite(Number(loc.lat)) || !isFinite(Number(loc.lng))) return false;
    if (loc.source === "manual") {
      return loc.regionId === LOCAL_BUNDLE_ID;
    }
    if (loc.source === "default" && loc.regionId === LOCAL_BUNDLE_ID) {
      return true;
    }
    if (loc.source === "geo") {
      var pike = pikeRegion(index);
      if (!pike) return false;
      return distanceKm(Number(loc.lat), Number(loc.lng), pike.lat, pike.lng) <= BUNDLE_MATCH_KM;
    }
    return false;
  }

  function isNationalMode(locOrPlatform) {
    if (!locOrPlatform) return true;
    if (locOrPlatform.useNationalFallback === true) return true;
    if (locOrPlatform.contentMode === CONTENT_MODE_NATIONAL) return true;
    if (locOrPlatform.meta && locOrPlatform.meta.contentMode === CONTENT_MODE_NATIONAL) return true;
    return false;
  }

  function inferStateForLoc(loc) {
    var US = global.WDS && global.WDS.usStates;
    if (!US || !US.inferState) return null;
    return US.inferState(Number(loc.lat), Number(loc.lng));
  }

  function displayTitle(loc) {
    if (!loc) return "United States";
    if (loc.displayTitle) return loc.displayTitle;
    if (loc.placeLabel) return loc.placeLabel;
    if (loc.city && (loc.stateCode || loc.state)) {
      return loc.city + ", " + (loc.stateCode || loc.state);
    }
    if (loc.county && (loc.stateCode || loc.state) && !loc.useNationalFallback) {
      return loc.county + ", " + (loc.stateCode || loc.state);
    }
    if (isLocalBundleEligible(loc) || loc.contentMode === CONTENT_MODE_LOCAL) {
      return loc.name + (loc.stateCode ? ", " + loc.stateCode : loc.state ? ", " + loc.state : "");
    }
    if (loc.source === "manual" && loc.name && loc.stateCode) {
      return loc.name + ", " + loc.stateCode;
    }
    if (loc.source === "manual" && loc.state && !loc.name) {
      return loc.state;
    }
    var st = loc.inferredState || inferStateForLoc(loc);
    if (st && loc.lat != null && loc.lng != null) {
      return formatCoords(loc.lat, loc.lng) + " · " + st.name;
    }
    if (loc.lat != null && loc.lng != null) {
      return formatCoords(loc.lat, loc.lng);
    }
    return loc.state || "United States";
  }

  function displaySubtitle(loc) {
    if (!loc) return "U.S. regional overview";
    if (loc.contentMode === CONTENT_MODE_LOCAL || isLocalBundleEligible(loc)) {
      return "Local editorial bundle available";
    }
    if (loc.source === "geo") return "Live data for your coordinates · regional nature guidance";
    if (loc.source === "manual" && loc.regionId && loc.regionId.indexOf("us-state-") === 0) {
      return "State-level view · regional guidance for " + (loc.state || "your state");
    }
    return "U.S. outdoor dashboard · regional guidance at your coordinates";
  }

  function finalizeLocation(loc, index) {
    if (!loc) return loc;
    var eligible = isLocalBundleEligible(loc, index);
    loc.useNationalFallback = !eligible;
    loc.contentMode = eligible ? CONTENT_MODE_LOCAL : CONTENT_MODE_NATIONAL;
    loc.contentBundle = eligible ? LOCAL_BUNDLE_ID : "us-national";
    loc.usingNearestBundle = false;
  if (!eligible) {
      var inferred = inferStateForLoc(loc);
      if (inferred) {
        loc.inferredState = { code: inferred.code, name: inferred.name };
        if (!loc.stateCode && loc.source === "geo") {
          loc.stateCode = inferred.code;
          loc.state = inferred.name;
        }
      }
    }
    loc.displayTitle = displayTitle(loc);
    loc.displaySubtitle = displaySubtitle(loc);
    return loc;
  }

  function buildStateFromUSState(st) {
    if (!st) return null;
    return finalizeLocation({
      source: "manual",
      regionId: "us-state-" + st.code.toLowerCase(),
      contentBundle: "us-national",
      name: st.name,
      state: st.name,
      stateCode: st.code,
      bioregion: "",
      lat: st.lat,
      lng: st.lng,
      elevationFt: null,
      distanceKm: 0,
      isDefault: false,
      geoDenied: false,
      timestamp: Date.now()
    }, null);
  }

  function seasonNote(lat) {
    var month = new Date().getMonth() + 1;
    var zone = climateZone(lat);
    var season = seasonLabel(lat, month);
    if (zone === "tropical") return season + " · tropical latitude";
    if (zone === "subarctic") return season + " · high latitude";
    return season;
  }

  function buildPlatformLayer(loc) {
    loc = loc || {};
    var lat = Number(loc.lat);
    var st = loc.inferredState || inferStateForLoc(loc) || {};
    return {
      meta: {
        contentMode: CONTENT_MODE_NATIONAL,
        contentBundleId: "us-national",
        regionId: loc.regionId || "us-national",
        useNationalFallback: true,
        sources: { bundle: "us-national", ecology: "educational" }
      },
      region: {
        id: "us-national",
        label: displayTitle(loc)
      },
      county: {
        name: loc.source === "manual" && loc.name ? loc.name : null,
        stateCode: loc.stateCode || st.code || null
      },
      state: {
        name: loc.state || st.name || "United States",
        code: loc.stateCode || st.code || "US"
      },
      geography: {
        status: "educational",
        bioregion: "Regional · U.S. field guidance (not local ecology)",
        ecoregion: null,
        dominantForest: null,
        watersheds: []
      },
      calendar: {
        season: seasonNote(lat),
        month: new Date().getMonth() + 1
      },
      phenology: {
        status: "educational",
        stage: seasonNote(lat),
        summary: "Seasonal patterns depend on latitude, elevation, and recent weather — observe locally.",
        watch: { activeNow: [], ending: [], comingSoon: [] }
      },
      species: {
        status: "educational",
        active: [],
        ending: [],
        comingSoon: []
      },
      observations: {
        status: "educational",
        items: []
      },
      conservation: {
        status: "educational",
        current: {
          title: "Stewardship anywhere you explore",
          summary: "Leave no trace, stay on durable surfaces, and follow local land-manager rules. Invasive species and erosion look different in every biome — learn a few local plants and report trail damage to the agency that manages the land.",
          whatYouCanDo: "Pack out all litter, respect closures, and photograph habitat context without collecting unless you are certain of identification and regulations."
        }
      },
      research: { status: "placeholder", current: null },
      rainfall: { status: "placeholder" }
    };
  }

  function applyShell(bundle, loc) {
    if (!bundle) return bundle;
    bundle.region = Object.assign({}, bundle.region, {
      id: "us-national",
      name: loc && loc.state ? loc.state : "United States",
      state: loc && loc.state ? loc.state : "",
      stateCode: loc && loc.stateCode ? loc.stateCode : "US",
      center: loc ? { lat: loc.lat, lng: loc.lng } : null
    });
    if (loc && loc.displayTitle) {
      bundle._location = loc;
    }
    bundle.season = seasonNote(loc && loc.lat);
    bundle.platformScope = bundle.platformScope || {
      label: "U.S. outdoor dashboard",
      detail: "Regional guidance for your coordinates — not county-specific ecology."
    };
    return bundle;
  }

  function renderTrustBanner(loc, platform) {
    var national = isNationalMode(loc) || isNationalMode(platform);
    if (!national) {
      return (
        '<div class="wdb-trust wdb-trust--local" role="note" aria-label="Data scope">' +
          '<span class="wdb-trust__badge wdb-trust__badge--editorial">Local bundle</span>' +
          '<p class="wdb-trust__text">Pike County editorial intelligence is active for this location. Live weather uses your coordinates.</p>' +
        "</div>"
      );
    }
    var title = loc && loc.displaySubtitle ? loc.displaySubtitle : displaySubtitle(loc);
    return (
      '<div class="wdb-trust wdb-trust--national" role="note" aria-label="Data scope">' +
        '<span class="wdb-trust__badge wdb-trust__badge--educational">U.S. regional overview</span>' +
        '<p class="wdb-trust__text">' + escapeHtml(title) + ". Wildlife, plants, trails, and water panels use regional estimates — they are not local species or agency feeds.</p>" +
        '<p class="wdb-trust__labels"><span class="wdb-trust__label wdb-trust__label--live">Live</span> weather &amp; sun/moon · <span class="wdb-trust__label wdb-trust__label--estimated">Estimated</span> golden/blue hour · <span class="wdb-trust__label wdb-trust__label--educational">Regional</span> nature guidance</p>' +
      "</div>"
    );
  }

  function weatherInterpretation(wxRef) {
    if (!wxRef || !wxRef.current) return null;
    var cur = wxRef.current;
    var temp = cur.temperature && cur.temperature.value != null ? cur.temperature.value : cur.temperature;
    var cond = (cur.conditions && cur.conditions.summary) || "";
    var parts = [];
    if (temp != null) parts.push("Current near " + Math.round(temp) + "° at your coordinates.");
    if (cond) parts.push(cond + ".");
    parts.push("Layer for wind and rain; check hourly trend before exposed ridges or water crossings.");
    return parts.join(" ");
  }

  global.WDS = global.WDS || {};
  global.WDS.usNational = {
    LOCAL_BUNDLE_ID: LOCAL_BUNDLE_ID,
    BUNDLE_MATCH_KM: BUNDLE_MATCH_KM,
    CONTENT_MODE_LOCAL: CONTENT_MODE_LOCAL,
    CONTENT_MODE_NATIONAL: CONTENT_MODE_NATIONAL,
    isLocalBundleEligible: isLocalBundleEligible,
    isNationalMode: isNationalMode,
    finalizeLocation: finalizeLocation,
    buildStateFromUSState: buildStateFromUSState,
    buildPlatformLayer: buildPlatformLayer,
    applyShell: applyShell,
    displayTitle: displayTitle,
    displaySubtitle: displaySubtitle,
    renderTrustBanner: renderTrustBanner,
    weatherInterpretation: weatherInterpretation,
    climateZone: climateZone,
    seasonLabel: seasonLabel
  };
})(window);
