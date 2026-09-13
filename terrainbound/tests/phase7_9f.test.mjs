#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9F — hosted small-model bakeoff (offline architecture).
 * Live bakeoff: SUMMIT_API_KEY=... node terrainbound/tests/phase7_9f-live.mjs
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
  validateSummitOutput
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

const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));
const extra = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-bakeoff-extra.json"), "utf8"));
const bakeoff = JSON.parse(fs.readFileSync(path.join(root, "data/summit/bakeoff.json"), "utf8"));
const providerCfg = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");

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

await check("Groq JSON schema lists every property as required", async () => {
  const gateway = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");
  const { SUMMIT_REPLY_SCHEMA } = await import(path.join(root, "server/summit-proxy.mjs"));
  const keys = Object.keys(SUMMIT_REPLY_SCHEMA.properties).sort();
  assert.deepEqual([...SUMMIT_REPLY_SCHEMA.required].sort(), keys);
  assert.match(gateway, /json_schema/);
  assert.match(gateway, /failed_generation/);
});

await check("bakeoff names two hosted candidates and no secrets", () => {
  assert.equal(bakeoff.candidates.length, 2);
  assert.equal(bakeoff.candidates[0].id, "A");
  assert.equal(bakeoff.candidates[1].id, "B");
  assert.match(bakeoff.upstream, /api\.groq\.com/);
  assert.equal(providerCfg.endpoint, "");
  assert.equal(providerCfg.timeoutMs, 5000);
  assert.doesNotMatch(gameJs, /sk-[a-zA-Z0-9]|GROQ_API_KEY|Bearer /);
  assert.doesNotMatch(JSON.stringify(bakeoff), /gsk_|sk-/);
});

await check("77-utterance set plus extras still route as labeled", () => {
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

await check("off-topic and evidence inventory stay deterministic", () => {
  const hoop = routeSummit({ question: "Who won the Super Bowl?", intent: "explain" });
  assert.equal(hoop.useAi, false);
  assert.equal(hoop.reason, "off-topic");
  const notes = routeSummit({ question: "what notes do i have", intent: "explain" });
  assert.equal(notes.useAi, false);
  assert.equal(notes.reason, "evidence-inventory");
  const messy = routeSummit({ question: "idk this runoff thing", intent: "explain" });
  assert.equal(messy.useAi, true);
  const follow = routeSummit({ question: "so gravity?", intent: "explain", recentTurns: [{ role: "student", text: "why" }] });
  assert.equal(follow.useAi, true);
  assert.equal(follow.reason, "follow-up");
});

await check("prompt stays on slope/gravity and does not dump the course", () => {
  const prompt = fs.readFileSync(path.join(root, "js/summit-ai.js"), "utf8");
  assert.match(prompt, /stay on slope, gravity, runoff speed/i);
  assert.match(prompt, /Do not wander into seepage/);
  assert.doesNotMatch(prompt, /CH-01 through CH-09/);
});

await check("timeout, rate-limit, and malformed still fall back", async () => {
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
        complete: () => new Promise((resolve) => setTimeout(() => resolve({ response: "late", supportLevel: 0 }), 400))
      }
    })
  });
  const a = await Promise.resolve(timed.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(a.provider, "deterministic");
  assert.equal(a.fallbackReason, "timeout");

  const limited = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: {
        id: "rl",
        kind: "remote",
        complete: () => {
          const err = new Error("rate-limit");
          err.code = "rate-limit";
          return Promise.reject(err);
        }
      }
    })
  });
  const b = await Promise.resolve(limited.ask(createSummitState(), baseInput(), { question: "why though" }));
  assert.equal(b.provider, "deterministic");
  assert.equal(b.fallbackReason, "rate-limit");
  assert.doesNotMatch(b.text, /rate-limit|HTTP|quota/i);

  const quota = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createFixtureAdapter(() => {
        const err = new Error("quota");
        err.code = "quota";
        throw err;
      })
    })
  });
  const c = await Promise.resolve(quota.ask(createSummitState(), baseInput(), { question: "I don't get it." }));
  assert.equal(c.provider, "deterministic");
  assert.ok(c.text);

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
  const d = await Promise.resolve(down.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(d.provider, "deterministic");

  const det = createSummitEngine({
    curriculum,
    concepts,
    provider: createDeterministicProvider({ curriculum, concepts })
  });
  const e = await Promise.resolve(det.ask(createSummitState(), baseInput(), { question: "Who won the Super Bowl?" }));
  assert.match(e.text, /Earth Science companion|Cedar Hollow/i);
});

await check("docs describe hosted bakeoff without promoting llama3.2:3b", () => {
  assert.match(arch, /Phase 7\.9F|hosted small-model bakeoff/i);
  assert.doesNotMatch(arch, /llama3\.2:3b is Summit's default/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9F architecture checks passed.");
