#!/usr/bin/env node
/**
 * TerrainBound Phase 8C — complete Dark Sky Basin.
 * Run: node terrainbound/tests/phase8_c.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, isBlocked, heightAt } from "../js/world.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { migrateSave, captureSave, applySave, SAVE_VERSION, emptyTaught, emptyDarkSkySave } from "../js/save.js";
import { submitAar } from "../js/aar.js";
import { incompletePuzzles } from "../js/puzzles.js";
import {
  emptyDarkSkySave as emptyDs,
  observeTarget,
  readTwinsLog,
  markEyepieceSeen,
  setLampOn,
  logLampCalibration,
  tryStellarAlign,
  markStellarFeature,
  logStellarCompare,
  logTwinsConclusion,
  logEmberPeaks,
  logEmberConclusion,
  ds01Complete,
  ds02Complete,
  ds03Complete,
  ds04Complete,
  ds05Complete,
  ds06Complete,
  ds07Complete,
  ds08Complete,
  ds09Complete,
  ds10Complete,
  dsAarEligible,
  darkSkyEvidence,
  darkSkyPuzzleEvidence,
  buildDarkSkyTruth,
  buildDarkSkySummitContext,
  logBrightnessGuess,
  viewRimPlate,
  markShiftedStar,
  logCairnClaim,
  placePlotStar,
  logPlot,
  pickMassBranch,
  checkRemnant,
  logMassClaim,
  pickUpRock,
  logMetalCompare,
  logNucleosynthesis,
  placeRedshiftPoint,
  logRedshiftTrend,
  rejectCompeting,
  pointHorn,
  pinOrigin,
  logOriginCase,
  setLaterTonight,
  readDistantPoster,
  logLookback,
  toggleEnvelope,
  logEnvelope,
  debugCompleteThrough,
  completePuzzleUse,
  CAIRN_NEAR
} from "../js/darksky.js";
import { selectSummitPacket } from "../js/summit-packet.js";
import { validateSummitOutput } from "../js/summit-validate.js";
import { createSummitEngine, createSummitState } from "../js/summit.js";

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

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/darksky/catalog.json"), "utf8"));
const region = JSON.parse(fs.readFileSync(path.join(root, "data/regions/dark-sky-basin.json"), "utf8"));
const puzzles = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/dark-sky-basin.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/dark-sky-basin.json"), "utf8"));
const summitSpec = JSON.parse(fs.readFileSync(path.join(root, "data/summit/dark-sky-basin.json"), "utf8"));
const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const provider = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const workerSrc = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");
const wrangler = fs.readFileSync(path.join(root, "server/wrangler.toml"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

function seed01(state) {
  markEyepieceSeen(state);
  observeTarget(state, "west-twin");
  observeTarget(state, "east-twin");
  readTwinsLog(state);
  setLampOn(state, true);
  logLampCalibration(state, catalog, [436, 546], true);
  tryStellarAlign(state, catalog, 0);
  markStellarFeature(state, 486, "diff");
  markStellarFeature(state, 589, "diff");
  logStellarCompare(state);
  logTwinsConclusion(state);
}

function seed02(state) {
  seed01(state);
  observeTarget(state, "cooler-ember");
  logEmberPeaks(state, catalog, 628, 428);
  logEmberConclusion(state);
}

function through(id) {
  const state = emptyDs();
  debugCompleteThrough(state, catalog, id, { seed01, seed02 });
  return state;
}

check("world includes opposite rims and Quiet Floor", () => {
  const ids = region.features.map((row) => row.id);
  assert.ok(ids.includes("west-rim-stake"));
  assert.ok(ids.includes("east-rim-stake"));
  assert.ok(ids.includes("quiet-floor"));
  assert.ok(ids.includes("lamp-bench"));
  assert.ok(ids.includes("north-rim-station"));
  const west = region.features.find((row) => row.id === "west-rim-stake");
  const east = region.features.find((row) => row.id === "east-rim-stake");
  const dist = Math.hypot(east.x - west.x, east.y - west.y);
  assert.ok(dist > 1400, `baseline ${dist}`);
  const world = createWorld(region, 4113, []);
  assert.equal(isBlocked(world, west.x, west.y), false);
  assert.equal(isBlocked(world, east.x, east.y), false);
  assert.equal(isBlocked(world, 1288, 980), false);
  assert.ok(heightAt(region, region.peak.x, region.peak.y) > heightAt(region, 1288, 980));
});

check("DS-01 and DS-02 remain intact as prerequisites", () => {
  const state = emptyDs();
  assert.equal(logCairnClaim(state).ok, false);
  seed02(state);
  assert.equal(ds01Complete(state), true);
  assert.equal(ds02Complete(state), true);
  assert.equal(ds03Complete(state), false);
});

check("DS-03 requires both rims and rejects brightness-as-distance", () => {
  const state = through("DS-02");
  logBrightnessGuess(state, "same-distance");
  assert.equal(markShiftedStar(state, CAIRN_NEAR).ok, false);
  viewRimPlate(state, "west");
  assert.equal(markShiftedStar(state, CAIRN_NEAR).ok, false);
  viewRimPlate(state, "east");
  assert.equal(markShiftedStar(state, "cairn-far").ok, false);
  assert.equal(markShiftedStar(state, CAIRN_NEAR).ok, true);
  assert.equal(logCairnClaim(state).ok, true);
  assert.equal(ds03Complete(state), true);
  const text = JSON.stringify(darkSkyEvidence(state));
  assert.match(text, /no longer works|insufficient to rank distance/i);
  assert.doesNotMatch(text, /brighter is closer|dim is farther/i);
});

check("DS-04 diagram is built from player placements, not a labeled poster", () => {
  const state = through("DS-03");
  assert.equal(logPlot(state).ok, false);
  placePlotStar(state, "west-twin", 90, 90);
  placePlotStar(state, "cooler-ember", 10, 90);
  placePlotStar(state, "cairn-far", 90, 10);
  assert.equal(logPlot(state).ok, false);
  placePlotStar(state, "west-twin", 24, 44);
  placePlotStar(state, "cooler-ember", 78, 38);
  placePlotStar(state, "cairn-far", 28, 78);
  assert.equal(logPlot(state).ok, true);
  assert.equal(ds04Complete(state), true);
  const json = JSON.stringify(darkSkyEvidence(state));
  assert.match(json, /Player-built diagram/);
  assert.doesNotMatch(json, /HR diagram|main sequence/);
});

check("DS-05 mass branches lives instead of one cartoon path", () => {
  const state = through("DS-04");
  pickMassBranch(state, "hot", "same-life");
  pickMassBranch(state, "sun", "supernova");
  checkRemnant(state, "sun-like");
  assert.equal(logMassClaim(state).ok, false);
  pickMassBranch(state, "hot", "remnant");
  pickMassBranch(state, "sun", "no-supernova");
  assert.equal(checkRemnant(state, "blue-remnant").ok, true);
  assert.equal(logMassClaim(state).ok, true);
  assert.equal(ds05Complete(state), true);
});

check("DS-06 requires Quiet Floor rock and rejects all-elements-in-stars", () => {
  const state = through("DS-05");
  assert.equal(pickUpRock(state, false).ok, false);
  assert.equal(pickUpRock(state, true).ok, true);
  assert.equal(logMetalCompare(state, 430).ok, false);
  assert.equal(logMetalCompare(state, 518).ok, true);
  assert.equal(logNucleosynthesis(state, "all-in-stars").ok, false);
  assert.equal(logNucleosynthesis(state, "heavy-from-stars").ok, true);
  assert.equal(ds06Complete(state), true);
  const note = (state.notes || []).find((row) => row.id === "nucleo-claim");
  assert.doesNotMatch(note.text, /all elements were made in stars/i);
  assert.match(note.text, /light elements are earlier/i);
});

check("DS-07 treats redshift as a moved pattern, not a red color", () => {
  const state = through("DS-06");
  placeRedshiftPoint(state, "galaxy-near", 22, 80);
  placeRedshiftPoint(state, "galaxy-mid", 48, 50);
  placeRedshiftPoint(state, "galaxy-far", 78, 20);
  assert.equal(logRedshiftTrend(state, catalog).ok, false);
  placeRedshiftPoint(state, "galaxy-near", 22, 28);
  placeRedshiftPoint(state, "galaxy-mid", 48, 52);
  placeRedshiftPoint(state, "galaxy-far", 78, 82);
  assert.equal(logRedshiftTrend(state, catalog).ok, true);
  assert.equal(rejectCompeting(state, "red-color").ok, false);
  assert.equal(rejectCompeting(state, "all-same").ok, true);
  assert.equal(ds07Complete(state), true);
  assert.match(JSON.stringify(darkSkyEvidence(state)), /longer wavelength together on farther galaxy plates/i);
});

check("DS-08 assembles three origin lines, not a slogan", () => {
  const state = through("DS-07");
  assert.equal(pointHorn(state, "zenith", false).ok, false);
  pointHorn(state, "wall", true);
  pointHorn(state, "zenith", true);
  pinOrigin(state, "expansion");
  assert.equal(logOriginCase(state).ok, false);
  pinOrigin(state, "abundance");
  pinOrigin(state, "leftover");
  assert.equal(logOriginCase(state).ok, true);
  assert.equal(ds08Complete(state), true);
});

check("DS-09 lookback refuses happening-now", () => {
  const state = through("DS-08");
  assert.equal(logLookback(state, "earlier-light").ok, false);
  readDistantPoster(state);
  setLaterTonight(state, true);
  assert.equal(logLookback(state, "happening-now").ok, false);
  assert.equal(logLookback(state, "earlier-light").ok, true);
  assert.equal(ds09Complete(state), true);
});

check("DS-10 envelope requires observed, inferred, unknown, and a refused overclaim", () => {
  const state = through("DS-09");
  toggleEnvelope(state, "observed", "happening-now");
  toggleEnvelope(state, "inferred", "not-hotter");
  toggleEnvelope(state, "unknown", "distance");
  toggleEnvelope(state, "unknown", "present-state");
  toggleEnvelope(state, "refuse", "famous-name");
  assert.equal(logEnvelope(state).ok, false);
  toggleEnvelope(state, "observed", "happening-now");
  toggleEnvelope(state, "observed", "spectrum-shape");
  assert.equal(logEnvelope(state).ok, true);
  assert.equal(ds10Complete(state), true);
  assert.equal(dsAarEligible(state, true, true), true);
});

check("Wren AAR is evidence pinning, not a quiz, and preserves work on more evidence", () => {
  const state = through("DS-10");
  const use = completePuzzleUse(state, true, true);
  assert.equal(incompletePuzzles(puzzles, use).length, 0);
  const empty = submitAar(state, aarSpec, puzzles, {}, []);
  assert.equal(empty.result, "more-evidence");
  assert.equal(ds01Complete(state), true);
  assert.equal(ds10Complete(state), true);
  const bad = submitAar(state, aarSpec, puzzles, { "aar-twins": ["DS-06"] }, []);
  assert.equal(bad.result, "more-evidence");
  const good = submitAar(state, aarSpec, puzzles, {
    "aar-twins": ["DS-01"],
    "aar-distance": ["DS-03"],
    "aar-envelope": ["DS-10"],
    "aar-refuse": ["DS-09"]
  }, []);
  assert.equal(good.result, "clearance");
  assert.match(good.title, /clearance/i);
  const pins = darkSkyPuzzleEvidence(state);
  assert.ok(pins.some((row) => row.id === "DS-01") && pins.some((row) => row.id === "DS-10"));
  for (const row of pins) {
    assert.ok(row.note && row.note !== row.title, `${row.id} AAR note must not repeat the title`);
  }
});

check("save v6 still migrates Cedar Hollow and keeps Dark Sky fields", () => {
  assert.equal(SAVE_VERSION, 6);
  const v6 = migrateSave({
    v: 6,
    player: { x: 12, y: 18, facing: 1 },
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    taught: { walk: true }
  });
  assert.equal(v6.world.currentRegion, "cedar-hollow");
  assert.equal(v6.darkSky.cairnConcluded, false);
  const dsState = through("DS-06");
  const worldState = { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] };
  const snap = captureSave({
    player: { x: 12, y: 18, facing: 1 },
    missionState: { introSeen: true, observations: [], storyNotes: [], conclusionPath: [], concluded: false, flowVisible: false },
    discoveryState: { foundIds: [], acknowledgedIds: [], wrenTalks: 0 },
    invState: { introSeen: false, active: false, measuredIds: [], attempts: 0, obsInt: { sorts: [] } },
    taught: emptyTaught(),
    worldState,
    masteryState: { records: [] },
    toolState: { earnedIds: [] },
    flumeState: {},
    dataState: {},
    challengeState: {},
    puzzleState: {},
    summitState: {},
    hcState: {},
    sfState: {},
    dsState,
    regionPlayers: { "cedar-hollow": { x: 12, y: 18, facing: 1 }, "dark-sky-basin": { x: 1220, y: 1020, facing: 1 } },
    presentation: {}
  });
  assert.equal(snap.v, 6);
  assert.equal(snap.world.currentRegion, "cedar-hollow");
  assert.equal(snap.darkSky.rockPicked, true);
  const loaded = emptyDarkSkySave();
  applySave(snap, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: {},
    discoveryState: {},
    invState: { obsInt: { sorts: [] } },
    taught: emptyTaught(),
    worldState: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    masteryState: { records: [] },
    toolState: { earnedIds: [] },
    flumeState: {},
    dataState: {},
    challengeState: {},
    puzzleState: {},
    summitState: {},
    hcState: {},
    sfState: {},
    dsState: loaded,
    regionPlayers: {},
    presentation: {}
  });
  assert.equal(loaded.rockPicked, true);
  assert.equal(loaded.cairnConcluded, true);
});

check("Dark Sky stays closed on the atlas and production Summit is unchanged", () => {
  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  assert.equal(worldRaw.regions.find((row) => row.id === "dark-sky-basin").implementationState, "future");
  assert.equal(provider.productionEndpoint, "https://terrainbound-summit.bfree7885.workers.dev/summit");
  assert.doesNotMatch(workerSrc, /dark-sky-basin|DS-01/);
  assert.match(wrangler, /terrainbound-summit/);
  assert.match(gameJs, /darkSkyReview/);
  assert.equal(puzzles.puzzles.map((row) => row.id).join(","), "DS-01,DS-02,DS-03,DS-04,DS-05,DS-06,DS-07,DS-08,DS-09,DS-10");
});

check("Summit truth stays packet-bound and blocks astronomy hallucinations", () => {
  const fresh = emptyDs();
  const truth = buildDarkSkyTruth(fresh, catalog);
  assert.ok(truth.unknown.some((row) => /lamp calibration/i.test(row)));
  assert.ok(truth.doNotClaim.some((row) => /everything was made in stars/i.test(row)));
  const ctx = buildDarkSkySummitContext({
    state: through("DS-03"),
    catalog,
    region,
    player: region.westRim,
    spec: summitSpec
  });
  const packet = selectSummitPacket({ context: ctx, question: "The brighter one is closer, right?" });
  assert.equal(packet.facts.cairnConcluded, true);
  const brighter = validateSummitOutput(
    { explanation: "Yes, the brighter one is closer." },
    packet,
    { question: "The brighter one is closer, right?" }
  );
  assert.equal(brighter.ok, false);
  const redshift = validateSummitOutput(
    { explanation: "Redshift means the galaxy looks red." },
    packet,
    { question: "Does redshift mean it looks red?" }
  );
  assert.equal(redshift.ok, false);
  const engine = createSummitEngine({
    curriculum: summitSpec,
    concepts: { concepts: [] }
  });
  const reply = engine.ask(createSummitState(), ctx, { question: "Was everything made in stars?" });
  assert.match(String(reply.text || ""), /not all elements|earlier chapter/i);
});

check("interaction vocabulary is not overlay-slider-only", () => {
  assert.match(gameJs, /openRimPlates|renderPlotBoard|openHorn|openEnvelope|openFloorRock|later tonight/i);
  assert.match(gameJs, /Walked baseline|Point zenith|Unlabeled plot/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 8C checks passed.");
