#!/usr/bin/env node
/**
 * Discontinued SignalTerrain public identity.
 * Engineering assets remain; public HTML is a silent redirect.
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
  "design-system/css/wds-signalterrain-dashboard.css",
  "apps/signalterrain/js/signalterrain-models.js"
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const html = read("side-trails/signalterrain/index.html");
assert.match(html, /noindex/i);
assert.match(html, /location\.replace/);
assert.doesNotMatch(html, /SignalTerrain|Side Trails/);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.equal(catalog.projects.some((p) => p.id === "signalterrain"), false);

console.log("SignalTerrain public routing checks passed.");
