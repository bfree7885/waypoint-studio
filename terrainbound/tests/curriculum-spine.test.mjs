#!/usr/bin/env node
/**
 * TerrainBound Phase B — curriculum + NYS standards spine.
 * Run: node terrainbound/tests/curriculum-spine.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachCurriculumToSummitContext,
  curriculumSummitContext,
  curriculumTopicsFromWorld,
  emptySummitContext,
  gameSummitContext,
  loadLearningSpine,
  RESOURCE_TYPES,
  STANDARD_TYPES,
  validateLearningSpine
} from "../js/learning.js";

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

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

const world = readJson("data/world/regions.json");
const curriculum = readJson("data/learning/curriculum.json");
const concepts = readJson("data/learning/concepts.json");
const standards = readJson("data/learning/standards.json");
const catalog = readJson("data/learning/catalog.json");
const experiences = readJson("data/learning/experiences.json");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const learningJs = fs.readFileSync(path.join(root, "js/learning.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const bundle = { curriculum, concepts, standards, catalog, experiences, world };

check("exactly 12 unique curriculum topics independent of region count", () => {
  assert.equal(curriculum.topics.length, 12);
  assert.equal(new Set(curriculum.topics.map((row) => row.id)).size, 12);
  assert.equal(curriculum.authority.includes("not the curriculum database"), true);
  assert.equal(catalog.curriculumSource, "data/learning/curriculum.json");
  const numbers = curriculum.topics.map((row) => row.number);
  assert.deepEqual([...numbers].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

check("topic titles match regions.json and remain awaiting owner confirmation", () => {
  const worldTopics = curriculumTopicsFromWorld(world);
  for (const worldTopic of worldTopics) {
    const topic = curriculum.topics.find((row) => row.number === worldTopic.number);
    assert.equal(topic.title, worldTopic.title);
    assert.equal(topic.titleSource, "terrainbound/data/world/regions.json curriculumTitle");
    assert.equal(topic.titleConfirmation, "awaiting-owner-confirmation");
    assert.equal(topic.needsOwnerConfirmation, true);
  }
});

check("curriculum is many-to-many capable: concepts can span topics without making a region those topics", () => {
  const runoff = concepts.concepts.find((row) => row.id === "runoff");
  assert.deepEqual(runoff.topicIds, ["topic-01", "topic-09"]);
  const cedar = experiences.experiences.find((row) => row.regionId === "cedar-hollow");
  assert.deepEqual(cedar.topicIds, ["topic-01"]);
  assert.equal(cedar.topicIds.includes("topic-09"), false);
  const timescale = concepts.concepts.find((row) => row.id === "timescale");
  assert.ok(timescale.topicIds.includes("topic-01"));
  assert.ok(timescale.topicIds.includes("topic-06"));
});

check("unique concept ids and every concept has evidence", () => {
  const ids = concepts.concepts.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 40);
  for (const row of concepts.concepts) {
    assert.ok(row.evidenceSource);
    assert.ok(["mastery-competency", "summit-concept", "proposed-travel-competency", "dfd-story-concept"].includes(row.evidenceKind));
    assert.ok(row.topicIds.length >= 1);
  }
});

check("playable regions map to elicited concepts; future regions use documented travel lists only", () => {
  const cedar = experiences.experiences.find((row) => row.regionId === "cedar-hollow");
  assert.equal(cedar.status, "playable");
  assert.ok(cedar.conceptIds.includes("observation"));
  assert.ok(cedar.conceptIds.includes("runoff"));
  const painted = experiences.experiences.find((row) => row.regionId === "painted-badlands");
  assert.equal(painted.status, "future");
  assert.ok(painted.conceptIds.includes("density"));
  const density = concepts.concepts.find((row) => row.id === "density");
  assert.equal(density.elicitedNow, false);
  assert.equal(density.evidenceKind, "proposed-travel-competency");
});

check("standards architecture rejects silent codes and stays pending", () => {
  assert.equal(standards.status, "pending-owner-codes");
  assert.equal(standards.playerVisible, false);
  assert.deepEqual(standards.allowedTypes, STANDARD_TYPES);
  assert.equal(standards.alignments.length, 0);
  assert.equal(new Set(standards.standards.map((row) => row.id)).size, standards.standards.length);
  for (const row of standards.standards) {
    assert.equal(row.code, null);
    assert.equal(row.verificationStatus, "pending-owner-codes");
    assert.equal(row.playerVisible, false);
    assert.equal(row.type, "science-engineering-practice");
  }
  const forged = {
    ...standards,
    standards: [
      ...standards.standards,
      {
        id: "pe-forged",
        code: "HS-ESS2-1",
        title: "forged",
        type: "performance-expectation",
        topicIds: [],
        conceptIds: [],
        source: "",
        verificationStatus: "pending-owner-codes"
      }
    ]
  };
  const rejected = validateLearningSpine({ ...bundle, standards: forged });
  assert.equal(rejected.ok, false);
  assert.ok(rejected.errors.some((msg) => /code/i.test(msg)));
});

check("spine validation passes and dangling references fail", () => {
  const ok = validateLearningSpine(bundle);
  assert.equal(ok.ok, true, ok.errors.join("; "));
  const danglingTopic = {
    ...curriculum,
    topics: curriculum.topics.map((row) =>
      row.id === "topic-01" ? { ...row, conceptIds: [...row.conceptIds, "not-a-concept"] } : row
    )
  };
  const bad = validateLearningSpine({ ...bundle, curriculum: danglingTopic });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((msg) => msg.includes("not-a-concept")));
});

check("game experiences reference existing regions only", () => {
  const regionIds = new Set(world.regions.map((row) => row.id));
  for (const row of experiences.experiences) {
    assert.ok(regionIds.has(row.regionId));
    assert.equal(row.standardIds.length, 0);
  }
  const playable = experiences.experiences.filter((row) => row.status === "playable");
  assert.equal(playable.length, 4);
  assert.ok(playable.some((row) => row.regionId === "dark-sky-basin" && row.topicIds.includes("topic-11")));
});

check("resource types are known and catalogs stay small and real", () => {
  for (const type of RESOURCE_TYPES) assert.equal(typeof type, "string");
  assert.equal(catalog.collections.stories.length, 0);
  assert.equal(catalog.collections.resources.length, 7);
  assert.equal(catalog.collections.videos.length, 1);
  const video = catalog.collections.videos[0];
  assert.equal(video.type, "deep-forest-dispatch-video");
  assert.equal(video.youtubeVideoId, "ue74ge9Bz7U");
  assert.equal(video.embedPolicy, "youtube-embed-only");
  assert.equal(catalog.deepForestDispatch.brandMerge, false);
});

check("SummitContext can reference topic, concepts, and standards without surfacing codes", () => {
  const game = gameSummitContext({
    regionId: "cedar-hollow",
    investigationId: "CH-03",
    topicId: "topic-01",
    conceptIds: ["slope", "fair-test"]
  });
  assert.equal(game.studentFacingStandards, false);
  assert.deepEqual(game.standardIds, []);
  const curriculumCtx = curriculumSummitContext({
    topicId: "topic-11",
    conceptIds: ["spectra"]
  });
  assert.equal(curriculumCtx.contextType, "curriculum");
  const attached = attachCurriculumToSummitContext(game, {
    topicId: "topic-01",
    conceptIds: ["runoff"],
    standardIds: ["sep-planning-investigations"]
  });
  assert.equal(attached.contextType, "game");
  assert.deepEqual(attached.standardIds, ["sep-planning-investigations"]);
  assert.equal(attached.studentFacingStandards, false);
  const general = emptySummitContext();
  assert.equal(general.standardIds.length, 0);
});

check("loaded spine uses curriculum.json as topic authority", () => {
  const loaded = loadLearningSpine(bundle);
  assert.equal(loaded.curriculumSource, "data/learning/curriculum.json");
  assert.equal(loaded.topics.length, 12);
  assert.equal(loaded.concepts.length, concepts.concepts.length);
  assert.equal(loaded.playerVisibleCodes, false);
  assert.equal(loaded.standardsStatus, "pending-owner-codes");
});

check("game engine still does not import the learning module", () => {
  assert.doesNotMatch(learningJs, /from "\.\/game\.js"/);
  assert.doesNotMatch(gameJs, /from "\.\/learning\.js"/);
  assert.doesNotMatch(html, /HS-ESS|NYSSLS/);
  assert.match(gameJs, /createSummitEngine/);
});

if (failures.length) {
  for (const row of failures) console.error(row.name, row.err);
  process.exit(1);
}
console.log("\nAll TerrainBound Phase B curriculum-spine checks passed.");
