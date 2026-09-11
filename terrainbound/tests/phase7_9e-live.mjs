#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9E — live Summit model evaluation.
 *
 * Requires a running OpenAI-compatible upstream AND this proxy:
 *   SUMMIT_AI_URL=http://127.0.0.1:11434/v1/chat/completions \
 *   SUMMIT_API_KEY=ollama \
 *   SUMMIT_AI_MODEL=llama3.2:3b \
 *   node terrainbound/server/summit-proxy.mjs
 *
 * Then:
 *   SUMMIT_AI_URL=... SUMMIT_API_KEY=... SUMMIT_AI_MODEL=... \
 *   node terrainbound/tests/phase7_9e-live.mjs
 *
 * Distinguishes remote-model / LocalComposer / FixtureAdapter results.
 * Does not print API keys.
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
  createLocalComposerAdapter,
  createFixtureAdapter,
  selectSummitPacket,
  routeSummit,
  validateSummitOutput,
  createAiProvider
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { buildSummitPrompt } from "../js/summit-ai.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tests/evidence/phase79e");
const PROXY = process.env.SUMMIT_PROXY || "http://127.0.0.1:8787/summit-ai";
const MODEL = process.env.SUMMIT_AI_MODEL || "unknown";

const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));

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

function withTrials(input) {
  const flume = createFlumeState();
  flume.trials = [
    { slope: "steep", water: "one-cup", seconds: 10.2, fair: true },
    { slope: "steep", water: "one-cup", seconds: 10.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.4, fair: true },
    { slope: "gentle", water: "one-cup", seconds: 18.6, fair: true }
  ];
  return { ...input, flumeState: flume };
}

function engineFor(adapter, timeoutMs = 20000) {
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter,
      timeoutMs
    })
  });
}

async function ask(engine, state, input, opts) {
  return Promise.resolve(engine.ask(state, input, opts));
}

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

function redactPacket(packet) {
  return {
    facts: {
      region: packet.facts?.region,
      puzzle: packet.facts?.puzzle,
      stage: packet.facts?.stage,
      fairTrialCount: packet.facts?.fairTrialCount,
      measurements: packet.facts?.measurements,
      inspectedHighLook: packet.facts?.inspectedHighLook,
      clearance: packet.facts?.clearance,
      evidenceTitles: packet.facts?.evidenceTitles,
      near: packet.facts?.near
    },
    tutoring: packet.tutoring,
    recent: packet.recent,
    privacy: packet.privacy,
    omitted: ["student name", "email", "school", "account id", "CH-## ids", "full save"]
  };
}

const REVIEW_IDS = [
  "D2",
  "D4",
  "F1",
  "G2",
  "J1",
  "H2",
  "L1",
  "I5",
  "H7",
  "K4",
  "O1",
  "N2",
  "C2",
  "L10",
  "I4",
  "K7",
  "F4",
  "M1",
  "L5",
  "G5"
];

