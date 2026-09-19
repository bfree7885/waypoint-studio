/**
 * Module 1 Lesson 6 — Parameters and User Input.
 * Traces learner actions into query params, request bodies, and path values on Trail Supply.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-input-data",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Your input becomes request data",
      prompt:
        "In your own words, how can something you type or click end up inside an HTTP request?",
      instructorNote:
        "Keep the chain human: action → input → request field → application response. No payloads.",
      body:
        "<p>Lessons 1–5 taught you to <strong>see</strong> traffic: requests, responses, headers, and status codes.</p>" +
        "<p>Lesson 6 begins a new skill: <strong>reason about where user-controlled information enters a request</strong>.</p>" +
        "<p>Actions such as typing a search term, filling a form, choosing an option, or clicking a product can place values into the request. Investigators trace:</p>" +
        '<ol class="hb-flow" aria-label="Input to response chain">' +
        "<li>Human action</li>" +
        "<li>Input</li>" +
        "<li>Request</li>" +
        "<li>Parameter or value</li>" +
        "<li>Application response</li>" +
        "</ol>" +
        "<p>The loop stays observational: <strong>OBSERVE → COMPARE → REASON</strong>. This lesson does not teach injection, fuzzing, or bypasses.</p>",
      successFeedback: "User actions can become named values inside a request — that is the trail to follow.",
      concepts: [
        { id: "action", label: "human action", terms: ["type", "click", "form", "search", "input", "action", "select"] },
        { id: "request", label: "appears in request", terms: ["request", "parameter", "query", "body", "url", "value"] }
      ],
      passCount: 2,
      hints: [
        "What did you do, and where might that value travel next?",
        "Typing or clicking can place a value into a URL, query string, or request body.",
        "Something you type or click can become data in the HTTP request — for example a search term in the query string or form fields in a POST body."
      ]
    },
    {
      id: "b-find-q",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Find the search parameter",
      prompt:
        "Search for boots on Trail Supply. In Network, name the path and the query string piece that carries your search term.",
      instructorNote:
        "Expect GET …/search?q=boots. Point at path /search and q=boots.",
      body:
        "<p>Open Trail Supply with Network recording. Type <strong>boots</strong> and submit Search.</p>" +
        "<p>Look at the request URL. Structure to notice:</p>" +
        "<ul>" +
        "<li><code>/search</code> — path</li>" +
        "<li><code>?</code> — start of the query string</li>" +
        "<li><code>q</code> — parameter name</li>" +
        "<li><code>boots</code> — parameter value</li>" +
        "</ul>" +
        "<p>Write what you see. Exact browser chrome labels are optional.</p>",
      reveal:
        "<p>Typical training request: <code>GET …/search?q=boots</code> — path <code>/search</code>, parameter <code>q</code>, value <code>boots</code>.</p>",
      successFeedback: "You located the search term as a named query parameter.",
      concepts: [
        { id: "path", label: "path /search", terms: ["search", "/search", "path"] },
        { id: "name", label: "parameter q", terms: ["q", "parameter", "name", "query"] },
        { id: "value", label: "value boots", terms: ["boots", "value"] }
      ],
      passCount: 3,
      hints: [
        "After the path, what sits after the question mark?",
        "Path is /search; the query piece is q=boots.",
        "The request path is /search and the query string includes parameter q with value boots."
      ]
    },
    {
      id: "c-name-value",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Name versus value",
      prompt:
        "Using q=boots as the example, what is the parameter name and what is the parameter value? Why does that distinction matter?",
      instructorNote:
        "Name labels the slot; value is what you controlled. Investigators track both.",
      body:
        "<p>In <code>q=boots</code>:</p>" +
        "<ul>" +
        "<li><strong>Name</strong> (<code>q</code>) — which field the application is reading</li>" +
        "<li><strong>Value</strong> (<code>boots</code>) — the data you supplied</li>" +
        "</ul>" +
        "<p>When you change what you type, the <em>name</em> often stays the same while the <em>value</em> changes. That is the comparison unit for this lesson.</p>",
      successFeedback: "Name identifies the slot; value is the user-controlled data in that slot.",
      concepts: [
        { id: "name", label: "name q", terms: ["name", "q", "parameter", "key", "field"] },
        { id: "value", label: "value boots", terms: ["value", "boots", "data"] },
        { id: "why", label: "why distinguish", terms: ["change", "same", "slot", "control", "compare", "matter"] }
      ],
      passCount: 2,
      hints: [
        "Which token is the label, and which token is what you typed?",
        "q is the name; boots is the value — names stay while values move when you re-search.",
        "Parameter name is q; value is boots. Distinguishing them lets you see which slot you control when the request changes."
      ]
    },
    {
      id: "d-one-thing",
      part: "D",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Change one thing",
      prompt:
        "Search for boots, then search for camera (or tent). What discipline should you follow when comparing the two requests, and what one piece of the request should change?",
      instructorNote:
        "Teach CHANGE ONE THING AT A TIME. Only the q value should move between benign searches.",
      body:
        "<p>Experimental discipline for investigation:</p>" +
        '<ol class="hb-flow" aria-label="Change one thing">' +
        "<li>Observe a baseline request</li>" +
        "<li>Change <strong>one</strong> benign input</li>" +
        "<li>Observe the second request</li>" +
        "<li>Compare</li>" +
        "</ol>" +
        "<p>On Trail Supply, run a search for <strong>boots</strong>, then change only the search box to <strong>camera</strong> (or <strong>tent</strong>) and search again.</p>" +
        "<p class=\"hb-loop\">CHANGE ONE THING AT A TIME</p>" +
        "<p>This is experimental discipline — not an attack method.</p>",
      successFeedback: "Good investigators change one input so the comparison stays readable.",
      concepts: [
        { id: "one", label: "change one", terms: ["one", "single", "only", "at a time", "discipline"] },
        { id: "value", label: "value changes", terms: ["value", "q", "camera", "tent", "boots", "change", "parameter"] }
      ],
      passCount: 2,
      hints: [
        "If two things move at once, what happens to your comparison?",
        "Change only the search text; watch the q value move.",
        "Change one input at a time. Between boots and camera/tent searches, the q parameter value should change while the rest of the request shape stays comparable."
      ]
    },
    {
      id: "e-compare",
      part: "E",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Compare two search requests",
      prompt:
        "After two different benign searches, what stayed the same in the request, what changed, and what does that tell you about what you controlled?",
      instructorNote:
        "Same path /search and name q; different values. Response results may differ — note evidence, not guesses.",
      body:
        "<p>With Preserve log on if needed, compare the two <code>/search</code> requests side by side.</p>" +
        "<p>Ask:</p>" +
        "<ul>" +
        "<li>What parts of this request came from me?</li>" +
        "<li>If I change one input, what changes in the request?</li>" +
        "<li>What changed in the response?</li>" +
        "</ul>" +
        "<p>Record only what Network evidence supports.</p>",
      successFeedback: "You controlled the q value; path and parameter name stayed put.",
      concepts: [
        { id: "same", label: "path and name same", terms: ["search", "path", "q", "same", "name", "method", "get"] },
        { id: "changed", label: "value changed", terms: ["value", "change", "different", "boots", "camera", "tent"] },
        { id: "control", label: "user controlled", terms: ["control", "typed", "input", "me", "user"] }
      ],
      passCount: 2,
      hints: [
        "Which tokens match on both rows, and which token differs?",
        "Path /search and name q stay; the value after q= changes with what you typed.",
        "Both requests keep GET /search and parameter name q; the value changes with your search text — that value is what you controlled."
      ]
    },
    {
      id: "f-encoding",
      part: "F",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Spaces and URL encoding",
      prompt:
        "Search for the phrase trail camera (with a space). What do you notice about how the space appears in the request URL, and why might URLs need that representation?",
      instructorNote:
        "Expect q=trail%20camera or a + form. Teach safe representation — not payload crafting.",
      body:
        "<p>Search for <strong>trail camera</strong> (two words, one space).</p>" +
        "<p>In Network, open the request URL. Spaces and some other characters are often rewritten so the URL stays a safe, unambiguous string — commonly as <code>%20</code> for a space (some clients show <code>+</code> in query strings).</p>" +
        "<p>That rewriting is <strong>URL encoding</strong>. It is about representing characters safely in a URL — not about building attack payloads.</p>",
      reveal:
        "<p>Example shape: <code>/search?q=trail%20camera</code> — the space became an encoded form while the parameter name stayed <code>q</code>.</p>",
      successFeedback: "You saw that user text may be encoded when it travels in a URL.",
      concepts: [
        { id: "space", label: "space encoded", terms: ["space", "%20", "plus", "+", "encode", "encoding", "encoded"] },
        { id: "why", label: "safe URL", terms: ["url", "safe", "represent", "character", "special", "query"] },
        { id: "phrase", label: "trail camera", terms: ["trail", "camera", "q"] }
      ],
      passCount: 2,
      hints: [
        "Look at the characters after q= — is the space still a blank?",
        "Often the space becomes %20 (or +). URLs need a safe representation for some characters.",
        "Searching trail camera typically shows q=trail%20camera (or similar). URL encoding gives spaces and special characters a safe representation inside the URL."
      ]
    },
    {
      id: "g-multi",
      part: "G",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "More than one parameter",
      prompt:
        "Use the multi-parameter demo (or inspect a URL like search?q=boots&sort=price). How are multiple query parameters separated, and what names/values do you see?",
      instructorNote:
        "Teach & as separator. Demo button fires deterministic q=boots&sort=price.",
      body:
        "<p>Query strings can carry more than one pair:</p>" +
        "<p><code>?category=gear&amp;sort=price</code></p>" +
        "<p><code>&amp;</code> separates parameters. Each piece is still <code>name=value</code>.</p>" +
        "<p>On Trail Supply, click <strong>Search boots sorted</strong> (Lesson 6 demo). It issues a local <code>GET search?q=boots&amp;sort=price</code>. Inspect the URL and the JSON echo of parameters — still synthetic, still local.</p>",
      reveal:
        "<p>Example: <code>q=boots</code> and <code>sort=price</code>, joined by <code>&amp;</code>.</p>",
      successFeedback: "Multiple parameters are name=value pairs joined by &.",
      concepts: [
        { id: "amp", label: "ampersand separator", terms: ["&", "ampersand", "separat", "multiple", "more than one"] },
        { id: "q", label: "q boots", terms: ["q", "boots"] },
        { id: "sort", label: "sort price", terms: ["sort", "price"] }
      ],
      passCount: 2,
      hints: [
        "What character sits between the pairs after the question mark?",
        "& separates parameters; look for q=boots and sort=price.",
        "Multiple query parameters are separated by &. The demo uses q=boots and sort=price."
      ]
    },
    {
      id: "h-body",
      part: "H",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Input in a request body",
      prompt:
        "Submit the synthetic Sign in form with any practice username/password. Where do those values appear — query string or request body — and how does that differ from search?",
      instructorNote:
        "POST /login with JSON body. Contrast with GET /search?q=… . Synthetic only.",
      body:
        "<p>Not all user input belongs in the URL.</p>" +
        "<p>Compare:</p>" +
        "<ul>" +
        "<li><code>GET /search?q=boots</code> — input in the <strong>query string</strong></li>" +
        "<li><code>POST /login</code> — synthetic username/password in the <strong>request body</strong> (JSON), not in the URL</li>" +
        "</ul>" +
        "<p>Open Network → the login request → Payload / Request body. Use any practice strings; Trail Supply always returns a synthetic 401. Nothing leaves this machine.</p>" +
        "<p><strong>Query parameter ≠ request body</strong> — both can carry user-controlled data in different places.</p>",
      successFeedback: "Login input rides in the POST body; search input rides in the query string.",
      concepts: [
        { id: "body", label: "request body", terms: ["body", "payload", "json", "post"] },
        { id: "fields", label: "username password", terms: ["username", "password", "credential", "login"] },
        { id: "vs", label: "not query string", terms: ["query", "url", "search", "different", "not", "versus", "vs", "unlike"] }
      ],
      passCount: 2,
      hints: [
        "Is the username visible after a ? in the URL, or under Request payload?",
        "POST /login carries JSON in the body; search uses q= in the URL.",
        "Synthetic login puts username and password in the POST request body (JSON), not in the query string — unlike search’s q= parameter."
      ]
    },
    {
      id: "i-path",
      part: "I",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Values in paths",
      prompt:
        "Click Trail Camera (product 42). Where does 42 appear in the request, and how is that different from a query like /products?id=42?",
      instructorNote:
        "Path segment /products/42 vs conceptual /products?id=42. No traversal talk.",
      body:
        "<p>Applications sometimes place meaningful values in the <strong>path</strong> itself.</p>" +
        "<p>On Trail Supply, open <strong>Trail Camera</strong> and inspect the Network request. You should see a path shaped like <code>/products/42</code>.</p>" +
        "<p>Compare the idea:</p>" +
        "<ul>" +
        "<li><code>/products/42</code> — identifier in the path</li>" +
        "<li><code>/products?id=42</code> — same idea as a query parameter named <code>id</code></li>" +
        "</ul>" +
        "<p>Both can carry an identifier. The lesson is to notice <em>where</em> the value lives. Do not manipulate paths to attack the lab.</p>",
      successFeedback: "Product 42 is encoded in the path — another place user-relevant values can appear.",
      concepts: [
        { id: "path", label: "path products/42", terms: ["products/42", "/products/42", "path", "42"] },
        { id: "id", label: "identifier", terms: ["id", "identifier", "product", "42"] },
        { id: "vs", label: "vs query id", terms: ["query", "id=42", "parameter", "different", "versus", "vs"] }
      ],
      passCount: 2,
      hints: [
        "Look at the path segments after products/.",
        "42 sits in the path (/products/42), not necessarily as ?id=42.",
        "The request uses path /products/42 — the identifier is in the path, which differs from a query form like /products?id=42."
      ]
    },
    {
      id: "j-where",
      part: "J",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Where did the input go?",
      prompt:
        "Map three Trail Supply inputs to where they travel: search text, login fields, and product id 42.",
      instructorNote:
        "Search → query q; login → body; 42 → path. Short map is enough.",
      body:
        "<p>Summarize the placement map you observed:</p>" +
        "<ul>" +
        "<li>Search box text → ?</li>" +
        "<li>Sign-in fields → ?</li>" +
        "<li>Product link 42 → ?</li>" +
        "</ul>" +
        "<p>Investigators ask first: <em>What parts of this request came from me?</em></p>",
      successFeedback: "You can place the same idea — user-controlled data — into query, body, or path.",
      concepts: [
        { id: "query", label: "search query", terms: ["search", "query", "q"] },
        { id: "body", label: "login body", terms: ["login", "body", "post", "username", "password"] },
        { id: "path", label: "product path", terms: ["path", "products", "42"] }
      ],
      passCount: 3,
      hints: [
        "Three destinations: query string, request body, path segment.",
        "Search → q=…; login → JSON body; product → /products/42.",
        "Search text goes into query parameter q; login fields go into the POST body; product 42 appears in the path /products/42."
      ]
    },
    {
      id: "k-challenge",
      part: "K",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Investigation challenge",
      prompt:
        "Search for trail camera, then compare with a second benign search (for example boots). Reconstruct path, parameter name, encoded value, status, what you controlled, what changed, and what stayed the same — from Network evidence only.",
      instructorNote:
        "Synthesis only on the local target. No vulnerability hunting.",
      body:
        "<p>Field note format (use your own words):</p>" +
        "<p><strong>ACTION:</strong> searched for “trail camera”</p>" +
        "<p><strong>REQUEST:</strong> <code>GET /search?q=…</code></p>" +
        "<p><strong>OBSERVATION:</strong> identify path, parameter name, value (including encoding), status, and how the response relates.</p>" +
        "<p>Then change <strong>one</strong> input to another benign term and compare:</p>" +
        "<ul>" +
        "<li>What you controlled</li>" +
        "<li>Where it appeared</li>" +
        "<li>What changed</li>" +
        "<li>What stayed the same</li>" +
        "<li>What evidence supports the conclusion</li>" +
        "</ul>" +
        "<p>Do not look for a vulnerability — reconstruct the input trail.</p>",
      successFeedback: "That is disciplined input tracing: action → parameter → compare → evidence.",
      concepts: [
        { id: "path", label: "path search", terms: ["search", "/search", "path"] },
        { id: "param", label: "parameter q", terms: ["q", "parameter", "name"] },
        { id: "value", label: "encoded value", terms: ["trail", "camera", "%20", "encode", "boots", "value"] },
        { id: "status", label: "status 200", terms: ["200", "status"] },
        { id: "compare", label: "comparison", terms: ["change", "same", "compare", "control", "different", "one"] }
      ],
      passCount: 4,
      hints: [
        "Name path, q, the encoded phrase, status, then what moved when you re-searched.",
        "GET /search, parameter q, trail%20camera (or similar), status 200; second search changes only the value.",
        "Action trail camera → GET /search with parameter q (often trail%20camera), status 200. A second benign search keeps path and name q; only the value changes — that value is what you controlled."
      ]
    },
    {
      id: "l-model",
      part: "L",
      phase: "APPLY",
      kind: "read",
      title: "Mental model",
      body:
        "<p>Carry this investigative model forward:</p>" +
        '<ol class="hb-flow" aria-label="Input investigation model">' +
        "<li>What did I type or select?</li>" +
        "<li>Where did that input appear in the request?</li>" +
        "<li>Was it query string, body, path, or another field?</li>" +
        "<li>What is the parameter name? The value?</li>" +
        "<li>Change one thing; compare request and response</li>" +
        "<li>Record only what evidence supports</li>" +
        "</ol>" +
        "<p>On Trail Supply you traced:</p>" +
        "<ul>" +
        "<li>Search → query parameter <code>q</code> (with encoding when needed)</li>" +
        "<li>Multi-param demo → <code>q</code> and <code>sort</code> joined by <code>&amp;</code></li>" +
        "<li>Login → JSON <strong>body</strong></li>" +
        "<li>Product link → path <code>/products/42</code></li>" +
        "</ul>" +
        "<p class=\"hb-loop\">OBSERVE → COMPARE → REASON</p>" +
        "<p>Lesson 7 will look at cookies and sessions. You now know how to ask where your input went.</p>"
    },
    {
      id: "m-reflect",
      part: "M",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "Where my input went",
      title: "Reflection",
      prompt:
        "Which placement surprised you most — query string, request body, or path — and what would you check first on the next authorized app you inspect?",
      instructorNote:
        "Soft-graded. Any honest placement + next-check habit is enough.",
      body: "<p>Write from the Trail Supply work you just did. Stored as a learning note, not a score.</p>",
      concepts: [
        {
          id: "insight",
          label: "placement insight",
          terms: [
            "query",
            "body",
            "path",
            "parameter",
            "input",
            "compare",
            "change",
            "network",
            "q",
            "surprise"
          ]
        }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Name one place input appeared that the shopper UI did not spell out.",
        "Query q=, login JSON body, or /products/42 are fair answers — plus what you would open in Network next time.",
        "Example: I did not expect login values to sit only in the POST body; next time I will check Payload as well as the URL."
      ]
    }
  ];

  Hackbot.Lesson6 = {
    id: "parameters",
    number: 6,
    title: "Parameters and User Input",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    completeBanner:
      "Lesson 6 is complete. You can review steps or continue to Lesson 7 — Cookies and Sessions.",
    goal:
      "Trace user actions into query parameters, request bodies, and path values on Trail Supply, and compare requests by changing one benign input at a time.",
    steps: STEPS
  };
})(window);
