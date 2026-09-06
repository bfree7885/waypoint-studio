/**
 * Target Scope rail panel.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderScopePanel = function (el, scope) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!scope || !Models.isScopeComplete(scope)) {
      el.innerHTML =
        '<div class="hb-empty-block">' +
        "<p>No complete Target Scope. A workspace cannot become active until scope is recorded.</p>" +
        "</div>";
      return;
    }
    var allowed = (scope.allowedTargets || [])
      .map(function (item) {
        return "<li><code>" + Models.escapeHtml(item) + "</code></li>";
      })
      .join("");
    el.innerHTML =
      '<dl class="hb-dl">' +
      "<dt>Target</dt><dd>" +
      Models.escapeHtml(scope.targetName) +
      "</dd>" +
      "<dt>Type</dt><dd>" +
      Models.escapeHtml(scope.targetType) +
      "</dd>" +
      "<dt>Authorization</dt><dd>" +
      Models.escapeHtml(scope.authorizationType) +
      "</dd>" +
      "<dt>Allowed</dt><dd><ul class=\"hb-plain\">" +
      allowed +
      "</ul></dd>" +
      (scope.boundaries
        ? "<dt>Boundaries</dt><dd>" + Models.escapeHtml(scope.boundaries) + "</dd>"
        : "") +
      (scope.notes ? "<dt>Notes</dt><dd>" + Models.escapeHtml(scope.notes) + "</dd>" : "") +
      "</dl>";
  };
})(window);
