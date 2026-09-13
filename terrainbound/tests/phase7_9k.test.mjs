#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9K — Summit Sasquatch character + conversational UX.
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
  routeSummit,
  GAME_HELP_LINE,
  SUMMIT_GREETING,
  classifyIntentCategory,
  chooseSummitExpression,
  summitPortraitSrc,
  selectSummitPacket
} from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";
import { checkConceptClaims } from "../js/summit-science.js";
import { createFieldTestSession, recordSummitTurn } from "../js/summit-fieldtest.js";

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

const curriculum = JSON.parse(fs.readFileSync(path.join(root, "data/summit/cedar-hollow.json"), "utf8"));
const concepts = JSON.parse(fs.readFileSync(path.join(root, "data/summit/concepts.json"), "utf8"));
const curiosity = JSON.parse(fs.readFileSync(path.join(root, "data/summit/curiosity.json"), "utf8"));
const puzzleSpec = JSON.parse(fs.readFileSync(path.join(root, "data/puzzles/cedar-hollow.json"), "utf8"));
const aarSpec = JSON.parse(fs.readFileSync(path.join(root, "data/aar/cedar-hollow.json"), "utf8"));
const flumeSpec = JSON.parse(fs.readFileSync(path.join(root, "data/investigations/what-makes-water-move.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/game.css"), "utf8");
const bible = fs.readFileSync(path.join(root, "docs/SUMMIT-CHARACTER.md"), "utf8");
const finding = fs.readFileSync(path.join(root, "tests/evidence/phase79k/HUMAN-UX-FINDING.md"), "utf8");
const scienceEval = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-science.json"), "utf8"));

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

function engine() {
  return createSummitEngine({
    curriculum,
    concepts,
    provider: createHybridProvider({ curriculum, concepts, curiosity })
  });
}

const NATURAL = [
  { q: "how do i play", reason: "game-help", useAi: false, category: "game-help" },
  { q: "how do you play", reason: "game-help", useAi: false, category: "game-help" },
  { q: "what am i supposed to do", reason: "game-help", useAi: false, category: "game-help" },
  { q: "what is the point", reason: "game-help", useAi: false, category: "game-help" },
  { q: "im lost", reason: "game-help", useAi: false, category: "game-help" },
  { q: "where do i start", reason: "game-help", useAi: false, category: "game-help" },
  { q: "bro what am i doing", reason: "game-help", useAi: false, category: "game-help" },
  { q: "what should i do next", reason: "next-action", useAi: false, category: "next-action" },
  { q: "what should i notice", reason: "notice", useAi: false, category: "notice" },
  { q: "why did it go faster", reason: "follow-up", useAi: true, category: "science" },
  { q: "what is runoff", reason: "vocab-library", useAi: false, category: "vocabulary" },
  { q: "what notes do i have", reason: "evidence-inventory", useAi: false, category: "inventory" },
  { q: "did wren clear me", reason: "state-honesty", useAi: false, category: "progression" },
  { q: "i dont get this", reason: "clarification", useAi: false, category: "clarification" },
  { q: "help", reason: "game-help", useAi: false, category: "game-help" },
  { q: "what do you do summit", reason: "character", useAi: false, category: "character" },
  { q: "who are you", reason: "character", useAi: false, category: "character" },
  { q: "what are you", reason: "character", useAi: false, category: "character" },
  { q: "are you bigfoot", reason: "character", useAi: false, category: "character" },
  { q: "are you a sasquatch", reason: "character", useAi: false, category: "character" },
  { q: "why are you hairy", reason: "character", useAi: false, category: "character" },
  { q: "are you real", reason: "character", useAi: false, category: "character" }
];

await check("human field-test evidence is preserved unaltered", () => {
  const json = fs.readFileSync(path.join(root, "tests/evidence/phase79k/terrainbound-fieldtest-f8f46016375b.json"), "utf8");
  const md = fs.readFileSync(path.join(root, "tests/evidence/phase79k/terrainbound-fieldtest-f8f46016375b.md"), "utf8");
  assert.match(json, /f8f46016375b/);
  assert.match(json, /You are trying to say/);
  assert.match(md, /HELPED/);
  assert.match(finding, /how do i play/);
  assert.match(finding, /unaltered/);
});

await check("Summit is documented as Sasquatch, not a human companion", () => {
  assert.match(bible, /Sasquatch \/ Bigfoot/);
  assert.match(bible, /discards/);
  assert.doesNotMatch(bible, /human field-science companion is the product identity/i);
  assert.match(html, /Sasquatch Earth Science companion/);
  assert.match(html, /summit-portrait/);
  assert.match(html, /Earth Science Companion/);
  assert.doesNotMatch(html, /Earth Science tutor/);
  const validateSrc = fs.readFileSync(path.join(root, "js/summit-validate.js"), "utf8");
  const composeSrc = fs.readFileSync(path.join(root, "js/summit-compose.js"), "utf8");
  assert.doesNotMatch(validateSrc, /field science tutor/);
  assert.doesNotMatch(composeSrc, /field science tutor/);
  assert.ok(fs.existsSync(path.join(root, "assets/summit/summit-neutral.svg")));
  assert.ok(fs.existsSync(path.join(root, "assets/summit/summit-thinking.svg")));
  assert.ok(fs.existsSync(path.join(root, "assets/summit/summit-notice.svg")));
  assert.ok(fs.existsSync(path.join(root, "assets/summit/summit-explain.svg")));
});

await check("natural student language routes to the right authority", async () => {
  for (const row of NATURAL) {
    const detected = detectIntent(row.q, "");
    const decision = routeSummit({
      question: row.q,
      action: "",
      intent: detected.intent,
      context: { summit: { hintAsks: 0, recent: [] } }
    });
    assert.equal(decision.reason, row.reason, `${row.q} got ${decision.reason}`);
    assert.equal(decision.useAi, row.useAi, `${row.q} useAi`);
    assert.equal(
      classifyIntentCategory({ question: row.q, routeReason: decision.reason, intent: detected.intent }),
      row.category,
      `${row.q} category`
    );
  }
});

await check("how do i play is visible game-help, not the CH-02 canned line", async () => {
  const talk = engine();
  const reply = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "how do i play" }));
  assert.equal(reply.route.reason, "game-help");
  assert.equal(reply.provider, "deterministic");
  assert.equal(reply.text, GAME_HELP_LINE);
  assert.match(reply.text, /Field Tablet/);
  assert.match(reply.text, /Wren decides/);
  assert.doesNotMatch(reply.text, /You are trying to say/);
  assert.doesNotMatch(reply.text, /not this panel/);
  assert.doesNotMatch(reply.text, /CH-\d+/);
});

