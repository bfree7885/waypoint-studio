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

await testAsync("loop phases and permanent roles exist", async () => {
  assert.equal(roles.LOOP_PHASES.length, 8);
  assert.equal(roles.LOOP_PHASES[0], "discover");
  assert.equal(roles.LOOP_PHASES.at(-1), "release_gate");
  assert.equal(roles.nextPhase("release_gate"), "discover");
  assert.ok(roles.ROLE_CATALOG.length >= 11);
  assert.ok(roles.roleById("red-team"));
  assert.ok(roles.rolesForPhase("visual_review").length > 0);
});

await testAsync("failed review routes to fix and blocks gate", async () => {
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
    assert.equal(state.releaseGate.verdict, "NOT_SUBSCRIBER_READY");
    assert.ok(state.routing.openRepairQueue.includes(item.id));
    backlog.saveBacklog(bl);
    boardState.saveBoardState(state);

    const gate = subscriber.evaluateSubscriberReady({
      backlog: bl,
      state,
      runCommands: false
    });
    assert.equal(gate.verdict, "NOT_SUBSCRIBER_READY");
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
    assert.equal(board.releaseGate.verdict, "NOT_SUBSCRIBER_READY");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exitCode = failed ? 1 : 0;
