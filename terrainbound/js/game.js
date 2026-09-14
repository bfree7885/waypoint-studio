import { createWorld, moveWithCollision, nearestInspectable, nearestStoryProp, nearRanger, heightAt, inCreek, onTrail } from "./world.js";
import {
  createMissionState,
  addObservation,
  addStoryNote,
  canPresentFindings,
  tryAddPathNode,
  resetPath,
  observedFeatureIds
} from "./mission.js";
import {
  createDiscoveryState,
  addDiscovery,
  nearestDiscovery,
  discoveryLogModel,
  pickWrenLines,
  isFound,
  displayName,
  displayText
} from "./discoveries.js";
import {
  createInvestigationState,
  beginInvestigation,
  shouldIntroduceInvestigation,
  syncPassiveEvidence,
  recordMeasurement,
  availableMeasurementAt,
  blockedMeasurementAt,
  canProposeExplanation,
  evidenceModel,
  sketchModel,
  evaluateHypothesis,
  setSelectedProcess,
  toggleSelectedEvidence,
  clearHypothesisDraft,
  pickLandscapeWren,
  interpretiveLabels
} from "./investigation.js";
import {
  createFlumeState,
  runTrial,
  setFlumeSlope,
  setFlumeWater,
  setFlumePrediction,
  hasFairComparison,
  flumeRows,
  flumeMeans,
  slopeById,
  waterById
} from "./flume.js";
import {
  createDataState,
  setDatasetRows,
  setGraphAxes,
  graphModel,
  tryInterpretation,
  datasetSpecById
} from "./fielddata.js";
import {
  createChallengeState,
  nearestChallengeSite,
  observeSite,
  measureSite,
  canProposeChallenge,
  tryChallengeExplanation,
  tryChallengeFollowUp,
  challengeProgress,
  predictPulse
} from "./challenge.js";
import {
  createPuzzleState,
  puzzleUse,
  aarEligible,
  incompletePuzzles,
  classifySite,
  trySystemsTap,
  currentSystemsPrompt,
  hitSystemsSite,
  systemsSiteForWorld,
  systemsSiteById,
  concludeSystems,
  tryConflict,
  tabletEvidence
} from "./puzzles.js";
import { claimsForAttempt, submitAar, resetAarAnswers, selectedIds, toggleEvidence, judgeClaim } from "./aar.js";
import { createRenderer } from "./render.js";
import { bindUi } from "./ui.js";
import { captureSave, applySave, readSave, writeSave, clearSave, emptyTaught, emptyPresentationSave, wipeRequiresConfirm } from "./save.js";
import { createAudio } from "./audio.js";
import {
  createMasteryState,
  gameplaySnapshot,
  syncFromGameplay,
  fieldRecord,
  journeyRecord,
  missingEvidence,
  regionMastered,
  remediationLine,
  simulateMastery as applySimulatedMastery,
  recordEvidence
} from "./mastery.js";
import {
  loadWorld,
  createWorldState,
  previewModel,
  applyTravelUnlocks,
  drawWorldMap,
  hitTestRegion,
  canEnterRegion
} from "./worldmap.js";
import { createToolState, syncToolsFromGameplay, hasTool } from "./tools.js";
import { createHazardState } from "./hazards.js";
import {
  createHcState,
  recordMarker,
  measureRoute,
  estimateScale,
  recordCache,
  cacheTarget,
  compareRoutes,
  toggleHcTopo,
  compareTerrain,
  collectStake,
  connectContour,
  predictProfile,
  generateProfile,
  pickGisSite,
  inspectLayerType,
  compareImagery,
  predictWashoutSlope,
  recordDepth,
  planChallengeRoute,
  presentChallenge as presentHcChallenge,
  addHcFind,
  hcNoteModel,
  applyHcEvidence,
  hcReadyForChallenge,
  hcInspectTarget,
  hcToolsFlags,
  liveReading,
  markerPrecision,
  recordedMarkerCount,
  toggleMapLayer
} from "./highcountry.js";
import {
  createSfState,
  jumpObservation,
  recordShadow,
  explainRotation,
  recordSeasonNoon,
  explainSeasons,
  setOrbitEccentricity,
  measureOrbit,
  predictKepler,
  advanceKeplerModel,
  recordMoon,
  useMoonGeometry,
  predictMoon,
  predictMoonNow,
  alignEclipse,
  predictEclipse,
  explainEclipse,
  predictTide,
  compareTides,
  classifyPlanets,
  planObservation,
  visitChallengeSite,
  presentSfChallenge,
  addSfFind,
  identifyFind,
  sfNoteModel,
  applySfEvidence,
  sfReadyForChallenge,
  sfInspectTarget,
  sfToolsFlags,
  sfBoardView,
  liveSky,
  playerLat,
  tideRows
} from "./sunfall.js";
import { worldToLatLon, formatLatLon } from "./geomap.js";
import { fieldGuidance } from "./guidance.js";
import { createSummitEngine, createSummitState, createHybridProvider, createHttpAdapter, createLocalComposerAdapter, noteStruggle, noteSuccess, SUMMIT_GREETING, chooseSummitExpression, summitPortraitSrc, resolveSummitRuntime } from "./summit.js";
import { buildSummitContext } from "./summit-context.js";
import {
  isFieldTestMode,
  createFieldTestSession,
  recordSummitTurn,
  recordWorldEvent,
  markTurn,
  serializeFieldTest,
  formatFieldTestMarkdown,
  worldSnapshot,
  routeKind,
  validatorResult,
  exportFilenames
} from "./summit-fieldtest.js";
import { classifyIntentCategory } from "./summit-character.js";
import { classifyCard, pendingCard } from "./obsint.js";
import { POSE_MS, normalizeAppearance } from "./character.js";
import {
  emptyDarkSkySave,
  nightSkyState,
  darkSkyEvidence,
  darkSkyNotes,
  darkSkyGuidance,
  observeTarget,
  readTwinsLog,
  markEyepieceSeen,
  setLampOn,
  markVisited,
  logLampCalibration,
  openSpectrograph,
  tryStellarAlign,
  markStellarFeature,
  logStellarCompare,
  logTwinsConclusion,
  logEmberPeaks,
  logEmberConclusion,
  twinsObservationReady,
  ds01Complete,
  ds02Complete,
  ds03Complete,
  ds04Complete,
  ds05Complete,
  ds06Complete,
  ds07Complete,
  ds08Complete,
  ds09Complete,
  ds10Complete,
  dsAarEligible,
  darkSkyPuzzleEvidence,
  completePuzzleUse,
  logBrightnessGuess,
  setPlateSet,
  viewRimPlate,
  plateStarLayout,
  markShiftedStar,
  logCairnClaim,
  placePlotStar,
  logPlot,
  pickMassBranch,
  checkRemnant,
  logMassClaim,
  pickUpRock,
  logMetalCompare,
  logNucleosynthesis,
  tryGalaxyAlign,
  placeRedshiftPoint,
  logRedshiftTrend,
  rejectCompeting,
  pointHorn,
  pinOrigin,
  originEvidenceReady,
  tickLookbackWalk,
  noteGlowLeak,
  markEnvelopeSeen,
  markMassPlatesSeen,
  setLaterTonight,
  readDistantPoster,
  logLookback,
  toggleEnvelope,
  logEnvelope,
  debugCompleteThrough,
  atFeature,
  catalogTarget,
  twinTargets,
  buildDarkSkySummitContext,
  EMBER_ID,
  CAIRN_NEAR,
  GALAXY_IDS
} from "./darksky.js";
import { createTravelState, beginTravel, travelBlocking, travelTitleFor } from "./travel.js";

const WALK_SPEED = 196;
const VIEW_HEIGHT = 760;
const ACCEL = 9.5;
const CAMERA_FOLLOW = 3.6;

const FLOW_MAP = [
  { id: "westface-slope", short: "Slope", mapX: 22, mapY: 28 },
  { id: "pine-creek", short: "Creek", mapX: 42, mapY: 44 },
  { id: "mirror-pond", short: "Pond", mapX: 48, mapY: 64 },
  { id: "willow-reach", short: "Reach", mapX: 58, mapY: 84 },
  { id: "high-look", short: "Look", mapX: 68, mapY: 18 },
  { id: "willow-bench", short: "Bench", mapX: 62, mapY: 72 }
];

function useSummitProxy(cfg) {
  return Boolean(resolveSummitRuntime({ hostname: location.hostname, search: location.search, cfg }).endpoint);
}

