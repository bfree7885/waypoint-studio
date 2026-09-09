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
  presentChallenge,
  challengeProgress
} from "./challenge.js";
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
  recordMoon,
  useMoonGeometry,
  predictMoon,
  alignEclipse,
  explainEclipse,
  compareTides,
  classifyPlanets,
  planObservation,
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
import { POSE_MS, normalizeAppearance } from "./character.js";
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

export async function boot(root = document) {
  const canvas = root.querySelector("#world");
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
    hcRegion,
    hcCatalog,
    hcSpec,
    hcProfile,
    sfRegion,
    sfCatalog,
    sfSpec,
    sfProfile,
    presentationPack
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
      fetch("./data/regions/high-country.json").then((r) => r.json()),
      fetch("./data/discoveries/high-country.json").then((r) => r.json()),
      fetch("./data/investigations/high-country.json").then((r) => r.json()),
      fetch("./data/mastery/high-country.json").then((r) => r.json()),
      fetch("./data/regions/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/discoveries/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/investigations/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/mastery/sunfall-desert.json").then((r) => r.json()),
      fetch("./data/world/presentation.json").then((r) => r.json())
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
  const hcState = createHcState();
  const sfState = createSfState();
  const regionPlayers = { "cedar-hollow": null, "high-country": null, "sunfall-desert": null };
  const taught = emptyTaught();
  const presentation = emptyPresentationSave();
  const travelState = createTravelState();
  let poseUntil = 0;
  const ui = bindUi(root);
  const hollowRenderer = createRenderer(canvas, hollowWorld, { heightAt, inCreek, onTrail });
  const hcRenderer = createRenderer(canvas, hcWorld, { heightAt, inCreek, onTrail });
  const sfRenderer = createRenderer(canvas, sfWorld, { heightAt, inCreek, onTrail });
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
      hcState,
      sfState,
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
    camera.x = player.x;
    camera.y = player.y - 28;
    refreshSkyClock();
    audio.setPlace(id, Boolean(isSunfall() && liveSky(sfState, sfRegion, player).night));
  }

  applyRegionWorld(worldState.currentRegion || "cedar-hollow", { keepPlayer: true });
  camera.x = player.x;
  camera.y = player.y - 28;
  syncFromGameplay(
    masteryState,
    gameplaySnapshot({ discoveryState, missionState, invState, flumeState, dataState, challengeState, flumeSpec })
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
      flumeSpec
    });
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
      showMap: false
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
        heightAtFn: heightAt
      },
      mapTools,
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
      mapTools: [{ id: "trails", label: "Tracks", on: true }]
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
    }
    if (regionMastered(hcProfile, masteryState)) {
      const opened = applyTravelUnlocks(tbWorld, worldState, "high-country");
      if (opened.includes("sunfall-desert") && !taught.routeSunfall) {
        taught.routeSunfall = true;
        ui.showToast("Sunfall Desert", "Route open.");
      }
    }
  }

  function persist() {
    syncProgress();
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
        hcState,
        sfState,
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
        geoOpen ||
        travelBlocking(travelState)
    );
  }

  function setPose(kind, ms) {
    player.pose = kind;
    poseUntil = performance.now() + (ms ?? POSE_MS[kind] ?? 700);
  }

  function wrenKicker() {
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
      canReadNumbers: hasFairComparison(flumeState, flumeSpec)
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
    flumeRunUntil = performance.now() + 1400;
    syncFlowDataset();
    persist();
    renderFlume();
    if (!result.fair) ui.showToast("Fair test", result.hint);
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
      closeInterpret();
      showDialogueLines("Ranger Wren", flumeSpec.wren.afterFair, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
      });
    }
  }

  function clearanceView() {
    const pick = challengeSpec.explanations.find((item) => item.id === challengeState.selectedExplanation);
    const needsFollowUp = Boolean(pick?.correct && !challengeState.followUpDone && !challengeState.concluded);
    return {
      progress: challengeProgress(challengeState, challengeSpec),
      explanations: challengeSpec.explanations,
      selectedExplanation: challengeState.selectedExplanation,
      needsFollowUp,
      followOptions: challengeSpec.followUp.options,
      followId: null,
      status: challengeState.lastHint,
      concluded: challengeState.concluded
    };
  }

  let clearanceFollowId = null;

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
    closeClearance();
    persist();
    showDialogueLines("Ranger Wren", challengeSpec.wrenAfter, 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      openAtlas("high-country");
    });
  }

  function inspectChallenge(site) {
    if (!site || inspectLock) return;
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
    }, site.useful === false ? "Look closer" : "Field note");
  }

  function renderAtlas() {
    const canvasEl = root.querySelector("#atlas-map");
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    drawWorldMap(ctx, tbWorld, worldState, worldState.selectedRegionId);
    ui.setAtlasPreview(previewModel(tbWorld, worldState, worldState.selectedRegionId));
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
    renderAtlas();
  }

  function closeAtlas() {
    atlasOpen = false;
    ui.showAtlas(false);
  }

  function refreshJournal() {
    ui.setJournal(journalView());
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
    inspectLock = true;
    const spec = result.spec;
    showDialogueLines("Field note", [spec.prompt, spec.text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
      if (!result.already) {
        taught.inspect = true;
        ui.showToast("Noted", spec.title);
        persist();
        refreshJournal();
      }
    });
  }

  function inspectDiscovery(item) {
    if (!item || inspectLock) return;
    inspectLock = true;

    if (!isFound(discoveryState, item.id)) {
      const result = addDiscovery(discoveryState, catalog, item.id);
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

    showDialogueLines(name, [text], 0, () => {
      dialogue = null;
      ui.showDialogue(false);
      inspectLock = false;
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
    if (!canEnterRegion(tbWorld, worldState, id)) return false;
    regionPlayers[worldState.currentRegion] = { x: player.x, y: player.y, facing: player.facing };
    const firstHc = id === "high-country" && !hcState.introSeen;
    const firstSf = id === "sunfall-desert" && !sfState.introSeen;
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
    ui.showGeoBoard(true, view, {
      onPick(group, id) {
        if (geoKind === "shadow" && group === "explain") sfState.rotationExplain = id;
        if (geoKind === "seasons" && group === "explain") sfState.seasonExplain = id;
        if (geoKind === "orbit" && group === "ecc") setOrbitEccentricity(sfState, Number(id));
        if (geoKind === "kepler" && group === "period") sfState.kepler.predictedP = Number(id);
        if (geoKind === "moon" && group === "predict") sfState.moonPredict = id;
        if (geoKind === "eclipse" && group === "tilt") alignEclipse(sfState, id !== "off");
        if (geoKind === "eclipse" && group === "explain") sfState.lastHint = "";
        if (geoKind === "eclipse") sfState._eclipseChoice = group === "explain" ? id : sfState._eclipseChoice;
        if (geoKind === "tides" && group === "pattern") sfState.tides.pattern = id;
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
      onTry() {
        let result = { ok: false };
        if (geoKind === "shadow") result = explainRotation(sfState, sfState.rotationExplain);
        else if (geoKind === "seasons") result = explainSeasons(sfState, sfState.seasonExplain);
        else if (geoKind === "orbit") result = measureOrbit(sfState);
        else if (geoKind === "kepler") result = predictKepler(sfState, sfState.kepler.predictedP);
        else if (geoKind === "moon") {
          useMoonGeometry(sfState);
          takeEvidence({ evidence: [{ competencyId: "moon", kind: "moon-geometry" }] });
          result = predictMoon(sfState, sfState.moonPredict);
        } else if (geoKind === "eclipse") result = explainEclipse(sfState, sfState._eclipseChoice);
        else if (geoKind === "tides") result = compareTides(sfState, sfState.tides.pattern);
        else if (geoKind === "planets") result = classifyPlanets(sfState, sfState.planets.pattern);
        else if (geoKind === "challenge") {
          result = planObservation(sfState, sfSpec, sfState.challenge);
          if (result.ok) presentSfChallenge(sfState);
        }
        takeEvidence(result);
        renderGeo();
        if (result.ok) ui.showToast("Noted", result.hint || view.title);
      }
    });
  }

  function renderGeo() {
    if (!geoOpen) return;
    if (isSunfall()) {
      renderSfGeo();
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
      inspectLock = true;
      showDialogueLines("Night-sky viewpoint", [sfSpec.moonSite.prompt], 0, () => {
        const result = recordMoon(sfState, sfSpec, sfRegion, player);
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
        if (result.ok) {
          ui.showToast("Sky log", result.row.name);
          if (sfState.moonLog.length >= 4) openGeo("moon");
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
      const result = compareTerrain(hcState, hcSpec, target.id);
      inspectLock = true;
      showDialogueLines(target.feature.name, [result.prompt || target.feature.label], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
      });
      return;
    }
    if (target.kind === "washout") {
      hcState.washoutSeen = true;
      const result = compareImagery(hcState, hcSpec, player, { x: target.x, y: target.y });
      inspectLock = true;
      showDialogueLines("Broken switchback", [hcSpec.imagery.note], 0, () => {
        inspectLock = false;
        dialogue = null;
        ui.showDialogue(false);
        takeEvidence(result);
      });
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
    if (recordedMarkerCount(hcState) >= 2 && hcState.measuredRoutes.length < 2) {
      ui.showDialogue(true, "Ranger Wren", hcSpec.wren.afterMarkers[0], [
        {
          label: "Measure the two trails",
          onClick: () => {
            measureRoute(hcState, hcSpec, hcRegion, heightAt, hcSpec.routes.a.id);
            const second = measureRoute(hcState, hcSpec, hcRegion, heightAt, hcSpec.routes.b.id);
            takeEvidence(second);
            dialogue = null;
            ui.showDialogue(false);
            openGeo("routes");
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
      hcState.mapState.layersOn = [...new Set([...(hcState.mapState.layersOn || []), "imagery"])];
      const result = compareImagery(hcState, hcSpec, player, hcRegion.props.find((prop) => prop.kind === "washout"));
      takeEvidence(result);
      showDialogueLines("Ranger Wren", hcSpec.wren.afterGis, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
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

  function currentTarget() {
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
    else if (target.kind === "gnomon" || target.kind === "moon-site") setPose("sky");
    else if (target.kind === "flume" || target.kind === "marker" || target.kind === "stake") setPose("measure");
    else if (target.kind === "orbit-board" || target.kind === "tide-desk" || target.kind === "planet-desk" || target.kind === "eclipse-desk") {
      setPose("tablet");
    } else setPose("inspect");
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
    if (shouldIntroduceInvestigation(invState, discoveryState, done)) {
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
    if (challengeState.concluded && !challengeState.presented) {
      presentChallenge(challengeState);
      persist();
      showDialogueLines("Ranger Wren", challengeSpec.wrenAfter, 0, () => {
        dialogue = null;
        ui.showDialogue(false);
        openAtlas("high-country");
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
    audio.setPlace(worldState.currentRegion, false);
    ui.setHint(controlHintText());
    refreshSkyClock();
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
      } else {
        camera.x = 1100 + Math.sin(t * 0.18) * 220;
        camera.y = 720 + Math.cos(t * 0.14) * 160;
      }
    } else {
      let lookX = player.x + player.facing * 40;
      let lookY = player.y - 22;
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
      } else if (target.kind === "marker") {
        ui.setPrompt("Record this reading · E");
      } else if (target.kind === "stake") {
        ui.setPrompt("Read the stake · E");
      } else if (target.kind === "challenge") {
        ui.setPrompt("Look closer · E");
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
      } else if (target.kind === "eclipse-desk") {
        ui.setPrompt("Use the alignment model · E");
      } else if (target.kind === "discovery") {
        const pending = availableMeasurementAt(investigation, invState, discoveryState, target.item.id);
        ui.setPrompt(pending ? `${pending.actionLabel} · E` : "Look closer · E");
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
      sky: isSunfall() ? liveSky(sfState, sfRegion, player) : null,
      observations: isHighCountry() || isSunfall() ? [] : missionState.observations,
      flowVisible: isHighCountry() || isSunfall() ? false : missionState.flowVisible,
      landscapeInterpreted: isHighCountry() || isSunfall() ? false : invState.interpreted,
      measuredIds: isHighCountry() || isSunfall() ? [] : invState.measuredIds,
      iceFlow: investigation.iceFlow,
      discoveries: isSunfall() ? sfCatalog.items : isHighCountry() ? hcCatalog.items : catalog.items,
      nearTarget: target && target.kind !== "wren" ? target : null,
      challengeActive: isHighCountry() || isSunfall() ? false : Boolean(challengeState.active),
      challengeSites:
        !isHighCountry() && !isSunfall() && challengeState.active
          ? challengeSpec.sites.map((site) => ({
              ...site,
              observed: challengeState.observedIds.includes(site.id)
            }))
          : [],
      interpretiveLabels:
        isHighCountry() || isSunfall() ? [] : interpretiveLabels(investigation, invState, catalog, region, player),
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
        const feature = region.features.find((entry) => entry.id === id);
        if (!feature) return false;
        player.x = feature.x;
        player.y = feature.y;
        inspectFeature(feature);
        return true;
      },
      talk() {
        const ranger = isSunfall() ? sfRegion.ranger : isHighCountry() ? hcRegion.ranger : region.ranger;
        player.x = ranger.x;
        player.y = ranger.y;
        talkToWren();
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
