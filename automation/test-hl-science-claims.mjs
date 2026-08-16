#!/usr/bin/env node
/**
 * Science-claim / epistemic honesty tests for Hidden Landscapes
 */
import fs from "fs";
import path from "path";
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

const modes = JSON.parse(fs.readFileSync(path.join(HL, "data/modes.json"), "utf8"));
const species = JSON.parse(fs.readFileSync(path.join(HL, "data/species.json"), "utf8"));
const auditPath = path.join(ROOT, "docs/rebuild-2026/scenes-v1-hidden-landscapes/SCIENCE-AUDIT.md");
assert("science audit exists", fs.existsSync(auditPath));
const audit = fs.readFileSync(auditPath, "utf8");

const banned = [
  /this is an ultraviolet photograph/i,
  /true infrared capture from rgb/i,
  /thermal image of your photo/i,
  /exactly what a deer sees/i,
  /exactly what your dog sees/i
];

const corpus = JSON.stringify(modes) + JSON.stringify(species) +
  fs.readFileSync(path.join(HL, "index.html"), "utf8") +
  fs.readFileSync(path.join(HL, "js/hl-ui.js"), "utf8") +
  fs.readFileSync(path.join(HL, "js/hl-animal.js"), "utf8");

banned.forEach((re, i) => assert("banned claim " + i, !re.test(corpus)));

assert("epistemic vocabulary in modes", (modes.epistemicLabels || []).length === 5);
["measured", "computed", "simulated", "inferred", "unavailable"].forEach((id) => {
  assert("label " + id, modes.epistemicLabels.some((e) => e.id === id));
});

const depth = modes.pillars.find((p) => p.id === "structure")
  .views.find((v) => v.id === "estimated-depth");
assert("depth inferred", depth.epistemic === "inferred");
assert("depth copy says inferred", /INFERRED|inferred/i.test(depth.what + depth.short));

const bee = modes.pillars.find((p) => p.id === "animal")
  .views.find((v) => v.id === "bee-uv");
assert("bee unavailable epistemic", bee.epistemic === "unavailable");

assert("audit covers luminance", /luminance/i.test(audit));
assert("audit covers animal", /deer|canine/i.test(audit));
assert("audit covers UV", /ultraviolet|UV/i.test(audit));

// Dormant creative IR not claimed as capture
const dormant = fs.readFileSync(path.join(HL, "dormant/transformations.json"), "utf8");
assert("dormant exists for history", /infrared-dream/.test(dormant));
assert("production modes exclude infrared-dream",
  !modes.pillars.some((p) => (p.views || []).some((v) => v.id === "infrared-dream")));

console.log("\nScience-claim tests passed:", n);
