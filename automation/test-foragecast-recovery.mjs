#!/usr/bin/env node
/**
 * ForageCast Product Recovery — intelligence + hydration contract tests.
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

global.window = global;
global.location = { pathname: "/apps/foragecast/", search: "" };

load("apps/foragecast/js/foragecast-model.js");
load("apps/foragecast/js/foragecast-today.js");
load("apps/foragecast/js/foragecast-fetch.js");
load("apps/foragecast/js/foragecast-intelligence.js");
load("design-system/js/outdoor-intelligence/wds-oip-adapters.js");

const speciesModel = readJson("apps/foragecast/data/species-model.json");
const conditions = readJson("apps/foragecast/data/conditions.json");
const terrain = readJson("apps/foragecast/data/terrain-zones.json");
const nav = readJson("design-system/ecosystem/nav-registry.json");

assert("runtime intelligence", !!global.ForageCastIntelligence);
assert("runtime fetch", !!global.ForageCastFetch);
assert("species educational fields", speciesModel.species.every((s) => s.lookAlikes && s.ethicalHarvest && s.preferredHabitat));

const summary = ForageCastIntelligence.buildSummary({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: null,
  homeData: {},
  location: { name: "Test County" }
});

assert("summary has species", summary.species.length === speciesModel.species.length);
assert("summary honesty without live weather", /unavailable|uncertain/i.test(summary.honesty));
assert("every species statement has why", summary.species.every((s) => s.why && s.why.length > 8));
assert("briefing mentions uncertainty without live", summary.briefing.bullets.some((b) => /uncertain|unavailable/i.test(b.text + b.why)));

const livePlatform = {
  modules: {
    weather: {
      status: "live",
      isLive: true,
      current: { temperature: 72, conditions: "Partly cloudy" },
      daily: [
        { precipitationSum: 8, temperatureMin: 58, temperatureMax: 84 },
        { precipitationSum: 1, temperatureMin: 60, temperatureMax: 86 },
        { precipitationSum: 0, temperatureMin: 62, temperatureMax: 88 }
      ]
    }
  },
  rainfall: { recent: { summary: "Elevated soil moisture after recent rainfall" } },
  calendar: { weekOf: "2026-07-18", season: "summer" },
  county: { name: "Pike County" },
  state: { name: "Pennsylvania" }
};

const hydrated = JSON.parse(JSON.stringify(conditions));
WDS.outdoorIntelligence.adapters.hydrateConditions(hydrated, livePlatform, { elevationFt: 1100 });
assert("hydrate marks live", hydrated._hydration && hydrated._hydration.liveWeather === true);
assert("hydrate updates rainfall label", /live/i.test(hydrated.labels.recentRainfall));
assert("hydrate updates temperature label", /live/i.test(hydrated.labels.temperature));

const liveSummary = ForageCastIntelligence.buildSummary({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: hydrated,
  platform: livePlatform,
  homeData: {},
  location: { name: "Pike County" }
});
assert("live summary flag", liveSummary.liveWeather === true);
assert("live briefing has heat or rain interpretation", liveSummary.briefing.bullets.length >= 2);

const fcNav = nav.apps.find((a) => a.id === "foragecast");
const featureIds = (fcNav.features || []).map((f) => f.id);
[
  "overview",
  "conditions",
  "species",
  "map",
  "timeline",
  "weather",
  "habitats",
  "learn",
  "journal",
  "settings"
].forEach((id) => assert("nav " + id, featureIds.includes(id)));

[
  "apps/foragecast/index.html",
  "apps/foragecast/conditions.html",
  "apps/foragecast/species.html",
  "apps/foragecast/map.html",
  "apps/foragecast/timeline.html",
  "apps/foragecast/js/foragecast-intelligence.js",
  "apps/foragecast/css/foragecast-recovery.css",
  "docs/FORAGECAST-PRODUCT-RECOVERY.md"
].forEach((f) => assert("exists " + f, fs.existsSync(path.join(ROOT, f))));

const homeHtml = fs.readFileSync(path.join(ROOT, "apps/foragecast/index.html"), "utf8");
assert("home loads intelligence", homeHtml.includes("foragecast-intelligence.js"));
assert("home loads recovery css", homeHtml.includes("foragecast-recovery.css"));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll ForageCast recovery checks passed.");
