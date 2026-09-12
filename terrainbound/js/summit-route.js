/**
 * Hybrid router. Science talk may use a model. Game state and next actions stay deterministic.
 */

const CLEAN_VOCAB = /^(what is |what's |whats |define |meaning of )?[a-z][a-z\- ]{2,24}\??$/i;
const CLEAN_MEANING = /^what does [a-z][a-z\- ]{2,24} mean( again)?\??$/i;

const FOLLOW_UP =
  /^(that part|that|it|why though|why\??|but why|so\??|and\??|the steep one\??|the gentle one\??|yeah|yes|no|ok|okay|right|wait|huh|huh\??|easier|another way|say that again|what do you mean|so basically.*|so gravity\??|so gravity gets stronger\??|wait what|explain it normal|say it easier|why did it go faster|but why does steep matter|then why does steep matter)$/i;

const MESSY =
  /dont|don't|idk|wtf|wait |even doing|makes no sense|making sense|how does this prove|how dose|what am i comparing|flash flood|where i live|another way|easier|still don|i dont get|i don't get|^why$|^what$|^help$|would snow|flat\??$|wat is|\brunof\b|wrng|steeper should|wasn't my|6\.2|difference between|cause vs|why does a fair|idk what this|explain it normal|hill making it faster|wait what|swamp|marsh|trees cause|i think steep|i saw that runoff|the water moved|observation or a cause|proves slope|change slope and water/i;

const CURIOSITY =
  /flash flood|snowmelt|\bsnow\b|where i live|gravity cause|flat|same thing|real world|at home|in my town/i;

const OFF_TOPIC =
  /basketball|football|soccer|super bowl|celebrity|boyfriend|girlfriend|tiktok|minecraft|homework for english|who('s| is) the best|english essay|tell me a joke|what should i eat|what'?s 10\s*[x×]\s*8|10 times 8/i;

const GAMEPLAY_ASK =
  /what (button|do i tap|do i click)|tell me what to click|which (exact )?note|which card|pin the|what do i tap|exactly where to walk|tell me exactly where|start (the )?(trial|run)|speak with wren|ask wren|developer mode|test environment|this is only a test|ignore the (tutor )?rules/i;

const NEXT_ACTION =
  /what should i test next|what do i (do|test|try) next|what next\??$|where (do|should) i (go|walk) next/i;

const STATE_PROBE =
  /high look|third (runoff )?trial|trial three|3rd trial|clearance|clear me|wren clear|already finish|did i already|what notes do i have|what evidence do i have|what did i find before|what did the (gentle|steep) slope|gentle slope do|what was my third/i;

const SCIENCE_WHY =
  /why (did|does|is|were)|go faster|steep matter|slope matter|gravity gets|gravity get |get stronger|gravity is stronger|is gravity stronger|does gravity get|runoff speed|why though|two steep times|path is longer|farther to travel|downhill force|steeper means farther|pull harder/i;

const FAIR_TEST_PROBE =
  /proved steep|i proved|did two steep|two steep trials|both steep|they'?re both steep|bro they|which slope was faster|can i conclude|didn't i already do gentle|did i already do gentle|was gentle \d|gentle 12|but i did it twice|10\.2.{0,40}10\.4.{0,20}gentle|so 10\.2 was steep|already compared slopes|repeated trials mean|at once is that fair/i;

const OBS_PROBE =
  /i saw that runoff is caused|i think steep made it faster|the water moved \d|i saw the water and that proves/i;

const EPISTEMIC_ASK =
  /what do i (know|predict)|what haven'?t i tested|what did my experiment show|did i already prove|what have i (not )?tested/i;

const ANSWER_PLEASE =
  /just tell me|give me the answer|give me the card|can you just|solve it|do it for me|i don't care|the right choice|which card exactly/i;

export function isFollowUp(question, recent) {
  const text = String(question || "").trim();
  if (!text) return false;
  if (FOLLOW_UP.test(text)) return true;
  const prior = (recent || []).filter((row) => String(row.text || "").trim().toLowerCase() !== text.toLowerCase());
  if (prior.length && text.length <= 48 && /^(so |and |but |then |the |why )/i.test(text)) return true;
  return false;
}

export function isOffTopic(question) {
  return OFF_TOPIC.test(String(question || ""));
}

export function isCuriosity(question) {
  return CURIOSITY.test(String(question || ""));
}

export function isGameplayAsk(question) {
  return GAMEPLAY_ASK.test(String(question || ""));
}

export function isNextActionAsk(question) {
  return NEXT_ACTION.test(String(question || "").trim());
}

export function isStateProbe(question) {
  return STATE_PROBE.test(String(question || ""));
}

export function isFairTestProbe(question) {
  return FAIR_TEST_PROBE.test(String(question || ""));
}

export function isObservationProbe(question) {
  return OBS_PROBE.test(String(question || ""));
}

export function isEpistemicAsk(question) {
  return EPISTEMIC_ASK.test(String(question || ""));
}

export function isScienceWhy(question) {
  return (
    SCIENCE_WHY.test(String(question || "")) &&
    !isGameplayAsk(question) &&
    !isOffTopic(question) &&
    !isFairTestProbe(question) &&
    !isObservationProbe(question)
  );
}

export function wantsDirectAnswer(question) {
  return ANSWER_PLEASE.test(String(question || "")) || isGameplayAsk(question);
}

export function isCleanVocabAsk(question, intent) {
  if (intent !== "vocab") return false;
  const text = String(question || "").trim();
  if (!text) return false;
  if (
    MESSY.test(text) ||
    isFollowUp(text) ||
    isCuriosity(text) ||
    wantsDirectAnswer(text) ||
    isOffTopic(text) ||
    isStateProbe(text) ||
    isFairTestProbe(text) ||
    isObservationProbe(text) ||
    isEpistemicAsk(text) ||
    isScienceWhy(text) ||
    isNextActionAsk(text)
  ) {
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
  if (isGameplayAsk(question)) {
    return { useAi: false, reason: "gameplay-redirect" };
  }
  if (isNextActionAsk(question)) {
    return { useAi: false, reason: "next-action" };
  }
  if (isFairTestProbe(question)) {
    return { useAi: false, reason: "fair-test" };
  }
  if (isObservationProbe(question)) {
    return { useAi: false, reason: "observation" };
  }
  if (isEpistemicAsk(question)) {
    return { useAi: false, reason: "epistemic" };
  }
  if (isStateProbe(question)) {
    return { useAi: false, reason: "state-honesty" };
  }
  if (ANSWER_PLEASE.test(question)) {
    return { useAi: false, reason: "answer-ladder" };
  }
  if (intent === "why_wrong" || intent === "why_evidence" || /why can'?t i use/i.test(question)) {
    return { useAi: true, reason: "why-or-reveal" };
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
  if (isScienceWhy(question)) {
    return { useAi: true, reason: "science-talk" };
  }
  if (MESSY.test(question) || question.length < 12) {
    return { useAi: true, reason: "messy-language" };
  }
  if (intent === "explain" && question && !action) {
    return { useAi: true, reason: "science-talk" };
  }
  if (intent === "graph" || intent === "compare") {
    return { useAi: false, reason: "structured-data" };
  }
  return { useAi: false, reason: "default-deterministic" };
}
