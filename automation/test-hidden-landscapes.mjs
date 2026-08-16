#!/usr/bin/env node
/**
 * Hidden Landscapes — analysis, epistemic, luminance, privacy, export naming
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HL = path.join(ROOT, "apps/hidden-landscapes");

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

function load(rel, sandbox) {
  const code = fs.readFileSync(path.join(HL, rel), "utf8");
  vm.runInNewContext(code, sandbox, { filename: rel });
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

const sandbox = {
  window: {},
  globalThis: {},
  console,
  Math,
  Uint8ClampedArray,
  Float32Array,
  ImageData: FakeImageData,
  document: {
    createElement: function () {
      return {
        width: 0,
        height: 0,
        style: {},
        getContext: function () {
          return {
            drawImage: function () {},
            getImageData: function (x, y, w, h) {
              return new FakeImageData(new Uint8ClampedArray(w * h * 4), w, h);
            },
            putImageData: function () {}
          };
        }
      };
    }
  },
  URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

load("js/hl-models.js", sandbox);
load("js/hl-color.js", sandbox);
load("js/hl-analyze.js", sandbox);
load("js/hl-animal.js", sandbox);
load("js/hl-discoveries.js", sandbox);
load("js/hl-export.js", sandbox);

const Models = sandbox.WaypointHLModels;
const Color = sandbox.WaypointHLColor;
const Analyze = sandbox.WaypointHLAnalyze;
const Animal = sandbox.WaypointHLAnimal;
const Disc = sandbox.WaypointHLDiscoveries;

assert("models loaded", !!Models);
assert("defaults original", Models.analysisDefaultsToOriginal() === true);
assert("epistemic simulated label", Models.epistemic("simulated").label === "SIMULATED");
assert(
  "export name includes SIMULATED",
  Models.exportBasename("forest.jpg", "deer", "simulated").includes("SIMULATED")
);

const modes = JSON.parse(fs.readFileSync(path.join(HL, "data/modes.json"), "utf8"));
assert("four pillars", modes.pillars.length === 4);
assert("pillar ids", modes.pillars.map((p) => p.id).join(",") === "light,color,structure,animal");
assert("mission honesty", /never uploaded|local/i.test(modes.privacyNote));
assert("UV unavailable listed", modes.spectralUnavailable.some((s) => s.id === "ultraviolet"));
assert("IR unavailable listed", modes.spectralUnavailable.some((s) => s.id === "infrared"));
assert("thermal unavailable listed", modes.spectralUnavailable.some((s) => s.id === "thermal"));

const Yw = Color.relativeLuminance(255, 255, 255);
const Ym = Color.relativeLuminance(128, 128, 128);
const Yb = Color.relativeLuminance(0, 0, 0);
assert("luminance ordering", Yw > Ym && Ym > Yb);
assert("white near 1", Yw > 0.99);
assert("black near 0", Yb < 0.01);

const w = 64;
const h = 48;
const data = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (y < 8) {
      data[i] = 40; data[i + 1] = 40; data[i + 2] = 220; data[i + 3] = 255;
    } else if (x < w / 2) {
      data[i] = 30; data[i + 1] = 160; data[i + 2] = 40; data[i + 3] = 255;
    } else {
      data[i] = 200; data[i + 1] = 40; data[i + 2] = 40; data[i + 3] = 255;
    }
  }
}
const imgData = new FakeImageData(data, w, h);
const lum = Analyze.luminanceBuffer(imgData);
assert("lum buffer length", lum.length === w * h);
const tonal = Analyze.analyzeTonal(lum, w, h);
assert("tonal histogram 32", tonal.histogram.length === 32);
const color = Analyze.analyzeColor(imgData);
assert("color families present", color.ranked.length >= 3);
assert("green or red among top", color.families.green > 0 && color.families.red > 0);

const deer = Animal.simulateSpecies(imgData, "deer");
assert("deer ok", deer.status === "ok");
assert("deer simulated", deer.epistemic === "simulated");
assert("deer label", /SIMULATED DEER/i.test(deer.label));
assert("deer changes pixels", deer.imageData.data[0] !== undefined);

const canine = Animal.simulateSpecies(imgData, "canine");
assert("canine ok", canine.status === "ok");
assert("canine label", /SIMULATED CANINE/i.test(canine.label));

const bee = Animal.simulateSpecies(imgData, "bee-uv");
assert("bee unavailable", bee.status === "unavailable");
assert("bee no invented UV pixels", bee.imageData === null);
assert("bee message UV", /ultraviolet|UV/i.test(bee.message));

const bird = Animal.simulateSpecies(imgData, "bird-uv");
assert("bird unavailable", bird.status === "unavailable");

const red = Color.simulateDichromatRgb(220, 40, 40, "deer");
const green = Color.simulateDichromatRgb(30, 180, 40, "deer");
const humanSep = Math.abs(220 - 30);
const simSep = Math.abs(red[0] - green[0]);
assert("deer reduces coarse R channel gap vs green sample", simSep < humanSep);

const discoveries = Disc.buildDiscoveries(
  {
    tonal: tonal,
    color: color,
    regions: { brightest: { x: 0, y: 0, w: 8, h: 8 }, edgeDense: { x: 10, y: 10, w: 8, h: 8 } }
  },
  deer,
  "animal",
  "deer"
);
assert("discoveries non-empty", discoveries.length >= 1);
assert("no UV invented claim", !discoveries.some((d) => /true ultraviolet photo/i.test(d.text)));

const animalSrc = fs.readFileSync(path.join(HL, "js/hl-animal.js"), "utf8");
assert("no css filter in animal", !/filter\s*:\s*|css\s*filter/i.test(animalSrc));
const colorSrc = fs.readFileSync(path.join(HL, "js/hl-color.js"), "utf8");
assert("LMS path present", /xyzToLmsHpe|simulateDichromatRgb/.test(colorSrc));

const html = fs.readFileSync(path.join(HL, "index.html"), "utf8");
assert("local privacy copy", /never uploaded/i.test(html));
assert("no cloud vision API", !/vision\.googleapis|openai\.com\/v1\/vision/i.test(html));
assert("library scripts present", /photo-library-client/.test(html));
assert("dormant transforms not in index", !/hl-transforms\.js/.test(html));
assert("old creative modes not in modes.json", !/infrared-dream/.test(JSON.stringify(modes)));

console.log("\nHidden Landscapes tests passed:", n);
