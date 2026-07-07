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

  function gradeLabel(session) {
    if (session.grade) return session.grade;
    if (session.critique && session.critique.overallGrade) return session.critique.overallGrade.letter;
    if (session.critique && session.critique.overallScore != null) return session.critique.overallScore + "/100";
    return "—";
  }

  function sessionMeta(s) {
    var parts = [gradeLabel(s)];
    if (s.camera) parts.push(s.camera);
    if (s.location) parts.push(s.location);
    parts.push(formatDate(s.savedAt));
    return parts.join(" · ");
  }

  function renderList() {
    var P = global.WaypointPhotoCoachPortfolio;
    if (!P) return '<p class="coach-muted">Portfolio unavailable.</p>';
    var sessions = P.listSessions();
    if (!sessions.length) {
      return '<p class="coach-history-empty coach-muted">No sessions yet — upload a photo to start.</p>';
    }
    return (
      '<ul class="coach-history-list">' +
        sessions.map(function (s) {
          var thumb = s.thumbnail
            ? '<img class="coach-history-thumb" src="' + escapeHtml(s.thumbnail) + '" alt="">'
            : "";
          return (
            '<li class="coach-history-item' + (s.favorite ? " coach-history-item--fav" : "") + '" data-session-id="' + escapeHtml(s.id) + '">' +
              thumb +
              '<button type="button" class="coach-history-fav' + (s.favorite ? " is-fav" : "") + '" data-session-id="' + escapeHtml(s.id) + '" aria-label="' + (s.favorite ? "Remove favorite" : "Favorite session") + '">★</button>' +
              '<button type="button" class="coach-history-open" data-session-id="' + escapeHtml(s.id) + '">' +
                '<span class="coach-history-name">' + escapeHtml(s.imageName || "Photo") + "</span>" +
                '<span class="coach-history-meta">' + escapeHtml(sessionMeta(s)) + "</span>" +
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
    mount.querySelectorAll(".coach-history-fav").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-session-id");
        var P = global.WaypointPhotoCoachPortfolio;
        if (P && P.toggleFavorite) P.toggleFavorite(id);
        mount.innerHTML = '<div class="coach-card"><h3 class="coach-history__title">Recent sessions</h3>' +
          '<p class="coach-muted coach-history-hint">Click a session to open · click another to compare · ★ to favorite</p>' +
          renderList() + "</div>";
        bind(mount, callbacks);
      });
    });
    mount.querySelectorAll(".coach-history-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-session-id");
        var P = global.WaypointPhotoCoachPortfolio;
        if (P && P.deleteSession) P.deleteSession(id);
        if (callbacks.onDelete) callbacks.onDelete(id);
        mount.innerHTML = '<div class="coach-card"><h3 class="coach-history__title">Recent sessions</h3>' +
          '<p class="coach-muted coach-history-hint">Click a session to open · click another to compare · ★ to favorite</p>' +
          renderList() + "</div>";
        bind(mount, callbacks);
      });
    });
  }

  function mount(el, callbacks) {
    if (!el) return;
    el.innerHTML =
      '<div class="coach-card"><h3 class="coach-history__title">Recent sessions</h3>' +
        '<p class="coach-muted coach-history-hint">Click a session to open · click another to compare · ★ to favorite</p>' +
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
