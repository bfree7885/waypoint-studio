#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9C — Summit tutor (deterministic, Cedar Hollow).
 * Run: node terrainbound/tests/phase7_9c.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPuzzleState } from "../js/puzzles.js";
import { createMissionState } from "../js/mission.js";
import { createDiscoveryState } from "../js/discoveries.js";
import { createInvestigationState } from "../js/investigation.js";
import { createFlumeState } from "../js/flume.js";
import { createDataState } from "../js/fielddata.js";
import { createChallengeState } from "../js/challenge.js";
import { captureSave, applySave, emptyTaught, SAVE_VERSION, migrateSave } from "../js/save.js";
import { createSummitEngine, createSummitState, buildSummitContext } from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { judgeClaim } from "../js/aar.js";

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
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");
const engine = createSummitEngine({ curriculum, concepts });

function baseInput(extra = {}) {
  return {
    regionId: "cedar-hollow",
    player: { x: 400, y: 400 },
    region: { features: [] },
    catalog: { items: [] },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: createPuzzleState(),
    puzzleSpec,
    aarSpec,
    flumeSpec,
    investigation: { hypothesis: { requiredProcess: "two-clocks" } },
    aarOpen: false,
    aarIndex: 0,
    ...extra
  };
}

function ask(state, input, opts) {
  return engine.ask(state, input, opts);
}

check("Summit is a new tutor, not renamed field guidance", () => {
  assert.match(html, /id="summit"/);
  assert.match(html, /id="summit-toggle"/);
  assert.match(html, /id="aar-summit"/);
  assert.match(gameJs, /createSummitEngine/);
  assert.match(gameJs, /fieldGuidance/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "js/guidance.js"), "utf8"), /Summit/);
  assert.match(arch, /Wren vs Summit/);
  assert.match(arch, /DeterministicProvider/);
  assert.match(arch, /AIProvider/);
  assert.match(arch, /grounding/i);
});

