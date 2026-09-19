/**
 * Module 1 Lesson 5 — Status Codes and Redirects.
 * Observes Trail Supply status signals and a synthetic local 302 → Location sequence.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-signals",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Status codes are signals",
      prompt:
        "In your own words, what is an HTTP status code, and what job does it do in a request/response pair?",
      instructorNote:
        "Keep it simple: a short numeric signal about how the application handled the request. Not a full encyclopedia.",
      body:
        "<p>Lessons 3–4 taught you to watch requests, responses, and headers. Lesson 5 focuses on the <strong>status code</strong> — the concise number on the response that signals how the request went.</p>" +
        "<p>A status code does not replace the body. It is a quick signal: success, redirect, client-side problem, or server-side problem. Researchers read it early because it frames what to inspect next.</p>" +
        "<p>This lesson is observational. You will not exploit redirects, bypass auth, or attack targets.</p>",
      successFeedback: "Status codes are short signals about the outcome of a request — a starting clue, not the whole story.",
      concepts: [
        { id: "status", label: "status code", terms: ["status", "code", "number", "signal"] },
        { id: "outcome", label: "request outcome", terms: ["result", "outcome", "handled", "success", "error", "response", "how"] }
      ],
      passCount: 2,
      hints: [
        "Where does the number live — request or response — and what question does it answer?",
        "It is a response signal that summarizes how the application handled the request.",
        "An HTTP status code is a numeric signal on the response that summarizes the outcome of the request — success, redirect, client problem, or server problem."
      ]
    },
    {
      id: "b-locate",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Find the status in DevTools",
      prompt:
        "Search for boots on Trail Supply, open that request in Network, and say where you found the status code and what number you saw.",
      instructorNote:
        "Status often appears in the Network list column and again in the selected request’s Headers / Status line. Expect 200 for a successful training search.",
      body:
        "<p>Open Trail Supply with Network open.</p>" +
        "<ol>" +
        "<li>Search for <strong>boots</strong></li>" +
        "<li>Click the <code>/search</code> request</li>" +
        "<li>Locate the <strong>status code</strong> (list column and/or response status line)</li>" +
        "</ol>" +
        "<p>Browser labels vary. Name where you found it and the number you observed.</p>",
      reveal: "<p>A successful Trail Supply search should show status <code>200</code>.</p>",
      successFeedback: "You can find the status without guessing from the rendered shop page alone.",
      concepts: [
        { id: "network", label: "Network panel", terms: ["network", "devtools", "inspect"] },
        { id: "status", label: "status 200", terms: ["200", "status", "ok"] },
        { id: "search", label: "search request", terms: ["search", "/search", "boots"] }
      ],
      passCount: 2,
      hints: [
        "After Search, which number sits next to the /search request?",
        "Open Network → search request → status should be 200.",
        "In the Network panel on the boots search request, the status code is 200."
      ]
    },
    {
      id: "c-families",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Five status-code families",
      prompt:
        "Match these ideas to the five families: informational, success, redirection, client/request-side problem, server-side problem. Which family is 2xx? 3xx? 4xx? 5xx?",
      instructorNote:
        "1xx is rare in this lab — name it, then focus on 2xx–5xx. Exact wording can vary.",
      body:
        "<p>Status codes are grouped by their first digit:</p>" +
        "<ul>" +
        "<li><strong>1xx</strong> — informational (uncommon in everyday browsing)</li>" +
        "<li><strong>2xx</strong> — success</li>" +
        "<li><strong>3xx</strong> — redirection (go somewhere else)</li>" +
        "<li><strong>4xx</strong> — client / request-side problem</li>" +
        "<li><strong>5xx</strong> — server-side problem</li>" +
        "</ul>" +
        "<p>Useful representatives (some you will see hands-on; others are conceptual):</p>" +
        "<ul>" +
        "<li><code>200 OK</code>, <code>201 Created</code> (concept)</li>" +
        "<li><code>301 Moved Permanently</code>, <code>302 Found</code>, <code>304 Not Modified</code> (concept where not demoed)</li>" +
        "<li><code>400 Bad Request</code>, <code>401 Unauthorized</code>, <code>403 Forbidden</code>, <code>404 Not Found</code></li>" +
        "<li><code>500 Internal Server Error</code> (concept in this lesson)</li>" +
        "</ul>" +
        "<p>Do not memorize every code. Learn the families, then read the specific number in context.</p>",
      successFeedback: "Families give you a map. Specific codes fill in the story.",
      concepts: [
        { id: "two", label: "2xx success", terms: ["2xx", "200", "success"] },
        { id: "three", label: "3xx redirect", terms: ["3xx", "302", "301", "redirect", "redirection"] },
        { id: "four", label: "4xx client", terms: ["4xx", "401", "404", "403", "400", "client"] },
        { id: "five", label: "5xx server", terms: ["5xx", "500", "server"] }
      ],
      passCount: 3,
      hints: [
        "Which family means success? Which means go elsewhere? Which blames the request vs the server?",
        "2xx success, 3xx redirection, 4xx client/request problem, 5xx server problem.",
        "2xx = success, 3xx = redirection, 4xx = client/request-side problem, 5xx = server-side problem (1xx is informational)."
      ]
    },
    {
      id: "d-success",
      part: "D",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Observe a successful response",
      prompt:
        "Trigger a successful Trail Supply request (search or product 42). What status did you see, which family is it in, and what does that signal?",
      instructorNote:
        "Search boots or click Trail Camera. Expect 200 OK — success family.",
      body:
        "<p>Generate a success:</p>" +
        "<ul>" +
        "<li>Search for <strong>boots</strong>, or</li>" +
        "<li>Click <strong>Trail Camera</strong> (product 42)</li>" +
        "</ul>" +
        "<p>In Network, confirm status <code>200</code>. That is the <strong>2xx success</strong> family — the training handler accepted the request and returned a representation.</p>",
      successFeedback: "You tied a UI action to a live 200 success signal.",
      concepts: [
        { id: "twohundred", label: "200 OK", terms: ["200", "ok"] },
        { id: "family", label: "2xx success family", terms: ["2xx", "success"] },
        { id: "signal", label: "success meaning", terms: ["success", "succeeded", "accepted", "worked", "ok"] }
      ],
      passCount: 2,
      hints: [
        "What number did search or product 42 return, and is that success or error?",
        "200 is 2xx — success.",
        "Status 200 OK is in the 2xx success family — the synthetic request succeeded."
      ]
    },
    {
      id: "e-unauthorized",
      part: "E",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Observe the synthetic login failure",
      prompt:
        "Submit the synthetic login. What status do you see, which family is it, and what does it mean in this training context?",
      instructorNote:
        "Any username/password is fine. Trail Supply always returns 401 Unauthorized with JSON Invalid credentials. Not a password attack.",
      body:
        "<p>Submit Account sign-in with synthetic values (for example <code>student</code> / <code>example</code>).</p>" +
        "<p>Expect <code>401 Unauthorized</code> — a <strong>4xx</strong> signal that authentication failed for this request. The body explains <code>Invalid credentials</code>.</p>" +
        "<p>This is local training only. Do not treat it as credential stuffing or bypass practice.</p>",
      successFeedback: "You read 401 as a refusal signal, not as a puzzle to force open.",
      concepts: [
        { id: "status", label: "401", terms: ["401", "unauthorized"] },
        { id: "family", label: "4xx", terms: ["4xx", "client"] },
        { id: "meaning", label: "auth failed", terms: ["invalid", "credentials", "login", "refused", "failed", "auth"] }
      ],
      passCount: 2,
      hints: [
        "After sign-in, which status appears on POST /login?",
        "401 Unauthorized — 4xx — synthetic login refused.",
        "POST /login returns 401 Unauthorized (4xx): the training handler refused the credentials."
      ]
    },
    {
      id: "f-notfound",
      part: "F",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Observe a missing resource",
      prompt:
        "Click Lantern — not in catalog. What status appears, and how is 404 different from the 401 you just saw?",
      instructorNote:
        "Product 99 is intentionally missing → 404 Not Found. Contrast with 401 (auth refused) vs 404 (resource missing).",
      body:
        "<p>Click <strong>Lantern — not in catalog</strong>.</p>" +
        "<p>Trail Supply should answer <code>404 Not Found</code>. That is still <strong>4xx</strong>, but it means “this resource is not here,” not “your credentials were rejected.”</p>" +
        "<p>Conceptual neighbors (not required hands-on here): <code>400 Bad Request</code>, <code>403 Forbidden</code>.</p>",
      successFeedback: "You distinguished missing resource (404) from failed authentication (401).",
      concepts: [
        { id: "four04", label: "404", terms: ["404", "not found", "missing"] },
        { id: "vs401", label: "401 vs 404", terms: ["401", "404", "auth", "credentials", "missing", "resource", "different", "versus", "vs"] }
      ],
      passCount: 2,
      hints: [
        "What status does the lantern produce, and how is that unlike the login refusal?",
        "404 means missing resource; 401 means unauthorized/authentication failed.",
        "Lantern returns 404 Not Found (resource missing). Login returned 401 Unauthorized (credentials refused). Same 4xx family, different meanings."
      ]
    },
    {
      id: "g-compare",
      part: "G",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Success versus error responses",
      prompt:
        "Using the statuses you observed, explain how a successful response differs from an error response for an investigator reading the Network panel.",
      instructorNote:
        "Contrast 200 with 401/404. Status frames whether to read a normal representation or an error explanation.",
      body:
        "<p>Hold three live signals in mind:</p>" +
        "<ul>" +
        "<li><code>200</code> — success; body is the useful representation (search results / product)</li>" +
        "<li><code>401</code> — request refused for auth reasons</li>" +
        "<li><code>404</code> — requested resource not found</li>" +
        "</ul>" +
        "<p>Investigators read status before assuming the body is “the page.” A rendered shop can look calm while Network shows refusals and misses.</p>",
      successFeedback: "You are using status to choose how to interpret the body — success payload vs error explanation.",
      concepts: [
        { id: "success", label: "success 200", terms: ["200", "success"] },
        { id: "error", label: "error statuses", terms: ["401", "404", "error", "fail", "refused", "missing"] },
        { id: "why", label: "investigator use", terms: ["interpret", "understand", "before", "network", "investigate", "signal"] }
      ],
      passCount: 2,
      hints: [
        "What does 200 invite you to read vs what do 401/404 invite you to read?",
        "200 → successful representation; 401/404 → problem signals with different meanings.",
        "A 200 success carries the useful payload; 401 and 404 are error signals that change how an investigator interprets the exchange."
      ]
    },
    {
      id: "h-redirect-idea",
      part: "H",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "What a redirect means",
      prompt:
        "Describe the basic redirect model: what does a 3xx response tell the client to do, and which Lesson 4 header usually names the next destination?",
      instructorNote:
        "Connect to Location from Lesson 4. No open-redirect abuse — just the follow sequence.",
      body:
        "<p>A <strong>redirect</strong> is a response that tells the client to continue somewhere else.</p>" +
        "<p>Basic model:</p>" +
        '<ol class="hb-flow" aria-label="Redirect sequence">' +
        "<li>Request</li>" +
        "<li>3xx response</li>" +
        "<li>Location header</li>" +
        "<li>Client follows destination</li>" +
        "<li>New request</li>" +
        "<li>Final response</li>" +
        "</ol>" +
        "<p>Lesson 4 taught headers as metadata. For redirects, <strong>Location</strong> is the critical response header — it names where to go next.</p>" +
        "<p>Common codes (concept): <code>301 Moved Permanently</code>, <code>302 Found</code>, <code>304 Not Modified</code> (caching shortcut, not a “go elsewhere” hop in the same way).</p>",
      successFeedback: "Redirect = 3xx signal + Location destination + a follow-up request.",
      concepts: [
        { id: "three", label: "3xx", terms: ["3xx", "302", "301", "redirect"] },
        { id: "location", label: "Location header", terms: ["location", "header", "destination"] },
        { id: "follow", label: "client follows", terms: ["follow", "continue", "next", "new request", "another"] }
      ],
      passCount: 2,
      hints: [
        "Which family means redirection, and which header points to the next URL?",
        "3xx tells the client to go elsewhere; Location names the destination.",
        "A 3xx response tells the client to continue elsewhere; the Location response header names the destination for the next request."
      ]
    },
    {
      id: "i-follow",
      part: "I",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Follow a redirect in Network",
      prompt:
        "Click Follow camera redirect. In Network, identify the 302 response, its Location header, and the final products/42 request status.",
      instructorNote:
        "Use the Redirect lab button. Expect GET go/camera → 302 with Location ending in products/42 → followed GET products/42 → 200. Enable Preserve log if your browser clears the list.",
      body:
        "<p>On Trail Supply, open Network, then click <strong>Follow camera redirect</strong>.</p>" +
        "<p>This training control requests local <code>go/camera</code>. The service worker answers with a synthetic <code>302 Found</code> and a <code>Location</code> header pointing at <code>products/42</code>. The browser then requests that product and should receive <code>200</code>.</p>" +
        "<p>Look for both hops. Lesson 4’s Location header is the bridge between them.</p>" +
        "<p>This is not redirect exploitation — it is a deterministic local demo.</p>",
      reveal:
        "<p><code>GET …/go/camera</code> → <code>302</code> + <code>Location: …/products/42</code> → <code>GET …/products/42</code> → <code>200</code>.</p>",
      successFeedback: "You reconstructed a redirect sequence: 3xx, Location, follow-up, final status.",
      concepts: [
        { id: "three02", label: "302", terms: ["302", "found", "redirect"] },
        { id: "location", label: "Location products/42", terms: ["location", "products/42", "product", "42", "camera"] },
        { id: "final", label: "final 200", terms: ["200", "final", "followed", "product"] }
      ],
      passCount: 3,
      hints: [
        "Which request is go/camera, what status is it, where does Location point, and what is the final product status?",
        "302 on go/camera, Location → products/42, final 200.",
        "GET go/camera returns 302 Found with Location to products/42; the followed product request returns 200."
      ]
    },
    {
      id: "j-challenge",
      part: "J",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Status and redirect challenge",
      prompt:
        "Produce search (200), login (401), lantern (404), and the camera redirect (302→200). Report each status with a short meaning, plus how Location connects the redirect hop.",
      instructorNote:
        "Free text is fine. Require the four behaviors and the Location bridge — not browser chrome trivia.",
      body:
        "<p>With Network open, generate:</p>" +
        "<ol>" +
        "<li>Search boots → expect <code>200</code></li>" +
        "<li>Synthetic login → expect <code>401</code></li>" +
        "<li>Lantern — not in catalog → expect <code>404</code></li>" +
        "<li>Follow camera redirect → expect <code>302</code> then <code>200</code>, with <code>Location</code> toward products/42</li>" +
        "</ol>" +
        "<p>Write a short field note covering those signals and why Location matters on the redirect.</p>",
      successFeedback: "That is a first status map: success, auth refusal, missing resource, and a redirect chain.",
      concepts: [
        { id: "ok", label: "200", terms: ["200"] },
        { id: "unauth", label: "401", terms: ["401", "unauthorized"] },
        { id: "missing", label: "404", terms: ["404", "not found"] },
        { id: "redir", label: "302", terms: ["302", "redirect"] },
        { id: "loc", label: "Location", terms: ["location", "products/42", "42"] },
        { id: "final", label: "final 200", terms: ["200", "final", "product"] }
      ],
      passCount: 5,
      hints: [
        "List 200 / 401 / 404 / 302→Location→200 with one phrase each.",
        "Search 200 success; login 401 auth refused; lantern 404 missing; go/camera 302 Location products/42 then 200.",
        "Search → 200 success. Login → 401 unauthorized. Lantern → 404 not found. Redirect → 302 with Location to products/42, then final 200."
      ]
    },
    {
      id: "k-model",
      part: "K",
      phase: "APPLY",
      kind: "read",
      title: "Mental model",
      body:
        "<p>Carry this model forward:</p>" +
        '<ol class="hb-flow" aria-label="Status-first reading">' +
        "<li>Find the status code</li>" +
        "<li>Place it in a family (2xx / 3xx / 4xx / 5xx)</li>" +
        "<li>Read headers that explain next steps (especially Location on 3xx)</li>" +
        "<li>Read the body in that light</li>" +
        "</ol>" +
        "<p>On Trail Supply you observed:</p>" +
        "<ul>" +
        "<li><code>200</code> success</li>" +
        "<li><code>401</code> synthetic auth refusal</li>" +
        "<li><code>404</code> missing product</li>" +
        "<li><code>302</code> + <code>Location</code> → followed <code>200</code></li>" +
        "</ul>" +
        "<p class=\"hb-loop\">OBSERVE BEFORE MODIFY</p>" +
        "<p>Lesson 6 will look at parameters and user input. You now know status codes and redirects are readable signals — not exploits.</p>"
    },
    {
      id: "l-reflect",
      part: "L",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "What status codes showed",
      title: "Reflection",
      prompt:
        "What did status codes or a redirect show you that you would not have learned from the rendered Trail Supply page alone?",
      instructorNote:
        "Name one Network-only fact: 401, 404, 302, or Location → products/42.",
      body: "<p>Write from the exchanges you generated. This is stored as a learning note, not a score.</p>",
      concepts: [
        {
          id: "insight",
          label: "status insight",
          terms: [
            "status",
            "200",
            "401",
            "404",
            "302",
            "redirect",
            "location",
            "network",
            "not",
            "visible",
            "page"
          ]
        }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one status or Location fact the shopper UI never printed.",
        "401 on login, 404 on lantern, or 302 Location on the redirect demo are easy examples.",
        "Example: the rendered page does not show 401 Invalid credentials or a 302 Location to products/42; Network does."
      ]
    }
  ];

  Hackbot.Lesson5 = {
    id: "status-redirects",
    number: 5,
    title: "Status Codes and Redirects",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    completeBanner:
      "Lesson 5 is complete. You can review steps or continue to Lesson 6 — Parameters and User Input.",
    goal:
      "Read HTTP status codes as outcome signals, distinguish common success and error codes on Trail Supply, and follow a synthetic 302 redirect via the Location header.",
    steps: STEPS
  };
})(window);
