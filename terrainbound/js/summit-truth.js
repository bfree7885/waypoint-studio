/**
 * Deterministic Cedar Hollow truth for Summit.
 * Known / expected / unknown come from state, not from model prose.
 */

import {
  comparisonStatus,
  epistemicLists,
  evidenceStatus,
  SUMMIT_CONCEPTS
} from "./summit-concepts.js";
import { buildDarkSkyTruth } from "./darksky.js";

export function buildSummitTruth(context = {}) {
  if (context.regionId === "dark-sky-basin") {
    return context.darkSkyTruth || buildDarkSkyTruth();
  }
  const fair = (context.raw?.flume?.fairTrials || []).slice();
  const slopes = new Set(fair.map((row) => row.slope));
  const comparison = comparisonStatus(fair);
  const epistemic = epistemicLists(fair, comparison);
  const known = [...epistemic.measured];
  const unknown = [...epistemic.unknown];
  const doNotClaim = [];

  if (!fair.length) {
    unknown.unshift("no fair runoff times recorded yet");
    doNotClaim.push("any runoff travel time");
  }
  if (!comparison.gentleMeasured) doNotClaim.push("a measured gentle-slope result");
  if (!comparison.steepMeasured) doNotClaim.push("a measured steep-slope result");
  if (!comparison.comparisonReady) doNotClaim.push("a completed steep-vs-gentle result from this experiment");
  if (fair.length < 3) {
    unknown.push("third trial: not recorded");
    doNotClaim.push("a third-trial result");
  }
  const inspectedHighLook = (context.observations || []).includes("high-look");
  if (!inspectedHighLook) {
    unknown.push("High Look: not inspected");
    doNotClaim.push("a High Look observation");
  } else {
    known.push("High Look: inspected; the hollow tilts toward low ground");
  }
  const clearance = context.aar?.result === "clearance";
  if (!clearance) {
    unknown.push("clearance: not granted");
    doNotClaim.push("field clearance or High Country unlock");
  }
  doNotClaim.push(
    "rainfall totals",
    "water-level changes",
    "invented buttons or cards",
    "path length as the reason steep is faster",
    "gravity becoming stronger on a steep slope"
  );

  const slope = SUMMIT_CONCEPTS.slope;
  const fairTest = SUMMIT_CONCEPTS["fair-test"];

  return {
    known,
    expected: epistemic.expected,
    unknown,
    science: [
      "gravity pulls water downhill",
      "on a steeper slope, more of gravity's pull acts downhill",
      "all else equal, water tends to move faster on the steeper slope",
      "gravity itself is not stronger",
      "steepness is not explained by a longer path",
      "two steep trials show consistency, not a steep-vs-gentle comparison"
    ],
    doNotClaim,
    nextAction: chooseNextAction({ fair, slopes, inspectedHighLook, clearance, context, comparison }),
    comparisonValid: comparison.comparisonReady,
    comparisonStatus: comparison,
    evidenceStatus: evidenceStatus(context, comparison),
    concepts: {
      slope: slope.claims,
      fairTest: fairTest.claims,
      observation: SUMMIT_CONCEPTS.observation.claims
    }
  };
}

export function chooseNextAction({ fair, slopes, inspectedHighLook, clearance, context, comparison } = {}) {
  if (clearance) {
    return { id: "cleared", text: "Wren already accepted the case. You can keep exploring the hollow." };
  }
  if (!(fair || []).length) {
    return {
      id: "first-trial",
      text: "Time the same amount of water on one slope, then you will have a measurement to talk about."
    };
  }
  if (comparison ? !comparison.gentleMeasured && comparison.steepMeasured : slopes.has("steep") && !slopes.has("gentle")) {
    return {
      id: "measure-gentle",
      text: "Time the same cup on the gentler slope next so the comparison is fair."
    };
  }
  if (comparison ? !comparison.steepMeasured && comparison.gentleMeasured : slopes.has("gentle") && !slopes.has("steep")) {
    return {
      id: "measure-steep",
      text: "Time the same cup on the steeper slope next so the comparison is fair."
    };
  }
  if (!inspectedHighLook) {
    return {
      id: "inspect-ground",
      text: "Walk ground you have not inspected yet and look for where water would linger."
    };
  }
  if (context?.aar?.open) {
    return {
      id: "support-claim",
      text: "Use notes you actually collected. Wren still judges which notes answer this morning's claim."
    };
  }
  return {
    id: "keep-observing",
    text: "Keep the comparison fair: same water, more than one slope, times you really recorded."
  };
}

export function formatKnownTimes(fair = []) {
  if (!fair.length) return "None recorded yet.";
  return fair
    .map((row, i) => `Trial ${i + 1}: ${row.slope} slope, ${Number(row.seconds).toFixed(1)} s`)
    .join("; ");
}
