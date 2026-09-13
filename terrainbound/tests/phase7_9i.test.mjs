#!/usr/bin/env node
/**
 * TerrainBound Phase 7.9I — supervised Summit field-test harness (offline).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isFieldTestMode,
  createFieldTestSession,
  recordSummitTurn,
  recordWorldEvent,
  markTurn,
  summarizeFieldTest,
  serializeFieldTest,
  formatFieldTestMarkdown,
  worldSnapshot,
  scrubLoggedText,
  logLooksPrivate,
  exportFilenames,
  diffSnapshots,
  FIELDTEST_MARKS
} from "../js/summit-fieldtest.js";
import { routeSummit } from "../js/summit.js";
import { detectIntent } from "../js/summit-policy.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failures.push(name);
    console.error("FAIL  " + name);
    console.error("  " + (err.stack || err.message));
  }
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const runtimeJs = fs.readFileSync(path.join(root, "js/summit-runtime.js"), "utf8");
const arch = fs.readFileSync(path.join(root, "docs/SUMMIT-TUTOR-ARCHITECTURE.md"), "utf8");
const script = fs.readFileSync(path.join(root, "docs/SUMMIT-FIELD-TEST.md"), "utf8");
const constrained = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-constrained.json"), "utf8"));
const science = JSON.parse(fs.readFileSync(path.join(root, "data/summit/eval-science.json"), "utf8"));

check("field-test mode is opt-in and isolated", () => {
  assert.equal(isFieldTestMode(""), false);
  assert.equal(isFieldTestMode("field=1"), false);
  assert.equal(isFieldTestMode("summit=ai"), false);
  assert.equal(isFieldTestMode("summit=local"), false);
  assert.equal(isFieldTestMode("summit=fieldtest"), true);
  assert.equal(isFieldTestMode("?field=1&summit=fieldtest"), true);
  assert.match(runtimeJs, /flag === "fieldtest"/);
  assert.match(runtimeJs, /flag === "ai"/);
  assert.match(html, /summit-fieldtest/);
  assert.match(html, /hidden/);
});

check("anonymous session log has the required fields and no PII keys", () => {
  const session = createFieldTestSession({ sessionId: "abc123", startedAt: 1_000 });
  const snap = worldSnapshot({
    regionId: "cedar-hollow",
    activePuzzleId: "CH-03",
    puzzleName: "runoff",
    puzzleStage: "testing",
    observations: [],
    evidenceEarned: ["CH-01"],
    raw: { flume: { fairTrials: [{ slope: "steep", seconds: 10.2 }] } },
    aar: { result: null }
  });
  const turn = recordSummitTurn(session, {
    studentUtterance: "why is steep faster",
    region: snap.region,
    puzzle: snap.puzzleId,
    puzzleStage: snap.stage,
    locationCategory: "table",
    routeKind: "hosted",
    routeReason: "science-talk",
    concept: "slope",
    supportLevel: 3,
    modelLatencyMs: 400,
    fullLoopMs: 450,
    validatorResult: "ok",
    visibleResponse: "Gravity does not get stronger.",
    comparisonReady: false,
    steepMeasured: true,
    gentleMeasured: false,
    snapshot: snap,
    atMs: 1200
  });
  assert.equal(turn.prevTurnId, "");
  assert.equal(turn.id, "t1");
  for (const key of [
    "id",
    "atMs",
    "region",
    "puzzle",
    "puzzleStage",
    "studentUtterance",
    "routeKind",
    "concept",
    "supportLevel",
    "modelLatencyMs",
    "fullLoopMs",
    "validatorResult",
    "fallbackOccurred",
    "visibleResponse",
    "comparisonReady",
    "prevTurnId"
  ]) {
    assert.ok(key in turn, key);
  }
  const packed = serializeFieldTest(session);
  assert.equal(logLooksPrivate(packed), false);
  assert.doesNotMatch(JSON.stringify(packed), /email|accountId|ipAddress|studentName|school/i);
  assert.equal(packed.session.fieldTest, true);
});

check("secrets and emails are redacted", () => {
  assert.match(scrubLoggedText("key SUMMIT_API_KEY=abc123xyz"), /redacted-secret/);
  assert.match(scrubLoggedText("mail me at kid@school.edu please"), /redacted-email/);
  assert.doesNotMatch(scrubLoggedText("why is steep faster"), /redacted/);
});

check("human marks are optional and ungamified", () => {
  assert.deepEqual(FIELDTEST_MARKS, ["HELPED", "CONFUSING", "TOO_MUCH", "WRONG", "OTHER"]);
  const session = createFieldTestSession({ startedAt: 0 });
  recordSummitTurn(session, { studentUtterance: "huh?", visibleResponse: "Look at the trials.", routeKind: "fallback" });
  markTurn(session, "t1", "HELPED", "nodded");
  markTurn(session, "t1", "not-a-real-mark", "x");
  assert.equal(session.marks[1].mark, "OTHER");
  assert.doesNotMatch(html, /streak|points|badge/i);
});

check("progress-after-help is derived from state, not the model", () => {
  const before = { fairTrialCount: 2, evidenceCount: 1, stage: "testing", puzzleId: "CH-03", clearance: false };
  const after = { fairTrialCount: 4, evidenceCount: 2, stage: "interpreted", puzzleId: "CH-04", clearance: false };
  assert.ok(diffSnapshots(before, after).includes("completed-required-action"));
  assert.ok(diffSnapshots(before, after).includes("earned-evidence"));
  assert.ok(diffSnapshots(before, after).includes("progressed-puzzle"));
  const session = createFieldTestSession({ startedAt: 0 });
  recordSummitTurn(session, {
    studentUtterance: "what should I test next",
    routeKind: "deterministic",
    routeReason: "next-action",
    snapshot: before,
    atMs: 10
  });
  recordWorldEvent(session, { kind: "trial", snapshot: after, atMs: 40 });
  recordSummitTurn(session, { studentUtterance: "why", routeKind: "hosted", snapshot: after, atMs: 80 });
  recordSummitTurn(session, { studentUtterance: "why", routeKind: "hosted", snapshot: after, atMs: 90 });
  const summary = summarizeFieldTest(session);
  assert.equal(summary.helpedThenProgressed, 1);
  assert.equal(summary.repeatHelpWithoutProgress, 1);
  assert.equal(summary.hostedTurns, 2);
  assert.equal(summary.deterministicTurns, 1);
});

check("JSON export and Markdown summary are local and deterministic", () => {
  const session = createFieldTestSession({ sessionId: "deadbeefcafebabe", startedAt: 0 });
  session.endedAt = 5000;
  recordSummitTurn(session, {
    studentUtterance: "give me the answer",
    routeKind: "deterministic",
    routeReason: "answer-ladder",
    visibleResponse: "I will not finish the case.",
    snapshot: { clearance: false },
    atMs: 100
  });
  recordWorldEvent(session, { kind: "clearance", snapshot: { clearance: true, aarResult: "clearance" }, atMs: 200 });
  const packed = serializeFieldTest(session);
  const md = formatFieldTestMarkdown(packed.session, packed.summary);
  const names = exportFilenames(packed.session);
  assert.equal(names.json, "terrainbound-fieldtest-deadbeefcafe.json");
  assert.match(md, /field-test summary/i);
  assert.match(md, /Clearance: granted by Wren/);
  assert.equal(packed.summary.clearance, true);
  assert.equal(packed.summary.summitTurns, 1);
});

check("7.9G/7.9H routes still match", () => {
  for (const row of [...constrained, ...science]) {
    const detected = detectIntent(row.q, row.action || "");
    const decision = routeSummit({
      question: row.q,
      action: row.action || "",
      intent: detected.intent,
      context: { summit: { hintAsks: 0, recent: [] } }
    });
    assert.equal(decision.reason, row.expectRoute, `${row.id} got ${decision.reason}`);
  }
});

check("docs and cache-bust mention field-test isolation", () => {
  assert.match(script, /summit=fieldtest/);
  assert.match(script, /Explore Cedar Hollow and complete the investigation/);
  assert.match(arch, /Phase 7\.9I|field test/i);
  assert.match(html, /p79l/);
  assert.match(mainJs, /p79l/);
  assert.doesNotMatch(gameJs, /analytics|mixpanel|segment\.com|student profile/i);
  assert.doesNotMatch(gameJs, /FIELDTEST_STORAGE_KEY/);
});

if (failures.length) {
  console.error("\n" + failures.length + " failed");
  process.exit(1);
}
console.log("\nAll TerrainBound Phase 7.9I field-test harness checks passed.");
