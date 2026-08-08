#!/usr/bin/env node
/**
 * RC2 Sprint 4 — Platform Experience & Discoverability checks (no network).
 * Run: node automation/test-platform-experience-rc2.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
assert("nav version 2.1+", /^2\.[1-9]/.test(nav.version || ""));
assert("journeys defined", Array.isArray(nav.journeys) && nav.journeys.length === 4);
["observe", "understand", "create", "share"].forEach((id) => {
  assert("journey " + id, nav.journeys.some((j) => j.id === id));
});

nav.apps.forEach((app) => {
  assert(app.id + " purpose", !!app.purpose);
  assert(app.id + " maturity", !!app.maturity);
  assert(app.id + " startHere", app.startHere && app.startHere.href && app.startHere.label);
  assert(app.id + " journeys", Array.isArray(app.journeys) && app.journeys.length > 0);
});

const configJs = read("design-system/js/platform/wds-app-nav-config.js");
assert("config embeds journeys", /"journeys"/.test(configJs) && /startHere/.test(configJs));
assert("config has landscape", /landscape-interpretation/.test(configJs));

const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(configJs + "\n" + read("design-system/js/platform/wds-app-nav.js"), sandbox);
const Nav = sandbox.WDS.appNav;
assert("appsByJourney", typeof Nav.appsByJourney === "function" && Nav.appsByJourney().length >= 4);
assert("startHereHref dashboard", /dashboard/.test(Nav.startHereHref(Nav.byId("dashboard"), 0)));
assert("related sheds→dashboard", Nav.relatedApps("sheds").some((a) => a.id === "dashboard"));

const home = read("index.html");
assert("home pillars", /was-home-observe/.test(home) && /was-home-create/.test(home));
assert("home launch volunteer discover", /waypoint-volunteer\/discover\.html/.test(home));
assert("home launch photo coach", /apps\/photo-coach\//.test(home));
assert("home launch sheds map", /shed-hunting\/map\//.test(home));
assert("home articles link", /href="articles\/"/.test(home));
assert("home no contact in hero links", !/was-home__links"[\s\S]*href="contact\.html"/.test(home.split('was-home__search')[0]));

const studioHome = read("js/studio-home.js");
assert("studio-home uses journeys", /appsByJourney/.test(studioHome));
assert("studio-home renders Launch", /Launch/.test(studioHome) && /startHereHref/.test(studioHome));

const workflows = read("design-system/js/platform/wds-platform-workflows.js");
[
  "dashboard-to-scenes",
  "dashboard-to-fieldry",
  "dashboard-to-foragecast",
  "sheds-to-dashboard",
  "scenes-to-dashboard",
  "signalterrain-to-dashboard",
  "volunteer-to-fieldry"
].forEach((id) => assert("workflow " + id, workflows.includes('id: "' + id + '"')));

assert("discover module", exists("design-system/js/platform/wds-platform-discover.js"));
assert("articles module", exists("design-system/js/platform/wds-articles.js"));
assert("articles manifest", exists("articles/manifest.json"));
assert("articles hub", exists("articles/index.html"));
assert("articles template", exists("articles/templates/article.html"));
assert("articles sample", exists("articles/samples/reading-todays-conditions.html"));
["observe", "understand", "create", "share", "field-craft", "outdoor-intelligence"].forEach((c) => {
  assert("category " + c, exists("articles/categories/" + c + "/index.html"));
});

const manifest = JSON.parse(read("articles/manifest.json"));
assert("manifest categories", (manifest.categories || []).length >= 6);
assert("manifest search prep", manifest.search && manifest.search.providerId === "articles");

assert("docs experience", exists("docs/PLATFORM-EXPERIENCE-RC2.md"));
assert("docs navigation", exists("docs/NAVIGATION-ARCHITECTURE.md"));

["apps/shed-hunting/index.html", "apps/waypoint-volunteer/index.html", "apps/scenes/index.html"].forEach((f) => {
  const html = read(f);
  assert(f + " related mount", /data-wds-related-apps=/.test(html));
  assert(f + " discover script", /wds-platform-discover\.js/.test(html));
});
const stLive = read("apps/signalterrain/cyber/live.html");
assert("signalterrain live shell", /data-wds-app-shell/.test(stLive));
assert("signalterrain index redirects live", /cyber\/live\.html/.test(read("apps/signalterrain/index.html")));

const shellCss = read("design-system/css/wds-app-shell.css");
assert("card actions css", /\.was-home__card-actions/.test(shellCss));
assert("pillars css", /\.was-home__pillars/.test(shellCss));

// Responsive: mobile touch targets already 44px on pillars
assert("pillar min-height 44", /was-home__pillars a[\s\S]*?min-height:\s*44px/.test(shellCss));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll platform experience RC2 checks passed.");
