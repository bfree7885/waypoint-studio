/**
 * Mentor / conversation center pane.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderConversation = function (el, state, handlers) {
    var Models = Hackbot.Models;
    handlers = handlers || {};
    if (!el) return;
    var ws = state.workspace;
    var messages = state.messages || [];
    var body;
    if (!messages.length) {
      body =
        '<div class="hb-empty-convo">' +
        '<p class="hb-loop">Observe → Understand → Hypothesize → Test → Record → Learn</p>' +
        "<p>No mentor conversation yet. Learning Mode asks you to reason from observation instead of receiving finished answers.</p>" +
        "<p class=\"hb-muted\">Stay inside the recorded Target Scope. This placeholder mentor does not scan, exploit, or run commands.</p>" +
        "</div>";
    } else {
      body =
        '<ol class="hb-thread">' +
        messages
          .map(function (msg) {
            return (
              '<li class="hb-msg hb-msg-' +
              Models.escapeHtml(msg.role) +
              '">' +
              '<p class="hb-msg-role">' +
              Models.escapeHtml(msg.role === "user" ? "You" : "Hackbot") +
              "</p>" +
              "<p>" +
              Models.escapeHtml(msg.content) +
              "</p>" +
              "</li>"
            );
          })
          .join("") +
        "</ol>";
    }

    el.innerHTML =
      body +
      '<form class="hb-compose" id="hb-compose">' +
      '<label class="hb-sr" for="hb-compose-input">Message</label>' +
      '<textarea id="hb-compose-input" name="content" rows="3" maxlength="4000" ' +
      (ws ? "" : "disabled ") +
      'placeholder="What did you notice, and why might it matter?"></textarea>' +
      '<div class="hb-compose-row">' +
      '<p class="hb-muted hb-small">MockProvider only. No external AI.</p>' +
      '<button type="submit" class="hb-btn"' +
      (ws ? "" : " disabled") +
      ">Send</button>" +
      "</div>" +
      "</form>";

    var form = el.querySelector("#hb-compose");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = el.querySelector("#hb-compose-input");
        var text = input ? input.value : "";
        if (typeof handlers.onSend === "function") handlers.onSend(text);
      });
    }
  };
})(window);
