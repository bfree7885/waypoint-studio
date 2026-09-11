/**
 * Summit tutor policy: intents, hint ladder, adaptive struggle.
 * Does not speak. Does not complete puzzles.
 */

export const LEVEL = {
  ORIENT: 0,
  NOTICE: 1,
  REASON: 2,
  TEACH: 3,
  SCAFFOLD: 4
};

const INTENTS = [
  { id: "what_now", re: /what (am i|should i) (supposed to )?do|where do i (start|go)|what next|i'?m lost|what now/i },
  { id: "notice", re: /what should i (notice|look( for)?|inspect)|what am i looking|what did i (see|find)|high look/i },
  { id: "why_wrong", re: /why (was|is) (that|it|this|my (answer|case|evidence))? ?wrong|why (didn'?t|doesn'?t) (this|that|it) work|why reject|wren (said|rejected)/i },
  { id: "why_evidence", re: /why (doesn'?t|didn'?t) this evidence|what evidence am i missing|which (note|evidence)|pin/i },
  { id: "compare", re: /what should i compare|compare|which (trial|slope|reach) /i },
  { id: "graph", re: /graph|table|numbers|times? (i )?recorded|axis|plot/i },
  { id: "explain_more", re: /explain more|say more|more detail|i still don'?t|still don'?t get/i },
  { id: "explain", re: /explain|what does that mean|help me understand|teach me|i don'?t understand|why did the water|move faster/i },
  { id: "hint", re: /hint|clue|another hint|i'?m stuck|stuck|nudge/i },
  { id: "vocab", re: /what is |what'?s |define |meaning of |runoff|slope|fair test|variable|observation|interpretation|system|storage|timescale|revision|gravity|pattern|downstream|evidence|cause/i },
  { id: "missing", re: /missing|don'?t have|haven'?t (got|measured|collected)|need more evidence/i }
];

const VOCAB_TERMS = [
  "fair test",
  "interpretation",
  "observation",
  "timescale",
  "downstream",
  "revision",
  "variable",
  "evidence",
  "storage",
  "pattern",
  "runoff",
  "system",
  "gravity",
  "slope",
  "cause",
  "correlation"
];

export function detectIntent(question, action) {
  if (action === "hint") return { intent: "hint", conceptId: null };
  if (action === "what_now") return { intent: "what_now", conceptId: null };
  if (action === "notice") return { intent: "notice", conceptId: null };
  if (action === "why_wrong") return { intent: "why_wrong", conceptId: null };
  if (action === "explain") return { intent: "explain", conceptId: null };
  if (action === "explain_more") return { intent: "explain_more", conceptId: null };
  const text = String(question || "").trim();
  if (!text) return { intent: "what_now", conceptId: null };
  const lower = text.toLowerCase();
  const conceptId = VOCAB_TERMS.find((term) => lower.includes(term));
  for (const row of INTENTS) {
    if (row.re.test(text)) {
      if (row.id === "vocab") return { intent: "vocab", conceptId: conceptId || "observation" };
      return { intent: row.id, conceptId };
    }
  }
  if (conceptId) return { intent: "vocab", conceptId };
  return { intent: "what_now", conceptId };
}

export function conceptKey(term) {
  if (!term) return null;
  const map = {
    "fair test": "fair-test",
    interpretation: "interpretation",
    observation: "observation",
    timescale: "timescale",
    downstream: "downstream",
    revision: "revision",
    variable: "variable",
    evidence: "evidence",
    storage: "storage",
    pattern: "pattern",
    runoff: "runoff",
    system: "system",
    gravity: "gravity",
    slope: "slope",
    cause: "cause",
    correlation: "correlation"
  };
  return map[term] || term;
}

export function shouldClimb(intent, action) {
  return intent === "hint" || action === "hint" || intent === "explain_more" || action === "explain_more";
}

export function nextLevel(current, intent, struggleFails) {
  let level = Math.max(0, Math.min(LEVEL.SCAFFOLD, current || 0));
  if (shouldClimb(intent) || intent === "hint") {
    if (level < LEVEL.SCAFFOLD) level += 1;
  } else if (intent === "explain" && level < LEVEL.TEACH) {
    level = LEVEL.TEACH;
  } else if (intent === "why_wrong" && struggleFails >= 2 && level < LEVEL.REASON) {
    level = LEVEL.REASON;
  }
  if (struggleFails >= 5 && level < LEVEL.TEACH) level = LEVEL.TEACH;
  if (struggleFails >= 7 && level < LEVEL.SCAFFOLD) level = LEVEL.SCAFFOLD;
  return level;
}

export function noteStruggle(state, puzzleId, kind) {
  const same = state.struggle.puzzleId === puzzleId && state.struggle.lastKind === kind;
  state.struggle = {
    puzzleId,
    fails: same ? (state.struggle.fails || 0) + 1 : 1,
    lastKind: kind || "fail"
  };
  if (state.struggle.fails >= 2) state.idea = true;
  const slot = state.byPuzzle[puzzleId] || { level: 0, hintAsks: 0, concepts: [], misconceptions: [] };
  if (state.struggle.fails >= 3 && slot.level < 2) slot.level = 2;
  if (state.struggle.fails >= 5 && slot.level < 3) slot.level = 3;
  if (state.struggle.fails >= 7 && slot.level < 4) slot.level = 4;
  state.byPuzzle[puzzleId] = slot;
  return state.struggle;
}

export function noteSuccess(state, puzzleId) {
  if (state.struggle.puzzleId === puzzleId) {
    state.struggle = { puzzleId: "", fails: 0, lastKind: "" };
  }
  state.idea = false;
}

export function rememberRecent(state, entry) {
  const row = {
    role: entry.role,
    kind: entry.kind || "",
    intent: entry.intent || "",
    text: String(entry.text || "").slice(0, 280)
  };
  state.recent = [...(state.recent || []), row].slice(-8);
}

export function rememberConcept(state, puzzleId, conceptId) {
  if (!conceptId) return;
  if (!state.conceptsExplained.includes(conceptId)) state.conceptsExplained.push(conceptId);
  const slot = state.byPuzzle[puzzleId] || { level: 0, hintAsks: 0, concepts: [], misconceptions: [] };
  if (!slot.concepts.includes(conceptId)) slot.concepts.push(conceptId);
  state.byPuzzle[puzzleId] = slot;
}

export function rememberMisconception(state, puzzleId, id) {
  if (!id) return;
  if (!state.misconceptionsAddressed.includes(id)) state.misconceptionsAddressed.push(id);
  const slot = state.byPuzzle[puzzleId] || { level: 0, hintAsks: 0, concepts: [], misconceptions: [] };
  if (!slot.misconceptions.includes(id)) slot.misconceptions.push(id);
  state.byPuzzle[puzzleId] = slot;
}
