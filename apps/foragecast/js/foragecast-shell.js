/**
 * Shared ForageCast task-page shell — load once, render interpreted views.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function taskNav(active) {
    if (global.ForageCastHome && ForageCastHome.renderTaskNav) {
      return ForageCastHome.renderTaskNav(active);
    }
    var items = [
      ["overview", "index.html", "Overview"],
      ["conditions", "conditions.html", "Today’s Conditions"],
      ["species", "species.html", "Species"],
      ["map", "map.html", "Map"],
      ["timeline", "timeline.html", "Season Timeline"],
      ["weather", "weather.html", "Recent Weather"],
      ["habitats", "habitats.html", "Habitats"],
      ["learn", "learn.html", "Learn"],
      ["journal", "journal.html", "Journal"],
      ["settings", "settings.html", "Settings"]
    ];
    return (
      '<nav class="fc-task-nav" aria-label="ForageCast tasks">' +
      items
        .map(function (it) {
          var on = it[0] === active ? " is-active" : "";
          return (
            '<a class="fc-task-nav__link' +
            on +
            '" href="' +
            it[1] +
            '"' +
            (on ? ' aria-current="page"' : "") +
            ">" +
            escapeHtml(it[2]) +
            "</a>"
          );
        })
        .join("") +
      "</nav>"
    );
  }

  function getJson(url) {
    if (global.ForageCastFetch) return ForageCastFetch.getJson(url);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url);
      return r.json().then(function (data) {
        return { data: data, freshness: { source: "network", ageMs: 0 } };
      });
    });
  }

  function loadCore(loc) {
    var platformPromise =
      global.ForageCastBoot && ForageCastBoot.fetchPlatform
        ? ForageCastBoot.fetchPlatform(loc).catch(function () {
            return null;
          })
        : Promise.resolve(null);

    return Promise.all([
      getJson("data/home.json"),
      getJson("data/species-model.json"),
      getJson("data/conditions.json"),
      getJson("data/terrain-zones.json"),
      platformPromise
    ]).then(function (parts) {
      var home = parts[0].data;
      var speciesModel = parts[1].data;
      var conditions = parts[2].data;
      var terrain = parts[3].data;
      var platform = parts[4];
      var freshness = parts[0].freshness;

      if (global.ForageCastLocation) {
        ForageCastLocation.applyToHomeData(home, loc, platform);
        conditions = ForageCastLocation.applyToConditions(conditions, loc, platform);
      }
      if (platform && global.ForageCastModel && ForageCastModel.setCalendarContext) {
        ForageCastModel.setCalendarContext(platform.calendar);
      }

      var summary = global.ForageCastIntelligence
        ? ForageCastIntelligence.buildSummary({
            speciesList: speciesModel.species,
            zones: terrain.zones,
            conditions: conditions,
            platform: platform,
            homeData: home,
            location: loc || home._location
          })
        : null;

      return {
        home: home,
        speciesModel: speciesModel,
        conditions: conditions,
        terrain: terrain,
        platform: platform,
        loc: loc || home._location,
        freshness: freshness,
        summary: summary
      };
    });
  }

  function bootPage(options) {
    options = options || {};
    var mount = document.getElementById(options.mountId || "foragecast-page");
    if (!mount) return;
    mount.setAttribute("aria-busy", "true");
    mount.innerHTML = '<p class="fc-loading">Reading outdoor conditions…</p>';

    var started = false;
    function run(loc) {
      if (started) return;
      started = true;
      loadCore(loc)
        .then(function (ctx) {
          mount.innerHTML = taskNav(options.active) + options.render(ctx, escapeHtml);
          mount.removeAttribute("aria-busy");
          if (options.afterRender) options.afterRender(ctx, mount);
          if (global.ForageCastBoot) {
            ForageCastBoot.bindRegionChange(mount, function () {
              started = false;
              mount.setAttribute("aria-busy", "true");
              run(global.WDS && WDS.location ? WDS.location.getState() : null);
            });
          }
        })
        .catch(function (err) {
          mount.innerHTML =
            taskNav(options.active) +
            '<section class="fc-section" role="alert"><p>Could not load this view.</p>' +
            "<p class=\"wds-caption\">" +
            escapeHtml(err && err.message ? err.message : "Unknown error") +
            "</p>" +
            '<p><button type="button" class="wds-btn wds-btn--primary wds-btn--sm" onclick="location.reload()">Retry</button></p></section>';
          mount.removeAttribute("aria-busy");
        });
    }

    if (global.ForageCastBoot) {
      var timer = setTimeout(function () {
        run(null);
      }, 1800);
      ForageCastBoot.bootstrapLocation()
        .then(function (loc) {
          clearTimeout(timer);
          run(loc);
        })
        .catch(function () {
          clearTimeout(timer);
          run(null);
        });
    } else {
      run(null);
    }
  }

  global.ForageCastShell = {
    escapeHtml: escapeHtml,
    taskNav: taskNav,
    loadCore: loadCore,
    bootPage: bootPage
  };
})(typeof window !== "undefined" ? window : globalThis);
