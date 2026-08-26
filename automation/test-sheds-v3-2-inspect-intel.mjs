#!/usr/bin/env node
/**
 * Sheds V3.2 — Inspect Facts + Why this may matter (deterministic explainability).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function loadIntel() {
  const code = read("apps/shed-hunting/js/sheds-inspect-intel.js");
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.WaypointShedsInspectIntel;
}

const Intel = loadIntel();
assert.ok(Intel, "InspectIntel module");
assert.equal(Intel.VERSION, "3.2.3");
assert.equal(typeof Intel.buildWhyLines, "function");

const WILDLIFE =
  /shed found|antler here|find probability|deer are here|deer present|deer bed|deer feed|deer travel|bedding area|feeding area|deer trail|wildlife movement|sheds are likely|expect to find/i;
const PREDICTION = /habitat signal|Search potential|find %|chance of finding/i;

function assertHonest(report, label) {
  assert.equal(report.containsBannedLanguage, false, label + " banned language");
  assert.equal(report.containsWildlifeInference, false, label + " wildlife inference");
  assert.doesNotMatch(report.hudText, WILDLIFE, label + " wildlife copy");
  assert.doesNotMatch(report.hudText, PREDICTION, label + " prediction copy");
  assert.match(report.hudText, /Limits/);
  assert.match(report.hudText, /do not indicate that deer or shed antlers are present/i);
}

// ——— Elevation / slope / aspect truth ———
assert.equal(Intel.formatElevationFt(432.8), "1,420 ft");
assert.equal(Intel.formatElevationFt(0), "0 ft");
assert.equal(Intel.slopeClassLabel(9.5), "moderate slope");
assert.equal(Intel.aspectFacingPhrase("SW"), "southwest-facing");

const flat = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 100,
  southM: 100,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert.ok(flat.slopeDeg != null && flat.slopeDeg < 0.5);

const southFace = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 110,
  southM: 90,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert.ok(southFace.slopeDeg > 5);
assert.ok(["S", "SE", "SW"].includes(Intel.aspectCardinal(southFace.aspectDeg)));

const northFace = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 90,
  southM: 110,
  eastM: 100,
  westM: 100,
  stepM: 60
});

const strongOpts = {
  lat: 41.32,
  lng: -74.8,
  elevM: 432.8,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: southFace,
  gisSample: {
    nlcd: 41,
    structure: "forest",
    structureLabel: "Forest cover",
    edgeM: 40,
    slopeDeg: 8,
    resolutionNote: "~30 m land-cover source"
  },
  packMeta: { nlcdYear: 2021 },
  fromYou: "From YOU: 120 yd · NE 45°",
  fromSearch: "From SEARCH: 40 yd · N 10°"
};

const strong = Intel.buildInspectReport(strongOpts);
const strongAgain = Intel.buildInspectReport(strongOpts);
assert.deepEqual(strong.why, strongAgain.why, "same facts → same Why");
assert.equal(strong.hudText, strongAgain.hudText, "same facts → same HUD");
assert.equal(strong.explainability, true);
assert.ok(strong.hudFacts && /What is here/.test(strong.hudFacts));
assert.doesNotMatch(strong.hudFacts, /Why this may matter/);
assert.match(strong.hudFacts, /Terrain · /);
assert.match(strong.hudFacts, /Habitat · /);
assert.match(strong.hudExplain, /Why this may matter/);
assert.match(strong.hudExplain, /Limits/);
assert.match(strong.hudText, /What is here/);
assert.match(strong.hudText, /Terrain/);
assert.match(strong.hudText, /Elevation: 1,420 ft/);
assert.match(strong.hudText, /Slope: /);
assert.match(strong.hudText, /moderate slope/);
assert.match(strong.hudText, /Aspect: south-facing/);
assert.match(strong.hudText, /Land cover: Forest cover/);
assert.match(strong.hudText, /Land-cover edge: 40 m/);
assert.match(strong.hudText, /Why this may matter/);
assert.match(strong.hudText, /Moderate slope is generally walkable/);
assert.match(strong.hudText, /winter sun|south-facing terrain receives/i);
assert.match(strong.hudText, /land-cover edge is nearby \(~40 m\)/i);
assert.match(strong.hudText, /worth inspecting/);
assert.match(strong.hudText, /Limits/);
assert.match(strong.hudText, /help you decide where to look more closely/i);
assert.match(strong.hudText, /Inspect is not an observation of wildlife/);
assert.equal(strong.habitat.score, null);
assert.equal(strong.habitat.bandLabel, null);
assert.ok(strong.why.length >= 2);
assert.ok(strong.whyItems.some((i) => i.id === "slope-moderate"));
assert.ok(strong.whyItems.some((i) => i.id === "edge-near" && i.class === "EDITORIAL_HEURISTIC"));
assert.ok(strong.whyItems.some((i) => i.class === "PHYSICAL"));
assert.match(strong.hudText, /From YOU:/);
assert.match(strong.hudText, /From SEARCH:/);
assert.doesNotMatch(strong.hudText, /\bOBS\b/);
assertHonest(strong, "strong");

fs.writeFileSync(
  path.join(root, "reports/sheds-v3-2-field-intelligence/A_strong.txt"),
  strong.hudText + "\n"
);

// Direct Why helper is deterministic
const whyA = Intel.buildWhyLines({
  slopeDeg: 9.5,
  slopeKind: "ready",
  aspectKind: "ready",
  facing: "south-facing",
  solar: Intel.solarExposureNote(180, 41),
  habitatKind: "ready",
  edgeM: 40,
  elevReady: true,
  ftLabel: "1,420 ft"
});
const whyB = Intel.buildWhyLines({
  slopeDeg: 9.5,
  slopeKind: "ready",
  aspectKind: "ready",
  facing: "south-facing",
  solar: Intel.solarExposureNote(180, 41),
  habitatKind: "ready",
  edgeM: 40,
  elevReady: true,
  ftLabel: "1,420 ft"
});
assert.deepEqual(whyA, whyB);
assert.equal(whyA.map((i) => i.text).join("|"), whyB.map((i) => i.text).join("|"));

// North-facing solar is physical, not bedding
const northReport = Intel.buildInspectReport({
  lat: 41.32,
  lng: -74.8,
  elevM: 400,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: northFace
});
assert.match(northReport.hudText, /less direct winter sun|may hold snow/i);
assert.doesNotMatch(northReport.hudText, /bedding|feeding area|deer trail|deer are here/i);
assertHonest(northReport, "north");

// Flat: slope why exists; no solar/aspect facing why
const flatReport = Intel.buildInspectReport({
  lat: 44.0,
  lng: -93.0,
  elevM: 300,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: flat
});
assert.equal(flatReport.terrain.aspectKind, "undefined");
assert.match(flatReport.hudText, /nearly flat/);
assert.match(flatReport.hudText, /generally easy to walk/);
assert.doesNotMatch(flatReport.hudText, /north-facing|south-facing/i);
assert.doesNotMatch(flatReport.hudText, /winter sun/);
assertHonest(flatReport, "flat");

// ——— Missing facts do not generate interpretations ———
const weak = Intel.buildInspectReport({
  lat: 40.0,
  lng: -105.0,
  elevStatus: "unavailable",
  terrainStatus: "unavailable",
  elevM: null,
  terrainDerived: null,
  gisSample: null
});
assert.equal(weak.noIntel, true);
assert.equal(weak.why.length, 0);
assert.doesNotMatch(weak.hudText, /Why this may matter/);
assert.doesNotMatch(weak.hudText, /walkable|winter sun|worth inspecting|land-cover edge is nearby/);
assert.match(weak.hudText, /isn't available for this location/);
assertHonest(weak, "no-data");

fs.writeFileSync(
  path.join(root, "reports/sheds-v3-2-field-intelligence/C_weak.txt"),
  weak.hudText + "\n"
);

const partial = Intel.buildInspectReport({
  lat: 41.0,
  lng: -74.0,
  elevM: 200,
  elevStatus: "ready",
  terrainStatus: "unavailable",
  gisSample: null
});
assert.equal(partial.coverage.id, "limited");
assert.match(partial.hudText, /Elevation: 656 ft/);
assert.match(partial.hudText, /Slope: unavailable/);
assert.match(partial.hudText, /Land cover: unavailable for this location/);
assert.doesNotMatch(partial.hudText, /walkable|winter sun|land-cover edge is nearby|worth inspecting/);
assert.match(partial.hudText, /geographic context only/);
assert.ok(partial.whyItems.length === 1 && partial.whyItems[0].id === "elev-context");
assertHonest(partial, "partial");

const failed = Intel.buildInspectReport({
  lat: 41.32,
  lng: -74.8,
  elevStatus: "failed",
  terrainStatus: "failed",
  elevM: null,
  terrainDerived: null,
  gisSample: null
});
assert.equal(failed.failedIntel, true);
assert.equal(failed.why.length, 0);
assert.doesNotMatch(failed.hudText, /Why this may matter/);
assert.doesNotMatch(failed.hudText, /walkable|1,420 ft|Forest cover/);
assert.match(failed.hudText, /couldn't be retrieved/);
assertHonest(failed, "failed");

// Pack slope, far edge, no aspect: slope why only — no solar, no nearby-edge
const packSlope = Intel.buildInspectReport({
  lat: 41.32,
  lng: -74.8,
  elevM: 400,
  elevStatus: "ready",
  terrainStatus: "failed",
  gisSample: {
    nlcd: 41,
    structure: "forest",
    structureLabel: "Forest cover",
    edgeM: 200,
    slopeDeg: 14,
    resolutionNote: "~30 m land-cover source"
  },
  packMeta: { nlcdYear: 2021 }
});
assert.match(packSlope.hudText, /Steeper terrain may slow walking/);
assert.doesNotMatch(packSlope.hudText, /south-facing|north-facing|winter sun/);
assert.doesNotMatch(packSlope.hudText, /land-cover edge is nearby/);
assert.match(packSlope.hudText, /Land-cover edge: 200 m/);
assertHonest(packSlope, "pack-slope");

const edgeZero = Intel.buildInspectReport({
  lat: 41.32,
  lng: -74.8,
  elevM: 400,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: southFace,
  gisSample: {
    nlcd: 41,
    structure: "forest",
    structureLabel: "Forest cover",
    edgeM: 0,
    slopeDeg: 8
  }
});
assert.match(edgeZero.hudText, /Land-cover edge: 0 m/);
assert.match(edgeZero.hudText, /land-cover edge is nearby \(~0 m\)/);
assertHonest(edgeZero, "edge-zero");

// Empty Why helper when no supported inputs
assert.equal(JSON.stringify(Intel.buildWhyLines({})), "[]");
assert.equal(
  JSON.stringify(
    Intel.buildWhyLines({
      slopeKind: "unavailable",
      aspectKind: "unavailable",
      habitatKind: "unavailable",
      elevReady: false
    })
  ),
  "[]"
);

// ——— Semantics YOU ≠ SEARCH ≠ INSPECT ≠ OBS ———
assert.match(Intel.LIMIT_NOT_OBS, /not an observation of wildlife/);

const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
const inspectBuilder = mapApp.slice(
  mapApp.indexOf("function buildCurrentInspectReport"),
  mapApp.indexOf("function renderInspectHud")
);
assert.match(mapApp, /INSPECT — location facts \(not YOU, not SEARCH, not OBS\)/);
assert.match(mapApp, /className: "sheds-inspect-marker"/);
assert.match(mapApp, /sheds-user-marker/);
assert.match(mapApp, /SEARCH — analysis center \(not YOU\)/);
assert.match(mapApp, /if \(state\.inspectArmed\)/);
assert.match(mapApp, /state\.inspectArmed = true/);
assert.match(mapApp, /revealInspectPoint/);
assert.match(mapApp, /inspectArmed \|\| state\.inspectLatLng/);
assert.match(mapApp, /btn-inspect-close[\s\S]{0,180}stopInspectMode/);
assert.doesNotMatch(inspectBuilder, /HabitatGis\.scorePoint/);
assert.doesNotMatch(inspectBuilder, /habitatScore/);

const html = read("apps/shed-hunting/map/index.html");
assert.match(html, /sheds-inspect-intel\.js/);
assert.match(html, /not a claim that deer or antlers are here/);
assert.match(html, /aria-label="Inspect location facts and context"/);
assert.match(html, /id="inspect-more"/);
assert.match(html, /Why this may matter and limits/);
assert.match(html, /id="inspect-hud"[^>]*hidden/);
assert.match(html, />YOU</);
assert.match(html, />SEARCH</);
assert.match(html, />OBS</);

const css = read("apps/shed-hunting/css/sheds-map.css");
assert.match(css, /max-height:\s*min\(38vh/);
assert.match(css, /sheds-inspect-hud__more/);
assert.match(css, /min-height:\s*2\.75rem/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /\.sheds-inspect-hud\[hidden\]/);
assert.match(css, /is-inspecting[\s\S]{0,180}#plan-card/);
assert.match(css, /is-inspecting[\s\S]{0,180}#search-prompt/);

const audit = read("reports/sheds-v3-2-field-intelligence/AUDIT.md");
assert.match(audit, /REAL DATA/);
const recovery = read("reports/sheds-v3-2-field-intelligence/RECOVERY.md");
assert.match(recovery, /d9eb6bb9/);
const factsNote = read("reports/sheds-v3-2-field-intelligence/FACTS.md");
assert.match(factsNote, /Open-Meteo/);
assert.match(factsNote, /NLCD/);
const explain = read("reports/sheds-v3-2-field-intelligence/EXPLAIN.md");
assert.match(explain, /Why this may matter/);
assert.match(explain, /deterministic/i);
assert.match(explain, /EDGE_NEAR_M|90 m/);
const fieldUx = read("reports/sheds-v3-2-field-intelligence/FIELD-UX.md");
assert.match(fieldUx, /stay in Inspect|Stay in Inspect/i);
assert.match(fieldUx, /progressive disclosure/i);
const fieldDoc = read("docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md");
assert.match(fieldDoc, /Why this may matter/);
assert.match(fieldDoc, /What is here/);

console.log("Sheds V3.2 Inspect Why tests passed.");
