/**
 * Supervised Summit field-test harness.
 * Local, anonymous, opt-in. Does not change normal TerrainBound behavior.
 */

import { comparisonStatus } from "./summit-concepts.js";
import { isNextActionAsk } from "./summit-route.js";

export const FIELDTEST_MARKS = ["HELPED", "CONFUSING", "TOO_MUCH", "WRONG", "OTHER"];
// Intentionally unused: field-test logs stay in memory until export. Do not write transcripts to localStorage.
export const FIELDTEST_STORAGE_KEY = "terrainbound.fieldtest.session.v1";

function emailRe() {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
}
function ipv4Re() {
  return /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
}
function secretRe() {
  return /\b(SUMMIT_API_KEY|api[_-]?key|authorization|bearer)\b[:\s=]*\S+|\b(sk-|gsk_|ghp_|xox[baprs]-)[A-Za-z0-9_-]+/gi;
}
function phoneRe() {
  return /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
}

export function isFieldTestMode(search = "") {
  try {
    const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    return params.get("summit") === "fieldtest";
  } catch {
    return false;
  }
}

export function randomSessionId() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join("");
}

export function createFieldTestSession(extra = {}) {
  const startedAt = extra.startedAt || Date.now();
  return {
    version: 1,
    fieldTest: true,
    sessionId: extra.sessionId || randomSessionId(),
    startedAt,
    endedAt: null,
    region: "cedar-hollow",
    events: [],
    marks: []
  };
}

export function scrubLoggedText(text) {
  return String(text || "")
    .replace(secretRe(), "[redacted-secret]")
    .replace(emailRe(), "[redacted-email]")
    .replace(phoneRe(), "[redacted-phone]")
    .replace(ipv4Re(), "[redacted-net]")
    .slice(0, 600);
}

export function worldSnapshot(context = {}) {
  const fair = context.raw?.flume?.fairTrials || [];
  const comparison = comparisonStatus(fair);
  const near = context.location?.near || [];
  return {
    region: context.regionId || "cedar-hollow",
    puzzleId: context.activePuzzleId || "",
    puzzleName: context.puzzleName || "",
    stage: context.puzzleStage || "",
    near: near.slice(0, 3),
    evidenceCount: (context.evidenceEarned || []).length,
    fairTrialCount: fair.length,
    comparisonReady: Boolean(comparison.comparisonReady),
    steepMeasured: Boolean(comparison.steepMeasured),
    gentleMeasured: Boolean(comparison.gentleMeasured),
    inspectedHighLook: (context.observations || []).includes("high-look"),
    clearance: context.aar?.result === "clearance",
    aarOpen: Boolean(context.aar?.open),
    aarResult: context.aar?.result || "",
    hypothesisReady: Boolean(context.investigation?.hypothesis?.requiredProcess)
  };
}

export function diffSnapshots(before = {}, after = {}) {
  const signals = [];
  if ((after.fairTrialCount || 0) > (before.fairTrialCount || 0)) signals.push("completed-required-action");
  if ((after.evidenceCount || 0) > (before.evidenceCount || 0)) signals.push("earned-evidence");
  if (after.stage && after.stage !== before.stage) signals.push("progressed-puzzle");
  if (after.puzzleId && before.puzzleId && after.puzzleId !== before.puzzleId) signals.push("progressed-puzzle");
  if (after.inspectedHighLook && !before.inspectedHighLook) signals.push("completed-required-action");
  if (after.aarResult === "more-evidence" && before.aarResult !== "more-evidence") signals.push("revised-explanation");
  if (after.clearance && !before.clearance) signals.push("clearance");
  return [...new Set(signals)];
}

export function routeKind(reply = {}) {
  if (!reply.route?.useAi) return "deterministic";
  if (reply.fallbackReason) return "fallback";
  return "hosted";
}

export function validatorResult(reply = {}) {
  if (!reply.route?.useAi) return "skipped";
  if (reply.fallbackReason) return "rejected";
  return "ok";
}

