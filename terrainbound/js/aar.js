/**
 * After Action Report. Field debrief, not a unit test.
 * Player sees FIELD CLEARANCE EARNED or MORE EVIDENCE NEEDED.
 */

export function claimsForAttempt(spec, attempt = 0) {
  const claims = spec.claims || spec.items || [];
  if (attempt <= 1) return claims;
  return claims.map((claim) => ({
    ...claim,
    wren: claim.retry || claim.wren
  }));
}

export function selectedIds(answers, claimId) {
  const value = answers?.[claimId];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && /^(CH-|DS-)/.test(value)) return [value];
  return [];
}

export function toggleEvidence(selected, evidenceId) {
  const set = new Set(selected || []);
  if (set.has(evidenceId)) set.delete(evidenceId);
  else set.add(evidenceId);
  return [...set];
}

export function judgeClaim(claim, selected) {
  const picks = [...new Set(selected || [])];
  const required = claim.required || [];
  const allowed = new Set([...required, ...(claim.useful || [])]);
  const misconception = picks.filter((id) => (claim.misconception || []).includes(id));
  if (misconception.length) {
    return {
      kind: "misconception",
      good: false,
      hint: claim.why?.[misconception[0]] || claim.need
    };
  }
  const missing = required.filter((id) => !picks.includes(id));
  if (missing.length) {
    return {
      kind: "incomplete",
      good: false,
      hint: claim.need
    };
  }
  const extra = picks.filter((id) => !allowed.has(id));
  if (extra.length) {
    return {
      kind: "overclaim",
      good: false,
      hint: claim.why?.[extra[0]] || claim.overclaim
    };
  }
  return { kind: "good", good: true, hint: claim.ok };
}

export function scoreAnswers(spec, answers, attempt = 0) {
  const claims = claimsForAttempt(spec, attempt);
  const rows = [];
  for (const claim of claims) {
    const choiceIds = selectedIds(answers, claim.id);
    const judged = choiceIds.length ? judgeClaim(claim, choiceIds) : { kind: "missing", good: false, hint: claim.need };
    rows.push({
      itemId: claim.id,
      puzzleId: claim.puzzleId,
      competencyId: claim.competencyId,
      choiceId: choiceIds[0] || null,
      evidenceIds: choiceIds,
      kind: judged.kind,
      good: judged.good,
      hint: judged.hint
    });
  }
  const hits = rows.filter((row) => row.good).length;
  const score = claims.length ? hits / claims.length : 0;
  const misconception = rows.filter((row) => row.kind === "misconception");
  return { rows, score, hits, total: claims.length, misconception };
}

export function aarResult(score, useIncomplete) {
  if (useIncomplete.length) return "more-evidence";
  if (score.misconception.length) return "more-evidence";
  if (score.hits === score.total && score.total > 0) return "clearance";
  return "more-evidence";
}

export function remediationFor(spec, score, useIncomplete, puzzleSpec) {
  const names = Object.fromEntries((puzzleSpec?.puzzles || []).map((item) => [item.id, item.name]));
  const lines = [];
  for (const id of useIncomplete) {
    lines.push(`The tablet is still missing work from ${names[id] || id}.`);
  }
  for (const row of score.rows) {
    if (row.good) continue;
    if (row.hint) lines.push(row.hint);
    else lines.push(`I still need a defensible line on ${names[row.puzzleId] || row.puzzleId}.`);
  }
  if (!lines.length) lines.push(spec.moreEvidence.lead);
  return [...new Set(lines)];
}

export function submitAar(puzzleState, spec, puzzleSpec, answers, useIncomplete) {
  puzzleState.aar.attempts = (puzzleState.aar.attempts || 0) + 1;
  puzzleState.aar.answers = { ...answers };
  puzzleState.aar.itemIds = claimsForAttempt(spec, puzzleState.aar.attempts).map((item) => item.id);
  const score = scoreAnswers(spec, answers, puzzleState.aar.attempts);
  const result = aarResult(score, useIncomplete);
  puzzleState.aar.result = result;
  puzzleState.aar.remediation = result === "clearance" ? [] : remediationFor(spec, score, useIncomplete, puzzleSpec);
  return {
    result,
    score,
    title: result === "clearance" ? spec.clearance.title : spec.moreEvidence.title,
    lines: result === "clearance" ? spec.clearance.lines : puzzleState.aar.remediation
  };
}

export function resetAarAnswers(puzzleState) {
  puzzleState.aar.answers = {};
  puzzleState.aar.result = null;
  return puzzleState;
}

export function goodEvidenceCase() {
  return {
    "aar-obs": ["CH-01"],
    "aar-table": ["CH-03", "CH-02"],
    "aar-pulse": ["CH-05", "CH-07"],
    "aar-clocks": ["CH-06", "CH-01"],
    "aar-return": ["CH-05", "CH-08"]
  };
}
