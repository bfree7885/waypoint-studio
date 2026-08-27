#!/usr/bin/env node
/**
 * Public portfolio reconciliation — five active efforts only.
 * Run: node automation/test-public-portfolio-reconciliation.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkHtml(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(p, files);
    else if (ent.name.endsWith(".html")) files.push(p);
  }
  return files;
}

function isSilentRedirect(html) {
  return (
    /noindex/i.test(html) &&
    /location\.replace/.test(html) &&
    /http-equiv="refresh"/i.test(html) &&
    !/OpenRoad|SignalTerrain|Global Signals|Fieldry|ForageCast|Steepleaf|Savant Sommelier|Landscape Interpretation/.test(html)
  );
}

const REQUIRED_NAV = ["Dashboard", "Scenes", "Sheds", "Deck", "Articles", "Support", "About"];
const DISCONTINUED = [
  "OpenRoad",
  "Civic Trails",
  "SignalTerrain",
  "Global Signals",
  "Fieldry",
  "ForageCast",
  "Steepleaf",
  "Savant Sommelier",
  "Landscape Interpretation"
];

const publicFiles = [
  "index.html",
  "about.html",
  "support.html",
  "404.html",
  "settings.html",
  "knowledge.html",
  "sitemap.xml",
  "robots.txt",
  "js/studio-home.js",
  "design-system/js/platform/wds-app-nav-config.js",
  "design-system/js/platform/wds-platform-catalog.js",
  "side-trails/waypoint-deck/index.html",
  "articles/samples/reading-todays-conditions.html"
];

const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const labels = (nav.studioPrimaryNav || []).map((i) => i.label);
assert("primary nav exact set", labels.join("|") === REQUIRED_NAV.join("|"), labels.join("|"));
assert("Deck href is waypoint-deck", nav.studioPrimaryNav.some((i) => i.id === "deck" && /waypoint-deck/.test(i.href)));
assert("public apps are studio + deck", JSON.stringify(nav.publicAppIds) === JSON.stringify(["dashboard", "scenes", "sheds", "waypoint-deck"]));

for (const file of publicFiles) {
  const html = read(file);
  for (const name of DISCONTINUED) {
    assert(file + " omits " + name, !html.includes(name));
  }
}

assert("homepage mission", /Observe\.\s*Discover\.\s*Understand/.test(read("index.html")));
assert("homepage has Deck not Side Trails archive", /Waypoint Deck/.test(read("index.html")) && !/Browse Side Trails/.test(read("index.html")));
assert("about has five efforts", /Dashboard/.test(read("about.html")) && /Scenes/.test(read("about.html")) && /Sheds/.test(read("about.html")) && /Waypoint Deck/.test(read("about.html")) && /Deep Forest Dispatch/.test(read("about.html")));
assert("support Dashboard href is app", /href="apps\/dashboard\/"/.test(read("support.html")));
assert("DFD preserved", fs.existsSync(path.join(ROOT, "deep-forest-dispatch/index.html")));
assert("Deck honest status", /In development/.test(read("side-trails/waypoint-deck/index.html")));
assert("Deck omits genealogy", !/Global Signals|archived Cyber|derived from/.test(read("side-trails/waypoint-deck/index.html")));

assert("side-trails index redirects to Deck", isSilentRedirect(read("side-trails/index.html")) && /waypoint-deck/.test(read("side-trails/index.html")));
assert("incubator is silent redirect", isSilentRedirect(read("incubator/index.html")));

const trees = [
  "incubator",
  "volunteer",
  "side-trails/openroad-pa",
  "side-trails/signalterrain",
  "side-trails/global-signals",
  "apps/signalterrain",
  "apps/fieldry",
  "apps/foragecast",
  "apps/steepleaf",
  "apps/savant-sommelier",
  "apps/waypoint-volunteer",
  "apps/landscape-interpretation",
  "apps/terrainbound"
];
for (const rel of trees) {
  const files = walkHtml(path.join(ROOT, rel));
  assert(rel + " has html", files.length > 0);
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    assert(path.relative(ROOT, file) + " silent redirect", isSilentRedirect(html));
  }
}

const sitemap = read("sitemap.xml");
assert("sitemap has DFD", /deep-forest-dispatch\//.test(sitemap));
assert("sitemap has deck", /waypoint-deck/.test(sitemap));
assert("sitemap omits discontinued urls", !/openroad-pa|\/incubator\/|\/apps\/fieldry\/|\/apps\/foragecast\/|\/apps\/signalterrain\//.test(sitemap));

const robots = read("robots.txt");
assert("robots disallows incubator", /Disallow: \/incubator\//.test(robots));
assert("robots disallows fieldry", /Disallow: \/apps\/fieldry\//.test(robots));

const shell = read("design-system/js/platform/wds-app-shell.js");
assert("shell has mobile nav toggle", /was-nav-toggle/.test(shell) && /bindPrimaryNav/.test(shell));
const css = read("design-system/css/wds-app-shell.css");
assert("shared mobile menu CSS", /was-nav-toggle/.test(css) && /is-nav-open/.test(css));
assert("mobile menu is full-viewport overlay", /position:\s*fixed/.test(css) && /inset:\s*0/.test(css));
assert("aurora no longer wraps nav onto second sticky row", !/flex:\s*1 1 100%/.test(read("design-system/css/wds-aurora-bridge.css")));
assert("dashboard phone chrome no longer wraps primary nav", !/\.was-global--quiet \.was-primary-nav \{[\s\S]*?flex:\s*1 1 auto/.test(css));
assert("robots disallows global-signals", /Disallow: \/side-trails\/global-signals\//.test(robots));

assert("fieldry JS preserved internally", fs.existsSync(path.join(ROOT, "apps/fieldry/js/fieldry-life-list.js")));
assert("foragecast JS preserved internally", fs.existsSync(path.join(ROOT, "apps/foragecast/js/foragecast-today.js")));
assert("signalterrain JS preserved internally", fs.existsSync(path.join(ROOT, "apps/signalterrain/js/signalterrain-models.js")));
assert("public workflows omit discontinued names", !/Fieldry|ForageCast|SignalTerrain|Volunteer/.test(read("design-system/js/platform/wds-platform-workflows.js")));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s).");
  process.exit(1);
}
console.log("\nPublic portfolio reconciliation checks passed (" + passed + ").");
