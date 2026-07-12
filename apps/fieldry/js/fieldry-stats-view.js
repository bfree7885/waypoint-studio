/**
 * Fieldry statistics + achievements view
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function render(observations) {
    var stats = global.FieldryStats.derive(observations);
    var achievements = global.FieldryAchievements.evaluateAll(observations);

    var catRows = stats.byCategory.map(function (c) {
      return "<tr><th scope=\"row\">" + U().escapeHtml(c.label) + "</th><td>" + c.count + "</td></tr>";
    }).join("") || "<tr><td colspan=\"2\">No categories yet</td></tr>";

    var monthRows = stats.byMonth.slice(-12).map(function (m) {
      return "<tr><th scope=\"row\">" + U().escapeHtml(m.month) + "</th><td>" + m.count + "</td></tr>";
    }).join("") || "<tr><td colspan=\"2\">No monthly history yet</td></tr>";

    var achItems = achievements.map(function (a) {
      return (
        '<li class="fld-ach-item' + (a.earned ? " fld-ach-item--earned" : "") + '">' +
          '<h3>' + U().escapeHtml(a.title) + "</h3>" +
          '<p>' + U().escapeHtml(a.description) + "</p>" +
          (a.earned
            ? '<p class="fld-ach-item__why">' + U().escapeHtml(a.explanation) + "</p>"
            : '<p class="fld-ach-item__pending">Not yet earned — keep exploring.</p>') +
        "</li>"
      );
    }).join("");

    return (
      '<section class="fld-stats-view" aria-labelledby="fld-stats-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 id="fld-stats-title">Personal statistics</h1>' +
          '<p class="fld-view-lead">A private reflection of what you have recorded. More observations do not make someone a better naturalist — they only mean more encounters noticed.</p>' +
        "</header>" +
        '<div class="fld-stats">' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.totalObservations + '</p><p class="fld-stat__label">Observations</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.uniqueSubjects + '</p><p class="fld-stat__label">Unique subjects</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.categoriesExplored + '</p><p class="fld-stat__label">Categories explored</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.firstDiscoveries + '</p><p class="fld-stat__label">First discoveries</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.repeatObservations + '</p><p class="fld-stat__label">Revisits</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.identified + " / " + stats.unidentified + '</p><p class="fld-stat__label">Identified / unidentified</p></div>' +
          '<div class="fld-stat"><p class="fld-stat__value">' + stats.privateRecords + '</p><p class="fld-stat__label">Private records</p></div>' +
        "</div>" +
        '<div class="fld-stats-tables">' +
          '<section aria-labelledby="fld-by-cat"><h2 id="fld-by-cat">By category</h2>' +
            '<table class="fld-table"><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>' + catRows + "</tbody></table></section>" +
          '<section aria-labelledby="fld-by-month"><h2 id="fld-by-month">By month</h2>' +
            '<table class="fld-table"><thead><tr><th>Month</th><th>Count</th></tr></thead><tbody>' + monthRows + "</tbody></table></section>" +
        "</div>" +
        '<section class="fld-ach-panel" aria-labelledby="fld-ach-panel-title">' +
          '<h2 id="fld-ach-panel-title">Achievements</h2>' +
          '<p class="fld-view-lead">Discovery milestones with stable identifiers. No rankings, scarcity timers, or public comparison.</p>' +
          '<ul class="fld-ach-grid">' + achItems + "</ul>" +
        "</section>" +
      "</section>"
    );
  }

  global.FieldryStatsView = { render: render };
})(typeof window !== "undefined" ? window : global);
