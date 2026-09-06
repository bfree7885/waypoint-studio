/**
 * Training catalog, lesson runner, and learning-progress rail.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  function verdictClass(verdict) {
    if (verdict === "CORRECT") return "is-correct";
    if (verdict === "PARTIALLY CORRECT") return "is-partial";
    return "is-needs";
  }

  Views.renderLearningProgress = function (el, state) {
    var Models = Hackbot.Models;
    if (!el) return;
    var module = Hackbot.Curriculum.getModule();
    var lesson = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.DEFAULT_LESSON_ID);
    var progress = state.training && state.training.progress;
    var stepIndex = progress ? progress.currentStep : 0;
    var step = Hackbot.Curriculum.getStep(lesson, stepIndex);
    var ws = state.workspace;
    var concepts = (progress && progress.conceptsEncountered) || [];
    el.innerHTML =
      '<section class="hb-panel">' +
      "<h3>Learning Progress</h3>" +
      '<dl class="hb-dl">' +
      "<dt>Module</dt><dd>" +
      Models.escapeHtml("Module " + module.number + " — " + module.title) +
      "</dd>" +
      "<dt>Lesson</dt><dd>" +
      Models.escapeHtml(lesson ? "Lesson " + lesson.number + " — " + lesson.title : "—") +
      "</dd>" +
      "<dt>Step</dt><dd>" +
      Models.escapeHtml(
        step
          ? "Part " + step.part + " · " + step.phase + " (" + (stepIndex + 1) + " of " + lesson.steps.length + ")"
          : "Not started"
      ) +
      "</dd>" +
      "<dt>Status</dt><dd>" +
      Models.escapeHtml((progress && progress.status) || "not started") +
      "</dd>" +
      "<dt>Concepts</dt><dd>" +
      (concepts.length
        ? Models.escapeHtml(concepts.join(", "))
        : '<span class="hb-muted">None recorded yet</span>') +
      "</dd>" +
      "<dt>Hints used</dt><dd>" +
      Models.escapeHtml(String((progress && progress.hintsUsed) || 0)) +
      "</dd>" +
      "<dt>Attempts</dt><dd>" +
      Models.escapeHtml(String((progress && progress.attempts) || 0)) +
      "</dd>" +
      "<dt>Assistance</dt><dd>" +
      Models.escapeHtml(ws ? Models.assistanceLabel(ws.assistanceLevel) : "5 — Instructor") +
      "</dd>" +
      "</dl>" +
      "</section>";
  };

  Views.renderTraining = function (el, state, handlers) {
    var Models = Hackbot.Models;
    handlers = handlers || {};
    if (!el) return;
    var module = Hackbot.Curriculum.getModule();
    var lesson = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.DEFAULT_LESSON_ID);
    var progress = state.training && state.training.progress;
    var evaln = state.training && state.training.lastEvaluation;
    var hintText = state.training && state.training.hintText;
    var draft = (state.training && state.training.draft) || "";

    if (!state.workspace) {
      el.innerHTML =
        '<div class="hb-placeholder-page"><h2>Training</h2>' +
        "<p>Create or load a workspace with Target Scope before starting a lesson. Progress is stored on the workspace.</p></div>";
      return;
    }

    var lessonNav =
      '<nav class="hb-lesson-nav" aria-label="Module 1 lessons"><p class="hb-nav-label">Module ' +
      module.number +
      " — " +
      Models.escapeHtml(module.title) +
      "</p><ol>" +
      module.lessons
        .map(function (item) {
          var available = item.status === "available";
          var current = available && lesson && item.id === lesson.id;
          return (
            "<li>" +
            (available
              ? '<button type="button" class="hb-lesson-link' +
                (current ? " is-current" : "") +
                '" data-lesson="' +
                Models.escapeHtml(item.id) +
                '">Lesson ' +
                item.number +
                " — " +
                Models.escapeHtml(item.title) +
                "</button>"
              : '<span class="hb-future">Lesson ' +
                item.number +
                " — " +
                Models.escapeHtml(item.title) +
                " <em>future</em></span>") +
            "</li>"
          );
        })
        .join("") +
      "</ol></nav>";

    var stepIndex = progress ? progress.currentStep : 0;
    var step = Hackbot.Curriculum.getStep(lesson, stepIndex);
    var completed = (progress && progress.completedSteps) || [];
    var stepDone = step && completed.indexOf(step.id) !== -1;
    var lessonComplete = !!(progress && progress.status === "completed");
    var canAdvance = !!(
      lessonComplete ||
      (step && (step.kind === "read" || stepDone || (evaln && evaln.canAdvance)))
    );
    var isLast = lesson && stepIndex >= lesson.steps.length - 1;
    var assistance = state.workspace.assistanceLevel == null ? 5 : Number(state.workspace.assistanceLevel);

    var body = '<div class="hb-training">';
    body += lessonNav;
    body += '<p class="hb-loop">' + Models.escapeHtml(module.loop) + "</p>";

    if (progress && progress.status === "completed") {
      body += '<p class="hb-complete-banner">Lesson 1 is complete. You can review steps; Lessons 2–10 are not built yet.</p>';
    }

    if (!step) {
      body += "<p>No step available.</p></div>";
      el.innerHTML = body;
      return;
    }

    body +=
      '<article class="hb-lesson">' +
      "<header><p class=\"hb-muted hb-small\">Part " +
      Models.escapeHtml(step.part) +
      " · " +
      Models.escapeHtml(step.phase) +
      " · step " +
      (stepIndex + 1) +
      " of " +
      lesson.steps.length +
      "</p>" +
      "<h2>" +
      Models.escapeHtml(lesson.title) +
      "</h2>" +
      "<h3>" +
      Models.escapeHtml(step.title) +
      "</h3></header>" +
      step.body;

    if (assistance >= 5 && step.instructorNote) {
      body += '<p class="hb-instructor">' + step.instructorNote + "</p>";
    }

    if (step.kind === "exercise" || step.kind === "reflection") {
      body +=
        "<p><strong>" +
        Models.escapeHtml(step.prompt) +
        "</strong></p>" +
        '<form class="hb-compose" id="hb-train-form">' +
        '<label class="hb-sr" for="hb-train-input">Your interpretation</label>' +
        '<textarea id="hb-train-input" rows="5" maxlength="4000" placeholder="What do you notice, and why?">' +
        Models.escapeHtml(draft) +
        "</textarea>" +
        '<div class="hb-compose-row">' +
        '<p class="hb-muted hb-small">MockProvider evaluation · synthetic example</p>' +
        '<button type="submit" class="hb-btn" id="hb-train-submit">Submit</button>' +
        "</div></form>";
    }

    if (evaln && evaln.feedback) {
      body +=
        '<div class="hb-eval ' +
        verdictClass(evaln.verdict) +
        '" role="status"><p class="hb-eval-verdict">' +
        Models.escapeHtml(evaln.verdict) +
        "</p><p>" +
        Models.escapeHtml(evaln.feedback) +
        "</p></div>";
    }

    if (hintText) {
      body += '<p class="hb-hint" role="status"><strong>Hint.</strong> ' + Models.escapeHtml(hintText) + "</p>";
    }

    if ((stepDone || (evaln && evaln.canAdvance)) && step.reveal) {
      body += '<div class="hb-reveal">' + step.reveal + "</div>";
    }

    body +=
      '<div class="hb-step-actions">' +
      '<button type="button" class="hb-btn hb-btn-ghost" id="hb-train-back"' +
      (stepIndex === 0 ? " disabled" : "") +
      ">Back</button>";
    if (step.kind === "exercise" || step.kind === "reflection") {
      body += '<button type="button" class="hb-btn hb-btn-ghost" id="hb-train-hint">Hint</button>';
    }
    body +=
      '<button type="button" class="hb-btn" id="hb-train-next"' +
      (canAdvance ? "" : " disabled") +
      ">" +
      (isLast ? "Complete lesson" : "Next") +
      "</button></div></article></div>";

    el.innerHTML = body;

    var form = el.querySelector("#hb-train-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = el.querySelector("#hb-train-input");
        if (typeof handlers.onSubmit === "function") handlers.onSubmit(input ? input.value : "");
      });
    }
    var input = el.querySelector("#hb-train-input");
    if (input && typeof handlers.onDraft === "function") {
      input.addEventListener("input", function () {
        handlers.onDraft(input.value);
      });
    }
    var back = el.querySelector("#hb-train-back");
    if (back) {
      back.addEventListener("click", function () {
        if (typeof handlers.onBack === "function") handlers.onBack();
      });
    }
    var next = el.querySelector("#hb-train-next");
    if (next) {
      next.addEventListener("click", function () {
        if (typeof handlers.onNext === "function") handlers.onNext();
      });
    }
    var hint = el.querySelector("#hb-train-hint");
    if (hint) {
      hint.addEventListener("click", function () {
        if (typeof handlers.onHint === "function") handlers.onHint();
      });
    }
  };
})(window);
