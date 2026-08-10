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
import { evaluateSubscriberReady, VERDICTS } from "./lib/subscriber-ready.mjs";
import { recordAttestation, loadAttestations } from "./lib/attestations.mjs";
import {
  listCampaigns,
  getCampaign,
  assertCampaignProductExists
} from "./lib/campaigns.mjs";
import { nowIso } from "./lib/io.mjs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { REPO_ROOT } from "./lib/paths.mjs";
import fs from "fs";

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
  attest: "attest",
  sync: "sync",
  roles: "roles",
  campaign: "campaign",
  test: "test",
  loop: "next",
  evidence: "evidence"
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
  subscriber-ready    Alias for gate
  attest              Record policy attestation
                      --criterion ID --role ROLE --verdict pass|fail|waive [--notes N]
  evidence            Show latest gate evidence package path
  sync                Import open engineering WE-* tasks
  roles               List permanent executable roles
  campaign            Set/list active product campaign (sheds | signalterrain)
  test                Run Product Board self-tests
  help

Gate options:
  gate [--skip-commands] [--skip-probes] [--campaign NAME]

Campaigns (one board, many products):
  sheds               Sheds MSP / Subscriber Ready pilot
  signalterrain       SignalTerrain MSP (apps/signalterrain)

SignalTerrain MSP launch (when authorized):
  node ops/product-board/board.mjs campaign signalterrain
  node ops/product-board/board.mjs discover
  node ops/product-board/board.mjs prioritize
  node ops/product-board/board.mjs gate --campaign signalterrain

Verdicts (exact): NOT READY | CONDITIONALLY READY | SUBSCRIBER READY

Long-term loop:
  ${LOOP_PHASES.join(" → ")}

