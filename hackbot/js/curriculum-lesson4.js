/**
 * Module 1 Lesson 4 — Headers.
 * Deepens Network-panel observation of request/response metadata on Trail Supply.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var HEADER_LINE_EXAMPLE =
    "Content-Type: application/json\n" +
    "Cache-Control: no-store\n" +
    "Host: 127.0.0.1:18081";

  var STEPS = [
    {
      id: "a-what",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "What headers are",
      prompt:
        "In your own words, what are HTTP headers, and how do they differ from the message body?",
      instructorNote:
        "Stay with the idea of metadata versus payload. You do not need a catalog of header names yet.",
      body:
        "<p>Lesson 3 taught you to watch <strong>requests and responses</strong> as pairs. Lesson 4 zooms in on one part of those messages: <strong>headers</strong>.</p>" +
        "<p>Headers are <strong>metadata</strong> attached to an HTTP request or response. They describe how to handle the message — who it is for, what kind of content it carries, whether it may be cached — without being the main payload.</p>" +
        "<p>The <strong>body</strong> is the payload itself: HTML, JSON search results, an error object, and so on.</p>" +
        "<p>Think of a parcel: headers are the labels on the outside; the body is what is inside the box.</p>",
      successFeedback: "Headers describe the message. The body is the message. That split is the foundation for this lesson.",
      concepts: [
        { id: "meta", label: "headers as metadata", terms: ["header", "metadata", "meta", "describe", "about"] },
        { id: "body", label: "body as payload", terms: ["body", "payload", "content", "json", "inside", "message"] }
      ],
      passCount: 2,
      hints: [
        "If you covered the JSON, what would still tell you it is JSON? If you covered the headers, what would still be the answer?",
        "Headers are labels (type, host, cache). The body is the search results or error object.",
        "HTTP headers are metadata about the request or response. The body is the payload — for example JSON results — not the headers themselves."
      ]
    },
    {
      id: "b-locate",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Find headers in DevTools",
      prompt:
        "Search for boots on Trail Supply, open that request in Network, and say where you found Request Headers and Response Headers.",
      instructorNote:
        "Open Developer Tools on the Trail Supply tab. Submit Search, click the /search request, then look for a Headers section (labels vary by browser).",
      body:
        "<p>Open Trail Supply in another tab (or use the preview). Keep Network open.</p>" +
        "<ol>" +
        "<li>Search for <strong>boots</strong></li>" +
        "<li>Click the request whose path ends in <code>/search</code></li>" +
        "<li>Find the area that lists <strong>Request Headers</strong> and <strong>Response Headers</strong></li>" +
        "</ol>" +
        "<p>Browsers label this differently — Headers, Message, or similar. Name what you opened and that you can see both request and response header lists.</p>",
      reveal:
        "<p>On the search request’s detail pane you should see separate request-header and response-header lists (or one Headers view with both groups).</p>",
      successFeedback: "You found the header lists on a live request. Next you will read individual lines.",
      concepts: [
        { id: "network", label: "Network panel", terms: ["network", "devtools", "developer", "inspect"] },
        { id: "req", label: "request headers", terms: ["request header", "request headers"] },
        { id: "res", label: "response headers", terms: ["response header", "response headers"] },
        { id: "search", label: "search request", terms: ["search", "/search", "boots"] }
      ],
      passCount: 3,
      hints: [
        "After Search, which request did you click, and which two header groups did you open?",
        "Click GET /search?q=boots, then open Request Headers and Response Headers in that request’s details.",
        "You opened the Network panel, selected the search request, and located Request Headers and Response Headers on that exchange."
      ]
    },
    {
      id: "c-name-value",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Header name and value",
      prompt:
        "Look at these header lines. For each, what is the header name and what is its value?",
      instructorNote:
        "Point at the token before the colon and the text after it. Exact host ports may differ on your machine — focus on the pattern.",
      body:
        "<p>Headers are written as:</p>" +
        '<pre class="hb-http" tabindex="0">Header-Name: value</pre>' +
        "<p>The <strong>name</strong> sits before the colon. The <strong>value</strong> sits after it.</p>" +
        "<p>Synthetic examples (shape matches what Trail Supply’s training handler can show):</p>" +
        '<pre class="hb-http" tabindex="0">' +
        HEADER_LINE_EXAMPLE.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>Name each line’s name and value. Host may use a different port on your machine — that is fine.</p>",
      reveal:
        "<ul>" +
        "<li><code>Content-Type</code> → <code>application/json</code></li>" +
        "<li><code>Cache-Control</code> → <code>no-store</code></li>" +
        "<li><code>Host</code> → the machine/port the browser contacted</li>" +
        "</ul>",
      successFeedback: "You can split a header line into name and value. That reading skill transfers to any Network panel.",
      concepts: [
        { id: "ctype", label: "Content-Type name/value", terms: ["content-type", "application/json", "json"] },
        { id: "cache", label: "Cache-Control name/value", terms: ["cache-control", "no-store", "cache"] },
        { id: "host", label: "Host name/value", terms: ["host", "127.0.0.1", "localhost"] },
        { id: "structure", label: "name:value structure", terms: ["name", "value", "colon", ":", "before", "after"] }
      ],
      passCount: 3,
      hints: [
        "What sits left of each colon? What sits right?",
        "Content-Type is application/json. Cache-Control is no-store. Host names the machine you contacted.",
        "Each line is Name: value — Content-Type: application/json, Cache-Control: no-store, Host: your local host/port."
      ]
    },
    {
      id: "d-request",
      part: "D",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Read request headers",
      prompt:
        "On the boots search request, identify Host, User-Agent, and Accept — and say briefly what each communicates.",
      instructorNote:
        "Exact User-Agent and Accept strings vary by browser. Name the header and the idea (which server, which client, what representation is preferred).",
      body:
        "<p>On the same <code>GET /search?q=boots</code> exchange, open <strong>Request Headers</strong>. Look for:</p>" +
        "<ul>" +
        "<li><strong>Host</strong> — which server/name the browser is talking to</li>" +
        "<li><strong>User-Agent</strong> — which kind of client sent the request</li>" +
        "<li><strong>Accept</strong> — what representations the client prefers</li>" +
        "</ul>" +
        "<p>You may also see <strong>Referer</strong> (sometimes spelled Referrer in UI) when the browser records the page that triggered the request — mention it only if you actually see it.</p>" +
        "<p>Do not memorize the full strings. Name the header and what job it is doing.</p>",
      successFeedback: "You read live request metadata: who is asked, who is asking, and what they prefer to receive.",
      concepts: [
        { id: "host", label: "Host", terms: ["host"] },
        { id: "ua", label: "User-Agent", terms: ["user-agent", "user agent", "browser", "client"] },
        { id: "accept", label: "Accept", terms: ["accept"] }
      ],
      passCount: 3,
      hints: [
        "Which header names the server? Which describes the browser? Which describes preferred content?",
        "Host = server. User-Agent = client/browser. Accept = preferred response types.",
        "Host says which host was contacted. User-Agent describes the browser/client. Accept describes what content types the client prefers."
      ]
    },
    {
      id: "e-req-ctype",
      part: "E",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Request Content-Type on login",
      prompt:
        "Submit the synthetic login, open that POST in Network, and identify the request Content-Type header and what it tells the server about the body.",
      instructorNote:
        "Use any username/password. The training login always returns 401. Focus on the request’s Content-Type, not cracking credentials.",
      body:
        "<p>On Trail Supply, submit Account sign-in (synthetic values such as <code>student</code> / <code>example</code> are fine).</p>" +
        "<p>In Network, open the <code>POST /login</code> request. Find <strong>Request Headers</strong> and locate <code>Content-Type</code>.</p>" +
        "<p>Trail Supply’s script sends JSON, so you should see something like <code>Content-Type: application/json</code>. That tells the server how to parse the request body — it is not the body itself.</p>" +
        "<p>This is not a credential attack. It is a failed local login so you can inspect a request that actually carries a body.</p>",
      reveal:
        "<p>Request header <code>Content-Type: application/json</code> means the body is JSON, not form-urlencoded HTML fields.</p>",
      successFeedback: "You connected a body-bearing POST to the header that labels how that body is encoded.",
      concepts: [
        { id: "post", label: "POST login", terms: ["post", "login", "/login"] },
        { id: "ctype", label: "Content-Type json", terms: ["content-type", "application/json", "json"] },
        { id: "body", label: "describes the body", terms: ["body", "parse", "encode", "format", "json"] }
      ],
      passCount: 2,
      hints: [
        "After sign-in, which request is POST /login, and which request header names the body format?",
        "Look for Content-Type: application/json on the request — it labels the JSON body.",
        "POST /login includes Content-Type: application/json so the server knows the body is JSON, not the credentials themselves."
      ]
    },
    {
      id: "f-response",
      part: "F",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Read response headers",
      prompt:
        "On the search or login response, identify Content-Type, Content-Length (if present), and Cache-Control — and say what each is telling you.",
      instructorNote:
        "Trail Supply’s training handler sets Content-Type: application/json, Content-Length, and Cache-Control: no-store. Confirm those on a response you generated.",
      body:
        "<p>Open <strong>Response Headers</strong> on either the search (200) or login (401) exchange. Trail Supply’s synthetic handler returns:</p>" +
        "<ul>" +
        "<li><strong>Content-Type: application/json</strong> — parse the body as JSON, not HTML</li>" +
        "<li><strong>Content-Length</strong> — size of the body in bytes (when present)</li>" +
        "<li><strong>Cache-Control: no-store</strong> — do not keep a reusable cached copy of this training response</li>" +
        "</ul>" +
        "<p>This lesson does not invent a Server header. Only name headers you can actually see.</p>",
      reveal:
        "<p>Expect <code>Content-Type: application/json</code>, a numeric <code>Content-Length</code>, and <code>Cache-Control: no-store</code> on the synthetic responses.</p>",
      successFeedback: "You read response metadata that Trail Supply actually generates — type, size, and cache policy.",
      concepts: [
        { id: "ctype", label: "Content-Type json", terms: ["content-type", "application/json", "json"] },
        { id: "length", label: "Content-Length", terms: ["content-length", "length", "bytes", "size"] },
        { id: "cache", label: "Cache-Control no-store", terms: ["cache-control", "no-store", "cache"] }
      ],
      passCount: 3,
      hints: [
        "Which response header says JSON? Which gives a byte size? Which mentions cache?",
        "Content-Type application/json, Content-Length with a number, Cache-Control no-store.",
        "Response headers include Content-Type: application/json, Content-Length for the body size, and Cache-Control: no-store from the training handler."
      ]
    },
    {
      id: "g-vs-body",
      part: "G",
      phase: "INTERPRET",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Headers versus body",
      prompt:
        "Using one Trail Supply exchange, explain the difference between what you learn from response headers and what you learn from the response body.",
      instructorNote:
        "Pick search or login. Headers say how to treat the message; the body is the results object or the Invalid credentials error.",
      body:
        "<p>Lesson 3 introduced headers vs body. Confirm it on a live exchange:</p>" +
        "<ul>" +
        "<li><strong>Headers</strong> — Content-Type, Content-Length, Cache-Control, …</li>" +
        "<li><strong>Body</strong> — the JSON with <code>results</code> or <code>error: Invalid credentials</code></li>" +
        "</ul>" +
        "<p>If you only read headers, you know the shape and handling rules. If you only read the body, you know the answer or error text — but not necessarily how the browser should treat it.</p>",
      successFeedback: "You can separate metadata from payload on a real pair. That habit prevents confusing labels with content.",
      concepts: [
        { id: "headers", label: "headers metadata", terms: ["header", "metadata", "content-type", "cache", "length"] },
        { id: "body", label: "body payload", terms: ["body", "json", "result", "error", "invalid", "payload"] },
        { id: "diff", label: "difference", terms: ["difference", "versus", "vs", "not", "instead", "unlike"] }
      ],
      passCount: 2,
      hints: [
        "What would you still know if the JSON were hidden? What would you still know if the headers were hidden?",
        "Headers: type/size/cache. Body: search results or Invalid credentials.",
        "Response headers are metadata (for example Content-Type and Cache-Control). The body is the JSON payload — results or an error — not the headers."
      ]
    },
    {
      id: "h-why",
      part: "H",
      phase: "APPLY",
      kind: "exercise",
      title: "Why researchers read headers",
      prompt:
        "Why might an authorized web researcher look at request and response headers during an investigation?",
      instructorNote:
        "Stay observational: understand what the client sent and what the server returned. No exploitation recipes.",
      body:
        "<p>Headers help an authorized investigator:</p>" +
        "<ul>" +
        "<li>See what the <strong>client</strong> is sending (Host, User-Agent, Accept, Content-Type)</li>" +
        "<li>See what the <strong>server</strong> is returning (Content-Type, cache policy, length)</li>" +
        "<li>Identify <strong>content types</strong> before assuming HTML or JSON</li>" +
        "<li>Notice <strong>context clues</strong> worth comparing across requests</li>" +
        "<li>Spot behavior that deserves a closer look — still without changing the target</li>" +
        "</ul>" +
        "<p>This lesson does not teach modifying headers, bypassing controls, or attacking credentials. Observation first.</p>",
      successFeedback: "You framed headers as investigation context, not as an attack surface checklist.",
      concepts: [
        { id: "client", label: "understand client", terms: ["client", "request", "send", "browser", "user-agent", "accept", "host"] },
        { id: "server", label: "understand server", terms: ["server", "response", "return", "content-type", "cache"] },
        { id: "type", label: "content types", terms: ["content-type", "type", "json", "html"] },
        { id: "observe", label: "observational reason", terms: ["understand", "compare", "observe", "investigate", "clue", "context", "behavior"] }
      ],
      passCount: 2,
      hints: [
        "Name one thing headers reveal about the client and one about the server or content type.",
        "Researchers read headers to understand what was sent and returned, and to identify content types before digging into bodies.",
        "Authorized researchers inspect headers to understand client requests and server responses, identify content types, and notice context clues — observation, not exploitation."
      ]
    },
    {
      id: "i-challenge",
      part: "I",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Headers investigation challenge",
      prompt:
        "Generate search and login traffic, then report: one request header with its meaning, one response header with its meaning, how headers differ from the body on one of those exchanges, and one reason a researcher would care.",
      instructorNote:
        "Free text is fine. Prefer headers Trail Supply actually shows: Host/User-Agent/Accept/Content-Type on requests; Content-Type/Content-Length/Cache-Control on responses.",
      body:
        "<p>With Network open on Trail Supply:</p>" +
        "<ol>" +
        "<li>Search for boots</li>" +
        "<li>Submit the synthetic login</li>" +
        "</ol>" +
        "<p>Then write:</p>" +
        "<ul>" +
        "<li>One <strong>request</strong> header name + value idea + what it communicates</li>" +
        "<li>One <strong>response</strong> header name + value idea + what it communicates</li>" +
        "<li>How that exchange’s <strong>headers differ from its body</strong></li>" +
        "<li>One sentence on <strong>why</strong> an authorized researcher would look at headers</li>" +
        "</ul>",
      reveal:
        "<ul>" +
        "<li>Request example: Host / User-Agent / Accept / Content-Type: application/json on login</li>" +
        "<li>Response example: Content-Type: application/json, Cache-Control: no-store, Content-Length</li>" +
        "<li>Headers = metadata; body = JSON results or Invalid credentials</li>" +
        "<li>Why: understand what client and server exchanged before changing anything</li>" +
        "</ul>",
      successFeedback: "That is a first headers map: request metadata, response metadata, body contrast, and investigator purpose.",
      concepts: [
        { id: "req", label: "request header", terms: ["host", "user-agent", "accept", "content-type", "request"] },
        { id: "res", label: "response header", terms: ["content-type", "cache-control", "content-length", "no-store", "response", "json"] },
        { id: "vs", label: "headers vs body", terms: ["body", "payload", "metadata", "difference", "versus", "vs"] },
        { id: "why", label: "researcher why", terms: ["understand", "observe", "investigate", "client", "server", "type", "because", "why"] }
      ],
      passCount: 4,
      hints: [
        "Name one request header, one response header, say body ≠ headers, and give one observational why.",
        "Example: request Host or Content-Type; response Content-Type or Cache-Control no-store; body is JSON; why = understand the exchange.",
        "Request: Host/User-Agent/Accept or login Content-Type application/json. Response: Content-Type application/json, Cache-Control no-store, or Content-Length. Headers are metadata; the body is the JSON. Researchers read headers to understand what was sent and returned."
      ]
    },
    {
      id: "j-model",
      part: "J",
      phase: "APPLY",
      kind: "read",
      title: "A headers mental model",
      body:
        "<p>Carry this model forward:</p>" +
        '<ol class="hb-flow" aria-label="Message parts">' +
        "<li>Request or response line</li>" +
        "<li>Headers (metadata)</li>" +
        "<li>Optional body (payload)</li>" +
        "</ol>" +
        "<p>On Trail Supply you practiced reading:</p>" +
        "<ul>" +
        "<li>Request headers such as Host, User-Agent, Accept, and Content-Type when a body is sent</li>" +
        "<li>Response headers such as Content-Type, Content-Length, and Cache-Control</li>" +
        "</ul>" +
        "<p class=\"hb-loop\">OBSERVE BEFORE MODIFY</p>" +
        "<p>Lesson 5 will go deeper on status codes and redirects. You now know headers are readable metadata — not the payload, and not an invitation to attack.</p>"
    },
    {
      id: "k-reflect",
      part: "K",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "What headers revealed",
      title: "Reflection",
      prompt:
        "What did inspecting headers show you that you would not have learned from the rendered Trail Supply page alone?",
      instructorNote:
        "Name one header fact — Content-Type, Cache-Control, Host, User-Agent, or request Content-Type on login — that the shopper UI does not print.",
      body: "<p>Write from the exchanges you inspected. This is stored as a learning note, not a score.</p>",
      concepts: [
        {
          id: "insight",
          label: "header insight",
          terms: [
            "header",
            "content-type",
            "cache",
            "host",
            "user-agent",
            "accept",
            "metadata",
            "json",
            "no-store",
            "not",
            "visible"
          ]
        }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one header fact the shop page never printed as shopper copy.",
        "Content-Type, Cache-Control no-store, Host, or login’s request Content-Type are easy examples.",
        "Example: the rendered page does not show Cache-Control: no-store or Content-Type: application/json; Network headers do."
      ]
    }
  ];

  Hackbot.Lesson4 = {
    id: "headers",
    number: 4,
    title: "Headers",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    completeBanner:
      "Lesson 4 is complete. You can review steps or continue to Lesson 5 — Status Codes and Redirects.",
    goal:
      "Recognize HTTP headers as request/response metadata, inspect them in the Network panel on Trail Supply, and explain why authorized researchers read selected headers.",
    steps: STEPS
  };
})(window);
