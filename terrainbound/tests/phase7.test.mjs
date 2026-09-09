#!/usr/bin/env node
/**
 * TerrainBound Phase 7 checks — Sunfall Desert Topic 10, the sky as the lab.
 * Run: node terrainbound/tests/phase7.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, heightAt, isBlocked, moveWithCollision } from "../js/world.js";
import {
  skySnapshot,
  sunPosition,
  shadowFromSun,
  daylightHours,
  earthSunDistanceAu,
  namedSeasonDay,
  MINUTES_PER_DAY,
  orbitPoint,
  periodFromA,
  keplerCheck,
  moonPhase,
  minutesForPhase,
  eclipseGeometry,
  tidalKind,
  addDays,
  createSkyState
} from "../js/celestial.js";
import {
  createSfState,
  jumpObservation,
  recordShadow,
  explainRotation,
  recordSeasonNoon,
  explainSeasons,
  seasonDistanceContradiction,
  setOrbitEccentricity,
  measureOrbit,
  predictKepler,
  recordMoon,
  useMoonGeometry,
  predictMoon,
  alignEclipse,
  explainEclipse,
  compareTides,
  classifyPlanets,
  planObservation,
  presentSfChallenge,
  addSfFind,
  identifyFind,
  sfToolsFlags,
  applySfEvidence,
  sfReadyForChallenge,
  tideRows
} from "../js/sunfall.js";
import {
  captureSave,
  applySave,
  migrateSave,
  emptyTaught,
  emptySunfallSave,
  SAVE_VERSION
} from "../js/save.js";
import {
  createMasteryState,
  recordEvidence,
  competencyStatus,
  fieldRecord,
  regionMastered,
  playerFacingMasteryStrings,
  syncFromGameplay,
  gameplaySnapshot
} from "../js/mastery.js";
import {
  loadWorld,
  createWorldState,
  applyTravelUnlocks,
  canEnterRegion,
  isPlayable,
  previewModel
} from "../js/worldmap.js";
import { createToolState, hasTool, syncToolsFromGameplay } from "../js/tools.js";
import { createMissionState } from "../js/mission.js";
import { createDiscoveryState } from "../js/discoveries.js";
import { createInvestigationState } from "../js/investigation.js";
import { createHcState } from "../js/highcountry.js";
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";

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

const tbWorld = loadWorld(JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8")));
const sfRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/sunfall-desert.json"), "utf8"));
const chRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/cedar-hollow.json"), "utf8"));
const hcRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/high-country.json"), "utf8"));
const sfSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/sunfall-desert.json"), "utf8"));
const sfCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/sunfall-desert.json"), "utf8"));
const sfProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/sunfall-desert.json"), "utf8"));
const toolsCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/world/tools.json"), "utf8"));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const curriculum = loadCurriculumMap(JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8")));
const sfWorld = createWorld(sfRegion, 3107, sfCatalog.items);

function at(x, y) {
  return { x, y };
}

function gnomonPlayer() {
  return at(sfSpec.gnomon.x, sfSpec.gnomon.y);
}

function moonPlayer() {
  return at(sfSpec.moonSite.x, sfSpec.moonSite.y);
}

function playSunfall() {
  const state = createSfState();
  const mastery = createMasteryState();
  const player = gnomonPlayer();
  const take = (result) => applySfEvidence(mastery, recordEvidence, result.evidence || []);

  jumpObservation(state, "morning", sfRegion, player);
  take(recordShadow(state, sfSpec, sfRegion, player));
  jumpObservation(state, "noon", sfRegion, player);
  take(recordShadow(state, sfSpec, sfRegion, player));
  jumpObservation(state, "afternoon", sfRegion, player);
  take(recordShadow(state, sfSpec, sfRegion, player));
  take(explainRotation(state, "earth-rotates"));

  jumpObservation(state, "winter", sfRegion, player);
  take(recordSeasonNoon(state, sfSpec, sfRegion, player));
  jumpObservation(state, "equinox", sfRegion, player);
  take(recordSeasonNoon(state, sfSpec, sfRegion, player));
  jumpObservation(state, "summer", sfRegion, player);
  take(recordSeasonNoon(state, sfSpec, sfRegion, player));
  take(explainSeasons(state, "tilt"));

  setOrbitEccentricity(state, 0.45);
  take(measureOrbit(state));
  take(predictKepler(state, 8));

  const moon = moonPlayer();
  state.sky.minutes = minutesForPhase("first quarter");
  take(recordMoon(state, sfSpec, sfRegion, moon));
  addDays(state.sky, 4);
  jumpObservation(state, "night", sfRegion, moon);
  take(recordMoon(state, sfSpec, sfRegion, moon));
  addDays(state.sky, 4);
  jumpObservation(state, "night", sfRegion, moon);
  take(recordMoon(state, sfSpec, sfRegion, moon));
  addDays(state.sky, 5);
  jumpObservation(state, "night", sfRegion, moon);
  take(recordMoon(state, sfSpec, sfRegion, moon));
  take(useMoonGeometry(state));
  state.sky.minutes = minutesForPhase("first quarter");
  take(predictMoon(state, "full"));

  alignEclipse(state, true);
  take(explainEclipse(state, "tilt"));
  take(compareTides(state, "spring-new-full"));
  take(classifyPlanets(state, "distance-period"));

  planObservation(state, sfSpec, {
    site: "crater-floor",
    when: "noon",
    moon: "full",
    period: "2",
    reasons: ["shortest-walk"]
  });
  const strong = planObservation(state, sfSpec, {
    site: "mesa-rim",
    when: "night",
    moon: "thin",
    period: "8",
    reasons: ["open-horizon", "dark-sky", "return-time"]
  });
  take(strong);
  presentSfChallenge(state);
  return { state, mastery };
}

check("Sunfall unlocks only after High Country mastery; earlier regions stay open", () => {
  const worldState = createWorldState(tbWorld);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "cedar-hollow"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
});

check("Sunfall loads as a distinct open desert region", () => {
  assert.equal(sfRegion.terrainModel, "sunfall-desert");
  assert.notEqual(sfRegion.width, chRegion.width);
  assert.ok(heightAt(sfRegion, 420, 500) > heightAt(sfRegion, 2088, 900), "mesa should stand above crater");
  assert.ok(heightAt(hcRegion, 600, 760) > heightAt(sfRegion, 1408, 1188), "alpine cliff still taller than desert plaza");
  for (const feature of sfRegion.features) {
    assert.equal(isBlocked(sfWorld, feature.x, feature.y), false, feature.id + " should be standable");
  }
  const spawn = moveWithCollision(sfWorld, sfRegion.spawn.x, sfRegion.spawn.y, 0, 0);
  assert.equal(spawn.x, sfRegion.spawn.x);
});

check("day/night and shadows change meaningfully with time", () => {
  const player = gnomonPlayer();
  const lat = 34.52;
  const morning = sunPosition(10 * MINUTES_PER_DAY + 8 * 60, lat);
  const noon = sunPosition(10 * MINUTES_PER_DAY + 12 * 60, lat);
  const afternoon = sunPosition(10 * MINUTES_PER_DAY + 15.5 * 60, lat);
  const night = sunPosition(10 * MINUTES_PER_DAY + 21 * 60, lat);
  assert.ok(noon.altitudeDeg > morning.altitudeDeg);
  assert.ok(noon.altitudeDeg > afternoon.altitudeDeg);
  assert.ok(night.altitudeDeg < 0);
  const sm = shadowFromSun(morning);
  const sn = shadowFromSun(noon);
  const sa = shadowFromSun(afternoon);
  assert.equal(sm.visible && sn.visible && sa.visible, true);
  assert.ok(sn.length < sm.length, "noon shadow shorter than morning");
  assert.ok(Math.abs(sm.directionDeg - sa.directionDeg) > 40, "morning and afternoon shadows point differently");
  const skyNight = skySnapshot(createSkyState({ minutes: 10 * MINUTES_PER_DAY + 21.2 * 60 }), lat);
  assert.equal(skyNight.night, true);
});

check("player can collect repeated solar observations", () => {
  const state = createSfState();
  const player = gnomonPlayer();
  jumpObservation(state, "morning", sfRegion, player);
  assert.equal(recordShadow(state, sfSpec, sfRegion, player).ok, true);
  jumpObservation(state, "noon", sfRegion, player);
  assert.equal(recordShadow(state, sfSpec, sfRegion, player).ok, true);
  jumpObservation(state, "afternoon", sfRegion, player);
  const third = recordShadow(state, sfSpec, sfRegion, player);
  assert.equal(third.ok, true);
  assert.equal(state.shadows.length, 3);
  assert.equal(explainRotation(state, "sun-flies").ok, false);
  assert.equal(explainRotation(state, "earth-rotates").ok, true);
});

check("seasonal Sun position and day length change; seasons are not Earth-Sun distance", () => {
  const state = createSfState();
  const player = gnomonPlayer();
  state.rotationExplain = "earth-rotates";
  jumpObservation(state, "winter", sfRegion, player);
  assert.equal(recordSeasonNoon(state, sfSpec, sfRegion, player).ok, true);
  jumpObservation(state, "equinox", sfRegion, player);
  recordSeasonNoon(state, sfSpec, sfRegion, player);
  jumpObservation(state, "summer", sfRegion, player);
  recordSeasonNoon(state, sfSpec, sfRegion, player);
  const winter = state.seasonObs.find((row) => row.key === "winter");
  const summer = state.seasonObs.find((row) => row.key === "summer");
  assert.ok(summer.altitude > winter.altitude);
  assert.ok(summer.daylight > winter.daylight);
  const contra = seasonDistanceContradiction(state.seasonObs);
  assert.equal(contra.winterCloser, true);
  assert.equal(explainSeasons(state, "closer").ok, false);
  assert.equal(state.distanceConfronted, true);
  assert.equal(explainSeasons(state, "tilt").ok, true);
  assert.ok(earthSunDistanceAu(namedSeasonDay("winter")) < earthSunDistanceAu(namedSeasonDay("summer")));
  assert.ok(daylightHours(namedSeasonDay("summer")) > daylightHours(namedSeasonDay("winter")));
});

check("orbit model supports eccentricity and speed changes with position", () => {
  const round = orbitPoint({ a: 1, e: 0.05, nuDeg: 0 });
  const ecc = orbitPoint({ a: 1, e: 0.5, nuDeg: 0 });
  assert.ok(Math.abs(round.peri - round.apo) < Math.abs(ecc.peri - ecc.apo));
  const peri = orbitPoint({ a: 1, e: 0.5, nuDeg: 0 });
  const apo = orbitPoint({ a: 1, e: 0.5, nuDeg: 180 });
  assert.ok(peri.v > apo.v, "faster at perihelion");
  assert.ok(peri.r < apo.r);
  const state = createSfState();
  setOrbitEccentricity(state, 0.45);
  const measured = measureOrbit(state);
  assert.equal(measured.fasterAtPeri, true);
  assert.equal(state.orbit.eccentricCompared, true);
});

check("mathematical orbit prediction can be performed and checked", () => {
  assert.equal(periodFromA(4), 8);
  assert.equal(keplerCheck(4, 8).ok, true);
  assert.equal(keplerCheck(4, 2).ok, false);
  const state = createSfState();
  assert.equal(predictKepler(state, 2).ok, false);
  assert.equal(predictKepler(state, 8).ok, true);
});

check("Moon phases change coherently and can be explained from geometry", () => {
  const first = moonPhase(minutesForPhase("first quarter"));
  assert.equal(first.name, "first quarter");
  const later = moonPhase(minutesForPhase("first quarter") + 7 * MINUTES_PER_DAY);
  assert.equal(later.name, "full");
  const state = createSfState();
  const moon = moonPlayer();
  state.sky.minutes = minutesForPhase("new");
  assert.equal(recordMoon(state, sfSpec, sfRegion, moon).ok, true);
  addDays(state.sky, 7);
  jumpObservation(state, "night", sfRegion, moon);
  recordMoon(state, sfSpec, sfRegion, moon);
  addDays(state.sky, 7);
  jumpObservation(state, "night", sfRegion, moon);
  recordMoon(state, sfSpec, sfRegion, moon);
  addDays(state.sky, 8);
  jumpObservation(state, "night", sfRegion, moon);
  recordMoon(state, sfSpec, sfRegion, moon);
  assert.ok(state.moonLog.length >= 4);
  const names = new Set(state.moonLog.map((row) => row.name));
  assert.ok(names.size >= 3, "several distinct phases");
  assert.equal(useMoonGeometry(state).ok, true);
  state.sky.minutes = minutesForPhase("first quarter");
  assert.equal(predictMoon(state, "new").ok, false);
  assert.equal(predictMoon(state, "full").ok, true);
});

check("eclipse geometry includes orbital tilt", () => {
  const flat = eclipseGeometry(0, 0, 0);
  assert.equal(flat.monthlyIfNoTilt, true);
  const tilted = eclipseGeometry(minutesForPhase("full"), 5.1, 18);
  assert.equal(tilted.monthlyIfNoTilt, false);
  const state = createSfState();
  alignEclipse(state, false);
  assert.equal(state.sky.tiltDeg, 0);
  alignEclipse(state, true);
  assert.ok(state.sky.tiltDeg > 0);
  assert.equal(explainEclipse(state, "monthly").ok, false);
  assert.equal(explainEclipse(state, "tilt").ok, true);
});

check("tidal dataset relates to Moon/Sun geometry", () => {
  const rows = tideRows();
  const spring = rows.filter((row) => row.kind === "spring");
  const neap = rows.filter((row) => row.kind === "neap");
  assert.ok(spring.length >= 1);
  assert.ok(neap.length >= 1);
  assert.ok(Math.max(...spring.map((row) => row.range)) > Math.max(...neap.map((row) => row.range)));
  const state = createSfState();
  assert.equal(compareTides(state, "random-weather").ok, false);
  assert.equal(compareTides(state, "spring-new-full").ok, true);
  assert.equal(classifyPlanets(state, "distance-period").ok, true);
});

check("tools are earned by use; opening tools awards no mastery", () => {
  const empty = createSfState();
  jumpObservation(empty, "noon", sfRegion, gnomonPlayer());
  const tools = createToolState();
  syncToolsFromGameplay(tools, toolsCatalog, { journalOpened: true, ...sfToolsFlags(empty) });
  assert.equal(hasTool(tools, "field-journal"), true);
  assert.equal(hasTool(tools, "celestial-clock"), true);
  assert.equal(hasTool(tools, "solar-observation"), false);
  assert.equal(hasTool(tools, "orbit-model"), false);
  const mastery = createMasteryState();
  assert.equal(regionMastered(sfProfile, mastery), false);
  const played = playSunfall();
  syncToolsFromGameplay(tools, toolsCatalog, sfToolsFlags(played.state));
  assert.equal(hasTool(tools, "solar-observation"), true);
  assert.equal(hasTool(tools, "orbit-model"), true);
  assert.equal(hasTool(tools, "sky-log"), true);
  for (const id of sfProfile.travelRequirements) {
    assert.equal(competencyStatus(sfProfile, played.mastery, id), "demonstrated", id);
  }
  assert.equal(regionMastered(sfProfile, played.mastery), true);
  const record = fieldRecord(sfProfile, played.mastery);
  assert.equal(record.length, 8);
  assert.ok(record.every((item) => !/ROTATION|HS-ESS|NYSSLS/.test(item.label)));
  assert.ok(sfReadyForChallenge(played.state));
});

check("Sunfall Field Challenge integrates competencies and allows revision", () => {
  const state = createSfState();
  state.kepler.a = 4;
  const weak = planObservation(state, sfSpec, {
    site: "crater-floor",
    when: "noon",
    moon: "full",
    period: "2",
    reasons: ["shortest-walk"]
  });
  assert.equal(weak.ok, false);
  const strong = planObservation(state, sfSpec, {
    site: "mesa-rim",
    when: "night",
    moon: "thin",
    period: "8",
    reasons: ["open-horizon", "dark-sky", "return-time"]
  });
  assert.equal(strong.ok, true);
  assert.equal(state.challenge.revised, true);
});

check("optional discoveries are not required for mastery", () => {
  const played = playSunfall();
  assert.equal(played.state.foundIds.length, 0);
  assert.equal(regionMastered(sfProfile, played.mastery), true);
  addSfFind(played.state, "sf-dark-rock");
  assert.equal(identifyFind(played.state, "sf-dark-rock").ok, false);
  played.state.compareSampleSeen = true;
  assert.equal(identifyFind(played.state, "sf-dark-rock").ok, true);
  assert.ok(sfCatalog.items.find((item) => item.id === "sf-dark-rock").interpretedName === "Meteorite fragment");
  assert.equal(sfCatalog.items.find((item) => item.id === "sf-dark-rock").name, "Dark heavy rock");
});

check("Dark Sky Basin remains non-playable", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  applyTravelUnlocks(tbWorld, worldState, "sunfall-desert");
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  const preview = previewModel(tbWorld, worldState, "dark-sky-basin");
  assert.equal(preview.playable, false);
});

check("save persists Sunfall state and Phase 6 saves migrate", () => {
  assert.equal(SAVE_VERSION, 5);
  const played = playSunfall();
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  worldState.currentRegion = "sunfall-desert";
  const snap = captureSave({
    player: { x: 1512, y: 1120, facing: 1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    worldState,
    masteryState: played.mastery,
    toolState: createToolState(),
    hcState: createHcState(),
    sfState: played.state,
    regionPlayers: {
      "cedar-hollow": { x: 1688, y: 940, facing: -1 },
      "high-country": { x: 1280, y: 540, facing: 1 },
      "sunfall-desert": { x: 1512, y: 1120, facing: 1 }
    }
  });
  assert.equal(snap.v, 5);
  assert.equal(snap.world.currentRegion, "sunfall-desert");
  assert.equal(snap.sunfall.challenge.ok, true);
  assert.ok(snap.sunfall.shadows.length >= 3);
  const v4 = {
    v: 4,
    regionId: "high-country",
    player: { x: 1280, y: 540, facing: 1 },
    taught: { walk: true, routeHighCountry: true },
    world: {
      currentRegion: "high-country",
      accessibleRegions: ["cedar-hollow", "high-country"],
      masteredRegions: ["cedar-hollow"]
    },
    mastery: { records: [] },
    tools: { earnedIds: ["field-journal", "coordinates"] },
    highCountry: { introSeen: true, contourOk: true },
    regionPlayers: { "cedar-hollow": { x: 1688, y: 940, facing: -1 }, "high-country": { x: 1280, y: 540, facing: 1 } },
    mission: createMissionState(mission),
    discoveries: createDiscoveryState(),
    investigation: createInvestigationState()
  };
  const migrated = migrateSave(v4);
  assert.equal(migrated.v, 5);
  assert.equal(migrated.sunfall.introSeen, false);
  assert.equal(migrated.highCountry.contourOk, true);
  const sf2 = createSfState();
  const world2 = createWorldState(tbWorld);
  applySave(migrated, {
    player: { x: 0, y: 0, facing: -1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    worldState: world2,
    masteryState: createMasteryState(),
    toolState: createToolState(),
    hcState: createHcState(),
    sfState: sf2,
    regionPlayers: {}
  });
  assert.equal(world2.currentRegion, "high-country");
  assert.equal(sf2.clockUsed, false);
  assert.equal(emptySunfallSave().kepler.a, 4);
});

check("High Country and Sunfall evidence survive Cedar Hollow gameplay sync", () => {
  const mastery = createMasteryState();
  recordEvidence(mastery, { competencyId: "observation", kind: "inspect", regionId: "cedar-hollow", demonstrated: true });
  const played = playSunfall();
  mastery.records = [...mastery.records, ...played.mastery.records];
  syncFromGameplay(mastery, gameplaySnapshot({
    discoveryState: createDiscoveryState(),
    missionState: createMissionState(mission),
    invState: createInvestigationState()
  }));
  assert.ok(mastery.records.some((item) => item.regionId === "sunfall-desert"));
  recordEvidence(mastery, { competencyId: "location", kind: "record-marker", regionId: "high-country", demonstrated: true });
  syncFromGameplay(mastery, gameplaySnapshot({
    discoveryState: createDiscoveryState(),
    missionState: createMissionState(mission),
    invState: createInvestigationState()
  }));
  assert.ok(mastery.records.some((item) => item.regionId === "sunfall-desert"));
  assert.ok(mastery.records.some((item) => item.regionId === "high-country"));
});

check("no standards codes, 1366 layout, apps/terrainbound untouched, nothing deployed", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
  const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  const extras = [
    html,
    JSON.stringify(sfSpec),
    JSON.stringify(sfCatalog),
    ...playerFacingMasteryStrings(sfProfile, tbWorld),
    ...fieldRecord(sfProfile, createMasteryState()).map((item) => item.label)
  ];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, sfCatalog, null, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(/HS-ESS|NYSSLS/i.test(html), false);
  assert.match(css, /max-width: 1366px/);
  assert.doesNotMatch(html, /\bXP\b|\bbadge\b|\bquiz\b/i);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.doesNotMatch(html, /terrainbound\.org/);
  assert.match(gameJs, /sunfall-desert\.json/);
  assert.match(html, /Field observation/);
  assert.equal(tidalKind(moonPhase(minutesForPhase("new"))), "spring");
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7 checks passed.");
