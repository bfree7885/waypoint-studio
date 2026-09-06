/**
 * Evidence rail.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderEvidencePanel = function (el, items) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!items || !items.length) {
      el.innerHTML = '<p class="hb-muted hb-small">No evidence recorded yet.</p>';
      return;
    }
    el.innerHTML =
      "<ul class=\"hb-rail-list\">" +
      items
        .map(function (item) {
          return (
            "<li><strong>" +
            Models.escapeHtml(item.title || "Evidence") +
            "</strong>" +
            '<span class="hb-muted"> · ' +
            Models.escapeHtml(item.type || "note") +
            "</span></li>"
          );
        })
        .join("") +
      "</ul>";
  };
})(window);
