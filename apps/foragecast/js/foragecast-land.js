/**
 * ForageCast — property editor + shared pillar page renderer
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadPillars() {
    if (global.WDS && WDS.platformUi && WDS.platformUi.getJson) {
      return WDS.platformUi.getJson("data/pillars.json", { providerId: "foragecast-data" }).then(function (pack) {
        return pack && pack.data != null ? pack.data : pack;
      });
    }
    return fetch("data/pillars.json").then(function (r) {
      if (!r.ok) throw new Error("pillars");
      return r.json();
    });
  }

  function mountProperty() {
    var mount = document.getElementById("fc-property-mount");
    if (!mount || !window.ForageCastProfile) return;
    loadPillars().then(function (catalog) {
      var property = ForageCastProfile.loadProperty();
      var intent = ForageCastProfile.loadIntent();
      var featureChecks = (catalog.propertyFeatures || []).map(function (f) {
        var on = property.features.indexOf(f.id) >= 0;
        return (
          '<label class="fc-check">' +
            '<input type="checkbox" name="feature" value="' + esc(f.id) + '"' + (on ? " checked" : "") + ">" +
            "<span>" + esc(f.label) + "</span>" +
          "</label>"
        );
      }).join("");
      var intentChecks = (catalog.intents || []).map(function (i) {
        var on = intent.priorities.indexOf(i.id) >= 0;
        return (
          '<label class="fc-check">' +
            '<input type="checkbox" name="intent" value="' + esc(i.id) + '"' + (on ? " checked" : "") + ">" +
            "<span>" + esc(i.label) + "</span>" +
          "</label>"
        );
      }).join("");

      mount.innerHTML =
        '<header class="fc-land-hero">' +
          '<p class="wds-eyebrow"><a href="./">ForageCast</a> · Property</p>' +
          "<h1>Your land profile</h1>" +
          '<p class="fc-land-lead">Recommendations only appear for features you enable. Goals shape today’s priorities. Everything stays in this browser.</p>' +
        "</header>" +
        '<form class="fc-property-form" id="fc-property-form">' +
          '<label class="fc-field"><span>Property name (optional)</span>' +
            '<input type="text" name="name" value="' + esc(property.name || "") + '" maxlength="80" autocomplete="off">' +
          "</label>" +
          "<fieldset><legend>What exists on your property</legend>" +
            '<div class="fc-check-grid">' + featureChecks + "</div>" +
          "</fieldset>" +
          "<fieldset><legend>What you care about most</legend>" +
            '<div class="fc-check-grid">' + intentChecks + "</div>" +
          "</fieldset>" +
          '<label class="fc-field"><span>Notes (optional)</span>' +
            '<textarea name="notes" rows="3" maxlength="500">' + esc(property.notes || "") + "</textarea>" +
          "</label>" +
          '<div class="fc-actions">' +
            '<button type="submit" class="wds-btn wds-btn--primary">Save profile</button>' +
            '<a class="wds-btn wds-btn--ghost" href="./">Back to Today</a>' +
          "</div>" +
          '<p class="fc-save-status" id="fc-save-status" aria-live="polite"></p>' +
        "</form>";
      mount.removeAttribute("aria-busy");

      document.getElementById("fc-property-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var form = e.target;
        var features = Array.prototype.map.call(form.querySelectorAll('input[name="feature"]:checked'), function (el) {
          return el.value;
        });
        var priorities = Array.prototype.map.call(form.querySelectorAll('input[name="intent"]:checked'), function (el) {
          return el.value;
        });
        if (!priorities.length) priorities = ["forage"];
        ForageCastProfile.saveProperty({
          name: form.name.value.trim(),
          features: features,
          notes: form.notes.value.trim()
        });
        ForageCastProfile.saveIntent({ priorities: priorities });
        var status = document.getElementById("fc-save-status");
        if (status) status.textContent = "Saved on this device. Today’s plan will use this profile.";
      });
    }).catch(function () {
      mount.innerHTML = '<p class="wds-body" role="alert">Could not load property options.</p>';
    });
  }

  function mountPillar() {
    var mount = document.getElementById("fc-pillar-mount");
    if (!mount) return;
    var params = new URLSearchParams(location.search);
    var id = params.get("id") || "orchard";
    Promise.all([
      loadPillars(),
      window.ForageCastBoot ? ForageCastBoot.bootstrapLocation().catch(function () { return null; }) : Promise.resolve(null)
    ]).then(function (parts) {
      var catalog = parts[0];
      var loc = parts[1];
      var pillar = (catalog.pillars || []).find(function (p) { return p.id === id; });
      if (!pillar || pillar.id === "today") {
        mount.innerHTML = '<p class="wds-body">Unknown pillar.</p>';
        return;
      }
      var property = window.ForageCastProfile ? ForageCastProfile.loadProperty() : { features: [] };
      var intent = window.ForageCastProfile ? ForageCastProfile.loadIntent() : { priorities: ["forage"] };
      var plan = window.ForageCastToday
        ? ForageCastToday.buildPlan({ property: property, intent: intent, platform: null, limit: 10 })
        : { actions: [] };
      var related = (plan.actions || []).filter(function (a) { return a.pillar === id; });
      var featureLabels = (catalog.propertyFeatures || [])
        .filter(function (f) {
          return (f.pillars || []).indexOf(id) >= 0 && property.features.indexOf(f.id) >= 0;
        })
        .map(function (f) { return f.label; });

      var topics = (pillar.topics || []).map(function (t) {
        return "<li>" + esc(t) + "</li>";
      }).join("");
      var actions = related.length
        ? related.map(function (a) {
            return "<li><strong>" + esc(a.title) + "</strong><br><span>" + esc(a.why) + "</span></li>";
          }).join("")
        : "<li>No property-matched actions yet. Enable related features on your <a href=\"property.html\">property profile</a>.</li>";

      var region = loc ? (loc.name + ", " + (loc.stateCode || loc.state || "")) : "your region";

      mount.innerHTML =
        '<header class="fc-land-hero">' +
          '<p class="wds-eyebrow"><a href="./">ForageCast</a> · ' + esc(pillar.label) + "</p>" +
          "<h1>" + esc(pillar.title) + "</h1>" +
          '<p class="fc-land-lead">' + esc(pillar.summary) + " Guidance for " + esc(region) + ".</p>" +
        "</header>" +
        '<section class="fc-land-section"><h2>Focus areas</h2><ul>' + topics + "</ul></section>" +
        '<section class="fc-land-section"><h2>On your property</h2>' +
          (featureLabels.length
            ? "<p>" + esc(featureLabels.join(" · ")) + "</p>"
            : '<p>None of this pillar’s features are enabled yet. <a href="property.html">Add them</a>.</p>') +
        "</section>" +
        '<section class="fc-land-section"><h2>Suggested actions</h2><ul class="fc-action-list">' + actions + "</ul></section>" +
        '<p class="fc-land-note" role="note">Research-informed, educational guidance — not a harvest guarantee. Confirm every identification yourself.</p>';
      document.title = pillar.title + " — ForageCast";
    }).catch(function () {
      mount.innerHTML = '<p class="wds-body" role="alert">Could not load this pillar.</p>';
    });
  }

  function mountForaging() {
    var mount = document.getElementById("fc-foraging-mount");
    if (!mount) return;
    loadPillars().then(function (catalog) {
      var pillar = (catalog.pillars || []).find(function (p) { return p.id === "foraging"; }) || {};
      var topics = (pillar.topics || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
      mount.innerHTML =
        '<header class="fc-land-hero">' +
          '<p class="wds-eyebrow"><a href="./">ForageCast</a> · Foraging</p>' +
          "<h1>Wild foraging</h1>" +
          '<p class="fc-land-lead">' + esc(pillar.summary || "") + "</p>" +
        "</header>" +
        '<section class="fc-land-section"><h2>What this pillar covers</h2><ul>' + topics + "</ul></section>" +
        '<section class="fc-land-section">' +
          "<h2>Tools</h2>" +
          '<p><a class="wds-btn wds-btn--primary" href="season-table.html">Open season table</a> ' +
          '<a class="wds-btn wds-btn--ghost" href="./#foraging">Back to Today · foraging context</a></p>' +
        "</section>" +
        '<p class="fc-land-note" role="note">Educational timing and habitat context — never a guarantee of what you will find.</p>';
    });
  }

  global.ForageCastLand = {
    mountProperty: mountProperty,
    mountPillar: mountPillar,
    mountForaging: mountForaging
  };

  function boot() {
    // Property overview / wizard have dedicated modules.
    if (document.getElementById("fc-pillar-mount")) mountPillar();
    if (document.getElementById("fc-foraging-mount")) mountForaging();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
