#!/usr/bin/env node
/**
 * ForageCast Recovery Sprint 4 — location honesty, boot contracts, outdoor intelligence.
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

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const memory = new Map();
const sandbox = {
  window: {},
  console,
  setTimeout,
  clearTimeout,
  navigator: { onLine: true },
  localStorage: {
    getItem(k) {
      return memory.has(k) ? memory.get(k) : null;
    },
    setItem(k, v) {
      memory.set(k, String(v));
    },
    removeItem(k) {
      memory.delete(k);
    }
  },
  location: { pathname: "/apps/foragecast/", search: "", hash: "", reload() {} },
  document: {
    readyState: "complete",
    addEventListener() {},
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  },
  fetch() {
    return Promise.reject(new Error("network disabled in unit test"));
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
sandbox.WDS = {};

function load(rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

[
  "apps/foragecast/js/foragecast-location.js",
  "apps/foragecast/js/foragecast-prediction.js",
  "apps/foragecast/js/foragecast-home.js",
  "apps/foragecast/js/foragecast-intelligence.js",
  "apps/foragecast/js/foragecast-views.js",
  "design-system/js/wds-location.js",
  "design-system/js/dashboard/wds-us-national-context.js",
  "docs/FORAGECAST-RECOVERY-REPORT.md",
  "docs/FORAGECAST-LOCATION-SYSTEM.md",
  "docs/FORAGECAST-PROVIDER-AUDIT.md",
  "docs/FORAGECAST-PERFORMANCE-SPRINT4.md",
  "docs/FORAGECAST-TECHNICAL-DEBT.md",
  "docs/FORAGECAST-READINESS-SPRINT4.md",
  "docs/FORAGECAST-CHANGELOG-SPRINT4.md"
].forEach((f) => assert("exists " + f, exists(f)));

const locSrc = read("design-system/js/wds-location.js");
assert("platform rejects null place parts", /isUsablePlacePart/.test(locSrc));
assert("platform formatRegionLabel guards", /sanitizePlaceLabel/.test(locSrc));
assert("exports formatRegionLabel", /formatRegionLabel:\s*formatRegionLabel/.test(locSrc));

const predSrc = read("apps/foragecast/js/foragecast-prediction.js");
assert("season table uses platformBoot.watch", /platformBoot\.watch/.test(predSrc));
assert("season table loc timeout", /1800/.test(predSrc));
assert("season table fail UI", /platformBoot\.fail/.test(predSrc));

const homeSrc = read("apps/foragecast/js/foragecast-home.js");
assert("home reliability badge", /renderReliability|fc-reliability/.test(homeSrc));
assert("home null comma guard", /null\\s\*,|ForageCastLocation\.formatRegionLabel/.test(homeSrc));

const intelSrc = read("apps/foragecast/js/foragecast-intelligence.js");
assert("interpretive soil moisture copy", /Soil moisture/.test(intelSrc));
assert("dry conditions reduce likelihood", /Dry, warm conditions reduce likelihood/.test(intelSrc));

const viewsSrc = read("apps/foragecast/js/foragecast-views.js");
assert("species overview section", /<h2>Overview<\/h2>/.test(viewsSrc));
assert("species environmental drivers", /Environmental drivers/.test(viewsSrc));
assert("species safety section", /Safety/.test(viewsSrc));

load("design-system/js/dashboard/wds-us-national-context.js");
load("design-system/js/wds-location.js");
load("apps/foragecast/js/foragecast-location.js");
load("apps/foragecast/js/foragecast-today.js");
load("apps/foragecast/js/foragecast-intelligence.js");

assert("WDS.location loaded", !!(sandbox.WDS.location && sandbox.WDS.location.formatRegionLabel));
assert("ForageCastLocation loaded", !!sandbox.ForageCastLocation);

const bad = {
  name: null,
  stateCode: "NY",
  state: "New York",
  lat: 42.5,
  lng: -74.0,
  source: "ip",
  city: "NULL",
  placeLabel: "null, NY",
  displayTitle: "null, NY"
};
const fixed = sandbox.WDS.location.formatRegionLabel(bad);
assert(
  "never shows null, NY",
  fixed && !/null/i.test(fixed),
  fixed
);
assert(
  "usable fallback for poisoned label",
  /Location in NY|New York|42\.|°/.test(fixed),
  fixed
);

const applied = sandbox.WDS.location.applyPlaceDisplay({
  name: null,
  stateCode: "NY",
  state: "New York",
  lat: 42.5,
  lng: -74.0,
  source: "ip",
  placeLabel: "null, NY",
  city: "NULL"
});
assert(
  "applyPlaceDisplay cleans displayTitle",
  applied && applied.displayTitle && !/null/i.test(String(applied.displayTitle)),
  applied && applied.displayTitle
);

const fcLabel = sandbox.ForageCastLocation.formatRegionLabel(bad);
assert("ForageCastLocation rejects null, NY", fcLabel && !/null/i.test(fcLabel), fcLabel);

const reliability = sandbox.ForageCastLocation.reliabilityState(null, null);
assert("reliability location-unavailable", reliability && reliability.id === "location-unavailable");

const ready = sandbox.ForageCastLocation.reliabilityState(
  { modules: { weather: { status: "live", isLive: true, current: { temperature: 70 } } } },
  { name: "Pike County", stateCode: "PA", lat: 41.3, lng: -74.9 }
);
assert("reliability ready", ready && ready.id === "ready");

const speciesModel = JSON.parse(read("apps/foragecast/data/species-model.json"));
const conditions = JSON.parse(read("apps/foragecast/data/conditions.json"));
const terrain = JSON.parse(read("apps/foragecast/data/terrain-zones.json"));

load("apps/foragecast/js/foragecast-model.js");
const summary = sandbox.ForageCastIntelligence.buildSummary({
  speciesList: speciesModel.species,
  zones: terrain.zones,
  conditions: conditions,
  platform: {
    modules: {
      weather: {
        status: "live",
        isLive: true,
        current: { temperature: 78, conditions: "Clear" },
        daily: [
          { precipitationSum: 0, temperatureMin: 60, temperatureMax: 88 },
          { precipitationSum: 0, temperatureMin: 62, temperatureMax: 90 },
          { precipitationSum: 0, temperatureMin: 61, temperatureMax: 89 }
        ]
      }
    }
  },
  homeData: {},
  location: { name: "Pike County", stateCode: "PA" }
});
assert("summary opportunities", summary.species && summary.species.length >= 1);
assert(
  "dry/hot interpretation present",
  summary.briefing.bullets.some((b) => /dry|heat|moisture|temperature/i.test(b.text + " " + b.why)),
  JSON.stringify(summary.briefing.bullets.map((b) => b.text))
);
assert("every opportunity has why", summary.species.every((s) => s.why && s.why.length > 6));

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  process.exit(1);
}
console.log("\nAll ForageCast Sprint 4 recovery checks passed.");
