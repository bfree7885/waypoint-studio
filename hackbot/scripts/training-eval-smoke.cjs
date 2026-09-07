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
load("js/curriculum-lesson2.js");
load("js/curriculum-lesson3.js");
load("js/curriculum.js");
load("ai/provider.js");
load("ai/mock-provider.js");

var Hackbot = sandbox.Hackbot;
Hackbot.Provider.set(new Hackbot.MockProvider());

var lesson1 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.DEFAULT_LESSON_ID);
if (!lesson1 || lesson1.steps.length !== 7) {
  throw new Error("Lesson 1 should have 7 steps");
}

var lesson2 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_2_ID);
if (!lesson2 || lesson2.status !== "available" || lesson2.steps.length !== 10) {
  throw new Error("Lesson 2 should be available with 10 steps");
}
if (!lesson2.trainingPage) {
  throw new Error("Lesson 2 should declare a local training page");
}

var lesson3 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_3_ID);
if (!lesson3 || lesson3.status !== "available" || lesson3.steps.length !== 11) {
  throw new Error("Lesson 3 should be available with 11 steps");
}
if (!lesson3.trainingPage) {
  throw new Error("Lesson 3 should reuse the Trail Supply training page");
}

var future = Hackbot.Curriculum.getModule().lessons.filter(function (item) {
  return item.status === "future";
});
if (future.length !== 7) {
  throw new Error("Expected 7 future lessons (4–10), got " + future.length);
}
future.forEach(function (item) {
  if (item.number < 4 || item.number > 10) {
    throw new Error("Future lesson numbering should be 4–10: " + item.number);
  }
});

function evalStep(lesson, stepId, text, attemptNumber) {
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
  evalStep(lesson1, "a-url", "https is the protocol, training.hackbot.local is the host, /products/42 is the path").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "URL parse should be CORRECT");
  }),
  evalStep(lesson1, "a-url", "I am not sure???").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "nonsense attempt 1 should not advance");
    assert(/before the :\/\//.test(r.feedback), "attempt 1 should ask a guiding question");
    assert(/Instructor:/.test(r.feedback), "level 5 should add instructor guidance");
  }),
  evalStep(lesson1, "a-url", "I am not sure???", 2).then(function (r) {
    assert(/Protocol is the scheme/.test(r.feedback), "attempt 2 should give a stronger hint");
  }),
  evalStep(lesson1, "a-url", "I am not sure???", 3).then(function (r) {
    assert(r.canAdvance, "attempt 3 must let the learner continue");
    assert(/https is the protocol/.test(r.feedback), "attempt 3 should explain clearly");
  }),
  evalStep(lesson1, "a-url", "HTTPS — host Training.Hackbot.Local; path /products/42.").then(function (r) {
    assert(r.verdict === "CORRECT", "matching must ignore punctuation and case");
  }),
  evalStep(lesson1, "b-request", "the path /products/42 and the Host header").then(function (r) {
    assert(r.verdict === "CORRECT" || r.verdict === "PARTIALLY CORRECT", "request resource parts should match");
    assert(r.canAdvance || r.verdict === "PARTIALLY CORRECT", "partial resource answer is acceptable");
  }),
  evalStep(lesson1, "d-try", "POST to training.hackbot.local /api/login, application/json, 401 unauthorized, invalid credentials").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "login pair should be CORRECT");
  }),
  evalStep(lesson1, "g-reflect", "Status codes show whether the app accepted the request, which matters because refusal vs success changes what you inspect next.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "reflection is soft-graded");
  }),
  evalStep(lesson1, "a-url", "").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "empty answers must not advance");
  }),
  evalStep(lesson2, "a-visible", "I see Trail Supply, a Trail Camera product, a search box, and a sign-in form.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "visible page should be CORRECT");
  }),
  evalStep(lesson2, "b-inspector", "The heading is an h1 with text Trail Supply and id site-heading.").then(function (r) {
    assert(r.verdict === "CORRECT", "heading inspection should be CORRECT");
  }),
  evalStep(lesson2, "c-html", "href goes to /products/42, class product-link, data-product-id 42, label Trail Camera").then(function (r) {
    assert(r.verdict === "CORRECT", "HTML element reading should be CORRECT");
  }),
  evalStep(lesson2, "d-links", "The Trail Camera link goes to /products/42").then(function (r) {
    assert(r.verdict === "CORRECT", "product link destination should be CORRECT");
  }),
  evalStep(lesson2, "e-forms", "The browser would send GET /search?q=boots").then(function (r) {
    assert(r.verdict === "CORRECT", "search form request should be CORRECT");
  }),
  evalStep(lesson2, "f-scripts", "I would open js/app.js").then(function (r) {
    assert(r.verdict === "CORRECT", "script file should be CORRECT");
  }),
  evalStep(lesson2, "g-comments", "Comments can name endpoints that never appear as visible page text.").then(function (r) {
    assert(r.verdict === "CORRECT", "comment reasoning should be CORRECT");
  }),
  evalStep(lesson2, "h-challenge", "h1 site-heading Trail Supply; login POST /login username; search /search; /products/42 data-product-id 42; js/app.js; TODO inventory endpoint; also hidden /inventory/demo.json").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "challenge should be CORRECT");
  }),
  evalStep(lesson2, "h-challenge", "I clicked around").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague challenge attempt 1 should not advance");
  }),
  evalStep(lesson2, "h-challenge", "I clicked around", 3).then(function (r) {
    assert(r.canAdvance, "challenge attempt 3 must let the learner continue");
  }),
  evalStep(lesson2, "j-reflect", "The HTML comment and data-product-id are not visible as shopper-facing copy.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 2 reflection is soft-graded");
  }),
  evalStep(lesson3, "a-network", "I see the HTML document, store.css, and the JavaScript file after reload.").then(function (r) {
    assert(r.verdict === "CORRECT", "page-load resources should be CORRECT");
  }),
  evalStep(lesson3, "b-search", "GET /search?q=boots").then(function (r) {
    assert(r.verdict === "CORRECT", "search GET should be CORRECT");
  }),
  evalStep(lesson3, "e-post", "Search is GET with a query string and 200; login is POST /login with a JSON body and 401 unauthorized.").then(function (r) {
    assert(r.verdict === "CORRECT", "GET vs POST should be CORRECT");
  }),
  evalStep(lesson3, "i-challenge", "Reload GET store.css 200; search GET /search q=boots 200; login POST /login JSON body 401 invalid credentials; search uses query, login uses body.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 3 challenge should be CORRECT");
  }),
  evalStep(lesson3, "i-challenge", "not sure").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague lesson 3 challenge should not advance");
  }),
  evalStep(lesson3, "k-reflect", "Network showed GET /search?q=boots and a 401 JSON body that the shop page never printed.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 3 reflection is soft-graded");
  })
]).then(function () {
  console.log("training-eval-smoke: ok");
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
