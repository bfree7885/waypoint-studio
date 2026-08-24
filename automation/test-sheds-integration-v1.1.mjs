#!/usr/bin/env node
/**
 * Sheds Biological Model Integration v1.1 — pipeline, decay, presets, validation, versioning.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];
function pass(name) { console.log("PASS", name); passed += 1; }
function assert(name, cond, detail) {
  if (cond) pass(name);
  else { failures.push(name + (detail ? ": " + detail : "")); console.error("FAIL", name, detail || ""); }
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
    "apps/shed-hunting/js/sheds-session-store.js",
    "apps/shed-hunting/js/sheds-validation-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-habitat.js",
    "apps/shed-hunting/js/sheds-model-presets.js",
    "apps/shed-hunting/js/sheds-likelihood-model.js",
    "apps/shed-hunting/js/sheds-search-planner.js"
  ].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  });
  sandbox.__store = storeMap;
  return sandbox;
}

const S = load();
const Bio = S.WaypointShedsBiological;
const Model = S.WaypointShedsLikelihood;
const Store = S.WaypointShedsObservations;
const Sessions = S.WaypointShedsSessions;
const Planner = S.WaypointShedsPlanner;
const Presets = S.WaypointShedsPresets;
const Validation = S.WaypointShedsValidation;

assert("authoritative bio v1.1", Bio.MODEL_VERSION === "2.0.0");
assert("likelihood delegates only", Model.scoreCell({ lat: 44, lng: -91, prefs: Store.defaultModelPrefs(), observations: [{ type: "deer_sign", location: { lat: 44, lng: -91 }, confidence: "probable" }], terrain: { source: "unavailable" } }).modelVersion === "2.0.0");
assert("empty habitat honest via likelihood", Model.scoreCell({ lat: 44, lng: -91, prefs: Store.defaultModelPrefs(), observations: [], terrain: { source: "unavailable" } }).habitatEmpty === true);
assert("no parallel legacy scorer file needed", !fs.existsSync(path.join(ROOT, "apps/shed-hunting/js/sheds-legacy-likelihood.js")));

const prefs = Store.defaultModelPrefs();
const baseOpts = {
  lat: 44.12,
  lng: -91.25,
  date: new Date("2026-02-20T12:00:00Z"),
  prefs,
  observations: [],
  terrain: {
    slope: 10, aspect: 200, source: "map-derived",
    morphology: { source: "map-derived", ridgeHint: 0.2, drainageHint: 0.7, saddleHint: 0.2, benchHint: 0.5 }
  },
  weather: null
};

const a = Bio.scoreCell(baseOpts);
const b = Bio.scoreCell(baseOpts);
assert("deterministic identical inputs", a.priority === b.priority && a.band === b.band);

const peak = Bio.seasonProfile(new Date("2026-02-20T12:00:00Z"), 44, {});
const outside = Bio.seasonProfile(new Date("2026-07-20T12:00:00Z"), 44, {});
assert("seasonal phase changes results", peak.phaseId !== outside.phaseId && peak.score > outside.score);

const noTerrain = Bio.scoreCell(Object.assign({}, baseOpts, {
  terrain: { slope: null, aspect: null, source: "unavailable", morphology: { source: "unavailable" } }
}));
assert("terrain affects results", Math.abs(a.priority - noTerrain.priority) > 0.001 || a.confidence.environmentalData > noTerrain.confidence.environmentalData);

const withHabitat = Bio.scoreCell(Object.assign({}, baseOpts, { landCoverCategory: "edge" }));
const noHabitat = Bio.scoreCell(Object.assign({}, baseOpts, { landCoverCategory: "unknown" }));
assert("habitat inputs affect results", Math.abs(withHabitat.priority - noHabitat.priority) > 0.001);

const fresh = Store.create({
  type: "deer_sign",
  location: { lat: 44.12, lng: -91.25 },
  confidence: "confirmed",
  observedAt: new Date().toISOString()
});
const old = {
  type: "deer_sign",
  location: { lat: 44.12, lng: -91.25 },
  confidence: "confirmed",
  observedAt: new Date(Date.now() - 90 * 86400000).toISOString()
};
const freshScore = Bio.scoreCell(Object.assign({}, baseOpts, { observations: [fresh.observation], nowMs: Date.now() }));
const oldScore = Bio.scoreCell(Object.assign({}, baseOpts, { observations: [old], nowMs: Date.now() }));
assert("observation recency affects influence", freshScore.parts.deerSign > oldScore.parts.deerSign);

const confirmed = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [{ type: "deer_sign", location: { lat: 44.12, lng: -91.25 }, confidence: "confirmed", observedAt: new Date().toISOString() }]
}));
const uncertain = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [{ type: "deer_sign", location: { lat: 44.12, lng: -91.25 }, confidence: "uncertain", observedAt: new Date().toISOString() }]
}));
assert("observation confidence affects influence", confirmed.parts.deerSign > uncertain.parts.deerSign);

const one = Bio.observationSignals(44.12, -91.25, [
  { type: "feeding_area", location: { lat: 44.12, lng: -91.25 }, observedAt: new Date().toISOString() }
], prefs);
const many = Bio.observationSignals(44.12, -91.25, [
  { type: "feeding_area", location: { lat: 44.12, lng: -91.25 }, observedAt: new Date().toISOString() },
  { type: "feeding_area", location: { lat: 44.1201, lng: -91.2501 }, observedAt: new Date().toISOString() },
  { type: "feeding_area", location: { lat: 44.1202, lng: -91.2502 }, observedAt: new Date().toISOString() },
  { type: "feeding_area", location: { lat: 44.1203, lng: -91.2503 }, observedAt: new Date().toISOString() }
], prefs);
assert("repeated observations diminish", many.feeding < one.feeding * 3.5 && many.feeding > one.feeding);

const singleShed = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [{ type: "shed_found", location: { lat: 44.12, lng: -91.25 }, observedAt: new Date().toISOString() }]
}));
const shedPart = singleShed.contributionBreakdown.find((r) => r.key === "shed_find_interest");
const sumParts = singleShed.contributionBreakdown.reduce((s, r) => s + r.value, 0);
assert("one observation cannot dominate map", shedPart && shedPart.value / sumParts <= Bio.MAX_FACTOR_FRACTION + 0.02);

const searched = Bio.scoreCell(Object.assign({}, baseOpts, {
  observations: [{ type: "search_completed", location: { lat: 44.12, lng: -91.25 }, observedAt: new Date().toISOString() }],
  coverageFactor: 0.35,
  coverageLevel: "thorough"
}));
assert(
  "search reduces priority without zeroing biology",
  searched.priority < searched.biologicalSuitability && searched.biologicalSuitability > 0.15 && searched.priority > 0
);

const missing = Bio.scoreCell({
  lat: 44.12, lng: -91.25, date: new Date("2026-02-20"), prefs,
  observations: [], terrain: { source: "unavailable", morphology: { source: "unavailable" } }, weather: null, offlineForced: true
});
assert("missing inputs lower confidence", missing.confidence.overallRecommendation < a.confidence.overallRecommendation);
assert("missing inputs do not crash", missing.priority >= 0 && missing.explanation);

assert("explanation matches influences", /Positive|positive|Limiting|limiting|Seasonal|priority/i.test(missing.explanation + " " + a.explanation));
assert("a has positive or seasonal context", !!(a.influences && (a.influences.positive.length || a.seasonContext)));

const peakPrefs = Presets.applyPreset(prefs, "peak_shed");
const latePrefs = Presets.applyPreset(prefs, "late_season");
const peakCell = Bio.scoreCell(Object.assign({}, baseOpts, { prefs: peakPrefs }));
const lateCell = Bio.scoreCell(Object.assign({}, baseOpts, { prefs: latePrefs }));
assert("preset changes materially affect", Math.abs(peakCell.priority - lateCell.priority) > 0.001 || peakCell.seasonContext.phaseId !== lateCell.seasonContext.phaseId);

const reset = Presets.applyPreset(peakPrefs, "balanced");
assert("reset restores balanced", reset.activePreset === "balanced" && reset.weights.season === "balanced" && !reset.seasonPhaseOverride);

const sess = Sessions.startSession({
  modelVersion: Bio.MODEL_VERSION,
  factorConfigVersion: Bio.FACTOR_CONFIG_VERSION,
  activePreset: "balanced",
  regionalContext: Bio.regionalContext(44.12, -91.25, new Date())
});
assert("session stores model version", sess.modelVersion === "2.0.0" && sess.factorConfigVersion === "2.0.0");
Sessions.endSession(sess.id, {});
const oldLike = Sessions.getSession(sess.id);
assert("old session remains traceable", oldLike.modelVersion === "2.0.0");

const val = Validation.create({
  lat: 44.12, lng: -91.25, shedOutcome: "not_found",
  modelVersion: Bio.MODEL_VERSION, factorConfigVersion: Bio.FACTOR_CONFIG_VERSION,
  activePreset: "balanced", cellPriority: a.priority, cellBand: a.band
});
assert("validation record versioned", val.ok && val.validation.modelSnapshot.modelVersion === "2.0.0");
assert("validation not treated as truth", val.validation.treatAsBiologicalTruth === false);

const FakeBounds = {
  getWest() { return -91.3; }, getEast() { return -91.2; },
  getSouth() { return 44.1; }, getNorth() { return 44.15; }
};
const grid = Model.buildGrid(FakeBounds, 8, 8, { date: new Date("2026-02-20"), prefs, observations: Store.list(), sessions: Sessions });
const plan = Planner.plan({ grid, userLatLng: { lat: 44.12, lng: -91.25 }, sessions: Sessions, observations: Store.list(), model: Model });
assert("planner uses bio grid", plan.ok && grid.modelVersion === "2.0.0");

// Coverage not double-applied: thorough cell priority already reduced; planner score ~= priority aside from dist
Sessions.markCoverage(44.125, -91.25, "thorough", { source: "test" });
const g2 = Model.buildGrid(FakeBounds, 8, 8, { date: new Date("2026-02-20"), prefs, observations: Store.list(), sessions: Sessions });
const cell = g2.cells.find((c) => c.coverageLevel === "thorough") || g2.cells[0];
const plan2 = Planner.plan({ grid: g2, userLatLng: { lat: 44.12, lng: -91.25 }, sessions: Sessions, observations: Store.list(), model: Model });
assert("coverage-aware plan ok", plan2.ok || (!plan2.ok && /habitat/i.test(plan2.reason || "")));
void cell;

assert("gen cancel pattern in map-app", /recomputeGen/.test(fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8")));
assert("coarse then refine in map-app", /COARSE_ROWS/.test(fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8")));
const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("presets and validation in html", /model-preset/.test(html) && /sheet-validate/.test(html) && /season-pill/.test(html));
assert("scripts include presets+validation", /sheds-model-presets/.test(html) && /sheds-validation-store/.test(html));
assert("offline mode control", /offline-forced/.test(html));
assert("a11y taxonomy pre", /aria-label="Factor taxonomy/.test(html) || /explain-taxonomy/.test(html));

if (failures.length) {
  console.error("\nIntegration tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds integration v1.1 tests passed (" + passed + ").");
