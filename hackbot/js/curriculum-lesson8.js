/**
 * Module 1 Lesson 8 — Browser Developer Tools.
 * Consolidation: question → choose tool → collect evidence → interpret carefully.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-question-first",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Start with a question",
      prompt:
        "Why should an investigator choose a DevTools panel based on a question, instead of clicking randomly through tabs?",
      instructorNote:
        "Question before tool. Panels are selected to answer something specific.",
      body:
        "<p><strong>Teach.</strong> Lessons 1–7 already used Elements, Network, headers, status, parameters, bodies, and Application/Cookies.</p>" +
        "<p>Lesson 8 consolidates: do not wander tabs. Follow:</p>" +
        '<ol class="hb-flow" aria-label="Investigation loop">' +
        "<li>QUESTION</li>" +
        "<li>CHOOSE TOOL</li>" +
        "<li>COLLECT EVIDENCE</li>" +
        "<li>CONNECT EVIDENCE</li>" +
        "<li>FORM CONCLUSION</li>" +
        "</ol>" +
        "<p><strong>Demonstrate the idea:</strong> “What is the search input’s name?” → open <strong>Elements</strong>, not Network. “What did Search send?” → open <strong>Network</strong>.</p>",
      successFeedback: "Tools follow questions — not the other way around.",
      teach:
        "Investigators start with a question and choose a DevTools panel on purpose — random clicking creates noise, not evidence.",
      concepts: [
        { id: "question", label: "start with question", terms: ["question", "ask", "investigat"] },
        { id: "choose", label: "choose tool", terms: ["choose", "select", "pick", "panel", "tool", "right"] },
        { id: "not-random", label: "not random clicking", terms: ["random", "wander", "click around", "without", "purpose", "instead"] }
      ],
      passCount: 2,
      hints: [
        "What comes first — a tab, or something you want to learn?",
        "Start with a question, then choose the panel that can answer it.",
        "Investigators start with a question and choose a DevTools panel on purpose — random clicking creates noise, not evidence."
      ]
    },
    {
      id: "b-elements",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Elements — page structure",
      prompt:
        "What kinds of questions is the Elements panel best for? Name one Trail Supply example (for example the search form or an attribute).",
      instructorNote:
        "DOM, attributes, links, forms. Point at #search-form / input#q / name=q.",
      body:
        "<p><strong>Teach:</strong> <strong>Elements</strong> shows the live page structure (DOM): tags, attributes, links, forms.</p>" +
        "<p><strong>Demonstrate — where to click:</strong></p>" +
        "<ol>" +
        "<li>Trail Supply → <kbd>F12</kbd> → <strong>Elements</strong>.</li>" +
        "<li>Right-click the search box → Inspect, or Ctrl/Cmd+F for <code>search-form</code>.</li>" +
        "<li>Find input <code>#q</code> with <code>name=\"q\"</code>.</li>" +
        "</ol>" +
        "<p>Good questions for Elements: which element produced this control? What are its attributes? What is the form method/action?</p>",
      successFeedback: "Elements answers structure questions about what is on the page.",
      teach:
        "Elements is for DOM structure and attributes. On Trail Supply you can inspect the search form and input name=q.",
      concepts: [
        { id: "panel", label: "Elements", terms: ["elements", "dom", "inspector"] },
        { id: "use", label: "structure/attrs", terms: ["form", "input", "attribute", "link", "structure", "dom", "name", "id"] },
        { id: "example", label: "Trail Supply example", terms: ["search", "q", "form", "input", "trail"] }
      ],
      passCount: 2,
      hints: [
        "Which panel shows the live HTML tree and attributes?",
        "Elements — for forms/inputs/attributes; Trail Supply’s search input name=q is a good example.",
        "Elements is for DOM structure and attributes. On Trail Supply you can inspect the search form and input name=q."
      ]
    },
    {
      id: "c-network",
      part: "C",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Network — traffic",
      prompt:
        "What kinds of questions is the Network panel best for? Name one concrete Trail Supply observation you already know how to make.",
      instructorNote:
        "Requests, methods, URLs, status, headers, params, bodies, responses.",
      body:
        "<p><strong>Network</strong> is for traffic: requests, methods, URLs, status codes, headers, parameters, request bodies, responses, and basic sequence.</p>" +
        "<p>Good questions:</p>" +
        "<ul>" +
        "<li>What request happened when I searched?</li>" +
        "<li>What status came back?</li>" +
        "<li>What headers or body accompanied that exchange?</li>" +
        "</ul>" +
        "<p>You have already used Network for search, login, redirects, and session lab traffic. Lesson 8 asks you to <em>choose</em> it when the question is about traffic.</p>",
      successFeedback: "Network answers traffic questions — what was sent and what came back.",
      teach:
        "Network is for traffic evidence: requests, status codes, headers, parameters, bodies. Trail Supply search or login are familiar examples.",
      concepts: [
        { id: "panel", label: "Network", terms: ["network"] },
        { id: "use", label: "traffic evidence", terms: ["request", "response", "status", "header", "url", "method", "parameter", "body", "traffic"] },
        { id: "example", label: "Trail Supply traffic", terms: ["search", "login", "status", "200", "401", "boots", "session"] }
      ],
      passCount: 2,
      hints: [
        "Which panel lists HTTP exchanges after you click Search?",
        "Network — for requests/status/headers; e.g. GET /search?q=boots → 200.",
        "Network is for traffic evidence: requests, status codes, headers, parameters, bodies. Trail Supply search or login are familiar examples."
      ]
    },
    {
      id: "d-application",
      part: "D",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Application — browser state",
      prompt:
        "When would you open Application/Storage instead of Network? Mention cookies or another storage area, connecting to Lesson 7 if helpful.",
      instructorNote:
        "Cookies, local/session storage, IndexedDB awareness, service workers. Do not dig into Hackbot’s own IDB.",
      body:
        "<p><strong>Application</strong> (sometimes labeled Storage) is for browser-held state: cookies, local storage, session storage, IndexedDB awareness, and service worker registrations.</p>" +
        "<p>Lesson 7 used Application → Cookies for <code>trail_session</code>. Remember: Trail Supply’s SW lab also uses training-mirror headers in Network — those are not native Set-Cookie/Cookie. Application still shows the real mirrored cookie jar entry.</p>" +
        "<p>Do not confuse Trail Supply storage with Hackbot’s own IndexedDB learner progress.</p>",
      successFeedback: "Application answers “what state is stored in the browser?”",
      teach:
        "Open Application/Storage for browser state such as cookies. Lesson 7’s trail_session is the familiar Trail Supply example.",
      concepts: [
        { id: "panel", label: "Application", terms: ["application", "storage"] },
        { id: "state", label: "browser state", terms: ["cookie", "local storage", "session storage", "indexeddb", "service worker", "state"] },
        { id: "lesson7", label: "Lesson 7 link", terms: ["trail_session", "cookie", "session", "lesson 7"] }
      ],
      passCount: 2,
      hints: [
        "Where do you look for cookies without reading every Network row?",
        "Application/Storage — cookies and related browser state; Lesson 7’s trail_session is an example.",
        "Open Application/Storage for browser state such as cookies. Lesson 7’s trail_session is the familiar Trail Supply example."
      ]
    },
    {
      id: "e-sources",
      part: "E",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Sources — loaded code/resources",
      prompt:
        "Open Sources (or Network → JS). Which Trail Supply JavaScript resource initiates search/login actions, and what kind of question does Sources answer?",
      instructorNote:
        "Expect js/app.js. Sources = what client-side code/resources loaded — not exploit development.",
      body:
        "<p><strong>Sources</strong> is for inspecting resources the page loaded — especially JavaScript — so you can see what client-side code exists.</p>" +
        "<p>Good questions:</p>" +
        "<ul>" +
        "<li>What scripts did the browser load?</li>" +
        "<li>Which resource seems related to this interface?</li>" +
        "<li>Can I connect Elements/Network behavior to a loaded script?</li>" +
        "</ul>" +
        "<p>On Trail Supply, find <code>js/app.js</code> (also visible as a Network JS request). You do not need deep JavaScript skill — only to identify the resource. This is inspection, not exploitation.</p>",
      successFeedback: "Sources (and Network JS) show which client scripts loaded — e.g. app.js.",
      teach:
        "Sources answers which code/resources loaded. Trail Supply’s js/app.js is the script that starts search and related actions.",
      concepts: [
        { id: "panel", label: "Sources", terms: ["sources", "source", "network"] },
        { id: "resource", label: "app.js", terms: ["app.js", "js/app.js", "script", "javascript"] },
        { id: "use", label: "loaded code", terms: ["load", "resource", "client", "code", "script"] }
      ],
      passCount: 2,
      hints: [
        "Which file under Trail Supply’s js/ folder handles the search form?",
        "Sources/Network show js/app.js — client script that initiates local fetches.",
        "Sources answers which code/resources loaded. Trail Supply’s js/app.js is the script that starts search and related actions."
      ]
    },
    {
      id: "f-console",
      part: "F",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Console — runtime evidence",
      prompt:
        "What is the Console panel useful for, and what benign value do you see if you evaluate document.title on Trail Supply?",
      instructorNote:
        "Messages/errors/warnings; benign evaluation only. Expect title Trail Supply. No payloads.",
      body:
        "<p><strong>Console</strong> shows runtime messages: logs, warnings, and errors from page JavaScript. It can also evaluate simple benign expressions for inspection.</p>" +
        "<p>On Trail Supply:</p>" +
        "<ol>" +
        "<li>Open Console</li>" +
        "<li>Look for the benign training log from <code>app.js</code> (script ready)</li>" +
        "<li>Evaluate <code>document.title</code> — expect <code>Trail Supply</code></li>" +
        "<li>Optionally try <code>location.pathname</code></li>" +
        "</ol>" +
        "<p>Do <strong>not</strong> use Console for XSS, cookie theft, session edits, or exploit scripts. Observation only.</p>",
      successFeedback: "Console is for runtime messages and safe inspection — e.g. document.title → Trail Supply.",
      teach:
        "Console is for runtime messages and benign checks. On Trail Supply, document.title is Trail Supply.",
      concepts: [
        { id: "panel", label: "Console", terms: ["console"] },
        { id: "use", label: "runtime messages", terms: ["error", "warning", "log", "message", "runtime", "evaluate"] },
        { id: "title", label: "document.title", terms: ["trail supply", "document.title", "title"] }
      ],
      passCount: 2,
      hints: [
        "Which panel shows JS errors and lets you type document.title?",
        "Console — runtime evidence; document.title should be Trail Supply.",
        "Console is for runtime messages and benign checks. On Trail Supply, document.title is Trail Supply."
      ]
    },
    {
      id: "g-choose-tool",
      part: "G",
      phase: "YOU TRY",
      kind: "exercise",
      title: "Choose the right tool",
      prompt:
        "Match tools to questions: (1) status code of a request, (2) attributes on a form input, (3) browser-stored cookies, (4) which JS resources loaded, (5) a JavaScript error from the page.",
      instructorNote:
        "Network; Elements; Application; Sources and/or Network; Console. Accept reasonable alternates.",
      body:
        "<p>Practice tool selection. For each question, name the best primary panel (a second panel is fine when both legitimately help):</p>" +
        "<ol>" +
        "<li>What status code did a request return?</li>" +
        "<li>What attributes are on a form input?</li>" +
        "<li>What cookies are stored in the browser?</li>" +
        "<li>Which JavaScript resources loaded?</li>" +
        "<li>What JavaScript error did the page emit?</li>" +
        "</ol>",
      successFeedback: "You mapped questions to Elements, Network, Application, Sources, and Console.",
      teach:
        "1 Network (status). 2 Elements (attributes). 3 Application (cookies). 4 Sources or Network (JS resources). 5 Console (errors).",
      concepts: [
        { id: "net", label: "Network for status", terms: ["network", "status"] },
        { id: "el", label: "Elements for attributes", terms: ["elements", "attribute", "form", "input"] },
        { id: "app", label: "Application for cookies", terms: ["application", "storage", "cookie"] },
        { id: "src", label: "Sources/Network for JS", terms: ["sources", "network", "javascript", "script", "resource"] },
        { id: "con", label: "Console for errors", terms: ["console", "error"] }
      ],
      passCount: 4,
      hints: [
        "Status→Network; input attrs→Elements; cookies→Application; scripts→Sources/Network; JS error→Console.",
        "List the five panel names next to the five questions.",
        "1 Network (status). 2 Elements (attributes). 3 Application (cookies). 4 Sources or Network (JS resources). 5 Console (errors)."
      ]
    },
    {
      id: "h-reduce-noise",
      part: "H",
      phase: "EXPLAIN",
      kind: "exercise",
      title: "Reduce noise",
      prompt:
        "Describe a low-noise Network experiment: what do you clear, how many actions do you trigger, and how does that connect to “change one thing at a time”?",
      instructorNote:
        "Clear log → one action → observe. Fetch/XHR filter optional. Preserve log only when needed.",
      body:
        "<p>Network gets noisy fast. Signal reduction:</p>" +
        "<ul>" +
        "<li>Clear the Network log before an experiment</li>" +
        "<li>Trigger <strong>one</strong> action</li>" +
        "<li>Look at what appeared</li>" +
        "<li>Use simple filters (e.g. Fetch/XHR) when helpful</li>" +
        "<li>Use Preserve log only when the investigation truly needs it</li>" +
        "</ul>" +
        "<p class=\"hb-loop\">ONE ACTION → OBSERVE RESULTING TRAFFIC</p>" +
        "<p>Same discipline as Lesson 6: <strong>CHANGE ONE THING AT A TIME</strong>. This is experimental control — not automated scanning.</p>",
      successFeedback: "Clear → one action → observe. That keeps Network evidence readable.",
      teach:
        "Clear the Network log, trigger one action, observe the resulting traffic — change one thing at a time.",
      concepts: [
        { id: "clear", label: "clear log", terms: ["clear", "empty", "reset", "noise"] },
        { id: "one", label: "one action", terms: ["one", "single", "action", "at a time"] },
        { id: "observe", label: "observe result", terms: ["observe", "watch", "result", "traffic", "appear"] }
      ],
      passCount: 2,
      hints: [
        "What do you clear first, and how many clicks follow?",
        "Clear Network, perform one action, then inspect what appeared.",
        "Clear the Network log, trigger one action, observe the resulting traffic — change one thing at a time."
      ]
    },
    {
      id: "i-connect",
      part: "I",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Connect evidence across panels",
      prompt:
        "For “What happens when I search for trail camera?”, name at least three panels you would use and what each contributes to one evidence trail.",
      instructorNote:
        "Elements form → Network GET search?q=trail%20camera → details/status/JSON → maybe Sources app.js / Application if relevant.",
      body:
        "<p>One observation often leads to another panel. Example question:</p>" +
        "<p><em>What happens when I search for trail camera?</em></p>" +
        "<ul>" +
        "<li><strong>Elements</strong> — identify the search form/input</li>" +
        "<li><strong>Network</strong> — observe <code>GET …/search?q=trail%20camera</code></li>" +
        "<li><strong>Network details</strong> — method, path, parameter, status, Content-Type</li>" +
        "<li><strong>Response</strong> — JSON body</li>" +
        "<li><strong>Sources/Network</strong> — <code>js/app.js</code> initiates the fetch</li>" +
        "<li><strong>Application</strong> — only if state is part of the question</li>" +
        "</ul>" +
        "<p>Build a connected trail — not isolated screenshots of every tab.</p>",
      successFeedback: "A single question can pull a chain across Elements → Network → Sources.",
      teach:
        "Elements shows the search input; Network shows GET /search?q=trail%20camera and the JSON response; Sources/Network identifies js/app.js — one connected trail.",
      concepts: [
        { id: "elements", label: "Elements", terms: ["elements", "form", "input"] },
        { id: "network", label: "Network", terms: ["network", "search", "request", "status", "q", "response"] },
        { id: "more", label: "another panel", terms: ["sources", "app.js", "application", "response", "json", "header"] },
        { id: "chain", label: "connected trail", terms: ["connect", "trail", "chain", "across", "then", "next"] }
      ],
      passCount: 3,
      hints: [
        "Start in Elements for the form, then Network for the request — what third panel helps?",
        "Elements + Network + Sources (app.js) or Response JSON is a solid chain.",
        "Elements shows the search input; Network shows GET /search?q=trail%20camera and the JSON response; Sources/Network identifies js/app.js — one connected trail."
      ]
    },
    {
      id: "j-evidence-vs-interp",
      part: "J",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Evidence versus interpretation",
      prompt:
        "Give one example of an observation/evidence statement and one interpretation grounded in that evidence. Then say what would be weak speculation beyond the evidence.",
      instructorNote:
        "Evidence first, interpret second, no overclaim. Foundational for Lesson 10.",
      body:
        "<p>Separate <strong>observation</strong> from <strong>interpretation</strong>:</p>" +
        "<ul>" +
        "<li><strong>Evidence:</strong> “Network shows <code>GET /search?q=boots</code> returned <code>200</code>.”</li>" +
        "<li><strong>Interpretation:</strong> “The search action sends the user’s term as query parameter <code>q</code>.”</li>" +
        "<li><strong>Weak speculation:</strong> “The site must be insecure because it uses a query parameter.”</li>" +
        "</ul>" +
        "<p>Evidence first. Interpret second. Do not claim more than the evidence supports. This discipline carries into Lesson 10.</p>",
      successFeedback: "You distinguished evidence, interpretation, and unsupported speculation.",
      teach:
        "Evidence: Network shows GET /search?q=boots → 200. Interpretation: search sends the term as q. Weak speculation: calling the site insecure only because q is in the URL.",
      concepts: [
        { id: "evidence", label: "evidence/observation", terms: ["evidence", "observation", "shows", "network", "200", "status", "saw", "panel"] },
        { id: "interp", label: "interpretation", terms: ["interpret", "means", "parameter", "q", "sends", "because"] },
        { id: "limit", label: "avoid overclaim", terms: ["speculat", "beyond", "cannot", "insecure", "more than", "limit", "support"] }
      ],
      passCount: 2,
      hints: [
        "Quote something a panel showed, then say what it suggests — and what it does not prove.",
        "Evidence = Network fact; interpretation = q carries the search term; speculation = claiming insecurity without proof.",
        "Evidence: Network shows GET /search?q=boots → 200. Interpretation: search sends the term as q. Weak speculation: calling the site insecure only because q is in the URL."
      ]
    },
    {
      id: "k-case",
      part: "K",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Guided Trail Supply case",
      prompt:
        "Investigate: “How does Trail Supply process a product search?” Clear Network, search for trail camera (or boots), and report evidence from Elements, Network (method/path/q/status/Content-Type), response JSON, and the app.js resource.",
      instructorNote:
        "Guided mini-case. Do not force Application unless they started a session.",
      body:
        "<p><strong>Question:</strong> How does Trail Supply process a product search?</p>" +
        "<ol>" +
        "<li>Clear Network</li>" +
        "<li>Elements — confirm search form / <code>name=\"q\"</code></li>" +
        "<li>Search for <strong>trail camera</strong> or <strong>boots</strong></li>" +
        "<li>Network — <code>GET</code> <code>/search</code>, parameter <code>q</code>, status <code>200</code>, <code>Content-Type: application/json</code></li>" +
        "<li>Response — JSON results</li>" +
        "<li>Sources or Network — <code>js/app.js</code></li>" +
        "</ol>" +
        "<p>Write a short evidence list. Skip panels that add nothing to this question.</p>",
      successFeedback: "You collected a multi-panel search evidence set from the real local app.",
      teach:
        "Elements shows the search input name=q. Network shows GET /search with q, status 200, Content-Type application/json and a JSON body. js/app.js is the client script that sends the fetch.",
      concepts: [
        { id: "elements", label: "Elements form", terms: ["elements", "form", "q", "input"] },
        { id: "network", label: "Network search", terms: ["network", "get", "search", "200", "q"] },
        { id: "response", label: "JSON response", terms: ["json", "response", "content-type", "application/json", "results"] },
        { id: "script", label: "app.js", terms: ["app.js", "sources", "script"] }
      ],
      passCount: 3,
      hints: [
        "Mention the form, the GET /search?q=… 200 JSON exchange, and app.js.",
        "Elements: name=q. Network: GET search with q, status 200, JSON. Sources: js/app.js.",
        "Elements shows the search input name=q. Network shows GET /search with q, status 200, Content-Type application/json and a JSON body. js/app.js is the client script that sends the fetch."
      ]
    },
    {
      id: "l-challenge",
      part: "L",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Investigation challenge",
      prompt:
        "Produce an evidence chain for Trail Supply search: QUESTION, EVIDENCE from at least three panels, INTERPRETATION, and a LIMIT (what you can and cannot conclude).",
      instructorNote:
        "Reward disciplined chains. Reject empty tool lists without observations.",
      body:
        "<p>Investigate one benign Trail Supply search and write:</p>" +
        "<p><strong>QUESTION</strong> — How does Trail Supply search work?</p>" +
        "<p><strong>EVIDENCE 1–3+</strong> — concrete panel observations (Elements / Network / Response / Sources…)</p>" +
        "<p><strong>INTERPRETATION</strong> — what the evidence supports</p>" +
        "<p><strong>LIMIT</strong> — what you can conclude, and what you cannot conclude from this evidence alone</p>" +
        "<p>Discipline over guessing.</p>",
      successFeedback: "That is a complete mini-investigation: question, evidence chain, interpretation, and limits.",
      teach:
        "QUESTION: how search works. EVIDENCE: Elements name=q; Network GET /search?q=… 200 JSON; Sources app.js. INTERPRETATION: typed term becomes query q. LIMIT: this does not by itself prove a vulnerability.",
      concepts: [
        { id: "question", label: "question", terms: ["question", "how", "search"] },
        { id: "evidence", label: "multi-panel evidence", terms: ["elements", "network", "evidence", "200", "q=", "json", "app.js", "sources", "name=q"] },
        { id: "interp", label: "interpretation", terms: ["interpret", "means", "parameter", "sends", "query"] },
        { id: "limit", label: "limits", terms: ["cannot", "limit", "only", "evidence", "conclude", "not prove", "beyond"] }
      ],
      passCount: 3,
      hints: [
        "Include a question, at least three concrete observations, an interpretation, and one limit.",
        "Example limit: you can conclude q carries the term; you cannot conclude the shop is “insecure” from that alone.",
        "QUESTION: how search works. EVIDENCE: Elements name=q; Network GET /search?q=… 200 JSON; Sources app.js. INTERPRETATION: typed term becomes query q. LIMIT: this does not by itself prove a vulnerability."
      ]
    },
    {
      id: "m-workflow",
      part: "M",
      phase: "APPLY",
      kind: "read",
      title: "Browser investigation workflow",
      body:
        "<p>Carry this reusable workflow forward (culmination of Lessons 1–7):</p>" +
        '<ol class="hb-flow" aria-label="Browser investigation workflow">' +
        "<li>Define the question</li>" +
        "<li>Establish a baseline</li>" +
        "<li>Clear irrelevant noise where appropriate</li>" +
        "<li>Perform one action</li>" +
        "<li>Observe</li>" +
        "<li>Choose the appropriate DevTools panel</li>" +
        "<li>Record concrete evidence</li>" +
        "<li>Follow related evidence into another panel if needed</li>" +
        "<li>Separate observation from interpretation</li>" +
        "<li>State only the conclusion the evidence supports</li>" +
        "</ol>" +
        "<p class=\"hb-loop\">QUESTION → TOOL → EVIDENCE → CONNECT → CONCLUSION</p>" +
        "<p>Lesson 9 will look at APIs and JSON more deeply. You now have a browser investigation habit, not just a list of tabs.</p>"
    },
    {
      id: "n-reflect",
      part: "N",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "Question before tool",
      title: "Reflection",
      prompt:
        "Which habit from this lesson will you use next — question-before-tool, one-action Network experiments, or evidence-versus-interpretation — and why?",
      instructorNote:
        "Soft-graded. Any honest habit + reason is enough.",
      body: "<p>Write from the Trail Supply case you just ran. Stored as a learning note, not a score.</p>",
      teach:
        "Example: I will start with a question before opening panels, because random tab-clicking hid the search request until I cleared Network and triggered one action.",
      concepts: [
        {
          id: "habit",
          label: "investigation habit",
          terms: [
            "question",
            "tool",
            "evidence",
            "interpret",
            "network",
            "one",
            "action",
            "clear",
            "panel",
            "habit"
          ]
        }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Name one habit and one reason tied to something you observed.",
        "Example: clearing Network before one search made the q= request obvious.",
        "Example: I will start with a question before opening panels, because random tab-clicking hid the search request until I cleared Network and triggered one action."
      ]
    }
  ];

  Hackbot.Lesson8 = {
    id: "devtools",
    number: 8,
    title: "Browser Developer Tools",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Explain → Demonstrate → You try → Observe → Interpret → Apply → Reflect",
    completeBanner:
      "Lesson 8 is complete. You can review steps; Lessons 9–10 are not built yet.",
    goal:
      "Choose DevTools panels from investigative questions, connect multi-panel evidence on Trail Supply, and separate observation from interpretation.",
    steps: STEPS
  };
})(window);
