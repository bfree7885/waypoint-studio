import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { readJson, nowIso } from "./io.mjs";
import { SUBSCRIBER_READY_GATE, REPO_ROOT } from "./paths.mjs";
import { openBlockingItems, loadBacklog } from "./backlog.mjs";
import { computeVerdict, VERDICTS, isExactVerdict } from "./verdicts.mjs";
import {
  createEvidenceRun,
  addEvidenceEntry,
  finalizeEvidenceRun,
  evidenceCompleteness
} from "./evidence.mjs";
import {
  loadAttestations,
  requiredAttestationsStatus,
  attestationFor
} from "./attestations.mjs";
import { runStaticProbes } from "./probes.mjs";
import { runCommercialReview } from "./commercial-reviewer.mjs";
import { runRedTeam } from "./red-team.mjs";

/**
 * Subscriber Ready ≠ "tests pass".
 * Formal evidence-based gate with Commercial Reviewer + Red Team independence.
 */
export function loadSubscriberReadyGate() {
  return readJson(SUBSCRIBER_READY_GATE);
}

export { VERDICTS, isExactVerdict };

function runOptionalCommand(command, timeoutMs = 120000) {
  try {
    const out = execSync(command, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      env: { ...process.env }
    });
    return { ok: true, exitCode: 0, output: String(out).slice(0, 6000) };
  } catch (err) {
    return {
      ok: false,
      exitCode: err.status ?? 1,
      output: String(err.stdout || err.stderr || err.message).slice(0, 6000)
    };
  }
}

function commandExists(command) {
  const parts = command.trim().split(/\s+/);
  if (parts[0] === "node" && parts[1]) {
    return fs.existsSync(path.join(REPO_ROOT, parts[1]));
  }
  return true;
}

export function openP0P1Items(backlog) {
  return (backlog.items || []).filter(
    (i) =>
      ["P0", "P1"].includes(i.severity) &&
      !["done", "cancelled"].includes(i.status)
  );
}

export function openP2Items(backlog) {
  return (backlog.items || []).filter(
    (i) =>
      i.severity === "P2" && !["done", "cancelled"].includes(i.status)
  );
}

function applyAttestationToCriterion(criterion, campaign) {
  const att = attestationFor(criterion.id, campaign);
  if (!att) {
    return {
      status: "manual_required",
      detail: `${criterion.description || ""} — attestation required.`.trim(),
      attestation: null
    };
  }
  if (att.verdict === "fail") {
    return {
      status: "fail",
      detail: `Attested fail by ${att.role}: ${att.notes || ""}`.trim(),
      attestation: att
    };
  }
  return {
    status: "pass",
    detail: `Attested ${att.verdict} by ${att.role}: ${att.notes || ""}`.trim(),
    attestation: att
  };
}

/**
 * Evaluate Subscriber Ready gate against current board + product evidence.
 */
