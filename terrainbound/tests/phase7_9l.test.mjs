#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9L — production Summit (offline architecture + local gateway).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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
  createHttpAdapter,
  createFixtureAdapter,
  GAME_HELP_LINE
} from "../js/summit.js";
import { resolveSummitRuntime, toGatewayBody, PRODUCTION_ENDPOINT } from "../js/summit-runtime.js";
import {
  handleSummitRequest,
  createRateLimiter,
  allowOrigin,
  sanitizeInbound,
  PRODUCTION_ORIGINS,
  MAX_BODY_BYTES,
  FIELDTEST_MODEL
} from "../server/summit-gateway.mjs";
import { isForbiddenRel, publishStatic } from "../scripts/publish-static.mjs";

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

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const providerCfg = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const wrangler = fs.readFileSync(path.join(root, "server/wrangler.toml"), "utf8");
const gatewaySrc = fs.readFileSync(path.join(root, "server/summit-gateway.mjs"), "utf8");
const prodDoc = fs.readFileSync(path.join(root, "docs/SUMMIT-PRODUCTION.md"), "utf8");
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));

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

function engine(adapter) {
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({ curriculum, concepts, curiosity, adapter, timeoutMs: 2500 })
  });
}

function makeRequest(pathName, { method = "GET", origin, body, ip } = {}) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (ip) headers.set("cf-connecting-ip", ip);
  const init = { method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request("https://summit.terrainbound.org" + pathName, init);
}

const env = {
  SUMMIT_API_KEY: "test-key-not-real",
  SUMMIT_AI_URL: "https://api.groq.com/openai/v1/chat/completions",
  SUMMIT_AI_MODEL: FIELDTEST_MODEL
};

await check("production origins and client endpoint are explicit", () => {
  assert.deepEqual([...PRODUCTION_ORIGINS], ["https://terrainbound.org", "https://www.terrainbound.org"]);
  assert.equal(PRODUCTION_ENDPOINT, "https://summit.terrainbound.org/summit");
  assert.equal(providerCfg.productionEndpoint, PRODUCTION_ENDPOINT);
  assert.equal(providerCfg.endpoint, "");
  assert.match(providerCfg.proxyEndpoint, /127\.0\.0\.1:8787/);
  assert.doesNotMatch(JSON.stringify(providerCfg), /gsk_|sk-/);
  assert.match(wrangler, /openai\/gpt-oss-20b/);
  assert.doesNotMatch(wrangler, /gsk_|SUMMIT_API_KEY\s*=/);
});

await check("runtime modes: production host needs no query flag", () => {
  const prod = resolveSummitRuntime({
    hostname: "terrainbound.org",
    search: "",
    cfg: providerCfg
  });
  assert.equal(prod.mode, "production");
  assert.equal(prod.endpoint, PRODUCTION_ENDPOINT);
  assert.equal(prod.fieldTest, false);
  const www = resolveSummitRuntime({ hostname: "www.terrainbound.org", search: "", cfg: providerCfg });
  assert.equal(www.mode, "production");
  const local = resolveSummitRuntime({ hostname: "127.0.0.1", search: "", cfg: providerCfg });
  assert.equal(local.mode, "offline");
  const ai = resolveSummitRuntime({ hostname: "127.0.0.1", search: "?summit=ai", cfg: providerCfg });
  assert.equal(ai.mode, "local-ai");
  const ft = resolveSummitRuntime({ hostname: "127.0.0.1", search: "?summit=fieldtest", cfg: providerCfg });
  assert.equal(ft.mode, "fieldtest");
  assert.equal(ft.fieldTest, true);
});

await check("CORS allowlist rejects wildcard and unknown origins", async () => {
  assert.equal(allowOrigin("https://terrainbound.org"), "https://terrainbound.org");
  assert.equal(allowOrigin("https://evil.example"), "");
  assert.equal(allowOrigin("http://127.0.0.1:8086"), "");
  assert.equal(allowOrigin("http://127.0.0.1:8086", { allowLocal: true }), "http://127.0.0.1:8086");
  const denied = await handleSummitRequest(
    makeRequest("/summit", { method: "POST", origin: "https://evil.example", body: { question: "hi", prompt: "p" } }),
    env
  );
  assert.equal(denied.status, 403);
  const preflight = await handleSummitRequest(
    makeRequest("/summit", { method: "OPTIONS", origin: "https://terrainbound.org" }),
    env
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://terrainbound.org");
});

await check("health does not expose secrets", async () => {
  const res = await handleSummitRequest(makeRequest("/health", { origin: "https://terrainbound.org" }), env);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.configured, true);
  assert.equal(body.key, undefined);
  assert.doesNotMatch(JSON.stringify(body), /test-key-not-real|gsk_/);
});

