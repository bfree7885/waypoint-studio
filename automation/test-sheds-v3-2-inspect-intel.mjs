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
assert.equal(Intel.VERSION, "3.2.0");

// ——— Slope / aspect derivation ———
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
const solar = Intel.solarExposureNote(southFace.aspectDeg, 41.3);
assert.match(solar.label || "", /south|South|sun/i);
assert.match(solar.note || "", /Northern Hemisphere|solar/i);
assert.doesNotMatch(solar.note || "", /deer are bedding|sheds are here/i);

const flatReport = Intel.buildInspectReport({
  lat: 44.0,
  lng: -93.0,
  elevM: 300,
  elevStatus: "ready",
  terrainDerived: flat
});
assert.equal(flatReport.terrain.aspectDeg, null, "flat terrain suppresses aspect");
assert.doesNotMatch(flatReport.hudText, /north-facing|south-facing/i);

// ——— Strong data report ———
const strong = Intel.buildInspectReport({
  lat: 41.32,
  lng: -74.8,
  elevM: 312,
  elevStatus: "ready",
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
assert.match(strong.coverage.label, /Strong supporting/i);
assert.match(strong.hudText, /Why this area may matter/i);
assert.match(strong.hudText, /Forest cover|habitat transition/i);
assert.match(strong.hudText, /Limits:/i);
assert.match(strong.hudText, /not a shed prediction/i);
assert.equal(strong.containsBannedLanguage, false);
assert.doesNotMatch(strong.hudText, /shed found|antler here|find probability/i);

// ——— Insufficient data ———
const weak = Intel.buildInspectReport({
  lat: 40.0,
  lng: -105.0,
  elevStatus: "unavailable",
  elevM: null,
  terrainDerived: null,
  gisSample: null,
  habitatScore: {
    unavailable: true,
    band: { id: "unavailable", label: "Habitat data unavailable for this area" }
  }
});
assert.equal(weak.coverage.id, "insufficient");
assert.match(weak.hudText, /Insufficient information|Habitat: unavailable/i);
assert.match(weak.hudText, /no GIS pack/i);
assert.equal(weak.containsBannedLanguage, false);

// ——— Partial elev only ———
const partial = Intel.buildInspectReport({
  lat: 41.0,
  lng: -74.0,
  elevM: 200,
  elevStatus: "ready",
  gisSample: null
});
assert.equal(partial.coverage.id, "limited");
assert.match(partial.hudText, /Limited habitat or terrain data/i);

// ——— Wiring present ———
const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
assert.match(mapApp, /WaypointShedsInspectIntel|InspectIntel/);
assert.match(mapApp, /fetchInspectTerrain/);
assert.match(mapApp, /buildCurrentInspectReport/);
assert.match(mapApp, /ensureGisPacks\(\)\.then/);

const html = read("apps/shed-hunting/map/index.html");
assert.match(html, /sheds-inspect-intel\.js/);
assert.match(html, /btn-inspect-close/);
assert.match(html, /Landscape context — not a shed prediction/);

const css = read("apps/shed-hunting/css/sheds-map.css");
assert.match(css, /sheds-inspect-hud__body/);
assert.match(css, /max-height:\s*min\(42vh/);

const audit = read("reports/sheds-v3-2-field-intelligence/AUDIT.md");
assert.match(audit, /Inspect Field Intelligence/);
assert.match(audit, /REAL DATA/);

console.log("Sheds V3.2 Inspect Intel tests passed.");
