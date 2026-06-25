/**
 * Fieldry — ledger summary (curiosity, not streaks)
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function renderStat(label, value, note) {
  return (
      '<div class="fld-stat">' +
        '<p class="fld-stat__value">' + U().escapeHtml(String(value)) + "</p>" +
        '<p class="fld-stat__label">' + U().escapeHtml(label) + "</p>" +
        (note ? '<p class="fld-stat__note">' + U().escapeHtml(note) + "</p>" : "") +
      "</div>"
    );
  }

  function render(stats) {
    stats = stats || { total: 0, speciesCount: 0, habitatCount: 0, countyCount: 0 };
    return (
      '<section class="fld-dashboard" aria-labelledby="fld-dash-title">' +
        '<header class="fld-dashboard__head">' +
          '<p class="wds-eyebrow">Your field ledger</p>' +
          '<h2 class="fld-dashboard__title" id="fld-dash-title">Observation summary</h2>' +
          '<p class="fld-dashboard__lead">A private record of what you noticed outdoors — stored only on this device.</p>' +
        "</header>" +
        '<div class="fld-stats">' +
          renderStat("Observations recorded", stats.total, stats.total ? "Your growing field archive" : "Start with one careful record") +
          renderStat("Species observed", stats.speciesCount, "Distinct names in your ledger") +
          renderStat("Habitats visited", stats.habitatCount, "Places you described") +
          renderStat("Counties explored", stats.countyCount, "Regional breadth") +
        "</div>" +
        '<p class="fld-dashboard__note">No streaks, scores, or social metrics — curiosity is the reward.</p>' +
      "</section>"
    );
  }

  global.FieldryDashboard = { render: render };
})(window);
