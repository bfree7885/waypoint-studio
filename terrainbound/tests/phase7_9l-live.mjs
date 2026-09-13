#!/usr/bin/env node
/**
 * Live production-gateway path against Groq GPT-OSS 20B.
 * Does not print SUMMIT_API_KEY. Does not use the 7.9K field-test ports.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleSummitRequest, FIELDTEST_MODEL, createRateLimiter } from "../server/summit-gateway.mjs";
import { loadSummitEnv } from "../scripts/fieldtest-summit.mjs";
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
  GAME_HELP_LINE
} from "../js/summit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fileEnv = loadSummitEnv();
const env = {
  SUMMIT_API_KEY: process.env.SUMMIT_API_KEY || fileEnv.SUMMIT_API_KEY || "",
  SUMMIT_AI_URL:
    process.env.SUMMIT_AI_URL || fileEnv.SUMMIT_AI_URL || "https://api.groq.com/openai/v1/chat/completions",
  SUMMIT_AI_MODEL: process.env.SUMMIT_AI_MODEL || FIELDTEST_MODEL,
  SUMMIT_MAX_TOKENS: process.env.SUMMIT_MAX_TOKENS || "120",
  SUMMIT_UPSTREAM_TIMEOUT_MS: process.env.SUMMIT_UPSTREAM_TIMEOUT_MS || "4000"
};

if (!env.SUMMIT_API_KEY) {
  console.error("Summit live production check cannot start: Groq API key was not found.");
  process.exit(1);
}

const started = Date.now();
const res = await handleSummitRequest(
  new Request("https://summit.terrainbound.org/summit", {
    method: "POST",
    headers: {
      origin: "https://terrainbound.org",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt:
        "You are Summit, a Sasquatch Earth Science companion. Write 1-2 short sentences. Do not give game instructions. JSON only.",
      question: "Does a steeper slope tend to make runoff faster?",
      packet: { facts: { puzzle: "field work", known: [], expected: [], unknown: [] } }
    })
  }),
  env
);
const body = await res.json();
const latencyMs = Date.now() - started;
assert.equal(res.status, 200, JSON.stringify({ status: res.status, error: body.error }));
assert.ok(String(body.explanation || "").length > 8);
assert.doesNotMatch(body.explanation, /click the|tap the|HTTP|Groq/i);

console.log(
  JSON.stringify({
    ok: true,
    probe: "gateway",
    model: env.SUMMIT_AI_MODEL,
    status: res.status,
    latencyMs: body.usage?.latencyMs ?? latencyMs,
    explanationChars: String(body.explanation || "").length,
    promptTokens: body.usage?.promptTokens || 0,
    completionTokens: body.usage?.completionTokens || 0
  })
);

const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const limiter = createRateLimiter();

function liveAdapter() {
  return {
    id: "gateway",
    kind: "remote",
    async complete({ packet, prompt, question }) {
      const upstream = await handleSummitRequest(
        new Request("https://summit.terrainbound.org/summit", {
          method: "POST",
          headers: {
            origin: "https://terrainbound.org",
            "content-type": "application/json",
            "cf-connecting-ip": "203.0.113.80"
          },
          body: JSON.stringify({ prompt, question, packet })
        }),
        env,
        { limiter }
      );
      const parsed = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const err = new Error(parsed.error === "timeout" ? "timeout" : parsed.error === "rate-limit" ? "rate-limit" : "http");
        err.code = err.message;
        throw err;
      }
      return parsed;
    }
  };
}

function baseInput() {
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
    aarIndex: 0
  };
}

const talk = createSummitEngine({
  curriculum,
  concepts,
  provider: createHybridProvider({
    curriculum,
    concepts,
    curiosity,
    adapter: liveAdapter(),
    timeoutMs: 5000
  })
});
const product = [];
for (const [id, question] of [
  ["play", "how do i play"],
  ["character", "are you bigfoot"],
  ["science", "why did the water move faster"],
  ["gravity", "gravity is stronger on the steep slope"],
  ["next", "what should i do next"],
  ["notes", "what notes do i have"],
  ["wren", "did wren clear me"],
  ["trial", "what was my third trial"]
]) {
  const startedAsk = Date.now();
  const reply = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question }));
  const row = {
    id,
    provider: reply.provider,
    route: reply.route?.reason || "",
    useAi: Boolean(reply.route?.useAi),
    fallback: Boolean(reply.fallbackReason),
    latencyMs: Date.now() - startedAsk,
    chars: String(reply.text || "").length
  };
  assert.doesNotMatch(reply.text, /HTTP 429|500|Groq|JSON parse|stack trace|provider unavailable/i);
  if (id === "play") assert.equal(reply.text, GAME_HELP_LINE);
  if (id === "character") assert.match(reply.text, /Sasquatch/i);
  if (id === "next") assert.equal(reply.route.reason, "next-action");
  if (id === "notes") assert.equal(reply.route.reason, "evidence-inventory");
  if (id === "wren") assert.equal(reply.route.reason, "state-honesty");
  if (id === "trial") assert.equal(reply.route.useAi, false);
  if (id === "science") {
    assert.equal(reply.route.reason, "science-talk");
    assert.ok(row.chars > 12);
  }
  product.push(row);
}

console.log(JSON.stringify({ ok: true, probe: "product-path", product }));
