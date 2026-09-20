/**
 * Module 1 curriculum. Lessons 1–8 are fully authored; 9–10 are future shells.
 * All examples are synthetic / local (training.hackbot.local / Trail Supply).
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
      phase: "TEACH",
      kind: "exercise",
      title: "Mental model — browser, request, response",
      prompt:
        "Using the URL below, name the protocol, the host, and the path. Use the definitions you just read.",
      instructorNote:
        "Point at each piece of the URL. Protocol is before ://, host is the server name, path starts with /.",
      body:
        "<p><strong>Teach — words first.</strong> You do not need prior cybersecurity knowledge.</p>" +
        "<ul>" +
        "<li><strong>Browser</strong> — the program that shows websites (Chrome, Firefox, Edge, Safari). In this training, the browser is also the <strong>client</strong>: the side that asks for something.</li>" +
        "<li><strong>Website / page</strong> — what you see after the browser gets an answer. The page is built from data the server sent back.</li>" +
        "<li><strong>Server / application</strong> — the other side. It receives asks and sends answers. Think of a shop: you ask for a product page; the store answers with that page.</li>" +
        "<li><strong>Request</strong> — the message the client sends (“please give me this”).</li>" +
        "<li><strong>Response</strong> — the message the server sends back (“here it is” / “no” / “go elsewhere”).</li>" +
        "</ul>" +
        '<ol class="hb-flow" aria-label="Action to rendered result">' +
        "<li>You act (open a link, type a URL)</li>" +
        "<li>Browser sends a request</li>" +
        "<li>Server answers with a response</li>" +
        "<li>Browser renders the result</li>" +
        "</ol>" +
        "<p><strong>Demonstrate — a URL is an address.</strong> Example (synthetic, not a live target):</p>" +
        '<p class="hb-example-url"><code>https://training.hackbot.local/products/42</code></p>' +
        "<p>Hackbot labels this one for you:</p><ul>" +
        "<li><code>https</code> = <strong>protocol</strong> (how to talk; here, encrypted HTTP)</li>" +
        "<li><code>training.hackbot.local</code> = <strong>host</strong> (which server)</li>" +
        "<li><code>/products/42</code> = <strong>path</strong> (which resource on that server)</li>" +
        "</ul>" +
        "<p><strong>Guided try:</strong> say those three pieces back in your own words (protocol, host, path).</p>",
      reveal:
        "<p>Labeled again:</p><ul>" +
        "<li><strong>Protocol:</strong> <code>https</code></li>" +
        "<li><strong>Host:</strong> <code>training.hackbot.local</code></li>" +
        "<li><strong>Path:</strong> <code>/products/42</code></li>" +
        "</ul>",
      teach:
        "https is the protocol. training.hackbot.local is the host. /products/42 is the path — the resource the client is asking for.",
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
      prompt:
        "After reading the walk-through, name the method, the path, and the Host that tell the server what resource is wanted.",
      instructorNote:
        "The first line is the ask. Host names the server. Together they identify the resource.",
      body:
        "<p><strong>Teach:</strong> An <strong>HTTP request</strong> is text the browser sends. The first line is the main ask. Lines after that are <strong>headers</strong> — named extra instructions (Name: value).</p>" +
        "<p><strong>Demonstrate</strong> — synthetic request (nothing is sent to a network):</p>" +
        '<pre class="hb-http" tabindex="0">' +
        REQUEST_EXAMPLE.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>What each piece means:</p><ul>" +
        "<li><strong>Method</strong> <code>GET</code> — retrieve something; do not change it.</li>" +
        "<li><strong>Path</strong> <code>/products/42</code> — which resource.</li>" +
        "<li><strong>Protocol</strong> <code>HTTP/1.1</code> — the language version.</li>" +
        "<li><strong>Host</strong> <code>training.hackbot.local</code> — which server (one machine can host many names).</li>" +
        "<li><strong>User-Agent</strong> / <strong>Accept</strong> — describe the client and preferred format; they refine the answer, they do not rename the product.</li>" +
        "</ul>" +
        "<p><strong>Guided try:</strong> which three tokens identify <em>what</em> is being asked for?</p>",
      teach:
        "The server learns the resource from GET (method), /products/42 (path), and Host: training.hackbot.local. Other headers refine how to answer, not which object is meant.",
      concepts: [
        { id: "method", label: "HTTP method", terms: ["get", "method"] },
        { id: "path", label: "path", terms: ["/products/42", "products/42", "path", "resource"] },
        { id: "host", label: "Host header", terms: ["host", "training.hackbot.local"] }
      ],
      passCount: 2,
      hints: [
        "In the preformatted request, look at line 1 and the Host line. Point at method, path, and host.",
        "Method is GET. Path is /products/42. Host is training.hackbot.local.",
        "Answer with GET, /products/42, and Host training.hackbot.local."
      ]
    },
    {
      id: "c-observe",
      part: "C",
      phase: "OBSERVE",
      kind: "exercise",
      title: "Inspect a response — what do you notice?",
      prompt:
        "Name at least two concrete pieces you see: a status, a header name/value, or something in the body.",
      instructorNote:
        "Point at status, Content-Type, or the JSON body. No tricks.",
      body:
        "<p><strong>Teach:</strong> An <strong>HTTP response</strong> answers the request. Read it in order:</p><ol>" +
        "<li><strong>Status line</strong> — did it work? (number + short phrase)</li>" +
        "<li><strong>Headers</strong> — describe the answer (still Name: value)</li>" +
        "<li><strong>Body</strong> — the payload after the blank line</li>" +
        "</ol>" +
        "<p><strong>Demonstrate</strong> — matching synthetic response:</p>" +
        '<pre class="hb-http" tabindex="0">' +
        RESPONSE_EXAMPLE.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>Look for: <code>200 OK</code> on the first line, <code>Content-Type: application/json</code>, then the JSON object under the blank line.</p>" +
        "<p><strong>Guided try:</strong> say two of those pieces out loud in the answer box.</p>",
      teach:
        "Status 200 OK means success. Content-Type application/json means the body is JSON. After the blank line, the object with id 42 / Trail Camera is the body.",
      concepts: [
        { id: "status", label: "status code", terms: ["200", "ok", "status"] },
        { id: "type", label: "content type", terms: ["content-type", "json", "application/json"] },
        { id: "body", label: "response body", terms: ["body", "trail camera", "id", "price", "42"] },
        { id: "headers", label: "headers", terms: ["header", "content-length"] }
      ],
      passCount: 2,
      hints: [
        "What is the first number on the first line? What does Content-Type claim? What sits under the blank line?",
        "Point at 200 OK, application/json, and/or the Trail Camera body fields.",
        "Write: status 200 OK; Content-Type application/json; body describes product 42 / Trail Camera."
      ]
    },
    {
      id: "c-interpret",
      part: "C",
      phase: "INTERPRET",
      kind: "read",
      title: "Name the response pieces",
      body:
        "<p>Same response, fully labeled:</p><ul>" +
        "<li><strong>Status line:</strong> <code>HTTP/1.1 200 OK</code> — version, numeric status, reason phrase.</li>" +
        "<li><strong>Headers:</strong> <code>Content-Type</code> and <code>Content-Length</code> describe the body without being the body.</li>" +
        "<li><strong>Content type:</strong> <code>application/json</code> — parse as JSON, not HTML.</li>" +
        "<li><strong>Body:</strong> the JSON object — representation of product 42.</li>" +
        "</ul>" +
        "<p>Researcher habit: status first → headers next → body last.</p>"
    },
    {
      id: "d-try",
      part: "D",
      phase: "YOU TRY",
      kind: "exercise",
      title: "Independent try — a second pair",
      prompt:
        "Identify the HTTP method, host, path, content type, status code, and what the response body communicates.",
      instructorNote:
        "Same reading order as before: request first line + Host, then response status, headers, body.",
      body:
        "<p><strong>Independent try.</strong> Same skills, new example. Local training only — not real credentials; nothing is sent.</p>" +
        "<p>Reminder: method + path + Host = what was asked; status + headers + body = how the app answered.</p>" +
        "<p><strong>Request</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        TRY_REQUEST.replace(/</g, "&lt;") +
        "</pre>" +
        "<p><strong>Response</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        TRY_RESPONSE.replace(/</g, "&lt;") +
        "</pre>",
      teach:
        "Method POST, host training.hackbot.local, path /api/login, Content-Type application/json, status 401 Unauthorized, body: invalid credentials — the app refused the login.",
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
        "Look for POST, /api/login, Host training.hackbot.local, application/json, 401, and the invalid-credentials message.",
        "Method POST, host training.hackbot.local, path /api/login, Content-Type application/json, status 401, body: credentials invalid."
      ]
    },
    {
      id: "f-security",
      part: "F",
      phase: "APPLY",
      kind: "read",
      title: "Why researchers care",
      body:
        "<p>Security researchers care about <strong>requests</strong> because they show what the client asks the application to do — which resource, which method, which data.</p>" +
        "<p><strong>Responses</strong> show how the application handled that ask — success, refusal, redirect, error, and what was returned.</p>" +
        "<p>Much of web security work is carefully observing and comparing that exchange. This lesson does not teach exploitation. The skill is to <em>see the exchange clearly</em> first.</p>"
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
        "Name one or two fields and why they would change how you read the application’s behavior.",
      noteConcept: "HTTP researcher attention",
      body: "<p>Write from what you just inspected. Stored as a learning note, not a score.</p>",
      teach:
        "Example: status codes show success vs refusal; paths show which feature was touched; bodies and headers can reveal how the app explains a failure. That is observation, not an exploit.",
      concepts: [
        { id: "attention", label: "researcher attention", terms: ["header", "status", "body", "path", "method", "cookie", "auth", "token", "password", "error", "host", "why", "because"] }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one field you already named — a status, a path, a header, or a body error — and say what it would tell you.",
        "A researcher might watch methods and paths (what was asked), status codes (how it went), and bodies or headers that carry identity or errors.",
        "Example: status codes show success vs refusal; paths show which feature was touched; bodies and headers can reveal how the app explains a failure."
      ]
    }
  ];

  var FUTURE_LESSONS = [
    { id: "apis-json", title: "APIs and JSON" },
    { id: "structured-investigation", title: "Your First Structured Investigation" }
  ];

  var MODULE_1 = {
    id: "web-investigation-foundations",
    number: 1,
    title: "Web Investigation Foundations",
    loop: "Teach → Demonstrate → Guided try → Independent try → Reason → Reflect",
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

  if (Hackbot.Lesson4) {
    MODULE_1.lessons.push(Hackbot.Lesson4);
  }

  if (Hackbot.Lesson5) {
    MODULE_1.lessons.push(Hackbot.Lesson5);
  }

  if (Hackbot.Lesson6) {
    MODULE_1.lessons.push(Hackbot.Lesson6);
  }

  if (Hackbot.Lesson7) {
    MODULE_1.lessons.push(Hackbot.Lesson7);
  }

  if (Hackbot.Lesson8) {
    MODULE_1.lessons.push(Hackbot.Lesson8);
  }

  FUTURE_LESSONS.forEach(function (item, index) {
    MODULE_1.lessons.push({
      id: item.id,
      number: index + 9,
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
    LESSON_4_ID: "headers",
    LESSON_5_ID: "status-redirects",
    LESSON_6_ID: "parameters",
    LESSON_7_ID: "cookies",
    LESSON_8_ID: "devtools",
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
