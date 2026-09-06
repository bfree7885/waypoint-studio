#!/usr/bin/env node
/**
 * Deterministic MockProvider evaluation checks (no browser, no network).
 */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var sandbox = {
  console: console,
  crypto: {
    randomUUID: function () {
      return "test-id";
    }
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;

function load(rel) {
  vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
}

load("js/models.js");
load("js/curriculum.js");
load("ai/provider.js");
load("ai/mock-provider.js");

var Hackbot = sandbox.Hackbot;
Hackbot.Provider.set(new Hackbot.MockProvider());

var lesson = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.DEFAULT_LESSON_ID);
if (!lesson || lesson.steps.length !== 7) {
  throw new Error("Lesson 1 should have 7 steps");
}

var future = Hackbot.Curriculum.getModule().lessons.filter(function (item) {
  return item.status === "future";
});
if (future.length !== 9) {
  throw new Error("Expected 9 future lessons, got " + future.length);
}

function evalStep(stepId, text, attemptNumber) {
  var step = null;
  lesson.steps.forEach(function (item) {
    if (item.id === stepId) step = item;
  });
  return Hackbot.Provider.evaluateLearnerResponse({
    lesson: lesson,
    exercise: step,
    learnerResponse: text,
    assistanceLevel: 5,
    attemptNumber: attemptNumber || 1
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

Promise.all([
  evalStep("a-url", "https is the protocol, training.hackbot.local is the host, /products/42 is the path").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "URL parse should be CORRECT");
  }),
  evalStep("a-url", "I am not sure???").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "nonsense attempt 1 should not advance");
    assert(/before the :\/\//.test(r.feedback), "attempt 1 should ask a guiding question");
    assert(/Instructor:/.test(r.feedback), "level 5 should add instructor guidance");
  }),
  evalStep("a-url", "I am not sure???", 2).then(function (r) {
    assert(/Protocol is the scheme/.test(r.feedback), "attempt 2 should give a stronger hint");
  }),
  evalStep("a-url", "I am not sure???", 3).then(function (r) {
    assert(r.canAdvance, "attempt 3 must let the learner continue");
    assert(/https is the protocol/.test(r.feedback), "attempt 3 should explain clearly");
  }),
  evalStep("a-url", "HTTPS — host Training.Hackbot.Local; path /products/42.").then(function (r) {
    assert(r.verdict === "CORRECT", "matching must ignore punctuation and case");
  }),
  evalStep("b-request", "the path /products/42 and the Host header").then(function (r) {
    assert(r.verdict === "CORRECT" || r.verdict === "PARTIALLY CORRECT", "request resource parts should match");
    assert(r.canAdvance || r.verdict === "PARTIALLY CORRECT", "partial resource answer is acceptable");
  }),
  evalStep("d-try", "POST to training.hackbot.local /api/login, application/json, 401 unauthorized, invalid credentials").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "login pair should be CORRECT");
  }),
  evalStep("g-reflect", "Status codes show whether the app accepted the request, which matters because refusal vs success changes what you inspect next.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "reflection is soft-graded");
  }),
  evalStep("a-url", "").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "empty answers must not advance");
  })
]).then(function () {
  console.log("training-eval-smoke: ok");
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