check("A. CH puzzles remain completable without Summit", () => {
  const use = buildSummitContext(baseInput()).use;
  assert.equal(use["CH-09"], false);
  assert.doesNotMatch(gameJs, /noteStruggle\(.*clearance/);
});

check("B. How do I play explains the loop without revealing a card id", () => {
  const state = createSummitState();
  const reply = ask(state, baseInput(), { question: "What am I supposed to do?" });
  assert.match(reply.text, /Field Tablet|Wren|observe/i);
  assert.doesNotMatch(reply.text, /CH-\d+|pin CH-|You are trying to say/i);
  assert.equal(reply.intent, "game_help");
  assert.equal(reply.route.reason, "game-help");
  assert.equal(reply.level, 0);
});

check("C/D. first hint notices; several hints climb the ladder", () => {
  const state = createSummitState();
  const input = baseInput();
  const first = ask(state, input, { action: "hint" });
  assert.equal(first.level, 1);
  ask(state, input, { action: "hint" });
  ask(state, input, { action: "hint" });
  const fourth = ask(state, input, { action: "hint" });
  assert.equal(fourth.level, 4);
  const fifth = ask(state, input, { action: "hint" });
  assert.equal(fifth.level, 4);
});

check("E/F. explain teaches; strongest scaffold still requires the student to act", () => {
  const state = createSummitState();
  const input = baseInput();
  const taught = ask(state, input, { question: "Explain this" });
  assert.equal(taught.level, 3);
  assert.match(taught.text, /gravity|downhill|runoff/i);
  for (let i = 0; i < 8; i += 1) ask(state, input, { action: "hint" });
  const max = ask(state, input, { action: "hint" });
  assert.equal(max.level, 4);
  assert.equal(max.revealsAnswer, false);
  assert.doesNotMatch(max.text, /CH-\d+|pin CH-|tap rain-gauge/i);
});

check("G/H. known misconception gets a specific response", () => {
  const state = createSummitState();
  const flume = createFlumeState();
  flume.unfairAttempted = true;
  const input = baseInput({
    missionState: { ...createMissionState({ id: "t", title: "t" }), concluded: true, observations: [] },
    invState: { ...createInvestigationState(), obsInt: { sorts: [{ ok: true }, { ok: true }] } },
    flumeState: flume
  });
  const reply = ask(state, input, { question: "Why was that wrong?" });
  assert.match(reply.text, /two changes|fair|water/i);
  assert.equal(reply.misconceptionId, "unfair-test");
  assert.ok(state.misconceptionsAddressed.includes("unfair-test"));
});

check("I. Summit references evidence that exists", () => {
  const state = createSummitState();
  const flume = createFlumeState();
  flume.trials = [
    { slope: "steep", water: "one-cup", seconds: 3.1, fair: true },
    { slope: "steep", water: "one-cup", seconds: 3.2, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 6.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 6.5, fair: true }
  ];
  if (flumeSpec.slopes.length > 2) {
    const extra = flumeSpec.slopes.filter((row) => row.id !== "steep" && row.id !== "gentle");
    for (const slope of extra) {
      flume.trials.push({ slope: slope.id, water: "one-cup", seconds: 4.4, fair: true });
      flume.trials.push({ slope: slope.id, water: "one-cup", seconds: 4.5, fair: true });
    }
  }
  const input = baseInput({
    missionState: { concluded: true, observations: [], storyNotes: [] },
    invState: { ...createInvestigationState(), obsInt: { sorts: [{ ok: true }, { ok: true }] } },
    flumeState: flume
  });
  const reply = ask(state, input, { question: "Explain the graph" });
  assert.match(reply.text, /3\.1|6\.4|recorded/i);
  assert.doesNotMatch(reply.text, /haven't measured that yet/i);
});

check("J. Summit does not invent uncollected evidence", () => {
  const state = createSummitState();
  const reply = ask(state, baseInput(), { question: "Explain the graph" });
  assert.match(reply.text, /haven't measured|runoff table/i);
  assert.doesNotMatch(reply.text, /3\.1s|you recorded 6/i);
  const look = ask(createSummitState(), baseInput(), { question: "What did I find at High Look?" });
  assert.match(look.text, /haven't inspected High Look/i);
});

check("K. vocabulary question uses the concept library", () => {
  const reply = ask(createSummitState(), baseInput(), { question: "What is runoff?" });
  assert.equal(reply.intent, "vocab");
  assert.ok(reply.conceptIds.includes("runoff"));
  assert.match(reply.text, /rainwater|ground/i);
  assert.ok(reply.moreAvailable);
});

check("L. graph/table intent is distinct from a definition dump", () => {
  const reply = ask(createSummitState(), baseInput(), { question: "What should I compare?" });
  assert.ok(reply.intent === "compare" || reply.intent === "graph" || /compare|table|slope/i.test(reply.text));
});

check("M/N. AAR rejection is explained without naming a card id", () => {
  const state = createSummitState();
  const puzzleState = createPuzzleState();
  puzzleState.aar.answers = { "aar-obs": ["CH-02"] };
  const claim = aarSpec.claims.find((item) => item.id === "aar-obs");
  const judged = judgeClaim(claim, ["CH-02"]);
  puzzleState.aar.lastJudge = { ...judged, claimId: "aar-obs", pinned: ["CH-02"] };
  const inv = createInvestigationState();
  inv.obsInt.sorts = [{ ok: true }, { ok: true }];
  const missionState = createMissionState({ id: "t", title: "t" });
  missionState.concluded = true;
  const input = baseInput({
    puzzleState,
    missionState,
    invState: inv,
    aarOpen: true,
    aarIndex: 0
  });
  const ctx = buildSummitContext({ ...input, summitState: state });
  assert.equal(ctx.activePuzzleId, "CH-09");
  const reply = ask(state, input, { question: "Why doesn't this evidence work?" });
  assert.match(reply.text, /different question|clock|boulder|water path/i);
  assert.doesNotMatch(reply.text, /Pin CH-|pin CH-01/i);
  assert.equal(reply.revealsAnswer, false);
});

check("O. save/reload keeps Summit memory, not a score penalty", () => {
  const state = createSummitState();
  ask(state, baseInput(), { action: "hint" });
  ask(state, baseInput(), { question: "What is slope?" });
  const snap = captureSave({
    player: { x: 1, y: 2, facing: 1 },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: createPuzzleState(),
    summitState: state
  });
  assert.equal(snap.v, SAVE_VERSION);
  assert.ok(snap.summit.turns >= 2);
  const loaded = createSummitState();
  applySave(snap, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: createPuzzleState(),
    summitState: loaded
  });
  assert.ok(loaded.turns >= 2);
  assert.ok(loaded.conceptsExplained.length);
  const old = migrateSave({ v: 6, puzzles: createPuzzleState(), world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] } });
  assert.equal(old.summit.turns, 0);
});

check("P/Q. Summit UI is touch-friendly and present on HUD", () => {
  assert.match(css, /\.summit-sheet/);
  assert.match(css, /\.summit-form input/);
  assert.match(css, /min-height: 44px/);
  assert.match(html, /Ask Summit/);
  assert.doesNotMatch(html, /\?field=1/);
});

check("intent recognition covers natural Cedar Hollow questions", () => {
  assert.equal(detectIntent("I don't understand").intent, "explain");
  assert.equal(detectIntent("Why did the water move faster?").intent, "explain");
  assert.equal(detectIntent("What does the marsh do?").intent, "what_now");
  assert.equal(detectIntent("What is runoff?").intent, "vocab");
  assert.equal(detectIntent("Why doesn't this evidence work?").intent, "why_evidence");
});

check("CH-01 through CH-09 have a tutoring pack", () => {
  for (const id of ["CH-01", "CH-02", "CH-03", "CH-04", "CH-05", "CH-06", "CH-07", "CH-08", "CH-09"]) {
    const pack = curriculum.puzzles[id];
    assert.ok(pack.orient && pack.notice && pack.reason && pack.teach && pack.scaffold);
    assert.ok(pack.misconceptions && Object.keys(pack.misconceptions).length);
  }
});

check("no score, shame, or hint cap in Summit", () => {
  assert.doesNotMatch(gameJs, /hint cap|hints remaining|weaker student/i);
  assert.doesNotMatch(html, /Great job|Awesome!!!|Incorrect/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9C Summit checks passed.");
