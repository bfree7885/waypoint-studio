#!/usr/bin/env node
/**
 * Sheds RADAR P1 — continuous static base landscape tests.
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
const Base = sandbox.WaypointShedsRadarBaseLandscape;
const GisPack = sandbox.WaypointShedsGisPack;
const HabitatGis = sandbox.WaypointShedsHabitatGis;

assert.ok(Radar && Model && Base && GisPack, "modules load");

const pack = JSON.parse(
  fs.readFileSync(path.join(root, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json"), "utf8")
);
GisPack.sample(pack, (pack.bounds.north + pack.bounds.south) / 2, (pack.bounds.east + pack.bounds.west) / 2);

// A deterministic continuous base
const sampleForest = { structure: "forest", structureLabel: "Forest cover", nlcd: 41, edgeM: 0, slopeDeg: 7 };
const a1 = Base.scoreSample(sampleForest);
const a2 = Base.scoreSample(sampleForest);
assert.equal(JSON.stringify(a1), JSON.stringify(a2), "A deterministic");
assert.ok(a1.score != null && a1.score >= 0 && a1.score <= 1, "A unit score");

// Proof viewport (P0 lock)
const elevFix = JSON.parse(
  fs.readFileSync(path.join(root, "docs/sheds/samples/radar-p0/elev-fixture-pike-50x50.json"), "utf8")
);
const baseField = Radar.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: elevFix.rows,
  cols: elevFix.cols,
  cellSizeMApprox: 90,
  BaseLandscape: Base,
  GisPack,
});
assert.equal(baseField.ok, true, "B base without Search Area");
assert.ok(baseField.field.scoredCount > 0, "B scored");

const scores = baseField.field.cells.filter((c) => !c.outsideArea).map((c) => c.landscapeScore);
const unique = new Set(scores.map((s) => Math.round(s * 10000) / 10000));
assert.ok(unique.size > 3, "I continuous >3 useful values: " + unique.size);

// C observations/history excluded — scoreSample ignores extra fields
const withObs = Base.scorePoint({
  sample: sampleForest,
  observations: [{ type: "shed_found", lat: 41.3, lng: -74.78 }],
  huntRecords: [{ id: 1 }],
  aspectCardinal: "S",
  featureKind: "bench",
  sgl: true,
  ownership: "public",
  roads: true,
});
assert.equal(withObs.score, a1.score, "C personal/access/aspect ignored");

// D access/public land — source inspection
const src = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-base-landscape.js"), "utf8");
assert.ok(!/State Game Land|sglScore|ownershipScore|publicLand/.test(src), "D no access scoring");
assert.ok(/Intentionally ignore/.test(src), "D documents exclusions");

// E water suppression
const water = Base.scoreSample({ structure: "water", nlcd: 11, edgeM: 0, slopeDeg: 1 });
assert.equal(water.score, 0, "E water ~0");
assert.equal(water.flags.water, true);
assert.ok(/not treated as searchable ground/i.test(water.factors.map((f) => f.detail).join(" ")));

// F developed suppression + no edge boost
const dev = Base.scoreSample({ structure: "developed", nlcd: 24, edgeM: 0, slopeDeg: 5 });
assert.ok(dev.score < 0.2, "F developed suppressed");
assert.equal(dev.components.transition, 0, "L developed no edge boost");
const devLow = Base.scoreSample({ structure: "developed", nlcd: 21, edgeM: 0, slopeDeg: 5 });
assert.ok(devLow.score > dev.score, "F 21 less extreme than 24");

const waterEdge = Base.scoreSample({ structure: "water", nlcd: 11, edgeM: 0, slopeDeg: 5 });
assert.equal(waterEdge.components.transition, 0, "L water no edge boost");

// G missing slope ≠ forced low
const noSlope = Base.scoreSample({ structure: "forest", nlcd: 41, edgeM: 45, slopeDeg: null });
const withSlope = Base.scoreSample({ structure: "forest", nlcd: 41, edgeM: 45, slopeDeg: 7 });
assert.equal(noSlope.status, "partial");
assert.ok(noSlope.score != null && noSlope.score > 0.3, "G missing slope not low");
assert.ok(noSlope.flags.missingSlope);
assert.equal(noSlope.confidence.terrain, "limited");
// land-only should equal landCombined
assert.equal(noSlope.score, noSlope.components.landCombined);

// H weather does not alter static base
const baseA = Radar.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: 20,
  cols: 20,
  cellSizeMApprox: 90,
  BaseLandscape: Base,
  GisPack,
});
const snap1 = JSON.stringify(baseA.field.cells.map((c) => c.landscapeScore));
const paintedA = Radar.applyFrame(baseA.field, "A", { Model });
const paintedB = Radar.applyFrame(baseA.field, "B", { Model });
assert.equal(
  JSON.stringify(baseA.field.cells.map((c) => c.landscapeScore)),
  snap1,
  "H base unchanged after frames"
);
assert.equal(paintedA.baseKey, paintedB.baseKey, "H same baseKey");

// K transition only on searchable
const forestEdge = Base.scoreSample({ structure: "forest", nlcd: 41, edgeM: 0, slopeDeg: 6 });
assert.ok(forestEdge.components.transition > 0, "K searchable gets transition");
assert.ok(forestEdge.flags.transitionApplied);

// M/N aspect + featureKind absent from static score computation
assert.ok(!("aspect" in (forestEdge.components || {})), "M no aspect component");
assert.ok(!Object.prototype.hasOwnProperty.call(forestEdge.inputs || {}, "aspectCardinal"), "M no aspect input");
assert.ok(!Object.prototype.hasOwnProperty.call(forestEdge.inputs || {}, "featureKind"), "N no featureKind input");
const tainted = Base.scorePoint({
  sample: sampleForest,
  aspectCardinal: "S",
  featureKind: "bench",
});
assert.equal(tainted.score, a1.score, "M/N aspect/featureKind do not change score");

// O tap factors from P1 components
const staticPaint = Radar.paintStaticBase(baseField.field);
const cell = staticPaint.grid.cells.find((c) => !c.outsideArea && c.structure === "forest");
assert.ok(cell && cell.factors.length, "O factors");
assert.ok(cell.factors.some((f) => f.id === "land_cover" || f.id === "relative_landscape"));
assert.ok(!/deer prefer|sheds likely|shed probability|best chance/i.test(JSON.stringify(cell.factors)));

// P unsupported ≠ zero
const unsupported = Base.scoreSample(null);
assert.equal(unsupported.status, "unsupported");
assert.equal(unsupported.score, null, "P null not zero");
assert.equal(unsupported.flags.unsupported, true);

// J Pike distribution
function pctile(arr, p) {
  const a = [...arr].sort((x, y) => x - y);
  const i = (a.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return a[lo] + (a[hi] - a[lo]) * (i - lo);
}
function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function stdev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - m) ** 2)));
}
const dist = {
  n: scores.length,
  min: Math.min(...scores),
  max: Math.max(...scores),
  mean: mean(scores),
  p10: pctile(scores, 0.1),
  p25: pctile(scores, 0.25),
  median: pctile(scores, 0.5),
  p75: pctile(scores, 0.75),
  p90: pctile(scores, 0.9),
  stdev: stdev(scores),
  unique: unique.size,
};
const labels = { Lower: 0, Moderate: 0, Stronger: 0 };
for (const s of scores) labels[Base.displayLabel(s)] += 1;
const strongerFrac = labels.Stronger / scores.length;
assert.ok(strongerFrac < 0.67, "J not ~67% identical top band: " + strongerFrac);
assert.ok(labels.Lower > 0 && labels.Moderate >= 0, "J has lower interest cells");

// Spatial clustering of high cells
let high = 0;
let highNeigh = 0;
let neighN = 0;
const grid = baseField.field.cells;
const rows = baseField.field.rows;
const cols = baseField.field.cols;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const v = grid[i].landscapeScore;
    if (v == null || v < 0.62) continue;
    high++;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
      const nv = grid[rr * cols + cc].landscapeScore;
      if (nv == null) continue;
      neighN++;
      if (nv >= 0.62) highNeigh++;
    }
  }
}
assert.ok(high > 0 && neighN > 0 && highNeigh / neighN > 0.6, "J coherent clustering");

// Q Search Areas still work (HabitatGis path intact)
assert.ok(typeof HabitatGis.buildSearchGrid === "function", "Q HabitatGis grid API");
assert.ok(typeof HabitatGis.scorePoint === "function", "Q HabitatGis scorePoint");

// R Hunt Mode / map wiring untouched for Search Areas
const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert.ok(mapApp.includes("setSearchAreasVisible"), "R Search Areas");
assert.ok(mapApp.includes("enterFieldHuntMode") || mapApp.includes("fieldHunting"), "R hunt mode refs");

// S Frame A/B spatial change on P1 base
const enriched = Radar.enrichWithTerrain(baseField.field, elevFix.elevations, {
  SearchPriority: sandbox.WaypointShedsSearchPriority,
  zoom: 13,
});
assert.equal(enriched.field.terrainEnriched, true, "S terrain enrich");
const fa = Radar.applyFrame(enriched.field, "A", { Model });
const fb = Radar.applyFrame(enriched.field, "B", { Model });
const diff = Radar.diffFrames(fa.grid, fb.grid);
assert.ok(diff.changed > 0, "S changed > 0");
assert.ok(diff.unchanged > 0, "S unchanged > 0");
assert.equal(diff.uniformBoost, false, "S no uniform boost");
assert.ok(diff.solarGained > 0, "S solar gained");

// T no elev refetch on frame — applyFrame pure
const key = enriched.field.key;
Radar.applyFrame(enriched.field, "A", { Model });
Radar.applyFrame(enriched.field, "B", { Model });
assert.equal(enriched.field.key, key, "T base key stable");

// Continuous unit-scale condition path
const south = enriched.field.cells.find(
  (c) => !c.outsideArea && (c.aspectCardinal === "S" || c.aspectCardinal === "SE" || c.aspectCardinal === "SW")
);
assert.ok(south, "southish cell exists");
const evB = Model.evaluateCell({
  cell: {
    landscapeScore: south.landscapeScore,
    landscapeLabel: south.landscapeLabel,
    slopeDeg: south.slopeDeg,
    aspectCardinal: south.aspectCardinal,
    featureKind: south.featureKind,
  },
  conditions: Radar.FRAMES.B.conditions,
});
assert.equal(evB.scoreScale, "unit");
assert.ok(evB.modifiers.some((m) => m.id === "solar_searchability"));
assert.ok(Math.abs(evB.modifiers.find((m) => m.id === "solar_searchability").delta - 0.2) < 1e-9);
assert.ok(evB.score <= 1 && evB.score >= 0);

// Sanity samples A–H
const samples = {
  A_forest_interior: null,
  B_transition: null,
  C_agriculture: null,
  D_developed: null,
  E_water: null,
  F_moderate_slope: null,
  G_steep_slope: null,
  H_missing_slope: Base.scoreSample({ structure: "forest", nlcd: 41, edgeM: 90, slopeDeg: null }),
};
for (const c of baseField.field.cells) {
  if (c.outsideArea || !c.landscape) continue;
  const L = c.landscape;
  if (!samples.A_forest_interior && c.structure === "forest" && c.edgeM > 90) samples.A_forest_interior = L;
  if (!samples.B_transition && c.structure === "forest" && c.edgeM === 0) samples.B_transition = L;
  if (!samples.C_agriculture && c.structure === "agriculture") samples.C_agriculture = L;
  if (!samples.D_developed && c.structure === "developed") samples.D_developed = L;
  if (!samples.E_water && c.structure === "water") samples.E_water = L;
  if (!samples.F_moderate_slope && c.slopeDeg >= 2 && c.slopeDeg < 12 && c.structure === "forest")
    samples.F_moderate_slope = L;
  if (!samples.G_steep_slope && c.slopeDeg >= 25) samples.G_steep_slope = L;
}
assert.ok(samples.E_water && samples.E_water.score === 0, "sanity water");
assert.ok(samples.D_developed && samples.D_developed.score < 0.25, "sanity developed");
assert.ok(samples.B_transition && samples.B_transition.components.transition > 0, "sanity transition");
if (samples.A_forest_interior && samples.B_transition) {
  assert.ok(
    samples.B_transition.score >= samples.A_forest_interior.score - 0.05,
    "transition not colder than interior (approx)"
  );
}
assert.ok(samples.H_missing_slope.score != null && samples.H_missing_slope.score > 0.3, "sanity missing slope");

const outDir = path.join(root, "docs/sheds/samples/radar-p1");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  viewport: elevFix.bounds,
  center: { lat: 41.3091, lng: -74.7835, zoom: 13 },
  dims: { rows: elevFix.rows, cols: elevFix.cols },
  distribution: dist,
  displayLabels: labels,
  displayFrac: {
    Lower: labels.Lower / scores.length,
    Moderate: labels.Moderate / scores.length,
    Stronger: labels.Stronger / scores.length,
  },
  clustering: { high, neighborHighFrac: highNeigh / neighN },
  frameDiff: diff,
  constants: {
    W_LAND: Base.W_LAND,
    W_SLOPE: Base.W_SLOPE,
    TRANSITION_MAX_BOOST: Base.TRANSITION_MAX_BOOST,
    COVER_BASE: Base.COVER_BASE,
    DEVELOPED_NLCD: Base.DEVELOPED_NLCD,
    SLOPE_CONTEXT: Base.SLOPE_CONTEXT,
  },
  parameterAdjustments: [],
  sanity: Object.fromEntries(
    Object.entries(samples).map(([k, v]) => [
      k,
      v
        ? {
            score: v.score,
            status: v.status,
            components: v.components,
            inputs: v.inputs,
            displayLabel: v.displayLabel,
            factors: v.factors,
          }
        : null,
    ])
  ),
};
fs.writeFileSync(path.join(outDir, "distribution-report.json"), JSON.stringify(report, null, 2));

console.log("RADAR P1 tests PASS");
console.log(JSON.stringify({ distribution: dist, displayFrac: report.displayFrac, frameDiff: diff }, null, 2));
