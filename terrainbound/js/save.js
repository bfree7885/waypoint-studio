/**
 * Local field journal. Browser storage only — no accounts, no network.
 * v1 Cedar Hollow saves migrate to v2 (regions, mastery, tools).
 */

export const SAVE_KEY = "terrainbound.cedar-hollow.v1";
export const SAVE_VERSION = 2;

export function emptyTaught() {
  return { walk: false, inspect: false, journal: false, worldMap: false, routeHighCountry: false };
}

export function emptyWorldSave() {
  return {
    currentRegion: "cedar-hollow",
    accessibleRegions: ["cedar-hollow"],
    masteredRegions: []
  };
}

export function emptyMasterySave() {
  return { records: [] };
}

export function emptyToolsSave() {
  return { earnedIds: [] };
}

export function migrateSave(data) {
  if (!data || typeof data !== "object") return null;
  if (data.v === 2) {
    return {
      ...data,
      taught: { ...emptyTaught(), ...(data.taught || {}) },
      world: { ...emptyWorldSave(), ...(data.world || {}) },
      mastery: { ...emptyMasterySave(), ...(data.mastery || {}) },
      tools: { ...emptyToolsSave(), ...(data.tools || {}) }
    };
  }
  if (data.v === 1) {
    return {
      ...data,
      v: 2,
      taught: { ...emptyTaught(), ...(data.taught || {}) },
      world: emptyWorldSave(),
      mastery: emptyMasterySave(),
      tools: emptyToolsSave(),
      currentRegion: data.regionId || "cedar-hollow"
    };
  }
  return null;
}

export function captureSave({
  player,
  missionState,
  discoveryState,
  invState,
  taught,
  worldState,
  masteryState,
  toolState
}) {
  return {
    v: SAVE_VERSION,
    regionId: worldState?.currentRegion || "cedar-hollow",
    savedAt: Date.now(),
    player: { x: player.x, y: player.y, facing: player.facing },
    taught: { ...emptyTaught(), ...(taught || {}) },
    world: {
      currentRegion: worldState?.currentRegion || "cedar-hollow",
      accessibleRegions: worldState?.accessibleRegions || ["cedar-hollow"],
      masteredRegions: worldState?.masteredRegions || []
    },
    mastery: { records: masteryState?.records || [] },
    tools: { earnedIds: toolState?.earnedIds || [] },
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

export function applySave(
  data,
  { player, missionState, discoveryState, invState, taught, worldState, masteryState, toolState }
) {
  const migrated = migrateSave(data);
  if (!migrated) return false;
  if (migrated.player) {
    player.x = migrated.player.x;
    player.y = migrated.player.y;
    player.facing = migrated.player.facing ?? player.facing;
  }
  if (migrated.taught) Object.assign(taught, emptyTaught(), migrated.taught);
  if (migrated.mission) Object.assign(missionState, migrated.mission);
  if (migrated.discoveries) Object.assign(discoveryState, migrated.discoveries);
  if (migrated.investigation) Object.assign(invState, migrated.investigation);
  if (worldState && migrated.world) {
    worldState.currentRegion = migrated.world.currentRegion;
    worldState.accessibleRegions = [...migrated.world.accessibleRegions];
    worldState.masteredRegions = [...migrated.world.masteredRegions];
  }
  if (masteryState && migrated.mastery) {
    masteryState.records = [...(migrated.mastery.records || [])];
  }
  if (toolState && migrated.tools) {
    toolState.earnedIds = [...(migrated.tools.earnedIds || [])];
  }
  return true;
}

export function readSave(storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
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
