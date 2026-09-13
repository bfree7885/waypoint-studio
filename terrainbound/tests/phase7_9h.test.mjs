#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9H — Summit science precision (offline).
 * Live: node terrainbound/tests/phase7_9h-live.mjs
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
  routeSummit,
  validateSummitOutput,
  selectSummitPacket,
  buildSummitTruth,
  SUMMIT_CONCEPTS,
  comparisonStatus,
  checkConceptClaims
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { conceptTeach } from "../js/summit-concepts.js";

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

const scienceEval = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-science.json"), "utf8"));
const constrained = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-constrained.json"), "utf8"));
const utterances = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-utterances.json"), "utf8"));
const extra = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-bakeoff-extra.json"), "utf8"));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");

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

await check("science eval has at least 60 utterances and 5 chains", () => {
  assert.ok(scienceEval.length >= 60, String(scienceEval.length));
  const chains = new Set(scienceEval.map((row) => row.chain).filter(Boolean));
  assert.ok(chains.size >= 5, String([...chains]));
});

await check("science eval routes as labeled", () => {
  for (const row of scienceEval) {
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

await check("legacy 7.9G routes still match", () => {
  for (const row of [...constrained, ...utterances, ...extra]) {
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

await check("comparisonStatus is deterministic from trials", () => {
  const steepOnly = comparisonStatus([
    { slope: "steep", seconds: 10.2 },
    { slope: "steep", seconds: 10.4 }
  ]);
  assert.equal(steepOnly.steepMeasured, true);
  assert.equal(steepOnly.gentleMeasured, false);
  assert.equal(steepOnly.comparisonReady, false);
  const both = comparisonStatus([
    { slope: "steep", seconds: 10.2 },
    { slope: "gentle", seconds: 18.4 }
  ]);
  assert.equal(both.comparisonReady, true);
  assert.equal(SUMMIT_CONCEPTS.slope.claims.pathLengthIsNotMechanism, true);
  assert.equal(SUMMIT_CONCEPTS.slope.claims.gravityStrengthConstant, true);
  assert.match(conceptTeach("fair-test", 4), /do not yet show|do not show/i);
});

await check("truth packet carries known / expected / unknown", () => {
  const truth = buildSummitTruth({
    raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2 }, { slope: "steep", seconds: 10.4 }] } },
    observations: [],
    aar: { result: null }
  });
  assert.ok(truth.known.some((row) => /10\.2/.test(row)));
  assert.ok(truth.expected.some((row) => /steeper slope tends/i.test(row)));
  assert.ok(truth.unknown.some((row) => /gentle/i.test(row)));
  assert.equal(truth.comparisonStatus.comparisonReady, false);
  assert.equal(truth.comparisonValid, false);
});

await check("concept checks are state-based", () => {
  const packet = selectSummitPacket({
    question: "why",
    intent: "explain",
    level: 3,
    context: {
      regionId: "cedar-hollow",
      raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2, water: "one-cup" }, { slope: "steep", seconds: 10.4, water: "one-cup" }] } },
      aar: { result: null },
      observations: []
    }
  });
  assert.equal(
    checkConceptClaims("A steeper slope means the water has a longer path so it moves faster.", packet),
    "path-length-mechanism"
  );
  assert.equal(
    checkConceptClaims(
      "A steeper slope doesn't mean the water travels farther; it means more of gravity's pull acts downhill, so the water moves faster. The path length is the same.",
      packet,
      "Steep means the water has farther to travel, right?"
    ),
    ""
  );
  assert.equal(
    checkConceptClaims(
      "Gravity pulls water downhill, and on a steeper slope more of that pull acts directly downhill, so the water moves faster. The length of the path doesn’t make it go faster.",
      packet,
      "path is longer so it speeds up?"
    ),
    ""
  );
  assert.equal(
    checkConceptClaims("You’re comparing how fast water runs off a steep slope versus a gentle slope.", packet),
    "unready-comparison"
  );
  assert.equal(checkConceptClaims("Gravity gets stronger on a steep hill so runoff speeds up.", packet), "gravity-strength");
  assert.equal(
    checkConceptClaims("Gravity does not get stronger. More of the same pull acts downhill.", packet),
    ""
  );
  assert.equal(
    checkConceptClaims("Your experiment showed steep is faster than the gentle slope.", packet),
    "unready-comparison"
  );
  assert.equal(
    checkConceptClaims("Science expects water to move faster on a steeper slope if other conditions stay comparable. You have not measured gentle yet.", packet),
    ""
  );
  assert.equal(
    checkConceptClaims("10.2 was steep and 10.4 was gentle.", packet),
    "split-steep-trials"
  );
  assert.equal(
    validateSummitOutput(
      { explanation: "A steeper slope means the path is longer so runoff is faster.", supportLevel: 2 },
      packet,
      { question: "why is steep faster" }
    ).reason,
    "path-length-mechanism"
  );
});

await check("fair-test and epistemic stay deterministic and precise", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({ curriculum, concepts, curiosity })
  });
  const proved = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(2), { question: "I did two steep trials so I proved steep is faster." })
  );
  assert.equal(proved.provider, "deterministic");
  assert.match(proved.text, /do not (yet )?show|not a steep-versus-gentle|consistent/i);
  assert.doesNotMatch(proved.text, /you proved steep is faster than gentle/i);

  const split = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(2), { question: "so 10.2 was steep and 10.4 was gentle?" })
  );
  assert.match(split.text, /both/i);
  assert.match(split.text, /steep/i);

  const which = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(2), { question: "My times were 10.2 and 10.4. Which slope was faster?" })
  );
  assert.match(which.text, /do not answer which slope|both measured setups are steep/i);

  const know = await Promise.resolve(engine.ask(createSummitState(), withTrials(2), { question: "what do I know" }));
  assert.match(know.text, /10\.2|Trial 1/i);
  assert.match(know.text, /Unknown|expected/i);

  const saw = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(2), { question: "I saw that runoff is caused by slope" })
  );
  assert.equal(saw.provider, "deterministic");
  assert.match(saw.text, /observation|interpretation/i);

  const next = await Promise.resolve(engine.ask(createSummitState(), withTrials(2), { question: "what should I test next" }));
  assert.match(next.text, /gentler slope/i);

  const ready = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(4), { question: "Can I conclude steep is faster now?" })
  );
  assert.match(ready.text, /both slopes|18\.4|compare those measured/i);
});

await check("path-length and gravity fallbacks stay correct", async () => {
  const engine = createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({
      curriculum,
      concepts,
      curiosity,
      adapter: createFixtureAdapter(() => ({
        explanation: "A steeper slope means the water has a longer path, so it goes faster.",
        supportLevel: 0
      }))
    })
  });
  const reply = await Promise.resolve(
    engine.ask(createSummitState(), withTrials(2), { question: "Is it faster because the path is longer?" })
  );
  assert.equal(reply.provider, "deterministic");
  assert.equal(reply.fallbackReason, "path-length-mechanism");
  assert.match(reply.text, /not the reason|downhill/i);
  assert.doesNotMatch(reply.text, /path is longer so it/i);
});

await check("docs and cache-bust mention 7.9H science precision", () => {
  assert.match(arch, /Phase 7\.9H|science precision|comparisonReady/i);
  assert.match(html, /p79l/);
  assert.match(mainJs, /p79l/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9H science-precision checks passed.");
