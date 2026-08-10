import { nextPhase, rolesForPhase, LOOP_PHASES } from "./roles.mjs";
import { appendLoopEvent } from "./board-state.mjs";
import { prioritizedQueue } from "./backlog.mjs";
import { nowIso } from "./io.mjs";

/**
 * Advance one step in:
 * DISCOVER → PRIORITIZE → FIX → TEST → VISUAL REVIEW → RED TEAM → RETEST → RELEASE GATE → REPEAT
 */
export function advanceLoop(state, backlog) {
  const from = state.phase || "discover";
  const to = nextPhase(from);
  const queue = prioritizedQueue(backlog);
  const active = queue[0] || null;

  state.phase = to;
  state.mode = "loop";
  state.activeItemId = active ? active.id : null;
  const owners = rolesForPhase(to);
  state.activeRole = owners[0]?.id || state.activeRole;
  if (active && ["fix", "test", "visual_review", "red_team", "retest"].includes(to)) {
    active.status = to === "fix" ? "fix" : to;
    active.assignedRole = state.activeRole;
    active.updatedAt = nowIso();
  }

  appendLoopEvent(state, "loop_advanced", {
    from,
    to,
    activeItemId: state.activeItemId,
    activeRole: state.activeRole
  });

  return {
    from,
    to,
    activeItem: active,
    roles: owners,
    remainingPhases: LOOP_PHASES
  };
}

export function setPhase(state, phase, role = null) {
  if (!LOOP_PHASES.includes(phase)) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  state.phase = phase;
  state.mode = "loop";
  if (role) state.activeRole = role;
  else {
    const owners = rolesForPhase(phase);
    if (owners[0]) state.activeRole = owners[0].id;
  }
  appendLoopEvent(state, "phase_set", { phase, role: state.activeRole });
}
