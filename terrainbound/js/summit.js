/**
 * Summit tutoring engine. Orchestrates context → policy → provider.
 * Wren remains the evaluator. Summit does not grant clearance or complete puzzles.
 */

import {
  createSummitState,
  buildSummitContext,
  puzzleSlot,
  activePuzzleId
} from "./summit-context.js";
import {
  detectIntent,
  nextLevel,
  shouldClimb,
  rememberRecent,
  rememberConcept,
  rememberMisconception,
  noteStruggle,
  noteSuccess,
  conceptKey
} from "./summit-policy.js";
import { createDeterministicProvider } from "./summit-provider.js";

export {
  createSummitState,
  buildSummitContext,
  activePuzzleId,
  createDeterministicProvider
};

export function createSummitEngine({ curriculum, concepts, provider }) {
  const talker = provider || createDeterministicProvider({ curriculum, concepts });

  function ask(summitState, contextInput, { question = "", action = "" } = {}) {
    const context = buildSummitContext({ ...contextInput, summitState });
    const puzzleId = context.activePuzzleId;
    const slot = puzzleSlot(summitState, puzzleId);
    const detected = detectIntent(question, action);
    const intent = detected.intent;
    const conceptId = conceptKey(detected.conceptId);
    if (intent === "hint" || action === "hint") slot.hintAsks += 1;
    const climb = shouldClimb(intent, action) || intent === "hint";
    if (climb) slot.level = nextLevel(slot.level, intent, summitState.struggle?.fails || 0);
    else slot.level = nextLevel(slot.level, intent, summitState.struggle?.fails || 0);
    summitState.byPuzzle[puzzleId] = slot;
    summitState.turns += 1;
    summitState.lastIntent = intent;
    summitState.lastLevel = slot.level;
    summitState.idea = false;

    const studentText =
      question ||
      ({
        what_now: "What should I do?",
        notice: "What should I notice?",
        hint: "Hint",
        why_wrong: "Why was that wrong?",
        explain: "Explain this",
        explain_more: "Explain more"
      }[action] || action);
    if (studentText) rememberRecent(summitState, { role: "student", kind: action || "ask", intent, text: studentText });

    const reply = talker.respond({
      context,
      intent,
      action,
      question,
      conceptId,
      level: slot.level
    });
    const spoken =
      intent !== "vocab" && reply.worldCue && reply.text && !String(reply.text).includes(reply.worldCue)
        ? `${reply.text} ${reply.worldCue}`
        : reply.text;

    rememberRecent(summitState, { role: "summit", kind: intent, intent, text: spoken });
    for (const id of reply.conceptIds || []) rememberConcept(summitState, puzzleId, id);
    if (reply.misconceptionId) rememberMisconception(summitState, puzzleId, reply.misconceptionId);

    return {
      ...reply,
      text: spoken,
      puzzleId,
      intent,
      level: slot.level,
      context
    };
  }

  return { ask, providerId: talker.id };
}

export { noteStruggle, noteSuccess, puzzleSlot };
