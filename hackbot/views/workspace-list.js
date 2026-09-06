/**
 * Sidebar workspace list.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderWorkspaceList = function (el, workspaces, activeId, onSelect) {
    var Models = Hackbot.Models;
    if (!el) return;
    if (!workspaces || !workspaces.length) {
      el.innerHTML = '<p class="hb-muted hb-small">No workspaces yet.</p>';
      return;
    }
    el.innerHTML = workspaces
      .map(function (ws) {
        var active = ws.id === activeId;
        return (
          '<button type="button" class="hb-ws-item' +
          (active ? " is-active" : "") +
          '" data-id="' +
          Models.escapeHtml(ws.id) +
          '"' +
          (active ? ' aria-current="page"' : "") +
          ">" +
          '<span class="hb-ws-name">' +
          Models.escapeHtml(ws.name) +
          "</span>" +
          '<span class="hb-ws-meta">' +
          Models.escapeHtml(Models.assistanceLabel(ws.assistanceLevel)) +
          (ws.learningMode ? " · Learn" : "") +
          "</span>" +
          "</button>"
        );
      })
      .join("");
    el.querySelectorAll("[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof onSelect === "function") onSelect(btn.getAttribute("data-id"));
      });
    });
  };
})(window);
