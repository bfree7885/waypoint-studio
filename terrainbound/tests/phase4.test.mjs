#!/usr/bin/env node
/**
 * TerrainBound Phase 4 checks — world map, mastery evidence, travel gate.
 * Run: node terrainbound/tests/phase4.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionState, addObservation, tryAddPathNode } from "../js/mission.js";
import { createDiscoveryState, addDiscovery } from "../js/discoveries.js";
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
  emptyTaught,
  migrateSave,
  SAVE_KEY,
  SAVE_VERSION
} from "../js/save.js";
import {
  createMasteryState,
  recordEvidence,
  recordsFor,
  gameplaySnapshot,
  isContentComplete,
  syncFromGameplay,
  competencyStatus,
  fieldRecord,
  missingEvidence,
  regionMastered,
  simulateMastery,
  playerFacingMasteryStrings
} from "../js/mastery.js";
import {
  loadWorld,
  createWorldState,
  previewModel,
  applyTravelUnlocks,
  courseTopicNumbers,
  canEnterRegion,
  isPlayable
} from "../js/worldmap.js";
import { createToolState, earnTool, hasTool, syncToolsFromGameplay } from "../js/tools.js";
import { createHazardState, hazardsForRegion, isHazardImplemented } from "../js/hazards.js";

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

const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const bible = JSON.parse(fs.readFileSync(path.join(root, "data/world/bible.json"), "utf8"));
const toolsCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/world/tools.json"), "utf8"));
const hazardsCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/world/hazards.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
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
const tbWorld = loadWorld(worldRaw);

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

function completeCurrentInvestigations(attempts = 1) {
  const missionState = createMissionState(mission);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(missionState, mission, id);
  }
  for (const id of mission.conclusion.validPath) {
    tryAddPathNode(missionState, mission, id);
  }
  const discoveryState = createDiscoveryState();
  for (const item of catalog.items) addDiscovery(discoveryState, catalog, item.id);
  const invState = createInvestigationState();
  beginInvestigation(invState, investigation, discoveryState);
  recordMeasurement(invState, investigation, "rock-compare", discoveryState);
  recordMeasurement(invState, investigation, "bedrock-grooves", discoveryState);
  recordMeasurement(invState, investigation, "valley-shape", discoveryState);
  recordMeasurement(invState, investigation, "sediment-sort", discoveryState);
  if (attempts > 1) {
    evaluateHypothesis(investigation, invState, "only-rain", ["transported-boulder"]);
  }
  evaluateHypothesis(investigation, invState, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  return { missionState, discoveryState, invState };
}

check("all 12 regions exist in course order 1, 2, 10, 11, 3, 4, 5, 6, 9, 7, 8, 12", () => {
  assert.equal(tbWorld.regions.length, 12);
  assert.deepEqual(courseTopicNumbers(tbWorld), [1, 2, 10, 11, 3, 4, 5, 6, 9, 7, 8, 12]);
  assert.deepEqual(
    tbWorld.courseOrder.map((region) => region.id),
    [
      "cedar-hollow",
      "high-country",
      "sunfall-desert",
      "dark-sky-basin",
      "painted-badlands",
      "glacier-country",
      "firepeak",
      "deep-time-canyon",
      "island-coast",
      "stormlands",
      "icewater-bay",
      "high-sierra"
    ]
  );
  assert.equal(bible.regions.length, 12);
  assert.equal(bible.regions[11].synthesisRegion, true);
});

check("every region can be previewed without being blank or padlock-only", () => {
  const worldState = createWorldState(tbWorld);
  for (const region of tbWorld.regions) {
    const preview = previewModel(tbWorld, worldState, region.id);
    assert.ok(preview);
    assert.ok(preview.canPreview);
    assert.ok(preview.name);
    assert.ok(preview.subtitle);
    assert.ok(preview.shortPreview.length > 20);
    assert.doesNotMatch(preview.shortPreview, /padlock|score 80|XP|quiz/i);
    assert.doesNotMatch(preview.routeDetail, /score 80|percent|XP/i);
  }
  const locked = previewModel(tbWorld, worldState, "firepeak");
  assert.equal(locked.status, "locked");
  assert.match(locked.routeLabel, /not yet open/i);
  assert.match(locked.shortPreview, /volcanic mountain/i);
  const home = previewModel(tbWorld, worldState, "cedar-hollow");
  assert.equal(home.status, "here");
  assert.equal(home.canEnter, true);
});

check("only Cedar Hollow is accessible at start; High Country is playable but gated", () => {
  const worldState = createWorldState(tbWorld);
  assert.deepEqual(worldState.accessibleRegions, ["cedar-hollow"]);
  const playable = tbWorld.regions.filter((region) => region.implementationState === "playable");
  assert.equal(playable.length, 3);
  assert.ok(playable.some((region) => region.id === "cedar-hollow"));
  assert.ok(playable.some((region) => region.id === "high-country"));
  assert.ok(playable.some((region) => region.id === "sunfall-desert"));
  assert.equal(isPlayable(tbWorld, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), false);
  assert.equal(isPlayable(tbWorld, "sunfall-desert"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  const regionFiles = fs.readdirSync(path.join(root, "data/regions")).sort();
  assert.deepEqual(regionFiles, ["cedar-hollow.json", "high-country.json", "sunfall-desert.json"]);
});

check("High Country cannot unlock from content completion alone", () => {
  const { missionState, discoveryState, invState } = completeCurrentInvestigations(2);
  const snapshot = gameplaySnapshot({ discoveryState, missionState, invState });
  assert.equal(isContentComplete(snapshot, profile), true);
  const mastery = createMasteryState();
  syncFromGameplay(mastery, snapshot);
  assert.equal(regionMastered(profile, mastery), false);
  const missing = missingEvidence(profile, mastery).map((item) => item.id);
  assert.ok(missing.includes("variables"));
  assert.ok(missing.includes("data"));
  const worldState = createWorldState(tbWorld);
  if (regionMastered(profile, mastery)) applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(worldState.accessibleRegions.includes("high-country"), false);
});

check("mastery evidence is separate from content completion and accepts multiple records", () => {
  const mastery = createMasteryState();
  recordEvidence(mastery, {
    competencyId: "evidence",
    kind: "mission-observation",
    source: "observation",
    attempts: 3,
    demonstrated: true
  });
  recordEvidence(mastery, {
    competencyId: "evidence",
    kind: "field-measurement",
    source: "measurement",
    attempts: 1,
    demonstrated: true
  });
  assert.equal(recordsFor(mastery, "evidence").length, 2);
  assert.equal(competencyStatus(profile, mastery, "evidence"), "demonstrated");
  assert.equal(competencyStatus(profile, mastery, "observation"), "not-yet-observed");
  const record = fieldRecord(profile, mastery).find((item) => item.id === "evidence");
  assert.equal(record.status, "demonstrated");
  assert.equal(record.statusLabel, "demonstrated");
});

check("missing mastery can be identified for later remediation", () => {
  const mastery = createMasteryState();
  const missing = missingEvidence(profile, mastery);
  assert.ok(missing.length >= 2);
  assert.ok(missing.some((item) => item.studentLabel === "Working with field data"));
  assert.ok(missing.some((item) => item.studentLabel === "Testing variables"));
  assert.ok(missing.every((item) => !/HS-ESS|NYSSLS/.test(item.studentLabel)));
});

check("development harness can simulate mastery and open High Country as enterable", () => {
  const mastery = createMasteryState();
  const worldState = createWorldState(tbWorld);
  simulateMastery(profile, mastery, "cedar-hollow");
  assert.equal(regionMastered(profile, mastery), true);
  const opened = applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.deepEqual(opened, ["high-country"]);
  assert.equal(worldState.accessibleRegions.includes("high-country"), true);
  const preview = previewModel(tbWorld, worldState, "high-country");
  assert.equal(preview.status, "open");
  assert.match(preview.routeLabel, /route open/i);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(preview.playable, true);
});

check("normal student UI exposes no cheat unlock", () => {
  assert.doesNotMatch(html, /simulateMastery|Unlock High Country|cheat|god mode|score 80%/i);
  assert.match(gameJs, /get\("field"\) === "1"/);
  assert.match(gameJs, /applySimulatedMastery/);
  const tbBlock = gameJs.split("window.TB")[1] || "";
  assert.match(tbBlock, /simulateMastery/);
  const beforeTb = gameJs.split("window.TB")[0];
  assert.doesNotMatch(html, /id="simulate/);
  assert.ok(beforeTb.includes('get("field") === "1"') || gameJs.includes('get("field") === "1"'));
});

check("route-open state persists locally and v1 saves migrate", () => {
  const storage = mockStorage();
  const player = { x: 10, y: 20, facing: 1 };
  const { missionState, discoveryState, invState } = completeCurrentInvestigations(1);
  const taught = emptyTaught();
  const worldState = createWorldState(tbWorld);
  const mastery = createMasteryState();
  simulateMastery(profile, mastery, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  const snap = captureSave({
    player,
    missionState,
    discoveryState,
    invState,
    taught,
    worldState,
    masteryState: mastery,
    toolState: createToolState()
  });
  assert.equal(snap.v, SAVE_VERSION);
  writeSave(storage, snap);
  const loaded = readSave(storage);
  assert.ok(loaded.world.accessibleRegions.includes("high-country"));
  const world2 = createWorldState(tbWorld);
  const mastery2 = createMasteryState();
  applySave(loaded, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    worldState: world2,
    masteryState: mastery2,
    toolState: createToolState()
  });
  assert.equal(world2.accessibleRegions.includes("high-country"), true);
  assert.equal(regionMastered(profile, mastery2), true);

  const v1 = {
    v: 1,
    regionId: "cedar-hollow",
    player: { x: 1688, y: 940, facing: -1 },
    taught: { walk: true },
    mission: createMissionState(mission),
    discoveries: createDiscoveryState(),
    investigation: createInvestigationState()
  };
  const migrated = migrateSave(v1);
  assert.equal(migrated.v, SAVE_VERSION);
  assert.deepEqual(migrated.world.accessibleRegions, ["cedar-hollow"]);
  const storageV1 = mockStorage({ [SAVE_KEY]: JSON.stringify(v1) });
  const fromDisk = readSave(storageV1);
  assert.equal(fromDisk.v, SAVE_VERSION);
  assert.equal(fromDisk.player.x, 1688);
});

check("no official standards codes in player-facing UI", () => {
  const extras = [
    html,
    ...playerFacingMasteryStrings(profile, tbWorld),
    ...fieldRecord(profile, createMasteryState()).map((item) => item.label)
  ];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, investigation, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(/HS-ESS|NYSSLS/i.test(html), false);
  assert.ok(profile.competencies.every((item) => item.standardsSlot.code === null));
  assert.equal(profile.playerVisibleCodes, false);
});

check("field tools and hazards are architecture only except the journal", () => {
  const tools = createToolState();
  syncToolsFromGameplay(tools, toolsCatalog, { journalOpened: true });
  assert.equal(hasTool(tools, "field-journal"), true);
  assert.equal(hasTool(tools, "topo-layer"), false);
  earnTool(tools, toolsCatalog, "topo-layer");
  assert.equal(hasTool(tools, "topo-layer"), true);
  const implemented = toolsCatalog.tools.filter((item) => item.implemented).map((item) => item.id);
  assert.ok(implemented.includes("field-journal"));
  assert.ok(implemented.includes("field-data"));
  assert.ok(implemented.includes("coordinates"));
  assert.equal(toolsCatalog.tools.find((item) => item.id === "solar-observation").implemented, true);
  assert.equal(toolsCatalog.tools.find((item) => item.id === "astro-observation").implemented, false);
  assert.equal(hazardsCatalog.implemented, false);
  assert.equal(hazardsCatalog.hazards.every((item) => item.implemented === false), true);
  assert.ok(hazardsForRegion(hazardsCatalog, "firepeak").length >= 1);
  assert.equal(isHazardImplemented(hazardsCatalog, "earthquake"), false);
  createHazardState();
});

check("Cedar Hollow gameplay, 1366 layout, retired app, and no deploy remain intact", () => {
  assert.match(html, /aria-label="Enter Cedar Hollow"/);
  assert.match(html, /id="atlas"/);
  assert.match(html, /Field Record/);
  assert.match(css, /max-width: 1366px/);
  assert.match(css, /atlas-card/);
  assert.doesNotMatch(gameJs, /fetch\(["']https?:/);
  assert.doesNotMatch(html, /login|signup|password/i);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.doesNotMatch(html, /terrainbound\.org/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 4 checks passed.");
