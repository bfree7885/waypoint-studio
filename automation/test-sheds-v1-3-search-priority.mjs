#!/usr/bin/env node
/**
 * Sheds V1.3 — Where should I look? search-priority terrain intelligence.
 * Run: node automation/test-sheds-v1-3-search-priority.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let passed = 0;

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.log("FAIL", name, "—", detail || "");
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function loadPriority() {
  const sandbox = { console, Math, isFinite, Number, String, Array, Object, Date, JSON };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("apps/shed-hunting/js/sheds-search-priority.js"), sandbox, {
    filename: "sheds-search-priority.js"
  });
  return sandbox.WaypointShedsSearchPriority;
}

const P = loadPriority();
assert("module loaded", !!(P && P.evaluatePoint));
assert("version 1.3.0", P.VERSION === "1.3.0");
assert("three priorities only", P.PRIORITIES.join(",") === "Higher,Moderate,Lower");

const FAKE = /find probability|shed probability|83%|0\.76|ai confidence|deer are here|deer present|deer travel|travel route|sheds are likely/i;
const CLEAR = /\b(clear ground|bare ground|ground is snow-free)\b/i;

function assertHonest(text, label) {
  assert(label + " no fake probability", !FAKE.test(text || ""), text);
  assert(label + " no banned helper", !P.containsBannedLanguage(text || ""));
  assert(label + " not claiming snow-free", !CLEAR.test(text || ""), text);
}

// ——— Gentle terrain ———
const gentle = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 93,
    westM: 107,
    stepM: 60
  }
});
assert("gentle is ready", gentle.status === "ready");
assert("gentle is Moderate", gentle.priority === "Moderate", gentle.priority + " " + (gentle.feature && gentle.feature.kind));
assert("gentle not a probability", !/\d+%/.test(gentle.hudText));
assertHonest(gentle.hudText, "gentle");

// ——— Steep terrain ———
const steep = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 160,
    southM: 40,
    eastM: 100,
    westM: 100,
    stepM: 60
  }
});
assert("steep is Lower", steep.priority === "Lower", steep.priority);
assert("steep feature", steep.feature && steep.feature.kind === "steep", steep.feature && steep.feature.kind);
assert("steep explains effort", /search-effort|practicality|Steep/i.test(steep.hudText));
assertHonest(steep.hudText, "steep");

// ——— Bench / terrain transition ———
const bench = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  }
});
assert("bench is Higher", bench.priority === "Higher", bench.priority + " " + JSON.stringify(bench.feature));
assert("bench kind", bench.feature && bench.feature.kind === "bench", bench.feature && bench.feature.kind);
assert("bench why transition", /transition|worth checking/i.test(bench.hudText));
assert("bench HUD structure", /Search priority: Higher/.test(bench.hudText) && /Terrain/.test(bench.hudText) && /Why/.test(bench.hudText) && /Field note/.test(bench.hudText));
assertHonest(bench.hudText, "bench");

// ——— Aspect derivation ———
const south = P.slopeAspectFromElevNeighbors({
  centerM: 100,
  northM: 110,
  southM: 90,
  eastM: 100,
  westM: 100,
  stepM: 60
});
assert("south-facing slope computed", south.slopeDeg > 5);
assert("south aspect cardinal", ["S", "SE", "SW"].includes(P.aspectCardinal(south.aspectDeg)), String(south.aspectDeg));
const southPoint = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    slopeDeg: south.slopeDeg,
    aspectDeg: south.aspectDeg,
    northM: 110,
    southM: 90,
    eastM: 100,
    westM: 100,
    stepM: 60
  }
});
assert("aspect appears in inspect", /south/i.test(southPoint.hudText + " " + ((southPoint.feature && southPoint.feature.facing) || "")), southPoint.hudText);

// ——— Missing elevation ———
const missing = P.evaluatePoint({
  zoom: 14,
  elevStatus: "unavailable",
  terrainStatus: "unavailable",
  raw: {}
});
assert("missing is not Moderate", missing.priority !== "Moderate" && missing.priority == null, missing.priority);
assert("missing unavailable copy", /Terrain intelligence unavailable here|Not enough terrain data/i.test(missing.hudText));
assert("missing does not silently Moderate", !/Search priority: Moderate/.test(missing.hudText));
assertHonest(missing.hudText, "missing");

const failed = P.evaluatePoint({
  zoom: 14,
  elevStatus: "failed",
  terrainStatus: "failed",
  raw: {}
});
assert("failed not Moderate", failed.priority == null);

// ——— Insufficient zoom ———
const coarse = P.evaluatePoint({
  zoom: 8,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  }
});
assert("coarse zoom insufficient", coarse.status === "insufficient_zoom");
assert("coarse copy", /Zoom in to inspect terrain/.test(coarse.hudText));
assert("coarse no fake priority", coarse.priority == null);

const gridZoom = P.evaluateGrid({
  zoom: 9,
  rows: 4,
  cols: 4,
  bounds: { north: 41.4, south: 41.3, west: -74.9, east: -74.8 },
  elevations: new Array(36).fill(100)
});
assert("overlay coarse zoom", gridZoom.status === "insufficient_zoom");
assert("overlay coarse empty cells", gridZoom.cells.length === 0);

const gridMissing = P.evaluateGrid({
  zoom: 14,
  rows: 4,
  cols: 4,
  bounds: { north: 41.34, south: 41.33, west: -74.81, east: -74.80 },
  elevations: null
});
assert("overlay missing elev unavailable", gridMissing.status === "unavailable");
assert("overlay missing not Moderate cells", !(gridMissing.cells || []).some((c) => c.band === "moderate"));

// ——— Priority explanation ———
assert("Higher explains why", (bench.why || []).length >= 1);
assert("Lower explains steep", (steep.why || []).some((w) => /steep|effort|practicality/i.test(w)));

// ——— Today context does not override season dishonestly ———
const outside = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  },
  today: {
    available: true,
    seasonCategory: "outside",
    snowCoverStatus: "unavailable",
    snowDepthKnown: false,
    freezeThawStatus: "freeze_thaw",
    tempTrendStatus: "warming"
  }
});
assert("outside season keeps base Higher", outside.priority === "Higher" && outside.basePriority === "Higher");
assert("outside season noted", /outside the main shed-search window/i.test(outside.hudText));
assert("outside does not claim today looks worth searching", !/today looks worth searching/i.test(outside.hudText));
assert("outside does not say good day to hunt", !/good day to hunt/i.test(outside.hudText));
assert("today did not override", outside.todayDidNotOverride === true);
assertHonest(outside.hudText, "outside season");

const peakSame = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  },
  today: {
    available: true,
    seasonCategory: "peak",
    snowCoverStatus: "light",
    snowDepthKnown: true
  }
});
assert("peak does not rewrite Higher", peakSame.priority === outside.basePriority);

// ——— Snow-depth missing is not clear ground ———
const snowUnknown = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  },
  today: {
    available: true,
    seasonCategory: "peak",
    snowCoverStatus: "unavailable",
    snowDepthKnown: false
  }
});
assert("missing snow mentioned as unavailable", /snow depth is unavailable|not treat the ground as snow-free/i.test(snowUnknown.hudText));
assert("missing snow not clear/bare", !CLEAR.test(snowUnknown.hudText), snowUnknown.hudText);
assertHonest(snowUnknown.hudText, "snow unknown");

const snowLimiting = P.evaluatePoint({
  zoom: 14,
  elevStatus: "ready",
  terrainStatus: "ready",
  raw: {
    elevM: 100,
    northM: 100,
    southM: 100,
    eastM: 100,
    westM: 120,
    stepM: 60
  },
  today: {
    available: true,
    seasonCategory: "peak",
    snowCoverStatus: "limiting",
    snowDepthKnown: true
  }
});
assert("limiting snow does not change Higher", snowLimiting.priority === "Higher");
assert("limiting snow note", /Snow depth is limiting/i.test(snowLimiting.hudText));

// Overlay grid: small local bounds so stepM is useful
function haloGrid(rows, cols, fn) {
  const haloR = rows + 2;
  const haloC = cols + 2;
  const out = [];
  for (let r = 0; r < haloR; r++) {
    for (let c = 0; c < haloC; c++) out.push(fn(r, c, haloR, haloC));
  }
  return out;
}

const localBounds = { north: 41.3210, south: 41.3200, west: -74.8010, east: -74.8000 };
const benchGrid = P.evaluateGrid({
  zoom: 14,
  rows: 4,
  cols: 4,
  bounds: localBounds,
  elevations: haloGrid(4, 4, function (r, c) {
    return 100 + (c === 0 ? 8 : 0);
  })
});
assert("grid ready or mixed", benchGrid.status === "ready" || benchGrid.readyCount > 0, benchGrid.status);
assert("grid has a Higher or Moderate cell", (benchGrid.cells || []).some((c) => c.band === "higher" || c.band === "moderate"), JSON.stringify(benchGrid.cells && benchGrid.cells.map((c) => c.band)));
assert("grid never paints incomplete as moderate", !(benchGrid.cells || []).some((c) => c.status === "incomplete" && c.band === "moderate"));

// ——— Map HTML / wiring: V1.2 + V1.3 controls remain ———
const html = read("apps/shed-hunting/map/index.html");
const mapApp = read("apps/shed-hunting/js/sheds-map-app.js");
assert("Search Areas toggle", /id="btn-search-areas"/.test(html));
assert("Search Areas checkbox", /id="search-areas-visible"/.test(html));
assert("Search Areas legend", /id="search-areas-legend"/.test(html));
assert("search-priority script", /sheds-search-priority\.js/.test(html));
assert("Import JSON remains", /id="btn-import"/.test(html) && /btn-import/.test(mapApp));
assert("Measure remains", /id="btn-measure"/.test(html) && /btn-measure/.test(mapApp));
assert("Inspect remains", /id="btn-inspect-point"/.test(html) && /id="inspect-hud"/.test(html));
assert("Inspect field note slot", /id="inspect-field-note"/.test(html));
assert("Today hunt root remains", /id="today-hunt"/.test(html));
assert("map-app uses SearchPriority", /WaypointShedsSearchPriority/.test(mapApp));
assert("inspect HUD uses formatInspectHud", /formatInspectHud/.test(mapApp));
assert("search overlay independent abort", /searchAreasAbort/.test(mapApp));

const css = read("apps/shed-hunting/css/sheds-map.css");
assert("search legend css", /sheds-search-legend/.test(css));
assert("inspect overflow-x hidden", /overflow-x:\s*hidden/.test(css));

const overview = read("apps/shed-hunting/host/index.html");
assert("overview still asks should I go today", /Should I go shed hunting today/i.test(overview));
assert("overview still has hunt root", /id="todays-hunt"/.test(overview));

const docs = read("docs/sheds/SHEDS-V1-3-WHERE-TO-LOOK.md");
assert("v1.3 plan exists", /Where should I look/i.test(docs));
assert("v1.3 not a prediction system", /not an antler prediction/i.test(docs));

const wide = { north: 41.45, south: 41.15, west: -75.15, east: -74.45 };
const clamped = P.clampSearchBounds(wide);
assert("clamp shrinks desktop-scale bounds", Math.abs(clamped.north - clamped.south) * 111320 <= 3100);
const wideGrid = P.evaluateGrid({
  zoom: 14,
  rows: 12,
  cols: 12,
  bounds: wide,
  elevations: haloGrid(12, 12, function () { return 100; })
});
assert("clamped overlay is not insufficient-zoom", wideGrid.status !== "insufficient_zoom", wideGrid.status + " step=" + wideGrid.stepM);

if (failures.length) {
  console.error("\n" + failures.length + " failure(s):\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
console.log("\nSheds V1.3 search-priority tests passed (" + passed + ").");
