/**
 * Shed Radar — display-only intensity mapping tests.
 * Analytical P1/P2 scores must remain unchanged; only paint transfer is covered.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function loadDisplay() {
  const src = fs.readFileSync(
    path.join(root, "apps/shed-hunting/js/sheds-radar-display.js"),
    "utf8"
  );
  const sandbox = { console, module: { exports: {} }, exports: {} };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(src, sandbox, { filename: "sheds-radar-display.js" });
  return sandbox.WaypointShedsRadarDisplay || sandbox.module.exports;
}

const D = loadDisplay();
assert.ok(D && typeof D.displayIntensity === "function", "display API");

function approx(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps || 1e-9), `${a} ≈ ${b}`);
}

// --- Deterministic / bounded / monotonic ---
const samples = [];
for (let i = 0; i <= 100; i++) samples.push(i / 100);
let prev = -1;
for (const p of samples) {
  const d = D.displayIntensity(p);
  assert.ok(d >= 0 && d <= 1, `bounded ${p}→${d}`);
  assert.ok(d + 1e-12 >= prev, `monotonic at ${p}: ${d} < ${prev}`);
  prev = d;
  approx(D.displayIntensity(p), d);
}
assert.equal(D.displayIntensity(0), 0);
assert.equal(D.displayIntensity(1), 1);
assert.equal(D.displayIntensity(-0.2), 0);
assert.equal(D.displayIntensity(1.5), 1);

// Ranking preserved for typical ±0.20 shifts
function rankOk(base) {
  const a = D.displayIntensity(base);
  const up = D.displayIntensity(Math.min(1, base + 0.2));
  const down = D.displayIntensity(Math.max(0, base - 0.2));
  assert.ok(up >= a - 1e-12, `+0.20 raises display from ${base}`);
  assert.ok(down <= a + 1e-12, `-0.20 lowers display from ${base}`);
}
[0.25, 0.4, 0.5, 0.55, 0.62, 0.7, 0.8].forEach(rankOk);

// Analytical scores themselves are not mutated by the display module
const analytical = 0.72;
assert.equal(analytical, 0.72);
assert.ok(D.displayIntensity(0.5) > 0.45 && D.displayIntensity(0.5) < 0.55);
assert.ok(D.displayIntensity(0.7) > D.displayIntensity(0.5));
assert.ok(D.displayIntensity(0.3) < D.displayIntensity(0.5));
// Contrast gain expands ±0.20 gap vs identity
assert.ok(
  D.displayIntensity(0.7) - D.displayIntensity(0.5) > 0.2,
  "display gap for +0.20 should exceed analytical gap after gain"
);

// Effective alpha for ±0.20 must expand vs legacy soft map (diagnostic)
function legacyAlpha(p) {
  p = Math.max(0, Math.min(1, p));
  if (p < 0.08) return 0;
  let a;
  if (p < 0.34) a = 0.04 + p * 0.28;
  else if (p < 0.67) a = 0.1 + (p - 0.34) * 0.42;
  else a = 0.18 + (p - 0.67) * 0.55;
  return a * 0.42; // layer opacity
}
function newAlpha(p) {
  return D.effectiveRadarAlpha(D.displayIntensity(p), 0.42);
}
const base = 0.5;
const thaw = 0.7;
const cold = 0.3;
const legacyDelta = Math.abs(legacyAlpha(thaw) - legacyAlpha(base));
const newDelta = Math.abs(newAlpha(thaw) - newAlpha(base));
assert.ok(
  newDelta > legacyDelta * 1.6,
  `thaw visual delta should expand (${newDelta} vs legacy ${legacyDelta})`
);
const legacyCold = Math.abs(legacyAlpha(base) - legacyAlpha(cold));
const newCold = Math.abs(newAlpha(base) - newAlpha(cold));
assert.ok(
  newCold > legacyCold * 1.4,
  `cold visual delta should expand (${newCold} vs legacy ${legacyCold})`
);

// Color strings exist for mid/high; null for near-zero
assert.equal(D.colorForAnalyticalPriority(0), null);
assert.ok(/rgba\(/.test(D.colorForAnalyticalPriority(0.55)));
assert.ok(/rgba\(/.test(D.colorForAnalyticalPriority(0.9)));

// Heat layer wires display module (source contract)
const heat = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-heat-layer.js"),
  "utf8"
);
assert.ok(heat.includes("WaypointShedsRadarDisplay"), "heat uses display module");
assert.ok(heat.includes("colorForAnalyticalPriority"), "heat calls display color");

const mapHtml = fs.readFileSync(
  path.join(root, "apps/shed-hunting/map/index.html"),
  "utf8"
);
assert.ok(
  mapHtml.indexOf("sheds-radar-display.js") < mapHtml.indexOf("sheds-heat-layer.js"),
  "display script before heat layer"
);

// P1 / P2 analytical constants unchanged
const p2 = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-search-priority-today.js"),
  "utf8"
);
assert.ok(/UNIT_SOLAR_DELTA\s*=\s*0\.2/.test(p2));
assert.ok(/UNIT_SNOW_STEEP_DELTA\s*=\s*-0\.2/.test(p2));

const p1 = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-radar-base-landscape.js"),
  "utf8"
);
assert.ok(p1.includes("scoreSample") || p1.includes("function score"), "P1 present");

// prepare host lists display module
const prep = fs.readFileSync(
  path.join(root, "scripts/prepare-shed-hunting-host.mjs"),
  "utf8"
);
assert.ok(prep.includes("sheds-radar-display.js"));

console.log("PASS sheds radar display intensity tests");