await check("gateway sanitizes inbound packet and drops identity keys", () => {
  const clean = sanitizeInbound({
    prompt: "teach slope",
    question: "why did it go faster",
    email: "a@b.c",
    packet: {
      facts: { puzzle: "Where Did Last Night's Water Go?", fairTrialCount: 2, measurements: [{ slope: "steep", seconds: 10.2 }] },
      recent: [{ role: "student", text: "hello" }, { role: "summit", text: "look" }],
      studentName: "Alex"
    }
  });
  assert.equal(clean.question, "why did it go faster");
  assert.equal(clean.packet.facts.fairTrialCount, 2);
  assert.equal(clean.packet.studentName, undefined);
  assert.equal(clean.email, undefined);
  const body = toGatewayBody({
    prompt: "teach",
    question: "what notes do i have",
    packet: { facts: { numbers: [10.2] }, recent: [{ role: "student", text: "x".repeat(400) }] }
  });
  assert.ok(body.packet.recent[0].text.length <= 220);
  assert.equal(Object.keys(body).sort().join(","), "packet,prompt,question");
});

await check("oversized and malformed requests do not reach upstream", async () => {
  const logs = [];
  const fetchImpl = async () => {
    throw new Error("should-not-fetch");
  };
  const huge = await handleSummitRequest(
    makeRequest("/summit", {
      method: "POST",
      origin: "https://terrainbound.org",
      body: "x".repeat(MAX_BODY_BYTES + 20)
    }),
    env,
    { limiter: createRateLimiter(), fetchImpl, log: (row) => logs.push(row) }
  );
  assert.equal(huge.status, 413);
  const bad = await handleSummitRequest(
    makeRequest("/summit", { method: "POST", origin: "https://terrainbound.org", body: "{not json" }),
    env,
    { fetchImpl }
  );
  assert.equal(bad.status, 400);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.event, "oversized");
  assert.doesNotMatch(logs.join("\n"), /why did|student/);
});

await check("rate limiter blocks a noisy client", async () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, burstWindowMs: 10_000, burstMax: 3 });
  const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"explanation\":\"Steeper slopes tend to make runoff faster.\",\"followUpQuestion\":\"\",\"concept\":\"slope\",\"supportLevel\":2,\"offTopic\":false}" } }] }), { status: 200 });
  let last;
  for (let i = 0; i < 4; i += 1) {
    last = await handleSummitRequest(
      makeRequest("/summit", {
        method: "POST",
        origin: "https://terrainbound.org",
        ip: "203.0.113.9",
        body: { prompt: "science", question: "why faster" }
      }),
      env,
      { limiter, fetchImpl }
    );
  }
  assert.equal(last.status, 429);
  const err = await last.json();
  assert.equal(err.error, "rate-limit");
});

await check("upstream 429/timeout/malformed stay generic", async () => {
  const origin = "https://terrainbound.org";
  const body = { prompt: "science", question: "why faster" };
  const limited = await handleSummitRequest(makeRequest("/summit", { method: "POST", origin, ip: "203.0.113.21", body }), env, {
    limiter: createRateLimiter(),
    fetchImpl: async () => new Response("{}", { status: 429 })
  });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, "rate-limit");
  const timeout = await handleSummitRequest(makeRequest("/summit", { method: "POST", origin, ip: "203.0.113.22", body }), env, {
    limiter: createRateLimiter(),
    fetchImpl: async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }
  });
  assert.ok([502, 504].includes(timeout.status));
  assert.match((await timeout.json()).error, /timeout|unavailable/);
  const malformed = await handleSummitRequest(makeRequest("/summit", { method: "POST", origin, ip: "203.0.113.23", body }), env, {
    limiter: createRateLimiter(),
    fetchImpl: async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 })
  });
  assert.equal(malformed.status, 502);
  assert.equal((await malformed.json()).error, "unavailable");
});

