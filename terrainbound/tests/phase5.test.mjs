#!/usr/bin/env node
/**
 * TerrainBound Phase 5 checks — Cedar Hollow complete, legitimate High Country unlock.
 * Run: node terrainbound/tests/phase5.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, isBlocked } from "../js/world.js";
import { createMissionState, addObservation, tryAddPathNode } from "../js/mission.js";
import { createDiscoveryState, addDiscovery } from "../js/discoveries.js";
import {
  createInvestigationState,
  beginInvestigation,
  recordMeasurement,
  evaluateHypothesis
} from "../js/investigation.js";
import {
  createFlumeState,
  runTrial,
  setFlumeSlope,
  setFlumeWater,
  setFlumePrediction,
  hasFairComparison,
  flumeRows
} from "../js/flume.js";
import {
  createDataState,
  setDatasetRows,
  setGraphAxes,
  graphModel,
  tryInterpretation
} from "../js/fielddata.js";
import {
  createChallengeState,
  observeSite,
  measureSite,
  canProposeChallenge,
  tryChallengeExplanation,
  tryChallengeFollowUp
} from "../js/challenge.js";
import { classifyCard } from "../js/obsint.js";
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
  gameplaySnapshot,
  isContentComplete,
  syncFromGameplay,
  competencyStatus,
  fieldRecord,
  missingEvidence,
  regionMastered,
  playerFacingMasteryStrings
} from "../js/mastery.js";
import {
  loadWorld,
  createWorldState,
  previewModel,
  applyTravelUnlocks,
  canEnterRegion,
  isPlayable
} from "../js/worldmap.js";
import { createToolState, hasTool, syncToolsFromGameplay } from "../js/tools.js";

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
const profile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const investigation = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/reading-the-landscape.json"), "utf8")
);
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const flumeSpec = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8")
);
const dataCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/fielddata/catalog.json"), "utf8"));
const challengeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/challenges/after-the-rain.json"), "utf8"));
const region = JSON.parse(fs.readFileSync(path.join(root, "data/regions/cedar-hollow.json"), "utf8"));
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const curriculum = loadCurriculumMap(placeholders);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const tbWorld = loadWorld(worldRaw);
const world = createWorld(region, 1842, catalog.items);

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

const LANDSCAPE_FINDS = ["glacial-erratic", "exposed-bedrock", "cut-bank", "point-bar", "watershed-rail"];

function completeWaterAndLandscape({ allDiscoveries = false, attempts = 2 } = {}) {
  const missionState = createMissionState(mission);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(missionState, mission, id);
  }
  for (const id of mission.conclusion.validPath) {
    tryAddPathNode(missionState, mission, id);
  }
  const discoveryState = createDiscoveryState();
  const findIds = allDiscoveries ? catalog.items.map((item) => item.id) : LANDSCAPE_FINDS;
  for (const id of findIds) addDiscovery(discoveryState, catalog, id);
  const invState = createInvestigationState();
  beginInvestigation(invState, investigation, discoveryState);
  recordMeasurement(invState, investigation, "rock-compare", discoveryState);
  recordMeasurement(invState, investigation, "bedrock-grooves", discoveryState);
  recordMeasurement(invState, investigation, "valley-shape", discoveryState);
  if (attempts > 1) {
    evaluateHypothesis(investigation, invState, "flowing-water", ["transported-boulder"]);
  }
  evaluateHypothesis(investigation, invState, "moving-ice", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley"
  ]);
  return { missionState, discoveryState, invState };
}

function completeFairFlume(state = createFlumeState()) {
  setFlumePrediction(state, "steep");
  setFlumeWater(state, "one-cup");
  for (const slope of flumeSpec.slopes) {
    setFlumeSlope(state, slope.id);
    runTrial(state, flumeSpec);
    runTrial(state, flumeSpec);
  }
  return state;
}

function interpretFlow(flumeState) {
  const dataState = createDataState();
  setDatasetRows(dataState, "cedar-hollow-flow", flumeRows(flumeState, flumeSpec));
  setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", "slope", "speed");
  const result = tryInterpretation(
    dataState,
    dataCatalog,
    "cedar-hollow-flow",
    "faster-with-slope",
    "steeper-faster"
  );
  return { dataState, result };
}

function walkChallenge(neededOnly = false) {
  const state = createChallengeState();
  state.active = true;
  const ids = neededOnly
    ? ["rain-gauge", "confluence", "westface-slump", "station-creek"]
    : challengeSpec.sites.map((site) => site.id);
  for (const id of ids) {
    observeSite(state, challengeSpec, id);
    measureSite(state, challengeSpec, id);
  }
  state.pulsePredict = "confluence";
  return state;
}

function legitimateMastery() {
  const { missionState, discoveryState, invState } = completeWaterAndLandscape({
    allDiscoveries: false,
    attempts: 2
  });
  classifyCard(invState.obsInt, investigation.obsInt, "boulder-look", "observation");
  classifyCard(invState.obsInt, investigation.obsInt, "groove-look", "observation");
  const flumeState = completeFairFlume();
  const { dataState } = interpretFlow(flumeState);
  const challengeState = walkChallenge(true);
  tryChallengeExplanation(challengeState, challengeSpec, "tributary-slump");
  tryChallengeFollowUp(challengeState, challengeSpec, "marsh-usual");
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState,
      missionState,
      invState,
      flumeState,
      dataState,
      challengeState,
      flumeSpec,
      obsIntState: invState.obsInt
    })
  );
  return { missionState, discoveryState, invState, flumeState, dataState, challengeState, mastery };
}

check("variables investigation is playable with three slopes", () => {
  assert.equal(flumeSpec.id, "what-makes-water-move");
  assert.equal(flumeSpec.slopes.length, 3);
  assert.ok(region.props.some((prop) => prop.kind === "runoff-table"));
  assert.match(html, /id="flume"/);
  assert.match(gameJs, /openFlume/);
  const table = region.props.find((prop) => prop.kind === "runoff-table");
  assert.equal(isBlocked(world, table.x, table.y), false);
});

check("player can manipulate a tested variable and record numerical trials", () => {
  const state = createFlumeState();
  setFlumePrediction(state, "steep");
  setFlumeWater(state, "one-cup");
  setFlumeSlope(state, "gentle");
  const a = runTrial(state, flumeSpec);
  setFlumeSlope(state, "steep");
  const b = runTrial(state, flumeSpec);
  assert.equal(a.fair, true);
  assert.equal(typeof a.trial.seconds, "number");
  assert.ok(b.trial.seconds < a.trial.seconds);
  assert.equal(state.trials.length, 2);
});

check("changing slope and water together is not a fair comparison", () => {
  const state = createFlumeState();
  setFlumePrediction(state, "gentle");
  setFlumeSlope(state, "gentle");
  setFlumeWater(state, "extra");
  const result = runTrial(state, flumeSpec);
  assert.equal(result.fair, false);
  assert.match(result.hint, /Two things changed/i);
  setFlumeSlope(state, "steep");
  runTrial(state, flumeSpec);
  assert.equal(hasFairComparison(state, flumeSpec), false);
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: createDiscoveryState(),
      missionState: createMissionState(mission),
      invState: createInvestigationState(),
      flumeState: state,
      flumeSpec
    })
  );
  assert.equal(competencyStatus(profile, mastery, "variables"), "not-yet-observed");
});

check("repeated trials are required before a fair comparison", () => {
  const state = createFlumeState();
  setFlumePrediction(state, "steep");
  setFlumeWater(state, "one-cup");
  for (const slope of flumeSpec.slopes) {
    setFlumeSlope(state, slope.id);
    runTrial(state, flumeSpec);
  }
  assert.equal(hasFairComparison(state, flumeSpec), false);
  completeFairFlume(state);
  assert.equal(hasFairComparison(state, flumeSpec), true);
  assert.ok(state.trials.filter((item) => item.fair).length >= 6);
});

check("player measurements populate a reusable dataset that can be graphed", () => {
  const flumeState = completeFairFlume();
  const rows = flumeRows(flumeState, flumeSpec);
  assert.ok(rows.every((row) => typeof row.seconds === "number" && typeof row.speed === "number"));
  const dataState = createDataState();
  setDatasetRows(dataState, "cedar-hollow-flow", rows);
  const axes = setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", "slope", "speed");
  assert.equal(axes.ok, true);
  const graph = graphModel(dataState, dataCatalog, "cedar-hollow-flow");
  assert.ok(graph.points.length >= 6);
  assert.ok(graph.means.length >= 3);
  assert.match(html, /id="tab-data-btn"/);
  assert.match(html, /id="interpret-graph"/);
});

check("DATA mastery requires an actual interpretation of the trend", () => {
  const flumeState = completeFairFlume();
  const dataState = createDataState();
  setDatasetRows(dataState, "cedar-hollow-flow", flumeRows(flumeState, flumeSpec));
  setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", "slope", "speed");
  const empty = createMasteryState();
  syncFromGameplay(
    empty,
    gameplaySnapshot({
      discoveryState: createDiscoveryState(),
      missionState: createMissionState(mission),
      invState: createInvestigationState(),
      flumeState,
      dataState,
      flumeSpec
    })
  );
  assert.equal(competencyStatus(profile, empty, "data"), "not-yet-observed");
  const weak = tryInterpretation(
    dataState,
    dataCatalog,
    "cedar-hollow-flow",
    "exact-seconds",
    "exact-claim"
  );
  assert.equal(weak.ok, false);
  assert.match(weak.hint, /cluster|overall pattern|not identical/i);
  assert.equal(dataState.datasets["cedar-hollow-flow"].interpreted, false);
  const good = tryInterpretation(
    dataState,
    dataCatalog,
    "cedar-hollow-flow",
    "faster-with-slope",
    "steeper-faster"
  );
  assert.equal(good.ok, true);
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: createDiscoveryState(),
      missionState: createMissionState(mission),
      invState: createInvestigationState(),
      flumeState,
      dataState,
      flumeSpec
    })
  );
  assert.equal(competencyStatus(profile, mastery, "data"), "demonstrated");
  assert.equal(competencyStatus(profile, mastery, "variables"), "demonstrated");
});

check("VARIABLES mastery requires a fair comparison, not opening the table", () => {
  const opened = createFlumeState();
  opened.active = true;
  opened.introSeen = true;
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: createDiscoveryState(),
      missionState: createMissionState(mission),
      invState: createInvestigationState(),
      flumeState: opened,
      flumeSpec
    })
  );
  assert.equal(competencyStatus(profile, mastery, "variables"), "not-yet-observed");
});

check("original water and landscape investigations still complete", () => {
  const { missionState, invState } = completeWaterAndLandscape({ allDiscoveries: true, attempts: 2 });
  assert.equal(missionState.concluded, true);
  assert.equal(invState.concluded, true);
  assert.equal(invState.interpreted, true);
});

check("existing discoveries remain optional", () => {
  const { discoveryState } = completeWaterAndLandscape({ allDiscoveries: false });
  assert.ok(discoveryState.foundIds.length < catalog.items.length);
  assert.equal(catalog.items.length, 12);
});

check("regional Field Challenge is playable and not a scripted click-path", () => {
  assert.equal(challengeSpec.id, "after-the-rain");
  assert.ok(challengeSpec.sites.length >= 6);
  assert.ok(challengeSpec.sites.some((site) => site.useful === false));
  assert.match(html, /id="clearance"/);
  const skipped = walkChallenge(true);
  assert.equal(canProposeChallenge(skipped, challengeSpec), true);
  const early = createChallengeState();
  early.active = true;
  observeSite(early, challengeSpec, "crate-note");
  assert.equal(canProposeChallenge(early, challengeSpec), false);
  for (const site of challengeSpec.sites) {
    assert.equal(isBlocked(world, site.x, site.y), false, site.id + " should be standable");
  }
});

check("challenge draws from multiple Topic 1 habits", () => {
  const text = JSON.stringify(challengeSpec);
  assert.match(text, /observe/i);
  assert.match(challengeSpec.question, /muddier|quicker/i);
  assert.ok(challengeSpec.neededRoles.includes("join"));
  assert.ok(challengeSpec.neededRoles.includes("source"));
  assert.equal(challengeSpec.explanations.filter((item) => item.correct).length, 1);
});

check("completion alone still cannot create mastery", () => {
  const { missionState, discoveryState, invState } = completeWaterAndLandscape({
    allDiscoveries: true,
    attempts: 2
  });
  const snapshot = gameplaySnapshot({ discoveryState, missionState, invState });
  assert.equal(isContentComplete(snapshot, profile), true);
  const mastery = createMasteryState();
  syncFromGameplay(mastery, snapshot);
  assert.equal(regionMastered(profile, mastery), false);
  const missing = missingEvidence(profile, mastery).map((item) => item.id);
  assert.ok(missing.includes("variables"));
  assert.ok(missing.includes("data"));
});

check("sharing a conclusion requires the Field Challenge, not only tracing water", () => {
  const { missionState, discoveryState, invState } = completeWaterAndLandscape({
    allDiscoveries: false,
    attempts: 1
  });
  const flumeState = completeFairFlume();
  const { dataState } = interpretFlow(flumeState);
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState,
      missionState,
      invState,
      flumeState,
      dataState,
      flumeSpec
    })
  );
  assert.equal(competencyStatus(profile, mastery, "variables"), "demonstrated");
  assert.equal(competencyStatus(profile, mastery, "data"), "demonstrated");
  assert.equal(competencyStatus(profile, mastery, "communication"), "not-yet-observed");
  assert.equal(regionMastered(profile, mastery), false);
});

check("all nine Topic 1 slots can be demonstrated without every discovery", () => {
  const { mastery, discoveryState } = legitimateMastery();
  assert.ok(discoveryState.foundIds.length < 12);
  for (const id of profile.travelRequirements) {
    assert.equal(competencyStatus(profile, mastery, id), "demonstrated", id);
  }
  assert.equal(regionMastered(profile, mastery), true);
  assert.equal(fieldRecord(profile, mastery).length, 9);
});

check("High Country opens only after mastery and becomes enterable", () => {
  const worldState = createWorldState(tbWorld);
  const incomplete = completeWaterAndLandscape({ allDiscoveries: true });
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: incomplete.discoveryState,
      missionState: incomplete.missionState,
      invState: incomplete.invState
    })
  );
  if (regionMastered(profile, mastery)) applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(worldState.accessibleRegions.includes("high-country"), false);

  const done = legitimateMastery();
  assert.equal(regionMastered(profile, done.mastery), true);
  const opened = applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.deepEqual(opened, ["high-country"]);
  const preview = previewModel(tbWorld, worldState, "high-country");
  assert.equal(preview.status, "open");
  assert.match(preview.routeLabel, /route open/i);
  assert.equal(isPlayable(tbWorld, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(tbWorld.byId.get("high-country").implementationState, "playable");
  const home = previewModel(tbWorld, worldState, "cedar-hollow");
  assert.equal(home.mastered, true);
  assert.match(home.routeLabel, /field work complete/i);
  assert.equal(isPlayable(tbWorld, "sunfall-desert"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
});

check("route-open state persists and Phase 4 saves migrate", () => {
  const storage = mockStorage();
  const done = legitimateMastery();
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  const snap = captureSave({
    player: { x: 10, y: 20, facing: 1 },
    missionState: done.missionState,
    discoveryState: done.discoveryState,
    invState: done.invState,
    taught: emptyTaught(),
    worldState,
    masteryState: done.mastery,
    toolState: createToolState(),
    flumeState: done.flumeState,
    dataState: done.dataState,
    challengeState: done.challengeState
  });
  assert.equal(snap.v, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 5);
  assert.ok(snap.flume.trials.length >= 6);
  assert.ok(snap.fieldData.datasets["cedar-hollow-flow"].interpreted);
  writeSave(storage, snap);
  const loaded = readSave(storage);
  assert.ok(loaded.world.accessibleRegions.includes("high-country"));
  const world2 = createWorldState(tbWorld);
  const mastery2 = createMasteryState();
  const flume2 = createFlumeState();
  const data2 = createDataState();
  const challenge2 = createChallengeState();
  applySave(loaded, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    worldState: world2,
    masteryState: mastery2,
    toolState: createToolState(),
    flumeState: flume2,
    dataState: data2,
    challengeState: challenge2
  });
  assert.equal(world2.accessibleRegions.includes("high-country"), true);
  assert.equal(hasFairComparison(flume2, flumeSpec), true);
  assert.equal(data2.datasets["cedar-hollow-flow"].interpreted, true);
  assert.equal(challenge2.concluded, true);

  const v2 = {
    v: 2,
    regionId: "cedar-hollow",
    player: { x: 1688, y: 940, facing: -1 },
    taught: { walk: true },
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    mastery: { records: [] },
    tools: { earnedIds: [] },
    mission: createMissionState(mission),
    discoveries: createDiscoveryState(),
    investigation: createInvestigationState()
  };
  const migrated = migrateSave(v2);
  assert.equal(migrated.v, 5);
  assert.deepEqual(migrated.flume.trials, []);
  const v1 = { v: 1, regionId: "cedar-hollow", player: { x: 1688, y: 940 }, taught: {}, mission: {}, discoveries: {}, investigation: {} };
  assert.equal(migrateSave(v1).v, 5);
  const fromDisk = readSave(mockStorage({ [SAVE_KEY]: JSON.stringify(v2) }));
  assert.equal(fromDisk.v, 5);
});

check("field-data tool is earned by interpretation, not by opening the tablet", () => {
  const tools = createToolState();
  syncToolsFromGameplay(tools, toolsCatalog, { journalOpened: true });
  assert.equal(hasTool(tools, "field-journal"), true);
  assert.equal(hasTool(tools, "field-data"), false);
  syncToolsFromGameplay(tools, toolsCatalog, { journalOpened: true, datasetInterpreted: true });
  assert.equal(hasTool(tools, "field-data"), true);
});

check("no standards codes, 1366 layout, retired app untouched, nothing deployed", () => {
  const extras = [
    html,
    JSON.stringify(flumeSpec),
    JSON.stringify(challengeSpec),
    ...playerFacingMasteryStrings(profile, tbWorld)
  ];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, investigation, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(/HS-ESS|NYSSLS/i.test(html), false);
  assert.match(css, /max-width: 1366px/);
  assert.doesNotMatch(html, /multiple choice|\bquiz\b|\bXP\b|\bbadge\b/i);
  assert.doesNotMatch(gameJs, /TB\.simulateMastery\(\)/);
  assert.match(gameJs, /get\("field"\) === "1"/);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.doesNotMatch(html, /terrainbound\.org/);
  assert.match(bible.topic1Transfer, /do not reteach/i);
  assert.equal(profile.competencies.every((item) => item.elicitedNow === true), true);
});

check("player-facing copy stays in the field, not the glossary", () => {
  assert.doesNotMatch(flumeSpec.unfairHint, /independent variable|dependent variable/i);
  assert.doesNotMatch(html, /Independent variable/);
  assert.match(flumeSpec.unfairHint, /Two things changed/);
  assert.match(gameJs, /The hollow is still here/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 5 checks passed.");
