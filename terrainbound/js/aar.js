/**
 * After Action Report. Field debrief, not a unit test.
 * Player sees FIELD CLEARANCE EARNED or MORE EVIDENCE NEEDED.
 */

const PASS = 0.6;

export function itemsForAttempt(spec, attempt = 0) {
  if (attempt <= 1) return spec.items || [];
  const retry = spec.retry || [];
  const byId = new Map((spec.items || []).map((item) => [item.id, item]));
  return (spec.items || []).map((item) => retry.find((row) => row.id === item.id) || byId.get(item.id));
}

export function scoreAnswers(spec, answers, attempt = 0) {
  const items = itemsForAttempt(spec, attempt);
  const rows = [];
  for (const item of items) {
    const choiceId = answers[item.id];
    const choice = (item.choices || []).find((row) => row.id === choiceId);
    const good = choice?.kind === "good";
    rows.push({
      itemId: item.id,
      puzzleId: item.puzzleId,
      competencyId: item.competencyId,
      choiceId: choiceId || null,
      kind: choice?.kind || "missing",
      good
    });
  }
  const answered = rows.filter((row) => row.choiceId);
  const hits = rows.filter((row) => row.good).length;
  const score = answered.length ? hits / items.length : 0;
  const misconception = rows.filter((row) => row.kind === "misconception");
  return { rows, score, hits, total: items.length, misconception };
}

export function aarResult(score, useIncomplete) {
  if (useIncomplete.length) return "more-evidence";
  if (score.score >= PASS && score.misconception.length === 0) return "clearance";
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
    const item = (spec.items || []).find((entry) => entry.id === row.itemId);
    if (row.kind === "misconception") {
      lines.push(misconceptionVoice(row.itemId));
    } else if (item) {
      lines.push(`I still need a defensible line on ${names[item.puzzleId] || item.puzzleId}.`);
    }
  }
  if (!lines.length) lines.push(spec.moreEvidence.lead);
  return [...new Set(lines)];
}

function misconceptionVoice(itemId) {
  if (itemId === "aar-obs") return "The boulder still has a color and grain you can point to. A carrying story is a guess until later work holds it.";
  if (itemId === "aar-table") return "Your unfair run changed two things. That cannot be the slope claim.";
  if (itemId === "aar-pulse") return "The stretch by the station stayed clear. Rain on everything equally does not fit.";
  if (itemId === "aar-clocks") return "Last night's bar is the creek. The mismatched boulder still needs a longer clock — not a vocabulary word.";
  if (itemId === "aar-return") return "If we went back to the station reach, it should still be relatively clear compared with the join.";
  return "The land still disagrees with that line.";
}

export function submitAar(puzzleState, spec, puzzleSpec, answers, useIncomplete) {
  puzzleState.aar.attempts = (puzzleState.aar.attempts || 0) + 1;
  puzzleState.aar.answers = { ...answers };
  puzzleState.aar.itemIds = itemsForAttempt(spec, puzzleState.aar.attempts).map((item) => item.id);
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
