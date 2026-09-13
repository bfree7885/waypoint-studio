#!/usr/bin/env node
/**
 * TerrainBound Phase 3 checks — game feel, observation vs interpretation, local save.
 * Run: node terrainbound/tests/phase3.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionState, addObservation, tryAddPathNode } from "../js/mission.js";
import {
  createDiscoveryState,
  addDiscovery,
  discoveryLogModel,
  playerFacingObservationText,
  displayName,
  displayText
} from "../js/discoveries.js";
import {
  createInvestigationState,
  beginInvestigation,
  recordMeasurement,
  evaluateHypothesis
} from "../js/investigation.js";
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";
import {
  captureSave,
  applySave,
  readSave,
  writeSave,
  clearSave,
  emptyTaught,
  wipeRequiresConfirm,
  SAVE_KEY
} from "../js/save.js";
import { createAudio } from "../js/audio.js";

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

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const investigation = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/reading-the-landscape.json"), "utf8")
);
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const curriculum = loadCurriculumMap(placeholders);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const boulder = catalog.items.find((item) => item.id === "glacial-erratic");

function mockStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

check("opening is a short Begin screen, not a control lecture", () => {
  assert.match(html, />Begin</);
  assert.match(html, /aria-label="Enter Cedar Hollow"/);
  assert.doesNotMatch(html, /WASD or click to walk/);
  assert.ok(mission.intro.lines.length <= 2);
  assert.match(gameJs, /WASD \/ ARROWS · WALK/);
  assert.match(gameJs, /E · LOOK CLOSER/);
  assert.match(gameJs, /J · FIELD TABLET/);
});

check("strange boulder stays observational until interpretation is earned", () => {
  assert.equal(boulder.name, "Strange boulder");
  assert.equal(boulder.interpretedName, "Glacial erratic");
  assert.doesNotMatch(boulder.name + boulder.text + boulder.prompt, /glacier|glacial erratic/i);
  assert.match(boulder.text, /different from Granite Knob/);
  const disc = createDiscoveryState();
  addDiscovery(disc, catalog, boulder.id);
  const before = discoveryLogModel(catalog, disc, false);
  assert.equal(before.found[0].name, "Strange boulder");
  assert.equal(before.found[0].interpreted, false);
  assert.doesNotMatch(before.found[0].text, /Moving ice carried/);
  const after = discoveryLogModel(catalog, disc, true);
  assert.equal(after.found[0].name, "Glacial erratic");
  assert.equal(after.found[0].interpreted, true);
  assert.match(after.found[0].text, /Moving ice carried this rock/);
  assert.equal(displayName(boulder, false), "Strange boulder");
  assert.equal(displayText(boulder, true), boulder.interpretedText);
});

check("player-facing observation copy does not leak glaciation", () => {
  const text = playerFacingObservationText(catalog).join(" ");
  assert.doesNotMatch(text, /Glacial erratic/);
  assert.doesNotMatch(text, /NYSSLS|HS-ESS/);
});

check("water mission and landscape hypothesis still complete", () => {
  const water = createMissionState(mission);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(water, mission, id);
  }
  for (const id of mission.conclusion.validPath) {
    assert.equal(tryAddPathNode(water, mission, id).ok, true);
  }
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  for (const id of ["glacial-erratic", "exposed-bedrock", "watershed-rail"]) {
    addDiscovery(disc, catalog, id);
  }
  beginInvestigation(inv, investigation, disc);
  recordMeasurement(inv, investigation, "rock-compare", disc);
  recordMeasurement(inv, investigation, "bedrock-grooves", disc);
  recordMeasurement(inv, investigation, "valley-shape", disc);
  addDiscovery(disc, catalog, "cut-bank");
  addDiscovery(disc, catalog, "point-bar");
  recordMeasurement(inv, investigation, "sediment-sort", disc);
  const weak = evaluateHypothesis(investigation, inv, "only-rain", ["transported-boulder"]);
  assert.equal(weak.ok, false);
  const ok = evaluateHypothesis(investigation, inv, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  assert.equal(ok.ok, true);
});

check("local save round-trips progress and reset requires confirmation", () => {
  const storage = mockStorage();
  const player = { x: 10, y: 20, facing: 1 };
  const missionState = createMissionState(mission);
  missionState.concluded = true;
  const discoveryState = createDiscoveryState();
  addDiscovery(discoveryState, catalog, "glacial-erratic");
  const invState = createInvestigationState();
  invState.interpreted = true;
  const taught = emptyTaught();
  taught.walk = true;
  const snap = captureSave({ player, missionState, discoveryState, invState, taught });
  writeSave(storage, snap);
  assert.equal(wipeRequiresConfirm(false), false);
  assert.equal(wipeRequiresConfirm(true), true);
  const loaded = readSave(storage);
  assert.ok(loaded);
  const player2 = { x: 0, y: 0, facing: -1 };
  const mission2 = createMissionState(mission);
  const disc2 = createDiscoveryState();
  const inv2 = createInvestigationState();
  const taught2 = emptyTaught();
  applySave(loaded, { player: player2, missionState: mission2, discoveryState: disc2, invState: inv2, taught: taught2 });
  assert.equal(player2.x, 10);
  assert.equal(mission2.concluded, true);
  assert.equal(disc2.foundIds.includes("glacial-erratic"), true);
  assert.equal(inv2.interpreted, true);
  assert.equal(taught2.walk, true);
  clearSave(storage);
  assert.equal(readSave(storage), null);
  assert.equal(SAVE_KEY.startsWith("terrainbound."), true);
});

check("audio bus exists without required assets or autoplay music", () => {
  const audio = createAudio({ reducedMotion: true, AudioContext: function Fake() {} });
  audio.unlock();
  audio.discover();
  audio.tablet();
  assert.equal(typeof audio.setMuted, "function");
  assert.doesNotMatch(gameJs, /new Audio\(["']https?:/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "js/audio.js"), "utf8"), /fetch\(/);
});

check("tablet remains compact at 1366 and no standards codes leak", () => {
  assert.match(css, /max-width: 1366px/);
  assert.match(html, /journal-tabs/);
  assert.match(html, /id="confirm-reset"/);
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, investigation);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(/NYSSLS|HS-ESS/i.test(html), false);
});

check("no backend, accounts, or retired Studio overwrite", () => {
  assert.doesNotMatch(gameJs, /fetch\(["']https?:/);
  assert.doesNotMatch(html, /login|signup|password/i);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 3 checks passed.");
