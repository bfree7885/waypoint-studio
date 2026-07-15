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
    var defaultNote = loc && loc.isDefault && window.WDS && WDS.location
      ? '<p class="fc-location-bar__status">' + escapeHtml(WDS.location.formatStatusLine(loc)) + "</p>"
      : "";
    var mission = (data._todayPlan && data._todayPlan.mission) ||
      "Understand the season. Care for your land. Harvest at the right time.";

    return (
      '<section class="fc-hero" aria-labelledby="fc-hero-title">' +
        '<p class="wds-eyebrow">ForageCast · seasonal land companion · ' + escapeHtml(regionLabel) + "</p>" +
        defaultNote +
        '<h1 class="fc-hero__question" id="fc-hero-title">' + escapeHtml(data.hero.question) + "</h1>" +
        '<p class="fc-hero__lead">' + escapeHtml(data.hero.lead) + "</p>" +
        '<p class="fc-hero__mission">' + escapeHtml(mission) + "</p>" +
      "</section>"
    );
  }

  function renderToday(data) {
    var plan = data._todayPlan;
    if (!plan) return "";
    var actions = (plan.actions || []).map(function (a, idx) {
      return (
        '<li class="fc-today__item">' +
          '<span class="fc-today__rank" aria-hidden="true">' + (idx + 1) + "</span>" +
          '<div class="fc-today__body">' +
            '<p class="fc-today__title">' + escapeHtml(a.title) + "</p>" +
            '<p class="fc-today__why">' + escapeHtml(a.why) + "</p>" +
            '<p class="fc-today__meta">' +
              '<span class="fc-pill">' + escapeHtml(a.pillar) + "</span>" +
              (a.href ? ' <a class="fc-today__link" href="' + escapeHtml(a.href) + '">Open</a>' : "") +
            "</p>" +
          "</div>" +
        "</li>"
      );
    }).join("");

    var setup = !plan.configured
      ? '<p class="fc-today__setup"><a class="wds-btn wds-btn--secondary wds-btn--sm" href="property-setup.html">Set up your property profile</a></p>'
      : '<p class="fc-today__setup"><a href="property.html">Property overview</a> · <a href="property-setup.html">Edit profile</a></p>';

    return (
      '<section class="fc-section fc-today" id="today" aria-labelledby="fc-today-title">' +
        '<p class="fc-section__eyebrow">Today · actionable guidance</p>' +
        '<h2 class="fc-section__title" id="fc-today-title">What should I do today?</h2>' +
        '<p class="fc-section__lead">Synthesized from your region, weather, season, property features, and goals — not a feed of articles.</p>' +
        '<ol class="fc-today__list">' + actions + "</ol>" +
        setup +
        '<p class="fc-today__note" role="note">Educational guidance only. Confirm every plant and mushroom yourself. Private by default — property details stay in this browser.</p>' +
      "</section>"
    );
  }

  function renderPillarStrip() {
    var pillars = [
      { href: "#today", label: "Today" },
      { href: "foraging.html", label: "Foraging" },
      { href: "pillar.html?id=orchard", label: "Orchard" },
      { href: "pillar.html?id=garden", label: "Garden" },
      { href: "pillar.html?id=food-forest", label: "Food forest" },
      { href: "pillar.html?id=permaculture", label: "Permaculture" },
      { href: "property.html", label: "Property" }
    ];
    var links = pillars.map(function (p) {
      return '<a class="fc-pillar-strip__link" href="' + escapeHtml(p.href) + '">' + escapeHtml(p.label) + "</a>";
    }).join("");
    return (
      '<nav class="fc-pillar-strip" aria-label="ForageCast pillars">' + links + "</nav>"
    );
  }

  function renderLocationBar(data) {
    var loc = data._location;
    if (!loc || !window.WDS || !WDS.location) return "";
    return WDS.location.renderBar(loc, { wrapperClass: "fc-location-bar" });
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
        '<p class="fc-section__eyebrow">Regional status · editorial · ' + escapeHtml(data.region.county) + " / " + escapeHtml(data.region.state) + "</p>" +
        '<h2 class="fc-section__title" id="fc-status-title">' + escapeHtml(rs.headline) + "</h2>" +
        '<p class="fc-section__lead">' + escapeHtml(rs.summary) + "</p>" +
        '<div class="fc-status-grid">' +
          '<aside class="fc-weather-card" aria-label="Regional weather snapshot this week">' +
            "<p class=\"fc-section__eyebrow\" style=\"margin:0;\">" + escapeHtml(w.label) + "</p>" +
            '<p class="fc-weather-card__temp">' + escapeHtml(w.high) + " · " + escapeHtml(w.low) + "</p>" +
            "<dl>" +
              "<dt>Conditions</dt><dd>" + escapeHtml(w.conditions) + "</dd>" +
              "<dt>Soil moisture</dt><dd>" + escapeHtml(w.soilMoisture) + "</dd>" +
            "</dl>" +
          "</aside>" +
          '<div>' +
            '<p class="wds-eyebrow" style="margin-bottom: var(--wds-space-3);">Educational outlook · not detection data</p>' +
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

    var resolved = SS.resolveFeatured(data, {
      weekOf: data.weekOf,
      wskbBase: "../../design-system/species/"
    });
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

  function bindMapViews(loc) {
    var root = document.getElementById("foragecast-home");
    if (!root || !window.WDS || !WDS.mapView) return;
    var mapOpts = window.ForageCastBoot ? { base: ForageCastBoot.ENGINE_BASE } : {};
    WDS.mapView.bindAll(root, loc, mapOpts);
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
    var wskbBase = "../../design-system/species/";
    var cards = (data.lessons || []).map(function (lesson) {
      var profileLink = "";
      if (lesson.wskbId && window.WDS && WDS.wskb) {
        profileLink =
          '<p class="fc-lesson__profile"><a href="' + escapeHtml(WDS.wskb.profileHref(lesson.wskbId, { base: wskbBase })) + '">Species profile (WSKB)</a></p>';
      }
      return (
        '<article class="fc-lesson">' +
          '<p class="fc-lesson__subtitle">' + escapeHtml(lesson.subtitle) + "</p>" +
          '<h3 class="fc-lesson__title">' + escapeHtml(lesson.title) + "</h3>" +
          '<p class="fc-lesson__summary">' + escapeHtml(lesson.summary) + "</p>" +
          '<p class="fc-lesson__meta">' + escapeHtml(lesson.duration) + " read</p>" +
          '<p class="fc-lesson__outdoor"><strong>Outdoors:</strong> ' + escapeHtml(lesson.outdoor) + "</p>" +
          profileLink +
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
          '<div class="ws-video-feature__thumb" role="img" aria-label="Featured educational video coming later">' +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-media-slot__label">' + escapeHtml(v.durationMinutes) + " min · educational video · preview slot</span>" +
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
            '<p class="wds-caption">No accounts, no feeds, no scoreboards. ' +
            "Contributor documentation lives in the repository <code>docs/</code> folder.</p>" +
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
      renderPillarStrip() +
      renderToday(data) +
      renderRegionalStatus(data) +
      '<div id="foraging">' +
      renderThisWeek(data) +
      renderSpotlight(data) +
      renderPrediction(data) +
      "</div>" +
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

    var platformPromise = window.ForageCastBoot && ForageCastBoot.fetchPlatform
      ? ForageCastBoot.fetchPlatform(loc)
      : Promise.resolve(null);

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
      }),
      platformPromise
    ])
      .then(function (results) {
        var data = results[0];
        var speciesModel = results[1];
        var conditions = results[2];
        var terrain = results[3];
        var platform = results[4];

        if (platform && loc) {
          var regionId = loc.contentBundle || loc.regionId;
          var bundleUrl = (ForageCastBoot.ENGINE_BASE || "../../design-system/content-engine/") +
            "regions/" + regionId + ".json";
          return fetch(bundleUrl).then(function (res) {
            if (!res.ok) throw new Error("bundle");
            return res.json();
          }).then(function (bundle) {
            if (bundle.thisWeekOutdoors && !data.thisWeekOutdoors) {
              data.thisWeekOutdoors = bundle.thisWeekOutdoors;
            }
            if (bundle.seasonalWatch && !data.seasonalWatch) {
              data.seasonalWatch = bundle.seasonalWatch;
            }
            if (bundle.regionalFieldNotes && !data.regionalFieldNotes) {
              data.regionalFieldNotes = bundle.regionalFieldNotes;
            }
            return { data: data, speciesModel: speciesModel, conditions: conditions, terrain: terrain, platform: platform };
          }).catch(function () {
            return { data: data, speciesModel: speciesModel, conditions: conditions, terrain: terrain, platform: platform };
          });
        }
        return { data: data, speciesModel: speciesModel, conditions: conditions, terrain: terrain, platform: platform };
      })
      .then(function (payload) {
        var data = payload.data;
        var speciesModel = payload.speciesModel;
        var conditions = payload.conditions;
        var terrain = payload.terrain;
        var platform = payload.platform;

        var wskbReady = Promise.resolve();
        if (window.WDS && WDS.wskb) {
          WDS.wskb.configure({ base: "../../design-system/species/" });
          wskbReady = WDS.wskb.preloadFromBundle(data).then(function () {
            var ids = (speciesModel.species || []).map(function (s) { return s.wskbId; }).filter(Boolean);
            return WDS.wskb.preload(ids);
          });
        }

        return wskbReady.then(function () {
        if (window.ForageCastLocation) {
          ForageCastLocation.applyToHomeData(data, loc, platform);
          ForageCastLocation.applyToConditions(conditions, loc, platform);
        }

        if (platform && window.ForageCastModel && ForageCastModel.setCalendarContext) {
          ForageCastModel.setCalendarContext(platform.calendar);
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

        if (window.ForageCastToday && window.ForageCastProfile) {
          data._todayPlan = ForageCastToday.buildPlan({
            property: ForageCastProfile.loadProperty(),
            intent: ForageCastProfile.loadIntent(),
            platform: platform,
            homeData: data
          });
        }

        mount.innerHTML = renderPage(data);
        mount.removeAttribute("aria-busy");
        document.title = "ForageCast — What should I do today?";
        if (window.ForageCastBoot) {
          ForageCastBoot.bindRegionChange(mount, function () {
            loadHome(window.WDS && WDS.location ? WDS.location.getState() : null);
          });
        }
        bindMapViews(loc);
        bindHeatZoneEvents(data);
        if (location.hash === "#today" || location.hash === "#foraging") {
          var target = document.getElementById(location.hash.slice(1));
          if (target && target.scrollIntoView) target.scrollIntoView({ block: "start" });
        }
        });
      })
      .catch(function (err) {
        mount.innerHTML =
          '<section class="fc-section" role="alert"><p class="wds-body">Could not load ForageCast. Check your connection and try again.</p>' +
          '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p></section>';
        mount.removeAttribute("aria-busy");
      });
  }

  function init() {
    var mount = document.getElementById("foragecast-home");
    if (!mount) return;

    var started = false;
    function startOnce(loc) {
      if (started) return;
      started = true;
      loadHome(loc);
    }

    if (window.ForageCastBoot) {
      // Do not leave visitors on a skeleton while the region prompt waits.
      var timer = setTimeout(function () {
        startOnce(null);
      }, 2200);
      ForageCastBoot.bootstrapLocation()
        .then(function (loc) {
          clearTimeout(timer);
          startOnce(loc);
        })
        .catch(function () {
          clearTimeout(timer);
          startOnce(null);
        });
    } else {
      startOnce(null);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
