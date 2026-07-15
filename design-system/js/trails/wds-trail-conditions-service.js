/**
 * Trail conditions — nearby hiking trails via OpenStreetMap Overpass API.
 * No API key. Provisional geometry; verify on the ground.
 */
(function (global) {
  "use strict";

  var CACHE = {};
  var CACHE_MS = 30 * 60 * 1000;
  var CACHE_VERSION = 1;
  var REQUEST_TIMEOUT_MS = 50000;
  var MAX_RETRIES = 1;
  var MAX_RADIUS_KM = 32;
  var MAX_TRAILS = 8;
  var OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];

  function cacheKey(lat, lng) {
    return CACHE_VERSION + ":" + Number(lat).toFixed(3) + "," + Number(lng).toFixed(3);
  }

  function clearCache() {
    CACHE = {};
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

  function miles(km) {
    return km * 0.621371;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error("Overpass request timed out"));
      }, ms);
      promise.then(function (v) {
        clearTimeout(timer);
        resolve(v);
      }).catch(function (e) {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  function overpassQuery(lat, lng) {
    var radius = Math.round(MAX_RADIUS_KM * 1000);
    return (
      "[out:json][timeout:15];" +
      "relation[\"route\"=\"hiking\"][\"name\"](around:" + radius + "," + lat + "," + lng + ");" +
      "out center tags;"
    );
  }

  function photonFeatures(lat, lng) {
    var url = "https://photon.komoot.io/api/?lat=" + encodeURIComponent(lat) +
      "&lon=" + encodeURIComponent(lng) + "&radius=30&limit=8&q=waterfall";
    return fetch(url, { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) return { waterfalls: [], viewpoints: [] };
        return res.json();
      })
      .then(function (data) {
        var features = (data && data.features) || [];
        var waterfalls = [];
        var viewpoints = [];
        features.forEach(function (f) {
          var p = f.properties || {};
          var coords = f.geometry && f.geometry.coordinates;
          if (!coords || !p.name) return;
          var distKm = distanceKm(lat, lng, coords[1], coords[0]);
          var item = {
            id: "photon/" + (p.osm_id || p.name),
            kind: p.osm_value === "viewpoint" ? "viewpoint" : "waterfall",
            name: p.name,
            lat: coords[1],
            lng: coords[0],
            distanceKm: Math.round(distKm * 10) / 10,
            distanceMi: Math.round(miles(distKm) * 10) / 10
          };
          if (/waterfall/i.test(p.name) || p.osm_value === "waterfall") waterfalls.push(item);
          else if (p.osm_value === "viewpoint") viewpoints.push(item);
        });
        return { waterfalls: waterfalls.slice(0, 5), viewpoints: viewpoints.slice(0, 5) };
      })
      .catch(function () { return { waterfalls: [], viewpoints: [] }; });
  }

  function parseLength(tags) {
    if (!tags) return null;
    if (tags.distance != null && isFinite(Number(tags.distance))) {
      return Number(tags.distance) * 1000;
    }
    if (tags.length != null && isFinite(Number(tags.length))) {
      var n = Number(tags.length);
      return n < 50 ? n * 1000 : n;
    }
    return null;
  }

  function parseAscent(tags) {
    if (!tags) return null;
    if (tags.ascent != null && isFinite(Number(tags.ascent))) return Number(tags.ascent);
    if (tags.ele_gain != null && isFinite(Number(tags.ele_gain))) return Number(tags.ele_gain);
    return null;
  }

  function sacToDifficulty(sac) {
    if (!sac) return null;
    var map = {
      hiking: "Easy",
      mountain_hiking: "Moderate",
      demanding_mountain_hiking: "Hard",
      alpine_hiking: "Expert",
      difficult_alpine_hiking: "Expert"
    };
    return map[sac] || sac.replace(/_/g, " ");
  }

  function yesNoLabel(val, yesText, noText, unknownText) {
    if (val == null || val === "") return unknownText || null;
    var v = String(val).toLowerCase();
    if (v === "yes" || v === "designated" || v === "permissive") return yesText || "Yes";
    if (v === "no" || v === "private") return noText || "No";
    if (v === "limited") return "Limited";
    return val;
  }

  function estimateHikeTime(lengthM, ascentM) {
    if (lengthM == null || lengthM <= 0) return null;
    var hours = (lengthM / 1000) / 4.8;
    if (ascentM != null && ascentM > 0) hours += ascentM / 600;
    var mins = Math.round(hours * 60);
    if (mins < 60) return mins + " min";
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return m ? h + "h " + m + "m" : h + "h";
  }

  function centerOf(el) {
    if (el.center && isFinite(el.center.lat)) {
      return { lat: Number(el.center.lat), lng: Number(el.center.lon) };
    }
    if (el.lat != null && el.lon != null) {
      return { lat: Number(el.lat), lng: Number(el.lon) };
    }
    return null;
  }

  function parseTrailElement(el, userLat, userLng) {
    var tags = el.tags || {};
    var name = tags.name || tags.ref;
    if (!name) return null;
    var c = centerOf(el);
    if (!c) return null;
    var distKm = distanceKm(userLat, userLng, c.lat, c.lng);
    if (distKm > MAX_RADIUS_KM) return null;
    var lengthM = parseLength(tags);
    var ascentM = parseAscent(tags);
    return {
      id: String(el.type) + "/" + String(el.id),
      name: name,
      osmType: el.type,
      osmId: el.id,
      lat: c.lat,
      lng: c.lng,
      distanceKm: Math.round(distKm * 10) / 10,
      distanceMi: Math.round(miles(distKm) * 10) / 10,
      lengthM: lengthM,
      lengthMi: lengthM != null ? Math.round(miles(lengthM / 1000) * 10) / 10 : null,
      elevationGainM: ascentM,
      elevationGainFt: ascentM != null ? Math.round(ascentM * 3.28084) : null,
      estimatedTime: estimateHikeTime(lengthM, ascentM),
      difficulty: sacToDifficulty(tags.sac_scale) || tags.hiking || tags.trail_visibility || null,
      surface: tags.surface || null,
      dogFriendly: yesNoLabel(tags.dog, "Dogs allowed", "No dogs", null),
      bikeFriendly: yesNoLabel(tags.bicycle, "Bikes allowed", "No bikes", null),
      wheelchair: yesNoLabel(tags.wheelchair, "Accessible", "Not accessible", null),
      operator: tags.operator || null,
      network: tags.network || null,
      source: "openstreetmap"
    };
  }

  function parseFeature(el, userLat, userLng, kind) {
    var tags = el.tags || {};
    var name = tags.name || (kind === "waterfall" ? "Waterfall" : "Viewpoint");
    var c = centerOf(el);
    if (!c) return null;
    var distKm = distanceKm(userLat, userLng, c.lat, c.lng);
    if (distKm > MAX_RADIUS_KM) return null;
    return {
      id: String(el.type) + "/" + String(el.id),
      kind: kind,
      name: name,
      lat: c.lat,
      lng: c.lng,
      distanceKm: Math.round(distKm * 10) / 10,
      distanceMi: Math.round(miles(distKm) * 10) / 10
    };
  }

  function dedupeTrails(trails) {
    var seen = Object.create(null);
    var out = [];
    trails.sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    trails.forEach(function (t) {
      var key = String(t.name).toLowerCase().replace(/\s+/g, " ").trim();
      if (seen[key]) return;
      seen[key] = true;
      out.push(t);
    });
    return out.slice(0, MAX_TRAILS);
  }

  function parseOverpass(data, userLat, userLng) {
    var elements = (data && data.elements) || [];
    var trails = [];
    var waterfalls = [];
    var viewpoints = [];
    elements.forEach(function (el) {
      var tags = el.tags || {};
      if (tags.natural === "waterfall") {
        var wf = parseFeature(el, userLat, userLng, "waterfall");
        if (wf) waterfalls.push(wf);
        return;
      }
      if (tags.tourism === "viewpoint") {
        var vp = parseFeature(el, userLat, userLng, "viewpoint");
        if (vp) viewpoints.push(vp);
        return;
      }
      if (tags.route === "hiking" || /^(path|footway|track)$/.test(tags.highway || "")) {
        var trail = parseTrailElement(el, userLat, userLng);
        if (trail) trails.push(trail);
      }
    });
    waterfalls.sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    viewpoints.sort(function (a, b) { return a.distanceKm - b.distanceKm; });
    return {
      trails: dedupeTrails(trails),
      waterfalls: waterfalls.slice(0, 5),
      viewpoints: viewpoints.slice(0, 5)
    };
  }

  function buildPackage(parsed, lat, lng, status, error, cached) {
    var pkg = {
      status: status,
      trails: parsed ? parsed.trails : [],
      waterfalls: parsed ? parsed.waterfalls : [],
      viewpoints: parsed ? parsed.viewpoints : [],
      trailCount: parsed ? parsed.trails.length : 0,
      provider: "openstreetmap-overpass",
      attribution: "© OpenStreetMap contributors",
      meta: {
        provider: "openstreetmap-overpass",
        attribution: "© OpenStreetMap contributors",
        fetchedAt: new Date().toISOString(),
        lat: lat,
        lng: lng,
        radiusKm: MAX_RADIUS_KM,
        cached: !!cached
      }
    };
    if (error) pkg.error = error;
    if (status === "live" && pkg.trailCount) {
      pkg.summary = pkg.trailCount + " named trail" + (pkg.trailCount === 1 ? "" : "s") + " within ~" + Math.round(miles(MAX_RADIUS_KM)) + " mi";
    } else if (status === "empty") {
      pkg.summary = "No named trails found within search radius";
    } else if (status === "unavailable") {
      pkg.summary = "Trail lookup unavailable";
    }
    return pkg;
  }

  function fetchOverpass(lat, lng, attempt, endpointIndex) {
    attempt = attempt || 0;
    endpointIndex = endpointIndex != null ? endpointIndex : 0;
    var query = overpassQuery(lat, lng);
    var base = OVERPASS_ENDPOINTS[endpointIndex] || OVERPASS_ENDPOINTS[0];
    var url = base + "?data=" + encodeURIComponent(query);
    return withTimeout(
      fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "WaypointStudio/1.0 (trail-conditions; contact@waypointstudio.org)"
        }
      }),
      REQUEST_TIMEOUT_MS
    ).then(function (res) {
      if (!res.ok) throw new Error("Overpass HTTP " + res.status);
      return res.text().then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error("Overpass returned non-JSON response");
        }
      });
    }).catch(function (err) {
      if (endpointIndex + 1 < OVERPASS_ENDPOINTS.length) {
        return fetchOverpass(lat, lng, attempt, endpointIndex + 1);
      }
      if (attempt < MAX_RETRIES) {
        return new Promise(function (r) { setTimeout(r, 500); }).then(function () {
          return fetchOverpass(lat, lng, attempt + 1, 0);
        });
      }
      throw err;
    });
  }

  function fetchNearby(request) {
    request = request || {};
    var lat = Number(request.lat);
    var lng = Number(request.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      return Promise.reject(new Error("WDS.trailConditions.fetchNearby requires coordinates"));
    }

    var key = cacheKey(lat, lng);
    var hit = CACHE[key];
    if (hit && Date.now() - hit.at < CACHE_MS) {
      var cachedPkg = Object.assign({}, hit.data, {
        meta: Object.assign({}, hit.data.meta, { cached: true, cacheAgeMs: Date.now() - hit.at })
      });
      return Promise.resolve(cachedPkg);
    }

    return fetchOverpass(lat, lng, 0).then(function (data) {
      var parsed = parseOverpass(data, lat, lng);
      return photonFeatures(lat, lng).then(function (extra) {
        parsed.waterfalls = (parsed.waterfalls || []).concat(extra.waterfalls || []).slice(0, 5);
        parsed.viewpoints = (parsed.viewpoints || []).concat(extra.viewpoints || []).slice(0, 5);
        var status = parsed.trails.length ? "live" : "empty";
        var pkg = buildPackage(parsed, lat, lng, status, null, false);
        CACHE[key] = { at: Date.now(), data: pkg };
        return pkg;
      });
    }).catch(function (err) {
      if (hit && hit.data) {
        return Object.assign({}, hit.data, {
          meta: Object.assign({}, hit.data.meta, {
            cached: true,
            stale: true,
            cacheAgeMs: Date.now() - hit.at,
            lastError: err && err.message ? err.message : "fetch failed"
          })
        });
      }
      return buildPackage(null, lat, lng, "unavailable", err && err.message ? err.message : "fetch failed", false);
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.trailConditions = {
    fetchNearby: fetchNearby,
    clearCache: clearCache,
    MAX_RADIUS_KM: MAX_RADIUS_KM,
    MAX_TRAILS: MAX_TRAILS,
    distanceKm: distanceKm,
    miles: miles
  };
})(window);
