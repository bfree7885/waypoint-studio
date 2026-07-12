/**
 * Fieldry category browse
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function render(observations) {
    var list = observations || [];
    var summary = Life().summarizeLifeList(list);
    var cats = summary.byCategory.slice().sort(function (a, b) {
      return b.count - a.count || a.label.localeCompare(b.label);
    });
    var explored = cats.filter(function (c) { return c.count > 0; });
    var unused = cats.filter(function (c) { return c.count === 0; });

    if (!list.length) {
      return (
        '<section class="fld-browse" aria-labelledby="fld-browse-title">' +
          '<header class="fld-view-head">' +
            '<a class="fld-form__back" href="#/">← Home</a>' +
            '<h1 id="fld-browse-title">Browse categories</h1>' +
            '<p class="fld-view-lead">Categories organize your life list — birds, fungi, trees, weather, and more.</p>' +
          "</header>" +
          '<div class="fld-empty">' +
            '<p class="fld-empty__title">Choose your first category outdoors</p>' +
            '<p class="fld-empty__text">Record an observation to begin exploring categories. Unidentified subjects are welcome.</p>' +
            '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
          "</div>" +
        "</section>"
      );
    }

    function card(c) {
      return (
        '<a class="fld-browse-card' + (c.count ? "" : " fld-browse-card--empty") +
          '" href="#/life?category=' + encodeURIComponent(c.id) + '">' +
          "<h2>" + U().escapeHtml(c.label) + "</h2>" +
          "<p>" + c.count + " observation" + (c.count === 1 ? "" : "s") + "</p>" +
          "<span>" + (c.count ? "Open life list" : "Not recorded yet") + "</span>" +
        "</a>"
      );
    }

    return (
      '<section class="fld-browse" aria-labelledby="fld-browse-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 id="fld-browse-title">Browse categories</h1>' +
          '<p class="fld-view-lead">Explore your records by life-list category.</p>' +
          '<a class="wds-btn wds-btn--primary" href="#/new">Record an observation</a>' +
        "</header>" +
        (explored.length
          ? '<h2 class="fld-browse-sub">Your categories</h2><div class="fld-browse-grid">' +
            explored.map(card).join("") + "</div>"
          : "") +
        (unused.length
          ? '<details class="fld-browse-more"><summary>All categories (' + unused.length + " not yet used)</summary>" +
            '<div class="fld-browse-grid">' + unused.map(card).join("") + "</div></details>"
          : "") +
      "</section>"
    );
  }

  global.FieldryBrowse = { render: render };
})(typeof window !== "undefined" ? window : global);