export function recordSummitTurn(session, payload = {}) {
  const prev = [...(session.events || [])].reverse().find((row) => row.type === "summit");
  const atMs = payload.atMs != null ? payload.atMs : Date.now() - session.startedAt;
  const utterance = scrubLoggedText(payload.studentUtterance || "");
  const visible = scrubLoggedText(payload.visibleResponse || "");
  const nextAsk = isNextActionAsk(payload.studentUtterance || "") || payload.routeReason === "next-action";
  const turn = {
    type: "summit",
    id: payload.id || `t${(session.events || []).filter((row) => row.type === "summit").length + 1}`,
    prevTurnId: prev?.id || "",
    atMs,
    region: payload.region || "cedar-hollow",
    puzzle: payload.puzzle || "",
    puzzleStage: payload.puzzleStage || "",
    locationCategory: payload.locationCategory || "",
    studentUtterance: utterance,
    action: payload.action || "",
    routeKind: payload.routeKind || "deterministic",
    routeReason: payload.routeReason || "",
    concept: payload.concept || "",
    supportLevel: Number.isFinite(payload.supportLevel) ? payload.supportLevel : 0,
    modelLatencyMs: Number.isFinite(payload.modelLatencyMs) ? payload.modelLatencyMs : null,
    fullLoopMs: Number.isFinite(payload.fullLoopMs) ? payload.fullLoopMs : null,
    validatorResult: payload.validatorResult || "skipped",
    fallbackOccurred: Boolean(payload.fallbackOccurred),
    fallbackReason: payload.fallbackReason || "",
    visibleResponse: visible,
    nextActionAppended: nextAsk ? scrubLoggedText(payload.nextActionText || "") : "",
    comparisonReady: Boolean(payload.comparisonReady),
    steepMeasured: Boolean(payload.steepMeasured),
    gentleMeasured: Boolean(payload.gentleMeasured),
    misconceptionId: payload.misconceptionId || "",
    snapshot: payload.snapshot || null
  };
  session.events.push(turn);
  return turn;
}

export function recordWorldEvent(session, payload = {}) {
  const event = {
    type: "world",
    id: payload.id || `w${(session.events || []).filter((row) => row.type === "world").length + 1}`,
    atMs: payload.atMs != null ? payload.atMs : Date.now() - session.startedAt,
    kind: payload.kind || "progress",
    snapshot: payload.snapshot || null
  };
  session.events.push(event);
  return event;
}

export function markTurn(session, turnId, mark, note = "") {
  const allowed = FIELDTEST_MARKS.includes(mark) ? mark : "OTHER";
  const row = {
    turnId,
    mark: allowed,
    note: scrubLoggedText(note).slice(0, 240),
    atMs: Date.now() - session.startedAt
  };
  session.marks.push(row);
  return row;
}

export function attachProgressSignals(session) {
  const events = session.events || [];
  const summitTurns = events.filter((row) => row.type === "summit");
  for (let i = 0; i < summitTurns.length; i += 1) {
    const turn = summitTurns[i];
    const start = events.indexOf(turn);
    const nextSummit = summitTurns[i + 1];
    const end = nextSummit ? events.indexOf(nextSummit) : events.length;
    const later = events.slice(start + 1, end);
    const worldLater = later.filter((row) => row.type === "world");
    const signals = [];
    for (const world of worldLater) {
      signals.push(...diffSnapshots(turn.snapshot || {}, world.snapshot || {}));
    }
    turn.followedByProgress = signals.length > 0;
    turn.progressSignals = [...new Set(signals)];
    turn.followedByRepeatHelp = Boolean(nextSummit) && !turn.followedByProgress;
    const prev = summitTurns[i - 1];
    turn.repeatedMisconception = Boolean(
      turn.misconceptionId && prev?.misconceptionId && turn.misconceptionId === prev.misconceptionId
    );
  }
  return session;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

function latencyStats(values) {
  const sorted = [...values].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return { n: 0, mean: null, median: null, p95: null };
  return {
    n: sorted.length,
    mean: Math.round(sorted.reduce((s, n) => s + n, 0) / sorted.length),
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95)
  };
}

