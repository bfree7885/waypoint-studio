import { nowIso } from "./io.mjs";
import { VERDICTS } from "./verdicts.mjs";

/**
 * Red Team — independent stage whose job is to DISPROVE Subscriber Ready.
 * Must not auto-accept engineering/QA conclusions.
 */
export function runRedTeam({
  engineeringVerdictHint = null,
  qaChecks = [],
  probeFindings = [],
  backlogBlocking = [],
  commercial = null,
  attestations = null,
  forced = null
} = {}) {
  const disproofs = [];

  // Attack 1: engineering/QA green-wash
  const commandsPassed = (qaChecks || []).filter(
    (c) => c.kind === "command" && c.status === "pass"
  );
  const commandsFailed = (qaChecks || []).filter(
    (c) => c.kind === "command" && ["fail", "missing_tool"].includes(c.status)
  );
  if (
    engineeringVerdictHint === "SUBSCRIBER READY" ||
    engineeringVerdictHint === "ready"
  ) {
    disproofs.push({
      id: "redteam:reject-eng-self-cert",
      severity: "P0",
      message:
        "Engineering self-declared ready — Red Team rejects auto-acceptance without independent disproof attempt."
    });
  }

  if (commandsPassed.length && !commandsFailed.length) {
    // Tests passing is necessary but never sufficient — record as incomplete proof.
    if (!attestations?.complete) {
      disproofs.push({
        id: "redteam:tests-pass-insufficient",
        severity: "P1",
        message:
          "Automated tests passed but policy attestations incomplete — disproves SUBSCRIBER READY."
      });
    }
  }

  // Attack 2: open blockers
  for (const item of backlogBlocking || []) {
    if (["P0", "P1"].includes(item.severity)) {
      disproofs.push({
        id: `redteam:backlog:${item.id}`,
        severity: item.severity,
        message: `Open ${item.severity} work disproves readiness: ${item.title}`
      });
    }
  }

  // Attack 3: trust probes
  for (const f of probeFindings || []) {
    if (["P0", "P1"].includes(f.severity)) {
      disproofs.push({
        id: `redteam:probe:${f.id}`,
        severity: f.severity,
        message: `Probe finding disproves readiness: ${f.message}`
      });
    }
  }

  // Attack 4: commercial cancel risk
  if (commercial?.wouldCancel) {
    disproofs.push({
      id: "redteam:commercial-cancel",
      severity: "P0",
      message:
        "Commercial reviewer cancel/refund risk present — Red Team treats as disproof."
    });
  }

  // Attack 5: failed required QA
  for (const c of commandsFailed) {
    disproofs.push({
      id: `redteam:qa:${c.id}`,
      severity: "P1",
      message: `Required check not passing: ${c.title || c.id}`
    });
  }

  let status = "pending";
  let disproved = false;
  let summary =
    "Red Team pending — independent disproof pass not yet completed.";

  if (forced === "pass" || forced === "fail" || forced === "pending") {
    status = forced;
    disproved = forced === "fail";
    summary =
      forced === "pass"
        ? "Red Team completed adversarial pass; no disproof of scoped readiness."
        : forced === "fail"
          ? "Red Team disproved Subscriber Ready."
          : summary;
  } else if (disproofs.some((d) => ["P0", "P1"].includes(d.severity))) {
    status = "fail";
    disproved = true;
    summary = `Red Team disproved readiness with ${disproofs.length} finding(s).`;
  } else {
    // No automatic pass — absence of findings ≠ approval.
    status = "pending";
    disproved = false;
    summary =
      "No automatic P0/P1 disproof found; Red Team attestation still required (never auto-accept QA).";
  }

  return {
    role: "red-team",
    evaluatedAt: nowIso(),
    status,
    disproved,
    mission: "Independently DISPROVE Subscriber Ready; do not rubber-stamp QA.",
    disproofs,
    summary,
    rejectedAutoAccept: true,
    blocksVerdict: disproved ? VERDICTS.NOT_READY : null
  };
}
