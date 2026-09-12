#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9G — GPT-OSS 20B constrained-conversation live eval.
 *
 *   SUMMIT_API_KEY=... \
 *   SUMMIT_AI_URL=https://api.groq.com/openai/v1/chat/completions \
 *   node terrainbound/tests/phase7_9g-live.mjs
 *
 * GPT-OSS only. 5s in-loop timeout. No 429 backoff wait. Does not print API keys.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
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
  createHttpAdapter,
  createAiProvider,
  routeSummit
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { modelScienceText } from "../js/summit-validate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tests/evidence/phase79g");
const bakeoff = JSON.parse(fs.readFileSync(path.join(root, "data/summit/bakeoff.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-constrained.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));

function applyLocalEnv() {
  const files = [path.join(root, "data/summit/.env"), path.join(root, "data/summit/provider.local.json")];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    if (file.endsWith(".json")) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const key = data.apiKey || data.SUMMIT_API_KEY || "";
      const url = data.url || data.SUMMIT_AI_URL || "";
      if (key && !process.env.SUMMIT_API_KEY) process.env.SUMMIT_API_KEY = String(key);
      if (url && !process.env.SUMMIT_AI_URL) process.env.SUMMIT_AI_URL = String(url);
      continue;
    }
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      const k = t.slice(0, eq).trim().replace(/^export\s+/, "");
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  }
}

applyLocalEnv();

const UPSTREAM = process.env.SUMMIT_AI_URL || bakeoff.upstream;
const KEY = process.env.SUMMIT_API_KEY || "";
const MODEL = process.env.SUMMIT_AI_MODEL || "openai/gpt-oss-20b";
const TIMEOUT = Number(process.env.SUMMIT_EVAL_TIMEOUT_MS || 5000);
const GAP_MS = Number(process.env.SUMMIT_EVAL_GAP_MS || 1800);
const INFRA = new Set(["rate-limit", "http", "timeout", "unavailable", "upstream"]);
const PRICE = bakeoff.candidates.find((row) => row.model === "openai/gpt-oss-20b") || bakeoff.candidates[0];

const GAMEPLAY_HALL =
  /click the |tap the |press the |button labeled|start trial|walk to |go to (the )?(high look|wren)|speak with wren|ask wren for|pin the |stone markers/i;
const CLEARANCE_HALL = /field clearance earned|you('re| are) cleared|gave you clearance|granted (you )?clearance|high country is (open|available)/i;
const HIGHLOOK_HALL =
  /you (already )?(saw|noted|found|inspected)[^.]*high look|at high look you (saw|found|noted)|review your notes from the high look/i;
const THIRD_HALL = /third (runoff )?trial (showed|was|took|recorded)|trial three (showed|was)/i;
const RAIN_HALL = /has been observed to|we've had some recent rainfall|water level .*has (dropped|fallen|rose|risen)/i;

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

function withTrials(n = 2) {
  const flume = createFlumeState();
  const all = [
    { slope: "steep", water: "one-cup", seconds: 10.2, fair: true },
    { slope: "steep", water: "one-cup", seconds: 10.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.6, fair: true }
  ];
  flume.trials = all.slice(0, n);
  return baseInput({ flumeState: flume });
}

function inputFor(row) {
  const n = row.trials == null ? 2 : row.trials;
  return withTrials(n);
}

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

function latencyStats(values) {
  const sorted = [...values].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0, mean: null, median: null, p95: null, min: null, max: null };
  return {
    n: sorted.length,
    mean: Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length),
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
}

function flags(text, allowedTimes = [10.2, 10.4]) {
  const t = String(text || "");
  const nums = t.match(/\b\d+\.\d+\b/g) || [];
  const allowed = new Set(allowedTimes.map((n) => Number(n).toFixed(1)));
  const inventedTime = nums.some((n) => !allowed.has(Number(n).toFixed(1)) && !/not |wasn't |was not |rather than /i.test(t));
  return {
    gameplay: GAMEPLAY_HALL.test(t),
    clearance: CLEARANCE_HALL.test(t),
    highLook: HIGHLOOK_HALL.test(t),
    thirdTrial: THIRD_HALL.test(t),
    rainfall: RAIN_HALL.test(t),
    inventedTime
  };
}

function anyHall(row) {
  return row.gameplay || row.clearance || row.highLook || row.thirdTrial || row.rainfall || row.inventedTime;
}

function startProxy(port) {
  return spawn(process.execPath, [path.join(root, "server/summit-proxy.mjs")], {
    env: {
      ...process.env,
      SUMMIT_API_KEY: KEY,
      SUMMIT_AI_URL: UPSTREAM,
      SUMMIT_AI_MODEL: MODEL,
      SUMMIT_PROXY_PORT: String(port),
      SUMMIT_DEBUG: process.env.SUMMIT_DEBUG || "1",
      SUMMIT_MAX_TOKENS: process.env.SUMMIT_MAX_TOKENS || "300",
      SUMMIT_UPSTREAM_TIMEOUT_MS: process.env.SUMMIT_UPSTREAM_TIMEOUT_MS || "4000",
      SUMMIT_MODE_BUDGET_MS: process.env.SUMMIT_MODE_BUDGET_MS || "4500"
    },
    stdio: "inherit"
  });
}

function engineFor(port) {
  const adapter = createHttpAdapter({
    endpoint: `http://127.0.0.1:${port}/summit-ai`,
    timeoutMs: TIMEOUT,
    retry429: 0
  });
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter,
      timeoutMs: TIMEOUT,
      ai: createAiProvider({ adapter, timeoutMs: TIMEOUT, cacheSize: 0 })
    })
  });
}

