/**
 * Structured Summit context. Game state in, tutoring facts out.
 * No prose inference. No invented evidence.
 */

import { puzzleUse, incompletePuzzles, tabletEvidence } from "./puzzles.js";
import { claimsForAttempt, selectedIds, judgeClaim } from "./aar.js";
import { hasFairComparison, fairTrials } from "./flume.js";

export const PLAY_ORDER = ["CH-02", "CH-01", "CH-03", "CH-04", "CH-05", "CH-06", "CH-07", "CH-08", "CH-09"];

const PLACE_NAMES = {
  "westface-slope": "Westface Slope",
  "pine-creek": "Pine Creek",
  "mirror-pond": "Mirror Pond",
  "willow-reach": "Willow Reach",
  "high-look": "High Look",
  "glacial-erratic": "the mismatched boulder",
  "exposed-bedrock": "knob bedrock"
};

export function createSummitState() {
  return {
    byPuzzle: {},
    conceptsExplained: [],
    misconceptionsAddressed: [],
    idea: false,
    ideaSeen: false,
    turns: 0,
    struggle: { puzzleId: "", fails: 0, lastKind: "" },
    recent: [],
    lastIntent: "",
    lastLevel: 0
  };
}

export function puzzleSlot(state, puzzleId) {
  if (!state.byPuzzle[puzzleId]) {
    state.byPuzzle[puzzleId] = { level: 0, hintAsks: 0, concepts: [], misconceptions: [] };
  }
  return state.byPuzzle[puzzleId];
}

export function activePuzzleId(use, { aarOpen = false, aarEligible = false } = {}) {
  if (aarOpen || (aarEligible && !use["CH-09"])) return "CH-09";
  return PLAY_ORDER.find((id) => id !== "CH-09" && !use[id]) || "CH-09";
}

export function puzzleStage(id, ctx, use) {
  if (id === "CH-09") {
    if (ctx.aarOpen) return "aar-claim";
    if (use["CH-09"]) return "cleared";
    return "ready-to-debrief";
  }
  if (use[id]) return "complete";
  if (id === "CH-03" && ctx.flumeState?.prediction && !ctx.hasFairComparison) return "testing";
  if (id === "CH-07" && ctx.puzzleState?.systems?.active) return "mapping";
  if (id === "CH-07" && ctx.puzzleState?.systems?.predict) return "predict";
  return "in-progress";
}

function nearLabels(player, region, catalog) {
  const x = player?.x || 0;
  const y = player?.y || 0;
  const hits = [];
  for (const feat of region?.features || []) {
    if (Math.hypot((feat.x || 0) - x, (feat.y || 0) - y) < 90) hits.push(PLACE_NAMES[feat.id] || feat.name || feat.id);
  }
  for (const item of catalog?.items || []) {
    if (Math.hypot((item.x || 0) - x, (item.y || 0) - y) < 90) hits.push(PLACE_NAMES[item.id] || item.id);
  }
  return [...new Set(hits)].slice(0, 4);
}

function rawFlume(flumeState) {
  const trials = (flumeState?.trials || []).map((row) => ({
    slope: row.slope,
    water: row.water,
    seconds: row.seconds,
    fair: Boolean(row.fair)
  }));
  const fair = fairTrials(flumeState || { trials: [] }).map((row) => ({
    slope: row.slope,
    seconds: row.seconds,
    water: row.water
  }));
  return {
    prediction: flumeState?.prediction || null,
    unfairAttempted: Boolean(flumeState?.unfairAttempted),
    trials,
    fairTrials: fair
  };
}

