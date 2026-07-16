/**
 * Sheds Field Map — full-screen field experience (V1).
 * Map-first outdoor shell: floating controls, bottom sheet, GPS focus.
 */
(function () {
  "use strict";

  var Store = window.WaypointShedsObservations;
  var Model = window.WaypointShedsLikelihood;
  var Bio = window.WaypointShedsBiological;
  var Heat = window.WaypointShedsHeat;
  var Sessions = window.WaypointShedsSessions;
  var Planner = window.WaypointShedsPlanner;
  var Presets = window.WaypointShedsPresets;
  var Validation = window.WaypointShedsValidation;

  var NEUTRAL = { lat: 44.5, lng: -92.5, zoom: 6 }; // Midwest overview — not “you”
  var GRID_ROWS = 18;
  var GRID_COLS = 18;
  var COARSE_ROWS = 10;
  var COARSE_COLS = 10;
  var SPECIES_LABEL = "Whitetail deer";
  var DEFAULT_HEAT_OPACITY = 0.42;

  var state = {
    locationStatus: "idle",
    userLatLng: null,
    accuracyM: null,
    headingDeg: null,
    watchId: null,
    prefs: null,
    filterTypes: null,
    elevCache: null,
    elevKey: "",
    weather: null,
    recomputeTimer: null,
    recomputeGen: 0,
    firstEthicsShown: false,
    tracking: false,
    activeSessionId: null,
    lastPlan: null,
    lastGrid: null,
    lastPerf: {},
    offlineForced: false,
    followUser: true,
    planExpanded: false,
    lastClickAt: 0,
    lastFocusEl: null
  };

  var els = {};
  var map, heatLayer, userMarker, accuracyCircle, headingLine, obsLayer, clickLatLng;
  var trackLayer, coverageLayer, planLayer, recMarker, trackLine;

  function $(id) { return document.getElementById(id); }

  function setLocStatus(code, detail) {
    state.locationStatus = code;
    var label = {
      idle: "Tap Locate",
      finding: "Finding…",
      available: "Located",
      denied: "Location denied",
      unavailable: "Location unavailable",
      timeout: "Location timed out",
      last: "Saved map view",
      manual: "Exploring manually",
      neutral: "Overview (not your location)"
    }[code] || code;
    if (els.locStatus) {
      els.locStatus.textContent = detail ? label + " · " + detail : label;
      els.locStatus.dataset.state = code;
      els.locStatus.title = detail ? label + " — " + detail : label;
    }
    var dot = $("nav-dot");
    if (dot) {
      var dotState = state.tracking ? "tracking" : code;
      dot.dataset.state = dotState;
    }
    updateNavMeta();
    syncRecenterBtn();
  }

  function syncRecenterBtn() {
    var btn = $("btn-recenter");
    if (!btn) return;
    var show = !!(state.userLatLng && !state.followUser);
    btn.hidden = !show;
  }

  function setFabLabel(btn, label) {
    if (!btn) return;
    var span = btn.querySelector(".sheds-fab__label");
    if (span) span.textContent = label;
    else btn.textContent = label;
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  function confidenceStars(coverage, band) {
    var level = (coverage && coverage.level) || "limited";
    var n = level === "strong" ? 4 : level === "moderate" ? 3 : 2;
    if (band === "higher") n = Math.min(5, n + 1);
    if (band === "lower") n = Math.max(1, n - 1);
    var out = "";
    for (var i = 0; i < 5; i++) out += i < n ? "★" : "☆";
    return out;
  }

  function updateNavMeta() {
    var meta = $("nav-meta");
    var accEl = $("nav-accuracy");
    var headEl = $("nav-heading");
    var targetEl = $("nav-to-target");
    if (!meta) return;
    var bits = 0;
    if (accEl) {
      if (state.accuracyM != null && isFinite(state.accuracyM)) {
        accEl.textContent = "±" + Math.round(state.accuracyM) + " m";
        bits++;
      } else accEl.textContent = "";
    }
    if (headEl) {
      if (state.headingDeg != null && isFinite(state.headingDeg)) {
        var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        var ix = Math.round(((state.headingDeg % 360) / 45)) % 8;
        headEl.textContent = dirs[ix] + " " + Math.round(state.headingDeg) + "°";
        bits++;
      } else headEl.textContent = "";
    }
    if (targetEl) {
      var plan = state.lastPlan && state.lastPlan.recommendation;
      if (plan && state.userLatLng && Planner && Planner.formatDistance) {
        var dist = plan.distanceM;
        if (dist == null && typeof L !== "undefined") {
          dist = state.userLatLng.distanceTo(L.latLng(plan.lat, plan.lng));
        }
        var dir = plan.bearingLabel || "";
        targetEl.textContent = dist != null
          ? ("Target " + (dir ? dir + " · " : "") + Planner.formatDistance(dist))
          : "";
        if (targetEl.textContent) bits++;
      } else targetEl.textContent = "";
    }
    meta.hidden = bits === 0;
  }

  function upsertUserMarker(ll, accuracyM, headingDeg) {
    if (!map || !ll) return;
    if (!userMarker) {
      userMarker = L.circleMarker(ll, {
        radius: 9,
        color: "#0a1410",
        weight: 2,
        fillColor: "#d4e85a",
        fillOpacity: 0.98,
        className: "sheds-user-pulse"
      }).addTo(map);
      userMarker.bindTooltip("You (approximate)", { direction: "top" });
    } else {
      userMarker.setLatLng(ll);
    }
    if (accuracyM != null && isFinite(accuracyM) && accuracyM > 0 && accuracyM < 5000) {
      if (!accuracyCircle) {
        accuracyCircle = L.circle(ll, {
          radius: accuracyM,
          color: "#7eb6ff",
          weight: 1,
          fillColor: "#7eb6ff",
          fillOpacity: 0.12,
          interactive: false
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(ll);
        accuracyCircle.setRadius(accuracyM);
      }
    }
    if (headingLine) {
      map.removeLayer(headingLine);
      headingLine = null;
    }
    if (headingDeg != null && isFinite(headingDeg) && state.userLatLng) {
      var rad = (headingDeg * Math.PI) / 180;
      var len = 0.00045;
      var tip = L.latLng(
        ll.lat + Math.cos(rad) * len,
        ll.lng + (Math.sin(rad) * len) / Math.cos((ll.lat * Math.PI) / 180)
      );
      headingLine = L.polyline([ll, tip], {
        color: "#d4e85a",
        weight: 3,
        opacity: 0.9,
        interactive: false
      }).addTo(map);
    }
  }

  function setMapLoading(done) {
    var el = $("map-loading");
    var shell = $("sheds-map-shell");
    if (el) {
      if (done) {
        el.classList.add("is-done");
        el.setAttribute("hidden", "");
      } else {
        el.classList.remove("is-done");
        el.removeAttribute("hidden");
      }
    }
    if (shell) shell.setAttribute("aria-busy", done ? "false" : "true");
  }

  function syncOfflineBanner() {
    var el = $("map-offline");
    if (!el) return;
    if (navigator.onLine === false) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function invalidateMapSize() {
    if (!map) return;
    setTimeout(function () {
      try { map.invalidateSize({ animate: false }); } catch (e) { /* */ }
    }, 40);
    setTimeout(function () {
      try { map.invalidateSize({ animate: false }); } catch (e) { /* */ }
    }, 220);
  }

  function forceMapLayout(opts) {
    if (!map) return;
    opts = opts || {};
    try {
      map.invalidateSize({ animate: false, pan: false });
      if (opts.resetView) {
        var c = map.getCenter();
        var z = map.getZoom();
        if (c) map.setView(c, z, { animate: false });
      }
    } catch (e) { /* */ }
  }

  function initMap() {
    map = L.map("sheds-map", {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 17,
      minZoom: 3,
      fadeAnimation: false,
      zoomAnimation: !!(window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
      updateWhenIdle: false,
      keepBuffer: 3
    });
    var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution:
        "Map data: &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, " +
        "<a href=\"http://viewfinderpanoramas.org\">SRTM</a> | " +
        "Map style: &copy; <a href=\"https://opentopomap.org\">OpenTopoMap</a> " +
        "(<a href=\"https://creativecommons.org/licenses/by-sa/3.0/\">CC-BY-SA</a>)",
      updateWhenIdle: false,
      keepBuffer: 2
    });
    // OSM fills reliably at overview; switch to Topo via Layers for field contours
    osm.addTo(map);
    L.control.layers(
      { "Street (reliable)": osm, "Topographic (OpenTopoMap)": topo },
      null,
      { position: "topright", collapsed: true }
    ).addTo(map);

    var firstTile = false;
    osm.on("load", function () {
      if (!firstTile) {
        firstTile = true;
        setMapLoading(true);
        forceMapLayout();
      }
    });

    obsLayer = L.layerGroup().addTo(map);
    coverageLayer = L.layerGroup().addTo(map);
    trackLayer = L.layerGroup().addTo(map);
    planLayer = L.layerGroup().addTo(map);

    var saved = Store.loadMapView();
    var start = saved
      ? [saved.lat, saved.lng, saved.zoom]
      : [NEUTRAL.lat, NEUTRAL.lng, NEUTRAL.zoom];
    // Size sync BEFORE first view so tile pixel origin matches the full-screen shell
    map.invalidateSize({ animate: false });
    map.setView([start[0], start[1]], start[2], { animate: false });
    if (saved) setLocStatus("last", "saved view");
    else setLocStatus("neutral");

    // Heat layer is created lazily on first recompute so basemap tiles win the first paint
    heatLayer = null;

    map.whenReady(function () {
      forceMapLayout({ resetView: true });
      invalidateMapSize();
    });
    [100, 400, 1000].forEach(function (ms) {
      setTimeout(function () { forceMapLayout(); }, ms);
    });
    setTimeout(function () { forceMapLayout({ resetView: true }); setMapLoading(true); }, 1800);

    map.on("dragstart", function () {
      state.followUser = false;
      syncRecenterBtn();
    });

    map.on("moveend", function () {
      Store.saveMapView({
        lat: map.getCenter().lat,
        lng: map.getCenter().lng,
        zoom: map.getZoom()
      });
      scheduleRecompute(450);
    });

    map.on("click", function (e) {
      if (document.querySelector(".sheds-sheet.is-open")) return;
      var now = Date.now();
      if (now - state.lastClickAt < 450) return;
      state.lastClickAt = now;
      openNewObservation(e.latlng);
    });

    map.whenReady(function () {
      document.getElementById("sheds-map-shell").removeAttribute("aria-busy");
      scheduleRecompute(200);
      invalidateMapSize();
      setTimeout(invalidateMapSize, 400);
      setTimeout(invalidateMapSize, 1200);
    });

    window.addEventListener("resize", function () {
      forceMapLayout();
      invalidateMapSize();
    });
    window.addEventListener("orientationchange", function () {
      setTimeout(forceMapLayout, 200);
      invalidateMapSize();
    });
  }

  function markerHtml(type) {
    var meta = Store.typeMeta(type);
    var letter = (meta.marker || "o").charAt(0).toUpperCase();
    return "<span class=\"sheds-marker sheds-marker--" + meta.marker + "\" title=\"" + meta.label + "\">" + letter + "</span>";
  }

  function refreshObservations() {
    obsLayer.clearLayers();
    if (!state.prefs.obsVisible) return;
    var all = Store.list();
    var filter = state.filterTypes;
    all.forEach(function (obs) {
      if (filter && filter.size && !filter.has(obs.type)) return;
      var icon = L.divIcon({
        className: "sheds-div-icon",
        html: markerHtml(obs.type),
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      var m = L.marker([obs.location.lat, obs.location.lng], { icon: icon });
      m.on("click", function (ev) {
        L.DomEvent.stopPropagation(ev);
        openViewObservation(obs.id);
      });
      obsLayer.addLayer(m);
    });
    updateObsCount(all.length);
  }

  function updateObsCount(n) {
    if (els.obsCount) els.obsCount.textContent = String(n) + " private observation" + (n === 1 ? "" : "s");
  }

  function scheduleRecompute(ms) {
    clearTimeout(state.recomputeTimer);
    state.recomputeTimer = setTimeout(recomputeHeat, ms || 300);
  }

  function elevCacheKey(bounds) {
    return [
      bounds.getWest().toFixed(3),
      bounds.getSouth().toFixed(3),
      bounds.getEast().toFixed(3),
      bounds.getNorth().toFixed(3),
      GRID_ROWS,
      GRID_COLS
    ].join("|");
  }

  function fetchElevations(bounds) {
    var key = elevCacheKey(bounds);
    if (state.elevKey === key && state.elevCache) {
      return Promise.resolve(state.elevCache);
    }
    var west = bounds.getWest();
    var east = bounds.getEast();
    var south = bounds.getSouth();
    var north = bounds.getNorth();
    var lats = [];
    var lngs = [];
    var r, c;
    for (r = 0; r < GRID_ROWS; r++) {
      for (c = 0; c < GRID_COLS; c++) {
        lats.push(north - (r + 0.5) * (north - south) / GRID_ROWS);
        lngs.push(west + (c + 0.5) * (east - west) / GRID_COLS);
      }
    }
    // Chunk Open-Meteo elevation requests
    var chunks = [];
    var size = 80;
    var i;
    for (i = 0; i < lats.length; i += size) {
      chunks.push({
        lat: lats.slice(i, i + size),
        lng: lngs.slice(i, i + size)
      });
    }
    setModelCoverageNote("Updating elevation samples…");
    return chunks.reduce(function (chain, ch) {
      return chain.then(function (acc) {
        var url = "https://api.open-meteo.com/v1/elevation?latitude=" +
          ch.lat.map(function (n) { return n.toFixed(5); }).join(",") +
          "&longitude=" + ch.lng.map(function (n) { return n.toFixed(5); }).join(",");
        return fetch(url, { credentials: "omit" }).then(function (res) {
          if (!res.ok) throw new Error("elevation " + res.status);
          return res.json();
        }).then(function (data) {
          var elev = data.elevation || [];
          return acc.concat(elev);
        });
      });
    }, Promise.resolve([])).then(function (allElev) {
      state.elevCache = allElev;
      state.elevKey = key;
      return allElev;
    }).catch(function () {
      state.elevCache = null;
      state.elevKey = "";
      return null;
    });
  }

  function fetchWeatherSoft(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return Promise.resolve(null);
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(4) +
      "&longitude=" + lng.toFixed(4) +
      "&daily=snowfall_sum&current=temperature_2m,wind_speed_10m&timezone=auto&forecast_days=3";
    return fetch(url, { credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("wx");
      return res.json();
    }).then(function (data) {
      var snow = 0;
      if (data.daily && data.daily.snowfall_sum) {
        snow = data.daily.snowfall_sum.reduce(function (a, b) { return a + (b || 0); }, 0);
      }
      // Light snow can help visibility of sheds; deep snow can reduce walkability — soft factor only
      var influence = 1;
      if (snow > 25) influence = 0.7;
      else if (snow > 8) influence = 0.88;
      else if (snow > 0.5) influence = 1.05;
      var tempC = data.current && typeof data.current.temperature_2m === "number"
        ? data.current.temperature_2m : null;
      var windSpeedMs = data.current && typeof data.current.wind_speed_10m === "number"
        ? data.current.wind_speed_10m : null;
      return {
        snowInfluence: influence,
        snowMm: snow,
        tempC: tempC,
        windSpeedMs: windSpeedMs,
        source: "weather-provider"
      };
    }).catch(function () { return null; });
  }

  function modelStamp() {
    var center = map ? map.getCenter() : null;
    var lat = state.userLatLng ? state.userLatLng.lat : (center && center.lat);
    var region = Bio && Bio.regionalContext
      ? Bio.regionalContext(lat, center && center.lng, new Date())
      : null;
    return {
      modelVersion: Bio ? Bio.MODEL_VERSION : null,
      factorConfigVersion: Bio ? Bio.FACTOR_CONFIG_VERSION : null,
      activePreset: state.prefs && state.prefs.activePreset,
      regionalContext: region,
      dataCoverageSummary: state.lastGrid && state.lastGrid.coverage
        ? state.lastGrid.coverage.label
        : null,
      inputDataTimestamp: new Date().toISOString()
    };
  }

  function updateSeasonPill() {
    if (!els.seasonPill || !Bio) return;
    var center = map ? map.getCenter() : null;
    var lat = state.userLatLng ? state.userLatLng.lat : (center && center.lat) || 44;
    var season = Bio.seasonProfile(new Date(), lat, state.prefs || {});
    els.seasonPill.textContent = season.phase + (season.overridden ? " (adjusted)" : "");
    els.seasonPill.title = season.supportLine + " " + season.note;
    els.seasonPill.dataset.phase = season.phaseId;
  }

  function applyGridToUi(grid, meta) {
    meta = meta || {};
    state.lastGrid = grid;
    ensureHeatLayer();
    if (heatLayer) {
      heatLayer.setGrid(grid);
      if (heatLayer.setShowConfidence) heatLayer.setShowConfidence(!!state.prefs.showConfidence);
    }
    updateCoverageUi(grid.coverage);
    var mode = grid.cells[0] && grid.cells[0].result && grid.cells[0].result.inputMode;
    setModelCoverageNote(
      (meta.label || "Biological model v" + (Bio && Bio.MODEL_VERSION)) +
      " — " + grid.disclaimer +
      " Cells ~" + grid.cellMetersApprox + " m." +
      (mode ? " Input mode: " + mode + "." : "") +
      (meta.elevNote ? " " + meta.elevNote : "")
    );
    updateActiveInputsSummary(grid);
    refreshCoverageMarks();
    updatePlanner(grid);
    updateSeasonPill();
  }

  function buildContext(elev, rows, cols, cacheState) {
    return {
      date: new Date(),
      prefs: state.prefs,
      observations: Store.list(),
      elevations: elev,
      weather: state.offlineForced ? null : state.weather,
      sessions: Sessions,
      offlineForced: !!state.offlineForced,
      terrainCacheState: cacheState || (elev ? "cached-or-live" : "unavailable"),
      cellMetersApprox: null
    };
  }

  function recomputeHeat() {
    if (!map || !Model) return;
    var gen = ++state.recomputeGen;
    var t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    if (heatLayer) {
      heatLayer.setHeatVisible(!!state.prefs.heatVisible);
      heatLayer.setHeatOpacity(state.prefs.opacity);
    }
    var bounds = map.getBounds();
    if (map.getZoom() < 9) {
      setModelCoverageNote("Zoom in to compute a local search-priority surface.");
      if (heatLayer) {
        heatLayer.setGrid({ cells: [], bounds: { west: 0, east: 0, south: 0, north: 0 }, rows: 0, cols: 0 });
      }
      updateCoverageUi({ level: "limited", label: "Limited input coverage — zoom for local analysis" });
      updatePlanner(null);
      return;
    }

    // Coarse first pass — local observations + season, no elevation wait
    try {
      var coarse = Model.buildGrid(bounds, COARSE_ROWS, COARSE_COLS, buildContext(null, COARSE_ROWS, COARSE_COLS, "unavailable"));
      if (gen !== state.recomputeGen) return;
      applyGridToUi(coarse, {
        label: "Coarse heat (limited terrain)",
        elevNote: "Refining with elevation when available…"
      });
      state.lastPerf.coarseMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
    } catch (e) {
      console.error("sheds coarse heat", e);
    }

    var center = map.getCenter();
    Promise.all([
      state.offlineForced ? Promise.resolve(null) : fetchElevations(bounds),
      state.offlineForced ? Promise.resolve(null)
        : (state.weather ? Promise.resolve(state.weather) : fetchWeatherSoft(center.lat, center.lng))
    ]).then(function (pair) {
      if (gen !== state.recomputeGen) return;
      var elev = pair[0];
      if (pair[1]) state.weather = pair[1];
      var t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      var grid = Model.buildGrid(bounds, GRID_ROWS, GRID_COLS, buildContext(elev, GRID_ROWS, GRID_COLS, elev ? "live-or-cached" : "unavailable"));
      if (gen !== state.recomputeGen) return;
      applyGridToUi(grid, {
        label: "Refined biological heat",
        elevNote: "Elevation: " + (elev ? "sampled (Open-Meteo)" : "unavailable") + "."
      });
      state.lastPerf.refineMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t1;
      state.lastPerf.totalMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
    }).catch(function (err) {
      console.error("sheds refine heat", err);
    });
  }

  function refreshCoverageMarks() {
    if (!coverageLayer || !Sessions) return;
    coverageLayer.clearLayers();
    if (state.prefs && state.prefs.coverageVisible === false) return;
    Sessions.listCoverage().forEach(function (c) {
      var color = c.level === "thorough" ? "#888888"
        : c.level === "revisit" ? "#c8f055" : "#9b8fd9";
      var circle = L.circleMarker([c.lat, c.lng], {
        radius: c.level === "thorough" ? 7 : 5,
        color: "#0a1220",
        weight: 1,
        fillColor: color,
        fillOpacity: 0.55
      });
      circle.bindTooltip("Search mark: " + c.level, { direction: "top" });
      coverageLayer.addLayer(circle);
    });
  }

  function updatePlanner(grid) {
    if (!Planner || !els.planCard) return;
    var plan = Planner.plan({
      grid: grid,
      userLatLng: state.userLatLng ? { lat: state.userLatLng.lat, lng: state.userLatLng.lng } : {
        lat: map.getCenter().lat,
        lng: map.getCenter().lng
      },
      sessions: Sessions,
      observations: Store.list(),
      model: Model
    });
    state.lastPlan = plan;
    renderPlanCard(plan);
    drawPlanOnMap(plan);
  }

  function setPlanExpanded(open) {
    state.planExpanded = !!open;
    if (!els.planCard) return;
    els.planCard.dataset.expanded = state.planExpanded ? "true" : "false";
    if (els.planDetails) els.planDetails.hidden = !state.planExpanded;
    if (els.btnTogglePlan) {
      els.btnTogglePlan.setAttribute("aria-expanded", state.planExpanded ? "true" : "false");
    }
    document.documentElement.classList.toggle("sheds-sheet-open", state.planExpanded);
    invalidateMapSize();
  }

  function renderPlanCard(plan) {
    if (!els.planCard) return;
    var glance = els.planGlance || els.planBody;
    var stars = $("plan-stars");
    var stats = $("plan-stats");
    if (!plan || !plan.ok || !plan.recommendation) {
      if (els.planTitle) els.planTitle.textContent = "Today’s Search";
      var empty = (plan && plan.reason) || "Zoom in (≥9) and locate or pan to your land.";
      if (glance) glance.textContent = empty;
      if (els.planBody) els.planBody.textContent = "Pan and zoom to your land, then tap Locate. The priority surface builds locally for the visible area.";
      if (els.planWhy) els.planWhy.textContent = "";
      if (els.planMeta) els.planMeta.textContent = "";
      if (stars) {
        stars.textContent = "☆☆☆☆☆";
        stars.setAttribute("aria-label", "Confidence unavailable");
      }
      if (stats) stats.hidden = true;
      var actions = $("plan-actions") || document.querySelector(".sheds-plan__actions");
      if (actions) actions.hidden = true;
      var whyWrap = document.querySelector(".sheds-plan__why-wrap");
      if (whyWrap) whyWrap.hidden = true;
      els.planCard.setAttribute("aria-label", "No suggestion yet. " + empty);
      updateNavMeta();
      return;
    }
    var actionsOn = $("plan-actions") || document.querySelector(".sheds-plan__actions");
    if (actionsOn) actionsOn.hidden = false;
    var whyOn = document.querySelector(".sheds-plan__why-wrap");
    if (whyOn) whyOn.hidden = false;
    var r = plan.recommendation;
    if (els.planTitle) els.planTitle.textContent = "Today’s Search";
    var dist = r.distanceM != null && Planner ? Planner.formatDistance(r.distanceM) : "";
    var dir = r.bearingLabel || "";
    var glanceText = [dir, dist].filter(Boolean).join(" · ");
    if (!glanceText) glanceText = r.walkingHint || ("band " + r.band);
    if (glance) glance.textContent = glanceText;
    if (stars) {
      var starStr = confidenceStars(plan.coverage || (state.lastGrid && state.lastGrid.coverage), r.band);
      stars.textContent = starStr;
      stars.setAttribute("aria-label", "Confidence " + starStr.replace(/☆/g, "").length + " of 5");
    }
    if (stats) {
      stats.hidden = false;
      if ($("plan-stat-dir")) $("plan-stat-dir").textContent = dir || "—";
      if ($("plan-stat-dist")) $("plan-stat-dist").textContent = dist || "—";
      if ($("plan-stat-area")) $("plan-stat-area").textContent = "~" + r.suggestedRadiusM + " m";
      if ($("plan-stat-band")) $("plan-stat-band").textContent = r.band || "—";
    }
    if (els.planBody) {
      els.planBody.textContent = (r.walkingHint || glanceText) +
        " Priority: " + r.band + " (relative guidance, not certainty).";
    }
    if (els.planWhy) els.planWhy.textContent = r.explanation || "";
    var meta = [];
    if (dir) meta.push("Direction " + dir);
    if (dist) meta.push(dist);
    meta.push("Search area ~" + r.suggestedRadiusM + " m");
    if (state.weather) {
      if (state.weather.snowMm != null) meta.push("Snow context ~" + state.weather.snowMm + " mm");
      if (state.weather.windSpeedMs != null) {
        meta.push("Wind ~" + Math.round(state.weather.windSpeedMs * 3.6) + " kph");
      }
    }
    if (plan.coverage) {
      meta.push(plan.coverage.searchedPercentLabel);
      var thoroughShare = plan.coverage.cellsInView
        ? Math.round((plan.coverage.thoroughCells / plan.coverage.cellsInView) * 100)
        : 0;
      meta.push("~" + thoroughShare + "% marked thorough in view");
    }
    if (plan.remainingHighCount != null) {
      meta.push(plan.remainingHighCount + " higher pockets still unmarked thorough");
    }
    if (els.planMeta) els.planMeta.textContent = meta.join(" · ");
    els.planCard.setAttribute(
      "aria-label",
      "Today’s search: " + glanceText + ". " + (r.explanation || "")
    );
    updateNavMeta();
  }

  function drawPlanOnMap(plan) {
    if (!planLayer) return;
    planLayer.clearLayers();
    recMarker = null;
    if (!plan || !plan.recommendation) return;
    var r = plan.recommendation;
    recMarker = L.circle([r.lat, r.lng], {
      radius: r.suggestedRadiusM,
      color: "#d4e85a",
      weight: 2,
      fillColor: "#d4e85a",
      fillOpacity: 0.1
    }).addTo(planLayer);
    L.circleMarker([r.lat, r.lng], {
      radius: 7,
      color: "#0a1410",
      weight: 2,
      fillColor: "#d4e85a",
      fillOpacity: 1
    }).bindTooltip("Suggested next search", { permanent: false }).addTo(planLayer);
    if (state.userLatLng) {
      L.polyline([
        [state.userLatLng.lat, state.userLatLng.lng],
        [r.lat, r.lng]
      ], { color: "#d4e85a", weight: 2, dashArray: "6 8", opacity: 0.85 }).addTo(planLayer);
    }
  }

  function redrawTrack(session) {
    if (!trackLayer) return;
    trackLayer.clearLayers();
    trackLine = null;
    if (!session || !session.path || session.path.length < 2) return;
    var latlngs = session.path.map(function (p) { return [p.lat, p.lng]; });
    trackLine = L.polyline(latlngs, { color: "#7eb6ff", weight: 4, opacity: 0.85 }).addTo(trackLayer);
  }

  function startTracking() {
    if (!Sessions || !navigator.geolocation) {
      setLocStatus("unavailable", "cannot track without geolocation");
      return;
    }
    var stamp = modelStamp();
    var session = Sessions.startSession({
      speciesId: Store.SPECIES_WHITETAIL,
      weatherSummary: state.weather ? { snowMm: state.weather.snowMm, source: state.weather.source } : null,
      modelVersion: stamp.modelVersion,
      factorConfigVersion: stamp.factorConfigVersion,
      activePreset: stamp.activePreset,
      regionalContext: stamp.regionalContext,
      dataCoverageSummary: stamp.dataCoverageSummary,
      inputDataTimestamp: stamp.inputDataTimestamp
    });
    state.activeSessionId = session.id;
    state.tracking = true;
    redrawTrack(session);
    if (els.btnTrack) {
      setFabLabel(els.btnTrack, "Stop");
      els.btnTrack.setAttribute("aria-pressed", "true");
    }
    if (els.sessionPill) {
      els.sessionPill.textContent = "Tracking · " + Math.round(session.distanceM || 0) + " m";
      els.sessionPill.dataset.state = "available";
    }
    var navDot = $("nav-dot");
    if (navDot) navDot.dataset.state = "tracking";
    if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = navigator.geolocation.watchPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      state.userLatLng = L.latLng(lat, lng);
      state.accuracyM = pos.coords.accuracy;
      if (pos.coords.heading != null && !isNaN(pos.coords.heading)) state.headingDeg = pos.coords.heading;
      setLocStatus("available", "tracking");
      upsertUserMarker(state.userLatLng, state.accuracyM, state.headingDeg);
      var updated = Sessions.appendTrackPoint(state.activeSessionId, lat, lng, Date.now());
      redrawTrack(updated);
      if (els.sessionPill && updated) {
        els.sessionPill.textContent = "Tracking · " + Math.round(updated.distanceM || 0) + " m";
      }
      scheduleRecompute(800);
    }, function (err) {
      if (err && err.code === 1) setLocStatus("denied", "tracking stopped");
      else setLocStatus("unavailable", "tracking error");
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function stopTracking() {
    if (state.watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
    }
    state.tracking = false;
    if (state.activeSessionId && Sessions) {
      var noteEl = $("session-note");
      Sessions.endSession(state.activeSessionId, {
        notes: noteEl ? String(noteEl.value || "").trim() : "",
        weatherSummary: state.weather ? { snowMm: state.weather.snowMm, source: state.weather.source } : null
      });
      if (noteEl) noteEl.value = "";
    }
    state.activeSessionId = null;
    if (els.btnTrack) {
      setFabLabel(els.btnTrack, "Track");
      els.btnTrack.setAttribute("aria-pressed", "false");
    }
    if (els.sessionPill) {
      els.sessionPill.textContent = "Not tracking";
      els.sessionPill.dataset.state = "manual";
    }
    scheduleRecompute(200);
  }

  function markCoverageAtUser(level) {
    var ll = state.userLatLng || (map && map.getCenter());
    if (!ll || !Sessions) return;
    var lat = typeof ll.lat === "function" ? ll.lat() : ll.lat;
    var lng = typeof ll.lng === "function" ? ll.lng() : ll.lng;
    Sessions.markCoverage(lat, lng, level, {
      sessionId: state.activeSessionId,
      source: "user"
    });
    refreshCoverageMarks();
    scheduleRecompute(100);
  }

  function ensureHeatLayer() {
    if (heatLayer || !map || !Heat) return heatLayer;
    heatLayer = Heat.createHeatLayer(map, {
      opacity: (state.prefs && state.prefs.opacity != null) ? state.prefs.opacity : DEFAULT_HEAT_OPACITY
    });
    if (state.prefs && heatLayer.setShowConfidence) {
      heatLayer.setShowConfidence(!!state.prefs.showConfidence);
    }
    return heatLayer;
  }

  function updateCoverageUi(coverage) {
    if (!els.coverage) return;
    els.coverage.textContent = coverage.label;
    els.coverage.dataset.level = coverage.level;
  }

  function setModelCoverageNote(text) {
    if (els.modelNote) els.modelNote.textContent = text;
  }

  function updateActiveInputsSummary(grid) {
    if (!els.inputsSummary) return;
    var bits = ["Species: " + SPECIES_LABEL];
    bits.push("Season: rule-based");
    bits.push("Terrain: " + (grid && state.elevCache ? "elevation-derived" : "unavailable"));
    bits.push("Observations: " + Store.list().length + " local");
    bits.push("Weather snow: " + (state.weather ? "provider" : "unavailable"));
    bits.push("Land cover: unavailable");
    els.inputsSummary.textContent = bits.join(" · ");
  }

  function locateUser(opts) {
    opts = opts || {};
    if (!navigator.geolocation) {
      setLocStatus("unavailable", "browser has no geolocation");
      return;
    }
    setLocStatus("finding");
    navigator.geolocation.getCurrentPosition(function (pos) {
      var ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      state.userLatLng = ll;
      state.accuracyM = pos.coords.accuracy;
      if (pos.coords.heading != null && !isNaN(pos.coords.heading)) state.headingDeg = pos.coords.heading;
      setLocStatus("available", state.accuracyM != null ? ("±" + Math.round(state.accuracyM) + " m") : "");
      upsertUserMarker(ll, state.accuracyM, state.headingDeg);
      if (opts.center !== false) {
        state.followUser = true;
        map.setView(ll, Math.max(map.getZoom(), 13), { animate: !document.documentElement.classList.contains("reduced-motion") });
        syncRecenterBtn();
      }
      fetchWeatherSoft(ll.lat, ll.lng).then(function (w) {
        state.weather = w;
        scheduleRecompute(100);
      });
      scheduleRecompute(100);
    }, function (err) {
      if (err && err.code === 1) setLocStatus("denied", "map stays usable — explore manually");
      else if (err && err.code === 3) setLocStatus("timeout", "try Locate again");
      else setLocStatus("unavailable");
      if (!Store.loadMapView()) setLocStatus(state.locationStatus === "denied" ? "denied" : "manual");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  /* —— Sheets —— */
  function openSheet(el) {
    if (!el) return;
    state.lastFocusEl = document.activeElement;
    closeAllSheets({ except: el });
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    var focusable = el.querySelector("button, [href], input, select, textarea");
    if (focusable) focusable.focus();
    if (els.btnMore) els.btnMore.setAttribute("aria-expanded", el === els.sheetTools ? "true" : "false");
    invalidateMapSize();
  }

  function closeSheet(el) {
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (els.btnMore && el === els.sheetTools) els.btnMore.setAttribute("aria-expanded", "false");
    if (state.lastFocusEl && typeof state.lastFocusEl.focus === "function") {
      try { state.lastFocusEl.focus(); } catch (e) { /* */ }
    }
    invalidateMapSize();
  }

  function closeAllSheets(opts) {
    opts = opts || {};
    [
      els.sheetObs,
      els.sheetControls,
      els.sheetExplain,
      els.sheetEthics,
      els.sheetHistory,
      els.sheetValidate,
      els.sheetTools
    ].forEach(function (s) {
      if (s && s !== opts.except) closeSheetQuiet(s);
    });
    if (els.btnMore && !opts.except) els.btnMore.setAttribute("aria-expanded", "false");
  }

  function closeSheetQuiet(el) {
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
  }

  function openNewObservation(latlng) {
    clickLatLng = latlng;
    els.obsForm.reset();
    els.obsId.value = "";
    els.obsMode.value = "create";
    $("obs-type").value = "deer_sign";
    $("sheds-extra").hidden = true;
    $("obs-form-title").textContent = "Add observation";
    $("obs-delete").hidden = true;
    openSheet(els.sheetObs);
  }

  function openViewObservation(id) {
    var obs = Store.getById(id);
    if (!obs) return;
    clickLatLng = L.latLng(obs.location.lat, obs.location.lng);
    els.obsId.value = obs.id;
    els.obsMode.value = "edit";
    $("obs-type").value = obs.type;
    $("obs-note").value = obs.note || "";
    $("obs-confidence").value = obs.confidence || "uncertain";
    $("obs-quantity").value = obs.quantity != null ? obs.quantity : "";
    toggleShedExtra(obs.type);
    if (obs.type === "shed_found" && obs.details) {
      $("shed-side").value = obs.details.side || "unknown";
      $("shed-freshness").value = obs.details.freshness || "unknown";
      $("shed-count").value = obs.details.antlerCount != null ? obs.details.antlerCount : 1;
      $("shed-collected").checked = !!obs.details.collected;
    }
    $("obs-form-title").textContent = "Edit observation";
    $("obs-delete").hidden = false;
    openSheet(els.sheetObs);
  }

  function toggleShedExtra(type) {
    $("sheds-extra").hidden = type !== "shed_found";
  }

  function saveObservation(ev) {
    ev.preventDefault();
    var type = $("obs-type").value;
    var payload = {
      type: type,
      speciesId: Store.SPECIES_WHITETAIL,
      location: { lat: clickLatLng.lat, lng: clickLatLng.lng },
      note: $("obs-note").value.trim(),
      confidence: $("obs-confidence").value,
      quantity: $("obs-quantity").value,
      details: {}
    };
    if (type === "shed_found") {
      payload.details = {
        side: $("shed-side").value,
        freshness: $("shed-freshness").value,
        antlerCount: Number($("shed-count").value) || 1,
        collected: $("shed-collected").checked
      };
    }
    var mode = els.obsMode.value;
    var result = mode === "edit"
      ? Store.update(els.obsId.value, payload)
      : Store.create(payload);
    if (!result.ok) {
      $("obs-error").textContent = result.error || "Save failed";
      $("obs-error").hidden = false;
      return;
    }
    $("obs-error").hidden = true;
    if (mode !== "edit" && Sessions) {
      var sess = Sessions.getActiveSession() || (state.tracking ? null : null);
      if (state.activeSessionId) {
        Sessions.attachObservation(state.activeSessionId, result.observation.id, type);
      } else if (sess) {
        Sessions.attachObservation(sess.id, result.observation.id, type);
      }
      if (type === "search_completed") {
        Sessions.markCoverage(clickLatLng.lat, clickLatLng.lng, "thorough", {
          sessionId: state.activeSessionId,
          source: "observation"
        });
      }
    }
    closeSheet(els.sheetObs);
    refreshObservations();
    refreshCoverageMarks();
    scheduleRecompute(100);
  }

  function deleteObservation() {
    var id = els.obsId.value;
    if (!id) return;
    if (!window.confirm("Delete this private observation from this device?")) return;
    Store.remove(id);
    closeSheet(els.sheetObs);
    refreshObservations();
    scheduleRecompute(100);
  }

  function openExplain(latlng) {
    var t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    var cell = heatLayer && heatLayer.nearestCell(latlng);
    var text;
    state.lastExplainLatLng = latlng;
    if (!cell || !cell.result) {
      text = "No local search-priority cell here. Zoom in with the heat map on to analyze the visible area.";
      if (els.explainBreakdown) els.explainBreakdown.textContent = "";
      if (els.explainTaxonomy) els.explainTaxonomy.textContent = "";
      if (els.explainCompare) els.explainCompare.textContent = "";
    } else {
      text = Model.explain(cell.result, { coverage: heatLayer.getGrid() && heatLayer.getGrid().coverage });
      if (els.explainBreakdown && cell.result.contributionBreakdown) {
        els.explainBreakdown.textContent = cell.result.contributionBreakdown.map(function (row) {
          return row.label + ": " + (Math.round(row.value * 1000) / 1000) +
            (row.direction ? " (" + row.direction + ")" : "") +
            (row.dataKind ? " [" + row.dataKind + "]" : "");
        }).join(" · ");
      }
      if (els.explainTaxonomy && cell.result.taxonomy) {
        var tax = cell.result.taxonomy;
        var conf = cell.result.confidence || {};
        var inf = cell.result.influences || {};
        els.explainTaxonomy.textContent = [
          "Relative priority: " + cell.band + " (score " + (Math.round(cell.priority * 100) / 100) + " — relative model score, not probability)",
          "Biological suitability (before search/coverage): " +
            (cell.result.biologicalSuitability != null ? Math.round(cell.result.biologicalSuitability * 100) / 100 : "—"),
          "Positive: " + ((inf.positive || []).map(function (x) { return x.label; }).join("; ") || "none strong"),
          "Limiting: " + ((inf.limiting || []).map(function (x) { return x.label; }).join("; ") || "none strong"),
          "Season: " + ((cell.result.seasonContext && cell.result.seasonContext.phase) || "—"),
          "Observed: " + (tax.observed.join("; ") || "none in range"),
          "Inferred: " + (tax.inferred.join("; ") || "none"),
          "Assumptions: " + (tax.ecologicalAssumptions.join("; ") || "none"),
          "Preferences: " + (tax.userPreferences.join("; ") || "default weights"),
          "Nearby obs: " + ((cell.result.nearbyObservations || []).map(function (n) {
            return n.type + " " + n.distanceM + "m";
          }).join("; ") || "none"),
          "Confidence (not probability): bio " + conf.biological +
            " · env " + conf.environmentalData +
            " · obs " + conf.observationDensity +
            " · overall " + conf.overallRecommendation,
          "Model " + cell.result.modelVersion + " / config " + cell.result.factorConfigVersion +
            " / preset " + (cell.result.activePreset || "balanced") +
            " / mode " + (cell.result.inputMode || "?")
        ].join("\n");
      }
      if (els.explainCompare) {
        els.explainCompare.textContent = state.prefs.compareMode
          ? renderCompareSnippet(cell)
          : (state.prefs.diagnosticMode
            ? ("Diagnostic on. Perf coarse/refine ms: " +
              Math.round(state.lastPerf.coarseMs || 0) + "/" +
              Math.round(state.lastPerf.refineMs || 0))
            : "");
      }
      if (els.explainTech) {
        var techPayload = {
          modelVersion: cell.result.modelVersion,
          factorConfigVersion: cell.result.factorConfigVersion,
          band: cell.band,
          priority: Math.round(cell.priority * 100) / 100,
          biologicalSuitability: cell.result.biologicalSuitability,
          coverageLevel: cell.coverageLevel || null,
          influences: cell.result.influences,
          confidence: cell.result.confidence,
          taxonomy: cell.result.taxonomy,
          terrainMeta: cell.result.terrainMeta,
          parts: cell.result.parts,
          sources: cell.result.sources,
          contributionBreakdown: cell.result.contributionBreakdown,
          calibration: cell.result.calibration
        };
        if (!state.prefs.diagnosticMode) {
          delete techPayload.parts;
          delete techPayload.calibration;
        }
        els.explainTech.textContent = JSON.stringify(techPayload, null, 2);
      }
      if ($("btn-validate-here")) {
        $("btn-validate-here").onclick = function () {
          closeSheet(els.sheetExplain);
          openValidationAt(latlng, cell);
        };
      }
    }
    els.explainBody.textContent = text;
    els.explainBody.setAttribute("aria-live", "polite");
    state.lastPerf.explainMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
    openSheet(els.sheetExplain);
  }

  function renderCompareSnippet(cell) {
    if (!Bio || !cell || !cell.result) return "";
    var balancedPrefs = Store.defaultModelPrefs();
    var base = Bio.scoreCell({
      lat: cell.lat,
      lng: cell.lng,
      date: new Date(),
      prefs: balancedPrefs,
      observations: Store.list(),
      terrain: { slope: null, aspect: null, source: "unavailable", morphology: { source: "unavailable" } },
      weather: state.weather,
      coverageLevel: cell.coverageLevel,
      coverageFactor: cell.result.parts && cell.result.parts.coverageFactor
    });
    var delta = Math.round((cell.priority - base.priority) * 1000) / 1000;
    var changed = [];
    (cell.result.factors || []).forEach(function (f) {
      var bf = null;
      var i;
      for (i = 0; i < (base.factors || []).length; i++) {
        if (base.factors[i].id === f.id) { bf = base.factors[i]; break; }
      }
      if (!bf) return;
      if (Math.abs(f.contribution - bf.contribution) > 0.01) {
        changed.push(f.label + " Δ" + (Math.round((f.contribution - bf.contribution) * 1000) / 1000));
      }
    });
    return "Compare vs balanced baseline at this cell: Δpriority " + delta +
      ". Drivers: " + (changed.slice(0, 5).join("; ") || "near baseline") +
      ". (Transparency tool — not a competitive ranking.)";
  }

  function openValidationAt(latlng, cell) {
    if (!els.sheetValidate) return;
    $("val-lat").value = latlng.lat;
    $("val-lng").value = latlng.lng;
    $("val-error").hidden = true;
    $("val-error").textContent = "";
    if (cell && cell.result) {
      $("val-model-hint").textContent =
        "Snapshot will store model " + cell.result.modelVersion +
        ", band " + cell.band +
        ", relative score " + (Math.round(cell.priority * 100) / 100) +
        ". A no-shed result does not prove the model wrong.";
    }
    openSheet(els.sheetValidate);
  }

  function saveValidation(ev) {
    ev.preventDefault();
    if (!Validation) return;
    var stamp = modelStamp();
    var cell = heatLayer && heatLayer.nearestCell({
      lat: Number($("val-lat").value),
      lng: Number($("val-lng").value)
    });
    var result = Validation.create({
      lat: Number($("val-lat").value),
      lng: Number($("val-lng").value),
      appearedPromising: $("val-promising").value,
      deerSignEncountered: $("val-sign").checked,
      beddingOrFeedingEvidence: $("val-bedfeed").checked,
      accessOrObstacleNotes: $("val-access").value,
      shedOutcome: $("val-shed").value,
      searchEffort: $("val-effort").value,
      confidence: $("val-confidence").value,
      notes: $("val-notes").value,
      modelVersion: stamp.modelVersion,
      factorConfigVersion: stamp.factorConfigVersion,
      activePreset: stamp.activePreset,
      regionalContext: stamp.regionalContext,
      dataCoverageSummary: stamp.dataCoverageSummary,
      inputTimestamp: stamp.inputDataTimestamp,
      cellPriority: cell ? cell.priority : null,
      cellBand: cell ? cell.band : null
    });
    if (!result.ok) {
      $("val-error").hidden = false;
      $("val-error").textContent = result.error || "Could not save.";
      return;
    }
    closeSheet(els.sheetValidate);
  }

  function renderHistory() {
    if (!els.historyBody || !Sessions) return;
    var hist = Sessions.summarizeHistory(Store.list());
    var sessions = Sessions.listSessions().slice(0, 12);
    var lines = [];
    lines.push("Sessions: " + hist.sessionCount + " · Distance logged: " +
      Math.round(hist.totalDistanceM) + " m · Sheds logged in sessions: " + hist.totalShedsFound);
    lines.push("Coverage cells marked: " + hist.coverageCells + " (thorough: " + hist.thoroughCells + ")");
    lines.push("");
    lines.push("Recent sessions:");
    sessions.forEach(function (s) {
      var mins = Math.round((s.durationMs || 0) / 60000);
      lines.push("• " + String(s.startedAt).slice(0, 16).replace("T", " ") +
        " — " + (s.status || "?") + ", " + Math.round(s.distanceM || 0) + " m, " +
        mins + " min, obs " + (s.observationIds || []).length + ", sheds " + (s.shedsFound || 0) +
        (s.modelVersion ? (", model " + s.modelVersion) : ""));
    });
    lines.push("");
    lines.push("Observations by day:");
    hist.days.slice(0, 10).forEach(function (d) {
      lines.push("• " + d.date + ": " + d.count + " notes (" + d.sheds + " shed finds)");
    });
    if (state.lastPlan && state.lastPlan.remainingHighCount != null) {
      lines.push("");
      lines.push("Revisit suggestion: " + state.lastPlan.remainingHighCount +
        " higher-priority pockets in view are not marked thoroughly searched.");
    }
    els.historyBody.textContent = lines.join("\n");
  }

  function bindControls() {
    $("btn-locate").addEventListener("click", function () { locateUser({ center: true }); });
    els.btnTrack = $("btn-track");
    if (els.btnTrack) {
      els.btnTrack.addEventListener("click", function () {
        if (state.tracking) stopTracking();
        else startTracking();
      });
    }
    els.btnMore = $("btn-more");
    if (els.btnMore) {
      els.btnMore.addEventListener("click", function () {
        openSheet(els.sheetTools);
      });
    }
    if ($("btn-layers")) {
      $("btn-layers").addEventListener("click", function () {
        syncControlsForm();
        openSheet(els.sheetControls);
      });
    }
    if ($("btn-add-obs")) {
      $("btn-add-obs").addEventListener("click", function () {
        var ll = state.userLatLng || (map && map.getCenter());
        if (ll) openNewObservation(ll);
      });
    }
    if ($("btn-status")) {
      $("btn-status").addEventListener("click", function () {
        var panel = $("status-panel");
        if (!panel) return;
        var open = panel.hasAttribute("hidden");
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
        $("btn-status").setAttribute("aria-expanded", open ? "true" : "false");
        invalidateMapSize();
      });
    }
    if ($("btn-toggle-plan")) {
      els.btnTogglePlan = $("btn-toggle-plan");
      els.btnTogglePlan.addEventListener("click", function () {
        setPlanExpanded(!state.planExpanded);
      });
    }
    if ($("btn-recenter")) {
      $("btn-recenter").addEventListener("click", function () {
        if (!state.userLatLng || !map) return;
        state.followUser = true;
        map.setView(state.userLatLng, Math.max(map.getZoom(), 13));
        syncRecenterBtn();
        closeAllSheets();
      });
    }
    $("btn-controls").addEventListener("click", function () {
      syncControlsForm();
      openSheet(els.sheetControls);
    });
    $("btn-ethics").addEventListener("click", function () { openSheet(els.sheetEthics); });
    $("btn-explain").addEventListener("click", function () {
      openExplain(map.getCenter());
    });
    if ($("btn-history")) {
      $("btn-history").addEventListener("click", function () {
        renderHistory();
        openSheet(els.sheetHistory);
      });
    }
    if ($("btn-validate")) {
      $("btn-validate").addEventListener("click", function () {
        var ll = state.userLatLng || map.getCenter();
        var cell = heatLayer && heatLayer.nearestCell(ll);
        openValidationAt(ll, cell);
      });
    }
    if ($("val-form")) {
      $("val-form").addEventListener("submit", saveValidation);
    }
    if ($("btn-goto-plan")) {
      $("btn-goto-plan").addEventListener("click", function () {
        if (state.lastPlan && state.lastPlan.recommendation) {
          var r = state.lastPlan.recommendation;
          state.followUser = false;
          map.setView([r.lat, r.lng], Math.max(map.getZoom(), 14));
          syncRecenterBtn();
          setPlanExpanded(false);
        }
      });
    }
    ["partial", "thorough", "revisit"].forEach(function (level) {
      var btn = $("btn-mark-" + level);
      if (btn) btn.addEventListener("click", function () { markCoverageAtUser(level); });
    });
    $("btn-export").addEventListener("click", function () {
      var payload = {
        observations: Store.exportJson(),
        sessions: Sessions ? Sessions.exportBundle() : null,
        validations: Validation ? Validation.list() : [],
        modelPrefs: state.prefs,
        modelStamp: modelStamp(),
        privacyNote:
          "Observations, sessions, and validations were stored on-device. " +
          "Tile/weather providers may have received approximate map/request location during use."
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sheds-field-private.json";
      a.click();
      URL.revokeObjectURL(a.href);
      closeAllSheets();
    });

    document.querySelectorAll("[data-close-sheet]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeSheet(btn.closest(".sheds-sheet"));
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllSheets();
    });

    $("obs-type").addEventListener("change", function () {
      toggleShedExtra($("obs-type").value);
    });
    els.obsForm.addEventListener("submit", saveObservation);
    $("obs-delete").addEventListener("click", deleteObservation);

    $("heat-visible").addEventListener("change", function () {
      state.prefs.heatVisible = $("heat-visible").checked;
      Store.saveModelPrefs(state.prefs);
      scheduleRecompute(50);
    });
    $("obs-visible").addEventListener("change", function () {
      state.prefs.obsVisible = $("obs-visible").checked;
      Store.saveModelPrefs(state.prefs);
      refreshObservations();
    });
    $("heat-opacity").addEventListener("input", function () {
      state.prefs.opacity = Number($("heat-opacity").value);
      Store.saveModelPrefs(state.prefs);
      if (heatLayer) heatLayer.setHeatOpacity(state.prefs.opacity);
      if ($("heat-opacity-val")) {
        $("heat-opacity-val").textContent = Math.round(state.prefs.opacity * 100) + "%";
      }
    });
    if ($("confidence-overlay")) {
      $("confidence-overlay").addEventListener("change", function () {
        state.prefs.showConfidence = $("confidence-overlay").checked;
        Store.saveModelPrefs(state.prefs);
        if (heatLayer && heatLayer.setShowConfidence) heatLayer.setShowConfidence(state.prefs.showConfidence);
      });
    }
    if ($("coverage-visible")) {
      $("coverage-visible").addEventListener("change", function () {
        state.prefs.coverageVisible = $("coverage-visible").checked;
        Store.saveModelPrefs(state.prefs);
        refreshCoverageMarks();
      });
    }
    if ($("diagnostic-mode")) {
      $("diagnostic-mode").addEventListener("change", function () {
        state.prefs.diagnosticMode = $("diagnostic-mode").checked;
        Store.saveModelPrefs(state.prefs);
      });
    }
    if ($("compare-mode")) {
      $("compare-mode").addEventListener("change", function () {
        state.prefs.compareMode = $("compare-mode").checked;
        Store.saveModelPrefs(state.prefs);
      });
    }
    if ($("offline-forced")) {
      $("offline-forced").addEventListener("change", function () {
        state.offlineForced = $("offline-forced").checked;
        scheduleRecompute(80);
      });
    }
    if ($("model-preset") && Presets) {
      $("model-preset").addEventListener("change", function () {
        var before = state.prefs;
        state.prefs = Presets.applyPreset(state.prefs, $("model-preset").value);
        Store.saveModelPrefs(state.prefs);
        syncControlsForm();
        var changed = Presets.changedWeightKeys(before, state.prefs);
        if ($("preset-hint")) {
          var p = Presets.getPreset(state.prefs.activePreset);
          $("preset-hint").textContent = p.summary +
            (changed.length ? " Changed: " + changed.join(", ") + "." : "") +
            " Presets explore emphasis — they are not universal truth.";
        }
        scheduleRecompute(120);
      });
    }
    if ($("season-override") && Bio) {
      $("season-override").addEventListener("change", function () {
        var v = $("season-override").value;
        state.prefs.seasonPhaseOverride = v === "auto" ? null : v;
        if (state.prefs.activePreset === "balanced") {
          /* keep */
        }
        Store.saveModelPrefs(state.prefs);
        updateSeasonPill();
        scheduleRecompute(120);
      });
    }

    document.querySelectorAll("[data-weight]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        state.prefs.weights[sel.getAttribute("data-weight")] = sel.value;
        state.prefs.activePreset = "custom";
        if ($("model-preset")) $("model-preset").value = "balanced";
        Store.saveModelPrefs(state.prefs);
        scheduleRecompute(120);
      });
    });

    $("btn-reset-weights").addEventListener("click", function () {
      state.prefs = Presets ? Presets.applyPreset(null, "balanced") : Store.defaultModelPrefs();
      Store.saveModelPrefs(state.prefs);
      syncControlsForm();
      scheduleRecompute(50);
    });

    $("obs-filter").addEventListener("change", function () {
      var val = $("obs-filter").value;
      if (val === "all") state.filterTypes = null;
      else state.filterTypes = new Set([val]);
      refreshObservations();
    });

    map.on("contextmenu", function (e) {
      L.DomEvent.preventDefault(e);
      openExplain(e.latlng);
    });
  }

  function syncControlsForm() {
    $("heat-visible").checked = state.prefs.heatVisible;
    $("obs-visible").checked = state.prefs.obsVisible;
    $("heat-opacity").value = state.prefs.opacity;
    if ($("heat-opacity-val")) {
      $("heat-opacity-val").textContent = Math.round(Number(state.prefs.opacity) * 100) + "%";
    }
    if ($("confidence-overlay")) $("confidence-overlay").checked = !!state.prefs.showConfidence;
    if ($("coverage-visible")) $("coverage-visible").checked = state.prefs.coverageVisible !== false;
    if ($("diagnostic-mode")) $("diagnostic-mode").checked = !!state.prefs.diagnosticMode;
    if ($("compare-mode")) $("compare-mode").checked = !!state.prefs.compareMode;
    if ($("offline-forced")) $("offline-forced").checked = !!state.offlineForced;
    if ($("model-preset") && Presets) {
      var pid = state.prefs.activePreset || "balanced";
      if (!Presets.PRESETS[pid]) pid = "balanced";
      $("model-preset").value = pid;
      if ($("preset-hint")) $("preset-hint").textContent = Presets.getPreset(pid).summary;
    }
    if ($("season-override")) {
      $("season-override").value = state.prefs.seasonPhaseOverride || "auto";
    }
    Object.keys(state.prefs.weights).forEach(function (k) {
      var el = document.querySelector('[data-weight="' + k + '"]');
      if (el) el.value = state.prefs.weights[k];
    });
  }

  function fillTypeSelects() {
    var opts = Store.OBSERVATION_TYPES.map(function (t) {
      return "<option value=\"" + t.id + "\">" + t.label + "</option>";
    }).join("");
    $("obs-type").innerHTML = opts;
    $("obs-filter").innerHTML = "<option value=\"all\">All observations</option>" + opts;
  }

  function maybeEthics() {
    try {
      if (localStorage.getItem("waypoint-sheds-ethics-seen-v1")) return;
    } catch (e) { return; }
    openSheet(els.sheetEthics);
  }

  function onEthicsAck() {
    try { localStorage.setItem("waypoint-sheds-ethics-seen-v1", "1"); } catch (e) { /* */ }
    closeSheet(els.sheetEthics);
  }

  function boot() {
    if (!window.L || !Store || !Model || !Heat || !Sessions || !Planner || !Bio || !Presets || !Validation) {
      requestAnimationFrame(boot);
      return;
    }
    els.locStatus = $("loc-status");
    els.obsCount = $("obs-count");
    els.coverage = $("coverage-pill");
    els.sessionPill = $("session-pill");
    els.seasonPill = $("season-pill");
    els.modelNote = $("model-note");
    els.inputsSummary = $("inputs-summary");
    els.planCard = $("plan-card");
    els.planTitle = $("plan-title");
    els.planBody = $("plan-body");
    els.planWhy = $("plan-why");
    els.planMeta = $("plan-meta");
    els.planGlance = $("plan-glance");
    els.planDetails = $("plan-details");
    els.btnTogglePlan = $("btn-toggle-plan");
    els.sheetObs = $("sheet-obs");
    els.sheetControls = $("sheet-controls");
    els.sheetExplain = $("sheet-explain");
    els.sheetEthics = $("sheet-ethics");
    els.sheetHistory = $("sheet-history");
    els.sheetValidate = $("sheet-validate");
    els.sheetTools = $("sheet-tools");
    els.btnMore = $("btn-more");
    els.historyBody = $("history-body");
    els.obsForm = $("obs-form");
    els.obsId = $("obs-id");
    els.obsMode = $("obs-mode");
    els.explainBody = $("explain-body");
    els.explainTech = $("explain-tech");
    els.explainBreakdown = $("explain-breakdown");
    els.explainTaxonomy = $("explain-taxonomy");
    els.explainCompare = $("explain-compare");

    state.prefs = Store.loadModelPrefs();
    if (state.prefs.showConfidence == null) state.prefs.showConfidence = false;
    if (state.prefs.coverageVisible == null) state.prefs.coverageVisible = true;
    if (state.prefs.opacity == null) state.prefs.opacity = DEFAULT_HEAT_OPACITY;
    fillTypeSelects();
    if ($("model-preset") && Presets) {
      $("model-preset").innerHTML = Presets.listPresets().map(function (p) {
        return "<option value=\"" + p.id + "\">" + p.label + "</option>";
      }).join("") + "<option value=\"balanced\">Custom (edit weights)</option>";
    }
    if ($("season-override") && Bio) {
      var opts = "<option value=\"auto\">Automatic from date + latitude</option>";
      Object.keys(Bio.SEASON_PHASES).forEach(function (id) {
        opts += "<option value=\"" + id + "\">" + Bio.SEASON_PHASES[id].label + " (manual)</option>";
      });
      $("season-override").innerHTML = opts;
    }
    initMap();
    bindControls();
    syncControlsForm();
    refreshObservations();
    refreshCoverageMarks();
    updateSeasonPill();
    var active = Sessions.getActiveSession();
    if (active) {
      state.activeSessionId = active.id;
      redrawTrack(active);
      if (els.sessionPill) {
        var ver = active.modelVersion ? (" · model " + active.modelVersion) : "";
        els.sessionPill.textContent = "Resume ready · " + Math.round(active.distanceM || 0) + " m" + ver;
        els.sessionPill.dataset.state = "available";
      }
      if (els.btnTrack) setFabLabel(els.btnTrack, "Resume");
    } else if (els.sessionPill) {
      els.sessionPill.textContent = "Not tracking";
      els.sessionPill.dataset.state = "manual";
    }
    locateUser({ center: !Store.loadMapView() });
    setPlanExpanded(false);
    $("ethics-ack").addEventListener("click", onEthicsAck);
    maybeEthics();
    syncOfflineBanner();
    window.addEventListener("online", syncOfflineBanner);
    window.addEventListener("offline", syncOfflineBanner);

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("reduced-motion");
      if (heatLayer && heatLayer.setSmooth) heatLayer.setSmooth(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
