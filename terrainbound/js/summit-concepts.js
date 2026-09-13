/**
 * Compact Cedar Hollow concept truth for Summit.
 * Structured rules, not a giant prompt. The packet and validator consume these objects.
 */

export const SUMMIT_CONCEPTS = {
  slope: {
    id: "slope",
    claims: {
      gravityPullsDownhill: true,
      downhillComponentGrowsWithSteepness: true,
      allElseEqualSteeperFaster: true,
      gravityStrengthConstant: true,
      pathLengthIsNotMechanism: true
    },
    teach: {
      1: "Look at what changed between the trials.",
      2: "Ask whether the slope changed, or only the same steep setup was repeated.",
      3: "On a steeper slope, more of gravity's pull acts downhill, so the same water tends to move faster. Gravity itself is not stronger.",
      4: "Steepness is not a longer path. The downhill part of gravity is larger on the steeper surface, so runoff usually finishes sooner if the other conditions stay comparable."
    },
    misconceptions: {
      gravityStronger: "Gravity does not get stronger on a steep hill. More of the same pull acts downhill along the surface.",
      pathLength: "A longer path is not the reason. The key idea is how the slope changes the downhill part of gravity."
    }
  },
  "fair-test": {
    id: "fair-test",
    claims: {
      changeIntendedVariable: true,
      holdOthersSteady: true,
      repeatsShowConsistency: true,
      repeatsAreNotASlopeComparison: true
    },
    teach: {
      1: "Look at what changed between the trials.",
      2: "You tested the steep setup twice. What would you need to change to compare slope?",
      3: "To test slope fairly, compare a steep setup with a gentler one while keeping the other conditions as similar as possible.",
      4: "Repeated steep trials can show that setup was fairly consistent. They do not show whether steep or gentle is faster until both slopes are measured."
    }
  },
  observation: {
    id: "observation",
    claims: {
      observationIsDirect: true,
      interpretationIsInference: true
    },
    teach: {
      1: "Say what you actually saw or timed first.",
      2: "A time you recorded is an observation. Why it happened is an interpretation.",
      3: "Observation is what you directly saw or measured. Interpretation is the explanation you give those facts.",
      4: "Keep the stopwatch reading as observation. “Steep made it faster” is an interpretation, and it needs a fair comparison before it is a result."
    }
  }
};

export function comparisonStatus(fair = []) {
  const slopes = new Set((fair || []).map((row) => row.slope));
  const steepMeasured = slopes.has("steep");
  const gentleMeasured = slopes.has("gentle");
  return {
    variable: "slope",
    steepMeasured,
    gentleMeasured,
    comparisonReady: steepMeasured && gentleMeasured
  };
}

export function epistemicLists(fair = [], comparison) {
  const measured = (fair || []).map(
    (row, i) => `Trial ${i + 1}: ${row.slope} slope, ${Number(row.seconds).toFixed(1)} s`
  );
  const expected = [
    "under otherwise comparable conditions, a steeper slope tends to produce faster runoff",
    "gravity itself does not get stronger on a steep slope"
  ];
  const unknown = [];
  if (!comparison.steepMeasured) unknown.push("steep-slope measured time");
  if (!comparison.gentleMeasured) unknown.push("gentle-slope measured time");
  if (!comparison.comparisonReady) unknown.push("this experiment's steep-vs-gentle result");
  return { measured, expected, unknown };
}

export function evidenceStatus(context = {}, comparison) {
  const observed = [];
  const inferred = [];
  const notYetTested = [];
  if ((context.observations || []).includes("high-look")) {
    observed.push("High Look inspected; the hollow tilts toward low ground");
  } else {
    notYetTested.push("High Look observation");
  }
  if (comparison.steepMeasured) observed.push("steep-slope runoff times");
  else notYetTested.push("steep-slope runoff time");
  if (comparison.gentleMeasured) observed.push("gentle-slope runoff times");
  else notYetTested.push("gentle-slope runoff time");
  if (!comparison.comparisonReady) {
    inferred.push("steeper-faster is a scientific expectation, not a result from this log yet");
    notYetTested.push("steep-vs-gentle comparison");
  }
  return {
    observed,
    measured: comparison.steepMeasured || comparison.gentleMeasured ? "runoff times in the log" : "none",
    predicted: "steeper slope tends to be faster if other conditions stay comparable",
    inferred,
    notYetTested
  };
}

export function conceptTeach(id, level = 0) {
  const entry = SUMMIT_CONCEPTS[id] || SUMMIT_CONCEPTS.slope;
  const key = Math.max(1, Math.min(4, Number(level) || 0));
  return entry.teach[key] || entry.teach[3];
}
