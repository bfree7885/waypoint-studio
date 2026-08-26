/**
 * Waypoint Volunteer — discovery surface with Opportunity Intelligence.
 * Mission: "What good can I do today?" — calm, private, explained.
 * Sprint 9: location origin, text search, bridge apps, boot watch.
 */
(function (global) {
  "use strict";

  var LOC_DENIED_KEY = "wv-loc-denied-v1";

  var BRIDGE_APPS = {
    fieldry: { href: "../fieldry/", label: "Fieldry" },
    scenes: { href: "../scenes/", label: "Scenes" },
    foragecast: { href: "../foragecast/", label: "ForageCast" },
    dashboard: { href: "../dashboard/", label: "Dashboard" },
    "photo-coach": { href: "../photo-coach/", label: "Photo Coach" },
    sheds: { href: "../shed-hunting/", label: "Sheds" },
    "landscape-interpretation": {
      href: "../landscape-interpretation/",
      label: "Landscape Interpretation"
    },
    "hidden-landscapes": { href: "../hidden-landscapes/", label: "Hidden Landscapes" }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Could not load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  function index(list) {
    var map = {};
    (list || []).forEach(function (item) {
      map[item.id] = item;
    });
    return map;
  }

  function honestyBadge(label) {
    return '<span class="wv-honesty" title="Data honesty">' + esc(label) + "</span>";
  }

  function resolveOrigin() {
    var Weather = global.WDS && global.WDS.volunteerWeather;
    var fallback = (Weather && Weather.DEFAULT_CENTER) || {
      lat: 41.35,
      lon: -74.91,
      label: "Pike County area (sample)"
    };
    var denied = false;
    try {
      denied = global.localStorage && localStorage.getItem(LOC_DENIED_KEY) === "1";
    } catch (e) {}

    if (denied || !global.navigator || !navigator.geolocation) {
      return Promise.resolve({
        lat: fallback.lat,
        lon: fallback.lon,
        label: fallback.label,
        hasFix: false,
        source: denied ? "sample-after-denied" : "sample-default",
        honesty: "sample-region"
      });
    }

    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({
          lat: fallback.lat,
          lon: fallback.lon,
          label: fallback.label,
          hasFix: false,
          source: "sample-timeout",
          honesty: "sample-region"
        });
      }, 8000);

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: "Near you",
            hasFix: true,
            source: "device",
            honesty: "device"
          });
        },
        function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err && err.code === 1) {
            try {
              localStorage.setItem(LOC_DENIED_KEY, "1");
            } catch (e2) {}
          }
          resolve({
            lat: fallback.lat,
            lon: fallback.lon,
            label: fallback.label,
            hasFix: false,
            source: err && err.code === 1 ? "sample-after-denied" : "sample-error",
            honesty: "sample-region"
          });
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
      );
    });
  }

  function matchesQuery(opp, org, q) {
    if (!q) return true;
    var blob = [
      opp.title,
      opp.description,
      opp.location && opp.location.label,
      opp.seasonal,
      opp.accessibility,
      (opp.categories || []).join(" "),
      (opp.requiredSkills || []).join(" "),
      org && org.name,
      ((opp.intelligence && opp.intelligence.causeTags) || []).join(" ")
    ]
      .join(" ")
      .toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function bridgeHtml(apps) {
    var list = (apps || []).filter(function (id) {
      return BRIDGE_APPS[id];
    });
    if (!list.length) return "";
    return (
      '<h3>Related Waypoint tools</h3><ul class="wv-bridges">' +
      list
        .map(function (id) {
          var b = BRIDGE_APPS[id];
          return (
            "<li><a href=\"" +
            esc(b.href) +
            '">' +
            esc(b.label) +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function citizenScienceStrip(bundle, orgsById) {
    var rows = (bundle.opportunities || []).filter(function (o) {
      return (o.categories || []).indexOf("citizen-science") !== -1;
    });
    if (!rows.length) return "";
    return (
      '<section class="wv-citizen" aria-labelledby="wv-citizen-title">' +
      '<h2 id="wv-citizen-title">Citizen science nearby</h2>' +
      '<p class="wv-muted">Volunteer meetups complement observations you keep in Fieldry, Sheds, ForageCast, Scenes, and Landscape Interpretation — one discovery list, not a second notebook.</p>' +
      "<ul>" +
      rows
        .slice(0, 4)
        .map(function (o) {
          var org = orgsById[o.organizationId];
          return (
            '<li><button type="button" class="wv-alt" data-id="' +
            esc(o.id) +
            '">' +
            esc(o.title) +
            "</button> · " +
            esc(org ? org.name : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>" +
      '<p class="wv-citizen-links">' +
      '<a href="../fieldry/">Fieldry</a> · ' +
      '<a href="../shed-hunting/">Sheds</a> · ' +
      '<a href="../foragecast/">ForageCast</a> · ' +
      '<a href="../scenes/">Scenes</a> · ' +
      '<a href="../landscape-interpretation/">Landscape Interpretation</a>' +
      "</p></section>"
    );
  }

  function mountDiscover(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));

    var Intel = global.WDS && global.WDS.volunteerIntelligence;
    var Weather = global.WDS && global.WDS.volunteerWeather;
    var Profile = global.WDS && global.WDS.volunteerProfile;
    var Planning = global.WDS && global.WDS.volunteerPlanning;
    var Impact = global.WDS && global.WDS.volunteerImpact;
    var VMap = global.WDS && global.WDS.volunteerMap;
    var base = options.base || "../../design-system/volunteer/";
    var mapApi = null;
    var stopWatch = null;

    function startBoot() {
      root.setAttribute("aria-busy", "true");
      if (global.WDS && WDS.platformBoot) {
        WDS.platformBoot.mount(root, {
          product: "Waypoint Volunteer",
          title: "What good can I do today?",
          detail: "Loading sample opportunities and weather context. Discovery only — not management software.",
          status: "Starting…"
        });
        stopWatch = WDS.platformBoot.watch(root, {
          product: "Waypoint Volunteer",
          title: "Discovery is taking too long",
          detail: "Catalog or weather stalled. Retry when ready. Sample opportunities stay labeled.",
          homeHref: "./",
          onRetry: function () {
            mountDiscover(root, options);
          }
        });
      } else {
        root.innerHTML = '<p class="wv-loading">Looking for good you can do…</p>';
      }
    }

    function clearBoot() {
      if (stopWatch) stopWatch();
      if (global.WDS && WDS.platformBoot) WDS.platformBoot.clear(root);
      root.removeAttribute("aria-busy");
    }

    startBoot();
    if (global.WDS && WDS.platformBoot) {
      WDS.platformBoot.status(root, "Resolving location…");
    }

    return resolveOrigin()
      .then(function (origin) {
        if (global.WDS && WDS.platformBoot) {
          WDS.platformBoot.status(root, "Loading catalog…");
        }
        return Promise.all([
          loadJson(base + "samples/demo-bundle.json"),
          loadJson(base + "skills.json"),
          loadJson(base + "categories.json"),
          Weather
            ? Weather.fetchContext({
                lat: origin.lat,
                lon: origin.lon,
                label: origin.label
              })
            : Promise.resolve({
                honesty: "unavailable",
                weather: { available: false },
                location: origin
              }),
          Promise.resolve(origin)
        ]);
      })
      .then(function (parts) {
        var bundle = parts[0];
        var skillsById = index(parts[1].skills);
        var categoriesById = index(parts[2].categories);
        var orgsById = index(bundle.organizations);
        var ctx = parts[3];
        var origin = parts[4];
        var profile = Profile ? Profile.load() : {};

        if (ctx && ctx.location) {
          ctx.location.hasFix = !!origin.hasFix;
          ctx.location.source = origin.source;
          ctx.location.label = origin.label;
        }
        ctx.locationHonesty = origin.honesty;

        var state = {
          q: "",
          setting: "any",
          duration: "any",
          family: false,
          weekend: false,
          outdoorToday: false,
          seasonal: false,
          remote: false,
          virtual: false,
          accessible: false,
          today: true,
          category: "any",
          skill: "any",
          interest: "any",
          effort: "any",
          causeTag: "any",
          organizationId: "",
          maxMiles: String(profile.preferredTravelMiles || 25),
          selectedId: null,
          view: "list"
        };

        function scoreAll() {
          return (bundle.opportunities || []).map(function (o) {
            return {
              opportunity: o,
              score: Intel
                ? Intel.scoreOpportunity(o, ctx, profile)
                : {
                    overall: 50,
                    reasons: [],
                    distanceMiles: null,
                    honesty: { data: "sample", weather: "unavailable", scoring: "estimated" }
                  }
            };
          });
        }

        function filteredRows() {
          var rows = scoreAll();
          var q = String(state.q || "")
            .toLowerCase()
            .trim();
          var f = state;
          return rows
            .filter(function (row) {
              if (Planning && Planning.isHidden(row.opportunity.id)) return false;
              if (!matchesQuery(row.opportunity, orgsById[row.opportunity.organizationId], q))
                return false;
              if (Intel) return Intel.matchesDiscoveryFilters(row.opportunity, f, row.score);
              return true;
            })
            .sort(function (a, b) {
              return (b.score.overall || 0) - (a.score.overall || 0);
            });
        }

        function todayPanel(rows) {
          var rec = Intel
            ? Intel.recommendToday(
                rows.map(function (r) {
                  return r.opportunity;
                }),
                ctx,
                profile
              )
            : null;
          if (!rec || !rec.top) {
            return (
              '<section class="wv-today" aria-labelledby="wv-today-title">' +
              '<h2 id="wv-today-title">What good can I do today?</h2>' +
              '<p class="wv-muted">No matches yet — widen filters or clear search.</p></section>'
            );
          }
          var top = rec.top;
          var o = top.opportunity;
          var s = top.score;
          var org = orgsById[o.organizationId];
          var wxLine =
            ctx.weather && ctx.weather.available
              ? Math.round(ctx.weather.temperatureF) +
                "°F · " +
                (ctx.weather.tags || []).slice(0, 2).join(", ")
              : "Weather " + (ctx.honesty || "unavailable");
          var alts = (rec.alternatives || [])
            .map(function (a) {
              return (
                '<li><button type="button" class="wv-alt" data-id="' +
                esc(a.opportunity.id) +
                '">' +
                esc(a.opportunity.title) +
                " <span>(" +
                a.score.overall +
                ")</span></button></li>"
              );
            })
            .join("");

          return (
            '<section class="wv-today" aria-labelledby="wv-today-title">' +
            '<div class="wv-today-head">' +
            '<h2 id="wv-today-title">What good can I do today?</h2>' +
            '<div class="wv-today-meta">' +
            honestyBadge(rec.honesty.catalog) +
            honestyBadge("weather:" + rec.honesty.weather) +
            honestyBadge("place:" + (ctx.locationHonesty || "sample-region")) +
            honestyBadge("score:estimated") +
            "</div></div>" +
            '<p class="wv-today-wx" aria-live="polite">' +
            esc(wxLine) +
            " · " +
            esc((ctx.location && ctx.location.label) || "Sample region") +
            (rec.insights[0] ? " — " + esc(rec.insights[0].message) : "") +
            "</p>" +
            '<article class="wv-today-card">' +
            "<h3>" +
            esc(o.title) +
            "</h3>" +
            '<p class="wv-org">' +
            esc(org ? org.name : o.organizationId) +
            "</p>" +
            '<p class="wv-why"><strong>Why:</strong> ' +
            esc((s.reasons && s.reasons[0]) || "A calm fit for today.") +
            "</p>" +
            '<ul class="wv-today-facts">' +
            "<li>Recommendation " +
            s.overall +
            ' <span class="wv-muted">(private estimate)</span></li>' +
            "<li>" +
            (s.distanceMiles != null ? s.distanceMiles + " mi" : "Distance n/a") +
            "</li>" +
            "<li>" +
            esc(o.estimatedDuration.label) +
            "</li>" +
            "<li>" +
            esc(o.setting) +
            "</li></ul>" +
            '<button type="button" class="wv-btn" data-id="' +
            esc(o.id) +
            '">Open details</button>' +
            "</article>" +
            (alts
              ? '<div class="wv-alts"><h3>Alternatives</h3><ul>' + alts + "</ul></div>"
              : "") +
            "</section>"
          );
        }

        function detailHtml(selected, score) {
          if (!selected) return '<p class="wv-empty">Select an opportunity.</p>';
          var org = orgsById[selected.organizationId];
          var i = selected.intelligence || {};
          var planningItem = Planning ? Planning.getItem(selected.id) : null;
          var statuses = (planningItem && planningItem.statuses) || [];
          var reasonList = ((score && score.reasons) || [])
            .map(function (r) {
              return "<li>" + esc(r) + "</li>";
            })
            .join("");

          function statusBtn(st, label) {
            var on = statuses.indexOf(st) !== -1;
            return (
              '<button type="button" class="wv-chip' +
              (on ? " is-on" : "") +
              '" data-status="' +
              esc(st) +
              '" data-oid="' +
              esc(selected.id) +
              '" aria-pressed="' +
              (on ? "true" : "false") +
              '">' +
              esc(label) +
              "</button>"
            );
          }

          return (
            "<h2>" +
            esc(selected.title) +
            "</h2>" +
            '<p class="wv-org">' +
            esc(org ? org.name : selected.organizationId) +
            "</p>" +
            "<p>" +
            esc(selected.description) +
            "</p>" +
            (score
              ? '<div class="wv-explain"><h3>Why this ranks for today</h3><ul>' +
                reasonList +
                "</ul>" +
                '<p class="wv-muted">Private estimate ' +
                score.overall +
                " · weather fit " +
                (score.weather && score.weather.score) +
                " · " +
                honestyBadge((score.honesty && score.honesty.data) || "sample") +
                "</p></div>"
              : "") +
            "<h3>Where & when</h3><p>" +
            esc(selected.location.label) +
            " · " +
            esc((selected.schedule && selected.schedule.whenLabel) || selected.schedule.kind) +
            (score && score.distanceMiles != null ? " · ~" + score.distanceMiles + " mi" : "") +
            (selected.seasonal ? " · Seasonal: " + esc(selected.seasonal) : "") +
            "</p>" +
            "<h3>Effort & access</h3><p>" +
            esc(selected.physicalEffort) +
            " · " +
            esc(selected.accessibility || "No accessibility notes yet.") +
            (i.wheelchairFriendly ? " · Wheelchair-friendlier (sample)" : "") +
            (selected.familyFriendly || i.kidFriendly ? " · Family-friendly (sample)" : "") +
            "</p>" +
            "<h3>Cause categories</h3><p>" +
            esc((selected.categories || []).join(" · ") || "—") +
            "</p>" +
            "<h3>Intelligence facets</h3>" +
            '<ul class="wv-facets">' +
            "<li>Service impact " +
            (i.serviceImpact != null ? i.serviceImpact : "—") +
            "</li>" +
            "<li>Outdoor suitability " +
            (i.outdoorSuitability != null ? i.outdoorSuitability : "—") +
            "</li>" +
            "<li>Drop-in " +
            (i.dropInFriendly ? "yes" : "no") +
            "</li>" +
            "<li>Remote/virtual " +
            (i.remote || i.virtual ? "yes" : "no") +
            "</li>" +
            "<li>Tags: " +
            esc((i.causeTags || []).join(", ") || "—") +
            "</li></ul>" +
            bridgeHtml(selected.bridgeApps) +
            "<h3>Your private list</h3>" +
            '<div class="wv-status-row" role="group" aria-label="Save status">' +
            statusBtn("interested", "Interested") +
            statusBtn("planning", "Planning") +
            statusBtn("registered", "Registered") +
            statusBtn("completed", "Completed") +
            statusBtn("favorite", "Favorite") +
            statusBtn("remind-later", "Remind later") +
            statusBtn("hidden", "Hidden") +
            statusBtn("dismissed", "Dismissed") +
            "</div>" +
            '<p class="wv-muted">Waypoint helps you discover — contact the organization yourself. No rankings. No streaks. No public profile.</p>' +
            (selected.meta && selected.meta.disclaimer
              ? '<p class="wv-badge">' + esc(selected.meta.disclaimer) + "</p>"
              : "")
          );
        }

        function paint() {
          var rows = filteredRows();
          if (!state.selectedId || !rows.some(function (r) { return r.opportunity.id === state.selectedId; })) {
            state.selectedId = rows[0] ? rows[0].opportunity.id : null;
          }
          var selectedRow = rows.find(function (r) {
            return r.opportunity.id === state.selectedId;
          });
          var selected = selectedRow ? selectedRow.opportunity : null;
          if (selected && Planning) Planning.markVisited(selected.id);

          var catOptions = Object.keys(categoriesById)
            .map(function (id) {
              return (
                '<option value="' +
                esc(id) +
                '"' +
                (state.interest === id || state.category === id ? " selected" : "") +
                ">" +
                esc(categoriesById[id].label) +
                "</option>"
              );
            })
            .join("");
          var skillOptions = Object.keys(skillsById)
            .map(function (id) {
              return (
                '<option value="' +
                esc(id) +
                '"' +
                (state.skill === id ? " selected" : "") +
                ">" +
                esc(skillsById[id].label) +
                "</option>"
              );
            })
            .join("");
          var orgOptions = Object.keys(orgsById)
            .map(function (id) {
              return (
                '<option value="' +
                esc(id) +
                '"' +
                (state.organizationId === id ? " selected" : "") +
                ">" +
                esc(orgsById[id].name) +
                "</option>"
              );
            })
            .join("");

          root.innerHTML =
            '<div class="wv-discover">' +
            '<header class="wv-header">' +
            '<p class="wv-eyebrow">Nearby ways to help</p>' +
            "<h1>What good can I do today?</h1>" +
            '<p class="wv-lead">Conservation, trails, shelters, citizen science, cleanup, restoration, and education. Discovery only — no rankings.</p>' +
            '<p class="wv-nav-mini">' +
            '<a href="saved/">Saved</a> · <a href="profile/">Interests</a> · <a href="impact/">Impact</a> · <a href="./?about=1">About</a>' +
            "</p>" +
            '<p class="wv-place" aria-live="polite">' +
            honestyBadge(ctx.locationHonesty || "sample-region") +
            " Looking from <strong>" +
            esc((ctx.location && ctx.location.label) || "sample region") +
            "</strong>" +
            (origin.hasFix ? "" : " — sample catalog distances until location is available") +
            ' · <button type="button" class="wv-linkish" data-retry-loc="1">Use my location</button>' +
            "</p>" +
            (bundle.meta && bundle.meta.disclaimer
              ? '<p class="wv-badge">' + esc(bundle.meta.disclaimer) + "</p>"
              : "") +
            "</header>" +
            todayPanel(rows) +
            citizenScienceStrip(bundle, orgsById) +
            '<form class="wv-filters" aria-label="Discovery filters">' +
            '<label class="wv-search">Search <input data-f="q" type="search" enterkeyhint="search" placeholder="Trail, shelter, bird survey…" value="' +
            esc(state.q) +
            '" autocomplete="off" /></label>' +
            '<label>Setting <select data-f="setting">' +
            '<option value="any">Any</option>' +
            '<option value="outdoor"' +
            (state.setting === "outdoor" ? " selected" : "") +
            ">Outdoor</option>" +
            '<option value="indoor"' +
            (state.setting === "indoor" ? " selected" : "") +
            ">Indoor</option>" +
            '<option value="mixed"' +
            (state.setting === "mixed" ? " selected" : "") +
            ">Mixed</option></select></label>" +
            '<label>Time <select data-f="duration">' +
            '<option value="any">Any length</option>' +
            '<option value="hour"' +
            (state.duration === "hour" ? " selected" : "") +
            ">About one hour</option>" +
            '<option value="half"' +
            (state.duration === "half" ? " selected" : "") +
            ">Up to ~3 hours</option></select></label>" +
            '<label>Cause <select data-f="interest"><option value="any">Any cause</option>' +
            catOptions +
            "</select></label>" +
            '<label>Effort <select data-f="effort">' +
            '<option value="any">Any effort</option>' +
            '<option value="light"' +
            (state.effort === "light" ? " selected" : "") +
            ">Light</option>" +
            '<option value="moderate"' +
            (state.effort === "moderate" ? " selected" : "") +
            ">Moderate</option>" +
            '<option value="strenuous"' +
            (state.effort === "strenuous" ? " selected" : "") +
            ">Strenuous</option></select></label>" +
            '<label>Skill <select data-f="skill"><option value="any">Any skill</option>' +
            skillOptions +
            "</select></label>" +
            '<label>Organization <select data-f="organizationId"><option value="">Any org</option>' +
            orgOptions +
            "</select></label>" +
            '<label>Distance (mi) <input data-f="maxMiles" type="number" min="1" max="200" inputmode="numeric" value="' +
            esc(state.maxMiles) +
            '" /></label>' +
            '<label class="wv-check"><input type="checkbox" data-f="today"' +
            (state.today ? " checked" : "") +
            " /> Today focus</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="weekend"' +
            (state.weekend ? " checked" : "") +
            " /> This weekend</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="outdoorToday"' +
            (state.outdoorToday ? " checked" : "") +
            " /> Outdoors</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="seasonal"' +
            (state.seasonal ? " checked" : "") +
            " /> Seasonal</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="remote"' +
            (state.remote ? " checked" : "") +
            " /> Remote</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="virtual"' +
            (state.virtual ? " checked" : "") +
            " /> Virtual</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="accessible"' +
            (state.accessible ? " checked" : "") +
            " /> Accessible</label>" +
            '<label class="wv-check"><input type="checkbox" data-f="family"' +
            (state.family ? " checked" : "") +
            " /> Family / kids</label>" +
            "</form>" +
            '<div class="wv-view-toggle" role="group" aria-label="Results view">' +
            '<button type="button" data-view="list" class="' +
            (state.view === "list" ? "is-on" : "") +
            '">List</button>' +
            '<button type="button" data-view="map" class="' +
            (state.view === "map" ? "is-on" : "") +
            '">Map</button></div>' +
            '<div class="wv-grid">' +
            '<section class="wv-list" aria-label="Matching opportunities">' +
            "<h2>" +
            rows.length +
            " matching</h2>" +
            (state.view === "map"
              ? '<div id="wv-map" class="wv-map" role="img" aria-label="Opportunity map"></div>' +
                '<p class="wv-map-legend"><span class="wv-dot wv-dot-today"></span> Today top · <span class="wv-dot wv-dot-saved"></span> Saved · <span class="wv-dot wv-dot-cat"></span> Category</p>'
              : "") +
            (rows.length
              ? "<ul>" +
                rows
                  .map(function (row) {
                    var o = row.opportunity;
                    var on = o.id === state.selectedId;
                    var saved =
                      Planning &&
                      (Planning.hasStatus(o.id, "favorite") ||
                        Planning.hasStatus(o.id, "planning") ||
                        Planning.hasStatus(o.id, "interested"));
                    return (
                      '<li><button type="button" class="wv-card' +
                      (on ? " is-selected" : "") +
                      '" data-id="' +
                      esc(o.id) +
                      '"><span class="wv-card-title">' +
                      esc(o.title) +
                      '</span><span class="wv-card-meta">' +
                      esc(o.setting) +
                      " · " +
                      esc(o.estimatedDuration.label) +
                      " · " +
                      row.score.overall +
                      (row.score.distanceMiles != null ? " · " + row.score.distanceMiles + " mi" : "") +
                      (saved ? " · saved" : "") +
                      '</span><span class="wv-card-why">' +
                      esc((row.score.reasons && row.score.reasons[0]) || "") +
                      "</span></button></li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="wv-empty">Nothing matches — try widening distance, clearing search, or another cause. Silence beats inventing events.</p>') +
            "</section>" +
            '<section class="wv-detail" aria-label="Opportunity detail">' +
            detailHtml(selected, selectedRow && selectedRow.score) +
            "</section></div></div>";

          var searchDebounce = null;
          root.querySelectorAll("[data-f]").forEach(function (el) {
            var key = el.getAttribute("data-f");
            var handler = function () {
              if (el.type === "checkbox") state[key] = el.checked;
              else state[key] = el.value;
              if (key === "interest") state.category = state.interest;
              paint();
            };
            if (key === "q") {
              el.addEventListener("input", function () {
                state.q = el.value;
                if (searchDebounce) clearTimeout(searchDebounce);
                searchDebounce = setTimeout(paint, 140);
              });
            } else {
              el.addEventListener("change", handler);
            }
          });
          root.querySelectorAll("[data-id]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              state.selectedId = btn.getAttribute("data-id");
              paint();
            });
          });
          root.querySelectorAll("[data-view]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              state.view = btn.getAttribute("data-view");
              paint();
            });
          });
          root.querySelectorAll("[data-status]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              if (!Planning) return;
              var id = btn.getAttribute("data-oid");
              var st = btn.getAttribute("data-status");
              if (Planning.hasStatus(id, st)) Planning.clearStatus(id, st);
              else {
                Planning.setStatus(id, st);
                if (st === "completed" && Impact) {
                  var opp = (bundle.opportunities || []).find(function (o) {
                    return o.id === id;
                  });
                  if (opp) Impact.recordCompletion(opp, orgsById[opp.organizationId]);
                }
              }
              paint();
            });
          });
          var retryLoc = root.querySelector("[data-retry-loc]");
          if (retryLoc) {
            retryLoc.addEventListener("click", function () {
              try {
                localStorage.removeItem(LOC_DENIED_KEY);
              } catch (e) {}
              mountDiscover(root, options);
            });
          }

          if (state.view === "map" && VMap) {
            var mapEl = root.querySelector("#wv-map");
            if (mapEl) {
              if (mapApi) mapApi.destroy();
              mapApi = VMap.mountMap(mapEl, {
                center: [origin.lat, origin.lon],
                onSelect: function (id) {
                  state.selectedId = id;
                  state.view = "list";
                  paint();
                }
              });
              var topId = rows[0] && rows[0].opportunity.id;
              mapApi.update(
                rows.map(function (row) {
                  var kind = "default";
                  if (row.opportunity.id === topId) kind = "today";
                  else if (
                    Planning &&
                    (Planning.hasStatus(row.opportunity.id, "favorite") ||
                      Planning.hasStatus(row.opportunity.id, "planning"))
                  )
                    kind = "saved";
                  return { opportunity: row.opportunity, markerKind: kind };
                })
              );
            }
          }
        }

        clearBoot();
        paint();
        return bundle;
      })
      .catch(function (err) {
        if (stopWatch) stopWatch();
        if (global.WDS && WDS.platformBoot) {
          WDS.platformBoot.fail(root, {
            product: "Waypoint Volunteer",
            title: "Could not open discovery",
            detail: (err && err.message) || "Unknown error",
            homeHref: "./",
            onRetry: function () {
              mountDiscover(root, options);
            }
          });
        } else {
          root.removeAttribute("aria-busy");
          root.innerHTML =
            '<p class="wv-error">Could not open discovery. ' + esc(err && err.message) + "</p>";
        }
        throw err;
      });
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerDiscover = {
    mountDiscover: mountDiscover,
    resolveOrigin: resolveOrigin,
    matchesQuery: matchesQuery,
    BRIDGE_APPS: BRIDGE_APPS,
    matchesFilters: function (opp, f) {
      var Intel = global.WDS && global.WDS.volunteerIntelligence;
      return Intel ? Intel.matchesDiscoveryFilters(opp, f, null) : true;
    }
  };
})(window);
