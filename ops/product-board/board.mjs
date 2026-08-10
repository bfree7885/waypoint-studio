#!/usr/bin/env node
/**
 * Waypoint Studio — Product Board (Agent Ops execution layer)
 *
 * Primary command:
 *   node ops/product-board/board.mjs <command>
 *
 * Recovered predecessor:
 *   node engineering/orchestrator/run.mjs status
 */
import { loadBoardState, saveBoardState, appendLoopEvent } from "./lib/board-state.mjs";
import {
  loadBacklog,
  saveBacklog,
  addWorkItem,
  findItem,
  prioritizedQueue,
  openBlockingItems,
  syncEngineeringBacklog
} from "./lib/backlog.mjs";
import { SEVERITIES, assertSeverity } from "./lib/severity.mjs";
import { ROLE_CATALOG, LOOP_PHASES, rolesForPhase } from "./lib/roles.mjs";
import { INFRASTRUCTURE_INVENTORY, summarizeInventory } from "./lib/inventory.mjs";
import { advanceLoop, setPhase } from "./lib/loop.mjs";
import { routeFailedReview, markRepairRetest } from "./lib/routing.mjs";
import { evaluateSubscriberReady } from "./lib/subscriber-ready.mjs";
import { nowIso } from "./lib/io.mjs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { REPO_ROOT } from "./lib/paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMMANDS = {
  help: "help",
  status: "status",
  inventory: "inventory",
  discover: "discover",
  prioritize: "prioritize",
  next: "next",
  "add-item": "add-item",
  "fail-review": "fail-review",
  "retest-result": "retest-result",
  gate: "gate",
  "subscriber-ready": "gate",
  sync: "sync",
  roles: "roles",
  test: "test",
  loop: "next"
};

function normalizeCommand(argv) {
  const raw = (argv[2] || "help").trim().toLowerCase();
  return COMMANDS[raw] || raw;
}

