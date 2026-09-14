#!/usr/bin/env node
/**
 * TerrainBound Phase A — learning-environment foundation.
 * Run: node terrainbound/tests/learning-foundation.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  curriculumTopicsFromWorld,
  emptySummitContext,
  gameExperiencesFromWorld,
  gameSummitContext,
  loadLearningCatalog,
  relatedForStory,
  SUMMIT_CONTEXT_TYPES
} from "../js/learning.js";
import { GAME_HELP_LINE } from "../js/summit.js";

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

const worldRaw = JSON.parse(fs.readFileSync(path.join(root, "data/world/regions.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/learning/catalog.json"), "utf8"));
const standards = JSON.parse(fs.readFileSync(path.join(root, "data/learning/standards.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/learning/curriculum.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/learning/concepts.json"), "utf8"));
const experiences = JSON.parse(fs.readFileSync(path.join(root, "data/learning/experiences.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const learningJs = fs.readFileSync(path.join(root, "js/learning.js"), "utf8");

check("twelve topic titles come from the existing world, not invented names", () => {
  const topics = curriculumTopicsFromWorld(worldRaw);
  assert.equal(topics.length, 12);
  assert.deepEqual(
    topics.map((row) => [row.number, row.title]),
    [
      [1, "Scientific Thinking & Earth Systems"],
      [2, "Maps, GIS & Geospatial Thinking"],
      [3, "Earth's Materials"],
      [4, "Surface Processes"],
      [5, "Earth's Interior & Plate Tectonics"],
      [6, "Earth's History"],
      [7, "Weather & Atmospheric Systems"],
      [8, "Climate & Global Change"],
      [9, "Water & Ocean Systems"],
      [10, "Solar System"],
      [11, "Stars & the Universe"],
      [12, "Natural Resources, Hazards & Sustainability"]
    ]
  );
  assert.equal(topics.find((row) => row.number === 11).regionId, "dark-sky-basin");
  assert.equal(topics.find((row) => row.number === 1).implementationState, "playable");
  assert.equal(topics.find((row) => row.number === 3).implementationState, "future");
  for (const topic of curriculum.topics) {
    const worldTopic = topics.find((row) => row.number === topic.number);
    assert.equal(topic.title, worldTopic.title);
  }
});

check("learning catalog does not invent stories or standards codes", () => {
  const loaded = loadLearningCatalog(catalog, worldRaw, standards, { curriculum, concepts, experiences });
  assert.equal(loaded.stories.length, 0);
  assert.equal(loaded.playerVisibleCodes, false);
  assert.equal(loaded.standardsStatus, "pending-owner-codes");
  assert.equal(standards.alignments.length, 0);
  assert.ok(loaded.standards.every((row) => row.code == null));
  assert.equal(catalog.deepForestDispatch.brandMerge, false);
  assert.equal(catalog.deepForestDispatch.embedPolicy, "youtube-embed-only");
  assert.equal(loaded.experiences.filter((row) => row.status === "playable").length, 4);
  assert.equal(loaded.concepts.length > 0, true);
});

check("SummitContext is one identity with typed surfaces and never grants clearance", () => {
  assert.deepEqual(SUMMIT_CONTEXT_TYPES, ["game", "curriculum", "story", "video", "general"]);
  const game = gameSummitContext({
    regionId: "cedar-hollow",
    investigationId: "CH-03",
    topicId: "topic-01"
  });
  assert.equal(game.contextType, "game");
  assert.equal(game.doNotGrantClearance, true);
  assert.equal(game.doNotRevealAnswers, true);
  const general = emptySummitContext({ contextType: "nope" });
  assert.equal(general.contextType, "general");
  const story = emptySummitContext({ contextType: "story", storyId: "example", topicId: "topic-07" });
  assert.equal(story.contextType, "story");
  assert.equal(story.regionId, null);
});

check("story cross-links stay empty until owner ScienceStory content exists", () => {
  const loaded = loadLearningCatalog(catalog, worldRaw, standards, { curriculum, concepts, experiences });
  const related = relatedForStory({ id: "missing", topicIds: ["topic-07"] }, loaded);
  assert.equal(related.topics.length, 1);
  assert.equal(related.topics[0].title, "Weather & Atmospheric Systems");
  assert.equal(related.videos.length, 0);
  assert.equal(related.experiences.length, 1);
  assert.equal(related.experiences[0].regionId, "stormlands");
});

check("learning module stays out of the game engine and Summit authored help still exists", () => {
  assert.doesNotMatch(learningJs, /from "\.\/game\.js"/);
  assert.doesNotMatch(gameJs, /from "\.\/learning\.js"/);
  assert.match(gameJs, /createSummitEngine/);
  assert.ok(GAME_HELP_LINE.length > 8);
});

check("mobile Summit gains a visualViewport hook without a visual redesign", () => {
  assert.match(html, /data-summit-layout="sheet"/);
  assert.match(css, /--summit-vvh/);
  assert.match(css, /--summit-keyboard-inset/);
  assert.match(gameJs, /function syncSummitViewport/);
  assert.doesNotMatch(css, /data-summit-layout="fullscreen"/);
});

check("game experiences index existing regions only", () => {
  const fromWorld = gameExperiencesFromWorld(worldRaw);
  assert.equal(fromWorld.length, 12);
  assert.ok(fromWorld.some((row) => row.regionId === "cedar-hollow" && row.status === "playable"));
  assert.ok(fromWorld.some((row) => row.regionId === "dark-sky-basin" && row.topicIds.includes("topic-11")));
  assert.equal(experiences.experiences.length, 12);
});

if (failures.length) {
  for (const row of failures) console.error(row.name, row.err);
  process.exit(1);
}
console.log("\nAll TerrainBound Phase A learning-foundation checks passed.");
