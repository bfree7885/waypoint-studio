#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9B — Cedar Hollow game-feel (CH-07 spatial, CH-09 evidence case).
 * Run: node terrainbound/tests/phase7_9b.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPuzzleState, trySystemsTap, currentSystemsPrompt, completeSystems, hitSystemsSite } from "../js/puzzles.js";
import {
  submitAar,
  scoreAnswers,
  aarResult,
  judgeClaim,
  goodEvidenceCase,
  selectedIds,
  toggleEvidence,
  resetAarAnswers
} from "../js/aar.js";
import { captureSave, applySave, emptyTaught, SAVE_VERSION } from "../js/save.js";
import { createMissionState } from "../js/mission.js";
import { createDiscoveryState } from "../js/discoveries.js";
import { createInvestigationState } from "../js/investigation.js";
import { createFlumeState } from "../js/flume.js";
import { createDataState } from "../js/fielddata.js";
import { createChallengeState } from "../js/challenge.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

check("CH-07 is a spatial hollow map, not sphere chips", () => {
  assert.ok(puzzleSpec.systems.sites.some((item) => item.id === "westface"));
  assert.ok(puzzleSpec.systems.sites.some((item) => item.id === "fox-run"));
  assert.equal(puzzleSpec.systems.predict.ok, "station-creek");
  assert.doesNotMatch(JSON.stringify(puzzleSpec.systems), /trees-weather/);
  assert.match(html, /id="systems-sketch"/);
  assert.match(html, /id="systems-walk"/);
  assert.match(gameJs, /trySystemsTap/);
  assert.match(gameJs, /maybeSystemsTap/);
});

check("tapping willows as the source is rejected; walking the map can complete CH-07", () => {
  const state = createPuzzleState();
  assert.equal(currentSystemsPrompt(state, puzzleSpec).role.id, "source");
  const trees = trySystemsTap(state, puzzleSpec, "willows");
  assert.equal(trees.ok, false);
  assert.match(trees.hint, /willows|storm/i);
  const rain = trySystemsTap(state, puzzleSpec, "rain-gauge");
  assert.equal(rain.ok, true);
  assert.equal(completeSystems(createPuzzleState(), puzzleSpec).ok, true);
});

check("predict tap uses the clearer station reach, not the marsh", () => {
  const state = createPuzzleState();
  completeSystems(state, puzzleSpec);
  assert.equal(state.systems.predict, "station-creek");
  const mid = createPuzzleState();
  for (const role of puzzleSpec.systems.roles) {
    const site = puzzleSpec.systems.sites.find((item) => item.role === role.id);
    trySystemsTap(mid, puzzleSpec, site.id);
  }
  const marsh = trySystemsTap(mid, puzzleSpec, "marsh");
  assert.equal(marsh.ok, false);
  assert.match(marsh.hint, /storage|tea|pulse/i);
});

check("sketch hit testing finds Westface without hover", () => {
  const site = hitSystemsSite(puzzleSpec, 400, 240, 72, 82);
  assert.equal(site?.id, "westface");
});

check("A. correct case using appropriate evidence earns clearance", () => {
  const state = createPuzzleState();
  const result = submitAar(state, aarSpec, puzzleSpec, goodEvidenceCase(), []);
  assert.equal(result.result, "clearance");
  assert.doesNotMatch(result.lines.join(" "), /Correct|Question 3/i);
});

check("B. selecting irrelevant evidence is not a case", () => {
  const claim = aarSpec.claims.find((item) => item.id === "aar-table");
  const judged = judgeClaim(claim, ["CH-03", "CH-01"]);
  assert.equal(judged.good, false);
  assert.equal(judged.kind, "overclaim");
  assert.match(judged.hint, /boulder|clock/i);
  const boulder = aarSpec.claims.find((item) => item.id === "aar-obs");
  assert.equal(judgeClaim(boulder, ["CH-01", "CH-02"]).good, false);
});

check("C. correct conclusion with insufficient evidence is more evidence needed", () => {
  const claim = aarSpec.claims.find((item) => item.id === "aar-pulse");
  const judged = judgeClaim(claim, ["CH-03"]);
  assert.equal(judged.good, false);
  assert.equal(judged.kind, "incomplete");
  const result = submitAar(createPuzzleState(), aarSpec, puzzleSpec, { "aar-pulse": ["CH-03"] }, []);
  assert.equal(result.result, "more-evidence");
  assert.match(result.lines.join(" "), /rain|pulse|runoff/i);
});

check("D. misconception with partially correct evidence is more evidence needed", () => {
  const answers = { ...goodEvidenceCase(), "aar-pulse": ["CH-05", "CH-06"] };
  const score = scoreAnswers(aarSpec, answers, 1);
  assert.equal(aarResult(score, []).startsWith("more"), true);
  assert.ok(score.misconception.some((row) => row.itemId === "aar-pulse"));
  assert.match(score.rows.find((row) => row.itemId === "aar-pulse").hint, /clock|mud/i);
});

check("E/F. more evidence needed keeps valid notes and names the gap", () => {
  const state = createPuzzleState();
  state.systems.concluded = true;
  const result = submitAar(state, aarSpec, puzzleSpec, { "aar-obs": ["CH-01"] }, ["CH-07"]);
  assert.equal(result.result, "more-evidence");
  assert.match(result.lines.join(" "), /Hollow Is a System|CH-07|system/i);
  assert.deepEqual(selectedIds(state.aar.answers, "aar-obs"), ["CH-01"]);
  resetAarAnswers(state);
  assert.equal(state.aar.result, null);
  assert.deepEqual(state.aar.answers, {});
  assert.equal(state.systems.concluded, true);
});

check("G. clearance after a revised selection", () => {
  const claim = aarSpec.claims.find((item) => item.id === "aar-table");
  let picks = ["CH-01"];
  assert.equal(judgeClaim(claim, picks).good, false);
  picks = toggleEvidence(picks, "CH-01");
  picks = toggleEvidence(picks, "CH-03");
  picks = toggleEvidence(picks, "CH-02");
  assert.equal(judgeClaim(claim, picks).good, true);
  const result = submitAar(createPuzzleState(), aarSpec, puzzleSpec, goodEvidenceCase(), []);
  assert.equal(result.result, "clearance");
});

check("H. save/reload during AAR keeps evidence selections", () => {
  const state = createPuzzleState();
  state.aar.answers = { "aar-obs": ["CH-01"] };
  state.aar.result = null;
  const snap = captureSave({
    player: { x: 8, y: 9, facing: -1 },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: state
  });
  assert.equal(snap.v, SAVE_VERSION);
  const loaded = createPuzzleState();
  applySave(snap, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: loaded
  });
  assert.deepEqual(loaded.aar.answers["aar-obs"], ["CH-01"]);
  assert.equal(loaded.aar.result, null);
});

check("CH-09 UI is evidence selection, not four answer chips", () => {
  assert.match(html, /id="aar-evidence"/);
  assert.doesNotMatch(html, /id="aar-choices"/);
  assert.match(html, /Show Wren/);
  assert.match(css, /button\.aar-card-btn/);
  assert.doesNotMatch(aarSpec.claims[0].wren, /Select the best answer/);
  assert.match(gameJs, /tabletEvidence/);
});

check("Dark Sky and other regions stay unimplemented", () => {
  assert.doesNotMatch(gameJs, /dark-sky-basin/);
  assert.equal(fs.existsSync(path.join(root, "data/puzzles/high-country.json")), false);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9B checks passed.");
