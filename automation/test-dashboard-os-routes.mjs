#!/usr/bin/env node
/**
 * Outside / Dashboard — persistent route & link inventory tests.
 * Run: node automation/test-dashboard-os-routes.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), sandbox, { filename: rel });
}

const dashContact = path.join(ROOT, "apps/dashboard/contact.html");
const dashIndex = path.join(ROOT, "apps/dashboard/index.html");
const rootContact = path.join(ROOT, "contact.html");

assert("dashboard contact page exists", fs.existsSync(dashContact));
assert("dashboard index exists", fs.existsSync(dashIndex));
assert("studio contact still exists", fs.existsSync(rootContact));

const dashContactHtml = fs.readFileSync(dashContact, "utf8");
const dashIndexHtml = fs.readFileSync(dashIndex, "utf8");
const rootContactHtml = fs.readFileSync(rootContact, "utf8");

assert("dashboard contact quiet shell", /data-quiet-chrome="true"/.test(dashContactHtml));
assert("dashboard contact product dashboard", /data-product="dashboard"/.test(dashContactHtml));
assert("dashboard contact uses was-shell", /data-wds-app-shell/.test(dashContactHtml));
assert("dashboard contact has form", /id="wcs-contact-form"/.test(dashContactHtml));
assert("dashboard contact back to Home", /href="\.\/"/.test(dashContactHtml) && /Back to Home/.test(dashContactHtml));
assert("dashboard contact not legacy redirect", !/meta[^>]+http-equiv=["']refresh/i.test(dashContactHtml));
assert("dashboard contact canonical in apps/dashboard", /apps\/dashboard\/contact\.html/.test(dashContactHtml));

assert("noscript Contact stays in dashboard", /href="\.\/contact\.html"/.test(dashIndexHtml));
assert("noscript Contact not root legacy", !/href="\.\.\/\.\.\/contact\.html"/.test(dashIndexHtml));
assert("dashboard quiet chrome", /data-quiet-chrome="true"/.test(dashIndexHtml));

assert("root contact uses app shell", /data-wds-app-shell/.test(rootContactHtml));
assert("root contact not pre-shell topnav", !/ws-topnav/.test(rootContactHtml));

const sandbox = {
  window: {},
  document: {
    readyState: "complete",
    querySelector: () => null,
    addEventListener: () => {},
    documentElement: { classList: { toggle() {} } }
  },
  console,
  location: { pathname: "/apps/dashboard/", hash: "" }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.WDS = {};

load("design-system/js/platform/wds-app-nav-config.js", sandbox);
load("design-system/js/platform/wds-app-nav.js", sandbox);
load("design-system/js/platform/wds-app-shell.js", sandbox);

const Shell = sandbox.WDS.appShell;
const Nav = sandbox.WDS.appNav;
assert("shell loaded", !!(Shell && Shell.renderFooter && Shell.contactPageHref));
assert("nav detects dashboard", Nav.detectApp("/apps/dashboard/", "")?.id === "dashboard");
assert("nav detects dashboard contact", Nav.detectApp("/apps/dashboard/contact.html", "")?.id === "dashboard");

const dashApp = Nav.byId("dashboard");
const contactHref = Shell.contactPageHref({ depth: 1, app: dashApp });
assert("dashboard Contact href in-product", /contact\.html$/.test(contactHref) && !/\.\.\/\.\.\/contact\.html$/.test(contactHref), contactHref);
assert("dashboard Contact not studio-root only", contactHref.indexOf("apps/") >= 0 || contactHref === "contact.html" || /^\.\/contact\.html/.test(contactHref), contactHref);

const footer = Shell.renderFooter({ depth: 1, app: dashApp, productName: "Home" });
assert("footer Contact points to dashboard contact", /href="contact\.html"|href="\.\/contact\.html"|apps\/dashboard\/contact\.html/.test(footer), footer.slice(0, 400));
assert("footer Contact not ../../contact.html alone", !/href="\.\.\/\.\.\/contact\.html"/.test(footer), footer);
assert("footer brand text present", /Waypoint Studio/.test(footer) && /Private by default/.test(footer));
assert("footer Privacy Policy studio page", /privacy\.html/.test(footer) && /Privacy Policy/.test(footer));
assert("footer Terms of Service studio page", /terms\.html/.test(footer) && /Terms of Service/.test(footer));
assert("footer omits historical site IA", !/support\.html/.test(footer) && !/about\.html/.test(footer) && !/incubator\//.test(footer) && !/Something wrong|Suggest an idea|Coming later/.test(footer));
assert("footer has no Home/brand href in links", !/<a[^>]*>Waypoint Studio<\/a>/.test(footer) && !/>Home<\/a>/.test(footer));

const studioFooter = Shell.renderFooter({ depth: 0, app: null, productName: "Waypoint Studio" });
assert("studio Contact stays root contact.html", /href="contact\.html"/.test(studioFooter) || /href="\.\/contact\.html"/.test(studioFooter), studioFooter.slice(0, 300));
assert("studio footer minimal links only", (studioFooter.match(/was-footer__links[\s\S]*?<\/p>/) || [""])[0].split("<a ").length - 1 === 3, studioFooter.slice(0, 400));

const inventory = [
  { label: "Contact", source: "home footer", destination: contactHref, scope: "internal", shell: "current-home", notes: "Product-scoped Contact (quiet shell)" },
  { label: "Privacy Policy", source: "home footer", destination: "../../privacy.html", scope: "internal", shell: "current-studio", notes: "Studio Privacy page" },
  { label: "Terms of Service", source: "home footer", destination: "../../terms.html", scope: "internal", shell: "current-studio", notes: "Studio Terms placeholder (Home RC1.2)" },
  { label: "Noscript Contact", source: "apps/dashboard/index.html", destination: "./contact.html", scope: "internal", shell: "current-dashboard", notes: "Fixed from ../../contact.html" },
  { label: "Noscript Dashboard", source: "apps/dashboard/index.html", destination: "./", scope: "internal", shell: "current-dashboard", notes: "Stays in Dashboard / Home alias" },
  { label: "Studio Contact", source: "studio-home footer", destination: "contact.html", scope: "internal", shell: "current-studio", notes: "Root contact remains for studio directory" }
];

const outDir = path.join(ROOT, "docs/dashboard-owner-fixes");
fs.mkdirSync(outDir, { recursive: true });
const invPath = path.join(outDir, "route-inventory.json");
fs.writeFileSync(invPath, JSON.stringify({ generatedAt: new Date().toISOString(), routes: inventory }, null, 2));
assert("route inventory written", fs.existsSync(invPath));

inventory.forEach((row) => {
  assert("inventory row " + row.label, !!(row.destination && row.shell));
});

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
