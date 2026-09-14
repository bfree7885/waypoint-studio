#!/usr/bin/env node
/**
 * TerrainBound Phase C — Field Station shell.
 * Run: node terrainbound/tests/field-station.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  courseDisplayNumbers,
  courseDisplayTopics,
  parseStationRoute,
  shouldSkipFieldStation,
  stationHashFor,
  studentFacingTextHasLeak,
  studentTopicCard,
  watchReadItems
} from "../js/learning.js";
import { continueModel, renderStationView } from "../js/field-station.js";
import { SAVE_KEY } from "../js/save.js";
import { loadLearningSpine, validateLearningSpine } from "../js/learning.js";

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

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

const html = read("index.html");
const stationJs = read("js/field-station.js");
const mainJs = read("js/main.js");
const gameJs = read("js/game.js");
const learningJs = read("js/learning.js");
const css = read("css/station.css");
const curriculum = readJson("data/learning/curriculum.json");
const concepts = readJson("data/learning/concepts.json");
const experiences = readJson("data/learning/experiences.json");
const catalog = readJson("data/learning/catalog.json");
const world = readJson("data/world/regions.json");
const bundle = { curriculum, concepts, standards: readJson("data/learning/standards.json"), catalog, experiences, world };
const state = { curriculum, concepts, experiences, catalog };

check("Field Station markup and styles exist without an LMS chrome", () => {
  assert.match(html, /id="field-station"/);
  assert.match(html, /id="station-view"/);
  assert.match(html, /href="\.\/css\/station\.css"/);
  assert.match(html, /id="game-root" hidden/);
  assert.match(html, /data-station-return/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(html, /gradebook|assignment|module tile|completion percent/i);
  assert.doesNotMatch(html, /NYS|NYSSLS|HS-ESS/);
});

check("course display is Topic 1–12 and is not game travel order", () => {
  assert.deepEqual(courseDisplayNumbers(curriculum), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(curriculum.gameTravelTopicNumbers, [1, 2, 10, 11, 3, 4, 5, 6, 9, 7, 8, 12]);
  assert.notDeepEqual(courseDisplayNumbers(curriculum), curriculum.gameTravelTopicNumbers);
  assert.equal(curriculum.ownerDefinedCourseSequence, null);
  const topics = courseDisplayTopics(curriculum);
  assert.equal(topics.length, 12);
  assert.deepEqual(topics.map((row) => row.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.ok(curriculum.topics.every((row) => row.prerequisiteTopicIds.length === 0));
  assert.equal(validateLearningSpine(bundle).ok, true, validateLearningSpine(bundle).errors.join("; "));
});

check("Course view loads twelve topics from curriculum.json, not regions.json", () => {
  assert.doesNotMatch(stationJs, /world\/regions\.json/);
  const page = renderStationView(state, { view: "course" });
  assert.match(page, /Course atlas/);
  for (let n = 1; n <= 12; n += 1) assert.match(page, new RegExp(`Topic ${n}`));
  assert.match(page, /Scientific Thinking &amp; Earth Systems|Scientific Thinking & Earth Systems/);
  assert.doesNotMatch(page, /HS-ESS|NYSSLS/);
  assert.doesNotMatch(page, /fair-test|stellar-temp|sep-asking/);
  assert.match(page, /Available in the field/);
  assert.match(page, /Future field work/);
});

check("topic detail uses concept names and honest field status", () => {
  const painted = renderStationView(state, { view: "topic", topicId: "topic-01" });
  assert.match(painted, /Careful observation|Observation/);
  assert.match(painted, /Cedar Hollow/);
  assert.match(painted, /Walkable now/);
  assert.doesNotMatch(painted, />fair-test</);
  assert.doesNotMatch(painted, /HS-ESS/);
  const future = renderStationView(state, { view: "topic", topicId: "topic-03" });
  assert.match(future, /Not built yet|Future field work|no playable field work/i);
  assert.doesNotMatch(future, /Walk the land/);
  const card = studentTopicCard(curriculum.topics[0], {
    concepts: concepts.concepts,
    experiences: experiences.experiences,
    catalog
  });
  assert.ok(card.conceptNames.includes("Observation"));
  assert.equal(card.conceptNames.includes("observation"), false);
});

check("Continue handles save and no-save without changing SAVE_KEY", () => {
  assert.equal(SAVE_KEY, "terrainbound.cedar-hollow.v1");
  const empty = continueModel({ getItem: () => null });
  assert.equal(empty.hasSave, false);
  assert.match(empty.label, /Start field work/);
  const saved = continueModel({
    getItem: (key) =>
      key === SAVE_KEY
        ? JSON.stringify({
            v: 6,
            world: { currentRegion: "high-country", accessibleRegions: ["cedar-hollow", "high-country"] }
          })
        : null
  });
  assert.equal(saved.hasSave, true);
  assert.match(saved.detail, /High Country/);
});

check("Field integration keeps the existing boot and adds a return path", () => {
  assert.match(mainJs, /shouldSkipFieldStation/);
  assert.match(mainJs, /bootGame: \(options\) => boot\(document, options\)/);
  assert.match(mainJs, /game\.js\?v=p8ds/);
  assert.match(gameJs, /function leaveField/);
  assert.match(gameJs, /function enterField/);
  assert.match(gameJs, /data-station-return/);
  assert.match(html, />Begin</);
  assert.doesNotMatch(gameJs, /from "\.\/field-station\.js"/);
  assert.doesNotMatch(gameJs, /from "\.\/learning\.js"/);
  assert.doesNotMatch(stationJs, /from "\.\/game\.js"/);
  assert.equal(shouldSkipFieldStation("?field=1"), true);
  assert.equal(shouldSkipFieldStation(""), false);
});

check("Watch & Read loads only real catalog resources and keeps DFD distinct", () => {
  const items = watchReadItems(catalog, concepts.concepts);
  const ids = items.map((row) => row.id).sort();
  const expected = [...catalog.collections.resources, ...catalog.collections.videos].map((row) => row.id).sort();
  assert.deepEqual(ids, expected);
  const watch = renderStationView(state, { view: "watch" });
  assert.match(watch, /Deep Forest Dispatch/);
  assert.match(watch, /Mount Hood|rain shadow|forest/);
  assert.doesNotMatch(watch, /live news|RSS|ingest/i);
  const video = renderStationView(state, { view: "resource", resourceId: "video-dfd-mount-hood-rain-shadow" });
  assert.match(video, /youtube-nocookie\.com\/embed\/ue74ge9Bz7U/);
  assert.match(video, /does not host this film/);
});

check("Ask Summit placeholder does not pretend to be a global tutor", () => {
  const ask = renderStationView(state, { view: "ask" });
  assert.match(ask, /Ask Summit/);
  assert.match(ask, /no separate Station tutor yet/);
  assert.doesNotMatch(ask, /id="summit-ask"/);
  assert.doesNotMatch(ask, /type="text"/);
  assert.match(ask, /Find Summit in the field/);
});

check("hash routing covers Station surfaces", () => {
  assert.deepEqual(parseStationRoute("#/course/topic-07"), { view: "topic", topicId: "topic-07", resourceId: null });
  assert.equal(stationHashFor({ view: "watch" }), "#/watch");
  assert.equal(stationHashFor({ view: "field" }), "#/field");
  assert.equal(stationHashFor({ view: "home" }), "#/");
  const home = renderStationView(state, { view: "home" });
  assert.match(home, /Field Station/);
  assert.match(home, /Course atlas/);
  assert.match(home, /Watch &amp; Read|Watch & Read/);
});

check("student-facing course text does not leak standards codes", () => {
  const pages = [
    renderStationView(state, { view: "home" }),
    renderStationView(state, { view: "course" }),
    renderStationView(state, { view: "topic", topicId: "topic-11" }),
    renderStationView(state, { view: "watch" }),
    renderStationView(state, { view: "ask" })
  ].join("\n");
  assert.equal(studentFacingTextHasLeak(pages.replace(/<[^>]+>/g, " ")), false);
  assert.doesNotMatch(pages.replace(/<[^>]+>/g, " "), /\bfair-test\b|\bstellar-temp\b|\bsep-asking-questions\b/);
});

check("Phase B spine still loads through the station data files", () => {
  const loaded = loadLearningSpine(bundle);
  assert.equal(loaded.topics.length, 12);
  assert.equal(loaded.curriculumSource, "data/learning/curriculum.json");
  assert.doesNotMatch(learningJs, /from "\.\/game\.js"/);
});

if (failures.length) {
  for (const row of failures) console.error(row.name, row.err);
  process.exit(1);
}
console.log("\nAll TerrainBound Phase C field-station checks passed.");
