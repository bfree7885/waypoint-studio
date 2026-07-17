/**
 * ForageCast — Property Overview dashboard
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

  function loadCatalog() {
    return fetch("data/property-catalog.json").then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    });
  }

  function seasonLabel() {
    var m = new Date().getMonth();
    if (m >= 2 && m <= 4) return "Spring";
    if (m >= 5 && m <= 7) return "Summer";
    if (m >= 8 && m <= 10) return "Autumn";
    return "Winter";
  }

  function mountOverview() {
    var mount = document.getElementById("fc-property-mount");
    if (!mount || !global.ForageCastProfile) return;

    Promise.all([
      loadCatalog(),
      global.ForageCastBoot
        ? ForageCastBoot.bootstrapLocation().then(function (loc) {
            return ForageCastBoot.fetchPlatform(loc).then(function (platform) {
              return { loc: loc, platform: platform };
            }).catch(function () { return { loc: loc, platform: null }; });
          }).catch(function () { return { loc: null, platform: null }; })
        : Promise.resolve({ loc: null, platform: null })
    ]).then(function (parts) {
      var catalog = parts[0];
      var loc = parts[1].loc;
      var platform = parts[1].platform;
      var property = ForageCastProfile.loadProperty();
      var intent = ForageCastProfile.loadIntent();
      var configured = ForageCastProfile.isConfigured(property);
      var needsWizard = ForageCastProfile.needsWizard(property);
      var sum = ForageCastProfile.summarize(property, catalog);
      var plan = global.ForageCastToday
        ? ForageCastToday.buildPlan({
            property: property,
            intent: intent,
            platform: platform,
            limit: 5
          })
        : { actions: [], weather: {}, season: "" };

      if (needsWizard && !/edit=1|saved=1/.test(location.search)) {
        mount.innerHTML =
          '<header class="fc-land-hero">' +
            '<p class="wds-eyebrow"><a href="./">ForageCast</a> · Property</p>' +
            "<h1>Tell ForageCast about your land</h1>" +
            '<p class="fc-land-lead">A short, skippable setup so Today recommends only what exists here. Private by default — nothing leaves this device.</p>' +
            '<p class="fc-actions">' +
              '<a class="wds-btn wds-btn--primary" href="property-setup.html">Start property setup</a>' +
              '<a class="wds-btn wds-btn--ghost" href="./">Back to Today</a>' +
            "</p>" +
          "</header>";
        mount.removeAttribute("aria-busy");
        return;
      }

      var region = loc ? (loc.name + ", " + (loc.stateCode || loc.state || "")) : (sum.locationLabel || "Your region");
      var wx = plan.weather || {};
      var priorities = (plan.actions || []).map(function (a, i) {
        return (
          '<li class="fc-today__item">' +
            '<span class="fc-today__rank">' + (i + 1) + "</span>" +
            '<div class="fc-today__body"><p class="fc-today__title">' + esc(a.title) + "</p>" +
            '<p class="fc-today__why">' + esc(a.why) + "</p></div></li>"
        );
      }).join("") || "<li>Add property details when helpful — priorities can reflect your land more closely.</li>";

      var risks = [];
      if (wx.frostRisk) risks.push("Frost risk overnight — protect tender bloom if still open.");
      if (wx.hot) risks.push("Heat stress likely — deep morning water for garden beds.");
      if (wx.skipWater) risks.push("Rain expected — skip unnecessary irrigation.");
      if (!risks.length) risks.push("No urgent weather risks detected from current signals.");

      var opportunities = [];
      if (wx.rainSoon || wx.rainRecentHint) opportunities.push("Moisture pulse — good moment for fungal habitat walks and log checks.");
      if ((property.orchard || []).length) opportunities.push("Orchard inventory on file — thinning, harvest, and pest checks can be personalized.");
      if ((property.gardenTypes || []).length) opportunities.push("Garden systems recorded — succession and mulch reminders are active.");
      if (!(property.photos || []).length) opportunities.push("Add a few on-device photos to help future land guidance.");
      if (!opportunities.length) opportunities.push("Complete orchard or garden details to surface more opportunities.");

      var harvestHints = [];
      if (ForageCastProfile.hasFeature(property, "blueberries") && seasonLabel() === "Summer") {
        harvestHints.push("Blueberries — check for peak waves every few days.");
      }
      if (ForageCastProfile.hasFeature(property, "apple-trees") && seasonLabel() === "Autumn") {
        harvestHints.push("Apples — watch seed color and easy release.");
      }
      if (ForageCastProfile.hasFeature(property, "cherry-trees") && (seasonLabel() === "Spring" || seasonLabel() === "Summer")) {
        harvestHints.push("Cherries — short window; birds often arrive first.");
      }
      if (!harvestHints.length) harvestHints.push("No harvest windows flagged yet for this season and profile.");

      var photoHtml = (property.photos || []).slice(0, 6).map(function (p) {
        return '<figure class="fc-photo-card"><div class="fc-photo-card__img" data-photo-slot="' + esc(p.id) + '"></div><figcaption>' + esc(p.category) + "</figcaption></figure>";
      }).join("") || '<p class="fc-muted">No property photos yet. <a href="property-setup.html">Add some in setup</a>.</p>';

      var saved = /saved=1/.test(location.search)
        ? '<p class="fc-banner" role="status">Property profile saved on this device.</p>'
        : "";

      mount.innerHTML =
        saved +
        '<header class="fc-land-hero">' +
          '<p class="wds-eyebrow"><a href="./">ForageCast</a> · Property overview</p>' +
          "<h1>" + esc(sum.name) + "</h1>" +
          '<p class="fc-land-lead">' + esc(region) +
            (sum.usdaZone ? " · USDA " + esc(sum.usdaZone) : "") +
            (sum.acreage ? " · " + esc(sum.acreage) + (/\d/.test(sum.acreage) ? " acres" : "") : "") +
          "</p>" +
          '<p class="fc-actions">' +
            '<a class="wds-btn wds-btn--primary" href="property-setup.html">Edit profile</a>' +
            '<a class="wds-btn wds-btn--ghost" href="./#today">Open Today</a>' +
          "</p>" +
        "</header>" +
        '<section class="fc-overview-grid">' +
          '<article class="fc-overview-card"><h2>Current season</h2><p class="fc-overview-stat">' + esc(seasonLabel()) + "</p>" +
            "<p>" + esc(plan.season ? ("Planner season: " + plan.season) : "Based on the calendar for your region.") + "</p></article>" +
          '<article class="fc-overview-card"><h2>Property summary</h2>' +
            "<p>" + esc(sum.orchardTreeCount) + " orchard trees · " + esc(String(sum.featureCount)) + " recommendation signals · " + esc(String(sum.photoCount)) + " photos</p>" +
            (sum.labels.length ? "<p class=\"fc-muted\">" + esc(sum.labels.slice(0, 12).join(" · ")) + "</p>" : "") +
          "</article>" +
          '<article class="fc-overview-card"><h2>Weather impacts</h2>' +
            "<p>" + esc(wx.conditionText || (wx.rainSoon ? "Rain in the forecast" : "Using regional signals when available")) + "</p>" +
            (wx.rainInchesHint ? "<p>~" + esc(wx.rainInchesHint) + "\" rain hinted in the near forecast.</p>" : "") +
          "</article>" +
          '<article class="fc-overview-card"><h2>Goals</h2><p>' +
            esc((sum.goals || intent.priorities || []).join(" · ") || "None set") +
          "</p></article>" +
        "</section>" +
        '<section class="fc-land-section"><h2>Today’s priorities</h2><ol class="fc-today__list">' + priorities + "</ol></section>" +
        '<section class="fc-land-section"><h2>Upcoming harvests</h2><ul>' + harvestHints.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="fc-land-section"><h2>Risk alerts</h2><ul>' + risks.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="fc-land-section"><h2>Opportunities</h2><ul>' + opportunities.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="fc-land-section"><h2>Recent observations</h2>' +
          '<p class="fc-muted">Field notes stay with you. Use <a href="../fieldry/">Fieldry</a> for private life-list observations, or add property photos below.</p>' +
          '<div class="fc-photo-grid">' + photoHtml + "</div>" +
        "</section>" +
        '<p class="fc-land-note" role="note">' + esc(catalog.privacyNote) +
          (configured ? "" : " Setup is incomplete — recommendations will stay general until you add features.") +
        "</p>";

      mount.removeAttribute("aria-busy");
      (property.photos || []).slice(0, 6).forEach(function (p) {
        ForageCastProfile.photoObjectUrl(p.id).then(function (url) {
          var slot = mount.querySelector('[data-photo-slot="' + p.id + '"]');
          if (slot && url) slot.style.backgroundImage = 'url("' + url + '")';
        });
      });
    }).catch(function () {
      mount.innerHTML = '<p class="wds-body" role="alert">Could not load the property overview.</p>';
    });
  }

  global.ForageCastPropertyOverview = { mount: mountOverview };

  if (document.getElementById("fc-property-mount") && !document.getElementById("fc-wizard-mount")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountOverview);
    else mountOverview();
  }
})(typeof window !== "undefined" ? window : globalThis);
