#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9A — Cedar Hollow puzzle architecture prototype.
 * Run: node terrainbound/tests/phase7_9a.test.mjs
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
import { createFlumeState, runTrial, setFlumeSlope, setFlumeWater, setFlumePrediction, flumeRows } from "../js/flume.js";
import { createDataState, setDatasetRows, setGraphAxes, tryInterpretation } from "../js/fielddata.js";
import {
  createChallengeState,
  observeSite,
  measureSite,
  tryChallengeExplanation,
  tryChallengeFollowUp
} from "../js/challenge.js";
import { classifyCard } from "../js/obsint.js";
import { fieldGuidance } from "../js/guidance.js";
import {
  createPuzzleState,
  puzzleUse,
  aarEligible,
  incompletePuzzles,
  trySystemsTap,
  currentSystemsPrompt,
  completeSystems,
  tryConflict,
  classifySite,
  tabletEvidence
} from "../js/puzzles.js";
import { submitAar, scoreAnswers, aarResult, judgeClaim, goodEvidenceCase } from "../js/aar.js";
import {
  createMasteryState,
  gameplaySnapshot,
  syncFromGameplay,
  competencyStatus,
  regionMastered
} from "../js/mastery.js";
import { captureSave, applySave, migrateSave, emptyTaught, SAVE_VERSION } from "../js/save.js";
import { createWorldState, loadWorld, applyTravelUnlocks, canEnterRegion } from "../js/worldmap.js";

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

