#!/usr/bin/env node
/**
 * TerrainBound Phase 8D — Dark Sky owner-playthrough refinement.
 * Run: node terrainbound/tests/phase8_d.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { migrateSave, SAVE_VERSION } from "../js/save.js";
import {
  darkSkyGuidance,
  debugCompleteThrough,
  logLampCalibration,
  setLampOn,
  markEyepieceSeen,
  observeTarget,
  readTwinsLog,
  tryStellarAlign,
  markStellarFeature,
  logStellarCompare,
  logTwinsConclusion,
  logEmberPeaks,
  logEmberConclusion,
  emptyDarkSkySave,
  ds08Complete,
  ds09Complete,
  originEvidenceReady,
  pointHorn,
  logOriginCase,
  tickLookbackWalk,
  readDistantPoster,
  logLookback,
  noteGlowLeak,
  completePuzzleUse
} from "../js/darksky.js";
import { validateSummitOutput } from "../js/summit-validate.js";
import { selectSummitPacket } from "../js/summit-packet.js";
import { createSummitEngine, createSummitState } from "../js/summit.js";
import { buildDarkSkySummitContext } from "../js/darksky.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok ", name);
  } catch (err) {
    failures.push({ name, err });
    console.log("FAIL", name, "—", err.message);
  }
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/darksky/catalog.json"), "utf8"));
const region = JSON.parse(fs.readFileSync(path.join(root, "data/regions/dark-sky-basin.json"), "utf8"));
const summitSpec = JSON.parse(fs.readFileSync(path.join(root, "data/summit/dark-sky-basin.json"), "utf8"));
const provider = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const wrangler = fs.readFileSync(path.join(root, "server/wrangler.toml"), "utf8");
const workerSrc = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const puzzles = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/dark-sky-basin.json"), "utf8"));
const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));

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
  return debugCompleteThrough(emptyDarkSkySave(), catalog, id, { seed01, seed02 });
}

check("no DS-11 and no new region or Worker change", () => {
  assert.equal(puzzles.puzzles.map((row) => row.id).join(","), "DS-01,DS-02,DS-03,DS-04,DS-05,DS-06,DS-07,DS-08,DS-09,DS-10");
  assert.equal(provider.productionEndpoint, "https://terrainbound-summit.bfree7885.workers.dev/summit");
  assert.doesNotMatch(workerSrc, /dark-sky-basin|DS-01/);
  assert.match(wrangler, /terrainbound-summit/);
  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), true);
});

check("field guide asks a question without echoing the next click", () => {
  const g = darkSkyGuidance(through("DS-06"));
  assert.ok(g.question);
  assert.equal(g.lookingFor, "");
  assert.doesNotMatch(g.next, /pin three|use later tonight|Put three measured/i);
  assert.match(g.question, /line pattern|redshift|move/i);
});

check("DS-08 leftover sky is earned with the horn, not three chips", () => {
  const state = through("DS-07");
  const before = originEvidenceReady(state);
  assert.equal(before.expansion, true);
  assert.equal(before.abundance, true);
  assert.equal(before.leftover, false);
  pointHorn(state, "wall", true);
  pointHorn(state, "zenith", true);
  assert.equal(originEvidenceReady(state).leftover, true);
  assert.equal(logOriginCase(state).ok, true);
  assert.equal(ds08Complete(state), true);
});

check("DS-09 lookback is time away from the dome, not an eyepiece button", () => {
  const state = through("DS-08");
  readDistantPoster(state);
  observeTarget(state, "nearby-variable");
  tickLookbackWalk(state, false);
  assert.equal(state.lookbackLeftStation, true);
  tickLookbackWalk(state, true);
  assert.equal(state.laterTonight, true);
  assert.equal(logLookback(state, "happening-now").ok, false);
  assert.equal(logLookback(state, "earlier-light").ok, true);
  assert.equal(ds09Complete(state), true);
  assert.doesNotMatch(gameJs, /Look later tonight/);
  assert.match(gameJs, /tickLookbackWalk|openRedshiftPlotFromBoard|renderEnvelopeSpectrum/);
});

check("geo-board footer does not sticky-cover the plot on small screens", () => {
  const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
  assert.match(css, /#geo-board \.conclusion-actions[\s\S]*?position:\s*relative/);
  assert.match(css, /\.ds-field-canvas-wrap[\s\S]*?min-width:\s*0/);
  assert.match(css, /\.ds-field-canvas[\s\S]*?width:\s*100%/);
  assert.doesNotMatch(css, /@media \(max-width: 430px\) \{[\s\S]*?\.ds-field-canvas \{[\s\S]*?min-height: 180px/);
});

check("Glow Notch is optional atmosphere with a tablet note", () => {
  const state = through("DS-02");
  assert.equal(noteGlowLeak(state).ok, true);
  assert.match(JSON.stringify(state.notes), /town glow/i);
});

check("Summit misconceptions still blocked after refinement", () => {
  const ctx = buildDarkSkySummitContext({
    state: through("DS-10"),
    catalog,
    region,
    player: region.spawn,
    spec: summitSpec
  });
  const packet = selectSummitPacket({ context: ctx, question: "We're seeing that galaxy right now, right?" });
  const now = validateSummitOutput(
    { explanation: "We're seeing that galaxy right now." },
    packet,
    { question: "We're seeing that galaxy right now, right?" }
  );
  assert.equal(now.ok, false);
  const engine = createSummitEngine({ curriculum: summitSpec, concepts: { concepts: [] } });
  const reply = engine.ask(createSummitState(), ctx, { question: "Was everything made in stars?" });
  assert.match(String(reply.text || ""), /not all elements|earlier chapter/i);
});

check("save v6 still migrates Cedar Hollow", () => {
  assert.equal(SAVE_VERSION, 6);
  const v6 = migrateSave({
    v: 6,
    player: { x: 12, y: 18, facing: 1 },
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    taught: { walk: true }
  });
  assert.equal(v6.world.currentRegion, "cedar-hollow");
  assert.equal(v6.darkSky.lookbackLeftStation, false);
  assert.equal(completePuzzleUse(through("DS-01"), true, false)["DS-01"], true);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 8D checks passed.");
