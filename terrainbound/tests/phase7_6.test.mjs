#!/usr/bin/env node
/**
 * TerrainBound Phase 7.6 — world density + fieldwork readability.
 * Run: node terrainbound/tests/phase7_6.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_STATES, WALK_READABLE, poseFromIntent } from "../js/character.js";
import { DENSITY_MARK } from "../js/density.js";
import { desertNightColor } from "../js/world.js";
import { SAVE_VERSION, migrateSave } from "../js/save.js";
import { createMasteryState, regionMastered, simulateMastery } from "../js/mastery.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import {
  createFlumeState,
  runTrial,
  setFlumeSlope,
  setFlumeWater,
  setFlumePrediction,
  hasFairComparison
} from "../js/flume.js";
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
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const renderJs = fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const charJs = fs.readFileSync(path.join(root, "js/character.js"), "utf8");
const worldJs = fs.readFileSync(path.join(root, "js/world.js"), "utf8");
const densityJs = fs.readFileSync(path.join(root, "js/density.js"), "utf8");
const bible = fs.readFileSync(path.join(root, "docs/GAME-BIBLE.md"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const audit = fs.readFileSync(path.join(root, "docs/CONTENT-DENSITY-AUDIT.md"), "utf8");
const chProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const hcProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/high-country.json"), "utf8"));
const sfProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/sunfall-desert.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const tbWorld = loadWorld(JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8")));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const curriculum = loadCurriculumMap(JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8")));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));

check("Cedar Hollow mastery unchanged", () => {
  assert.deepEqual(
    chProfile.competencies.map((item) => item.id),
    ["observation", "evidence", "patterns", "variables", "data", "systems", "explanation", "revision", "communication"]
  );
  const mastery = createMasteryState();
  simulateMastery(chProfile, mastery, "cedar-hollow");
  assert.equal(regionMastered(chProfile, mastery), true);
});

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

check("travel gates unchanged", () => {
  const worldState = createWorldState(tbWorld);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), true);
});

check("save v5 compatibility", () => {
  assert.equal(SAVE_VERSION, 6);
  const fromV4 = migrateSave({ v: 4, player: { x: 12, y: 18, facing: -1 } });
  assert.equal(fromV4.v, 6);
  assert.ok(fromV4.sunfall);
  const fromV5 = migrateSave({ v: 5, presentation: { openingSeen: true } });
  assert.equal(fromV5.v, 6);
  assert.equal(fromV5.presentation.openingSeen, true);
});

check("character walk state exists", () => {
  assert.equal(WALK_READABLE, true);
  assert.ok(CHARACTER_STATES.includes("walk"));
  assert.match(charJs, /stride/);
  assert.match(charJs, /Math\.sin\(cycle\)/);
  assert.equal(poseFromIntent({ moving: true, pose: "idle" }), "walk");
  assert.equal(poseFromIntent({ moving: false, pose: "walk" }), "walk");
});

check("field poses exist", () => {
  for (const pose of ["idle", "walk", "inspect", "measure", "tablet", "talk", "sky"]) {
    assert.ok(CHARACTER_STATES.includes(pose), pose);
  }
  assert.match(charJs, /drawRod/);
  assert.match(charJs, /drawTablet/);
  assert.match(gameJs, /player\.facing = target\.x/);
});

check("Sunfall night uses world-palette response beyond a screen overlay", () => {
  assert.match(renderJs, /nightGround/);
  assert.match(renderJs, /desertNightColor/);
  assert.match(worldJs, /export function desertNightColor/);
  assert.doesNotMatch(renderJs, /rgba\(8,\s*12,\s*28,\s*0\.52\)/);
  assert.doesNotMatch(renderJs, /function drawSky/);
  const day = "#c99258";
  const night = desertNightColor(day, 0);
  assert.notEqual(night.toLowerCase(), day.toLowerCase());
  const r = parseInt(night.slice(1, 3), 16);
  const g = parseInt(night.slice(3, 5), 16);
  const b = parseInt(night.slice(5, 7), 16);
  assert.ok(b > r, "night ground should cool, not remain tan");
  assert.ok(r + g + b < parseInt(day.slice(1, 3), 16) + parseInt(day.slice(3, 5), 16) + parseInt(day.slice(5, 7), 16));
});

check("celestial controls remain fully functional", () => {
  assert.match(gameJs, /const SKY_JUMPS/);
  assert.match(gameJs, /Winter noon/);
  assert.match(gameJs, /Equinox noon/);
  assert.match(gameJs, /Summer noon/);
  assert.match(gameJs, /\+1 day/);
  assert.match(gameJs, /\+7 days/);
  assert.match(gameJs, /\+1 month/);
  assert.match(html, /Full observation window/);
  assert.match(gameJs, /function skyClockPlan/);
  assert.match(gameJs, /jumpObservation/);
});

check("runoff fair-test mechanics unchanged", () => {
  assert.match(flumeSpec.unfairHint, /Two things changed/);
  const state = createFlumeState();
  setFlumePrediction(state, "gentle");
  setFlumeSlope(state, "gentle");
  setFlumeWater(state, "extra");
  const unfair = runTrial(state, flumeSpec);
  assert.equal(unfair.fair, false);
  assert.match(unfair.hint, /Two things changed/);
  setFlumeWater(state, "one-cup");
  for (const slope of ["gentle", "moderate", "steep"]) {
    setFlumeSlope(state, slope);
    runTrial(state, flumeSpec);
    runTrial(state, flumeSpec);
  }
  assert.equal(hasFairComparison(state, flumeSpec), true);
  assert.match(densityJs, /drawRunoffBench/);
  assert.match(html, /Release water/);
});

check("landmark labels are contextual rather than globally persistent", () => {
  assert.match(renderJs, /if \(d > 72 && !focused\) continue/);
  assert.match(renderJs, /dist\(px, py, extra\.x, extra\.y\) > 90/);
  assert.match(bible, /Player reads the environment first/);
});

check("Dark Sky remains closed", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
});

check("no standards codes in player UI", () => {
  const extras = [html, bible];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, null, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.doesNotMatch(html, /NYS|NYSSLS|MS-ESS|HS-ESS/i);
});

check("no death/health/XP", () => {
  assert.doesNotMatch(html, /\bXP\b|\bhealth\b|\bGAME OVER\b|\bcoins?\b/i);
  assert.doesNotMatch(gameJs, /\bhealth\b|\blives\b|\bGAME OVER\b|\bXP\b/);
  assert.match(bible, /The player cannot die/);
});

check("apps/terrainbound/ untouched", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(DENSITY_MARK, "landcover-v76");
});

check("nothing deployed", () => {
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.match(readme, /retired trail-endurance page at `apps\/terrainbound\/`/);
  assert.match(readme, /Do not wire this game into Studio nav/);
});

check("content-density design infrastructure exists", () => {
  assert.match(bible, /CONTENT-HEAVY UNDERNEATH/);
  assert.match(bible, /LIGHT-FEELING ON THE SURFACE/);
  assert.match(bible, /REGIONS ARE NOT ISOLATED UNITS/);
  assert.match(bible, /REQUIRED CORE INVESTIGATIONS/);
  assert.match(audit, /NOTICE → MEASURE \/ COMPARE → USE → TRANSFER/);
  assert.match(css, /\.quiet-btn \{/);
  assert.equal((css.match(/\.quiet-btn \{/g) || []).length, 1);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.6 checks passed.");
