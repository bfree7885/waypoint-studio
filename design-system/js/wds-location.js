/**
 * Waypoint Studio — regional location (browser geolocation, no external APIs)
 * Shared by Studio, ForageCast, and future apps via WDS.location.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "wds-location-v1";
  var PROMPT_KEY = "wds-location-prompted";

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

  function buildState(source, region, extra) {
    extra = extra || {};
    var bundleId = region.contentBundle || region.id;
    return {
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
  }

  function defaultState(index) {
    var region = getDefaultRegion(index);
    if (!region) throw new Error("WDS.location: regions-index has no regions");
    return buildState("default", region, { lat: region.lat, lng: region.lng, distanceKm: 0 });
  }

  function resolveManual(regionId, index) {
    var region = findRegionById(index, regionId);
    if (!region) return defaultState(index);
    return buildState("manual", region, { lat: region.lat, lng: region.lng, distanceKm: 0 });
  }

  function geolocationErrorMessage(err, index) {
    if (!err) return "Could not get location.";
    var label = getDefaultLabel(index);
    if (err.code === 1) {
      return "Location permission denied — use " + label + " or search a county below.";
    }
    if (err.code === 2) return "Location unavailable — try again or pick a county.";
    if (err.code === 3) return "Location timed out — try again or pick a county.";
    return "Could not get location — try again or pick a county.";
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
          enableHighAccuracy: false,
          timeout: options.timeout || 12000,
          maximumAge: options.maximumAge || 300000
        }
      );
    });
  }

  function resolveFromCoords(lat, lng, index, extra) {
    extra = extra || {};
    var match = nearestRegion(index, lat, lng);
    if (!match.region) return defaultState(index);
    return buildState("geo", match.region, {
      lat: lat,
      lng: lng,
      distanceKm: match.distanceKm,
      accuracy: extra.accuracy
    });
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
    if (!loc || loc.isDefault || loc.source === "default") {
      return "Using default region: " + formatRegionLabel(loc);
    }
    if (loc.source === "geo") {
      var line = "Near " + loc.name + ", " + (loc.stateCode || loc.state);
      if (loc.distanceKm > 0) {
        line += " (~" + loc.distanceKm + " km)";
      }
      if (loc.lat != null && loc.lng != null) {
        line += " · " + formatCoords(loc.lat, loc.lng);
      }
      return line;
    }
    return loc.name + ", " + (loc.state || loc.stateCode);
  }

  function formatHeroMeta(loc, region, weekOf) {
    region = region || {};
    var weekPart = weekOf ? " · Week of " + weekOf : "";
    if (!loc || loc.isDefault || loc.source === "default") {
      return "Using default region: " + formatRegionLabel(loc) + weekPart + " · editorial content may not match your county until more bundles ship";
    }
    if (loc.source === "geo") {
      return "Near " + (loc.name || region.name) + ", " + (loc.stateCode || region.stateCode) + weekPart;
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
    } else if (loc.source === "geo") {
      statusHtml = "<strong>Near</strong> " + escapeHtml(loc.name) + ", " + escapeHtml(loc.stateCode);
      if (loc.distanceKm > 0) {
        statusHtml += ' <span class="wce-location-bar__dist">(~' + escapeHtml(String(loc.distanceKm)) + " km)</span>";
      }
      if (loc.lat != null && loc.lng != null) {
        statusHtml += ' <span class="wce-location-bar__coords">' + escapeHtml(formatCoords(loc.lat, loc.lng)) + "</span>";
      }
    } else {
      statusHtml = "<strong>Region:</strong> " + escapeHtml(loc.name) + ", " + escapeHtml(loc.state);
    }

    var bundleNote = "";
    if (loc.usingNearestBundle) {
      bundleNote = '<p class="wce-location-bar__note">Field guide content from nearest available bundle — editorial preview; more counties coming.</p>';
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
          '<label class="wds-location-search__label" for="wds-loc-change-input">Search county</label>' +
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
          var found = searchRegions(q, index);
          if (found) {
            handleChange(writeStored(resolveManual(found.id, index)));
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
            '<label class="wds-location-search__label" for="wds-loc-search">Or search a county</label>' +
            '<div class="wds-location-search__row">' +
              '<input class="wds-location-search__input" id="wds-loc-search" list="wds-loc-list" placeholder="e.g. Monroe County, PA" autocomplete="off">' +
              '<datalist id="wds-loc-list">' +
                (index.regions || []).map(function (r) {
                  return '<option value="' + escapeHtml(r.name + ", " + r.stateCode) + '">';
                }).join("") +
              "</datalist>" +
              '<button type="submit" class="wds-btn wds-btn--ghost wds-btn--sm">Set</button>' +
            "</div>" +
          "</form>" +
          '<p class="wds-caption wds-location-prompt__status" id="wds-loc-status" aria-live="polite"></p>' +
        "</div>" +
      "</div>";

    var status = mount.querySelector("#wds-loc-status");

    function finish(state) {
      writeStored(state);
      mount.innerHTML = "";
      onComplete(state);
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
          fail(geolocationErrorMessage(err, index));
        });
    });

    mount.querySelector("#wds-loc-default").addEventListener("click", function () {
      finish(defaultState(index));
    });

    mount.querySelector("#wds-loc-search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (mount.querySelector("#wds-loc-search").value || "").trim();
      if (!q) return;
      var found = searchRegions(q, index);
      if (found) {
        finish(resolveManual(found.id, index));
      } else {
        fail("County not found — try Monroe County, PA or use your location.");
      }
    });
  }

  function bootstrap(options) {
    options = options || {};
    var base = options.base || "design-system/content-engine/";
    var promptMount = options.promptMount || document.getElementById("wds-location-prompt");

    return loadIndex(base).then(function (index) {
      var stored = readStored();
      if (stored && stored.regionId) {
        currentState = stored;
        return stored;
      }

      if (options.skipPrompt) {
        var skipped = defaultState(index);
        writeStored(skipped, { silent: true });
        return skipped;
      }

      return new Promise(function (resolve) {
        renderPrompt(promptMount, index, resolve);
      });
    }).catch(function () {
      return loadIndex(base).then(function (index) {
        var fallback = defaultState(index);
        writeStored(fallback, { silent: true });
        return fallback;
      });
    });
  }

  function applyToBundle(bundle, loc) {
    if (!bundle || !loc) return bundle;
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
      return getGeolocation()
        .then(function (coords) {
          return writeStored(resolveFromCoords(coords.lat, coords.lng, index, { accuracy: coords.accuracy }));
        })
        .catch(function (err) {
          var state = defaultState(index);
          state.geoDenied = true;
          state.geoError = geolocationErrorMessage(err, index);
          return writeStored(state);
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
