/**
 * Summit tutoring engine. Orchestrates context → policy → hybrid provider.
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
import { createHybridProvider } from "./summit-hybrid.js";
import { createAiProvider, createHttpAdapter, createFixtureAdapter, SUMMIT_MODEL_REQUIREMENTS } from "./summit-ai.js";
import { createLocalComposerAdapter } from "./summit-compose.js";
import { selectSummitPacket } from "./summit-packet.js";
import { routeSummit, isGameplayAsk, isNextActionAsk } from "./summit-route.js";
import { validateSummitOutput } from "./summit-validate.js";
import { composeStudentVisible } from "./summit-compose.js";
import { buildSummitTruth } from "./summit-truth.js";
import { SUMMIT_CONCEPTS, comparisonStatus } from "./summit-concepts.js";
import { checkConceptClaims } from "./summit-science.js";

export {
  createSummitState,
  buildSummitContext,
  activePuzzleId,
  createDeterministicProvider,
  createHybridProvider,
  createAiProvider,
  createHttpAdapter,
  createFixtureAdapter,
  createLocalComposerAdapter,
  selectSummitPacket,
  routeSummit,
  validateSummitOutput,
  composeStudentVisible,
  buildSummitTruth,
  isGameplayAsk,
  isNextActionAsk,
  SUMMIT_CONCEPTS,
  comparisonStatus,
  checkConceptClaims,
  SUMMIT_MODEL_REQUIREMENTS
};

export function createSummitEngine({ curriculum, concepts, curiosity, provider, adapter, timeoutMs } = {}) {
  const talker =
    provider ||
    createDeterministicProvider({ curriculum, concepts });

  function ask(summitState, contextInput, { question = "", action = "" } = {}) {
    const context = buildSummitContext({ ...contextInput, summitState });
    const puzzleId = context.activePuzzleId;
    const slot = puzzleSlot(summitState, puzzleId);
    const detected = detectIntent(question, action);
    const intent = detected.intent;
    const conceptId = conceptKey(detected.conceptId);
    if (intent === "hint" || action === "hint") slot.hintAsks += 1;
    slot.level = nextLevel(slot.level, intent, summitState.struggle?.fails || 0);
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

    const request = {
      context,
      intent,
      action,
      question,
      conceptId,
      level: slot.level,
      recentTurns: summitState.recent
    };

    const reply = talker.respond(request);
    if (reply && typeof reply.then === "function") {
      return reply.then((row) => finalize(summitState, puzzleId, intent, slot, studentText, row, context));
    }
    return finalize(summitState, puzzleId, intent, slot, studentText, reply, context);
  }

  return { ask, providerId: talker.id };
}

function finalize(summitState, puzzleId, intent, slot, studentText, reply, context) {
  const spoken =
    intent !== "vocab" && reply.worldCue && reply.text && !String(reply.text).includes(reply.worldCue)
      ? `${reply.text} ${reply.worldCue}`
      : reply.text;

  rememberRecent(summitState, { role: "summit", kind: intent, intent, text: spoken });
  for (const id of reply.conceptIds || []) rememberConcept(summitState, puzzleId, id);
  if (reply.misconceptionId) rememberMisconception(summitState, puzzleId, reply.misconceptionId);

  summitState.lastDebug = {
    provider: reply.provider || "deterministic",
    adapterId: reply.adapterId || "",
    route: reply.route?.reason || "",
    useAi: Boolean(reply.route?.useAi),
    intent,
    supportLevel: slot.level,
    fallbackReason: reply.fallbackReason || "",
    validation: reply.fallbackReason ? "fallback" : reply.provider === "ai" ? "ok" : "skipped",
    packetKeys: reply.packet ? Object.keys(reply.packet.facts || {}) : [],
    cached: Boolean(reply.cached),
    rawBlocked: Boolean(reply.rawModel) && Boolean(reply.fallbackReason)
  };

  return {
    ...reply,
    text: spoken,
    puzzleId,
    intent,
    level: slot.level,
    context
  };
}

export { noteStruggle, noteSuccess, puzzleSlot, shouldClimb };
