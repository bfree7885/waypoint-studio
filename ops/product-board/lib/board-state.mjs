import { readJson, writeJson, nowIso } from "./io.mjs";
import { getBoardStatePath } from "./paths.mjs";
import { LOOP_PHASES } from "./roles.mjs";

export const DEFAULT_BOARD_STATE = Object.freeze({
  version: 1,
  updatedAt: null,
  mode: "idle",
  phase: "discover",
  activeItemId: null,
  activeRole: "product-director",
  campaign: null,
  lastCommand: null,
  lastCommandAt: null,
  releaseGate: {
    status: "not_run",
    lastRunAt: null,
    verdict: null,
    blockingFindings: [],
    evidenceRunId: null,
    commercial: null,
    redTeam: null
  },
  attestationsNote:
    "Record with: node ops/product-board/board.mjs attest --criterion ID --role ROLE --verdict pass|fail|waive",
  routing: {
    openRepairQueue: [],
    lastFailureId: null
  },
  loopHistory: [],
  notes: [
    "Product Board recovered Engineering OS under engineering/.",
    "Run: node ops/product-board/board.mjs status"
  ]
});

export function loadBoardState() {
  const state = readJson(getBoardStatePath(), DEFAULT_BOARD_STATE);
  if (!LOOP_PHASES.includes(state.phase)) state.phase = "discover";
  return state;
}

export function saveBoardState(state) {
  state.updatedAt = nowIso();
  writeJson(getBoardStatePath(), state);
  return state;
}

export function appendLoopEvent(state, event, detail = {}) {
  state.loopHistory = state.loopHistory || [];
  state.loopHistory.push({
    at: nowIso(),
    event,
    phase: state.phase,
    ...detail
  });
  if (state.loopHistory.length > 200) {
    state.loopHistory = state.loopHistory.slice(-200);
  }
}
