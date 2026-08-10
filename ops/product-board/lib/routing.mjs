import { nowIso } from "./io.mjs";
import { addWorkItem, findItem } from "./backlog.mjs";
import { assertSeverity, blocksSubscriberReady } from "./severity.mjs";
import { appendLoopEvent } from "./board-state.mjs";

/**
 * Failed review MUST create actionable repair work and route back to fix/retest.
 * Never "write report and stop."
 */
export function routeFailedReview({
  state,
  backlog,
  itemId = null,
  title,
  severity = "P1",
  findings,
  phase = null,
  area = "review"
}) {
  assertSeverity(severity);
  if (!findings || !String(findings).trim()) {
    throw new Error("Failed review requires non-empty findings.");
  }

  const originPhase = phase || state.phase || "visual_review";
  const item = addWorkItem(backlog, {
    title: title || `Repair: failed ${originPhase}`,
    severity,
    area,
    acceptanceCriteria: [
      "Root cause named",
      "Fix applied without fake functionality",
      "Retest passes the failed assertion",
      "Evidence recorded on the work item"
    ],
    source: "failed-review-routing",
    notes: String(findings).trim(),
    status: "fix"
  });

  item.failureOrigin = {
    phase: originPhase,
    relatedItemId: itemId,
    routedAt: nowIso(),
    findings: String(findings).trim()
  };
  item.assignedRole = "senior-software-engineer";
  item.updatedAt = nowIso();

  if (itemId) {
    const origin = findItem(backlog, itemId);
    if (origin) {
      origin.status = "blocked";
      origin.notes = [origin.notes, `Blocked by repair ${item.id}`]
        .filter(Boolean)
        .join(" | ");
      origin.updatedAt = nowIso();
    }
  }

  state.mode = "repair";
  state.phase = "fix";
  state.activeItemId = item.id;
  state.activeRole = "senior-software-engineer";
  state.routing = state.routing || { openRepairQueue: [], lastFailureId: null };
  state.routing.openRepairQueue = Array.from(
    new Set([...(state.routing.openRepairQueue || []), item.id])
  );
  state.routing.lastFailureId = item.id;
  state.releaseGate = state.releaseGate || {};
  state.releaseGate.status = "blocked";
  state.releaseGate.verdict = "NOT READY";
  state.releaseGate.blockingFindings = [
    ...(state.releaseGate.blockingFindings || []),
    {
      at: nowIso(),
      workItemId: item.id,
      severity,
      summary: findings.slice(0, 240)
    }
  ];

  appendLoopEvent(state, "failed_review_routed", {
    workItemId: item.id,
    severity,
    originPhase,
    blocksSubscriberReady: blocksSubscriberReady(severity)
  });

  return item;
}

export function markRepairRetest({ state, backlog, itemId, passed, notes = "" }) {
  const item = findItem(backlog, itemId);
  if (!item) throw new Error(`Unknown work item: ${itemId}`);

  if (passed) {
    item.status = "done";
    item.evidence = item.evidence || [];
    item.evidence.push({ at: nowIso(), kind: "retest_pass", notes });
    item.updatedAt = nowIso();
    state.routing.openRepairQueue = (state.routing.openRepairQueue || []).filter(
      (id) => id !== itemId
    );
    state.phase = "retest";
    state.mode = state.routing.openRepairQueue.length ? "repair" : "loop";
    appendLoopEvent(state, "repair_retest_passed", { workItemId: itemId });
  } else {
    item.status = "fix";
    item.evidence = item.evidence || [];
    item.evidence.push({ at: nowIso(), kind: "retest_fail", notes });
    item.updatedAt = nowIso();
    state.phase = "fix";
    state.mode = "repair";
    state.activeItemId = itemId;
    appendLoopEvent(state, "repair_retest_failed", { workItemId: itemId });
  }
  return item;
}
