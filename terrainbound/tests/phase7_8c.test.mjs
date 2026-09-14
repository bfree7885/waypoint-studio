#!/usr/bin/env node
/**
 * TerrainBound Phase 7.8C — mobile responsive correction.
 * Run: node terrainbound/tests/phase7_8c.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hitTestRegion } from "../js/worldmap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failures.push(name);
    console.error("FAIL  " + name);
    console.error("  " + (err.stack || err.message));
  }
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const mapJs = fs.readFileSync(path.join(root, "js/worldmap.js"), "utf8");

check("viewport includes viewport-fit=cover for safe-area", () => {
  assert.match(html, /viewport-fit=cover/);
});

check("world map uses a 3/2 frame instead of a shrinking two-column grid on mobile", () => {
  assert.match(html, /class="atlas-map-frame"/);
  assert.match(css, /aspect-ratio:\s*3\s*\/\s*2/);
  assert.match(css, /@media \(max-width: 720px\)/);
  const mobile = css.slice(css.indexOf("@media (max-width: 720px)"));
  assert.match(mobile, /flex-direction:\s*column/);
  assert.match(mobile, /grid-template-columns:\s*none/);
  assert.doesNotMatch(html, /PUZZLE-CURRICULUM-ARCHITECTURE/);
});

check("atlas canvas is sized to its layout box", () => {
  assert.match(gameJs, /function sizeAtlasCanvas/);
  assert.match(gameJs, /requestAnimationFrame\(\(\) => renderAtlas\(\)\)/);
  assert.match(mapJs, /const px = w \/ Math\.max\(cssW, 1\)/);
});

check("mobile HUD dock keeps Look closer out of World map and Field tablet", () => {
  assert.match(html, /class="hud-dock"/);
  assert.match(html, /id="inspect-prompt" class="inspect-prompt"/);
  assert.match(html, /<button type="button" id="inspect-prompt"/);
  const hud = css.slice(css.indexOf("@media (max-width: 900px)"));
  assert.match(hud, /\.inspect-prompt/);
  assert.match(hud, /position:\s*static/);
  assert.match(hud, /min-height:\s*44px/);
  assert.match(hud, /\.map-toggle/);
  assert.match(hud, /\.journal-toggle/);
});

check("field note and other cards can scroll without horizontal overflow", () => {
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /\.dialogue-card[\s\S]*max-height/);
  assert.match(css, /100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /#dialogue-actions[\s\S]*position:\s*sticky/);
  const hud = css.slice(css.indexOf("@media (max-width: 900px)"));
  assert.match(hud, /:has\(#dialogue:not\(\[hidden\]\)\)/);
  assert.match(hud, /\.hud-dock/);
  assert.match(hud, /visibility:\s*hidden/);
});

check("inspect prompt remains a reachable control", () => {
  assert.match(gameJs, /#inspect-prompt/);
  assert.match(gameJs, /inspectTarget\(currentTarget\(\)\)/);
});

check("desktop two-column atlas layout remains for large screens", () => {
  assert.match(css, /max-width: 1366px/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) min\(16rem, 34%\)/);
});

check("hit testing still maps client pixels onto the canvas", () => {
  const canvas = { width: 720, height: 480, getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 240 }) };
  const world = {
    regions: [{ id: "cedar-hollow", map: { x: 50, y: 50 } }]
  };
  const hit = hitTestRegion(world, canvas, 180, 120);
  assert.equal(hit?.id, "cedar-hollow");
  assert.equal(hitTestRegion(world, canvas, 10, 10), null);
});

check("retired app, DNS, and curriculum architecture stay out of this pass", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /waypointstudio\.org|Terrainbound is retired/i);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.doesNotMatch(html, /terrainbound\.org/);
  assert.doesNotMatch(html, /\?field=1/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.8C checks passed.");
