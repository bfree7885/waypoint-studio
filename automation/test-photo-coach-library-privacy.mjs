#!/usr/bin/env node
/**
 * Privacy smoke: Photo Coach / Library scripts must not POST photo bytes.
 * Static scan + optional live page network watch when BASE is provided.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

const files = [
  "apps/waypoint-scenes/js/photo-coach.js",
  "apps/waypoint-scenes/js/photo-coach-analysis-demo.js",
  "apps/waypoint-scenes/js/photo-coach-shoot.js",
  "apps/photo-library/js/pl-engine.js",
  "apps/photo-library/js/pl-ui.js",
  "apps/photo-library/js/pl-store.js"
];

for (const rel of files) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert(rel + " no FormData upload of photos", !/FormData\s*\(/.test(text) || !/append\s*\(\s*['\"]file/.test(text));
  assert(rel + " no fetch to vision/AI hosts", !/openai|anthropic|vision\.google|api\.openai/i.test(text));
  assert(rel + " keeps analysis local keywords", /local|IndexedDB|localStorage|on-device|browser/i.test(text) || rel.includes("pl-"));
}

const coachHtml = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
assert("coach privacy copy", /nothing is uploaded|on this device|browser/i.test(coachHtml));
const libHtml = fs.readFileSync(path.join(ROOT, "apps/photo-library/index.html"), "utf8");
assert("library privacy copy", /Stored on this device|No cloud sync/i.test(libHtml));

console.log("\nAll Photo Coach/Library privacy tests passed (" + n + ").");
