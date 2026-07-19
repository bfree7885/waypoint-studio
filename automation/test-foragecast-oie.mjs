#!/usr/bin/env node
/**
 * ForageCast Outdoor Intelligence Engine (Phase 2) contract tests.
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
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); }
};

load("apps/foragecast/js/foragecast-model.js");
load("apps/foragecast/js/foragecast-today.js");
load("apps/foragecast/js/oie/foragecast-oie-observations.js");
load("apps/foragecast/js/oie/foragecast-oie-derived.js");
load("apps/foragecast/js/oie/foragecast-oie-scoring.js");
load("apps/foragecast/js/oie/foragecast-oie-confidence.js");
load("apps/foragecast/js/oie/foragecast-oie-explain.js");
load("apps/foragecast/js/oie/foragecast-oie-map-contract.js");
load("apps/foragecast/js/oie/foragecast-oie-engine.js");
load("apps/foragecast/js/foragecast-intelligence.js");

const speciesModel = readJson("apps/foragecast/data/species-model.json");
const conditions = readJson("apps/foragecast/data/conditions.json");
const terrain = readJson("apps/foragecast/data/terrain-zones.json");

assert("OIE layers present", !!(
  ForageCastOIE.observations &&
  ForageCastOIE.derived &&
  ForageCastOIE.scoring &&
  ForageCastOIE.confidence &&
  ForageCastOIE.explain &&
  ForageCastOIE.map &&
  ForageCastOIE.engine
));

const livePlatform = {
  modules: {
    weather: {
      status: "live",
      isLive: true,
      current: { temperature: 24, humidity: 78, conditions: "Humid" },
      daily: [
        { precipitationSum: 10, temperatureMin: 16, temperatureMax: 28 },
        { precipitationSum: 2, temperatureMin: 17, temperatureMax: 30 },
        { precipitationSum: 0, temperatureMin: 18, temperatureMax: 32 },
        { precipitationSum: 0, temperatureMin: 17, temperatureMax: 31 },
        { precipitationSum: 1, temperatureMin: 16, temperatureMax: 29 }
      ]
    }
  },
  rainfall: { recent: { summary: "Elevated soil moisture after rainfall" } },
  calendar: { weekOf: "2026-07-18", season: "summer" }
};

const obs = ForageCastOIE.observations.collect(livePlatform, conditions, { name: "Pike", lat: 41.3, lng: -75.0 });
assert("observations live", obs.liveWeather === true);
assert("observations daily rows", obs.weather.daily.length >= 3);

const derived = ForageCastOIE.derived.derive(obs);
assert("derived rainfall trend", !!derived.signals.rainfallTrend);
assert("derived factors", derived.factors.recentPrecipitation != null);
assert("derived nighttime", !!derived.signals.nighttimeCooling);

const scored = ForageCastOIE.scoring.scoreAll(speciesModel.species, derived, terrain.zones, conditions);
assert("scored all species", scored.length === speciesModel.species.length);
assert("transparent contributions", scored[0].contributions.length >= 5);
assert("top drivers present", scored[0].topDrivers.length >= 1);

const conf = ForageCastOIE.confidence.explainConfidence(scored[0], derived, null);
assert("confidence answers why", (conf.whyHigh.length + conf.whyLow.length) >= 1);
assert("confidence improve/reduce", conf.wouldImprove.length >= 1 && conf.wouldReduce.length >= 1);
assert("changed-since answers", conf.changedSinceYesterday.length >= 1);

const mapFound = ForageCastOIE.map.describeFoundation();
assert("map contract overlays", mapFound.overlays.length >= 5);
assert("map request is architectural", /Architectural/i.test(
  ForageCastOIE.map.createSpatialRequest({ speciesId: "chanterelles", overlays: ["heat-map"] }).note
));

const pkg = ForageCastOIE.engine.evaluate({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: livePlatform,
  location: { name: "Pike", lat: 41.3, lng: -75.0 }
});
assert("engine opportunities", pkg.opportunities.length === speciesModel.species.length);
assert("engine forecast lines", pkg.forecast.length >= 1);
assert("engine insights", pkg.insights.length >= 1);
assert("engine briefing", pkg.briefing.bullets.length >= 1);

const cached = ForageCastOIE.engine.evaluate({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: livePlatform,
  location: { name: "Pike", lat: 41.3, lng: -75.0 }
});
assert("engine memory cache", cached._fromCache === true);

const summary = ForageCastIntelligence.buildSummary({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: livePlatform,
  location: { name: "Pike" }
});
assert("intelligence delegates to OIE", !!summary.opportunities && !!summary.engine);
assert("opportunities have why", summary.opportunities.every((o) => o.why && o.why.length > 10));

// Offline path: no fabricated certainty
const offline = ForageCastOIE.engine.evaluate({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: null,
  location: { name: "Pike" },
  force: true
});
assert("offline cautious honesty", /unavailable|cautious/i.test(offline.honesty));
assert("offline briefing uncertainty", offline.briefing.bullets.some((b) => /unavailable|uncertain|cautious/i.test(b.text + b.why)));

[
  "apps/foragecast/js/oie/foragecast-oie-engine.js",
  "docs/FORAGECAST-OUTDOOR-INTELLIGENCE-ENGINE.md"
].forEach((f) => assert("exists " + f, fs.existsSync(path.join(ROOT, f))));

const home = fs.readFileSync(path.join(ROOT, "apps/foragecast/index.html"), "utf8");
assert("home loads OIE engine", home.includes("foragecast-oie-engine.js"));

if (failures.length) {
  console.log("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll ForageCast OIE Phase 2 checks passed.");
