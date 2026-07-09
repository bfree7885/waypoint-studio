/**
 * Waypoint Studio — regional location (browser geolocation + IP fallback)
 * Shared by Studio, ForageCast, kiosk, and apps via WDS.location.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "wds-location-v1";
  var PROMPT_KEY = "wds-location-prompted";
  var MOVE_THRESHOLD_KM = 5;
  var CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  var GEO_SOFT_REFRESH_MS = 30 * 60 * 1000;

  var indexCache = null;
  var currentState = null;
  var changeListeners = [];

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed to load " + url);
      return res.json();
    });
  }

  function loadIndex(base) {
    if (indexCache) return Promise.resolve(indexCache);
    var url = (base || "design-system/content-engine/").replace(/\/?$/, "/") + "regions-index.json";
    return fetchJson(url).then(function (data) {
      indexCache = data;
      return data;
    });
  }

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function notifyChange(state) {
    changeListeners.forEach(function (fn) {
      try { fn(state); } catch (err) { /* noop */ }
    });
    if (global.document && global.CustomEvent) {
      try {
        global.document.dispatchEvent(new CustomEvent("wds:location-change", { detail: state }));
      } catch (e) { /* noop */ }
    }
  }

  function writeStored(state, options) {
    options = options || {};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(PROMPT_KEY, "1");
    } catch (e) { /* private mode */ }
    currentState = state;
    if (options.silent !== true) notifyChange(state);
    return state;
  }

  function enrichWithGeocode(state) {
    var GC = global.WDS && global.WDS.geocode;
    if (!GC || !GC.reverse || !state || !isFinite(Number(state.lat)) || !isFinite(Number(state.lng))) {
      return Promise.resolve(applyPlaceDisplay(state));
    }
    if (state.city && state.county && state.geocodeAt) {
      return Promise.resolve(applyPlaceDisplay(state));
    }
    return GC.reverse({ lat: Number(state.lat), lng: Number(state.lng) }).then(function (geo) {
      if (geo && geo.status === "live") {
        if (geo.city) state.city = geo.city;
        if (geo.county) state.county = geo.county;
        if (geo.state) state.state = geo.state;
        if (geo.stateCode) state.stateCode = geo.stateCode;
        if (geo.placeLabel) state.placeLabel = geo.placeLabel;
        state.geocodeSource = geo.meta && geo.meta.provider;
        state.geocodeAt = geo.meta && geo.meta.fetchedAt;
      }
      return applyPlaceDisplay(state);
    }).catch(function () {
      return applyPlaceDisplay(state);
    });
  }

  function isValidCoords(state) {
    return !!(state && isFinite(Number(state.lat)) && isFinite(Number(state.lng)));
  }

  function isLegacyDefault(state) {
    return !!(state && (state.source === "default" || state.isDefault === true));
  }

  function shouldRefreshStored(state) {
    if (!isValidCoords(state)) return true;
    if (isLegacyDefault(state)) return true;
    var age = Date.now() - (state.timestamp || 0);
    return age > CACHE_MAX_AGE_MS;
  }

  function hasMovedSignificantly(state, lat, lng) {
    if (!isValidCoords(state)) return true;
    return distanceKm(Number(state.lat), Number(state.lng), lat, lng) >= MOVE_THRESHOLD_KM;
  }

  function applyPlaceDisplay(state) {
    if (!state) return state;
    var US = global.WDS && global.WDS.usNational;
    if (state.placeLabel) {
      state.displayTitle = state.placeLabel;
    } else if (state.city && (state.stateCode || state.state)) {
      state.placeLabel = state.city + ", " + (state.stateCode || state.state);
      state.displayTitle = state.placeLabel;
    } else if (state.county && (state.stateCode || state.state)) {
      state.placeLabel = state.county + ", " + (state.stateCode || state.state);
      state.displayTitle = state.placeLabel;
    } else if (state.city) {
      state.placeLabel = "Near " + state.city + (state.state ? ", " + state.state : "");
      state.displayTitle = state.placeLabel;
    } else if (isValidCoords(state)) {
      state.displayTitle = formatCoords(state.lat, state.lng) +
        (state.stateCode ? " · " + state.stateCode : state.state ? " · " + state.state : "");
    }
    if (US && US.finalizeLocation) {
      state = US.finalizeLocation(state, indexCache);
    }
    return state;
  }

  function finalizeStored(state, index) {
    if (!state) return state;
    if (global.WDS && global.WDS.usNational && global.WDS.usNational.finalizeLocation) {
      state = global.WDS.usNational.finalizeLocation(state, index || indexCache);
    }
    return applyPlaceDisplay(state);
  }

  function saveState(state, options) {
    options = options || {};
    return enrichWithGeocode(state).then(function (enriched) {
      return writeStored(enriched, options);
    });
  }

  function onChange(fn) {
    if (typeof fn === "function") changeListeners.push(fn);
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function findRegionById(index, id) {
    return (index.regions || []).find(function (r) { return r.id === id; }) || null;
  }

  function getDefaultRegionId(index) {
    index = index || indexCache;
    if (!index) return null;
    return index.defaultRegionId || index.defaultBundleId ||
      (index.regions && index.regions[0] && index.regions[0].id) || null;
  }

  function getDefaultRegion(index) {
    index = index || indexCache;
    if (!index) return null;
    var id = getDefaultRegionId(index);
    return findRegionById(index, id) || (index.regions && index.regions[0]) || null;
  }

  function getDefaultLabel(index) {
    var region = getDefaultRegion(index);
    if (!region) return "Default region";
    return region.name + (region.stateCode ? ", " + region.stateCode : "");
  }

  function formatRegionLabel(loc) {
    if (!loc) return getDefaultLabel();
    if (loc.displayTitle) return loc.displayTitle;
    return loc.name + (loc.stateCode ? ", " + loc.stateCode : loc.state ? ", " + loc.state : "");
  }

  function nearestRegion(index, lat, lng) {
    var best = null;
    var bestDist = Infinity;
    (index.regions || []).forEach(function (r) {
      var d = distanceKm(lat, lng, r.lat, r.lng);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    });
    return { region: best, distanceKm: bestDist };
  }

  function buildState(source, region, extra, index) {
    extra = extra || {};
    var bundleId = region.contentBundle || region.id;
    var state = {
      source: source,
      regionId: region.id,
      contentBundle: bundleId,
      name: region.name,
      state: region.state,
      stateCode: region.stateCode,
      bioregion: region.bioregion || "",
      lat: extra.lat != null ? extra.lat : region.lat,
      lng: extra.lng != null ? extra.lng : region.lng,
      elevationFt: region.elevationFt,
      mapExtent: region.mapExtent || null,
      weather: region.weather || null,
      seasonNote: region.seasonNote || null,
      accuracy: extra.accuracy != null ? extra.accuracy : null,
      distanceKm: extra.distanceKm != null ? Math.round(extra.distanceKm) : 0,
      isDefault: source === "default",
      usingNearestBundle: bundleId !== region.id,
      geoDenied: !!extra.geoDenied,
      timestamp: Date.now()
    };
    if (global.WDS && global.WDS.usNational && global.WDS.usNational.finalizeLocation) {
      return global.WDS.usNational.finalizeLocation(state, index || indexCache);
    }
    return state;
  }

  function defaultState(index) {
    var region = getDefaultRegion(index);
    if (!region) throw new Error("WDS.location: regions-index has no regions");
    return buildState("default", region, { lat: region.lat, lng: region.lng, distanceKm: 0 }, index);
  }

  function resolveManual(regionId, index) {
    var region = findRegionById(index, regionId);
    if (!region) return defaultState(index);
    return buildState("manual", region, { lat: region.lat, lng: region.lng, distanceKm: 0 }, index);
  }

  function resolveFromState(st, index) {
    if (global.WDS && global.WDS.usNational && global.WDS.usNational.buildStateFromUSState) {
      var state = global.WDS.usNational.buildStateFromUSState(st);
      if (state && global.WDS.usNational.finalizeLocation) {
        return global.WDS.usNational.finalizeLocation(state, index || indexCache);
      }
      return state;
    }
    return {
      source: "manual",
      regionId: "us-state-" + String(st.code).toLowerCase(),
      contentBundle: "us-national",
      name: st.name,
      state: st.name,
      stateCode: st.code,
      lat: st.lat,
      lng: st.lng,
      useNationalFallback: true,
      contentMode: "national-educational",
      timestamp: Date.now()
    };
  }

  function geolocationErrorMessage(err) {
    if (!err) return "Could not get browser location.";
    if (err.code === 1) {
      return "Browser location permission denied — using IP geolocation when available.";
    }
    if (err.code === 2) return "Browser location unavailable — using IP geolocation when available.";
    if (err.code === 3) return "Browser location timed out — using IP geolocation when available.";
    return "Browser location failed — using IP geolocation when available.";
  }

  function getGeolocation(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        function (err) {
          reject(err);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy !== false,
          timeout: options.timeout || 15000,
          maximumAge: options.maximumAge != null ? options.maximumAge : 60000
        }
      );
    });
  }

  function buildStateFromCoords(lat, lng, index, extra) {
    extra = extra || {};
    var US = global.WDS && global.WDS.usNational;
    var bundleKm = US && US.BUNDLE_MATCH_KM ? US.BUNDLE_MATCH_KM : 50;
    var match = nearestRegion(index, lat, lng);
    var region = match.region;
    var eligible = false;

    if (region && US && US.isLocalBundleEligible) {
      eligible = US.isLocalBundleEligible({
        source: extra.source || "geo",
        lat: lat,
        lng: lng,
        regionId: region.id
      }, index);
    } else if (region) {
      eligible = match.distanceKm <= bundleKm;
    }

    var state = {
      source: extra.source || "geo",
      lat: lat,
      lng: lng,
      accuracy: extra.accuracy != null ? extra.accuracy : null,
      timestamp: Date.now(),
      detectedAt: extra.detectedAt || new Date().toISOString(),
      detectionMethod: extra.detectionMethod ||
        (extra.source === "ip" ? "ip-geolocation" : "browser-geolocation"),
      refreshReason: extra.refreshReason || null,
      fallbackReason: extra.fallbackReason || null,
      distanceKm: region ? Math.round(match.distanceKm) : null,
      nearestIndexedCounty: region ? region.name : null,
      nearestIndexedState: region ? region.stateCode : null,
      isDefault: false,
      geoDenied: !!extra.geoDenied,
      usingNearestBundle: false
    };

    if (extra.city) state.city = extra.city;
    if (extra.regionName) state.state = extra.regionName;
    if (extra.stateCode) state.stateCode = extra.stateCode;

    if (eligible && region) {
      state.regionId = region.id;
      state.contentBundle = region.contentBundle || region.id;
      state.name = region.name;
      state.state = region.state;
      state.stateCode = region.stateCode;
      state.bioregion = region.bioregion || "";
      state.elevationFt = region.elevationFt;
      state.mapExtent = region.mapExtent || null;
      state.weather = region.weather || null;
      state.seasonNote = region.seasonNote || null;
      state.usingNearestBundle = (region.contentBundle || region.id) !== region.id;
    } else {
      state.regionId = "us-coords";
      state.contentBundle = "us-national";
      state.name = null;
      var inferred = global.WDS && global.WDS.usStates && global.WDS.usStates.inferState(lat, lng);
      if (inferred) {
        state.state = inferred.name;
        state.stateCode = inferred.code;
        state.inferredState = { code: inferred.code, name: inferred.name };
      }
    }

    if (US && US.finalizeLocation) {
      state = US.finalizeLocation(state, index);
    }
    return state;
  }

  function resolveFromCoords(lat, lng, index, extra) {
    return buildStateFromCoords(lat, lng, index, extra);
  }

  function detectFromBrowser(index, extra) {
    extra = extra || {};
    return getGeolocation({ enableHighAccuracy: true, maximumAge: 60000 }).then(function (coords) {
      return buildStateFromCoords(coords.lat, coords.lng, index, Object.assign({}, extra, {
        source: "geo",
        accuracy: coords.accuracy,
        detectionMethod: "browser-geolocation",
        refreshReason: extra.refreshReason || "browser-geolocation"
      }));
    });
  }

  function detectFromIp(index, extra) {
    extra = extra || {};
    var IP = global.WDS && global.WDS.ipGeolocation;
    if (!IP || !IP.lookup) {
      return Promise.reject(new Error("IP geolocation unavailable"));
    }
    return IP.lookup().then(function (ip) {
      return buildStateFromCoords(ip.lat, ip.lng, index, Object.assign({}, extra, {
        source: "ip",
        city: ip.city,
        regionName: ip.region,
        stateCode: ip.stateCode,
        detectionMethod: "ip-geolocation",
        refreshReason: extra.refreshReason || "ip-geolocation",
        fallbackReason: extra.fallbackReason || "browser-geolocation-denied"
      }));
    });
  }

  function detectLocation(options) {
    options = options || {};
    var index = options.index || indexCache;
    var force = !!options.forceRefresh;
    var stored = readStored();
    if (stored && isLegacyDefault(stored)) stored = null;

    if (!force && stored && isValidCoords(stored) && !shouldRefreshStored(stored)) {
      stored.refreshReason = "cache-hit";
      return Promise.resolve(finalizeStored(stored, index));
    }

    return detectFromBrowser(index, { refreshReason: force ? "forced-refresh" : "bootstrap" })
      .catch(function (browserErr) {
        return detectFromIp(index, {
          fallbackReason: geolocationErrorMessage(browserErr)
        });
      })
      .then(function (state) {
        return saveState(state, { silent: options.silent });
      })
      .catch(function () {
        if (stored && isValidCoords(stored)) {
          stored.fallbackReason = "all-detection-failed-using-cache";
          stored.refreshReason = "stale-cache";
          return finalizeStored(stored, index);
        }
        return Promise.reject(new Error("Could not detect location — enable browser location or try again."));
      });
  }

  function refreshLocationInBackground(index, base) {
    index = index || indexCache;
    if (!index) return;
    var prev = getState();
    detectFromBrowser(index, { refreshReason: "background-refresh", silent: true })
      .catch(function () { return detectFromIp(index, { refreshReason: "background-ip-fallback" }); })
      .then(function (state) {
        if (!state || !isValidCoords(state)) return null;
        if (prev && isValidCoords(prev) && !hasMovedSignificantly(prev, state.lat, state.lng) &&
            Date.now() - (prev.timestamp || 0) < GEO_SOFT_REFRESH_MS) {
          return null;
        }
        return saveState(state, { silent: true });
      })
      .then(function (updated) {
        if (updated) notifyChange(updated);
      })
      .catch(function () { /* background only */ });
  }

  function getState() {
    if (currentState) return currentState;
    currentState = readStored();
    return currentState;
  }

  function formatCoords(lat, lng) {
    if (lat == null || lng == null) return "";
    var latStr = (lat >= 0 ? lat.toFixed(2) + "°N" : Math.abs(lat).toFixed(2) + "°S");
    var lngStr = (lng >= 0 ? lng.toFixed(2) + "°E" : Math.abs(lng).toFixed(2) + "°W");
    return latStr + ", " + lngStr;
  }

  function formatStatusLine(loc) {
    if (!loc) return getDefaultLabel();
    if (loc.displayTitle) {
      var line = loc.displayTitle;
      if (loc.displaySubtitle) line += " — " + loc.displaySubtitle;
      return line;
    }
    if (loc.isDefault || loc.source === "default") {
      return "Using default region: " + formatRegionLabel(loc);
    }
    if (loc.source === "geo" || loc.source === "ip") {
      return loc.displayTitle || loc.placeLabel || formatCoords(loc.lat, loc.lng);
    }
    return loc.name + ", " + (loc.state || loc.stateCode);
  }

  function formatHeroMeta(loc, region, weekOf) {
    region = region || {};
    var weekPart = weekOf ? " · Week of " + weekOf : "";
    if (loc && loc.displayTitle) {
      return loc.displayTitle + weekPart + " · " + (loc.useNationalFallback ? "U.S. regional overview" : "local bundle");
    }
    if (!loc || loc.isDefault || loc.source === "default") {
      return "Using default region: " + formatRegionLabel(loc) + weekPart + " · editorial content may not match your county until more bundles ship";
    }
    if (loc.source === "geo" || loc.source === "ip") {
      return (loc.displayTitle || loc.placeLabel || formatCoords(loc.lat, loc.lng)) + weekPart +
        " · " + (loc.useNationalFallback ? "U.S. regional overview" : "local bundle");
    }
    return (loc.name || region.name) + ", " + (loc.state || region.state) + weekPart;
  }

  function searchRegions(query, index) {
    query = (query || "").toLowerCase().trim();
    if (!query) return null;
    var found = (index.regions || []).find(function (r) {
      var label = (r.name + ", " + r.stateCode).toLowerCase();
      var label2 = (r.name + ", " + r.state).toLowerCase();
      return label === query || label2 === query || r.name.toLowerCase() === query;
    });
    if (!found) {
      found = (index.regions || []).find(function (r) {
        return r.name.toLowerCase().indexOf(query) !== -1 || query.indexOf(r.name.toLowerCase()) !== -1;
      });
    }
    return found || null;
  }

  function searchManualLocation(query, index) {
    var county = searchRegions(query, index);
    if (county) return { type: "county", region: county };
    var US = global.WDS && global.WDS.usStates;
    if (US && US.findState) {
      var st = US.findState(query);
      if (st) return { type: "state", state: st };
    }
    return null;
  }

  function projectToSchematic(lat, lng, region, viewBox) {
    if (!region || lat == null || lng == null) return null;
    viewBox = viewBox || { width: 420, height: 300 };
    var extent = region.mapExtent || { latDelta: 0.35, lngDelta: 0.45 };
    var minLat = region.lat - extent.latDelta;
    var maxLat = region.lat + extent.latDelta;
    var minLng = region.lng - extent.lngDelta;
    var maxLng = region.lng + extent.lngDelta;
    var spanLat = maxLat - minLat || 0.01;
    var spanLng = maxLng - minLng || 0.01;
    var x = ((lng - minLng) / spanLng) * viewBox.width;
    var y = ((maxLat - lat) / spanLat) * viewBox.height;
    return {
      x: Math.max(12, Math.min(viewBox.width - 12, x)),
      y: Math.max(12, Math.min(viewBox.height - 12, y))
    };
  }

  function getRegionForProjection(loc, index) {
    if (!loc) return null;
    if (index && loc.regionId) {
      return findRegionById(index, loc.regionId);
    }
    return {
      lat: loc.lat,
      lng: loc.lng,
      mapExtent: loc.mapExtent || null
    };
  }

  function renderBar(loc, options) {
    if (!loc) return "";
    options = options || {};
    var wrapperClass = options.wrapperClass || "wce-location-bar wce-location-bar--story";
    var statusHtml = "";
    if (loc.isDefault || loc.source === "default") {
      statusHtml = "<strong>Using default region:</strong> " + escapeHtml(formatRegionLabel(loc));
    } else if (loc.source === "geo" || loc.source === "ip") {
      statusHtml = "<strong>Your location:</strong> " + escapeHtml(loc.displayTitle || loc.placeLabel || formatCoords(loc.lat, loc.lng));
    } else {
      statusHtml = "<strong>Region:</strong> " + escapeHtml(loc.displayTitle || (loc.name + ", " + loc.state));
    }

    var bundleNote = "";
    if (loc.useNationalFallback) {
      bundleNote = '<p class="wce-location-bar__note"><strong>U.S. regional overview.</strong> Live weather and sun/moon use your coordinates. Nature, wildlife, trails, and water guidance are regional estimates — not local species lists or agency feeds.</p>';
    } else if (loc.isDefault || loc.source === "default") {
      bundleNote = '<p class="wce-location-bar__note">Select your county, state, or use my location for forecasts at your coordinates.</p>';
    } else if (loc.contentMode === "local-bundle") {
      bundleNote = '<p class="wce-location-bar__note"><strong>Local bundle active.</strong> Pike County editorial intelligence is available for this area. Live weather uses your coordinates.</p>';
    }

    return (
      '<div class="' + escapeHtml(wrapperClass) + '" id="wds-location-bar" data-location-source="' + escapeHtml(loc.source) + '">' +
        '<div class="wce-location-bar__main">' +
          '<p class="wce-location-bar__status">' + statusHtml + "</p>" +
          '<div class="wce-location-bar__actions">' +
            '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-retry">Use my location</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-change">Change region</button>' +
          "</div>" +
        "</div>" +
        bundleNote +
        '<form class="wce-location-bar__search wds-location-search is-hidden" id="wds-loc-change-form">' +
          '<label class="wds-location-search__label" for="wds-loc-change-input">Search county or state</label>' +
          '<div class="wds-location-search__row">' +
            '<input class="wds-location-search__input" id="wds-loc-change-input" list="wds-loc-change-list" placeholder="County, ST" autocomplete="off">' +
            '<datalist id="wds-loc-change-list"></datalist>' +
            '<button type="submit" class="wds-btn wds-btn--secondary wds-btn--sm">Set</button>' +
          "</div>" +
        "</form>" +
      "</div>"
    );
  }

  function bindBar(mount, options) {
    if (!mount) return;
    options = options || {};
    var bar = mount.querySelector("#wds-location-bar");
    if (!bar) return;

    var base = (options.base || "design-system/content-engine/").replace(/\/?$/, "/");
    var changeBtn = bar.querySelector("#wds-loc-change");
    var changeForm = bar.querySelector("#wds-loc-change-form");
    var retryBtn = bar.querySelector("#wds-loc-retry");

    function handleChange(state) {
      if (typeof options.onLocationChange === "function") {
        options.onLocationChange(state);
      }
    }

    if (changeBtn && changeForm) {
      changeBtn.addEventListener("click", function () {
        changeForm.classList.toggle("is-hidden");
        loadIndex(base).then(function (index) {
          var list = bar.querySelector("#wds-loc-change-list");
          if (list) {
            list.innerHTML = (index.regions || []).map(function (r) {
              return '<option value="' + escapeHtml(r.name + ", " + r.stateCode) + '">';
            }).join("");
          }
        });
      });
    }

    if (changeForm) {
      changeForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = (bar.querySelector("#wds-loc-change-input").value || "").trim();
        if (!q) return;
        loadIndex(base).then(function (index) {
          var found = searchManualLocation(q, index);
          if (found && found.type === "county") {
            handleChange(writeStored(resolveManual(found.region.id, index)));
          } else if (found && found.type === "state") {
            handleChange(writeStored(resolveFromState(found.state, index)));
          }
        });
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        requestGeolocationAndSave(base).then(handleChange);
      });
    }
  }

  function renderPrompt(mount, index, onComplete) {
    if (!mount) {
      onComplete(defaultState(index));
      return;
    }
    var defaultLabel = getDefaultLabel(index);
    mount.innerHTML =
      '<div class="wds-location-prompt" role="dialog" aria-labelledby="wds-loc-title" aria-modal="true">' +
        '<div class="wds-location-prompt__card">' +
          '<p class="wds-eyebrow">Your region</p>' +
          '<h2 class="wds-location-prompt__title" id="wds-loc-title">Where are you exploring this week?</h2>' +
          '<p class="wds-body">Waypoint uses your browser location to adapt weather, maps, and regional context. Coordinates stay on your device unless you choose to share observations later.</p>' +
          '<div class="wds-location-prompt__actions">' +
            '<button type="button" class="wds-btn wds-btn--primary" id="wds-loc-allow">Use my location</button>' +
            '<button type="button" class="wds-btn wds-btn--secondary" id="wds-loc-default">Use ' + escapeHtml(defaultLabel) + '</button>' +
          "</div>" +
          '<form class="wds-location-search" id="wds-loc-search-form">' +
            '<label class="wds-location-search__label" for="wds-loc-search">Or search a county or state</label>' +
            '<div class="wds-location-search__row">' +
              '<input class="wds-location-search__input" id="wds-loc-search" list="wds-loc-list" placeholder="e.g. Maine, Miami FL, or Pike County, PA" autocomplete="off">' +
              '<datalist id="wds-loc-list">' +
                (index.regions || []).map(function (r) {
                  return '<option value="' + escapeHtml(r.name + ", " + r.stateCode) + '">';
                }).join("") +
                ((global.WDS && global.WDS.usStates && global.WDS.usStates.STATES)
                  ? global.WDS.usStates.STATES.map(function (st) {
                      return '<option value="' + escapeHtml(st.name) + '">';
                    }).join("")
                  : "") +
              "</datalist>" +
              '<button type="submit" class="wds-btn wds-btn--ghost wds-btn--sm">Set</button>' +
            "</div>" +
          "</form>" +
          '<p class="wds-caption wds-location-prompt__status" id="wds-loc-status" aria-live="polite"></p>' +
        "</div>" +
      "</div>";

    var status = mount.querySelector("#wds-loc-status");

    function finish(state) {
      saveState(state).then(function (saved) {
        mount.innerHTML = "";
        onComplete(saved);
      });
    }

    function fail(msg) {
      if (status) status.textContent = msg;
    }

    mount.querySelector("#wds-loc-allow").addEventListener("click", function () {
      if (status) status.textContent = "Locating…";
      getGeolocation()
        .then(function (coords) {
          finish(resolveFromCoords(coords.lat, coords.lng, index, { accuracy: coords.accuracy }));
        })
        .catch(function (err) {
          fail(geolocationErrorMessage(err));
        });
    });

    mount.querySelector("#wds-loc-default").addEventListener("click", function () {
      finish(defaultState(index));
    });

    mount.querySelector("#wds-loc-search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (mount.querySelector("#wds-loc-search").value || "").trim();
      if (!q) return;
      var found = searchManualLocation(q, index);
      if (found && found.type === "county") {
        finish(resolveManual(found.region.id, index));
      } else if (found && found.type === "state") {
        finish(resolveFromState(found.state, index));
      } else {
        fail("Location not found — try Maine, Colorado, Orange County NY, or Pike County PA.");
      }
    });
  }

  function bootstrap(options) {
    options = options || {};
    var base = options.base || "design-system/content-engine/";
    var promptMount = options.promptMount || document.getElementById("wds-location-prompt");

    return loadIndex(base).then(function (index) {
      indexCache = index;
      var stored = readStored();

      if (stored && isLegacyDefault(stored)) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
        stored = null;
      }

      if (stored && isValidCoords(stored) && !options.forceRefresh && !shouldRefreshStored(stored)) {
        currentState = finalizeStored(stored, index);
        if (Date.now() - (stored.timestamp || 0) > GEO_SOFT_REFRESH_MS) {
          refreshLocationInBackground(index, base);
        }
        return enrichWithGeocode(currentState).then(function (enriched) {
          if (enriched !== currentState) writeStored(enriched, { silent: true });
          currentState = enriched;
          return enriched;
        });
      }

      return detectLocation({ index: index, base: base, silent: true }).then(function (state) {
        currentState = state;
        if (promptMount) {
          try {
            promptMount.innerHTML = "";
            promptMount.setAttribute("hidden", "hidden");
          } catch (e) { /* noop */ }
        }
        return state;
      }).catch(function (err) {
        if (options.skipPrompt) {
          throw err;
        }
        return new Promise(function (resolve) {
          renderPrompt(promptMount, index, resolve);
        });
      });
    }).catch(function (err) {
      return loadIndex(base).then(function (index) {
        return detectLocation({ index: index, forceRefresh: true }).catch(function () {
          throw err;
        });
      });
    });
  }

  function applyToBundle(bundle, loc) {
    if (!bundle || !loc) return bundle;
    if (loc.useNationalFallback || loc.contentMode === "national-educational") {
      if (global.WDS && global.WDS.usNational && global.WDS.usNational.applyShell) {
        return global.WDS.usNational.applyShell(bundle, loc);
      }
      return bundle;
    }
    var data = JSON.parse(JSON.stringify(bundle));
    data.region = Object.assign({}, data.region, {
      id: loc.regionId,
      name: loc.name,
      state: loc.state,
      stateCode: loc.stateCode,
      bioregion: loc.bioregion || data.region.bioregion,
      center: { lat: loc.lat, lng: loc.lng }
    });
    if (loc.seasonNote) {
      data.season = loc.seasonNote;
    }
    if (loc.weather && data.thisWeekOutdoors) {
      data.thisWeekOutdoors.weather = Object.assign({}, data.thisWeekOutdoors.weather, loc.weather);
    }
    data._location = loc;
    return data;
  }

  function changeRegion(regionId, base) {
    return loadIndex(base).then(function (index) {
      return writeStored(resolveManual(regionId, index));
    });
  }

  function requestGeolocationAndSave(base) {
    return loadIndex(base).then(function (index) {
      return detectFromBrowser(index, { refreshReason: "user-requested" })
        .then(function (state) {
          return saveState(state);
        })
        .catch(function (err) {
          return detectFromIp(index, {
            fallbackReason: geolocationErrorMessage(err),
            refreshReason: "user-requested-ip-fallback"
          }).then(function (state) {
            return saveState(state);
          }).catch(function () {
            var state = getState();
            if (state && isValidCoords(state) && !isLegacyDefault(state)) {
              state.geoDenied = true;
              state.geoError = geolocationErrorMessage(err);
              return writeStored(finalizeStored(state, index));
            }
            throw err;
          });
        });
    });
  }

  global.WDS = global.WDS || {};
  var locationApi = {
    STORAGE_KEY: STORAGE_KEY,
    getDefaultRegionId: getDefaultRegionId,
    getDefaultRegion: getDefaultRegion,
    getDefaultLabel: getDefaultLabel,
    loadIndex: loadIndex,
    bootstrap: bootstrap,
    detectLocation: detectLocation,
    refreshLocationInBackground: refreshLocationInBackground,
    buildStateFromCoords: buildStateFromCoords,
    applyPlaceDisplay: applyPlaceDisplay,
    isLegacyDefault: isLegacyDefault,
    getState: getState,
    readStored: readStored,
    writeStored: writeStored,
    onChange: onChange,
    defaultState: defaultState,
    resolveFromCoords: resolveFromCoords,
    resolveManual: resolveManual,
    getGeolocation: getGeolocation,
    applyToBundle: applyToBundle,
    changeRegion: changeRegion,
    requestGeolocationAndSave: requestGeolocationAndSave,
    nearestRegion: nearestRegion,
    findRegionById: findRegionById,
    searchRegions: searchRegions,
    searchManualLocation: searchManualLocation,
    resolveFromState: resolveFromState,
    formatCoords: formatCoords,
    formatStatusLine: formatStatusLine,
    formatHeroMeta: formatHeroMeta,
    geolocationErrorMessage: geolocationErrorMessage,
    projectToSchematic: projectToSchematic,
    getRegionForProjection: getRegionForProjection,
    renderBar: renderBar,
    bindBar: bindBar
  };
  Object.defineProperty(locationApi, "DEFAULT_REGION_ID", {
    configurable: true,
    enumerable: true,
    get: function () { return getDefaultRegionId(); }
  });
  Object.defineProperty(locationApi, "DEFAULT_LABEL", {
    configurable: true,
    enumerable: true,
    get: function () { return getDefaultLabel(); }
  });
  global.WDS.location = locationApi;
})(window);
