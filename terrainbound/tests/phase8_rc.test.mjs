#!/usr/bin/env node
/**
 * TerrainBound Phase 8 RC — Dark Sky production availability.
 * Run: node terrainbound/tests/phase8_rc.test.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorld, createWorldState, applyTravelUnlocks, canEnterRegion, isPlayable, previewModel } from "../js/worldmap.js";
import { migrateSave, captureSave, SAVE_VERSION } from "../js/save.js";
import { emptyDarkSkySave } from "../js/darksky.js";
import { resolveSummitRuntime, PRODUCTION_ENDPOINT } from "../js/summit-runtime.js";
import { isForbiddenRel, publishStatic } from "../scripts/publish-static.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
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
const provider = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const uiJs = fs.readFileSync(path.join(root, "js/ui.js"), "utf8");
const wrangler = fs.readFileSync(path.join(root, "server/wrangler.toml"), "utf8");
const workerSrc = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");

check("Dark Sky is playable Topic 11 and locked for a fresh student", () => {
  const ds = worldRaw.regions.find((row) => row.id === "dark-sky-basin");
  assert.equal(ds.implementationState, "playable");
  assert.equal(ds.curriculumTopic, 11);
  assert.equal(ds.curriculumTitle, "Stars & the Universe");
  assert.equal(ds.availableAfter, "cedar-hollow");
  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  assert.equal(isPlayable(tbWorld, "dark-sky-basin"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), false);
  assert.deepEqual(worldState.accessibleRegions, ["cedar-hollow"]);
});

check("Cedar Hollow clearance opens Dark Sky without pretending Topics 2–10 are done", () => {
  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  const opened = applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
  assert.ok(opened.includes("high-country"));
  assert.ok(opened.includes("dark-sky-basin"));
  assert.equal(canEnterRegion(tbWorld, worldState, "dark-sky-basin"), true);
  assert.equal(canEnterRegion(tbWorld, worldState, "painted-badlands"), false);
  const preview = previewModel(tbWorld, worldState, "dark-sky-basin");
  assert.equal(preview.curriculumTopic, 11);
  assert.match(preview.topicKicker, /Topic 11/);
  assert.match(preview.routeLabel, /Available region/i);
  assert.match(preview.subtitle, /Stars & the Universe/);
  assert.doesNotMatch(preview.routeDetail, /Topic 2\b|next after Cedar Hollow|Sunfall content/i);
  assert.match(preview.routeDetail, /not complete/i);
  const afterDarkSky = applyTravelUnlocks(tbWorld, worldState, "dark-sky-basin");
  assert.equal(afterDarkSky.includes("painted-badlands"), false);
  assert.equal(worldState.accessibleRegions.includes("painted-badlands"), false);
  assert.equal(canEnterRegion(tbWorld, worldState, "painted-badlands"), false);
});

check("production HTML does not require review query flags", () => {
  assert.doesNotMatch(html, /\?field=1/);
  assert.doesNotMatch(html, /region=dark-sky-basin/);
  assert.doesNotMatch(html, /summit=local/);
  assert.match(html, /src="\.\/js\/main\.js\?v=p8ds"/);
  assert.match(mainJs, /game\.js\?v=p8ds/);
  assert.match(gameJs, /darkSkyReview/);
  assert.equal(resolveSummitRuntime({ hostname: "terrainbound.org", search: "", cfg: provider }).endpoint, PRODUCTION_ENDPOINT);
  assert.equal(resolveSummitRuntime({ hostname: "terrainbound.org", search: "?field=1", cfg: provider }).mode, "production");
});

check("save keeps Dark Sky when accessible and heals leaked review saves", () => {
  assert.equal(SAVE_VERSION, 6);
  const leaked = migrateSave({
    v: 6,
    world: { currentRegion: "dark-sky-basin", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    player: { x: 12, y: 18, facing: 1 },
    taught: { walk: true }
  });
  assert.equal(leaked.world.currentRegion, "cedar-hollow");
  const kept = migrateSave({
    v: 6,
    world: {
      currentRegion: "dark-sky-basin",
      accessibleRegions: ["cedar-hollow", "high-country", "dark-sky-basin"],
      masteredRegions: ["cedar-hollow"]
    },
    player: { x: 1588, y: 1368, facing: 1 },
    taught: { walk: true }
  });
  assert.equal(kept.world.currentRegion, "dark-sky-basin");
  const ch = migrateSave({
    v: 6,
    world: { currentRegion: "cedar-hollow", accessibleRegions: ["cedar-hollow"], masteredRegions: [] },
    player: { x: 40, y: 40, facing: 1 },
    taught: { walk: true }
  });
  assert.equal(ch.world.currentRegion, "cedar-hollow");
  const snap = captureSave({
    player: { x: 1264, y: 360, facing: 1 },
    missionState: { introSeen: true, observations: [], storyNotes: [], conclusionPath: null, concluded: false, flowVisible: false },
    discoveryState: { foundIds: [], acknowledgedIds: [], wrenTalks: 0 },
    invState: { introSeen: false, active: false, measuredIds: [], evidenceIds: [], selectedProcess: null, selectedEvidenceIds: [], concluded: false },
    taught: { walk: true },
    worldState: {
      currentRegion: "dark-sky-basin",
      accessibleRegions: ["cedar-hollow", "dark-sky-basin"],
      masteredRegions: ["cedar-hollow"]
    },
    masteryState: { records: [] },
    toolState: { earnedIds: [] },
    flumeState: {},
    dataState: { datasets: {}, activeId: null },
    challengeState: {},
    puzzleState: {},
    summitState: {},
    hcState: {},
    sfState: {},
    dsState: emptyDarkSkySave(),
    regionPlayers: {},
    presentation: {}
  });
  assert.equal(snap.world.currentRegion, "dark-sky-basin");
  assert.equal(snap.player.x, 1264);
});

check("Worker and production endpoint are unchanged", () => {
  assert.equal(PRODUCTION_ENDPOINT, "https://terrainbound-summit.bfree7885.workers.dev/summit");
  assert.equal(provider.productionEndpoint, PRODUCTION_ENDPOINT);
  assert.equal(provider.endpoint, "");
  assert.match(wrangler, /terrainbound-summit/);
  assert.doesNotMatch(workerSrc, /dark-sky-basin|DS-01/);
});

check("keyboard alternatives exist for Dark Sky canvases", () => {
  assert.match(uiJs, /canvasEl\.onkeydown/);
  assert.match(uiJs, /ArrowLeft/);
  assert.match(gameJs, /dsInspectPrompt/);
});

const dest = fs.mkdtempSync(path.join(os.tmpdir(), "tb-p8ds-"));
try {
  await publishStatic(dest);
  const walk = (dir, rel = "") => {
    const names = fs.readdirSync(dir);
    const files = [];
    for (const name of names) {
      const full = path.join(dir, name);
      const next = rel ? `${rel}/${name}` : name;
      const st = fs.statSync(full);
      if (st.isDirectory()) files.push(...walk(full, next));
      else files.push(next);
    }
    return files;
  };
  check("static candidate contains no secrets or server files", () => {
    const files = walk(dest);
    assert.ok(files.includes("index.html"));
    assert.ok(files.includes("js/main.js"));
    assert.ok(files.some((row) => row.startsWith("data/darksky/")));
    assert.ok(files.some((row) => row.includes("dark-sky-basin")));
    const blob = files
      .filter((rel) => /\.(html|js|json|css|mjs|toml|md|txt)$/i.test(rel))
      .map((rel) => fs.readFileSync(path.join(dest, rel), "utf8"))
      .join("\n");
    assert.doesNotMatch(blob, /SUMMIT_API_KEY\s*=/);
    assert.doesNotMatch(blob, /gsk_[A-Za-z0-9]/);
    assert.equal(files.some((row) => row.startsWith("server/") || row.endsWith(".env")), false);
    assert.equal(isForbiddenRel("server/summit-gateway.mjs"), true);
  });
} finally {
  fs.rmSync(dest, { recursive: true, force: true });
}

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 8 RC checks passed.");
