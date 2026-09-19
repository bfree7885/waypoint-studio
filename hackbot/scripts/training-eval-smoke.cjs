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
load("js/curriculum-lesson4.js");
load("js/curriculum-lesson5.js");
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

var lesson4 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_4_ID);
if (!lesson4 || lesson4.status !== "available" || lesson4.steps.length !== 11) {
  throw new Error("Lesson 4 should be available with 11 steps");
}
if (!lesson4.trainingPage) {
  throw new Error("Lesson 4 should reuse the Trail Supply training page");
}
if (lesson4.id !== "headers" || lesson4.number !== 4) {
  throw new Error("Lesson 4 should be Headers with number 4");
}

var lesson5 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_5_ID);
if (!lesson5 || lesson5.status !== "available" || lesson5.steps.length !== 12) {
  throw new Error("Lesson 5 should be available with 12 steps");
}
if (!lesson5.trainingPage) {
  throw new Error("Lesson 5 should reuse the Trail Supply training page");
}
if (lesson5.id !== "status-redirects" || lesson5.number !== 5) {
  throw new Error("Lesson 5 should be Status Codes and Redirects with number 5");
}

var future = Hackbot.Curriculum.getModule().lessons.filter(function (item) {
  return item.status === "future";
});
if (future.length !== 5) {
  throw new Error("Expected 5 future lessons (6–10), got " + future.length);
}
future.forEach(function (item) {
  if (item.number < 6 || item.number > 10) {
    throw new Error("Future lesson numbering should be 6–10: " + item.number);
  }
});
if (Hackbot.Curriculum.getLesson("status-redirects").status !== "available") {
  throw new Error("Status Codes catalog entry must be available, not future");
}

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
  // Protocol tokens must survive https:// stripping during normalize.
  evalStep(lesson1, "a-url", "https://training.hackbot.local/products/42").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "https:// answers must keep protocol token https");
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
  }),
  evalStep(lesson4, "a-what", "Headers are metadata about the request or response; the body is the JSON payload inside.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "headers vs body definition should be CORRECT");
  }),
  evalStep(lesson4, "b-locate", "I opened Network, clicked the search request for boots, and found Request Headers and Response Headers.").then(function (r) {
    assert(r.verdict === "CORRECT", "locating header panels should be CORRECT");
  }),
  evalStep(lesson4, "c-name-value", "Content-Type is application/json, Cache-Control is no-store, Host is 127.0.0.1 — name before the colon, value after.").then(function (r) {
    assert(r.verdict === "CORRECT", "name/value structure should be CORRECT");
  }),
  evalStep(lesson4, "d-request", "Host names the server, User-Agent describes the browser client, Accept says what content the client prefers.").then(function (r) {
    assert(r.verdict === "CORRECT", "request headers should be CORRECT");
  }),
  evalStep(lesson4, "e-req-ctype", "POST /login has Content-Type application/json so the server can parse the JSON body.").then(function (r) {
    assert(r.verdict === "CORRECT", "login Content-Type should be CORRECT");
  }),
  evalStep(lesson4, "f-response", "Content-Type is application/json, Content-Length gives the size in bytes, Cache-Control is no-store.").then(function (r) {
    assert(r.verdict === "CORRECT", "response headers should be CORRECT");
  }),
  evalStep(lesson4, "g-vs-body", "Headers are metadata like Content-Type; the body is the JSON results or error payload — different from the headers.").then(function (r) {
    assert(r.verdict === "CORRECT", "headers vs body on live traffic should be CORRECT");
  }),
  evalStep(lesson4, "h-why", "Researchers inspect headers to understand what the client sent and what the server returned, including content types, before changing anything.").then(function (r) {
    assert(r.verdict === "CORRECT", "investigator why should be CORRECT");
  }),
  evalStep(
    lesson4,
    "i-challenge",
    "Request Host names the server; response Content-Type application/json and Cache-Control no-store; headers are metadata vs JSON body; researchers observe to understand the exchange."
  ).then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 4 challenge should be CORRECT");
  }),
  evalStep(lesson4, "i-challenge", "not sure").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague lesson 4 challenge should not advance");
  }),
  evalStep(lesson4, "k-reflect", "The page never showed Cache-Control no-store or Content-Type application/json; those headers only appeared in Network.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 4 reflection is soft-graded");
  }),
  evalStep(lesson5, "a-signals", "A status code is a short number that signals how the request turned out — success, redirect, or error.").then(function (r) {
    assert(r.verdict === "CORRECT", "status signals should be CORRECT");
  }),
  evalStep(lesson5, "b-locate", "In Network, the /search?q=boots request shows status 200.").then(function (r) {
    assert(r.verdict === "CORRECT", "locate status should be CORRECT");
  }),
  evalStep(lesson5, "c-families", "2xx means success, 3xx means redirect, 4xx is a client problem, 5xx is a server problem.").then(function (r) {
    assert(r.verdict === "CORRECT", "families should be CORRECT");
  }),
  evalStep(lesson5, "d-success", "200 OK is in the 2xx success family and means the request succeeded.").then(function (r) {
    assert(r.verdict === "CORRECT", "200 success should be CORRECT");
  }),
  evalStep(lesson5, "e-unauthorized", "401 Unauthorized is a 4xx response; Trail Supply refused the login because credentials were invalid.").then(function (r) {
    assert(r.verdict === "CORRECT", "401 should be CORRECT");
  }),
  evalStep(lesson5, "f-notfound", "404 means the resource is missing; 401 means auth failed — different client-side problems.").then(function (r) {
    assert(r.verdict === "CORRECT", "404 vs 401 should be CORRECT");
  }),
  evalStep(lesson5, "g-compare", "200 is success while 401 and 404 are error signals researchers interpret in Network before changing anything.").then(function (r) {
    assert(r.verdict === "CORRECT", "compare success/error should be CORRECT");
  }),
  evalStep(lesson5, "h-redirect-idea", "A 3xx response includes a Location header so the client can follow and make a new request.").then(function (r) {
    assert(r.verdict === "CORRECT", "redirect idea should be CORRECT");
  }),
  evalStep(lesson5, "i-follow", "The /go/camera request returned 302 with Location products/42, then the product page loaded with 200.").then(function (r) {
    assert(r.verdict === "CORRECT", "follow redirect should be CORRECT");
  }),
  evalStep(
    lesson5,
    "j-challenge",
    "Search is 200, failed login is 401 Unauthorized, missing page is 404, redirect is 302 with Location to products/42, then a final 200."
  ).then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 5 challenge should be CORRECT");
  }),
  evalStep(lesson5, "j-challenge", "not sure").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague lesson 5 challenge should not advance");
  }),
  evalStep(lesson5, "l-reflect", "The rendered page looked fine, but only Network showed the 302 Location hop and the 401 on failed login.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 5 reflection is soft-graded");
  })
]).then(function () {
  console.log("training-eval-smoke: ok");
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
