/**
 * ForageCast homepage renderer — field guide, not dashboard
 */
(function () {
  "use strict";

  var HEAT_PATTERN = [
    "moderate", "high", "high", "moderate",
    "low", "moderate", "high", "moderate",
    "low", "low", "moderate", "high"
  ];

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
    return (
      '<section class="fc-hero" aria-labelledby="fc-hero-title">' +
        '<p class="wds-eyebrow">ForageCast · Pike County, PA</p>' +
        '<h1 class="fc-hero__question" id="fc-hero-title">' + escapeHtml(data.hero.question) + "</h1>" +
        '<p class="fc-hero__lead">' + escapeHtml(data.hero.lead) + "</p>" +
        '<div style="margin-top: var(--wds-space-6); max-width: 14rem; margin-inline: auto;">' +
          mediaSlot("Field guide illustration · placeholder", "Mushroom & leaf sketch") +
        "</div>" +
      "</section>"
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
    var sp = data.speciesSpotlight;
    var marks = (sp.fieldMarks || []).map(function (m) {
      return "<li>" + escapeHtml(m) + "</li>";
    }).join("");

    return (
      '<section class="fc-section" id="species-spotlight" aria-labelledby="fc-spotlight-title">' +
        '<p class="fc-section__eyebrow">Species spotlight</p>' +
        '<h2 class="fc-section__title" id="fc-spotlight-title">' + escapeHtml(sp.title) + "</h2>" +
        '<p class="fc-section__lead"><em>' + escapeHtml(sp.scientificName) + "</em> — " + escapeHtml(sp.summary) + "</p>" +
        '<div class="fc-spotlight">' +
          '<div class="fc-spotlight__visuals">' +
            mediaSlot("Species photo · placeholder", sp.commonName + " · field plate", "fc-plate-slot") +
            mediaSlot("Habitat diagram · placeholder", "Ash–elm edge · river terrace", "fc-habitat-slot") +
          "</div>" +
          "<div>" +
            "<p class=\"wds-eyebrow\">Field marks</p>" +
            "<ul class=\"wds-body\" style=\"padding-left:1.25rem;\">" + marks + "</ul>" +
            '<p class="wds-body" style="margin-top:var(--wds-space-4);"><strong>Look-alikes:</strong> ' + escapeHtml(sp.lookAlikes) + "</p>" +
            '<p class="wds-body" style="margin-top:var(--wds-space-3); font-style:italic; color:var(--wds-text-secondary);">' + escapeHtml(sp.ethics) + "</p>" +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderHeatMap() {
    var cells = HEAT_PATTERN.map(function (level) {
      return '<div class="fc-heatmap__cell fc-heatmap__cell--' + level + '" aria-hidden="true"></div>';
    }).join("");

    return (
      '<div class="fc-heatmap" role="img" aria-label="Season table heat map placeholder">' +
        cells +
        '<span class="fc-heatmap__label">Pike County · elevation bands · placeholder</span>' +
      "</div>"
    );
  }

  function renderPrediction(data) {
    var pp = data.predictionPreview;
    var legend = (pp.legend || []).map(function (item) {
      return "<li><strong>" + escapeHtml(item.label) + "</strong> — " + escapeHtml(item.desc) + "</li>";
    }).join("");

    return (
      '<section class="fc-section" id="prediction-preview" aria-labelledby="fc-prediction-title">' +
        '<p class="fc-section__eyebrow">Prediction preview</p>' +
        '<h2 class="fc-section__title" id="fc-prediction-title">' + escapeHtml(pp.title) + "</h2>" +
        '<p class="fc-section__lead">' + escapeHtml(pp.summary) + "</p>" +
        '<div class="fc-prediction">' +
          renderHeatMap() +
          "<div>" +
            '<p class="wds-eyebrow">Reading the map</p>' +
            '<ul class="fc-legend">' + legend + "</ul>" +
            '<p class="fc-tool-callout"><strong>Where the tool fits:</strong> ' + escapeHtml(pp.toolFit) + "</p>" +
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

  function renderInvestigation(data) {
    var inv = data.weekendInvestigation;
    var steps = (inv.steps || []).map(function (s) {
      return "<li>" + escapeHtml(s) + "</li>";
    }).join("");

    return (
      '<section class="fc-section" id="weekend-field-investigation" aria-labelledby="fc-inv-title">' +
        '<p class="fc-section__eyebrow">Weekend field investigation</p>' +
        '<h2 class="fc-section__title" id="fc-inv-title">' + escapeHtml(inv.title) + "</h2>" +
        '<div class="fc-investigation">' +
          '<p class="fc-investigation__question">“' + escapeHtml(inv.drivingQuestion) + "”</p>" +
          '<div class="fc-investigation__meta">' +
            "<span><strong>When:</strong> " + escapeHtml(inv.when) + "</span>" +
            "<span><strong>Duration:</strong> " + escapeHtml(inv.duration) + "</span>" +
          "</div>" +
          '<p class="wds-body"><strong>Where:</strong> ' + escapeHtml(inv.place) + "</p>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-2);"><strong>Bring:</strong> ' + escapeHtml((inv.materials || []).join(", ")) + "</p>" +
          "<ol>" + steps + "</ol>" +
          '<p class="fc-tool-callout" style="margin-top:var(--wds-space-5);">' + escapeHtml(inv.toolPrompt) + "</p>" +
        "</div>" +
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

  function renderCitizenScience(data) {
    var cs = data.citizenScience;
    return (
      '<section class="fc-section" id="citizen-science" aria-labelledby="fc-cs-title">' +
        '<div class="fc-citizen">' +
          '<h2 class="fc-section__title" id="fc-cs-title" style="font-size:var(--wds-text-lg);">' + escapeHtml(cs.title) + "</h2>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-2);">' + escapeHtml(cs.body) + "</p>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-3); font-size:var(--wds-text-sm);">' +
            '<a href="../../docs/WAYPOINT-STUDIO-CONSTITUTION.md">' + escapeHtml(cs.linkLabel) + "</a> — private by default, always." +
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
      renderInvestigation(data) +
      renderVideo(data) +
      renderFieldNotes(data) +
      renderCitizenScience(data)
    );
  }

  function init() {
    var mount = document.getElementById("foragecast-home");
    if (!mount) return;

    fetch("data/home.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load home.json");
        return res.json();
      })
      .then(function (data) {
        mount.innerHTML = renderPage(data);
        document.title = "ForageCast — " + data.hero.question;
      })
      .catch(function (err) {
        mount.innerHTML =
          '<section class="fc-section"><p class="wds-body">Could not load field guide content. ' +
          escapeHtml(err.message) + "</p></section>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
