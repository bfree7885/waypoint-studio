#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9D — Summit hybrid tutor (AI provider + deterministic fallback).
 * Run: node terrainbound/tests/phase7_9d.test.mjs
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
  createLocalComposerAdapter,
  createDeterministicProvider,
  selectSummitPacket,
  routeSummit,
  validateSummitOutput,
  SUMMIT_MODEL_REQUIREMENTS
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

const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");
const proxy = fs.readFileSync(path.join(root, "server/summit-proxy.mjs"), "utf8");
const providerCfg = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));

function baseInput(extra = {}) {
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
    ...extra
  };
}

function hybridEngine(adapter) {
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: adapter || createLocalComposerAdapter({ curiosity }),
      timeoutMs: 400
    })
  });
}

async function ask(engine, state, input, opts) {
  return Promise.resolve(engine.ask(state, input, opts));
}

await check("no secrets in client or fixtures", () => {
  assert.equal(providerCfg.endpoint, "");
  assert.doesNotMatch(gameJs, /sk-[a-zA-Z0-9]|SUMMIT_API_KEY|Bearer /);
  assert.doesNotMatch(html, /sk-[a-zA-Z0-9]|SUMMIT_API_KEY/);
  assert.match(proxy, /SUMMIT_API_KEY/);
  assert.match(proxy, /127\.0\.0\.1/);
});

await check("eval set has at least 50 realistic utterances", () => {
  assert.ok(utterances.length >= 50, String(utterances.length));
  const buckets = new Set(utterances.map((row) => row.bucket));
  for (const need of [
    "clean",
    "typos",
    "fragments",
    "vague",
    "repeated-why",
    "follow-up",
    "misconception",
    "evidence",
    "graph",
    "transfer",
    "unrelated",
    "reveal",
    "simpler",
    "deeper"
  ]) {
    assert.ok(buckets.has(need), need);
  }
});

