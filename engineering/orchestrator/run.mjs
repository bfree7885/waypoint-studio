#!/usr/bin/env node
/**
 * Waypoint Engineering Orchestrator CLI
 *
 * Usage:
 *   node engineering/orchestrator/run.mjs "Start Sprint"
 *   node engineering/orchestrator/run.mjs continue-sprint
 *   node engineering/orchestrator/run.mjs status
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { parse as parseYaml } from "./yaml-lite.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ENG = path.join(ROOT, "engineering");

const COMMANDS = {
  "start sprint": "start-sprint",
  "start-sprint": "start-sprint",
  "continue sprint": "continue-sprint",
  "continue-sprint": "continue-sprint",
  "review production": "review-production",
  "review-production": "review-production",
  "plan next release": "plan-next-release",
  "plan-next-release": "plan-next-release",
  "fix production": "fix-production",
  "fix-production": "fix-production",
  "generate roadmap": "generate-roadmap",
  "generate-roadmap": "generate-roadmap",
  status: "status",
  help: "help"
};

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ENG, rel), "utf8"));
}

function writeJson(rel, data) {
  const full = path.join(ENG, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeCommand(argv) {
  const raw = argv.slice(2).join(" ").trim().toLowerCase();
  if (!raw) return "help";
  return COMMANDS[raw] || COMMANDS[raw.replace(/\s+/g, "-")] || raw;
}

function listAgents() {
  const dir = path.join(ENG, "agents");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => parseYaml(fs.readFileSync(path.join(dir, f), "utf8")));
}

function backlogReady(backlog) {
  return (backlog.tasks || [])
    .filter((t) => t.status === "ready" || t.status === "backlog")
    .sort((a, b) => String(a.priority).localeCompare(String(b.priority)));
}

function printHeader(title) {
  console.log("\n=== Waypoint Engineering — " + title + " ===\n");
}

function repoSnapshot() {
  return {
    branch: git("git branch --show-current"),
    head: git("git rev-parse --short HEAD"),
    originMain: git("git rev-parse --short origin/main"),
    dirty: Boolean(git("git status --porcelain"))
  };
}

function cmdHelp() {
  printHeader("Help");
  console.log("Supported commands:");
  Object.keys(COMMANDS)
    .filter((k) => !k.includes(" "))
    .forEach((k) => console.log("  - " + k));
  console.log("\nPlaybooks: engineering/playbooks/");
  console.log("Agents: engineering/agents/");
}

function cmdStatus() {
  printHeader("Status");
  const state = readJson("orchestrator/state.json");
  const sprint = state.activeSprintId
    ? readJson("sprints/" + state.activeSprintId + ".json")
    : null;
  const prod = readJson("production/status.json");
  const snap = repoSnapshot();
  console.log("Mode:", state.mode);
  console.log("Active sprint:", state.activeSprintId || "(none)");
  console.log("Active task:", state.activeTaskId || "(none)");
  console.log("Active phase:", state.activePhase || "(none)");
  console.log("Active agent:", state.activeAgent || "(none)");
  console.log("Feature pause:", state.productionPauseFeatures);
  console.log("Repo:", JSON.stringify(snap));
  console.log("Production:", JSON.stringify(prod.summary || prod));
  if (sprint) {
    console.log("Sprint goal:", sprint.goal);
    console.log("Sprint status:", sprint.status);
    console.log("Sprint phase:", sprint.phase);
  }
}

function cmdStartSprint() {
  printHeader("Start Sprint");
  const state = readJson("orchestrator/state.json");
  const backlog = readJson("backlog/backlog.json");
  const roadmap = readJson("knowledge/roadmap.json");
  const prod = readJson("production/status.json");
  const pipeline = readJson("orchestrator/pipeline.json");
  const snap = repoSnapshot();

  if (prod.summary && prod.summary.health === "down") {
    console.log("PRODUCTION DOWN — refusing Start Sprint.");
    console.log('Run: node engineering/orchestrator/run.mjs "Fix Production"');
    process.exitCode = 2;
    return;
  }

  const ready = backlogReady(backlog);
  const focus = ready.slice(0, 5);
  const sprintId =
    "sprint-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const sprint = {
    id: sprintId,
    goal: roadmap.currentTheme || "Advance highest-priority engineering work",
    status: "active",
    startedAt: nowIso(),
    completedAt: null,
    tasks: focus.map((t) => t.id),
    risks: [],
    completedWork: [],
    blockedWork: [],
    deployment: { status: "not_started" },
    verification: { status: "not_started", gates: {} },
    releaseNotes: "",
    activeTask: focus[0] ? focus[0].id : null,
    phase: pipeline.phases[0].id,
    assignedSequence: pipeline.phases,
    repoAtStart: snap,
    log: [
      {
        at: nowIso(),
        event: "sprint_started",
        detail: "Orchestrator created sprint from backlog priorities"
      }
    ]
  };

  writeJson("sprints/" + sprintId + ".json", sprint);
  writeJson("sprints/current.json", { activeSprintId: sprintId });

  focus.forEach((t) => {
    if (t.status === "backlog") t.status = "ready";
  });
  if (focus[0]) {
    focus[0].status = "in_progress";
    focus[0].assignedAgent = "product-manager";
  }
  backlog.updatedAt = nowIso();
  writeJson("backlog/backlog.json", backlog);

  state.mode = "sprint";
  state.activeSprintId = sprintId;
  state.activeTaskId = sprint.activeTask;
  state.activePhase = sprint.phase;
  state.activeAgent = "ceo";
  state.completedAgents = [];
  state.blocked = [];
  state.lastCommand = "start-sprint";
  state.lastCommandAt = nowIso();
  state.productionPauseFeatures = false;
  state.notes = [
    "Sprint started. Begin with CEO direction → Product Manager specs.",
    "Follow engineering/playbooks/start-sprint.md"
  ];
  writeJson("orchestrator/state.json", state);

  console.log("Created", sprintId);
  console.log("Goal:", sprint.goal);
  console.log("Tasks:", sprint.tasks.join(", ") || "(none — groom backlog)");
  console.log("First agent: ceo");
  console.log("Next agent: product-manager");
  console.log("\nPlaybook: engineering/playbooks/start-sprint.md");
  console.log("Then run: Continue Sprint");
}

function advancePipeline(state, sprint, pipeline) {
  const phases = pipeline.phases;
  const idx = Math.max(0, phases.findIndex((p) => p.id === sprint.phase));
  const phase = phases[idx];
  const agents = (phase && phase.agents) || [];
  const done = new Set(state.completedAgents || []);
  const nextAgent = agents.find((a) => !done.has(a));
  if (nextAgent) {
    state.activeAgent = nextAgent;
    state.activePhase = phase.id;
    sprint.phase = phase.id;
    return { kind: "agent", agent: nextAgent, phase: phase.id };
  }
  if (idx + 1 < phases.length) {
    const nextPhase = phases[idx + 1];
    state.completedAgents = [];
    state.activePhase = nextPhase.id;
    state.activeAgent = nextPhase.agents[0];
    sprint.phase = nextPhase.id;
    return { kind: "phase", agent: nextPhase.agents[0], phase: nextPhase.id };
  }
  return { kind: "complete" };
}

function cmdContinueSprint() {
  printHeader("Continue Sprint");
  const state = readJson("orchestrator/state.json");
  if (!state.activeSprintId || state.mode !== "sprint") {
    console.log("No active sprint. Run Start Sprint first.");
    process.exitCode = 1;
    return;
  }
  if (state.productionPauseFeatures) {
    console.log("Feature work paused for production incident.");
    console.log("Run Fix Production first.");
    process.exitCode = 2;
    return;
  }

  const sprint = readJson("sprints/" + state.activeSprintId + ".json");
  const pipeline = readJson("orchestrator/pipeline.json");
  const backlog = readJson("backlog/backlog.json");

  if (state.activeAgent) {
    state.completedAgents = Array.from(
      new Set([...(state.completedAgents || []), state.activeAgent])
    );
    sprint.log = sprint.log || [];
    sprint.log.push({
      at: nowIso(),
      event: "agent_completed",
      agent: state.activeAgent
    });
  }

  const step = advancePipeline(state, sprint, pipeline);
  state.lastCommand = "continue-sprint";
  state.lastCommandAt = nowIso();

  if (step.kind === "complete") {
    sprint.status = "verifying";
    state.activeAgent = "release-manager";
    state.activePhase = "confirm";
    state.notes = [
      "Pipeline roles complete for current pass. Release Manager runs gates.",
      "See engineering/playbooks/continue-sprint.md and orchestrator/gates.json"
    ];
    console.log("Pipeline complete for this pass.");
    console.log("Next: Release Manager verifies gates, then deploy.");
  } else {
    state.activeAgent = step.agent;
    state.notes = [
      "Execute role: " + step.agent + " (phase: " + step.phase + ")",
      "Record evidence in the sprint file, then Continue Sprint again."
    ];
    const agent = listAgents().find((a) => a.id === step.agent);
    console.log("Phase:", step.phase);
    console.log("Assigned agent:", step.agent);
    if (agent) {
      console.log("Title:", agent.title);
      console.log("Responsibilities:");
      (agent.responsibilities || []).forEach((r) => console.log("  -", r));
      console.log("Read: engineering/agents/" + step.agent + ".yaml");
    }
  }

  if (sprint.activeTask) {
    const task = (backlog.tasks || []).find((t) => t.id === sprint.activeTask);
    if (task) {
      task.assignedAgent = state.activeAgent;
      console.log("Active task:", task.id, "—", task.title);
    }
  }

  writeJson("sprints/" + state.activeSprintId + ".json", sprint);
  writeJson("sprints/current.json", { activeSprintId: state.activeSprintId });
  writeJson("backlog/backlog.json", backlog);
  writeJson("orchestrator/state.json", state);
}

function cmdReviewProduction() {
  printHeader("Review Production");
  const prod = readJson("production/status.json");
  const monitors = parseYaml(
    fs.readFileSync(path.join(ENG, "production/monitors.yaml"), "utf8")
  );
  const snap = repoSnapshot();
  console.log("Repo HEAD:", snap.head, "origin/main:", snap.originMain);
  console.log("Configured monitors:");
  (monitors.monitors || []).forEach((m) => {
    console.log("  -", m.id, "—", m.title);
    if (m.command) console.log("    cmd:", m.command);
  });
  console.log("\nRecorded production status:");
  console.log(JSON.stringify(prod, null, 2));
  console.log("Playbook: engineering/playbooks/review-production.md");
  console.log("Suggested commands:");
  console.log("  node automation/verify-production-build.mjs");
  console.log("  node automation/check-production-nav.mjs");

  const state = readJson("orchestrator/state.json");
  state.lastCommand = "review-production";
  state.lastCommandAt = nowIso();
  writeJson("orchestrator/state.json", state);
}

function cmdFixProduction() {
  printHeader("Fix Production");
  const state = readJson("orchestrator/state.json");
  const backlog = readJson("backlog/backlog.json");
  const pipeline = readJson("orchestrator/pipeline.json");

  state.mode = "production_incident";
  state.productionPauseFeatures = true;
  state.activePhase = pipeline.production_incident_phases[0].id;
  state.activeAgent = pipeline.production_incident_phases[0].agents[0];
  state.completedAgents = [];
  state.lastCommand = "fix-production";
  state.lastCommandAt = nowIso();
  state.notes = [
    "Feature work paused.",
    "Follow engineering/playbooks/fix-production.md",
    "Assigned: " + state.activeAgent
  ];

  const maxNum = Math.max(
    0,
    ...(backlog.tasks || []).map((t) => Number(String(t.id).replace(/\D/g, "")) || 0)
  );
  const bugId = "WE-" + String(maxNum + 1).padStart(3, "0");

  backlog.tasks = backlog.tasks || [];
  backlog.tasks.unshift({
    id: bugId,
    title: "Production incident — investigate and restore",
    priority: "P0",
    estimate: "S",
    dependencies: [],
    assignedAgent: "devops-engineer",
    status: "in_progress",
    acceptanceCriteria: [
      "Root cause identified and recorded",
      "Fix merged or rollback completed",
      "CI green",
      "Production verification passes",
      "Incident report written under engineering/reports/"
    ],
    area: "production",
    risk: "high",
    notes: "Auto-created by Fix Production command"
  });
  backlog.updatedAt = nowIso();

  writeJson("backlog/backlog.json", backlog);
  writeJson("orchestrator/state.json", state);

  console.log("Created incident task", bugId);
  console.log("Feature work PAUSED");
  console.log("Active agent:", state.activeAgent);
  console.log("Playbook: engineering/playbooks/fix-production.md");
}

function cmdPlanNextRelease() {
  printHeader("Plan Next Release");
  const backlog = readJson("backlog/backlog.json");
  const roadmap = readJson("knowledge/roadmap.json");
  const ready = backlogReady(backlog).slice(0, 10);
  console.log("Roadmap theme:", roadmap.currentTheme);
  console.log("Near-term milestones:");
  (roadmap.milestones || []).slice(0, 5).forEach((m) => {
    console.log("  -", m.id, m.title, "(" + m.status + ")");
  });
  console.log("\nTop backlog candidates:");
  ready.forEach((t) => console.log("  -", t.priority, t.id, t.title));
  console.log("\nPlaybook: engineering/playbooks/plan-next-release.md");
  const state = readJson("orchestrator/state.json");
  state.mode = state.mode === "sprint" ? state.mode : "planning";
  state.lastCommand = "plan-next-release";
  state.lastCommandAt = nowIso();
  writeJson("orchestrator/state.json", state);
}

function cmdGenerateRoadmap() {
  printHeader("Generate Roadmap");
  const roadmap = readJson("knowledge/roadmap.json");
  console.log(JSON.stringify(roadmap, null, 2));
  console.log("\nEdit: engineering/knowledge/roadmap.json");
  console.log("CEO approves direction; Product Manager breaks into backlog.");
  const state = readJson("orchestrator/state.json");
  state.lastCommand = "generate-roadmap";
  state.lastCommandAt = nowIso();
  writeJson("orchestrator/state.json", state);
}

function main() {
  const cmd = normalizeCommand(process.argv);
  switch (cmd) {
    case "help":
      return cmdHelp();
    case "status":
      return cmdStatus();
    case "start-sprint":
      return cmdStartSprint();
    case "continue-sprint":
      return cmdContinueSprint();
    case "review-production":
      return cmdReviewProduction();
    case "fix-production":
      return cmdFixProduction();
    case "plan-next-release":
      return cmdPlanNextRelease();
    case "generate-roadmap":
      return cmdGenerateRoadmap();
    default:
      console.error("Unknown command:", process.argv.slice(2).join(" "));
      cmdHelp();
      process.exitCode = 1;
  }
}

main();
