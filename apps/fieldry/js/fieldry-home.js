/**
 * Fieldry home — identity, capture CTA, recent, life-list, achievements.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };
  var ONBOARD_KEY = "waypoint-fieldry-onboarded-v1";

  function hasOnboarded() {
    try {
      return global.localStorage && global.localStorage.getItem(ONBOARD_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markOnboarded() {
    try {
      if (global.localStorage) global.localStorage.setItem(ONBOARD_KEY, "1");
    } catch (e) { /* noop */ }
  }

  function onboardingPanel() {
    if (hasOnboarded()) return "";
    return (
      '<section class="fld-onboard" aria-labelledby="fld-onboard-title">' +
        '<h2 id="fld-onboard-title">How Fieldry works</h2>' +
        '<ol class="fld-onboard__steps">' +
          "<li><strong>Record</strong> what you encounter — species optional.</li>" +
          "<li><strong>Build</strong> a private life list over time.</li>" +
          "<li><strong>Revisit</strong> history, stats, and favorites whenever you like.</li>" +
        "</ol>" +
        '<p class="fld-hint">Everything stays on this device. No accounts. No rankings.</p>' +
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="fld-onboard-dismiss">Got it</button>' +
      "</section>"
    );
  }

  function emptyHome() {
    return (
      '<section class="fld-home-empty" aria-labelledby="fld-empty-title">' +
        '<h2 id="fld-empty-title">Begin your life list</h2>' +
        "<p>Record birds, mushrooms, trees, rocks, weather, and more. Unidentified encounters are welcome — you can name them later.</p>" +
        '<a class="wds-btn wds-btn--primary" href="#/new">Record your first observation</a>' +
      "</section>"
    );
  }

  function recentBlock(list) {
    if (!list.length) return "";
    var items = list.slice(0, 5).map(function (obs) {
      var cat = Life().categoryLabel(Life().getCategory(obs));
      return (
        '<li class="fld-home-recent__item">' +
          '<a href="#/obs/' + encodeURIComponent(obs.id) + '">' +
            '<span class="fld-home-recent__title">' + U().escapeHtml(U().displayTitle(obs)) + "</span>" +
            '<span class="fld-home-recent__meta">' +
              U().escapeHtml(U().formatDate(obs.observedAt && obs.observedAt.date)) +
              " · " + U().escapeHtml(cat) +
            "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-recent-title">' +
        '<header class="fld-home-section__head">' +
          '<h2 id="fld-recent-title">Recent observations</h2>' +
          '<a href="#/history">View history</a>' +
        "</header>" +
        '<ul class="fld-home-recent">' + items + "</ul>" +
      "</section>"
    );
  }

  function lifeProgress(summary, uniqueCount) {
    var cats = summary.byCategory.filter(function (c) { return c.count > 0 && c.id !== "other"; }).slice(0, 8);
    var chips = cats.map(function (c) {
      return (
        '<li><a class="fld-cat-chip" href="#/life?category=' + encodeURIComponent(c.id) + '">' +
          U().escapeHtml(c.label) + " · " + c.count +
        "</a></li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-life-title">' +
        '<header class="fld-home-section__head">' +
          '<h2 id="fld-life-title">Life list</h2>' +
          '<a href="#/life">Open life list</a>' +
        "</header>" +
        '<p class="fld-home-lead">' +
          uniqueCount + " unique subject" + (uniqueCount === 1 ? "" : "s") +
          " · " + summary.categoriesExplored + " categor" + (summary.categoriesExplored === 1 ? "y" : "ies") + " explored" +
        "</p>" +
        (chips ? '<ul class="fld-cat-chips">' + chips + "</ul>" : "") +
      "</section>"
    );
  }

  function seasonalBlock(life) {
    var recent = life.slice(0, 4);
    if (!recent.length) return "";
    var items = recent.map(function (e) {
      return (
        "<li>" +
          '<a href="#/history?subject=' + encodeURIComponent(e.key) + '">' +
            U().escapeHtml(e.commonName || e.label) +
            "<span>" + U().escapeHtml(Life().categoryLabel(e.category)) +
            (e.firstObserved === e.lastObserved ? " · first recorded " : " · revisited ") +
            U().escapeHtml(U().formatDate(e.lastObserved)) +
            "</span></a>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-discover-title">' +
        '<h2 id="fld-discover-title">Recent discoveries</h2>' +
        '<ul class="fld-home-discover">' + items + "</ul>" +
      "</section>"
    );
  }

  function achievementsBlock(earned, totalObs) {
    if (!totalObs) return "";
    if (!earned.length) {
      return (
        '<section class="fld-home-section" aria-labelledby="fld-ach-title">' +
          '<h2 id="fld-ach-title">Milestones</h2>' +
          '<p class="fld-home-lead">Gentle milestones appear as you explore — never as competition.</p>' +
          '<a href="#/stats">View statistics</a>' +
        "</section>"
      );
    }
    var items = earned.slice(0, 4).map(function (a) {
      return (
        '<li class="fld-ach-chip">' +
          "<strong>" + U().escapeHtml(a.title) + "</strong>" +
          "<span>" + U().escapeHtml(a.explanation || a.description) + "</span>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-ach-title">' +
        '<header class="fld-home-section__head">' +
          '<h2 id="fld-ach-title">Milestones</h2>' +
          '<a href="#/stats">All statistics</a>' +
        "</header>" +
        '<ul class="fld-ach-list">' + items + "</ul>" +
      "</section>"
    );
  }

  function render(observations) {
    var list = observations || [];
    var summary = Life().summarizeLifeList(list);
    var life = Life().deriveLifeList(list, { sort: "recent" });
    var earned = global.FieldryAchievements
      ? global.FieldryAchievements.earned(list)
      : [];
    var collectionsTeaser = global.FieldryCollections
      ? global.FieldryCollections.renderHomeTeaser()
      : "";

    return (
      '<section class="fld-home">' +
        '<header class="fld-hero fld-hero--home">' +
          '<p class="wds-eyebrow">Fieldry</p>' +
          '<h1 class="fld-hero__title">Your private life list</h1>' +
          '<p class="fld-hero__lead">' +
            (list.length
              ? "Keep noticing. Record encounters, grow your collection, and revisit what you have seen — at your own pace."
              : "A calm place to record what you encounter outdoors. Build a private collection of birds, mushrooms, trees, rocks, and more.") +
          "</p>" +
          '<div class="fld-hero__actions">' +
            '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
            (list.length
              ? '<a class="wds-btn wds-btn--ghost" href="#/life">Life list</a>' +
                '<a class="wds-btn wds-btn--ghost" href="#/history">History</a>'
              : '<a class="wds-btn wds-btn--ghost" href="#/browse">Browse categories</a>') +
          "</div>" +
        "</header>" +
        (list.length ? "" : onboardingPanel()) +
        (list.length ? "" : emptyHome()) +
        (list.length ? lifeProgress(summary, life.length) : "") +
        recentBlock(list) +
        seasonalBlock(life) +
        (list.length ? collectionsTeaser : "") +
        achievementsBlock(earned, list.length) +
        (global.WDS && WDS.platformWorkflows
          ? WDS.platformWorkflows.renderLinksHtml("fieldry", { depth: 1, when: "after-save" })
          : "") +
        '<nav class="fld-home-nav" aria-label="Fieldry sections">' +
          '<a href="#/browse">Categories</a>' +
          '<a href="#/stats">Statistics</a>' +
          '<a href="#/collections">Collections</a>' +
          '<a href="../../settings.html">Studio settings</a>' +
          '<a href="#/history">History</a>' +
        "</nav>" +
      "</section>"
    );
  }

  function bind(mount) {
    var btn = mount && mount.querySelector("#fld-onboard-dismiss");
    if (!btn) return;
    btn.addEventListener("click", function () {
      markOnboarded();
      var panel = mount.querySelector(".fld-onboard");
      if (panel) panel.remove();
    });
  }

  global.FieldryHome = { render: render, bind: bind };
})(typeof window !== "undefined" ? window : global);
