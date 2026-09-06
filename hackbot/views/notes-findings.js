/**
 * Notes / findings placeholder surfaces.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  function emptyList(el, message) {
    el.innerHTML = '<p class="hb-muted hb-small">' + Hackbot.Models.escapeHtml(message) + "</p>";
  }

  Views.renderNotesRail = function (el, notes) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!notes || !notes.length) {
      emptyList(el, "No learning notes yet.");
      return;
    }
    el.innerHTML =
      "<ul class=\"hb-rail-list\">" +
      notes
        .map(function (note) {
          return (
            "<li><strong>" +
            Models.escapeHtml(note.concept || "Note") +
            "</strong>" +
            (note.explanation ? "<div>" + Models.escapeHtml(note.explanation) + "</div>" : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  };

  Views.renderActionsRail = function (el, actions) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!actions || !actions.length) {
      el.innerHTML =
        '<p class="hb-muted hb-small">No actions yet. Terminal execution is not enabled, so nothing is run from this panel.</p>';
      return;
    }
    el.innerHTML =
      "<ul class=\"hb-rail-list\">" +
      actions
        .map(function (item) {
          return "<li>" + Models.escapeHtml(item.description || item.command || "Action") + "</li>";
        })
        .join("") +
      "</ul>";
  };

  Views.renderNotesPage = function (el, notes) {
    var Models = Hackbot.Models;
    if (!el) return;
    var body =
      !notes || !notes.length
        ? "<p>No learning notes stored in this workspace yet.</p>"
        : "<ul class=\"hb-page-list\">" +
          notes
            .map(function (note) {
              return (
                "<li><h3>" +
                Models.escapeHtml(note.concept || "Learning note") +
                "</h3><p>" +
                Models.escapeHtml(note.explanation || "") +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>";
    el.innerHTML =
      '<div class="hb-placeholder-page"><h2>Notes</h2>' +
      body +
      "<p class=\"hb-muted\">This list is local to the workspace. Training Engine notes are not built yet.</p></div>";
  };

  Views.renderFindingsPage = function (el, findings) {
    var Models = Hackbot.Models;
    if (!el) return;
    var body =
      !findings || !findings.length
        ? "<p>No findings recorded. Findings will be for authorized, documented observations — not automated exploits.</p>"
        : "<ul class=\"hb-page-list\">" +
          findings
            .map(function (item) {
              return (
                "<li><h3>" +
                Models.escapeHtml(item.title || "Finding") +
                "</h3><p>" +
                Models.escapeHtml(item.description || "") +
                "</p></li>"
              );
            })
            .join("") +
          "</ul>";
    el.innerHTML =
      '<div class="hb-placeholder-page"><h2>Findings</h2>' +
      body +
      "</div>";
  };

  Views.renderTrainingPlaceholder = function (el) {
    if (!el) return;
    el.innerHTML =
      '<div class="hb-placeholder-page">' +
      "<h2>Training</h2>" +
      "<p>The Training Engine is not built yet. This is a placeholder so the workbench shell is complete.</p>" +
      "<p class=\"hb-loop\">Teach me → Guide me → Work with me → Assist my research</p>" +
      "</div>";
  };
})(window);
