#!/usr/bin/env node
/**
 * Sheds V2.0 Phase 1.x — Terrain/aspect enrichment independent of Search Areas overlay.
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
const Adapter = sandbox.WaypointShedsSearchPriorityTodayMap;
assert.ok(Adapter, "adapter must load");

const mapApp = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-map-app.js"),
  "utf8"
);

const terrainGrid = {
  rows: 1,
  cols: 3,
  bounds: { west: -75.11, east: -75.09, south: 41.19, north: 41.21 },
  status: "ready",
  cells: [
    {
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
  ],
};

const gisGrid = {
  rows: 1,
  cols: 3,
  bounds: terrainGrid.bounds,
  unavailable: false,
  habitatEmpty: false,
  cells: [
    { row: 0, col: 0, lat: 41.2, lng: -75.1, band: "some", slopeDeg: 18, outsideArea: false },
    { row: 0, col: 1, lat: 41.201, lng: -75.1, band: "some", slopeDeg: 9, outsideArea: false },
    { row: 0, col: 2, lat: 41.202, lng: -75.1, band: "some", slopeDeg: 3, outsideArea: false },
  ],
};

const COND_THAW = {
  available: true,
  freezeThawStatus: "freeze_thaw",
  tempTrendStatus: "warming",
  snowCoverStatus: "none",
  seasonCategory: "peak_drop",
};

function interest(terrain, overlayLabel) {
  return Adapter.buildInterestGrid({
    searchLocation: { lat: 41.2, lng: -75.1 },
    spatialGrid: gisGrid,
    terrainGrid: terrain,
    huntContext: COND_THAW,
    _overlayVisible: overlayLabel,
  });
}

console.log("A. GIS + overlay ON + aspect available → solar may apply");
{
  const on = interest(terrainGrid, "on");
  assert.equal(on.ok, true);
  assert.ok(on.summary.appliedModifiers.some((m) => m.id === "solar_searchability"));
  assert.equal(on.grid.cells[1].band, "stronger_interest");
  console.log("  ok", on.grid.cells.map((c) => c.band).join("|"));
}

console.log("B. GIS + overlay OFF + same aspect still available");
{
  const off = interest(terrainGrid, "off");
  assert.equal(off.ok, true);
  assert.ok(off.summary.appliedModifiers.some((m) => m.id === "solar_searchability"));
  assert.equal(off.grid.cells[1].band, "stronger_interest");
  console.log("  ok");
}

console.log("C. Overlay toggled OFF after grid creation — enrichment remains usable");
{
  const out = interest(terrainGrid, "off-after-create");
  assert.ok(out.summary.appliedModifiers.some((m) => m.id === "solar_searchability"));
  assert.ok(mapApp.includes("Presentation only — keep lastSearchAreasGrid"));
  assert.ok(mapApp.includes("function terrainEnrichmentNeeded"));
  assert.ok(
    !/if\s*\(\s*!state\.searchAreasVisible\s*\)\s*\{[^}]{0,200}lastSearchAreasGrid\s*=\s*\{\s*cells:\s*\[\]/s.test(
      mapApp
    )
  );
  console.log("  ok");
}

console.log("D. Overlay ON/OFF does not alter model result for same data");
{
  const a = interest(terrainGrid, "on");
  const b = interest(terrainGrid, "off");
  assert.equal(JSON.stringify(a.areaResult), JSON.stringify(b.areaResult));
  assert.equal(
    a.grid.cells.map((c) => c.band).join("|"),
    b.grid.cells.map((c) => c.band).join("|")
  );
  console.log("  ok");
}

console.log("E. Terrain enrichment arrives after first interest render → one valid recompute");
{
  const first = interest(null, "off");
  assert.equal(
    first.summary.appliedModifiers.some((m) => m.id === "solar_searchability"),
    false
  );
  const second = interest(terrainGrid, "off");
  assert.ok(second.summary.appliedModifiers.some((m) => m.id === "solar_searchability"));
  assert.notEqual(
    first.grid.cells.map((c) => c.band).join("|"),
    second.grid.cells.map((c) => c.band).join("|")
  );
  assert.ok(mapApp.includes("interestEnrichAppliedKey"));
  assert.ok(mapApp.includes("scheduleRecompute(120)"));
  assert.ok(mapApp.includes("key !== state.interestEnrichAppliedKey"));
  console.log(
    "  ok first=",
    first.grid.cells.map((c) => c.band).join("|"),
    "second=",
    second.grid.cells.map((c) => c.band).join("|")
  );
}

console.log("F. Missing terrain → no fabricated aspect / no solar modifier");
{
  const out = interest(null, "off");
  assert.equal(out.ok, true);
  assert.equal(
    out.summary.appliedModifiers.some((m) => m.id === "solar_searchability"),
    false
  );
  for (const cell of gisGrid.cells) {
    const adapted = Adapter.adaptGisCell(cell, []);
    assert.ok(adapted, "GIS cell should still adapt");
    assert.equal("aspectCardinal" in adapted, false, "must not invent aspect key");
  }
  assert.ok(
    out.summary.bullets.some((b) => /aspect/i.test(b)) ||
      out.summary.bullets.some((b) => /did not materially change/i.test(b))
  );
  console.log("  ok");
}

console.log("G. Same inputs deterministic");
{
  const a = interest(terrainGrid, "off");
  const b = interest(terrainGrid, "off");
  assert.equal(JSON.stringify(a.areaResult), JSON.stringify(b.areaResult));
  assert.equal(
    a.grid.cells.map((c) => `${c.band}:${c.priority}`).join("|"),
    b.grid.cells.map((c) => `${c.band}:${c.priority}`).join("|")
  );
  console.log("  ok");
}

console.log("H. No recompute loop (enrichment key guard + needed() gate)");
{
  assert.ok(mapApp.includes("function terrainEnrichmentNeeded"));
  assert.ok(mapApp.includes("terrainEnrichKey"));
  assert.ok(mapApp.includes("interestEnrichAppliedKey"));
  assert.ok(mapApp.includes("state.searchAreasVisible ||"));
  assert.ok(mapApp.includes("state.searchLocation"));
  const hideBlock = mapApp.slice(
    mapApp.indexOf("function setSearchAreasVisible"),
    mapApp.indexOf("function syncSearchAreasLegend")
  );
  assert.ok(
    hideBlock.includes("Presentation only") || hideBlock.includes("keep lastSearchAreasGrid")
  );
  assert.ok(!hideBlock.includes("lastSearchAreasGrid = null"));
  console.log("  ok");
}

console.log("I. No regression to Search Areas display behavior");
{
  assert.ok(mapApp.includes("function paintSearchAreasLayer"));
  assert.ok(mapApp.includes("setHeatVisible(true)"));
  assert.ok(mapApp.includes("Terrain search priority — off"));
  const showBlock = mapApp.slice(
    mapApp.indexOf("function setSearchAreasVisible"),
    mapApp.indexOf("function syncSearchAreasLegend")
  );
  assert.ok(showBlock.includes("scheduleSearchAreas(80)"));
  assert.ok(showBlock.includes("setHeatVisible(true)"));
  console.log("  ok");
}

console.log("\nAll Sheds V2.0 Phase 1.x aspect-enrichment tests passed.");