async function waitHealth(port, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const health = await fetch(`http://127.0.0.1:${port}/health`)
      .then((r) => r.json())
      .catch(() => null);
    if (health?.ok) return health;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error("proxy not healthy on " + port);
}

async function runEval(port) {
  const proxy = startProxy(port);
  try {
    await waitHealth(port);
    const engine = engineFor(port);
    const rows = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let retries = 0;
    let malformed = 0;
    const modelLatencies = [];
    const visibleLatencies = [];
    const successModelLatencies = [];
    const successLoopLatencies = [];

    for (const row of utterances) {
      const detected = detectIntent(row.q, row.action || "");
      const decision = routeSummit({
        question: row.q,
        action: row.action || "",
        intent: detected.intent,
        context: { summit: { hintAsks: 0, recent: [] } }
      });
      const t0 = Date.now();
      const reply = await Promise.resolve(engine.ask(createSummitState(), inputFor(row), { question: row.q, action: row.action || "" }));
      const visibleMs = Date.now() - t0;
      const usage = reply.rawModel?.usage || {};
      promptTokens += usage.promptTokens || 0;
      completionTokens += usage.completionTokens || 0;
      if (usage.retried) retries += 1;
      if (reply.fallbackReason === "malformed" || reply.fallbackReason === "empty") malformed += 1;
      const rawText = modelScienceText(reply.rawModel) || reply.rawModel?.response || "";
      const allowed = (row.trials == null ? 2 : row.trials) >= 2 ? [10.2, 10.4] : [];
      const before = flags(rawText, allowed);
      const after = flags(reply.text, allowed);
      if (decision.useAi) {
        visibleLatencies.push(visibleMs);
        if (Number.isFinite(usage.latencyMs)) modelLatencies.push(usage.latencyMs);
        if (!reply.fallbackReason) {
          successLoopLatencies.push(visibleMs);
          if (Number.isFinite(usage.latencyMs)) successModelLatencies.push(usage.latencyMs);
        }
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
      rows.push({
        id: row.id,
        bucket: row.bucket,
        q: row.q,
        useAi: decision.useAi,
        route: decision.reason,
        source: !decision.useAi ? "deterministic" : reply.fallbackReason ? "fallback" : "model",
        fallbackReason: reply.fallbackReason || "",
        provider: reply.provider,
        visibleMs,
        modelMs: usage.latencyMs || null,
        retried: Boolean(usage.retried),
        text: reply.text,
        raw: rawText || null,
        hallBefore: before,
        hallAfter: after,
        hasChId: /\bCH-\d+\b/.test(reply.text || ""),
        hasHttp: /HTTP 429|API failure|JSON parsing|provider unavailable/i.test(reply.text || "")
      });
      console.log(row.id, rows[rows.length - 1].source, visibleMs + "ms", (reply.text || "").slice(0, 88).replace(/\n/g, " "));
    }

    const threadState = createSummitState();
    const threadInput = withTrials(2);
    const thread = [];
    for (const q of ["why did it go faster", "but why does steep matter", "so gravity gets stronger?", "what should I test next"]) {
      const t0 = Date.now();
      const reply = await Promise.resolve(engine.ask(threadState, threadInput, { question: q }));
      const rawText = modelScienceText(reply.rawModel) || reply.rawModel?.response || "";
      thread.push({
        q,
        source: reply.fallbackReason ? "fallback" : reply.provider,
        route: reply.route?.reason || "",
        useAi: Boolean(reply.route?.useAi),
        fallbackReason: reply.fallbackReason || "",
        visibleMs: Date.now() - t0,
        modelMs: reply.rawModel?.usage?.latencyMs || null,
        text: reply.text,
        raw: rawText || null,
        hallAfter: flags(reply.text)
      });
      if (reply.route?.useAi || reply.provider === "ai" || reply.fallbackReason) {
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    }

    const n = rows.length;
    const det = rows.filter((r) => r.source === "deterministic").length;
    const modelOk = rows.filter((r) => r.source === "model").length;
    const fallback = rows.filter((r) => r.source === "fallback").length;
    const aiRouted = rows.filter((r) => r.useAi).length;
    const infra = rows.filter((r) => r.useAi && INFRA.has(r.fallbackReason)).length;
    const validatorRejected = rows.filter((r) => r.useAi && r.fallbackReason && !INFRA.has(r.fallbackReason)).length;
    const parsedOutputs = modelOk + validatorRejected;
    const studentFallback = rows.filter((r) => r.useAi && r.fallbackReason).length;
    const hallBefore = rows.filter((r) => r.raw && anyHall(r.hallBefore)).length;
    const hallAfter = rows.filter((r) => anyHall(r.hallAfter)).length;
    const inUsd = (promptTokens / 1e6) * PRICE.inputUsdPerMillion;
    const outUsd = (completionTokens / 1e6) * PRICE.outputUsdPerMillion;
    const usd = inUsd + outUsd;
    const aiFrac = aiRouted / Math.max(1, n);
    const costCalls = Math.max(1, modelOk);
    const perCall = modelOk ? usd / costCalls : 0;
    const sessionTurns = 12;
    const perSession = perCall * sessionTurns * aiFrac;

    const metrics = {
      model: MODEL,
      upstream: UPSTREAM,
      timeoutMs: TIMEOUT,
      utterances: n,
      hostedCallsRouted: aiRouted,
      routing: {
        deterministic: det,
        model: modelOk,
        fallback,
        infra,
        validatorRejected,
        studentVisibleFallback: studentFallback,
        deterministicPct: pct(det, n),
        modelPct: pct(modelOk, n),
        fallbackPct: pct(studentFallback, n),
        fallbackReasons: Object.fromEntries(
          Object.entries(
            rows
              .filter((r) => r.useAi && r.fallbackReason)
              .reduce((acc, r) => {
                acc[r.fallbackReason] = (acc[r.fallbackReason] || 0) + 1;
                return acc;
              }, {})
          )
        )
      },
      validatorRejectionPct: pct(validatorRejected, Math.max(1, parsedOutputs)),
      structuredOutputSuccessPct: pct(parsedOutputs, Math.max(1, aiRouted)),
      structuredRetry: retries,
      malformedOrEmpty: malformed,
      hallucinations: { beforeValidation: hallBefore, afterValidation: hallAfter },
      tokens: { prompt: promptTokens, completion: completionTokens },
      latencyAllHostedVisibleMs: latencyStats(visibleLatencies),
      latencySuccessfulHostedModelMs: latencyStats(successModelLatencies),
      latencySuccessfulHostedLoopMs: latencyStats(successLoopLatencies),
      latencyModelMs: latencyStats(modelLatencies),
      pricing: {
        inputUsdPerMillion: PRICE.inputUsdPerMillion,
        outputUsdPerMillion: PRICE.outputUsdPerMillion,
        source: PRICE.pricingSource,
        thisEvalUsd: Math.round(usd * 1e6) / 1e6,
        perAiResponseUsd: Math.round(perCall * 1e6) / 1e6,
        assumptions: { sessionTurns, aiFraction: Math.round(aiFrac * 1000) / 1000 },
        perStudentSessionUsd: Math.round(perSession * 1e6) / 1e6
      }
    };

    return { metrics, rows, thread };
  } finally {
    proxy.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function main() {
  if (!KEY) {
    console.error("SUMMIT_API_KEY is required for the 7.9G live eval.");
    process.exit(2);
  }
  if (/qwen/i.test(MODEL)) {
    console.error("7.9G is GPT-OSS only. Do not set a Qwen model.");
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const port = Number(process.env.SUMMIT_PROXY_PORT || 8793);
  const result = await runEval(port);
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(result.metrics, null, 2));
  fs.writeFileSync(path.join(outDir, "live.json"), JSON.stringify(result, null, 2));
  const review = [
    "# Summit 7.9G teacher review",
    "",
    `Model: ${MODEL}. Timeout ${TIMEOUT}ms. Constrained explanation-only contract.`,
    "",
    "## Follow-up thread",
    ""
  ];
  for (const turn of result.thread) {
    review.push(`- **${turn.q}** (${turn.source} / ${turn.route}): ${turn.text}`);
  }
  review.push("", "## Hosted rows with raw output", "");
  for (const row of result.rows.filter((r) => r.useAi)) {
    review.push(`- **${row.id} ${row.q}** source=${row.source} fallback=${row.fallbackReason || "none"}`);
    review.push(`  - raw: ${row.raw || "(none)"}`);
    review.push(`  - visible: ${row.text}`);
  }
  fs.writeFileSync(path.join(outDir, "TEACHER-REVIEW.md"), review.join("\n"));
  console.log(JSON.stringify(result.metrics, null, 2));
  console.log("wrote", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
