/**
 * Exact Subscriber Ready verdicts (do not invent synonyms).
 */
export const VERDICTS = Object.freeze({
  NOT_READY: "NOT READY",
  CONDITIONALLY_READY: "CONDITIONALLY READY",
  SUBSCRIBER_READY: "SUBSCRIBER READY"
});

export const VERDICT_LIST = Object.freeze([
  VERDICTS.NOT_READY,
  VERDICTS.CONDITIONALLY_READY,
  VERDICTS.SUBSCRIBER_READY
]);

export function isExactVerdict(value) {
  return VERDICT_LIST.includes(value);
}

/**
 * Compute verdict from classified signals.
 * P0/P1 (and red-team disproof / fake-as-real / failed required checks)
 * always force NOT READY. Tests-pass alone never yields SUBSCRIBER READY.
 */
export function computeVerdict({
  p0p1Open = false,
  requiredCheckFailed = false,
  fakeAsReal = false,
  primaryWorkflowBroken = false,
  redTeamDisproved = false,
  commercialWouldCancel = false,
  p2Open = false,
  attestationsIncomplete = false,
  commercialPending = false,
  redTeamPending = false,
  evidenceIncomplete = false,
  repairQueueOpen = false
} = {}) {
  const hardNotReady =
    p0p1Open ||
    requiredCheckFailed ||
    fakeAsReal ||
    primaryWorkflowBroken ||
    redTeamDisproved ||
    commercialWouldCancel;

  if (hardNotReady) return VERDICTS.NOT_READY;

  const conditional =
    p2Open ||
    attestationsIncomplete ||
    commercialPending ||
    redTeamPending ||
    evidenceIncomplete ||
    repairQueueOpen;

  if (conditional) return VERDICTS.CONDITIONALLY_READY;
  return VERDICTS.SUBSCRIBER_READY;
}
