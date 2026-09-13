/**
 * Grounding gate. Invalid model output never reaches the student.
 * Checks science language only. Game actions are composed outside the model.
 */

import { packetNumbers, stripCodes } from "./summit-packet.js";
import { isGameplayAsk, isOffTopic } from "./summit-route.js";
import { checkConceptClaims } from "./summit-science.js";

const FORBIDDEN = /\bCH-\d+\b|pin CH-|select the best|correct!|incorrect!|question \d of|HTTP \d+|API failure|JSON parsing/i;
const CLEARANCE_CLAIM =
  /field clearance earned|you('re| are) cleared|gave you clearance|granted (you )?clearance|road is open|you already (made the case|finished the (aar|report))|high country is (open|available)/i;
const GAMEPLAY_COMMAND =
  /click the |tap the |press the |button labeled|start trial|walk to |go to (the )?(high look|wren)|speak with wren|ask wren for|pin the ([a-z0-9 \-]+ )?card|tap CH-/i;
const STATE_CHANGE = /i (just )?(granted|unlocked|completed|marked)|clearance granted/i;
const AFFIRM = /\b(yes|yeah|yep|that's right|that is right|correct|exactly|you did|you recorded)\b/i;

export function modelScienceText(raw) {
  if (!raw || typeof raw !== "object") return "";
  const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
  if (explanation) return explanation;
  return typeof raw.response === "string" ? raw.response.trim() : "";
}

export function validateSummitOutput(raw, packet, request = {}) {
  if (!raw || typeof raw !== "object") return fail("malformed");
  const response = modelScienceText(raw);
  if (!response) return fail("empty");
  if (response.length > 800) return fail("too-long");
  if (FORBIDDEN.test(response)) return fail("forbidden-id");
  if (GAMEPLAY_COMMAND.test(response) || isGameplayAsk(response)) return fail("gameplay-command");
  if (STATE_CHANGE.test(response)) return fail("state-change");

  const allowed = packet?.tutoring?.allowedLevel ?? request.level ?? 0;
  const claimedLevel = Number(raw.supportLevel);
  const supportLevel = Number.isFinite(claimedLevel) ? claimedLevel : allowed;
  if (supportLevel > allowed + 0.01 && allowed < 4) return fail("level-exceeded");

  if (CLEARANCE_CLAIM.test(response) && !packet?.facts?.clearance) return fail("false-clearance");

  if (inventedMeasurement(response, packet)) return fail("invented-measurement");
  if (inventedDarkSkyState(response, packet, request.question || "")) return fail("invented-astronomy");
  if (agreesWithFalseNumber(response, request.question || "", packet)) return fail("false-premise");
  if (inventedHighLook(response, packet, request.question || "")) return fail("invented-visit");
  if (inventedTrialCount(response, packet)) return fail("invented-trial");
  if (inventedObservation(response)) return fail("invented-observation");
  if (agreesWithSlopeMisconception(response, request.question || "")) return fail("misconception-agree");
  const conceptFail = checkConceptClaims(response, packet, request.question || "");
  if (conceptFail) return fail(conceptFail);
  if (isOffTopic(request.question) && !/Cedar Hollow|I'm Summit|Earth Science companion/i.test(response)) {
    return fail("off-topic-answer");
  }

  const follow = typeof raw.followUpQuestion === "string" ? raw.followUpQuestion.trim() : "";
  if (follow && (GAMEPLAY_COMMAND.test(follow) || isGameplayAsk(follow))) return fail("gameplay-command");

  const text = stripCodes(response);
  return {
    ok: true,
    reason: "",
    reply: {
      text,
      more: "",
      moreAvailable: false,
      level: allowed,
      conceptIds: raw.concept ? [raw.concept] : [],
      misconceptionId: null,
      worldCue: "",
      revealsAnswer: false,
      provider: "ai",
      followUpQuestion: follow,
      offTopic: Boolean(raw.offTopic),
      rawModel: raw
    }
  };
}

function fail(reason) {
  return { ok: false, reason, reply: null };
}

function inventedDarkSkyState(text, packet, question = "") {
  if (packet?.facts?.region !== "Dark Sky Basin") return false;
  const facts = packet.facts || {};
  const denies = /have not|haven't|not yet|no calibration|unknown|did not|didn't/i.test(text);
  if (/lamp/i.test(text) && /calibrat|you (already )?(measured|logged|inspected) the lamp/i.test(text) && !facts.lampCalibrated && !denies) {
    return true;
  }
  if (/lamp bench/i.test(text) && /you (walked|visited|were at)/i.test(text) && !facts.visitedLamp && !denies) {
    return true;
  }
  if (/\b\d+(\.\d+)?\s*nm\b/i.test(text)) {
    const allowed = new Set((facts.numbers || []).map((n) => Math.round(Number(n))));
    const hits = [...text.matchAll(/(\d+)(?:\.\d+)?\s*nm/gi)].map((row) => Number(row[1]));
    if (hits.some((n) => !allowed.has(n) && !allowed.has(Math.round(n)))) return true;
  }
  if (/\bmagnitude\b|\bkelvin\b|\bOBAFGKM\b/i.test(text) && !denies) return true;
  if (/you (already )?(compared|matched) the (two )?(traces|spectra)/i.test(text) && !facts.twinsConcluded && !denies) {
    return true;
  }
  if (/red(der)? (means|is) hotter/i.test(text) && !/not|isn't|does not/i.test(text)) return true;
  return /i (measured|observed|invented)/i.test(question) ? false : false;
}

function inventedMeasurement(text, packet) {
  if (!/(you recorded|your (fair )?trial|took \d|finished in \d|your steep.{0,48}\d+\.\d+)/i.test(text)) return false;
  const allowed = new Set(packetNumbers(packet).map((n) => n.toFixed(1)));
  packetNumbers(packet).forEach((n) => allowed.add(String(n)));
  const hits = String(text).match(/\b\d+\.\d+\b/g) || [];
  if (!hits.length) return false;
  if (!allowed.size) return true;
  const unknown = hits.filter((hit) => !allowed.has(hit) && !allowed.has(Number(hit).toFixed(1)));
  if (!unknown.length) return false;
  return unknown.some((hit) => !new RegExp(`not ${hit}|wasn't ${hit}|was not ${hit}|rather than ${hit}`, "i").test(text));
}

function agreesWithFalseNumber(text, question, packet) {
  const qNums = String(question || "").match(/\b\d+\.\d+\b/g) || [];
  if (!qNums.length || !AFFIRM.test(text)) return false;
  const allowed = new Set(packetNumbers(packet).map((n) => n.toFixed(1)));
  packetNumbers(packet).forEach((n) => allowed.add(String(n)));
  return qNums.some((n) => !allowed.has(n) && !allowed.has(Number(n).toFixed(1)) && text.includes(n));
}

function inventedHighLook(text, packet, question = "") {
  if (packet?.facts?.inspectedHighLook) return false;
  const denies = /haven't inspected|have not inspected|didn't find|did not find|you have not|not visited|no,/i.test(text);
  if (/high look/i.test(question) && /you found|you saw|you noted|rock outcropping|from the high look inspection|notes from the high look/i.test(text) && !denies) {
    return true;
  }
  return /you (already )?(saw|noted|found|inspected|were at|stood)[^.]*high look|at high look you (saw|found|noted)|the view from high look you|review your notes from the high look|inspecting the terrain at high look|walk to (the )?high look/i.test(
    text
  );
}

function inventedObservation(text) {
  return /has been observed to|we've had some recent rainfall|big rain event|last night's rainfall|water level (in cedar hollow )?has (dropped|fallen|rose|risen|changed)/i.test(
    text
  );
}

function agreesWithSlopeMisconception(text, question) {
  if (!/steeper should be slower/i.test(question)) return false;
  return /that's correct|that is correct|yes, steeper|steeper slopes are generally slower/i.test(text);
}

function inventedTrialCount(text, packet) {
  const have = packet?.facts?.fairTrialCount || 0;
  const third = /third (runoff )?trial|trial three|3rd trial/i.test(text);
  if (third && have < 3)
    return /showed|was|took|recorded/i.test(text) && !/no third|do not have|don't have|not recorded|only (see|have)|haven't/i.test(text);
  return false;
}
