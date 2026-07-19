/**
 * ForageCast homepage — Outdoor Intelligence Summary first.
 * Interprets species + conditions; does not invent forecasts.
 */
(function () {
  "use strict";

  var PREVIEW_SPECIES_ID = "morels";
  var homeHeatState = { selectedZoneId: null };
  var homePayload = null;

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function levelClass(level) {
    return "fc-level fc-level--" + (level || "moderate");
  }

  function renderTaskNav(active) {
    var items = [
      { id: "overview", href: "index.html", label: "Overview" },
      { id: "conditions", href: "conditions.html", label: "Today’s Conditions" },
      { id: "species", href: "species.html", label: "Species" },
      { id: "map", href: "map.html", label: "Map" },
      { id: "timeline", href: "timeline.html", label: "Season Timeline" },
      { id: "weather", href: "weather.html", label: "Recent Weather" },
      { id: "habitats", href: "habitats.html", label: "Habitats" },
      { id: "learn", href: "learn.html", label: "Learn" },
      { id: "journal", href: "journal.html", label: "Journal" },
      { id: "settings", href: "settings.html", label: "Settings" }
    ];
    return (
      '<nav class="fc-task-nav" aria-label="ForageCast tasks">' +
      items
        .map(function (item) {
          var on = item.id === active ? " is-active" : "";
          return (
            '<a class="fc-task-nav__link' +
            on +
            '" href="' +
            escapeHtml(item.href) +
            '"' +
            (on ? ' aria-current="page"' : "") +
            ">" +
            escapeHtml(item.label) +
            "</a>"
          );
        })
        .join("") +
      "</nav>"
    );
  }

  function renderSummary(data) {
    var summary = data._summary;
    if (!summary) return "";
    var loc = data._location;
    var regionLabel = loc
      ? loc.name + ", " + (loc.stateCode || loc.state)
      : (data.region && data.region.county) || "your region";

    var speciesRows = (summary.species || [])
      .slice(0, 5)
      .map(function (card) {
        return (
          '<li class="fc-summary__item">' +
          '<a class="fc-summary__species" href="' +
          escapeHtml(card.href) +
          '">' +
          escapeHtml(card.name) +
          "</a>" +
          '<span class="' +
          levelClass(card.level) +
          '">' +
          escapeHtml(card.confidenceLabel) +
          " confidence</span>" +
          '<p class="fc-summary__why"><span class="fc-summary__why-label">Why</span> ' +
          escapeHtml(card.why) +
          "</p>" +
          "</li>"
        );
      })
      .join("");

    var conditionRows = (summary.briefing.bullets || [])
      .slice(0, 4)
      .map(function (b) {
        return (
          '<li class="fc-summary__item fc-summary__item--condition">' +
          "<p>" +
          escapeHtml(b.text) +
          "</p>" +
          '<p class="fc-summary__why"><span class="fc-summary__why-label">Why</span> ' +
          escapeHtml(b.why) +
          "</p>" +
          "</li>"
        );
      })
      .join("");

    var freshness =
      data._freshness && window.ForageCastFetch
        ? '<p class="fc-freshness">' +
          escapeHtml(ForageCastFetch.formatFreshness(data._freshness)) +
          (summary.liveWeather ? " · live weather linked" : " · weather uncertain") +
          "</p>"
        : "";

    return (
      '<section class="fc-summary" aria-labelledby="fc-summary-title">' +
      '<p class="wds-eyebrow">ForageCast · outdoor intelligence · ' +
      escapeHtml(regionLabel) +
      "</p>" +
      '<h1 class="fc-summary__title" id="fc-summary-title">' +
      escapeHtml(summary.title) +
      "</h1>" +
      '<p class="fc-summary__question">' +
      escapeHtml(summary.question) +
      "</p>" +
      freshness +
      '<p class="fc-honesty" role="note">' +
      escapeHtml(summary.honesty) +
      "</p>" +
      '<h2 class="fc-summary__subtitle">Species attention</h2>' +
      '<ul class="fc-summary__list">' +
      speciesRows +
      "</ul>" +
      '<h2 class="fc-summary__subtitle">Condition reading</h2>' +
      '<ul class="fc-summary__list">' +
      conditionRows +
      "</ul>" +
      '<p class="fc-summary__links">' +
      '<a class="wds-btn wds-btn--primary wds-btn--sm" href="conditions.html">Today’s conditions</a> ' +
      '<a class="wds-btn wds-btn--secondary wds-btn--sm" href="species.html">All species</a> ' +
      '<a href="map.html">Open map</a>' +
      "</p>" +
      "</section>"
    );
  }

  function renderTodayCompact(data) {
    var plan = data._todayPlan;
    if (!plan || !plan.actions || !plan.actions.length) return "";
    var actions = plan.actions
      .slice(0, 4)
      .map(function (a) {
        return (
          '<li class="fc-today__item">' +
          '<div class="fc-today__body">' +
          '<p class="fc-today__title">' +
          escapeHtml(a.title) +
          "</p>" +
          '<p class="fc-today__why">' +
          escapeHtml(a.why) +
          "</p>" +
          "</div></li>"
        );
      })
      .join("");
    return (
      '<section class="fc-section fc-today fc-today--compact" id="today" aria-labelledby="fc-today-title">' +
      '<p class="fc-section__eyebrow">Land actions</p>' +
      '<h2 class="fc-section__title" id="fc-today-title">Worth doing on your land</h2>' +
      '<ol class="fc-today__list">' +
      actions +
      "</ol>" +
      '<p class="fc-today__setup"><a href="property.html">Property</a> · <a href="settings.html">Settings</a></p>' +
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
    if (!snapshot || !window.ForageCastHeat) {
      return '<p class="wds-body">Habitat map unavailable.</p>';
    }
    var topId = snapshot.topZoneId;
    var selectedId = homeHeatState.selectedZoneId || topId;
    var cells = snapshot.zoneResults
      .map(function (zr) {
        var zone = zr.zone;
        if (!zone) return "";
        var classes = "fc-heatmap__cell fc-heatmap__cell--" + zr.level + " is-zone";
        if (zr.zoneId === selectedId) classes += " is-selected";
        if (zr.zoneId === topId) classes += " is-top";
        return (
          '<button type="button" class="' +
          classes +
          '" data-zone="' +
          escapeHtml(zr.zoneId) +
          '" aria-pressed="' +
          (zr.zoneId === selectedId ? "true" : "false") +
          '">' +
          '<span class="fc-heatmap__zone-name">' +
          escapeHtml(zone.name) +
          "</span>" +
          '<span class="fc-heatmap__zone-band">' +
          escapeHtml(ForageCastHeat.bandLabel(zr.level)) +
          "</span></button>"
        );
      })
      .join("");
    var selectedZr = snapshot.zoneResults.find(function (z) {
      return z.zoneId === selectedId;
    });
    var why = ForageCastHeat.zoneWhyHere(
      selectedZr && selectedZr.zone,
      selectedZr,
      snapshot.species,
      snapshot.conditions,
      data._factorLabels || {}
    );
    return (
      ForageCastHeat.renderMapHeader(snapshot, data._location) +
      '<div class="wds-map-viewport fc-heatmap fc-heatmap--responsive" data-wds-map-view tabindex="0" role="region" aria-label="Habitat heat map">' +
      mapControlsHtml() +
      '<div class="wds-map-stage fc-heatmap-stage">' +
      cells +
      "</div></div>" +
      ForageCastHeat.renderLegend(snapshot.legend) +
      '<div id="fc-home-heat-why">' +
      ForageCastHeat.renderWhyHere(why) +
      "</div>" +
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
        if (whyMount && window.ForageCastHeat) {
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
          whyMount.innerHTML = ForageCastHeat.renderWhyHere(why);
          document.querySelectorAll(".fc-heatmap__cell.is-zone").forEach(function (cell) {
            var active = cell.getAttribute("data-zone") === homeHeatState.selectedZoneId;
            cell.classList.toggle("is-selected", active);
            cell.setAttribute("aria-pressed", active ? "true" : "false");
          });
        }
      });
    });
  }

  function renderMapPreview(data) {
    return (
      '<section class="fc-section" id="map-preview" aria-labelledby="fc-map-title">' +
      '<p class="fc-section__eyebrow">Map</p>' +
      '<h2 class="fc-section__title" id="fc-map-title">Where habitat may align</h2>' +
      '<p class="fc-section__lead">Schematic zones for education — not a live detection map. Pan and zoom gently; observation overlays come later.</p>' +
      renderHeatMap(data) +
      '<p style="margin-top:1rem;"><a href="map.html">Open full map experience →</a></p>' +
      "</section>"
    );
  }

  function renderLearnTeaser(data) {
    var lessons = (data.lessons || []).slice(0, 2);
    if (!lessons.length) return "";
    var cards = lessons
      .map(function (lesson) {
        return (
          '<article class="fc-lesson">' +
          '<h3 class="fc-lesson__title">' +
          escapeHtml(lesson.title) +
          "</h3>" +
          '<p class="fc-lesson__summary">' +
          escapeHtml(lesson.summary) +
          "</p></article>"
        );
      })
      .join("");
    return (
      '<section class="fc-section" id="learn" aria-labelledby="fc-learn-title">' +
      '<p class="fc-section__eyebrow">Learn</p>' +
      '<h2 class="fc-section__title" id="fc-learn-title">Read before you walk</h2>' +
      '<div class="fc-lesson-grid">' +
      cards +
      "</div>" +
      '<p><a href="learn.html">More learning →</a></p>' +
      "</section>"
    );
  }

  function renderPage(data) {
    return (
      renderTaskNav("overview") +
      renderSummary(data) +
      renderTodayCompact(data) +
      renderMapPreview(data) +
      renderLearnTeaser(data)
    );
  }

  function getJson(url) {
    if (window.ForageCastFetch) {
      return ForageCastFetch.getJson(url).then(function (pack) {
        return pack;
      });
    }
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Failed " + url);
      return res.json().then(function (data) {
        return { data: data, freshness: { source: "network", ageMs: 0 } };
      });
    });
  }

  function loadHome(loc) {
    var mount = document.getElementById("foragecast-home");
    if (!mount) return;

    var platformPromise =
      window.ForageCastBoot && ForageCastBoot.fetchPlatform
        ? ForageCastBoot.fetchPlatform(loc).catch(function (err) {
            return { _error: err && err.message ? err.message : "platform unavailable" };
          })
        : Promise.resolve(null);

    Promise.all([
      getJson("data/home.json"),
      getJson("data/species-model.json"),
      getJson("data/conditions.json"),
      getJson("data/terrain-zones.json"),
      platformPromise
    ])
      .then(function (results) {
        var homePack = results[0];
        var data = homePack.data;
        var speciesModel = results[1].data;
        var conditions = results[2].data;
        var terrain = results[3].data;
        var platform = results[4];
        if (platform && platform._error) platform = null;

        data._freshness = homePack.freshness;

        if (window.ForageCastLocation) {
          ForageCastLocation.applyToHomeData(data, loc, platform);
          conditions = ForageCastLocation.applyToConditions(conditions, loc, platform);
        }

        if (platform && window.ForageCastModel && ForageCastModel.setCalendarContext) {
          ForageCastModel.setCalendarContext(platform.calendar);
        }

        var previewId =
          (data.predictionPreview && data.predictionPreview.previewSpeciesId) || PREVIEW_SPECIES_ID;
        var species =
          speciesModel.species.find(function (s) {
            return s.id === previewId;
          }) || speciesModel.species[0];

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

        if (window.ForageCastIntelligence) {
          data._summary = ForageCastIntelligence.buildSummary({
            speciesList: speciesModel.species,
            zones: terrain.zones,
            conditions: conditions,
            platform: platform,
            homeData: data,
            location: loc || data._location,
            todayPlan: data._todayPlan
          });
        }

        homePayload = {
          data: data,
          speciesModel: speciesModel,
          conditions: conditions,
          terrain: terrain,
          platform: platform
        };

        mount.innerHTML = renderPage(data);
        mount.removeAttribute("aria-busy");
        document.title = "ForageCast — What should I look for today?";
        if (window.ForageCastBoot) {
          ForageCastBoot.bindRegionChange(mount, function () {
            loadHome(window.WDS && WDS.location ? WDS.location.getState() : null);
          });
        }
        bindMapViews(loc);
        bindHeatZoneEvents(data);
      })
      .catch(function () {
        mount.innerHTML =
          '<section class="fc-section" role="alert">' +
          "<p class=\"wds-body\">Could not load ForageCast. Check your connection and try again.</p>" +
          '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" id="fc-retry">Retry</button></p>' +
          "</section>";
        mount.removeAttribute("aria-busy");
        var btn = document.getElementById("fc-retry");
        if (btn) btn.addEventListener("click", function () { location.reload(); });
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
      var timer = setTimeout(function () {
        startOnce(null);
      }, 1800);
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

  window.ForageCastHome = { renderTaskNav: renderTaskNav, getPayload: function () { return homePayload; } };
})();
