#!/usr/bin/env node
/**
 * Savant Sommelier Product Recovery — engine, nav, and contract tests.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failures.push(name + ": " + (detail || "failed"));
    console.log("FAIL", name, "—", detail || "");
  }
}

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

const store = {};
global.window = global;
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.location = { pathname: "/apps/savant-sommelier/", search: "" };

load("apps/savant-sommelier/js/savant-models.js");
load("apps/savant-sommelier/js/savant-fetch.js");
load("apps/savant-sommelier/js/vineyard/vineyard-engine.js");
load("apps/savant-sommelier/js/vineyard/vineyard-map-contract.js");
load("apps/savant-sommelier/js/buying/buying-contract.js");
load("apps/savant-sommelier/js/savant-shell.js");

const catalog = readJson("apps/savant-sommelier/data/discover-catalog.json");
const curriculum = readJson("apps/savant-sommelier/data/learn-curriculum.json");
const grapes = readJson("apps/savant-sommelier/data/grape-suitability-models.json");
const nav = readJson("design-system/ecosystem/nav-registry.json");
const foundation = readJson("apps/savant-sommelier/data/foundation.json");

assert("runtime vineyard", !!global.SavantVineyard);
assert("runtime map", !!global.SavantMap);
assert("runtime buying", !!global.SavantBuying);
assert("runtime models", !!global.WaypointSavant);
assert("discover facets present", (catalog.facets || []).includes("foodPairing"));
assert("discover entries explain why", catalog.entries.every((e) => e.whyMatchTemplate && e.flavors && e.unique));
assert("learn topics structured", curriculum.topics.every((t) => t.overview && t.visualAid && t.facts && t.misconceptions && t.related));
assert("learn topic count", curriculum.topics.length >= 14);
assert("grape horizons", grapes.horizonsYears.join(",") === "0,5,10,15,20,25");

const analysis = SavantVineyard.analyzeProperty({
  label: "Test ridge",
  lat: 38.5,
  lng: -122.8,
  elevationM: 220,
  slopeDeg: 8,
  aspectDeg: 180
});
assert("analysis metrics count", analysis.metrics.length >= 15);
assert("every metric has why", analysis.metrics.every((m) => m.whyItMatters && m.whyItMatters.length > 12));
assert("analysis honesty", /educational/i.test(analysis.honesty));

const future = SavantVineyard.futureVineyard(analysis, grapes);
assert("future timeline length", future.timeline.length === 6);
assert("today label", future.timeline[0].label === "Today");
assert("25y label", future.timeline[5].yearsAhead === 25);

const pinotToday = future.timeline[0].all.find((g) => g.grapeId === "pinot-noir");
const cabToday = future.timeline[0].all.find((g) => g.grapeId === "cabernet-sauvignon");
const pinotFar = future.timeline[5].all.find((g) => g.grapeId === "pinot-noir");
assert("pinot has why", pinotToday && pinotToday.why.length > 40);
assert("cab has why", cabToday && /Cabernet/i.test(cabToday.why));
assert("no bare score without why", future.timeline.every((h) => h.recommended.every((g) => g.why && g.score != null)));
assert("warming scenario applied", future.timeline[5].warmingC > 0);
assert("pinot far horizon explains heat or suitability", /heat|suitable|suitability|warming|disease/i.test(pinotFar.why));

const mapReq = SavantMap.clickToAnalyze(38.5, -122.8, "Click");
assert("map overlays contracted", mapReq.spatialRequest.overlays.includes("terrain-layers"));
assert("buying empty honest", /not live/i.test(SavantBuying.emptyComparison({ name: "x" }).honesty));

WaypointSavant.clearAllLocal();
WaypointSavant.saveWine({
  name: "Test Pinot",
  varietal: "Pinot Noir",
  region: "Willamette",
  quantity: 2,
  purchasePrice: 28,
  location: "Rack A",
  favorite: true,
  foodPairings: ["salmon"]
});
assert("cellar search", WaypointSavant.searchWines("willamette").length === 1);
assert("cellar stats bottles", WaypointSavant.cellarStats().bottleCount === 2);
assert("task nav discover", SavantShell.taskNav("discover").includes("is-active"));

const ssNav = nav.apps.find((a) => a.id === "savant-sommelier");
const featureIds = (ssNav.features || []).map((f) => f.id);
["discover", "learn", "cellar", "vineyard", "settings"].forEach((id) => {
  assert("nav " + id, featureIds.includes(id));
});
assert("foundation routes ready", foundation.routes.every((r) => r.ready === true));

[
  "apps/savant-sommelier/index.html",
  "apps/savant-sommelier/learn.html",
  "apps/savant-sommelier/cellar.html",
  "apps/savant-sommelier/vineyard.html",
  "apps/savant-sommelier/settings.html",
  "apps/savant-sommelier/css/savant-recovery.css",
  "apps/savant-sommelier/js/savant-views.js",
  "docs/SAVANT-PRODUCT-RECOVERY.md",
  "docs/SAVANT-ARCHITECTURE.md",
  "docs/SAVANT-PERFORMANCE.md",
  "docs/SAVANT-TECHNICAL-DEBT.md",
  "docs/SAVANT-FUTURE-VINEYARD-ROADMAP.md",
  "docs/SAVANT-SHARED-PLATFORM-OPPORTUNITIES.md",
  "docs/SAVANT-RECOVERY-CHANGELOG.md"
].forEach((f) => assert("exists " + f, fs.existsSync(path.join(ROOT, f))));

const homeHtml = fs.readFileSync(path.join(ROOT, "apps/savant-sommelier/index.html"), "utf8");
assert("home loads views", homeHtml.includes("savant-views.js"));
assert("home loads recovery css", homeHtml.includes("savant-recovery.css"));
assert("home not foundation-only", !homeHtml.includes("wds-platform-foundation-boot.js"));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Savant recovery checks passed.");
