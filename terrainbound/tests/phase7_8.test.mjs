#!/usr/bin/env node
/**
 * TerrainBound Phase 7.8B — instructional foundation rebuild.
 * Run: node terrainbound/tests/phase7_8.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { heightAt } from "../js/world.js";
import { createMissionState, addObservation } from "../js/mission.js";
import { createDiscoveryState, addDiscovery } from "../js/discoveries.js";
import { createInvestigationState } from "../js/investigation.js";
import {
  createFlumeState,
  runTrial,
  setFlumeSlope,
  setFlumeWater,
  setFlumePrediction
} from "../js/flume.js";
import {
  createChallengeState,
  observeSite,
  measureSite,
  tryChallengeExplanation,
  tryChallengeFollowUp
} from "../js/challenge.js";
import { classifyCard, pendingCard } from "../js/obsint.js";
import { fieldGuidance } from "../js/guidance.js";
import {
  createHcState,
  measureRoute,
  estimateScale,
  recordCache,
  compareTerrain,
  predictWashoutSlope,
  compareImagery
} from "../js/highcountry.js";
import {
  createSfState,
  predictKepler,
  advanceKeplerModel,
  recordMoon,
  predictMoonNow,
  predictTide,
  compareTides,
  visitChallengeSite,
  planObservation
} from "../js/sunfall.js";
import {
  createMasteryState,
  gameplaySnapshot,
  syncFromGameplay,
  competencyStatus,
  regionMastered
} from "../js/mastery.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";
import { trailById, routeMetrics } from "../js/geomap.js";
import { moonPhase, minutesForPhase } from "../js/celestial.js";

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

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const guidanceJs = fs.readFileSync(path.join(root, "js/guidance.js"), "utf8");
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));
const investigation = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/reading-the-landscape.json"), "utf8")
);
const flumeSpec = JSON.parse(
  fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8")
);
const challengeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/challenges/after-the-rain.json"), "utf8"));
const profile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const hcSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/high-country.json"), "utf8"));
const hcRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/high-country.json"), "utf8"));
const sfSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/sunfall-desert.json"), "utf8"));
const sfRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/sunfall-desert.json"), "utf8"));
const tbWorld = loadWorld(JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8")));
const curriculum = loadCurriculumMap(
  JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"))
);
const studioApp = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");

check("persistent investigation guidance is wired and uses action verbs", () => {
  assert.match(html, /id="field-guide"/);
  assert.match(gameJs, /fieldGuidance/);
  assert.match(guidanceJs, /OBSERVE/);
  assert.match(guidanceJs, /VISIT/);
  assert.match(guidanceJs, /COMPARE/);
  assert.match(guidanceJs, /MEASURE/);
  assert.match(guidanceJs, /PREDICT/);
  const guide = fieldGuidance({
    regionId: "cedar-hollow",
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    flumeState: createFlumeState(),
    challengeState: createChallengeState(),
    obsIntState: { sorts: [] }
  });
  assert.ok(guide.question);
  assert.ok(guide.next);
  assert.ok(guide.where);
  assert.match(guide.verb, /VISIT|OBSERVE|COMPARE|MEASURE|RECORD|TEST|PREDICT/);
  assert.doesNotMatch(guide.next, /glacial|erratic|ice age/i);
});

check("two-site comparison pairs are visible without leaking conclusions", () => {
  const disc = createDiscoveryState();
  addDiscovery(disc, catalog, "glacial-erratic");
  const guide = fieldGuidance({
    regionId: "cedar-hollow",
    missionState: { concluded: true, observations: [{ featureId: "westface-slope" }] },
    discoveryState: disc,
    invState: createInvestigationState(),
    flumeState: createFlumeState(),
    challengeState: createChallengeState(),
    obsIntState: { sorts: [] }
  });
  const pair = guide.pairs.find((item) => item.id === "rock-compare");
  assert.ok(pair);
  assert.equal(pair.left.have, true);
  assert.equal(pair.right.have, false);
  assert.equal(pair.left.label, "Boulder");
  assert.equal(pair.right.label, "Knob bedrock");
  assert.doesNotMatch(JSON.stringify(pair), /ice|glacier|erratic carried/i);
});

check("revision is not awarded on a correct first explanation", () => {
  const state = createChallengeState();
  state.active = true;
  state.pulsePredict = "confluence";
  for (const id of ["rain-gauge", "confluence", "westface-slump", "station-creek"]) {
    observeSite(state, challengeSpec, id);
    measureSite(state, challengeSpec, id);
  }
  assert.equal(tryChallengeExplanation(state, challengeSpec, "tributary-slump").ok, true);
  assert.equal(tryChallengeFollowUp(state, challengeSpec, "marsh-usual").ok, true);
  assert.equal(state.concluded, true);
  assert.equal(state.revised, false);
  assert.equal(state.conflicted, false);
  const snap = gameplaySnapshot({
    discoveryState: createDiscoveryState(),
    missionState: createMissionState(mission),
    invState: createInvestigationState(),
    flumeState: createFlumeState(),
    challengeState: state,
    flumeSpec
  });
  assert.equal(snap.challengeRevised, false);
});

check("revision is awarded only after a genuine conflict", () => {
  const state = createChallengeState();
  state.active = true;
  state.pulsePredict = "confluence";
  for (const id of ["rain-gauge", "confluence", "westface-slump", "station-creek"]) {
    observeSite(state, challengeSpec, id);
    measureSite(state, challengeSpec, id);
  }
  assert.equal(tryChallengeExplanation(state, challengeSpec, "just-rain").ok, false);
  assert.equal(state.conflicted, true);
  assert.equal(state.revised, false);
  assert.equal(tryChallengeExplanation(state, challengeSpec, "tributary-slump").ok, true);
  assert.equal(tryChallengeFollowUp(state, challengeSpec, "marsh-usual").ok, true);
  assert.equal(state.revised, true);
});

check("one discovery click is not observation mastery", () => {
  const discoveryState = createDiscoveryState();
  addDiscovery(discoveryState, catalog, "glacial-erratic");
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState,
      missionState: createMissionState(mission),
      invState: createInvestigationState(),
      flumeState: createFlumeState(),
      challengeState: createChallengeState(),
      flumeSpec,
      obsIntState: { sorts: [] }
    })
  );
  assert.equal(competencyStatus(profile, mastery, "observation"), "not-yet-observed");
  const invState = createInvestigationState();
  assert.ok(pendingCard(investigation.obsInt, invState.obsInt, discoveryState.foundIds));
  classifyCard(invState.obsInt, investigation.obsInt, "boulder-look", "interpretation");
  assert.equal(invState.obsInt.sorts[0].ok, false);
  classifyCard(invState.obsInt, investigation.obsInt, "boulder-look", "observation");
  classifyCard(invState.obsInt, investigation.obsInt, "groove-look", "observation");
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState,
      missionState: createMissionState(mission),
      invState,
      flumeState: createFlumeState(),
      challengeState: createChallengeState(),
      flumeSpec,
      obsIntState: invState.obsInt
    })
  );
  assert.equal(competencyStatus(profile, mastery, "observation"), "demonstrated");
});

check("runoff table requires a prediction before a trial", () => {
  const state = createFlumeState();
  setFlumeSlope(state, "steep");
  setFlumeWater(state, "one-cup");
  const blocked = runTrial(state, flumeSpec);
  assert.equal(blocked.needPredict, true);
  setFlumePrediction(state, "gentle");
  const ran = runTrial(state, flumeSpec);
  assert.equal(ran.ok, true);
});

check("Earth systems needs rain, slope, and tributary — not two stories", () => {
  const inv = createInvestigationState();
  inv.concluded = true;
  const missionState = createMissionState(mission);
  missionState.concluded = true;
  const challengeState = createChallengeState();
  challengeState.concluded = true;
  const snapStories = gameplaySnapshot({
    discoveryState: createDiscoveryState(),
    missionState,
    invState: inv,
    flumeState: createFlumeState(),
    challengeState,
    flumeSpec
  });
  assert.equal(snapStories.challengeSystems, false);
  challengeState.workingRoles = ["weather", "join", "source"];
  const snapSystem = gameplaySnapshot({
    discoveryState: createDiscoveryState(),
    missionState,
    invState: inv,
    flumeState: createFlumeState(),
    challengeState,
    flumeSpec
  });
  assert.equal(snapSystem.challengeSystems, true);
});

check("High Country scale mastery is a student estimate, not a computed length", () => {
  const state = createHcState();
  const auto = measureRoute(state, hcSpec, hcRegion, heightAt, "west-switchback");
  assert.equal(auto.evidence.length, 0);
  const trail = trailById(hcRegion, "west-switchback");
  const actual = routeMetrics(hcRegion, heightAt, trail).distance;
  const miss = estimateScale(state, hcSpec, hcRegion, heightAt, "west-switchback", actual * 3);
  assert.equal(miss.ok, false);
  const hit = estimateScale(state, hcSpec, hcRegion, heightAt, "west-switchback", actual);
  assert.equal(hit.ok, true);
  assert.ok(hit.evidence.some((row) => row.kind === "measure-route"));
});

check("coordinates must locate something; contour copy does not leak steep/gentle", () => {
  const prompts = JSON.stringify(hcSpec.terrainCompares);
  assert.doesNotMatch(prompts, /tight = steep|wide = gentle|tight means steep/i);
  const state = createHcState();
  assert.equal(compareTerrain(state, hcSpec, "west-cliff", "wide").ok, false);
  assert.equal(compareTerrain(state, hcSpec, "west-cliff", "tight").ok, true);
  const miss = recordCache(state, hcSpec, hcRegion, { x: 10, y: 10 });
  assert.equal(miss.ok, false);
  const hit = recordCache(state, hcSpec, hcRegion, { x: hcSpec.cache.x, y: hcSpec.cache.y });
  assert.equal(hit.ok, true);
  assert.ok(hit.evidence.some((row) => row.kind === "navigate-coord"));
});

check("Cedar Hollow slope reasoning transfers into the High Country washout", () => {
  const state = createHcState();
  const wash = hcRegion.props.find((prop) => prop.kind === "washout");
  assert.equal(compareImagery(state, hcSpec, { x: wash.x, y: wash.y }, wash).ok, false);
  const wrong = predictWashoutSlope(state, "east");
  assert.equal(wrong.ok, false);
  predictWashoutSlope(state, "west");
  assert.equal(compareImagery(state, hcSpec, { x: wash.x, y: wash.y }, wash).ok, true);
  const hcGuide = fieldGuidance({ regionId: "high-country", hcState: state });
  assert.doesNotMatch(hcGuide.next, /Topic 1|Cedar Hollow lesson/i);
});

check("Kepler requires P² = a³ then a model check, not a 4-option guess", () => {
  const state = createSfState();
  const guess = predictKepler(state, 8);
  assert.equal(guess.ok, false);
  assert.equal(guess.evidence.length, 0);
  assert.equal(guess.pendingModel, true);
  assert.equal(advanceKeplerModel(state).ok, true);
  assert.equal(state.kepler.modelChecked, true);
});

check("Moon, tides, and the observation window require geometry then a walk", () => {
  const state = createSfState();
  const moon = { x: sfSpec.moonSite.x, y: sfSpec.moonSite.y };
  state.sky.minutes = minutesForPhase("first quarter");
  assert.equal(recordMoon(state, sfSpec, sfRegion, moon).ok, false);
  predictMoonNow(state, moonPhase(state.sky.minutes).name);
  assert.equal(recordMoon(state, sfSpec, sfRegion, moon).ok, true);
  assert.equal(compareTides(state, "spring-new-full").ok, false);
  predictTide(state, "larger");
  assert.equal(compareTides(state, "spring-new-full").ok, true);
  state.kepler.ok = true;
  state.kepler.modelChecked = true;
  const mesa = sfSpec.challenge.sites.find((site) => site.ok);
  const unwalked = planObservation(state, sfSpec, {
    site: "mesa-rim",
    when: "night",
    moon: "thin",
    reasons: ["open-horizon", "dark-sky", "return-time"]
  });
  assert.equal(unwalked.ok, false);
  visitChallengeSite(state, sfSpec, { x: mesa.x, y: mesa.y });
  const walked = planObservation(state, sfSpec, {
    site: "mesa-rim",
    when: "night",
    moon: "thin",
    reasons: ["open-horizon", "dark-sky", "return-time"]
  });
  assert.equal(walked.ok, true);
});

check("High Country map skill transfers into Sunfall site choice without a lecture", () => {
  const sfGuide = fieldGuidance({
    regionId: "sunfall-desert",
    sfState: {
      shadows: [1, 2, 3],
      rotationExplain: "earth-rotates",
      seasonObs: [1, 2, 3],
      seasonExplain: "tilt",
      orbit: { measured: true },
      kepler: { ok: true, modelChecked: true },
      moonGeometry: true,
      moonLog: [1, 2],
      eclipse: { understood: true },
      tides: { compared: true },
      planets: { classified: true },
      challenge: { ok: false }
    }
  });
  assert.match(sfGuide.next, /coordinate|Walk/i);
  assert.doesNotMatch(sfGuide.next, /Topic 2|High Country skill/i);
});

check("Dark Sky stays closed; Summit is not implemented; Studio app is untouched", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  assert.doesNotMatch(gameJs, /Summit tutor|always-available Earth Science tutor/i);
  assert.match(studioApp, /Fieldry|redirect/i);
});

check("no player-facing standards codes", () => {
  const extras = [html, guidanceJs];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, null, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.doesNotMatch(html, /HS-ESS|NYSSLS|MS-ESS/);
});

check("Cedar Hollow does not become mastered by clicking everything", () => {
  const discoveryState = createDiscoveryState();
  for (const item of catalog.items) addDiscovery(discoveryState, catalog, item.id);
  const missionState = createMissionState(mission);
  for (const id of ["westface-slope", "pine-creek", "mirror-pond", "willow-reach"]) {
    addObservation(missionState, mission, id);
  }
  missionState.concluded = true;
  const invState = createInvestigationState();
  invState.concluded = true;
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState,
      missionState,
      invState,
      flumeState: createFlumeState(),
      challengeState: createChallengeState(),
      flumeSpec
    })
  );
  assert.equal(regionMastered(profile, mastery), false);
  assert.equal(competencyStatus(profile, mastery, "observation"), "not-yet-observed");
  assert.equal(competencyStatus(profile, mastery, "variables"), "not-yet-observed");
});

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\nPhase 7.8B instructional rebuild checks passed.");
