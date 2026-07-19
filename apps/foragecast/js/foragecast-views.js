/**
 * ForageCast task-page renderers (conditions, species, map, timeline, weather, habitats, learn, journal, settings).
 */
(function (global) {
  "use strict";

  function levelClass(level) {
    return "fc-level fc-level--" + (level || "moderate");
  }

  function renderConditions(ctx, esc) {
    var briefing = ctx.summary && ctx.summary.briefing;
    var bullets = (briefing && briefing.bullets) || [];
    var forecast = (ctx.summary && ctx.summary.forecast) || [];
    var insights = (ctx.summary && ctx.summary.insights) || [];
    var derived = ctx.summary && ctx.summary.engine && ctx.summary.engine.derived;
    var signals = (derived && derived.signals) || {};
    var list = bullets
      .map(function (b) {
        return (
          '<li class="fc-brief__item">' +
          "<p><strong>" +
          esc(b.text) +
          "</strong></p>" +
          '<p class="fc-summary__why"><span class="fc-summary__why-label">Why</span> ' +
          esc(b.why) +
          "</p></li>"
        );
      })
      .join("");
    var forecastList = forecast
      .map(function (f) {
        return (
          "<li><p><strong>" +
          esc(f.text) +
          '</strong></p><p class="fc-summary__why">' +
          esc(f.why) +
          "</p></li>"
        );
      })
      .join("");
    var signalRows = Object.keys(signals)
      .map(function (k) {
        var v = signals[k];
        var label = typeof v === "object" && v && v.label ? v.label : String(v);
        return "<li><strong>" + esc(k.replace(/([A-Z])/g, " $1").toLowerCase()) + ":</strong> " + esc(label) + "</li>";
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Operational briefing</p>' +
      '<h1 class="fc-section__title">Today’s conditions</h1>' +
      '<p class="fc-section__lead">Interpreted environmental reading from the Outdoor Intelligence Engine.</p>' +
      '<p class="fc-honesty">' +
      esc((derived && derived.evidenceQuality) || "evidence quality unknown") +
      (global.ForageCastFetch && ctx.freshness
        ? " · " + ForageCastFetch.formatFreshness(ctx.freshness)
        : "") +
      "</p>" +
      '<ul class="fc-brief__list">' +
      list +
      "</ul>" +
      (forecastList
        ? '<h2 class="fc-summary__subtitle">Forecast intelligence</h2><ul class="fc-brief__list">' +
          forecastList +
          "</ul>"
        : "") +
      (signalRows
        ? '<h2 class="fc-summary__subtitle">Derived signals</h2><ul class="fc-changes-list">' +
          signalRows +
          "</ul>"
        : "") +
      (insights.length
        ? '<h2 class="fc-summary__subtitle">Naturalist insights</h2><ul class="fc-insight-list">' +
          insights.map(function (i) { return "<li>" + esc(i.text || i) + "</li>"; }).join("") +
          "</ul>"
        : "") +
      '<p class="wds-caption">Educational guidance only. Confirm conditions outdoors.</p>' +
      "</section>"
    );
  }

  function renderSpeciesList(ctx, esc) {
    var cards = (ctx.summary && ctx.summary.species) || [];
    var rows = cards
      .map(function (card) {
        return (
          '<li class="fc-species-card">' +
          '<a href="species.html?id=' +
          esc(card.id) +
          '"><h2>' +
          esc(card.name) +
          "</h2></a>" +
          '<p class="wds-caption">' +
          esc(card.scientificName) +
          "</p>" +
          '<p><span class="' +
          levelClass(card.level) +
          '">' +
          esc(card.confidenceLabel) +
          " confidence</span> · " +
          esc(card.phase && card.phase.label) +
          (card.momentum ? " · " + esc(card.momentum.label) : "") +
          "</p>" +
          '<p class="fc-summary__why">' +
          esc(card.explanation) +
          "</p></li>"
        );
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Supported species</p>' +
      '<h1 class="fc-section__title">Species</h1>' +
      '<p class="fc-section__lead">Seasonal status and confidence from the educational local index.</p>' +
      '<ul class="fc-species-grid">' +
      rows +
      "</ul></section>"
    );
  }

  function renderSpeciesDetail(ctx, esc, id) {
    var cards = (ctx.summary && ctx.summary.species) || [];
    var card = cards.find(function (c) {
      return c.id === id;
    });
    if (!card) {
      return (
        '<section class="fc-section"><h1>Species not found</h1>' +
        '<p><a href="species.html">Back to species</a></p></section>'
      );
    }
    var look = (card.lookAlikes || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var ethics = (card.ethicalHarvest || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var ids = (card.identification || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var whys = (card.whyFactors || [])
      .map(function (x) {
        return "<li>" + esc(x) + "</li>";
      })
      .join("");
    var conf = card.confidence || {};
    function list(arr) {
      return (arr || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    }
    var similar = cards
      .filter(function (c) {
        return c.id !== card.id;
      })
      .slice(0, 3)
      .map(function (c) {
        return (
          '<li><a href="species.html?id=' +
          esc(c.id) +
          '"><strong>' +
          esc(c.name) +
          "</strong></a> — " +
          esc(c.confidenceLabel) +
          " confidence · " +
          esc(c.phase && c.phase.label) +
          "</li>"
        );
      })
      .join("");
    var drivers =
      whys ||
      list([
        card.why ||
          "Season timing, moisture, and habitat alignment drive this educational outlook."
      ]);
    var safety =
      ethics ||
      "<li>Never eat a wild specimen you cannot identify with certainty.</li>" +
        "<li>Respect land access rules and leave productive sites intact.</li>";
    return (
      '<section class="fc-section fc-species-detail">' +
      '<p class="fc-section__eyebrow">Species outlook</p>' +
      "<h1>" +
      esc(card.name) +
      "</h1>" +
      '<p class="wds-caption">' +
      esc(card.scientificName) +
      "</p>" +
      '<p><span class="' +
      levelClass(card.level) +
      '">' +
      esc(card.confidenceLabel) +
      " confidence</span>" +
      (card.momentum
        ? ' · <span class="fc-momentum">' + esc(card.momentum.label) + "</span>"
        : "") +
      "</p>" +
      "<h2>Overview</h2><p>" +
      esc(card.explanation || card.why || "Educational suitability for today’s conditions.") +
      "</p>" +
      "<h2>Season</h2><p><strong>" +
      esc(card.phase && card.phase.label) +
      ".</strong> " +
      esc(card.phase && card.phase.note) +
      (card.seasonWindow ? " Window: " + esc(card.seasonWindow) + "." : "") +
      "</p>" +
      "<h2>Habitat</h2><p>" +
      esc(card.preferredHabitat || "Habitat notes are limited for this species.") +
      "</p>" +
      "<h2>Environmental drivers</h2><ul>" +
      drivers +
      "</ul>" +
      "<h2>Current outlook</h2><p><strong>" +
      esc((card.momentum && card.momentum.label) || (card.trend && card.trend.label) || "Uncertain") +
      ".</strong> " +
      esc((card.momentum && card.momentum.why) || (card.trend && card.trend.detail) || "") +
      "</p>" +
      "<h2>Confidence</h2>" +
      "<p>Why this band:</p><ul>" +
      list(conf.band === "high" ? conf.whyHigh : conf.whyLow) +
      list(conf.band === "moderate" ? conf.whyHigh : []) +
      (conf.reason ? "<li>" + esc(conf.reason) + "</li>" : "") +
      (card.confidenceReason ? "<li>" + esc(card.confidenceReason) + "</li>" : "") +
      "</ul>" +
      (conf.wouldImprove
        ? "<p>What would improve confidence:</p><ul>" + list(conf.wouldImprove) + "</ul>"
        : "") +
      (conf.wouldReduce
        ? "<p>What would reduce confidence:</p><ul>" + list(conf.wouldReduce) + "</ul>"
        : "") +
      "<h2>Similar species (also tracked)</h2><ul>" +
      (similar || "<li>No other supported species in this build.</li>") +
      "</ul>" +
      "<h2>Identification reminders</h2><ul>" +
      (ids || "<li>Use a trusted field guide before any harvest decision.</li>") +
      "</ul>" +
      "<h2>Look-alikes</h2><ul>" +
      (look || "<li>See field guides; never eat uncertain specimens.</li>") +
      "</ul>" +
      "<h2>Safety &amp; ethics</h2><ul>" +
      safety +
      "</ul>" +
      '<p class="fc-honesty">Transparent educational suitability — not opaque AI and not live detection.</p>' +
      '<p><a href="species.html">← All species</a> · <a href="timeline.html">Season timeline</a> · <a href="conditions.html">Today’s conditions</a></p>' +
      "</section>"
    );
  }

  function renderTimeline(ctx, esc) {
    var species = ctx.speciesModel.species || [];
    var blocks = species
      .map(function (sp) {
        var tl = ForageCastIntelligence.timelineForSpecies(sp);
        var phases = tl.phases
          .map(function (p) {
            return (
              '<li class="fc-timeline__phase' +
              (p.active ? " is-active" : "") +
              '">' +
              esc(p.label) +
              "</li>"
            );
          })
          .join("");
        return (
          '<article class="fc-timeline__card">' +
          "<h2>" +
          esc(sp.name) +
          "</h2>" +
          '<p class="wds-caption">' +
          esc(sp.seasonWindow) +
          "</p>" +
          '<ol class="fc-timeline__phases">' +
          phases +
          "</ol>" +
          "<p>" +
          esc(tl.current.note) +
          '</p><p><a href="species.html?id=' +
          esc(sp.id) +
          '">Species page</a></p></article>'
        );
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Progression</p>' +
      '<h1 class="fc-section__title">Season timeline</h1>' +
      '<p class="fc-section__lead">Beginning → Developing → Peak → Declining → Ending</p>' +
      '<div class="fc-timeline">' +
      blocks +
      "</div></section>"
    );
  }

  function renderWeather(ctx, esc) {
    var platform = ctx.platform;
    var weather = platform && platform.modules && platform.modules.weather;
    var live = ForageCastIntelligence.liveWeatherAvailable(platform);
    var daily = (weather && weather.daily) || [];
    var rows = daily
      .slice(0, 5)
      .map(function (d, i) {
        var precip = d.precipitationSum != null ? d.precipitationSum : d.precipMm;
        var tmin = d.temperatureMin != null ? d.temperatureMin : d.tMin;
        var tmax = d.temperatureMax != null ? d.temperatureMax : d.tMax;
        return (
          "<li><strong>Day " +
          (i + 1) +
          "</strong> — high " +
          esc(tmax != null ? Math.round(tmax) : "—") +
          " / low " +
          esc(tmin != null ? Math.round(tmin) : "—") +
          (precip != null ? " · precip " + esc(Number(precip).toFixed(1)) + " mm" : "") +
          "</li>"
        );
      })
      .join("");
    var briefing = ForageCastIntelligence.interpretConditions(platform, ctx.conditions, ctx.home);
    var interpreted = briefing.bullets
      .map(function (b) {
        return (
          "<li><p>" +
          esc(b.text) +
          '</p><p class="fc-summary__why">' +
          esc(b.why) +
          "</p></li>"
        );
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Weather</p>' +
      '<h1 class="fc-section__title">Recent weather</h1>' +
      '<p class="fc-honesty">' +
      (live
        ? "Live provider data available — interpreted below."
        : "Live weather unavailable. Showing uncertainty instead of inventing numbers.") +
      "</p>" +
      "<h2>Interpretation</h2><ul class=\"fc-brief__list\">" +
      interpreted +
      "</ul>" +
      (rows
        ? "<h2>Forecast days (provider)</h2><ul>" + rows + "</ul>"
        : "<p>No daily forecast rows returned.</p>") +
      "</section>"
    );
  }

  function renderHabitats(ctx, esc) {
    var zones = (ctx.terrain && ctx.terrain.zones) || [];
    var cards = zones
      .map(function (z) {
        return (
          '<article class="fc-habitat-card"><h2>' +
          esc(z.name) +
          "</h2><p>" +
          esc(z.habitat || "Schematic habitat zone") +
          "</p>" +
          '<p class="wds-caption">' +
          esc([z.elevation, z.aspect, z.moisture].filter(Boolean).join(" · ")) +
          "</p>" +
          '<p class="wds-caption">' +
          esc(z.landCover || "") +
          "</p></article>"
        );
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Habitats</p>' +
      '<h1 class="fc-section__title">Habitats</h1>' +
      '<p class="fc-section__lead">Schematic zones used by the educational index — prepared for future observation overlays.</p>' +
      '<div class="fc-habitat-grid">' +
      cards +
      '</div><p><a href="map.html">View on map</a></p></section>'
    );
  }

  function renderMap(ctx, esc) {
    var species = ctx.speciesModel.species[0];
    var snapshot =
      global.ForageCastHeat &&
      ForageCastHeat.buildSnapshot(
        species,
        ctx.terrain.zones,
        ctx.conditions,
        ctx.terrain.legend
      );
    var cells = "";
    if (snapshot) {
      cells = snapshot.zoneResults
        .map(function (zr) {
          var zone = zr.zone;
          if (!zone) return "";
          return (
            '<button type="button" class="fc-heatmap__cell fc-heatmap__cell--' +
            zr.level +
            ' is-zone" data-zone="' +
            esc(zr.zoneId) +
            '"><span class="fc-heatmap__zone-name">' +
            esc(zone.name) +
            '</span><span class="fc-heatmap__zone-band">' +
            esc(ForageCastHeat.bandLabel(zr.level)) +
            "</span></button>"
          );
        })
        .join("");
    }
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Map</p>' +
      '<h1 class="fc-section__title">Habitat map</h1>' +
      '<p class="fc-section__lead">Smooth pan/zoom schematic map. Not georeferenced satellite imagery.</p>' +
      '<div class="wds-map-viewport fc-heatmap fc-heatmap--responsive fc-heatmap--tall" data-wds-map-view tabindex="0" role="region" aria-label="ForageCast habitat map">' +
      (global.WDS && WDS.mapView ? WDS.mapView.controlsHtml() : "") +
      '<div class="wds-map-stage fc-heatmap-stage">' +
      cells +
      "</div></div>" +
      '<p class="fc-honesty">Architecture ready for future observation overlays (heat maps, habitat suitability, species overlays, observation density, public land, terrain suitability). Current view is educational schematic suitability — not georeferenced detection.</p>' +
      '<p><a href="season-table.html">Classic season table map →</a></p></section>'
    );
  }

  function renderLearn(ctx, esc) {
    var lessons = (ctx.home.lessons || [])
      .map(function (lesson) {
        return (
          '<article class="fc-lesson"><p class="fc-lesson__subtitle">' +
          esc(lesson.subtitle) +
          '</p><h2 class="fc-lesson__title">' +
          esc(lesson.title) +
          '</h2><p class="fc-lesson__summary">' +
          esc(lesson.summary) +
          "</p></article>"
        );
      })
      .join("");
    return (
      '<section class="fc-section"><p class="fc-section__eyebrow">Learn</p>' +
      '<h1 class="fc-section__title">Learn</h1>' +
      '<div class="fc-lesson-grid">' +
      lessons +
      "</div></section>"
    );
  }

  function journalStore() {
    var KEY = "foragecast.journal.v1";
    return {
      load: function () {
        try {
          return JSON.parse(localStorage.getItem(KEY) || "[]");
        } catch (e) {
          return [];
        }
      },
      save: function (entries) {
        localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 100)));
      }
    };
  }

  function renderJournal(ctx, esc) {
    var store = journalStore();
    var entries = store.load();
    var list = entries
      .map(function (e) {
        return (
          "<li><time>" +
          esc(e.at) +
          "</time> — " +
          esc(e.text) +
          "</li>"
        );
      })
      .join("");
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Private</p>' +
      '<h1 class="fc-section__title">Journal</h1>' +
      '<p class="fc-section__lead">Notes stay in this browser only.</p>' +
      '<form id="fc-journal-form" class="fc-journal-form">' +
      '<label>Field note <textarea name="note" rows="3" required maxlength="800" placeholder="Moisture, aspect, what you noticed…"></textarea></label>' +
      '<button type="submit" class="wds-btn wds-btn--primary wds-btn--sm">Save note</button></form>' +
      '<ul class="fc-journal" id="fc-journal-list">' +
      (list || "<li class=\"fc-empty\">No notes yet — start with today’s walk.</li>") +
      "</ul></section>"
    );
  }

  function bindJournal(mount) {
    var form = mount.querySelector("#fc-journal-form");
    if (!form) return;
    var store = journalStore();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = new FormData(form).get("note");
      if (!text) return;
      var entries = store.load();
      entries.unshift({ at: new Date().toISOString().slice(0, 16).replace("T", " "), text: String(text) });
      store.save(entries);
      form.reset();
      var list = mount.querySelector("#fc-journal-list");
      if (list) {
        list.innerHTML = entries
          .map(function (en) {
            return "<li><time>" + en.at + "</time> — " + String(en.text).replace(/</g, "&lt;") + "</li>";
          })
          .join("");
      }
    });
  }

  function renderSettings(ctx, esc) {
    var configured =
      global.ForageCastProfile && ForageCastProfile.isConfigured
        ? ForageCastProfile.isConfigured(ForageCastProfile.loadProperty())
        : false;
    return (
      '<section class="fc-section">' +
      '<p class="fc-section__eyebrow">Settings</p>' +
      '<h1 class="fc-section__title">Settings</h1>' +
      "<p>Property profile: <strong>" +
      (configured ? "configured on this device" : "not configured yet") +
      "</strong></p>" +
      '<p><a class="wds-btn wds-btn--primary wds-btn--sm" href="property-setup.html">Edit property profile</a> ' +
      '<a class="wds-btn wds-btn--secondary wds-btn--sm" href="property.html">Property overview</a></p>' +
      "<h2>Preferences</h2>" +
      "<ul>" +
      "<li>Location is managed by the Waypoint location prompt.</li>" +
      "<li>Journal notes stay in local storage on this browser.</li>" +
      "<li>No accounts, no social rankings, no harvest leaderboards.</li>" +
      "</ul>" +
      (global.WDS && WDS.resilience
        ? "<h2>Provider health (this session)</h2>" +
          WDS.resilience.providerHealthHtml() +
          '<p class="fc-honesty">Network: ' +
          (WDS.resilience.isOnline() ? "online" : "offline") +
          "</p>"
        : "") +
      (global.WDS && WDS.platformWorkflows
        ? WDS.platformWorkflows.renderLinksHtml("foragecast", { depth: 1, when: "after-conditions" })
        : "") +
      '<p class="fc-honesty">Shared Studio settings: <a href="../../settings.html">Profile, places, units</a></p>' +
      '<p class="fc-honesty">ForageCast will not invent live forecasts when providers fail.</p></section>'
    );
  }

  function start(active) {
    var params = new URLSearchParams(location.search);
    var speciesId = params.get("id");

    ForageCastShell.bootPage({
      active: active,
      render: function (ctx, esc) {
        if (active === "conditions") return renderConditions(ctx, esc);
        if (active === "species") {
          return speciesId ? renderSpeciesDetail(ctx, esc, speciesId) : renderSpeciesList(ctx, esc);
        }
        if (active === "timeline") return renderTimeline(ctx, esc);
        if (active === "weather") return renderWeather(ctx, esc);
        if (active === "habitats") return renderHabitats(ctx, esc);
        if (active === "map") return renderMap(ctx, esc);
        if (active === "learn") return renderLearn(ctx, esc);
        if (active === "journal") return renderJournal(ctx, esc);
        if (active === "settings") return renderSettings(ctx, esc);
        return "<p>Unknown view</p>";
      },
      afterRender: function (ctx, mount) {
        if (active === "journal") bindJournal(mount);
        if (active === "map" && global.WDS && WDS.mapView) {
          WDS.mapView.bindAll(mount, ctx.loc, {
            base: global.ForageCastBoot ? ForageCastBoot.ENGINE_BASE : "../../design-system/content-engine/"
          });
        }
        if (speciesId) document.title = "Species — ForageCast";
      }
    });
  }

  global.ForageCastViews = { start: start };
})(typeof window !== "undefined" ? window : globalThis);
