#!/usr/bin/env node
/**
 * Sheds V3.2 — Inspect Field Intelligence truth + explainability.
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
assert.equal(Intel.VERSION, "3.2.1");

// ——— Elevation / slope / aspect truth ———
assert.equal(Intel.formatElevationFt(432.8), "1,420 ft");
assert.equal(Intel.slopeClassLabel(0.4), "nearly flat");
assert.equal(Intel.slopeClassLabel(9.5), "moderate slope");
assert.equal(Intel.slopeClassLabel(18), "steeper slope");
assert.equal(Intel.slopeClassLabel(30), "steep terrain");
assert.equal(Intel.aspectFacingPhrase("SW"), "southwest-facing");

const flat = Intel.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 100,
  southM: 100,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert.ok(flat.slopeDeg != null && flat.slopeDeg < 0.5, "flat slope near 0");

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

const flatReport = Intel.buildInspectReport({
  lat: 44.0,
  lng: -93.0,
  elevM: 300,
  elevStatus: "ready",
  terrainStatus: "ready",
  terrainDerived: flat
});
assert.equal(flatReport.terrain.aspectDeg, null, "flat terrain suppresses aspect");
assert.doesNotMatch(flatReport.hudText, /north-facing|south-facing/i);
assert.match(flatReport.hudText, /Terrain/);
assert.match(flatReport.hudText, /984 ft|nearly flat/);

// ——— Strong data report (FACT / INTERPRETATION / LIMITATION) ———
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
  habitatScore: {
    unavailable: false,
    band: { id: "stronger", label: "Stronger habitat signal" },
    limitations: ["Landscape structure does not mean an antler is present."]
  },
  packMeta: { nlcdYear: 2021 },
  fromYou: "From YOU: 120 yd · NE 45°",
  fromSearch: "From SEARCH: 40 yd · N 10°"
});
assert.equal(strong.coverage.id, "strong");
assert.match(strong.hudText, /Terrain/);
assert.match(strong.hudText, /1,420 ft/);
assert.match(strong.hudText, /moderate slope/);
assert.match(strong.hudText, /south-facing/);
assert.match(strong.hudText, /Habitat/);
assert.match(strong.hudText, /Forest cover near a habitat transition/);
assert.match(strong.hudText, /southeast-facing terrain receives|south-facing terrain receives/i);
assert.match(strong.hudText, /Why this may matter/i);
assert.match(strong.hudText, /solar exposure|walkable|habitat transition/i);
assert.match(strong.hudText, /Limits/);
assert.match(strong.hudText, /does not indicate that deer or shed antlers are present/i);
assert.equal(strong.containsBannedLanguage, false);
assert.equal(strong.containsWildlifeInference, false);
assert.doesNotMatch(strong.hudText, /shed found|antler here|find probability|deer are here|bedding area|feeding area|deer trail/i);
assert.doesNotMatch(strong.hudText, /Search potential band/i);
assert.match(strong.hudText, /From YOU:/);
assert.match(strong.hudText, /From SEARCH:/);
assert.ok(strong.facts.length >= 2, "facts include terrain + habitat");
assert.ok(strong.why.length >= 1, "interpretation present");
assert.ok(strong.limits.length >= 2, "limits present");
assert.equal(strong.class.why, "INTERPRETATION");
assert.equal(strong.class.limits, "LIMITATION");
assert.equal(strong.class.elev, "REAL");

// ——— No-data / insufficient ———
const weak = Intel.buildInspectReport({
  lat: 40.0,
  lng: -105.0,
  elevStatus: "unavailable",
  terrainStatus: "unavailable",
  elevM: null,
  terrainDerived: null,
  gisSample: null,
  habitatScore: {
    unavailable: true,
    band: { id: "unavailable", label: "Habitat data unavailable for this area" }
  }
});
assert.equal(weak.coverage.id, "insufficient");
assert.equal(weak.noIntel, true);
assert.match(weak.hudText, /Detailed terrain\/habitat information isn't available for this location/);
assert.match(weak.hudText, /Limits/);
assert.doesNotMatch(weak.hudText, /Why this may matter/i);
assert.equal(weak.containsBannedLanguage, false);
assert.equal(weak.containsWildlifeInference, false);

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
assert.match(partial.hudText, /Terrain/);
assert.match(partial.hudText, /656 ft/);
assert.match(partial.hudText, /Habitat/);
assert.match(partial.hudText, /Detailed habitat information isn't available/);
assert.doesNotMatch(partial.hudText, /south-facing|north-facing/);
assert.doesNotMatch(partial.hudText, /1,420 ft/);

// ——— Failed-data (no invented numbers) ———
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
assert.match(failed.hudText, /couldn't be retrieved/);
assert.doesNotMatch(failed.hudText, /ft ·|moderate slope|Forest cover/);
assert.doesNotMatch(failed.hudText, /Why this may matter/i);
assert.match(failed.hudText, /Limits/);
assert.equal(failed.containsBannedLanguage, false);

// Inspect still works with coords even when intelligence fails
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
assert.doesNotMatch(packSlope.hudText, /south-facing|north-facing/);
assert.match(packSlope.limits.join(" "), /Aspect is unavailable/);

// ——— Wiring present ———
const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
assert.match(mapApp, /WaypointShedsInspectIntel|InspectIntel/);
assert.match(mapApp, /fetchInspectTerrain/);
assert.match(mapApp, /buildCurrentInspectReport/);
assert.match(mapApp, /ensureGisPacks\(\)\.then/);
assert.match(mapApp, /terrainStatus:\s*state\.inspectTerrainStatus/);
assert.match(mapApp, /inspectElevStatus = "failed"/);
assert.match(mapApp, /inspectTerrainStatus = "failed"/);
assert.match(mapApp, /btn-inspect-close[\s\S]{0,180}stopInspectMode/);
assert.match(mapApp, /INSPECT — landscape context \(not YOU, not OBS\)/);
assert.match(mapApp, /className: "sheds-inspect-marker"/);
assert.match(mapApp, /sheds-user-marker/);
assert.match(mapApp, /SEARCH — analysis center \(not YOU\)/);
assert.match(mapApp, /if \(state\.inspectArmed\)/);
assert.match(mapApp, /window\.__SHEDS_MAP__/);

const html = read("apps/shed-hunting/map/index.html");
assert.match(html, /sheds-inspect-intel\.js/);
assert.match(html, /btn-inspect-close/);
assert.match(html, /not a claim that deer or antlers are here/);
assert.match(html, /id="inspect-hud"[^>]*hidden/);
assert.match(html, /map-marker-legend/);
assert.match(html, />YOU</);
assert.match(html, />SEARCH</);

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

console.log("Sheds V3.2 Inspect Intel tests passed.");
