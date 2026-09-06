/**
 * Deterministic local mentor stub.
 * Does not call networks, APIs, or a local LLM.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/(https?):\/\//g, "$1 ")
      .replace(/[^a-z0-9./]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hayHas(hay, term) {
    var needle = normalize(term);
    if (!needle || !hay) return false;
    if (hay.indexOf(needle) !== -1) return true;
    if (needle.charAt(0) === "/") {
      return hay.indexOf(needle.slice(1)) !== -1;
    }
    return false;
  }

  function matchConcepts(text, concepts) {
    var hay = normalize(text);
    var matched = [];
    (concepts || []).forEach(function (group) {
      var terms = group.terms || [];
      var hit = false;
      terms.forEach(function (term) {
        if (!hit && hayHas(hay, term)) hit = true;
      });
      if (hit) matched.push(group.id);
    });
    return matched;
  }

  function hintFor(exercise, attemptNumber) {
    var hints = (exercise && exercise.hints) || [];
    if (!hints.length) return "";
    var index = Math.min(Math.max(attemptNumber, 1), hints.length) - 1;
    return hints[index];
  }

  function MockProvider() {}

  MockProvider.prototype.id = "mock";

  MockProvider.prototype.chat = function (context) {
    context = context || {};
    var learning = context.learningMode !== false;
    var level = Hackbot.Models.assistanceLabel(context.assistanceLevel);
    var target = context.scope && context.scope.targetName ? context.scope.targetName : "the scoped environment";
    var lines = [];
    lines.push("MockProvider only — no external model is connected.");
    lines.push("Assistance: " + level + ".");
    if (learning) {
      lines.push(
        "Learning Mode is on, so I will not complete the investigation for you. Stay inside " +
          target +
          "."
      );
      lines.push("What did you observe? What changed? What does that suggest you should look at next, and why?");
    } else {
      lines.push("Learning Mode is off, but this placeholder still will not suggest exploitation or scanning.");
      lines.push("Describe one observation in scope and what you think it means.");
    }
    return Promise.resolve({
      role: "assistant",
      provider: "mock",
      content: lines.join(" ")
    });
  };

  MockProvider.prototype.evaluateLearnerResponse = function (context) {
    context = context || {};
    var text = String(context.learnerResponse || "").trim();
    var exercise = context.exercise || {};
    var attemptNumber = Number(context.attemptNumber) || 1;
    var concepts = exercise.concepts || [];
    var passCount = exercise.passCount || Math.max(1, concepts.length);
    var soft = !!exercise.soft;

    if (!text) {
      return Promise.resolve({
        verdict: "NEEDS_ANOTHER_LOOK",
        provider: "mock",
        matchedConcepts: [],
        canAdvance: false,
        hintLevel: 1,
        feedback: hintFor(exercise, 1) || "What did you notice? Name one concrete piece of the example."
      });
    }

    var matched = matchConcepts(text, concepts);
    var verdict;
    var canAdvance = false;
    var assistanceLevel = Number(context.assistanceLevel);
    if (!assistanceLevel || assistanceLevel < 1 || assistanceLevel > 5) assistanceLevel = 5;

    if (soft) {
      verdict = "CORRECT";
      canAdvance = true;
    } else if (matched.length >= passCount) {
      verdict = "CORRECT";
      canAdvance = true;
    } else if (matched.length > 0) {
      verdict = "PARTIALLY CORRECT";
      canAdvance = attemptNumber >= 3;
    } else {
      verdict = "NEEDS_ANOTHER_LOOK";
      canAdvance = attemptNumber >= 3;
    }

    var feedback;
    if (verdict === "CORRECT" && !soft) {
      feedback =
        "You pointed at the actual exchange, not a memorized command. " +
        (exercise.reveal ? "Check the labeled breakdown, then continue." : "What would you inspect next, and why?");
    } else if (verdict === "CORRECT" && soft) {
      feedback = "That is a fair research habit: name a field and why it would change how you read the application.";
    } else if (attemptNumber <= 1) {
      feedback = hintFor(exercise, 1);
    } else if (attemptNumber === 2) {
      feedback = hintFor(exercise, 2);
    } else {
      feedback = hintFor(exercise, 3);
      canAdvance = true;
    }

    if (assistanceLevel >= 5 && verdict !== "CORRECT" && attemptNumber < 3) {
      feedback +=
        " Instructor: stay with the example in front of you. Name a token you can point at, then say what job you think it does.";
    }

    return Promise.resolve({
      verdict: verdict,
      provider: "mock",
      matchedConcepts: matched,
      canAdvance: canAdvance,
      hintLevel: Math.min(attemptNumber, 3),
      feedback: feedback
    });
  };

  Hackbot.MockProvider = MockProvider;

  if (Hackbot.Provider) {
    Hackbot.Provider.set(new MockProvider());
  }
})(window);
