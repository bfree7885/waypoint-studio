/**
 * Grounding gate. Invalid model output never reaches the student.
 */

import { packetNumbers, packetTitles, stripCodes } from "./summit-packet.js";

const FORBIDDEN = /\bCH-\d+\b|pin CH-|select the best|correct!|incorrect!|question \d of|HTTP \d+|API failure|JSON parsing/i;
const CLEARANCE_CLAIM = /field clearance earned|you('re| are) cleared|wren (already )?gave you clearance|road is open/i;
const PIN_COMMAND = /pin the ([a-z0-9 \-]+ )?card|tap CH-|choose card|the required card is/i;
const STATE_CHANGE = /i (just )?(granted|unlocked|completed|marked)|clearance granted/i;

export function validateSummitOutput(raw, packet, request = {}) {
  if (!raw || typeof raw !== "object") return fail("malformed");
  const response = typeof raw.response === "string" ? raw.response.trim() : "";
  if (!response) return fail("empty");
  if (response.length > 800) return fail("too-long");
  if (FORBIDDEN.test(response)) return fail("forbidden-id");
  if (PIN_COMMAND.test(response)) return fail("pin-command");
  if (STATE_CHANGE.test(response)) return fail("state-change");

  const allowed = packet?.tutoring?.allowedLevel ?? request.level ?? 0;
  const claimedLevel = Number(raw.supportLevel);
  const supportLevel = Number.isFinite(claimedLevel) ? claimedLevel : allowed;
  if (supportLevel > allowed + 0.01 && allowed < 4) return fail("level-exceeded");

  if (CLEARANCE_CLAIM.test(response) && !packet?.facts?.clearance) return fail("false-clearance");

  const titles = packetTitles(packet);
  const referenced = Array.isArray(raw.referencedEvidence) ? raw.referencedEvidence : [];
  for (const title of referenced) {
    if (title && !titles.some((row) => String(row).toLowerCase() === String(title).toLowerCase())) {
      return fail("unknown-evidence");
    }
  }

  if (inventedMeasurement(response, packet)) return fail("invented-measurement");
  if (inventedHighLook(response, packet)) return fail("invented-visit");
  if (inventedTrialCount(response, packet)) return fail("invented-trial");

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
      suggestedAction: typeof raw.suggestedAction === "string" ? raw.suggestedAction : "",
      offTopic: Boolean(raw.offTopic),
      referencedEvidence: referenced
    }
  };
}

function fail(reason) {
  return { ok: false, reason, reply: null };
}

function inventedMeasurement(text, packet) {
  if (!/(you recorded|your (fair )?trial|took \d|finished in \d)/i.test(text)) return false;
  const allowed = new Set(packetNumbers(packet).map((n) => n.toFixed(1)));
  packetNumbers(packet).forEach((n) => allowed.add(String(n)));
  const hits = String(text).match(/\b\d+\.\d+\b/g) || [];
  if (!hits.length) return false;
  if (!allowed.size) return true;
  return hits.some((hit) => !allowed.has(hit) && !allowed.has(Number(hit).toFixed(1)));
}

function inventedHighLook(text, packet) {
  if (packet?.facts?.inspectedHighLook) return false;
  return /you (already )?(saw|noted|found|inspected)[^.]*high look/i.test(text);
}

function inventedTrialCount(text, packet) {
  const have = packet?.facts?.fairTrialCount || 0;
  const third = /third (runoff )?trial|trial three|3rd trial/i.test(text);
  if (third && have < 3) return /showed|was|took|recorded/i.test(text) && !/no third|do not have|don't have|not recorded|only (see|have)/i.test(text);
  return false;
}
