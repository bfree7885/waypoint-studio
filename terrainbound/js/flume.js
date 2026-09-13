/**
 * Slope vs flow-speed investigation. Fair tests only produce mastery evidence.
 */

export function createFlumeState() {
  return {
    introSeen: false,
    active: false,
    slope: "moderate",
    water: "one-cup",
    trials: [],
    lastHint: "",
    lastSeconds: null,
    unfairAttempted: false,
    setupRevised: false,
    prediction: null
  };
}

export function slopeById(spec, id) {
  return spec.slopes.find((item) => item.id === id) || spec.slopes[0];
}

export function waterById(spec, id) {
  return spec.water.find((item) => item.id === id) || spec.water[0];
}

export function setFlumeSlope(state, id) {
  state.slope = id;
  return state;
}

export function setFlumeWater(state, id) {
  state.water = id;
  return state;
}

export function trialSeconds(spec, slopeId, waterId, trialIndex) {
  const slope = slopeById(spec, slopeId);
  const water = waterById(spec, waterId);
  const jitter = [-0.16, 0.04, -0.07, 0.11, -0.03, 0.09][trialIndex % 6];
  const seconds = (slope.baseSeconds + jitter) * (water.speedScale || 1);
  return Math.round(seconds * 10) / 10;
}

export function setFlumePrediction(state, slopeId) {
  state.prediction = slopeId;
  return state;
}

export function runTrial(state, spec) {
  if (!state.prediction) {
    state.lastHint = "PREDICT which slope will finish first. Then pour.";
    return { ok: false, needPredict: true, hint: state.lastHint };
  }
  const water = waterById(spec, state.water);
  const fair = water.fair === true;
  const seconds = trialSeconds(spec, state.slope, state.water, state.trials.length);
  const trial = {
    id: `t${state.trials.length + 1}`,
    slope: state.slope,
    water: state.water,
    fair,
    seconds,
    speed: Math.round((spec.distanceMeters / seconds) * 100) / 100
  };
  state.trials = [...state.trials, trial];
  state.lastSeconds = seconds;
  state.active = true;
  if (!fair) {
    state.unfairAttempted = true;
    state.lastHint = spec.unfairHint;
    return { ok: true, fair: false, trial, hint: spec.unfairHint };
  }
  if (state.unfairAttempted) state.setupRevised = true;
  const per = fairTrialsBySlope(state);
  const thisSlope = per[state.slope] || [];
  if (thisSlope.length === 1) {
    state.lastHint = spec.repeatHint;
  } else if (hasFairComparison(state, spec)) {
    const fastest = [...spec.slopes].sort((a, b) => a.baseSeconds - b.baseSeconds)[0];
    if (state.prediction && state.prediction !== fastest.id) {
      state.lastHint = `${fastest.label} finished first. That prediction did not match the table.`;
    } else {
      state.lastHint = spec.enoughHint;
    }
  } else {
    state.lastHint = spec.constantsNote;
  }
  return { ok: true, fair: true, trial, hint: state.lastHint };
}

export function fairTrials(state) {
  return state.trials.filter((item) => item.fair);
}

export function fairTrialsBySlope(state) {
  const map = {};
  for (const trial of fairTrials(state)) {
    map[trial.slope] = map[trial.slope] || [];
    map[trial.slope].push(trial);
  }
  return map;
}

export function hasFairComparison(state, spec) {
  const need = spec.minTrialsPerSlope || 2;
  const per = fairTrialsBySlope(state);
  return spec.slopes.every((slope) => (per[slope.id] || []).length >= need);
}

export function flumeMeans(state, spec) {
  const per = fairTrialsBySlope(state);
  return spec.slopes.map((slope) => {
    const rows = per[slope.id] || [];
    const seconds = rows.length ? rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length : null;
    return {
      slope: slope.id,
      label: slope.label,
      trials: rows.length,
      seconds: seconds === null ? null : Math.round(seconds * 10) / 10,
      speed: seconds === null ? null : Math.round((spec.distanceMeters / seconds) * 100) / 100
    };
  });
}

export function flumeRows(state, spec) {
  const per = fairTrialsBySlope(state);
  const rows = [];
  for (const slope of spec.slopes) {
    (per[slope.id] || []).forEach((trial, index) => {
      rows.push({
        slope: trial.slope,
        trial: index + 1,
        seconds: trial.seconds,
        speed: trial.speed,
        slopeLabel: slope.label
      });
    });
  }
  return rows;
}
