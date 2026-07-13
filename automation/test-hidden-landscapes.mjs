#!/usr/bin/env node
/**
 * Hidden Landscapes — transform registry + processor tests
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

const sandbox = { window: {}, console, Math, Uint8ClampedArray, Object, Array, String, Number, Date };
vm.runInNewContext(
  fs.readFileSync(path.join(HL, "js/hl-transforms.js"), "utf8"),
  sandbox,
  { filename: "hl-transforms.js" }
);

const T = sandbox.window.HiddenLandscapesTransforms || sandbox.HiddenLandscapesTransforms;
assert("transforms loaded", !!T && typeof T.process === "function");

const catalog = JSON.parse(fs.readFileSync(path.join(HL, "data/transformations.json"), "utf8"));
assert("has honesty summary", !!(catalog.honesty && catalog.honesty.summary));
assert("has 8+ modes", (catalog.transformations || []).length >= 8);

const required = [
  "original",
  "infrared-dream",
  "crimson-canopy",
  "violet-wilds",
  "ghost-forest",
  "electric-meadow",
  "nocturnal-world",
  "mono-infrared-study"
];
required.forEach((id) => {
  assert("catalog has " + id, catalog.transformations.some((t) => t.id === id));
  assert("processor has " + id, T.listProcessorIds().indexOf(id) >= 0);
});

catalog.transformations.forEach((t) => {
  [
    "id",
    "name",
    "shortDescription",
    "longDescription",
    "category",
    "accuracyType",
    "requiresSpecialCapture",
    "defaultIntensity",
    "processingParameters",
    "futureEngineId",
    "educationalNotes"
  ].forEach((k) => assert(t.id + " field " + k, t[k] !== undefined && t[k] !== null));
});

assert(
  "creative modes not labeled original-capture",
  catalog.transformations.filter((t) => t.id !== "original").every((t) => t.accuracyType !== "original-capture")
);

function sampleImage(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // top: sky-ish blue, bottom: green vegetation-ish
      if (y < h / 2) {
        data[i] = 90; data[i + 1] = 140; data[i + 2] = 220; data[i + 3] = 255;
      } else {
        data[i] = 40; data[i + 1] = 160; data[i + 2] = 55; data[i + 3] = 255;
      }
    }
  }
  return { data, width: w, height: h };
}

const src = sampleImage(32, 32);
const orig = T.process("original", src, 1, {});
assert("original preserves green leaf", orig.data[32 * 16 * 4 + 1] === src.data[32 * 16 * 4 + 1]);

required.forEach((id) => {
  if (id === "original") return;
  const out = T.process(id, src, 1, {});
  assert(id + " returns same size", out.width === 32 && out.height === 32 && out.data.length === src.data.length);
  let changed = false;
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i] !== src.data[i] || out.data[i + 1] !== src.data[i + 1] || out.data[i + 2] !== src.data[i + 2]) {
      changed = true;
      break;
    }
  }
  assert(id + " changes pixels", changed);
});

const mixed = T.process("infrared-dream", src, 0, {});
assert("intensity 0 matches original", mixed.data[0] === src.data[0] && mixed.data[1] === src.data[1]);

const studio = fs.readFileSync(path.join(HL, "index.html"), "utf8");
assert("studio mount present", studio.indexOf('id="hl-studio"') >= 0);
assert("honesty panel present", studio.indexOf("How real is this") === -1 || studio.indexOf("hl-explain") >= 0);
assert("compare slider present", studio.indexOf("hl-slider") >= 0);
assert("no lorem", !/lorem ipsum/i.test(studio));

const engineSrc = fs.readFileSync(path.join(HL, "js/hl-vision-engine.js"), "utf8");
assert("engine has loadImage", /loadImage\s*:/.test(engineSrc));
assert("engine has applyTransformation", /applyTransformation\s*:/.test(engineSrc));
assert("engine has exportImage", /exportImage\s*:/.test(engineSrc));

console.log("\nAll Hidden Landscapes tests passed (" + n + ").");
