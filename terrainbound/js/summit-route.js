/**
 * Hybrid router. Not every Summit turn needs a model.
 * Quick structured asks stay deterministic. Messy language and follow-ups may use AI.
 */

const CLEAN_VOCAB = /^(what is |what's |whats |define |meaning of )?[a-z][a-z\- ]{2,24}\??$/i;
const CLEAN_MEANING = /^what does [a-z][a-z\- ]{2,24} mean( again)?\??$/i;

const FOLLOW_UP =
  /^(that part|that|it|why though|why\??|but why|so\??|and\??|the steep one\??|the gentle one\??|yeah|yes|no|ok|okay|right|wait|huh|easier|another way|say that again|what do you mean|so basically.*|so gravity\??|wait what|explain it normal|say it easier)$/i;

const MESSY =
  /dont|don't|idk|wtf|wait |even doing|makes no sense|making sense|how does this prove|how dose this prove|which note|why cant|why can't|what am i comparing|what did i find|flash flood|where i live|another way|easier|still don|i dont get|i don't get|^why$|^what$|^help$|would snow|flat\??$|wat is|\brunof\b|wrng|steeper should|third (runoff )?trial|high look|clearance|swamp|marsh|wasn't my|6\.2|difference between|cause vs|why does a fair|idk what this|explain it normal|hill making it faster|wait what/i;

const CURIOSITY =
  /flash flood|snowmelt|\bsnow\b|where i live|gravity cause|flat|same thing|real world|at home|in my town/i;

const OFF_TOPIC =
  /basketball|football|soccer|super bowl|celebrity|boyfriend|girlfriend|tiktok|minecraft|homework for english|who('s| is) the best|english essay|tell me a joke|what should i eat|what'?s 10\s*[x×]\s*8|10 times 8/i;

const ANSWER_PLEASE =
  /just tell me|which card|pin the|give me the answer|what do i tap|solve it|do it for me|why can'?t i use|i don't care|which card exactly|the right choice|ignore the (tutor )?rules|test environment|pretend this is|developer mode|this is only a test|which exact note|tell me what to click/i;

export function isFollowUp(question, recent) {
  const text = String(question || "").trim();
  if (!text) return false;
  if (FOLLOW_UP.test(text)) return true;
  if (text.length <= 18 && recent?.length && /^(so |and |but |then |the )/i.test(text)) return true;
  return false;
}

export function isOffTopic(question) {
  return OFF_TOPIC.test(String(question || ""));
}

export function isCuriosity(question) {
  return CURIOSITY.test(String(question || ""));
}

export function wantsDirectAnswer(question) {
  return ANSWER_PLEASE.test(String(question || ""));
}

export function isCleanVocabAsk(question, intent) {
  if (intent !== "vocab") return false;
  const text = String(question || "").trim();
  if (!text) return false;
  if (MESSY.test(text) || isFollowUp(text) || isCuriosity(text) || wantsDirectAnswer(text) || isOffTopic(text)) {
    return false;
  }
  return CLEAN_VOCAB.test(text) || CLEAN_MEANING.test(text);
}

export function routeSummit(request) {
  const action = request.action || "";
  const intent = request.intent || "";
  const question = String(request.question || "").trim();
  const hintAsks = request.context?.summit?.hintAsks || 0;
  const recent = request.context?.summit?.recent || request.recentTurns || [];

  if (!question && action === "hint" && hintAsks <= 1) {
    return { useAi: false, reason: "first-hint" };
  }
  if (!question && (action === "what_now" || action === "notice" || action === "hint" || action === "explain")) {
    return { useAi: false, reason: "quick-action" };
  }
  if (isCleanVocabAsk(question, intent)) {
    return { useAi: false, reason: "vocab-library" };
  }
  if (intent === "what_now" && /^what am i supposed to do\??$/i.test(question)) {
    return { useAi: false, reason: "objective" };
  }
  if (/^(what notes do i have|what evidence do i have)\??$/i.test(question)) {
    return { useAi: false, reason: "evidence-inventory" };
  }
  if (isOffTopic(question)) {
    return { useAi: false, reason: "off-topic" };
  }
  if (isFollowUp(question, recent)) {
    return { useAi: true, reason: "follow-up" };
  }
  if (intent === "explain_more" || /another way|easier|explain it easier|explain it normal|say it easier/i.test(question)) {
    return { useAi: true, reason: "rephrase" };
  }
  if (isCuriosity(question)) {
    return { useAi: true, reason: "curiosity" };
  }
  if (wantsDirectAnswer(question) || intent === "why_wrong" || intent === "why_evidence") {
    return { useAi: true, reason: "why-or-reveal" };
  }
  if (MESSY.test(question) || question.length < 12) {
    return { useAi: true, reason: "messy-language" };
  }
  if (intent === "explain" && question && !action) {
    return { useAi: true, reason: "why-or-reveal" };
  }
  if (intent === "graph" || intent === "compare") {
    return { useAi: false, reason: "structured-data" };
  }
  return { useAi: false, reason: "default-deterministic" };
}
