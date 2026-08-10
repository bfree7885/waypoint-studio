#!/usr/bin/env node
/**
 * Product Board self-tests (no external deps).
 * Run: node ops/product-board/board.mjs test
 *   or: node ops/product-board/tests/board.test.mjs
 */
import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

import * as severity from "../lib/severity.mjs";
import * as roles from "../lib/roles.mjs";
import * as backlog from "../lib/backlog.mjs";
import * as boardState from "../lib/board-state.mjs";
import * as routing from "../lib/routing.mjs";
import * as loop from "../lib/loop.mjs";
import * as subscriber from "../lib/subscriber-ready.mjs";
import * as inventory from "../lib/inventory.mjs";
import * as verdicts from "../lib/verdicts.mjs";
import * as attestations from "../lib/attestations.mjs";
import * as commercial from "../lib/commercial-reviewer.mjs";
import * as redTeam from "../lib/red-team.mjs";
import * as evidence from "../lib/evidence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOARD_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(BOARD_ROOT, "../..");
const BOARD_CLI = path.join(BOARD_ROOT, "board.mjs");

let passed = 0;
let failed = 0;

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
  }
}

async function withTempState(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-product-board-"));
  const prev = process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR;
  process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR = dir;
  try {
    return await fn(dir);
  } finally {
    if (prev === undefined) delete process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR;
    else process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function findStatus(itemsBacklog, id) {
  return itemsBacklog.items.find((i) => i.id === id)?.status;
}

console.log("\n=== Product Board tests ===\n");

await testAsync("severity model is P0–P4 with subscriber blockers", async () => {
  assert.deepEqual(
    severity.SEVERITIES.map((s) => s.id),
    ["P0", "P1", "P2", "P3", "P4"]
  );
  assert.equal(severity.blocksSubscriberReady("P0"), true);
  assert.equal(severity.blocksSubscriberReady("P1"), true);
  assert.equal(severity.blocksSubscriberReady("P2"), true);
  assert.equal(severity.blocksSubscriberReady("P3"), false);
  assert.equal(severity.blocksSubscriberReady("P4"), false);
  assert.ok(severity.compareSeverity("P0", "P2") < 0);
  assert.throws(() => severity.assertSeverity("P5"));
});

await testAsync("exact verdicts only: NOT READY | CONDITIONALLY READY | SUBSCRIBER READY", async () => {
  assert.deepEqual(verdicts.VERDICT_LIST, [
    "NOT READY",
    "CONDITIONALLY READY",
    "SUBSCRIBER READY"
  ]);
  assert.equal(
    verdicts.computeVerdict({ p0p1Open: true }),
    "NOT READY"
  );
  assert.equal(
    verdicts.computeVerdict({
      attestationsIncomplete: true
    }),
    "CONDITIONALLY READY"
  );
  assert.equal(verdicts.computeVerdict({}), "SUBSCRIBER READY");
  assert.equal(
    verdicts.computeVerdict({ requiredCheckFailed: true }),
    "NOT READY"
  );
  assert.equal(
    verdicts.computeVerdict({ fakeAsReal: true }),
    "NOT READY"
  );
  assert.equal(
    verdicts.computeVerdict({ redTeamDisproved: true }),
    "NOT READY"
  );
  assert.equal(
    verdicts.computeVerdict({ commercialWouldCancel: true }),
    "NOT READY"
  );
  // Tests-pass theater: pending commercial/red-team → conditional, never ready
  assert.equal(
    verdicts.computeVerdict({
      commercialPending: true,
      redTeamPending: true
    }),
    "CONDITIONALLY READY"
  );
});

await testAsync("fixture P0 open work → NOT READY", async () => {
  await withTempState(async () => {
    const gate = subscriber.evaluateFixture({
      items: [
        {
          id: "WB-P0",
          title: "Fabricated Live weather",
          severity: "P0",
          status: "ready",
          blocksSubscriberReady: true
        }
      ],
      commercialForced: "pending",
      redTeamForced: "pending"
    });
    assert.equal(gate.verdict, "NOT READY");
    assert.ok(gate.findings.some((f) => f.id === "open-p0-p1-work"));
  });
});

await testAsync("fixture P1 open work → NOT READY", async () => {
  await withTempState(async () => {
    const gate = subscriber.evaluateFixture({
      items: [
        {
          id: "WB-P1",
          title: "Primary Save control dead",
          severity: "P1",
          status: "ready",
          blocksSubscriberReady: true
        }
      ],
      commercialForced: "pending",
      redTeamForced: "pending"
    });
    assert.equal(gate.verdict, "NOT READY");
  });
});

await testAsync("fixture P2 only + pending attestations → CONDITIONALLY READY (not SUBSCRIBER READY)", async () => {
  await withTempState(async () => {
    const gate = subscriber.evaluateFixture({
      items: [
        {
          id: "WB-P2",
          title: "Major spacing regression",
          severity: "P2",
          status: "ready",
          blocksSubscriberReady: true
        }
      ],
      // Force commercial/red-team out of auto-fail from empty probes
      commercialForced: "pending",
      redTeamForced: "pending"
    });
    assert.equal(gate.verdict, "CONDITIONALLY READY");
    assert.notEqual(gate.verdict, "SUBSCRIBER READY");
  });
});

await testAsync("empty board without attestations cannot be SUBSCRIBER READY", async () => {
  await withTempState(async () => {
    const gate = subscriber.evaluateFixture({
      items: [],
      commercialForced: "pending",
      redTeamForced: "pending"
    });
    assert.notEqual(gate.verdict, "SUBSCRIBER READY");
    assert.ok(
      gate.verdict === "CONDITIONALLY READY" || gate.verdict === "NOT READY"
    );
  });
});

await testAsync("full attestations + commercial pass + red-team pass → SUBSCRIBER READY", async () => {
  await withTempState(async () => {
    const gateDef = subscriber.loadSubscriberReadyGate();
    for (const c of gateDef.criteria.filter((x) => x.kind === "policy")) {
      attestations.recordAttestation({
        criterionId: c.id,
        role: "release-manager",
        verdict: "pass",
        notes: "Fixture attestation for self-test"
      });
    }
    const gate = subscriber.evaluateFixture({
      items: [],
      commercialForced: "pass",
      redTeamForced: "pass"
    });
    assert.equal(gate.verdict, "SUBSCRIBER READY");
  });
});

await testAsync("commercial reviewer fails on P0 cancel risk", async () => {
  const review = commercial.runCommercialReview({
    probeFindings: [
      {
        id: "sample-as-live",
        severity: "P0",
        message: "Demo labeled Live"
      }
    ]
  });
  assert.equal(review.status, "fail");
  assert.equal(review.wouldCancel, true);
});

await testAsync("red team refuses to auto-accept engineering ready + tests-pass", async () => {
  const rt = redTeam.runRedTeam({
    engineeringVerdictHint: "SUBSCRIBER READY",
    qaChecks: [
      { id: "t", kind: "command", status: "pass", required: true, title: "tests" }
    ],
    attestations: { complete: false, pending: ["x"] }
  });
  assert.equal(rt.disproved, true);
  assert.equal(rt.status, "fail");
  assert.ok(rt.rejectedAutoAccept);
  assert.ok(rt.disproofs.some((d) => d.id === "redteam:reject-eng-self-cert"));
});

await testAsync("evidence package writes machine-readable artifacts", async () => {
  await withTempState(async (dir) => {
    const run = evidence.createEvidenceRun({ campaign: "self-test" });
    evidence.addEvidenceEntry(run, {
      id: "auto-1",
      kind: "automated_tests",
      status: "pass",
      summary: "fixture",
      data: { ok: true }
    });
    const fin = evidence.finalizeEvidenceRun(run, { verdict: "NOT READY" });
    assert.ok(fs.existsSync(fin.summaryPath));
    assert.ok(fs.existsSync(path.join(dir, "evidence", run.runId, "manifest.json")));
    const summary = JSON.parse(fs.readFileSync(fin.summaryPath, "utf8"));
    assert.equal(summary.verdict, "NOT READY");
  });
});

await testAsync("loop phases and permanent roles exist", async () => {
  assert.equal(roles.LOOP_PHASES.length, 8);
  assert.equal(roles.LOOP_PHASES[0], "discover");
  assert.equal(roles.LOOP_PHASES.at(-1), "release_gate");
  assert.equal(roles.nextPhase("release_gate"), "discover");
  assert.ok(roles.ROLE_CATALOG.length >= 11);
  assert.ok(roles.roleById("red-team"));
  assert.ok(roles.roleById("commercial-subscriber"));
  assert.ok(roles.rolesForPhase("visual_review").length > 0);
});

await testAsync("failed review routes to fix and blocks gate with NOT READY", async () => {
  await withTempState(async () => {
    const state = boardState.loadBoardState();
    const bl = backlog.loadBacklog();
    const item = routing.routeFailedReview({
      state,
      backlog: bl,
      findings: "Dead Save control on primary journey",
      severity: "P1",
      phase: "visual_review"
    });
    assert.match(item.id, /^WB-\d+$/);
    assert.equal(item.status, "fix");
    assert.equal(state.phase, "fix");
    assert.equal(state.releaseGate.verdict, "NOT READY");
    assert.ok(state.routing.openRepairQueue.includes(item.id));
    backlog.saveBacklog(bl);
    boardState.saveBoardState(state);

    const gate = subscriber.evaluateSubscriberReady({
      backlog: bl,
      state,
      runCommands: false,
      runProbes: false,
      persistEvidence: false,
      commercialForced: "pending",
      redTeamForced: "pending"
    });
    assert.equal(gate.verdict, "NOT READY");
    assert.ok(gate.findings.some((f) => f.id === "open-repair-queue"));

    routing.markRepairRetest({
      state,
      backlog: bl,
      itemId: item.id,
      passed: true,
      notes: "Retest passed"
    });
    assert.equal(findStatus(bl, item.id), "done");
    assert.equal(state.routing.openRepairQueue.length, 0);
  });
});

await testAsync("prioritize sorts by severity then id", async () => {
  await withTempState(async () => {
    const bl = backlog.loadBacklog();
    backlog.addWorkItem(bl, { title: "Polish spacing", severity: "P3" });
    backlog.addWorkItem(bl, { title: "Security hole", severity: "P0" });
    backlog.addWorkItem(bl, { title: "Broken nav", severity: "P1" });
    const q = backlog.prioritizedQueue(bl);
    assert.equal(q[0].severity, "P0");
    assert.equal(q[1].severity, "P1");
    assert.equal(q[2].severity, "P3");
  });
});

await testAsync("advanceLoop moves phase and assigns role", async () => {
  await withTempState(async () => {
    const state = boardState.loadBoardState();
    const bl = backlog.loadBacklog();
    backlog.addWorkItem(bl, { title: "Fix loader", severity: "P1" });
    state.phase = "prioritize";
    const step = loop.advanceLoop(state, bl);
    assert.equal(step.from, "prioritize");
    assert.equal(step.to, "fix");
    assert.equal(state.phase, "fix");
    assert.ok(state.activeRole);
    assert.ok(state.activeItemId);
  });
});

await testAsync("inventory includes recovered engineering OS and classifications", async () => {
  const summary = inventory.summarizeInventory();
  assert.ok(summary.total >= 10);
  assert.ok(summary.counts.implemented >= 1);
  assert.ok(summary.counts.obsolete >= 1);
  assert.ok(summary.counts.missing >= 1);
  assert.ok(
    inventory.INFRASTRUCTURE_INVENTORY.some((r) => r.id === "engineering-os")
  );
  assert.ok(
    inventory.INFRASTRUCTURE_INVENTORY.some((r) => r.id === "product-board")
  );
});

await testAsync("CLI help and status exit 0", async () => {
  const help = spawnSync(process.execPath, [BOARD_CLI, "help"], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Product Board/);
  assert.match(help.stdout, /NOT READY/);

  const status = spawnSync(process.execPath, [BOARD_CLI, "status"], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /Phase:/);
});

await testAsync("fail-review CLI creates repair item in temp state", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-pb-cli-"));
  try {
    const fail = spawnSync(
      process.execPath,
      [
        BOARD_CLI,
        "fail-review",
        "--findings",
        "Unreadable contrast on CTA",
        "--severity",
        "P2"
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, WAYPOINT_PRODUCT_BOARD_STATE_DIR: dir }
      }
    );
    assert.equal(fail.status, 0, fail.stderr + fail.stdout);
    assert.match(fail.stdout, /Routed repair item: WB-/);
    const bl = JSON.parse(
      fs.readFileSync(path.join(dir, "backlog.json"), "utf8")
    );
    assert.ok(bl.items.some((i) => i.status === "fix"));
    const board = JSON.parse(
      fs.readFileSync(path.join(dir, "board.json"), "utf8")
    );
    assert.equal(board.releaseGate.verdict, "NOT READY");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await testAsync("gate CLI --skip-commands --skip-probes writes verdict + evidence", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-pb-gate-"));
  try {
    const run = spawnSync(
      process.execPath,
      [BOARD_CLI, "gate", "--skip-commands", "--skip-probes"],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, WAYPOINT_PRODUCT_BOARD_STATE_DIR: dir }
      }
    );
    // Expect non-zero (not subscriber ready) but executable
    assert.ok(run.status === 2 || run.status === 3, run.stdout + run.stderr);
    assert.match(run.stdout, /Verdict:/);
    assert.match(
      run.stdout,
      /NOT READY|CONDITIONALLY READY|SUBSCRIBER READY/
    );
    const board = JSON.parse(
      fs.readFileSync(path.join(dir, "board.json"), "utf8")
    );
    assert.ok(board.releaseGate.verdict);
    assert.ok(board.releaseGate.evidenceRunId);
    const evDir = path.join(dir, "evidence", board.releaseGate.evidenceRunId);
    assert.ok(fs.existsSync(path.join(evDir, "summary.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await testAsync("attest CLI records policy attestation", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-pb-attest-"));
  try {
    const run = spawnSync(
      process.execPath,
      [
        BOARD_CLI,
        "attest",
        "--criterion",
        "honest-data",
        "--role",
        "data-reliability",
        "--verdict",
        "pass",
        "--notes",
        "Fixture attest"
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, WAYPOINT_PRODUCT_BOARD_STATE_DIR: dir }
      }
    );
    assert.equal(run.status, 0, run.stderr + run.stdout);
    const atts = JSON.parse(
      fs.readFileSync(path.join(dir, "attestations.json"), "utf8")
    );
    assert.ok(atts.records.some((r) => r.criterionId === "honest-data"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await testAsync("signalterrain campaign is registered with product path + remaps", async () => {
  const { getCampaign, assertCampaignProductExists, campaignCommandRemap, campaignScanRoots } =
    await import("../lib/campaigns.mjs");
  const c = getCampaign("signalterrain");
  assert.ok(c, "signalterrain campaign exists");
  assert.equal(c.productPath, "apps/signalterrain");
  assert.ok(campaignScanRoots("signalterrain").includes("apps/signalterrain"));
  const remap = campaignCommandRemap("signalterrain");
  assert.ok(remap["production-build"].includes("verify-signalterrain-production"));
  assert.ok(remap["platform-foundation"].includes("test-signalterrain-cyber-live"));
  const abs = assertCampaignProductExists("signalterrain");
  assert.ok(fs.existsSync(abs));
  assert.ok(
    fs.existsSync(path.join(REPO_ROOT, "automation/verify-signalterrain-production.mjs"))
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exitCode = failed ? 1 : 0;
