#!/usr/bin/env node
/**
 * Regression: ban user-facing scaffold / placeholder wording in production app UI JS+HTML.
 * Docs, comments, and form placeholder= attributes are out of scope.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SCAN = [
  "apps/foragecast/js/foragecast-home.js",
  "apps/foragecast/js/foragecast-model.js",
  "apps/foragecast/js/foragecast-prediction.js",
  "apps/photo-coach/js/photo-coach-conditions.js",
  "apps/scenes/js/photo-coach-shoot.js",
  "apps/hidden-landscapes/index.html",
  "apps/hidden-landscapes/gallery.html",
  "apps/hidden-landscapes/learn.html",
  "apps/photo-library/index.html",
  "apps/dashboard/index.html"
];

const BANNED = [
  /Coming next/i,
  /This page is a placeholder/i,
  /Scaffold only/i,
  /TODO\(/,
  /educational video · placeholder/i,
  /Placeholder model/i,
  /Placeholder values from local JSON/i,
  />Future</,
  /\|\| \"Future\"/
];

let failed = 0;
for (const rel of SCAN) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error("FAIL missing", rel);
    failed += 1;
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  for (const re of BANNED) {
    if (re.test(text)) {
      console.error("FAIL", rel, "matches", String(re));
      failed += 1;
    }
  }
  console.log("PASS scan", rel);
}

if (failed) {
  console.error("\nQC copy tests failed (" + failed + ").");
  process.exit(1);
}
console.log("\nAll QC copy tests passed.");