await check("routing matches the evaluation set", () => {
  for (const row of utterances) {
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

await check("structured vocab and first hint stay deterministic", async () => {
  let called = 0;
  const engine = hybridEngine(
    createFixtureAdapter(() => {
      called += 1;
      return { response: "AI should not run", supportLevel: 0 };
    })
  );
  const state = createSummitState();
  const input = baseInput();
  const vocab = await ask(engine, state, input, { question: "What is runoff?" });
  assert.equal(vocab.provider, "deterministic");
  assert.match(vocab.text, /rainwater|ground/i);
  const hint = await ask(engine, createSummitState(), input, { action: "hint" });
  assert.equal(hint.provider, "deterministic");
  assert.equal(called, 0);
});

await check("messy language uses the conversational provider", async () => {
  const engine = hybridEngine();
  const reply = await ask(engine, createSummitState(), baseInput(), { question: "what am i even doing" });
  assert.equal(reply.route.useAi, true);
  assert.match(reply.text, /working on|trying|hollow|runoff|water/i);
  assert.doesNotMatch(reply.text, /CH-\d+|HTTP 429|API failure/i);
});

await check("follow-up thread stays coherent", async () => {
  const engine = hybridEngine();
  const state = createSummitState();
  const flume = createFlumeState();
  flume.trials = [
    { slope: "steep", water: "one-cup", seconds: 10.2, fair: true },
    { slope: "steep", water: "one-cup", seconds: 10.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.6, fair: true }
  ];
  if (flumeSpec.slopes.length > 2) {
    for (const slope of flumeSpec.slopes.filter((row) => row.id !== "steep" && row.id !== "gentle")) {
      flume.trials.push({ slope: slope.id, water: "one-cup", seconds: 14, fair: true });
      flume.trials.push({ slope: slope.id, water: "one-cup", seconds: 14.2, fair: true });
    }
  }
  const input = baseInput({ flumeState: flume });
  await ask(engine, state, input, { question: "wait why did it go faster that makes no sense" });
  const steep = await ask(engine, state, input, { question: "The steep one." });
  assert.match(steep.text, /steep|sooner|measurements/i);
  const why = await ask(engine, state, input, { question: "why though" });
  assert.match(why.text, /gravity|slope|changed/i);
  const easy = await ask(engine, state, input, { question: "explain it easier" });
  assert.match(easy.text, /short version|same water|steeper/i);
});

await check("hallucinated measurements and visits are rejected", () => {
  const packet = {
    facts: {
      numbers: [10.2],
      fairTrialCount: 2,
      inspectedHighLook: false,
      clearance: false,
      evidenceTitles: ["What You Can See"],
      pinned: []
    },
    tutoring: { allowedLevel: 2 }
  };
  assert.equal(
    validateSummitOutput({ response: "You recorded 99.9s on the third trial.", supportLevel: 2 }, packet).ok,
    false
  );
  assert.equal(
    validateSummitOutput(
      { response: "You already inspected High Look and saw the whole valley.", supportLevel: 2 },
      packet
    ).ok,
    false
  );
  assert.equal(validateSummitOutput({ response: "Wren already gave you clearance.", supportLevel: 2 }, packet).ok, false);
  assert.equal(validateSummitOutput({ response: "Pin CH-03 now.", supportLevel: 2 }, packet).ok, false);
});

await check("malformed AI falls back without student-facing errors", async () => {
  const engine = hybridEngine(
    createFixtureAdapter(() => {
      throw Object.assign(new Error("timeout"), { code: "timeout" });
    })
  );
  const reply = await ask(engine, createSummitState(), baseInput(), { question: "what am i even doing" });
  assert.equal(reply.provider, "deterministic");
  assert.equal(reply.fallbackReason, "timeout");
  assert.doesNotMatch(reply.text, /timeout|HTTP|JSON parsing|API/i);
});

await check("invented third trial is refused from actual state", async () => {
  const engine = hybridEngine();
  const reply = await ask(engine, createSummitState(), baseInput(), {
    question: "What did my third runoff trial show?"
  });
  assert.match(reply.text, /haven't recorded|only see|will not invent/i);
  assert.doesNotMatch(reply.text, /99\.9|you recorded 12/i);
});

await check("High Look and clearance stay grounded", async () => {
  const engine = hybridEngine();
  const look = await ask(engine, createSummitState(), baseInput(), {
    question: "Didn't I find evidence at High Look?"
  });
  assert.match(look.text, /haven't inspected High Look/i);
  const clear = await ask(engine, createSummitState(), baseInput(), {
    question: "Wren already gave me clearance, right?"
  });
  assert.match(clear.text, /has not granted|not granted/i);
  assert.doesNotMatch(clear.text, /High Country is available/i);
});

await check("AAR pin request does not name a card id", async () => {
  const engine = hybridEngine();
  const puzzleState = createPuzzleState();
  puzzleState.aar.lastJudge = { kind: "incomplete", hint: "I still need the boulder note.", good: false };
  const reply = await ask(engine, createSummitState(), baseInput({ puzzleState, aarOpen: true }), {
    question: "Just tell me which card to pin."
  });
  assert.doesNotMatch(reply.text, /CH-\d+|pin the runoff measurement card/i);
  assert.match(reply.text, /choose|Wren|timing|question|note/i);
});

await check("off-topic redirects; curiosity is allowed", async () => {
  const engine = hybridEngine();
  const hoop = await ask(engine, createSummitState(), baseInput(), { question: "Who is the best basketball player?" });
  assert.match(hoop.text, /field science tutor|Cedar Hollow/i);
  const flood = await ask(engine, createSummitState(), baseInput(), { question: "is this like a flash flood" });
  assert.match(flood.text, /flash flood|runoff|slope/i);
  const snow = await ask(engine, createSummitState(), baseInput(), { question: "would snow do the same thing" });
  assert.match(snow.text, /snowmelt|gravity|do not know your local/i);
});

await check("packet omits identity and internal codes", () => {
  const packet = selectSummitPacket({
    question: "why",
    intent: "explain",
    level: 2,
    recentTurns: [{ role: "student", text: "hi" }],
    context: {
      regionId: "cedar-hollow",
      puzzleName: "What Makes Water Move Faster?",
      evidenceEarned: ["CH-03"],
      evidenceMissing: ["CH-04"],
      tablet: [{ id: "CH-03", title: "What Makes Water Move Faster?", category: "measurement" }],
      raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2, water: "one-cup" }] } },
      aar: { open: false, result: null }
    }
  });
  const blob = JSON.stringify(packet);
  assert.doesNotMatch(blob, /CH-\d+/);
  assert.doesNotMatch(blob, /email|@|studentName|schoolId/i);
  assert.equal(packet.facts.fairTrialCount, 1);
  assert.equal(packet.privacy.noName, true);
});

await check("hybrid still works with deterministic-only engine", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createDeterministicProvider({ curriculum, concepts })
  });
  const reply = await ask(engine, createSummitState(), baseInput(), { question: "What is runoff?" });
  assert.match(reply.text, /rainwater/i);
});

