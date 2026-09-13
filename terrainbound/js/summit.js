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
import {
  classifyIntentCategory,
  GAME_HELP_LINE,
  SUMMIT_GREETING
} from "./summit-character.js";
import { chooseSummitExpression, summitPortraitSrc } from "./summit-portrait.js";
import {
  isFieldTestMode,
  createFieldTestSession,
  recordSummitTurn,
  recordWorldEvent,
  markTurn,
  summarizeFieldTest,
  serializeFieldTest,
  formatFieldTestMarkdown,
  worldSnapshot,
  routeKind,
  validatorResult,
  exportFilenames,
  logLooksPrivate,
  FIELDTEST_MARKS
} from "./summit-fieldtest.js";

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
  classifyIntentCategory,
  GAME_HELP_LINE,
  SUMMIT_GREETING,
  chooseSummitExpression,
  summitPortraitSrc,
  isFieldTestMode,
  createFieldTestSession,
  recordSummitTurn,
  recordWorldEvent,
  markTurn,
  summarizeFieldTest,
  serializeFieldTest,
  formatFieldTestMarkdown,
  worldSnapshot,
  routeKind,
  validatorResult,
  exportFilenames,
  logLooksPrivate,
  FIELDTEST_MARKS,
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
        why: "Why?",
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
    request.route = routeSummit(request);

    const reply = talker.respond(request);
    if (reply && typeof reply.then === "function") {
      return reply.then((row) => finalize(summitState, puzzleId, intent, slot, studentText, row, context, request.route));
    }
    return finalize(summitState, puzzleId, intent, slot, studentText, reply, context, request.route);
  }

  return { ask, providerId: talker.id };
}

function shouldAppendWorldCue(intent, routeReason) {
  if (["game_help", "character", "clarification"].includes(intent)) return false;
  if (["game-help", "character", "next-action", "evidence-inventory", "clarification"].includes(routeReason)) {
    return false;
  }
  return true;
}

function finalize(summitState, puzzleId, intent, slot, studentText, reply, context, route) {
  const spoken =
    shouldAppendWorldCue(intent, reply.route?.reason || route?.reason) &&
    intent !== "vocab" &&
    reply.worldCue &&
    reply.text &&
    !String(reply.text).includes(reply.worldCue)
      ? `${reply.text} ${reply.worldCue}`
      : reply.text;

  rememberRecent(summitState, { role: "summit", kind: intent, intent, text: spoken });
  for (const id of reply.conceptIds || []) rememberConcept(summitState, puzzleId, id);
  if (reply.misconceptionId) rememberMisconception(summitState, puzzleId, reply.misconceptionId);

  const attached = reply.route || route || null;
  summitState.lastDebug = {
    provider: reply.provider || "deterministic",
    adapterId: reply.adapterId || "",
    route: attached?.reason || "",
    useAi: Boolean(attached?.useAi),
    intent,
    supportLevel: slot.level,
    fallbackReason: reply.fallbackReason || "",
    validation: reply.fallbackReason ? "fallback" : reply.provider === "ai" ? "ok" : "skipped",
    packetKeys: reply.packet ? Object.keys(reply.packet.facts || {}) : [],
    cached: Boolean(reply.cached),
    rawBlocked: Boolean(reply.rawModel) && Boolean(reply.fallbackReason),
    misconceptionId: reply.misconceptionId || ""
  };

  return {
    ...reply,
    route: attached,
    text: spoken,
    puzzleId,
    intent,
    level: slot.level,
    context
  };
}

export { noteStruggle, noteSuccess, puzzleSlot, shouldClimb };
