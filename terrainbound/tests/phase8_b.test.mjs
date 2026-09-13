#!/usr/bin/env node
/**
 * TerrainBound Phase 8B — Dark Sky Basin first playable slice.
 * Run: node terrainbound/tests/phase8_b.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, heightAt, isBlocked, basinNightColor } from "../js/world.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { migrateSave, captureSave, applySave, SAVE_VERSION, emptyTaught, emptyDarkSkySave } from "../js/save.js";
import {
  emptyDarkSkySave as emptyDs,
  twinTargets,
  tracesCanMatch,
  lampMarkersOk,
  lampWalkDistance,
  observeTarget,
  readTwinsLog,
  markEyepieceSeen,
  setLampOn,
  logLampCalibration,
  openSpectrograph,
  tryStellarAlign,
  markStellarFeature,
  logStellarCompare,
  logTwinsConclusion,
  logEmberPeaks,
  logEmberConclusion,
  ds01Complete,
  ds02Complete,
  darkSkyEvidence,
  buildDarkSkyTruth,
  buildDarkSkySummitContext,
  darkSkyPacketFacts
} from "../js/darksky.js";
import { selectSummitPacket } from "../js/summit-packet.js";
import { validateSummitOutput } from "../js/summit-validate.js";

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
const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const provider = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const workerSrc = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");
const wrangler = fs.readFileSync(path.join(root, "server/wrangler.toml"), "utf8");

check("catalog is deterministic and expandable", () => {
  assert.equal(catalog.nightLock, true);
  assert.equal(catalog.targets.length >= 3, true);
  const [west, east] = twinTargets(catalog);
  assert.equal(west.visual.color.startsWith("#f"), true);
  assert.equal(east.visual.color.startsWith("#f"), true);
  assert.ok(Math.abs(west.visual.brightness - east.visual.brightness) < 0.08);
  assert.notEqual(west.peakNm, east.peakNm);
  assert.equal(tracesCanMatch(west, east), false);
  assert.ok(catalog.lamp.emission.length >= 2);
  assert.doesNotMatch(JSON.stringify(catalog), /OBAFGKM|HR diagram|redshift|nucleosynthesis/i);
});

check("Lamp Bench is a real walk from the station", () => {
  const dist = lampWalkDistance(region);
  assert.ok(dist > 700, `walk ${dist}`);
  assert.equal(region.terrainModel, "dark-sky-basin");
  assert.ok(region.features.some((row) => row.id === "north-rim-station"));
  assert.ok(region.features.some((row) => row.id === "lamp-bench"));
  assert.equal(region.features.some((row) => /east-rim|west-rim|quiet-floor|glow-notch/i.test(row.id)), false);
});

check("night basin world is navigable and distinct", () => {
  const world = createWorld(region, 4113, []);
  assert.equal(isBlocked(world, region.spawn.x, region.spawn.y), false);
  assert.equal(isBlocked(world, region.lampBench.x, region.lampBench.y), false);
  const floor = heightAt(region, 1288, 980);
  const rim = heightAt(region, region.peak.x, region.peak.y);
  assert.ok(rim > floor);
  const night = basinNightColor("#c4bca8");
  assert.match(night, /^#[0-9a-f]{6}$/i);
});

check("DS-01 requires observation, walk, calibration, and comparison", () => {
  const state = emptyDs();
  assert.equal(ds01Complete(state), false);
  markEyepieceSeen(state);
  observeTarget(state, "west-twin");
  observeTarget(state, "east-twin");
  readTwinsLog(state);
  const washed = openSpectrograph(state, true);
  assert.equal(washed.ok, false);
  assert.equal(washed.washed, true);
  const early = darkSkyEvidence(state);
  assert.equal(early.cards.some((card) => card.id === "ds-tested-lamp"), false);
  setLampOn(state, true);
  const noWalk = logLampCalibration(state, catalog, [436, 546], false);
  assert.equal(noWalk.ok, false);
  const cal = logLampCalibration(state, catalog, [436, 546], true);
  assert.equal(cal.ok, true);
  assert.equal(lampMarkersOk([400, 410], catalog.lamp), false);
  tryStellarAlign(state, catalog, 0);
  markStellarFeature(state, 486, "diff");
  markStellarFeature(state, 589, "diff");
  assert.equal(logStellarCompare(state).ok, true);
  assert.equal(logTwinsConclusion(state).ok, true);
  assert.equal(ds01Complete(state), true);
  const evidence = darkSkyEvidence(state);
  assert.ok(evidence.groups.some((group) => group.label === "What I saw"));
  assert.ok(evidence.groups.some((group) => group.label === "What I tested"));
  assert.ok(evidence.groups.some((group) => group.label === "What the light showed"));
  assert.ok(evidence.groups.some((group) => group.label === "What I can claim"));
});

check("DS-02 uses peak position, not color alone, and waits for DS-01", () => {
  const state = emptyDs();
  assert.equal(logEmberConclusion(state).ok, false);
  markEyepieceSeen(state);
  readTwinsLog(state);
  setLampOn(state, true);
  logLampCalibration(state, catalog, [436, 546], true);
  tryStellarAlign(state, catalog, 12);
  markStellarFeature(state, 486, "diff");
  markStellarFeature(state, 589, "diff");
  logStellarCompare(state);
  logTwinsConclusion(state);
  const bad = logEmberPeaks(state, catalog, 430, 628);
  assert.equal(bad.ok, false);
  const ok = logEmberPeaks(state, catalog, 628, 428);
  assert.equal(ok.ok, true);
  assert.equal(logEmberConclusion(state).ok, true);
  assert.equal(ds02Complete(state), true);
  const text = JSON.stringify(darkSkyEvidence(state));
  assert.match(text, /nm/);
  assert.doesNotMatch(text, /blue stars are hotter|OBAFGKM/i);
});

check("Summit packet is honest and refuses invented astronomy", () => {
  const state = emptyDs();
  const ctx = buildDarkSkySummitContext({
    state,
    catalog,
    region,
    player: region.spawn,
    spec: JSON.parse(fs.readFileSync(path.join(root, "data/summit/dark-sky-basin.json"), "utf8"))
  });
  const packet = selectSummitPacket({ context: ctx, question: "How hot is the west twin?" });
  assert.equal(packet.facts.region, "Dark Sky Basin");
  assert.equal(packet.facts.lampCalibrated, false);
  assert.ok(packet.facts.unknown.some((row) => /lamp calibration/i.test(row)));
  assert.ok(packet.facts.doNotClaim.some((row) => /magnitudes/i.test(row)));
  const invented = validateSummitOutput(
    { explanation: "You already calibrated the lamp at 486.2 nm and the twins are magnitude 1.2." },
    packet,
    { question: "What did I measure?" }
  );
  assert.equal(invented.ok, false);
  const folklore = validateSummitOutput(
    { explanation: "Yes, redder means hotter, like a coal." },
    packet,
    { question: "Is the red one hotter?" }
  );
  assert.equal(folklore.ok, false);
});

check("existing Cedar Hollow saves migrate and keep progress", () => {
  assert.equal(SAVE_VERSION, 6);
  const v6 = migrateSave({
    v: 6,
    player: { x: 12, y: 18, facing: 1 },
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    taught: { walk: true },
    puzzles: { aar: { result: null, answers: {}, itemIds: [], attempts: 0, remediation: [], lastJudge: null } }
  });
  assert.equal(v6.world.currentRegion, "cedar-hollow");
  assert.equal(v6.darkSky.lampCalibrated, false);
  assert.equal(v6.darkSky.twinsConcluded, false);
  const worldState = { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] };
  const dsState = emptyDarkSkySave();
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
    regionPlayers: {},
    presentation: {}
  });
  assert.equal(snap.v, 6);
  assert.ok(snap.darkSky);
  const loaded = { x: 0, y: 0, facing: -1 };
  const ds2 = emptyDarkSkySave();
  applySave(snap, {
    player: loaded,
    missionState: {},
    discoveryState: {},
    invState: { obsInt: { sorts: [] } },
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
    dsState: ds2,
    regionPlayers: {},
    presentation: {}
  });
  assert.equal(loaded.x, 12);
  assert.equal(worldState.currentRegion, "cedar-hollow");
});

check("Dark Sky review does not steal Cedar Hollow resume", () => {
  const worldState = { currentRegion: "dark-sky-basin", accessibleRegions: ["cedar-hollow"], masteredRegions: [] };
  const dsState = emptyDarkSkySave();
  dsState.lampCalibrated = true;
  const snap = captureSave({
    player: { x: 1588, y: 1368, facing: 1 },
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
    regionPlayers: {
      "cedar-hollow": { x: 12, y: 18, facing: 1 },
      "dark-sky-basin": { x: 1588, y: 1368, facing: 1 }
    },
    presentation: {}
  });
  assert.equal(snap.world.currentRegion, "cedar-hollow");
  assert.equal(snap.player.x, 12);
  assert.equal(snap.regionPlayers["dark-sky-basin"].x, 1588);
  assert.equal(snap.darkSky.lampCalibrated, true);
  const healed = migrateSave({
    v: 6,
    world: { currentRegion: "dark-sky-basin", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    player: { x: 12, y: 18, facing: 1 },
    taught: { walk: true }
  });
  assert.equal(healed.world.currentRegion, "cedar-hollow");
});

check("Dark Sky stays closed on the production atlas", () => {
  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  assert.equal(worldRaw.regions.find((row) => row.id === "dark-sky-basin").implementationState, "future");
});

check("owner-review entry is explicit and not in production HTML", () => {
  assert.match(gameJs, /darkSkyReview/);
  assert.match(gameJs, /params.get\("region"\) === "dark-sky-basin"/);
  assert.doesNotMatch(html, /\?field=1/);
  assert.match(html, /id="spectrum-bench"/);
  assert.match(html, /id="sky-eyepiece"/);
});

check("no DS-03+ scope, no Worker or provider production change", () => {
  assert.equal(puzzles.puzzles.map((row) => row.id).join(","), "DS-01,DS-02");
  assert.doesNotMatch(gameJs, /DS-03|HR diagram|nucleosynthesis|redshift|FIELD CLEARANCE/);
  assert.equal(provider.productionEndpoint, "https://terrainbound-summit.bfree7885.workers.dev/summit");
  assert.equal(provider.endpoint, "");
  assert.match(wrangler, /terrainbound-summit/);
  assert.doesNotMatch(workerSrc, /dark-sky-basin|DS-01/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.equal(fs.readFileSync(path.join(repoRoot, "CNAME"), "utf8").trim(), "waypointstudio.org");
});

check("Summit context never guesses unmeasured peaks", () => {
  const truth = buildDarkSkyTruth(emptyDs(), catalog);
  assert.equal(truth.catalog.westPeakNm, null);
  assert.equal(truth.catalog.lampLines.length, 0);
  const facts = darkSkyPacketFacts(
    buildDarkSkySummitContext({
      state: emptyDs(),
      catalog,
      region,
      player: region.spawn,
      spec: { puzzles: {} }
    })
  );
  assert.equal(facts.numbers.length, 0);
  assert.equal(facts.clearance, false);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 8B checks passed.");
