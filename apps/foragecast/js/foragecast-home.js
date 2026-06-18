/**
 * ForageCast homepage renderer — field guide, not dashboard
 */
(function () {
  "use strict";

  var PREVIEW_SPECIES_ID = "morels";
  var homeHeatState = { selectedZoneId: null };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mediaSlot(label, hint, extraClass) {
    return (
      '<div class="fc-media-slot' + (extraClass ? " " + extraClass : "") + '" role="img" aria-label="' + escapeHtml(label) + '">' +
        '<span class="fc-media-slot__label">' + escapeHtml(label) + "</span>" +
        (hint ? '<p class="fc-media-slot__hint">' + escapeHtml(hint) + "</p>" : "") +
      "</div>"
    );
  }

  function renderHero(data) {
    var loc = data._location;
    var regionLabel = loc
      ? loc.name + ", " + (loc.stateCode || loc.state)
      : data.region.county + ", PA";
    var defaultNote = loc && loc.isDefault
      ? '<p class="fc-location-bar__status">Using default region: Pike County, PA</p>'
      : "";

    return (
      '<section class="fc-hero" aria-labelledby="fc-hero-title">' +
        '<p class="wds-eyebrow">ForageCast · ' + escapeHtml(regionLabel) + "</p>" +
        defaultNote +
        '<h1 class="fc-hero__question" id="fc-hero-title">' + escapeHtml(data.hero.question) + "</h1>" +
        '<p class="fc-hero__lead">' + escapeHtml(data.hero.lead) + "</p>" +
        '<div style="margin-top: var(--wds-space-6); max-width: 14rem; margin-inline: auto;">' +
          mediaSlot("Field guide illustration · placeholder", "Mushroom & leaf sketch") +
        "</div>" +
      "</section>"
    );
  }

  function renderLocationBar(data) {
    var loc = data._location;
    if (!loc || !window.ForageCastLocation) return "";
    return (
      '<div class="fc-location-bar" id="fc-location-bar">' +
        '<p class="fc-location-bar__status">' + escapeHtml(ForageCastLocation.locationNote(loc)) + "</p>" +
        '<div class="fc-location-bar__actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fc-loc-retry">Use my location</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fc-loc-change">Change region</button>' +
        "</div>" +
        '<form class="fc-location-bar__search wds-location-search is-hidden" id="fc-loc-change-form">' +
          '<label class="wds-location-search__label" for="fc-loc-input">Search county</label>' +
          '<div class="wds-location-search__row">' +
            '<input class="wds-location-search__input" id="fc-loc-input" list="fc-loc-list" placeholder="County, ST" autocomplete="off">' +
            '<datalist id="fc-loc-list"></datalist>' +
            '<button type="submit" class="wds-btn wds-btn--secondary wds-btn--sm">Set</button>' +
          "</div>" +
        "</form>" +
      "</div>"
    );
  }

  function renderRegionalStatus(data) {
    var rs = data.regionalStatus;
    var w = rs.weather;
    var outlook = (rs.fruitingOutlook || []).map(function (item) {
      return (
        "<li>" +
          '<span class="fc-outlook-list__species">' + escapeHtml(item.species) + "</span>" +
          '<span class="fc-outlook-list__status">' + escapeHtml(item.status.replace(/-/g, " ")) + "</span>" +
          '<span class="fc-outlook-list__note">' + escapeHtml(item.note) + "</span>" +
        "</li>"
      );
    }).join("");

    return (
      '<section class="fc-section" id="regional-status" aria-labelledby="fc-status-title">' +
        renderLocationBar(data) +
        '<p class="fc-section__eyebrow">Regional status · ' + escapeHtml(data.region.county) + " / " + escapeHtml(data.region.state) + "</p>" +
        '<h2 class="fc-section__title" id="fc-status-title">' + escapeHtml(rs.headline) + "</h2>" +
        '<p class="fc-section__lead">' + escapeHtml(rs.summary) + "</p>" +
        '<div class="fc-status-grid">' +
          '<aside class="fc-weather-card" aria-label="Weather this week">' +
            "<p class=\"fc-section__eyebrow\" style=\"margin:0;\">" + escapeHtml(w.label) + "</p>" +
            '<p class="fc-weather-card__temp">' + escapeHtml(w.high) + " · " + escapeHtml(w.low) + "</p>" +
            "<dl>" +
              "<dt>Conditions</dt><dd>" + escapeHtml(w.conditions) + "</dd>" +
              "<dt>Soil moisture</dt><dd>" + escapeHtml(w.soilMoisture) + "</dd>" +
            "</dl>" +
          "</aside>" +
          '<div>' +
            '<p class="wds-eyebrow" style="margin-bottom: var(--wds-space-3);">What might be fruiting</p>' +
            '<ul class="fc-outlook-list">' + outlook + "</ul>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderThisWeek(data) {
    var tw = data.thisWeekOutdoors;
    return (
      '<section class="fc-section" id="this-week-outdoors" aria-labelledby="fc-week-title">' +
        '<p class="fc-section__eyebrow">This week outdoors</p>' +
        '<h2 class="fc-section__title" id="fc-week-title">' + escapeHtml(tw.title) + "</h2>" +
        '<div class="fc-week-card">' +
          '<p class="fc-section__lead" style="margin-bottom:0;">' + escapeHtml(tw.summary) + "</p>" +
          '<div class="fc-week-split">' +
            "<div><p class=\"wds-eyebrow\">Weekdays — learn</p><p class=\"wds-body\">" + escapeHtml(tw.weekday) + "</p></div>" +
            "<div><p class=\"wds-eyebrow\">Weekend — observe</p><p class=\"wds-body\">" + escapeHtml(tw.weekend) + "</p></div>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderSpotlight(data) {
    if (!data.speciesSpotlight) return "";

    var SS = window.WDS && WDS.speciesSpotlight;
    if (!SS) return "";

    var resolved = SS.resolveFeatured(data, { weekOf: data.weekOf });
    if (!resolved.species) return "";

    var moduleHtml = SS.renderModule(resolved, { showDisclosure: true });

    return (
      '<section class="fc-section" id="species-spotlight" aria-labelledby="wss-species-name">' +
        moduleHtml +
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
    if (window.WDS && WDS.mapView) {
      WDS.mapView.bindAll(document.getElementById("foragecast-home"));
    }
  }

  function renderHeatMap(data) {
    var snapshot = data._heatSnapshot;
    var loc = data._location;
    if (!snapshot || !window.ForageCastHeat) {
      return '<p class="wds-body">Heat map preview unavailable.</p>';
    }

    var topId = snapshot.topZoneId;
    var selectedId = homeHeatState.selectedZoneId || topId;

    var cells = snapshot.zoneResults.map(function (zr) {
      var zone = zr.zone;
      if (!zone) return "";
      var classes = "fc-heatmap__cell fc-heatmap__cell--" + zr.level + " is-zone";
      if (zr.zoneId === selectedId) classes += " is-selected";
      if (zr.zoneId === topId) classes += " is-top";
      return (
        '<button type="button" class="' + classes + '" data-zone="' + escapeHtml(zr.zoneId) + '" aria-pressed="' + (zr.zoneId === selectedId ? "true" : "false") + '">' +
          '<span class="fc-heatmap__zone-name">' + escapeHtml(zone.name) + "</span>" +
          '<span class="fc-heatmap__zone-band">' + escapeHtml(ForageCastHeat.bandLabel(zr.level)) + "</span>" +
        "</button>"
      );
    }).join("");

    var selectedZr = snapshot.zoneResults.find(function (z) { return z.zoneId === selectedId; });
    var why = ForageCastHeat.zoneWhyHere(
      selectedZr && selectedZr.zone,
      selectedZr,
      snapshot.species,
      snapshot.conditions,
      data._factorLabels || {}
    );

    return (
      ForageCastHeat.renderMapHeader(snapshot, loc) +
      '<div class="wds-map-viewport fc-heatmap" data-wds-map-view tabindex="0" role="region" aria-label="' + escapeHtml(ForageCastHeat.mapMetaTitle(snapshot, loc)) + '">' +
        mapControlsHtml() +
        '<div class="wds-map-stage fc-heatmap-stage">' +
          cells +
        "</div>" +
      "</div>" +
      ForageCastHeat.renderLegend(snapshot.legend) +
      '<div id="fc-home-heat-why">' + ForageCastHeat.renderWhyHere(why) + "</div>" +
      ForageCastHeat.renderDisclaimer()
    );
  }

  function bindHeatZoneEvents(data) {
    var snapshot = data._heatSnapshot;
    if (!snapshot) return;

    document.querySelectorAll(".fc-heatmap__cell.is-zone").forEach(function (btn) {
      btn.addEventListener("click", function () {
        homeHeatState.selectedZoneId = btn.getAttribute("data-zone");
        var whyMount = document.getElementById("fc-home-heat-why");
        var panel = document.getElementById("prediction-preview");
        if (panel && window.ForageCastHeat) {
          var selectedZr = snapshot.zoneResults.find(function (z) {
            return z.zoneId === homeHeatState.selectedZoneId;
          });
          var why = ForageCastHeat.zoneWhyHere(
            selectedZr && selectedZr.zone,
            selectedZr,
            snapshot.species,
            snapshot.conditions,
            data._factorLabels || {}
          );
          if (whyMount) whyMount.innerHTML = ForageCastHeat.renderWhyHere(why);
          document.querySelectorAll(".fc-heatmap__cell.is-zone").forEach(function (cell) {
            var active = cell.getAttribute("data-zone") === homeHeatState.selectedZoneId;
            cell.classList.toggle("is-selected", active);
            cell.setAttribute("aria-pressed", active ? "true" : "false");
          });
        }
      });
    });
  }

  function renderPrediction(data) {
    var pp = data.predictionPreview;

    return (
      '<section class="fc-section" id="prediction-preview" aria-labelledby="fc-prediction-title">' +
        '<p class="fc-section__eyebrow">Prediction preview</p>' +
        '<h2 class="fc-section__title" id="fc-prediction-title">' + escapeHtml(pp.title) + "</h2>" +
        '<p class="fc-section__lead">' + escapeHtml(pp.summary) + "</p>" +
        '<div class="fc-prediction">' +
          renderHeatMap(data) +
          "<div>" +
            '<p class="fc-tool-callout"><strong>Where the tool fits:</strong> ' + escapeHtml(pp.toolFit) + "</p>" +
            '<p style="margin-top:var(--wds-space-4);"><a class="wds-body" href="season-table.html" style="font-weight:500;">Open the season table →</a></p>' +
            '<p class="wds-body" style="margin-top:var(--wds-space-3); font-size:var(--wds-text-sm); color:var(--wds-text-tertiary);">' + escapeHtml(pp.disclaimer) + "</p>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderLessons(data) {
    var cards = (data.lessons || []).map(function (lesson) {
      return (
        '<article class="fc-lesson">' +
          '<p class="fc-lesson__subtitle">' + escapeHtml(lesson.subtitle) + "</p>" +
          '<h3 class="fc-lesson__title">' + escapeHtml(lesson.title) + "</h3>" +
          '<p class="fc-lesson__summary">' + escapeHtml(lesson.summary) + "</p>" +
          '<p class="fc-lesson__meta">' + escapeHtml(lesson.duration) + " read</p>" +
          '<p class="fc-lesson__outdoor"><strong>Outdoors:</strong> ' + escapeHtml(lesson.outdoor) + "</p>" +
        "</article>"
      );
    }).join("");

    return (
      '<section class="fc-section" id="learn" aria-labelledby="fc-learn-title">' +
        '<p class="fc-section__eyebrow">Learn</p>' +
        '<h2 class="fc-section__title" id="fc-learn-title">Three lessons before you walk</h2>' +
        '<p class="fc-section__lead">Conditions matter as much as species names. Study during the week; test your reading on the ground this weekend.</p>' +
        '<div class="fc-lesson-grid">' + cards + "</div>" +
      "</section>"
    );
  }

  function renderVideo(data) {
    var v = data.featuredVideo;
    return (
      '<section class="fc-section" id="featured-video" aria-labelledby="fc-video-title">' +
        '<p class="fc-section__eyebrow">Featured video</p>' +
        '<h2 class="fc-section__title" id="fc-video-title">' + escapeHtml(v.title) + "</h2>" +
        '<div class="ws-video-feature">' +
          '<div class="ws-video-feature__thumb" role="img" aria-label="Video placeholder">' +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-media-slot__label">' + escapeHtml(v.durationMinutes) + " min · educational video · placeholder</span>" +
          "</div>" +
          '<div class="ws-video-feature__body">' +
            '<p class="wds-body">' + escapeHtml(v.summary) + "</p>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderFieldNotes(data) {
    var fn = data.fieldNotesPrompt;
    var lines = (fn.lines || []).map(function (line) {
      return "<li>" + escapeHtml(line) + "</li>";
    }).join("");

    return (
      '<section class="fc-section" id="field-notes" aria-labelledby="fc-notes-title">' +
        '<p class="fc-section__eyebrow">Field notes</p>' +
        '<h2 class="fc-section__title" id="fc-notes-title">' + escapeHtml(fn.title) + "</h2>" +
        '<ul class="fc-journal">' + lines + "</ul>" +
        '<p class="fc-journal__reminder">' + escapeHtml(fn.reminder) + "</p>" +
      "</section>"
    );
  }

  function renderMethodology() {
    return (
      '<section class="fc-section fc-section--methodology" id="how-waypoint-works" aria-labelledby="fc-how-title">' +
        '<details class="wce-methodology">' +
          '<summary class="wce-methodology__summary" id="fc-how-title">How Waypoint works</summary>' +
          '<div class="wce-methodology__body">' +
            '<p class="wds-body">Waypoint Studio is a regional field-guide studio — outdoor knowledge, calm lessons, and private-by-default observations. ' +
            "The references below are for contributors and builders.</p>" +
            '<ul class="wce-methodology__links">' +
              '<li><a href="../../docs/WAYPOINT-STUDIO-CONSTITUTION.md">Studio Constitution</a> — privacy, scope, and product principles</li>' +
              '<li><a href="../../docs/WAYPOINT-METHOD.md">Waypoint Method</a> — teaching and learning cycle</li>' +
              '<li><a href="../../docs/WAYPOINT-CONTENT-ENGINE.md">Content Engine</a> — regional publishing model</li>' +
              '<li><a href="../../docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy">Privacy philosophy</a> — private by default</li>' +
            "</ul>" +
          "</div>" +
        "</details>" +
      "</section>"
    );
  }

  function renderCitizenScience(data) {
    var cs = data.citizenScience;
    return (
      '<section class="fc-section" id="citizen-science" aria-labelledby="fc-cs-title">' +
        '<div class="fc-citizen">' +
          '<h2 class="fc-section__title" id="fc-cs-title" style="font-size:var(--wds-text-lg);">' + escapeHtml(cs.title) + "</h2>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-2);">' + escapeHtml(cs.body) + "</p>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-3); font-size:var(--wds-text-sm); color:var(--wds-text-tertiary);">' +
            '<a href="#how-waypoint-works">Privacy approach</a> — private by default, always.' +
          "</p>" +
        "</div>" +
      "</section>"
    );
  }

  function renderPage(data) {
    return (
      renderHero(data) +
      renderRegionalStatus(data) +
      renderThisWeek(data) +
      renderSpotlight(data) +
      renderPrediction(data) +
      renderLessons(data) +
      renderVideo(data) +
      renderFieldNotes(data) +
      renderCitizenScience(data) +
      renderMethodology()
    );
  }

  function loadHome(loc) {
    var mount = document.getElementById("foragecast-home");
    if (!mount) return;

    Promise.all([
      fetch("data/home.json").then(function (res) {
        if (!res.ok) throw new Error("Failed to load home.json");
        return res.json();
      }),
      fetch("data/species-model.json").then(function (res) {
        if (!res.ok) throw new Error("Failed to load species-model.json");
        return res.json();
      }),
      fetch("data/conditions.json").then(function (res) {
        if (!res.ok) throw new Error("Failed to load conditions.json");
        return res.json();
      }),
      fetch("data/terrain-zones.json").then(function (res) {
        if (!res.ok) throw new Error("Failed to load terrain-zones.json");
        return res.json();
      })
    ])
      .then(function (results) {
        var data = results[0];
        var speciesModel = results[1];
        var conditions = results[2];
        var terrain = results[3];

        if (window.ForageCastLocation) {
          ForageCastLocation.applyToHomeData(data, loc);
          ForageCastLocation.applyToConditions(conditions, loc);
        }

        var previewId = (data.predictionPreview && data.predictionPreview.previewSpeciesId) || PREVIEW_SPECIES_ID;
        var species = speciesModel.species.find(function (s) { return s.id === previewId; }) || speciesModel.species[0];

        if (window.ForageCastHeat) {
          data._heatSnapshot = ForageCastHeat.buildSnapshot(
            species,
            terrain.zones,
            conditions,
            terrain.legend
          );
          data._factorLabels = speciesModel.factorLabels;
        }

        homeHeatState.selectedZoneId = data._heatSnapshot && data._heatSnapshot.topZoneId;

        mount.innerHTML = renderPage(data);
        mount.removeAttribute("aria-busy");
        document.title = "ForageCast — " + data.hero.question;
        if (window.ForageCastBoot) {
          ForageCastBoot.bindRegionChange(mount, function () {
            loadHome(window.WDS && WDS.location ? WDS.location.getState() : null);
          });
        }
        bindMapViews();
        bindHeatZoneEvents(data);
      })
      .catch(function (err) {
        mount.innerHTML =
          '<section class="fc-section"><p class="wds-body">Could not load field guide content. ' +
          escapeHtml(err.message) + "</p></section>";
        mount.removeAttribute("aria-busy");
      });
  }

  function init() {
    var mount = document.getElementById("foragecast-home");
    if (!mount) return;

    function start(loc) {
      loadHome(loc);
    }

    if (window.ForageCastBoot) {
      ForageCastBoot.bootstrapLocation().then(start);
    } else {
      start(window.ForageCastLocation ? ForageCastLocation.read() : null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