export async function boot(root = document) {
  const canvas = root.querySelector("#world");
  const gameRoot = root.querySelector("#game-root") || (root.id === "game-root" ? root : document.querySelector("#game-root"));
  const [
    region,
    mission,
    curriculum,
    catalog,
    investigation,
    worldRaw,
    masteryProfile,
    toolsCatalog,
    hazardsCatalog,
    flumeSpec,
    dataCatalog,
    challengeSpec,
    puzzleSpec,
    aarSpec,
    summitCurriculum,
    summitConcepts,
    summitCuriosity,
    summitProviderCfg,
    hcRegion,
    hcCatalog,
    hcSpec,
    hcProfile,
    sfRegion,
    sfCatalog,
    sfSpec,
    sfProfile,
    presentationPack,
    dsRegion,
    dsCatalog,
    dsSpec,
    dsPuzzles,
    dsSummit,
    dsAarSpec,
    dsProfile
  ] =
    await Promise.all([
      fetch("./data/regions/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/missions/where-does-the-water-go.json").then((r) => r.json()),
      fetch("./data/curriculum/placeholders.json").then((r) => r.json()),
      fetch("./data/discoveries/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/investigations/reading-the-landscape.json").then((r) => r.json()),
      fetch("./data/world/regions.json").then((r) => r.json()),
      fetch("./data/mastery/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/world/tools.json").then((r) => r.json()),
      fetch("./data/world/hazards.json").then((r) => r.json()),
      fetch("./data/investigations/what-makes-water-move.json").then((r) => r.json()),
      fetch("./data/fielddata/catalog.json").then((r) => r.json()),
      fetch("./data/challenges/after-the-rain.json").then((r) => r.json()),
      fetch("./data/puzzles/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/aar/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/summit/cedar-hollow.json").then((r) => r.json()),
      fetch("./data/summit/concepts.json").then((r) => r.json()),
      fetch("./data/summit/curiosity.json")
        .then((r) => r.json())
        .catch(() => ({})),
      fetch("./data/summit/provider.json")
        .then((r) => r.json())
        .catch(() => ({ endpoint: "", timeoutMs: 3500 })),
      fetch("./data/regions/high-country.json").then((r) => r.json()),
      fetch("./data/discoveries/high-country.json").then((r) => r.json()),
      fetch("./data/investigations/high-country.json").then((r) => r.json()),
      fetch("./data/mastery/high-country.json").then((r) => r.json()),
      fetch("./data/regions/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/discoveries/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/investigations/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/mastery/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/world/presentation.json").then((r) => r.json()),
      fetch("./data/regions/dark-sky-basin.json").then((r) => r.json()),
      fetch("./data/darksky/catalog.json").then((r) => r.json()),
      fetch("./data/investigations/dark-sky-basin.json").then((r) => r.json()),
      fetch("./data/puzzles/dark-sky-basin.json").then((r) => r.json()),
      fetch("./data/summit/dark-sky-basin.json").then((r) => r.json()),
      fetch("./data/aar/dark-sky-basin.json").then((r) => r.json()),
      fetch("./data/mastery/dark-sky-basin.json").then((r) => r.json())
    ]);
  void curriculum;
  void hazardsCatalog;

  const tbWorld = loadWorld(worldRaw);
  const worldState = createWorldState(tbWorld);
  const masteryState = createMasteryState();
  const toolState = createToolState();
  const hazardState = createHazardState();
  void hazardState;

  const hollowWorld = createWorld(region, 1842, catalog.items);
  const hcWorld = createWorld(hcRegion, 2210, hcCatalog.items);
  const sfWorld = createWorld(sfRegion, 3107, sfCatalog.items);
  let world = hollowWorld;
  const missionState = createMissionState(mission);
  const discoveryState = createDiscoveryState();
  const invState = createInvestigationState();
  const flumeState = createFlumeState();
  const dataState = createDataState();
  const challengeState = createChallengeState();
  const puzzleState = createPuzzleState();
  const summitState = createSummitState();
  const summitRuntime = resolveSummitRuntime({
    hostname: location.hostname,
    search: location.search,
    cfg: summitProviderCfg
  });
  const summitAdapter = summitRuntime.endpoint
    ? createHttpAdapter({
        endpoint: summitRuntime.endpoint,
        timeoutMs: summitProviderCfg.timeoutMs || 5000,
        retry429: 0
      })
    : createLocalComposerAdapter({ curiosity: summitCuriosity });
  const summitEngine = createSummitEngine({
    curriculum: {
      ...summitCurriculum,
      puzzles: { ...(summitCurriculum.puzzles || {}), ...(dsSummit.puzzles || {}) }
    },
    concepts: summitConcepts,
    provider: createHybridProvider({
      curriculum: {
        ...summitCurriculum,
        puzzles: { ...(summitCurriculum.puzzles || {}), ...(dsSummit.puzzles || {}) }
      },
      concepts: summitConcepts,
      curiosity: summitCuriosity,
      adapter: summitAdapter,
      timeoutMs: summitProviderCfg?.timeoutMs || (summitRuntime.endpoint ? 5000 : 3500)
    })
  });
  const hcState = createHcState();
  const sfState = createSfState();
  const dsState = emptyDarkSkySave();
  const regionPlayers = { "cedar-hollow": null, "high-country": null, "sunfall-desert": null, "dark-sky-basin": null };
  const taught = emptyTaught();
  const presentation = emptyPresentationSave();
  const travelState = createTravelState();
  let poseUntil = 0;
  const ui = bindUi(root);
  const hollowRenderer = createRenderer(canvas, hollowWorld, { heightAt, inCreek, onTrail });
  const hcRenderer = createRenderer(canvas, hcWorld, { heightAt, inCreek, onTrail });
  const sfRenderer = createRenderer(canvas, sfWorld, { heightAt, inCreek, onTrail });
  const dsWorld = createWorld(dsRegion, 4113, []);
  const dsRenderer = createRenderer(canvas, dsWorld, { heightAt, inCreek, onTrail });
  let renderer = hollowRenderer;
  const audio = createAudio({ reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  const storage = window.localStorage;
  const keys = new Set();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const player = {
    x: region.spawn.x,
    y: region.spawn.y,
    vx: 0,
    vy: 0,
    facing: -1,
    pose: "idle"
  };

  const camera = { x: player.x, y: player.y - 40, scale: 1 };
  let destination = null;
  let mode = "title";
  let journalOpen = false;
  let dialogue = null;
  let conclusionOpen = false;
  let hypothesisOpen = false;
  let flumeOpen = false;
  let interpretOverlay = false;
  let clearanceOpen = false;
  let systemsOpen = false;
  let aarOpen = false;
  let summitOpen = false;
  let spectrumOpen = false;
  let skyEyeOpen = false;
  let summitMoreText = "";
  let summitAskLock = false;
  const params = new URLSearchParams(location.search);
  const fieldMode = params.get("field") === "1";
  const darkSkyReview = fieldMode && params.get("region") === "dark-sky-basin";
  let summitDiagOpen = false;
  const fieldTestMode = isFieldTestMode(location.search);
  const fieldTestSession = fieldTestMode ? createFieldTestSession() : null;
  let aarIndex = 0;
  let aarConfirmed = [];
  let atlasOpen = false;
  let geoOpen = false;
  let geoKind = null;
  let skyClockExpanded = false;
  let flumeRunUntil = 0;
  let confirmOpen = false;
  let last = performance.now();
  let inspectLock = false;
  let camFocus = null;
  let saveTimer = 0;
  const existingSave = readSave(storage);
  if (existingSave) {
    applySave(existingSave, {
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
        puzzleState,
        summitState,
        hcState,
      sfState,
      dsState,
      regionPlayers,
      presentation
    });
  }
  function isHighCountry() {
    return worldState.currentRegion === "high-country";
  }
  function isSunfall() {
    return worldState.currentRegion === "sunfall-desert";
  }
  function isDarkSky() {
    return worldState.currentRegion === "dark-sky-basin";
  }

  function applyRegionWorld(id, { keepPlayer = false } = {}) {
    worldState.currentRegion = id;
    if (id === "high-country") {
      world = hcWorld;
      renderer = hcRenderer;
      if (!keepPlayer) {
        const saved = regionPlayers["high-country"];
        player.x = saved?.x ?? hcRegion.spawn.x;
        player.y = saved?.y ?? hcRegion.spawn.y;
        if (saved?.facing != null) player.facing = saved.facing;
      }
      ui.setPlace("High Country", "Ridgeline Station");
      canvas.setAttribute("aria-label", "High Country, alpine ridges you can explore");
    } else if (id === "sunfall-desert") {
      world = sfWorld;
      renderer = sfRenderer;
      if (!keepPlayer) {
        const saved = regionPlayers["sunfall-desert"];
        player.x = saved?.x ?? sfRegion.spawn.x;
        player.y = saved?.y ?? sfRegion.spawn.y;
        if (saved?.facing != null) player.facing = saved.facing;
      }
      ui.setPlace("Sunfall Desert", "Sunfall Observatory");
      canvas.setAttribute("aria-label", "Sunfall Desert, an open high desert you can explore");
    } else if (id === "dark-sky-basin") {
      world = dsWorld;
      renderer = dsRenderer;
      if (!keepPlayer) {
        const saved = regionPlayers["dark-sky-basin"];
        player.x = saved?.x ?? dsRegion.spawn.x;
        player.y = saved?.y ?? dsRegion.spawn.y;
        if (saved?.facing != null) player.facing = saved.facing;
      }
      ui.setPlace("Dark Sky Basin", "North Rim Station");
      canvas.setAttribute("aria-label", "Dark Sky Basin, a high desert night basin you can explore");
    } else {
      world = hollowWorld;
      renderer = hollowRenderer;
      if (!keepPlayer) {
        const saved = regionPlayers["cedar-hollow"];
        player.x = saved?.x ?? region.spawn.x;
        player.y = saved?.y ?? region.spawn.y;
        if (saved?.facing != null) player.facing = saved.facing;
      }
      ui.setPlace("Cedar Hollow", "Granite Knob · Pine Creek");
      canvas.setAttribute("aria-label", "Cedar Hollow, a forested valley you can explore");
    }
    if (gameRoot) gameRoot.dataset.region = id;
    camera.x = player.x;
    camera.y = player.y - 28;
    refreshSkyClock();
    audio.setPlace(id, Boolean((isSunfall() && liveSky(sfState, sfRegion, player).night) || isDarkSky()));
  }

  if (!darkSkyReview && worldState.currentRegion === "dark-sky-basin" && !worldState.accessibleRegions.includes("dark-sky-basin")) {
    worldState.currentRegion = "cedar-hollow";
  }
  applyRegionWorld(worldState.currentRegion || "cedar-hollow", { keepPlayer: true });
  const resumeRegion = worldState.currentRegion || "cedar-hollow";
  if (!regionPlayers[resumeRegion]) {
    regionPlayers[resumeRegion] = { x: player.x, y: player.y, facing: player.facing };
  }
  if (darkSkyReview) {
    applyRegionWorld("dark-sky-basin", { keepPlayer: false });
  }
  camera.x = player.x;
  camera.y = player.y - 28;
  syncFromGameplay(
    masteryState,
    gameplaySnapshot({
      discoveryState,
      missionState,
      invState,
      flumeState,
      dataState,
      challengeState,
      flumeSpec,
      obsIntState: invState.obsInt
    })
  );
  syncToolsFromGameplay(toolState, toolsCatalog, {
    journalOpened: taught.journal,
    datasetInterpreted: Boolean(dataState.datasets["cedar-hollow-flow"]?.interpreted),
    ...hcToolsFlags(hcState),
    ...sfToolsFlags(sfState)
  });

  function snapshot() {
    return gameplaySnapshot({
      discoveryState,
      missionState,
      invState,
      flumeState,
      dataState,
      challengeState,
      flumeSpec,
      obsIntState: invState.obsInt,
      puzzleState
    });
  }

  function currentPuzzleUse() {
    return puzzleUse({
      missionState,
      invState,
      flumeState,
      dataState,
      challengeState,
      obsIntState: invState.obsInt,
      puzzleState,
      investigation,
      hasFairComparison: hasFairComparison(flumeState, flumeSpec)
    });
  }

  function currentGuide() {
    return fieldGuidance({
      regionId: worldState.currentRegion,
      missionState,
      discoveryState,
      invState,
      flumeState,
      dataState,
      challengeState,
      obsIntState: invState.obsInt,
      hcState,
      sfState,
      dsState,
      puzzleState,
      systemsPrompt: currentSystemsPrompt(puzzleState, puzzleSpec),
      hasFairComparison: hasFairComparison(flumeState, flumeSpec)
    });
  }

  function refreshGuide() {
    if (mode !== "play") {
      ui.setGuide(null, false);
      return;
    }
    ui.setGuide(currentGuide(), true);
  }

  function mapToolFlags() {
    return {
      coordinates: hasTool(toolState, "coordinates"),
      scale: hasTool(toolState, "scale-distance"),
      topo: hasTool(toolState, "topo-layer"),
      elevation: hasTool(toolState, "elevation"),
      profile: hasTool(toolState, "profile-tools"),
      gis: hasTool(toolState, "gis-layers")
    };
  }

  function journalView(open = journalOpen) {
    if (isHighCountry()) return hcJournalView(open);
    if (isSunfall()) return sfJournalView(open);
    if (isDarkSky()) return dsJournalView(open);
    const evidence = evidenceModel(investigation, invState);
    const flow = dataState.datasets["cedar-hollow-flow"];
    const rows = flow?.rows || [];
    const spec = datasetSpecById(dataCatalog, "cedar-hollow-flow");
    return {
      open,
      regionName: "Cedar Hollow",
      emptyNotes: "No mission notes yet. Walk the hollow and inspect what you find.",
      observations: missionState.observations,
      storyNotes: missionState.storyNotes,
      concluded: missionState.concluded,
      conclusionText: mission.completeJournalEntry,
      discoveryLog: discoveryLogModel(catalog, discoveryState, invState.interpreted),
      landscapeActive: invState.active,
      landscapeConcluded: invState.concluded,
      landscapeConclusionText: investigation.completeJournalEntry,
      evidence,
      puzzleEvidence: tabletEvidence(puzzleSpec, currentPuzzleUse(), {
        invState,
        challengeState,
        puzzleState
      }),
      sketch: sketchModel(investigation, invState),
      investigation,
      canPropose: canProposeExplanation(investigation, invState),
      fieldRecord: fieldRecord(masteryProfile, masteryState),
      journeyRecord: journeyBlocks(),
      fieldRecordLead: "Your Field Record across TerrainBound — not a grade.",
      missingLine:
        missionState.concluded && invState.concluded && !regionMastered(masteryProfile, masteryState)
          ? remediationLine(masteryProfile, masteryState)
          : "",
      dataRows: rows,
      dataMeans: rows.length ? flumeMeans(flumeState, flumeSpec) : [],
      dataCaption: spec ? spec.title : "",
      graphModel: rows.length ? graphModel(dataState, dataCatalog, "cedar-hollow-flow") : null,
      canInterpret: hasFairComparison(flumeState, flumeSpec),
      showMap: false,
      guide: currentGuide()
    };
  }

  function hcJournalView(open = journalOpen) {
    const notes = hcNoteModel(hcSpec, hcState);
    const tools = mapToolFlags();
    const mapTools = [{ id: "trails", label: "Trails", on: true }];
    if (tools.topo) mapTools.push({ id: "topo", label: hcState.mapMode === "topo" ? "Topo on" : "World view", on: hcState.mapMode === "topo" });
    if (tools.gis) {
      for (const layer of hcSpec.layers) {
        if (layer.id === "trails") continue;
        mapTools.push({
          id: layer.id,
          label: layer.label,
          on: (hcState.mapState.layersOn || []).includes(layer.id)
        });
      }
    }
    return {
      open,
      regionName: "High Country",
      emptyNotes: "The sketch is thin. Walk a marker and record where you are.",
      observations: notes,
      storyNotes: [],
      concluded: hcState.challengeOk,
      conclusionText: hcState.challengeOk ? hcSpec.completeJournalEntry : null,
      discoveryLog: discoveryLogModel(hcCatalog, { foundIds: hcState.foundIds, acknowledgedIds: [] }, false),
      landscapeActive: false,
      landscapeConcluded: false,
      evidence: { cards: [], groups: [] },
      fieldRecord: fieldRecord(hcProfile, masteryState),
      journeyRecord: journeyBlocks(),
      fieldRecordLead: "Your Field Record across TerrainBound — not a grade.",
      missingLine:
        hcState.challengeOk && !regionMastered(hcProfile, masteryState)
          ? remediationLine(hcProfile, masteryState)
          : "",
      dataRows: [],
      showMap: true,
      mapCaption: tools.topo
        ? "Toggle world and topo. The land should explain the lines."
        : "A sketch: region name, faint trails, and you. Other layers are earned.",
      mapModel: {
        region: hcRegion,
        player,
        tools,
        mapState: hcState.mapState,
        discoveries: hcCatalog.items.filter((item) => hcState.foundIds.includes(item.id)),
        heightAtFn: heightAt,
        scaleBarMeters: hcSpec.scaleBarMeters || 200
      },
      mapTools,
      guide: currentGuide(),
      onMapTool(id) {
        if (id === "topo") {
          toggleHcTopo(hcState);
          hcState.mapState.mode = hcState.mapMode;
        } else {
          toggleMapLayer(hcState.mapState, id);
        }
        hcState.mapOpened = true;
        persist();
        refreshJournal();
      }
    };
  }

  function sfJournalView(open = journalOpen) {
    const notes = sfNoteModel(sfSpec, sfState);
    const tides = tideRows();
    const tools = mapToolFlags();
    return {
      open,
      regionName: "Sunfall Desert",
      emptyNotes: "The notebooks do not agree. Start at the solar marker.",
      observations: notes,
      storyNotes: [],
      concluded: sfState.challenge.ok,
      conclusionText: sfState.challenge.ok ? sfSpec.completeJournalEntry : null,
      discoveryLog: discoveryLogModel(
        sfCatalog,
        { foundIds: sfState.foundIds, acknowledgedIds: [], identifiedIds: sfState.identifiedIds },
        false
      ),
      landscapeActive: false,
      landscapeConcluded: false,
      evidence: { cards: [], groups: [] },
      fieldRecord: fieldRecord(sfProfile, masteryState),
      journeyRecord: journeyBlocks(),
      fieldRecordLead: "Your Field Record across TerrainBound — not a grade.",
      missingLine:
        sfState.challenge.ok && !regionMastered(sfProfile, masteryState)
          ? remediationLine(sfProfile, masteryState)
          : "",
      dataRows: sfState.tides.compared ? tides.map((row) => [row.date, row.phase, String(row.range), row.kind]) : [],
      dataColumns: sfState.tides.compared ? ["Date", "Moon", "Range (m)", "Kind"] : null,
      dataCaption: "Coastal tide station — remote numbers, not an ocean investigation.",
      showMap: true,
      mapCaption: "Observatory, mesa, crater, and you. Coordinates still work here.",
      mapModel: {
        region: sfRegion,
        player,
        tools,
        mapState: { mode: "world", layersOn: ["trails"] },
        discoveries: sfCatalog.items.filter((item) => sfState.foundIds.includes(item.id)),
        heightAtFn: heightAt
      },
      mapTools: [{ id: "trails", label: "Tracks", on: true }],
      guide: currentGuide()
    };
  }

  function dsJournalView(open = journalOpen) {
    const evidence = darkSkyEvidence(dsState);
    return {
      open,
      regionName: "Dark Sky Basin",
      emptyNotes: "Night notes start at the dome. The inherited log is on the plate desk.",
      observations: darkSkyNotes(dsState, dsSpec),
      storyNotes: [],
      concluded: false,
      conclusionText: null,
      discoveryLog: { found: [], remaining: 0 },
      landscapeActive: false,
      landscapeConcluded: false,
      evidence,
      puzzleEvidence: darkSkyPuzzleEvidence(dsState),
      fieldRecord: fieldRecord(dsProfile, masteryState),
      journeyRecord: journeyBlocks(),
      fieldRecordLead: "Your Field Record across TerrainBound — not a grade.",
      missingLine: "",
      dataRows: [],
      showMap: true,
      mapCaption: "North Rim Station, opposite rims, Quiet Floor, and Lamp Bench. Where you stand changes what the light can mean.",
      mapModel: {
        region: dsRegion,
        player,
        tools: mapToolFlags(),
        mapState: { mode: "world", layersOn: ["trails"] },
        discoveries: [],
        heightAtFn: heightAt
      },
      mapTools: [{ id: "trails", label: "Tracks", on: true }],
      guide: currentGuide()
    };
  }

  function syncFlowDataset() {
    setDatasetRows(dataState, "cedar-hollow-flow", flumeRows(flumeState, flumeSpec));
    const dataset = dataState.datasets["cedar-hollow-flow"];
    if (dataset && !dataset.xField) {
      const spec = datasetSpecById(dataCatalog, "cedar-hollow-flow");
      setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", spec.graph.suggestedX, spec.graph.suggestedY);
    }
  }

  function syncProgress() {
    syncFromGameplay(masteryState, snapshot());
    syncToolsFromGameplay(toolState, toolsCatalog, {
      journalOpened: taught.journal,
      datasetInterpreted: Boolean(dataState.datasets["cedar-hollow-flow"]?.interpreted),
      ...hcToolsFlags(hcState),
      ...sfToolsFlags(sfState)
    });
    if (regionMastered(masteryProfile, masteryState)) {
      const opened = applyTravelUnlocks(tbWorld, worldState, "cedar-hollow");
      if (opened.includes("high-country") && !taught.routeHighCountry) {
        taught.routeHighCountry = true;
        ui.showToast("High Country", "Route open.");
      }
      if (opened.includes("dark-sky-basin") && !taught.routeDarkSky) {
        taught.routeDarkSky = true;
        ui.showToast("Dark Sky Basin", "Topic 11 is available.");
      }
    }
    if (regionMastered(hcProfile, masteryState)) {
      const opened = applyTravelUnlocks(tbWorld, worldState, "high-country");
      if (opened.includes("sunfall-desert") && !taught.routeSunfall) {
        taught.routeSunfall = true;
        ui.showToast("Sunfall Desert", "Route open.");
      }
    }
  }

  function fieldSnap() {
    return worldSnapshot(buildSummitContext({ ...summitContextInput(), summitState }));
  }

  function fieldObserve(kind) {
    if (!fieldTestMode || !fieldTestSession) return;
    recordWorldEvent(fieldTestSession, {
      kind,
      snapshot: fieldSnap(),
      atMs: Date.now() - fieldTestSession.startedAt
    });
  }

  function fieldTestPayload() {
    if (!fieldTestSession) return null;
    fieldTestSession.endedAt = Date.now();
    return serializeFieldTest(fieldTestSession);
  }

  function downloadFieldTest(kind) {
    const packed = fieldTestPayload();
    if (!packed) return null;
    const names = exportFilenames(packed.session);
    const body = kind === "md" ? formatFieldTestMarkdown(packed.session, packed.summary) : JSON.stringify(packed, null, 2);
    const blob = new Blob([body], { type: kind === "md" ? "text/markdown;charset=utf-8" : "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kind === "md" ? names.md : names.json;
    a.click();
    URL.revokeObjectURL(a.href);
    return packed;
  }

  function persist() {
    syncProgress();
    refreshGuide();
    regionPlayers[worldState.currentRegion] = { x: player.x, y: player.y, facing: player.facing };
    writeSave(
      storage,
      captureSave({
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
        puzzleState,
        summitState,
        hcState,
        sfState,
        dsState,
        regionPlayers,
        presentation
      })
    );
  }

  function overlayBlocks() {
    return Boolean(
      dialogue ||
        conclusionOpen ||
        hypothesisOpen ||
        confirmOpen ||
        atlasOpen ||
        flumeOpen ||
        interpretOverlay ||
        clearanceOpen ||
        systemsOpen ||
        aarOpen ||
        summitOpen ||
        spectrumOpen ||
        skyEyeOpen ||
        geoOpen ||
        travelBlocking(travelState)
    );
  }

  function setPose(kind, ms) {
    player.pose = kind;
    poseUntil = performance.now() + (ms ?? POSE_MS[kind] ?? 700);
  }

  function wrenKicker() {
    if (isDarkSky()) return "Radio · North Rim";
    if (isSunfall()) return presentation.openingSeen ? "Radio · Ridgeline" : "Sunfall Observatory";
    if (isHighCountry()) return "Ridgeline Station";
    return "Cedar Hollow Station";
  }

  function journeyBlocks() {
    const packs = [{ ...masteryProfile, regionTitle: "Cedar Hollow" }];
    if (worldState.accessibleRegions.includes("high-country")) {
      packs.push({ ...hcProfile, regionTitle: "High Country" });
    }
    if (worldState.accessibleRegions.includes("sunfall-desert")) {
      packs.push({ ...sfProfile, regionTitle: "Sunfall Desert" });
    }
    return journeyRecord(packs, masteryState);
  }

  function readyForChallenge() {
    return (
      missionState.concluded &&
      invState.concluded &&
      hasFairComparison(flumeState, flumeSpec) &&
      Boolean(dataState.datasets["cedar-hollow-flow"]?.interpreted)
    );
  }

  function flumeView() {
    return {
      slopes: flumeSpec.slopes,
      waters: flumeSpec.water,
      slope: flumeState.slope,
      water: flumeState.water,
      trials: flumeState.trials.map((trial) => ({
        ...trial,
        label: slopeById(flumeSpec, trial.slope).label,
        waterLabel: waterById(flumeSpec, trial.water).label
      })),
      status: flumeState.lastHint,
      canReadNumbers: hasFairComparison(flumeState, flumeSpec),
      prediction: flumeState.prediction,
      predictOptions: flumeSpec.slopes.map((item) => ({ id: item.id, label: `Predict: ${item.label}` }))
    };
  }

  function renderFlume() {
    ui.showFlume(true, flumeView(), {
      onSlope(id) {
        setFlumeSlope(flumeState, id);
        renderFlume();
      },
      onWater(id) {
        setFlumeWater(flumeState, id);
        renderFlume();
      },
      onPredict(id) {
        setFlumePrediction(flumeState, id);
        renderFlume();
      }
    });
  }

  function openFlume() {
    flumeState.introSeen = true;
    flumeState.active = true;
    flumeOpen = true;
    journalOpen = false;
    refreshJournal();
    renderFlume();
  }

  function closeFlume() {
    flumeOpen = false;
    ui.showFlume(false, {});
  }

  function releaseWater() {
    const result = runTrial(flumeState, flumeSpec);
    if (result.needPredict) {
      ui.showToast("Predict first", result.hint);
      renderFlume();
      return result;
    }
    flumeRunUntil = performance.now() + 1400;
    syncFlowDataset();
    persist();
    renderFlume();
    fieldObserve("trial");
    if (!result.fair) {
      ui.showToast("Fair test", result.hint);
      maybeSummitIdea("unfair-test");
    } else if (hasFairComparison(flumeState, flumeSpec)) {
      noteSuccess(summitState, "CH-03");
      fieldObserve("fair-comparison");
    }
    return result;
  }

  function interpretView() {
    const spec = datasetSpecById(dataCatalog, "cedar-hollow-flow");
    const dataset = dataState.datasets["cedar-hollow-flow"] || {};
    const col = (id) => spec.columns.find((item) => item.id === id);
    return {
      xOptions: spec.graph.allowedX.map((id) => ({ id, label: col(id)?.label || id })),
      yOptions: spec.graph.allowedY.map((id) => ({ id, label: col(id)?.label || id })),
      xField: dataset.xField || spec.graph.suggestedX,
      yField: dataset.yField || spec.graph.suggestedY,
      patterns: spec.patterns,
      conclusions: spec.conclusions,
      patternId: dataset.patternId,
      conclusionId: dataset.conclusionId,
      graphModel: graphModel(dataState, dataCatalog, "cedar-hollow-flow"),
      status: dataset.lastHint || "",
      interpreted: Boolean(dataset.interpreted)
    };
  }

  function renderInterpret() {
    ui.showInterpret(true, interpretView(), {
      onX(id) {
        const y = dataState.datasets["cedar-hollow-flow"]?.yField || "speed";
        setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", id, y);
        renderInterpret();
      },
      onY(id) {
        const x = dataState.datasets["cedar-hollow-flow"]?.xField || "slope";
        setGraphAxes(dataState, dataCatalog, "cedar-hollow-flow", x, id);
        renderInterpret();
      },
      onPattern(id) {
        ensureDatasetDraft().patternId = id;
        renderInterpret();
      },
      onConclusion(id) {
        ensureDatasetDraft().conclusionId = id;
        renderInterpret();
      }
    });
  }

  function ensureDatasetDraft() {
    syncFlowDataset();
    return dataState.datasets["cedar-hollow-flow"];
  }

  function openInterpret() {
    if (!hasFairComparison(flumeState, flumeSpec)) {
      ui.showToast("Keep measuring", "Comparable runs on more than one slope first.");
      return;
    }
    syncFlowDataset();
    interpretOverlay = true;
    journalOpen = false;
    flumeOpen = false;
    ui.showFlume(false, {});
    refreshJournal();
    renderInterpret();
  }

  function closeInterpret() {
    interpretOverlay = false;
    ui.showInterpret(false, {});
  }

  function tryInterpret() {
    const dataset = ensureDatasetDraft();
    const result = tryInterpretation(
      dataState,
      dataCatalog,
      "cedar-hollow-flow",
      dataset.patternId,
      dataset.conclusionId
    );
    persist();
    renderInterpret();
    refreshJournal();
    if (result.ok) {
      noteSuccess(summitState, "CH-04");
      fieldObserve("interpreted");
      closeInterpret();
      showDialogueLines("Ranger Wren", flumeSpec.wren.afterFair, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
    } else {
      maybeSummitIdea("pattern");
    }
  }

  function clearanceView() {
    const pick = challengeSpec.explanations.find((item) => item.id === challengeState.selectedExplanation);
    const needsPulse = Boolean(challengeSpec.pulsePredict && !challengeState.pulsePredict);
    const needsFollowUp = Boolean(pick?.correct && !challengeState.followUpDone && !challengeState.concluded);
    return {
      progress: challengeProgress(challengeState, challengeSpec),
      explanations: challengeSpec.explanations,
      selectedExplanation: challengeState.selectedExplanation,
      needsPulse,
      pulsePrompt: challengeSpec.pulsePredict?.prompt,
      pulseOptions: challengeSpec.pulsePredict?.options || [],
      pulseId: challengeState.pulsePredict,
      needsFollowUp,
      followOptions: challengeSpec.followUp.options,
      followId: null,
      status: challengeState.lastHint,
      concluded: challengeState.concluded
    };
  }

  let clearanceFollowId = null;
  let clearancePulseId = null;

  function renderClearance() {
    const view = clearanceView();
    view.followId = clearanceFollowId;
    ui.showClearance(true, view, {
      onExplanation(id) {
        challengeState.selectedExplanation = id;
        renderClearance();
      },
      onFollow(id) {
        clearanceFollowId = id;
        renderClearance();
      },
      onPulse(id) {
        clearancePulseId = id;
        challengeState.pulsePredict = id;
        renderClearance();
      }
    });
  }

  function openClearance() {
    clearanceOpen = true;
    journalOpen = false;
    refreshJournal();
    renderClearance();
  }

  function closeClearance() {
    clearanceOpen = false;
    ui.showClearance(false, {});
  }

  function tryClearance() {
    if (challengeSpec.pulsePredict && !challengeState.pulsePredict) {
      const result = predictPulse(challengeState, challengeSpec, clearancePulseId);
      persist();
      renderClearance();
      if (result.ok) {
        closeClearance();
        ui.showToast("Predicted", result.hint);
      }
      return;
    }
    const result = tryChallengeExplanation(challengeState, challengeSpec, challengeState.selectedExplanation);
    persist();
    renderClearance();
    if (result.ok && challengeState.concluded) afterClearanceSuccess();
  }

  function tryClearanceFollow() {
    const result = tryChallengeFollowUp(challengeState, challengeSpec, clearanceFollowId);
    persist();
    renderClearance();
    refreshJournal();
    if (result.ok) afterClearanceSuccess();
  }

  function afterClearanceSuccess() {
    noteSuccess(summitState, "CH-05");
    closeClearance();
    persist();
    showDialogueLines("Ranger Wren", challengeSpec.wrenAfter, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      if (!puzzleState.systems.concluded) {
        puzzleState.systems.active = true;
        openSystems();
      }
    });
  }

  function systemsView() {
    const prompt = currentSystemsPrompt(puzzleState, puzzleSpec);
    return {
      spec: puzzleSpec,
      state: puzzleState,
      lead: puzzleSpec.systems.lead,
      prompt: prompt.prompt,
      ready: prompt.kind === "ready" || prompt.kind === "done",
      concluded: puzzleState.systems.concluded,
      status: puzzleState.systems.concluded
        ? "That's one event with parts."
        : prompt.kind === "ready"
          ? "That's one event with parts. Check it against the land."
          : ""
    };
  }

  function renderSystems() {
    ui.showSystems(true, systemsView(), {
      onTap(x, y, w, h) {
        const site = hitSystemsSite(puzzleSpec, w, h, x, y);
        if (!site) return;
        applySystemsTap(site.id);
      }
    });
  }

  function applySystemsTap(siteId) {
    puzzleState.systems.active = true;
    const judged = trySystemsTap(puzzleState, puzzleSpec, siteId);
    persist();
    if (systemsOpen) renderSystems();
    refreshGuide();
    if (!judged.ok) {
      ui.showToast("The land disagrees", judged.hint);
      maybeSummitIdea("systems");
      return judged;
    }
    const site = systemsSiteById(puzzleSpec, siteId);
    ui.showToast("On the map", site?.label || "Noted");
    return judged;
  }

  function maybeSystemsTap(worldId) {
    if (puzzleState.systems.concluded) return false;
    if (!puzzleState.systems.active && !challengeState.concluded) return false;
    const site = systemsSiteForWorld(puzzleSpec, worldId);
    if (!site) return false;
    applySystemsTap(site.id);
    return true;
  }

  function openSystems() {
    puzzleState.systems.active = true;
    systemsOpen = true;
    renderSystems();
  }

  function closeSystems() {
    systemsOpen = false;
    ui.showSystems(false, {});
  }

  function walkSystemsSite() {
    const prompt = currentSystemsPrompt(puzzleState, puzzleSpec);
    const site =
      prompt.kind === "predict"
        ? systemsSiteById(puzzleSpec, puzzleSpec.systems.predict.ok)
        : (puzzleSpec.systems.sites || []).find((item) => item.role === prompt.role?.id);
    const point = worldPointForSite(site);
    closeSystems();
    if (point) {
      player.x = point.x;
      player.y = point.y;
      destination = null;
    }
    ui.showToast("Walk it", prompt.where || "Inspect the land that matches the question.");
  }

  function worldPointForSite(site) {
    if (!site) return null;
    for (const id of site.worldIds || []) {
      const feat = region.features.find((item) => item.id === id);
      if (feat) return feat;
      const prop = (region.props || []).find((item) => item.kind === id);
      if (prop) return prop;
      const disc = catalog.items.find((item) => item.id === id);
      if (disc) return disc;
      const ch = (challengeSpec.sites || []).find((item) => item.id === id);
      if (ch) return ch;
    }
    return null;
  }

  function trySystemsMap() {
    const result = concludeSystems(puzzleState, puzzleSpec);
    persist();
    renderSystems();
    if (!result.ok) {
      ui.showToast("Keep mapping", result.hint);
      maybeSummitIdea("systems");
      return;
    }
    noteSuccess(summitState, "CH-07");
    closeSystems();
    showDialogueLines("Ranger Wren", ["Source, slope, path, store — and the willows took a hit. That's one event with parts."], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      const use = currentPuzzleUse();
      if (!use["CH-08"]) openConflict();
      else if (aarEligible(puzzleSpec, use)) openAar();
    });
  }

  function openConflict() {
    puzzleState.conflict.seen = true;
    persist();
    ui.showDialogue(true, "Ranger Wren", puzzleSpec.conflict.lead + " " + puzzleSpec.conflict.prompt, puzzleSpec.conflict.options.map((option) => ({
      label: option.label,
      onClick: () => {
        const judged = tryConflict(puzzleState, puzzleSpec, option.id);
        persist();
        if (!judged.ok) {
          maybeSummitIdea("revision");
          ui.showDialogue(true, "Ranger Wren", judged.hint, [
            {
              label: "Revise the story",
              onClick: () => {
                dialogue = null;
                ui.showDialogue(false);
                openConflict();
              }
            }
          ]);
          return;
        }
        noteSuccess(summitState, "CH-08");
        dialogue = null;
        ui.showDialogue(false);
        showDialogueLines("Ranger Wren", ["That's revision. You dropped the false cause because the land disagreed."], 0, () => {
          dialogue = null;
          ui.showDialogue(false);
          const use = currentPuzzleUse();
          if (aarEligible(puzzleSpec, use)) openAar();
        });
      }
    })), wrenKicker());
  }

  function liveAarSpec() {
    return isDarkSky() ? dsAarSpec : aarSpec;
  }

  function liveAarHost() {
    return isDarkSky() ? dsState : puzzleState;
  }

  function aarItems() {
    const host = liveAarHost();
    return claimsForAttempt(liveAarSpec(), (host.aar.attempts || 0) + 1);
  }

  function aarView() {
    const spec = liveAarSpec();
    const host = liveAarHost();
    const items = aarItems();
    const item = items[aarIndex] || items[0];
    const done = items.length > 0 && items.every((claim) => aarConfirmed.includes(claim.id));
    if (host.aar.result) {
      return {
        title: host.aar.result === "clearance" ? spec.clearance.title : spec.moreEvidence.title,
        lead: host.aar.result === "clearance" ? spec.clearance.lines[0] : host.aar.remediation.join(" "),
        stem: "",
        evidence: [],
        selected: [],
        result: host.aar.result,
        status: host.aar.result === "clearance" ? spec.clearance.title : spec.moreEvidence.lead,
        done: true
      };
    }
    const evidence = isDarkSky()
      ? darkSkyPuzzleEvidence(dsState)
      : tabletEvidence(puzzleSpec, currentPuzzleUse(), {
          missionState,
          invState,
          flumeState,
          dataState,
          challengeState,
          puzzleState
        });
    return {
      title: spec.title,
      lead: aarIndex === 0 ? spec.open : "Which notes actually support this claim? Leave the rest in the tablet.",
      stem: item?.wren || item?.stem || "",
      evidence,
      selected: item ? selectedIds(host.aar.answers, item.id) : [],
      done,
      result: null,
      status: evidence.length
        ? ""
        : "Your tablet is still thin. Walk the field first, then pin notes you actually recorded."
    };
  }

  function renderAar(status) {
    const view = aarView();
    if (status) view.status = status;
    ui.showAar(true, view, {
      onToggle(id) {
        const items = aarItems();
        const item = items[aarIndex];
        if (!item) return;
        const host = liveAarHost();
        const next = toggleEvidence(selectedIds(host.aar.answers, item.id), id);
        host.aar.answers = { ...host.aar.answers, [item.id]: next };
        if (aarConfirmed.includes(item.id) && !judgeClaim(item, next).good) {
          aarConfirmed = aarConfirmed.filter((claimId) => claimId !== item.id);
        }
        persist();
        renderAar();
      }
    });
  }

  function openAar() {
    aarOpen = true;
    aarConfirmed = [];
    const host = liveAarHost();
    if (host.aar.result === "more-evidence") resetAarAnswers(host);
    if (host.aar.result !== "clearance") aarIndex = 0;
    const closeBtn = root.querySelector("#aar-close");
    if (closeBtn) closeBtn.textContent = isDarkSky() ? "Back to the basin" : "Back to the hollow";
    renderAar();
  }

  function closeAar() {
    aarOpen = false;
    ui.showAar(false, {});
  }

  function summitContextInput() {
    if (isDarkSky()) {
      return buildDarkSkySummitContext({
        state: dsState,
        catalog: dsCatalog,
        region: dsRegion,
        player,
        spec: dsSummit,
        summitState
      });
    }
    return {
      regionId: worldState.currentRegion,
      player,
      region: isHighCountry() || isSunfall() ? { features: [] } : region,
      catalog: isHighCountry() || isSunfall() ? { items: [] } : catalog,
      missionState,
      discoveryState,
      invState,
      flumeState,
      dataState,
      challengeState,
      puzzleState,
      puzzleSpec,
      aarSpec,
      flumeSpec,
      investigation,
      aarOpen,
      aarIndex,
      summitState,
      systemsPrompt: currentSystemsPrompt(puzzleState, puzzleSpec)
    };
  }

  function renderSummit(extra = {}) {
    const debug = fieldMode ? summitState.lastDebug : null;
    const last = summitState.lastDebug || {};
    const lastTurn = fieldTestSession?.events?.filter((row) => row.type === "summit").slice(-1)[0] || null;
    const expression = chooseSummitExpression({
      pending: Boolean(extra.pending),
      intent: last.intent || summitState.lastIntent || "",
      routeReason: last.route || "",
      misconceptionId: last.misconceptionId || ""
    });
    ui.showSummit(true, {
      lead: extra.pending
        ? "Looking at the notes you actually have…"
        : isDarkSky()
          ? "Curious about the night. Serious about the science."
          : "Curious about the hollow. Serious about the science.",
      messages: summitState.recent,
      moreAvailable: Boolean(summitMoreText),
      pending: Boolean(extra.pending),
      expression,
      portraitSrc: summitPortraitSrc(expression),
      fieldTest: fieldTestMode,
      fieldTestTurnId: lastTurn?.id || "",
      fieldDebug: fieldMode,
      diagOpen: summitDiagOpen,
      diag: debug && summitDiagOpen
        ? [
            fieldTestMode ? "SUMMIT FIELD TEST" : "FIELD",
            debug.adapterId ? `${debug.provider}/${debug.adapterId}` : debug.provider,
            debug.useAi ? "ai-path" : "authored",
            debug.intent || "intent",
            `L${debug.supportLevel}`,
            debug.route || "route",
            debug.validation || "validation",
            debug.fallbackReason ? `fallback ${debug.fallbackReason}` : "",
            debug.packetKeys?.length ? `ctx ${debug.packetKeys.slice(0, 8).join(",")}` : ""
          ]
            .filter(Boolean)
            .join(" · ")
        : fieldTestMode
          ? "SUMMIT FIELD TEST · local anonymous log · Summit is the language layer only"
          : ""
    });
    ui.setSummitIdea(Boolean(summitState.idea));
  }

  function openSummit() {
    summitOpen = true;
    summitState.idea = false;
    ui.setSummitIdea(false);
    if (!summitState.recent.length) {
      summitState.recent = [
        {
          role: "summit",
          kind: "greet",
          intent: "character",
          text: isDarkSky()
            ? "I'm Summit. Looking the same from far away doesn't prove much. I should know. Ask me about the light you actually recorded — Wren still runs the expedition."
            : SUMMIT_GREETING
        }
      ];
      persist();
    }
    renderSummit();
  }

  function closeSummit() {
    summitOpen = false;
    ui.showSummit(false, {});
  }

  async function askSummit(opts) {
    if (worldState.currentRegion !== "cedar-hollow" && worldState.currentRegion !== "dark-sky-basin") {
      summitState.recent = [
        ...(summitState.recent || []),
        {
          role: "summit",
          kind: "orient",
          intent: "what_now",
          text: "This version of Summit tutors Cedar Hollow. Wren still runs the field work in other regions."
        }
      ].slice(-8);
      persist();
      renderSummit();
      return;
    }
    if (summitAskLock) return;
    summitAskLock = true;
    if (summitOpen) renderSummit({ pending: true });
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const reply = await Promise.resolve(summitEngine.ask(summitState, summitContextInput(), opts));
      summitMoreText = reply.more || "";
      if (fieldTestSession) {
        const snap = fieldSnap();
        const usage = reply.rawModel?.usage || {};
        recordSummitTurn(fieldTestSession, {
          studentUtterance: opts.question || opts.action || "",
          action: opts.action || "",
          region: snap.region,
          puzzle: snap.puzzleId,
          puzzleStage: snap.stage,
          locationCategory: (snap.near || []).join(", "),
          routeKind: routeKind(reply),
          routeReason: reply.route?.reason || "",
          concept: (reply.conceptIds || [])[0] || "",
          supportLevel: reply.level,
          modelLatencyMs: usage.latencyMs,
          fullLoopMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
          validatorResult: validatorResult(reply),
          fallbackOccurred: Boolean(reply.fallbackReason),
          fallbackReason: reply.fallbackReason || "",
          visibleResponse: reply.text,
          nextActionText: reply.packet?.nextAction?.text || "",
          comparisonReady: snap.comparisonReady,
          steepMeasured: snap.steepMeasured,
          gentleMeasured: snap.gentleMeasured,
          misconceptionId: reply.misconceptionId || "",
          intentCategory: classifyIntentCategory({
            question: opts.question || "",
            action: opts.action || "",
            routeReason: reply.route?.reason || "",
            intent: reply.intent || ""
          }),
          snapshot: snap,
          atMs: Date.now() - fieldTestSession.startedAt
        });
      }
      persist();
      return reply;
    } finally {
      summitAskLock = false;
      if (summitOpen) renderSummit();
    }
  }

  function maybeSummitIdea(kind) {
    noteStruggle(summitState, summitContextInput().activePuzzleId || "CH-02", kind || "fail");
    ui.setSummitIdea(Boolean(summitState.idea));
    if (summitState.idea && !summitState.ideaSeen) {
      summitState.ideaSeen = true;
      ui.showToast("Summit has an idea", "Ask when you want a hand reading the hollow.");
    }
    persist();
  }

  function aarAdvance() {
    const items = aarItems();
    const item = items[aarIndex];
    if (!item) return;
    const host = liveAarHost();
    const selected = selectedIds(host.aar.answers, item.id);
    if (!selected.length) {
      ui.showToast("Show me the notes", "Pin the Field Tablet evidence that actually supports this.");
      return;
    }
    const judged = judgeClaim(item, selected);
    host.aar.lastJudge = {
      kind: judged.kind,
      hint: judged.hint,
      good: judged.good,
      claimId: item.id,
      pinned: selected
    };
    persist();
    if (!judged.good) {
      maybeSummitIdea(judged.kind);
      renderAar(judged.hint);
      return;
    }
    const already = aarConfirmed.includes(item.id);
    if (!already) aarConfirmed.push(item.id);
    if (!already) {
      renderAar(judged.hint);
      return;
    }
    if (aarIndex < items.length - 1) {
      aarIndex += 1;
      renderAar();
      return;
    }
    renderAar("If the whole case still stands, show me.");
  }

  function submitAarCase() {
    if (isDarkSky()) {
      const use = completePuzzleUse(dsState, ds01Complete(dsState), ds02Complete(dsState));
      const missing = incompletePuzzles(dsPuzzles, use);
      const result = submitAar(dsState, dsAarSpec, dsPuzzles, dsState.aar.answers, missing);
      persist();
      refreshJournal();
      closeAar();
      fieldObserve(result.result === "clearance" ? "clearance" : "aar");
      if (result.result === "clearance") {
        applyTravelUnlocks(tbWorld, worldState, "dark-sky-basin");
        persist();
        showDialogueLines("Ranger Wren", dsAarSpec.clearance.lines, 0, () => {
          dialogue = null;
          ui.showDialogue(false);
        });
        return result;
      }
      showDialogueLines("Ranger Wren", result.lines.length ? result.lines : [dsAarSpec.moreEvidence.lead], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return result;
    }
    const use = currentPuzzleUse();
    const missing = incompletePuzzles(puzzleSpec, use);
    const result = submitAar(puzzleState, aarSpec, puzzleSpec, puzzleState.aar.answers, missing);
    persist();
    refreshJournal();
    closeAar();
    fieldObserve(result.result === "clearance" ? "clearance" : "aar");
    if (result.result === "clearance") {
      noteSuccess(summitState, "CH-09");
      showDialogueLines("Ranger Wren", aarSpec.clearance.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openAtlas("high-country");
      });
      return result;
    }
    showDialogueLines("Ranger Wren", result.lines.length ? result.lines : [aarSpec.moreEvidence.lead], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
    return result;
  }

  function inspectChallenge(site) {
    if (!site || inspectLock) return;
    if (challengeSpec.pulsePredict && !challengeState.pulsePredict) {
      openClearance();
      ui.showToast("Predict first", "Where should the brown pulse first show?");
      return;
    }
    inspectLock = true;
    const observed = observeSite(challengeState, challengeSpec, site.id);
    const lines = [site.observe];
    if (site.measure) {
      const measured = measureSite(challengeState, challengeSpec, site.id);
      if (!measured.already) lines.push(`${site.measure.label}: ${site.measure.value} (${site.measure.unit})`);
    }
    showDialogueLines(site.name, lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      taught.inspect = true;
      persist();
      refreshJournal();
      if (!observed.already) ui.showToast("Noted", site.name);
      maybeSystemsTap(site.id);
    }, site.useful === false ? "Look closer" : "Field note");
  }

  function renderAtlas() {
    const canvasEl = root.querySelector("#atlas-map");
    if (!canvasEl) return;
    sizeAtlasCanvas();
    const ctx = canvasEl.getContext("2d");
    drawWorldMap(ctx, tbWorld, worldState, worldState.selectedRegionId);
    ui.setAtlasPreview(previewModel(tbWorld, worldState, worldState.selectedRegionId));
  }

  function sizeAtlasCanvas() {
    const canvasEl = root.querySelector("#atlas-map");
    const atlasEl = root.querySelector("#atlas");
    if (!canvasEl || atlasEl?.hidden) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, canvasEl.clientWidth);
    const cssH = Math.max(1, canvasEl.clientHeight);
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (canvasEl.width !== w || canvasEl.height !== h) {
      canvasEl.width = w;
      canvasEl.height = h;
    }
  }

  function openAtlas(regionId) {
    if (regionId) worldState.selectedRegionId = regionId;
    atlasOpen = true;
    journalOpen = false;
    taught.worldMap = true;
    audio.map();
    persist();
    refreshJournal();
    ui.showAtlas(true);
    requestAnimationFrame(() => renderAtlas());
  }

  function closeAtlas() {
    atlasOpen = false;
    ui.showAtlas(false);
  }

  function refreshJournal() {
    ui.setJournal(journalView());
    refreshGuide();
  }

  function pulseFocus(x, y, ms = 720) {
    camFocus = { x, y, until: performance.now() + ms };
  }

  function teachWalk() {
    if (!taught.walk) {
      taught.walk = true;
      persist();
    }
  }

  function controlHintText() {
    if (mode !== "play" || dialogue) return "";
    if (!taught.walk) return "WASD / ARROWS · WALK";
    if (!taught.inspect && currentTarget()) return "E · LOOK CLOSER";
    if (taught.inspect && !taught.journal) return "J · FIELD TABLET";
    return "";
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    camera.scale = canvas.height / VIEW_HEIGHT;
    if (atlasOpen) renderAtlas();
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return {
      x: (x - canvas.width / 2) / camera.scale + camera.x,
      y: (y - canvas.height / 2) / camera.scale + camera.y
    };
  }

  function openIntro() {
    missionState.introSeen = true;
    persist();
    setPose("talk");
    showDialogueLines(mission.intro.speaker, mission.intro.lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    }, wrenKicker());
  }

  function showDialogueLines(speaker, lines, index, onDone, kicker = "") {
    const line = lines[index];
    const lastLine = index >= lines.length - 1;
    const voice = kicker || (speaker === "Ranger Wren" ? wrenKicker() : "");
    dialogue = { speaker, lines, index };
    ui.showDialogue(
      true,
      speaker,
      line,
      [
        {
          label: lastLine ? (speaker === "Ranger Wren" ? "Let's go" : "Got it") : "Continue",
          onClick: () => {
            if (lastLine) onDone();
            else showDialogueLines(speaker, lines, index + 1, onDone, voice);
          }
        }
      ],
      voice
    );
  }

  function inspectFeature(feature) {
    if (!feature || inspectLock) return;
    const result = addObservation(missionState, mission, feature.id);
    if (!result) return;
    fieldObserve("inspect");
    inspectLock = true;
    const spec = result.spec;
    showDialogueLines("Field note", [spec.prompt, spec.text], 0, () => {
      const inquiry = puzzleSpec.siteInquiries?.[feature.id];
      const read = puzzleState.siteReads[feature.id];
      if (inquiry && !read?.ok) {
        ui.showDialogue(
          true,
          "Field note",
          inquiry.prompt,
          inquiry.options.map((option) => ({
            label: option.label,
            onClick: () => {
              const judged = classifySite(puzzleState, puzzleSpec, feature.id, option.id);
              dialogue = null;
              inspectLock = false;
              if (judged.ok) {
                ui.showDialogue(false);
                ui.showToast("Noted", spec.title);
                persist();
                refreshJournal();
                maybeSystemsTap(feature.id);
              } else {
                ui.showDialogue(true, "Field note", judged.hint, [
                  {
                    label: "Look again",
                    onClick: () => {
                      dialogue = null;
                      ui.showDialogue(false);
                    }
                  }
                ]);
                persist();
              }
            }
          })),
          ""
        );
        return;
      }
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      if (!result.already) {
        taught.inspect = true;
        ui.showToast("Noted", spec.title);
        persist();
        refreshJournal();
      }
      maybeSystemsTap(feature.id);
    });
  }

  function inspectDiscovery(item) {
    if (!item || inspectLock) return;
    inspectLock = true;

    if (!isFound(discoveryState, item.id)) {
      const result = addDiscovery(discoveryState, catalog, item.id);
      fieldObserve("discovery");
      const name = displayName(item, false);
      player.pose = "inspect";
      pulseFocus(item.x, item.y);
      audio.discover();
      showDialogueLines(name, [item.prompt, displayText(item, false)], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
        player.pose = "idle";
        if (!result.already) {
          taught.inspect = true;
          syncPassiveEvidence(invState, investigation, discoveryState);
          ui.showToast("Noted", name);
          persist();
          refreshJournal();
          maybeSystemsTap(item.id);
          const sortCard = pendingCard(investigation.obsInt, invState.obsInt, discoveryState.foundIds);
          if (sortCard && sortCard.discoveryId === item.id) openGeo("obsint");
        }
      }, "Look closer");
      return;
    }

    const name = displayName(item, invState.interpreted);
    const text = displayText(item, invState.interpreted);
    const pending = availableMeasurementAt(investigation, invState, discoveryState, item.id);
    if (pending) {
      player.pose = "inspect";
      showDialogueLines("Field measurement", [pending.prompt, pending.result], 0, () => {
        const recorded = recordMeasurement(invState, investigation, pending.id, discoveryState);
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
        player.pose = "idle";
        if (!recorded.already) {
          ui.showToast("Noted", pending.result);
          persist();
          refreshJournal();
        }
      }, pending.actionLabel);
      return;
    }

    const blocked = blockedMeasurementAt(investigation, invState, discoveryState, item.id);
    if (blocked) {
      showDialogueLines(name, [text, blocked.missingHint], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        inspectLock = false;
      });
      return;
    }

    const sortCard = pendingCard(investigation.obsInt, invState.obsInt, discoveryState.foundIds);
    if (sortCard && sortCard.discoveryId === item.id) {
      inspectLock = false;
      openGeo("obsint");
      return;
    }

    showDialogueLines(name, [text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      maybeSystemsTap(item.id);
    });
  }

  function inspectProp(prop) {
    if (!prop?.inspect || inspectLock) return;
    if (prop.kind === "runoff-table") {
      openFlume();
      return;
    }
    const result = addStoryNote(missionState, prop.inspect);
    inspectLock = true;
    showDialogueLines(prop.inspect.title, [prop.inspect.text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      if (!result.already) {
        taught.inspect = true;
        ui.showToast("Noted", prop.inspect.title);
        persist();
        refreshJournal();
      }
      maybeSystemsTap(prop.kind);
    });
  }

  function playTravelCard(id, after) {
    const title = travelTitleFor(presentationPack, id);
    beginTravel(travelState, id, worldState.currentRegion);
    ui.showTravel(true, title.region, title.station);
    const rev = presentationPack.reveals?.[id];
    if (rev) camFocus = { x: rev.x, y: rev.y, until: performance.now() + Math.max(rev.ms, 1600) };
    window.setTimeout(() => {
      ui.showTravel(false);
      after?.();
    }, 1500);
  }

  function travelTo(id) {
    const reviewOk = fieldMode && id === "dark-sky-basin";
    if (!reviewOk && !canEnterRegion(tbWorld, worldState, id)) return false;
    regionPlayers[worldState.currentRegion] = { x: player.x, y: player.y, facing: player.facing };
    const firstHc = id === "high-country" && !hcState.introSeen;
    const firstSf = id === "sunfall-desert" && !sfState.introSeen;
    const firstDs = id === "dark-sky-basin" && !dsState.introSeen;
    dialogue = null;
    inspectLock = false;
    ui.showDialogue(false);
    closeGeo();
    journalOpen = false;
    refreshJournal();
    applyRegionWorld(id, { keepPlayer: false });
    persist();
    refreshJournal();
    playTravelCard(id, () => {
      if (firstHc) {
        hcState.introSeen = true;
        persist();
        showDialogueLines("Ranger Wren", hcSpec.intro.lines, 0, () => {
          dialogue = null;
          ui.showDialogue(false);
        });
      } else if (firstSf) {
        sfState.introSeen = true;
        persist();
        showDialogueLines("Ranger Wren", sfSpec.intro.lines, 0, () => {
          dialogue = null;
          ui.showDialogue(false);
        });
      } else if (firstDs) {
        dsState.introSeen = true;
        persist();
        showDialogueLines("Ranger Wren", dsSpec.intro.lines, 0, () => {
          dialogue = null;
          ui.showDialogue(false);
        });
      }
    });
    return true;
  }

  function takeEvidence(result) {
    if (!result?.evidence?.length) {
      persist();
      refreshJournal();
      refreshSkyClock();
      return;
    }
    if (isSunfall()) applySfEvidence(masteryState, recordEvidence, result.evidence);
    else applyHcEvidence(masteryState, recordEvidence, result.evidence);
    persist();
    refreshJournal();
    refreshSkyClock();
  }

  const SKY_JUMPS = [
    { id: "morning", label: "Morning" },
    { id: "noon", label: "Noon" },
    { id: "sunset", label: "Sunset" },
    { id: "night", label: "Night" },
    { id: "+1d", label: "+1 day" },
    { id: "+7d", label: "+7 days" },
    { id: "+1m", label: "+1 month" },
    { id: "winter", label: "Winter noon" },
    { id: "equinox", label: "Equinox noon" },
    { id: "summer", label: "Summer noon" }
  ];

  function skyClockPlan() {
    const day = SKY_JUMPS.slice(0, 4);
    const jumps = SKY_JUMPS.slice(4, 7);
    const seasons = SKY_JUMPS.slice(7);
    if (skyClockExpanded || geoKind === "challenge") {
      return { primary: day, extra: [...jumps, ...seasons], mode: "window" };
    }
    if (geoKind === "seasons" || sfState.seasonObs.length) {
      return { primary: day, extra: seasons, mode: "year" };
    }
    if (geoKind === "moon" || sfState.moonLog.length) {
      return { primary: [SKY_JUMPS[3], ...jumps], extra: day.slice(0, 3), mode: "moon" };
    }
    if (geoKind === "shadow" || sfState.shadows.length < 3) {
      return { primary: day.slice(0, 3), extra: [SKY_JUMPS[3]], mode: "shadow" };
    }
    return { primary: day, extra: [], mode: "clock" };
  }

  function refreshSkyClock() {
    if (!isSunfall() || mode !== "play") {
      ui.showSkyClock(false);
      return;
    }
    const sky = liveSky(sfState, sfRegion, player);
    const lat = playerLat(sfRegion, player);
    const plan = skyClockPlan();
    ui.showSkyClock(
      true,
      {
        label: `${sky.label} · ${sky.timeName} · ${formatLatLon({ lat, lon: worldToLatLon(sfRegion, player.x, player.y).lon }, 3)}`,
        sun: sky.timeName,
        primary: plan.primary,
        extra: plan.extra,
        mode: plan.mode,
        expanded: skyClockExpanded,
        jumps: SKY_JUMPS
      },
      {
        onJump(id) {
          jumpObservation(sfState, id, sfRegion, player);
          persist();
          refreshSkyClock();
          if (geoOpen) renderGeo();
        },
        onFull() {
          skyClockExpanded = !skyClockExpanded;
          refreshSkyClock();
        }
      }
    );
  }

  function closeGeo() {
    geoOpen = false;
    geoKind = null;
    ui.showGeoBoard(false);
  }

  function openGeo(kind) {
    geoKind = kind;
    geoOpen = true;
    journalOpen = false;
    refreshJournal();
    renderGeo();
  }

  function renderSfGeo() {
    const sky = liveSky(sfState, sfRegion, player);
    const view = sfBoardView(geoKind, sfState, sfSpec, sky);
    if (geoKind === "challenge") {
      const good = sfSpec.challenge.sites.find((site) => site.ok);
      if (good) {
        view.lead = `Walk to ${formatLatLon(worldToLatLon(sfRegion, good.x, good.y), 4)}. Match the live reading. Pair labels are not the answer.`;
      }
    }
    ui.showGeoBoard(true, view, {
      onPick(group, id) {
        if (geoKind === "shadow" && group === "explain") sfState.rotationExplain = id;
        if (geoKind === "seasons" && group === "explain") sfState.seasonExplain = id;
        if (geoKind === "orbit" && group === "ecc") setOrbitEccentricity(sfState, Number(id));
        if (geoKind === "moon" && group === "now") sfState.pendingMoon = id;
        if (geoKind === "eclipse" && group === "tilt") alignEclipse(sfState, id !== "off");
        if (geoKind === "eclipse" && group === "will") sfState._eclipseWill = id;
        if (geoKind === "eclipse" && group === "explain") sfState._eclipseChoice = id;
        if (geoKind === "tides" && group === "pattern") sfState.tides.pattern = id;
        if (geoKind === "tides" && group === "predict") predictTide(sfState, id);
        if (geoKind === "planets" && group === "pattern") sfState.planets.pattern = id;
        if (geoKind === "challenge") {
          if (group === "reason") {
            const has = sfState.challenge.reasons.includes(id);
            sfState.challenge.reasons = has
              ? sfState.challenge.reasons.filter((item) => item !== id)
              : [...sfState.challenge.reasons, id];
          } else {
            sfState.challenge[group] = id;
          }
        }
        renderGeo();
      },
      onNumber(_id, value) {
        if (geoKind === "kepler") sfState.kepler.predictedP = Number(value);
      },
      onTry() {
        let result = { ok: false };
        if (geoKind === "shadow") result = explainRotation(sfState, sfState.rotationExplain);
        else if (geoKind === "seasons") result = explainSeasons(sfState, sfState.seasonExplain);
        else if (geoKind === "orbit") result = measureOrbit(sfState);
        else if (geoKind === "kepler") {
          if (sfState.kepler.ok && !sfState.kepler.modelChecked) result = advanceKeplerModel(sfState);
          else result = predictKepler(sfState, sfState.kepler.predictedP);
        } else if (geoKind === "moon") {
          result = predictMoonNow(sfState, sfState.pendingMoon);
        } else if (geoKind === "eclipse") {
          if (sfState._eclipseWill) predictEclipse(sfState, sfState._eclipseWill === "yes");
          result = explainEclipse(sfState, sfState._eclipseChoice);
        } else if (geoKind === "tides") {
          result = compareTides(sfState, sfState.tides.pattern);
        } else if (geoKind === "planets") result = classifyPlanets(sfState, sfState.planets.pattern);
        else if (geoKind === "challenge") {
          result = planObservation(sfState, sfSpec, sfState.challenge);
          if (result.ok) presentSfChallenge(sfState);
        }
        takeEvidence(result);
        renderGeo();
        if (result.ok) ui.showToast("Noted", result.hint || view.title);
        else if (result.hint) ui.showToast("Check the model", result.hint);
      }
    });
  }

  function renderGeo() {
    if (!geoOpen) return;
    if (isSunfall()) {
      renderSfGeo();
      return;
    }
    if (geoKind === "obsint") {
      const card = pendingCard(investigation.obsInt, invState.obsInt, discoveryState.foundIds);
      ui.showGeoBoard(
        true,
        {
          title: "What can you see?",
          lead: "Pick the sentence that stays with the rock in front of you.",
          status: invState.lastHint || "",
          ok: false,
          tryLabel: "Sort this pair",
          obsInt: card
            ? {
                prompt: card.prompt,
                observation: card.observation,
                interpretation: card.interpretation,
                selected: invState._obsChoice || null
              }
            : null,
          hideTry: !card
        },
        {
          onPick(_group, id) {
            invState._obsChoice = id;
            renderGeo();
          },
          onTry() {
            if (!card) {
              closeGeo();
              return;
            }
            const result = classifyCard(invState.obsInt, investigation.obsInt, card.id, invState._obsChoice);
            invState.lastHint = result.hint;
            persist();
            renderGeo();
            if (result.ok) {
              ui.showToast("Observation", result.hint);
              closeGeo();
            } else ui.showToast("Look again", result.hint);
          }
        }
      );
      return;
    }
    if (geoKind === "scale") {
      const trails = [hcSpec.routes.a, hcSpec.routes.b];
      ui.showGeoBoard(
        true,
        {
          title: "How far on the land?",
          lead: `The bar on the sketch is ${hcSpec.scaleBarMeters || 200} m. Count bars along a trail, then check the walk.`,
          status: hcState.lastHint,
          ok: (hcState.scaleEstimates || []).filter((row) => row.ok).length >= 2,
          numberInput: { id: "meters", label: "Your estimate (m)", value: hcState._scaleGuess || "" },
          groups: [
            {
              id: "trail",
              label: "Trail",
              selected: hcState._scaleTrail,
              items: trails.map((trail) => ({ id: trail.id, label: trail.label }))
            }
          ],
          tryLabel: "Check against the land"
        },
        {
          onPick(_group, id) {
            hcState._scaleTrail = id;
            renderGeo();
          },
          onNumber(_id, value) {
            hcState._scaleGuess = value;
          },
          onTry() {
            const result = estimateScale(
              hcState,
              hcSpec,
              hcRegion,
              heightAt,
              hcState._scaleTrail,
              hcState._scaleGuess
            );
            takeEvidence(result);
            renderGeo();
            if (!result.ok) ui.showToast("Use the bar", result.hint);
            else ui.showToast("Scale", result.hint);
          }
        }
      );
      return;
    }
    if (geoKind === "terrain") {
      const featureId = hcState._terrainFocus;
      const item = hcSpec.terrainCompares.find((entry) => entry.id === featureId);
      ui.showGeoBoard(
        true,
        {
          title: "How do the lines sit?",
          lead: item?.prompt || "Stand on the slope. Then look at topo spacing.",
          status: hcState.lastHint,
          ok: hcState.terrainCompares.includes(featureId),
          groups: [
            {
              id: "spacing",
              label: "On the map",
              selected: (hcState.terrainChoices || {})[featureId],
              items: hcSpec.spacingChoices
            }
          ]
        },
        {
          onPick(_group, id) {
            const result = compareTerrain(hcState, hcSpec, featureId, id);
            takeEvidence(result);
            renderGeo();
            if (!result.ok) ui.showToast("Walk the land", result.hint);
          },
          onTry() {
            closeGeo();
          }
        }
      );
      return;
    }
    if (geoKind === "washout") {
      ui.showGeoBoard(
        true,
        {
          title: "Why did this bank fail?",
          lead: "Predict which trail sheds water faster after rain. Then look at the scar.",
          status: hcState.lastHint,
          ok: hcState.imageryCompared,
          groups: [
            {
              id: "slope",
              label: "Which slope sheds faster after rain?",
              selected: hcState.slopePredict,
              items: [
                { id: "west", label: "The west switchback" },
                { id: "east", label: "The east meadow trail" }
              ]
            }
          ],
          tryLabel: hcState.slopePredict ? "Compare with the ground" : "Lock prediction"
        },
        {
          onPick(_group, id) {
            predictWashoutSlope(hcState, id);
            renderGeo();
          },
          onTry() {
            if (!hcState.slopePredict) return;
            hcState.washoutSeen = true;
            const wash = hcRegion.props.find((prop) => prop.kind === "washout");
            const result = compareImagery(hcState, hcSpec, player, wash);
            takeEvidence(result);
            renderGeo();
            if (result.ok) ui.showToast("Washout", result.note || result.hint);
            else ui.showToast("Not yet", result.hint);
          }
        }
      );
      return;
    }
    if (geoKind === "routes") {
      ui.showGeoBoard(
        true,
        {
          title: "Which route?",
          lead: hcSpec.routes.goal,
          status: hcState.lastHint,
          ok: hcState.routeCompared,
          groups: [
            {
              id: "route",
              label: "Trail",
              selected: hcState.routeChoice,
              items: [
                { id: hcSpec.routes.a.id, label: hcSpec.routes.a.label },
                { id: hcSpec.routes.b.id, label: hcSpec.routes.b.label }
              ]
            },
            {
              id: "reason",
              label: "From the map",
              selected: hcState.routeReasons,
              items: hcSpec.routes.reasons
            }
          ]
        },
        {
          onPick(group, id) {
            if (group === "route") hcState.routeChoice = id;
            else {
              hcState.routeReasons = hcState.routeReasons.includes(id)
                ? hcState.routeReasons.filter((item) => item !== id)
                : [...hcState.routeReasons, id];
            }
            renderGeo();
          },
          onTry() {
            const result = compareRoutes(hcState, hcSpec, hcState.routeChoice, hcState.routeReasons);
            takeEvidence(result);
            renderGeo();
            if (result.ok) ui.showToast("Noted", "The longer trail asks less of a heavy case.");
          }
        }
      );
    } else if (geoKind === "contour") {
      ui.showGeoBoard(
        true,
        {
          title: "Uncharted basin",
          lead: "A 1400 m line should meet the stakes marked 1400 m. Interval 20 m.",
          status: hcState.contourHint,
          ok: hcState.contourOk,
          groups: [
            {
              id: "stakes",
              label: "Connect",
              selected: hcState.contourLine,
              items: hcSpec.stakes.map((stake) => ({ id: stake.id, label: `${stake.elev} m` }))
            }
          ]
        },
        {
          onPick(_group, id) {
            hcState.contourLine = hcState.contourLine.includes(id)
              ? hcState.contourLine.filter((item) => item !== id)
              : [...hcState.contourLine, id];
            renderGeo();
          },
          onTry() {
            const result = connectContour(hcState, hcSpec, hcState.contourLine);
            takeEvidence(result);
            renderGeo();
          }
        }
      );
    } else if (geoKind === "profile") {
      const generated = hcState.profileGenerated
        ? generateProfile(hcState, hcSpec, hcRegion, heightAt).profile
        : null;
      ui.showGeoBoard(
        true,
        {
          title: "What lies between?",
          lead: "From the ridge survey to the radio site. Guess the side view, then cut the profile.",
          status: hcState.profileMatch ? "Plan view is not the same as the walk." : hcState.lastHint,
          ok: hcState.profileMatch,
          tryLabel: hcState.profilePredict && !hcState.profileGenerated ? "Generate profile" : "Compare",
          profile: generated,
          profileCanvas: Boolean(generated),
          groups: [
            {
              id: "shape",
              label: "Your guess",
              selected: hcState.profilePredict,
              items: hcSpec.profile.shapes
            }
          ]
        },
        {
          onPick(_group, id) {
            predictProfile(hcState, hcSpec, id);
            renderGeo();
          },
          onTry() {
            if (!hcState.profilePredict) return;
            const result = generateProfile(hcState, hcSpec, hcRegion, heightAt);
            takeEvidence(result);
            hcState.lastHint = result.match
              ? "The rise, a small drop, then the last climb. Side view from plan view."
              : "The generated line is not a steady ramp. Look at the dip before the mast.";
            renderGeo();
          }
        }
      );
    } else if (geoKind === "gis") {
      ui.showGeoBoard(
        true,
        {
          title: "Observation pad",
          lead: hcSpec.gis.prompt,
          status: hcState.lastHint,
          ok: hcState.gisOk,
          groups: [
            {
              id: "site",
              label: "Candidate",
              selected: hcState.gisSite,
              items: hcSpec.gis.sites.map((site) => ({ id: site.id, label: site.label }))
            },
            {
              id: "layer",
              label: "Layers on the tablet",
              selected: hcState.mapState.layersOn,
              items: hcSpec.layers.filter((layer) => ["trails", "water", "elevation", "vegetation", "imagery"].includes(layer.id))
            }
          ]
        },
        {
          onPick(group, id) {
            if (group === "site") hcState.gisSite = id;
            else toggleMapLayer(hcState.mapState, id);
            renderGeo();
          },
          onTry() {
            const result = pickGisSite(hcState, hcSpec, hcState.gisSite);
            takeEvidence(result);
            if (result.ok) inspectLayerType(hcState, hcSpec, "trails");
            takeEvidence(inspectLayerType(hcState, hcSpec, "imagery"));
            renderGeo();
          }
        }
      );
    } else if (geoKind === "challenge") {
      ui.showGeoBoard(
        true,
        {
          title: hcSpec.challenge.title,
          lead: hcSpec.challenge.prompt,
          status: hcState.lastHint,
          ok: hcState.challengeOk,
          groups: [
            {
              id: "route",
              label: "Route",
              selected: hcState.challengeRoute,
              items: hcSpec.challenge.routes.map((route) => ({ id: route.id, label: route.label }))
            },
            {
              id: "reason",
              label: "Evidence",
              selected: hcState.challengeReasons,
              items: hcSpec.challenge.reasons
            }
          ]
        },
        {
          onPick(group, id) {
            if (group === "route") hcState.challengeRoute = id;
            else {
              hcState.challengeReasons = hcState.challengeReasons.includes(id)
                ? hcState.challengeReasons.filter((item) => item !== id)
                : [...hcState.challengeReasons, id];
            }
            renderGeo();
          },
          onTry() {
            const result = planChallengeRoute(hcState, hcSpec, hcState.challengeRoute, hcState.challengeReasons);
            takeEvidence(result);
            if (result.ok) presentHcChallenge(hcState);
            renderGeo();
            if (result.ok) ui.showToast("Field plan", "A route you can defend.");
          }
        }
      );
    }
  }

  function sfCurrentTarget() {
    const hit = sfInspectTarget(sfSpec, sfCatalog, sfRegion, player, sfState);
    const rangerNear = nearRanger(sfRegion, player.x, player.y);
    const rangerD = Math.hypot(player.x - sfRegion.ranger.x, player.y - sfRegion.ranger.y);
    if (rangerNear && (!hit || rangerD <= 70)) {
      return { kind: "wren", x: sfRegion.ranger.x, y: sfRegion.ranger.y, name: "Ranger Wren" };
    }
    if (!hit) return null;
    return { ...hit, name: hit.spec?.name || hit.item?.name || hit.kind };
  }

  function inspectSf(target) {
    if (!target || inspectLock) return;
    if (target.kind === "wren") {
      talkSfWren();
      return;
    }
    if (target.kind === "gnomon") {
      inspectLock = true;
      const sky = liveSky(sfState, sfRegion, player);
      showDialogueLines(
        "Solar marker",
        [`${sky.label}. Shadow ${sky.shadow.visible ? `${sky.shadow.length.toFixed(2)} m toward ${sky.shadow.directionDeg.toFixed(0)}°` : "is gone — wait for the Sun."}`],
        0,
        () => {
          const skyNow = liveSky(sfState, sfRegion, player);
          let result = recordShadow(sfState, sfSpec, sfRegion, player);
          if (skyNow.timeName === "noon" && sfState.rotationExplain === "earth-rotates") {
            const season = recordSeasonNoon(sfState, sfSpec, sfRegion, player);
            if (season.ok) result = season;
          }
          inspectLock = false;
          dialogue = null;
          ui.showDialogue(false);
          takeEvidence(result);
          if (result.ok && result.row?.slot) {
            ui.showToast("Shadow log", `${result.row.slot}: ${result.row.length} m ${result.row.direction}`);
            if (sfState.shadows.length >= 3 && sfState.rotationExplain !== "earth-rotates") openGeo("shadow");
          } else if (result.ok && result.row?.season) {
            ui.showToast("Noon Sun", `${result.row.season}: ${result.row.altitude}°`);
            if (sfState.seasonObs.length >= 3) openGeo("seasons");
          } else if (result.hint) ui.showToast("Not yet", result.hint);
        },
        sky.timeName === "noon" && sfState.rotationExplain === "earth-rotates" ? "Record noon" : "Record shadow"
      );
      if (sky.timeName === "noon" && sfState.rotationExplain === "earth-rotates") {
        // also allow season record via Try — handled in dialogue action by checking after
      }
      return;
    }
    if (target.kind === "moon-site") {
      if (!sfState.moonGeometry || !sfState.pendingMoon) {
        openGeo("moon");
        return;
      }
      inspectLock = true;
      showDialogueLines("Night-sky viewpoint", [sfSpec.moonSite.prompt], 0, () => {
        const result = recordMoon(sfState, sfSpec, sfRegion, player);
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
        if (result.ok) {
          ui.showToast("Sky log", result.row.name);
          if (sfState.moonLog.length >= 2) ui.showToast("Sky log", result.row.name);
        } else if (result.hint) ui.showToast("Not yet", result.hint);
      }, "Log the Moon");
      return;
    }
    if (target.kind === "orbit-board") {
      openGeo(sfState.orbit.measured ? "kepler" : "orbit");
      return;
    }
    if (target.kind === "tide-desk") {
      openGeo("tides");
      return;
    }
    if (target.kind === "planet-desk") {
      openGeo("planets");
      return;
    }
    if (target.kind === "eclipse-desk") {
      openGeo("eclipse");
      return;
    }
    if (target.kind === "sf-site") {
      const result = visitChallengeSite(sfState, sfSpec, player);
      inspectLock = true;
      const live = formatLatLon(worldToLatLon(sfRegion, player.x, player.y), 4);
      showDialogueLines("Coordinate pair", [`Live reading ${live}.`], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        persist();
        if (result.ok) ui.showToast("On station", result.site.label);
      }, "Record this pair");
      return;
    }
    if (target.kind === "compare-sample") {
      sfState.compareSampleSeen = true;
      inspectLock = true;
      showDialogueLines("Drawer sample", [sfSpec.compareSample.text], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        if (sfState.foundIds.includes("sf-dark-rock")) {
          const named = identifyFind(sfState, "sf-dark-rock");
          if (named.ok) ui.showToast("Comparison", "The dark rock matches the drawer sample.");
        }
        persist();
        refreshJournal();
      });
      return;
    }
    if (target.kind === "discovery") {
      addSfFind(sfState, target.id);
      const item = target.item;
      const named = sfState.identifiedIds.includes(item.id);
      inspectLock = true;
      showDialogueLines(named ? item.interpretedName || item.name : item.name, [named ? item.interpretedText || item.text : item.text], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        taught.inspect = true;
        persist();
        refreshJournal();
      });
      return;
    }
    if (target.kind === "feature") {
      inspectLock = true;
      showDialogueLines(target.spec.name, [`${target.spec.label || "Open land"}. The sky here is wide.`], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
      });
    }
  }

  function talkSfWren() {
    if (sfReadyForChallenge(sfState) && !sfState.challenge.ok) {
      showDialogueLines("Ranger Wren", sfSpec.wren.afterData, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openGeo("challenge");
      });
      return;
    }
    if (sfState.challenge.ok) {
      showDialogueLines("Ranger Wren", sfSpec.wren.afterSuccess, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    let lines = sfSpec.wren.idle;
    if (sfState.planets.classified) lines = sfSpec.wren.afterData;
    else if (sfState.tides.compared) lines = sfSpec.wren.afterData;
    else if (sfState.eclipse.understood) lines = sfSpec.wren.afterEclipse;
    else if (sfState.moonLog.length >= 4) lines = sfSpec.wren.afterMoon;
    else if (sfState.kepler.ok) lines = sfSpec.wren.afterOrbit;
    else if (sfState.seasonExplain === "tilt") lines = sfSpec.wren.afterSeasons;
    else if (sfState.rotationExplain === "earth-rotates") lines = sfSpec.wren.afterRotation;
    else if (sfState.shadows.length >= 3) lines = sfSpec.wren.afterShadows;
    showDialogueLines("Ranger Wren", lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
  }

  function hcCurrentTarget() {
    const hit = hcInspectTarget(hcSpec, hcCatalog, hcRegion, player, hcState);
    const rangerNear = nearRanger(hcRegion, player.x, player.y);
    const rangerD = Math.hypot(player.x - hcRegion.ranger.x, player.y - hcRegion.ranger.y);
    if (rangerNear && (!hit || rangerD <= 70)) {
      return { kind: "wren", x: hcRegion.ranger.x, y: hcRegion.ranger.y, name: "Ranger Wren" };
    }
    if (!hit) return null;
    return { ...hit, name: hit.spec?.name || hit.item?.name || hit.kind };
  }

  function inspectHc(target) {
    if (!target || inspectLock) return;
    if (target.kind === "wren") {
      talkHcWren();
      return;
    }
    if (target.kind === "cache") {
      inspectLock = true;
      const live = liveReading(hcRegion, player, 4);
      showDialogueLines("No signboard", [`Live reading ${live}. Match the cache pair.`], 0, () => {
        const result = recordCache(hcState, hcSpec, hcRegion, player);
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
        if (result.ok) ui.showToast("Cache", result.reading);
        else ui.showToast("Keep walking", result.hint);
      }, "Record if it matches");
      return;
    }
    if (target.kind === "marker") {
      inspectLock = true;
      const digits = markerPrecision(player, target.spec);
      const reading = liveReading(hcRegion, player, digits);
      showDialogueLines(
        target.spec.name,
        [
          `The tablet reads ${reading}. ${digits < 5 ? "Walk closer if you want a tighter pair of numbers." : "That is a tight pair of numbers."}`
        ],
        0,
        () => {
          const result = recordMarker(hcState, hcSpec, target.id, hcRegion, player);
          inspectLock = false;
          dialogue = null;
          ui.showDialogue(false);
          taught.inspect = true;
          takeEvidence(result);
          if (result.ok) ui.showToast(target.spec.name, result.reading);
        },
        "Record position"
      );
      return;
    }
    if (target.kind === "stake") {
      inspectLock = true;
      const result = collectStake(hcState, hcSpec, target.id, player);
      showDialogueLines("Elevation stake", [`The post is marked ${result.elev || "—"} m.`], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
        if (hcState.stakes.length >= 3 && !hcState.contourOk) openGeo("contour");
      });
      return;
    }
    if (target.kind === "terrain") {
      hcState._terrainFocus = target.id;
      openGeo("terrain");
      return;
    }
    if (target.kind === "washout") {
      openGeo("washout");
      return;
    }
    if (target.kind === "depth") {
      const result = recordDepth(hcState, hcSpec, target.id, player);
      inspectLock = true;
      showDialogueLines("Tarn depth", [`${result.depth ?? "—"} m on this transect.`], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        persist();
      });
      return;
    }
    if (target.kind === "gis-site") {
      openGeo("gis");
      return;
    }
    if (target.kind === "profile") {
      openGeo("profile");
      return;
    }
    if (target.kind === "discovery") {
      inspectLock = true;
      addHcFind(hcState, target.id);
      const item = target.item;
      showDialogueLines(item.name, [item.prompt, item.text], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        taught.inspect = true;
        persist();
        refreshJournal();
        ui.showToast("Noted", item.name);
      }, "Look closer");
    }
  }

  function talkHcWren() {
    if (!hcState.introSeen) {
      hcState.introSeen = true;
      persist();
      showDialogueLines("Ranger Wren", hcSpec.intro.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (recordedMarkerCount(hcState) >= 2 && !hcState.cacheFound) {
      showDialogueLines(
        "Ranger Wren",
        [`Spare cache is at ${cacheTarget(hcRegion, hcSpec)}. Walk until your live reading matches. No signboard.`],
        0,
        () => {
          dialogue = null;
          ui.showDialogue(false);
        }
      );
      return;
    }
    if (hcState.cacheFound && (hcState.scaleEstimates || []).filter((row) => row.ok).length < 2) {
      ui.showDialogue(true, "Ranger Wren", hcSpec.wren.afterMarkers[0], [
        {
          label: "Use the scale bar",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openGeo("scale");
          }
        },
        {
          label: "Keep walking",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if ((hcState.scaleEstimates || []).filter((row) => row.ok).length >= 2 && !hcState.routeCompared) {
      openGeo("routes");
      return;
    }
    if (hcState.routeCompared && hcState.terrainCompares.length < 2) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterRoutes, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (hcState.contourOk && !hcState.profileMatch) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterContours, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openGeo("profile");
      });
      return;
    }
    if (hcState.profileMatch && !hcState.gisOk) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterProfile, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openGeo("gis");
      });
      return;
    }
    if (hcState.gisOk && !hcState.imageryCompared) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterGis, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openGeo("washout");
      });
      return;
    }
    if (hcReadyForChallenge(hcState) && !hcState.challengeOk) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterImagery, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openGeo("challenge");
      });
      return;
    }
    if (hcState.challengeOk) {
      showDialogueLines("Ranger Wren", hcSpec.wren.afterSuccess, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    showDialogueLines("Ranger Wren", hcSpec.wren.idle, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
  }

  function dsCurrentTarget() {
    const ranger = dsRegion.ranger;
    const rangerD = Math.hypot(player.x - ranger.x, player.y - ranger.y);
    const rangerNear = rangerD < ranger.greetRadius;
    const options = [];
    for (const feat of dsRegion.features || []) {
      const d = Math.hypot(player.x - feat.x, player.y - feat.y);
      if (d <= (feat.radius || 70)) {
        options.push({ kind: feat.kind, item: feat, x: feat.x, y: feat.y, d, name: feat.name });
      }
    }
    options.sort((a, b) => a.d - b.d);
    const closest = options[0] || null;
    if (rangerNear && (!closest || rangerD <= closest.d + 8)) {
      return { kind: "wren", x: ranger.x, y: ranger.y, name: "Ranger Wren" };
    }
    return closest;
  }

  function talkDsWren() {
    const use = completePuzzleUse(dsState, ds01Complete(dsState), ds02Complete(dsState));
    if (!dsState.introSeen) {
      dsState.introSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.intro.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds01Complete(dsState) && !dsState.emberRadioSeen) {
      dsState.emberRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterTwins.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds02Complete(dsState) && !dsState.cairnRadioSeen) {
      dsState.cairnRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterEmber.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds03Complete(dsState) && !dsState.plotRadioSeen) {
      dsState.plotRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterCairns.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds05Complete(dsState) && !dsState.floorRadioSeen) {
      dsState.floorRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterMass.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds07Complete(dsState) && !dsState.originRadioSeen) {
      dsState.originRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterShift.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (ds09Complete(dsState) && !dsState.envelopeRadioSeen) {
      dsState.envelopeRadioSeen = true;
      persist();
      showDialogueLines("Ranger Wren", dsSpec.afterLookback.lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (dsAarEligible(dsState, use["DS-01"], use["DS-02"]) && dsState.aar?.result !== "clearance") {
      ui.showDialogue(true, "Ranger Wren", dsAarSpec.open, [
        {
          label: "Make the case",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openAar();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (dsState.aar?.result === "more-evidence") {
      showDialogueLines("Ranger Wren", dsState.aar.remediation.length ? dsState.aar.remediation : [dsAarSpec.moreEvidence.lead], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    showDialogueLines("Ranger Wren", dsSpec.idle, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
  }

  function dsInspectPrompt(kind) {
    if (kind === "eyepiece") {
      if (ds07Complete(dsState) && !ds09Complete(dsState)) {
        return dsState.laterTonight ? "Look again — nearby vs distant · E" : "Watch the nearby star · E";
      }
      return "Look through the eyepiece · E";
    }
    if (kind === "plate-desk") {
      if (ds06Complete(dsState) && !ds07Complete(dsState)) return "Galaxy plates are on this desk · E";
      if (ds09Complete(dsState) && !ds10Complete(dsState)) {
        return dsState.envelopeSeen ? "Write a bounded claim · E" : "The unlabeled envelope waits on the spectrograph";
      }
      if (dsState.logRead) return "The inherited log is already noted";
      return "Read the inherited log · E";
    }
    if (kind === "spectrograph") {
      if (!ds01Complete(dsState)) return "Compare the two white traces · E";
      if (!ds02Complete(dsState)) return "Mark the peaks · E";
      if (ds04Complete(dsState) && !ds05Complete(dsState)) return "Compare massive and sun-like plates · E";
      if (ds05Complete(dsState) && dsState.rockPicked && !ds06Complete(dsState)) return "Compare metal lines with the floor rock · E";
      if (ds06Complete(dsState) && !ds07Complete(dsState)) return "Compare rest pattern to galaxy plates · E";
      if (ds09Complete(dsState) && !ds10Complete(dsState)) return "Look at the unlabeled envelope · E";
      return "Use the plate spectrograph · E";
    }
    if (kind === "west-stake") {
      return ds03Complete(dsState) ? "West rim baseline is in the tablet" : "Compare season plates from this cairn · E";
    }
    if (kind === "east-stake") {
      return ds03Complete(dsState) ? "East rim baseline is in the tablet" : "Compare season plates from the far cairn · E";
    }
    if (kind === "plot-board") {
      if (ds06Complete(dsState) && !ds07Complete(dsState)) {
        return dsState.redshiftTried ? "Plot shift versus distance rank · E" : "Shift versus distance still needs a spectrograph comparison";
      }
      if (!ds03Complete(dsState)) return "Empty axes — measurements first";
      if (!ds04Complete(dsState)) return "Place measured stars on empty axes · E";
      return "Your unlabeled diagram is on this board";
    }
    if (kind === "burst-poster") {
      if (!ds07Complete(dsState)) return "Read the event poster · E";
      if (ds09Complete(dsState)) return "The poster is not tonight's news";
      return dsState.nearbyChanged ? "Refuse happening-now · E" : "Read the happening-now caption · E";
    }
    if (kind === "horn") {
      if (!ds07Complete(dsState)) return "The horn waits until expansion is in the tablet";
      if (ds08Complete(dsState)) return "Leftover sky is already in the tablet";
      return "Point the Quiet Floor horn · E";
    }
    return "Look closer · E";
  }

  function inspectDs(target) {
    if (!target) return;
    if (target.kind === "wren") {
      talkDsWren();
      return;
    }
    if (target.kind === "eyepiece") {
      openSkyEyepiece();
      return;
    }
    if (target.kind === "plate-desk") {
      if (ds06Complete(dsState) && !ds07Complete(dsState)) {
        showDialogueLines("Galaxy plates", [
          "Three galaxy plates on the desk. The spectrograph can compare them to a rest pattern you already know. Redshift is not a red-colored object."
        ], 0, () => {
          dialogue = null;
          ui.showDialogue(false);
        });
        return;
      }
      if (ds09Complete(dsState) && !ds10Complete(dsState)) {
        if (!dsState.envelopeSeen) {
          showDialogueLines("Unlabeled envelope", [
            "The envelope is unlabeled on purpose. Look at the light on the spectrograph first. Then come back and say what you can honestly claim."
          ], 0, () => {
            dialogue = null;
            ui.showDialogue(false);
          });
          return;
        }
        openEnvelope();
        return;
      }
      const result = readTwinsLog(dsState);
      persist();
      refreshJournal();
      showDialogueLines("Inherited field log", [
        "Two bright white stars. Logged as twins because they look the same through the eyepiece. The page treats that as identity."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        if (!result.already) ui.showToast("Noted", "Inherited log");
      });
      return;
    }
    if (target.kind === "lamp") {
      markVisited(dsState, "lamp");
      openLampBench();
      return;
    }
    if (target.kind === "spectrograph") {
      markVisited(dsState, "station");
      openDsSpectrograph();
      return;
    }
    if (target.kind === "plot-board") {
      if (ds06Complete(dsState) && !ds07Complete(dsState)) {
        openRedshiftPlotFromBoard();
        return;
      }
      openPlotBoard();
      return;
    }
    if (target.kind === "burst-poster") {
      readDistantPoster(dsState);
      persist();
      if (ds07Complete(dsState) && dsState.nearbyChanged) {
        renderLookback();
        return;
      }
      showDialogueLines("Event poster", [
        "DISTANT OUTBURST — HAPPENING NOW. The caption treats a far plate as tonight's news.",
        ds07Complete(dsState)
          ? "A nearby star can still change. Walk away from the dome, then look through the eyepiece again."
          : "The basin still has other light to record first."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        ui.showToast("Noted", "Poster");
      });
      return;
    }
    if (target.kind === "west-stake") {
      markVisited(dsState, "west");
      openRimPlates("west");
      return;
    }
    if (target.kind === "east-stake") {
      markVisited(dsState, "east");
      openRimPlates("east");
      return;
    }
    if (target.kind === "basin-rock") {
      openFloorRock();
      return;
    }
    if (target.kind === "horn") {
      openHorn();
      return;
    }
    if (target.kind === "quiet-floor") {
      markVisited(dsState, "floor");
      persist();
      showDialogueLines("Quiet Floor", [
        "Salt-pale pan. Almost no vegetation. Station lights fall away. A rock you can pick up. A horn you can point."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (target.kind === "glow-notch") {
      const noted = noteGlowLeak(dsState);
      persist();
      refreshJournal();
      showDialogueLines("Glow Notch", [
        "A dip in the west rim. Faint town glow leaks here. The basin floor stays darker — that is why the work happens down there, not on the rim of the leak."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        if (!noted.already) ui.showToast("Noted", "Why the basin is dark");
      });
      return;
    }
    if (target.kind === "picnic") {
      markVisited(dsState, "picnic");
      persist();
      showDialogueLines("East picnic table", [
        "A leftover table and a cold thermos. Optional rest. Nothing here is required for clearance."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (target.kind === "station") {
      markVisited(dsState, "station");
      showDialogueLines("North Rim Station", [
        "A small field observatory. Dim red windows. The basin drops away south. The sky is the rest of the room."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    const prop = (dsRegion.props || []).find((row) => row.kind === target.kind && row.inspect);
    if (prop?.inspect) {
      inspectProp(prop);
    }
  }

  function openSkyEyepiece() {
    markEyepieceSeen(dsState);
    skyEyeOpen = true;
    persist();
    renderSkyEyepiece();
  }

  function closeSkyEyepiece() {
    skyEyeOpen = false;
    ui.showSkyEyepiece(false);
    persist();
    refreshJournal();
  }

  function renderSkyEyepiece() {
    root.querySelector("#sky-later")?.remove();
    const later = Boolean(dsState.laterTonight);
    const allowed = eyepieceIds();
    ui.showSkyEyepiece(true, {
      title: "Dome eyepiece",
      lead: eyepieceLead(),
      targets: dsCatalog.targets
        .filter((star) => allowed.includes(star.id))
        .map((star) => {
          const vis = later && star.laterVisual ? star.laterVisual : star.visual;
          return {
            id: star.id,
            label: star.label,
            color: vis.color,
            size: vis.size,
            az: star.sky?.az ?? 0.5,
            alt: star.sky?.alt ?? 0.5,
            seen: (dsState.observedIds || []).includes(star.id)
          };
        }),
      status: eyepieceStatus()
    }, {
      onPick(id) {
        const result = observeTarget(dsState, id);
        persist();
        renderSkyEyepiece();
        if (!result.already) ui.showToast("Noted", catalogTarget(dsCatalog, id)?.label || "Star");
      },
      onClose: closeSkyEyepiece
    });
  }

  function eyepieceIds() {
    const ids = ["west-twin", "east-twin"];
    if (ds01Complete(dsState)) ids.push(EMBER_ID);
    if (ds02Complete(dsState)) ids.push("cairn-near", "cairn-far");
    if (ds07Complete(dsState)) ids.push("nearby-variable", "distant-burst");
    if (ds09Complete(dsState)) ids.push("envelope-x");
    return ids;
  }

  function eyepieceLead() {
    if (ds07Complete(dsState) && !ds09Complete(dsState)) {
      return dsState.laterTonight
        ? "You walked away and came back. Watch the nearby variable. The distant outburst is still the same plate."
        : "A nearby star can still change. A distant outburst on a poster is not live weather. Leave the dome, then look again.";
    }
    if (ds01Complete(dsState) && !ds02Complete(dsState)) {
      return "The two white targets still look alike. A reddish star sits off to one side.";
    }
    return "Two bright points. Both white. Both easy to treat as the same kind of object if you only look.";
  }

  function eyepieceStatus() {
    if (dsState.laterTonight && dsState.nearbyChanged) return "The nearby target dimmed. The distant one did not become tonight's news.";
    if (ds07Complete(dsState) && (dsState.observedIds || []).includes("nearby-variable") && !dsState.lookbackLeftStation) {
      return "The nearby star is logged. Time away from the dome is what makes lookback mean something.";
    }
    if (twinsObservationReady(dsState)) return "Both white targets looked bright and white.";
    return "Tap each bright white target.";
  }

  function openLampBench() {
    spectrumOpen = true;
    renderLampBench();
  }

  function renderLampBench() {
    const lamp = dsCatalog.lamp;
    ui.showSpectrum(true, {
      title: dsState.lampOn ? "Known light" : "Lamp Bench",
      lead: dsState.lampOn
        ? "The lamp looks simple. Its trace is not. Slide markers onto the two strongest spikes."
        : "A shielded lamp on a concrete pad, south of the dome wash. Turn it on, then inspect the light.",
      mode: "lamp",
      lampOn: dsState.lampOn,
      traces: dsState.lampOn ? [{ spec: lamp, color: "#fff1c8", label: "bench lamp", shiftNm: 0 }] : [],
      markers: (dsState.lampDraft || []).map((nm) => ({ nm, kind: "lamp" })),
      readout: dsState.lampOn ? "Shorter ←  wavelength  → longer" : "The lamp is off.",
      status: dsState.lastHint || (dsState.lampCalibrated ? "The spike pattern repeated." : ""),
      logLabel: "Log this pattern",
      closeLabel: "Back to the basin"
    }, {
      onToggleLamp() {
        setLampOn(dsState, !dsState.lampOn);
        persist();
        renderLampBench();
      },
      onCanvas(nm) {
        if (!dsState.lampOn) return;
        const marks = [...(dsState.lampDraft || []), nm].slice(-3);
        dsState.lampDraft = marks;
        persist();
        renderLampBench();
      },
      onLog() {
        const result = logLampCalibration(dsState, dsCatalog, dsState.lampDraft || [], true);
        persist();
        if (result.ok) {
          ui.showToast("Noted", "Bench lamp");
          closeSpectrum();
          refreshJournal();
        } else {
          renderLampBench();
        }
      },
      onClose: closeSpectrum
    });
  }

  function openDsSpectrograph() {
    const opened = openSpectrograph(dsState, true);
    persist();
    if (!opened.ok) {
      showDialogueLines("Plate spectrograph", [
        opened.washed
          ? "The traces are washed by the dome. A known light on the south pad would be a fair reference."
          : dsState.lastHint || "The plate spectrograph stays at North Rim Station."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    spectrumOpen = true;
    if (!ds01Complete(dsState)) renderTwinSpectrum();
    else if (!ds02Complete(dsState)) renderEmberSpectrum();
    else if (ds05Complete(dsState) && dsState.rockPicked && !ds06Complete(dsState)) renderMetalSpectrum();
    else if (ds04Complete(dsState) && !ds05Complete(dsState)) renderMassPlates();
    else if (ds06Complete(dsState) && !ds07Complete(dsState)) renderRedshiftSpectrum();
    else if (ds09Complete(dsState) && !ds10Complete(dsState)) renderEnvelopeSpectrum();
    else renderTwinSpectrum();
  }

  function renderTwinSpectrum() {
    const [west, east] = twinTargets(dsCatalog);
    const shift = dsState.stellarShiftNm || 0;
    ui.showSpectrum(true, {
      title: "Plate spectrograph",
      lead: "The lamp gave you a known pattern. See whether these two traces actually agree.",
      mode: "twins",
      traces: [
        { spec: west, color: "#d7e7ff", label: west.label, shiftNm: 0 },
        { spec: east, color: "#f3d2a8", label: east.label, shiftNm: shift }
      ],
      shift,
      markers: dsState.stellarMarks || [],
      readout: "Shorter ←  wavelength  → longer · appearance is not on this plate",
      status: dsState.lastHint || (dsState.stellarCompared ? "The traces did not match." : ""),
      logLabel: dsState.stellarCompared ? "Log the claim" : "Log the mismatch",
      closeLabel: "Back to the basin",
      showAlign: true
    }, {
      onShift(value) {
        tryStellarAlign(dsState, dsCatalog, Number(value));
        persist();
        renderTwinSpectrum();
      },
      onCanvas(nm) {
        markStellarFeature(dsState, nm, "diff");
        persist();
        renderTwinSpectrum();
      },
      onLog() {
        if (!dsState.stellarCompared) {
          const compared = logStellarCompare(dsState);
          persist();
          if (!compared.ok) {
            renderTwinSpectrum();
            return;
          }
        }
        const done = logTwinsConclusion(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Twins claim");
          closeSpectrum();
          refreshJournal();
          if (!dsState.emberRadioSeen) talkDsWren();
        } else {
          renderTwinSpectrum();
        }
      },
      onClose: closeSpectrum
    });
  }

  function renderEmberSpectrum() {
    const white = catalogTarget(dsCatalog, "west-twin");
    const ember = catalogTarget(dsCatalog, EMBER_ID);
    observeTarget(dsState, EMBER_ID);
    ui.showSpectrum(true, {
      title: "Plate spectrograph",
      lead: "The old notes call the reddish target an ember, like a coal. Mark the brightest place on each trace. Use the wavelength ticks, not the color you remember.",
      mode: "ember",
      traces: [
        { spec: white, color: "#d7e7ff", label: `${white.label} · peak mark`, shiftNm: 0 },
        { spec: ember, color: "#f09a68", label: `${ember.label} · peak mark`, shiftNm: 0 }
      ],
      markers: [
        dsState.whitePeakDraft != null ? { nm: dsState.whitePeakDraft, kind: "peak" } : null,
        dsState.emberPeakDraft != null ? { nm: dsState.emberPeakDraft, kind: "peak" } : null
      ].filter(Boolean),
      readout: "Peak position is a place on the axis, not a color name.",
      status: dsState.lastHint || "",
      logLabel: dsState.emberCompared ? "Log the claim" : "Log the peak marks",
      closeLabel: "Back to the basin",
      emberMark: dsState.emberPeakDraft,
      whiteMark: dsState.whitePeakDraft
    }, {
      onPeak(kind, nm) {
        if (kind === "ember") dsState.emberPeakDraft = nm;
        else dsState.whitePeakDraft = nm;
        persist();
        renderEmberSpectrum();
      },
      onLog() {
        if (!dsState.emberCompared) {
          const marked = logEmberPeaks(dsState, dsCatalog, dsState.emberPeakDraft, dsState.whitePeakDraft);
          persist();
          if (!marked.ok) {
            renderEmberSpectrum();
            return;
          }
        }
        const done = logEmberConclusion(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Ember claim");
          closeSpectrum();
          refreshJournal();
          maybeDsRadio();
        } else {
          renderEmberSpectrum();
        }
      },
      onClose: closeSpectrum
    });
  }

  function closeSpectrum() {
    spectrumOpen = false;
    ui.showSpectrum(false);
  }

  function closeDsBoard() {
    ui.showGeoBoard(false, {});
  }

  function maybeDsRadio() {
    if (ds02Complete(dsState) && !dsState.cairnRadioSeen) talkDsWren();
    else if (ds03Complete(dsState) && !dsState.plotRadioSeen) talkDsWren();
    else if (ds05Complete(dsState) && !dsState.floorRadioSeen) talkDsWren();
    else if (ds07Complete(dsState) && !dsState.originRadioSeen) talkDsWren();
    else if (ds09Complete(dsState) && !dsState.envelopeRadioSeen) talkDsWren();
  }

  function openRimPlates(rim) {
    if (ds02Complete(dsState) && !dsState.brightnessGuess) {
      ui.showDialogue(true, rim === "west" ? "West Rim Stake" : "East Rim Stake", "Two stars here look about equally bright. What is your first explanation?", [
        {
          label: "Same brightness, same distance",
          onClick: () => {
            logBrightnessGuess(dsState, "same-distance");
            persist();
            dialogue = null;
            ui.showDialogue(false);
            renderRimPlates(rim);
          }
        },
        {
          label: "I can still rank distance by eye",
          onClick: () => {
            logBrightnessGuess(dsState, "one-closer-by-eye");
            persist();
            dialogue = null;
            ui.showDialogue(false);
            renderRimPlates(rim);
          }
        }
      ]);
      return;
    }
    renderRimPlates(rim);
  }

  function renderRimPlates(rim) {
    viewRimPlate(dsState, rim);
    persist();
    const stars = plateStarLayout(dsCatalog, rim, dsState.plateSet);
    ui.showGeoBoard(true, {
      title: rim === "west" ? "West Rim Stake" : "East Rim Stake",
      lead: "Season plates from this cairn. Equal look is not the question. Which star reverses when you change plate and rim?",
      canvasKind: "plates",
      canvasLabel: "Season plates of two equally bright stars",
      canvasWidth: 420,
      canvasHeight: 200,
      rimLabel: rim === "west" ? "West rim" : "East rim",
      plateSet: dsState.plateSet,
      stars,
      status: dsState.lastHint || (dsState.cairnCompared ? "Only one star reversed with the baseline." : "Stand here. Switch plates. Then walk the other rim."),
      tryLabel: dsState.cairnCompared ? "Log the claim" : "Log the star that shifted",
      actionLabel: "Plates and which star shifted",
      actions: [
        { id: "plate-a", label: "Plate A", on: dsState.plateSet !== "B" },
        { id: "plate-b", label: "Plate B", on: dsState.plateSet === "B" },
        { id: CAIRN_NEAR, label: "Star 1 shifted", on: dsState.shiftStarId === CAIRN_NEAR },
        { id: "cairn-far", label: "Star 2 shifted", on: dsState.shiftStarId === "cairn-far" }
      ]
    }, {
      onAction(id) {
        if (id === "plate-a" || id === "plate-b") {
          setPlateSet(dsState, id === "plate-b" ? "B" : "A");
          persist();
          renderRimPlates(rim);
          return;
        }
        const marked = markShiftedStar(dsState, id);
        persist();
        if (!marked.ok) {
          renderRimPlates(rim);
          return;
        }
        renderRimPlates(rim);
      },
      onTry() {
        const done = logCairnClaim(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Cairn baseline");
          closeDsBoard();
          refreshJournal();
          maybeDsRadio();
        } else {
          renderRimPlates(rim);
        }
      },
      onClose: closeDsBoard
    });
  }

  function openPlotBoard() {
    if (!ds03Complete(dsState)) {
      showDialogueLines("Unlabeled plot", ["Empty axes. The board only takes stars you already measured — peaks and a distance rank."], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    renderPlotBoard();
  }

  function renderPlotBoard() {
    const west = catalogTarget(dsCatalog, "west-twin");
    const ember = catalogTarget(dsCatalog, EMBER_ID);
    const far = catalogTarget(dsCatalog, "cairn-far");
    const labels = { "west-twin": "hot white", "cooler-ember": "ember", "cairn-far": "far cairn" };
    const measurements = {
      "west-twin": west?.peakNm ? `peak ~${Math.round(west.peakNm)} nm` : "",
      "cooler-ember": ember?.peakNm ? `peak ~${Math.round(ember.peakNm)} nm` : "",
      "cairn-far": far?.distanceRank != null ? `farther rank ${far.distanceRank}` : "farther cairn"
    };
    ui.showGeoBoard(true, {
      title: "Unlabeled plot",
      lead: "No poster legend. These three already have numbers in your tablet. Place them where your notes say they belong.",
      canvasKind: "plot",
      canvasLabel: "Unlabeled temperature versus brightness plot",
      canvasWidth: 420,
      canvasHeight: 240,
      placements: dsState.plotPlacements || {},
      labels,
      measurements,
      groups: [
        {
          id: "star",
          label: "Star from your notes",
          selected: dsState.plotDraftId || "west-twin",
          items: [
            { id: "west-twin", label: `Hot white · ${measurements["west-twin"]}` },
            { id: "cooler-ember", label: `Cooler ember · ${measurements["cooler-ember"]}` },
            { id: "cairn-far", label: `Far cairn · ${measurements["cairn-far"]}` }
          ]
        }
      ],
      status: ds04Complete(dsState)
        ? "The pattern arrived after the points."
        : (dsState.lastHint || "Tap the board to place the selected star."),
      tryLabel: "Log the diagram"
    }, {
      onPick(_group, id) {
        dsState.plotDraftId = id;
        persist();
        renderPlotBoard();
      },
      onCanvas(x, y) {
        placePlotStar(dsState, dsState.plotDraftId || "west-twin", x, y);
        persist();
        renderPlotBoard();
      },
      onTry() {
        const done = logPlot(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Player-built diagram");
          closeDsBoard();
          refreshJournal();
        } else {
          renderPlotBoard();
        }
      },
      onClose: closeDsBoard
    });
  }

  function renderMassPlates() {
    const hot = catalogTarget(dsCatalog, "hot-mass");
    const sun = catalogTarget(dsCatalog, "sun-like");
    const remnant = catalogTarget(dsCatalog, "blue-remnant");
    ui.showSpectrum(true, {
      title: "Massive, sun-like, remnant",
      lead: "These are not vocabulary stages. Compare the peaks. If mass differs, the futures will not share one ending.",
      mode: "twins",
      traces: [
        { spec: hot, color: "#9ec7ff", label: `${hot.label} · ${hot.peakNm} nm`, shiftNm: 0 },
        { spec: sun, color: "#f3d2a8", label: `${sun.label} · ${sun.peakNm} nm`, shiftNm: 0 },
        { spec: remnant, color: "#c8b8e8", label: `${remnant.label} · ${remnant.peakNm} nm`, shiftNm: 0 }
      ],
      markers: [],
      readout: "Peak place is evidence. A cartoon lifecycle is not.",
      status: dsState.lastHint || "The remnant plate does not sit with the sun-like star.",
      logLabel: dsState.massPlatesSeen ? "Mark the branches" : "These peaks are not the same",
      closeLabel: "Back to the basin"
    }, {
      onLog() {
        markMassPlatesSeen(dsState);
        persist();
        closeSpectrum();
        renderMassSpectrum();
      },
      onClose: closeSpectrum
    });
  }

  function renderMassSpectrum() {
    const hot = catalogTarget(dsCatalog, "hot-mass");
    const sun = catalogTarget(dsCatalog, "sun-like");
    const remnant = catalogTarget(dsCatalog, "blue-remnant");
    ui.showGeoBoard(true, {
      title: "Not one life",
      lead: "You compared the plates. Massive and sun-like stars do not share a cartoon lifecycle. Mark both futures, then match the remnant.",
      groups: [
        {
          id: "hot",
          label: "Hot massive future",
          selected: dsState.massHot,
          items: [
            { id: "remnant", label: "Violent late stage, remnant" },
            { id: "same-life", label: "Same quiet ending as every star" }
          ]
        },
        {
          id: "sun",
          label: "Sun-like future",
          selected: dsState.massSun,
          items: [
            { id: "no-supernova", label: "Will not explode as a supernova" },
            { id: "supernova", label: "Every star goes supernova" }
          ]
        },
        {
          id: "remnant",
          label: "Which plate matches the massive branch?",
          selected: dsState.remnantPick,
          items: [
            { id: "blue-remnant", label: "Outburst remnant" },
            { id: "sun-like", label: "Still the sun-like star" }
          ]
        }
      ],
      table: {
        columns: ["Plate", "Peak (nm)"],
        rows: [
          [hot.label, String(hot.peakNm)],
          [sun.label, String(sun.peakNm)],
          [remnant.label, String(remnant.peakNm)]
        ]
      },
      status: dsState.lastHint || "",
      tryLabel: "Log the branch"
    }, {
      onPick(group, id) {
        if (group === "hot" || group === "sun") pickMassBranch(dsState, group, id);
        if (group === "remnant") checkRemnant(dsState, id);
        persist();
        renderMassSpectrum();
      },
      onTry() {
        const done = logMassClaim(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Mass branches lives");
          closeDsBoard();
          refreshJournal();
          maybeDsRadio();
        } else {
          renderMassSpectrum();
        }
      },
      onClose: closeDsBoard
    });
  }

  function openFloorRock() {
    const result = pickUpRock(dsState, true);
    persist();
    showDialogueLines("Basin floor rock", [
      "A pale silicate you can pick up. Ordinary stone, sitting on the quiet pan, with a history that did not start in this hollow."
    ], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      if (result.ok) ui.showToast("In hand", "Floor rock");
      refreshJournal();
    });
  }

  function renderMetalSpectrum() {
    const poor = catalogTarget(dsCatalog, "metal-poor");
    const rich = catalogTarget(dsCatalog, "metal-rich");
    ui.showSpectrum(true, {
      title: "Metal lines and floor rock",
      lead: "The stone is in hand. Mark a metal feature that is strong in one stellar trace and nearly missing in the other. Not a periodic-table quiz.",
      mode: "twins",
      traces: [
        { spec: poor, color: "#d7e7ff", label: poor.label, shiftNm: 0 },
        { spec: rich, color: "#f3d2a8", label: rich.label, shiftNm: 0 }
      ],
      markers: dsState.metalMarkNm != null ? [{ nm: dsState.metalMarkNm, kind: "diff" }] : [],
      readout: "Hydrogen lines can be shared. Metals are not equally present.",
      status: dsState.lastHint || "",
      logLabel: dsState.metalCompared ? "Log the material claim" : "Log the missing metal line",
      closeLabel: "Back to the basin",
      toolChips: {
      selected: dsState.nucleoDraft || dsState.nucleoClaim,
        items: [
          { id: "heavy-from-stars", label: "Heavier metals needed stars" },
          { id: "all-in-stars", label: "Everything was made in stars" },
          { id: "all-at-start", label: "All metals were here at the start" }
        ]
      }
    }, {
      onCanvas(nm) {
        dsState.metalMarkNm = nm;
        persist();
        renderMetalSpectrum();
      },
      onTool(id) {
        dsState.nucleoDraft = id;
        persist();
        renderMetalSpectrum();
      },
      onLog() {
        if (!dsState.metalCompared) {
          const compared = logMetalCompare(dsState, dsState.metalMarkNm);
          persist();
          if (!compared.ok) {
            renderMetalSpectrum();
            return;
          }
        }
        const done = logNucleosynthesis(dsState, dsState.nucleoDraft || dsState.nucleoClaim);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Floor rock");
          closeSpectrum();
          refreshJournal();
        } else {
          renderMetalSpectrum();
        }
      },
      onClose: closeSpectrum
    });
  }

  function openRedshiftDesk() {
    renderRedshiftSpectrum();
  }

  function openRedshiftPlotFromBoard() {
    if (!dsState.redshiftTried) {
      showDialogueLines("Unlabeled plot", [
        "This board can hold shift versus distance rank. Compare a known rest pattern to the galaxy plates on the spectrograph first."
      ], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    renderRedshiftPlot();
  }

  function renderRedshiftSpectrum() {
    dsState.redshiftTried = true;
    persist();
    const gal = catalogTarget(dsCatalog, dsState.redshiftGalaxyId || "galaxy-far");
    const rest = { peakNm: 520, lines: (gal?.restLines || [486, 656]).map((nm) => ({ nm, depth: 0.7 })) };
    ui.showSpectrum(true, {
      title: "Galaxy plates",
      lead: "Same rest pattern you already used at Lamp Bench and on the twins plates. See whether the whole pattern has slid. Redshift is not a red-colored object.",
      mode: "twins",
      showAlign: true,
      shift: dsState.redshiftShiftNm || 0,
      traces: [
        { spec: rest, color: "#d7e7ff", label: "lab rest", shiftNm: 0 },
        { spec: gal, color: "#c8b8e8", label: gal.label, shiftNm: 0 }
      ],
      markers: (gal.restLines || []).map((nm) => ({ nm: nm + (dsState.redshiftShiftNm || 0), kind: "diff" })),
      readout: "Shorter ←  wavelength  → longer · color is not this slide",
      status: dsState.lastHint || "",
      logLabel: "The pattern moved",
      closeLabel: "Back to the basin",
      toolChips: {
        selected: dsState.redshiftGalaxyId || "galaxy-far",
        items: GALAXY_IDS.map((id) => ({ id, label: catalogTarget(dsCatalog, id).label }))
      }
    }, {
      onShift(value) {
        tryGalaxyAlign(dsState, dsCatalog, dsState.redshiftGalaxyId || "galaxy-far", Number(value));
        persist();
        renderRedshiftSpectrum();
      },
      onTool(id) {
        dsState.redshiftGalaxyId = id;
        persist();
        renderRedshiftSpectrum();
      },
      onLog() {
        closeSpectrum();
        ui.showToast("Moved pattern", "The unlabeled board can hold shift versus distance rank.");
      },
      onClose: closeSpectrum
    });
  }

  function renderRedshiftPlot() {
    ui.showGeoBoard(true, {
      title: "Shift versus distance rank",
      lead: "Place the three plates from the spectrograph comparison. Then reject the story that every plate shifts the same amount.",
      canvasKind: "redshift",
      canvasLabel: "Line-pattern shift versus distance rank",
      canvasWidth: 420,
      canvasHeight: 220,
      points: dsState.redshiftPoints || {},
      labels: Object.fromEntries(GALAXY_IDS.map((id) => [id, catalogTarget(dsCatalog, id).label])),
      groups: [
        {
          id: "galaxy",
          label: "Plate to place",
          selected: dsState.redshiftGalaxyId || "galaxy-far",
          items: GALAXY_IDS.map((id) => ({ id, label: catalogTarget(dsCatalog, id).label }))
        },
        {
          id: "story",
          label: "Which competing story fails the farthest plate?",
          selected: dsState.competingRejected ? "all-same" : null,
          items: [
            { id: "all-same", label: "Every plate shifts the same" },
            { id: "red-color", label: "They look red, so they recede" }
          ]
        }
      ],
      status: dsState.lastHint || "",
      tryLabel: "Log the trend"
    }, {
      onPick(group, id) {
        if (group === "galaxy") dsState.redshiftGalaxyId = id;
        if (group === "story") rejectCompeting(dsState, id);
        persist();
        renderRedshiftPlot();
      },
      onCanvas(x, y) {
        placeRedshiftPoint(dsState, dsState.redshiftGalaxyId || "galaxy-far", x, y);
        persist();
        renderRedshiftPlot();
      },
      onTry() {
        if (!dsState.redshiftTrend) {
          const trend = logRedshiftTrend(dsState, dsCatalog);
          persist();
          if (!trend.ok) {
            renderRedshiftPlot();
            return;
          }
        }
        if (!dsState.competingRejected) {
          dsState.lastHint = "Reject the story that every plate shifts the same amount.";
          persist();
          renderRedshiftPlot();
          return;
        }
        ui.showToast("Noted", "Moved lines");
        closeDsBoard();
        refreshJournal();
        maybeDsRadio();
      },
      onClose: closeDsBoard
    });
  }

  function openHorn() {
    if (!ds07Complete(dsState)) {
      showDialogueLines("Quiet Floor horn", ["A coarse radio horn. Point it later, when expansion and abundance are already in the tablet."], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    renderHorn();
  }

  function renderHorn() {
    const ready = originEvidenceReady(dsState);
    ui.showGeoBoard(true, {
      title: "Quiet Floor horn",
      lead: "Station wall is noisy. Overhead is quieter. This horn only adds leftover sky. Expansion and abundance have to already be in the tablet.",
      canvasKind: "horn",
      canvasLabel: "Horn pointing: zenith, wall, horizon",
      canvasWidth: 420,
      canvasHeight: 180,
      hornPoint: dsState.hornPoint,
      actionLabel: "Point the horn",
      actions: [
        { id: "zenith", label: "Point zenith", on: dsState.hornPoint === "zenith" },
        { id: "wall", label: "Point wall", on: dsState.hornPoint === "wall" },
        { id: "horizon", label: "Point horizon", on: dsState.hornPoint === "horizon" }
      ],
      table: {
        columns: ["Evidence", "Status"],
        rows: [
          ["Galaxy shifts / expansion", ready.expansion ? "Already in the tablet" : "Still missing"],
          ["Floor-rock metals", ready.abundance ? "Already in the tablet" : "Still missing"],
          ["Quiet leftover sky", ready.leftover ? "Horn found it overhead" : "Point wall, then zenith"]
        ]
      },
      status: dsState.lastHint || "",
      tryLabel: "Log the case"
    }, {
      onAction(id) {
        pointHorn(dsState, id, true);
        persist();
        renderHorn();
      },
      onPick() {
        persist();
        renderHorn();
      },
      onTry() {
        const done = logOriginCase(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Three lines");
          closeDsBoard();
          refreshJournal();
        } else {
          renderHorn();
        }
      },
      onClose: closeDsBoard
    });
  }

  function openLookback() {
    renderLookback();
  }

  function renderLookback() {
    ui.showGeoBoard(true, {
      title: "Not tonight",
      lead: "The poster said happening now. You watched a nearby star, left the dome, and looked again. Nearby light can still change. Distant light already left.",
      groups: [
        {
          id: "claim",
          label: "What can you claim about the distant outburst?",
          selected: dsState.lookbackClaim,
          items: [
            { id: "earlier-light", label: "We see earlier light, not now" },
            { id: "happening-now", label: "It is happening now" }
          ]
        }
      ],
      status: dsState.lastHint || (dsState.nearbyChanged && dsState.distantPosterSeen ? "Nearby changed after you left the station. Distant plate did not." : "Read the poster, watch the nearby star, then leave the dome and look again."),
      tryLabel: "Log the lookback"
    }, {
      onPick(_group, id) {
        dsState.lookbackDraft = id;
        persist();
        renderLookback();
      },
      onTry() {
        const done = logLookback(dsState, dsState.lookbackDraft || dsState.lookbackClaim);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Lookback");
          closeDsBoard();
          refreshJournal();
          maybeDsRadio();
        } else {
          renderLookback();
        }
      },
      onClose: closeDsBoard
    });
  }

  function renderEnvelopeSpectrum() {
    const env = catalogTarget(dsCatalog, "envelope-x");
    const white = catalogTarget(dsCatalog, "west-twin");
    markEnvelopeSeen(dsState);
    persist();
    ui.showSpectrum(true, {
      title: "Unlabeled envelope",
      lead: "No catalog name. Record what the light shows. Do not fill in a story.",
      mode: "ember",
      traces: [
        { spec: white, color: "#d7e7ff", label: `${white.label} · already marked`, shiftNm: 0 },
        { spec: env, color: "#e8c48a", label: "Unlabeled envelope", shiftNm: 0 }
      ],
      markers: dsState.whitePeakMark != null ? [{ nm: dsState.whitePeakMark, kind: "peak" }] : [],
      readout: "Observed first. Inference second. Present tense is not on this plate.",
      status: dsState.lastHint || "The envelope has a peak and a shape. It does not name itself.",
      logLabel: "Write a bounded claim",
      closeLabel: "Back to the basin",
      emberMark: env?.peakNm,
      whiteMark: dsState.whitePeakMark
    }, {
      onLog() {
        closeSpectrum();
        openEnvelope();
      },
      onClose: closeSpectrum
    });
  }

  function openEnvelope() {
    renderEnvelope();
  }

  function renderEnvelope() {
    ui.showGeoBoard(true, {
      title: "Unlabeled envelope",
      lead: "You looked at the unlabeled trace. Finish the case: what the light showed, what you can infer, what stays unknown, and one sentence you refuse.",
      groups: [
        {
          id: "observed",
          label: "Directly observed",
          selected: dsState.envelopeObserved || [],
          items: [
            { id: "spectrum-shape", label: "The trace structure" },
            { id: "peak-place", label: "Where the peak sits" },
            { id: "happening-now", label: "It is happening now" },
            { id: "famous-name", label: "A famous catalog name" }
          ]
        },
        {
          id: "inferred",
          label: "Can be inferred",
          selected: dsState.envelopeInferred || [],
          items: [
            { id: "not-hotter", label: "Not hotter than the marked white star" },
            { id: "happening-now", label: "Live weather at the source" }
          ]
        },
        {
          id: "unknown",
          label: "Still unknown",
          selected: dsState.envelopeUnknown || [],
          items: [
            { id: "distance", label: "Distance" },
            { id: "present-state", label: "What is happening there now" }
          ]
        },
        {
          id: "refuse",
          label: "Refuse to claim",
          selected: dsState.envelopeRefused || [],
          items: [
            { id: "happening-now", label: "Happening now" },
            { id: "famous-name", label: "A famous name" },
            { id: "exact-kelvin", label: "An exact kelvin temperature" }
          ]
        }
      ],
      status: dsState.lastHint || "",
      tryLabel: "Log the bounded case"
    }, {
      onPick(group, id) {
        toggleEnvelope(dsState, group, id);
        persist();
        renderEnvelope();
      },
      onTry() {
        const done = logEnvelope(dsState);
        persist();
        if (done.ok) {
          ui.showToast("Noted", "Bounded claims");
          closeDsBoard();
          refreshJournal();
          maybeDsRadio();
        } else {
          renderEnvelope();
        }
      },
      onClose: closeDsBoard
    });
  }

  function currentTarget() {
    if (isDarkSky()) return dsCurrentTarget();
    if (isHighCountry()) return hcCurrentTarget();
    if (isSunfall()) return sfCurrentTarget();
    const disc = nearestDiscovery(catalog, player.x, player.y);
    const feat = nearestInspectable(world, player.x, player.y, 90);
    const prop = nearestStoryProp(region, player.x, player.y);
    const rangerNear = nearRanger(region, player.x, player.y);
    const rangerD = Math.hypot(player.x - region.ranger.x, player.y - region.ranger.y);
    const options = [];
    const rank = { challenge: 0, flume: 1, discovery: 2, feature: 3, prop: 4 };
    if (challengeState.active) {
      const site = nearestChallengeSite(challengeSpec, player.x, player.y, 72);
      if (site) {
        options.push({
          kind: "challenge",
          item: site,
          x: site.x,
          y: site.y,
          d: Math.hypot(player.x - site.x, player.y - site.y),
          name: site.name
        });
      }
    }
    const table = (region.props || []).find((item) => item.kind === "runoff-table");
    if (table) {
      const d = Math.hypot(player.x - table.x, player.y - table.y);
      if (d < 56) options.push({ kind: "flume", item: table, x: table.x, y: table.y, d, name: "Runoff table" });
    }
    if (disc) options.push({ kind: "discovery", item: disc, x: disc.x, y: disc.y, d: Math.hypot(player.x - disc.x, player.y - disc.y), name: displayName(disc, invState.interpreted) });
    if (feat) options.push({ kind: "feature", item: feat, x: feat.x, y: feat.y, d: Math.hypot(player.x - feat.x, player.y - feat.y), name: feat.name });
    if (prop && prop.kind !== "runoff-table") {
      options.push({ kind: "prop", item: prop, x: prop.x, y: prop.y, d: Math.hypot(player.x - prop.x, player.y - prop.y), name: prop.inspect.title });
    }
    options.sort((a, b) => a.d - b.d || (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9));
    const closest = options[0] || null;
    if (rangerNear && (!closest || rangerD <= closest.d + 8)) {
      return { kind: "wren", x: region.ranger.x, y: region.ranger.y, name: "Ranger Wren" };
    }
    return closest;
  }

  function inspectTarget(target) {
    if (!target) return;
    if (Math.abs(target.x - player.x) > 6) player.facing = target.x >= player.x ? 1 : -1;
    const towardX = target.x - player.x;
    const towardY = target.y - player.y;
    const reach = Math.hypot(towardX, towardY);
    if (reach > 18 && reach < 90) {
      const step = Math.min(10, reach - 16);
      player.x += (towardX / reach) * step;
      player.y += (towardY / reach) * step;
    }
    if (target.kind === "wren") setPose("talk");
    else if (target.kind === "gnomon" || target.kind === "moon-site" || target.kind === "eyepiece") setPose("sky");
    else if (target.kind === "flume" || target.kind === "marker" || target.kind === "stake" || target.kind === "lamp" || target.kind === "west-stake" || target.kind === "east-stake" || target.kind === "horn") setPose("measure");
    else if (target.kind === "orbit-board" || target.kind === "tide-desk" || target.kind === "planet-desk" || target.kind === "eclipse-desk" || target.kind === "spectrograph" || target.kind === "plate-desk" || target.kind === "plot-board") {
      setPose("tablet");
    } else setPose("inspect");
    if (isDarkSky()) {
      inspectDs(target);
      return;
    }
    if (isHighCountry()) {
      inspectHc(target);
      return;
    }
    if (isSunfall()) {
      inspectSf(target);
      return;
    }
    if (target.kind === "wren") talkToWren();
    else if (target.kind === "discovery") inspectDiscovery(target.item);
    else if (target.kind === "prop") inspectProp(target.item);
    else if (target.kind === "flume") openFlume();
    else if (target.kind === "challenge") inspectChallenge(target.item);
    else inspectFeature(target.item);
  }

  function talkToWren() {
    if (isDarkSky()) {
      talkDsWren();
      return;
    }
    if (isHighCountry()) {
      talkHcWren();
      return;
    }
    if (isSunfall()) {
      talkSfWren();
      return;
    }
    const ready = canPresentFindings(missionState, mission);
    const done = missionState.concluded;
    if (!missionState.introSeen) {
      openIntro();
      return;
    }
    if (ready && !done) {
      ui.showDialogue(true, "Ranger Wren", "You've got mud on your boots and notes in the tablet. Trace the water with me.", [
        {
          label: "Trace the path",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openConclusion();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    const pendingAck = discoveryState.foundIds.find(
      (id) => !discoveryState.acknowledgedIds.includes(id)
    );
    if (pendingAck) {
      const lines = pickWrenLines(catalog, discoveryState, ready, done);
      showDialogueLines("Ranger Wren", lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (challengeState.concluded && !invState.concluded && shouldIntroduceInvestigation(invState, discoveryState, done)) {
      showDialogueLines("Ranger Wren", investigation.intro.lines, 0, () => {
        beginInvestigation(invState, investigation, discoveryState);
        dialogue = null;
        ui.showDialogue(false);
        persist();
        refreshJournal();
      });
      return;
    }
    if (canProposeExplanation(investigation, invState) && !invState.concluded) {
      ui.showDialogue(true, "Ranger Wren", investigation.wren.ready[0], [
        {
          label: "Build an explanation",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openHypothesis();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (invState.active && !invState.concluded) {
      const lines = pickLandscapeWren(investigation, invState, discoveryState);
      showDialogueLines("Ranger Wren", lines, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (invState.concluded && !flumeState.introSeen) {
      showDialogueLines("Ranger Wren", flumeSpec.intro.lines, 0, () => {
        flumeState.introSeen = true;
        flumeState.active = true;
        dialogue = null;
        ui.showDialogue(false);
        persist();
        openFlume();
      });
      return;
    }
    if (hasFairComparison(flumeState, flumeSpec) && !dataState.datasets["cedar-hollow-flow"]?.interpreted) {
      ui.showDialogue(true, "Ranger Wren", flumeSpec.wren.afterFair[0], [
        {
          label: "Look at the numbers",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openInterpret();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (readyForChallenge() && !challengeState.introSeen) {
      showDialogueLines("Ranger Wren", challengeSpec.intro.lines, 0, () => {
        challengeState.introSeen = true;
        challengeState.active = true;
        dialogue = null;
        ui.showDialogue(false);
        persist();
      });
      return;
    }
    if (challengeState.active && !challengeState.concluded && canProposeChallenge(challengeState, challengeSpec)) {
      ui.showDialogue(true, "Ranger Wren", "You've walked enough of the creek to try an explanation.", [
        {
          label: "Build an explanation",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openClearance();
          }
        },
        {
          label: "Keep looking",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (challengeState.concluded && !puzzleState.systems.concluded) {
      ui.showDialogue(true, "Ranger Wren", "Last night wasn't four separate stories. Map it on the hollow — or walk the places that took part.", [
        {
          label: "Map the hollow",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            puzzleState.systems.active = true;
            openSystems();
          }
        },
        {
          label: "Keep looking",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            puzzleState.systems.active = true;
            persist();
            refreshGuide();
          }
        }
      ]);
      return;
    }
    if (challengeState.concluded && puzzleState.systems.concluded && !useNow["CH-08"]) {
      ui.showDialogue(true, "Ranger Wren", "A tidy first story just met a crate note and a clear station reach.", [
        {
          label: "Face the conflict",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openConflict();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (aarEligible(puzzleSpec, useNow) && puzzleState.aar.result !== "clearance") {
      ui.showDialogue(true, "Ranger Wren", aarSpec.open, [
        {
          label: "Make the case",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
            openAar();
          }
        },
        {
          label: "Not yet",
          onClick: () => {
            dialogue = null;
            ui.showDialogue(false);
          }
        }
      ]);
      return;
    }
    if (puzzleState.aar.result === "more-evidence") {
      showDialogueLines("Ranger Wren", puzzleState.aar.remediation.length ? puzzleState.aar.remediation : [aarSpec.moreEvidence.lead], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    if (invState.concluded) {
      const stay = regionMastered(masteryProfile, masteryState)
        ? ["The hollow is still here. High Country will wait until you want the mountains."]
        : investigation.wren.afterSuccess;
      showDialogueLines("Ranger Wren", stay, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    const lines = pickWrenLines(catalog, discoveryState, ready, done);
    showDialogueLines("Ranger Wren", lines, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
    });
  }

  function hypothesisView() {
    const evidence = evidenceModel(investigation, invState);
    const labels = Object.fromEntries(investigation.timescales.map((item) => [item.id, item.label]));
    return {
      processes: investigation.processes,
      evidenceCards: evidence.cards.map((card) => ({
        ...card,
        timescaleLabel: labels[card.timescale]
      })),
      selectedProcess: invState.selectedProcess,
      selectedEvidenceIds: invState.selectedEvidenceIds,
      status: invState.lastHint,
      concluded: invState.concluded
    };
  }

  function renderHypothesis() {
    ui.showHypothesis(true, hypothesisView(), {
      onProcess(id) {
        setSelectedProcess(invState, id);
        renderHypothesis();
      },
      onEvidence(id) {
        toggleSelectedEvidence(invState, id);
        renderHypothesis();
      }
    });
  }

  function openHypothesis() {
    if (!canProposeExplanation(investigation, invState) && !invState.concluded) {
      ui.showToast("Keep looking", "Compare the boulder, the grooves, and the shape of the valley first.");
      return;
    }
    hypothesisOpen = true;
    journalOpen = false;
    refreshJournal();
    renderHypothesis();
  }

  function closeHypothesis() {
    hypothesisOpen = false;
    ui.showHypothesis(false, {});
  }

  function tryHypothesis() {
    const result = evaluateHypothesis(
      investigation,
      invState,
      invState.selectedProcess,
      invState.selectedEvidenceIds
    );
    renderHypothesis();
    if (result.ok && !result.already) {
      persist();
      journalOpen = true;
      refreshJournal();
      closeHypothesis();
      showDialogueLines("Ranger Wren", [investigation.hypothesis.success], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
    }
  }

  function openConclusion() {
    if (!canPresentFindings(missionState, mission) && !missionState.concluded) {
      ui.showToast("Keep exploring", mission.conclusion.incompleteHint);
      return;
    }
    conclusionOpen = true;
    renderConclusion(mission.conclusion.prompt);
  }

  function renderConclusion(hint) {
    ui.showConclusion(
      true,
      FLOW_MAP,
      missionState.conclusionPath,
      observedFeatureIds(missionState),
      hint
    );
  }

  function enterWorld() {
    mode = "play";
    ui.showTitle(false);
    ui.showAppearance(false);
    canvas.focus();
    audio.unlock();
    if (darkSkyReview) {
      applyRegionWorld("dark-sky-basin", { keepPlayer: false });
      audio.setPlace("dark-sky-basin", true);
      ui.setHint(controlHintText());
      refreshSkyClock();
      refreshGuide();
      presentation.openingSeen = true;
      persist();
      playTravelCard("dark-sky-basin", () => {
        if (!dsState.introSeen) {
          dsState.introSeen = true;
          persist();
          showDialogueLines("Ranger Wren", dsSpec.intro.lines, 0, () => {
            dialogue = null;
            ui.showDialogue(false);
          });
        }
      });
      return;
    }
    audio.setPlace(worldState.currentRegion, Boolean(isDarkSky()));
    ui.setHint(controlHintText());
    refreshSkyClock();
    refreshGuide();
    if (!presentation.openingSeen) {
      presentation.openingSeen = true;
      persist();
      playTravelCard("cedar-hollow", () => {
        if (!missionState.introSeen) openIntro();
      });
    }
  }

  root.querySelector("#enter-btn").addEventListener("click", enterWorld);
  root.querySelector("#new-explore-btn")?.addEventListener("click", () => {
    confirmOpen = true;
    ui.showConfirmReset(true);
  });
  root.querySelector("#world-map-btn")?.addEventListener("click", () => {
    audio.map();
    openAtlas("cedar-hollow");
  });
  root.querySelector("#map-toggle")?.addEventListener("click", () => openAtlas());
  root.querySelector("#open-atlas")?.addEventListener("click", () => {
    journalOpen = false;
    refreshJournal();
    openAtlas();
  });
  root.querySelector("#atlas-close")?.addEventListener("click", closeAtlas);
  root.querySelector("#atlas-travel")?.addEventListener("click", () => {
    const id = worldState.selectedRegionId;
    if (!canEnterRegion(tbWorld, worldState, id)) return;
    closeAtlas();
    if (id !== worldState.currentRegion) travelTo(id);
    if (mode === "title") enterWorld();
  });
  root.querySelector("#atlas-map")?.addEventListener("pointerdown", (event) => {
    const hit = hitTestRegion(tbWorld, event.currentTarget, event.clientX, event.clientY);
    if (!hit) return;
    worldState.selectedRegionId = hit.id;
    renderAtlas();
  });

  root.querySelector("#inspect-prompt")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (mode !== "play" || overlayBlocks()) return;
    inspectTarget(currentTarget());
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Tab") return;
    if (atlasOpen) {
      if (event.key === "Escape" || event.key === "m" || event.key === "M") {
        event.preventDefault();
        closeAtlas();
      }
      return;
    }
    if (mode === "title" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      enterWorld();
      return;
    }
    if (dialogue) {
      if (event.key === "Enter" || event.key === " " || event.key === "e" || event.key === "E") {
        event.preventDefault();
        const btn = root.querySelector("#dialogue-actions button");
        btn?.click();
      }
      return;
    }
    if (conclusionOpen) {
      if (event.key === "Escape") {
        conclusionOpen = false;
        ui.showConclusion(false, [], [], new Set(), "");
      }
      return;
    }
    if (hypothesisOpen) {
      if (event.key === "Escape") closeHypothesis();
      return;
    }
    if (spectrumOpen) {
      if (event.key === "Escape") closeSpectrum();
      return;
    }
    if (skyEyeOpen) {
      if (event.key === "Escape") closeSkyEyepiece();
      return;
    }
    if (flumeOpen) {
      if (event.key === "Escape") closeFlume();
      return;
    }
    if (interpretOverlay) {
      if (event.key === "Escape") closeInterpret();
      return;
    }
    if (clearanceOpen) {
      if (event.key === "Escape") closeClearance();
      return;
    }
    if (systemsOpen) {
      if (event.key === "Escape") closeSystems();
      return;
    }
    if (summitOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSummit();
      }
      return;
    }
    if (aarOpen) {
      if (event.key === "Escape") closeAar();
      return;
    }
    if (geoOpen) {
      if (event.key === "Escape") closeGeo();
      return;
    }
    if (confirmOpen) {
      if (event.key === "Escape") {
        confirmOpen = false;
        ui.showConfirmReset(false);
      }
      return;
    }
    keys.add(event.key.toLowerCase());
    if (event.key === "j" || event.key === "J") {
      journalOpen = !journalOpen;
      if (journalOpen) {
        taught.journal = true;
        audio.tablet();
      }
      persist();
      refreshJournal();
    }
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      openAtlas();
    }
    if (event.key === "e" || event.key === "E") {
      inspectTarget(currentTarget());
    }
    if (event.key === "Escape") {
      journalOpen = false;
      refreshJournal();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (mode !== "play" || overlayBlocks()) return;
    const worldPt = screenToWorld(event.clientX, event.clientY);
    const target = currentTarget();
    if (target && Math.hypot(worldPt.x - target.x, worldPt.y - target.y) < 70 && Math.hypot(player.x - target.x, player.y - target.y) < 100) {
      inspectTarget(target);
      return;
    }
    destination = worldPt;
  });

  root.querySelector("#journal-toggle").addEventListener("click", () => {
    journalOpen = !journalOpen;
    if (journalOpen) {
      taught.journal = true;
      audio.tablet();
    }
    persist();
    refreshJournal();
  });
  root.querySelector("#journal-reset").addEventListener("click", () => {
    confirmOpen = true;
    ui.showConfirmReset(true);
  });
  root.querySelector("#reset-cancel").addEventListener("click", () => {
    confirmOpen = false;
    ui.showConfirmReset(false);
  });
  root.querySelector("#reset-confirm").addEventListener("click", () => {
    if (!wipeRequiresConfirm(true)) return;
    clearSave(storage);
    window.location.reload();
  });
  root.querySelector("#journal-close").addEventListener("click", () => {
    journalOpen = false;
    refreshJournal();
  });
  root.querySelector("#conclusion-close").addEventListener("click", () => {
    conclusionOpen = false;
    ui.showConclusion(false, [], [], new Set(), "");
  });
  root.querySelector("#hypothesis-close").addEventListener("click", closeHypothesis);
  root.querySelector("#hypothesis-clear").addEventListener("click", () => {
    clearHypothesisDraft(invState);
    renderHypothesis();
  });
  root.querySelector("#hypothesis-try").addEventListener("click", tryHypothesis);
  root.querySelector("#hypothesis-open").addEventListener("click", () => {
    openHypothesis();
  });
  root.querySelector("#flume-run")?.addEventListener("click", releaseWater);
  root.querySelector("#flume-close")?.addEventListener("click", closeFlume);
  root.querySelector("#flume-numbers")?.addEventListener("click", () => {
    closeFlume();
    openInterpret();
  });
  root.querySelector("#interpret-open")?.addEventListener("click", openInterpret);
  root.querySelector("#interpret-try")?.addEventListener("click", tryInterpret);
  root.querySelector("#interpret-close")?.addEventListener("click", closeInterpret);
  root.querySelector("#clearance-try")?.addEventListener("click", tryClearance);
  root.querySelector("#clearance-follow-try")?.addEventListener("click", tryClearanceFollow);
  root.querySelector("#clearance-close")?.addEventListener("click", closeClearance);
  root.querySelector("#systems-try")?.addEventListener("click", trySystemsMap);
  root.querySelector("#systems-walk")?.addEventListener("click", walkSystemsSite);
  root.querySelector("#systems-close")?.addEventListener("click", closeSystems);
  root.querySelector("#aar-next")?.addEventListener("click", aarAdvance);
  root.querySelector("#aar-summit")?.addEventListener("click", openSummit);
  root.querySelector("#aar-submit")?.addEventListener("click", submitAarCase);
  root.querySelector("#aar-close")?.addEventListener("click", closeAar);
  root.querySelector("#summit-toggle")?.addEventListener("click", () => {
    if (summitOpen) closeSummit();
    else openSummit();
  });
  root.querySelector("#summit-close")?.addEventListener("click", closeSummit);
  root.querySelector("#summit-diag-toggle")?.addEventListener("click", () => {
    summitDiagOpen = !summitDiagOpen;
    if (summitOpen) renderSummit();
  });
  root.querySelector("#summit-more")?.addEventListener("click", () => askSummit({ action: "explain_more", question: "Explain more" }));
  root.querySelector("#summit-quick")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-summit]");
    if (!btn) return;
    askSummit({ action: btn.dataset.summit });
  });
  root.querySelector("#summit-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = root.querySelector("#summit-ask");
    const question = input?.value?.trim();
    if (!question) {
      askSummit({ action: "what_now" });
      return;
    }
    input.value = "";
    askSummit({ question });
  });
  root.querySelector("#summit-fieldtest")?.addEventListener("click", (event) => {
    const markBtn = event.target.closest("[data-ft-mark]");
    if (markBtn && fieldTestSession) {
      const turns = fieldTestSession.events.filter((row) => row.type === "summit");
      const last = turns[turns.length - 1];
      if (!last) return;
      const note = root.querySelector("#summit-fieldtest-note")?.value || "";
      markTurn(fieldTestSession, last.id, markBtn.dataset.ftMark, note);
      ui.showToast("Marked", markBtn.dataset.ftMark.replace("_", " ").toLowerCase());
    }
  });
  root.querySelector("#summit-fieldtest-json")?.addEventListener("click", () => downloadFieldTest("json"));
  root.querySelector("#summit-fieldtest-md")?.addEventListener("click", () => downloadFieldTest("md"));
  root.querySelector("#geo-close")?.addEventListener("click", closeGeo);
  root.querySelector("#path-reset").addEventListener("click", () => {
    resetPath(missionState);
    renderConclusion("Start again from the highest water you saw.");
  });
  root.querySelector("#flow-nodes").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-feature-id]");
    if (!btn) return;
    const result = tryAddPathNode(missionState, mission, btn.dataset.featureId);
    if (result.ok && result.complete) {
      ui.showToast("The path is clear", mission.conclusion.successText);
      persist();
      journalOpen = true;
      refreshJournal();
      conclusionOpen = false;
      ui.showConclusion(false, [], [], new Set(), "");
      showDialogueLines("Ranger Wren", [mission.conclusion.successText], 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
      return;
    }
    renderConclusion(result.ok ? mission.conclusion.prompt : result.hint);
  });

  function refreshAppearancePicker(open) {
    ui.showAppearance(open, presentationPack, presentation.appearance, (key, id) => {
      presentation.appearance = normalizeAppearance({ ...presentation.appearance, [key]: id });
      presentation.appearanceSet = true;
      refreshAppearancePicker(true);
    });
  }

  ui.showTitle(true);
  ui.setEnterLabel(Boolean(existingSave));
  refreshAppearancePicker(!existingSave);
  ui.setJournal(journalView(false));
  ui.setHint("");
  resize();
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const playing = mode === "play" && !overlayBlocks();
    let ax = 0;
    let ay = 0;
    if (playing) {
      if (keys.has("w") || keys.has("arrowup")) ay -= 1;
      if (keys.has("s") || keys.has("arrowdown")) ay += 1;
      if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
      if (keys.has("d") || keys.has("arrowright")) ax += 1;
      if (ax || ay) destination = null;
      if (!ax && !ay && destination) {
        const dx = destination.x - player.x;
        const dy = destination.y - player.y;
        if (Math.hypot(dx, dy) < 18) destination = null;
        else {
          ax = dx;
          ay = dy;
        }
      }
      const wishLen = Math.hypot(ax, ay);
      let wishX = 0;
      let wishY = 0;
      if (wishLen > 0) {
        wishX = (ax / wishLen) * WALK_SPEED;
        wishY = (ay / wishLen) * WALK_SPEED;
        teachWalk();
      }
      const blend = 1 - Math.exp(-dt * ACCEL);
      player.vx += (wishX - player.vx) * blend;
      player.vy += (wishY - player.vy) * blend;
      const moved = moveWithCollision(world, player.x, player.y, player.vx * dt, player.vy * dt);
      player.vx = (moved.x - player.x) / dt;
      player.vy = (moved.y - player.y) / dt;
      player.x = moved.x;
      player.y = moved.y;
      if (ax) player.facing = ax >= 0 ? 1 : -1;
      if (isDarkSky()) {
        if (atFeature(dsRegion, player, "lamp-bench", 20)) markVisited(dsState, "lamp");
        if (atFeature(dsRegion, player, "north-rim-station", 40)) markVisited(dsState, "station");
        if (atFeature(dsRegion, player, "west-rim-stake", 20)) markVisited(dsState, "west");
        if (atFeature(dsRegion, player, "east-rim-stake", 20)) markVisited(dsState, "east");
        if (atFeature(dsRegion, player, "quiet-floor", 24) || atFeature(dsRegion, player, "floor-rock", 12)) markVisited(dsState, "floor");
        tickLookbackWalk(dsState, atFeature(dsRegion, player, "north-rim-station", 90));
      }
      if (Math.hypot(player.vx, player.vy) > 24) {
        const kind = inCreek(world.region, player.x, player.y) ? "water" : onTrail(world.region, player.x, player.y) ? "rock" : "soil";
        audio.footstep(now / 1000, kind);
      }
      if (player.pose !== "idle" && player.pose !== "walk" && now > poseUntil) player.pose = "idle";
    } else {
      player.vx *= Math.exp(-dt * 12);
      player.vy *= Math.exp(-dt * 12);
    }

    if (mode === "title") {
      const t = now / 1000;
      if (isHighCountry()) {
        camera.x = 1280 + Math.sin(t * 0.18) * 280;
        camera.y = 980 + Math.cos(t * 0.14) * 220;
      } else if (isSunfall()) {
        camera.x = 1400 + Math.sin(t * 0.16) * 320;
        camera.y = 980 + Math.cos(t * 0.12) * 180;
      } else if (isDarkSky()) {
        camera.x = 1280 + Math.sin(t * 0.14) * 260;
        camera.y = 720 + Math.cos(t * 0.11) * 200;
      } else {
        camera.x = 1100 + Math.sin(t * 0.18) * 220;
        camera.y = 720 + Math.cos(t * 0.14) * 160;
      }
    } else {
      let lookX = player.x + player.facing * 40;
      let lookY = player.y - (isDarkSky() ? 78 : 22);
      const targetNow = currentTarget();
      if (targetNow && targetNow.kind !== "wren" && Math.hypot(player.x - targetNow.x, player.y - targetNow.y) < 90) {
        lookX = lookX * 0.72 + targetNow.x * 0.28;
        lookY = lookY * 0.72 + targetNow.y * 0.28;
      }
      if (camFocus && now < camFocus.until) {
        lookX = lookX * 0.4 + camFocus.x * 0.6;
        lookY = lookY * 0.4 + camFocus.y * 0.6;
      } else {
        camFocus = null;
      }
      const follow = 1 - Math.exp(-dt * CAMERA_FOLLOW);
      camera.x += (lookX - camera.x) * follow;
      camera.y += (lookY - camera.y) * follow;
    }

    const target = currentTarget();
    if (mode === "play" && !overlayBlocks()) {
      ui.setHint(controlHintText());
      if (!target) ui.setPrompt("");
      else if (target.kind === "wren") {
        ui.setPrompt(
          isSunfall()
            ? sfReadyForChallenge(sfState) && !sfState.challenge.ok
              ? "Share an observing plan · E"
              : "Talk to Wren · E"
            : isHighCountry()
            ? hcReadyForChallenge(hcState) && !hcState.challengeOk
              ? "Share a field plan · E"
              : "Talk to Wren · E"
            : isDarkSky()
              ? "Talk to Wren · E"
            : canProposeChallenge(challengeState, challengeSpec) && !challengeState.concluded
            ? "Share what you found · E"
            : readyForChallenge() && !challengeState.introSeen
              ? "Talk to Wren · E"
              : hasFairComparison(flumeState, flumeSpec) && !dataState.datasets["cedar-hollow-flow"]?.interpreted
                ? "Talk to Wren · E"
                : invState.concluded && !flumeState.introSeen
                  ? "Talk to Wren · E"
                  : canProposeExplanation(investigation, invState) && !invState.concluded
                    ? "Share what shaped the hollow · E"
                    : canPresentFindings(missionState, mission) && !missionState.concluded
                      ? "Tell Wren what you found · E"
                      : "Talk to Wren · E"
        );
      } else if (target.kind === "flume") {
        ui.setPrompt("Use the runoff table · E");
      } else if (target.kind === "cache") {
        ui.setPrompt("Match the cache pair · E");
      } else if (target.kind === "marker") {
        ui.setPrompt("Record this reading · E");
      } else if (target.kind === "stake") {
        ui.setPrompt("Read the stake · E");
      } else if (target.kind === "challenge") {
        ui.setPrompt("Look closer · E");
      } else if (target.kind === "sf-site") {
        ui.setPrompt("Record this coordinate pair · E");
      } else if (target.kind === "gnomon") {
        ui.setPrompt("Record the shadow · E");
      } else if (target.kind === "moon-site") {
        ui.setPrompt("Log the Moon · E");
      } else if (target.kind === "orbit-board") {
        ui.setPrompt("Use the orbit table · E");
      } else if (target.kind === "tide-desk") {
        ui.setPrompt("Read the coastal desk · E");
      } else if (target.kind === "planet-desk") {
        ui.setPrompt("Read the planet log · E");
      } else if (target.kind === "eyepiece") {
        ui.setPrompt(dsInspectPrompt("eyepiece"));
      } else if (target.kind === "plate-desk") {
        ui.setPrompt(dsInspectPrompt("plate-desk"));
      } else if (target.kind === "spectrograph") {
        ui.setPrompt(dsInspectPrompt("spectrograph"));
      } else if (target.kind === "lamp") {
        ui.setPrompt(dsState.lampOn ? "Inspect the lamp light · E" : "Use the calibration lamp · E");
      } else if (target.kind === "west-stake") {
        ui.setPrompt(dsInspectPrompt("west-stake"));
      } else if (target.kind === "east-stake") {
        ui.setPrompt(dsInspectPrompt("east-stake"));
      } else if (target.kind === "plot-board") {
        ui.setPrompt(dsInspectPrompt("plot-board"));
      } else if (target.kind === "burst-poster") {
        ui.setPrompt(dsInspectPrompt("burst-poster"));
      } else if (target.kind === "basin-rock") {
        ui.setPrompt(dsState.rockPicked ? "The floor rock is in hand" : "Pick up the basin rock · E");
      } else if (target.kind === "horn") {
        ui.setPrompt(dsInspectPrompt("horn"));
      } else if (target.kind === "quiet-floor") {
        ui.setPrompt("Stand on the quiet pan · E");
      } else if (target.kind === "glow-notch") {
        ui.setPrompt(dsState.glowNoted ? "Town glow still leaks here" : "Look at the town glow leak · E");
      } else if (target.kind === "picnic") {
        ui.setPrompt("Optional rest · E");
      } else if (target.kind === "station") {
        ui.setPrompt("Look over the basin · E");
      } else if (target.kind === "eclipse-desk") {
        ui.setPrompt("Use the alignment model · E");
      } else if (target.kind === "discovery") {
        const pending = availableMeasurementAt(investigation, invState, discoveryState, target.item.id);
        const sortCard = pendingCard(investigation.obsInt, invState.obsInt, discoveryState.foundIds);
        ui.setPrompt(
          pending
            ? `${pending.actionLabel} · E`
            : sortCard && sortCard.discoveryId === target.item.id
              ? "Sort seen vs guessed · E"
              : "Look closer · E"
        );
      } else {
        ui.setPrompt(`Look closer · E`);
      }
    } else if (!dialogue) {
      ui.setPrompt("");
    }

    saveTimer += dt;
    if (saveTimer > 2.5 && mode === "play") {
      saveTimer = 0;
      persist();
    }

    renderer.draw({
      camera,
      player,
      time: now / 1000,
      reducedMotion,
      destination,
      appearance: presentation.appearance,
      journalOpen,
      talking: Boolean(dialogue && dialogue.speaker === "Ranger Wren"),
      atmosphere: presentationPack.atmosphere?.[worldState.currentRegion],
      sky: isDarkSky() ? nightSkyState(dsCatalog) : isSunfall() ? liveSky(sfState, sfRegion, player) : null,
      lampOn: isDarkSky() ? Boolean(dsState.lampOn) : false,
      observations: isHighCountry() || isSunfall() || isDarkSky() ? [] : missionState.observations,
      flowVisible: isHighCountry() || isSunfall() || isDarkSky() ? false : missionState.flowVisible,
      landscapeInterpreted: isHighCountry() || isSunfall() || isDarkSky() ? false : invState.interpreted,
      measuredIds: isHighCountry() || isSunfall() || isDarkSky() ? [] : invState.measuredIds,
      iceFlow: investigation.iceFlow,
      discoveries: isDarkSky() ? [] : isSunfall() ? sfCatalog.items : isHighCountry() ? hcCatalog.items : catalog.items,
      nearTarget: target && target.kind !== "wren" ? target : null,
      challengeActive: isHighCountry() || isSunfall() || isDarkSky() ? false : Boolean(challengeState.active),
      challengeSites:
        !isHighCountry() && !isSunfall() && !isDarkSky() && challengeState.active
          ? challengeSpec.sites.map((site) => ({
              ...site,
              observed: challengeState.observedIds.includes(site.id)
            }))
          : [],
      interpretiveLabels:
        isHighCountry() || isSunfall() || isDarkSky() ? [] : interpretiveLabels(investigation, invState, catalog, region, player),
      flumeVisual: {
        slope: flumeState.slope,
        water: flumeState.water,
        running: now < flumeRunUntil
      }
    });
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  if (new URLSearchParams(location.search).get("field") === "1") {
    window.TB = {
      player,
      missionState,
      discoveryState,
      invState,
      catalog,
      investigation,
      region,
      worldState,
      masteryState,
      toolState,
      flumeState,
      dataState,
      challengeState,
      puzzleState,
      summitState,
      puzzleSpec,
      aarSpec,
      flumeSpec,
      hcState,
      hcRegion,
      hcSpec,
      hcCatalog,
      hcProfile,
      sfState,
      sfRegion,
      sfSpec,
      sfCatalog,
      sfProfile,
      dsState,
      dsRegion,
      dsCatalog,
      dsSpec,
      go(x, y) {
        player.x = x;
        player.y = y;
        destination = null;
      },
      enterRegion(id) {
        return travelTo(id);
      },
      openGeo,
      closeGeo,
      inspectDiscovery(id) {
        const item = catalog.items.find((entry) => entry.id === id);
        if (!item) return false;
        player.x = item.x;
        player.y = item.y;
        inspectDiscovery(item);
        return true;
      },
      inspectFeature(id) {
        const live = isDarkSky() ? dsRegion : isSunfall() ? sfRegion : isHighCountry() ? hcRegion : region;
        const feature = (live.features || []).find((entry) => entry.id === id);
        if (!feature) return false;
        player.x = feature.x;
        player.y = feature.y;
        if (isDarkSky()) {
          inspectDs({ kind: feature.kind, item: feature, x: feature.x, y: feature.y, name: feature.name });
        } else {
          inspectFeature(feature);
        }
        return true;
      },
      talk() {
        const ranger = isDarkSky() ? dsRegion.ranger : isSunfall() ? sfRegion.ranger : isHighCountry() ? hcRegion.ranger : region.ranger;
        player.x = ranger.x;
        player.y = ranger.y;
        talkToWren();
      },
      openDsEyepiece() {
        const feat = dsRegion.features.find((row) => row.id === "eyepiece");
        if (feat) {
          player.x = feat.x;
          player.y = feat.y;
        }
        openSkyEyepiece();
        return true;
      },
      openDsLamp() {
        const feat = dsRegion.features.find((row) => row.id === "lamp-bench");
        if (feat) {
          player.x = feat.x;
          player.y = feat.y;
        }
        markVisited(dsState, "lamp");
        openLampBench();
        return true;
      },
      openDsSpectrograph() {
        const feat = dsRegion.features.find((row) => row.id === "spectrograph");
        if (feat) {
          player.x = feat.x;
          player.y = feat.y;
        }
        openDsSpectrograph();
        return true;
      },
      dsObserve(id) {
        return observeTarget(dsState, id);
      },
      dsCompleteThrough(id) {
        debugCompleteThrough(dsState, dsCatalog, id, {
          seed01(state, catalog) {
            markEyepieceSeen(state);
            observeTarget(state, "west-twin");
            observeTarget(state, "east-twin");
            readTwinsLog(state);
            setLampOn(state, true);
            logLampCalibration(state, catalog, [436, 546], true);
            tryStellarAlign(state, catalog, 0);
            markStellarFeature(dsState, 486, "diff");
            markStellarFeature(dsState, 589, "diff");
            logStellarCompare(state);
            logTwinsConclusion(state);
          },
          seed02(state, catalog) {
            observeTarget(state, EMBER_ID);
            logEmberPeaks(state, catalog, 628, 428);
            logEmberConclusion(state);
          }
        });
        persist();
        return completePuzzleUse(dsState, ds01Complete(dsState), ds02Complete(dsState));
      },
      openJournal() {
        journalOpen = true;
        refreshJournal();
      },
      openHyp() {
        openHypothesis();
      },
      openFlume,
      openInterpret,
      openClearance,
      openSystems,
      openAar,
      submitAar: submitAarCase,
      openSummit,
      askSummit,
      closeSummit,
      get summitDebug() {
        return summitState.lastDebug || null;
      },
      summitAdapterId: summitAdapter.id,
      fieldTest: fieldTestMode
        ? {
            session: () => fieldTestSession,
            payload: fieldTestPayload,
            mark(mark, note) {
              const turns = fieldTestSession?.events.filter((row) => row.type === "summit") || [];
              const last = turns[turns.length - 1];
              if (!last) return null;
              return markTurn(fieldTestSession, last.id, mark, note);
            },
            exportJson: () => downloadFieldTest("json"),
            exportMd: () => downloadFieldTest("md")
          }
        : null,
      openConflict,
      releaseWater,
      tryInterpret,
      tryClearance,
      tryClearanceFollow,
      tryHyp() {
        tryHypothesis();
      },
      openAtlas(id) {
        openAtlas(id);
      },
      selectRegion(id) {
        worldState.selectedRegionId = id;
        if (!atlasOpen) openAtlas(id);
        else renderAtlas();
      },
      simulateMastery(regionId = "cedar-hollow") {
        const profile =
          regionId === "sunfall-desert" ? sfProfile : regionId === "high-country" ? hcProfile : masteryProfile;
        applySimulatedMastery(profile, masteryState, regionId);
        persist();
        refreshJournal();
        refreshSkyClock();
        if (atlasOpen) renderAtlas();
        return {
          accessible: [...worldState.accessibleRegions],
          mastered: [...worldState.masteredRegions],
          missing: missingEvidence(profile, masteryState)
        };
      },
      jump(kind) {
        const result = jumpObservation(sfState, kind, sfRegion, player);
        persist();
        refreshSkyClock();
        return result;
      },
      sky() {
        return isSunfall() ? liveSky(sfState, sfRegion, player) : null;
      },
      presentation,
      setPose,
      enterWorld,
      CHARACTER_STATES: ["idle", "walk", "inspect", "measure", "tablet", "talk", "sky"]
    };
  }
}
