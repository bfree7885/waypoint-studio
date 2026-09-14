#!/usr/bin/env node
/**
 * TerrainBound Phase 2 checks — landscape investigation, evidence, hypothesis.
 * Run: node terrainbound/tests/phase2.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMissionState, addObservation, tryAddPathNode, requiredComplete } from "../js/mission.js";
import {
  createDiscoveryState,
  addDiscovery,
  discoveryLogModel,
  playerFacingDiscoveryText
} from "../js/discoveries.js";
import {
  createInvestigationState,
  beginInvestigation,
  shouldIntroduceInvestigation,
  syncPassiveEvidence,
  recordMeasurement,
  availableMeasurementAt,
  blockedMeasurementAt,
  canProposeExplanation,
  evidenceModel,
  sketchModel,
  evaluateHypothesis,
  playerFacingInvestigationText
} from "../js/investigation.js";
import { loadCurriculumMap, slotsForInvestigation, assertNoPlayerFacingCodes } from "../js/curriculum.js";

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
const investigation = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/reading-the-landscape.json"), "utf8")
);
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const curriculum = loadCurriculumMap(placeholders);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");

function findIds(state, ids) {
  for (const id of ids) addDiscovery(state, catalog, id);
}

function completeWater(state) {
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(state, mission, id);
  }
  for (const id of mission.conclusion.validPath) {
    assert.equal(tryAddPathNode(state, mission, id).ok, true);
  }
}

function collectHistoryMeasurements(disc, invState) {
  findIds(disc, ["glacial-erratic", "exposed-bedrock", "watershed-rail"]);
  beginInvestigation(invState, investigation, disc);
  recordMeasurement(invState, investigation, "rock-compare", disc);
  recordMeasurement(invState, investigation, "bedrock-grooves", disc);
  recordMeasurement(invState, investigation, "valley-shape", disc);
}

check("investigation asks about two clocks, not glacial reconstruction", () => {
  assert.equal(investigation.id, "reading-the-landscape");
  assert.match(investigation.question, /Two clocks in the hollow/);
  assert.equal(investigation.measurements.length, 4);
  assert.ok(investigation.processes.some((item) => item.id === "two-clocks"));
});

check("water mission still completes beside the landscape investigation", () => {
  const water = createMissionState(mission);
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  findIds(disc, ["glacial-erratic"]);
  beginInvestigation(inv, investigation, disc);
  completeWater(water);
  assert.equal(requiredComplete(water, mission), true);
  assert.equal(water.concluded, true);
  assert.equal(inv.concluded, false);
});

check("Phase 1 discoveries stay hidden until inspected", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  beginInvestigation(inv, investigation, disc);
  const log = discoveryLogModel(catalog, disc);
  assert.equal(log.foundCount, 0);
  assert.equal(log.total, 12);
  const evidence = evidenceModel(investigation, inv);
  assert.equal(evidence.cards.length, 0);
  for (const item of catalog.items) {
    assert.equal(log.found.some((row) => row.name === item.name), false);
  }
  assert.equal(
    evidence.cards.some((card) => card.title === "Mismatched boulder"),
    false
  );
});

check("measurements require the related discoveries to be found", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  beginInvestigation(inv, investigation, disc);
  assert.equal(availableMeasurementAt(investigation, inv, disc, "glacial-erratic"), null);
  const blocked = blockedMeasurementAt(investigation, inv, disc, "glacial-erratic");
  assert.ok(blocked);
  assert.match(blocked.missingHint, /east face/i);
  findIds(disc, ["glacial-erratic"]);
  assert.equal(availableMeasurementAt(investigation, inv, disc, "glacial-erratic"), null);
  findIds(disc, ["exposed-bedrock"]);
  const ready = availableMeasurementAt(investigation, inv, disc, "glacial-erratic");
  assert.equal(ready.id, "rock-compare");
});

check("evidence cards stay closed until discovered or measured", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  beginInvestigation(inv, investigation, disc);
  findIds(disc, ["cut-bank"]);
  syncPassiveEvidence(inv, investigation, disc);
  const mid = evidenceModel(investigation, inv);
  assert.ok(mid.cards.some((card) => card.id === "cut-bank-now"));
  assert.equal(mid.cards.some((card) => card.id === "transported-boulder"), false);
  assert.equal(mid.cards.some((card) => card.id === "sand-bar-now"), false);
  const blockedMeasure = recordMeasurement(inv, investigation, "rock-compare", disc);
  assert.equal(blockedMeasure.ok, false);
  assert.equal(evidenceModel(investigation, inv).cards.some((card) => card.id === "transported-boulder"), false);
  findIds(disc, ["glacial-erratic", "exposed-bedrock"]);
  recordMeasurement(inv, investigation, "rock-compare", disc);
  const after = evidenceModel(investigation, inv);
  assert.ok(after.cards.some((card) => card.id === "transported-boulder"));
  assert.match(after.cards.find((card) => card.id === "transported-boulder").significance, /transported/);
  assert.doesNotMatch(
    after.cards.find((card) => card.id === "transported-boulder").significance,
    /glacier deposited/i
  );
});

check("timescale groups distinguish history, river, and current water", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  findIds(disc, [
    "glacial-erratic",
    "exposed-bedrock",
    "watershed-rail",
    "cut-bank",
    "point-bar",
    "cattail-marsh",
    "high-water-post"
  ]);
  collectHistoryMeasurements(disc, inv);
  recordMeasurement(inv, investigation, "sediment-sort", disc);
  syncPassiveEvidence(inv, investigation, disc);
  const model = evidenceModel(investigation, inv);
  const ids = Object.fromEntries(model.groups.map((group) => [group.id, group.cards.map((card) => card.id)]));
  assert.ok(ids.history.includes("transported-boulder"));
  assert.ok(ids.history.includes("rounded-valley"));
  assert.ok(ids.river.includes("sediment-sort"));
  assert.ok(ids.water.includes("high-water-now"));
});

check("modern stream evidence cannot substitute for glacial evidence", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  findIds(disc, ["cut-bank", "point-bar", "rounded-stones", "glacial-erratic", "exposed-bedrock", "watershed-rail"]);
  collectHistoryMeasurements(disc, inv);
  recordMeasurement(inv, investigation, "sediment-sort", disc);
  syncPassiveEvidence(inv, investigation, disc);
  const waterOnly = evaluateHypothesis(investigation, inv, "flowing-water", [
    "sediment-sort",
    "cut-bank-now",
    "sand-bar-now",
    "rounded-bed"
  ]);
  assert.equal(waterOnly.ok, false);
  assert.equal(inv.concluded, false);
  assert.match(waterOnly.hint, /boulder/i);
  assert.doesNotMatch(waterOnly.hint, /\bwrong\b/i);

  const iceModern = evaluateHypothesis(investigation, inv, "two-clocks", [
    "sediment-sort",
    "cut-bank-now",
    "sand-bar-now"
  ]);
  assert.equal(iceModern.ok, false);
  assert.match(iceModern.hint, /creek is doing now/i);
});

check("unrecorded evidence cannot be used, then a weak hypothesis can be revised", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  collectHistoryMeasurements(disc, inv);
  const stolen = evaluateHypothesis(investigation, inv, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "pond-basin"
  ]);
  assert.equal(stolen.ok, false);
  assert.equal(stolen.reason, "unrecorded");

  const weak = evaluateHypothesis(investigation, inv, "named-ice", ["transported-boulder"]);
  assert.equal(weak.ok, false);
  assert.match(weak.hint, /vocabulary|longer clock/i);
  assert.equal(inv.concluded, false);

  findIds(disc, ["cut-bank", "point-bar"]);
  recordMeasurement(inv, investigation, "sediment-sort", disc);
  assert.equal(canProposeExplanation(investigation, inv), true);
  const ok = evaluateHypothesis(investigation, inv, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  assert.equal(ok.ok, true);
  assert.equal(inv.concluded, true);
  assert.equal(inv.interpreted, true);
  assert.match(ok.successText, /different clocks/i);
  assert.match(ok.successText, /creek/i);
});

check("sketch only plots recorded evidence and gains ice flow after success", () => {
  const disc = createDiscoveryState();
  const inv = createInvestigationState();
  const empty = sketchModel(investigation, inv);
  assert.equal(empty.marks.length, 0);
  assert.equal(empty.iceArrows, false);
  collectHistoryMeasurements(disc, inv);
  findIds(disc, ["cut-bank", "point-bar"]);
  recordMeasurement(inv, investigation, "sediment-sort", disc);
  const mid = sketchModel(investigation, inv);
  assert.ok(mid.marks.some((mark) => mark.id === "transported-boulder"));
  assert.equal(mid.marks.some((mark) => mark.id === "cut-bank-now"), false);
  evaluateHypothesis(investigation, inv, "two-clocks", [
    "transported-boulder",
    "bedrock-grooves",
    "rounded-valley",
    "sediment-sort"
  ]);
  const done = sketchModel(investigation, inv);
  assert.equal(done.iceArrows, true);
});

check("investigation stays a field question, not a lecture or quiz", () => {
  const text = playerFacingInvestigationText(investigation).join(" ");
  assert.doesNotMatch(text, /\bquiz\b|\bXP\b|\bbadges?\b|\bcoins?\b|multiple choice/i);
  assert.doesNotMatch(investigation.intro.lines.join(" "), /glacier deposited/i);
  assert.doesNotMatch(text, /NYSSLS|HS-ESS|performance expectation/i);
  assert.ok(shouldIntroduceInvestigation(createInvestigationState(), createDiscoveryState(), true));
});

check("curriculum slots exist with null codes and stay off the page", () => {
  const slots = slotsForInvestigation(curriculum, investigation);
  assert.ok(slots.length >= 5);
  const needed = [
    "landscape-change",
    "glacial-processes",
    "interpreting-geologic-evidence",
    "constructing-explanations-from-evidence",
    "scale-time-relationships"
  ];
  for (const id of needed) {
    assert.ok(curriculum.byId.get(id), id);
    assert.equal(curriculum.byId.get(id).placeholderAlignment.code, null);
    assert.equal(curriculum.byId.get(id).playerVisible, false);
  }
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, investigation);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(gate.pendingSlots, true);
  assert.equal(/NYSSLS|HS-ESS/i.test(html), false);
  assert.equal(/NYSSLS|HS-ESS/i.test(playerFacingDiscoveryText(catalog).join(" ")), false);
});

check("Field tablet keeps a compact 1366 layout and hypothesis overlay", () => {
  assert.match(css, /max-width: 1366px/);
  assert.match(html, /id="journal-evidence"/);
  assert.match(html, /id="field-sketch"/);
  assert.match(html, /id="hypothesis"/);
  assert.match(css, /#hypothesis:not\(\[hidden\]\)/);
  assert.equal(region.name, "Cedar Hollow");
  assert.equal(catalog.items.length, 12);
});

check("retired Studio app untouched", () => {
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /waypointstudio\.org|Terrainbound is retired/i);
  assert.doesNotMatch(html, /data-product="terrainbound"/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 2 checks passed.");
