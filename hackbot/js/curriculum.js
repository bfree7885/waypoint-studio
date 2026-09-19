/**
 * Module 1 curriculum. Lesson 1 is fully authored; 2–10 are future shells.
 * All examples are synthetic / local (training.hackbot.local).
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var REQUEST_EXAMPLE =
    "GET /products/42 HTTP/1.1\n" +
    "Host: training.hackbot.local\n" +
    "User-Agent: HackbotBrowser/1.0\n" +
    "Accept: application/json";

  var RESPONSE_EXAMPLE =
    "HTTP/1.1 200 OK\n" +
    "Content-Type: application/json\n" +
    "Content-Length: 47\n" +
    "\n" +
    "{\n" +
    '  "id": 42,\n' +
    '  "name": "Trail Camera",\n' +
    '  "price": 129.99\n' +
    "}";

  var TRY_REQUEST =
    "POST /api/login HTTP/1.1\n" +
    "Host: training.hackbot.local\n" +
    "Content-Type: application/json\n" +
    "\n" +
    "{\n" +
    '  "username": "student",\n' +
    '  "password": "example"\n' +
    "}";

  var TRY_RESPONSE =
    "HTTP/1.1 401 Unauthorized\n" +
    "Content-Type: application/json\n" +
    "\n" +
    "{\n" +
    '  "error": "Invalid credentials"\n' +
    "}";

  var LESSON_1_STEPS = [
    {
      id: "a-url",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Mental model — a web request",
      prompt: "Look at this synthetic URL. What are the protocol, host, and path?",
      instructorNote:
        "Stay with the pieces you can point to. You do not need formal definitions yet — name what you see, then say what job you think each piece does.",
      body:
        "<p>When you open a page, a <strong>browser (client)</strong> sends an <strong>HTTP request</strong> to a <strong>server</strong>. The server answers with an <strong>HTTP response</strong>, and the browser uses that response.</p>" +
        '<ol class="hb-flow" aria-label="Request and response flow">' +
        "<li>Browser / Client</li><li>HTTP Request</li><li>Server</li><li>HTTP Response</li><li>Browser</li>" +
        "</ol>" +
        "<p>Synthetic example (not a live target):</p>" +
        '<p class="hb-example-url"><code>https://training.hackbot.local/products/42</code></p>' +
        "<p>Identify <strong>protocol</strong>, <strong>host</strong>, and <strong>path</strong> before Hackbot labels them.</p>",
      reveal:
        "<p>Labeled:</p><ul>" +
        "<li><strong>Protocol:</strong> <code>https</code> — how the client will talk (encrypted HTTP).</li>" +
        "<li><strong>Host / domain:</strong> <code>training.hackbot.local</code> — which server.</li>" +
        "<li><strong>Path:</strong> <code>/products/42</code> — which resource on that server.</li>" +
        "</ul>",
      concepts: [
        { id: "protocol", label: "protocol", terms: ["https", "http", "protocol", "scheme"] },
        { id: "host", label: "host", terms: ["training.hackbot.local", "host", "domain"] },
        { id: "path", label: "path", terms: ["/products/42", "products/42", "path"] }
      ],
      passCount: 3,
      hints: [
        "Which part comes before the ://, which name sits after it, and what starts with a slash?",
        "Protocol is the scheme (https). Host is the machine name (training.hackbot.local). Path is /products/42.",
        "https is the protocol. training.hackbot.local is the host. /products/42 is the path — the resource the client is asking for."
      ]
    },
    {
      id: "b-request",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      title: "Inspect a request",
      prompt: "What parts of this request tell the server what resource the client wants?",
      instructorNote:
        "Read the first line and the Host header as a pair. Headers are extra instructions; the first line is the ask.",
      body:
        "<p>Here is a realistic but synthetic request. Nothing is sent to a network.</p>" +
        '<pre class="hb-http" tabindex="0">' +
        REQUEST_EXAMPLE.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>Walk-through:</p><ul>" +
        "<li><strong>Method:</strong> <code>GET</code> — retrieve a resource; do not change it.</li>" +
        "<li><strong>Path:</strong> <code>/products/42</code> — which resource.</li>" +
        "<li><strong>Protocol / version:</strong> <code>HTTP/1.1</code>.</li>" +
        "<li><strong>Host:</strong> <code>training.hackbot.local</code> — which server, because one IP can serve many names.</li>" +
        "<li><strong>User-Agent</strong> and <strong>Accept</strong> describe the client and the representation it prefers.</li>" +
        "</ul>",
      concepts: [
        { id: "method", label: "HTTP method", terms: ["get", "method"] },
        { id: "path", label: "path", terms: ["/products/42", "products/42", "path", "resource"] },
        { id: "host", label: "Host header", terms: ["host", "training.hackbot.local"] }
      ],
      passCount: 2,
      hints: [
        "If you could keep only a few tokens from this request, which ones identify the thing being asked for?",
        "Look at the method plus the path, and the Host header. Together they name the resource.",
        "The server learns the resource from GET, the path /products/42, and Host: training.hackbot.local. Other headers refine how to answer, not which object is meant."
      ]
    },
    {
      id: "c-observe",
      part: "C",
      phase: "OBSERVE",
      kind: "exercise",
      title: "Inspect a response — what do you notice?",
      prompt: "What do you notice in this response? Name concrete pieces before any explanation.",
      instructorNote:
        "Do not hunt for a trick. Point at a status, a header, or something in the body and say what it seems to mean.",
      body:
        "<p>Corresponding synthetic response:</p>" +
        '<pre class="hb-http" tabindex="0">' +
        RESPONSE_EXAMPLE.replace(/</g, "&lt;") +
        "</pre>",
      concepts: [
        { id: "status", label: "status code", terms: ["200", "ok", "status"] },
        { id: "type", label: "content type", terms: ["content-type", "json", "application/json"] },
        { id: "body", label: "response body", terms: ["body", "trail camera", "id", "price", "42"] },
        { id: "headers", label: "headers", terms: ["header", "content-length"] }
      ],
      passCount: 2,
      hints: [
        "What is the first number on the first line? What does Content-Type claim? What sits under the blank line?",
        "You should be able to point at a status (200 OK), a content type (JSON), and a body that describes product 42.",
        "The status 200 OK means the request succeeded. Content-Type says the body is JSON. Headers sit above the blank line; the object with id 42 is the body."
      ]
    },
    {
      id: "c-interpret",
      part: "C",
      phase: "INTERPRET",
      kind: "read",
      title: "Name the response pieces",
      body:
        "<p>Now the same response, labeled:</p><ul>" +
        "<li><strong>Status line:</strong> <code>HTTP/1.1 200 OK</code> — version, numeric status, reason phrase.</li>" +
        "<li><strong>Headers:</strong> <code>Content-Type</code> and <code>Content-Length</code> describe the body without being the body.</li>" +
        "<li><strong>Content type:</strong> <code>application/json</code> — parse this as JSON, not HTML.</li>" +
        "<li><strong>Body:</strong> the JSON object — the representation of product 42.</li>" +
        "</ul>" +
        "<p>A researcher reads status first (did it work?), then headers (what kind of answer?), then body (what was actually returned?).</p>"
    },
    {
      id: "d-try",
      part: "D",
      phase: "YOU TRY",
      kind: "exercise",
      title: "You try — a second pair",
      prompt:
        "Identify the HTTP method, host, path, content type, status code, and what the response body communicates. Exact wording is not required.",
      instructorNote:
        "Work through the pair the same way: first line, Host, headers, then the body. What was asked, and how did the application answer?",
      body:
        "<p>Synthetic login attempt — local training material only. These are not real credentials and nothing is sent.</p>" +
        "<p><strong>Request</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        TRY_REQUEST.replace(/</g, "&lt;") +
        "</pre>" +
        "<p><strong>Response</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        TRY_RESPONSE.replace(/</g, "&lt;") +
        "</pre>",
      concepts: [
        { id: "method", label: "HTTP method", terms: ["post", "method"] },
        { id: "host", label: "host", terms: ["host", "training.hackbot.local"] },
        { id: "path", label: "path", terms: ["/api/login", "api/login", "path", "login"] },
        { id: "type", label: "content type", terms: ["content-type", "json", "application/json"] },
        { id: "status", label: "status code", terms: ["401", "unauthorized", "status"] },
        { id: "body", label: "body meaning", terms: ["invalid", "credentials", "error", "denied", "rejected", "failed"] }
      ],
      passCount: 4,
      hints: [
        "Who is being asked (Host), what path, which method, which status, and what does the JSON error say?",
        "POST /api/login to training.hackbot.local with JSON. The status is 401 Unauthorized. The body says the credentials were invalid — not that the page was missing.",
        "Method POST, host training.hackbot.local, path /api/login, Content-Type application/json, status 401, body: the application refused the login because the credentials were invalid."
      ]
    },
    {
      id: "f-security",
      part: "F",
      phase: "APPLY",
      kind: "read",
      title: "Why researchers care",
      body:
        "<p>Security researchers care about <strong>requests</strong> because they show what the client is asking the application to do — which resource, which method, which data.</p>" +
        "<p><strong>Responses</strong> show how the application handled that request — success, refusal, redirect, error, and what was returned.</p>" +
        "<p>Much of web security work is carefully observing, comparing, and (later, only on authorized targets) modifying request/response behavior.</p>" +
        "<p>This lesson does not teach exploitation. The skill is to <em>see the exchange clearly</em> before anyone changes it.</p>"
    },
    {
      id: "g-reflect",
      part: "G",
      phase: "REFLECT",
      kind: "reflection",
      title: "Reflection",
      prompt:
        "What information in an HTTP request or response do you think a security researcher might pay attention to, and why?",
      instructorNote:
        "There is no single correct list. Name one or two fields and why they would change how you read the application’s behavior.",
      noteConcept: "HTTP researcher attention",
      body: "<p>Write from what you just inspected. This is stored as a learning note, not a score.</p>",
      concepts: [
        { id: "attention", label: "researcher attention", terms: ["header", "status", "body", "path", "method", "cookie", "auth", "token", "password", "error", "host", "why", "because"] }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one field you already named — a status, a path, a header, or a body error — and say what it would tell you.",
        "A researcher might watch methods and paths (what was asked), status codes (how it went), and bodies or headers that carry identity or errors.",
        "Example: status codes show success vs refusal; paths show which feature was touched; bodies and headers can reveal how the app explains a failure. That is observation, not an exploit."
      ]
    }
  ];

  var FUTURE_LESSONS = [
    { id: "headers", title: "Headers" },
    { id: "status-redirects", title: "Status Codes and Redirects" },
    { id: "parameters", title: "Parameters and User Input" },
    { id: "cookies", title: "Cookies and Sessions" },
    { id: "devtools", title: "Browser Developer Tools" },
    { id: "apis-json", title: "APIs and JSON" },
    { id: "structured-investigation", title: "Your First Structured Investigation" }
  ];

  var MODULE_1 = {
    id: "web-investigation-foundations",
    number: 1,
    title: "Web Investigation Foundations",
    loop: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    lessons: [
      {
        id: "web-request-works",
        number: 1,
        title: "How a Web Request Works",
        status: "available",
        goal: "Understand client, server, URL, host, path, request, response, method, status, headers, and body by inspecting synthetic HTTP.",
        completeBanner:
          "Lesson 1 is complete. You can review steps or continue to Lesson 2 — Inspecting a Web Page.",
        steps: LESSON_1_STEPS
      }
    ]
  };

  if (Hackbot.Lesson2) {
    MODULE_1.lessons.push(Hackbot.Lesson2);
  }

  if (Hackbot.Lesson3) {
    MODULE_1.lessons.push(Hackbot.Lesson3);
  }

  FUTURE_LESSONS.forEach(function (item, index) {
    MODULE_1.lessons.push({
      id: item.id,
      number: index + 4,
      title: item.title,
      status: "future",
      steps: []
    });
  });

  function getModule() {
    return MODULE_1;
  }

  function getLesson(lessonId) {
    var found = null;
    MODULE_1.lessons.forEach(function (lesson) {
      if (lesson.id === lessonId) found = lesson;
    });
    return found;
  }

  function getStep(lesson, stepIndex) {
    if (!lesson || !lesson.steps) return null;
    return lesson.steps[stepIndex] || null;
  }

  Hackbot.Curriculum = {
    MODULE_1: MODULE_1,
    DEFAULT_LESSON_ID: "web-request-works",
    getModule: getModule,
    getLesson: getLesson,
    getStep: getStep,
    LESSON_2_ID: "inspect-page",
    LESSON_3_ID: "http-pair",
    trainingPageUrl: function (lesson) {
      if (!lesson || !lesson.trainingPage) return "";
      if (!global.location || !global.location.href) return lesson.trainingPage;
      try {
        return new URL(lesson.trainingPage, global.location.href).href;
      } catch (err) {
        return lesson.trainingPage;
      }
    }
  };
})(window);
