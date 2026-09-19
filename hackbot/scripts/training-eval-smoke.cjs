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
load("js/curriculum-lesson6.js");
load("js/curriculum-lesson7.js");
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

var lesson6 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_6_ID);
if (!lesson6 || lesson6.status !== "available" || lesson6.steps.length !== 13) {
  throw new Error("Lesson 6 should be available with 13 steps");
}
if (!lesson6.trainingPage) {
  throw new Error("Lesson 6 should reuse the Trail Supply training page");
}
if (lesson6.id !== "parameters" || lesson6.number !== 6) {
  throw new Error("Lesson 6 should be Parameters and User Input with number 6");
}

var lesson7 = Hackbot.Curriculum.getLesson(Hackbot.Curriculum.LESSON_7_ID);
if (!lesson7 || lesson7.status !== "available" || lesson7.steps.length !== 13) {
  throw new Error("Lesson 7 should be available with 13 steps");
}
if (!lesson7.trainingPage) {
  throw new Error("Lesson 7 should reuse the Trail Supply training page");
}
if (lesson7.id !== "cookies" || lesson7.number !== 7) {
  throw new Error("Lesson 7 should be Cookies and Sessions with number 7");
}

var future = Hackbot.Curriculum.getModule().lessons.filter(function (item) {
  return item.status === "future";
});
if (future.length !== 3) {
  throw new Error("Expected 3 future lessons (8–10), got " + future.length);
}
future.forEach(function (item) {
  if (item.number < 8 || item.number > 10) {
    throw new Error("Future lesson numbering should be 8–10: " + item.number);
  }
});
if (Hackbot.Curriculum.getLesson("cookies").status !== "available") {
  throw new Error("Cookies catalog entry must be available, not future");
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
  }),
  evalStep(lesson6, "a-input-data", "When I type a search or fill a form, that input can appear as a parameter or value in the HTTP request.").then(function (r) {
    assert(r.verdict === "CORRECT", "input becomes data should be CORRECT");
  }),
  evalStep(lesson6, "b-find-q", "The path is /search and the query string has parameter q with value boots.").then(function (r) {
    assert(r.verdict === "CORRECT", "find q should be CORRECT");
  }),
  evalStep(lesson6, "c-name-value", "q is the parameter name and boots is the value — the name labels the slot while the value is the data I control.").then(function (r) {
    assert(r.verdict === "CORRECT", "name vs value should be CORRECT");
  }),
  evalStep(lesson6, "d-one-thing", "Change one thing at a time so only the q value changes between searches.").then(function (r) {
    assert(r.verdict === "CORRECT", "change one thing should be CORRECT");
  }),
  evalStep(lesson6, "e-compare", "Path /search and name q stayed the same; the value changed with what I typed — that value is what I controlled.").then(function (r) {
    assert(r.verdict === "CORRECT", "compare searches should be CORRECT");
  }),
  evalStep(lesson6, "f-encoding", "Searching trail camera showed q=trail%20camera because URLs need a safe encoding for spaces.").then(function (r) {
    assert(r.verdict === "CORRECT", "URL encoding should be CORRECT");
  }),
  evalStep(lesson6, "g-multi", "Multiple parameters are separated by & — the demo has q=boots and sort=price.").then(function (r) {
    assert(r.verdict === "CORRECT", "multi-param should be CORRECT");
  }),
  evalStep(lesson6, "h-body", "Login sends username and password in the POST JSON body, not in the query string like search.").then(function (r) {
    assert(r.verdict === "CORRECT", "request body should be CORRECT");
  }),
  evalStep(lesson6, "i-path", "Product 42 appears in the path /products/42, which is different from a query like /products?id=42.").then(function (r) {
    assert(r.verdict === "CORRECT", "path value should be CORRECT");
  }),
  evalStep(lesson6, "j-where", "Search goes into query q, login fields go into the POST body, and product 42 goes into the path.").then(function (r) {
    assert(r.verdict === "CORRECT", "where input went should be CORRECT");
  }),
  evalStep(
    lesson6,
    "k-challenge",
    "GET /search with parameter q=trail%20camera returned 200; a second boots search kept the same path and name q while only the value changed — that is what I controlled."
  ).then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 6 challenge should be CORRECT");
  }),
  evalStep(lesson6, "k-challenge", "not sure").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague lesson 6 challenge should not advance");
  }),
  evalStep(lesson6, "m-reflect", "I was surprised the login input sat in the request body; next time I will compare query parameters and body fields in Network.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 6 reflection is soft-graded");
  }),
  evalStep(lesson7, "a-state-problem", "Each HTTP request is a separate exchange, so the application needs some form of state to remember continuity between them.").then(function (r) {
    assert(r.verdict === "CORRECT", "state problem should be CORRECT");
  }),
  evalStep(lesson7, "b-cookie", "A cookie is small data the browser stores for a site and can send again on later requests.").then(function (r) {
    assert(r.verdict === "CORRECT", "cookie definition should be CORRECT");
  }),
  evalStep(lesson7, "c-name-value", "The cookie name is trail_session and the value is demo-trail-7.").then(function (r) {
    assert(r.verdict === "CORRECT", "cookie name/value should be CORRECT");
  }),
  evalStep(lesson7, "d-set-cookie", "Set-Cookie is a response header that asks the browser to store a cookie; Trail Supply shows it as X-Training-Set-Cookie.").then(function (r) {
    assert(r.verdict === "CORRECT", "Set-Cookie should be CORRECT");
  }),
  evalStep(lesson7, "e-cookie-header", "On later requests a normal browser sends the Cookie request header; this SW lab mirrors it as X-Trail-Training-Cookie.").then(function (r) {
    assert(r.verdict === "CORRECT", "Cookie header should be CORRECT");
  }),
  evalStep(lesson7, "f-observe", "Status was none before; after Start demo session I saw trail_session=demo-trail-7 and status recognized.").then(function (r) {
    assert(r.verdict === "CORRECT", "observe session should be CORRECT");
  }),
  evalStep(lesson7, "g-vs-session", "A cookie is different from a session — the cookie may hold an identifier while session state lives on the application/server side.").then(function (r) {
    assert(r.verdict === "CORRECT", "cookie vs session should be CORRECT");
  }),
  evalStep(lesson7, "h-attributes", "Path scopes where the cookie applies and HttpOnly blocks JavaScript access; Secure is for HTTPS transport.").then(function (r) {
    assert(r.verdict === "CORRECT", "attributes should be CORRECT");
  }),
  evalStep(lesson7, "i-compare", "Before status was none; after trail_session existed the same status request returned recognized — evidence the demo state was remembered.").then(function (r) {
    assert(r.verdict === "CORRECT", "before/after should be CORRECT");
  }),
  evalStep(lesson7, "j-why", "Researchers inspect cookies and session headers because state can make similar requests behave differently in ways the rendered page may not show.").then(function (r) {
    assert(r.verdict === "CORRECT", "investigator why should be CORRECT");
  }),
  evalStep(
    lesson7,
    "k-challenge",
    "Initial session/status is none; start sets trail_session=demo-trail-7; later status is recognized. Path stayed the same; state changed. The cookie value is an identifier; the session is application state."
  ).then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 7 challenge should be CORRECT");
  }),
  evalStep(lesson7, "k-challenge", "asdf qwerty").then(function (r) {
    assert(r.verdict === "NEEDS_ANOTHER_LOOK" && !r.canAdvance, "vague lesson 7 challenge should not advance");
  }),
  evalStep(lesson7, "m-reflect", "Only Network showed session none becoming recognized after the trail_session cookie appeared.").then(function (r) {
    assert(r.verdict === "CORRECT" && r.canAdvance, "lesson 7 reflection is soft-graded");
  })
]).then(function () {
  console.log("training-eval-smoke: ok");
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
