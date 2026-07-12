/**
 * Fieldry home — identity, capture CTA, recent, life-list, achievements.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function emptyHome() {
    return (
      '<section class="fld-home-empty" aria-labelledby="fld-empty-title">' +
        '<h2 id="fld-empty-title">Begin your life list</h2>' +
        '<p>Fieldry is a calm place to record what you encounter outdoors — birds, mushrooms, rocks, weather, and more. No rankings. No competition. Just your observations.</p>' +
        '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
        '<p class="fld-hint">Unidentified encounters are welcome. You can identify them later.</p>' +
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
      return '<li><span class="fld-cat-chip">' + U().escapeHtml(c.label) + " · " + c.count + "</span></li>";
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
        '<li>' +
          '<a href="#/life?subject=' + encodeURIComponent(e.key) + '">' +
            U().escapeHtml(e.commonName || e.label) +
            '<span>' + U().escapeHtml(Life().categoryLabel(e.category)) +
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

  function achievementsBlock(earned) {
    if (!earned.length) {
      return (
        '<section class="fld-home-section" aria-labelledby="fld-ach-title">' +
          '<h2 id="fld-ach-title">Discoveries</h2>' +
          '<p class="fld-home-lead">Gentle milestones appear as you explore — never as competition.</p>' +
          '<a href="#/stats">View statistics</a>' +
        "</section>"
      );
    }
    var items = earned.slice(0, 4).map(function (a) {
      return (
        '<li class="fld-ach-chip">' +
          '<strong>' + U().escapeHtml(a.title) + "</strong>" +
          '<span>' + U().escapeHtml(a.explanation || a.description) + "</span>" +
        "</li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-ach-title">' +
        '<header class="fld-home-section__head">' +
          '<h2 id="fld-ach-title">Gentle achievements</h2>' +
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

    return (
      '<section class="fld-home">' +
        '<header class="fld-hero fld-hero--home">' +
          '<p class="wds-eyebrow">Fieldry</p>' +
          '<h1 class="fld-hero__title">Your life list</h1>' +
          '<p class="fld-hero__lead">Record what you encounter outdoors. Build a private collection of birds, mushrooms, trees, rocks, and more — at your own pace.</p>' +
          '<div class="fld-hero__actions">' +
            '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
            '<a class="wds-btn wds-btn--ghost" href="#/life">Life list</a>' +
            '<a class="wds-btn wds-btn--ghost" href="#/history">History</a>' +
          "</div>" +
        "</header>" +
        (list.length ? "" : emptyHome()) +
        (list.length ? lifeProgress(summary, life.length) : "") +
        recentBlock(list) +
        seasonalBlock(life) +
        achievementsBlock(earned) +
        '<nav class="fld-home-nav" aria-label="Fieldry sections">' +
          '<a href="#/browse">Browse categories</a>' +
          '<a href="#/stats">Personal statistics</a>' +
          '<a href="#/history">Observation history</a>' +
        "</nav>" +
      "</section>"
    );
  }

  global.FieldryHome = { render: render };
})(typeof window !== "undefined" ? window : global);
