#!/usr/bin/env node
/**
 * Sheds RADAR — production readiness gates (no deploy).
 * Covers normal-UI chrome, proof gating, clock-skew, host artifact hygiene,
 * and unchanged P2 modifier magnitudes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    globalThis: {},
    atob: (s) => Buffer.from(s, "base64").toString("binary")
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

const mapHtml = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const frameSrc = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-radar-condition-frame.js"),
  "utf8"
);
const modelSrc = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-search-priority-today.js"),
  "utf8"
);

// A — no prototype / milestone copy in normal UI markup
assert.ok(!/Radar P0|Frame A|Frame B|P0 prototype|P1 prototype|P2 prototype/i.test(mapHtml), "A no P0/Frame labels");
assert.ok(/btn-radar-mode-today/.test(mapHtml) && /btn-radar-mode-landscape/.test(mapHtml), "A Today/Landscape present");
assert.ok(/id="btn-radar-p0-toggle"[^>]*\bhidden\b/.test(mapHtml), "A Interest toggle hidden by default");
assert.ok(/id="radar-p0-proof-wrap"[^>]*\bhidden\b/.test(mapHtml), "A proof wrap hidden");
assert.ok(!/prototype/i.test(mapHtml), "A no prototype wording in map HTML");

// B — proof controls query-gated
assert.ok(/radarProof/.test(mapApp) && /radarProofFixtures/.test(mapApp), "B proof flag");
assert.ok(/radarDebug/.test(mapApp) && /radarDebugChrome/.test(mapApp), "B debug gate");
assert.ok(/params\.get\("radarProof"\) === "1"/.test(mapApp), "B radarProof=1");
assert.ok(/params\.get\("radarDebug"\) === "1"/.test(mapApp), "B radarDebug=1");
assert.ok(/proofWrap\.hidden = !state\.radarProofFixtures/.test(mapApp), "B proof UI gated");
assert.ok(/toggle\.hidden = !state\.radarDebugChrome/.test(mapApp), "B toggle gated");

const sandbox = loadScripts([
  "apps/shed-hunting/js/sheds-habitat-gis.js",
  "apps/shed-hunting/js/sheds-gis-pack.js",
  "apps/shed-hunting/js/sheds-radar-base-landscape.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-search-priority-today.js",
  "apps/shed-hunting/js/sheds-search-priority-today-map.js",
  "apps/shed-hunting/js/sheds-weather.js",
  "apps/shed-hunting/js/sheds-radar-condition-frame.js",
  "apps/shed-hunting/js/sheds-radar-p0.js"
]);

const Radar = sandbox.WaypointShedsRadarP0;
const Model = sandbox.WaypointShedsSearchPriorityToday;
const Frame = sandbox.WaypointShedsRadarConditionFrame;
assert.ok(Radar && Model && Frame, "modules load");

// C — future timestamp handling
assert.equal(Frame.FUTURE_SKEW_MS, 5 * 60 * 1000, "C skew threshold 5 min");
const now = new Date("2026-03-10T15:00:00.000Z");
assert.equal(
  Frame.resolveFreshness({
    fetchedAt: new Date(now.getTime() + 60_000).toISOString(),
    now
  }),
  "fresh",
  "C minor future skew still fresh"
);
assert.equal(
  Frame.resolveFreshness({
    fetchedAt: new Date(now.getTime() + Frame.FUTURE_SKEW_MS + 60_000).toISOString(),
    now
  }),
  "stale",
  "C material future → stale"
);
assert.equal(
  Frame.resolveFreshness({
    fetchedAt: new Date(now.getTime() - Frame.FRESH_MS - 60_000).toISOString(),
    now
  }),
  "stale",
  "C past stale unchanged"
);

// D — Today default
assert.ok(/radarSurfaceMode:\s*"today"/.test(mapApp), "D default today");
assert.ok(/aria-pressed="true">Today</.test(mapHtml), "D Today pressed in HTML");

// E — Landscape fallback wiring present
assert.ok(/applyConditionFrame/.test(mapApp), "E condition frame wired");
assert.ok(/setRadarSurfaceMode\("landscape"\)/.test(mapApp), "E landscape control");
assert.ok(/Showing landscape — current conditions are stale/.test(frameSrc), "E stale status copy");

// F — neutral Today remains Today (fresh + known statuses, zero modifiers)
const tinyCells = [];
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    tinyCells.push({
      row: r,
      col: c,
      lat: 41.31 + r * 0.001,
      lng: -74.78 + c * 0.001,
      landscapeScore: 0.4,
      landscapeLabel: "moderate",
      slopeDeg: 8,
      aspectCardinal: "S",
      featureKind: "gentle",
      structure: "forest",
      outsideArea: false,
      water: false,
      developed: false
    });
  }
}
const field = {
  ok: true,
  key: "prod-ready-tiny",
  rows: 3,
  cols: 3,
  cells: tinyCells,
  terrainEnriched: true,
  cellSizeMApprox: 90
};
const frameN = Frame.emptyFrame({
  freshness: "fresh",
  fetchedAt: now.toISOString(),
  lat: 41.31,
  lon: -74.78
});
frameN.freezeThawStatus = "little_change";
frameN.tempTrendStatus = "little_change";
frameN.snowCoverStatus = "none";
assert.ok(Frame.canDriveTodaySurface(frameN), "F fresh neutral-capable drives Today");
const paintedN = Radar.applyConditionFrame(field, frameN, {
  Model,
  ConditionFrame: Frame
});
assert.equal(paintedN.grid.surfaceMode, "today", "F neutral Today remains Today");
assert.equal(paintedN.grid.frameLabel, "Today", "F Today label");
assert.equal((paintedN.grid.stats && paintedN.grid.stats.solarModifiers) || 0, 0, "F no invented solar");
assert.equal((paintedN.grid.stats && paintedN.grid.stats.snowModifiers) || 0, 0, "F no invented snow");

// L — P2 magnitudes unchanged
assert.equal(Model.UNIT_SOLAR_DELTA, 0.2, "L solar +0.20");
assert.equal(Model.UNIT_SNOW_STEEP_DELTA, -0.2, "L snow steep −0.20");
assert.ok(/UNIT_SOLAR_DELTA = 0\.2/.test(modelSrc), "L solar constant in source");
assert.ok(/UNIT_SNOW_STEEP_DELTA = -0\.2/.test(modelSrc), "L snow constant in source");

// G / H — prepared host contains runtime; excludes evidence-only public assets
const prep = spawnSync(process.execPath, [path.join(root, "scripts/prepare-shed-hunting-host.mjs")], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(prep.status, 0, "G prepare exit 0: " + (prep.stderr || prep.stdout || "").slice(0, 400));
const dist = path.join(root, "dist/shedhunting");
assert.ok(fs.existsSync(path.join(dist, "js/sheds-radar-condition-frame.js")), "G condition frame in host");
assert.ok(fs.existsSync(path.join(dist, "js/sheds-radar-p0.js")), "G radar runtime in host");
assert.ok(fs.existsSync(path.join(dist, "js/sheds-radar-base-landscape.js")), "G base landscape in host");
assert.ok(fs.existsSync(path.join(dist, "map/index.html")), "G map html");
assert.ok(!fs.existsSync(path.join(dist, "assets/antler-options")), "H no antler-options");
assert.ok(!fs.existsSync(path.join(dist, "docs")), "H no docs/");
const distMap = fs.readFileSync(path.join(dist, "map/index.html"), "utf8");
assert.ok(/sheds-radar-condition-frame\.js/.test(distMap), "G map loads condition frame");
assert.ok(/btn-radar-mode-today/.test(distMap), "G Today control on host map");
assert.ok(/id="btn-radar-p0-toggle"[^>]*\bhidden\b/.test(distMap), "H Interest toggle still hidden on host");
assert.ok(/id="radar-p0-proof-wrap"[^>]*\bhidden\b/.test(distMap), "H proof wrap hidden on host");

// I — host map boots (script order + app entry present)
assert.ok(/sheds-map-app\.js/.test(distMap), "I map app script");
assert.ok(/data-shed-host="1"/.test(distMap), "I shed host rewrite");

assert.ok(/fetchOpenMeteoElevationJson/.test(mapApp), "elev 429 retry helper present");
assert.ok(/res\.status === 429/.test(mapApp), "elev retries on 429");

// J — no Search Area gate for radar
assert.ok(/Search Area not required/.test(mapApp), "J radar independent of Search Area");

// K — water/developed guards still in radar/base sources
const baseSrc = fs.readFileSync(
  path.join(root, "apps/shed-hunting/js/sheds-radar-base-landscape.js"),
  "utf8"
);
const radarSrc = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-p0.js"), "utf8");
assert.ok(/water/.test(baseSrc) && /developed/.test(baseSrc + radarSrc + modelSrc), "K water/developed guards");

console.log("test-sheds-radar-production-readiness: PASS");
