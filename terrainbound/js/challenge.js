/**
 * Cedar Hollow regional field challenge. Choice of sites; not a scripted click-path.
 */

export function createChallengeState() {
  return {
    introSeen: false,
    active: false,
    observedIds: [],
    measuredIds: [],
    selectedExplanation: null,
    lastHint: "",
    concluded: false,
    presented: false,
    revised: false,
    followUpDone: false,
    workingRoles: [],
    conflicted: false,
    pulsePredict: null
  };
}

export function siteById(spec, id) {
  return spec.sites.find((item) => item.id === id) || null;
}

export function nearestChallengeSite(spec, x, y, range = 70) {
  let best = null;
  let bestD = range;
  for (const site of spec.sites) {
    const d = Math.hypot(x - site.x, y - site.y);
    if (d < bestD) {
      best = site;
      bestD = d;
    }
  }
  return best;
}

export function observeSite(state, spec, siteId) {
  const site = siteById(spec, siteId);
  if (!site) return { ok: false, reason: "unknown" };
  const already = state.observedIds.includes(siteId);
  if (!already) {
    state.observedIds = [...state.observedIds, siteId];
    if (site.role && !state.workingRoles.includes(site.role)) {
      state.workingRoles = [...state.workingRoles, site.role];
    }
  }
  return { ok: true, already, site };
}

export function measureSite(state, spec, siteId) {
  const site = siteById(spec, siteId);
  if (!site?.measure) return { ok: false, reason: "none" };
  if (!state.observedIds.includes(siteId)) observeSite(state, spec, siteId);
  if (state.measuredIds.includes(site.measure.id)) {
    return { ok: true, already: true, site };
  }
  state.measuredIds = [...state.measuredIds, site.measure.id];
  return { ok: true, already: false, site };
}

export function challengeRows(state, spec) {
  return spec.sites
    .filter((site) => site.measure && state.measuredIds.includes(site.measure.id))
    .map((site) => ({
      site: site.id,
      label: site.name,
      value: site.measure.value,
      unit: site.measure.unit,
      role: site.role
    }));
}

export function canProposeChallenge(state, spec) {
  if (!state.active || state.concluded) return false;
  if (spec.pulsePredict && !state.pulsePredict) return false;
  if (state.observedIds.length < (spec.minObserved || 3)) return false;
  if (state.measuredIds.length < (spec.minMeasured || 2)) return false;
  const roles = new Set(
    state.observedIds.map((id) => siteById(spec, id)?.role).filter(Boolean)
  );
  return (spec.neededRoles || []).every((role) => roles.has(role));
}

export function tryChallengeExplanation(state, spec, explanationId) {
  const pick = spec.explanations.find((item) => item.id === explanationId);
  if (!pick) return { ok: false, hint: "Choose an explanation." };
  state.selectedExplanation = explanationId;
  if (!canProposeChallenge(state, spec)) {
    state.lastHint = "Walk more of the creek before you decide. Compare at least two measured places.";
    return { ok: false, hint: state.lastHint };
  }
  if (!pick.correct) {
    state.conflicted = true;
    state.lastHint = pick.hint;
    return { ok: false, hint: pick.hint };
  }
  state.lastHint = spec.followUp.prompt;
  return { ok: true, needsFollowUp: !state.followUpDone, hint: spec.followUp.prompt };
}

export function tryChallengeFollowUp(state, spec, optionId) {
  const option = spec.followUp.options.find((item) => item.id === optionId);
  if (!option) return { ok: false };
  if (!option.ok) {
    state.conflicted = true;
    state.lastHint = option.hint;
    return { ok: false, hint: option.hint };
  }
  if (state.conflicted) state.revised = true;
  state.followUpDone = true;
  state.concluded = true;
  state.lastHint = spec.success;
  return { ok: true, hint: spec.success };
}

export function presentChallenge(state) {
  if (!state.concluded) return { ok: false };
  state.presented = true;
  return { ok: true };
}

export function challengeProgress(state, spec) {
  const measured = challengeRows(state, spec)
    .map((row) => `${row.label}: ${row.value} ${row.unit}`)
    .join(" · ");
  const walked = `${state.observedIds.length} places walked`;
  const counts = `${state.measuredIds.length} measurements`;
  return measured ? `${walked}. ${counts}. ${measured}` : `${walked}. ${counts}.`;
}

export function predictPulse(state, spec, optionId) {
  const option = spec.pulsePredict?.options?.find((item) => item.id === optionId);
  if (!option) return { ok: false, hint: "Predict where the brown pulse should start." };
  state.pulsePredict = optionId;
  if (!option.ok) {
    state.lastHint = option.hint;
    return { ok: false, hint: option.hint };
  }
  state.lastHint = "Now walk the creek and test that prediction.";
  return { ok: true, hint: state.lastHint };
}

export function challengeHasSystems(state, spec) {
  const roles = new Set(
    (state.observedIds || []).map((id) => siteById(spec, id)?.role).filter(Boolean)
  );
  return (spec.neededRoles || ["weather", "join", "source"]).every((role) => roles.has(role));
}

