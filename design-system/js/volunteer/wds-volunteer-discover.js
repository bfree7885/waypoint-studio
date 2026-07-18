/**
 * Waypoint Volunteer — discovery prototype.
 * "What good can I do today?" — no gamification, no registration.
 */
(function (global) {
  "use strict";

  var bundle = null;
  var orgsById = {};
  var skillsById = {};
  var categoriesById = {};

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

  function matchesFilters(opp, f) {
    if (f.setting && f.setting !== "any" && opp.setting !== f.setting) return false;
    if (f.duration === "hour" && !(opp.estimatedDuration && opp.estimatedDuration.minutes <= 75))
      return false;
    if (f.duration === "half" && !(opp.estimatedDuration && opp.estimatedDuration.minutes <= 180))
      return false;
    if (f.family && !opp.familyFriendly) return false;
    if (f.weekend) {
      var when = ((opp.schedule && opp.schedule.whenLabel) || "").toLowerCase();
      if (when.indexOf("saturday") === -1 && when.indexOf("sunday") === -1 && when.indexOf("weekend") === -1)
        return false;
    }
    if (f.weatherOk && opp.weatherSensitive === false) {
      /* allow all; weatherOk means prefer outdoor weather-sensitive when "good weather" */
    }
    if (f.outdoorToday && opp.setting === "indoor") return false;
    if (f.category && f.category !== "any" && (opp.categories || []).indexOf(f.category) === -1)
      return false;
    if (f.skill && f.skill !== "any") {
      var skills = opp.requiredSkills || [];
      if (skills.indexOf(f.skill) === -1) return false;
    }
    if (f.interest && f.interest !== "any") {
      if ((opp.categories || []).indexOf(f.interest) === -1) return false;
    }
    return true;
  }

  function mountDiscover(root, options) {
    options = options || {};
    if (!root) return Promise.reject(new Error("mount root required"));
    root.setAttribute("aria-busy", "true");
    root.innerHTML = '<p class="wv-loading">Looking for good you can do…</p>';

    var base = options.base || "../../design-system/volunteer/";
    return Promise.all([
      loadJson(base + "samples/demo-bundle.json"),
      loadJson(base + "skills.json"),
      loadJson(base + "categories.json")
    ]).then(function (parts) {
      bundle = parts[0];
      skillsById = index(parts[1].skills);
      categoriesById = index(parts[2].categories);
      orgsById = index(bundle.organizations);

      var state = {
        setting: "any",
        duration: "any",
        family: false,
        weekend: false,
        outdoorToday: false,
        category: "any",
        skill: "any",
        interest: "any",
        selectedId: null
      };

      function filtered() {
        return (bundle.opportunities || []).filter(function (o) {
          return matchesFilters(o, state);
        });
      }

      function paint() {
        var list = filtered();
        if (!state.selectedId || !list.some(function (o) { return o.id === state.selectedId; })) {
          state.selectedId = list[0] ? list[0].id : null;
        }
        var selected = state.selectedId
          ? (bundle.opportunities || []).find(function (o) {
              return o.id === state.selectedId;
            })
          : null;
        var org = selected ? orgsById[selected.organizationId] : null;

        var catOptions = Object.keys(categoriesById)
          .map(function (id) {
            return (
              '<option value="' +
              esc(id) +
              '"' +
              (state.category === id || state.interest === id ? " selected" : "") +
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

        root.innerHTML =
          '<div class="wv-discover">' +
          '<header class="wv-header">' +
          '<p class="wv-eyebrow">Waypoint Volunteer</p>' +
          "<h1>What good can I do today?</h1>" +
          '<p class="wv-lead">Discover calm ways to contribute — not a signup machine, not a scoreboard.</p>' +
          (bundle.meta && bundle.meta.disclaimer
            ? '<p class="wv-badge">' + esc(bundle.meta.disclaimer) + "</p>"
            : "") +
          "</header>" +
          '<form class="wv-filters" aria-label="Discovery filters">' +
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
          ">Mixed</option>" +
          "</select></label>" +
          '<label>Time <select data-f="duration">' +
          '<option value="any">Any length</option>' +
          '<option value="hour"' +
          (state.duration === "hour" ? " selected" : "") +
          ">About one hour</option>" +
          '<option value="half"' +
          (state.duration === "half" ? " selected" : "") +
          ">Up to ~3 hours</option>" +
          "</select></label>" +
          '<label>Interest <select data-f="interest">' +
          '<option value="any">Any interest</option>' +
          catOptions +
          "</select></label>" +
          '<label>Skill <select data-f="skill">' +
          '<option value="any">Any skill</option>' +
          skillOptions +
          "</select></label>" +
          '<label class="wv-check"><input type="checkbox" data-f="outdoorToday"' +
          (state.outdoorToday ? " checked" : "") +
          " /> Outdoors today</label>" +
          '<label class="wv-check"><input type="checkbox" data-f="weekend"' +
          (state.weekend ? " checked" : "") +
          " /> This weekend</label>" +
          '<label class="wv-check"><input type="checkbox" data-f="family"' +
          (state.family ? " checked" : "") +
          " /> Family friendly</label>" +
          "</form>" +
          '<div class="wv-grid">' +
          '<section class="wv-list" aria-label="Matching opportunities">' +
          "<h2>" +
          list.length +
          " matching</h2>" +
          (list.length
            ? '<ul>' +
              list
                .map(function (o) {
                  var on = o.id === state.selectedId;
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
                    esc((o.schedule && o.schedule.whenLabel) || o.schedule.kind) +
                    "</span></button></li>"
                  );
                })
                .join("") +
              "</ul>"
            : '<p class="wv-empty">Nothing matches these filters right now — try widening time or interest. Silence is better than inventing events.</p>') +
          "</section>" +
          '<section class="wv-detail" aria-label="Opportunity detail">' +
          (selected
            ? "<h2>" +
              esc(selected.title) +
              "</h2>" +
              '<p class="wv-org">' +
              esc(org ? org.name : selected.organizationId) +
              "</p>" +
              "<p>" +
              esc(selected.description) +
              "</p>" +
              "<h3>Where & when</h3><p>" +
              esc(selected.location.label) +
              " · " +
              esc((selected.schedule && selected.schedule.whenLabel) || selected.schedule.kind) +
              "</p>" +
              "<h3>Effort & access</h3><p>" +
              esc(selected.physicalEffort) +
              " · " +
              esc(selected.accessibility || "No accessibility notes yet.") +
              "</p>" +
              "<h3>Skills</h3><p>" +
              (selected.requiredSkills && selected.requiredSkills.length
                ? selected.requiredSkills
                    .map(function (id) {
                      return esc((skillsById[id] && skillsById[id].label) || id);
                    })
                    .join(", ")
                : "No special skills required") +
              "</p>" +
              "<h3>Bring</h3><p>" +
              (function () {
                var bring = []
                  .concat(selected.suggestedClothing || [], selected.suggestedEquipment || [])
                  .map(esc)
                  .join(" · ");
                return bring || "Nothing special listed";
              })() +
              "</p>" +
              (selected.todayOutsideHints && selected.todayOutsideHints.length
                ? "<h3>Today Outside tone</h3><ul>" +
                  selected.todayOutsideHints
                    .map(function (h) {
                      return "<li>" + esc(h) + "</li>";
                    })
                    .join("") +
                  "</ul>"
                : "") +
              (selected.bridgeApps && selected.bridgeApps.length
                ? '<p class="wv-muted">Related Waypoint apps (future): ' +
                  selected.bridgeApps.map(esc).join(", ") +
                  "</p>"
                : "") +
              '<p class="wv-muted">Waypoint helps you discover — contact the organization directly to volunteer. No rankings. No streaks.</p>' +
              (selected.meta && selected.meta.disclaimer
                ? '<p class="wv-badge">' + esc(selected.meta.disclaimer) + "</p>"
                : "")
            : '<p class="wv-empty">Select an opportunity.</p>') +
          "</section></div></div>";

        root.querySelectorAll("[data-f]").forEach(function (el) {
          var key = el.getAttribute("data-f");
          var handler = function () {
            if (el.type === "checkbox") state[key] = el.checked;
            else state[key] = el.value;
            if (key === "interest") state.category = state.interest;
            paint();
          };
          el.addEventListener("change", handler);
        });
        root.querySelectorAll("[data-id]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.selectedId = btn.getAttribute("data-id");
            paint();
          });
        });
      }

      root.removeAttribute("aria-busy");
      paint();
      return bundle;
    }).catch(function (err) {
      root.removeAttribute("aria-busy");
      root.innerHTML =
        '<p class="wv-error">Could not open discovery. ' + esc(err && err.message) + "</p>";
      throw err;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.volunteerDiscover = {
    mountDiscover: mountDiscover,
    matchesFilters: matchesFilters
  };
})(window);
