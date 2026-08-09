#!/usr/bin/env node
/**
 * Production reality sweep — recurring defect classes.
 * Fail if public surfaces advertise unfinished work as usable product,
 * or leave users on empty journey-category scaffolds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "failed");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const banned = /Coming soon\s*·\s*not implemented|coming soon \/ not implemented/i;
const surfaces = [
  "side-trails/global-signals/waypoint-take/index.html",
  "side-trails/global-signals/supply-chains/index.html",
  "side-trails/global-signals/scenario-explorer/index.html",
  "side-trails/signalterrain/index.html",
  "support.html",
  "about.html",
  "side-trails/index.html",
  "apps/scenes/index.html",
  "articles/index.html"
];
for (const rel of surfaces) {
  assert("no coming-soon dead end: " + rel, !banned.test(read(rel)));
}

const stLanding = read("side-trails/signalterrain/index.html");
assert(
  "ST landing does not CTA mockup",
  !/href=["']\.\/mockups\//i.test(stLanding)
);

const scenesHome = read("apps/scenes/index.html");
assert(
  "Scenes home does not promote Living Scenes",
  !/href=["']living-scenes\//i.test(scenesHome)
);

const nav = JSON.parse(read("design-system/ecosystem/nav-registry.json"));
const scenes = (nav.apps || []).find((a) => a.id === "scenes");
assert("nav-registry scenes exists", !!scenes);
assert(
  "Living Scenes hidden from scenes feature nav",
  !(scenes.features || []).some((f) => f.id === "living-scenes")
);

for (const slug of [
  "observe",
  "understand",
  "create",
  "share",
  "field-craft",
  "outdoor-intelligence"
]) {
  const html = read("articles/categories/" + slug + "/index.html");
  assert(
    "category " + slug + " has honest exit (no empty busy mount)",
    !/aria-busy="true"/.test(html) && /Open curated Articles/i.test(html)
  );
  assert(
    "category " + slug + " does not mount sample manifest",
    !/WDS\.articles\.mountCategory/.test(html)
  );
}

const sitemap = read("sitemap.xml");
assert("sitemap omits sample essay", !/articles\/samples\//.test(sitemap));

const robots = read("robots.txt");
assert("robots disallows ST mockups", /Disallow:\s*\/side-trails\/signalterrain\/mockups\//.test(robots));
assert("robots disallows article category scaffolds", /Disallow:\s*\/articles\/categories\//.test(robots));

const feed = read("design-system/js/platform/wds-articles-feed.js");
assert(
  "articles feed does not deep-link journey category scaffolds",
  !/categories\/outdoor-intelligence\//.test(feed)
);


const shedsMap = read("apps/shed-hunting/js/sheds-map-app.js");
assert(
  "sheds map binds tile health to createBasemaps layers",
  /bindTileHealth\(street/.test(shedsMap) && /bindTileHealth\(topo/.test(shedsMap)
);
assert(
  "sheds map does not reference undefined osm layer",
  !/bindTileHealth\(osm/.test(shedsMap)
);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll production-reality tests passed.");
