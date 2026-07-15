#!/usr/bin/env node
/**
 * Whitetail Biological Model v1.0 — factor, conflict, dominance, uncertainty tests.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}
function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load() {
  const storeMap = new Map();
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k)
    }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  [
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-likelihood-model.js"
  ].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  });
  return sandbox;
}

const S = load();
const Bio = S.WaypointShedsBiological;
const Store = S.WaypointShedsObservations;
const Model = S.WaypointShedsLikelihood;

assert("bio module", !!Bio && Bio.MODEL_VERSION === "1.0.0");
assert("catalog non-empty", Bio.listFactors().length >= 10);
assert("evidence present", !!Bio.getEvidence("E08") && !!Bio.getEvidence("E14"));
assert("base shares documented", Object.keys(Bio.BASE_SHARE).length >= 10);
assert("max fraction prevents monopoly", Bio.MAX_FACTOR_FRACTION <= 0.35);

const prefs = Store.defaultModelPrefs();
const baseOpts = {
  lat: 44.12,
  lng: -91.25,
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: [],
  terrain: { slope: 10, aspect: 200, source: "map-derived", morphology: {
    source: "map-derived", ridgeHint: 0.2, drainageHint: 0.7, saddleHint: 0.1, benchHint: 0.4
  } },
  weather: null
};

const baseline = Bio.scoreCell(baseOpts);
assert("baseline scores", baseline.priority > 0 && baseline.confidence);
assert("taxonomy present", baseline.taxonomy && baseline.taxonomy.ecologicalAssumptions.length);
assert("explanation honest", /not a map of antlers|not.*probability|Confidence \(not probability\)/i.test(baseline.explanation));
assert("calibration hooks", baseline.calibration && baseline.calibration.readyFor.length >= 3);

// Every prefs weight key that maps to a factor should change output when toggled strong vs off
const weightKeys = [
  "season", "slope", "aspect", "terrainForm", "thermalCover", "edges", "humanPressure", "snow"
];
weightKeys.forEach((key) => {
  const offPrefs = JSON.parse(JSON.stringify(prefs));
  const strongPrefs = JSON.parse(JSON.stringify(prefs));
  offPrefs.weights[key] = "off";
  strongPrefs.weights[key] = "strong";
  const obs = [];
  if (key === "thermalCover") {
    obs.push({ type: "winter_concentration", location: { lat: 44.12, lng: -91.25 }, confidence: "probable" });
  }
  if (key === "humanPressure") {
    obs.push({ type: "hunting_pressure", location: { lat: 44.12, lng: -91.25 }, confidence: "probable" });
  }
  const a = Bio.scoreCell(Object.assign({}, baseOpts, {
    prefs: offPrefs,
    observations: obs,
    weather: key === "snow" ? { snowInfluence: 0.7, snowMm: 30, source: "weather-provider" } : null
  }));
  const b = Bio.scoreCell(Object.assign({}, baseOpts, {
    prefs: strongPrefs,
    observations: obs,
    weather: key === "snow" ? { snowInfluence: 0.7, snowMm: 30, source: "weather-provider" } : null
  }));
  assert("factor weight changes output: " + key, Math.abs(a.priority - b.priority) > 0.001 ||
    JSON.stringify(a.contributionBreakdown) !== JSON.stringify(b.contributionBreakdown));
});

// Observation-driven factors
["feeding_area", "bedding_area", "trail_crossing", "fence_crossing", "deer_sign", "shed_found"].forEach((type) => {
  const withObs = Bio.scoreCell(Object.assign({}, baseOpts, {
    observations: [{ type: type, location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" }]
  }));
  assert("obs type changes score: " + type, Math.abs(withObs.priority - baseline.priority) > 0.002);
});

// Conflicting: high hunting pressure vs winter cover nearby — pressure should pull attractiveness down relative to cover-only
const coverOnly = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [{ type: "winter_concentration", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" }]
}));
const coverPlusPressure = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [
    { type: "winter_concentration", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" },
    { type: "hunting_pressure", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" }
  ]
}));
assert("pressure vs cover conflict sensible", coverPlusPressure.priority < coverOnly.priority);

// No single variable dominates: max contribution fraction among additive factors
const rich = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [
    { type: "feeding_area", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" },
    { type: "bedding_area", location: { lat: 44.121, lng: -91.251 }, confidence: "confirmed" },
    { type: "winter_concentration", location: { lat: 44.119, lng: -91.249 }, confidence: "confirmed" },
    { type: "shed_found", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" }
  ],
  prefs: (function () {
    const p = JSON.parse(JSON.stringify(prefs));
    p.weights.season = "strong";
    return p;
  })()
}));
const contribs = rich.contributionBreakdown.map((r) => r.value);
const sum = contribs.reduce((a, b) => a + b, 0);
const max = Math.max.apply(null, contribs);
assert("no single factor dominates", sum > 0 && max / sum <= Bio.MAX_FACTOR_FRACTION + 0.02);

// Uncertainty rises when inputs disappear
const full = Bio.scoreCell(Object.assign({}, baseOpts, {
  weather: { snowInfluence: 1, snowMm: 2, tempC: -5, source: "weather-provider" },
  observations: [{ type: "deer_sign", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed" }]
}));
const bare = Bio.scoreCell({
  lat: 44.12,
  lng: -91.25,
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: [],
  terrain: { slope: null, aspect: null, source: "unavailable", morphology: { source: "unavailable" } },
  weather: null
});
assert(
  "uncertainty increases when inputs disappear",
  bare.confidence.overallRecommendation < full.confidence.overallRecommendation &&
    bare.confidence.environmentalData < full.confidence.environmentalData
);

// Latitude shifts seasonal peak
const south = Bio.seasonProfile(new Date("2026-01-25T12:00:00Z"), 32);
const north = Bio.seasonProfile(new Date("2026-01-25T12:00:00Z"), 48);
assert("latitude influences timing", south.peakDoy < north.peakDoy);
assert("jan more peak-like in south", south.score >= north.score);

// Aspect disagreement documented
assert("aspect disagreement noted in evidence", /DISAGREEMENT/i.test(Bio.EVIDENCE.E14.summary));

// Likelihood wrappers
assert("likelihood delegates", Model.scoreCell(baseOpts).modelVersion === "1.0.0");
const FakeBounds = {
  getWest() { return -91.3; },
  getEast() { return -91.2; },
  getSouth() { return 44.1; },
  getNorth() { return 44.15; }
};
const grid = Model.buildGrid(FakeBounds, 6, 6, {
  date: new Date("2026-02-20T12:00:00Z"),
  prefs: prefs,
  observations: []
});
assert("grid uses bio model", grid.modelVersion === "1.0.0" && grid.cells.length === 36);

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("bio script in map", /sheds-biological-model\.js/.test(html));
assert("doc exists", fs.existsSync(path.join(ROOT, "docs/BIOLOGICAL_MODEL.md")));

if (failures.length) {
  console.error("\nBiological model tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll biological model tests passed (" + passed + ").");
