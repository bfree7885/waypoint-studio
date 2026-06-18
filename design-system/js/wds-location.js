/**
 * Waypoint Studio — regional location (browser geolocation, no external APIs)
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "wds-location-v1";
  var PROMPT_KEY = "wds-location-prompted";
  var DEFAULT_REGION_ID = "pike-county-pa";

  var indexCache = null;
  var currentState = null;

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

  function writeStored(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(PROMPT_KEY, "1");
    } catch (e) { /* private mode */ }
    currentState = state;
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
    var bundleId = region.contentBundle || region.id || DEFAULT_REGION_ID;
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
      weather: region.weather || null,
      seasonNote: region.seasonNote || null,
      distanceKm: extra.distanceKm != null ? Math.round(extra.distanceKm) : 0,
      isDefault: source === "default",
      usingNearestBundle: bundleId !== region.id,
      timestamp: Date.now()
    };
  }

  function defaultState(index) {
    var region = findRegionById(index, index.defaultRegionId || DEFAULT_REGION_ID);
    if (!region) region = index.regions[0];
    return buildState("default", region, { lat: region.lat, lng: region.lng, distanceKm: 0 });
  }

  function resolveManual(regionId, index) {
    var region = findRegionById(index, regionId);
    if (!region) return defaultState(index);
    return buildState("manual", region, { lat: region.lat, lng: region.lng, distanceKm: 0 });
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

  function resolveFromCoords(lat, lng, index) {
    var match = nearestRegion(index, lat, lng);
    if (!match.region) return defaultState(index);
    return buildState("geo", match.region, {
      lat: lat,
      lng: lng,
      distanceKm: match.distanceKm
    });
  }

  function getState() {
    if (currentState) return currentState;
    currentState = readStored();
    return currentState;
  }

  function renderPrompt(mount, index, onComplete) {
    if (!mount) {
      onComplete(null);
      return;
    }
    mount.innerHTML =
      '<div class="wds-location-prompt" role="dialog" aria-labelledby="wds-loc-title" aria-modal="true">' +
        '<div class="wds-location-prompt__card">' +
          '<p class="wds-eyebrow">Your region</p>' +
          '<h2 class="wds-location-prompt__title" id="wds-loc-title">Where are you exploring this week?</h2>' +
          '<p class="wds-body">Waypoint adapts the outdoor dashboard to your area — weather, season timing, and maps. Location stays on your device unless you choose to share observations later.</p>' +
          '<div class="wds-location-prompt__actions">' +
            '<button type="button" class="wds-btn wds-btn--primary" id="wds-loc-allow">Use my location</button>' +
            '<button type="button" class="wds-btn wds-btn--secondary" id="wds-loc-default">Use Pike County, PA</button>' +
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
          finish(resolveFromCoords(coords.lat, coords.lng, index));
        })
        .catch(function () {
          fail("Could not get location — using Pike County, PA.");
          setTimeout(function () { finish(defaultState(index)); }, 1200);
        });
    });

    mount.querySelector("#wds-loc-default").addEventListener("click", function () {
      finish(defaultState(index));
    });

    mount.querySelector("#wds-loc-search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (mount.querySelector("#wds-loc-search").value || "").toLowerCase().trim();
      if (!q) return;
      var found = (index.regions || []).find(function (r) {
        var label = (r.name + ", " + r.stateCode).toLowerCase();
        var label2 = (r.name + ", " + r.state).toLowerCase();
        return label === q || label2 === q || r.name.toLowerCase() === q;
      });
      if (!found) {
        found = (index.regions || []).find(function (r) {
          return r.name.toLowerCase().indexOf(q) !== -1 || q.indexOf(r.name.toLowerCase()) !== -1;
        });
      }
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

      var prompted = false;
      try { prompted = !!localStorage.getItem(PROMPT_KEY); } catch (e) { /* ignore */ }

      if (prompted || options.skipPrompt) {
        var state = defaultState(index);
        writeStored(state);
        return state;
      }

      return new Promise(function (resolve) {
        renderPrompt(promptMount, index, resolve);
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
      var state = resolveManual(regionId, index);
      writeStored(state);
      return state;
    });
  }

  function requestGeolocationAndSave(base) {
    return loadIndex(base).then(function (index) {
      return getGeolocation()
        .then(function (coords) {
          var state = resolveFromCoords(coords.lat, coords.lng, index);
          writeStored(state);
          return state;
        })
        .catch(function () {
          var state = defaultState(index);
          writeStored(state);
          return state;
        });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.location = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_REGION_ID: DEFAULT_REGION_ID,
    loadIndex: loadIndex,
    bootstrap: bootstrap,
    getState: getState,
    readStored: readStored,
    writeStored: writeStored,
    defaultState: defaultState,
    resolveFromCoords: resolveFromCoords,
    resolveManual: resolveManual,
    getGeolocation: getGeolocation,
    applyToBundle: applyToBundle,
    changeRegion: changeRegion,
    requestGeolocationAndSave: requestGeolocationAndSave,
    nearestRegion: nearestRegion,
    findRegionById: findRegionById
  };
})(window);
