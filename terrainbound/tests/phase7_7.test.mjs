#!/usr/bin/env node
/**
 * TerrainBound Phase 7.7 — meadow + walk freeze, root-hosting readiness.
 * Run: node terrainbound/tests/phase7_7.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_STATES, WALK_READABLE, poseFromIntent } from "../js/character.js";
import { MEADOW_MARK } from "../js/density.js";
import { SAVE_VERSION, migrateSave } from "../js/save.js";
import { createMasteryState, regionMastered, simulateMastery } from "../js/mastery.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";

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
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const charJs = fs.readFileSync(path.join(root, "js/character.js"), "utf8");
const densityJs = fs.readFileSync(path.join(root, "js/density.js"), "utf8");
const worldJs = fs.readFileSync(path.join(root, "js/world.js"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const hcProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/high-country.json"), "utf8"));
const sfProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/sunfall-desert.json"), "utf8"));
const tbWorld = loadWorld(JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8")));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const curriculum = loadCurriculumMap(JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8")));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const studioCname = fs.readFileSync(path.join(repoRoot, "CNAME"), "utf8").trim();

check("High Country mastery unchanged", () => {
  assert.deepEqual(
    hcProfile.competencies.map((item) => item.id),
    ["location", "scale", "elevation", "contours", "gradient", "profile", "gis", "remote", "decision", "spatial", "representation"]
  );
  const mastery = createMasteryState();
  simulateMastery(hcProfile, mastery, "high-country");
  assert.equal(regionMastered(hcProfile, mastery), true);
});

check("Sunfall mastery unchanged", () => {
  assert.deepEqual(
    sfProfile.competencies.map((item) => item.id),
    ["rotation", "seasons", "orbit", "math-orbit", "moon", "eclipses", "data", "prediction", "model"]
  );
  const mastery = createMasteryState();
  simulateMastery(sfProfile, mastery, "sunfall-desert");
  assert.equal(regionMastered(sfProfile, mastery), true);
});

check("walk states intact", () => {
  assert.equal(WALK_READABLE, true);
  for (const pose of ["idle", "walk", "inspect", "measure", "tablet", "talk", "sky"]) {
    assert.ok(CHARACTER_STATES.includes(pose), pose);
  }
  assert.equal(poseFromIntent({ moving: true, pose: "idle" }), "walk");
  assert.equal(poseFromIntent({ moving: false, pose: "walk" }), "walk");
  assert.match(charJs, /strideAmp/);
  assert.match(charJs, /leftLift/);
  assert.match(charJs, /armSwing/);
});

check("all region gates unchanged", () => {
  const worldState = createWorldState(tbWorld);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), true);
});

check("save v5 works", () => {
  assert.equal(SAVE_VERSION, 5);
  const migrated = migrateSave({ v: 4, player: { x: 8, y: 9, facing: 1 } });
  assert.equal(migrated.v, 5);
});

check("Dark Sky remains closed", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
});

check("no player-facing standards codes", () => {
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, null, [html]);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.doesNotMatch(html, /NYS|NYSSLS|MS-ESS|HS-ESS/i);
});

check("no death / XP / health", () => {
  assert.doesNotMatch(html, /\bXP\b|\bhealth\b|\bGAME OVER\b/i);
  assert.doesNotMatch(gameJs, /\bhealth\b|\blives\b|\bGAME OVER\b|\bXP\b/);
});

check("production paths work at root deployment configuration", () => {
  assert.match(html, /href="\.\/css\/game\.css"/);
  assert.match(html, /src="\.\/js\/main\.js\?v=p7[78]c?"/);
  assert.match(mainJs, /game\.js\?v=p7[78]c?/);
  assert.match(gameJs, /fetch\("\.\/data\//);
  assert.doesNotMatch(gameJs, /fetch\("\/terrainbound\//);
  assert.doesNotMatch(html, /href="\/terrainbound\//);
  assert.doesNotMatch(html, /\?field=1/);
  assert.equal(studioCname, "waypointstudio.org");
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.match(densityJs, /bakeRidgeMeadow/);
  assert.equal(MEADOW_MARK, "ridge-meadow-v77");
  assert.match(worldJs, /stake-detail/);
});

check("apps/terrainbound/ untouched", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.7 checks passed.");
