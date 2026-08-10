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
  var Patterns = window.WaypointShedsObservationPatterns;
  var TodaysSearch = window.WaypointShedsTodaysSearch;

  var NEUTRAL = { lat: 44.5, lng: -92.5, zoom: 6 }; // Midwest overview — not “you”
  var GRID_ROWS = 18;
  var GRID_COLS = 18;
  var COARSE_ROWS = 10;
  var COARSE_COLS = 10;
  var SPECIES_LABEL = "Whitetail deer";
  var DEFAULT_HEAT_OPACITY = 0.42;
  var GPS_DENIED_KEY = "waypoint-sheds-gps-denied-v1";

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
    elevAbort: null,
    weather: null,
    weatherStatus: "idle",
    recomputeTimer: null,
    recomputeGen: 0,
    heatPhase: "idle",
    heatMode: "biological",
    heatFilters: null,
    firstEthicsShown: false,
    tracking: false,
    activeSessionId: null,
    lastPlan: null,
    lastToday: null,
    lastGrid: null,
    lastPerf: {},
    offlineForced: false,
    followUser: true,
    planExpanded: false,
    lastClickAt: 0,
    lastFocusEl: null,
    tileStatus: null
  };

  var els = {};
  var map, heatLayer, userMarker, accuracyCircle, headingLine, obsLayer, clickLatLng;
  var trackLayer, coverageLayer, planLayer, recMarker, trackLine;

  function $(id) { return document.getElementById(id); }

  function setLocStatus(code, detail) {
    state.locationStatus = code;
    var label = {
      idle: "You · tap to place",
      finding: "Finding you…",
      available: "You are here",
      denied: "Location off — explore the map",
      unavailable: "Location unavailable",
      timeout: "Try locating again",
      last: "Saved view",
      manual: "Exploring the map",
      neutral: "You · tap to place"
    }[code] || code;
    if (els.locStatus) {
      var text = label;
      if (code === "available" && detail && detail.indexOf("±") === 0) text = "You are here · " + detail;
      else if (code === "available" && detail === "tracking") text = "You are here · tracking";
      else if (detail && code !== "available") text = label;
      els.locStatus.textContent = text;
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
    if (state.lastPlan != null || state.lastToday) {
      try { renderPlanCard(state.lastPlan); } catch (e) { /* boot order */ }
    }
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
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  function syncSessionPill(text, show) {
    if (!els.sessionPill) return;
    if (text != null) els.sessionPill.textContent = text;
    if (show) {
      els.sessionPill.hidden = false;
      els.sessionPill.removeAttribute("hidden");
    } else {
      els.sessionPill.hidden = true;
      els.sessionPill.setAttribute("hidden", "");
    }
  }

  function confidencePhrase(coverage, band) {
    var level = (coverage && coverage.level) || "limited";
    if (level === "strong" && band === "higher") return "Stronger relative confidence";
    if (level === "strong") return "Solid relative confidence";
    if (level === "moderate" && band === "higher") return "Worth considering";
    if (level === "moderate") return "Moderate confidence";
    if (band === "higher") return "Limited inputs — still worth a look";
    return "Limited inputs — walk carefully";
  }

  function wasGpsDenied() {
    try {
      return localStorage.getItem(GPS_DENIED_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function rememberGpsDenied(denied) {
    try {
      if (denied) localStorage.setItem(GPS_DENIED_KEY, "1");
      else localStorage.removeItem(GPS_DENIED_KEY);
    } catch (e) { /* private mode */ }
  }

  /** Interpret weather + season into field language (not raw mm / kph). */
  function fieldConditionLines(weather, season) {
    var lines = [];
    var wx = weather;
    if (wx) {
      var snow = wx.snowMm;
      var temp = wx.tempC;
      var windMs = wx.windSpeedMs;
      if (snow != null && snow > 8 && temp != null && temp > 0) {
        lines.push("Recent snowmelt may expose south-facing slopes and bare edges.");
      } else if (snow != null && snow > 25) {
        lines.push("Deeper snow can hide antlers — favor wind-scoured ridges and openings.");
      } else if (snow != null && snow > 0.5) {
        lines.push("Light snow can improve ground contrast for spotting sheds.");
      }
      if (windMs != null && windMs >= 8) {
        lines.push("Stronger winds may concentrate antlers along fence lines and lee edges.");
      } else if (windMs != null && windMs >= 4) {
        lines.push("Breezes can move light debris — check fence lines and travel corridors.");
      }
      if (temp != null && temp >= 12) {
        lines.push("Mild weather and green-up may reduce visibility — slow down under cover.");
      } else if (temp != null && temp <= -5) {
        lines.push("Hard freeze can lock snow crust — look where deer travel and bed.");
      }
    }
    if (season && season.phaseId === "peak_shed") {
      lines.push("Seasonal timing looks closer to peak shed for this latitude.");
    } else if (season && season.phaseId === "late_shed") {
      lines.push("Later-season window — prioritize overlooked pockets and pressure edges.");
    } else if (season && (season.phaseId === "pre_shed" || season.phaseId === "early_shed")) {
      lines.push("Early window — treat every mark as reconnaissance, not a find map.");
    } else if (season && season.phaseId === "post_shed") {
      lines.push("Post-peak window — leftover sheds favor tough cover and missed edges.");
    }
    if (!lines.length) {
      if (navigator.onLine === false || state.offlineForced) {
        lines.push("Working from local notes and season rules — weather feed unavailable.");
      } else {
        lines.push("Conditions look ordinary — lean on terrain, sign, and your coverage marks.");
      }
    }
    return lines.slice(0, 3);
  }

  function dayQualityLine(coverage, band, weather, season) {
    var wx = weather || state.weather;
    if (wx) {
      if (wx.snowMm != null && wx.snowMm > 8 && wx.tempC != null && wx.tempC > 0) {
        return "Snowmelt favors open slopes";
      }
      if (wx.windSpeedMs != null && wx.windSpeedMs >= 8) {
        return "Wind may load fence lines";
      }
      if (wx.tempC != null && wx.tempC >= 12) {
        return "Green-up lowers visibility";
      }
      if (wx.snowMm != null && wx.snowMm > 25) {
        return "Deep snow — pick open ground";
      }
    }
    if (season && season.phaseId === "peak_shed") return "Peak-shed window nearby";
    var level = (coverage && coverage.level) || "limited";
    if (level === "strong" && (band === "higher" || band === "moderate")) return "Looking favorable nearby";
    if (level === "moderate") return "Worth searching nearby";
    if (band === "higher") return "A place worth considering";
    return "Guidance with limited inputs";
  }

  function currentSeasonProfile() {
    if (!Bio) return null;
    var center = map ? map.getCenter() : null;
    var lat = state.userLatLng ? state.userLatLng.lat : (center && center.lat) || 44;
    return Bio.seasonProfile(new Date(), lat, state.prefs || {});
  }

  function syncHeatLegend() {
    var legend = $("heat-legend");
    if (!legend) return;
    var on = !!(state.prefs && state.prefs.heatVisible !== false && state.lastGrid);
    legend.hidden = !on;
    var modeEl = $("heat-legend-mode");
    if (modeEl) {
      modeEl.textContent = state.heatMode === "observed"
        ? "Observed activity"
        : "Estimated opportunity";
    }
    var status = $("heat-legend-status");
    if (status) {
      if (state.heatMode === "observed") {
        var n = state.lastGrid && state.lastGrid.observationCount != null
          ? state.lastGrid.observationCount : 0;
        status.textContent = n
          ? (n + " private note" + (n === 1 ? "" : "s") + " in filter")
          : "Empty — log observations to build heat";
      } else if (state.heatPhase === "coarse") status.textContent = "Coarse · refining…";
      else if (state.heatPhase === "refine") status.textContent = "Updated for this view";
      else if (state.heatPhase === "zoom") status.textContent = "Zoom in for heat";
      else if (state.offlineForced || navigator.onLine === false) status.textContent = "Limited / offline scoring";
      else status.textContent = "Lower → higher estimated priority";
    }
  }

  function locationStatusForToday() {
    if (state.locationStatus === "denied") return "denied";
    if (state.locationStatus === "finding") return state.userLatLng ? "ready" : "loading";
    if (state.locationStatus === "unavailable" || state.locationStatus === "timeout") {
      return state.userLatLng ? "ready" : "unavailable";
    }
    if (state.userLatLng || state.locationStatus === "available") return "ready";
    if (state.locationStatus === "idle" || state.locationStatus === "neutral") return "loading";
    return state.userLatLng ? "ready" : "unavailable";
  }

  function currentHeatFilters() {
    var base = Patterns && Patterns.defaultHeatFilters
      ? Patterns.defaultHeatFilters()
      : { timeOfDay: "all", season: "all", weather: "any", sinceMs: null, untilMs: null };
    var f = Object.assign({}, base, state.heatFilters || {});
    var range = f.rangeDays;
    if (range && range !== "all") {
      var days = Number(range);
      if (isFinite(days) && days > 0) f.sinceMs = Date.now() - days * 86400000;
    }
    return f;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderTodayWindows(brief) {
    var el = $("today-windows");
    if (!el) return;
    if (!brief || !brief.timeWindows || !brief.timeWindows.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = brief.timeWindows.map(function (w) {
      var active = w.id === brief.bestWindowId ? " is-best" : "";
      return "<div class=\"sheds-today__window" + active + "\" data-band=\"" + escapeHtml(w.band) + "\">" +
        "<span class=\"sheds-today__window-label\">" + escapeHtml(w.label) + "</span>" +
        "<span class=\"sheds-today__window-band\">" + escapeHtml(w.band) + "</span>" +
        "<span class=\"sheds-today__window-why\">" + escapeHtml((w.why && w.why[0]) || "") + "</span>" +
        "</div>";
    }).join("");
  }

  function renderTodayAreas(brief) {
    var el = $("today-areas");
    if (!el) return;
    if (!brief || !brief.areas || !brief.areas.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = "<p class=\"sheds-today__section-label\">Areas / terrain to consider</p><ul>" +
      brief.areas.map(function (a) {
        var tag = a.epistemic === "observed" || a.kind === "observation" ? "Pattern"
          : a.epistemic === "estimated" || a.kind === "planner" ? "Estimated"
          : a.epistemic === "fact" ? "Fact" : "Analysis";
        return "<li><strong>" + escapeHtml(a.label) + "</strong> " +
          "<span class=\"sheds-today__tag\">" + tag + "</span>" +
          "<span class=\"sheds-today__area-why\">" + escapeHtml(a.why || "") + "</span></li>";
      }).join("") + "</ul>";
  }

  function renderTodaySignals(brief) {
    var el = $("today-signals");
    if (!el) return;
    if (!brief || !brief.signals || !brief.signals.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = brief.signals.map(function (s) {
      return "<li data-kind=\"" + escapeHtml(s.kind) + "\"><span class=\"sheds-today__tag\">" +
        escapeHtml(s.kind) + "</span> <strong>" + escapeHtml(s.label) + ":</strong> " +
        escapeHtml(s.text) + "</li>";
    }).join("");
  }

  function refreshTodaysSearch(plan) {
    if (!TodaysSearch || !els.planCard) return null;
    var patterns = Patterns ? Patterns.aggregatePatterns(Store.list()) : null;
    var brief = TodaysSearch.build({
      weather: state.offlineForced ? null : state.weather,
      weatherStatus: state.offlineForced ? "unavailable"
        : (state.weatherStatus === "loading" ? "loading"
          : (state.weather ? "ready" : state.weatherStatus || "unavailable")),
      season: currentSeasonProfile(),
      locationStatus: locationStatusForToday(),
      patterns: patterns,
      plan: plan || state.lastPlan,
      now: new Date()
    });
    state.lastToday = brief;
    return brief;
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
          ? ((dir ? dir + " · " : "") + Planner.formatDistance(dist))
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
    var offline = navigator.onLine === false;
    var forced = !!state.offlineForced;
    if (offline || forced) {
      el.removeAttribute("hidden");
      el.textContent = offline
        ? "You’re offline. Cached tiles may still show; heat refinement and weather need a connection. Local notes still save."
        : "Limited-data mode on. Heat uses local notes and season rules only — not live elevation or weather.";
    } else {
      el.setAttribute("hidden", "");
    }
  }

  function setTileStatus(status) {
    var el = $("map-tile-status");
    if (!el) return;
    state.tileStatus = status || null;
    if (!status) {
      el.setAttribute("hidden", "");
      el.textContent = "";
      return;
    }
    if (status.degraded) {
      el.removeAttribute("hidden");
      el.setAttribute("data-level", "error");
      el.textContent =
        "Map tiles aren’t loading from " +
        (status.providerLabel || "the basemap provider") +
        ". Check your connection, then pan or zoom to retry. Gray gaps mean the tile request failed — not missing terrain.";
      return;
    }
    if (status.struggling) {
      el.removeAttribute("hidden");
      el.setAttribute("data-level", "warn");
      el.textContent =
        "Some map tiles are slow or failing. Retrying automatically…";
      return;
    }
    el.setAttribute("hidden", "");
    el.textContent = "";
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

    var Tiles = window.WaypointShedsTiles;
    if (!Tiles || !Tiles.createBasemaps) {
      throw new Error("WaypointShedsTiles missing — load sheds-tile-provider.js before sheds-map-app.js");
    }
    var basemaps = Tiles.createBasemaps(L);
    var street = basemaps.street;
    var topo = basemaps.topo;
    Tiles.attachReliability(street, { onStatus: setTileStatus });
    Tiles.attachReliability(topo, { onStatus: setTileStatus });
    // CARTO/Esri production tiles — not OSMF public raster (blocked gray placeholders)
    street.addTo(map);
    L.control.layers(basemaps.baseLayers, null, {
      position: "topright",
      collapsed: true
    }).addTo(map);
    map.on("baselayerchange", function () {
      setTileStatus(null);
    });

    var firstTile = false;
    function afterBasemapSettles() {
      forceMapLayout({ resetView: true });
      try {
        if (street && typeof street.redraw === "function" && map.hasLayer(street)) street.redraw();
      } catch (e) { /* */ }
    }
    street.on("load", function () {
      if (!firstTile) {
        firstTile = true;
        setMapLoading(true);
        afterBasemapSettles();
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
      afterBasemapSettles();
      invalidateMapSize();
    });
    [120, 480, 1200].forEach(function (ms) {
      setTimeout(afterBasemapSettles, ms);
    });
    setTimeout(function () { afterBasemapSettles(); setMapLoading(true); }, 1800);

    if (typeof ResizeObserver === "function") {
      var shellEl = document.getElementById("sheds-map-shell");
      if (shellEl) {
        var resizeTimer = null;
        var ro = new ResizeObserver(function () {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () { forceMapLayout({ resetView: true }); }, 80);
        });
        ro.observe(shellEl);
      }
    }

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
    if (state.elevAbort) {
      try { state.elevAbort.abort(); } catch (e) { /* */ }
      state.elevAbort = null;
    }
    var ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    state.elevAbort = ac;
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
        if (ac && ac.signal && ac.signal.aborted) {
          return Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        }
        var url = "https://api.open-meteo.com/v1/elevation?latitude=" +
          ch.lat.map(function (n) { return n.toFixed(5); }).join(",") +
          "&longitude=" + ch.lng.map(function (n) { return n.toFixed(5); }).join(",");
        var opts = { credentials: "omit" };
        if (ac && ac.signal) opts.signal = ac.signal;
        return fetch(url, opts).then(function (res) {
          if (!res.ok) throw new Error("elevation " + res.status);
          return res.json();
        }).then(function (data) {
          var elev = data.elevation || [];
          return acc.concat(elev);
        });
      });
    }, Promise.resolve([])).then(function (allElev) {
      if (state.elevAbort === ac) state.elevAbort = null;
      state.elevCache = allElev;
      state.elevKey = key;
      return allElev;
    }).catch(function (err) {
      if (state.elevAbort === ac) state.elevAbort = null;
      if (err && err.name === "AbortError") return null;
      state.elevCache = null;
      state.elevKey = "";
      return null;
    });
  }

  function formatLocalClock(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    try {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    }
  }

  function hourFromIso(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.getHours() + d.getMinutes() / 60;
  }

  function fetchWeatherSoft(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return Promise.resolve(null);
    state.weatherStatus = "loading";
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(4) +
      "&longitude=" + lng.toFixed(4) +
      "&current=temperature_2m,wind_speed_10m,surface_pressure,precipitation" +
      "&hourly=temperature_2m,wind_speed_10m,precipitation,surface_pressure" +
      "&daily=snowfall_sum,sunrise,sunset,precipitation_sum" +
      "&timezone=auto&forecast_days=3&past_days=1";
    return fetch(url, { credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("wx");
      return res.json();
    }).then(function (data) {
      var snow = 0;
      if (data.daily && data.daily.snowfall_sum) {
        snow = data.daily.snowfall_sum.reduce(function (a, b) { return a + (b || 0); }, 0);
      }
      var influence = 1;
      if (snow > 25) influence = 0.7;
      else if (snow > 8) influence = 0.88;
      else if (snow > 0.5) influence = 1.05;
      var tempC = data.current && typeof data.current.temperature_2m === "number"
        ? data.current.temperature_2m : null;
      var windSpeedMs = data.current && typeof data.current.wind_speed_10m === "number"
        ? data.current.wind_speed_10m : null;
      var pressureHpa = data.current && typeof data.current.surface_pressure === "number"
        ? data.current.surface_pressure : null;
      var precipMm24h = null;
      if (data.daily && data.daily.precipitation_sum && data.daily.precipitation_sum.length) {
        // past_days=1 puts yesterday first; sum recent ~24–48h honestly as available
        var sums = data.daily.precipitation_sum;
        precipMm24h = Number(sums[sums.length > 1 ? 1 : 0] || 0);
        if (sums.length > 1) precipMm24h = Number(sums[0] || 0) + Number(sums[1] || 0);
      }
      var pressureTrend = null;
      if (data.hourly && data.hourly.surface_pressure && data.hourly.surface_pressure.length >= 6) {
        var arr = data.hourly.surface_pressure.filter(function (v) { return typeof v === "number"; });
        if (arr.length >= 6) {
          var early = arr[Math.max(0, arr.length - 12)];
          var late = arr[arr.length - 1];
          var delta = late - early;
          if (delta <= -1.5) pressureTrend = "falling";
          else if (delta >= 1.5) pressureTrend = "rising";
          else pressureTrend = "steady";
        }
      }
      var sunriseIso = data.daily && data.daily.sunrise ? data.daily.sunrise[data.daily.sunrise.length > 1 ? 1 : 0] : null;
      var sunsetIso = data.daily && data.daily.sunset ? data.daily.sunset[data.daily.sunset.length > 1 ? 1 : 0] : null;
      // With past_days=1, index 1 is typically "today"
      if (data.daily && data.daily.time && data.daily.time.length) {
        var todayStr = new Date().toISOString().slice(0, 10);
        var ix = data.daily.time.indexOf(todayStr);
        if (ix < 0 && data.daily.time.length > 1) ix = 1;
        if (ix < 0) ix = 0;
        sunriseIso = data.daily.sunrise && data.daily.sunrise[ix];
        sunsetIso = data.daily.sunset && data.daily.sunset[ix];
      }
      var pkg = {
        snowInfluence: influence,
        snowMm: snow,
        tempC: tempC,
        windSpeedMs: windSpeedMs,
        pressureHpa: pressureHpa,
        pressureTrend: pressureTrend,
        precipMm24h: precipMm24h,
        sunriseIso: sunriseIso || null,
        sunsetIso: sunsetIso || null,
        sunriseLocal: formatLocalClock(sunriseIso),
        sunsetLocal: formatLocalClock(sunsetIso),
        sunriseHour: hourFromIso(sunriseIso),
        sunsetHour: hourFromIso(sunsetIso),
        utcOffsetMinutes: typeof data.utc_offset_seconds === "number"
          ? data.utc_offset_seconds / 60 : null,
        source: "open-meteo",
        fetchedAt: new Date().toISOString()
      };
      state.weatherStatus = "ready";
      return pkg;
    }).catch(function () {
      state.weatherStatus = "unavailable";
      return null;
    });
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
    syncHeatLegend();
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

  function recomputeObservedHeat(bounds, gen) {
    if (!Patterns) return;
    var filters = currentHeatFilters();
    var grid = Patterns.buildObservationHeatGrid(
      bounds, GRID_ROWS, GRID_COLS, Store.list(), filters, { nowMs: Date.now() }
    );
    if (gen !== state.recomputeGen) return;
    state.heatPhase = "refine";
    applyGridToUi(grid, {
      label: "Observed activity (private notes only)",
      elevNote: grid.observationCount
        ? ("Filter: " + (grid.filterSummary || "all") + ".")
        : "No matching private observations — heat intentionally empty (no demo data)."
    });
  }

  function recomputeHeat() {
    if (!map || !Model) return;
    var gen = ++state.recomputeGen;
    if (state.elevAbort) {
      try { state.elevAbort.abort(); } catch (e) { /* */ }
      state.elevAbort = null;
    }
    var t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    if (heatLayer) {
      heatLayer.setHeatVisible(!!state.prefs.heatVisible);
      heatLayer.setHeatOpacity(state.prefs.opacity);
    }
    var bounds = map.getBounds();
    if (map.getZoom() < 9) {
      state.heatPhase = "zoom";
      setModelCoverageNote("Zoom in to compute a local search-priority surface.");
      if (heatLayer) {
        heatLayer.setGrid({ cells: [], bounds: { west: 0, east: 0, south: 0, north: 0 }, rows: 0, cols: 0 });
      }
      updateCoverageUi({ level: "limited", label: "Limited input coverage — zoom for local analysis" });
      updatePlanner(null);
      syncHeatLegend();
      return;
    }

    // Keep weather fresh for Today's Search even in observed-heat mode
    var center = map.getCenter();
    var wxPromise = state.offlineForced ? Promise.resolve(null)
      : (state.weather ? Promise.resolve(state.weather) : fetchWeatherSoft(center.lat, center.lng));

    if (state.heatMode === "observed") {
      try {
        recomputeObservedHeat(bounds, gen);
      } catch (e) {
        console.error("sheds observed heat", e);
      }
      wxPromise.then(function (w) {
        if (gen !== state.recomputeGen) return;
        if (w) state.weather = w;
        updatePlanner(state.lastGrid);
      });
      return;
    }

    // Coarse first pass — local observations + season, no elevation wait
    try {
      var coarse = Model.buildGrid(bounds, COARSE_ROWS, COARSE_COLS, buildContext(null, COARSE_ROWS, COARSE_COLS, "unavailable"));
      if (gen !== state.recomputeGen) return;
      state.heatPhase = "coarse";
      applyGridToUi(coarse, {
        label: "Coarse heat (limited terrain)",
        elevNote: "Refining with elevation when available…"
      });
      state.lastPerf.coarseMs = ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - t0;
    } catch (e) {
      console.error("sheds coarse heat", e);
    }

    Promise.all([
      state.offlineForced ? Promise.resolve(null) : fetchElevations(bounds),
      wxPromise
    ]).then(function (pair) {
      if (gen !== state.recomputeGen) return;
      var elev = pair[0];
      if (pair[1]) state.weather = pair[1];
      var t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      var grid = Model.buildGrid(bounds, GRID_ROWS, GRID_COLS, buildContext(elev, GRID_ROWS, GRID_COLS, elev ? "live-or-cached" : "unavailable"));
      if (gen !== state.recomputeGen) return;
      state.heatPhase = "refine";
      applyGridToUi(grid, {
        label: "Refined biological heat (estimated opportunity)",
        elevNote: elev
          ? "Elevation sampled for this view."
          : (state.offlineForced || navigator.onLine === false
            ? "Elevation skipped (offline / limited-data)."
            : "Elevation unavailable — using season and local notes.")
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
    var conf = $("plan-stars");
    var stats = $("plan-stats");
    var brief = refreshTodaysSearch(plan);
    var statusEl = $("today-status");
    var uncertainEl = $("today-uncertain");
    var whyWrap = document.querySelector(".sheds-plan__why-wrap");
    if (whyWrap) whyWrap.hidden = false;

    if (brief) {
      renderTodayWindows(brief);
      renderTodayAreas(brief);
      renderTodaySignals(brief);
      if (statusEl) {
        var st = brief.status;
        if (st === "loading") statusEl.textContent = "Loading today’s conditions…";
        else if (st === "location_denied") statusEl.textContent = "Location denied — briefing uses map center when possible.";
        else if (st === "weather_unavailable") statusEl.textContent = "Weather unavailable — seasonal / note-based briefing only.";
        else if (st === "partial") statusEl.textContent = "Partial inputs — some signals missing.";
        else statusEl.textContent = brief.summaryLine || brief.headline;
      }
      if (uncertainEl) {
        uncertainEl.textContent = (brief.uncertainties || []).join(" ");
      }
      if (els.planTitle) els.planTitle.textContent = brief.headline;
      if (conf) {
        conf.textContent = "Confidence: " + brief.confidence;
        conf.setAttribute("aria-label", brief.confidenceWhy || ("Confidence " + brief.confidence));
      }
    }

    if (!plan || !plan.ok || !plan.recommendation) {
      els.planCard.dataset.hasPlan = "false";
      var empty = "Find yourself on the map";
      if (plan && plan.reason) {
        if (/zoom/i.test(plan.reason)) empty = "Zoom in on your land";
        else if (/locate|location/i.test(plan.reason)) empty = "Place yourself, then look nearby";
      }
      if (glance) {
        glance.textContent = brief && brief.timeWindows && brief.timeWindows[0]
          ? ("Best window: " + brief.timeWindows[0].label + " · " + empty)
          : empty;
      }
      if (els.planBody) {
        els.planBody.textContent = (brief && brief.summaryLine ? brief.summaryLine + " " : "") +
          "Locate yourself, or pan to your land and zoom in for an estimated pocket. Never a guarantee of antlers.";
      }
      if (els.planWhy) {
        els.planWhy.textContent = brief && brief.disclaimer
          ? brief.disclaimer
          : "Relative guidance only.";
      }
      if (els.planMeta) {
        els.planMeta.textContent = brief && brief.epistemicNote
          ? brief.epistemicNote
          : "Facts vs analysis vs uncertainty are labeled in signals.";
      }
      if (stats) stats.hidden = true;
      var actions = $("plan-actions") || document.querySelector(".sheds-plan__actions");
      if (actions) actions.hidden = true;
      els.planCard.setAttribute("aria-label", "Today’s Search. " + (brief && brief.headline ? brief.headline + ". " : "") + empty);
      updateNavMeta();
      syncHeatLegend();
      return;
    }

    els.planCard.dataset.hasPlan = "true";
    var actionsOn = $("plan-actions") || document.querySelector(".sheds-plan__actions");
    if (actionsOn) actionsOn.hidden = false;
    var r = plan.recommendation;
    var dist = r.distanceM != null && Planner ? Planner.formatDistance(r.distanceM) : "";
    var dir = r.bearingLabel || "";
    var glanceText = [dir, dist].filter(Boolean).join(" · ");
    if (!glanceText) glanceText = r.walkingHint || "Nearby pocket";
    if (glance) {
      var win = brief && brief.timeWindows && brief.timeWindows[0]
        ? brief.timeWindows[0].label + " · "
        : "";
      glance.textContent = win + glanceText;
    }
    if (stats) {
      stats.hidden = false;
      if ($("plan-stat-dir")) $("plan-stat-dir").textContent = dir || "—";
      if ($("plan-stat-dist")) $("plan-stat-dist").textContent = dist || "—";
      if ($("plan-stat-area")) $("plan-stat-area").textContent = "~" + r.suggestedRadiusM + " m";
      if ($("plan-stat-band")) {
        var bandLabel = r.band === "higher" ? "Higher priority"
          : r.band === "moderate" ? "Moderate"
          : r.band === "lower" ? "Lower"
          : (r.band || "—");
        $("plan-stat-band").textContent = bandLabel;
      }
    }
    if (els.planBody) {
      var walk = r.walkingHint || glanceText;
      els.planBody.textContent =
        (brief && brief.summaryLine ? brief.summaryLine + " " : "") +
        walk +
        " Estimated opportunity only — not a claim that antlers or deer are present.";
    }
    var whyParts = [];
    if (r.why && r.why.length) whyParts = whyParts.concat(r.why.slice(0, 3));
    else if (r.explanation) whyParts.push(r.explanation);
    if (brief && brief.observationInsight) {
      if (brief.observationInsight.sufficient && brief.observationInsight.summary) {
        whyParts.push(brief.observationInsight.summary);
      } else if (brief.observationInsight.insufficiencyReason) {
        whyParts.push(brief.observationInsight.insufficiencyReason);
      }
    }
    if (els.planWhy) els.planWhy.textContent = whyParts.join(" ");
    var meta = [];
    if (brief) meta.push("Confidence: " + brief.confidence + " — " + (brief.confidenceWhy || ""));
    if (plan.remainingHighCount != null && plan.remainingHighCount > 0) {
      meta.push(plan.remainingHighCount + " higher pockets still unmarked thorough");
    }
    meta.push("Layer: " + (state.heatMode === "observed" ? "Observed activity" : "Estimated opportunity"));
    if (els.planMeta) els.planMeta.textContent = meta.join(" · ");
    els.planCard.setAttribute(
      "aria-label",
      "Today’s Search: " + (brief && brief.headline ? brief.headline + ". " : "") + glanceText
    );
    updateNavMeta();
    syncHeatLegend();
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
      fillOpacity: 0.12,
      className: "sheds-target-ring"
    }).addTo(planLayer);
    var marker = L.circleMarker([r.lat, r.lng], {
      radius: 8,
      color: "#0a1410",
      weight: 2,
      fillColor: "#d4e85a",
      fillOpacity: 1,
      className: "sheds-target-dot"
    }).bindTooltip("Suggested next search", { permanent: false });
    marker.addTo(planLayer);
    if (state.userLatLng) {
      L.polyline([
        [state.userLatLng.lat, state.userLatLng.lng],
        [r.lat, r.lng]
      ], { color: "#d4e85a", weight: 2, dashArray: "5 10", opacity: 0.75 }).addTo(planLayer);
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
      setFabLabel(els.btnTrack, "Stop track");
      els.btnTrack.setAttribute("aria-pressed", "true");
    }
    syncSessionPill("Tracking · " + Math.round(session.distanceM || 0) + " m", true);
    if (els.sessionPill) els.sessionPill.dataset.state = "available";
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
      if (updated) syncSessionPill("Tracking · " + Math.round(updated.distanceM || 0) + " m", true);
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
      setFabLabel(els.btnTrack, "Start track");
      els.btnTrack.setAttribute("aria-pressed", "false");
    }
    syncSessionPill("", false);
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
    if (!opts.force && wasGpsDenied()) {
      setLocStatus("denied", "permission was denied — tap Locate to try again");
      return;
    }
    if (navigator.onLine === false && !opts.force) {
      setLocStatus("unavailable", "offline — GPS may still work; tap Locate");
    }
    setLocStatus("finding");
    navigator.geolocation.getCurrentPosition(function (pos) {
      rememberGpsDenied(false);
      var ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      state.userLatLng = ll;
      state.accuracyM = pos.coords.accuracy;
      if (pos.coords.heading != null && !isNaN(pos.coords.heading)) state.headingDeg = pos.coords.heading;
      var accDetail = state.accuracyM != null ? ("±" + Math.round(state.accuracyM) + " m") : "";
      if (state.accuracyM != null && state.accuracyM > 80) {
        accDetail += " · approximate";
      }
      setLocStatus("available", accDetail);
      upsertUserMarker(ll, state.accuracyM, state.headingDeg);
      if (opts.center !== false) {
        state.followUser = true;
        map.setView(ll, Math.max(map.getZoom(), 13), { animate: !document.documentElement.classList.contains("reduced-motion") });
        syncRecenterBtn();
      }
      syncObsLocationHint();
      if (typeof opts.onSuccess === "function") {
        try { opts.onSuccess(ll, pos); } catch (e) { /* */ }
      }
      fetchWeatherSoft(ll.lat, ll.lng).then(function (w) {
        state.weather = w;
        scheduleRecompute(100);
      });
      scheduleRecompute(100);
    }, function (err) {
      if (err && err.code === 1) {
        rememberGpsDenied(true);
        setLocStatus("denied", "permission denied — map stays usable; explore manually");
      } else if (err && err.code === 3) {
        setLocStatus("timeout", "GPS timed out — move to clearer sky and try Locate");
      } else {
        setLocStatus("unavailable", "GPS unavailable — pan the map or try Locate again");
      }
      if (!Store.loadMapView() && state.locationStatus !== "denied") {
        setLocStatus(state.locationStatus === "timeout" ? "timeout" : "manual");
      }
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  function syncObsLocationHint() {
    var hint = $("obs-location-hint");
    if (!hint || !clickLatLng) return;
    var acc = "";
    if (state.userLatLng && state.accuracyM != null &&
        Math.abs(state.userLatLng.lat - clickLatLng.lat) < 1e-6 &&
        Math.abs(state.userLatLng.lng - clickLatLng.lng) < 1e-6) {
      acc = state.accuracyM != null ? (" · GPS ±" + Math.round(state.accuracyM) + " m") : " · at you";
    } else {
      acc = " · map pin";
    }
    hint.textContent =
      "Saving at " + clickLatLng.lat.toFixed(5) + ", " + clickLatLng.lng.toFixed(5) + acc;
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

  function toDatetimeLocalValue(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function fromDatetimeLocalValue(v) {
    if (!v) return null;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function openNewObservation(latlng) {
    clickLatLng = latlng;
    els.obsForm.reset();
    els.obsId.value = "";
    els.obsMode.value = "create";
    $("obs-type").value = "deer_sign";
    $("obs-confidence").value = "probable";
    $("sheds-extra").hidden = true;
    if ($("deer-extra")) $("deer-extra").hidden = true;
    if ($("obs-habitat")) $("obs-habitat").value = "";
    if ($("obs-sex")) $("obs-sex").value = "unknown";
    if ($("obs-class")) $("obs-class").value = "unknown";
    if ($("obs-photo-ref")) $("obs-photo-ref").value = "";
    if ($("obs-when")) $("obs-when").value = toDatetimeLocalValue(new Date().toISOString());
    $("obs-form-title").textContent = "Add observation";
    $("obs-delete").hidden = true;
    toggleObsExtras("deer_sign");
    syncObsLocationHint();
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
    if ($("obs-habitat")) {
      $("obs-habitat").value = (obs.details && obs.details.habitat) || "";
    }
    if ($("obs-when")) $("obs-when").value = toDatetimeLocalValue(obs.observedAt);
    if ($("obs-sex")) $("obs-sex").value = (obs.details && obs.details.sex) || "unknown";
    if ($("obs-class")) $("obs-class").value = (obs.details && obs.details.class) || "unknown";
    if ($("obs-photo-ref")) $("obs-photo-ref").value = obs.photoRef || "";
    toggleObsExtras(obs.type);
    if (obs.type === "shed_found" && obs.details) {
      $("shed-side").value = obs.details.side || "unknown";
      $("shed-freshness").value = obs.details.freshness || "unknown";
      $("shed-count").value = obs.details.antlerCount != null ? obs.details.antlerCount : 1;
      $("shed-collected").checked = !!obs.details.collected;
    }
    $("obs-form-title").textContent = "Edit observation";
    $("obs-delete").hidden = false;
    syncObsLocationHint();
    openSheet(els.sheetObs);
  }

  function toggleShedExtra(type) {
    $("sheds-extra").hidden = type !== "shed_found";
  }

  function toggleObsExtras(type) {
    toggleShedExtra(type);
    if ($("deer-extra")) {
      $("deer-extra").hidden = !(type === "deer_seen" || type === "deer_sign");
    }
  }

  function weatherSnapshotForSave() {
    if (!state.weather) return null;
    return {
      capturedAt: new Date().toISOString(),
      source: state.weather.source || "open-meteo",
      tempC: state.weather.tempC,
      windSpeedMs: state.weather.windSpeedMs,
      snowMm: state.weather.snowMm,
      precipMm24h: state.weather.precipMm24h,
      pressureHpa: state.weather.pressureHpa
    };
  }

  function saveObservation(ev) {
    ev.preventDefault();
    var type = $("obs-type").value;
    var habitat = $("obs-habitat") ? $("obs-habitat").value : "";
    var atMe = !!(state.userLatLng && clickLatLng &&
      Math.abs(state.userLatLng.lat - clickLatLng.lat) < 1e-6 &&
      Math.abs(state.userLatLng.lng - clickLatLng.lng) < 1e-6);
    var whenIso = $("obs-when") ? fromDatetimeLocalValue($("obs-when").value) : null;
    var payload = {
      type: type,
      speciesId: Store.SPECIES_WHITETAIL,
      location: {
        lat: clickLatLng.lat,
        lng: clickLatLng.lng,
        precision: atMe ? "gps" : "map"
      },
      observedAt: whenIso || new Date().toISOString(),
      note: $("obs-note").value.trim(),
      confidence: $("obs-confidence").value,
      quantity: $("obs-quantity").value,
      photoRef: $("obs-photo-ref") ? $("obs-photo-ref").value.trim() : "",
      weatherSnapshot: weatherSnapshotForSave(),
      details: {}
    };
    if (habitat) payload.details.habitat = habitat;
    if (type === "deer_seen" || type === "deer_sign") {
      payload.details.sex = $("obs-sex") ? $("obs-sex").value : "unknown";
      payload.details.class = $("obs-class") ? $("obs-class").value : "unknown";
    }
    if (type === "shed_found") {
      payload.details = Object.assign({}, payload.details, {
        side: $("shed-side").value,
        freshness: $("shed-freshness").value,
        antlerCount: Number($("shed-count").value) || 1,
        collected: $("shed-collected").checked
      });
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

  function openAddObservationFlow() {
    closeAllSheets();
    var ll = state.userLatLng || (map && map.getCenter());
    if (ll) openNewObservation(ll);
  }

  function bindControls() {
    $("btn-locate").addEventListener("click", function () { locateUser({ center: true, force: true }); });
    if ($("btn-here-chip")) {
      $("btn-here-chip").addEventListener("click", function () { locateUser({ center: true, force: true }); });
    }
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
        closeSheet(els.sheetTools);
        syncControlsForm();
        openSheet(els.sheetControls);
      });
    }
    if ($("btn-add-obs")) {
      $("btn-add-obs").addEventListener("click", openAddObservationFlow);
    }
    if ($("btn-add-obs-fab")) {
      $("btn-add-obs-fab").addEventListener("click", openAddObservationFlow);
    }
    if ($("btn-obs-use-gps")) {
      $("btn-obs-use-gps").addEventListener("click", function () {
        locateUser({
          center: false,
          force: true,
          onSuccess: function (ll) {
            clickLatLng = ll;
            syncObsLocationHint();
          }
        });
        if (state.userLatLng && state.locationStatus === "available") {
          clickLatLng = state.userLatLng;
          syncObsLocationHint();
        }
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
      closeSheet(els.sheetTools);
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
      toggleObsExtras($("obs-type").value);
    });
    els.obsForm.addEventListener("submit", saveObservation);
    $("obs-delete").addEventListener("click", deleteObservation);

    $("heat-visible").addEventListener("change", function () {
      state.prefs.heatVisible = $("heat-visible").checked;
      if (heatLayer) heatLayer.setHeatVisible(!!state.prefs.heatVisible);
      Store.saveModelPrefs(state.prefs);
      syncHeatLegend();
      scheduleRecompute(50);
    });
    function readHeatFilterControls() {
      state.heatMode = $("heat-mode") ? $("heat-mode").value : "biological";
      state.heatFilters = {
        timeOfDay: $("heat-tod") ? $("heat-tod").value : "all",
        season: $("heat-season") ? $("heat-season").value : "all",
        weather: $("heat-wx") ? $("heat-wx").value : "any",
        rangeDays: $("heat-range") ? $("heat-range").value : "all"
      };
      try {
        localStorage.setItem("waypoint-sheds-heat-ui-v1", JSON.stringify({
          heatMode: state.heatMode,
          heatFilters: state.heatFilters
        }));
      } catch (e) { /* ignore */ }
    }
    ["heat-mode", "heat-tod", "heat-season", "heat-wx", "heat-range"].forEach(function (id) {
      if (!$(id)) return;
      $(id).addEventListener("change", function () {
        readHeatFilterControls();
        syncHeatLegend();
        scheduleRecompute(80);
      });
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
        syncOfflineBanner();
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
    if ($("heat-mode")) $("heat-mode").value = state.heatMode || "biological";
    var hf = state.heatFilters || {};
    if ($("heat-tod")) $("heat-tod").value = hf.timeOfDay || "all";
    if ($("heat-season")) $("heat-season").value = hf.season || "all";
    if ($("heat-wx")) $("heat-wx").value = hf.weather || "any";
    if ($("heat-range")) $("heat-range").value = hf.rangeDays || "all";
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

  function loadHeatUiPrefs() {
    try {
      var raw = localStorage.getItem("waypoint-sheds-heat-ui-v1");
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed.heatMode === "observed" || parsed.heatMode === "biological") {
        state.heatMode = parsed.heatMode;
      }
      if (parsed.heatFilters && typeof parsed.heatFilters === "object") {
        state.heatFilters = parsed.heatFilters;
      }
    } catch (e) { /* ignore */ }
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
    if (!window.L || !Store || !Model || !Heat || !Sessions || !Planner || !Bio || !Presets || !Validation || !Patterns || !TodaysSearch) {
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
    state.heatFilters = Patterns.defaultHeatFilters();
    loadHeatUiPrefs();
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
      var ver = active.modelVersion ? (" · model " + active.modelVersion) : "";
      syncSessionPill("Resume ready · " + Math.round(active.distanceM || 0) + " m" + ver, true);
      if (els.sessionPill) els.sessionPill.dataset.state = "available";
      if (els.btnTrack) setFabLabel(els.btnTrack, "Resume track");
    } else {
      syncSessionPill("", false);
    }
    if (wasGpsDenied()) {
      setLocStatus("denied", "permission was denied — tap Locate to try again");
    } else {
      locateUser({ center: !Store.loadMapView() });
    }
    setPlanExpanded(false);
    syncHeatLegend();
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
