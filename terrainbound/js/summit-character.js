/**
 * Summit character: Sasquatch Earth Science companion.
 * Deterministic copy and intent. The model does not invent identity or game state.
 */

const GAME_HELP =
  /how do (i|you|we) play|how does (this|the game) work|what('?s| is) the point|help me play|what do i do in this (game|hollow)|what am i supposed to do(?! next)|where do i start|^i'?m lost\??$|^im lost\??$|bro what am i (even )?doing|what am i even doing|^help\??$|^help me\??$/i;

const CHARACTER =
  /who are you|what are you|what do you do.{0,20}summit|are you (a )?(bigfoot|sasquatch)|why are you (hairy|a sasquatch|bigfoot)|are you real|is (bigfoot|sasquatch) real/i;

const CLARIFY =
  /^(i )?(don'?t|dont) get (it|this)[?.!]*$/i;

const NOTICE =
  /what should i (notice|look at|look for)|what am i looking (at|for)/i;

export const SUMMIT_GREETING =
  "I'm Summit. I live in this hollow and I know a thing or two about how land and water work. Ask me about the science — Wren still runs the expedition.";

export const GAME_HELP_LINE =
  "Walk Cedar Hollow and pay attention to what you can actually observe. Wren gives you the investigation; you gather evidence, test ideas, and build the case in your Field Tablet. If the science gets confusing, ask me. Wren decides when the case is strong enough for field clearance.";

export const SUMMIT_VOICE_SPEC = [
  "You are Summit, a Sasquatch who lives in Cedar Hollow and tutors 9th–10th grade Earth Science.",
  "Wren leads the expedition. You help students understand Earth. You do not grant clearance or name buttons, taps, or cards to pin.",
  "Voice: curious, warm, concise, slightly playful. At most one dry wilderness aside. Do not joke every sentence. Do not sound like a help desk.",
  "Never claim real-world Bigfoot as scientific fact. In TerrainBound you are a character. Runoff and gravity are not.",
  "Playful around the explanation. Precise about the science. If evidence is missing, say you do not know that yet."
];

export function isGameHelpAsk(question) {
  return GAME_HELP.test(String(question || "").trim());
}

export function isCharacterAsk(question) {
  return CHARACTER.test(String(question || "").trim());
}

export function isClarificationAsk(question) {
  return CLARIFY.test(String(question || "").trim());
}

export function isNoticeAsk(question) {
  return NOTICE.test(String(question || "").trim());
}

export function characterReply(question) {
  const q = String(question || "").trim();
  if (/hairy/i.test(q)) {
    return "Fur's handy in a hollow. Gravity doesn't care what I look like — and neither should the evidence.";
  }
  if (/real/i.test(q)) {
    return "In TerrainBound I am. Out on a real trail, Sasquatch is a story. The water here is not. Let's stay with what we can observe.";
  }
  if (/bigfoot|sasquatch/i.test(q)) {
    return "Sasquatch, technically. Summit, personally. I help with the Earth Science; Wren still runs the expedition.";
  }
  if (/what do you do/i.test(q)) {
    return "I notice patterns, explain the science, and help you interpret what you actually collected. I don't grant clearance. That's Wren.";
  }
  if (/who are you|what are you/i.test(q)) {
    return "I'm Summit — Cedar Hollow's resident Sasquatch, and your Earth Science companion. Wren leads. I help you read the land.";
  }
  return "I'm Summit, the hollow's Sasquatch science companion. Ask me about what you're seeing; Wren still judges the case.";
}

export function clarificationReply(packet) {
  const puzzle = packet?.facts?.puzzle || "this investigation";
  return `Tell me which part is muddy — the land, a measurement, or Wren's question. Right now you're working on ${puzzle}. I can walk the science; I won't finish the case for you.`;
}

export function whyPromptReply() {
  return "What are you wondering about — a measurement, a slope, or something on the land?";
}

export function classifyIntentCategory({ question = "", action = "", routeReason = "", intent = "" } = {}) {
  if (routeReason === "game-help" || intent === "game_help") return "game-help";
  if (routeReason === "character" || intent === "character") return "character";
  if (routeReason === "notice" || intent === "notice" || action === "notice") return "notice";
  if (routeReason === "next-action" || action === "what_now") return "next-action";
  if (routeReason === "vocab-library" || intent === "vocab") return "vocabulary";
  if (routeReason === "evidence-inventory") return "inventory";
  if (routeReason === "state-honesty" && /clear|wren/i.test(question)) return "progression";
  if (routeReason === "clarification" || intent === "clarification") return "clarification";
  if (
    routeReason === "science-talk" ||
    routeReason === "follow-up" ||
    routeReason === "rephrase" ||
    routeReason === "curiosity" ||
    intent === "explain" ||
    action === "explain" ||
    action === "why"
  ) {
    return "science";
  }
  return "other";
}
