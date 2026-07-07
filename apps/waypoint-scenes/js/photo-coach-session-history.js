/**
 * Photo Coach session history — browse saved coached sessions.
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

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  function renderList(onSelect, onDelete) {
    var P = global.WaypointPhotoCoachPortfolio;
    if (!P) return '<p class="muted">Portfolio unavailable.</p>';
    var sessions = P.listSessions();
    if (!sessions.length) {
      return '<p class="coach-history-empty muted">No session history yet. Save a critique to build your coached portfolio.</p>';
    }
    return (
      '<ul class="coach-history-list">' +
        sessions.map(function (s) {
          var score = s.critique && s.critique.overallScore != null
            ? s.critique.overallScore + "/100"
            : "—";
          return (
            '<li class="coach-history-item" data-session-id="' + escapeHtml(s.id) + '">' +
              '<button type="button" class="coach-history-open" data-session-id="' + escapeHtml(s.id) + '">' +
                '<span class="coach-history-name">' + escapeHtml(s.imageName || "Photo") + "</span>" +
                '<span class="coach-history-meta">' + escapeHtml(score) + " · " + escapeHtml(formatDate(s.savedAt)) + "</span>" +
              "</button>" +
              '<button type="button" class="coach-history-delete" data-session-id="' + escapeHtml(s.id) + '" aria-label="Delete session">×</button>' +
            "</li>"
          );
        }).join("") +
      "</ul>"
    );
  }

  function bind(mount, callbacks) {
    if (!mount) return;
    callbacks = callbacks || {};
    mount.querySelectorAll(".coach-history-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-session-id");
        var P = global.WaypointPhotoCoachPortfolio;
        var session = P && P.getSession ? P.getSession(id) : null;
        if (session && callbacks.onSelect) callbacks.onSelect(session);
      });
    });
    mount.querySelectorAll(".coach-history-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-session-id");
        var P = global.WaypointPhotoCoachPortfolio;
        if (P && P.deleteSession) P.deleteSession(id);
        if (callbacks.onDelete) callbacks.onDelete(id);
        mount.innerHTML = '<div class="coach-history"><h3 class="coach-history__title">Session history</h3>' +
          renderList(callbacks.onSelect, callbacks.onDelete) + "</div>";
        bind(mount, callbacks);
      });
    });
  }

  function mount(el, callbacks) {
    if (!el) return;
    el.innerHTML = '<div class="coach-history"><h3 class="coach-history__title">Session history</h3>' +
      renderList() + "</div>";
    bind(el, callbacks);
  }

  function refresh(el, callbacks) {
    mount(el, callbacks);
  }

  global.WaypointPhotoCoachHistory = {
    mount: mount,
    refresh: refresh,
    renderList: renderList
  };
})(window);