await check("game-help and next-action stay distinct", async () => {
  const talk = engine();
  const help = await Promise.resolve(talk.ask(createSummitState(), withTrials(2), { question: "how do i play" }));
  const next = await Promise.resolve(talk.ask(createSummitState(), withTrials(2), { question: "what should i do next" }));
  assert.equal(help.route.reason, "game-help");
  assert.equal(next.route.reason, "next-action");
  assert.match(next.text, /gentler slope/i);
  assert.doesNotMatch(help.text, /gentler slope/i);
  const hud = await Promise.resolve(talk.ask(createSummitState(), withTrials(2), { action: "what_now" }));
  assert.equal(hud.route.reason, "next-action");
});

await check("character questions stay fictional and do not invent science", async () => {
  const talk = engine();
  const bigfoot = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "are you bigfoot" }));
  assert.match(bigfoot.text, /Sasquatch/i);
  assert.doesNotMatch(bigfoot.text, /scientists have proven|definitely real in the woods/i);
  const real = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "are you real" }));
  assert.match(real.text, /TerrainBound/);
  assert.doesNotMatch(real.text, /Bigfoot is a proven species/i);
  assert.doesNotMatch(real.text, /10\.2|clearance/i);
});

await check("personality does not change 7.9H science truth", async () => {
  const talk = engine();
  const gravity = await Promise.resolve(
    talk.ask(createSummitState(), withTrials(2), { question: "Does gravity get stronger on a steep hill?" })
  );
  assert.match(gravity.text, /does not get stronger|is not stronger/i);
  assert.doesNotMatch(gravity.text, /gravity gets stronger/i);
  const path = await Promise.resolve(
    talk.ask(createSummitState(), withTrials(2), { question: "Is it faster because the path is longer?" })
  );
  assert.match(path.text, /not the reason|downhill/i);
  const packet = selectSummitPacket({
    question: "why",
    intent: "explain",
    level: 3,
    context: {
      regionId: "cedar-hollow",
      raw: {
        flume: {
          fairTrials: [
            { slope: "steep", seconds: 10.2, water: "one-cup" },
            { slope: "steep", seconds: 10.4, water: "one-cup" }
          ]
        }
      },
      aar: { result: null },
      observations: []
    }
  });
  assert.equal(
    checkConceptClaims("A steeper slope means the water has a longer path so it moves faster.", packet),
    "path-length-mechanism"
  );
  assert.equal(checkConceptClaims("Gravity gets stronger on a steep hill so runoff speeds up.", packet), "gravity-strength");
  assert.equal(
    checkConceptClaims("Your experiment showed steep is faster than the gentle slope.", packet),
    "unready-comparison"
  );
  const notes = await Promise.resolve(talk.ask(createSummitState(), withTrials(2), { question: "what notes do i have" }));
  assert.equal(notes.route.reason, "evidence-inventory");
  assert.match(notes.text, /10\.2/);
  assert.doesNotMatch(notes.text, /18\.4/);
  const clear = await Promise.resolve(talk.ask(createSummitState(), baseInput(), { question: "did Wren clear me?" }));
  assert.match(clear.text, /has not granted field clearance/i);
});

await check("science eval routes still match", () => {
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

await check("expressions are deterministic and fall back to neutral", () => {
  assert.equal(chooseSummitExpression({ pending: true }), "thinking");
  assert.equal(chooseSummitExpression({ intent: "notice" }), "notice");
  assert.equal(chooseSummitExpression({ intent: "explain" }), "explain");
  assert.equal(chooseSummitExpression({ misconceptionId: "gravity" }), "explain");
  assert.equal(chooseSummitExpression({}), "neutral");
  assert.match(summitPortraitSrc("missing-face"), /summit-neutral\.svg/);
  assert.match(SUMMIT_GREETING, /Summit/);
});

await check("quick actions fit the compact student set", () => {
  assert.match(html, /What should I do\?/);
  assert.match(html, /What should I notice\?/);
  assert.match(html, /Explain this/);
  assert.match(html, /data-summit="why"/);
  assert.doesNotMatch(html, /Why was that wrong\?/);
  assert.doesNotMatch(html, /data-summit="hint"/);
  assert.match(css, /\.summit-portrait/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /64px/);
});

await check("field-test intent logging includes game-help and character", () => {
  const session = createFieldTestSession({ startedAt: 0 });
  const turn = recordSummitTurn(session, {
    studentUtterance: "how do i play",
    routeReason: "game-help",
    visibleResponse: GAME_HELP_LINE
  });
  assert.equal(turn.intentCategory, "game-help");
  assert.match(html, /SUMMIT FIELD TEST/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9K Summit character checks passed.");