const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const investigation = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/reading-the-landscape.json"), "utf8")
);
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const flumeSpec = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8")
);
const dataCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/fielddata/catalog.json"), "utf8"));
const challengeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/challenges/after-the-rain.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const tbWorld = loadWorld(JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8")));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

function clocksReady() {
  const discoveryState = createDiscoveryState();
  for (const id of ["glacial-erratic", "exposed-bedrock", "watershed-rail", "cut-bank", "point-bar"]) {
    addDiscovery(discoveryState, catalog, id);
  }
  const invState = createInvestigationState();
  beginInvestigation(invState, investigation, discoveryState);
  recordMeasurement(invState, investigation, "rock-compare", discoveryState);
  recordMeasurement(invState, investigation, "bedrock-grooves", discoveryState);
  recordMeasurement(invState, investigation, "valley-shape", discoveryState);
  recordMeasurement(invState, investigation, "sediment-sort", discoveryState);
  return { discoveryState, invState };
}

function completeUsePath({ revise = true, systems = true, conflict = true } = {}) {
  const missionState = createMissionState(mission);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(missionState, mission, id);
    tryAddPathNode(missionState, mission, id);
  }
  const { discoveryState, invState } = clocksReady();
  classifyCard(invState.obsInt, investigation.obsInt, "boulder-look", "observation");
  classifyCard(invState.obsInt, investigation.obsInt, "groove-look", "observation");
  if (revise) evaluateHypothesis(investigation, invState, "only-rain", ["transported-boulder"]);
  evaluateHypothesis(investigation, invState, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  const flumeState = createFlumeState();
  setFlumePrediction(flumeState, "steep");
  setFlumeWater(flumeState, "one-cup");
  for (const slope of flumeSpec.slopes) {
    setFlumeSlope(flumeState, slope.id);
    runTrial(flumeState, flumeSpec);
    runTrial(flumeState, flumeSpec);
  }
  const dataState = createDataState();
  setDatasetRows(dataState, "cedar-hollow-flow", flumeRows(flumeState, flumeSpec));
  setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", "slope", "speed");
  tryInterpretation(dataState, dataCatalog, "cedar-hollow-flow", "faster-with-slope", "steeper-faster");
  const challengeState = createChallengeState();
  challengeState.active = true;
  challengeState.pulsePredict = "confluence";
  for (const id of ["rain-gauge", "station-creek", "confluence", "westface-slump"]) {
    observeSite(challengeState, challengeSpec, id);
    if (challengeSpec.sites.find((site) => site.id === id)?.measure) {
      measureSite(challengeState, challengeSpec, id);
    }
  }
  tryChallengeExplanation(challengeState, challengeSpec, "tributary-slump");
  tryChallengeFollowUp(challengeState, challengeSpec, "marsh-usual");
  const puzzleState = createPuzzleState();
  if (systems) completeSystems(puzzleState, puzzleSpec);
  if (conflict) tryConflict(puzzleState, puzzleSpec, "narrow");
  return { missionState, discoveryState, invState, flumeState, dataState, challengeState, puzzleState };
}

check("Cedar Hollow required puzzles are CH-01 through CH-09", () => {
  const ids = puzzleSpec.puzzles.map((item) => item.id);
  assert.deepEqual(ids, ["CH-01", "CH-02", "CH-03", "CH-04", "CH-05", "CH-06", "CH-07", "CH-08", "CH-09"]);
  assert.equal(puzzleSpec.puzzles.every((item) => item.layer === "A"), true);
});

check("two clocks is required; glacier is not Topic 1 mastery", () => {
  assert.equal(investigation.hypothesis.requiredProcess, "two-clocks");
  assert.ok(investigation.hypothesis.requiredEvidenceIds.includes("sediment-sort"));
  assert.doesNotMatch(investigation.hypothesis.success, /Ice moved through this valley/i);
  assert.match(investigation.hypothesis.success, /longer clock/i);
  assert.match(investigation.wren.afterSuccess.join(" "), /another valley/i);
});

check("westface, high-look, and pond inquiries are scientific, not Continue chains", () => {
  const state = createPuzzleState();
  const wrong = classifySite(state, puzzleSpec, "westface-slope", "stayed");
  assert.equal(wrong.ok, false);
  const right = classifySite(state, puzzleSpec, "westface-slope", "downhill");
  assert.equal(right.ok, true);
  const linger = classifySite(state, puzzleSpec, "high-look", "low");
  assert.equal(linger.ok, true);
  const pondEnd = classifySite(state, puzzleSpec, "mirror-pond", "end");
  assert.equal(pondEnd.ok, false);
  const pondPause = classifySite(state, puzzleSpec, "mirror-pond", "pause");
  assert.equal(pondPause.ok, true);
});

check("CH-06 refuses a creek-only story and a jargon glacier word", () => {
  const { invState, discoveryState } = clocksReady();
  const rain = evaluateHypothesis(investigation, invState, "only-rain", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  assert.equal(rain.ok, false);
  const jargon = evaluateHypothesis(investigation, invState, "named-ice", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  assert.equal(jargon.ok, false);
  assert.match(jargon.hint, /vocabulary|longer clock/i);
  const ok = evaluateHypothesis(investigation, invState, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  assert.equal(ok.ok, true);
  void discoveryState;
});

check("systems map rejects trees-caused-the-flood", () => {
  const state = createPuzzleState();
  const bad = trySystemsTap(state, puzzleSpec, "willows");
  assert.equal(bad.ok, false);
  assert.match(bad.hint, /willows|storm|start/i);
  assert.equal(completeSystems(createPuzzleState(), puzzleSpec).ok, true);
});

check("CH-08 revision requires conflict then repair, not a first-try success", () => {
  const first = createPuzzleState();
  const keep = tryConflict(first, puzzleSpec, "keep-rain");
  assert.equal(keep.ok, false);
  assert.equal(first.conflict.repaired, false);
  const repair = tryConflict(first, puzzleSpec, "narrow");
  assert.equal(repair.ok, true);
  assert.equal(first.conflict.repaired, true);
});

check("AAR misconception is more evidence needed, not a score", () => {
  const answers = {
    ...goodEvidenceCase(),
    "aar-pulse": ["CH-05", "CH-06"]
  };
  const score = scoreAnswers(aarSpec, answers, 1);
  assert.equal(aarResult(score, []).startsWith("more"), true);
  assert.ok(score.misconception.some((row) => row.itemId === "aar-pulse"));
});

check("CH-06 use requires the two-clocks process, not any concluded landscape", () => {
  const { invState } = clocksReady();
  invState.concluded = true;
  invState.selectedProcess = "named-ice";
  const use = puzzleUse({
    missionState: createMissionState(mission),
    invState,
    investigation,
    challengeState: createChallengeState(),
    puzzleState: createPuzzleState(),
    obsIntState: { sorts: [] }
  });
  assert.equal(use["CH-06"], false);
});

check("guidance keeps two clocks after After the Rain, not as the first assignment", () => {
  const afterWater = fieldGuidance({
    regionId: "cedar-hollow",
    missionState: {
      concluded: true,
      observations: ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"].map((id) => ({ featureId: id }))
    },
    discoveryState: { foundIds: [] },
    invState: { measuredIds: [] },
    flumeState: {},
    dataState: { datasets: {} },
    challengeState: {},
    obsIntState: { sorts: [] },
    puzzleState: createPuzzleState()
  });
  assert.match(afterWater.question, /what can you see|water move faster/i);
  assert.doesNotMatch(afterWater.question, /Two clocks|What shaped/i);
  assert.match(gameJs, /challengeState.concluded && !invState.concluded && shouldIntroduceInvestigation/);
});

check("good AAR plus complete use is field clearance earned", () => {
  const path = completeUsePath();
  const use = puzzleUse({
    ...path,
    obsIntState: path.invState.obsInt,
    investigation,
    hasFairComparison: true
  });
  assert.equal(aarEligible(puzzleSpec, use), true);
  const result = submitAar(
    path.puzzleState,
    aarSpec,
    puzzleSpec,
    goodEvidenceCase(),
    incompletePuzzles(puzzleSpec, use)
  );
  assert.equal(result.result, "clearance");
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      ...path,
      flumeSpec,
      obsIntState: path.invState.obsInt
    })
  );
  assert.equal(competencyStatus(profile, mastery, "communication"), "demonstrated");
  assert.equal(regionMastered(profile, mastery), true);
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
});

check("incomplete systems blocks AAR and does not unlock High Country", () => {
  const path = completeUsePath({ systems: false, conflict: true });
  const use = puzzleUse({
    ...path,
    obsIntState: path.invState.obsInt,
    investigation,
    hasFairComparison: true
  });
  assert.equal(use["CH-07"], false);
  assert.equal(aarEligible(puzzleSpec, use), false);
  const result = submitAar(path.puzzleState, aarSpec, puzzleSpec, {}, incompletePuzzles(puzzleSpec, use));
  assert.equal(result.result, "more-evidence");
  assert.match(result.lines.join(" "), /system|Hollow Is a System|CH-07/i);
});

check("save round-trips puzzle and AAR state", () => {
  const path = completeUsePath();
  path.puzzleState.aar.result = "more-evidence";
  path.puzzleState.aar.remediation = ["Go back to the runoff table."];
  const snap = captureSave({
    player: { x: 12, y: 34, facing: 1 },
    missionState: path.missionState,
    discoveryState: path.discoveryState,
    invState: path.invState,
    taught: emptyTaught(),
    flumeState: path.flumeState,
    dataState: path.dataState,
    challengeState: path.challengeState,
    puzzleState: path.puzzleState
  });
  assert.equal(snap.v, SAVE_VERSION);
  assert.equal(snap.puzzles.aar.result, "more-evidence");
  const loaded = createPuzzleState();
  applySave(snap, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: loaded
  });
  assert.equal(loaded.aar.result, "more-evidence");
  assert.match(loaded.aar.remediation[0], /runoff/i);
  const v5 = migrateSave({ v: 5, world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] } });
  assert.equal(v5.v, 6);
  assert.equal(v5.puzzles.aar.result, null);
});

