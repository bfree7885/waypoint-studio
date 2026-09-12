/**
 * Deterministic Cedar Hollow truth for Summit.
 * The model may explain known facts. It does not choose the next game action.
 */

export function buildSummitTruth(context = {}) {
  const fair = (context.raw?.flume?.fairTrials || []).slice();
  const known = [];
  const unknown = [];
  const doNotClaim = [];
  const slopes = new Set();
  fair.forEach((row, i) => {
    const slope = row.slope || "unknown slope";
    slopes.add(slope);
    known.push(`Trial ${i + 1}: ${slope} slope, ${Number(row.seconds).toFixed(1)} s`);
  });
  if (!fair.length) {
    unknown.push("no fair runoff times recorded yet");
    doNotClaim.push("any runoff travel time");
  }
  if (!slopes.has("gentle")) {
    unknown.push("gentle slope: not yet measured");
    doNotClaim.push("a gentle-slope result");
  }
  if (!slopes.has("steep")) {
    unknown.push("steep slope: not yet measured");
    doNotClaim.push("a steep-slope result");
  }
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
  doNotClaim.push("rainfall totals", "water-level changes", "invented buttons or cards");

  return {
    known,
    unknown,
    science: [
      "gravity pulls water downhill",
      "steeper slopes make runoff faster, not slower",
      "a fair comparison changes the intended variable and holds the rest steady"
    ],
    doNotClaim,
    nextAction: chooseNextAction({ fair, slopes, inspectedHighLook, clearance, context }),
    comparisonValid: slopes.has("steep") && slopes.has("gentle")
  };
}

export function chooseNextAction({ fair, slopes, inspectedHighLook, clearance, context } = {}) {
  if (clearance) {
    return { id: "cleared", text: "Wren already accepted the case. You can keep exploring the hollow." };
  }
  if (!(fair || []).length) {
    return {
      id: "first-trial",
      text: "Time the same amount of water on one slope, then you will have a measurement to talk about."
    };
  }
  if (slopes && slopes.has("steep") && !slopes.has("gentle")) {
    return {
      id: "measure-gentle",
      text: "Time the same cup on the gentler slope next so the comparison is fair."
    };
  }
  if (slopes && slopes.has("gentle") && !slopes.has("steep")) {
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
