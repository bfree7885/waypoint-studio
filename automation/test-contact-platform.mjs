#!/usr/bin/env node
/**
 * Contact & Support platform tests — address lock, validation, prefill, spam guards, pages.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORRECT_MAIL = "contact@waypointstudio.org";
const BAD_MAIL = "contact@" + "waypoint.studio"; // split so this test file is not a false positive
let passed = 0;
const failures = [];

function assert(name, cond) {
  if (cond) {
    passed++;
    console.log("PASS", name);
  } else {
    failures.push(name);
    console.log("FAIL", name);
  }
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".git" ||
      name === "dist" ||
      name === ".worktrees" ||
      name.startsWith(".tmp-") ||
      name === ".tmp" ||
      name === "reports" ||
      name === "chrome-profile-cdp"
    ) {
      continue;
    }
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkFiles(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/ecosystem/contact-config.json"), "utf8")
);
assert("config version", config.version === "1.0.1");
assert(
  "formsubmit endpoint uses correct mailbox",
  config.delivery.endpoint === `https://formsubmit.co/ajax/${CORRECT_MAIL}`
);
assert("developer email correct", config.developer.email === CORRECT_MAIL);
assert("mailbox host declared", /Namecheap/i.test(config.developer.mailboxHost || ""));
assert("no override endpoint in production config", config.delivery.overrideEndpoint == null);
assert(
  "categories include bug and scientific",
  config.categories.some((c) => c.id === "bug") && config.categories.some((c) => c.id === "scientific")
);
assert(
  "all ten categories present",
  [
    "general",
    "bug",
    "feature",
    "scientific",
    "data",
    "accessibility",
    "privacy",
    "partnership",
    "media",
    "other"
  ].every((id) => config.categories.some((c) => c.id === id))
);
assert("future hooks reserved", Array.isArray(config.futureHooks) && config.futureHooks.includes("knowledge-base"));
assert("apps include sheds aliases", config.apps.some((a) => a.id === "sheds") && config.apps.some((a) => a.id === "shed-hunting"));
assert("apps include scene-builder", config.apps.some((a) => a.id === "scene-builder"));
assert("apps include dashboard", config.apps.some((a) => a.id === "dashboard"));
assert("apps include Deck", config.apps.some((a) => a.id === "deck"));
assert("apps omit discontinued products", !config.apps.some((a) => /fieldry|foragecast|steepleaf|signalterrain|savant|volunteer/i.test(a.id + a.label)));

["contact.html", "support.html", "about.html", "privacy.html"].forEach((p) => {
  assert(p + " exists", fs.existsSync(path.join(ROOT, p)));
});

const contactHtml = fs.readFileSync(path.join(ROOT, "contact.html"), "utf8");
assert("contact form id", /id="wcs-contact-form"/.test(contactHtml));
assert("consent checkbox", /name="consent"/.test(contactHtml));
assert("includeTech optional", /name="includeTech"/.test(contactHtml));
assert("contact loads wds-contact", /wds-contact\.js/.test(contactHtml));
assert("contact mailto correct", contactHtml.includes(`mailto:${CORRECT_MAIL}`));
assert("contact page shows correct mailbox", contactHtml.includes(CORRECT_MAIL));
assert("contact page has no incorrect mailbox", !contactHtml.includes(BAD_MAIL));
assert("attachments disclosed unsupported", /Attachments are not supported/i.test(contactHtml));

const privacyHtml = fs.readFileSync(path.join(ROOT, "privacy.html"), "utf8");
assert("privacy mentions FormSubmit", /FormSubmit/.test(privacyHtml));
assert("privacy mentions Namecheap", /Namecheap/i.test(privacyHtml));
assert("privacy says not on-device only", /not.*on-device only|not.*“on-device only”/i.test(privacyHtml));
assert("privacy rejects over-claim of isolation", /do not claim.*zero network|do not claim.*“zero network”|do not claim \"zero network\"/i.test(privacyHtml));
assert("privacy does not promise E2E encryption", /do not claim messages are end-to-end/i.test(privacyHtml));
assert("privacy mailto correct", privacyHtml.includes(`mailto:${CORRECT_MAIL}`));
assert("privacy has no incorrect mailbox", !privacyHtml.includes(BAD_MAIL));
assert("privacy mentions map tiles", /Map tiles|OpenStreetMap|OpenTopoMap/i.test(privacyHtml));
assert("privacy discloses no auto GPS", /automatic GPS|Precise GPS/i.test(privacyHtml));

const supportHtml = fs.readFileSync(path.join(ROOT, "support.html"), "utf8");
assert("support has FAQ", /Frequently asked|wcs-faq/.test(supportHtml));
assert("support deep link bug", /contact\.html\?category=bug/.test(supportHtml));
assert("support deep link feature", /contact\.html\?category=feature/.test(supportHtml));
assert("support deep link scientific", /contact\.html\?category=scientific/.test(supportHtml));

const aboutHtml = fs.readFileSync(path.join(ROOT, "about.html"), "utf8");
assert("about refuses ads/rankings", /Advertising|rankings|engagement/i.test(aboutHtml));
assert("about links contact", /contact\.html/.test(aboutHtml));

const shell = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-shell.js"), "utf8");
const footerFn = (shell.match(/function renderFooter\([\s\S]*?\n  \}/) || [""])[0];
assert("footer exposes Contact", /Contact/.test(footerFn));
assert("footer exposes Privacy Policy", /privacy\.html/.test(footerFn) && /Privacy Policy/.test(footerFn));
assert("footer exposes Terms of Service", /terms\.html/.test(footerFn) && /Terms of Service/.test(footerFn));
assert(
  "footer omits historical site IA",
  !/support\.html/.test(footerFn) &&
    !/about\.html/.test(footerFn) &&
    !/incubator\//.test(footerFn) &&
    !/Something wrong|Suggest an idea|Coming later|Report bug|Request feature/.test(footerFn)
);
const termsHtml = fs.readFileSync(path.join(ROOT, "terms.html"), "utf8");
assert("terms placeholder page exists", /Terms of Service/.test(termsHtml) && /data-wds-app-footer/.test(termsHtml));

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-contact.css"), "utf8");
assert("honeypot visually hidden", /wcs-honeypot/.test(css));
assert("reduced motion respected", /prefers-reduced-motion/.test(css));

const jsPath = path.join(ROOT, "design-system/js/platform/wds-contact.js");
const jsSrc = fs.readFileSync(jsPath, "utf8");
assert("default mail locked", jsSrc.includes(`DEFAULT_MAIL = "${CORRECT_MAIL}"`));
assert("js has no incorrect mailbox", !jsSrc.includes(BAD_MAIL));
assert("rate limit key present", /waypoint-contact-rate-v1/.test(jsSrc));
assert("draft key present", /waypoint-contact-draft-v1/.test(jsSrc));
assert("honeypot validation", /honeypot/.test(jsSrc));
assert("timeout abort", /AbortController|AbortError/.test(jsSrc));
assert("preserves form on failure", /Preserve form contents after recoverable failure/.test(jsSrc));
assert("provider success:false handled", /success === "false"|success === false/.test(jsSrc));
assert("header injection sanitizer", /sanitizeLine/.test(jsSrc));

// Repository-wide address lock (text sources)
const scanned = walkFiles(ROOT, [".html", ".js", ".mjs", ".json", ".md", ".css"]);
let badHits = [];
for (const file of scanned) {
  const rel = path.relative(ROOT, file);
  if (rel === "automation/test-contact-platform.mjs") continue;
  if (rel.startsWith("docs/CONTACT-PRODUCTION-VERIFICATION")) continue;
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(BAD_MAIL)) badHits.push(rel);
}
assert("repo has zero incorrect contact mailbox (.studio)", badHits.length === 0);
if (badHits.length) console.error("  remaining:", badHits.slice(0, 20).join(", "));

// Load module in VM with mocked browser globals
const store = {};
let sessionStore = {};
let fetchImpl = async () => ({ ok: true, json: async () => ({ success: "true" }) });
const sandbox = {
  window: {},
  globalThis: {},
  document: {
    readyState: "complete",
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
    documentElement: { getAttribute: () => null },
    createElement: () => ({ setAttribute() {}, appendChild() {} })
  },
  location: {
    href: "http://127.0.0.1/contact.html",
    pathname: "/contact.html",
    search: "?category=bug&app=shed-hunting&page=%2Fapps%2Fshed-hunting%2Fmap%2F",
    referrer: ""
  },
  navigator: { userAgent: "test-agent", language: "en", platform: "TestOS", onLine: true },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    }
  },
  sessionStorage: {
    getItem: (k) => (k in sessionStore ? sessionStore[k] : null),
    setItem: (k, v) => {
      sessionStore[k] = String(v);
    },
    removeItem: (k) => {
      delete sessionStore[k];
    }
  },
  Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "UTC" }) }) },
  fetch: (...args) => fetchImpl(...args),
  console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const C = sandbox.WDS.contact;
assert("WDS.contact exported", !!C && typeof C.validate === "function");
assert("DEFAULT_MAIL via _test", C._test.DEFAULT_MAIL === CORRECT_MAIL);

const cfg = config;
const basePayload = {
  name: "Tester",
  email: "user@example.com",
  category: "bug",
  subject: "Map clip",
  message: "Buttons overlap the map on iPhone.",
  app: "shed-hunting",
  includeTech: true,
  consent: true,
  honeypot: ""
};
sandbox.WDS.contact._test.writeRate([]);
C._test.writeRate([]);
let errs = C.validate(basePayload, cfg);
assert("valid payload no errors", errs.length === 0);

errs = C.validate(Object.assign({}, basePayload, { email: "nope" }), cfg);
assert("invalid email rejected", errs.some((e) => e.field === "email"));

errs = C.validate(Object.assign({}, basePayload, { email: "" }), cfg);
assert("empty email rejected", errs.some((e) => e.field === "email"));

errs = C.validate(Object.assign({}, basePayload, { consent: false }), cfg);
assert("consent required", errs.some((e) => e.field === "consent"));

errs = C.validate(Object.assign({}, basePayload, { message: "short" }), cfg);
assert("short message rejected", errs.some((e) => e.field === "message"));

errs = C.validate(Object.assign({}, basePayload, { message: "   \n\t  " }), cfg);
assert("whitespace-only message rejected", errs.some((e) => e.field === "message"));

errs = C.validate(Object.assign({}, basePayload, { subject: "  " }), cfg);
assert("whitespace-only subject rejected", errs.some((e) => e.field === "subject"));

errs = C.validate(Object.assign({}, basePayload, { subject: "x".repeat(201) }), cfg);
assert("overlong subject rejected", errs.some((e) => e.field === "subject"));

errs = C.validate(Object.assign({}, basePayload, { message: "x".repeat(8001) }), cfg);
assert("overlong message rejected", errs.some((e) => e.field === "message"));

errs = C.validate(Object.assign({}, basePayload, { honeypot: "http://spam.test" }), cfg);
assert("honeypot rejected", errs.some((e) => e.field === "honeypot"));

errs = C.validate(Object.assign({}, basePayload, { category: "" }), cfg);
assert("empty category rejected", errs.some((e) => e.field === "category"));

sandbox.navigator.onLine = false;
errs = C.validate(basePayload, cfg);
assert("offline rejected", errs.some((e) => e.field === "offline"));
sandbox.navigator.onLine = true;

// Rate limit
const t = C._test;
t.writeRate([Date.now(), Date.now(), Date.now()]);
assert("rate limit blocks 4th", !t.rateLimitOk(cfg));
t.writeRate([]);
assert("rate limit ok when empty", t.rateLimitOk(cfg));

assert("sanitizeLine strips CR/LF", t.sanitizeLine("Hello\r\nBcc: evil@x") === "Hello Bcc: evil@x");
assert("sanitizeMultiline strips null", !t.sanitizeMultiline("ok\x00bad").includes("\x00"));

const body = t.buildDeliveryBody(basePayload, cfg, {
  pageUrl: "https://waypointstudio.org/contact.html",
  pagePath: "/apps/shed-hunting/map/",
  build: "local",
  viewport: "390×844",
  platform: "TestOS",
  userAgent: "ua",
  language: "en",
  timezone: "UTC"
});
assert("delivery subject tagged", /^\[Waypoint\]/.test(body._subject));
assert("delivery subject has no raw newlines", !/[\r\n]/.test(body._subject));
assert("delivery reply-to set", body._replyto === "user@example.com");
assert("delivery includes category", /Bug Report/.test(body.message) || body.category === "bug");
assert("delivery includes submitted UTC", /Submitted \(UTC\)/.test(body.message));
assert("delivery includes source page", /Source page:/.test(body.message));
assert("delivery includes production URL", /Production URL:/.test(body.message));
assert("delivery includes build", /Build:/.test(body.message));
assert("delivery includes browser", /Browser:/.test(body.message));
assert("delivery _honey empty", body._honey === "");

assert("contactHref deep link", /contact\.html\?category=bug/.test(C.contactHref({ category: "bug" }, 0)));
assert("contactHref nested depth", C.contactHref({ category: "feature" }, 1).indexOf("../contact.html") === 0);
assert("mailto fallback helper", t.mailbox(cfg) === CORRECT_MAIL);

// Mock successful provider response
let lastDeliverUrl = "";
let lastDeliverMethod = "";
fetchImpl = async (url, opts) => {
  lastDeliverUrl = String(url);
  lastDeliverMethod = opts && opts.method;
  return { ok: true, json: async () => ({ success: "true", message: "ok" }) };
};
let delivered = await C.deliver(basePayload, cfg, { pageUrl: "https://waypointstudio.org/contact.html", build: "t" });
assert("deliver posts to formsubmit org mailbox", lastDeliverUrl.includes(CORRECT_MAIL));
assert("deliver method POST", lastDeliverMethod === "POST");
assert("mock successful provider response", delivered && delivered.ok);

// Mock provider rejection with HTTP 200 + success false
fetchImpl = async () => ({ ok: true, json: async () => ({ success: "false", message: "blocked" }) });
let rejected = false;
try {
  await C.deliver(basePayload, cfg, { pageUrl: "https://x", build: "t" });
} catch (e) {
  rejected = /blocked|rejected/i.test(e.message);
}
assert("mock provider success:false throws", rejected);

// Mock HTTP failure
fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({ message: "server down" }) });
let httpFail = false;
try {
  await C.deliver(basePayload, cfg, { pageUrl: "https://x", build: "t" });
} catch (e) {
  httpFail = /server down|500/.test(e.message);
}
assert("mock provider HTTP failure throws", httpFail);

const shedsMap = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert(
  "sheds map links support",
  /contact\.html\?category=bug.*shed-hunting/.test(shedsMap) || /app=shed-hunting/.test(shedsMap)
);
assert("sheds map feature link", /category=feature/.test(shedsMap));

const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert("home noscript links about/contact", /about\.html/.test(home) && /contact\.html/.test(home));
assert("home static markup omits support footer path", !/support\.html/.test(home));

const shellCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-app-shell.css"), "utf8");
assert("footer links styled in shell css", /was-footer__links/.test(shellCss));

const appPages = [
  "apps/dashboard/index.html",
  "apps/scenes/index.html",
  "apps/scenes/scene-builder/index.html",
  "apps/photo-coach/index.html",
  "apps/shed-hunting/index.html"
];
for (const rel of appPages) {
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert(`${rel} uses app shell footer`, /data-wds-app-footer/.test(html));
}
for (const rel of ["apps/foragecast/index.html", "apps/fieldry/index.html", "apps/steepleaf/index.html", "apps/signalterrain/index.html", "apps/savant-sommelier/index.html"]) {
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert(`${rel} silent redirect`, /location\.replace/.test(html) && /noindex/i.test(html));
}

// Local static link checks for contact/support/about/privacy
await new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
    if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(filePath));
  });
  server.listen(0, "127.0.0.1", async () => {
    const { port } = server.address();
    const paths = [
      "/contact.html",
      "/support.html",
      "/about.html",
      "/privacy.html",
      "/contact.html?category=bug&app=sheds&includeTech=1",
      "/contact.html?category=feature&app=photo-coach",
      "/contact.html?category=scientific&app=scenes",
      "/contact.html?category=data&app=dashboard",
      "/contact.html?category=accessibility"
    ];
    for (const p of paths) {
      const res = await fetch(`http://127.0.0.1:${port}${p}`);
      assert(`local link ${p}`, res.status === 200);
      const text = await res.text();
      if (p.startsWith("/contact")) {
        assert(`local contact body ${p}`, /wcs-contact-form/.test(text) && text.includes(CORRECT_MAIL));
      }
    }
    server.close();
    resolve();
  });
});

if (failures.length) {
  console.error("\nContact platform tests failed (" + failures.length + ").");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("\nAll contact platform tests passed (" + passed + ").");
