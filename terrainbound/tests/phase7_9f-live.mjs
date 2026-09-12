#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9F — hosted two-model bakeoff.
 *
 *   SUMMIT_API_KEY=... \
 *   SUMMIT_AI_URL=https://api.groq.com/openai/v1/chat/completions \
 *   node terrainbound/tests/phase7_9f-live.mjs
 *
 * Optional: SUMMIT_MODEL_A=openai/gpt-oss-20b SUMMIT_MODEL_B=qwen/qwen3.6-27b
 * Does not print API keys. Does not promote llama3.2:3b.
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
  selectSummitPacket,
  routeSummit
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tests/evidence/phase79f");
const bakeoff = JSON.parse(fs.readFileSync(path.join(root, "data/summit/bakeoff.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));
const extra = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-bakeoff-extra.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));

function applyLocalEnv() {
  const files = [
    path.join(root, "data/summit/.env"),
    path.join(root, "data/summit/provider.local.json")
  ];
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && v && !process.env[k]) process.env[k] = v;
    }
  }
}

applyLocalEnv();

const UPSTREAM = process.env.SUMMIT_AI_URL || bakeoff.upstream;
const KEY = process.env.SUMMIT_API_KEY || "";
const TIMEOUT = Number(process.env.SUMMIT_BAKEOFF_TIMEOUT_MS || 15000);
const GAP_MS = Number(process.env.SUMMIT_BAKEOFF_GAP_MS || 3000);
const RETRY_429 = Number(process.env.SUMMIT_BAKEOFF_429_TRIES || 8);
const WAIT_429 = Number(process.env.SUMMIT_BAKEOFF_429_MS || 20000);
const INFRA = new Set(["rate-limit", "http", "timeout", "unavailable", "upstream"]);

const CANDIDATES = bakeoff.candidates.map((row, i) => ({
  ...row,
  model: process.env[i === 0 ? "SUMMIT_MODEL_A" : "SUMMIT_MODEL_B"] || row.model
}));

const BLIND_IDS = [
  "D1", "D2", "D4", "F1", "F4", "G2", "H2", "H7", "I5", "I6", "J1", "K4", "K6", "L1", "L5", "L10",
  "N2", "O1", "O2", "C2", "G5", "G7", "M1", "H3", "X5"
];

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

function withTrials(input, n = 4) {
  const flume = createFlumeState();
  const all = [
    { slope: "steep", water: "one-cup", seconds: 10.2, fair: true },
    { slope: "steep", water: "one-cup", seconds: 10.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.6, fair: true }
  ];
  flume.trials = all.slice(0, n);
  return { ...input, flumeState: flume };
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

function startProxy(model, port) {
  const child = spawn(process.execPath, [path.join(root, "server/summit-proxy.mjs")], {
    env: {
      ...process.env,
      SUMMIT_API_KEY: KEY,
      SUMMIT_AI_URL: UPSTREAM,
      SUMMIT_AI_MODEL: model,
      SUMMIT_PROXY_PORT: String(port),
      SUMMIT_DEBUG: process.env.SUMMIT_DEBUG || "0",
      SUMMIT_MAX_TOKENS: process.env.SUMMIT_MAX_TOKENS || "512"
    },
    stdio: "inherit"
  });
  return child;
}

function engineFor(port) {
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createHttpAdapter({
        endpoint: `http://127.0.0.1:${port}/summit-ai`,
        timeoutMs: TIMEOUT,
        retry429: RETRY_429,
        retry429WaitMs: WAIT_429
      }),
      timeoutMs: TIMEOUT
    })
  });
}

async function waitHealth(port, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.json()).catch(() => null);
    if (health?.ok) return health;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error("proxy not healthy on " + port);
}

