#!/usr/bin/env node
/**
 * TerrainBound Phase 1 checks — discoveries, journal hiding, walkability.
 * Run: node terrainbound/tests/phase1.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, isBlocked, moveWithCollision, nearestInspectable, nearestStoryProp, nearRanger } from "../js/world.js";
import { createMissionState, addObservation, tryAddPathNode, addStoryNote, requiredComplete } from "../js/mission.js";
import {
  createDiscoveryState,
  addDiscovery,
  nearestDiscovery,
  discoveryLogModel,
  playerFacingDiscoveryText,
  pickWrenLines
} from "../js/discoveries.js";
import { loadCurriculumMap, slotsForDiscovery, assertNoPlayerFacingCodes } from "../js/curriculum.js";

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
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const world = createWorld(region, 1842, catalog.items);
const curriculum = loadCurriculumMap(placeholders);

check("catalog has 8–12 discoveries", () => {
  assert.ok(catalog.items.length >= 8 && catalog.items.length <= 12);
});

check("discoveries require inspection and stay unnamed until found", () => {
  const state = createDiscoveryState();
  const first = catalog.items[0];
  const log0 = discoveryLogModel(catalog, state);
  assert.equal(log0.foundCount, 0);
  assert.equal(log0.total, catalog.items.length);
  for (const item of catalog.items) {
    assert.equal(log0.found.some((f) => f.name === item.name), false, "leaked " + item.name);
  }
  const missed = nearestDiscovery(catalog, first.x + 400, first.y + 400, 40);
  assert.equal(missed, null);
  const near = nearestDiscovery(catalog, first.x, first.y);
  assert.equal(near.id, first.id);
  const added = addDiscovery(state, catalog, first.id);
  assert.equal(added.already, false);
  const again = addDiscovery(state, catalog, first.id);
  assert.equal(again.already, true);
  const log1 = discoveryLogModel(catalog, state);
  assert.equal(log1.foundCount, 1);
  assert.equal(log1.found[0].name, first.name);
  const stillHidden = catalog.items[1];
  assert.equal(log1.found.some((f) => f.name === stillHidden.name), false);
});

check("discovery points are standable", () => {
  for (const item of catalog.items) {
    assert.equal(isBlocked(world, item.x, item.y), false, item.id + " blocked");
  }
});

check("story props inspect without becoming named discoveries", () => {
  const prop = nearestStoryProp(region, 1608, 1008, 40);
  assert.ok(prop);
  assert.ok(prop.inspect.title);
  const missionState = createMissionState(mission);
  addStoryNote(missionState, prop.inspect);
  const log = discoveryLogModel(catalog, createDiscoveryState());
  assert.equal(log.foundCount, 0);
  assert.equal(missionState.storyNotes.length, 1);
});

check("water mission still completes beside discoveries", () => {
  const state = createMissionState(mission);
  const disc = createDiscoveryState();
  addDiscovery(disc, catalog, catalog.items[0].id);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(state, mission, id);
  }
  assert.equal(requiredComplete(state, mission), true);
  for (const id of mission.conclusion.validPath) {
    assert.equal(tryAddPathNode(state, mission, id).ok, true);
  }
  assert.equal(state.concluded, true);
});

check("Wren hints without lecturing or revealing unfound names", () => {
  const state = createDiscoveryState();
  const lines = pickWrenLines(catalog, state, false, false).join(" ");
  assert.doesNotMatch(lines, /glacier/i);
  assert.doesNotMatch(lines, /Glacial erratic/);
  assert.doesNotMatch(lines, /NYSSLS|HS-ESS/);
});

check("curriculum placeholders exist for each discovery", () => {
  for (const item of catalog.items) {
    const slots = slotsForDiscovery(curriculum, item);
    assert.ok(slots.length >= 1, item.id);
    assert.ok(slots.every((slot) => slot.placeholderAlignment.code === null));
  }
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(gate.pendingSlots, true);
  const playerText = playerFacingDiscoveryText(catalog).join(" ");
  assert.equal(/NYSSLS|HS-ESS|performance expectation/i.test(playerText), false);
});

check("region gained wetland, outcrop, tributary, and story props", () => {
  assert.ok(region.wetland);
  assert.ok(region.outcrop);
  assert.ok(region.tributary);
  assert.ok(region.props.length >= 5);
  const kinds = new Set(region.features.map((f) => f.kind));
  for (const kind of ["mountain", "forest", "stream", "pond", "slope", "overlook", "station"]) {
    assert.ok(kinds.has(kind), kind);
  }
});

check("spawn still walkable and mission inspectables remain", () => {
  const moved = moveWithCollision(world, region.spawn.x, region.spawn.y, 0, 0);
  assert.equal(moved.x, region.spawn.x);
  assert.equal(nearestInspectable(world, 730, 540, 90).id, "westface-slope");
  assert.equal(nearRanger(region, region.ranger.x, region.ranger.y), true);
});

check("retired Studio app untouched", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 1 checks passed.");
