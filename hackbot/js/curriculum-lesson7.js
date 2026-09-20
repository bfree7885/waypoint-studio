/**
 * Module 1 Lesson 7 — Cookies and Sessions.
 * Introduces application state via a synthetic Trail Supply demo cookie/session lab.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-state-problem",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "The state problem",
      prompt:
        "If two separate GET requests look alike, how could an application still treat them as part of the same ongoing interaction?",
      instructorNote:
        "Start from continuity, not cookie jargon. HTTP exchanges are separate; applications often need memory.",
      body:
        "<p>Lessons 1–6 taught you to see pages, requests, headers, status codes, redirects, and user input.</p>" +
        "<p>Lesson 7 introduces <strong>state</strong> — continuity across requests.</p>" +
        "<p>Each HTTP request/response pair is its own exchange. Yet applications often need to remember something between visits: a cart, a preference, or “this browser already started a demo session.”</p>" +
        "<p>Core question: <em>How can an application remember something about one request when HTTP requests themselves are separate exchanges?</em></p>" +
        "<p>This lesson is observational. It does not teach stealing, forging, hijacking, or bypassing sessions.</p>",
      successFeedback: "Separate requests need an extra mechanism if the application must remember prior interaction.",
      concepts: [
        { id: "separate", label: "separate requests", terms: ["separate", "individual", "each", "own", "stateless", "exchange"] },
        { id: "continuity", label: "continuity / remember", terms: ["remember", "state", "continu", "same", "session", "across", "between"] }
      ],
      passCount: 2,
      hints: [
        "What is missing if the server only sees two identical GETs with no extra context?",
        "HTTP exchanges are separate; applications need a way to associate later requests with earlier ones.",
        "Because each HTTP request is a separate exchange, the application needs some form of state or identifier to recognize continuity between requests."
      ]
    },
    {
      id: "b-cookie",
      part: "B",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "What a cookie is",
      prompt:
        "In your own words, what is a cookie, and what job does it do for a browser talking to a site?",
      instructorNote:
        "Small browser-managed data associated with a site, often sent on later requests.",
      body:
        "<p>A <strong>cookie</strong> is a small piece of data the browser can store for a site and, when appropriate, send again on later requests to that site.</p>" +
        "<p>Mental model:</p>" +
        '<ol class="hb-flow" aria-label="Cookie continuity model">' +
        "<li>Browser sends a request</li>" +
        "<li>Application responds, sometimes with state information</li>" +
        "<li>Browser stores an applicable cookie</li>" +
        "<li>Later request includes that cookie</li>" +
        "<li>Application can associate the request with prior state</li>" +
        "</ol>" +
        "<p>Not every cookie is an authentication cookie. Trail Supply’s demo cookie is training-only.</p>",
      successFeedback: "Cookies help carry small site-associated data across later requests.",
      concepts: [
        { id: "cookie", label: "cookie", terms: ["cookie"] },
        { id: "store", label: "browser stores", terms: ["store", "browser", "save", "keep"] },
        { id: "later", label: "sent later", terms: ["later", "next", "send", "request", "again", "include"] }
      ],
      passCount: 2,
      hints: [
        "Where is the data kept, and when does it travel again?",
        "The browser stores site-associated data and may send it on later requests.",
        "A cookie is small browser-managed data for a site that can be sent again with later requests so the application can recognize continuity."
      ]
    },
    {
      id: "c-name-value",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Cookie name and value",
      prompt:
        "Using trail_session=demo-trail-7 as the example, what is the cookie name and what is the cookie value?",
      instructorNote:
        "Same name/value discipline as Lesson 6 parameters.",
      body:
        "<p>Like query parameters, cookies have a <strong>name</strong> and a <strong>value</strong>.</p>" +
        "<p>Trail Supply’s synthetic demo cookie:</p>" +
        "<p><code>trail_session=demo-trail-7</code></p>" +
        "<ul>" +
        "<li><strong>Name:</strong> <code>trail_session</code></li>" +
        "<li><strong>Value:</strong> <code>demo-trail-7</code> — a fixed training identifier, not a password and not real auth</li>" +
        "</ul>" +
        "<p>Cookies are also associated with a site (origin) and often a path. Investigators note name, value, and where the cookie applies.</p>",
      successFeedback: "Name labels the cookie; value is the stored data — here a harmless training id.",
      concepts: [
        { id: "name", label: "trail_session", terms: ["trail_session", "name"] },
        { id: "value", label: "demo-trail-7", terms: ["demo-trail-7", "value", "demo"] }
      ],
      passCount: 2,
      hints: [
        "Which token is left of the equals sign?",
        "Name trail_session; value demo-trail-7.",
        "Cookie name is trail_session; cookie value is demo-trail-7."
      ]
    },
    {
      id: "d-set-cookie",
      part: "D",
      phase: "DEMONSTRATE",
      kind: "exercise",
      title: "Set-Cookie response direction",
      prompt:
        "Which direction is Set-Cookie — request or response — and what does it ask the browser to do?",
      instructorNote:
        "Connect to Lesson 4 headers. Response asks the browser to store.",
      body:
        "<p>Lesson 4 taught headers as metadata. For cookies, the key response header on a normal server is:</p>" +
        "<p><code>Set-Cookie: …</code></p>" +
        "<p><strong>Response → browser:</strong> Set-Cookie asks the browser to store (or update) a cookie.</p>" +
        "<p>On Trail Supply, <strong>Start demo session</strong> issues <code>GET session/start</code>. In Network, open that response and look for:</p>" +
        "<ul>" +
        "<li><code>X-Training-Set-Cookie: trail_session=demo-trail-7; …</code> — training mirror of Set-Cookie</li>" +
        "<li>JSON field <code>setCookieLine</code> with the same string</li>" +
        "</ul>" +
        "<p><strong>Why a mirror?</strong> Service-worker responses cannot reliably expose the real <code>Set-Cookie</code> header (it is a forbidden response header for SW). The lab still teaches the Set-Cookie <em>direction and content</em> honestly, then mirrors the same cookie with <code>document.cookie</code> so Application → Cookies shows <code>trail_session</code>.</p>",
      successFeedback: "Set-Cookie is the response direction that asks the browser to store a cookie — this lab shows that content via a training mirror.",
      concepts: [
        { id: "header", label: "Set-Cookie", terms: ["set-cookie", "set cookie", "x-training-set-cookie", "setcookieline"] },
        { id: "response", label: "response direction", terms: ["response", "server", "application"] },
        { id: "store", label: "store cookie", terms: ["store", "save", "browser", "keep"] }
      ],
      passCount: 2,
      hints: [
        "Is Set-Cookie something the client sends, or something the application returns?",
        "It is response-direction storage. On Trail Supply look for X-Training-Set-Cookie or setCookieLine.",
        "Set-Cookie is a response header that asks the browser to store a cookie. This SW lab shows the same line as X-Training-Set-Cookie / setCookieLine because real Set-Cookie is forbidden on service-worker responses."
      ]
    },
    {
      id: "e-cookie-header",
      part: "E",
      phase: "DEMONSTRATE",
      kind: "exercise",
      title: "Cookie request direction",
      prompt:
        "After a demo session exists, which request-direction header carries the cookie name=value on a normal server, and what does Trail Supply show instead because of the service worker?",
      instructorNote:
        "Teach Cookie request header conceptually; lab uses X-Trail-Training-Cookie mirror because SW cannot read Cookie.",
      body:
        "<p>Later, when the browser has an applicable cookie, a normal server would receive:</p>" +
        "<p><code>Cookie: trail_session=demo-trail-7</code></p>" +
        "<p><strong>Browser → application:</strong> the <code>Cookie</code> request header carries applicable stored cookies.</p>" +
        "<p>Direction pair to memorize:</p>" +
        "<ul>" +
        "<li><strong>RESPONSE:</strong> <code>Set-Cookie: …</code></li>" +
        "<li><strong>LATER REQUEST:</strong> <code>Cookie: …</code></li>" +
        "</ul>" +
        "<p><strong>Trail Supply limitation:</strong> service workers cannot read the browser’s <code>Cookie</code> header on <code>FetchEvent.request</code>. After start, <strong>Check session status</strong> therefore also sends <code>X-Trail-Training-Cookie: trail_session=demo-trail-7</code> — the same name=value — so the lab can recognize state. Inspect that header in Network, and confirm <code>trail_session</code> in Application → Cookies.</p>",
      successFeedback: "Cookie is the request-direction header; this lab mirrors it as X-Trail-Training-Cookie for the SW.",
      concepts: [
        { id: "cookie-hdr", label: "Cookie header", terms: ["cookie:", "cookie header", "x-trail-training-cookie", "request header"] },
        { id: "request", label: "request direction", terms: ["request", "later", "send", "browser"] },
        { id: "pair", label: "set-cookie vs cookie", terms: ["set-cookie", "response", "pair", "direction", "mirror"] }
      ],
      passCount: 2,
      hints: [
        "Which header name is used on the way back to the application on a normal server?",
        "Cookie on the request; Trail Supply shows X-Trail-Training-Cookie as a SW-readable mirror.",
        "On later requests a normal browser sends Cookie: trail_session=demo-trail-7. This SW lab mirrors that pair as X-Trail-Training-Cookie because the service worker cannot read Cookie."
      ]
    },
    {
      id: "f-observe",
      part: "F",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Observe synthetic Trail Supply state",
      prompt:
        "Click Check session status (expect none), then Start demo session, then Check session status again. What Set-Cookie or cookie name/value did you observe, and what did the status JSON say after start?",
      instructorNote:
        "Expect session:none → start with trail_session=demo-trail-7 → session:recognized. Point learners at Network + Application → Cookies.",
      body:
        "<p>On Trail Supply, open Network (and optionally Application → Cookies).</p>" +
        "<ol>" +
        "<li><strong>Check session status</strong> — expect JSON with <code>session: \"none\"</code></li>" +
        "<li><strong>Start demo session</strong> — inspect <code>X-Training-Set-Cookie</code> / <code>setCookieLine</code> for <code>trail_session=demo-trail-7</code></li>" +
        "<li>Confirm Application → Cookies shows <code>trail_session</code></li>" +
        "<li><strong>Check session status</strong> again — expect <code>session: \"recognized\"</code>, <code>cartItems: 0</code>, and request header <code>X-Trail-Training-Cookie</code></li>" +
        "</ol>",
      reveal:
        "<p>Before: no demo session. After start: cookie <code>trail_session=demo-trail-7</code>; status returns <code>recognized</code>.</p>",
      successFeedback: "You watched state appear: none → demo cookie → recognized.",
      concepts: [
        { id: "none", label: "session none", terms: ["none", "before", "absent"] },
        { id: "cookie", label: "trail_session", terms: ["trail_session", "demo-trail-7", "set-cookie", "cookie", "x-training-set-cookie"] },
        { id: "recognized", label: "recognized", terms: ["recognized", "after", "status", "cart"] }
      ],
      passCount: 3,
      hints: [
        "Compare the first status JSON to the second, and name the cookie you saw.",
        "Start creates trail_session=demo-trail-7; later status becomes recognized.",
        "First status is none; after Start demo session you see trail_session=demo-trail-7 and status recognized."
      ]
    },
    {
      id: "g-vs-session",
      part: "G",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Cookie versus session",
      prompt:
        "Is a cookie the same thing as a session? Using trail_session=demo-trail-7, explain the difference in one or two sentences.",
      instructorNote:
        "COOKIE ≠ SESSION. Cookie may carry an id; session is application/server-side state concept.",
      body:
        "<p><strong>COOKIE ≠ SESSION</strong></p>" +
        "<ul>" +
        "<li>A <strong>cookie</strong> is browser-managed data (name/value, often with attributes).</li>" +
        "<li>A <strong>session</strong> is an application/server-side idea of ongoing state.</li>" +
        "</ul>" +
        "<p>Conceptual model:</p>" +
        "<p><code>Cookie: session_id=abc123</code> does <em>not</em> mean all session data lives in the cookie. The application might use <code>abc123</code> to look up server-side state.</p>" +
        "<p>On Trail Supply, <code>demo-trail-7</code> is a synthetic identifier. The JSON fields like <code>session: \"recognized\"</code> and <code>cartItems: 0</code> stand in for harmless application state — not a password vault.</p>",
      successFeedback: "The cookie can identify; the session is the application’s remembered state.",
      concepts: [
        { id: "not-same", label: "not the same", terms: ["different", "versus", "vs", "≠", "!=", "unlike"] },
        { id: "id", label: "identifier", terms: ["identifier", "id", "value", "demo-trail-7", "look up", "lookup"] },
        { id: "server", label: "server/app state", terms: ["server", "application", "state", "session", "side"] }
      ],
      passCount: 2,
      hints: [
        "What lives in the browser versus what the application remembers?",
        "Cookie holds an id; session is application state looked up with that id.",
        "A cookie is not the same as a session — the cookie may carry an identifier like demo-trail-7 while the session is application/server-side state associated with that id."
      ]
    },
    {
      id: "h-attributes",
      part: "H",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Useful cookie attributes",
      prompt:
        "Name two cookie attributes and what each communicates at a high level (for example Path, Max-Age, Secure, HttpOnly, or SameSite).",
      instructorNote:
        "Introductory only. Hands-on: Path, Max-Age, SameSite appear on the demo cookie. Secure/HttpOnly stay conceptual here (HTTP training page; document.cookie cannot set HttpOnly).",
      body:
        "<p>Cookie attributes guide how the browser stores and sends a cookie. Introductory meanings:</p>" +
        "<ul>" +
        "<li><strong>Path</strong> — which URL path prefix the cookie applies to</li>" +
        "<li><strong>Max-Age / Expires</strong> — how long the cookie should last</li>" +
        "<li><strong>Secure</strong> — intended for HTTPS transport</li>" +
        "<li><strong>HttpOnly</strong> — restricts access from browser JavaScript</li>" +
        "<li><strong>SameSite</strong> — helps control cross-site cookie sending behavior</li>" +
        "</ul>" +
        "<p>On this local HTTP lab you can observe <strong>Path</strong>, <strong>Max-Age</strong>, and <strong>SameSite=Lax</strong> on the mirrored demo cookie. <strong>Secure</strong> and <strong>HttpOnly</strong> are taught conceptually here — this page is HTTP, and <code>document.cookie</code> cannot create HttpOnly cookies.</p>" +
        "<p>Do not treat attributes as bypass puzzles.</p>",
      successFeedback: "Attributes describe scope, lifetime, and sending rules — not exploit knobs.",
      concepts: [
        { id: "attr1", label: "attribute one", terms: ["path", "max-age", "expires", "secure", "httponly", "samesite"] },
        { id: "attr2", label: "attribute two", terms: ["path", "max-age", "expires", "secure", "httponly", "samesite"] },
        { id: "meaning", label: "high-level meaning", terms: ["https", "javascript", "cross-site", "lifetime", "path", "scope", "send", "transport"] }
      ],
      passCount: 2,
      hints: [
        "Pick any two from Path, Max-Age, Secure, HttpOnly, SameSite and say what they control.",
        "Example: Path limits where the cookie applies; HttpOnly blocks document.cookie access.",
        "Path scopes the cookie to a URL prefix; Max-Age sets lifetime; Secure is for HTTPS; HttpOnly blocks JS access; SameSite affects cross-site sending."
      ]
    },
    {
      id: "i-compare",
      part: "I",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Compare before and after state",
      prompt:
        "Clear the demo session if needed, check status (none), start the demo session, check status (recognized). What changed, what stayed the same, and what evidence supports that the browser/application remembered something?",
      instructorNote:
        "Change-one-thing: only introduce demo state. Same path session/status; response body/session field changes; Cookie appears after start.",
      body:
        "<p>Use Lesson 6 discipline: <strong>CHANGE ONE THING AT A TIME</strong>.</p>" +
        "<p>Comparison:</p>" +
        "<ul>" +
        "<li><strong>BEFORE:</strong> <code>GET session/status</code> → <code>session: \"none\"</code> (no demo cookie)</li>" +
        "<li><strong>CHANGE:</strong> Start demo session (introduces <code>trail_session</code>)</li>" +
        "<li><strong>AFTER:</strong> <code>GET session/status</code> → <code>session: \"recognized\"</code></li>" +
        "</ul>" +
        "<p>Ask: What changed? What stayed the same? What evidence supports continuity?</p>",
      successFeedback: "Same status endpoint; different outcome once demo state existed — evidence of remembered state.",
      concepts: [
        { id: "before", label: "before none", terms: ["none", "before", "without"] },
        { id: "after", label: "after recognized", terms: ["recognized", "after", "with"] },
        { id: "evidence", label: "evidence", terms: ["cookie", "changed", "same", "status", "evidence", "remember"] }
      ],
      passCount: 2,
      hints: [
        "Which JSON field flipped, and which request path stayed identical?",
        "session/status stayed; session went none → recognized once trail_session existed.",
        "Before: status none without the demo cookie. After starting trail_session, the same session/status request returns recognized — evidence the demo state was remembered."
      ]
    },
    {
      id: "j-why",
      part: "J",
      phase: "APPLY",
      kind: "exercise",
      title: "Why investigators care about state",
      prompt:
        "Why might a security researcher examine cookies or session-related headers instead of only looking at the rendered page?",
      instructorNote:
        "State explains why similar requests behave differently; observation only — no attack framing.",
      body:
        "<p>Two requests to the same path can behave differently if one carries session state and the other does not.</p>" +
        "<p>Researchers inspect cookies and related headers to understand continuity: what the browser stored, what it sent, and how the application responded — still under authorization, still observational.</p>" +
        "<p>Hackbot’s own IndexedDB learner progress is a separate idea from Trail Supply’s demo cookie. Do not confuse product persistence with the training target’s state.</p>",
      successFeedback: "State can explain different outcomes for otherwise similar requests.",
      concepts: [
        { id: "different", label: "different outcomes", terms: ["different", "behav", "outcome", "similar", "same path"] },
        { id: "inspect", label: "inspect state", terms: ["cookie", "header", "session", "network", "inspect", "state"] },
        { id: "why", label: "investigator why", terms: ["understand", "continu", "remember", "why", "explain"] }
      ],
      passCount: 2,
      hints: [
        "What could make two GETs to the same URL return different JSON?",
        "Cookies/session state can change outcomes; Network shows that better than the shopper UI alone.",
        "Researchers inspect cookies and session-related headers because state can make similar requests behave differently — continuity you may not see from the rendered page alone."
      ]
    },
    {
      id: "k-challenge",
      part: "K",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Session investigation challenge",
      prompt:
        "Reconstruct the Trail Supply demo: initial status none → start creates trail_session=demo-trail-7 → later status recognized. Identify what state was introduced, where you observed it, what changed vs stayed the same, and how a cookie identifier differs from the conceptual session.",
      instructorNote:
        "Evidence-only synthesis. No vulnerability language.",
      body:
        "<p>Field note (use Network evidence):</p>" +
        "<p><strong>INITIAL:</strong> request without demo state → application reports no active demo session</p>" +
        "<p><strong>STATE CREATION:</strong> response communicates/stores synthetic <code>trail_session=demo-trail-7</code></p>" +
        "<p><strong>LATER:</strong> request carries that state → application recognizes demo session</p>" +
        "<p>Explain: what was introduced, where you saw it, what changed, what stayed the same, whether evidence supports “remembered something,” and cookie value vs conceptual session.</p>",
      successFeedback: "You reconstructed a before/after state trail from evidence — without attacking it.",
      concepts: [
        { id: "none", label: "initial none", terms: ["none", "initial", "before"] },
        { id: "cookie", label: "trail_session", terms: ["trail_session", "demo-trail-7", "set-cookie", "cookie"] },
        { id: "recognized", label: "recognized", terms: ["recognized", "later", "after", "status"] },
        { id: "vs", label: "cookie vs session", terms: ["session", "identifier", "different", "versus", "application", "state"] },
        { id: "compare", label: "compare", terms: ["change", "same", "evidence", "remember"] }
      ],
      passCount: 4,
      hints: [
        "Name none → trail_session=demo-trail-7 → recognized, plus cookie≠session.",
        "Same session/status path; cookie appears; JSON session flips; cookie is an id, session is app state.",
        "Initial session/status is none. Start sets trail_session=demo-trail-7 (Set-Cookie / Application). Later status is recognized. Path stayed the same; state changed. The cookie value is an identifier; the session is the application’s remembered state."
      ]
    },
    {
      id: "l-model",
      part: "L",
      phase: "APPLY",
      kind: "read",
      title: "Mental model",
      body:
        "<p>Carry this state model forward:</p>" +
        '<ol class="hb-flow" aria-label="Cookie and session model">' +
        "<li>Requests are separate exchanges</li>" +
        "<li>Applications may need continuity (state)</li>" +
        "<li>Set-Cookie (response) can ask the browser to store a cookie</li>" +
        "<li>Cookie (request) can send that data back later</li>" +
        "<li>A cookie may hold an identifier; a session is application state</li>" +
        "<li>Compare before/after with one change at a time</li>" +
        "</ol>" +
        "<p>On Trail Supply you observed:</p>" +
        "<ul>" +
        "<li><code>session/status</code> → <code>none</code> without demo state</li>" +
        "<li><code>session/start</code> → synthetic <code>trail_session=demo-trail-7</code></li>" +
        "<li>later <code>session/status</code> → <code>recognized</code></li>" +
        "</ul>" +
        "<p class=\"hb-loop\">OBSERVE → COMPARE → REASON</p>" +
        "<p>Lesson 8 will deepen Browser Developer Tools. You now know state can travel with cookies without turning investigation into an attack.</p>"
    },
    {
      id: "m-reflect",
      part: "M",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "What state showed me",
      title: "Reflection",
      prompt:
        "What did the before/after demo session show you that you would not have learned from the Trail Supply page text alone?",
      instructorNote:
        "Soft-graded. Network Set-Cookie/Cookie or status none→recognized are good answers.",
      body: "<p>Write from the session lab evidence. Stored as a learning note, not a score.</p>",
      concepts: [
        {
          id: "insight",
          label: "state insight",
          terms: [
            "cookie",
            "session",
            "set-cookie",
            "recognized",
            "none",
            "state",
            "network",
            "before",
            "after",
            "remember"
          ]
        }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Name one Network-only fact: Set-Cookie, Cookie header, or none→recognized.",
        "The shopper UI does not show trail_session or the status JSON flip — Network does.",
        "Example: only Network showed session none becoming recognized after trail_session appeared."
      ]
    }
  ];

  Hackbot.Lesson7 = {
    id: "cookies",
    number: 7,
    title: "Cookies and Sessions",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    completeBanner:
      "Lesson 7 is complete. You can review steps or continue to Lesson 8 — Browser Developer Tools.",
    goal:
      "Understand how cookies and sessions provide continuity across separate HTTP requests, observe a synthetic Trail Supply demo cookie/session, and compare before/after state without attacking it.",
    steps: STEPS
  };
})(window);
