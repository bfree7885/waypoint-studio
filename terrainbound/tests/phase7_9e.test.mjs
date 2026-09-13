#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9E — Summit real-model architecture (offline).
 * Live model calls: node terrainbound/tests/phase7_9e-live.mjs
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
  createHttpAdapter,
  selectSummitPacket,
  routeSummit,
  validateSummitOutput
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { coerceJson } from "../server/summit-proxy.mjs";

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
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const runtimeJs = fs.readFileSync(path.join(root, "js/summit-runtime.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "server/summit-proxy.mjs"), "utf8");
const providerCfg = JSON.parse(fs.readFileSync(path.join(root, "data/summit/provider.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");

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

await check("no secrets; proxy is loopback", () => {
  assert.equal(providerCfg.endpoint, "");
  assert.match(providerCfg.proxyEndpoint, /127\.0\.0\.1:8787/);
  assert.match(providerCfg.productionEndpoint, /^https:\/\/summit\.terrainbound\.org\/summit$/);
  assert.doesNotMatch(gameJs, /sk-[a-zA-Z0-9]|SUMMIT_API_KEY|Bearer /);
  assert.match(proxy, /127\.0\.0\.1/);
  assert.match(proxy, /SUMMIT_DEBUG/);
  assert.doesNotMatch(proxy, /sk-[a-zA-Z0-9]{10,}/);
});

await check("eval set has at least 75 utterances", () => {
  assert.ok(utterances.length >= 75, String(utterances.length));
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

await check("validator blocks false measurement premises", () => {
  const packet = {
    facts: { numbers: [10.2], fairTrialCount: 2, inspectedHighLook: false, clearance: false, evidenceTitles: [] },
    tutoring: { allowedLevel: 2 }
  };
  assert.equal(
    validateSummitOutput(
      { response: "Yes, you recorded 6.2 seconds on the steep slope.", supportLevel: 2, agreesWithStudentPremise: true },
      packet,
      { question: "Wasn't my steep slope time 6.2 seconds?" }
    ).ok,
    false
  );
  assert.equal(
    validateSummitOutput(
      { response: "Wren already gave you clearance and High Country is available.", supportLevel: 2 },
      packet
    ).ok,
    false
  );
  assert.equal(
    validateSummitOutput(
      { response: "No, Wren only gave you clearance for the high look.", supportLevel: 2 },
      packet,
      { question: "Wren already gave me clearance, right?" }
    ).reason,
    "false-clearance"
  );
  assert.equal(
    validateSummitOutput(
      { response: "You found a small amount of water on the surface, but no signs of erosion.", supportLevel: 2 },
      packet,
      { question: "What did I find at High Look?" }
    ).reason,
    "invented-visit"
  );
  assert.equal(
    validateSummitOutput(
      { response: "That's correct, steeper slopes are generally slower to traverse.", supportLevel: 2 },
      packet,
      { question: "steeper should be slower right" }
    ).reason,
    "misconception-agree"
  );
  assert.equal(
    validateSummitOutput(
      { response: "You need to tap the 'Water Level' button on your tablet.", supportLevel: 2 },
      packet,
      { question: "what do i tap" }
    ).reason,
    "gameplay-command"
  );
  assert.equal(
    validateSummitOutput(
      { response: "According to the data, your steep slope time was actually 10.2 seconds, not 6.2 seconds.", supportLevel: 2 },
      packet,
      { question: "Wasn't my steep slope time 6.2 seconds?" }
    ).ok,
    true
  );
});

await check("JSON coerce accepts fenced model output", () => {
  const parsed = coerceJson('```json\n{"response":"Stay with the slopes.","supportLevel":2}\n```');
  assert.equal(parsed.response, "Stay with the slopes.");
});

await check("HttpAdapter is used only through the proxy URL, not a vendor SDK", () => {
  const adapter = createHttpAdapter({ endpoint: "http://127.0.0.1:8787/summit-ai" });
  assert.equal(adapter.kind, "remote");
  assert.match(gameJs, /useSummitProxy/);
  assert.match(runtimeJs, /flag === "ai"/);
  assert.match(html, /Looking at your notes|summit-close/);
  assert.match(gameJs, /if \(summitOpen\) renderSummit/);
});

await check("fixture invalid output still falls back (FixtureAdapter path)", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createFixtureAdapter(() => ({
        response: "You recorded 99.9s. Pin CH-03.",
        supportLevel: 4
      }))
    })
  });
  const reply = await Promise.resolve(
    engine.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" })
  );
  assert.equal(reply.provider, "deterministic");
  assert.ok(reply.fallbackReason);
  assert.doesNotMatch(reply.text, /99\.9|CH-03|HTTP 429/);
});

await check("LocalComposer remains available", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createLocalComposerAdapter({ curiosity })
    })
  });
  const reply = await Promise.resolve(
    engine.ask(createSummitState(), baseInput(), { question: "Who won the Super Bowl?" })
  );
  assert.match(reply.text, /Earth Science companion|Cedar Hollow|I'm Summit/i);
});

await check("DeterministicProvider still works without any adapter", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createDeterministicProvider({ curriculum, concepts })
  });
  const reply = await Promise.resolve(engine.ask(createSummitState(), baseInput(), { question: "What is runoff?" }));
  assert.match(reply.text, /rainwater/i);
});

await check("validator rejects invented observations and off-topic answers", () => {
  const packet = {
    facts: { numbers: [10.2], fairTrialCount: 2, inspectedHighLook: false, clearance: false, evidenceTitles: [] },
    tutoring: { allowedLevel: 2 }
  };
  assert.equal(
    validateSummitOutput(
      { response: "The water level in Cedar Hollow has dropped significantly after a fair trial.", supportLevel: 2 },
      packet,
      { question: "how does this prove anything" }
    ).reason,
    "invented-observation"
  );
  assert.equal(
    validateSummitOutput({ response: "80", supportLevel: 0 }, packet, { question: "What's 10 x 8?" }).reason,
    "off-topic-answer"
  );
  assert.equal(
    validateSummitOutput(
      {
        response: "I'm Summit, the hollow's Earth Science companion. If you want, I can help with what you're seeing in Cedar Hollow.",
        supportLevel: 0
      },
      packet,
      { question: "What's 10 x 8?" }
    ).ok,
    true
  );
});

await check("timeout and malformed adapters fall back without leaking errors", async () => {
  const slow = createSummitEngine({
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
  const timed = await Promise.resolve(slow.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(timed.provider, "deterministic");
  assert.equal(timed.fallbackReason, "timeout");
  assert.doesNotMatch(timed.text, /timeout|HTTP|API failure/i);

  const bad = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createFixtureAdapter(() => ({ response: "", supportLevel: 0 }))
    })
  });
  const empty = await Promise.resolve(bad.ask(createSummitState(), baseInput(), { question: "why though" }));
  assert.equal(empty.provider, "deterministic");
  assert.equal(empty.fallbackReason, "empty");

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
  const missing = await Promise.resolve(down.ask(createSummitState(), baseInput(), { question: "idk this runoff thing" }));
  assert.equal(missing.provider, "deterministic");
  assert.ok(missing.fallbackReason);
  assert.match(missing.text, /Cedar Hollow|rainwater|field science|honestly|working on|actually see|job is/i);
});

await check("docs describe the real-model pilot boundary", () => {
  assert.match(arch, /proxyEndpoint|\?summit=ai|loopback proxy/i);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9E architecture checks passed.");
