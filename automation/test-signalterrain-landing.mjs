#!/usr/bin/env node
/**
 * SignalTerrain public landing smoke checks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

for (const rel of [
  "side-trails/signalterrain/index.html",
  "design-system/css/wds-signalterrain-landing.css",
  "docs/side-trails/signalterrain-landing.md",
  "docs/product/signalterrain-landing-owner-review.md",
  "assets/images/signalterrain/landing/threat-map.svg",
  "assets/images/signalterrain/landing/attack-timeline.svg",
  "assets/images/signalterrain/landing/global-activity.svg",
  "assets/images/signalterrain/landing/defensive-posture.svg"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/signalterrain/index.html");
assert.match(html, /Observe invisible signals\./);
assert.match(html, /Adaptive cyber intelligence for modern defenders\./);
assert.match(html, /Current Threat Climate/);
assert.match(html, /Why Traditional Dashboards Fail/);
assert.match(html, /Adaptive Defense/);
assert.match(html, /How SignalTerrain Works/);
assert.match(html, /Threat Intelligence Sources/);
assert.match(html, /Roadmap/);
assert.match(html, /Part of Side Trails\./);
assert.match(html, /threat-map\.svg/);
assert.match(html, /attack-timeline\.svg/);
assert.match(html, /global-activity\.svg/);
assert.match(html, /defensive-posture\.svg/);
assert.doesNotMatch(html, /maplibre|cyber\/live|wds-signalterrain-cyber/i);
assert.doesNotMatch(html, /Open today’s cyber brief|SIEM console/i);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
const signal = catalog.projects.find((p) => p.id === "signalterrain");
assert.ok(signal);
assert.equal(signal.url, "side-trails/signalterrain/");

console.log("SignalTerrain landing checks passed.");
