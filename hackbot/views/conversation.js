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
    var assist = ws && ws.assistanceLevel != null ? Number(ws.assistanceLevel) : 5;
    var trainingCta = "";

    if (ws) {
      var catalog = (state.training && state.training.catalog) || [];
      var inProgress = null;
      var completedCount = 0;
      catalog.forEach(function (row) {
        if (row.status === "in_progress" && !inProgress) inProgress = row;
        if (row.status === "completed") completedCount += 1;
      });
      var ctaLabel = inProgress || completedCount > 0 ? "Continue Training" : "Start Training";
      var ctaHint = inProgress
        ? "Resume your Module 1 lesson. Assistance is currently " +
          Models.assistanceLabel(assist) +
          "."
        : "Begin Module 1 — Web Investigation Foundations. You do not need the Workbench panels yet.";
      trainingCta =
        '<div class="hb-train-entry">' +
        "<h3>Training comes first</h3>" +
        "<p>" +
        Models.escapeHtml(ctaHint) +
        "</p>" +
        '<button type="button" class="hb-btn hb-btn-train-entry" id="hb-continue-training">' +
        Models.escapeHtml(ctaLabel) +
        "</button>" +
        '<p class="hb-muted hb-small">Workbench (hypotheses, evidence, terminal) is available later for independent investigation. It is not required to start learning.</p>' +
        "</div>";
    }

    if (!messages.length) {
      body =
        '<div class="hb-empty-convo">' +
        trainingCta +
        '<p class="hb-loop">Teach → Demonstrate → Guided try → Independent try → Reason → Reflect</p>' +
        "<p>No mentor conversation yet. Use <strong>Start Training</strong> / <strong>Continue Training</strong> for the curriculum. Learning Mode asks you to reason from observation — after Hackbot has taught enough to reason.</p>" +
        "<p class=\"hb-muted\">Stay inside the recorded Target Scope. This placeholder mentor does not scan, exploit, or run commands.</p>" +
        "</div>";
    } else {
      body =
        trainingCta +
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
      'placeholder="Workbench chat is optional. Prefer Training for lessons."></textarea>' +
      '<div class="hb-compose-row">' +
      '<p class="hb-muted hb-small">MockProvider only. No external AI.</p>' +
      '<button type="submit" class="hb-btn"' +
      (ws ? "" : " disabled") +
      ">Send</button>" +
      "</div>" +
      "</form>";

    var trainBtn = el.querySelector("#hb-continue-training");
    if (trainBtn && typeof handlers.onContinueTraining === "function") {
      trainBtn.addEventListener("click", function () {
        handlers.onContinueTraining();
      });
    }

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
