/**
 * Concept-level claim checks. State-based: comparisonReady, known times, slope claims.
 * Not a growing phrase blacklist for science vocabulary.
 */

import { packetNumbers } from "./summit-packet.js";
import { SUMMIT_CONCEPTS } from "./summit-concepts.js";

const HEDGE =
  /would|expect|typically|tend|usually|prediction|haven't|have not|not yet|if you (timed|tested|measured)|has not (yet )?(shown|been)/i;

export function checkConceptClaims(text, packet, question = "") {
  const body = normalizeScienceText(text);
  if (!body) return "";
  if (pathLengthAsMechanism(body, normalizeScienceText(question))) return "path-length-mechanism";
  if (gravityGetsStronger(body)) return "gravity-strength";
  if (unreadyComparison(body, packet)) return "unready-comparison";
  if (splitSteepTrials(body, packet)) return "split-steep-trials";
  return "";
}

function normalizeScienceText(text) {
  return String(text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function pathLengthAsMechanism(text, question) {
  if (!SUMMIT_CONCEPTS.slope.claims.pathLengthIsNotMechanism) return false;
  const usesPath = /longer path|path is longer|farther to travel|further to travel|path length|travels farther/i.test(text);
  if (!usesPath) return false;
  const corrects =
    /not the reason|not because.{0,48}(path|farther|longer)|isn'?t (because|from|that).{0,48}(path|farther|longer)|doesn'?t mean.{0,48}(farther|longer|the water travels)|does not mean.{0,48}(farther|longer)|not (a |the )?longer path|path length is the same|path doesn'?t make|length of the path doesn'?t|not because the path/i.test(
      text
    );
  if (corrects) return false;
  const studentAsked = /path|farther|further|longer/i.test(question);
  if (studentAsked && /no[,.]|not /i.test(text)) return false;
  return /faster|slower|runoff|steep|slope|gravity/i.test(text);
}

function gravityGetsStronger(text) {
  if (!SUMMIT_CONCEPTS.slope.claims.gravityStrengthConstant) return false;
  const claims = /gravity (gets|is|becomes) stronger|stronger gravity|gravity.{0,24}stronger on/i.test(text);
  if (!claims) return false;
  return !/does not|doesn't|not become|stays the same|is not stronger|isn't stronger|not getting stronger|not stronger|strength (is|stays) the same|strength stays/i.test(
    text
  );
}

function unreadyComparison(text, packet) {
  const ready = packet?.facts?.comparisonStatus?.comparisonReady ?? packet?.facts?.comparisonValid;
  if (ready) return false;
  if (
    /\b(has not|have not|haven'?t|hasn'?t|not yet|do not|don'?t|does not|doesn'?t|will not|won'?t)\b.{0,48}\b(show|shown|showed|prove|proved|compared|measured)\b/i.test(
      text
    )
  ) {
    return false;
  }
  const predicted =
    HEDGE.test(text) ||
    /expect|would|typically|tend|usually|prediction|haven'?t|have not|not yet|if you (timed|tested|measured)/i.test(text);
  const claimsStudentResult =
    /you (already )?(proved|showed|measured both)|your (experiment|trials|data|results|times|log).{0,48}(already )?\b(showed|proved)\b/i.test(
      text
    );
  if (predicted && !claimsStudentResult) return false;
  const claimsMeasured =
    /your (experiment|trials|data|results|times|log).{0,48}(\bshowed\b|\bshows\b|\bprove[sd]?\b|already)|already (showed|proved|compared) steep.{0,40}gentle|(you|your log|your trials|your experiment|your times).{0,48}(faster than (the )?gentl|steep is faster than)|you('re| are) comparing.{0,80}(versus|vs\.?|steep.{0,24}gentle)|the gentl\w+( slope)? (was|is) (faster|slower)|you (already )?(measured|timed|did) (the )?gentl/i.test(
      text
    );
  if (!claimsMeasured) return false;
  if (/need to compare|not (yet )?a .{0,40}comparison|would (need to |you )compare|repeating the steep/i.test(text)) {
    return false;
  }
  return true;
}

function splitSteepTrials(text, packet) {
  const rows = packet?.facts?.measurements || [];
  if (rows.length < 2) return false;
  const unique = new Set(rows.map((row) => row.slope));
  if (!(unique.size === 1 && unique.has("steep"))) return false;
  const nums = packetNumbers(packet).map((n) => n.toFixed(1));
  if (nums.length < 2) return false;
  const [a, b] = nums;
  const assigns = new RegExp(
    `${a}.{0,32}(was |is )steep.{0,32}${b}.{0,32}(was |is )?gentle|so ${a} was steep and ${b}.{0,16}gentle`,
    "i"
  ).test(text);
  if (!assigns) return false;
  return !/both (were |are )?steep|two steep|both of those times are steep/i.test(text);
}