function printHeader(title) {
  console.log(`\n=== Waypoint Product Board — ${title} ===\n`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 3; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function cmdHelp() {
  printHeader("Help");
  console.log(`Runnable command:
  node ops/product-board/board.mjs <command>

Commands:
  status              Board + backlog summary
  inventory           Recovered infrastructure inventory
  discover            Seed/refresh discovery notes + sync engineering backlog
  prioritize          Show P0–P4 queue
  next                Advance DISCOVER→…→RELEASE GATE loop one step
  add-item            --title T --severity P0..P4 [--area A] [--notes N]
  fail-review         --findings TEXT [--item WB-001] [--severity P1] [--title T]
  retest-result       --item WB-001 --pass|--fail [--notes N]
  gate                Evaluate formal Subscriber Ready gate
  sync                Import open engineering WE-* tasks
  roles               List permanent executable roles
  test                Run Product Board self-tests
  help

Long-term loop:
  ${LOOP_PHASES.join(" → ")}

Standing bar: SUBSCRIBER READY (not merely \"tests pass\").
Recovered Engineering OS: node engineering/orchestrator/run.mjs status
`);
}

function cmdStatus() {
  printHeader("Status");
  const state = loadBoardState();
  const backlog = loadBacklog();
  const queue = prioritizedQueue(backlog);
  const blocking = openBlockingItems(backlog);
  console.log("Mode:", state.mode);
  console.log("Phase:", state.phase);
  console.log("Active role:", state.activeRole);
  console.log("Active item:", state.activeItemId || "(none)");
  console.log("Campaign:", state.campaign || "(none)");
  console.log("Repair queue:", (state.routing?.openRepairQueue || []).join(", ") || "(empty)");
  console.log(
    "Release gate:",
    state.releaseGate?.verdict || state.releaseGate?.status || "not_run"
  );
  console.log("Open items:", backlog.items?.length || 0);
  console.log("Blocking P0–P2:", blocking.length);
  console.log("\nTop queue:");
  queue.slice(0, 8).forEach((i) => {
    console.log(`  - ${i.severity} ${i.id} [${i.status}] ${i.title}`);
  });
  if (!queue.length) console.log("  (empty)");
}

function cmdInventory() {
  printHeader("Infrastructure Inventory");
  const summary = summarizeInventory();
  console.log("Total:", summary.total);
  console.log("Counts:", JSON.stringify(summary.counts));
  console.log("");
  for (const row of INFRASTRUCTURE_INVENTORY) {
    console.log(`[${row.classification}] ${row.id}`);
    console.log(`  path: ${row.path}`);
    console.log(`  ${row.title}`);
    console.log(`  ${row.notes}`);
    console.log("");
  }
}

function cmdDiscover() {
  printHeader("Discover");
  const state = loadBoardState();
  const backlog = loadBacklog();
  const sync = syncEngineeringBacklog(backlog);
  setPhase(state, "discover", "product-director");
  state.mode = "discover";
  state.lastCommand = "discover";
  state.lastCommandAt = nowIso();
  state.notes = [
    "Discovery refreshed from Engineering OS + static inventory.",
    `Synced engineering tasks: imported=${sync.imported} skipped=${sync.skipped}`,
    "Next: prioritize, then next."
  ];
  appendLoopEvent(state, "discover", sync);
  saveBacklog(backlog);
  saveBoardState(state);
  console.log("Synced engineering backlog:", sync);
  console.log("Inventory rows:", INFRASTRUCTURE_INVENTORY.length);
  console.log("Open board items:", backlog.items.length);
  console.log("Next: node ops/product-board/board.mjs prioritize");
}

function cmdPrioritize() {
  printHeader("Prioritize");
  const state = loadBoardState();
  const backlog = loadBacklog();
  setPhase(state, "prioritize", "product-director");
  state.lastCommand = "prioritize";
  state.lastCommandAt = nowIso();
  const queue = prioritizedQueue(backlog);
  console.log("Severity model:");
  SEVERITIES.forEach((s) => {
    console.log(
      `  ${s.id} — ${s.title}${s.blocksSubscriberReady ? " [blocks Subscriber Ready]" : ""}`
    );
  });
  console.log("\nPrioritized queue:");
  queue.forEach((i, idx) => {
    console.log(`${idx + 1}. ${i.severity} ${i.id} [${i.status}] ${i.title}`);
  });
  if (!queue.length) console.log("(empty — run discover or add-item)");
  state.activeItemId = queue[0]?.id || null;
  appendLoopEvent(state, "prioritize", { top: state.activeItemId });
  saveBoardState(state);
}

function cmdNext() {
  printHeader("Advance Loop");
  const state = loadBoardState();
  const backlog = loadBacklog();
  const step = advanceLoop(state, backlog);
  state.lastCommand = "next";
  state.lastCommandAt = nowIso();
  saveBacklog(backlog);
  saveBoardState(state);
  console.log(`${step.from} → ${step.to}`);
  console.log("Active role:", state.activeRole);
  console.log(
    "Owning roles:",
    step.roles.map((r) => r.id).join(", ") || "(none)"
  );
  if (step.activeItem) {
    console.log(
      "Active item:",
      step.activeItem.id,
      "—",
      step.activeItem.title
    );
  } else {
    console.log("Active item: (none — add or discover work)");
  }
  if (step.to === "release_gate") {
    console.log("\nNext: node ops/product-board/board.mjs gate");
  }
}

function cmdAddItem(args) {
  printHeader("Add Item");
  if (!args.title || !args.severity) {
    console.error("Usage: add-item --title T --severity P0..P4 [--area A] [--notes N]");
    process.exitCode = 1;
    return;
  }
  assertSeverity(args.severity);
  const backlog = loadBacklog();
  const item = addWorkItem(backlog, {
    title: args.title,
    severity: args.severity,
    area: args.area || "general",
    notes: args.notes || "",
    status: "ready"
  });
  saveBacklog(backlog);
  const state = loadBoardState();
  state.lastCommand = "add-item";
  state.lastCommandAt = nowIso();
  appendLoopEvent(state, "item_added", { id: item.id, severity: item.severity });
  saveBoardState(state);
  console.log("Created", item.id, item.severity, item.title);
}

function cmdFailReview(args) {
  printHeader("Failed Review → Repair Route");
  if (!args.findings) {
    console.error(
      "Usage: fail-review --findings TEXT [--item WB-001] [--severity P1] [--title T]"
    );
    process.exitCode = 1;
    return;
  }
  const state = loadBoardState();
  const backlog = loadBacklog();
  const item = routeFailedReview({
    state,
    backlog,
    itemId: args.item || null,
    title: args.title,
    severity: args.severity || "P1",
    findings: args.findings,
    phase: args.phase || state.phase,
    area: args.area || "review"
  });
  state.lastCommand = "fail-review";
  state.lastCommandAt = nowIso();
  saveBacklog(backlog);
  saveBoardState(state);
  console.log("Routed repair item:", item.id);
  console.log("Phase forced to: fix");
  console.log("Release gate:", state.releaseGate.verdict);
  console.log("Standing rule: do not stop at a report — fix, then retest-result.");
}

function cmdRetestResult(args) {
  printHeader("Retest Result");
  if (!args.item || (!args.pass && !args.fail)) {
    console.error("Usage: retest-result --item WB-001 --pass|--fail [--notes N]");
    process.exitCode = 1;
    return;
  }
  const state = loadBoardState();
  const backlog = loadBacklog();
  const item = markRepairRetest({
    state,
    backlog,
    itemId: args.item,
    passed: Boolean(args.pass) && !args.fail,
    notes: args.notes || ""
  });
  state.lastCommand = "retest-result";
  state.lastCommandAt = nowIso();
  saveBacklog(backlog);
  saveBoardState(state);
  console.log("Item:", item.id, "status:", item.status);
  console.log("Repair queue:", state.routing.openRepairQueue.join(", ") || "(empty)");
}

function cmdGate(args) {
  printHeader("Subscriber Ready Gate");
  const state = loadBoardState();
  const backlog = loadBacklog();
  setPhase(state, "release_gate", "release-manager");
  const skipCommands = Boolean(args["skip-commands"]);
  const result = evaluateSubscriberReady({
    backlog,
    state,
    runCommands: !skipCommands
  });
  state.releaseGate = {
    status: result.verdict === "SUBSCRIBER_READY" ? "passed" : "blocked",
    lastRunAt: result.evaluatedAt,
    verdict: result.verdict,
    blockingFindings: result.findings
  };
  state.lastCommand = "gate";
  state.lastCommandAt = nowIso();
  appendLoopEvent(state, "subscriber_ready_gate", {
    verdict: result.verdict,
    findingCount: result.findings.length
  });
  saveBoardState(state);

  console.log("Verdict:", result.verdict);
  console.log("\nPrinciples:");
  result.principles.forEach((p) => console.log("  -", p));
  console.log("\nChecks:");
  result.checks.forEach((c) => {
    console.log(`  [${c.status}] ${c.id} — ${c.title}`);
  });
  if (result.findings.length) {
    console.log("\nFindings:");
    result.findings.forEach((f) => {
      console.log(`  - ${f.severity || "?"} ${f.id}: ${f.message}`);
    });
  }
  if (result.verdict !== "SUBSCRIBER_READY") {
    console.log(
      "\nNot Subscriber Ready. Create/route work with fail-review or fix open blockers, then re-run gate."
    );
    process.exitCode = 2;
  }
}

function cmdSync() {
  printHeader("Sync Engineering Backlog");
  const backlog = loadBacklog();
  const sync = syncEngineeringBacklog(backlog);
  saveBacklog(backlog);
  console.log(sync);
}

function cmdRoles() {
  printHeader("Permanent Roles");
  ROLE_CATALOG.forEach((r) => {
    console.log(`${r.id} — ${r.title}`);
    console.log(`  engineering agent: ${r.engineeringAgent}`);
    console.log(`  owns: ${r.owns.join(", ")}`);
    console.log(`  ${r.mission}`);
    console.log("");
  });
  console.log("Phase owners:");
  LOOP_PHASES.forEach((p) => {
    console.log(
      `  ${p}: ${rolesForPhase(p)
        .map((r) => r.id)
        .join(", ")}`
    );
  });
}

function cmdTest() {
  printHeader("Self-Test");
  const testFile = path.join(__dirname, "tests", "board.test.mjs");
  const result = spawnSync(process.execPath, [testFile], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "inherit"
  });
  process.exitCode = result.status ?? 1;
}

function main() {
  const cmd = normalizeCommand(process.argv);
  const args = parseArgs(process.argv);
  switch (cmd) {
    case "help":
      return cmdHelp();
    case "status":
      return cmdStatus();
    case "inventory":
      return cmdInventory();
    case "discover":
      return cmdDiscover();
    case "prioritize":
      return cmdPrioritize();
    case "next":
      return cmdNext();
    case "add-item":
      return cmdAddItem(args);
    case "fail-review":
      return cmdFailReview(args);
    case "retest-result":
      return cmdRetestResult(args);
    case "gate":
      return cmdGate(args);
    case "sync":
      return cmdSync();
    case "roles":
      return cmdRoles();
    case "test":
      return cmdTest();
    default:
      console.error("Unknown command:", process.argv[2]);
      cmdHelp();
      process.exitCode = 1;
  }
}

main();