await check("hybrid fallback never shows provider errors to the student", async () => {
  const talk = engine(
    createHttpAdapter({ endpoint: "http://127.0.0.1:1/summit", timeoutMs: 150, retry429: 0 })
  );
  const reply = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "why did the water move faster" }));
  assert.equal(reply.provider, "deterministic");
  assert.ok(reply.fallbackReason);
  assert.doesNotMatch(reply.text, /HTTP|429|500|Groq|JSON parse|stack|unavailable/i);
  const fixture = engine(
    createFixtureAdapter(async () => ({ explanation: "Click the Water Level button.", supportLevel: 9 }))
  );
  const blocked = await Promise.resolve(fixture.ask(createSummitState(), baseInput(), { question: "why did it go faster" }));
  assert.equal(blocked.provider, "deterministic");
  assert.doesNotMatch(blocked.text, /Click the Water Level/);
  const gravityTalk = engine(
    createFixtureAdapter(async () => ({
      explanation: "Gravity is stronger on the steep slope, so the water went faster.",
      followUpQuestion: "",
      concept: "gravity",
      supportLevel: 2,
      offTopic: false
    }))
  );
  const gravity = await Promise.resolve(
    gravityTalk.ask(createSummitState(), baseInput(), { question: "gravity is stronger on the steep slope" })
  );
  assert.equal(gravity.provider, "deterministic");
  assert.ok(gravity.fallbackReason);
  assert.doesNotMatch(gravity.text, /Gravity is stronger on the steep slope/);
  assert.doesNotMatch(gravity.text, /HTTP|429|Groq/i);
});

await check("deterministic product routes stay off the model", async () => {
  const talk = engine(createFixtureAdapter(async () => {
    throw new Error("model should not run");
  }));
  const help = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "how do i play" }));
  assert.equal(help.text, GAME_HELP_LINE);
  const next = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "what should i do next" }));
  assert.equal(next.route.reason, "next-action");
  const notes = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "what notes do i have" }));
  assert.equal(notes.route.reason, "evidence-inventory");
  const clear = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "did wren clear me" }));
  assert.equal(clear.route.reason, "state-honesty");
  const who = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "are you bigfoot" }));
  assert.match(who.text, /Sasquatch/i);
  const notice = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "what should i notice" }));
  assert.equal(notice.route.reason, "notice");
  const trial = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "what was my third trial" }));
  assert.equal(trial.route.useAi, false);
  assert.match(trial.route.reason, /state-honesty|evidence-inventory/);
  assert.doesNotMatch(trial.text, /HTTP|Groq/i);
});

await check("json_object answer alias becomes explanation", async () => {
  let n = 0;
  const fetchImpl = async () => {
    n += 1;
    if (n === 1) {
      return new Response(JSON.stringify({ error: { message: "Failed to generate JSON" } }), { status: 400 });
    }
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"answer":"Steeper slopes tend to make runoff faster.","concept":"slope"}' } }]
      }),
      { status: 200 }
    );
  };
  const res = await handleSummitRequest(
    makeRequest("/summit", {
      method: "POST",
      origin: "https://terrainbound.org",
      ip: "203.0.113.40",
      body: { prompt: "science", question: "why faster" }
    }),
    env,
    { limiter: createRateLimiter(), fetchImpl }
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.match(body.explanation, /steeper slopes/i);
  assert.equal(n, 2);
});

await check("Summit HUD shows a Sasquatch face without field-test chrome by default", () => {
  assert.match(html, /summit-toggle-face/);
  assert.match(html, /Open Summit, Earth Science companion/);
  assert.match(html, /summit-neutral\.svg/);
  assert.match(css, /\.summit-toggle-face/);
  assert.match(html, /id="summit-fieldtest"/);
  assert.match(html, /hidden/);
  assert.doesNotMatch(html, /GPT-OSS|Groq|AI provider/i);
  assert.match(gameJs, /fieldTestMode/);
  assert.match(gameJs, /summitRuntime\.endpoint/);
  assert.match(prodDoc, /Cloudflare Worker/);
  assert.equal(isForbiddenRel("data/summit/.env"), true);
  assert.equal(isForbiddenRel("server/summit-gateway.mjs"), true);
  assert.equal(isForbiddenRel("js/game.js"), false);
});

await check("publish-static copies game files and omits secrets", async () => {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "tb-static-"));
  await publishStatic(dest);
  assert.equal(fs.existsSync(path.join(dest, "index.html")), true);
  assert.equal(fs.existsSync(path.join(dest, "js/game.js")), true);
  assert.equal(fs.existsSync(path.join(dest, "assets/summit/summit-neutral.svg")), true);
  assert.equal(fs.existsSync(path.join(dest, "data/summit/provider.json")), true);
  assert.equal(fs.existsSync(path.join(dest, "data/summit/.env")), false);
  assert.equal(fs.existsSync(path.join(dest, "server")), false);
  assert.equal(fs.existsSync(path.join(dest, "tests")), false);
  const published = fs.readFileSync(path.join(dest, "data/summit/provider.json"), "utf8");
  assert.doesNotMatch(published, /gsk_/);
});

await check("ops log fields do not include prompt or question keys", () => {
  assert.match(gatewaySrc, /event: "ok"/);
  assert.match(gatewaySrc, /latencyMs/);
  assert.doesNotMatch(gatewaySrc, /log\(.*question/);
  assert.match(gatewaySrc, /Student utterances are not logged/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9L production Summit checks passed.");
