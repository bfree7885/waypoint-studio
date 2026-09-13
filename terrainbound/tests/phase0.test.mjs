#!/usr/bin/env node
/**
 * TerrainBound Phase 0 checks — data, mission graph, isolation from Studio.
 * Run: node terrainbound/tests/phase0.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, heightAt, inCreek, isBlocked, moveWithCollision, nearestInspectable } from "../js/world.js";
import {
  createMissionState,
  addObservation,
  canPresentFindings,
  requiredComplete,
  tryAddPathNode,
  resetPath,
  playerFacingStrings
} from "../js/mission.js";
import { loadCurriculumMap, slotsForMission, assertNoPlayerFacingCodes } from "../js/curriculum.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failures.push(name + ": " + err.message);
    console.error("FAIL " + name + " — " + err.message);
  }
}

const region = JSON.parse(fs.readFileSync(path.join(root, "data/regions/cedar-hollow.json"), "utf8"));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const world = createWorld(region);
const curriculum = loadCurriculumMap(placeholders);

check("region has the promised landforms", () => {
  const kinds = new Set(region.features.map((f) => f.kind));
  for (const kind of ["mountain", "forest", "stream", "pond", "slope", "overlook", "station", "downstream"]) {
    assert.ok(kinds.has(kind), "missing " + kind);
  }
  assert.ok(region.trails.length >= 3);
  assert.equal(region.name, "Cedar Hollow");
});

check("spawn is walkable and near the station", () => {
  const moved = moveWithCollision(world, region.spawn.x, region.spawn.y, 0, 0);
  assert.equal(moved.x, region.spawn.x);
  assert.ok(Math.hypot(region.spawn.x - 1710, region.spawn.y - 820) < 220);
});

check("water is downhill of the western slope", () => {
  const slope = heightAt(region, 730, 540);
  const creek = heightAt(region, 980, 800);
  const pond = heightAt(region, 1080, 1188);
  const reach = heightAt(region, 1140, 1470);
  assert.ok(slope > creek, "slope should sit above the creek");
  assert.ok(creek > pond, "creek should sit above the pond");
  assert.ok(pond >= reach - 0.02, "pond should not sit below the downstream reach by much");
  assert.ok(inCreek(region, 980, 800));
  assert.ok(inCreek(region, 1080, 1188));
});

check("inspectables resolve near landmarks", () => {
  const slope = nearestInspectable(world, 730, 540, 90);
  assert.equal(slope.id, "westface-slope");
  for (const feature of region.features) {
    assert.equal(
      isBlocked(world, feature.x, feature.y),
      false,
      feature.id + " should be standable"
    );
  }
});

check("mission starts incomplete and records field notes", () => {
  const state = createMissionState(mission);
  assert.equal(state.concluded, false);
  assert.equal(canPresentFindings(state, mission), false);
  const first = addObservation(state, mission, "westface-slope");
  assert.equal(first.already, false);
  assert.match(first.entry.text, /Pine Creek/);
  const again = addObservation(state, mission, "westface-slope");
  assert.equal(again.already, true);
  assert.equal(state.observations.length, 1);
});

check("conclusion requires walking the land, not guessing", () => {
  const state = createMissionState(mission);
  const blocked = tryAddPathNode(state, mission, "westface-slope");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "unobserved");
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(state, mission, id);
  }
  assert.equal(requiredComplete(state, mission), true);
  assert.equal(canPresentFindings(state, mission), true);
  const wrong = tryAddPathNode(state, mission, "mirror-pond");
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, "uphill");
  resetPath(state);
  for (const id of mission.conclusion.validPath) {
    const step = tryAddPathNode(state, mission, id);
    assert.equal(step.ok, true, "expected " + id);
  }
  assert.equal(state.concluded, true);
  assert.equal(state.flowVisible, true);
});

check("curriculum stays behind the scenes with pending codes", () => {
  const slots = slotsForMission(curriculum, mission);
  assert.equal(slots.length, 3);
  const gate = assertNoPlayerFacingCodes(mission, curriculum);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(gate.curriculumHidden, true);
  assert.equal(gate.pendingSlots, true);
  const playerText = playerFacingStrings(mission).join(" ");
  assert.equal(/NYSSLS|HS-ESS|standard code/i.test(playerText), false);
});

check("retired Studio Terrainbound redirect was not overwritten", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.match(retired, /fieldry/);
  const game = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(game, /data-product="terrainbound"/);
  assert.doesNotMatch(game, /wds\.css/);
});

check("prototype is isolated from Studio registries", () => {
  const gameHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(gameHtml, /Enter Cedar Hollow/);
  const nav = fs.readFileSync(path.join(repoRoot, "design-system/js/platform/wds-app-nav-config.js"), "utf8");
  assert.doesNotMatch(nav, /\/terrainbound\/index\.html/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\n" + "All TerrainBound Phase 0 checks passed.");
