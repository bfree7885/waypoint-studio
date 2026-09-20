/**
 * Module 1 Lesson 2 — Inspecting a Web Page.
 * Synthetic Trail Supply storefront; no live targets.
 * Instructor Mode: teach HTML/DOM before graded inspection.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var LINK_EXCERPT =
    '<a href="/products/42" class="product-link" data-product-id="42">\n' +
    "  Trail Camera\n" +
    "</a>";

  var FORM_EXCERPT =
    '<form id="search-form" action="/search" method="GET">\n' +
    '  <input name="q">\n' +
    '  <button type="submit">Search</button>\n' +
    "</form>";

  var SCRIPT_EXCERPT = '<script src="js/app.js"><\/script>';

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-visible",
      part: "A",
      phase: "TEACH",
      kind: "exercise",
      embedTrainingPage: true,
      title: "What the browser shows you",
      prompt: "Name two things a shopper can see on the Trail Supply page (no DevTools yet).",
      instructorNote:
        "Headings, products, search, or sign-in. Stay with the visible interface.",
      body:
        "<p><strong>Teach.</strong> Lesson 1: client → request → server → response → rendered result. Lesson 2 asks what a <strong>page</strong> is made of.</p>" +
        "<ul>" +
        "<li><strong>Rendered page</strong> — the picture and text you see.</li>" +
        "<li><strong>Underlying structure</strong> — HTML the browser received (we open that next).</li>" +
        "</ul>" +
        "<p><strong>Guided look:</strong> use the Trail Supply preview below (or open it in another tab). Do <em>not</em> open DevTools yet.</p>" +
        '<p class="hb-loop">Look → Identify → Ask why → Form a model → Verify</p>' +
        "<p>What should you notice? Shop name, product cards, a search box, account/sign-in, navigation links.</p>",
      reveal:
        "<p>Visible interface ≠ complete application structure. Shoppers see Trail Supply, products, search, and login — not every attribute or comment underneath.</p>",
      successFeedback: "You stayed with what a person can see. Next we learn the language under that picture.",
      teach:
        "From the visible page alone you can name Trail Supply, products like Trail Camera or Headlamp, the search box, and sign-in/account. That is the interface — not the whole structure.",
      concepts: [
        { id: "brand", label: "visible shop", terms: ["trail supply", "heading", "title", "store"] },
        { id: "products", label: "products", terms: ["product", "trail camera", "headlamp", "catalog", "camera"] },
        { id: "search", label: "search", terms: ["search", "find gear"] },
        { id: "login", label: "login", terms: ["login", "sign in", "account", "username", "password"] },
        { id: "nav", label: "navigation", terms: ["nav", "optics", "gear guide", "home", "link"] }
      ],
      passCount: 2,
      hints: [
        "Without DevTools, what would a shopper still know about this shop?",
        "Point at the Trail Supply heading, a product name, search, or sign-in.",
        "Say two of: Trail Supply heading, product cards, search, login, navigation."
      ]
    },
    {
      id: "b-inspector",
      part: "B",
      phase: "TEACH",
      kind: "exercise",
      embedTrainingPage: true,
      title: "HTML basics, then open Elements",
      prompt:
        "Find the HTML element for the Trail Supply page heading. Report the tag type, the visible text, and the id or class.",
      instructorNote:
        "Right-click the heading → Inspect, or F12 → Elements. Look for h1 with Trail Supply.",
      body:
        "<p><strong>Teach — HTML before you dig.</strong> You do not need prior HTML knowledge.</p>" +
        "<ul>" +
        "<li><strong>HTML</strong> — structured text describing page content and structure.</li>" +
        "<li><strong>Tag / element</strong> — a piece of structure in angle brackets: <code>&lt;form&gt;</code>, <code>&lt;input&gt;</code>, <code>&lt;button&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;h1&gt;</code>.</li>" +
        "<li><strong>Opening / closing</strong> — pairs like <code>&lt;h1&gt;…&lt;/h1&gt;</code>. The slash ends the element.</li>" +
        "<li><strong>Attribute</strong> — name/value on a tag: <code>id=\"site-heading\"</code>.</li>" +
        "<li><strong>Rendered page vs DOM</strong> — what you see vs the live tree. The <strong>Elements</strong> panel shows that tree.</li>" +
        "</ul>" +
        "<p><strong>Demonstrate</strong> one element pattern:</p>" +
        '<pre class="hb-http" tabindex="0">&lt;form id="search-form" action="/search" method="GET"&gt;</pre>' +
        "<ul>" +
        "<li><code>form</code> = element / tag type</li>" +
        "<li><code>id</code> = attribute name</li>" +
        "<li><code>search-form</code> = attribute value</li>" +
        "</ul>" +
        "<p><strong>Now apply that pattern to the page heading.</strong> Exact navigation (menus vary):</p>" +
        "<ol>" +
        "<li>Open Trail Supply (preview or tab).</li>" +
        "<li>Press <kbd>F12</kbd>, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> (macOS: <kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd>), or right-click the big title → <strong>Inspect</strong>.</li>" +
        "<li>Select <strong>Elements</strong> (sometimes Inspector).</li>" +
        "<li>Highlight the heading, or Ctrl/Cmd+F in Elements for <code>site-heading</code>.</li>" +
        "</ol>" +
        "<p><strong>What you are looking for:</strong></p>" +
        '<pre class="hb-http" tabindex="0">&lt;h1 id="site-heading" class="site-title"&gt;Trail Supply&lt;/h1&gt;</pre>' +
        "<p>Report tag type, visible text, and id or class — same pattern as the form demo.</p>",
      reveal:
        "<p>The heading is an <code>&lt;h1&gt;</code> with text <strong>Trail Supply</strong>, <code>id=\"site-heading\"</code>, class <code>site-title</code>.</p>",
      successFeedback: "You inspected a real element instead of guessing from the screenshot.",
      teach:
        "Open Elements and find the h1. Text is Trail Supply. id is site-heading. class is site-title. Same name/value attribute pattern as form id=\"search-form\".",
      concepts: [
        { id: "tag", label: "heading tag", terms: ["h1", "heading"] },
        { id: "text", label: "heading text", terms: ["trail supply"] },
        { id: "idclass", label: "id or class", terms: ["site-heading", "site-title", "id", "class"] }
      ],
      passCount: 2,
      hints: [
        "Right-click the large title → Inspect. What tag wraps it? What is the text? Does it have an id?",
        "Look for an h1. Text Trail Supply. Check id and class on that same tag.",
        "It is an h1, text Trail Supply, id site-heading, class site-title."
      ]
    },
    {
      id: "c-html",
      part: "C",
      phase: "DEMONSTRATE",
      kind: "exercise",
      title: "Read a small HTML element",
      prompt: "From this link element, name the destination (href), one product identifier attribute, and the visible label.",
      instructorNote:
        "Name the tag, attributes, values, and visible text. You do not need to write HTML — just read it.",
      body:
        "<p><strong>Demonstrate</strong> the same pattern on a link:</p>" +
        "<ul>" +
        "<li><strong>Element / tag</strong> — <code>a</code> means a link</li>" +
        "<li><strong>Attribute</strong> — named property (<code>href</code>, <code>class</code>, <code>data-product-id</code>)</li>" +
        "<li><strong>Attribute value</strong> — what it is set to</li>" +
        "<li><strong>Visible text</strong> — between the tags</li>" +
        "</ul>" +
        '<pre class="hb-http" tabindex="0">' +
        LINK_EXCERPT.replace(/</g, "&lt;") +
        "</pre>" +
        "<p><strong>Guided try:</strong> what path does <code>href</code> name? What identifier appears? What text would the shopper see?</p>",
      reveal:
        "<p>Destination <code>/products/42</code>, class <code>product-link</code>, <code>data-product-id=\"42\"</code>, label Trail Camera. Identifiers help map resources — not an invitation to attack.</p>",
      successFeedback: "You read structure: where it goes, how it is labeled, how the app names the resource.",
      teach:
        "href is /products/42. data-product-id is 42. Visible text is Trail Camera. class product-link is optional to mention.",
      concepts: [
        { id: "href", label: "destination", terms: ["/products/42", "products/42", "href", "path", "destination"] },
        { id: "class", label: "class", terms: ["product-link", "class"] },
        { id: "idattr", label: "product identifier", terms: ["data-product-id", "product-id", "42", "identifier"] },
        { id: "label", label: "visible label", terms: ["trail camera", "text", "label"] }
      ],
      passCount: 2,
      hints: [
        "What does href point to? What class is on the tag? Is there an id-like attribute? What text would the shopper see?",
        "Destination /products/42, class product-link, data-product-id 42, visible text Trail Camera.",
        "The link goes to /products/42, is classed product-link, carries data-product-id=\"42\", and shows Trail Camera."
      ]
    },
    {
      id: "d-links",
      part: "D",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Inspect links on the page",
      prompt: "What is the destination of the Trail Camera product link? Note anything else the href or attributes tell you.",
      instructorNote:
        "Inspect the Trail Camera link. Read href first. Relative paths still name a resource on this host.",
      body:
        "<p><strong>Independent try.</strong> You already read a link excerpt. Now find it in Elements.</p>" +
        "<ol>" +
        "<li>Open Trail Supply.</li>" +
        "<li>Right-click the <strong>Trail Camera</strong> link → Inspect.</li>" +
        "<li>On the highlighted <code>&lt;a&gt;</code>, find <code>href</code> — that is the destination.</li>" +
        "<li>Also look for <code>data-product-id</code>.</li>" +
        "</ol>" +
        "<p>Optional: <strong>Optics</strong> may show a query string; <strong>Gear guide</strong> may go somewhere the link text does not spell out.</p>" +
        "<p>We are mapping resources, not testing access control.</p>",
      successFeedback: "You mapped a resource from a link instead of trusting the label alone.",
      teach:
        "Trail Camera href is /products/42. The product identifier is 42 (data-product-id). Optics may use a query; Gear guide may go to /help/sizing.",
      concepts: [
        { id: "path", label: "product path", terms: ["/products/42", "products/42"] },
        { id: "id", label: "product identifier", terms: ["42", "data-product-id", "product-id"] }
      ],
      passCount: 1,
      hints: [
        "Inspect the Trail Camera anchor. What is in href?",
        "The href is /products/42 — a relative path. data-product-id repeats 42.",
        "Destination: /products/42. The product identifier is 42."
      ]
    },
    {
      id: "e-forms",
      part: "E",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Forms and inputs",
      prompt: "If the learner searches for boots, what information would you expect the browser to send?",
      instructorNote:
        "Connect to Lesson 1: a form describes a future HTTP request — method, path, and named parameters.",
      body:
        "<p><strong>Teach.</strong> A <strong>form</strong> tells the browser how to build a request (Lesson 1: method, path, parameters).</p>" +
        "<p><strong>Demonstrate:</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        FORM_EXCERPT.replace(/</g, "&lt;") +
        "</pre>" +
        "<ul>" +
        "<li><code>action=\"/search\"</code> — path</li>" +
        "<li><code>method=\"GET\"</code> — HTTP method</li>" +
        "<li><code>&lt;input name=\"q\"&gt;</code> — parameter <em>name</em> is <code>q</code>; typed text is the <em>value</em></li>" +
        "</ul>" +
        "<p>Example: typing <code>boots</code> → often <code>GET /search?q=boots</code>.</p>" +
        "<p><strong>Guided try:</strong> for <strong>boots</strong>, name method, path, and q value. Confirm with Inspect on the search form if you want.</p>",
      reveal:
        "<p>A GET to <code>/search</code> with <code>q=boots</code> — often written <code>GET /search?q=boots</code>.</p>",
      successFeedback: "You connected the form to the request it would produce.",
      teach:
        "The browser would send GET /search?q=boots. Method GET, action /search, input name q, value boots.",
      concepts: [
        { id: "method", label: "GET method", terms: ["get", "method"] },
        { id: "action", label: "search path", terms: ["/search", "search"] },
        { id: "param", label: "q parameter", terms: ["q=boots", "q =", "name=\"q\"", "parameter q", "q ", " q"] },
        { id: "value", label: "boots value", terms: ["boots"] }
      ],
      passCount: 2,
      hints: [
        "What method is on the form? What is action? What is the input's name, and what value did we imagine?",
        "GET, path /search, parameter q, value boots — GET /search?q=boots.",
        "The browser would send GET /search?q=boots. Method GET, action /search, input name q, value boots."
      ]
    },
    {
      id: "f-scripts",
      part: "F",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Scripts and resources",
      prompt: "What file would you inspect if you wanted to understand some of the page's client-side behavior?",
      instructorNote:
        "Find the script tag in page source or Elements. Name the file; do not reverse-engineer it.",
      body:
        "<p><strong>Teach:</strong> pages often load JavaScript with <code>&lt;script src=\"…\"&gt;</code>. The <code>src</code> attribute is the file path.</p>" +
        "<p><strong>Demonstrate:</strong></p>" +
        '<pre class="hb-http" tabindex="0">' +
        SCRIPT_EXCERPT.replace(/</g, "&lt;") +
        "</pre>" +
        "<p><strong>Guided try:</strong> in Elements (or View Page Source), find the script near the bottom of Trail Supply HTML. What does <code>src</code> say?</p>" +
        "<p>This lesson does not teach JavaScript reverse engineering — only locating the reference.</p>",
      successFeedback: "You found the client script the page actually loads.",
      teach: "The storefront loads js/app.js — that is the src on the script tag.",
      concepts: [
        { id: "script", label: "script file", terms: ["js/app.js", "app.js", "script"] }
      ],
      passCount: 1,
      hints: [
        "Near the bottom of the HTML, what does the script src attribute say?",
        "The storefront loads js/app.js.",
        "Inspect js/app.js — that is the file this page loads for client-side behavior."
      ]
    },
    {
      id: "g-comments",
      part: "G",
      phase: "OBSERVE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Comments and non-visible structure",
      prompt: "Why might comments or non-visible page structure be interesting during an authorized investigation?",
      instructorNote:
        "View page source or Elements. There is a harmless HTML comment near the top, and a visually hidden catalog hint.",
      body:
        "<p><strong>Teach:</strong> HTML comments look like <code>&lt;!-- … --&gt;</code>. Browsers do not show them as page text. Hidden elements and <code>data-</code> attributes can also exist without looking like shopper copy.</p>" +
        "<p><strong>Demonstrate the idea:</strong></p>" +
        '<pre class="hb-http" tabindex="0">&lt;!-- TODO: replace demo inventory endpoint before release --&gt;</pre>' +
        "<p><strong>Guided try:</strong> find the real comment on Trail Supply (View Page Source, or search in Elements). Then answer why non-visible structure can matter — no secrets here; the point is to look.</p>",
      successFeedback: "You treated hidden structure as part of the map, not as a prize.",
      teach:
        "Comments and hidden nodes can record endpoints, leftover notes, or structure the UI does not advertise. That is mapping, not exploitation. This page’s comment mentions a demo inventory endpoint.",
      concepts: [
        { id: "why", label: "why it matters", terms: ["comment", "hidden", "source", "not visible", "invisible", "todo", "endpoint", "structure", "data-", "because", "why", "reveal", "developer"] }
      ],
      passCount: 1,
      hints: [
        "If shoppers never see it, who was it written for, and what might it name?",
        "Comments and hidden nodes can record endpoints, leftover notes, or structure that the UI does not advertise.",
        "They can reveal how developers think about the app — endpoints, TODOs, hidden labels — without being shown as page copy. That is mapping, not exploitation."
      ]
    },
    {
      id: "h-challenge",
      part: "H",
      phase: "APPLY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Investigation challenge",
      prompt:
        "Inspect Trail Supply and report: (1) page heading element, (2) login form action, (3) login form method, (4) username input name, (5) search form action, (6) product link path, (7) product identifier, (8) JavaScript file, (9) the HTML comment, (10) one additional detail you found yourself.",
      instructorNote:
        "Miniature recon: look, identify, write it down. Exact phrasing is not required.",
      body:
        "<p><strong>Independent try — build a short map.</strong> Use Elements and View Source. Free-text is fine.</p>" +
        "<p>Where to look (you have practiced each skill):</p><ul>" +
        "<li>Heading — the <code>h1</code> you already found</li>" +
        "<li>Login form — Inspect sign-in; read <code>action</code>, <code>method</code>, input <code>name</code>s</li>" +
        "<li>Search form — <code>action</code></li>" +
        "<li>Trail Camera link — <code>href</code> and <code>data-product-id</code></li>" +
        "<li>Script <code>src</code> and the HTML comment</li>" +
        "</ul>" +
        '<p class="hb-loop">Look → Identify → Ask why → Form a model → Verify</p>' +
        "<p>Do not test logins or guess passwords. Report structure.</p>",
      reveal:
        "<ol>" +
        "<li>Heading: <code>h1#site-heading.site-title</code> — Trail Supply</li>" +
        "<li>Login action: <code>/login</code></li>" +
        "<li>Login method: <code>POST</code></li>" +
        "<li>Username field: <code>name=\"username\"</code></li>" +
        "<li>Search action: <code>/search</code></li>" +
        "<li>Product path: <code>/products/42</code> (Trail Camera)</li>" +
        "<li>Identifier: <code>data-product-id=\"42\"</code></li>" +
        "<li>Script: <code>js/app.js</code></li>" +
        "<li>Comment: TODO replace demo inventory endpoint before release</li>" +
        "<li>Other: hidden catalog hint, Optics query, Gear guide → /help/sizing, etc.</li>" +
        "</ol>",
      successFeedback: "That is a first recon map: heading, forms, links, script, comment, plus something you noticed.",
      teach:
        "Heading h1#site-heading Trail Supply; login POST /login username; search /search; product /products/42 id 42; js/app.js; TODO demo inventory; extra e.g. hidden inventory path or /help/sizing.",
      concepts: [
        { id: "heading", label: "heading", terms: ["h1", "site-heading", "site-title", "trail supply"] },
        { id: "loginaction", label: "login action", terms: ["/login", "action=\"/login\""] },
        { id: "loginmethod", label: "login method", terms: ["post"] },
        { id: "userfield", label: "username field", terms: ["username"] },
        { id: "searchaction", label: "search action", terms: ["/search"] },
        { id: "prodpath", label: "product path", terms: ["/products/42", "products/42"] },
        { id: "prodid", label: "product id", terms: ["data-product-id", "product-id", "42"] },
        { id: "script", label: "script file", terms: ["js/app.js", "app.js"] },
        { id: "comment", label: "HTML comment", terms: ["todo", "inventory", "comment", "endpoint"] },
        { id: "extra", label: "own observation", terms: ["hidden", "visually-hidden", "inventory/demo", "demo.json", "optics", "category", "sizing", "headlamp", "17", "skip"] }
      ],
      passCount: 6,
      hints: [
        "Walk once: heading tag, both forms (action/method/names), Trail Camera href + data attribute, script src, view-source for the comment.",
        "Login is POST /login with input name username. Search action is /search. Product href /products/42 and data-product-id 42. Script js/app.js. Comment mentions a demo inventory endpoint.",
        "Heading h1#site-heading Trail Supply; login action /login method POST; username name=username; search /search; product /products/42; id 42; js/app.js; TODO demo inventory endpoint; extra e.g. hidden /inventory/demo.json or /help/sizing."
      ]
    },
    {
      id: "i-map",
      part: "I",
      phase: "APPLY",
      kind: "read",
      title: "Map before you test",
      body:
        "<p>A web application's visible interface is only the beginning of an investigation.</p>" +
        "<p>Researchers examine structure, requests, links, forms, scripts, parameters, and application behavior to build a mental model of how the application works.</p>" +
        "<p><strong>Understanding comes before testing.</strong></p>" +
        "<p class=\"hb-loop\">MAP BEFORE YOU TEST</p>" +
        "<p>Lesson 1: requests and responses. Lesson 2: page structure tells you what requests a browser may make and what resources exist.</p>" +
        "<p>This lesson does not teach exploitation. The habit is to map first.</p>"
    },
    {
      id: "j-reflect",
      part: "J",
      phase: "REFLECT",
      kind: "reflection",
      noteConcept: "What inspection revealed",
      title: "Reflection",
      prompt: "What did inspecting the page reveal that you would not have noticed by simply looking at it?",
      instructorNote:
        "Name one structural fact — a path, a method, a comment, a hidden node — and why the rendered page hid it.",
      body: "<p>Write from the inspection you just did. This is stored as a learning note, not a score.</p>",
      teach:
        "Example: the demo inventory comment, POST /login, or data-product-id are in the structure, not in the shopper-facing copy.",
      concepts: [
        { id: "insight", label: "inspection insight", terms: ["comment", "hidden", "href", "action", "script", "source", "attribute", "form", "id", "path", "not", "visible"] }
      ],
      passCount: 1,
      soft: true,
      hints: [
        "Pick one thing that only showed up in the inspector or source.",
        "Comments, form actions, script paths, and data attributes are easy examples.",
        "Example: the demo inventory comment, POST /login, or data-product-id are in the structure, not in the shopper-facing copy."
      ]
    }
  ];

  Hackbot.Lesson2 = {
    id: "inspect-page",
    number: 2,
    title: "Inspecting a Web Page",
    status: "available",
    trainingPage: PAGE_PATH,
    cycle: "Teach → Demonstrate → Guided try → Independent try → Reason → Reflect",
    completeBanner:
      "Lesson 2 is complete. You can review steps or continue to Lesson 3 — HTTP Requests and Responses.",
    goal: "Learn HTML/DOM basics, then practice inspecting structure, links, forms, scripts, and comments on a synthetic storefront — map before you test.",
    steps: STEPS
  };
})(window);