Standing bar: SUBSCRIBER READY (not merely \"tests pass\").
Commercial reviewer + Red Team are independent — tests alone never approve.
Recovered Engineering OS: node engineering/orchestrator/run.mjs status
`);
}

function cmdStatus() {
  printHeader("Status");
  const state = loadBoardState();
  const backlog = loadBacklog();
  const campaignId = state.campaign || null;
  const queue = prioritizedQueue(backlog, campaignId);
  const blocking = openBlockingItems(backlog, campaignId);
  console.log("Mode:", state.mode);
  console.log("Phase:", state.phase);
  console.log("Active role:", state.activeRole);
  console.log("Active item:", state.activeItemId || "(none)");
  console.log("Campaign:", campaignId || "(none)");
  if (campaignId) {
    const c = getCampaign(campaignId);
    if (c) console.log("Product path:", c.productPath);
  }
  console.log("Repair queue:", (state.routing?.openRepairQueue || []).join(", ") || "(empty)");
  console.log(
    "Release gate:",
    state.releaseGate?.verdict || state.releaseGate?.status || "not_run"
  );
  console.log("Open items:", backlog.items?.length || 0);
  console.log("Blocking P0–P2 (campaign scope):", blocking.length);
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

function cmdDiscover(args = {}) {
  printHeader("Discover");
  const state = loadBoardState();
  const backlog = loadBacklog();
  if (args.campaign) {
    const id = String(args.campaign);
    if (!getCampaign(id)) {
      console.error("Unknown campaign:", id);
      console.error(
        "Known:",
        listCampaigns()
          .map((c) => c.id)
          .join(", ")
      );
      process.exitCode = 1;
      return;
    }
    assertCampaignProductExists(id);
    state.campaign = id;
  }
  const sync = syncEngineeringBacklog(backlog);
  setPhase(state, "discover", "product-director");
  state.mode = "discover";
  state.lastCommand = "discover";
  state.lastCommandAt = nowIso();
  const campaignNote = state.campaign
    ? `Active campaign: ${state.campaign} → ${getCampaign(state.campaign)?.productPath}`
    : "No campaign set (platform-wide discover).";
  state.notes = [
    "Discovery refreshed from Engineering OS + static inventory.",
    campaignNote,
    `Synced engineering tasks: imported=${sync.imported} skipped=${sync.skipped}`,
    "Next: prioritize, then next."
  ];
  appendLoopEvent(state, "discover", { ...sync, campaign: state.campaign });
  saveBacklog(backlog);
  saveBoardState(state);
  console.log("Campaign:", state.campaign || "(none)");
  console.log("Synced engineering backlog:", sync);
  console.log("Inventory rows:", INFRASTRUCTURE_INVENTORY.length);
  console.log("Open board items:", backlog.items.length);
  console.log("Next: node ops/product-board/board.mjs prioritize");
}

function cmdPrioritize(args = {}) {
  printHeader("Prioritize");
  const state = loadBoardState();
  const backlog = loadBacklog();
  if (args.campaign) state.campaign = String(args.campaign);
  setPhase(state, "prioritize", "product-director");
  state.lastCommand = "prioritize";
  state.lastCommandAt = nowIso();
  const queue = prioritizedQueue(backlog, state.campaign || null);
  console.log("Campaign:", state.campaign || "(none)");
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
  appendLoopEvent(state, "prioritize", {
    top: state.activeItemId,
    campaign: state.campaign || null
  });
  saveBoardState(state);
}

function cmdCampaign(args = {}) {
  printHeader("Campaign");
  const state = loadBoardState();
  const id = args._?.[0] || args.campaign || args.set || null;
  if (!id) {
    console.log("Active:", state.campaign || "(none)");
    console.log("\nKnown campaigns:");
    listCampaigns().forEach((c) => {
      console.log(`  ${c.id} — ${c.title} (${c.productPath})`);
    });
    console.log("\nSet: node ops/product-board/board.mjs campaign signalterrain");
    return;
  }
  const campaign = getCampaign(String(id));
  if (!campaign) {
    console.error("Unknown campaign:", id);
    process.exitCode = 1;
    return;
  }
  const abs = assertCampaignProductExists(campaign.id);
  state.campaign = campaign.id;
  // Switching campaign clears gate claim for the previous product.
  state.releaseGate = {
    status: "not_run",
    lastRunAt: null,
    verdict: null,
    blockingFindings: [],
    evidenceRunId: null
  };
  state.phase = "discover";
  state.activeRole = "product-director";
  state.mode = "loop";
  state.lastCommand = "campaign";
  state.lastCommandAt = nowIso();
  state.notes = [
    `Campaign set to ${campaign.id}.`,
    `Product path: ${campaign.productPath} → ${abs}`,
    campaign.mspDoc ? `MSP freeze: ${campaign.mspDoc}` : "No MSP freeze doc.",
    "Run discover → prioritize → gate --campaign " + campaign.id
  ];
  appendLoopEvent(state, "campaign_set", { campaign: campaign.id, path: abs });
  saveBoardState(state);
  console.log("Campaign:", campaign.id);
  console.log("Title:", campaign.title);
  console.log("Product path:", campaign.productPath);
  console.log("Absolute:", abs);
  if (campaign.mspDoc) console.log("MSP freeze:", campaign.mspDoc);
  console.log("Release gate reset to not_run for campaign switch.");
  console.log("\nNext:");
  console.log("  node ops/product-board/board.mjs discover");
  console.log("  node ops/product-board/board.mjs prioritize");
  console.log(`  node ops/product-board/board.mjs gate --campaign ${campaign.id}`);
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
  if (args.campaign) state.campaign = String(args.campaign);
  const skipCommands = Boolean(args["skip-commands"]);
  const skipProbes = Boolean(args["skip-probes"]);
  const result = evaluateSubscriberReady({
    backlog,
    state,
    runCommands: !skipCommands,
    runProbes: !skipProbes,
    persistEvidence: true,
    campaign: state.campaign
  });
  const passed = result.verdict === VERDICTS.SUBSCRIBER_READY;
  const conditional = result.verdict === VERDICTS.CONDITIONALLY_READY;
  state.releaseGate = {
    status: passed ? "passed" : conditional ? "conditional" : "blocked",
    lastRunAt: result.evaluatedAt,
    verdict: result.verdict,
    blockingFindings: result.findings,
    evidenceRunId: result.evidence?.runId || null,
    commercial: {
      status: result.commercial?.status,
      wouldCancel: result.commercial?.wouldCancel,
      summary: result.commercial?.summary
    },
    redTeam: {
      status: result.redTeam?.status,
      disproved: result.redTeam?.disproved,
      summary: result.redTeam?.summary
    },
    attestations: result.attestations,
    dimensions: result.dimensions
  };
  state.lastCommand = "gate";
  state.lastCommandAt = nowIso();
  appendLoopEvent(state, "subscriber_ready_gate", {
    verdict: result.verdict,
    findingCount: result.findings.length,
    evidenceRunId: result.evidence?.runId || null
  });
  saveBoardState(state);

  console.log("Verdict:", result.verdict);
  console.log("Evidence:", result.evidence?.dir || "(not persisted)");
  console.log("\nCommercial:", result.commercial?.status, "—", result.commercial?.summary);
  console.log("Red Team:", result.redTeam?.status, "—", result.redTeam?.summary);
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
  if (!passed) {
    console.log(
      `\n${result.verdict}. Fix blockers / complete attestations / satisfy Red Team + Commercial, then re-run gate.`
    );
    console.log(
      "Attest: node ops/product-board/board.mjs attest --criterion ID --role ROLE --verdict pass --notes \"…\""
    );
    process.exitCode = conditional ? 3 : 2;
  }
}

function cmdAttest(args) {
  printHeader("Record Attestation");
  if (!args.criterion || !args.role || !args.verdict) {
    console.error(
      "Usage: attest --criterion ID --role ROLE --verdict pass|fail|waive [--notes N] [--campaign C]"
    );
    process.exitCode = 1;
    return;
  }
  const record = recordAttestation({
    criterionId: args.criterion,
    role: args.role,
    verdict: args.verdict,
    notes: args.notes || "",
    campaign: args.campaign || null
  });
  const state = loadBoardState();
  state.lastCommand = "attest";
  state.lastCommandAt = nowIso();
  appendLoopEvent(state, "attestation_recorded", {
    criterionId: record.criterionId,
    role: record.role,
    verdict: record.verdict
  });
  saveBoardState(state);
  console.log("Recorded", record.id, record.criterionId, record.verdict, "by", record.role);
  console.log("Re-run: node ops/product-board/board.mjs gate");
}

function cmdEvidence() {
  printHeader("Latest Gate Evidence");
  const state = loadBoardState();
  const runId = state.releaseGate?.evidenceRunId;
  const evidenceRoot = path.join(
    process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR ||
      path.join(__dirname, "state"),
    "evidence"
  );
  if (!runId) {
    console.log("No evidence run recorded on board state. Run: board.mjs gate");
    return;
  }
  const dir = path.join(evidenceRoot, runId);
  console.log("Run ID:", runId);
  console.log("Directory:", dir);
  const summary = path.join(dir, "summary.json");
  if (fs.existsSync(summary)) {
    console.log("Summary:", summary);
    console.log(fs.readFileSync(summary, "utf8"));
  }
  const atts = loadAttestations();
  console.log("\nAttestations on file:", (atts.records || []).length);
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
      return cmdDiscover(args);
    case "prioritize":
      return cmdPrioritize(args);
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
    case "attest":
      return cmdAttest(args);
    case "evidence":
      return cmdEvidence();
    case "sync":
      return cmdSync();
    case "roles":
      return cmdRoles();
    case "campaign":
      return cmdCampaign(args);
    case "test":
      return cmdTest();
    default:
      console.error("Unknown command:", process.argv[2]);
      cmdHelp();
      process.exitCode = 1;
  }
}

main();
