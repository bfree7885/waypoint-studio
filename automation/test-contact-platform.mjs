#!/usr/bin/env node
/**
 * Contact & Support platform tests — validation, prefill, spam guards, pages.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
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

const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/ecosystem/contact-config.json"), "utf8")
);
assert("config version", config.version === "1.0.0");
assert("formsubmit endpoint", /formsubmit\.co\/ajax\/contact@waypoint\.studio/.test(config.delivery.endpoint));
assert("categories include bug and scientific", config.categories.some((c) => c.id === "bug") && config.categories.some((c) => c.id === "scientific"));
assert("future hooks reserved", Array.isArray(config.futureHooks) && config.futureHooks.includes("knowledge-base"));

["contact.html", "support.html", "about.html", "privacy.html"].forEach((p) => {
  assert(p + " exists", fs.existsSync(path.join(ROOT, p)));
});

const contactHtml = fs.readFileSync(path.join(ROOT, "contact.html"), "utf8");
assert("contact form id", /id="wcs-contact-form"/.test(contactHtml));
assert("consent checkbox", /name="consent"/.test(contactHtml));
assert("includeTech optional", /name="includeTech"/.test(contactHtml));
assert("contact loads wds-contact", /wds-contact\.js/.test(contactHtml));

const privacyHtml = fs.readFileSync(path.join(ROOT, "privacy.html"), "utf8");
assert("privacy mentions FormSubmit", /FormSubmit/.test(privacyHtml));
assert("privacy rejects over-claim of isolation", /do not claim.*zero network|do not claim.*“zero network”|do not claim \"zero network\"/i.test(privacyHtml));
assert("privacy does not promise E2E encryption", /do not claim messages are end-to-end/i.test(privacyHtml));

assert("privacy mentions map tiles", /Map tiles|OpenStreetMap|OpenTopoMap/i.test(privacyHtml));

const supportHtml = fs.readFileSync(path.join(ROOT, "support.html"), "utf8");
assert("support has FAQ", /Frequently asked|wcs-faq/.test(supportHtml));
assert("support deep link bug", /contact\.html\?category=bug/.test(supportHtml));

const aboutHtml = fs.readFileSync(path.join(ROOT, "about.html"), "utf8");
assert("about refuses ads/rankings", /Advertising|rankings|engagement/i.test(aboutHtml));

const shell = fs.readFileSync(path.join(ROOT, "design-system/js/platform/wds-app-shell.js"), "utf8");
assert("footer exposes Contact", /Contact/.test(shell) && /support\.html/.test(shell));
assert("footer exposes Report bug", /Report bug/.test(shell));
assert("footer exposes Privacy", /privacy\.html/.test(shell));

const css = fs.readFileSync(path.join(ROOT, "design-system/css/wds-contact.css"), "utf8");
assert("honeypot visually hidden", /wcs-honeypot/.test(css));
assert("reduced motion respected", /prefers-reduced-motion/.test(css));

const jsPath = path.join(ROOT, "design-system/js/platform/wds-contact.js");
const jsSrc = fs.readFileSync(jsPath, "utf8");
assert("rate limit key present", /waypoint-contact-rate-v1/.test(jsSrc));
assert("honeypot validation", /honeypot/.test(jsSrc));
assert("timeout abort", /AbortController|AbortError/.test(jsSrc));

// Load module in VM with mocked browser globals
const store = {};
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
  location: { href: "http://127.0.0.1/contact.html", pathname: "/contact.html", search: "?category=bug&app=shed-hunting", referrer: "" },
  navigator: { userAgent: "test", language: "en", platform: "Test", onLine: true },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  sessionStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  },
  Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: "UTC" }) }) },
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsSrc, sandbox);
const C = sandbox.WDS.contact;
assert("WDS.contact exported", !!C && typeof C.validate === "function");

const cfg = config;
const basePayload = {
  name: "",
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
let errs = C.validate(basePayload, cfg);
assert("valid payload no errors", errs.length === 0);

errs = C.validate(Object.assign({}, basePayload, { email: "nope" }), cfg);
assert("invalid email rejected", errs.some((e) => e.field === "email"));

errs = C.validate(Object.assign({}, basePayload, { consent: false }), cfg);
assert("consent required", errs.some((e) => e.field === "consent"));

errs = C.validate(Object.assign({}, basePayload, { message: "short" }), cfg);
assert("short message rejected", errs.some((e) => e.field === "message"));

errs = C.validate(Object.assign({}, basePayload, { honeypot: "http://spam.test" }), cfg);
assert("honeypot rejected", errs.some((e) => e.field === "honeypot"));

// Rate limit
const t = C._test;
t.writeRate([Date.now(), Date.now(), Date.now()]);
assert("rate limit blocks 4th", !t.rateLimitOk(cfg));
t.writeRate([]);
assert("rate limit ok when empty", t.rateLimitOk(cfg));

const body = t.buildDeliveryBody(basePayload, cfg, {
  pageUrl: "http://x/contact.html",
  build: "local",
  viewport: "390×844",
  platform: "Test",
  userAgent: "ua",
  language: "en",
  timezone: "UTC"
});
assert("delivery subject tagged", /^\[Waypoint\]/.test(body._subject));
assert("delivery reply-to set", body._replyto === "user@example.com");
assert("delivery includes category", /Bug Report/.test(body.message) || body.category === "bug");

assert("contactHref deep link", /contact\.html\?category=bug/.test(C.contactHref({ category: "bug" }, 0)));
assert("contactHref nested depth", C.contactHref({ category: "feature" }, 1).indexOf("../contact.html") === 0);

const shedsMap = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("sheds map links support", /contact\.html\?category=bug.*shed-hunting/.test(shedsMap) || /app=shed-hunting/.test(shedsMap));

const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert("home links about/contact", /about\.html/.test(home) && /contact\.html/.test(home));

const shellCss = fs.readFileSync(path.join(ROOT, "design-system/css/wds-app-shell.css"), "utf8");
assert("footer links styled in shell css", /was-footer__links/.test(shellCss));

if (failures.length) {
  console.error("\nContact platform tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll contact platform tests passed (" + passed + ").");
