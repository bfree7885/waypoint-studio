/**
 * Module 1 Lesson 3 — HTTP Requests and Responses.
 * Observes synthetic local traffic on Trail Supply via the Network panel.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-network",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Open the Network panel",
      prompt: "What kinds of resources do you see the browser requesting after you reload Trail Supply?",
      instructorNote:
        "Open Developer Tools on the Trail Supply tab, not inside the Hackbot preview. Reload once so the list fills.",
      body:
        "<p>Lessons 1 and 2 taught what a request looks like on paper and how a page is structured. Now you watch the browser <strong>actually send</strong> those requests.</p>" +
        "<p>The Network panel records requests the browser makes. Menus differ by browser:</p><ul>" +
        "<li>Right-click the page → <strong>Inspect</strong>, then find a tab named Network (or something close, such as Net)</li>" +
        "<li><kbd>F12</kbd> where supported, then Network</li>" +
        "<li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> (Windows/Linux) or <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd> (macOS)</li>" +
        "</ul>" +
        "<p>Then:</p><ol>" +
        "<li>Open Trail Supply in another tab</li>" +
        "<li>Open Network</li>" +
        "<li>Reload the page</li>" +
        "</ol>" +
        "<p>Exact type names vary. Name what you see: the document, a stylesheet, a script, maybe other files.</p>",
      successFeedback: "You watched the browser fetch the page’s own files. Next we will cause a request on purpose.",
      concepts: [
        { id: "doc", label: "document", terms: ["document", "html", "index", "page"] },
        { id: "css", label: "stylesheet", terms: ["css", "stylesheet", "store.css", "style"] },
        { id: "js", label: "script", terms: ["javascript", "js", "script", "app.js", "worker"] },
        { id: "other", label: "other resource", terms: ["image", "font", "resource", "request", "reload", "network"] }
      ],
      passCount: 2,
      hints: [
        "After reload, which files did the browser ask for to draw the shop?",
        "You should see the HTML document, store.css, and js/app.js — and possibly the service worker.",
        "Typical page-load requests: the document (Trail Supply HTML), the CSS stylesheet, and the JavaScript file. Those are resources, not exploits."
      ]
    },
    {
      id: "b-search",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Connect an action to a request",
      prompt:
        "Search for boots on Trail Supply, find that request in Network, and identify the HTTP method, path, query parameter name, and value.",
      instructorNote:
        "Keep Network open. Type boots in Search, submit, then click the request whose URL contains search.",
      body:
        "<p>Lesson 1: requests have methods, paths, headers, and responses.</p>" +
        "<p>Lesson 2: the search form described what the browser <em>may</em> submit (<code>GET</code>, action <code>/search</code>, input <code>q</code>).</p>" +
        "<p>Lesson 3: you are watching that submission happen.</p>" +
        "<p>On Trail Supply, search for <strong>boots</strong>. In Network, find a request that looks like <code>/search?q=boots</code> (your browser may show the full local URL). Disable cache if the list looks empty, then submit again.</p>",
      reveal:
        "<p>Method <code>GET</code>, path ending in <code>/search</code>, query name <code>q</code>, value <code>boots</code> — often written <code>GET /search?q=boots</code>.</p>",
      successFeedback: "You tied a UI action to a real GET. That is cause and effect, not a tool recipe.",
      concepts: [
        { id: "method", label: "GET method", terms: ["get", "method"] },
        { id: "path", label: "search path", terms: ["/search", "search"] },
        { id: "param", label: "q parameter", terms: ["q=boots", "?q", "parameter q", "name q", " q="] },
        { id: "value", label: "boots value", terms: ["boots"] }
      ],
      passCount: 3,
      hints: [
        "Which request appeared when you clicked Search? Method, path, and the part after ?",
        "GET, path /search, parameter q, value boots.",
        "The search form sent GET /search?q=boots. Method GET, path /search, query name q, value boots."
      ]
    },
    {
      id: "c-request",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Inspect request details",
      prompt: "What pieces of this request came from the form you inspected in Lesson 2?",
      instructorNote:
        "Open the search request. Look for the area showing headers, URL, method, and query parameters — labels vary by browser.",
      body:
        "<p>Click the search request. Your browser may group details as Headers, Payload, or Params. Teach the ideas, not one vendor’s tabs:</p><ul>" +
        "<li><strong>Request URL</strong> — where it went</li>" +
        "<li><strong>Request method</strong> — GET, POST, …</li>" +
        "<li><strong>Query string parameters</strong> — name/value pairs on a GET</li>" +
        "<li><strong>Request headers</strong> — metadata (Host, User-Agent, Accept, …)</li>" +
        "</ul>" +
        "<p>Compare that list to Lesson 2’s form: <code>action</code>, <code>method</code>, <code>name=\"q\"</code>, and the value you typed.</p>",
      successFeedback: "You mapped form fields onto a live request. The Network panel is the form, observed.",
      concepts: [
        { id: "action", label: "form action/path", terms: ["/search", "search", "action", "path", "url"] },
        { id: "method", label: "form method", terms: ["get", "method"] },
        { id: "name", label: "input name", terms: ["q", "name", "parameter"] },
        { id: "value", label: "entered value", terms: ["boots", "value"] }
      ],
      passCount: 2,
      hints: [
        "Which of action, method, input name, and typed value can you point at in the request?",
        "Path/action /search, method GET, parameter q, value boots — those came from the form plus what you typed.",
        "Lesson 2’s form gave GET + /search + name q. Your typing gave boots. Headers are extra metadata, not the form fields."
      ]
    },
    {
      id: "d-response",
      part: "D",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Inspect the search response",
      prompt: "What did the application return after the search request? Name status, content type, and what the body means.",
      instructorNote:
        "Stay on the same search request. Find status, response headers, and the response/preview body. Labels vary.",
      body:
        "<p>A request is half the story. Open the matching response:</p><ul>" +
        "<li><strong>Status code</strong> — a quick signal (200 here if the training search succeeded)</li>" +
        "<li><strong>Response headers</strong> — including Content-Type</li>" +
        "<li><strong>Body / Preview</strong> — the JSON the training handler returned</li>" +
        "</ul>" +
        "<p>This body is synthetic and local. It is not a live inventory API.</p>",
      reveal:
        "<p>Expect status <code>200</code>, <code>Content-Type: application/json</code>, and a JSON object with a <code>query</code> and <code>results</code> — a search answer, not an HTML shop page.</p>",
      successFeedback: "You read the reply, not just the ask. Status, type, and body are the three first looks.",
      concepts: [
        { id: "status", label: "status code", terms: ["200", "ok", "status"] },
        { id: "type", label: "content type", terms: ["json", "content-type", "application/json"] },
        { id: "body", label: "body meaning", terms: ["result", "query", "boots", "product", "trail camera", "body", "json"] }
      ],
      passCount: 2,
      hints: [
        "What number is the status? What does Content-Type say? What is the JSON trying to tell you?",
        "200, JSON, and a list of results for the query boots.",
        "Status 200 means the training search succeeded. Content-Type is JSON. The body reports the query and matching products — synthetic local data."
      ]
    },
    {
      id: "e-post",
      part: "E",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "GET vs POST — a synthetic login",
      prompt: "What is different between the search request and the login request?",
      instructorNote:
        "Use username student and password example. This always fails on purpose. Inspect method, body, Content-Type, status, and JSON error.",
      body:
        "<p>Submit the Account form with synthetic values:</p>" +
        "<p><code>username: student</code><br><code>password: example</code></p>" +
        "<p>No real authentication runs. The training handler should answer <code>401 Unauthorized</code> with JSON such as:</p>" +
        '<pre class="hb-http" tabindex="0">{\n  "error": "Invalid credentials"\n}</pre>' +
        "<p>In Network, inspect:</p><ul>" +
        "<li>Request method POST</li>" +
        "<li>Request payload / body (where the username and password were sent)</li>" +
        "<li>Content-Type</li>" +
        "<li>Response status and body</li>" +
        "</ul>" +
        "<p>POST is not “more secure” than GET by itself. It is a different way to send a request. Do not treat this as a password attack — it is a failed, local, synthetic login so you can see a body and a 401.</p>",
      successFeedback: "You compared GET-with-query to POST-with-body. Same shop, two different exchanges.",
      concepts: [
        { id: "getpost", label: "GET vs POST", terms: ["get", "post"] },
        { id: "where", label: "query vs body", terms: ["query", "body", "payload", "parameter"] },
        { id: "path", label: "different endpoint", terms: ["/login", "login", "/search", "search"] },
        { id: "status", label: "different status", terms: ["401", "200", "unauthorized", "invalid"] }
      ],
      passCount: 3,
      hints: [
        "Method, where the typed values sit, which path, and which status — what changed from search?",
        "Search was GET /search?q=… with 200. Login is POST /login with a JSON body and 401 Invalid credentials.",
        "GET puts boots on the query string; POST puts username/password in the request body. Different paths (/search vs /login) and statuses (200 vs 401). POST is not automatically safer."
      ]
    },
    {
      id: "f-headers",
      part: "F",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Headers vs body",
      prompt: "What is the difference between the response body and response headers?",
      instructorNote:
        "Pick either the search or login exchange. Find Host, User-Agent, Accept, Content-Type. Lesson 4 will go deeper.",
      body:
        "<p>Headers are metadata about the request or response — not the main payload.</p>" +
        "<p>On a request you will often see:</p><ul>" +
        "<li>Host</li><li>User-Agent</li><li>Accept</li><li>Content-Type when a body is sent</li>" +
        "</ul>" +
        "<p>On a response you will often see:</p><ul>" +
        "<li>Content-Type</li><li>Content-Length if present</li><li>Cache-related headers if the browser or handler sent them</li>" +
        "</ul>" +
        "<p>Look for the area showing request headers; your browser may label or arrange this differently. Do not memorize the whole header catalog yet.</p>",
      successFeedback: "Headers describe the message. The body is the message. That split is enough for now.",
      concepts: [
        { id: "headers", label: "headers as metadata", terms: ["header", "metadata", "host", "user-agent", "accept", "content-type", "content-length", "cache"] },
        { id: "body", label: "body as payload", terms: ["body", "payload", "json", "error", "result", "content"] }
      ],
      passCount: 2,
      hints: [
        "If you hid the JSON, what would still tell you it is JSON? If you hid the headers, what would still be the answer?",
        "Headers say how to handle the message (type, length, cache). The body is the search results or the error object.",
        "Response headers are metadata (Content-Type, Content-Length, Cache-Control). The response body is the JSON payload — results or Invalid credentials."
      ]
    },
    {
      id: "g-status",
      part: "G",
      phase: "INTERPRET",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Status codes as a signal",
      prompt: "Match the requests you observed with their status codes, and say what each status is signaling.",
      instructorNote:
        "Page load and search should be 200. Login should be 401. Optional: Lantern — not in catalog returns 404.",
      body:
        "<p>Status codes are a quick signal about how the application handled a request. You do not need a table of all codes.</p>" +
        "<p>From this page you can observe a small set:</p><ul>" +
        "<li><strong>200</strong> — success (document, CSS, JS, search, product 42)</li>" +
        "<li><strong>401</strong> — unauthorized / authentication failed (synthetic login)</li>" +
        "<li><strong>404</strong> — not found (try <strong>Lantern — not in catalog</strong>)</li>" +
        "</ul>" +
        "<p>Lesson 5 will explore status codes and redirects more deeply. For now, pair each action with the number you saw.</p>",
      successFeedback: "You used status as a signal, not as trivia. 200 / 401 / 404 already tell different stories.",
      concepts: [
        { id: "ok", label: "200 success", terms: ["200", "ok", "success"] },
        { id: "unauth", label: "401 unauthorized", terms: ["401", "unauthorized"] },
        { id: "missing", label: "404 not found", terms: ["404", "not found", "missing"] }
      ],
      passCount: 2,
      hints: [
        "Which number did search return? Login? A missing product?",
        "200 for page load and search, 401 for login, 404 for the lantern that is not in the catalog.",
        "200 signals the search/page succeeded. 401 signals the synthetic login was refused. 404 signals the lantern resource was not found."
      ]
    },
    {
      id: "h-pairs",
      part: "H",
      phase: "APPLY",
      kind: "exercise",
      title: "Think in request/response pairs",
      prompt: "Why is it useful to think about requests and responses as pairs rather than isolated messages?",
      instructorNote:
        "Cause and effect: an action produces a request, which produces a response, which may change what you see.",
      body:
        "<p>Hold three pairs in mind:</p>" +
        '<ol class="hb-flow" aria-label="Action to response">' +
        "<li>Action</li><li>Request</li><li>Response</li>" +
        "</ol>" +
        "<ul>" +
        "<li>Search “boots” → <code>GET /search?q=boots</code> → search JSON</li>" +
        "<li>Login attempt → <code>POST /login</code> → 401 JSON</li>" +
        "<li>Product click → <code>GET /products/42</code> → product JSON</li>" +
        "</ul>" +
        "<p>Isolated messages are easy to collect and hard to understand. Pairs show cause and effect.</p>",
      successFeedback: "You are mapping behavior, not collecting souvenirs from the Network panel.",
      concepts: [
        { id: "cause", label: "cause and effect", terms: ["cause", "effect", "action", "because", "pair", "together", "connect"] },
        { id: "compare", label: "compare behavior", terms: ["compare", "difference", "logic", "map", "behavior", "understand"] }
      ],
      passCount: 1,
      hints: [
        "If you only saved the 401, would you know which button caused it?",
        "Pairs let you connect UI actions to application behavior and compare search vs login.",
        "Seeing request and response together shows cause/effect, lets you compare behaviors, and maps what the UI asked the application to do."
      ]
    },
    {
      id: "i-challenge",
      part: "I",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Investigation challenge",
      prompt:
        "Generate and inspect at least three requests — page load, search, and login — then report the details asked below, plus one important difference between search and login.",
      instructorNote:
        "Free text is fine. Do not copy browser chrome labels exactly. Name method, path, parameters or body, status, and meaning.",
      body:
        "<p>On Trail Supply, with Network open, produce:</p>" +
        "<ol><li>Page load (reload)</li><li>Search</li><li>Login attempt</li></ol>" +
        "<p><strong>Page load</strong> — one resource, its method, its status.</p>" +
        "<p><strong>Search</strong> — method, path, parameter name, parameter value, status.</p>" +
        "<p><strong>Login</strong> — method, path, content type, where the submitted values appear, status, what the response means.</p>" +
        "<p>Then: one important difference you observed between search and login.</p>",
      reveal:
        "<ul>" +
        "<li>Page load: e.g. document or <code>store.css</code> / <code>app.js</code>, GET, 200</li>" +
        "<li>Search: GET, /search, q=boots, 200</li>" +
        "<li>Login: POST, /login, JSON body with username/password, 401, invalid credentials</li>" +
        "<li>Difference: query string vs request body; 200 vs 401</li>" +
        "</ul>",
      successFeedback: "That is a first traffic map: load, search, login — each a pair you can explain.",
      concepts: [
        { id: "load", label: "page load resource", terms: ["document", "css", "html", "app.js", "store.css", "script", "reload"] },
        { id: "get", label: "GET search", terms: ["get"] },
        { id: "searchpath", label: "search path", terms: ["/search", "search"] },
        { id: "q", label: "q parameter", terms: ["q=", "q=boots", "boots", "?q"] },
        { id: "post", label: "POST login", terms: ["post"] },
        { id: "loginpath", label: "login path", terms: ["/login", "login"] },
        { id: "body", label: "body vs query", terms: ["body", "payload", "json", "query"] },
        { id: "stat", label: "statuses", terms: ["200", "401"] },
        { id: "meaning", label: "401 meaning", terms: ["invalid", "unauthorized", "credentials", "refused", "failed"] }
      ],
      passCount: 6,
      hints: [
        "Reload, search boots, submit student/example. Write method+path+status for each, and where the typed values sat.",
        "Load: GET document/css/js 200. Search: GET /search?q=boots 200. Login: POST /login JSON body 401 invalid credentials. Difference: query vs body (and 200 vs 401).",
        "Page load GET 200 (html/css/js). Search GET /search q=boots 200. Login POST /login, values in the request body, Content-Type JSON, 401 Invalid credentials. Search uses a query string; login uses a body."
      ]
    },
    {
      id: "j-model",
      part: "J",
      phase: "APPLY",
      kind: "read",
      title: "Observe before you modify",
      body:
        "<p>A working mental model:</p>" +
        '<ol class="hb-flow" aria-label="User action to visible result">' +
        "<li>User action</li><li>Request</li><li>Application processing</li><li>Response</li><li>Visible result</li>" +
        "</ol>" +
        "<p>Web-security investigation often begins by understanding these transitions — not by changing them.</p>" +
        "<p class=\"hb-loop\">OBSERVE BEFORE MODIFY</p>" +
        "<p>This lesson does not teach request interception or editing. You now know you can <em>see</em> what the browser is doing.</p>"
    },
    {
      id: "k-reflect",
      part: "K",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "What the Network panel showed",
      title: "Reflection",
      prompt: "What did the Network panel show you that you could not learn from the rendered page alone?",
      instructorNote:
        "Name one traffic fact — a query string, a POST body, a 401, a JSON body — that the shopper UI did not print.",
      body: "<p>Write from the requests you generated. This is stored as a learning note, not a score.</p>",
      concepts: [
        { id: "insight", label: "network insight", terms: ["request", "response", "header", "status", "body", "query", "post", "401", "json", "network", "not"] }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one thing that only appeared in Network.",
        "Query strings, POST bodies, status codes, and JSON errors are easy examples.",
        "Example: the rendered page does not show GET /search?q=boots or the 401 JSON; Network does."
      ]
    }
  ];

  Hackbot.Lesson3 = {
    id: "http-pair",
    number: 3,
    title: "HTTP Requests and Responses",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Observe before modify",
    completeBanner:
      "Lesson 3 is complete. You can review steps; Lessons 4–10 are not built yet.",
    goal: "Watch Trail Supply generate local GET and POST traffic in the Network panel, and read method, path, parameters, headers, status, and body as pairs.",
    steps: STEPS
  };
})(window);
