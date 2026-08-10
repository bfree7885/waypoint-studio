import { nowIso } from "./io.mjs";
import { VERDICTS } from "./verdicts.mjs";

/**
 * Commercial / Subscriber reviewer — independent of engineering green checks.
 * Core question: if a customer paid today, what would cause cancel / refund / loss of trust?
 *
 * Never auto-pass because automated tests passed.
 */
export const COMMERCIAL_CANCEL_RISKS = Object.freeze([
  "Broken primary workflow after payment expectation",
  "Sample/demo/placeholder presented as finished Live product",
  "Dead controls on the paid or primary value path",
  "Misleading Live / estimate / cached honesty",
  "Unreadable UI, HTML leakage, or silent failures",
  "Data that does not persist when the product claims it does",
  "Privacy surprise or unclear permissions",
  "Feature that looks ready but delivers no commercial usefulness"
]);

export function runCommercialReview({
  backlogFindings = [],
  probeFindings = [],
  gateChecks = [],
  attestations = null,
  forced = null
} = {}) {
  const risks = [];

  const p0p1 = [...backlogFindings, ...probeFindings].filter((f) =>
    ["P0", "P1"].includes(f.severity)
  );
  for (const f of p0p1) {
    risks.push({
      id: `commercial:${f.id}`,
      severity: f.severity,
      reason: f.message || f.id,
      cancelRisk: mapCancelRisk(f)
    });
  }

  const failedRequired = (gateChecks || []).filter(
    (c) => c.required && ["fail", "missing_tool"].includes(c.status)
  );
  for (const c of failedRequired) {
    risks.push({
      id: `commercial:check:${c.id}`,
      severity: c.defaultSeverity || "P1",
      reason: `Required readiness check not green: ${c.title || c.id}`,
      cancelRisk: COMMERCIAL_CANCEL_RISKS[0]
    });
  }

  // Tests-pass theater: if only automated tests passed and policy still pending, do not pass.
  const autoPass = (gateChecks || []).filter(
    (c) => c.kind === "command" && c.status === "pass"
  );
  const policyPending =
    attestations &&
    Array.isArray(attestations.pending) &&
    attestations.pending.length > 0;

  let status = "pending";
  let wouldCancel = false;
  let summary = "Commercial review pending — not yet independently completed.";

  if (forced === "pass" || forced === "fail" || forced === "pending") {
    status = forced;
    wouldCancel = forced === "fail";
    summary =
      forced === "pass"
        ? "Commercial reviewer attested: paying customer would not cancel for known scoped risks."
        : forced === "fail"
          ? "Commercial reviewer: cancel/refund/trust loss risk present."
          : summary;
  } else if (risks.some((r) => ["P0", "P1"].includes(r.severity))) {
    status = "fail";
    wouldCancel = true;
    summary =
      "Commercial reviewer would expect cancel/refund/trust loss from open P0/P1 risks.";
  } else if (autoPass.length && policyPending) {
    status = "pending";
    wouldCancel = false;
    summary =
      "Automated tests alone are insufficient — commercial attestation still required.";
  } else if (
    !risks.some((r) => ["P0", "P1"].includes(r.severity)) &&
    attestations?.byCriterion?.["commercial-review"]?.verdict === "pass"
  ) {
    status = "pass";
    wouldCancel = false;
    summary =
      "Commercial attestation recorded: paying customer would not cancel for known scoped risks.";
  } else if (!risks.length && attestations?.complete) {
    // Still pending unless an explicit commercial attestation exists.
    status = "pending";
    summary =
      "No P0/P1 commercial risks detected automatically; commercial role attestation still required before SUBSCRIBER READY.";
  }

  return {
    role: "commercial-subscriber",
    evaluatedAt: nowIso(),
    status,
    wouldCancel,
    coreQuestion:
      "If a customer paid today, what would cause cancel, refund, or loss of trust?",
    cancelRiskCatalog: [...COMMERCIAL_CANCEL_RISKS],
    risks,
    summary,
    blocksVerdict: wouldCancel ? VERDICTS.NOT_READY : null
  };
}

function mapCancelRisk(finding) {
  const id = String(finding.id || "");
  const msg = String(finding.message || "");
  if (/sample|placeholder|fake|live/i.test(id + msg)) return COMMERCIAL_CANCEL_RISKS[1];
  if (/dead|control|href-hash/i.test(id + msg)) return COMMERCIAL_CANCEL_RISKS[2];
  if (/html|undefined|object Object/i.test(id + msg)) return COMMERCIAL_CANCEL_RISKS[4];
  if (/privacy/i.test(id + msg)) return COMMERCIAL_CANCEL_RISKS[6];
  if (/workflow|nav|broken/i.test(id + msg)) return COMMERCIAL_CANCEL_RISKS[0];
  return COMMERCIAL_CANCEL_RISKS[7];
}
