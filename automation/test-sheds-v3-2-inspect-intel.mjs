#!/usr/bin/env node
/**
 * Sheds V3.2 — Inspect Facts: supported / partial / none / failed + semantics.
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
assert.equal(Intel.VERSION, "3.2.2");

const INTERPRETATION = /Why this may matter|generally walkable|may slow walking|solar exposure|may hold snow|worth inspecting|habitat signal|Search potential|suitability/i;
const WILDLIFE = /shed found|antler here|find probability|deer are here|deer present|bedding area|feeding area|deer trail|wildlife movement/i;

// ——— Elevation / slope / aspect truth ———
assert.equal(Intel.formatElevationFt(432.8), "1,420 ft");
assert.equal(Intel.formatElevationFt(0), "0 ft", "sea-level elevation is a value, not missing");
assert.equal(Intel.slopeClassLabel(0), "nearly flat");
assert.equal(Intel.slopeClassLabel(0.4), "nearly flat");
assert.equal(Intel.slopeClassLabel(9.5), "moderate slope");
assert.equal(Intel.slopeClassLabel(18), "steeper slope");
assert.equal(Intel.slopeClassLabel(30), "steep terrain");
assert.equal(Intel.aspectFacingPhrase("SW"), "southwest-facing");
assert.match(Intel.formatSlopeValue(0), /^0° \(nearly flat\)$/);

const flat = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 100,
  southM: 100,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert.ok(flat.slopeDeg != null && flat.slopeDeg < 0.5, "flat slope near 0");
assert.notEqual(flat.slopeDeg, null, "zero-ish slope is measured, not unavailable");

const southFace = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 110, // higher to the north → faces south
  southM: 90,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert.ok(southFace.slopeDeg > 5, "sloped terrain");
assert.ok(southFace.aspectDeg != null, "aspect present");
const southCard = Intel.aspectCardinal(southFace.aspectDeg);
assert.ok(["S", "SE", "SW"].includes(southCard), "south-ish aspect cardinal");
const solar = Intel.solarExposureNote(southFace.aspectDeg, 41.3);
assert.match(solar.label || "", /south|South|sun/i);
assert.match(solar.note || "", /Northern Hemisphere|solar/i);
assert.doesNotMatch(solar.note || "", /deer are bedding|sheds are here/i);

// ——— Supported facts (no interpretation in HUD) ———
const strong = Intel.buildInspectReport({
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
});
assert.equal(strong.factsOnly, true);
assert.equal(strong.coverage.id, "strong");
assert.match(strong.hudText, /Terrain/);
assert.match(strong.hudText, /Elevation: 1,420 ft/);
assert.match(strong.hudText, /Slope: /);
assert.match(strong.hudText, /moderate slope/);
assert.match(strong.hudText, /Aspect: south-facing/);
assert.match(strong.hudText, /Habitat/);
assert.match(strong.hudText, /Land cover: Forest cover/);
assert.match(strong.hudText, /Land-cover edge: 40 m/);
assert.match(strong.hudText, /Limits/);
assert.match(strong.hudText, /do not indicate that deer or shed antlers are present/i);
assert.match(strong.hudText, /Inspect is not an observation of wildlife/);
assert.doesNotMatch(strong.hudText, INTERPRETATION);
assert.doesNotMatch(strong.hudText, WILDLIFE);
assert.equal(strong.why.length, 0, "HUD report carries no interpretation bullets");
assert.equal(strong.habitat.bandLabel, null, "no suitability band on Inspect");
assert.equal(strong.habitat.score, null);
assert.equal(strong.containsBannedLanguage, false);
assert.equal(strong.containsWildlifeInference, false);
assert.equal(strong.containsInterpretation, false);
assert.match(strong.hudText, /From YOU:/);
assert.match(strong.hudText, /From SEARCH:/);
assert.ok(strong.facts.length >= 3, "facts include elevation, slope/aspect, land cover");
assert.ok(strong.limits.length >= 2, "limits present");
assert.equal(strong.class.why, "INTERPRETATION");
assert.equal(strong.class.limits, "LIMITATION");
assert.equal(strong.class.elev, "REAL");
assert.equal(strong.class.habitatClass, "REAL");

fs.writeFileSync(
  path.join(root, "reports/sheds-v3-2-field-intelligence/A_strong.txt"),
  strong.hudText + "\n"
);

// ——— Flat: zero slope is a value; aspect is undefined, not unavailable/north ———
const flatReport = Intel.buildInspectReport({
  lat: 44.0,
  lng: -93.0,
  elevM: 300,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: flat
});
assert.equal(flatReport.terrain.aspectDeg, null, "flat terrain suppresses aspect degrees");
assert.equal(flatReport.terrain.aspectKind, "undefined");
assert.match(flatReport.hudText, /Terrain/);
assert.match(flatReport.hudText, /Elevation: 984 ft/);
assert.match(flatReport.hudText, /Slope: /);
assert.match(flatReport.hudText, /nearly flat/);
assert.match(flatReport.hudText, /Aspect: not defined on nearly flat ground/);
assert.doesNotMatch(flatReport.hudText, /north-facing|south-facing/i);
assert.doesNotMatch(flatReport.hudText, /Aspect: unavailable/);
assert.doesNotMatch(flatReport.hudText, INTERPRETATION);

// Sea-level zero elevation must not look like missing data
const sea = Intel.buildInspectReport({
  lat: 29.3,
  lng: -94.8,
  elevM: 0,
  elevStatus: "ready",
  terrainStatus: "unavailable"
});
assert.match(sea.hudText, /Elevation: 0 ft/);
assert.doesNotMatch(sea.hudText, /Elevation: unavailable/);

// ——— No-data / insufficient (unavailable ≠ failed, ≠ zeros) ———
const weak = Intel.buildInspectReport({
  lat: 40.0,
  lng: -105.0,
  elevStatus: "unavailable",
  terrainStatus: "unavailable",
  elevM: null,
  terrainDerived: null,
  gisSample: null
});
assert.equal(weak.coverage.id, "insufficient");
assert.equal(weak.noIntel, true);
assert.equal(weak.failedIntel, false);
assert.match(weak.hudText, /Detailed terrain\/habitat information isn't available for this location/);
assert.match(weak.hudText, /Limits/);
assert.doesNotMatch(weak.hudText, INTERPRETATION);
assert.doesNotMatch(weak.hudText, /Elevation: 0|Slope: 0/);
assert.doesNotMatch(weak.hudText, /couldn't be retrieved/);
assert.equal(weak.containsBannedLanguage, false);
assert.equal(weak.containsWildlifeInference, false);

fs.writeFileSync(
  path.join(root, "reports/sheds-v3-2-field-intelligence/C_weak.txt"),
  weak.hudText + "\n"
);

// ——— Partial elev only ———
const partial = Intel.buildInspectReport({
  lat: 41.0,
  lng: -74.0,
  elevM: 200,
  elevStatus: "ready",
  terrainStatus: "unavailable",
  gisSample: null
});
assert.equal(partial.coverage.id, "limited");
assert.equal(partial.noIntel, false);
assert.match(partial.hudText, /Terrain/);
assert.match(partial.hudText, /Elevation: 656 ft/);
assert.match(partial.hudText, /Slope: unavailable/);
assert.match(partial.hudText, /Aspect: unavailable/);
assert.match(partial.hudText, /Habitat/);
assert.match(partial.hudText, /Land cover: unavailable for this location/);
assert.doesNotMatch(partial.hudText, /south-facing|north-facing/);
assert.doesNotMatch(partial.hudText, /1,420 ft/);
assert.doesNotMatch(partial.hudText, INTERPRETATION);
assert.doesNotMatch(partial.hudText, /Detailed terrain\/habitat information isn't available/);

// ——— Failed-data (no invented numbers; distinct from unavailable) ———
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
assert.equal(failed.noIntel, false);
assert.match(failed.hudText, /couldn't be retrieved/);
assert.doesNotMatch(failed.hudText, /isn't available for this location/);
assert.doesNotMatch(failed.hudText, /Elevation: 0|Forest cover|moderate slope/);
assert.doesNotMatch(failed.hudText, INTERPRETATION);
assert.match(failed.hudText, /Limits/);
assert.equal(failed.containsBannedLanguage, false);
assert.match(failed.hudText, /41\.32000, -74\.80000/);

// ——— GIS slope fallback without aspect (pack has slope, no neighborhood) ———
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
assert.equal(packSlope.terrain.slopeDeg, 14);
assert.equal(packSlope.terrain.aspectDeg, null);
assert.match(packSlope.hudText, /steeper slope/);
assert.match(packSlope.hudText, /Land-cover edge: 200 m/);
assert.doesNotMatch(packSlope.hudText, /south-facing|north-facing/);
assert.match(packSlope.limits.join(" "), /Aspect is unavailable/);
assert.doesNotMatch(packSlope.hudText, INTERPRETATION);

// Edge distance of 0 m is a measured value, not missing
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
assert.doesNotMatch(edgeZero.hudText, /Land-cover edge: unavailable/);

// ——— Inspect semantics: YOU ≠ SEARCH ≠ INSPECT ≠ OBS ———
assert.match(strong.hudText, /From YOU:/);
assert.match(strong.hudText, /From SEARCH:/);
assert.doesNotMatch(strong.hudText, /\bOBS\b/);
assert.match(Intel.LIMIT_NOT_OBS, /not an observation of wildlife/);

const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
const inspectBuilder = mapApp.slice(
  mapApp.indexOf("function buildCurrentInspectReport"),
  mapApp.indexOf("function renderInspectHud")
);
assert.match(mapApp, /WaypointShedsInspectIntel|InspectIntel/);
assert.match(mapApp, /fetchInspectTerrain/);
assert.match(mapApp, /buildCurrentInspectReport/);
assert.match(mapApp, /ensureGisPacks\(\)\.then/);
assert.match(mapApp, /terrainStatus:\s*state\.inspectTerrainStatus/);
assert.match(mapApp, /inspectElevStatus = "failed"/);
assert.match(mapApp, /inspectTerrainStatus = "failed"/);
assert.match(mapApp, /btn-inspect-close[\s\S]{0,180}stopInspectMode/);
assert.match(mapApp, /INSPECT — location facts \(not YOU, not SEARCH, not OBS\)/);
assert.match(mapApp, /className: "sheds-inspect-marker"/);
assert.match(mapApp, /sheds-user-marker/);
assert.match(mapApp, /SEARCH — analysis center \(not YOU\)/);
assert.match(mapApp, /if \(state\.inspectArmed\)/);
assert.match(mapApp, /window\.__SHEDS_MAP__/);
assert.match(mapApp, /className: "sheds-div-icon"/);
assert.doesNotMatch(inspectBuilder, /HabitatGis\.scorePoint/, "Inspect must not score habitat suitability");
assert.doesNotMatch(inspectBuilder, /habitatScore/, "Inspect wiring is facts-only");
assert.notEqual(
  mapApp.indexOf("sheds-inspect-marker"),
  mapApp.indexOf("sheds-user-marker")
);

const html = read("apps/shed-hunting/map/index.html");
assert.match(html, /sheds-inspect-intel\.js/);
assert.match(html, /btn-inspect-close/);
assert.match(html, /not a claim that deer or antlers are here/);
assert.match(html, /id="inspect-hud"[^>]*hidden/);
assert.match(html, /aria-label="Inspect location facts"/);
assert.match(html, /map-marker-legend/);
assert.match(html, />YOU</);
assert.match(html, />SEARCH</);
assert.match(html, />OBS</);
assert.doesNotMatch(html, /Why this may matter/);

const css = read("apps/shed-hunting/css/sheds-map.css");
assert.match(css, /sheds-inspect-hud__body/);
assert.match(css, /max-height:\s*min\(34vh/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /\.sheds-inspect-hud\[hidden\]/);

const audit = read("reports/sheds-v3-2-field-intelligence/AUDIT.md");
assert.match(audit, /Inspect Field Intelligence/);
assert.match(audit, /REAL DATA/);

const recovery = read("reports/sheds-v3-2-field-intelligence/RECOVERY.md");
assert.match(recovery, /HEAD at recovery/);
assert.match(recovery, /d9eb6bb9/);

const factsNote = read("reports/sheds-v3-2-field-intelligence/FACTS.md");
assert.match(factsNote, /facts only/i);
assert.match(factsNote, /Open-Meteo/);
assert.match(factsNote, /NLCD/);
assert.match(factsNote, /deferred/i);

const fieldDoc = read("docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md");
assert.match(fieldDoc, /facts only/i);
assert.doesNotMatch(fieldDoc, /HUD hierarchy: Terrain \/ Habitat \/ Why this may matter/);

console.log("Sheds V3.2 Inspect Facts tests passed.");
