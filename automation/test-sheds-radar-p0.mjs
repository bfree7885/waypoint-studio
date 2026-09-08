#!/usr/bin/env node
/**
 * Sheds RADAR P0 — viewport relative-search-interest surface tests.
 * Controlled fixtures; no live elevation/weather required for core assertions.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    globalThis: {},
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  for (const rel of files) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `missing ${rel}`);
    vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: rel });
  }
  return sandbox;
}

const sandbox = loadScripts([
  "apps/shed-hunting/js/sheds-habitat-gis.js",
  "apps/shed-hunting/js/sheds-gis-pack.js",
  "apps/shed-hunting/js/sheds-radar-base-landscape.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-search-priority-today.js",
  "apps/shed-hunting/js/sheds-search-priority-today-map.js",
  "apps/shed-hunting/js/sheds-radar-p0.js",
]);

const Radar = sandbox.WaypointShedsRadarP0;
const Model = sandbox.WaypointShedsSearchPriorityToday;
const HabitatGis = sandbox.WaypointShedsHabitatGis;
const BaseLandscape = sandbox.WaypointShedsRadarBaseLandscape;
const GisPack = sandbox.WaypointShedsGisPack;
const Adapter = sandbox.WaypointShedsSearchPriorityTodayMap;

assert.ok(Radar && Model && HabitatGis && BaseLandscape && GisPack, "core modules must load");

const packPath = path.join(root, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json");
assert.ok(fs.existsSync(packPath), "Pike pack must exist");
const pack = GisPack.inflate
  ? GisPack.inflate(JSON.parse(fs.readFileSync(packPath, "utf8")))
  : (() => {
      const p = JSON.parse(fs.readFileSync(packPath, "utf8"));
      // inflate via sample path
      GisPack.sample(p, (p.bounds.north + p.bounds.south) / 2, (p.bounds.east + p.bounds.west) / 2);
      return p;
    })();

const center = Radar.packDemoCenter(pack);
assert.ok(center, "demo center");

// A. Radar field can compute with NO Search Area
const mapBounds = {
  west: center.lng - 0.02,
  east: center.lng + 0.02,
  south: center.lat - 0.015,
  north: center.lat + 0.015,
};
const win = Radar.viewportAnalysisBounds(mapBounds, pack.bounds);
assert.equal(win.ok, true, "A viewport intersects pack");
const dims = Radar.dimsForBounds(win.bounds);
assert.ok(dims.rows * dims.cols <= Radar.MAX_CELLS, "bounded cells");
assert.ok(dims.cellSizeMApprox > 60 && dims.cellSizeMApprox < 130, "≈90 m class resolution");

const base1 = Radar.buildBaseField({
  pack,
  bounds: win.bounds,
  rows: dims.rows,
  cols: dims.cols,
  cellSizeMApprox: dims.cellSizeMApprox,
  BaseLandscape,
  GisPack,
});
assert.equal(base1.ok, true, "A base field without Search Area");
assert.ok(base1.field.scoredCount > 0, "A scored cells exist");

// B. Deterministic base field
const base2 = Radar.buildBaseField({
  pack,
  bounds: win.bounds,
  rows: dims.rows,
  cols: dims.cols,
  cellSizeMApprox: dims.cellSizeMApprox,
  BaseLandscape,
  GisPack,
});
assert.equal(base1.field.key, base2.field.key, "B same cache key");
assert.equal(
  JSON.stringify(base1.field.cells.map((c) => [c.landscapeScore, c.slopeDeg, c.baseScore])),
  JSON.stringify(base2.field.cells.map((c) => [c.landscapeScore, c.slopeDeg, c.baseScore])),
  "B deterministic base"
);

// Enrich with synthetic elevation halo so aspect exists (no network).
const rows = dims.rows;
const cols = dims.cols;
const haloRows = rows + 2;
const haloCols = cols + 2;
const elev = [];
for (let r = 0; r < haloRows; r++) {
  for (let c = 0; c < haloCols; c++) {
    // South-facing slope: higher elevation to the north
    elev.push(400 + (haloRows - r) * 4 + c * 0.2);
  }
}
const enriched = Radar.enrichWithTerrain(base1.field, elev, {
  SearchPriority: sandbox.WaypointShedsSearchPriority,
  zoom: 13,
});
assert.equal(enriched.ok, true, "terrain enrich ok");
assert.equal(enriched.field.terrainEnriched, true, "terrain enriched flag");

const southish = enriched.field.cells.filter(
  (c) => c.aspectCardinal === "S" || c.aspectCardinal === "SE" || c.aspectCardinal === "SW"
);
assert.ok(southish.length > 0, "G synthetic elev yields some southish cells");

// C/D/E/F/G/H — frames
const paintedA = Radar.applyFrame(enriched.field, "A", { Model });
const paintedB = Radar.applyFrame(enriched.field, "B", { Model });
assert.equal(paintedA.ok, true, "Frame A paints");
assert.equal(paintedB.ok, true, "Frame B paints");
assert.equal(paintedA.grid.bounds.west, paintedB.grid.bounds.west, "C same geography W");
assert.equal(paintedA.grid.rows, paintedB.grid.rows, "C same rows");
assert.equal(paintedA.grid.cols, paintedB.grid.cols, "C same cols");
assert.equal(paintedA.grid.renderMode, "radar-interest", "I radar renderMode");
assert.equal(paintedA.grid.smoothDisplay, true, "I smoothDisplay flag");

const diff = Radar.diffFrames(paintedA.grid, paintedB.grid);
assert.ok(diff.changed > 0, "D some cells change across frames");
assert.ok(diff.unchanged > 0, "E some cells unchanged");
assert.equal(diff.uniformBoost, false, "F no uniform whole-map boost");
assert.ok(diff.solarGained > 0, "G solar_searchability gained on thaw frame");

// H missing aspect does not receive solar
const noAspectCell = {
  id: "x",
  gisBand: "some",
  slopeDeg: 8,
  aspectCardinal: null,
  featureKind: "gentle",
};
const evNoAspect = Model.evaluateCell({
  cell: noAspectCell,
  conditions: Radar.FRAMES.B.conditions,
});
assert.ok(
  !(evNoAspect.modifiers || []).some((m) => m.id === "solar_searchability"),
  "H no solar without aspect"
);
const southCell = {
  id: "s",
  gisBand: "some",
  slopeDeg: 8,
  aspectCardinal: "S",
  featureKind: "transition",
};
const evSouth = Model.evaluateCell({
  cell: southCell,
  conditions: Radar.FRAMES.B.conditions,
});
assert.ok(
  (evSouth.modifiers || []).some((m) => m.id === "solar_searchability"),
  "G south cell gets solar on Frame B"
);
const evSouthCold = Model.evaluateCell({
  cell: southCell,
  conditions: Radar.FRAMES.A.conditions,
});
assert.ok(
  !(evSouthCold.modifiers || []).some((m) => m.id === "solar_searchability"),
  "G south cell no solar on Frame A"
);

// I heat layer uses continuous radar path (source inspection)
const heatSrc = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-heat-layer.js"), "utf8");
assert.ok(heatSrc.includes('_isRadarMode'), "I radar mode helper");
assert.ok(heatSrc.includes("_paintContinuousPriority"), "I continuous paint");
assert.ok(heatSrc.includes('renderMode === "radar-interest"'), "I radar-interest mode");
assert.ok(
  /if \(radar\)[\s\S]*_paintContinuousPriority[\s\S]*return;/.test(heatSrc),
  "I radar path returns before square bands"
);

// J/K frame switch reuses base — applyFrame does not touch elev
const keyBefore = enriched.field.key;
const paintedB2 = Radar.applyFrame(enriched.field, "B", { Model });
assert.equal(enriched.field.key, keyBefore, "J base key unchanged by frame apply");
assert.equal(paintedB2.baseKey, keyBefore, "J paint reports same baseKey");
assert.equal(
  JSON.stringify(paintedB.grid.cells.map((c) => c.score)),
  JSON.stringify(paintedB2.grid.cells.map((c) => c.score)),
  "J deterministic frame B"
);

// L outside pack honest
const outside = Radar.viewportAnalysisBounds(
  { west: -80, east: -79.9, south: 40, north: 40.1 },
  pack.bounds
);
assert.equal(outside.ok, false, "L outside pack rejected");
assert.equal(outside.reason, "outside_pack", "L outside reason");

const emptyOutside = Radar.emptyRadarGrid("Outside Pike pack AOI — no land-cover radar fabricated.");
assert.equal(emptyOutside.grid.unavailable, true, "L empty unavailable");
assert.equal(emptyOutside.grid.renderMode, "radar-interest", "L still radar mode");

// M Search Areas still present in map wiring (not deleted)
const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert.ok(mapApp.includes("setSearchAreasVisible"), "M Search Areas API remains");
assert.ok(mapApp.includes("scheduleSearchAreas"), "M Search Areas schedule remains");
assert.ok(mapApp.includes("state.radarP0Enabled"), "M radar gated separately");
assert.ok(mapApp.includes("fetchRadarElevations"), "K dedicated radar elev fetch");
assert.ok(mapApp.includes("BaseLandscape"), "M map uses P1 BaseLandscape for radar base");
assert.ok(mapApp.includes("WaypointShedsRadarBaseLandscape"), "M BaseLandscape global");
assert.ok(
  /setRadarP0Frame[\s\S]*radarBaseCache[\s\S]*applyFrame/.test(mapApp),
  "J/K frame switch uses applyFrame on cached base"
);
assert.ok(
  /elevNote: "Condition frame switched · base landscape \+ elevation cache reused/.test(mapApp),
  "K frame switch documents no elev refetch"
);

// N Phase 1 model unchanged — fixture from Phase 1 suite
const phase1South = Model.evaluateCell({
  cell: {
    terrainPriority: "Moderate",
    aspectCardinal: "S",
    slopeDeg: 9,
    featureKind: "transition",
  },
  conditions: {
    freezeThawStatus: "freeze_thaw",
    tempTrendStatus: "warming",
    snowCoverStatus: "light",
    seasonCategory: "late_winter",
  },
});
assert.equal(phase1South.status, "ready");
assert.ok(phase1South.modifiers.some((m) => m.id === "solar_searchability"));
assert.equal(Model.VERSION, "2.0.0-phase1", "N Phase 1 version unchanged");

// O no request/repaint loop markers — interestEnrichAppliedKey still present; radar uses gen guards
assert.ok(mapApp.includes("if (gen !== state.recomputeGen) return"), "O gen guards");
assert.ok(mapApp.includes("radarElevFetchGen"), "O elev fetch gen");
assert.ok(Adapter && typeof Adapter.buildInterestGrid === "function", "N adapter intact");

// Score mapping documentation sanity
assert.equal(Radar.GIS_BASE.stronger, 2);
assert.equal(Radar.GIS_BASE.some, 1);
assert.equal(Radar.GIS_BASE.limited, 0);

// Explainability
const explain = Radar.explainAt(paintedB.grid, {
  lat: paintedB.grid.cells.find((c) => !c.outsideArea).lat,
  lng: paintedB.grid.cells.find((c) => !c.outsideArea).lng,
});
assert.ok(explain && explain.factors.length, "explain factors present");
assert.ok(!/shed probability|find probability|hotspot/i.test(JSON.stringify(explain)));

// HTML + script wiring
const mapHtml = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
assert.ok(mapHtml.includes("sheds-radar-p0.js"), "script tag present");
assert.ok(mapHtml.includes("sheds-radar-base-landscape.js"), "P1 base scorer script present");
assert.ok(mapHtml.includes("btn-radar-frame-a"), "frame A control");
assert.ok(mapHtml.includes("btn-radar-frame-b"), "frame B control");
assert.ok(mapHtml.includes("Relative Search Interest"), "honest product language");
assert.ok(!/Shed Radar/.test(mapHtml.replace(/Radar P0/g, "")), "no production Shed Radar rename");

// Real DEM fixture (Open-Meteo samples for locked Pike viewport) — enrichment-ready proof
const elevFixturePath = path.join(
  root,
  "docs/sheds/samples/radar-p0/elev-fixture-pike-50x50.json"
);
assert.ok(fs.existsSync(elevFixturePath), "elev fixture present for acceptance");
const elevFix = JSON.parse(fs.readFileSync(elevFixturePath, "utf8"));
assert.equal(elevFix.rows, 50);
assert.equal(elevFix.cols, 50);
assert.equal(elevFix.elevations.length, (elevFix.rows + 2) * (elevFix.cols + 2));
const baseFix = Radar.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: elevFix.rows,
  cols: elevFix.cols,
  cellSizeMApprox: 90,
  BaseLandscape,
  GisPack,
});
assert.equal(baseFix.ok, true, "fixture viewport base field");
const enFix = Radar.enrichWithTerrain(baseFix.field, elevFix.elevations, {
  SearchPriority: sandbox.WaypointShedsSearchPriority,
  zoom: elevFix.zoom || 13,
});
assert.equal(enFix.field.terrainEnriched, true, "fixture terrain enriched");
const fixAspects = enFix.field.cells.filter((c) => c.aspectCardinal).length;
const fixSouth = enFix.field.cells.filter((c) =>
  c.aspectCardinal === "S" || c.aspectCardinal === "SE" || c.aspectCardinal === "SW"
).length;
assert.ok(fixAspects > 0, "fixture has aspect-bearing cells");
assert.ok(fixSouth > 0, "fixture has southish cells");
const fixA = Radar.applyFrame(enFix.field, "A", { Model });
const fixB = Radar.applyFrame(enFix.field, "B", { Model });
const fixDiff = Radar.diffFrames(fixA.grid, fixB.grid);
assert.ok(fixDiff.changed > 0, "fixture frames change some cells");
assert.ok(fixDiff.unchanged > 0, "fixture frames leave some cells unchanged");
assert.equal(fixDiff.uniformBoost, false, "fixture no uniform boost");
assert.ok(fixB.grid.stats.solarModifiers > 0, "fixture Frame B applies solar");
assert.equal(fixA.grid.stats.solarModifiers, 0, "fixture Frame A has no solar");

// Capture tooling + proof hooks present
const captureSrc = fs.readFileSync(
  path.join(root, "automation/capture-sheds-radar-p0-evidence.mjs"),
  "utf8"
);
assert.ok(captureSrc.includes("getProofStatus"), "capture waits on proof status");
assert.ok(captureSrc.includes("elev-fixture-pike-50x50.json"), "capture uses elev fixture");
assert.ok(mapApp.includes("getProofStatus"), "map exposes getProofStatus");
assert.ok(mapApp.includes("terrainEnriched"), "proof status includes terrainEnriched");
assert.ok(
  fs.existsSync(path.join(root, "docs/sheds/samples/radar-p0/proof-report.json")),
  "proof-report.json committed"
);
assert.ok(
  fs.existsSync(path.join(root, "docs/sheds/samples/radar-p0/browser-frame-diff-map.png")),
  "browser map-region diff evidence committed"
);
const proof = JSON.parse(
  fs.readFileSync(path.join(root, "docs/sheds/samples/radar-p0/proof-report.json"), "utf8")
);
assert.ok(proof.statusReady && proof.statusReady.elevKey, "proof elevKey non-empty");
assert.ok(proof.statusReady.terrainEnriched, "proof terrain enriched");
assert.ok(proof.statusReady.southish > 0, "proof southish > 0");
assert.ok(proof.diff && proof.diff.changed > 0 && proof.diff.unchanged > 0, "proof WHERE change");
assert.equal(proof.diff.uniformBoost, false, "proof not uniform");
assert.equal(proof.elevNetworkOnSwitch, 0, "proof no elev network on frame switch");
assert.ok(
  proof.heatFingerprintA &&
    proof.heatFingerprintB &&
    proof.heatFingerprintA.sum !== proof.heatFingerprintB.sum,
  "proof heat canvas fingerprint changed across frames"
);

console.log("RADAR P0 tests passed");
console.log(
  JSON.stringify(
    {
      cells: dims.rows * dims.cols,
      cellM: dims.cellSizeMApprox,
      scored: base1.field.scoredCount,
      southish: southish.length,
      diff,
      frameAReady: paintedA.grid.stats.ready,
      frameBReady: paintedB.grid.stats.ready,
      frameBSolar: paintedB.grid.stats.solarModifiers,
      fixtureDiff: fixDiff,
      fixtureSouthish: fixSouth,
      proofChanged: proof.diff.changed,
      proofUnchanged: proof.diff.unchanged,
    },
    null,
    2
  )
);