export function summarizeFieldTest(session) {
  attachProgressSignals(session);
  const endedAt = session.endedAt || Date.now();
  const turns = (session.events || []).filter((row) => row.type === "summit");
  const hosted = turns.filter((row) => row.routeKind === "hosted");
  const det = turns.filter((row) => row.routeKind === "deterministic");
  const fallback = turns.filter((row) => row.routeKind === "fallback");
  const rejected = turns.filter((row) => row.validatorResult === "rejected");
  const concepts = {};
  const levels = {};
  for (const turn of turns) {
    if (turn.concept) concepts[turn.concept] = (concepts[turn.concept] || 0) + 1;
    const key = String(turn.supportLevel);
    levels[key] = (levels[key] || 0) + 1;
  }
  const marks = {};
  for (const row of session.marks || []) marks[row.mark] = (marks[row.mark] || 0) + 1;
  const snapshots = (session.events || []).map((row) => row.snapshot).filter(Boolean);
  const lastSnap = snapshots[snapshots.length - 1] || {};
  const puzzles = [...new Set(turns.map((row) => row.puzzle).filter(Boolean))];
  const repeated = turns.filter((row) => row.repeatedMisconception).map((row) => row.misconceptionId);
  return {
    sessionId: session.sessionId,
    durationMs: endedAt - session.startedAt,
    puzzlesAttempted: puzzles,
    puzzlesCompleted: lastSnap.clearance ? puzzles : puzzles.filter((id) => id && id !== lastSnap.puzzleId),
    summitTurns: turns.length,
    deterministicTurns: det.length,
    hostedTurns: hosted.length,
    fallbacks: fallback.length,
    validatorRejections: rejected.length,
    latency: {
      model: latencyStats(hosted.map((row) => row.modelLatencyMs)),
      fullLoop: latencyStats(turns.map((row) => row.fullLoopMs).filter((n) => Number.isFinite(n)))
    },
    supportLevels: levels,
    conceptsAsked: concepts,
    repeatedMisconceptions: [...new Set(repeated)],
    marks,
    helpedThenProgressed: turns.filter((row) => row.followedByProgress).length,
    repeatHelpWithoutProgress: turns.filter((row) => row.followedByRepeatHelp).length,
    clearance: Boolean(lastSnap.clearance),
    aarResult: lastSnap.aarResult || (lastSnap.clearance ? "clearance" : "")
  };
}

export function formatFieldTestMarkdown(session, summary) {
  const s = summary || summarizeFieldTest(session);
  const lines = [
    "# TerrainBound Summit field-test summary",
    "",
    `- Session: \`${s.sessionId}\``,
    `- Duration: ${Math.round((s.durationMs || 0) / 1000)}s`,
    `- Summit turns: ${s.summitTurns} (deterministic ${s.deterministicTurns}, hosted ${s.hostedTurns}, fallback ${s.fallbacks})`,
    `- Validator rejections: ${s.validatorRejections}`,
    `- Clearance: ${s.clearance ? "granted by Wren" : "not granted"}`,
    `- Helped then progressed: ${s.helpedThenProgressed}`,
    `- Repeat help without progress: ${s.repeatHelpWithoutProgress}`,
    `- Marks: ${JSON.stringify(s.marks)}`,
    `- Concepts: ${JSON.stringify(s.conceptsAsked)}`,
    `- Support levels: ${JSON.stringify(s.supportLevels)}`,
    `- Latency full-loop median/p95: ${s.latency.fullLoop.median ?? "—"} / ${s.latency.fullLoop.p95 ?? "—"} ms`,
    "",
    "## Turns",
    ""
  ];
  for (const turn of (session.events || []).filter((row) => row.type === "summit")) {
    lines.push(
      `- **${turn.id}** [${turn.routeKind}/${turn.routeReason}] L${turn.supportLevel} \`${scrubLoggedText(turn.studentUtterance)}\` → ${scrubLoggedText(turn.visibleResponse).slice(0, 180)}`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function serializeFieldTest(session) {
  attachProgressSignals(session);
  const ended = { ...session, endedAt: session.endedAt || Date.now() };
  const summary = summarizeFieldTest(ended);
  return {
    session: ended,
    summary
  };
}

export function exportFilenames(session) {
  const id = (session.sessionId || "session").slice(0, 12);
  return {
    json: `terrainbound-fieldtest-${id}.json`,
    md: `terrainbound-fieldtest-${id}.md`
  };
}

export function logLooksPrivate(value) {
  const blob = JSON.stringify(value || {});
  if (emailRe().test(blob) || secretRe().test(blob)) return true;
  if (/"email"|"studentName"|"school"|"accountId"|"ipAddress"/i.test(blob)) return true;
  return false;
}
