/**
 * Local field journal. Browser storage only — no accounts, no network.
 */

export const SAVE_KEY = "terrainbound.cedar-hollow.v1";
export const SAVE_VERSION = 1;

export function emptyTaught() {
  return { walk: false, inspect: false, journal: false };
}

export function captureSave({ player, missionState, discoveryState, invState, taught }) {
  return {
    v: SAVE_VERSION,
    regionId: "cedar-hollow",
    savedAt: Date.now(),
    player: { x: player.x, y: player.y, facing: player.facing },
    taught: { ...emptyTaught(), ...(taught || {}) },
    mission: {
      introSeen: missionState.introSeen,
      observations: missionState.observations,
      storyNotes: missionState.storyNotes,
      conclusionPath: missionState.conclusionPath,
      concluded: missionState.concluded,
      flowVisible: missionState.flowVisible
    },
    discoveries: {
      foundIds: discoveryState.foundIds,
      acknowledgedIds: discoveryState.acknowledgedIds,
      wrenTalks: discoveryState.wrenTalks
    },
    investigation: {
      introSeen: invState.introSeen,
      active: invState.active,
      measuredIds: invState.measuredIds,
      evidenceIds: invState.evidenceIds,
      selectedProcess: invState.selectedProcess,
      selectedEvidenceIds: invState.selectedEvidenceIds,
      lastHint: invState.lastHint,
      concluded: invState.concluded,
      interpreted: invState.interpreted,
      attempts: invState.attempts
    }
  };
}

export function applySave(data, { player, missionState, discoveryState, invState, taught }) {
  if (!data || data.v !== SAVE_VERSION) return false;
  if (data.player) {
    player.x = data.player.x;
    player.y = data.player.y;
    player.facing = data.player.facing ?? player.facing;
  }
  if (data.taught) Object.assign(taught, emptyTaught(), data.taught);
  if (data.mission) Object.assign(missionState, data.mission);
  if (data.discoveries) Object.assign(discoveryState, data.discoveries);
  if (data.investigation) Object.assign(invState, data.investigation);
  return true;
}

export function readSave(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(storage, data) {
  if (!storage || !data) return false;
  storage.setItem(SAVE_KEY, JSON.stringify(data));
  return true;
}

export function clearSave(storage) {
  if (!storage) return;
  storage.removeItem(SAVE_KEY);
}

export function wipeRequiresConfirm(confirmed) {
  return confirmed === true;
}
