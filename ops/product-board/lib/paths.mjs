import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Product Board package root (`ops/product-board`). */
export const BOARD_ROOT = path.resolve(__dirname, "..");

/** Repository root. */
export const REPO_ROOT = path.resolve(BOARD_ROOT, "../..");

/** Recovered Engineering OS root. */
export const ENG_ROOT = path.join(REPO_ROOT, "engineering");

export const GATES_DIR = path.join(BOARD_ROOT, "gates");
export const SUBSCRIBER_READY_GATE = path.join(
  GATES_DIR,
  "subscriber-ready.json"
);
export const ROLES_INDEX = path.join(BOARD_ROOT, "roles", "index.json");
export const INVENTORY_PATH = path.join(BOARD_ROOT, "INVENTORY.md");

/** Override with WAYPOINT_PRODUCT_BOARD_STATE_DIR for isolated tests. */
export function getStateDir() {
  return (
    process.env.WAYPOINT_PRODUCT_BOARD_STATE_DIR ||
    path.join(BOARD_ROOT, "state")
  );
}

export function getBoardStatePath() {
  return path.join(getStateDir(), "board.json");
}

export function getBacklogPath() {
  return path.join(getStateDir(), "backlog.json");
}

/** @deprecated Prefer getStateDir() — kept for call sites expecting a string. */
export const STATE_DIR = path.join(BOARD_ROOT, "state");
export const BOARD_STATE_PATH = path.join(STATE_DIR, "board.json");
export const BACKLOG_PATH = path.join(STATE_DIR, "backlog.json");