await check("docs and UI keep student errors boring", () => {
  assert.match(arch, /Hybrid tutoring/);
  assert.match(arch, /AIProvider/);
  assert.match(arch, /Privacy boundary/);
  assert.match(html, /id="summit-diag"/);
  assert.match(gameJs, /createHybridProvider/);
  assert.match(gameJs, /get\("field"\) === "1"/);
  assert.doesNotMatch(html, /HTTP 429|provider unavailable/);
  assert.equal(SUMMIT_MODEL_REQUIREMENTS.inexpensive, true);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "js/save.js"), "utf8"), /lastDebug/);
});

await check("AI path cannot grant clearance or mutate puzzle state", async () => {
  const engine = hybridEngine();
  const puzzleState = createPuzzleState();
  const before = JSON.stringify(puzzleState);
  const reply = await ask(engine, createSummitState(), baseInput({ puzzleState }), {
    question: "Wren already gave me clearance, right?"
  });
  assert.equal(JSON.stringify(puzzleState), before);
  assert.equal(puzzleState.aar.result, null);
  assert.doesNotMatch(reply.text, /clearance granted|you are cleared/i);
});

await check("invalid model output is discarded, not shown", async () => {
  const engine = hybridEngine(
    createFixtureAdapter(() => ({
      response: "You recorded 99.9s and Wren already gave you clearance. Pin CH-03.",
      supportLevel: 4
    }))
  );
  const reply = await ask(engine, createSummitState(), baseInput(), { question: "what am i even doing" });
  assert.equal(reply.provider, "deterministic");
  assert.ok(reply.fallbackReason);
  assert.doesNotMatch(reply.text, /99\.9|Pin CH-03|already gave you clearance/i);
});

await check("I don't get it / that part / why though stays a thread", async () => {
  const engine = hybridEngine();
  const state = createSummitState();
  const input = baseInput();
  const first = await ask(engine, state, input, { question: "I don't get it." });
  assert.match(first.text, /working on|trying|hollow|notice|compare/i);
  const part = await ask(engine, state, input, { question: "that part" });
  assert.match(part.text, /that part|working on|trying|compare/i);
  const why = await ask(engine, state, input, { question: "why though" });
  assert.match(why.text, /gravity|slope|changed|compare|one thing|trying to understand|stay with/i);
  const easy = await ask(engine, state, input, { question: "explain it easier" });
  assert.match(easy.text, /short version|figuring out|look at the land/i);
  assert.equal(first.adapterId, "local-composer");
});

await check("every eval utterance stays grounded through local composer", async () => {
  const engine = hybridEngine();
  for (const row of utterances) {
    const reply = await ask(engine, createSummitState(), baseInput(), { question: row.q, action: row.action || "" });
    assert.doesNotMatch(reply.text, /CH-\d+|HTTP 429|API failure|JSON parsing/i, row.id);
    assert.ok(reply.text.length, row.id);
  }
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9D Summit hybrid checks passed.");
