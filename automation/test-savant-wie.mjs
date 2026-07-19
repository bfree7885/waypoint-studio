#!/usr/bin/env node
/**
 * Savant Sommelier Phase 2 — Wine Intelligence Engine tests.
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

load("apps/savant-sommelier/js/savant-models.js");
load("apps/savant-sommelier/js/vineyard/vineyard-engine.js");
load("apps/savant-sommelier/js/wie/savant-wie-boot.js");
load("apps/savant-sommelier/js/wie/savant-wie-signals.js");
load("apps/savant-sommelier/js/wie/savant-wie-palate.js");
load("apps/savant-sommelier/js/wie/savant-wie-recommend.js");
load("apps/savant-sommelier/js/wie/savant-wie-discovery.js");
load("apps/savant-sommelier/js/wie/savant-wie-tasting.js");
load("apps/savant-sommelier/js/wie/savant-wie-pairing.js");
load("apps/savant-sommelier/js/wie/savant-wie-cellar.js");
load("apps/savant-sommelier/js/wie/savant-wie-purchase.js");
load("apps/savant-sommelier/js/wie/savant-wie-education.js");
load("apps/savant-sommelier/js/wie/savant-wie-compare.js");
load("apps/savant-sommelier/js/wie/savant-wie-search.js");
load("apps/savant-sommelier/js/wie/savant-wie-engine.js");

const catalog = readJson("apps/savant-sommelier/data/discover-catalog.json");
const grapes = readJson("apps/savant-sommelier/data/grape-suitability-models.json");

assert("wie engine", !!global.SavantWIE && !!SavantWIE.engine);

WaypointSavant.clearAllLocal();
WaypointSavant.saveWine({
  name: "Mosel Kabinett",
  varietal: "Riesling",
  region: "Mosel",
  country: "Germany",
  style: "white",
  quantity: 2,
  purchasePrice: 22,
  purchaseDate: "2026-06-01",
  rating: 92,
  favorite: true,
  notes: "bright acidity citrus mineral",
  foodPairings: ["spicy thai"]
});
WaypointSavant.saveWine({
  name: "Heavy Oak Chard",
  varietal: "Chardonnay",
  region: "Napa Valley",
  country: "USA",
  style: "white",
  quantity: 1,
  purchasePrice: 45,
  purchaseDate: "2026-01-15",
  rating: 62,
  notes: "heavy oak butter vanilla hot alcohol"
});
WaypointSavant.saveWine({
  name: "Willamette Pinot",
  varietal: "Pinot Noir",
  region: "Willamette Valley",
  country: "USA",
  style: "red",
  quantity: 1,
  purchasePrice: 34,
  rating: 90,
  favorite: true,
  notes: "elegant cherry bright acid"
});

const pkg = SavantWIE.engine.evaluate({ catalog, force: true });
assert("palate emerging or better", pkg.palate.confidence === "emerging" || pkg.palate.confidence === "moderate");
assert("recommendations have why", pkg.recommendations.items.every((i) => i.why && i.why.length > 20));
assert("discovery has why", pkg.discovery.suggestions.every((s) => s.why && s.why.length > 10));
assert("tasting summary", pkg.tasting.summary.length >= 1);
assert("enjoyed traits detected", pkg.tasting.enjoyed.length >= 1);
assert("rarely oak or alcohol", pkg.tasting.rarely.some((r) => /oak|alcohol|sweet/i.test(r.label)));
assert("cellar insights", pkg.cellar.insights.length >= 1);
assert("purchase avg price", pkg.purchase.averageBottlePrice != null);
assert("purchase recs explain", pkg.purchase.recommendations.every((r) => r.why));

const pair = SavantWIE.engine.pairFood(catalog, "grilled steak", pkg.palate);
assert("pairing explains", pair.matches.some((m) => /tannin|protein|grill|meat/i.test(m.why)));

const search = SavantWIE.engine.search(catalog, "cab");
assert("search synonym cab", search.normalized.indexOf("cabernet") !== -1);
assert("search results", search.results.length >= 1);

const miss = SavantWIE.search.normalize("reisling");
assert("misspelling riesling", /riesling/i.test(miss));

const a = catalog.entries.find((e) => e.name === "Pinot Noir");
const b = catalog.entries.find((e) => e.name === "Cabernet Sauvignon");
const cmp = SavantWIE.engine.compare(a, b);
assert("compare ok", cmp.ok && cmp.differences.length >= 2);
assert("compare has why", /why|contrast|teach/i.test(cmp.why));

const analysis = SavantVineyard.analyzeProperty({ lat: 38.5, lng: -122.8, elevationM: 220, slopeDeg: 8, aspectDeg: 180 });
const future = SavantVineyard.futureVineyard(analysis, grapes);
assert("strengths present", future.strengths.length >= 1);
assert("risks present", future.risks.length >= 1);
assert("trajectory horizons", future.climateTrajectory.byHorizon.length === 6);
assert("why not on low grapes", future.timeline[0].all.some((g) => g.whyNot && g.whyNot.length > 20));
assert("notRecommended listed", future.timeline.every((h) => Array.isArray(h.notRecommended)));
assert("trajectory uncertainty labeled", future.climateTrajectory.byHorizon[5].uncertainty.length > 10);

const hcmp = SavantWIE.compare.compareHorizons(future, 0, 25);
assert("horizon compare", hcmp.ok);

const cached = SavantWIE.engine.evaluate({ catalog });
assert("engine cache hit", cached._fromCache === true);

const home = fs.readFileSync(path.join(ROOT, "apps/savant-sommelier/index.html"), "utf8");
assert("home loads wie engine", home.includes("savant-wie-engine.js"));
assert("home loads palate", home.includes("savant-wie-palate.js"));

[
  "docs/SAVANT-WINE-INTELLIGENCE-ARCHITECTURE.md",
  "docs/SAVANT-RECOMMENDATION-ENGINE.md",
  "docs/SAVANT-PALATE-ENGINE.md",
  "docs/SAVANT-VINEYARD-INTELLIGENCE.md",
  "docs/SAVANT-WIE-PERFORMANCE.md",
  "docs/SAVANT-WIE-TECHNICAL-DEBT.md",
  "docs/SAVANT-FUTURE-AI-OPPORTUNITIES.md",
  "docs/SAVANT-WIE-CHANGELOG.md"
].forEach((f) => assert("exists " + f, fs.existsSync(path.join(ROOT, f))));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll Savant WIE checks passed.");