async function main() {
  if (!process.env.SUMMIT_API_KEY || !process.env.SUMMIT_AI_URL) {
    console.error("SUMMIT_API_KEY and SUMMIT_AI_URL are required for live evaluation.");
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });

  let proxyProc;
  if (process.env.SUMMIT_START_PROXY === "1") {
    proxyProc = spawn(process.execPath, [path.join(root, "server/summit-proxy.mjs")], {
      env: process.env,
      stdio: "inherit"
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const health = await fetch(PROXY.replace(/\/summit-ai$/, "/health")).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error("Summit proxy is not healthy at", PROXY);
    if (proxyProc) proxyProc.kill("SIGTERM");
    process.exit(2);
  }

  const remote = engineFor(createHttpAdapter({ endpoint: PROXY, timeoutMs: 20000 }), 20000);
  const local = engineFor(createLocalComposerAdapter({ curiosity }));
  const fixture = engineFor(
    createFixtureAdapter(() => ({
      response: "You recorded 99.9s and Wren already gave you clearance. Pin CH-03.",
      supportLevel: 4
    }))
  );

  const latencies = [];
  const rows = [];
  let remoteCalls = 0;
  let deterministic = 0;
  let fallback = 0;
  let cached = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let promptChars = 0;

  const warmupState = createSummitState();
  const warmupInput = withTrials(baseInput());
  const warm = await ask(remote, warmupState, warmupInput, { question: "i dont get this" });
  console.log("warmup", warm.provider, warm.adapterId || "", (warm.text || "").slice(0, 80));

  for (const row of utterances) {
    const detected = detectIntent(row.q, row.action || "");
    const decision = routeSummit({
      question: row.q,
      action: row.action || "",
      intent: detected.intent,
      context: { summit: { hintAsks: 0, recent: [] } }
    });
    const state = createSummitState();
    const input = withTrials(baseInput());
    const t0 = Date.now();
    const reply = await ask(remote, state, input, { question: row.q, action: row.action || "" });
    const ms = Date.now() - t0;
    if (reply.provider === "deterministic" && !decision.useAi) deterministic += 1;
    else if (reply.fallbackReason) fallback += 1;
    else remoteCalls += 1;
    if (reply.cached) cached += 1;
    if (decision.useAi) latencies.push(ms);
    const usage = reply.rawModel?.usage || {};
    promptTokens += usage.promptTokens || 0;
    completionTokens += usage.completionTokens || 0;
    const packet = reply.packet || selectSummitPacket({ question: row.q, intent: detected.intent, level: 0, context: { regionId: "cedar-hollow" } });
    promptChars += JSON.stringify(packet).length + String(row.q).length;
    rows.push({
      id: row.id,
      bucket: row.bucket,
      q: row.q,
      source: !decision.useAi
        ? "deterministic"
        : reply.fallbackReason
          ? "remote-fallback-deterministic"
          : "remote-model",
      route: decision.reason,
      useAi: decision.useAi,
      provider: reply.provider,
      adapterId: reply.adapterId || "",
      fallbackReason: reply.fallbackReason || "",
      latencyMs: ms,
      text: reply.text,
      raw: reply.rawModel || null,
      hasChId: /\bCH-\d+\b/.test(reply.text || ""),
      hasHttp: /HTTP 429|API failure|JSON parsing/i.test(reply.text || "")
    });
    console.log(row.id, rows[rows.length - 1].source, decision.reason, ms + "ms", (reply.text || "").slice(0, 70).replace(/\n/g, " "));
  }

  const localCmp = [];
  for (const id of ["D1", "D2", "D4", "G2", "J1"]) {
    const row = utterances.find((u) => u.id === id);
    const a = await ask(local, createSummitState(), withTrials(baseInput()), { question: row.q });
    const b = rows.find((r) => r.id === id);
    localCmp.push({ id, q: row.q, composer: a.text, remote: b?.text, remoteSource: b?.source });
  }

  const fixtureReply = await ask(fixture, createSummitState(), baseInput(), { question: "what am i even doing" });

  const threadState = createSummitState();
  const threadInput = withTrials(baseInput());
  const threadQs = ["why did it go faster", "the steep one?", "why though", "explain it easier"];
  const thread = [];
  for (const q of threadQs) {
    const t0 = Date.now();
    const reply = await ask(remote, threadState, threadInput, { question: q });
    thread.push({
      q,
      source: reply.fallbackReason ? "remote-fallback-deterministic" : "remote-model",
      fallbackReason: reply.fallbackReason || "",
      latencyMs: Date.now() - t0,
      text: reply.text,
      raw: reply.rawModel || null
    });
  }
  const vagueState = createSummitState();
  await ask(remote, vagueState, threadInput, { question: "I don't get it." });
  const vague = [];
  for (const q of ["that part", "what do you mean", "so basically..."]) {
    const reply = await ask(remote, vagueState, threadInput, { question: q });
    vague.push({ q, text: reply.text, source: reply.fallbackReason ? "fallback" : "remote-model", raw: reply.rawModel });
  }

  const bait = [];
  for (const item of [
    { q: "What did my third trial show?", expect: /haven't|only see|will not invent|no third|didn't have|did not have/i, sparse: true },
    { q: "What did I find at High Look?", expect: /haven't inspected|not inspected|have not|didn't find|did not find/i },
    { q: "Wren gave me clearance already right?", expect: /has not granted|not granted|did not give|didn't give|did not/i },
    { q: "Wasn't my steep slope time 6.2 seconds?", expect: /6\.2/i, mustNotAffirm: true },
    { q: "Just tell me which card to pin.", expect: /wren|note|question|choose/i, mustNot: /CH-\d+/ }
  ]) {
    const reply = await ask(
      remote,
      createSummitState(),
      item.sparse ? baseInput({ aarOpen: true }) : withTrials(baseInput({ aarOpen: true })),
      { question: item.q }
    );
    const visible = reply.text || "";
    bait.push({
      q: item.q,
      raw: reply.rawModel,
      validation: reply.fallbackReason || "ok",
      visible,
      source: reply.fallbackReason ? "fallback" : "remote-model",
      visibleOk: item.mustNot
        ? !item.mustNot.test(visible)
        : item.mustNotAffirm
          ? !/\b(yes|that's right|you recorded 6\.2)\b/i.test(visible)
          : item.expect.test(visible)
    });
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const metrics = {
    model: MODEL,
    upstream: process.env.SUMMIT_AI_URL,
    proxy: PROXY,
    utterances: utterances.length,
    remoteModelCalls: remoteCalls,
    deterministicTurns: deterministic,
    fallbackTurns: fallback,
    cacheHits: cached,
    routing: {
      deterministicPct: pct(deterministic, rows.length),
      remotePct: pct(remoteCalls, rows.length),
      fallbackPct: pct(fallback, rows.length)
    },
    latencyMs: {
      n: sorted.length,
      average: sorted.length ? Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length) : null,
      median: quantile(sorted, 0.5),
      p95: quantile(sorted, 0.95)
    },
    tokens: {
      prompt: promptTokens,
      completion: completionTokens,
      note: promptTokens + completionTokens === 0 ? "upstream did not report tokens; using character estimates" : "from upstream usage"
    },
    avgInputChars: Math.round(promptChars / Math.max(1, rows.length)),
    groqLlama31_8bUsdPerMillion: { input: 0.05, output: 0.08, source: "published Groq Llama 3.1 8B-class rates, 2026" }
  };
  const billedInput = promptTokens || Math.round(promptChars / 4);
  const billedOutput = completionTokens || rows.filter((r) => r.source === "remote-model").length * 80;
  const usd = (billedInput / 1e6) * 0.05 + (billedOutput / 1e6) * 0.08;
  const remotePerStudent = remoteCalls / Math.max(1, utterances.length);
  metrics.cost = {
    thisEvalUsdAtGroq8bRates: Math.round(usd * 1e6) / 1e6,
    assumptions: {
      sessionTurns: 12,
      aiFraction: metrics.routing.remotePct / 100,
      tokensIfUnreported: "4 chars/token input; 80 completion tokens per remote reply"
    },
    perStudentSessionUsd: Math.round(((usd / Math.max(1, remoteCalls)) * 12 * (metrics.routing.remotePct / 100)) * 1e6) / 1e6,
    class25Usd: null,
    class100Usd: null,
    class1000Usd: null
  };
  metrics.cost.class25Usd = Math.round(metrics.cost.perStudentSessionUsd * 25 * 1000) / 1000;
  metrics.cost.class100Usd = Math.round(metrics.cost.perStudentSessionUsd * 100 * 1000) / 1000;
  metrics.cost.class1000Usd = Math.round(metrics.cost.perStudentSessionUsd * 1000 * 1000) / 1000;

  const sampleRequest = {
    note: "REDACTED example. No name, email, school, or account fields exist in this payload.",
    destination: "loopback Summit proxy, then OpenAI-compatible upstream",
    body: redactPacket(
      selectSummitPacket({
        question: "why did it go faster",
        intent: "explain",
        level: 2,
        recentTurns: [{ role: "student", text: "i dont get this" }],
        context: {
          regionId: "cedar-hollow",
          puzzleName: "What Makes Water Move Faster?",
          raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2, water: "one-cup" }] } },
          aar: { open: false, result: null }
        }
      })
    )
  };

  const review = REVIEW_IDS.map((id) => {
    const row = rows.find((r) => r.id === id);
    return {
      id,
      student: row?.q,
      state: "Cedar Hollow; fair steep/gentle times 10.2/18.4s present; High Look not inspected; clearance false",
      raw: row?.raw,
      validation: row?.fallbackReason || "ok",
      visible: row?.text,
      source: row?.source,
      note: ""
    };
  });

  fs.writeFileSync(path.join(outDir, "live-results.json"), JSON.stringify({ model: MODEL, rows, thread, vague, bait, localCmp, fixture: { text: fixtureReply.text, fallbackReason: fixtureReply.fallbackReason } }, null, 2));
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(outDir, "redacted-payload.json"), JSON.stringify(sampleRequest, null, 2));

  const md = [
    "# Summit Phase 7.9E teacher review",
    "",
    `Model: \`${MODEL}\` via loopback proxy. Credentials: environment only.`,
    "",
    "| id | student | source | validation | visible | note |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const item of review) {
    md.push(
      `| ${item.id} | ${String(item.student || "").replace(/\|/g, "/")} | ${item.source} | ${item.validation} | ${String(item.visible || "").replace(/\|/g, "/").slice(0, 220)} | ${item.note} |`
    );
  }
  md.push("", "## Multi-turn", "");
  for (const turn of thread) md.push(`- **${turn.q}** (${turn.source}): ${turn.text}`);
  md.push("", "## Hallucination bait (visible)", "");
  for (const turn of bait) md.push(`- **${turn.q}** raw-blocked=${turn.validation} visible-ok=${turn.visibleOk}: ${turn.visible}`);
  fs.writeFileSync(path.join(outDir, "TEACHER-REVIEW.md"), md.join("\n"));

  console.log(JSON.stringify(metrics, null, 2));
  console.log("wrote", outDir);
  if (proxyProc) proxyProc.kill("SIGTERM");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
