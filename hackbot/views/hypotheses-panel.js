/**
 * Hypotheses rail.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderHypothesesPanel = function (el, items) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!items || !items.length) {
      el.innerHTML = '<p class="hb-muted hb-small">No hypotheses yet. Form one after you observe something in scope.</p>';
      return;
    }
    el.innerHTML =
      "<ul class=\"hb-rail-list\">" +
      items
        .map(function (item) {
          return (
            "<li><span class=\"hb-pill\">" +
            Models.escapeHtml(item.status || "open") +
            "</span> " +
            Models.escapeHtml(item.statement) +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  };
})(window);
