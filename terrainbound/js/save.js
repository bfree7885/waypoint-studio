/**
 * Local field journal. Browser storage only — no accounts, no network.
 * v1–v4 saves migrate to v5 (Sunfall Desert celestial session).
 */

export const SAVE_KEY = "terrainbound.cedar-hollow.v1";
export const SAVE_VERSION = 5;

export function emptyPresentationSave() {
  return {
    appearance: { skin: "sand", hair: "short-dark", jacket: "clay" },
    openingSeen: false,
    appearanceSet: false,
    travelSeen: {}
  };
}

export function emptyTaught() {
  return {
    walk: false,
    inspect: false,
    journal: false,
    worldMap: false,
    routeHighCountry: false,
    routeSunfall: false
  };
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

export function emptyFlumeSave() {
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

export function emptyDataSave() {
  return { datasets: {}, activeId: null };
}

export function emptyRegionPlayers() {
  return { "cedar-hollow": null, "high-country": null, "sunfall-desert": null };
}

export function emptySunfallSave() {
  return {
    introSeen: false,
    sky: { minutes: 10 * 1440 + 8 * 60, nodeDeg: 18, tiltDeg: 5.1 },
    clockUsed: false,
    shadows: [],
    rotationExplain: null,
    seasonObs: [],
    seasonExplain: null,
    distanceConfronted: false,
    orbit: { a: 1, e: 0.05, nuDeg: 20, measured: false, eccentricCompared: false },
    kepler: { a: 4, predictedP: null, checked: false, ok: false, modelChecked: false },
    moonLog: [],
    moonGeometry: false,
    moonPredict: null,
    moonPredictOk: false,
    eclipse: { aligned: false, tiltOn: true, understood: false, seenHit: false, seenMiss: false },
    tides: { compared: false, pattern: null, predict: null },
    planets: { classified: false, pattern: null },
    challenge: {
      site: null,
      when: null,
      moon: null,
      period: null,
      reasons: [],
      checked: false,
      ok: false,
      revised: false,
      presented: false
    },
    identifiedIds: [],
    foundIds: [],
    notes: [],
    lastHint: "",
    compareSampleSeen: false,
    pendingMoon: null,
    visitedSite: null
  };
}

export function emptyHighCountrySave() {
  return {
    introSeen: false,
    mapOpened: false,
    markers: {},
    measuredRoutes: [],
    routeChoice: null,
    routeReasons: [],
    routeCompared: false,
    mapMode: "world",
    terrainCompares: [],
    stakes: [],
    contourLine: [],
    contourOk: false,
    contourHint: "",
    profilePredict: null,
    profileGenerated: false,
    profileMatch: false,
    mapState: {
      mode: "world",
      layersOn: ["trails"],
      measureA: null,
      measureB: null,
      profileA: null,
      profileB: null
    },
    gisSite: null,
    gisOk: false,
    layerTypesInspected: [],
    imageryCompared: false,
    washoutSeen: false,
    depths: [],
    challengeRoute: null,
    challengeReasons: [],
    challengeOk: false,
    challengePresented: false,
    foundIds: [],
    notes: [],
    lastHint: "",
    scaleEstimates: [],
    cacheFound: false,
    slopePredict: null,
    terrainChoices: {}
  };
}

export function emptyChallengeSave() {
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

function snapshotSunfall(state) {
  const empty = emptySunfallSave();
  if (!state) return empty;
  return {
    ...empty,
    ...state,
    sky: { ...empty.sky, ...(state.sky || {}) },
    shadows: [...(state.shadows || [])],
    seasonObs: [...(state.seasonObs || [])],
    orbit: { ...empty.orbit, ...(state.orbit || {}) },
    kepler: { ...empty.kepler, ...(state.kepler || {}) },
    moonLog: [...(state.moonLog || [])],
    eclipse: { ...empty.eclipse, ...(state.eclipse || {}) },
    tides: { ...empty.tides, ...(state.tides || {}) },
    planets: { ...empty.planets, ...(state.planets || {}) },
    challenge: { ...empty.challenge, ...(state.challenge || {}), reasons: [...(state.challenge?.reasons || [])] },
    identifiedIds: [...(state.identifiedIds || [])],
    foundIds: [...(state.foundIds || [])],
    notes: [...(state.notes || [])]
  };
}

function snapshotHighCountry(state) {
  const empty = emptyHighCountrySave();
  if (!state) return empty;
  return {
    ...empty,
    ...state,
    markers: { ...(state.markers || {}) },
    measuredRoutes: [...(state.measuredRoutes || [])],
    routeReasons: [...(state.routeReasons || [])],
    terrainCompares: [...(state.terrainCompares || [])],
    stakes: [...(state.stakes || [])],
    contourLine: [...(state.contourLine || [])],
    layerTypesInspected: [...(state.layerTypesInspected || [])],
    depths: [...(state.depths || [])],
    challengeReasons: [...(state.challengeReasons || [])],
    foundIds: [...(state.foundIds || [])],
    notes: [...(state.notes || [])],
    scaleEstimates: [...(state.scaleEstimates || [])],
    mapState: { ...empty.mapState, ...(state.mapState || {}) }
  };
}

export function migrateSave(data) {
  if (!data || typeof data !== "object") return null;
  if (data.v === 5) {
    return {
      ...data,
      taught: { ...emptyTaught(), ...(data.taught || {}) },
      world: { ...emptyWorldSave(), ...(data.world || {}) },
      mastery: { ...emptyMasterySave(), ...(data.mastery || {}) },
      tools: { ...emptyToolsSave(), ...(data.tools || {}) },
      flume: { ...emptyFlumeSave(), ...(data.flume || {}) },
      fieldData: { ...emptyDataSave(), ...(data.fieldData || {}) },
      challenge: { ...emptyChallengeSave(), ...(data.challenge || {}) },
      highCountry: snapshotHighCountry(data.highCountry),
      sunfall: snapshotSunfall(data.sunfall),
      regionPlayers: { ...emptyRegionPlayers(), ...(data.regionPlayers || {}) },
      presentation: { ...emptyPresentationSave(), ...(data.presentation || {}) }
    };
  }
  if (data.v === 4) {
    return migrateSave({
      ...data,
      v: 5,
      sunfall: emptySunfallSave(),
      regionPlayers: {
        ...emptyRegionPlayers(),
        ...(data.regionPlayers || {})
      }
    });
  }
  if (data.v === 3) {
    return migrateSave({
      ...data,
      v: 4,
      highCountry: emptyHighCountrySave(),
      regionPlayers: {
        "cedar-hollow": data.player || null,
        "high-country": null
      }
    });
  }
  if (data.v === 2) {
    return migrateSave({
      ...data,
      v: 3,
      flume: emptyFlumeSave(),
      fieldData: emptyDataSave(),
      challenge: emptyChallengeSave()
    });
  }
  if (data.v === 1) {
    return migrateSave({
      ...data,
      v: 2,
      taught: { ...emptyTaught(), ...(data.taught || {}) },
      world: emptyWorldSave(),
      mastery: emptyMasterySave(),
      tools: emptyToolsSave(),
      currentRegion: data.regionId || "cedar-hollow"
    });
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
  toolState,
  flumeState,
  dataState,
  challengeState,
  hcState,
  sfState,
  regionPlayers,
  presentation
}) {
  const current = worldState?.currentRegion || "cedar-hollow";
  return {
    v: SAVE_VERSION,
    regionId: current,
    savedAt: Date.now(),
    player: { x: player.x, y: player.y, facing: player.facing },
    taught: { ...emptyTaught(), ...(taught || {}) },
    world: {
      currentRegion: current,
      accessibleRegions: worldState?.accessibleRegions || ["cedar-hollow"],
      masteredRegions: worldState?.masteredRegions || []
    },
    mastery: { records: masteryState?.records || [] },
    tools: { earnedIds: toolState?.earnedIds || [] },
    flume: { ...emptyFlumeSave(), ...(flumeState || {}) },
    fieldData: {
      datasets: dataState?.datasets || {},
      activeId: dataState?.activeId || null
    },
    challenge: { ...emptyChallengeSave(), ...(challengeState || {}) },
    highCountry: snapshotHighCountry(hcState),
    sunfall: snapshotSunfall(sfState),
    regionPlayers: {
      ...emptyRegionPlayers(),
      ...(regionPlayers || {}),
      [current]: { x: player.x, y: player.y, facing: player.facing }
    },
    presentation: { ...emptyPresentationSave(), ...(presentation || {}) },
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
      attempts: invState.attempts,
      obsInt: { sorts: [...(invState.obsInt?.sorts || [])] }
    }
  };
}

export function applySave(
  data,
  {
    player,
    missionState,
    discoveryState,
    invState,
    taught,
    worldState,
    masteryState,
    toolState,
    flumeState,
    dataState,
    challengeState,
    hcState,
    sfState,
    regionPlayers,
    presentation
  }
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
  if (migrated.investigation) {
    Object.assign(invState, migrated.investigation);
    if (!invState.obsInt) invState.obsInt = { sorts: [] };
    if (!Array.isArray(invState.obsInt.sorts)) invState.obsInt.sorts = [];
  }
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
  if (flumeState && migrated.flume) Object.assign(flumeState, emptyFlumeSave(), migrated.flume);
  if (dataState && migrated.fieldData) {
    dataState.datasets = { ...(migrated.fieldData.datasets || {}) };
    dataState.activeId = migrated.fieldData.activeId || null;
  }
  if (challengeState && migrated.challenge) {
    Object.assign(challengeState, emptyChallengeSave(), migrated.challenge);
  }
  if (hcState && migrated.highCountry) {
    const snap = snapshotHighCountry(migrated.highCountry);
    Object.assign(hcState, snap);
    hcState.mapState = { ...emptyHighCountrySave().mapState, ...(snap.mapState || {}) };
  }
  if (sfState && migrated.sunfall) {
    Object.assign(sfState, snapshotSunfall(migrated.sunfall));
  }
  if (regionPlayers && migrated.regionPlayers) {
    Object.assign(regionPlayers, emptyRegionPlayers(), migrated.regionPlayers);
  }
  if (presentation && migrated.presentation) {
    Object.assign(presentation, emptyPresentationSave(), migrated.presentation);
    presentation.appearance = {
      ...emptyPresentationSave().appearance,
      ...(migrated.presentation.appearance || {})
    };
    presentation.travelSeen = { ...(migrated.presentation.travelSeen || {}) };
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
