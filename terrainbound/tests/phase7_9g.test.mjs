#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9G — constrained Summit conversation (offline architecture).
 * Live GPT-OSS eval: node terrainbound/tests/phase7_9g-live.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPuzzleState } from "../js/puzzles.js";
import { createMissionState } from "../js/mission.js";
import { createDiscoveryState } from "../js/discoveries.js";
import { createInvestigationState } from "../js/investigation.js";
import { createFlumeState } from "../js/flume.js";
import { createDataState } from "../js/fielddata.js";
import { createChallengeState } from "../js/challenge.js";
import {
  createSummitEngine,
  createSummitState,
  createHybridProvider,
  createFixtureAdapter,
  createHttpAdapter,
  createDeterministicProvider,
  routeSummit,
  validateSummitOutput,
  selectSummitPacket,
  composeStudentVisible,
  buildSummitTruth
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === "function") {
      return out.then(() => console.log("ok  " + name)).catch((err) => {
        failures.push(name);
        console.error("FAIL  " + name);
        console.error("  " + (err.stack || err.message));
      });
    }
    console.log("ok  " + name);
    return Promise.resolve();
  } catch (err) {
    failures.push(name);
    console.error("FAIL  " + name);
    console.error("  " + (err.stack || err.message));
    return Promise.resolve();
  }
}

const constrained = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-constrained.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));
const extra = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-bakeoff-extra.json"), "utf8"));
const providerCfg = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const proxySrc = fs.readFileSync(path.join(root, "server/summit-proxy.mjs"), "utf8");
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");
const liveG = fs.readFileSync(path.join(root, "tests/phase7_9g-live.mjs"), "utf8");

function baseInput(extraIn = {}) {
  return {
    regionId: "cedar-hollow",
    player: { x: 400, y: 400 },
    region: { features: [] },
    catalog: { items: [] },
    missionState: createMissionState({ id: "t", title: "t" }),
    discoveryState: createDiscoveryState(),
    invState: createInvestigationState(),
    flumeState: createFlumeState(),
    dataState: createDataState(),
    challengeState: createChallengeState(),
    puzzleState: createPuzzleState(),
    puzzleSpec,
    aarSpec,
    flumeSpec,
    investigation: { hypothesis: { requiredProcess: "two-clocks" } },
    aarOpen: false,
    aarIndex: 0,
    ...extraIn
  };
}

function withSteepOnly() {
  const flume = createFlumeState();
  flume.trials = [
    { slope: "steep", water: "one-cup", seconds: 10.2, fair: true },
    { slope: "steep", water: "one-cup", seconds: 10.4, fair: true }
  ];
  return baseInput({ flumeState: flume });
}

await check("constrained schema drops gameplay fields from model authority", async () => {
  const { SUMMIT_REPLY_SCHEMA } = await import(path.join(root, "server/summit-proxy.mjs"));
  const keys = Object.keys(SUMMIT_REPLY_SCHEMA.properties).sort();
  assert.deepEqual([...SUMMIT_REPLY_SCHEMA.required].sort(), keys);
  assert.deepEqual(keys, ["concept", "explanation", "followUpQuestion", "offTopic", "supportLevel"]);
  assert.ok(!SUMMIT_REPLY_SCHEMA.properties.suggestedAction);
  assert.ok(!SUMMIT_REPLY_SCHEMA.properties.referencedEvidence);
  assert.match(proxySrc, /SUMMIT_UPSTREAM_TIMEOUT_MS/);
  assert.match(proxySrc, /ctrl\.abort/);
  assert.match(proxySrc, /MODE_BUDGET_MS/);
});

await check("7.9G live runner is GPT-OSS only and 5s", () => {
  assert.match(liveG, /openai\/gpt-oss-20b/);
  assert.doesNotMatch(liveG, /qwen3\.6|qwen\/qwen/);
  assert.match(liveG, /5000/);
  assert.match(liveG, /retry429: 0/);
});

await check("constrained eval routes as labeled", () => {
  assert.ok(constrained.length >= 40, String(constrained.length));
  for (const row of constrained) {
    const detected = detectIntent(row.q, row.action || "");
    const decision = routeSummit({
      question: row.q,
      action: row.action || "",
      intent: detected.intent,
      context: { summit: { hintAsks: 0, recent: [] } }
    });
    assert.equal(decision.reason, row.expectRoute, `${row.id} (${row.q}) got ${decision.reason}`);
  }
});

await check("legacy utterance set still matches labeled routes", () => {
  for (const row of [...utterances, ...extra]) {
    const detected = detectIntent(row.q, row.action || "");
    const decision = routeSummit({
      question: row.q,
      action: row.action || "",
      intent: detected.intent,
      context: { summit: { hintAsks: 0, recent: [] } }
    });
    assert.equal(decision.reason, row.expectRoute, `${row.id} (${row.q}) got ${decision.reason}`);
  }
});

