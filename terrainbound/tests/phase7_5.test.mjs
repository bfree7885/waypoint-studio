#!/usr/bin/env node
/**
 * TerrainBound Phase 7.5 — three-region production vertical slice.
 * Run: node terrainbound/tests/phase7_5.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_STATES, normalizeAppearance, poseFromIntent } from "../js/character.js";
import { STATION_IDENTITY } from "../js/stations.js";
import { ATMOSPHERE_KEYS } from "../js/atmosphere.js";
import { travelTitleFor, createTravelState, beginTravel, travelBlocking, TRAVEL_MS } from "../js/travel.js";
import { SAVE_VERSION, migrateSave, emptyPresentationSave, captureSave, emptyTaught } from "../js/save.js";
import { createMasteryState, fieldRecord, journeyRecord, regionMastered, simulateMastery } from "../js/mastery.js";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable } from "../js/worldmap.js";
import { createWorld, heightAt } from "../js/world.js";
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";
import { createAudio } from "../js/audio.js";

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
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const bible = fs.readFileSync(path.join(root, "docs/GAME-BIBLE.md"), "utf8");
const presentation = JSON.parse(fs.readFileSync(path.join(root, "data/world/presentation.json"), "utf8"));
const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const tbWorld = loadWorld(worldRaw);
const chProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const hcProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/high-country.json"), "utf8"));
const sfProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/sunfall-desert.json"), "utf8"));
const chRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/cedar-hollow.json"), "utf8"));
const hcRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/high-country.json"), "utf8"));
const sfRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/sunfall-desert.json"), "utf8"));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const curriculum = loadCurriculumMap(JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8")));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/cedar-hollow.json"), "utf8"));

check("fresh player gets control quickly from a short opening", () => {
  assert.match(html, />Begin</);
  assert.match(html, /New exploration/);
  assert.match(html, /World map/);
  assert.match(html, /An exploration game about learning to read the Earth/);
  assert.doesNotMatch(html, /NYS|NYSSLS|twelve curriculum|mastery architecture/i);
  assert.ok(mission.intro.lines.length <= 2);
  assert.match(gameJs, /playTravelCard/);
});

check("player clearly reads as a field explorer", () => {
  const char = fs.readFileSync(path.join(root, "js/character.js"), "utf8");
  assert.match(char, /drawExplorer/);
  assert.match(char, /backpack|jacket|drawTablet/i);
  assert.match(bible, /NEW FIELD EXPLORER/i);
  assert.match(html, /Field tablet/);
});

check("character has readable idle/walk/inspect/measure/tablet/talk/sky states", () => {
  for (const pose of ["idle", "walk", "inspect", "measure", "tablet", "talk", "sky"]) {
    assert.ok(CHARACTER_STATES.includes(pose), pose);
  }
  assert.equal(poseFromIntent({ moving: true, pose: "idle" }), "walk");
  assert.equal(poseFromIntent({ talking: true, moving: false, pose: "idle" }), "talk");
  assert.equal(poseFromIntent({ journalOpen: true, moving: false, pose: "idle" }), "tablet");
  assert.match(gameJs, /setPose\("sky"\)/);
});

check("sky-observation state is wired for Sunfall", () => {
  assert.match(gameJs, /moon-site/);
  assert.match(gameJs, /setPose\("sky"\)/);
  assert.equal(sfRegion.terrainModel, "sunfall-desert");
});

check("Wren remains functional as a recurring mentor", () => {
  assert.match(mission.intro.speaker, /Ranger Wren/);
  assert.match(gameJs, /talkToWren/);
  assert.match(mission.intro.lines[0], /Field Service/);
  assert.match(bible, /experienced, calm, observant/i);
});

check("Cedar Hollow mechanics and mastery still exist", () => {
  assert.equal(chRegion.id, "cedar-hollow");
  const mastery = createMasteryState();
  simulateMastery(chProfile, mastery, "cedar-hollow");
  assert.equal(regionMastered(chProfile, mastery), true);
  assert.ok(fieldRecord(chProfile, mastery).length >= 8);
});

check("High Country gate and mastery still exist", () => {
  const worldState = createWorldState(tbWorld);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  const mastery = createMasteryState();
  simulateMastery(hcProfile, mastery, "high-country");
  assert.equal(regionMastered(hcProfile, mastery), true);
});

check("Sunfall gate and mastery still exist", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), true);
  const mastery = createMasteryState();
  simulateMastery(sfProfile, mastery, "sunfall-desert");
  assert.equal(regionMastered(sfProfile, mastery), true);
});

check("all three regions remain revisit-able after unlock", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  applyTravelUnlocks(tbWorld, worldState, "high-country");
  for (const id of ["cedar-hollow", "high-country", "sunfall-desert"]) {
    assert.equal(canEnterRegion(tbWorld, worldState, id), true);
    assert.equal(isPlayable(tbWorld, id), true);
  }
});

check("field stations share Field Service identity", () => {
  const stations = fs.readFileSync(path.join(root, "js/stations.js"), "utf8");
  assert.match(stations, /FIELD SERVICE/);
  assert.match(stations, /Cedar Hollow Station/);
  assert.match(stations, /Ridgeline Station/);
  assert.match(stations, /Sunfall Observatory/);
  assert.deepEqual(STATION_IDENTITY.variants.sort(), ["cedar-hollow", "high-country", "sunfall-desert"]);
  assert.equal(presentation.fieldNetwork.signName, "FIELD SERVICE");
});

check("regions remain strongly visually distinct", () => {
  assert.equal(chRegion.terrainModel || "cedar-hollow", "cedar-hollow");
  assert.equal(hcRegion.terrainModel, "high-country");
  assert.equal(sfRegion.terrainModel, "sunfall-desert");
  const hollow = heightAt(chRegion, 560, 800);
  const alpine = heightAt(hcRegion, 520, 420);
  const desert = heightAt(sfRegion, 420, 500);
  assert.ok(alpine > hollow || alpine > 0.4);
  assert.ok(desert > 0.3);
  assert.ok(presentation.atmosphere["cedar-hollow"].water);
  assert.ok(presentation.atmosphere["sunfall-desert"].dust);
  for (const key of ATMOSPHERE_KEYS) assert.ok(key);
});

check("Field Tablet and atlas remain functional", () => {
  assert.match(html, /id="journal"/);
  assert.match(html, /data-tab="world"/);
  assert.match(html, /id="atlas"/);
  assert.match(html, /The journey/);
  assert.match(gameJs, /journeyRecord/);
});

check("travel works among unlocked regions", () => {
  const title = travelTitleFor(presentation, "high-country");
  assert.equal(title.station, "Ridgeline Station");
  const state = createTravelState();
  beginTravel(state, "sunfall-desert", "high-country", 0);
  assert.equal(travelBlocking(state, 100), true);
  assert.equal(travelBlocking(state, TRAVEL_MS + 10), false);
  assert.match(gameJs, /function travelTo/);
});

check("save v5 migrates and loads presentation without a version bump", () => {
  assert.equal(SAVE_VERSION, 5);
  const v5 = migrateSave({
    v: 5,
    player: { x: 10, y: 10, facing: 1 },
    taught: emptyTaught(),
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] }
  });
  assert.equal(v5.presentation.appearance.jacket, "clay");
  const v4 = migrateSave({ v: 4, player: { x: 1, y: 2, facing: -1 }, taught: {}, world: {} });
  assert.equal(v4.v, 5);
  assert.ok(v4.presentation);
  const snap = captureSave({
    player: { x: 8, y: 9, facing: 1 },
    missionState: {},
    discoveryState: {},
    invState: {},
    taught: emptyTaught(),
    worldState: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    masteryState: { records: [] },
    toolState: { earnedIds: [] },
    flumeState: {},
    dataState: {},
    challengeState: {},
    hcState: {},
    sfState: {},
    regionPlayers: {},
    presentation: emptyPresentationSave()
  });
  assert.equal(snap.v, 5);
  assert.equal(snap.presentation.openingSeen, false);
  const look = normalizeAppearance({ skin: "umber", hair: "bun-auburn", jacket: "pine" });
  assert.equal(look.jacket, "pine");
});

check("no death, health, XP, levels, badges, or currency", () => {
  assert.doesNotMatch(html, /\bXP\b|\bbadge\b|\blevels?\b|\bhealth\b|\bGAME OVER\b|\bcoins?\b|\bcurrency\b/i);
  assert.doesNotMatch(gameJs, /\bhealth\b|\blives\b|\bGAME OVER\b|\bXP\b/);
  assert.match(bible, /The player cannot die/);
});

check("no standards codes; 1366 layout; Dark Sky closed; retired app untouched", () => {
  const extras = [html, bible, JSON.stringify(presentation)];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, catalog, null, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.match(css, /max-width: 1366px/);
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), false);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
});

check("Game Bible and production systems exist", () => {
  assert.match(bible, /TERRAINBOUND IS AN EXPLORATION GAME ABOUT LEARNING TO READ THE EARTH/);
  assert.match(bible, /THERE IS NO ENEMY TO DEFEAT. THE WORLD IS THE MYSTERY/);
  assert.ok(fs.existsSync(path.join(root, "js/character.js")));
  assert.ok(fs.existsSync(path.join(root, "js/stations.js")));
  assert.ok(fs.existsSync(path.join(root, "js/atmosphere.js")));
  assert.ok(fs.existsSync(path.join(root, "js/travel.js")));
  createWorld(chRegion, 1842);
  createWorld(hcRegion, 2210);
  createWorld(sfRegion, 3107);
  const audio = createAudio({ reducedMotion: true });
  audio.unlock();
  audio.setPlace("sunfall-desert", true);
  assert.equal(typeof audio.measure, "function");
});

check("accumulated Field Record spans the three-region journey", () => {
  const mastery = createMasteryState();
  simulateMastery(chProfile, mastery, "cedar-hollow");
  simulateMastery(hcProfile, mastery, "high-country");
  const blocks = journeyRecord(
    [
      { ...chProfile, regionTitle: "Cedar Hollow" },
      { ...hcProfile, regionTitle: "High Country" },
      { ...sfProfile, regionTitle: "Sunfall Desert" }
    ],
    mastery
  );
  assert.equal(blocks.length, 3);
  assert.ok(blocks[0].items.some((item) => item.status === "demonstrated"));
});

check("school-laptop Canvas 2D architecture is unchanged", () => {
  assert.match(html, /type="module"/);
  assert.doesNotMatch(html, /phaser|three\.js|unity|godot/i);
  assert.match(fs.readFileSync(path.join(root, "js/render.js"), "utf8"), /getContext\("2d"\)/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.5 checks passed.");
