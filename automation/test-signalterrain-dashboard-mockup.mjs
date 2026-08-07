#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "side-trails/signalterrain/mockups/dashboard.html",
  "side-trails/signalterrain/mockups/screenshots.html",
  "design-system/css/wds-signalterrain-dashboard-mockup.css",
  "docs/product/signalterrain-dashboard-mockup-owner-review.md",
  "assets/images/signalterrain/mockups/dashboard-full.svg",
  "assets/images/signalterrain/mockups/what-changed-today.svg",
  "assets/images/signalterrain/mockups/world-attack-map.svg",
  "assets/images/signalterrain/mockups/priorities-actors-news.svg"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/signalterrain/mockups/dashboard.html");
assert.match(html, /What changed today\?/);
assert.match(html, /Current Threat Level/);
assert.match(html, /Latest Attacks/);
assert.match(html, /Zero-Day Activity/);
assert.match(html, /Ransomware Campaigns/);
assert.match(html, /CISA KEV Updates/);
assert.match(html, /Vendor Advisories/);
assert.match(html, /World Attack Map/);
assert.match(html, /Timeline/);
assert.match(html, /Newest Threat Actors/);
assert.match(html, /Today's Defensive Priorities/);
assert.match(html, /Recent CVEs/);
assert.match(html, /Critical Infrastructure Alerts/);
assert.match(html, /Latest Cyber News/);
assert.match(html, /Sample data/i);
assert.match(html, /Mockup only/i);
assert.doesNotMatch(html, /\bAI[- ]powered\b|\bAI suggests\b|\bour AI\b/i);
assert.doesNotMatch(html, /<script(?![^>]*application\/ld\+json)/i);

console.log("SignalTerrain dashboard mockup checks passed.");
