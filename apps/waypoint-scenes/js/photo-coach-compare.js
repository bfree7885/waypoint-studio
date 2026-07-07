/**
 * Photo Coach — compare two saved sessions side by side.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function gradeOf(session) {
    if (!session) return "—";
    if (session.grade) return session.grade;
    if (session.critique && session.critique.overallGrade) return session.critique.overallGrade.letter;
    return "—";
  }

  function scoreOf(session) {
    if (!session) return "—";
    if (session.score != null) return session.score;
    if (session.critique && session.critique.overallGrade) return session.critique.overallGrade.score;
    return "—";
  }

  function renderCompare(a, b) {
    return (
      '<div class="coach-compare" role="dialog" aria-labelledby="coach-compare-title">' +
        '<div class="coach-compare__head">' +
          '<h3 id="coach-compare-title">Compare sessions</h3>' +
          '<button type="button" class="coach-compare__close" aria-label="Close compare">×</button>' +
        "</div>" +
        '<div class="coach-compare__grid">' +
          renderCol(a, "A") +
          renderCol(b, "B") +
        "</div>" +
      "</div>"
    );
  }

  function renderCol(session, label) {
    if (!session) {
      return '<div class="coach-compare__col"><p class="coach-muted">Select another session to compare.</p></div>';
    }
    var c = session.critique || {};
  return (
      '<div class="coach-compare__col">' +
        (session.thumbnail ? '<img class="coach-compare__thumb" src="' + escapeHtml(session.thumbnail) + '" alt="">' : "") +
        "<h4>" + escapeHtml(session.imageName || "Photo " + label) + "</h4>" +
        '<p class="coach-compare__grade">' + escapeHtml(gradeOf(session)) + " · " + escapeHtml(String(scoreOf(session))) + "/100</p>" +
        '<p class="coach-muted">' + escapeHtml(c.narrativeSummary || (c.overallGrade && c.overallGrade.summary) || "") + "</p>" +
      "</div>"
    );
  }

  function mount(container, sessionA, sessionB) {
    if (!container) return;
    container.innerHTML = renderCompare(sessionA, sessionB);
    container.hidden = false;
    var close = container.querySelector(".coach-compare__close");
    if (close) {
      close.onclick = function () {
        container.innerHTML = "";
        container.hidden = true;
      };
    }
  }

  global.WaypointPhotoCoachCompare = {
    mount: mount,
    renderCompare: renderCompare
  };
})(window);