export function evaluateSubscriberReady({
  backlog,
  state,
  runCommands = true,
  runProbes = true,
  persistEvidence = true,
  commercialForced = null,
  redTeamForced = null,
  campaign = null
} = {}) {
  const gate = loadSubscriberReadyGate();
  const campaignId = campaign || state?.campaign || null;
  const findings = [];
  const checkResults = [];

  const evidenceRun = persistEvidence
    ? createEvidenceRun({
        campaign: campaignId,
        target: gate.id || "subscriber-ready"
      })
    : null;

  const p0p1 = openP0P1Items(backlog);
  const p2 = openP2Items(backlog);
  const allBlocking = openBlockingItems(backlog);

  if (p0p1.length) {
    findings.push({
      id: "open-p0-p1-work",
      severity: p0p1[0].severity,
      message: `${p0p1.length} open P0–P1 item(s) automatically prevent SUBSCRIBER READY`,
      items: p0p1.map((i) => i.id)
    });
  }
  if (p2.length) {
    findings.push({
      id: "open-p2-work",
      severity: "P2",
      message: `${p2.length} open P2 item(s) block SUBSCRIBER READY (may allow CONDITIONALLY READY)`,
      items: p2.map((i) => i.id)
    });
  }

  const repairQueue = state.routing?.openRepairQueue || [];
  if (repairQueue.length) {
    findings.push({
      id: "open-repair-queue",
      severity: "P1",
      message: "Failed-review repair queue is non-empty",
      items: repairQueue
    });
  }

  // Static trust probes
  let probeResult = {
    findings: [],
    filesScanned: 0,
    fakeAsReal: false,
    dimensionsCovered: gate.dimensions || []
  };
  if (runProbes) {
    probeResult = runStaticProbes();
    for (const f of probeResult.findings) {
      if (["P0", "P1"].includes(f.severity)) {
        findings.push(f);
      }
    }
    if (evidenceRun) {
      addEvidenceEntry(evidenceRun, {
        id: "static-probes",
        kind: "static_probe",
        status: probeResult.p0Count || probeResult.p1Count ? "fail" : "pass",
        summary: `Scanned ${probeResult.filesScanned} files; ${probeResult.findings.length} findings`,
        data: probeResult
      });
      addEvidenceEntry(evidenceRun, {
        id: "playwright-capability",
        kind: "playwright_browser",
        status: probeResult.playwright?.status || "missing",
        summary: probeResult.playwright?.message || "unknown",
        data: probeResult.playwright,
        persist: true
      });
    }
  }

  // Gate criteria
  for (const criterion of gate.criteria || []) {
    const result = {
      id: criterion.id,
      title: criterion.title,
      kind: criterion.kind,
      dimension: criterion.dimension || null,
      required: criterion.required !== false,
      defaultSeverity: criterion.defaultSeverity || "P1",
      status: "pending",
      detail: criterion.description || ""
    };

    if (criterion.kind === "policy") {
      const applied = applyAttestationToCriterion(criterion, campaignId);
      result.status = applied.status;
      result.detail = applied.detail;
      result.attestation = applied.attestation;
      if (result.status === "manual_required" && result.required) {
        findings.push({
          id: criterion.id,
          severity: criterion.defaultSeverity || "P1",
          message: `Required criterion not yet attested: ${criterion.title}`
        });
      } else if (result.status === "fail" && result.required) {
        findings.push({
          id: criterion.id,
          severity: criterion.defaultSeverity || "P0",
          message: `Attestation failed: ${criterion.title}`
        });
      }
      if (evidenceRun && applied.attestation) {
        addEvidenceEntry(evidenceRun, {
          id: `attestation-${criterion.id}`,
          kind: "attestation",
          status: applied.status,
          summary: applied.detail,
          data: applied.attestation
        });
      }
    } else if (criterion.kind === "command" && criterion.command) {
      if (!runCommands) {
        result.status = "skipped";
      } else if (!commandExists(criterion.command)) {
        result.status = "missing_tool";
        if (result.required) {
          findings.push({
            id: criterion.id,
            severity: criterion.defaultSeverity || "P2",
            message: `Gate command missing or not runnable: ${criterion.command}`
          });
        }
      } else {
        const run = runOptionalCommand(
          criterion.command,
          criterion.timeoutMs || 120000
        );
        if (run.ok) {
          result.status = "pass";
        } else {
          result.status = result.required ? "fail" : "optional_fail";
        }
        result.detail = run.output;
        result.exitCode = run.exitCode;
        if (!run.ok && result.required) {
          findings.push({
            id: criterion.id,
            severity: criterion.defaultSeverity || "P1",
            message: `Command failed: ${criterion.command}`,
            exitCode: run.exitCode
          });
        }
        if (evidenceRun) {
          const kind =
            criterion.evidenceKind ||
            (criterion.id.includes("a11y")
              ? "a11y"
              : criterion.id.includes("production")
                ? "production_url"
                : "automated_tests");
          addEvidenceEntry(evidenceRun, {
            id: `cmd-${criterion.id}`,
            kind,
            status: result.status,
            summary: `${criterion.title}: ${result.status}`,
            data: {
              command: criterion.command,
              exitCode: run.exitCode,
              output: run.output.slice(0, 4000)
            }
          });
        }
      }
    } else if (criterion.kind === "board") {
      result.status =
        p0p1.length || repairQueue.length
          ? "fail"
          : p2.length
            ? "conditional"
            : "pass";
      result.detail = `P0–P1 open=${p0p1.length}; P2 open=${p2.length}; repair=${repairQueue.length}`;
    } else if (criterion.kind === "probe") {
      const dim = criterion.dimension;
      const dimFindings = probeResult.findings.filter(
        (f) => f.dimension === dim || (criterion.match && criterion.match.test?.(f.id))
      );
      const hard = dimFindings.filter((f) => ["P0", "P1"].includes(f.severity));
      result.status = hard.length ? "fail" : "pass";
      result.detail = `${dimFindings.length} probe hit(s); hard=${hard.length}`;
      if (hard.length && result.required) {
        findings.push({
          id: criterion.id,
          severity: hard[0].severity,
          message: `Probe dimension ${dim} failed`,
          items: hard.map((h) => h.id)
        });
      }
    } else if (criterion.kind === "dimension") {
      // Coverage marker — satisfied when probes/commands/policy touch the dimension.
      result.status = "covered";
      result.detail = `Dimension tracked: ${criterion.dimension || criterion.id}`;
    }

    checkResults.push(result);
  }

  const attStatus = requiredAttestationsStatus(gate.criteria || [], campaignId);

  const commercial = runCommercialReview({
    backlogFindings: findings.filter((f) =>
      ["open-p0-p1-work", "open-repair-queue"].includes(f.id)
    ),
    probeFindings: probeResult.findings,
    gateChecks: checkResults,
    attestations: attStatus,
    forced: commercialForced
  });
  if (evidenceRun) {
    addEvidenceEntry(evidenceRun, {
      id: "commercial-review",
      kind: "commercial_review",
      status: commercial.status,
      summary: commercial.summary,
      data: commercial
    });
  }

  const redTeam = runRedTeam({
    engineeringVerdictHint: state?.releaseGate?.engineeringHint || null,
    qaChecks: checkResults,
    probeFindings: probeResult.findings,
    backlogBlocking: allBlocking,
    commercial,
    attestations: attStatus,
    forced: redTeamForced
  });
  if (evidenceRun) {
    addEvidenceEntry(evidenceRun, {
      id: "red-team",
      kind: "red_team",
      status: redTeam.status,
      summary: redTeam.summary,
      data: redTeam
    });
  }

  if (commercial.wouldCancel) {
    findings.push({
      id: "commercial-cancel-risk",
      severity: "P0",
      message: commercial.summary
    });
  }
  if (redTeam.disproved) {
    findings.push({
      id: "red-team-disproof",
      severity: "P0",
      message: redTeam.summary,
      items: redTeam.disproofs.map((d) => d.id)
    });
  }

  const requiredCheckFailed = checkResults.some(
    (c) =>
      c.required &&
      ["fail", "missing_tool"].includes(c.status) &&
      c.kind !== "policy"
  );
  // Policy fail (attested fail) also hard-fails
  const policyFailed = checkResults.some(
    (c) => c.required && c.kind === "policy" && c.status === "fail"
  );

  const requiredKinds = gate.evidenceRequiredKinds || [
    "automated_tests",
    "static_probe",
    "commercial_review",
    "red_team"
  ];
  const completeness = evidenceRun
    ? evidenceCompleteness(evidenceRun.manifest, requiredKinds)
    : { complete: false, missing: requiredKinds, present: [] };

  const verdict = computeVerdict({
    p0p1Open: p0p1.length > 0 || repairQueue.length > 0,
    requiredCheckFailed: requiredCheckFailed || policyFailed,
    fakeAsReal: probeResult.fakeAsReal,
    primaryWorkflowBroken: findings.some(
      (f) =>
        f.id !== "primary-workflows" &&
        /primary-workflow|workflow-broken|broken.primary/i.test(
          `${f.id} ${f.message || ""}`
        )
    ),
    redTeamDisproved: redTeam.disproved,
    commercialWouldCancel: commercial.wouldCancel,
    p2Open: p2.length > 0,
    attestationsIncomplete: !attStatus.complete,
    commercialPending: commercial.status === "pending",
    redTeamPending: redTeam.status === "pending",
    evidenceIncomplete: evidenceRun ? !completeness.complete : false,
    repairQueueOpen: false // already folded into p0p1Open
  });

  if (!isExactVerdict(verdict)) {
    throw new Error(`Invariant: non-exact verdict ${verdict}`);
  }

  const result = {
    evaluatedAt: nowIso(),
    verdict,
    principles: gate.principles || [],
    dimensions: gate.dimensions || probeResult.dimensionsCovered || [],
    checks: checkResults,
    findings,
    probe: {
      filesScanned: probeResult.filesScanned,
      findingCount: probeResult.findings.length,
      fakeAsReal: probeResult.fakeAsReal,
      playwright: probeResult.playwright || null
    },
    commercial,
    redTeam,
    attestations: attStatus,
    evidence: null,
    policy: gate.policy || {},
    notes: [
      "Passing automated tests alone is never sufficient for SUBSCRIBER READY.",
      "P0 or P1 automatically prevent SUBSCRIBER READY.",
      "Red Team must independently attempt to disprove readiness."
    ]
  };

  if (evidenceRun) {
    addEvidenceEntry(evidenceRun, {
      id: "gate-summary-pointer",
      kind: "gate_summary",
      status: verdict === VERDICTS.SUBSCRIBER_READY ? "pass" : "recorded",
      summary: `Verdict: ${verdict}`,
      data: { verdict, completeness }
    });
    const finalized = finalizeEvidenceRun(evidenceRun, {
      verdict: result.verdict,
      findings: result.findings,
      checks: result.checks.map((c) => ({
        id: c.id,
        status: c.status,
        required: c.required
      })),
      commercial: {
        status: commercial.status,
        wouldCancel: commercial.wouldCancel
      },
      redTeam: {
        status: redTeam.status,
        disproved: redTeam.disproved
      },
      attestations: attStatus,
      evidenceCompleteness: completeness
    });
    result.evidence = finalized;
  }

  return result;
}

/** Convenience for tests — evaluate with in-memory backlog only. */
export function evaluateFixture({ items = [], state = {}, ...opts }) {
  const backlog = { items, policy: loadBacklog().policy };
  return evaluateSubscriberReady({
    backlog,
    state: {
      routing: { openRepairQueue: [] },
      releaseGate: {},
      ...state
    },
    runCommands: false,
    runProbes: false,
    persistEvidence: false,
    ...opts
  });
}
