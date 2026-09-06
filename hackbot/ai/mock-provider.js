/**
 * Deterministic local mentor stub.
 * Does not call networks, APIs, or a local LLM.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

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
    if (!text) {
      return Promise.resolve({
        verdict: "NEEDS_ANOTHER_LOOK",
        provider: "mock",
        feedback: "What did you notice? Name one concrete part of the request or response before drawing a conclusion."
      });
    }
    var lower = text.toLowerCase();
    var mentionsReason =
      lower.indexOf("because") !== -1 ||
      lower.indexOf("why") !== -1 ||
      lower.indexOf("suggest") !== -1 ||
      lower.indexOf("means") !== -1 ||
      lower.indexOf("observe") !== -1;
    if (text.length < 48 && !mentionsReason) {
      return Promise.resolve({
        verdict: "PARTIALLY CORRECT",
        provider: "mock",
        feedback: "That’s a start. What specifically did you see, and why might a researcher care about it?"
      });
    }
    return Promise.resolve({
      verdict: "CORRECT",
      provider: "mock",
      feedback:
        "You reasoned from what you noticed rather than reciting a command. What would you investigate next inside the authorized scope, and why?"
    });
  };

  Hackbot.MockProvider = MockProvider;

  if (Hackbot.Provider) {
    Hackbot.Provider.set(new MockProvider());
  }
})(window);
