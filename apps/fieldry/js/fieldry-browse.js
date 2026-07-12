/**
 * Fieldry category browse — future-proof category grid.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };
  var Life = function () { return global.WaypointFieldryLifeList; };

  function render(observations) {
    var summary = Life().summarizeLifeList(observations);
    var cards = summary.byCategory.map(function (c) {
      return (
        '<a class="fld-browse-card" href="#/life?category=' + encodeURIComponent(c.id) + '">' +
          '<h2>' + U().escapeHtml(c.label) + "</h2>" +
          '<p>' + c.count + " observation" + (c.count === 1 ? "" : "s") + "</p>" +
          '<span>Open life list</span>' +
        "</a>"
      );
    }).join("");

    return (
      '<section class="fld-browse" aria-labelledby="fld-browse-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 id="fld-browse-title">Browse categories</h1>' +
          '<p class="fld-view-lead">Explore your records by life-list category. New categories can be added without restructuring Fieldry.</p>' +
        "</header>" +
        '<div class="fld-browse-grid">' + cards + "</div>" +
        '<p class="fld-hint"><a href="#/new">Record an observation</a> in any category — including unidentified subjects.</p>' +
      "</section>"
    );
  }

  global.FieldryBrowse = { render: render };
})(typeof window !== "undefined" ? window : global);