check("tablet evidence is categorized and AAR UI is wired", () => {
  const use = { "CH-01": true, "CH-02": true, "CH-03": true, "CH-04": false, "CH-05": false, "CH-06": false, "CH-07": false, "CH-08": false, "CH-09": false };
  const rows = tabletEvidence(puzzleSpec, use, {});
  assert.ok(rows.some((row) => row.category === "observation"));
  assert.ok(rows.some((row) => row.category === "pattern"));
  assert.match(html, /id="aar"/);
  assert.match(html, /id="systems-sketch"/);
  assert.match(html, /id="aar-evidence"/);
  assert.match(html, /id="systems-map"/);
  assert.match(css, /#aar:not\(\[hidden\]\)/);
  assert.match(css, /#systems-map:not\(\[hidden\]\)/);
  assert.match(gameJs, /openAar/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /aspect-ratio:\s*3\s*\/\s*2/);
  assert.match(css, /:has\(#journal\.is-open\)/);
  assert.match(css, /#systems-map canvas/);
  assert.match(css, /\.aar-card-btn/);
});

check("Dark Sky stays closed on the production atlas", () => {
  assert.doesNotMatch(html, /\?field=1/);
  assert.doesNotMatch(html, /Summit trail/);
  const hcPuzzles = fs.existsSync(path.join(root, "data/puzzles/high-country.json"));
  assert.equal(hcPuzzles, false);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9A checks passed.");
