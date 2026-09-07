/**
 * Module 1 Lesson 2 — Inspecting a Web Page.
 * Synthetic Trail Supply storefront; no live targets.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});

  var LINK_EXCERPT =
    '<a href="/products/42" class="product-link" data-product-id="42">\n' +
    "  Trail Camera\n" +
    "</a>";

  var FORM_EXCERPT =
    '<form action="/search" method="GET">\n' +
    '  <input name="q">\n' +
    '  <button type="submit">Search</button>\n' +
    "</form>";

  var SCRIPT_EXCERPT = '<script src="js/app.js"><\/script>';

  var PAGE_PATH = "training/web-foundations/lesson-2/";

  var STEPS = [
    {
      id: "a-visible",
      part: "A",
      phase: "EXPLAIN",
      kind: "exercise",
      embedTrainingPage: true,
      title: "What the browser shows you",
      prompt: "What information can you learn just by looking at the page?",
      instructorNote:
        "Name what a shopper would see: headings, products, a search box, a sign-in form. Do not inspect source yet.",
      body:
        "<p>Lesson 1 taught what <strong>requests</strong> and <strong>responses</strong> are. Lesson 2 asks what a <strong>page</strong> is made of — and why the picture on screen is only one representation of the application.</p>" +
        "<p>Look at the Trail Supply storefront (preview below, or open it in another tab). Stay with the visible interface.</p>" +
        '<p class="hb-loop">Look → Identify → Ask why → Form a model → Verify</p>',
      reveal:
        "<p>The rendered interface is useful: you can see a shop name, products, search, and a login. It still does not show everything the browser received or everything the application contains.</p>" +
        "<p><strong>Visible interface ≠ complete application structure.</strong> That is a working observation, not a claim that the page is hiding an exploit.</p>",
      successFeedback:
        "You stayed with what a person can see. Next we will look underneath that picture.",
      concepts: [
        { id: "brand", label: "visible shop", terms: ["trail supply", "heading", "title", "store"] },
        { id: "products", label: "products", terms: ["product", "trail camera", "headlamp", "catalog", "camera"] },
        { id: "search", label: "search", terms: ["search", "find gear"] },
        { id: "login", label: "login", terms: ["login", "sign in", "account", "username", "password"] },
        { id: "nav", label: "navigation", terms: ["nav", "optics", "gear guide", "home", "link"] }
      ],
      passCount: 2,
      hints: [
        "If you could not open Developer Tools, what would you still know about this shop?",
        "Point at a heading, a product name, the search box, or the sign-in form.",
        "Visible pieces include the Trail Supply heading, product cards (Trail Camera, Headlamp), search, account/login, and navigation. That is the interface — not the whole structure."
      ]
    },
    {
      id: "b-inspector",
      part: "B",
      phase: "DEMONSTRATE",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Open the inspector",
      prompt:
        "Find the HTML element containing the Trail Supply page heading. Report the element/tag type, the visible text, and any id or class you notice.",
      instructorNote:
        "Open Developer Tools on the Trail Supply tab. Right-click the heading if that is easier than hunting in the tree.",
      body:
        "<p><strong>HTML</strong> is the document the browser received. The <strong>DOM</strong> is the live tree the browser builds from it. <strong>Elements</strong> are the nodes in that tree (a heading, a link, an input).</p>" +
        "<p>Open Developer Tools on the Trail Supply page (browser menus differ):</p><ul>" +
        "<li>Right-click the heading → <strong>Inspect</strong></li>" +
        "<li><kbd>F12</kbd> where the keyboard supports it</li>" +
        "<li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> on many desktop browsers (<kbd>Cmd</kbd>+<kbd>Option</kbd>+<kbd>I</kbd> on macOS)</li>" +
        "</ul>" +
        "<p>Hackbot does not open the tools for you. Inspect the local page; nothing is automated.</p>",
      reveal:
        "<p>The heading is an <code>&lt;h1&gt;</code> with visible text <strong>Trail Supply</strong>, <code>id=\"site-heading\"</code>, and class <code>site-title</code>.</p>",
      successFeedback: "You inspected a real element instead of guessing from the screenshot.",
      concepts: [
        { id: "tag", label: "heading tag", terms: ["h1", "heading"] },
        { id: "text", label: "heading text", terms: ["trail supply"] },
        { id: "idclass", label: "id or class", terms: ["site-heading", "site-title", "id", "class"] }
      ],
      passCount: 2,
      hints: [
        "Right-click the large title. What tag wraps it? What is the text? Does it have an id?",
        "Look for an h1. The text is Trail Supply. Check id and class on that same tag.",
        "It is an h1, text Trail Supply, id site-heading, class site-title."
      ]
    },
    {
      id: "c-html",
      part: "C",
      phase: "INTERPRET",
      kind: "exercise",
      title: "Read a small HTML element",
      prompt: "What pieces of information could an investigator learn from this element?",
      instructorNote:
        "Name the tag, the attributes, their values, and the visible text. You do not need to write HTML — just read it.",
      body:
        "<p>This is investigation reading, not an HTML class. Distinguish:</p><ul>" +
        "<li><strong>Element / tag</strong> — the kind of node (<code>a</code> is a link)</li>" +
        "<li><strong>Attribute</strong> — a named property on the element (<code>href</code>, <code>class</code>)</li>" +
        "<li><strong>Attribute value</strong> — what that property is set to</li>" +
        "<li><strong>Visible text</strong> — what the rendered page shows</li>" +
        "</ul>" +
        '<pre class="hb-http" tabindex="0">' +
        LINK_EXCERPT.replace(/</g, "&lt;") +
        "</pre>",
      reveal:
        "<p>An investigator can learn the destination <code>/products/42</code>, a class <code>product-link</code>, a product identifier <code>42</code>, and the label Trail Camera. Identifiers like this often help us understand how an application organizes resources — they are not an invitation to attack.</p>",
      successFeedback: "You read structure: where it goes, how it is labeled, and how the app names the resource.",
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
      title: "Inspect links",
      prompt: "What is the destination of the Trail Camera product link? Note anything else the href or attributes tell you.",
      instructorNote:
        "Inspect the Trail Camera link. Read href first. Relative paths still name a resource on this host.",
      body:
        "<p>When you inspect links, pay attention to:</p><ul>" +
        "<li><code>href</code> — where the browser would go</li>" +
        "<li>relative vs absolute paths</li>" +
        "<li>query parameters when present (try <strong>Optics</strong>)</li>" +
        "<li>identifiers in paths</li>" +
        "<li>destinations that are not obvious from the link text (try <strong>Gear guide</strong>)</li>" +
        "</ul>" +
        "<p>These are safe local examples. We are mapping resources, not testing access control.</p>" +
        "<p>Identifiers like <code>42</code> often help us understand how an application organizes resources.</p>",
      successFeedback: "You mapped a resource from a link instead of trusting the label alone.",
      concepts: [
        { id: "path", label: "product path", terms: ["/products/42", "products/42"] },
        { id: "id", label: "product identifier", terms: ["42", "data-product-id", "product-id"] }
      ],
      passCount: 1,
      hints: [
        "Inspect the Trail Camera anchor. What is in href?",
        "The href is /products/42 — a relative path. data-product-id repeats 42.",
        "Destination: /products/42. The product identifier is 42. Optics uses a query string; Gear guide goes to /help/sizing, which the text does not spell out."
      ]
    },
    {
      id: "e-forms",
      part: "E",
      phase: "YOU TRY",
      kind: "exercise",
      embedTrainingPage: true,
      title: "Forms and inputs",
      prompt: "If the learner searches for boots, what information would you expect the browser to send?",
      instructorNote:
        "Connect this to Lesson 1: a form describes a future HTTP request — method, path, and named parameters.",
      body:
        "<p>Lesson 1: a request has a method, a path, and often a body or query. A form is one way the page tells the browser how to build that request.</p>" +
        "<p>Inspect the search form, or read this excerpt:</p>" +
        '<pre class="hb-http" tabindex="0">' +
        FORM_EXCERPT.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>Notice:</p><ul>" +
        "<li><strong>action</strong> — the path</li>" +
        "<li><strong>method</strong> — GET or POST</li>" +
        "<li><strong>input name</strong> — the parameter name</li>" +
        "<li><strong>value</strong> — what the user typed</li>" +
        "</ul>" +
        "<p>Exact syntax is not required if the idea is right.</p>",
      reveal:
        "<p>A GET to <code>/search</code> with <code>q=boots</code> — often written <code>GET /search?q=boots</code>. The name <code>q</code> is the parameter; <code>boots</code> is the submitted value.</p>",
      successFeedback: "You connected the form to the request it would produce. That is Lesson 1, applied to a page.",
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
        "Find the script tag in the page source or Inspector. We are naming the file, not reverse-engineering it.",
      body:
        "<p>Pages often load JavaScript:</p>" +
        '<pre class="hb-http" tabindex="0">' +
        SCRIPT_EXCERPT.replace(/</g, "&lt;") +
        "</pre>" +
        "<p>JavaScript often contains client-side application behavior. Researchers inspect it to understand how the application works — later, on authorized targets, and still as reading, not as an exploit kit.</p>" +
        "<p>This lesson does not teach JavaScript reverse engineering. Locate the synthetic page's script reference.</p>",
      successFeedback: "You found the client script the page actually loads.",
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
        "View page source or the Inspector. There is a harmless HTML comment near the top, and a visually hidden catalog hint.",
      body:
        "<p>Find the HTML comment on the Trail Supply page (it is not rendered as visible text). Example of the idea:</p>" +
        '<pre class="hb-http" tabindex="0">&lt;!-- TODO: replace demo inventory endpoint before release --&gt;</pre>' +
        "<p>Information can exist in page source or DOM structure without appearing as visible page text. That can include comments, hidden elements, and <code>data-</code> attributes.</p>" +
        "<p>This example has no secrets, credentials, or tokens. The point is: <em>look</em> before you assume the screenshot is complete.</p>",
      successFeedback: "You treated hidden structure as part of the map, not as a prize.",
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
        "Inspect the Trail Supply page and report: (1) page heading element, (2) login form action, (3) login form method, (4) username input name, (5) search form action, (6) product link path, (7) product identifier, (8) JavaScript file the page loads, (9) the HTML comment, (10) one additional detail you discovered yourself.",
      instructorNote:
        "This is miniature reconnaissance: look, identify, and write it down. Exact phrasing is not required. Name what you found.",
      body:
        "<p>Without copying a scorecard from memory, inspect the local page and build a short map. Free-text is fine.</p>" +
        '<p class="hb-loop">Look → Identify → Ask why → Form a model → Verify</p>' +
        "<p>Do not test logins, guess passwords, or treat identifiers as something to attack. Report structure.</p>",
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
        "<li>Other details: hidden catalog hint <code>/inventory/demo.json</code>, Optics <code>?category=optics</code>, Gear guide → <code>/help/sizing</code></li>" +
        "</ol>",
      successFeedback: "That is a first recon map: heading, forms, links, script, comment, plus something you noticed on your own.",
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
        "Walk the page once: heading tag, both forms (action/method/names), the Trail Camera href and data attribute, the script src, then view-source for the comment.",
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
        "<p>Lesson 1: you learned what requests and responses are. Lesson 2: page structure tells you what requests a browser may make and what application resources exist.</p>" +
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
    cycle: "Look → Identify → Ask why → Form a model → Verify",
    completeBanner:
      "Lesson 2 is complete. You can review steps or continue to Lesson 3 — HTTP Requests and Responses.",
    goal: "See that the rendered page is one representation of an application, and practice inspecting HTML, links, forms, scripts, and comments on a synthetic storefront.",
    steps: STEPS
  };
})(window);
