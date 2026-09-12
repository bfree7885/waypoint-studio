#!/usr/bin/env node
/**
 * Global Watch Studio bridge — Support/Deck discovery; LOCAL launch labeled honestly.
 * Legacy /side-trails/ JSON registry is unlisted and must not be required for discovery.
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
  "support.html",
  "side-trails/waypoint-deck/index.html",
  "side-trails/global-watch/index.html",
  "data/side-trails/catalog.json",
  "docs/PRODUCT-DIRECTION.md",
  "docs/global-watch-studio-bridge.md",
]) {
  assert.ok(exists(rel), "missing " + rel);
}

const support = read("support.html");
assert.match(support, /side-trails\/global-watch\//);
assert.match(support, /Global Watch/);
assert.match(support, /local host required|Local field test|LOCAL|127\.0\.0\.1:4173/i);
assert.match(support, /Temporary field-test discovery/i);

const deck = read("side-trails/waypoint-deck/index.html");
assert.match(deck, /global-watch\//);
assert.match(deck, /Global Watch/);
assert.match(deck, /127\.0\.0\.1:4173/);

const gw = read("side-trails/global-watch/index.html");
assert.match(gw, /noindex/i);
assert.match(gw, /127\.0\.0\.1:4173/);
assert.match(gw, /local field-test host|Local field test|local host|LOCAL/i);
assert.match(gw, /not publicly hosted/i);
assert.doesNotMatch(gw, /production-hardened|operationally authoritative cloud/i);

const home = read("index.html");
assert.doesNotMatch(home, /href=["'][^"']*side-trails\/["']/);
assert.doesNotMatch(home, /Global Watch/i);

const nav = read("design-system/ecosystem/nav-registry.json");
assert.doesNotMatch(nav, /global-watch/i);
assert.doesNotMatch(nav, /"label":\s*"Side Trails"/);
assert.match(nav, /waypoint-deck/);

const catalog = JSON.parse(read("data/side-trails/catalog.json"));
assert.ok(catalog.projects.some((p) => p.id === "global-watch"));
const gwCat = catalog.projects.find((p) => p.id === "global-watch");
assert.match(String(gwCat.url), /127\.0\.0\.1:4173|global-watch/i);

console.log("Global Watch visible-launch checks passed (Support + Deck → LOCAL bridge).");
