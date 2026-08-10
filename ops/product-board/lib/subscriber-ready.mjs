import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { readJson, nowIso } from "./io.mjs";
import { SUBSCRIBER_READY_GATE, REPO_ROOT } from "./paths.mjs";
import { openBlockingItems } from "./backlog.mjs";

/**
 * Subscriber Ready ≠ "tests pass".
 * Formal gate: trust, journeys, honesty, a11y/responsive, no placeholders-as-finished.
 */
export function loadSubscriberReadyGate() {
  return readJson(SUBSCRIBER_READY_GATE);
}

function runOptionalCommand(command) {
  try {
    const out = execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { ok: true, exitCode: 0, output: out.slice(0, 4000) };
  } catch (err) {
    return {
      ok: false,
      exitCode: err.status ?? 1,
      output: String(err.stdout || err.stderr || err.message).slice(0, 4000)
    };
  }
}

export function evaluateSubscriberReady({ backlog, state, runCommands = true }) {
  const gate = loadSubscriberReadyGate();
  const findings = [];
  const checkResults = [];

  const blocking = openBlockingItems(backlog);
  if (blocking.length) {
    findings.push({
      id: "open-blocking-work",
      severity: blocking[0].severity,
      message: `${blocking.length} open P0–P2 item(s) block Subscriber Ready`,
      items: blocking.map((i) => i.id)
    });
  }

  if ((state.routing?.openRepairQueue || []).length) {
    findings.push({
      id: "open-repair-queue",
      severity: "P1",
      message: "Failed-review repair queue is non-empty",
      items: state.routing.openRepairQueue
    });
  }

  for (const criterion of gate.criteria || []) {
    const result = {
      id: criterion.id,
      title: criterion.title,
      required: criterion.required !== false,
      status: "pending",
      detail: criterion.description || ""
    };

    if (criterion.kind === "policy") {
      result.status = "manual_required";
      result.detail +=
        " — operator must affirm; automation records pending until attested.";
      if (criterion.required !== false) {
        findings.push({
          id: criterion.id,
          severity: criterion.defaultSeverity || "P1",
          message: `Required criterion not yet attested: ${criterion.title}`
        });
      }
    } else if (criterion.kind === "command" && criterion.command) {
      if (!runCommands) {
        result.status = "skipped";
      } else if (!commandExists(criterion.command)) {
        result.status = "missing_tool";
        findings.push({
          id: criterion.id,
          severity: criterion.defaultSeverity || "P2",
          message: `Gate command missing or not runnable: ${criterion.command}`
        });
      } else {
        const run = runOptionalCommand(criterion.command);
        result.status = run.ok ? "pass" : "fail";
        result.detail = run.output;
        if (!run.ok && criterion.required !== false) {
          findings.push({
            id: criterion.id,
            severity: criterion.defaultSeverity || "P1",
            message: `Command failed: ${criterion.command}`,
            exitCode: run.exitCode
          });
        }
      }
    } else if (criterion.kind === "board") {
      result.status = blocking.length || (state.routing?.openRepairQueue || []).length
        ? "fail"
        : "pass";
    }

    checkResults.push(result);
  }

  const hardBlockers = findings.filter((f) =>
    ["P0", "P1", "P2"].includes(f.severity)
  );
  const verdict =
    hardBlockers.length === 0 &&
    checkResults.every(
      (c) =>
        !c.required ||
        c.status === "pass" ||
        // Foundation run: policy attestations remain manual — do not fake APPROVED.
        c.status === "manual_required"
    )
      ? hardBlockers.length === 0 &&
        checkResults.some((c) => c.status === "manual_required")
        ? "CONDITIONAL_PENDING_ATTESTATION"
        : "SUBSCRIBER_READY"
      : "NOT_SUBSCRIBER_READY";

  // If any required command failed or board blockers exist → not ready.
  const notReady =
    hardBlockers.length > 0 ||
    checkResults.some(
      (c) => c.required && ["fail", "missing_tool"].includes(c.status)
    );

  return {
    evaluatedAt: nowIso(),
    verdict: notReady ? "NOT_SUBSCRIBER_READY" : verdict,
    principles: gate.principles || [],
    checks: checkResults,
    findings,
    policy: gate.policy || {}
  };
}

function commandExists(command) {
  // Expect forms like: node automation/foo.mjs
  const parts = command.trim().split(/\s+/);
  if (parts[0] === "node" && parts[1]) {
    return fs.existsSync(path.join(REPO_ROOT, parts[1]));
  }
  return true;
}
