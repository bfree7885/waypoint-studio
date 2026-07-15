/**
 * Sheds Field Map — topo map, observations, heat, search planner (v0.2).
 */
(function () {
  "use strict";

  var Store = window.WaypointShedsObservations;
  var Model = window.WaypointShedsLikelihood;
  var Heat = window.WaypointShedsHeat;
  var Sessions = window.WaypointShedsSessions;
  var Planner = window.WaypointShedsPlanner;

  var NEUTRAL = { lat: 45.2, lng: -93.5, zoom: 4 }; // labeled neutral — not “you”
  var GRID_ROWS = 18;
  var GRID_COLS = 18;
  var SPECIES_LABEL = "Whitetail deer";

  var state = {
    locationStatus: "finding",
    userLatLng: null,
    watchId: null,
    prefs: null,
    filterTypes: null,
    elevCache: null,
    elevKey: "",
    weather: null,
    recomputeTimer: null,
    firstEthicsShown: false,
    tracking: false,
    activeSessionId: null,
    lastPlan: null
  };

  var els = {};
  var map, heatLayer, userMarker, obsLayer, clickLatLng;
  var trackLayer, coverageLayer, planLayer, recMarker, trackLine;

  function $(id) { return document.getElementById(id); }

  function setLocStatus(code, detail) {
    state.locationStatus = code;
    var label = {
      finding: "Finding location…",
      available: "Current location available",
      denied: "Location permission denied",
      unavailable: "Location unavailable",
      timeout: "Location timed out",
      last: "Using last map position",
      manual: "Manual exploration mode",
      neutral: "Neutral starting view (not your location)"
    }[code] || code;
    if (els.locStatus) {
      els.locStatus.textContent = detail ? label + " — " + detail : label;
      els.locStatus.dataset.state = code;
    }
  }

  function initMap() {
    map = L.map("sheds-map", {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 17,
      minZoom: 3
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);

    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>"
    });
    var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution:
        "Map data: &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, " +
        "<a href=\"http://viewfinderpanoramas.org\">SRTM</a> | " +
        "Map style: &copy; <a href=\"https://opentopomap.org\">OpenTopoMap</a> " +
        "(<a href=\"https://creativecommons.org/licenses/by-sa/3.0/\">CC-BY-SA</a>)"
    });
    topo.addTo(map);
    L.control.layers(
      { "Topographic (OpenTopoMap)": topo, "Street (OSM)": osm },
      null,
      { position: "topright", collapsed: true }
    ).addTo(map);

    obsLayer = L.layerGroup().addTo(map);
    coverageLayer = L.layerGroup().addTo(map);
    trackLayer = L.layerGroup().addTo(map);
    planLayer = L.layerGroup().addTo(map);
    heatLayer = Heat.createHeatLayer(map, { opacity: 0.55 });

    var saved = Store.loadMapView();
    if (saved) {
      map.setView([saved.lat, saved.lng], saved.zoom);
      setLocStatus("last", "saved view");
    } else {
      map.setView([NEUTRAL.lat, NEUTRAL.lng], NEUTRAL.zoom);
      setLocStatus("neutral");
    }

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
      openNewObservation(e.latlng);
    });

    map.whenReady(function () {
      document.getElementById("sheds-map-shell").removeAttribute("aria-busy");
      scheduleRecompute(200);
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

  function recomputeHeat() {
    if (!map || !Model) return;
    if (heatLayer) {
      heatLayer.setHeatVisible(!!state.prefs.heatVisible);
      heatLayer.setHeatOpacity(state.prefs.opacity);
    }
    var bounds = map.getBounds();
    // Avoid huge areas at low zoom — limit extent
    if (map.getZoom() < 9) {
      setModelCoverageNote("Zoom in to compute a local search-priority surface.");
      if (heatLayer) {
        heatLayer.setGrid({ cells: [], bounds: { west: 0, east: 0, south: 0, north: 0 }, rows: 0, cols: 0 });
      }
      updateCoverageUi({ level: "limited", label: "Limited input coverage — zoom for local analysis" });
      updatePlanner(null);
      return;
    }

    var observations = Store.list();
    var center = map.getCenter();

    Promise.all([
      fetchElevations(bounds),
      state.weather ? Promise.resolve(state.weather) : fetchWeatherSoft(center.lat, center.lng)
    ]).then(function (pair) {
      var elev = pair[0];
      if (pair[1]) state.weather = pair[1];
      var grid = Model.buildGrid(bounds, GRID_ROWS, GRID_COLS, {
        date: new Date(),
        prefs: state.prefs,
        observations: observations,
        elevations: elev,
        weather: state.weather,
        sessions: Sessions
      });
      heatLayer.setGrid(grid);
      if (heatLayer.setShowConfidence) {
        heatLayer.setShowConfidence(!!state.prefs.showConfidence);
      }
      updateCoverageUi(grid.coverage);
      setModelCoverageNote(
        grid.disclaimer + " ~" + grid.cellMetersApprox + " m cells. Elevation: " +
        (elev ? "sampled (Open-Meteo)" : "unavailable") + "."
      );
      updateActiveInputsSummary(grid);
      refreshCoverageMarks();
      updatePlanner(grid);
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

  function renderPlanCard(plan) {
    if (!els.planCard) return;
    if (!plan || !plan.ok || !plan.recommendation) {
      els.planTitle.textContent = "Search planner";
      els.planBody.textContent = (plan && plan.reason) || "Zoom in and allow location (or explore) to get a next-area suggestion.";
      els.planWhy.textContent = "";
      els.planMeta.textContent = "";
      return;
    }
    var r = plan.recommendation;
    els.planTitle.textContent = "Suggested next search";
    els.planBody.textContent = r.walkingHint + " Priority band: " + r.band + ".";
    els.planWhy.textContent = r.explanation;
    var meta = [];
    if (r.bearingLabel) meta.push("Direction " + r.bearingLabel);
    if (r.distanceM != null) meta.push(Planner.formatDistance(r.distanceM));
    meta.push("Radius ~" + r.suggestedRadiusM + " m");
    if (plan.coverage) {
      meta.push(plan.coverage.searchedPercentLabel);
      var thoroughShare = plan.coverage.cellsInView
        ? Math.round((plan.coverage.thoroughCells / plan.coverage.cellsInView) * 100)
        : 0;
      meta.push("~" + thoroughShare + "% marked thorough in view");
    }
    meta.push(plan.remainingHighCount + " higher pockets still unmarked thorough");
    els.planMeta.textContent = meta.join(" · ");
    els.planCard.setAttribute(
      "aria-label",
      "Suggested next search: " + els.planBody.textContent + " Why: " + r.explanation +
        " Details: " + els.planMeta.textContent
    );
  }

  function drawPlanOnMap(plan) {
    if (!planLayer) return;
    planLayer.clearLayers();
    recMarker = null;
    if (!plan || !plan.recommendation) return;
    var r = plan.recommendation;
    recMarker = L.circle([r.lat, r.lng], {
      radius: r.suggestedRadiusM,
      color: "#c8f055",
      weight: 2,
      fillColor: "#c8f055",
      fillOpacity: 0.12
    }).addTo(planLayer);
    L.circleMarker([r.lat, r.lng], {
      radius: 7,
      color: "#080f1c",
      weight: 2,
      fillColor: "#c8f055",
      fillOpacity: 1
    }).bindTooltip("Suggested next search", { permanent: false }).addTo(planLayer);
    if (state.userLatLng) {
      L.polyline([
        [state.userLatLng.lat, state.userLatLng.lng],
        [r.lat, r.lng]
      ], { color: "#c8f055", weight: 2, dashArray: "6 8", opacity: 0.85 }).addTo(planLayer);
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
    var session = Sessions.startSession({
      speciesId: Store.SPECIES_WHITETAIL,
      weatherSummary: state.weather ? { snowMm: state.weather.snowMm, source: state.weather.source } : null
    });
    state.activeSessionId = session.id;
    state.tracking = true;
    redrawTrack(session);
    if (els.btnTrack) {
      els.btnTrack.textContent = "Stop track";
      els.btnTrack.setAttribute("aria-pressed", "true");
    }
    if (els.sessionPill) {
      els.sessionPill.textContent = "Session active · " + Math.round(session.distanceM || 0) + " m";
      els.sessionPill.dataset.state = "available";
    }
    if (state.watchId != null) navigator.geolocation.clearWatch(state.watchId);
    state.watchId = navigator.geolocation.watchPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      state.userLatLng = L.latLng(lat, lng);
      setLocStatus("available", "tracking");
      if (!userMarker) {
        userMarker = L.circleMarker(state.userLatLng, {
          radius: 8, color: "#1a1a1a", weight: 2, fillColor: "#c8f055", fillOpacity: 0.95
        }).addTo(map);
      } else userMarker.setLatLng(state.userLatLng);
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
      els.btnTrack.textContent = "Start track";
      els.btnTrack.setAttribute("aria-pressed", "false");
    }
    if (els.sessionPill) {
      els.sessionPill.textContent = "No active session";
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
      setLocStatus("available");
      if (!userMarker) {
        userMarker = L.circleMarker(ll, {
          radius: 8,
          color: "#1a1a1a",
          weight: 2,
          fillColor: "#c8f055",
          fillOpacity: 0.95
        }).addTo(map);
        userMarker.bindTooltip("You (approximate)", { direction: "top" });
      } else {
        userMarker.setLatLng(ll);
      }
      if (opts.center !== false) {
        map.setView(ll, Math.max(map.getZoom(), 13));
      }
      fetchWeatherSoft(ll.lat, ll.lng).then(function (w) {
        state.weather = w;
        scheduleRecompute(100);
      });
      scheduleRecompute(100);
    }, function (err) {
      if (err && err.code === 1) setLocStatus("denied", "map stays usable — explore manually");
      else if (err && err.code === 3) setLocStatus("timeout", "try Locate me again");
      else setLocStatus("unavailable");
      if (!Store.loadMapView()) setLocStatus(state.locationStatus === "denied" ? "denied" : "manual");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  /* —— Sheets —— */
  function openSheet(el) {
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    var focusable = el.querySelector("button, [href], input, select, textarea");
    if (focusable) focusable.focus();
  }

  function closeSheet(el) {
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
  }

  function closeAllSheets() {
    [els.sheetObs, els.sheetControls, els.sheetExplain, els.sheetEthics, els.sheetHistory].forEach(function (s) {
      if (s) closeSheet(s);
    });
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
    var cell = heatLayer && heatLayer.nearestCell(latlng);
    var text;
    if (!cell || !cell.result) {
      text = "No local search-priority cell here. Zoom in with the heat map on to analyze the visible area.";
      if (els.explainBreakdown) els.explainBreakdown.textContent = "";
      if (els.explainTaxonomy) els.explainTaxonomy.textContent = "";
    } else {
      text = Model.explain(cell.result, { coverage: heatLayer.getGrid() && heatLayer.getGrid().coverage });
      if (els.explainBreakdown && cell.result.contributionBreakdown) {
        els.explainBreakdown.textContent = cell.result.contributionBreakdown.map(function (row) {
          return row.label + ": " + (Math.round(row.value * 1000) / 1000) +
            (row.dataKind ? " [" + row.dataKind + "]" : "");
        }).join(" · ");
      }
      if (els.explainTaxonomy && cell.result.taxonomy) {
        var tax = cell.result.taxonomy;
        var conf = cell.result.confidence || {};
        els.explainTaxonomy.textContent = [
          "Observed: " + (tax.observed.join("; ") || "none in range"),
          "Inferred: " + (tax.inferred.join("; ") || "none"),
          "Ecological assumptions: " + (tax.ecologicalAssumptions.join("; ") || "none"),
          "User preferences: " + (tax.userPreferences.join("; ") || "default weights"),
          "Confidence (not probability): bio " + conf.biological +
            " · env " + conf.environmentalData +
            " · obs " + conf.observationDensity +
            " · overall " + conf.overallRecommendation
        ].join("\n");
      }
      if (els.explainTech) {
        els.explainTech.textContent = JSON.stringify({
          modelVersion: cell.result.modelVersion,
          band: cell.band,
          priority: Math.round(cell.priority * 100) / 100,
          coverageLevel: cell.coverageLevel || null,
          confidence: cell.result.confidence,
          taxonomy: cell.result.taxonomy,
          parts: cell.result.parts,
          sources: cell.result.sources,
          contributionBreakdown: cell.result.contributionBreakdown,
          calibration: cell.result.calibration
        }, null, 2);
      }
    }
    els.explainBody.textContent = text;
    openSheet(els.sheetExplain);
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
        mins + " min, obs " + (s.observationIds || []).length + ", sheds " + (s.shedsFound || 0));
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
    if ($("btn-goto-plan")) {
      $("btn-goto-plan").addEventListener("click", function () {
        if (state.lastPlan && state.lastPlan.recommendation) {
          var r = state.lastPlan.recommendation;
          map.setView([r.lat, r.lng], Math.max(map.getZoom(), 14));
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
        sessions: Sessions ? Sessions.exportBundle() : null
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "sheds-field-private.json";
      a.click();
      URL.revokeObjectURL(a.href);
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

    document.querySelectorAll("[data-weight]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        state.prefs.weights[sel.getAttribute("data-weight")] = sel.value;
        Store.saveModelPrefs(state.prefs);
        scheduleRecompute(120);
      });
    });

    $("btn-reset-weights").addEventListener("click", function () {
      state.prefs = Store.defaultModelPrefs();
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
    if ($("confidence-overlay")) $("confidence-overlay").checked = !!state.prefs.showConfidence;
    if ($("coverage-visible")) $("coverage-visible").checked = state.prefs.coverageVisible !== false;
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
    if (!window.L || !Store || !Model || !Heat || !Sessions || !Planner || !window.WaypointShedsBiological) {
      requestAnimationFrame(boot);
      return;
    }
    els.locStatus = $("loc-status");
    els.obsCount = $("obs-count");
    els.coverage = $("coverage-pill");
    els.sessionPill = $("session-pill");
    els.modelNote = $("model-note");
    els.inputsSummary = $("inputs-summary");
    els.planCard = $("plan-card");
    els.planTitle = $("plan-title");
    els.planBody = $("plan-body");
    els.planWhy = $("plan-why");
    els.planMeta = $("plan-meta");
    els.sheetObs = $("sheet-obs");
    els.sheetControls = $("sheet-controls");
    els.sheetExplain = $("sheet-explain");
    els.sheetEthics = $("sheet-ethics");
    els.sheetHistory = $("sheet-history");
    els.historyBody = $("history-body");
    els.obsForm = $("obs-form");
    els.obsId = $("obs-id");
    els.obsMode = $("obs-mode");
    els.explainBody = $("explain-body");
    els.explainTech = $("explain-tech");
    els.explainBreakdown = $("explain-breakdown");
    els.explainTaxonomy = $("explain-taxonomy");

    state.prefs = Store.loadModelPrefs();
    if (state.prefs.showConfidence == null) state.prefs.showConfidence = false;
    if (state.prefs.coverageVisible == null) state.prefs.coverageVisible = true;
    fillTypeSelects();
    initMap();
    bindControls();
    syncControlsForm();
    refreshObservations();
    refreshCoverageMarks();
    var active = Sessions.getActiveSession();
    if (active) {
      state.activeSessionId = active.id;
      redrawTrack(active);
      if (els.sessionPill) {
        els.sessionPill.textContent = "Resume ready · " + Math.round(active.distanceM || 0) + " m";
        els.sessionPill.dataset.state = "available";
      }
      if (els.btnTrack) els.btnTrack.textContent = "Resume track";
    }
    locateUser({ center: !Store.loadMapView() });
    $("ethics-ack").addEventListener("click", onEthicsAck);
    maybeEthics();

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
