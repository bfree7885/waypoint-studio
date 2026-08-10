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

  // Attack 6: optional browser/live checks left failing on live-claim surfaces
  // Escaped class: SUBSCRIBER READY with browser-smoke optional_fail while product
  // claims Today/Live/Nearby inputs — Red Team treats as incomplete disproof barrier.
  // Do NOT match incidental paths like audits/live-site-qa in a11y tool output.
  const optionalLiveGaps = (qaChecks || []).filter((c) => {
    if (c.status !== "optional_fail") return false;
    if (c.id === "browser-smoke") return true;
    // Match criterion identity only — never scan command output (avoids live-site-qa false hits).
    return /\b(today|nearby|weather|cold-?start|live-data|live_data)\b/i.test(
      `${c.id} ${c.title || ""}`
    );
  });
  for (const c of optionalLiveGaps) {
    disproofs.push({
      id: `redteam:optional-live-gap:${c.id}`,
      severity: "P1",
      message: `Optional live/browser check failed or skipped on a live-claim surface: ${c.title || c.id}. Cannot rubber-stamp Today/Live/Nearby readiness.`
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
  } else if (attestations?.byCriterion?.["red-team-pass"]?.verdict === "pass") {
    status = "pass";
    disproved = false;
    summary =
      "Red Team attestation recorded after independent disproof attempt; no remaining scoped disproof.";
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