await check("science follow-ups use the model; gameplay and next-action do not", () => {
  const why = routeSummit({ question: "why did it go faster", intent: "explain", recentTurns: [] });
  assert.equal(why.useAi, true);
  assert.equal(why.reason, "follow-up");
  const steep = routeSummit({ question: "but why does steep matter", intent: "explain", recentTurns: [{ role: "student", text: "why" }] });
  assert.equal(steep.useAi, true);
  const gravity = routeSummit({ question: "so gravity gets stronger?", intent: "explain", recentTurns: [{ role: "student", text: "why" }] });
  assert.equal(gravity.useAi, true);
  const next = routeSummit({ question: "what should I test next", intent: "what_now" });
  assert.equal(next.useAi, false);
  assert.equal(next.reason, "next-action");
  const tap = routeSummit({ question: "what button do I press?", intent: "what_now" });
  assert.equal(tap.useAi, false);
  assert.equal(tap.reason, "gameplay-redirect");
});

await check("truth packet is deterministic and does not invent gentle times", () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({ curriculum, concepts, curiosity })
  });
  const packet = selectSummitPacket({
    question: "why did it go faster",
    intent: "explain",
    level: 2,
    context: engine.ask ? undefined : undefined
  });
  const truth = buildSummitTruth({
    raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2 }, { slope: "steep", seconds: 10.4 }] } },
    observations: [],
    aar: { result: null }
  });
  assert.ok(truth.known.some((row) => /10\.2/.test(row)));
  assert.ok(truth.unknown.some((row) => /gentle/i.test(row)));
  assert.equal(truth.comparisonValid, false);
  assert.equal(truth.nextAction.id, "measure-gentle");
  assert.doesNotMatch(truth.known.join(" "), /18\./);
  assert.ok(!packet.facts.evidenceTitles);
});

await check("composer appends gameplay only from TerrainBound", () => {
  const packet = {
    facts: { known: ["Trial 1: steep slope, 10.2 s"] },
    nextAction: { id: "measure-gentle", text: "Time the same cup on the gentler slope next so the comparison is fair." }
  };
  const science = composeStudentVisible(
    "Water moving down the steeper slope has a stronger downhill component of gravity, so it tends to move faster.",
    packet,
    { question: "why did it go faster" }
  );
  assert.doesNotMatch(science, /gentler slope next/i);
  const next = composeStudentVisible("Stay with the times you recorded.", packet, { question: "what should I test next" });
  assert.match(next, /gentler slope next/i);
});

await check("validator rejects gameplay commands without keyword science lists", () => {
  const packet = { facts: { numbers: [10.2], fairTrialCount: 2, inspectedHighLook: false, clearance: false }, tutoring: { allowedLevel: 2 } };
  assert.equal(
    validateSummitOutput({ explanation: "Click the Start Trial button next to Wren.", supportLevel: 2 }, packet).reason,
    "gameplay-command"
  );
  assert.equal(
    validateSummitOutput({ explanation: "Water on a steeper slope usually finishes sooner.", supportLevel: 2 }, packet).ok,
    true
  );
  assert.equal(providerCfg.timeoutMs, 5000);
  assert.match(gameJs, /retry429: 0/);
});

await check("inventory does not dump the CH-02 objective; next-action is from truth", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({ curriculum, concepts, curiosity })
  });
  const notes = await Promise.resolve(engine.ask(createSummitState(), withSteepOnly(), { question: "what notes do i have" }));
  assert.equal(notes.route.reason, "evidence-inventory");
  assert.match(notes.text, /10\.2|Trial 1/i);
  assert.doesNotMatch(notes.text, /last night's water went|Walk the ground/i);
  const next = await Promise.resolve(engine.ask(createSummitState(), withSteepOnly(), { question: "what should I test next" }));
  assert.equal(next.provider, "deterministic");
  assert.match(next.text, /gentler slope/i);
  const look = await Promise.resolve(engine.ask(createSummitState(), withSteepOnly(), { question: "what did I find at High Look?" }));
  assert.match(look.text, /haven't inspected High Look/i);
});

await check("timeout and malformed still fall back", async () => {
  const timed = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      timeoutMs: 30,
      adapter: {
        id: "slow",
        kind: "remote",
        complete: () => new Promise((resolve) => setTimeout(() => resolve({ explanation: "late", supportLevel: 0 }), 400))
      }
    })
  });
  const a = await Promise.resolve(timed.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(a.provider, "deterministic");
  assert.equal(a.fallbackReason, "timeout");

  const bad = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createFixtureAdapter(() => ({ explanation: "Tap the Start Trial button.", supportLevel: 0 }))
    })
  });
  const b = await Promise.resolve(bad.ask(createSummitState(), baseInput(), { question: "why did it go faster" }));
  assert.equal(b.provider, "deterministic");
  assert.equal(b.fallbackReason, "gameplay-command");

  const down = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createHttpAdapter({ endpoint: "http://127.0.0.1:1/summit-ai", timeoutMs: 200 })
    })
  });
  const c = await Promise.resolve(down.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(c.provider, "deterministic");

  const det = createDeterministicProvider({ curriculum, concepts });
  const d = det.respond({
    question: "Who won the Super Bowl?",
    intent: "explain",
    level: 0,
    context: { activePuzzleId: "CH-02", aar: {}, observations: [] }
  });
  assert.match(d.text, /Earth Science companion|Cedar Hollow/i);
});

await check("docs describe constrained language-layer architecture", () => {
  assert.match(arch, /Phase 7\.9G|constrained conversation|language layer/i);
  assert.match(arch, /explanation/);
  assert.doesNotMatch(arch, /suggestedAction.*model authority/i);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9G architecture checks passed.");