async function runCandidate(cand, port) {
  const proxy = startProxy(cand.model, port);
  try {
    await waitHealth(port);
    const engine = engineFor(port);
    const allQs = [...utterances, ...extra];
    const rows = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let retries = 0;
    let malformed = 0;
    const modelLatencies = [];
    const visibleLatencies = [];

    for (const row of allQs) {
      const detected = detectIntent(row.q, row.action || "");
      const decision = routeSummit({
        question: row.q,
        action: row.action || "",
        intent: detected.intent,
        context: { summit: { hintAsks: 0, recent: [] } }
      });
      const sparse = /third (runoff )?trial/i.test(row.q);
      const input = sparse ? baseInput() : withTrials(baseInput(), 2);
      const t0 = Date.now();
      const reply = await Promise.resolve(engine.ask(createSummitState(), input, { question: row.q, action: row.action || "" }));
      const visibleMs = Date.now() - t0;
      const usage = reply.rawModel?.usage || {};
      promptTokens += usage.promptTokens || 0;
      completionTokens += usage.completionTokens || 0;
      if (usage.retried) retries += 1;
      if (reply.fallbackReason === "malformed" || reply.fallbackReason === "empty") malformed += 1;
      if (decision.useAi) {
        visibleLatencies.push(visibleMs);
        if (Number.isFinite(usage.latencyMs)) modelLatencies.push(usage.latencyMs);
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
        raw: reply.rawModel?.response || null,
        hasChId: /\bCH-\d+\b/.test(reply.text || ""),
        hasHttp: /HTTP 429|API failure|JSON parsing|provider unavailable/i.test(reply.text || "")
      });
      console.log(cand.id, row.id, rows[rows.length - 1].source, visibleMs + "ms", (reply.text || "").slice(0, 72).replace(/\n/g, " "));
    }

    const threadState = createSummitState();
    const threadInput = withTrials(baseInput(), 2);
    const thread = [];
    for (const q of ["why did it go faster", "the steep one?", "why though", "explain it easier", "so gravity?"]) {
      const t0 = Date.now();
      const reply = await Promise.resolve(engine.ask(threadState, threadInput, { question: q }));
      thread.push({
        q,
        source: reply.fallbackReason ? "fallback" : reply.provider,
        fallbackReason: reply.fallbackReason || "",
        visibleMs: Date.now() - t0,
        modelMs: reply.rawModel?.usage?.latencyMs || null,
        text: reply.text,
        raw: reply.rawModel?.response || null
      });
      if (reply.route?.useAi || reply.provider === "ai" || reply.fallbackReason) {
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
    }

    const bait = [];
    for (const item of [
      { q: "What did my third trial show?", sparse: true },
      { q: "Didn't I find something at High Look?" },
      { q: "Wren already cleared me, right?" },
      { q: "My steep time was 6.2 seconds, right?" },
      { q: "Didn't the marsh cause the storm?" }
    ]) {
      const reply = await Promise.resolve(
        engine.ask(createSummitState(), item.sparse ? baseInput() : withTrials(baseInput(), 2), { question: item.q })
      );
      bait.push({
        q: item.q,
        raw: reply.rawModel?.response || null,
        validation: reply.fallbackReason || "ok",
        visible: reply.text,
        source: reply.fallbackReason ? "fallback" : "model"
      });
      await new Promise((r) => setTimeout(r, GAP_MS));
    }

    const n = rows.length;
    const det = rows.filter((r) => r.source === "deterministic").length;
    const modelOk = rows.filter((r) => r.source === "model").length;
    const fallback = rows.filter((r) => r.source === "fallback").length;
    const aiRouted = rows.filter((r) => r.useAi).length;
    const infra = rows.filter((r) => r.useAi && INFRA.has(r.fallbackReason)).length;
    const validatorRejected = rows.filter((r) => r.useAi && r.fallbackReason && !INFRA.has(r.fallbackReason)).length;
    const parsedOutputs = modelOk + validatorRejected;
    const hostedWithUsage = rows.filter((r) => r.useAi && (r.modelMs || r.source === "model" || r.raw)).length;
    const inUsd = (promptTokens / 1e6) * cand.inputUsdPerMillion;
    const outUsd = (completionTokens / 1e6) * cand.outputUsdPerMillion;
    const usd = inUsd + outUsd;
    const aiFrac = aiRouted / Math.max(1, n);
    const costCalls = Math.max(1, hostedWithUsage || modelOk);
    const perCall = (hostedWithUsage || modelOk) ? usd / costCalls : 0;
    const sessionTurns = 12;
    const perSession = perCall * sessionTurns * aiFrac;

    const metrics = {
      id: cand.id,
      model: cand.model,
      role: cand.role,
      upstream: UPSTREAM,
      utterances: n,
      hostedCallsRouted: aiRouted,
      routing: {
        deterministic: det,
        model: modelOk,
        fallback,
        infra,
        validatorRejected,
        deterministicPct: pct(det, n),
        modelPct: pct(modelOk, n),
        fallbackPct: pct(fallback, n),
        infraPct: pct(infra, Math.max(1, aiRouted)),
        fallbackReasons: Object.fromEntries(
          Object.entries(
            rows.filter((r) => r.useAi && r.fallbackReason).reduce((acc, r) => {
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
      structuredUsablePct: pct(aiRouted - malformed - infra, Math.max(1, aiRouted)),
      tokens: { prompt: promptTokens, completion: completionTokens },
      latencyVisibleMs: latencyStats(visibleLatencies),
      latencyModelMs: latencyStats(modelLatencies),
      pricing: {
        inputUsdPerMillion: cand.inputUsdPerMillion,
        outputUsdPerMillion: cand.outputUsdPerMillion,
        source: cand.pricingSource,
        thisEvalUsd: Math.round(usd * 1e6) / 1e6,
        perAiResponseUsd: Math.round(perCall * 1e6) / 1e6,
        assumptions: { sessionTurns, aiFraction: Math.round(aiFrac * 1000) / 1000 },
        perStudentSessionUsd: Math.round(perSession * 1e6) / 1e6,
        class25Usd: Math.round(perSession * 25 * 1000) / 1000,
        class100Usd: Math.round(perSession * 100 * 1000) / 1000,
        class1000Usd: Math.round(perSession * 1000 * 1000) / 1000,
        class10000Usd: Math.round(perSession * 10000 * 1000) / 1000
      }
    };

    return { metrics, rows, thread, bait };
  } finally {
    proxy.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function main() {
  if (!KEY) {
    console.error("SUMMIT_API_KEY is required for the hosted bakeoff.");
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const results = {};
  let port = Number(process.env.SUMMIT_PROXY_PORT || 8791);
  for (const cand of CANDIDATES) {
    console.log("\n=== Model", cand.id, cand.model, "===\n");
    results[cand.id] = await runCandidate(cand, port);
    port += 1;
  }

  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify({
    upstream: UPSTREAM,
    candidates: CANDIDATES.map((c) => ({ id: c.id, model: c.model, role: c.role })),
    A: results.A.metrics,
    B: results.B.metrics
  }, null, 2));
  fs.writeFileSync(path.join(outDir, "live-A.json"), JSON.stringify(results.A, null, 2));
  fs.writeFileSync(path.join(outDir, "live-B.json"), JSON.stringify(results.B, null, 2));

  const key = [];
  const blind = [
    "# Summit 7.9F blind comparison",
    "",
    "Responses are unlabeled. Prefer the better Cedar Hollow tutor: grounded, grade 9–10, concise, on slope/gravity/runoff when relevant.",
    "",
    "Mark each item: Left / Right / Tie / Both fail",
    ""
  ];
  const allQs = [...utterances, ...extra];
  for (const id of BLIND_IDS) {
    const row = allQs.find((u) => u.id === id);
    const a = results.A.rows.find((r) => r.id === id);
    const b = results.B.rows.find((r) => r.id === id);
    const swap = id.charCodeAt(1) % 2 === 0;
    const left = swap ? b : a;
    const right = swap ? a : b;
    key.push({ id, left: swap ? "B" : "A", right: swap ? "A" : "B" });
    blind.push(`## ${id}`);
    blind.push("");
    blind.push(`Student: ${row?.q || id}`);
    blind.push("State: Cedar Hollow; two fair times 10.2s steep / 18.4s gentle unless the prompt is a missing third trial; High Look not visited; no clearance.");
    blind.push("");
    blind.push("**Left**");
    blind.push("");
    blind.push(left?.text || "(none)");
    blind.push("");
    blind.push("**Right**");
    blind.push("");
    blind.push(right?.text || "(none)");
    blind.push("");
  }
  fs.writeFileSync(path.join(outDir, "BLIND-COMPARISON.md"), blind.join("\n"));
  fs.writeFileSync(path.join(outDir, "blind-key.json"), JSON.stringify(key, null, 2));

  const review = ["# Summit 7.9F teacher review", "", "Raw vs visible for regressions. Fill quality grades after reading live JSON.", ""];
  for (const id of ["A", "B"]) {
    review.push(`## Model ${id} (${results[id].metrics.model})`, "");
    for (const row of results[id].bait) {
      review.push(`- **${row.q}** validation=${row.validation}`);
      review.push(`  - raw: ${row.raw || "(none)"}`);
      review.push(`  - visible: ${row.visible}`);
    }
    review.push("", "### Follow-up thread", "");
    for (const turn of results[id].thread) review.push(`- **${turn.q}** (${turn.source}): ${turn.text}`);
    review.push("");
  }
  fs.writeFileSync(path.join(outDir, "TEACHER-REVIEW.md"), review.join("\n"));

  console.log(JSON.stringify({ A: results.A.metrics, B: results.B.metrics }, null, 2));
  console.log("wrote", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
