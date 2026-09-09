#!/usr/bin/env node
/**
 * TerrainBound Phase 6 checks — High Country Topic 2, maps as field tools.
 * Run: node terrainbound/tests/phase6.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorld, heightAt, isBlocked, moveWithCollision } from "../js/world.js";
import {
  worldToLatLon,
  formatLatLon,
  polylineLengthMeters,
  routeMetrics,
  trailById,
  sampleProfile,
  contourCrossings,
  elevationMeters,
  gradientPercent,
  layerGeometry
} from "../js/geomap.js";
import {
  createHcState,
  recordMarker,
  measureRoute,
  compareRoutes,
  compareTerrain,
  collectStake,
  connectContour,
  predictProfile,
  generateProfile,
  pickGisSite,
  inspectLayerType,
  compareImagery,
  recordDepth,
  planChallengeRoute,
  presentChallenge as presentHcChallenge,
  hcToolsFlags,
  applyHcEvidence,
  hcReadyForChallenge,
  recordedMarkerCount,
  toggleHcTopo,
  toggleMapLayer
} from "../js/highcountry.js";
import {
  captureSave,
  applySave,
  migrateSave,
  emptyTaught,
  emptyHighCountrySave,
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
import { loadCurriculumMap, assertNoPlayerFacingCodes } from "../js/curriculum.js";

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

const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const toolsCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/world/tools.json"), "utf8"));
const chProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/cedar-hollow.json"), "utf8"));
const hcProfile = JSON.parse(fs.readFileSync(path.join(root, "data/mastery/high-country.json"), "utf8"));
const hcRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/high-country.json"), "utf8"));
const chRegion = JSON.parse(fs.readFileSync(path.join(root, "data/regions/cedar-hollow.json"), "utf8"));
const hcSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/high-country.json"), "utf8"));
const hcCatalog = JSON.parse(fs.readFileSync(path.join(root, "data/discoveries/high-country.json"), "utf8"));
const mission = JSON.parse(fs.readFileSync(path.join(root, "data/missions/where-does-the-water-go.json"), "utf8"));
const placeholders = JSON.parse(fs.readFileSync(path.join(root, "data/curriculum/placeholders.json"), "utf8"));
const curriculum = loadCurriculumMap(placeholders);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const tbWorld = loadWorld(worldRaw);
const hcWorld = createWorld(hcRegion, 2210, hcCatalog.items);
const chWorld = createWorld(chRegion, 1842);

function at(x, y) {
  return { x, y, facing: -1 };
}

function playHighCountry() {
  const state = createHcState();
  const mastery = createMasteryState();
  for (const marker of hcSpec.markers.slice(0, 3)) {
    const result = recordMarker(state, hcSpec, marker.id, hcRegion, at(marker.x, marker.y));
    applyHcEvidence(mastery, recordEvidence, result.evidence);
  }
  const m1 = measureRoute(state, hcSpec, hcRegion, heightAt, hcSpec.routes.a.id);
  applyHcEvidence(mastery, recordEvidence, m1.evidence);
  const m2 = measureRoute(state, hcSpec, hcRegion, heightAt, hcSpec.routes.b.id);
  applyHcEvidence(mastery, recordEvidence, m2.evidence);
  const routes = compareRoutes(state, hcSpec, "east-meadow", ["gentler", "heavy-case", "wide-contours"]);
  applyHcEvidence(mastery, recordEvidence, routes.evidence);
  applyHcEvidence(mastery, recordEvidence, compareTerrain(state, hcSpec, "west-cliff").evidence);
  applyHcEvidence(mastery, recordEvidence, compareTerrain(state, hcSpec, "east-meadow").evidence);
  for (const stake of hcSpec.stakes.slice(0, 3)) {
    applyHcEvidence(
      mastery,
      recordEvidence,
      collectStake(state, hcSpec, stake.id, at(stake.x, stake.y)).evidence
    );
  }
  applyHcEvidence(
    mastery,
    recordEvidence,
    connectContour(state, hcSpec, hcSpec.contour.correctIds).evidence
  );
  predictProfile(state, hcSpec, "ridge-then-drop");
  applyHcEvidence(mastery, recordEvidence, generateProfile(state, hcSpec, hcRegion, heightAt).evidence);
  toggleMapLayer(state.mapState, "water");
  toggleMapLayer(state.mapState, "elevation");
  applyHcEvidence(mastery, recordEvidence, pickGisSite(state, hcSpec, "gis-good").evidence);
  applyHcEvidence(mastery, recordEvidence, inspectLayerType(state, hcSpec, "trails").evidence);
  toggleMapLayer(state.mapState, "imagery");
  const wash = hcRegion.props.find((prop) => prop.kind === "washout");
  applyHcEvidence(mastery, recordEvidence, compareImagery(state, hcSpec, at(wash.x, wash.y), wash).evidence);
  applyHcEvidence(
    mastery,
    recordEvidence,
    planChallengeRoute(state, hcSpec, "east-meadow", ["avoids-washout", "gentler"]).evidence
  );
  presentHcChallenge(state);
  return { state, mastery };
}

check("High Country is enterable only after Cedar Hollow mastery", () => {
  const worldState = createWorldState(tbWorld);
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), false);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.equal(canEnterRegion(tbWorld, worldState, "high-country"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "cedar-hollow"), true);
});

check("player can return to Cedar Hollow and Sunfall stays non-playable", () => {
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  worldState.currentRegion = "high-country";
  assert.equal(canEnterRegion(tbWorld, worldState, "cedar-hollow"), true);
  assert.equal(isPlayable(tbWorld, "sunfall-desert"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "sunfall-desert"), false);
  const preview = previewModel(tbWorld, worldState, "sunfall-desert");
  assert.equal(preview.playable, false);
});

check("High Country loads as a distinct alpine region", () => {
  assert.equal(hcRegion.terrainModel, "high-country");
  assert.notEqual(hcRegion.width, chRegion.width);
  assert.ok(heightAt(hcRegion, 600, 760) > heightAt(hcRegion, 1988, 1140), "cliff should stand above meadow");
  assert.ok(heightAt(hcRegion, 1348, 240) > heightAt(hcRegion, 1280, 1580), "radio site above trailhead");
  for (const feature of hcRegion.features) {
    assert.equal(isBlocked(hcWorld, feature.x, feature.y), false, feature.id + " should be standable");
  }
  const spawn = moveWithCollision(hcWorld, hcRegion.spawn.x, hcRegion.spawn.y, 0, 0);
  assert.equal(spawn.x, hcRegion.spawn.x);
});

check("coordinates work as a pair with precision from position", () => {
  const state = createHcState();
  const marker = hcSpec.markers[0];
  const far = recordMarker(state, hcSpec, marker.id, hcRegion, at(marker.x + 400, marker.y));
  assert.equal(far.ok, false);
  const close = recordMarker(state, hcSpec, marker.id, hcRegion, at(marker.x, marker.y));
  assert.equal(close.ok, true);
  assert.ok(close.digits >= 4);
  assert.match(close.reading, /N/);
  assert.match(close.reading, /W/);
  const ll = worldToLatLon(hcRegion, marker.x, marker.y);
  const north = worldToLatLon(hcRegion, marker.x, marker.y - 200);
  const east = worldToLatLon(hcRegion, marker.x + 200, marker.y);
  assert.ok(north.lat > ll.lat);
  assert.ok(east.lon > ll.lon);
  assert.match(formatLatLon(ll, 4), /°/);
});

check("scale and distance measurements work", () => {
  const state = createHcState();
  const a = measureRoute(state, hcSpec, hcRegion, heightAt, "west-switchback");
  const b = measureRoute(state, hcSpec, hcRegion, heightAt, "east-meadow");
  assert.ok(a.metrics.distance > 800);
  assert.ok(b.metrics.distance > a.metrics.distance);
  assert.equal(state.measuredRoutes.length, 2);
  const trail = trailById(hcRegion, "west-switchback");
  assert.ok(polylineLengthMeters(hcRegion, trail.points) > 0);
});

check("contour and elevation relationships are represented", () => {
  const cliff = contourCrossings(hcRegion, heightAt, 520, 900, 520, 500, 20);
  const meadow = contourCrossings(hcRegion, heightAt, 1988, 1280, 1988, 1000, 20);
  assert.ok(cliff > meadow, "tight spacing on the west face");
  const head = elevationMeters(hcRegion, heightAt, 1280, 1580);
  const ridge = elevationMeters(hcRegion, heightAt, 1280, 548);
  assert.ok(ridge > head);
});

check("gradient can be derived from field or map data", () => {
  const a = routeMetrics(hcRegion, heightAt, trailById(hcRegion, "west-switchback"));
  const b = routeMetrics(hcRegion, heightAt, trailById(hcRegion, "east-meadow"));
  assert.ok(a.gradient > b.gradient, "west trail should be steeper");
  assert.ok(gradientPercent(a.gain, a.distance) > 0);
});

check("player can construct contour information with useful feedback", () => {
  const state = createHcState();
  const wrong = connectContour(state, hcSpec, ["s-1400a", "s-1420a"]);
  assert.equal(wrong.ok, false);
  assert.match(wrong.hint, /1420/);
  const ok = connectContour(state, hcSpec, ["s-1400a", "s-1400b"]);
  assert.equal(ok.ok, true);
});

check("profile tool works after being earned by prediction plus generation", () => {
  const state = createHcState();
  const early = generateProfile(state, hcSpec, hcRegion, heightAt);
  assert.equal(early.match, false);
  predictProfile(state, hcSpec, "ridge-then-drop");
  const later = generateProfile(state, hcSpec, hcRegion, heightAt);
  assert.equal(later.match, true);
  assert.ok(later.profile.samples.length > 10);
  const flags = hcToolsFlags(state);
  assert.equal(flags.profileUsed, true);
});

check("GIS layers toggle and multiple layers support a spatial decision", () => {
  const state = createHcState();
  const wet = pickGisSite(state, hcSpec, "gis-wet");
  assert.equal(wet.ok, false);
  toggleMapLayer(state.mapState, "water");
  toggleMapLayer(state.mapState, "elevation");
  const good = pickGisSite(state, hcSpec, "gis-good");
  assert.equal(good.ok, true);
  const kinds = hcSpec.layers.map((layer) => layerGeometry(hcSpec.layers, layer.id));
  assert.ok(kinds.includes("line"));
  assert.ok(kinds.includes("point"));
  assert.ok(kinds.includes("polygon"));
  assert.ok(kinds.includes("raster"));
});

check("remote sensing can be compared with field and map data", () => {
  const state = createHcState();
  const wash = hcRegion.props.find((prop) => prop.kind === "washout");
  const result = compareImagery(state, hcSpec, at(wash.x, wash.y), wash);
  assert.equal(result.ok, true);
  assert.match(result.note, /scar|switchback|sketch/i);
});

check("High Country mastery is evidence-based and opening tools does not award it", () => {
  const empty = createHcState();
  empty.mapOpened = true;
  toggleHcTopo(empty);
  const tools = createToolState();
  syncToolsFromGameplay(tools, toolsCatalog, { journalOpened: true, ...hcToolsFlags(empty) });
  assert.equal(hasTool(tools, "field-journal"), true);
  assert.equal(hasTool(tools, "coordinates"), false);
  assert.equal(hasTool(tools, "gis-layers"), false);
  const mastery = createMasteryState();
  assert.equal(regionMastered(hcProfile, mastery), false);
  const played = playHighCountry();
  for (const id of hcProfile.travelRequirements) {
    assert.equal(competencyStatus(hcProfile, played.mastery, id), "demonstrated", id);
  }
  assert.equal(regionMastered(hcProfile, played.mastery), true);
  const record = fieldRecord(hcProfile, played.mastery);
  assert.equal(record.length, 9);
  assert.ok(record.every((item) => !/LOCATION|GIS|HS-ESS/.test(item.label)));
  assert.ok(hcReadyForChallenge(played.state));
});

check("regional challenge integrates multiple geospatial competencies", () => {
  const state = createHcState();
  const weak = planChallengeRoute(state, hcSpec, "west-switchback", ["shorter"]);
  assert.equal(weak.ok, false);
  const strong = planChallengeRoute(state, hcSpec, "saddle-cut", ["avoids-washout", "avoids-cliff"]);
  assert.equal(strong.ok, true);
});

check("save persists region state and Phase 5 saves migrate", () => {
  assert.equal(SAVE_VERSION, 4);
  const played = playHighCountry();
  const worldState = createWorldState(tbWorld);
  applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  worldState.currentRegion = "high-country";
  const snap = captureSave({
    player: { x: 1280, y: 540, facing: 1 },
    missionState: createMissionState(mission),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    taught: emptyTaught(),
    worldState,
    masteryState: played.mastery,
    toolState: createToolState(),
    hcState: played.state,
    regionPlayers: { "cedar-hollow": { x: 1688, y: 940, facing: -1 }, "high-country": { x: 1280, y: 540, facing: 1 } }
  });
  assert.equal(snap.v, 4);
  assert.equal(snap.world.currentRegion, "high-country");
  assert.ok(snap.highCountry.contourOk);
  assert.equal(snap.regionPlayers["cedar-hollow"].x, 1688);
  const v3 = {
    v: 3,
    regionId: "cedar-hollow",
    player: { x: 1688, y: 940, facing: -1 },
    taught: { walk: true },
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow", "high-country"], masteredRegions: ["cedar-hollow"] },
    mastery: { records: [] },
    tools: { earnedIds: ["field-journal"] },
    mission: createMissionState(mission),
    discoveries: createDiscoveryState(),
    investigation: createInvestigationState(),
    flume: { trials: [] },
    fieldData: { datasets: {} },
    challenge: { concluded: true }
  };
  const migrated = migrateSave(v3);
  assert.equal(migrated.v, 4);
  assert.equal(migrated.highCountry.introSeen, false);
  assert.equal(migrated.regionPlayers["cedar-hollow"].x, 1688);
  const hc2 = createHcState();
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
    hcState: hc2
  });
  assert.equal(world2.accessibleRegions.includes("high-country"), true);
  assert.deepEqual(emptyHighCountrySave().measuredRoutes, []);
});

check("Cedar Hollow terrain is unchanged; CH mastery records survive HC evidence", () => {
  const slope = heightAt(chRegion, 730, 540);
  const creek = heightAt(chRegion, 980, 800);
  assert.ok(slope > creek);
  const mastery = createMasteryState();
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: { foundIds: ["x"] },
      missionState: { observations: [1, 2, 3], concluded: true },
      invState: { measuredIds: ["a"], concluded: true, interpreted: true, attempts: 2 }
    })
  );
  const before = mastery.records.length;
  recordEvidence(mastery, {
    competencyId: "location",
    regionId: "high-country",
    kind: "record-marker",
    demonstrated: true
  });
  syncFromGameplay(
    mastery,
    gameplaySnapshot({
      discoveryState: { foundIds: ["x"] },
      missionState: { observations: [1, 2, 3], concluded: true },
      invState: { measuredIds: ["a"], concluded: true, interpreted: true, attempts: 2 }
    })
  );
  assert.ok(mastery.records.some((item) => item.regionId === "high-country"));
  assert.ok(mastery.records.length >= before);
});

check("no standards codes, 1366 layout, apps/terrainbound untouched, nothing deployed", () => {
  const extras = [
    html,
    JSON.stringify(hcSpec),
    JSON.stringify(hcCatalog),
    ...playerFacingMasteryStrings(hcProfile, tbWorld),
    ...fieldRecord(hcProfile, createMasteryState()).map((item) => item.label)
  ];
  const gate = assertNoPlayerFacingCodes(mission, curriculum, hcCatalog, null, extras);
  assert.equal(gate.hasOfficialLookingCode, false);
  assert.equal(/HS-ESS|NYSSLS/i.test(html), false);
  assert.match(css, /max-width: 1366px/);
  assert.doesNotMatch(html, /\bXP\b|\bbadge\b|\bquiz\b/i);
  const retired = fs.readFileSync(path.join(repoRoot, "apps/terrainbound/index.html"), "utf8");
  assert.match(retired, /Terrainbound is retired/);
  assert.equal(fs.existsSync(path.join(root, "CNAME")), false);
  assert.doesNotMatch(html, /terrainbound\.org/);
  assert.match(gameJs, /high-country\.json/);
  assert.match(html, /Field map/);
});

check("bathymetry transect is compact and walkable from the dock", () => {
  const state = createHcState();
  const point = hcSpec.bathymetry.points[0];
  const result = recordDepth(state, hcSpec, point.id, at(point.x, point.y));
  assert.equal(result.ok, true);
  assert.equal(result.depth, 2);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 6 checks passed.");
