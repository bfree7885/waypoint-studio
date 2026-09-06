#!/usr/bin/env node
/**
 * Sheds V2.0 Phase 1 — Map integration tests for Search Priority Today.
 * Fixture-only; no live weather APIs.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadScripts(files) {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const rel of files) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `missing ${rel}`);
    vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: rel });
  }
  return sandbox;
}

const sandbox = loadScripts([
  "apps/shed-hunting/js/sheds-search-priority-today.js",
  "apps/shed-hunting/js/sheds-search-priority-today-map.js",
]);

const Model = sandbox.WaypointShedsSearchPriorityToday;
const Adapter = sandbox.WaypointShedsSearchPriorityTodayMap;
assert.ok(Model && Adapter, "model + adapter must load");

const FORBIDDEN = [
  /\bhotspot\b/i,
  /\blikely shed\b/i,
  /\bshed probability\b/i,
  /\bchance of finding\b/i,
  /\bsheds? (are|is) here\b/i,
  /\b\d{1,3}%\s*(chance|probability|likely)/i,
];

function assertHonest(payload, label) {
  const text = JSON.stringify(payload);
  for (const re of FORBIDDEN) {
    assert.equal(re.test(text), false, `${label} must not contain ${re}`);
  }
}

const terrainCells = [
  {
    id: "north_steep",
    row: 0,
    col: 0,
    lat: 41.2,
    lng: -75.1,
    band: "moderate",
    priorityLabel: "Moderate",
    status: "ready",
    slopeDeg: 18,
    aspectCardinal: "N",
    featureKind: "steep",
    outsideArea: false,
  },
  {
    id: "south_transition",
    row: 0,
    col: 1,
    lat: 41.201,
    lng: -75.1,
    band: "moderate",
    priorityLabel: "Moderate",
    status: "ready",
    slopeDeg: 9,
    aspectCardinal: "S",
    featureKind: "transition",
    outsideArea: false,
  },
  {
    id: "east_bench",
    row: 0,
    col: 2,
    lat: 41.202,
    lng: -75.1,
    band: "moderate",
    priorityLabel: "Moderate",
    status: "ready",
    slopeDeg: 3,
    aspectCardinal: "E",
    featureKind: "bench",
    outsideArea: false,
  },
];

const terrainGrid = {
  rows: 1,
  cols: 3,
  bounds: { west: -75.11, east: -75.09, south: 41.19, north: 41.21 },
  status: "ready",
  cells: terrainCells,
};

const COND_NEUTRAL = {
  available: true,
  freezeThawStatus: "none",
  tempTrendStatus: "little_change",
  snowCoverStatus: "none",
  seasonCategory: "peak_drop",
};

const COND_THAW = {
  available: true,
  freezeThawStatus: "freeze_thaw",
  tempTrendStatus: "warming",
  snowCoverStatus: "none",
  seasonCategory: "peak_drop",
};

console.log("1. Model is actually called via adapter");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_THAW,
  });
  assert.equal(out.ok, true);
  assert.equal(out.grid.renderMode, "search-interest-today");
  assert.ok(out.areaResult && out.areaResult.readyCount === 3);
  assert.ok(out.summary.appliedModifiers.some((m) => m.id === "solar_searchability"));
  console.log("  ok");
}

console.log("2. Active Search Area cells adapted correctly");
{
  const adapted = Adapter.adaptTerrainCell(terrainCells[1]);
  assert.equal(adapted.terrainPriority, "Moderate");
  assert.equal(adapted.aspectCardinal, "S");
  assert.equal(adapted.featureKind, "transition");
  console.log("  ok");
}

console.log("3. Stronger / moderate / lower render bands");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_THAW,
  });
  const bands = out.grid.cells.map((c) => c.band);
  assert.ok(bands.includes("stronger_interest"));
  assert.ok(bands.includes("moderate_interest"));
  assert.equal(bands.includes(null), false);
  console.log("  ok", bands.join(", "));
}

console.log("4. Reasons come from applied modifiers");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_THAW,
  });
  assert.ok(out.summary.bullets.length >= 1);
  assert.ok(
    out.summary.bullets.some((b) => /sun-facing|thaw|warming|searchability/i.test(b))
  );
  console.log("  ok");
}

console.log("5. Insufficient spatial suppresses decorative wash");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    spatialGrid: { cells: [], unavailable: true, habitatEmpty: true },
    terrainGrid: { cells: [], status: "unavailable" },
    huntContext: COND_THAW,
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "insufficient_spatial");
  assert.equal(out.grid.cells.length, 0);
  assert.equal(out.grid.unavailable, true);
  console.log("  ok");
}

console.log("6. GIS-without-aspect does not apply solar modifier");
{
  const gisGrid = {
    rows: 1,
    cols: 2,
    bounds: terrainGrid.bounds,
    unavailable: false,
    habitatEmpty: false,
    cells: [
      {
        row: 0,
        col: 0,
        lat: 41.2,
        lng: -75.1,
        band: "some",
        slopeDeg: 10,
        outsideArea: false,
      },
      {
        row: 0,
        col: 1,
        lat: 41.201,
        lng: -75.1,
        band: "stronger",
        slopeDeg: 8,
        outsideArea: false,
      },
    ],
  };
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    spatialGrid: gisGrid,
    terrainGrid: null,
    huntContext: COND_THAW,
  });
  assert.equal(out.ok, true);
  assert.equal(
    out.summary.appliedModifiers.some((m) => m.id === "solar_searchability"),
    false
  );
  assert.ok(
    out.summary.bullets.some((b) => /aspect/i.test(b)) ||
      out.summary.gisWithoutAspect ||
      out.summary.bullets.some((b) => /did not materially change/i.test(b))
  );
  console.log("  ok");
}

console.log("7. Neutral vs thaw/warming changes relative bands");
{
  const a = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_NEUTRAL,
  });
  const b = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_THAW,
  });
  const bandsA = a.grid.cells.map((c) => c.band).join("|");
  const bandsB = b.grid.cells.map((c) => c.band).join("|");
  assert.notEqual(bandsA, bandsB);
  assert.equal(a.grid.cells[1].band, "moderate_interest");
  assert.equal(b.grid.cells[1].band, "stronger_interest");
  assert.equal(a.grid.cells[0].band, b.grid.cells[0].band);
  console.log("  A", bandsA);
  console.log("  B", bandsB);
}

console.log("8. No probability / hotspot language");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    terrainGrid,
    huntContext: COND_THAW,
  });
  assertHonest(out, "adapter output");
  assertHonest(Adapter.BAND_LABELS, "band labels");
  console.log("  ok");
}

console.log("9. No active Search Area behaves honestly");
{
  const out = Adapter.buildInterestGrid({
    searchLocation: null,
    terrainGrid,
    huntContext: COND_THAW,
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "no_search_area");
  assert.ok(/Search Area/i.test(out.summary.bullets.join(" ")));
  console.log("  ok");
}

console.log("10. Map shell contracts (script tags + why panel + mobile CSS)");
{
  const mapHtml = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
  assert.ok(mapHtml.includes("sheds-search-priority-today.js"));
  assert.ok(mapHtml.includes("sheds-search-priority-today-map.js"));
  assert.ok(mapHtml.includes('id="why-bands-today"'));
  assert.ok(mapHtml.includes("Why these bands today"));
  const css = fs.readFileSync(path.join(root, "apps/shed-hunting/css/sheds-map.css"), "utf8");
  assert.ok(css.includes(".sheds-why-bands"));
  assert.ok(css.includes("@media (max-width: 390px)"));
  assert.ok(css.includes("@media (max-width: 320px)"));
  const overview = fs.readFileSync(
    path.join(root, "apps/shed-hunting/js/sheds-today-hunt-overview.js"),
    "utf8"
  );
  assert.ok(overview.includes("?today=1"));
  const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
  assert.ok(mapApp.includes("consumeTodayHuntMapHandoff"));
  assert.ok(mapApp.includes("applySearchInterestToday"));
  assert.ok(mapApp.includes("SearchPriorityTodayMap"));
  assert.ok(
    /setSearchLocation\(\s*loc\.lat\s*,\s*loc\.lng/.test(mapApp),
    "handoff must pass numeric lat/lng into setSearchLocation"
  );
  assert.ok(
    mapApp.includes("state.lastGisGrid"),
    "GIS pack must be retained for briefing / explain after interest paint"
  );
  assert.ok(
    mapApp.includes("refreshSearchInterestToday"),
    "interest wash must rebuild when hunt conditions arrive"
  );
  console.log("  ok");
}

console.log("\nAll Sheds V2.0 Phase 1 map-integration tests passed.");
