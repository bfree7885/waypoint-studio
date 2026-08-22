#!/usr/bin/env node
/**
 * Animal Vision (under Hidden Landscapes) — species + science-claim tests
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HL = path.join(ROOT, "apps/hidden-landscapes");
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

function load(rel, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(HL, rel), "utf8"), sandbox, { filename: rel });
}

const species = JSON.parse(fs.readFileSync(path.join(HL, "data/species.json"), "utf8"));
assert("disclaimer simulation", /simulation|approximate/i.test(species.disclaimer));
assert("display limitation", /RGB monitor|human RGB/i.test(species.displayLimitation));
assert("exactly two shipped", species.shipped.length === 2);
assert("deer shipped", species.shipped.some((s) => s.id === "deer"));
assert("canine shipped", species.shipped.some((s) => s.id === "canine"));
assert("bee deferred", species.deferred.some((s) => s.id === "honeybee"));
assert("bird deferred", species.deferred.some((s) => s.id === "bird"));
assert("no exact vision marketing", !/exactly what a deer sees|true animal vision/i.test(JSON.stringify(species)));

for (const sp of species.shipped) {
  assert(sp.id + " has citations", (sp.citations || []).length >= 2);
  assert(sp.id + " has whatChanged", (sp.whatChanged || []).length >= 3);
  assert(sp.id + " cannotClaim", (sp.cannotClaim || []).length >= 2);
  assert(sp.id + " UV unavailable in whatChanged",
    sp.whatChanged.some((w) => /ultraviolet|UV/i.test(w.aspect + w.change)));
}

const citations = JSON.parse(fs.readFileSync(path.join(HL, "data/research-citations.json"), "utf8"));
assert("citations present", citations.citations.length >= 5);
assert("jacobs deer", citations.citations.some((c) => c.id === "jacobs-1994-deer"));
assert("neitz dog", citations.citations.some((c) => c.id === "neitz-1989-dog"));
assert("brettel method", citations.citations.some((c) => c.id === "brettel-1997-dichromat"));

const sandbox = {
  window: {},
  globalThis: {},
  console,
  Math,
  Uint8ClampedArray,
  ImageData: class ImageData {
    constructor(data, w, h) {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
load("js/hl-color.js", sandbox);
load("js/hl-animal.js", sandbox);

const Animal = sandbox.WaypointHLAnimal;
const data = new Uint8ClampedArray(16);
for (let i = 0; i < 16; i += 4) {
  data[i] = 200; data[i + 1] = 30; data[i + 2] = 30; data[i + 3] = 255;
}
const img = new sandbox.ImageData(data, 2, 2);
const deer = Animal.simulateSpecies(img, "deer");
assert("transform not identity-ish", deer.imageData.data[0] !== 200 || deer.imageData.data[1] !== 30);
assert("bee unavailable educational", Animal.simulateSpecies(img, "bee-uv").status === "unavailable");

// Redirect app
const avHtml = fs.readFileSync(path.join(AV, "index.html"), "utf8");
assert("animal-vision redirects to HL", /hidden-landscapes\/\?pillar=animal/.test(avHtml));

console.log("\nAnimal Vision tests passed:", passed);