export function buildSummitContext(input) {
  const {
    regionId = "cedar-hollow",
    player = { x: 0, y: 0 },
    region = {},
    catalog = { items: [] },
    missionState = {},
    discoveryState = { foundIds: [] },
    invState = {},
    flumeState = {},
    dataState = { datasets: {} },
    challengeState = {},
    puzzleState = createEmptyPuzzle(),
    puzzleSpec = { puzzles: [] },
    aarSpec = { claims: [] },
    flumeSpec = { slopes: [] },
    investigation = {},
    aarOpen = false,
    aarIndex = 0,
    summitState = createSummitState(),
    systemsPrompt = null
  } = input;

  const hasFair = hasFairComparison(flumeState, flumeSpec);
  const use = puzzleUse({
    missionState,
    invState,
    flumeState,
    dataState,
    challengeState,
    obsIntState: invState.obsInt,
    puzzleState,
    investigation,
    hasFairComparison: hasFair
  });
  const missing = incompletePuzzles(puzzleSpec, use);
  const aarReady = missing.length === 0;
  const puzzleId = activePuzzleId(use, { aarOpen, aarEligible: aarReady });
  const puzzle = (puzzleSpec.puzzles || []).find((item) => item.id === puzzleId) || null;
  const tablet = tabletEvidence(puzzleSpec, use, {
    missionState,
    invState,
    flumeState,
    dataState,
    challengeState,
    puzzleState
  });
  const claims = claimsForAttempt(aarSpec, (puzzleState.aar?.attempts || 0) + 1);
  const claim = aarOpen ? claims[aarIndex] || claims[0] : null;
  const pinned = claim ? selectedIds(puzzleState.aar?.answers, claim.id) : [];
  const judged = claim && pinned.length ? judgeClaim(claim, pinned) : puzzleState.aar?.lastJudge || null;
  const flow = dataState.datasets?.["cedar-hollow-flow"];
  const observations = (missionState.observations || []).map((row) => row.featureId || row.id).filter(Boolean);
  const found = discoveryState.foundIds || [];

  return {
    regionId,
    location: {
      x: player.x,
      y: player.y,
      near: regionId === "cedar-hollow" ? nearLabels(player, region, catalog) : []
    },
    activePuzzleId: puzzleId,
    puzzleName: puzzle?.name || puzzleId,
    puzzleStage: puzzleStage(puzzleId, { flumeState, hasFairComparison: hasFair, puzzleState, aarOpen }, use),
    competencyIds: puzzle?.competencyIds || [],
    observations,
    foundIds: found,
    measuredIds: invState.measuredIds || [],
    predictions: {
      flume: flumeState.prediction || null,
      pulse: challengeState.pulsePredict || null
    },
    evidenceEarned: Object.entries(use)
      .filter(([id, ok]) => ok && id !== "CH-09")
      .map(([id]) => id),
    evidenceMissing: missing,
    tablet,
    raw: {
      flume: rawFlume(flumeState),
      graph: {
        interpreted: Boolean(flow?.interpreted),
        xField: flow?.xField || null,
        yField: flow?.yField || null,
        rowCount: (flow?.rows || []).length
      }
    },
    rejected: {
      lastHint: invState.lastHint || challengeState.lastHint || flumeState.lastHint || "",
      conflictSeen: Boolean(puzzleState.conflict?.seen),
      unfairAttempted: Boolean(flumeState.unfairAttempted)
    },
    revisions: {
      conflictRepaired: Boolean(puzzleState.conflict?.repaired),
      flumeRevised: Boolean(flumeState.setupRevised),
      landscapeAttempts: invState.attempts || 0
    },
    aar: {
      open: Boolean(aarOpen),
      eligible: aarReady,
      result: puzzleState.aar?.result || null,
      claimId: claim?.id || null,
      claimText: claim?.wren || "",
      required: claim?.required || [],
      useful: claim?.useful || [],
      misconception: claim?.misconception || [],
      pinned,
      pinnedNotes: tablet.filter((row) => pinned.includes(row.id)),
      judged,
      lastJudge: puzzleState.aar?.lastJudge || judged
    },
    puzzlesComplete: PLAY_ORDER.filter((id) => use[id]),
    puzzlesIncomplete: PLAY_ORDER.filter((id) => !use[id]),
    systemsPrompt: systemsPrompt
      ? { kind: systemsPrompt.kind, prompt: systemsPrompt.prompt, where: systemsPrompt.where }
      : null,
    summit: {
      level: puzzleSlot(summitState, puzzleId).level,
      hintAsks: puzzleSlot(summitState, puzzleId).hintAsks,
      conceptsExplained: [...(summitState.conceptsExplained || [])],
      misconceptionsAddressed: [...(summitState.misconceptionsAddressed || [])],
      idea: Boolean(summitState.idea),
      turns: summitState.turns || 0,
      struggle: { ...(summitState.struggle || {}) }
    },
    use
  };
}

function createEmptyPuzzle() {
  return {
    siteReads: {},
    systems: { roles: {}, predict: null, concluded: false, active: false },
    conflict: { seen: false, repaired: false, seed: "crate-marsh" },
    aar: { itemIds: [], answers: {}, result: null, attempts: 0, remediation: [], lastJudge: null }
  };
}
