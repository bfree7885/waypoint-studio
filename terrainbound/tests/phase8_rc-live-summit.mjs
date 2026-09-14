#!/usr/bin/env node
/**
 * Production Worker probes for TerrainBound Phase 8 RC.
 * Does not change the Worker. Does not print secrets.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  emptyDarkSkySave,
  debugCompleteThrough,
  markEyepieceSeen,
  observeTarget,
  readTwinsLog,
  setLampOn,
  logLampCalibration,
  tryStellarAlign,
  markStellarFeature,
  logStellarCompare,
  logTwinsConclusion,
  logEmberPeaks,
  logEmberConclusion,
  buildDarkSkySummitContext
} from "../js/darksky.js";
import { selectSummitPacket } from "../js/summit-packet.js";
import { validateSummitOutput } from "../js/summit-validate.js";
import { buildSummitPrompt } from "../js/summit-ai.js";
import { PRODUCTION_ENDPOINT, toGatewayBody } from "../js/summit-runtime.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/darksky/catalog.json"), "utf8"));
const region = JSON.parse(fs.readFileSync(path.join(root, "data/regions/dark-sky-basin.json"), "utf8"));
const summitSpec = JSON.parse(fs.readFileSync(path.join(root, "data/summit/dark-sky-basin.json"), "utf8"));

function seed01(state) {
  markEyepieceSeen(state);
  observeTarget(state, "west-twin");
  observeTarget(state, "east-twin");
  readTwinsLog(state);
  setLampOn(state, true);
  logLampCalibration(state, catalog, [436, 546], true);
  tryStellarAlign(state, catalog, 0);
  markStellarFeature(state, 486, "diff");
  markStellarFeature(state, 589, "diff");
  logStellarCompare(state);
  logTwinsConclusion(state);
}

function seed02(state) {
  seed01(state);
  observeTarget(state, "cooler-ember");
  logEmberPeaks(state, catalog, 628, 428);
  logEmberConclusion(state);
}

function through(id) {
  const state = emptyDarkSkySave();
  debugCompleteThrough(state, catalog, id, { seed01, seed02 });
  return state;
}

const HEALTH = PRODUCTION_ENDPOINT.replace(/\/summit$/, "/health");

async function postQuestion(question, packet) {
  const prompt = buildSummitPrompt(packet, { question });
  const body = toGatewayBody({ packet, prompt, question });
  const started = Date.now();
  let res = await fetch(PRODUCTION_ENDPOINT, {
    method: "POST",
    headers: {
      origin: "https://terrainbound.org",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    res = await fetch(PRODUCTION_ENDPOINT, {
      method: "POST",
      headers: {
        origin: "https://terrainbound.org",
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
  }
  const json = await res.json().catch(() => ({}));
  const text = String(json.explanation || json.response || "");
  const gate = validateSummitOutput(json, packet, { question });
  const blob = JSON.stringify(json);
  return {
    question,
    status: res.status,
    latencyMs: json.usage?.latencyMs ?? Date.now() - started,
    chars: text.length,
    preview: text.slice(0, 180),
    gateOk: gate.ok,
    gateReason: gate.reason || "",
    inventedNm: /\b\d+(\.\d+)?\s*nm\b/i.test(text),
    inventedVisit: /you (already )?(walked|visited|measured the lamp)/i.test(text),
    wrenClearance: /field clearance earned|you are cleared/i.test(text),
    secretLeak: /gsk_|SUMMIT_API_KEY|sk-[A-Za-z0-9]{8,}/i.test(blob)
  };
}

const healthRes = await fetch(HEALTH, { headers: { origin: "https://terrainbound.org" } });
const health = await healthRes.json();
assert.equal(healthRes.status, 200);
assert.equal(health.ok, true);
assert.equal(health.configured, true);
assert.doesNotMatch(JSON.stringify(health), /gsk_|sk-|SUMMIT_API_KEY/i);
console.log(JSON.stringify({ ok: true, probe: "health", endpoint: HEALTH, health }, null, 2));

const chPacket = {
  facts: {
    region: "Cedar Hollow",
    puzzle: "field work",
    known: [],
    expected: ["Steeper slopes tend to make runoff faster."],
    unknown: ["a completed steep-vs-gentle result from this experiment"],
    science: ["Gravity pulls water downhill."],
    clearance: false,
    comparisonStatus: { comparisonReady: false, steepMeasured: false, gentleMeasured: false }
  },
  tutoring: { allowedLevel: 2, ladder: "reason", doNotRevealCards: true, doNotGrantClearance: true }
};

const dsFresh = buildDarkSkySummitContext({
  state: emptyDarkSkySave(),
  catalog,
  region,
  player: { x: region.spawn?.x || 1240, y: region.spawn?.y || 508 },
  spec: summitSpec
});
const dsFreshPacket = selectSummitPacket({ context: dsFresh, question: "why aren't the two white stars necessarily the same?" });

const dsLater = buildDarkSkySummitContext({
  state: through("DS-07"),
  catalog,
  region,
  player: region.westRim || { x: 380, y: 440 },
  spec: summitSpec
});

const jobs = [
  { question: "Does a steeper slope tend to make runoff faster?", packet: chPacket, region: "cedar-hollow" },
  { question: "why aren't the two white stars necessarily the same?", packet: dsFreshPacket, region: "dark-sky-basin" },
  {
    question: "does brighter mean closer?",
    packet: selectSummitPacket({ context: dsLater, question: "does brighter mean closer?" }),
    region: "dark-sky-basin"
  },
  {
    question: "is a red star hotter?",
    packet: selectSummitPacket({ context: dsLater, question: "is a red star hotter?" }),
    region: "dark-sky-basin"
  },
  {
    question: "does redshift mean the galaxy is red?",
    packet: selectSummitPacket({ context: dsLater, question: "does redshift mean the galaxy is red?" }),
    region: "dark-sky-basin"
  },
  {
    question: "did all elements come from stars?",
    packet: selectSummitPacket({ context: dsLater, question: "did all elements come from stars?" }),
    region: "dark-sky-basin"
  },
  {
    question: "are we seeing the distant galaxy right now?",
    packet: selectSummitPacket({ context: dsLater, question: "are we seeing the distant galaxy right now?" }),
    region: "dark-sky-basin"
  },
  {
    question: "was the Big Bang an explosion into empty space?",
    packet: selectSummitPacket({ context: dsLater, question: "was the Big Bang an explosion into empty space?" }),
    region: "dark-sky-basin"
  }
];

const results = [];
for (const job of jobs) {
  const row = await postQuestion(job.question, job.packet);
  row.region = job.region;
  results.push(row);
  console.log(JSON.stringify(row));
  assert.equal(row.status, 200, row.question);
  assert.equal(row.secretLeak, false, row.question);
  assert.equal(row.wrenClearance, false, row.question);
  await new Promise((resolve) => setTimeout(resolve, 3200));
}

const failedGate = results.filter((row) => !row.gateOk);
console.log(
  JSON.stringify({
    ok: true,
    probe: "production-summit",
    endpoint: PRODUCTION_ENDPOINT,
    httpAll200: results.every((row) => row.status === 200),
    noSecrets: results.every((row) => !row.secretLeak),
    noFalseClearance: results.every((row) => !row.wrenClearance),
    validateFailed: failedGate.map((row) => ({ question: row.question, reason: row.gateReason })),
    fallbackStillAvailable: true
  })
);

if (results.some((row) => row.status !== 200 || row.secretLeak)) {
  process.exit(1);
}
