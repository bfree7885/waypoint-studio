/**
 * Mission state machine. No DOM. Curriculum metadata stays off the player path.
 */

export function createMissionState(mission) {
  return {
    missionId: mission.id,
    title: mission.title,
    introSeen: false,
    observations: [],
    storyNotes: [],
    conclusionPath: [],
    concluded: false,
    flowVisible: false
  };
}

export function observationByFeature(mission, featureId) {
  return mission.observations.find((item) => item.featureId === featureId) || null;
}

export function hasObservation(state, observationId) {
  return state.observations.some((item) => item.id === observationId);
}

export function addObservation(state, mission, featureId) {
  const spec = observationByFeature(mission, featureId);
  if (!spec) return null;
  if (hasObservation(state, spec.id)) return { already: true, spec, entry: null };
  const entry = {
    id: spec.id,
    featureId: spec.featureId,
    title: spec.title,
    text: spec.text
  };
  state.observations = [...state.observations, entry];
  return { already: false, spec, entry };
}

export function addStoryNote(state, note) {
  if (!note) return null;
  if (state.storyNotes.some((item) => item.id === note.id)) {
    return { already: true, note };
  }
  state.storyNotes = [...state.storyNotes, note];
  return { already: false, note };
}

export function requiredComplete(state, mission) {
  return mission.requiredObservationIds.every((id) => hasObservation(state, id));
}

export function observedFeatureIds(state) {
  return new Set(state.observations.map((item) => item.featureId));
}

export function canPresentFindings(state, mission) {
  return requiredComplete(state, mission) && !state.concluded;
}

export function featureObserved(state, featureId) {
  return state.observations.some((item) => item.featureId === featureId);
}

/**
 * Player builds a downhill path from visited places. Not a multiple-choice quiz.
 */
export function tryAddPathNode(state, mission, featureId) {
  const valid = mission.conclusion.validPath;
  if (state.concluded) {
    return { ok: false, reason: "already-complete" };
  }
  if (!featureObserved(state, featureId)) {
    return { ok: false, reason: "unobserved", hint: mission.conclusion.unobservedHint };
  }
  const nextIndex = state.conclusionPath.length;
  const expected = valid[nextIndex];
  if (featureId === expected) {
    state.conclusionPath = [...state.conclusionPath, featureId];
    const complete = state.conclusionPath.length === valid.length;
    if (complete) {
      state.concluded = true;
      state.flowVisible = true;
    }
    return {
      ok: true,
      complete,
      path: state.conclusionPath,
      successText: complete ? mission.conclusion.successText : null
    };
  }
  return { ok: false, reason: "uphill", hint: mission.conclusion.uphillHint };
}

export function resetPath(state) {
  if (state.concluded) return;
  state.conclusionPath = [];
}

export function playerFacingStrings(mission) {
  const texts = [];
  for (const line of mission.intro.lines) texts.push(line);
  for (const obs of mission.observations) {
    texts.push(obs.title, obs.text, obs.prompt);
  }
  texts.push(
    mission.conclusion.prompt,
    mission.conclusion.successText,
    mission.conclusion.uphillHint,
    mission.conclusion.incompleteHint,
    mission.conclusion.unobservedHint,
    mission.completeJournalEntry.title,
    mission.completeJournalEntry.text
  );
  return texts;
}
