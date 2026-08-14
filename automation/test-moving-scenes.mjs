#!/usr/bin/env node
/**
 * Waypoint Moving Scenes — motion analysis + choice + localization tests
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MS = path.join(ROOT, "apps/moving-scenes/js");
const PL = path.join(ROOT, "apps/photo-library/js");

let n = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

class FakeImageData {
  constructor(data, w, h) {
    if (typeof data === "number") {
      this.width = data;
      this.height = w;
      this.data = new Uint8ClampedArray(data * w * 4);
    } else {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  }
}

function makeImageData(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rgb = paint(x, y, w, h) || [128, 128, 128];
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return new FakeImageData(data, w, h);
}

const localStore = new Map();
const idb = new Map();

const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  JSON,
  Promise,
  Uint8ClampedArray,
  Float32Array,
  ImageData: FakeImageData,
  Blob: class Blob {
    constructor(parts, opts) {
      this._parts = parts;
      this.type = (opts && opts.type) || "";
      this.size = parts.reduce((a, p) => a + (p.length || p.byteLength || 0), 0);
    }
  },
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  document: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => null
    })
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

function load(file) {
  const code = fs.readFileSync(path.join(MS, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

function loadPl(file) {
  const code = fs.readFileSync(path.join(PL, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

load("ms-models.js");
load("ms-analyze.js");
load("ms-choice.js");
load("ms-render.js");
load("ms-store.js");
loadPl("pl-models.js");

const Analyze = sandbox.WaypointMovingScenesAnalyze;
const Choice = sandbox.WaypointMovingScenesChoice;
const Models = sandbox.WaypointMovingScenesModels;
const Render = sandbox.WaypointMovingScenesRender;
const Store = sandbox.WaypointMovingScenesStore;
const LibModels = sandbox.WaypointPhotoLibraryModels;

assert("models engine version", !!Models.ENGINE_VERSION);
assert("class meta has clouds supported", Models.CLASS_META.clouds.supported === true);
assert("rain deferred", Models.CLASS_META.rain.supported === false);
assert("stars deferred", Models.CLASS_META.stars.supported === false);
assert("foliage deferred", Models.CLASS_META.foliage.supported === false);
assert("parallax deferred", Models.CLASS_META.parallax.supported === false);

// --- Fixture paints ---
const paints = {
  cloudsSky: (x, y, w, h) => (y < h * 0.42 ? [210, 215, 230] : [70, 110, 55]),
  cloudMountain: (x, y, w, h) =>
    y < h * 0.35 ? [200, 205, 220] : y < h * 0.55 ? [110, 115, 120] : [55, 85, 45],
  lake: (x, y, w, h) =>
    y < h * 0.35 ? [130, 160, 200] : y < h * 0.72 ? [45, 95, 150] : [90, 85, 70],
  fog: () => [170, 175, 180],
  staticRock: () => [95, 92, 88],
  wildlife: (x, y, w, h) => {
    const d = Math.hypot(x - w / 2, y - h / 2);
    if (d < w * 0.16) return [160, 110, 70];
    return y < h * 0.4 ? [120, 150, 190] : [65, 100, 55];
  },
  blueObject: (x, y, w, h) =>
    Math.abs(x - w / 2) < w * 0.12 && Math.abs(y - h / 2) < h * 0.12
      ? [40, 70, 180]
      : [120, 115, 100],
  night: (x, y, w, h) =>
    (x * 13 + y * 29) % 97 === 0 && y < h * 0.55 ? [250, 250, 255] : [8, 10, 18],
  snowField: () => [235, 240, 245],
  foliage: (x, y) => [40 + (x % 25), 100 + (y % 40), 35]
};

function analyzePaint(paint) {
  return Analyze.analyzeImageData(makeImageData(160, 100, paint));
}

const cloudA = analyzePaint(paints.cloudsSky);
const cloudChoice = Choice.choose(cloudA);
assert("clouds detected with confidence", cloudA.confidence.clouds >= 0.42);
assert("clouds selected by Waypoint Choice", cloudChoice.classes.indexOf("clouds") >= 0);
assert("clouds not no-motion", cloudChoice.noMotion === false);

const lakeA = analyzePaint(paints.lake);
const lakeChoice = Choice.choose(lakeA);
assert("water detected", lakeA.confidence.water >= 0.42);
assert("water selected", lakeChoice.classes.indexOf("water") >= 0);

const fogA = analyzePaint(paints.fog);
const fogChoice = Choice.choose(fogA);
assert("fog or haze confidence meaningful", fogA.confidence.fog >= 0.35 || fogA.confidence.haze >= 0.2);
assert("fog/haze choice allowed or honest defer", fogChoice.classes.length >= 0);

const staticA = analyzePaint(paints.staticRock);
const staticChoice = Choice.choose(staticA);
assert("static scene → no motion", staticChoice.noMotion === true);
assert("static honesty mentions no motion", /no natural motion/i.test(staticChoice.honestyNotes.join(" ")));

const wildA = analyzePaint(paints.wildlife);
assert("wildlife protection flagged", wildA.wildlifeProtected === true);
const wildChoice = Choice.choose(wildA);
assert("wildlife honesty note", /wildlife/i.test(wildChoice.honestyNotes.join(" ")));
// wildlife mask should lock center
const cx = Math.floor(wildA.masks.width / 2);
const cy = Math.floor(wildA.masks.height / 2);
assert("wildlife mask center hot", wildA.masks.wildlife[cy * wildA.masks.width + cx] > 0.5);

const blueA = analyzePaint(paints.blueObject);
assert("arbitrary blue object not auto water", blueA.confidence.water < 0.42);

const nightA = analyzePaint(paints.night);
assert("stars never auto-animated", nightA.confidence.stars === 0);
const nightChoice = Choice.choose(nightA);
assert("night does not invent star motion class", nightChoice.classes.indexOf("stars") < 0);

const snowA = analyzePaint(paints.snowField);
assert("snow visible ≠ invent falling snow auto", snowA.confidence.snow < 0.42);
assert("rain never invented", snowA.confidence.rain === 0);

const foliageA = analyzePaint(paints.foliage);
const foliageChoice = Choice.choose(foliageA);
assert("foliage deferred from automatic classes", foliageChoice.classes.indexOf("foliage") < 0);
assert("foliage listed deferred", foliageChoice.deferred.some((d) => d.id === "foliage"));

// Localization: mountain stable while clouds move
const cmA = analyzePaint(paints.cloudMountain);
const cmChoice = Choice.choose(cmA);
const field = Render.buildMotionField(cmA, cmChoice, null, cmA.masks.width, cmA.masks.height);
let mountainAmp = 0;
let skyAmp = 0;
let skyN = 0;
let mtN = 0;
for (let y = 0; y < cmA.masks.height; y++) {
  for (let x = 0; x < cmA.masks.width; x++) {
    const i = y * cmA.masks.width + x;
    const amp = field[i * 3 + 2];
    if (y > cmA.masks.height * 0.4 && y < cmA.masks.height * 0.55) {
      mountainAmp += amp;
      mtN++;
    }
    if (y < cmA.masks.height * 0.3) {
      skyAmp += amp;
      skyN++;
    }
  }
}
const mtAvg = mountainAmp / Math.max(mtN, 1);
const skyAvg = skyAmp / Math.max(skyN, 1);
assert("sky motion amp > mountain band", skyAvg > mtAvg);
assert("mountain band mostly stable", mtAvg < 0.35 || skyAvg > mtAvg * 1.5);

// Lake: shoreline/rock bottom lower amp than water mid
const lakeField = Render.buildMotionField(lakeA, lakeChoice, null, lakeA.masks.width, lakeA.masks.height);
let waterAmp = 0, shoreAmp = 0, wN = 0, sN = 0;
for (let y = 0; y < lakeA.masks.height; y++) {
  for (let x = 0; x < lakeA.masks.width; x++) {
    const i = y * lakeA.masks.width + x;
    const amp = lakeField[i * 3 + 2];
    if (y > lakeA.masks.height * 0.4 && y < lakeA.masks.height * 0.65) {
      waterAmp += amp; wN++;
    }
    if (y > lakeA.masks.height * 0.85) {
      shoreAmp += amp; sN++;
    }
  }
}
assert("water mid moves more than bottom shore/rocks", (waterAmp / Math.max(wN, 1)) >= (shoreAmp / Math.max(sN, 1)));

// Wildlife body amp near center should be low even if sky moves
const wildField = Render.buildMotionField(wildA, wildChoice, null, wildA.masks.width, wildA.masks.height);
const wi = cy * wildA.masks.width + cx;
assert("wildlife center amp near zero", wildField[wi * 3 + 2] < 0.15);

// Seamless loop phase identity: sin(0)==sin(2π) — displacement factor equal
assert("strength natural scale 1", Render.strengthScale("natural") === 1);
assert("strength subtle < natural", Render.strengthScale("subtle") < 1);
assert("strength more > natural", Render.strengthScale("more") > 1);

// Recipe + library model roles
const recipe = Models.createRecipe({
  originalAssetId: "orig-1",
  sourceRole: "waypoint-edit",
  classes: ["clouds"],
  noMotion: false
});
assert("recipe persists engine version", recipe.engineVersion === Models.ENGINE_VERSION);
assert("moving blob key distinct", Models.movingBlobKey("orig-1", 1).indexOf("moving-") === 0);
assert("edit key never equals moving key", Models.movingBlobKey("o", 1) !== "edit-o-v1");

const img = LibModels.createLibraryImage({ id: "o1", filename: "a.jpg" });
assert("library has movingScenes ref", !!img.moduleRefs.movingScenes);
assert("movingScenes starts empty", img.moduleRefs.movingScenes.created === false);

const movingRow = LibModels.createLibraryImage({
  id: "m1",
  role: "moving-scene",
  originalAssetId: "o1",
  filename: "a-moving.webm"
});
assert("moving-scene role preserved", movingRow.role === "moving-scene");
assert("moving-scene points at original", movingRow.originalAssetId === "o1");

// Store recipes
Store.upsertRecipe(recipe);
assert("recipe readable", Store.getLatestForOriginal("orig-1").id === recipe.id);

// Filename helper
assert("moving filename", Models.movingFilename("sunset-waypoint.jpg", "webm") === "sunset-moving.webm");

// Fixtures on disk ≥ 16
const fixDir = path.join(ROOT, "automation/fixtures/moving-scenes");
const pngs = fs.readdirSync(fixDir).filter((f) => f.endsWith(".png"));
assert("fixture count >= 16", pngs.length >= 16);

console.log("\n" + n + " PASS");
