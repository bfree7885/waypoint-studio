#!/usr/bin/env node
/**
 * Sheds RADAR — precomputed pack terrain (aspect in GIS pack).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    globalThis: {},
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    btoa: (s) => Buffer.from(s, "binary").toString("base64")
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  for (const rel of files) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, {
      filename: rel
    });
  }
  return sandbox;
}

const packPath = path.join(root, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json");
const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));

// A pack aspect decode
assert.ok(pack.aspectCardinal, "A aspectCardinal present");
assert.equal(pack.rows * pack.cols, 32400, "A 180×180");
assert.ok(!Object.prototype.hasOwnProperty.call(pack, "elevationM"), "A no raw DEM field");
assert.ok(!/elevationM|elevArr/.test(JSON.stringify(Object.keys(pack))), "A no elev array keys");

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

const GisPack = sandbox.WaypointShedsGisPack;
const Radar = sandbox.WaypointShedsRadarP0;
const Model = sandbox.WaypointShedsSearchPriorityToday;
const Base = sandbox.WaypointShedsRadarBaseLandscape;
const Frame = sandbox.WaypointShedsRadarConditionFrame;
assert.ok(GisPack.hasAspectLayer(pack), "A hasAspectLayer");

const midLat = (pack.bounds.north + pack.bounds.south) / 2;
const midLng = (pack.bounds.east + pack.bounds.west) / 2;
const sample = GisPack.sample(pack, midLat, midLng);
assert.ok(sample, "A sample");
assert.ok(
  sample.aspectCardinal == null ||
    ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].includes(sample.aspectCardinal),
  "B aspect cardinal orientation set"
);

// C flat/no-data — code 0 → null
assert.equal(GisPack.decodeAspectCode(0), null, "C code 0 null");
assert.equal(GisPack.decodeAspectCode(5), "S", "B S=5");
assert.equal(GisPack.decodeAspectCode(99), null, "C unknown code null");

// K old packs without aspect
const legacy = {
  ...pack,
  aspectCardinal: undefined
};
delete legacy.aspectCardinal;
assert.equal(GisPack.hasAspectLayer(legacy), false, "K no aspect layer");
GisPack.inflate && null;
const legSample = (() => {
  const p2 = JSON.parse(JSON.stringify(pack));
  delete p2.aspectCardinal;
  p2._inflated = false;
  return GisPack.sample(p2, midLat, midLng);
})();
assert.equal(legSample.aspectCardinal, null, "K missing aspect stays missing");

// D steep threshold parity (22°)
const steepCell = { landscapeScore: 0.5, slopeDeg: 22, aspectCardinal: "N" };
const gentleCell = { landscapeScore: 0.5, slopeDeg: 21, aspectCardinal: "N" };
const snowCond = {
  available: true,
  freezeThawStatus: "little_change",
  tempTrendStatus: "little_change",
  snowCoverStatus: "limiting"
};
const steepEv = Model.evaluateCell({ cell: steepCell, conditions: snowCond, scale: "unit" });
const gentleEv = Model.evaluateCell({ cell: gentleCell, conditions: snowCond, scale: "unit" });
assert.ok(
  steepEv.modifiers.some((m) => m.id === "snow_practicality" && m.delta === -0.2),
  "D steep@22 attenuates"
);
assert.ok(
  !gentleEv.modifiers.some((m) => m.id === "snow_practicality"),
  "D slope 21 no snow attenuate"
);

// Build field from pack — no elev
const elevFix = JSON.parse(
  fs.readFileSync(path.join(root, "docs/sheds/samples/radar-p0/elev-fixture-pike-50x50.json"), "utf8")
);
const built = Radar.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: elevFix.rows,
  cols: elevFix.cols,
  cellSizeMApprox: 90,
  BaseLandscape: Base,
  GisPack
});
assert.equal(built.ok, true, "field builds");
assert.equal(built.field.terrainSource, "gis-pack", "pack terrain source");
assert.equal(built.field.terrainEnriched, true, "terrainEnriched from pack");
const withAspect = built.field.cells.filter((c) => c.aspectCardinal).length;
const southish = built.field.cells.filter((c) =>
  c.aspectCardinal === "S" || c.aspectCardinal === "SE" || c.aspectCardinal === "SW"
).length;
assert.ok(withAspect > 0, "aspect cells");
assert.ok(southish > 0, "southish cells");

// E zero elevation calls in map-app radar path (static analysis)
const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const radarRecompute = mapApp.match(
  /function recomputeRadar[\s\S]*?function setRadarSurfaceMode/
) || mapApp.match(/Already terrain-enriched[\s\S]*?function setRadarSurfaceMode/);
assert.ok(radarRecompute, "radar recompute block");
assert.ok(
  /hasAspectLayer|terrainSource === "gis-pack"|Terrain\/aspect from local GIS pack/.test(
    radarRecompute[0]
  ),
  "E pack path present"
);
assert.ok(
  !/fetchRadarElevations\(win\.bounds/.test(radarRecompute[0]),
  "E no fetchRadarElevations on normal settle path"
);

// G thaw selective solar
const thaw = {
  available: true,
  freezeThawStatus: "freeze_thaw",
  tempTrendStatus: "warming",
  snowCoverStatus: "none"
};
const south = Model.evaluateCell({
  cell: { landscapeScore: 0.4, slopeDeg: 8, aspectCardinal: "S" },
  conditions: thaw,
  scale: "unit"
});
const north = Model.evaluateCell({
  cell: { landscapeScore: 0.4, slopeDeg: 8, aspectCardinal: "N" },
  conditions: thaw,
  scale: "unit"
});
assert.ok(south.modifiers.some((m) => m.id === "solar_searchability" && m.delta === 0.2), "G solar +0.20");
assert.ok(!north.modifiers.some((m) => m.id === "solar_searchability"), "G north no solar");

// H snow selective — covered in D
// I neutral identity
const landscape = Radar.paintStaticBase(built.field);
const neutralFrame = Frame.emptyFrame({ freshness: "fresh", fetchedAt: new Date().toISOString() });
neutralFrame.freezeThawStatus = "little_change";
neutralFrame.tempTrendStatus = "little_change";
neutralFrame.snowCoverStatus = "none";
const neutralPaint = Radar.applyConditionFrame(built.field, neutralFrame, {
  Model,
  ConditionFrame: Frame
});
assert.equal(neutralPaint.grid.surfaceMode, "today", "I today");
let changed = 0;
for (let i = 0; i < landscape.grid.cells.length; i++) {
  const a = landscape.grid.cells[i];
  const b = neutralPaint.grid.cells[i];
  if (a.outsideArea || b.outsideArea) continue;
  if (Math.abs((a.score || 0) - (b.score || 0)) > 1e-9) changed += 1;
}
assert.equal(changed, 0, "I neutral identity");

// J unsupported — empty pack coverage handled by emptyRadarGrid (smoke)
assert.ok(Radar.emptyRadarGrid("x").grid, "J empty grid");

// L/M host includes pack + aspect; excludes evidence
const prep = spawnSync(process.execPath, [path.join(root, "scripts/prepare-shed-hunting-host.mjs")], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(prep.status, 0, "prepare: " + (prep.stderr || "").slice(0, 200));
const distPack = path.join(root, "dist/shedhunting/gis/packs/pa-pike-milford-v1.json");
assert.ok(fs.existsSync(distPack), "L pack in host");
const distP = JSON.parse(fs.readFileSync(distPack, "utf8"));
assert.ok(distP.aspectCardinal, "L aspect in host pack");
assert.ok(!fs.existsSync(path.join(root, "dist/shedhunting/assets/antler-options")), "M no antler");
assert.ok(!fs.existsSync(path.join(root, "dist/shedhunting/docs")), "M no docs");

// Model constants
assert.equal(Model.UNIT_SOLAR_DELTA, 0.2);
assert.equal(Model.UNIT_SNOW_STEEP_DELTA, -0.2);

console.log(
  JSON.stringify({
    withAspect,
    southish,
    steepAt22: built.field.cells.filter((c) => c.slopeDeg >= 22).length,
    packBytes: fs.statSync(packPath).size,
    ok: true
  })
);
console.log("test-sheds-radar-precomputed-terrain: PASS");
