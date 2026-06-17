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
            '<p class="wds-eyebrow">Prediction · week of ' + escapeHtml(state.conditions.weekOf) + "</p>" +
            '<h2 class="fc-section__title" id="fc-pred-title" style="margin:0;">' + escapeHtml(species.name) + " readiness</h2>" +
            '<p class="wds-body" style="margin-top:var(--wds-space-1); font-size:var(--wds-text-xs); color:var(--wds-text-tertiary);">' +
              "Season window: " + escapeHtml(species.seasonWindow) +
            "</p>" +
          "</div>" +
          '<div class="fc-readiness-score" aria-label="Readiness score ' + pred.readinessScore + ' out of 100">' +
            '<span class="fc-readiness-score__value">' + pred.readinessScore + "</span>" +
            '<span class="fc-readiness-score__label">readiness</span>' +
            '<span class="fc-readiness-badge fc-readiness-badge--' + pred.level + '">' + escapeHtml(pred.level) + "</span>" +
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

  function renderMap(pred) {
    var zoneResults = pred.zoneResults;
    var paths = state.zones.map(function (zone) {
      var zr = zoneResults.find(function (z) { return z.zoneId === zone.id; });
      var level = zr ? zr.level : "low";
      var selected = state.selectedZoneId === zone.id ? " is-selected" : "";
      return (
        '<path class="fc-zone fc-zone--' + level + selected + '" data-zone="' + escapeHtml(zone.id) + '" ' +
          'd="' + zone.svgPath + '" tabindex="0" role="button" ' +
          'aria-label="' + escapeHtml(zone.name) + ', ' + level + ' readiness">' +
        "</path>" +
        '<text class="fc-zone-label" x="' + zone.labelX + '" y="' + zone.labelY + '">' + escapeHtml(zone.name.split(" ")[0]) + "</text>"
      );
    }).join("");

    var legend = state.legend.map(function (item) {
      return "<span><i class=\"fc-zone--" + item.level + "\" style=\"background:" + legendColor(item.level) + "\"></i> " + escapeHtml(item.label) + "</span>";
    }).join("");

    var detail = renderZoneDetail();

    return (
      '<section class="fc-map-panel" aria-labelledby="fc-map-title">' +
        '<h3 class="fc-map-panel__title" id="fc-map-title">' + escapeHtml(state.mapTitle || "Terrain zones") + "</h3>" +
        '<div class="fc-map-wrap">' +
          '<svg class="fc-terrain-svg" viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" aria-label="Terrain zone heat map">' +
            '<rect width="420" height="300" fill="#e8e2d8" rx="4"/>' +
            '<text x="210" y="24" text-anchor="middle" font-size="10" fill="rgba(61,56,48,0.5)">N ↑ · Pike County schematic</text>' +
            paths +
          "</svg>" +
        "</div>" +
        '<div class="fc-map-legend">' + legend + "</div>" +
        '<div class="fc-zone-detail" id="fc-zone-detail">' + detail + "</div>" +
      "</section>"
    );
  }

  function legendColor(level) {
    if (level === "high") return "rgba(168, 191, 176, 0.7)";
    if (level === "moderate") return "rgba(168, 191, 176, 0.35)";
    return "rgba(80, 75, 68, 0.35)";
  }

  function renderZoneDetail() {
    var zoneId = state.selectedZoneId;
    if (!zoneId && state.prediction && state.prediction.topZones[0]) {
      zoneId = state.prediction.topZones[0].zoneId;
    }
    var zone = getZone(zoneId);
    if (!zone) {
      return '<p class="fc-zone-detail__name">Click a zone on the map</p><p>See elevation, aspect, moisture, and habitat hints for each terrain band.</p>';
    }
    var zr = state.prediction.zoneResults.find(function (z) { return z.zoneId === zone.id; });
    var score = zr ? Math.round(zr.score * 100) : "—";

    return (
      '<p class="fc-zone-detail__name">' + escapeHtml(zone.name) + " · " + score + " readiness</p>" +
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

    return (
      '<section class="fc-factors-panel" aria-labelledby="fc-factors-title">' +
        '<h3 id="fc-factors-title">Model factors</h3>' +
        '<p class="wds-body" style="margin:0 0 var(--wds-space-4); font-size:var(--wds-text-sm); color:var(--wds-text-secondary);">' +
          "Weighted inputs for this species in Pike County. Placeholder values from local JSON — not live weather." +
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
        '<h3 id="fc-explain-title">Why this score?</h3>' +
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

  function init() {
    Promise.all([
      fetchJson("data/species-model.json"),
      fetchJson("data/conditions.json"),
      fetchJson("data/terrain-zones.json")
    ]).then(function (results) {
      state.speciesList = results[0].species;
      state.factorLabels = results[0].factorLabels;
      state.conditions = results[1];
      state.zones = results[2].zones;
      state.legend = results[2].legend;
      state.mapTitle = results[2].mapTitle;
      initFromQuery();
      render();
    }).catch(function (err) {
      var mount = document.getElementById("fc-season-table");
      if (mount) mount.innerHTML = "<p>Could not load season table: " + escapeHtml(err.message) + "</p>";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
