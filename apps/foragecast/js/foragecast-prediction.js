/**
 * ForageCast season table UI
 */
(function () {
  "use strict";

  var state = {
    species: null,
    speciesList: [],
    zones: [],
    conditions: null,
    factorLabels: {},
    legend: [],
    selectedSpeciesId: "morels",
    selectedZoneId: null,
    prediction: null
  };

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

  function getSpecies() {
    return state.speciesList.find(function (s) { return s.id === state.selectedSpeciesId; });
  }

  function getZone(id) {
    return state.zones.find(function (z) { return z.id === id; });
  }

  function renderSpeciesButtons() {
    return state.speciesList.map(function (sp) {
      var active = sp.id === state.selectedSpeciesId ? " is-active" : "";
      return (
        '<button type="button" class="fc-species-btn' + active + '" data-species="' + escapeHtml(sp.id) + '">' +
          escapeHtml(sp.name) +
          '<span class="fc-species-btn__sci">' + escapeHtml(sp.scientificName) + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderPredictionPanel(pred, species) {
    var changes = (state.conditions.whatChangedThisWeek || []).map(function (c) {
      return "<li>" + escapeHtml(c) + "</li>";
    }).join("");

    var lookFor = (pred.lookForOutside || []).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");

    return (
      '<section class="fc-prediction-panel" aria-labelledby="fc-pred-title">' +
        '<div class="fc-prediction-panel__header">' +
          '<div>' +
            '<p class="wds-eyebrow">Educational index · week of ' + escapeHtml(state.conditions.weekOf) + "</p>" +
            '<h2 class="fc-section__title" id="fc-pred-title" style="margin:0;">' + escapeHtml(species.name) + " · field index</h2>" +
            '<p class="wds-body" style="margin-top:var(--wds-space-1); font-size:var(--wds-text-xs); color:var(--wds-text-tertiary);">' +
              "Season window: " + escapeHtml(species.seasonWindow) +
            "</p>" +
          "</div>" +
          '<div class="fc-readiness-score" aria-label="Rough readiness index, about ' + pred.readinessScore + ' out of 100">' +
            '<span class="fc-readiness-score__value">~' + pred.readinessScore + "</span>" +
            '<span class="fc-readiness-score__label">rough index</span>' +
            '<span class="fc-readiness-badge fc-readiness-badge--' + pred.level + '">' + escapeHtml(
              window.WDS && (WDS.researchIntegrity || WDS.provenance)
                ? (WDS.researchIntegrity || WDS.provenance).readinessBandLabel(pred.level)
                : pred.level
            ) + "</span>" +
          "</div>" +
        "</div>" +
        '<p class="fc-confidence"><strong>' + escapeHtml(pred.confidence.label) + ":</strong> " + escapeHtml(pred.confidence.reason) + "</p>" +
        '<p class="fc-prediction-explain">' + escapeHtml(pred.explanation) + "</p>" +
        '<p class="wds-eyebrow">What changed this week</p>' +
        '<ul class="fc-changes-list">' + changes + "</ul>" +
        '<div class="fc-look-for">' +
          '<p class="wds-eyebrow">What to look for outside</p>' +
          "<ul>" + lookFor + "</ul>" +
        "</div>" +
      "</section>"
    );
  }

  function mapControlsHtml() {
    if (window.WDS && WDS.mapView && WDS.mapView.controlsHtml) {
      return WDS.mapView.controlsHtml();
    }
    return "";
  }

  function bindMapViews() {
    var root = document.getElementById("fc-season-table");
    if (!root || !window.WDS || !WDS.mapView) return;
    var loc = state.conditions && state.conditions._location;
    var mapOpts = window.ForageCastBoot ? { base: ForageCastBoot.ENGINE_BASE } : {};
    WDS.mapView.bindAll(root, loc, mapOpts);
  }

  function renderMap(pred) {
    var zoneResults = pred.zoneResults;
    var species = getSpecies();
    var topZoneId = pred.topZones[0] ? pred.topZones[0].zoneId : null;
    var paths = state.zones.map(function (zone) {
      var zr = zoneResults.find(function (z) { return z.zoneId === zone.id; });
      var level = zr ? zr.level : "low";
      var selected = state.selectedZoneId === zone.id ? " is-selected" : "";
      var top = zone.id === topZoneId ? " is-top" : "";
      return (
        '<path class="fc-zone fc-zone--' + level + selected + top + '" data-zone="' + escapeHtml(zone.id) + '" ' +
          'd="' + zone.svgPath + '" tabindex="0" role="button" ' +
          'aria-label="' + escapeHtml(zone.name) + ', ' + escapeHtml(window.ForageCastHeat ? ForageCastHeat.bandLabel(level) : level) + ' (model estimate)">' +
        "</path>" +
        '<text class="fc-zone-label" x="' + zone.labelX + '" y="' + zone.labelY + '">' + escapeHtml(zone.name.split(" ")[0]) + "</text>"
      );
    }).join("");

    var detail = renderZoneDetail();
    var snapshot = window.ForageCastHeat
      ? ForageCastHeat.buildSnapshot(species, state.zones, state.conditions, state.legend)
      : null;
    var loc = state.conditions && state.conditions._location;

    return (
      '<section class="fc-map-panel" aria-labelledby="fc-map-title">' +
        (snapshot ? ForageCastHeat.renderMapHeader(snapshot, loc) : "") +
        '<div class="wds-map-viewport fc-map-wrap" data-wds-map-view tabindex="0" role="region" aria-label="' + escapeHtml(snapshot ? ForageCastHeat.mapMetaTitle(snapshot, loc) : "Terrain zones") + '">' +
          mapControlsHtml() +
          '<div class="wds-map-stage">' +
            '<svg class="fc-terrain-svg" viewBox="0 0 420 300" width="420" height="300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
              '<rect width="420" height="300" fill="#112038" rx="4"/>' +
              '<text x="210" y="24" text-anchor="middle" font-size="10" fill="rgba(228,234,244,0.45)">N ↑ · ' + escapeHtml(ForageCastLocation.mapLabel()) + "</text>" +
              paths +
            "</svg>" +
          "</div>" +
        "</div>" +
        (window.ForageCastHeat ? ForageCastHeat.renderLegend(state.legend) : "") +
        '<div class="fc-zone-detail" id="fc-zone-detail">' + detail + "</div>" +
        (window.ForageCastHeat ? ForageCastHeat.renderDisclaimer() : "") +
      "</section>"
    );
  }

  function renderZoneDetail() {
    var zoneId = state.selectedZoneId;
    if (!zoneId && state.prediction && state.prediction.topZones[0]) {
      zoneId = state.prediction.topZones[0].zoneId;
    }
    var zone = getZone(zoneId);
    if (!zone) {
      return (
        '<p class="fc-zone-detail__name">Tap a terrain zone</p>' +
        '<p>Each band combines elevation, aspect, moisture, and habitat — estimates only, not exact spots.</p>'
      );
    }
    var zr = state.prediction.zoneResults.find(function (z) { return z.zoneId === zone.id; });
    var species = getSpecies();
    var band = window.ForageCastHeat ? ForageCastHeat.bandLabel(zr.level) : zr.level;
    var why = window.ForageCastHeat
      ? ForageCastHeat.zoneWhyHere(zone, zr, species, state.conditions, state.factorLabels)
      : null;

    return (
      '<p class="fc-zone-detail__name">' + escapeHtml(zone.name) + " · " + escapeHtml(band) + "</p>" +
      (why ? ForageCastHeat.renderWhyHere(why) : "") +
      "<dl>" +
        "<dt>Elevation</dt><dd>" + escapeHtml(zone.elevation) + "</dd>" +
        "<dt>Aspect</dt><dd>" + escapeHtml(zone.aspect) + "</dd>" +
        "<dt>Moisture</dt><dd>" + escapeHtml(zone.moisture) + "</dd>" +
        "<dt>Habitat</dt><dd>" + escapeHtml(zone.habitat) + "</dd>" +
        "<dt>Land cover</dt><dd>" + escapeHtml(zone.landCover) + "</dd>" +
      "</dl>"
    );
  }

  function renderFactors(pred) {
    var rows = Object.keys(pred.factorWeights).map(function (key) {
      var value = pred.factors[key] != null ? pred.factors[key] : 0;
      var pct = Math.round(value * 100);
      var label = state.factorLabels[key] || key;
      var weight = Math.round((pred.factorWeights[key] || 0) * 100);
      return (
        '<div class="fc-factor-row">' +
          '<span class="fc-factor-row__label">' + escapeHtml(label) + " <span style=\"color:var(--wds-text-muted);font-size:0.7rem;\">(" + weight + "% wt)</span></span>" +
          '<div class="fc-factor-row__track"><div class="fc-factor-row__fill" style="width:' + pct + '%"></div></div>' +
          '<span class="fc-factor-row__pct">' + pct + "%</span>" +
        "</div>"
      );
    }).join("");

    var regionName = state.conditions && state.conditions.region ? state.conditions.region.county : "this region";
    return (
      '<section class="fc-factors-panel" aria-labelledby="fc-factors-title">' +
        '<h3 id="fc-factors-title">Model factors · educational index</h3>' +
        '<p class="wds-body" style="margin:0 0 var(--wds-space-4); font-size:var(--wds-text-sm); color:var(--wds-text-secondary);">' +
          "Weighted inputs for this species in " + escapeHtml(regionName) + ". Placeholder values from local JSON — not live weather." +
        "</p>" +
        '<div class="fc-factor-bars">' + rows + "</div>" +
      "</section>"
    );
  }

  function renderExplain(pred, species) {
    var why = (pred.whyFactors || []).map(function (w) {
      return "<li>" + escapeHtml(w) + "</li>";
    }).join("");

    var inv = species.investigation || {};
    var lesson = species.lessonNext || {};

    return (
      '<section class="fc-explain-panel" aria-labelledby="fc-explain-title">' +
        '<h3 id="fc-explain-title">Why this index?</h3>' +
        '<p class="wds-body" style="margin:0 0 var(--wds-space-3); font-size:var(--wds-text-sm); color:var(--wds-text-secondary);">' +
          "The model is a reading guide — season, rain, temperature, moisture, elevation, aspect, trees, and land cover. " +
          "It suggests where to walk, not what you will find." +
        "</p>" +
        '<ul class="fc-explain-why">' + why + "</ul>" +
        '<div class="fc-explain-links">' +
          '<span><strong>Read next:</strong> ' + escapeHtml(lesson.title || "Species 101") + " (homepage)</span>" +
          '<span><strong>Weekend:</strong> see Test the Prediction below</span>' +
        "</div>" +
      "</section>"
    );
  }

  function renderTestCard(species) {
    var inv = species.investigation || {};
    function list(items) {
      return (items || []).map(function (i) { return "<li>" + escapeHtml(i) + "</li>"; }).join("");
    }

    return (
      '<section class="fc-test-card" aria-labelledby="fc-test-title">' +
        '<h3 id="fc-test-title">Test the prediction</h3>' +
        '<p class="fc-test-card__subtitle">Go outside. See if the forest agrees with the map.</p>' +
        '<div class="fc-test-grid">' +
          '<div class="fc-test-block"><h4>Where to walk</h4><p>' + escapeHtml(inv.where) + "</p></div>" +
          '<div class="fc-test-block"><h4>What to observe</h4><ul>' + list(inv.observe) + "</ul></div>" +
          '<div class="fc-test-block"><h4>What to photograph</h4><ul>' + list(inv.photograph) + "</ul></div>" +
          '<div class="fc-test-block"><h4>What to write down</h4><ul>' + list(inv.writeDown) + "</ul></div>" +
          '<div class="fc-test-block fc-test-block--caution"><h4>What not to disturb</h4><ul>' + list(inv.doNotDisturb) + "</ul></div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderCitizenScience() {
    return (
      '<section class="fc-cs-note" aria-labelledby="fc-cs-title">' +
        '<p id="fc-cs-title"><strong>Private by default.</strong> Save field notes on paper or in your own journal. ' +
        "Optional anonymous contribution — phenology phase at county level, never exact harvest spots — " +
        "can help improve seasonal models later. No login required. Opt out entirely anytime.</p>" +
      "</section>"
    );
  }

  function updatePrediction() {
    var species = getSpecies();
    if (!species) return;
    state.prediction = ForageCastModel.computeCountyPrediction(species, state.zones, state.conditions);
  }

  function render() {
    var mount = document.getElementById("fc-season-table");
    if (!mount) return;

    var species = getSpecies();
    updatePrediction();
    var pred = state.prediction;
    var region = state.conditions.region;

    mount.innerHTML =
      '<a class="fc-tool-back" href="index.html">← ForageCast home</a>' +
      '<div class="fc-tool-layout">' +
        '<aside class="fc-tool-sidebar">' +
          '<div class="fc-location-card">' +
            '<p class="wds-eyebrow" style="margin:0;">Location</p>' +
            '<p class="fc-location-card__region">' + escapeHtml(region.county) + ", " + escapeHtml(region.state) + "</p>" +
            '<p class="fc-location-card__bio">' + escapeHtml(region.bioregion) + "</p>" +
            '<p class="fc-location-card__note">' + escapeHtml(ForageCastLocation.locationNote(state.conditions._location)) + "</p>" +
          "</div>" +
          '<div class="fc-species-select">' +
            '<label id="fc-species-label">Species</label>' +
            '<div role="group" aria-labelledby="fc-species-label">' + renderSpeciesButtons() + "</div>" +
          "</div>" +
        "</aside>" +
        '<div class="fc-tool-main">' +
          renderPredictionPanel(pred, species) +
          renderMap(pred) +
          renderFactors(pred) +
          renderExplain(pred, species) +
          renderTestCard(species) +
          renderCitizenScience() +
        "</div>" +
      "</div>";

    bindEvents();
    bindMapViews();
  }

  function bindEvents() {
    document.querySelectorAll(".fc-species-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedSpeciesId = btn.getAttribute("data-species");
        state.selectedZoneId = null;
        render();
      });
    });

    document.querySelectorAll(".fc-zone").forEach(function (path) {
      function select() {
        state.selectedZoneId = path.getAttribute("data-zone");
        var detail = document.getElementById("fc-zone-detail");
        if (detail) detail.innerHTML = renderZoneDetail();
        document.querySelectorAll(".fc-zone").forEach(function (p) { p.classList.remove("is-selected"); });
        path.classList.add("is-selected");
      }
      path.addEventListener("click", select);
      path.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
      });
    });
  }

  function initFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var sp = params.get("species");
    if (sp && state.speciesList.some(function (s) { return s.id === sp; })) {
      state.selectedSpeciesId = sp;
    }
  }

  function loadSeasonTable(loc) {
    var platformPromise = window.ForageCastBoot && ForageCastBoot.fetchPlatform
      ? ForageCastBoot.fetchPlatform(loc)
      : Promise.resolve(null);

    Promise.all([
      fetchJson("data/species-model.json"),
      fetchJson("data/conditions.json"),
      fetchJson("data/terrain-zones.json"),
      platformPromise
    ]).then(function (results) {
      state.speciesList = results[0].species;
      state.factorLabels = results[0].factorLabels;
      state.conditions = results[1];
      state.zones = results[2].zones;
      state.legend = results[2].legend;
      state.mapTitle = results[2].mapTitle;
      var platform = results[3];
      if (window.ForageCastLocation) {
        ForageCastLocation.applyToConditions(state.conditions, loc, platform);
      }
      if (platform && window.ForageCastModel && ForageCastModel.setCalendarContext) {
        ForageCastModel.setCalendarContext(platform.calendar);
      }
      initFromQuery();
      render();
      var mount = document.getElementById("fc-season-table");
      if (mount) mount.removeAttribute("aria-busy");
    }).catch(function (err) {
      var mount = document.getElementById("fc-season-table");
      if (mount) {
        mount.innerHTML = "<p>Could not load season table: " + escapeHtml(err.message) + "</p>";
        mount.removeAttribute("aria-busy");
      }
    });
  }

  function init() {
    function start(loc) {
      loadSeasonTable(loc);
    }
    if (window.ForageCastBoot) {
      ForageCastBoot.bootstrapLocation().then(start);
    } else {
      start(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
