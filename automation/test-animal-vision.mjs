#!/usr/bin/env node
/**
 * Animal Vision — unit tests (species config + transform registry + export naming)
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AV = path.join(ROOT, "apps/animal-vision");

let passed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  passed += 1;
}

function loadScript(rel, sandbox) {
  const code = fs.readFileSync(path.join(AV, rel), "utf8");
  vm.runInNewContext(code, sandbox, { filename: rel });
}

const species = JSON.parse(fs.readFileSync(path.join(AV, "data/species.json"), "utf8"));
assert("config version", species.version === 1);
assert("exactly three MVP species", species.species.length === 3);
assert("disclaimer present", /research-informed educational visualization/i.test(species.disclaimer));
assert("privacy note", /never uploaded/i.test(species.privacyNote));

const ids = species.species.map((s) => s.id).sort();
assert(
  "MVP ids",
  ids.join(",") === "eastern-box-turtle,honeybee,white-tailed-deer"
);

for (const sp of species.species) {
  assert(sp.id + " has scientificName", !!sp.scientificName);
  assert(sp.id + " has transform.id", !!(sp.transform && sp.transform.id));
  assert(sp.id + " has educationalNotes", (sp.educationalNotes || []).length >= 2);
  assert(sp.id + " has cannotRepresent", (sp.cannotRepresent || []).length >= 2);
  assert(sp.id + " has photographyInspiration", (sp.photographyInspiration || []).length >= 2);
  assert(sp.id + " has filenameSlug", !!sp.filenameSlug);
}

assert(
  "no exact-vision marketing in config",
  !/exactly what|true animal vision|scientifically exact/i.test(JSON.stringify(species))
);

const sandbox = {
  window: {},
  globalThis: {},
  ImageData: class ImageData {
    constructor(data, w, h) {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  },
  Uint8ClampedArray,
  Math,
  console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

loadScript("js/animal-vision-export.js", sandbox);
loadScript("js/animal-vision-transforms.js", sandbox);

const Export = sandbox.WaypointAnimalVision.export;
assert(
  "filename example shape",
  Export.buildFilename("forest.jpg", "deer", "jpg") === "forest_deer_interpretation.jpg"
);

const T = sandbox.WaypointAnimalVision.transforms;
assert("deer transform registered", typeof T.registry["deer-dichromatic"] === "function");
assert("honeybee transform registered", typeof T.registry["honeybee-uv-inspired"] === "function");
assert("turtle transform registered", typeof T.registry["box-turtle-forest-floor"] === "function");

function makeImageData(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = 255;
  }
  return new sandbox.ImageData(data, w, h);
}

const sample = makeImageData(8, 8, [200, 40, 40]);
const deerOut = T._test.transformDeer(sample, species.species[0].transform.params);
assert("deer transform returns ImageData", deerOut && deerOut.width === 8);
assert("deer reduces red dominance", deerOut.data[0] < sample.data[0]);

const beeSample = makeImageData(8, 8, [220, 30, 30]);
const beeOut = T._test.transformHoneybee(beeSample, species.species[1].transform.params);
assert("honeybee attenuates red", beeOut.data[0] < beeSample.data[0]);

const turtleSample = makeImageData(8, 8, [90, 120, 70]);
const turtleOut = T._test.transformBoxTurtle(turtleSample, species.species[2].transform.params);
assert("turtle transform returns pixels", turtleOut.data[0] >= 0 && turtleOut.data[0] <= 255);

const html = fs.readFileSync(path.join(AV, "index.html"), "utf8");
assert("privacy banner in HTML", /av-privacy/.test(html));
assert("no remote upload endpoints in page scripts", !/fetch\([^)]*http/i.test(html));
assert("local processing modules referenced", /animal-vision-transforms\.js/.test(html));

const nav = JSON.parse(fs.readFileSync(path.join(ROOT, "design-system/ecosystem/nav-registry.json"), "utf8"));
const scenes = nav.apps.find((a) => a.id === "scenes");
assert("nav has animal-vision feature", scenes.features.some((f) => f.id === "animal-vision"));
assert("nav match includes animal-vision", scenes.match.includes("/apps/animal-vision"));

console.log("\nAll Animal Vision tests passed (" + passed + ").");
