/**
 * Cedar Hollow Layer A puzzle state.
 * Science use is derived from world work. Reasoning is the After Action Report.
 */

export function createPuzzleState() {
  return {
    siteReads: {},
    systems: { roles: {}, predict: null, concluded: false },
    conflict: { seen: false, repaired: false, seed: "crate-marsh" },
    aar: { itemIds: [], answers: {}, result: null, attempts: 0, remediation: [] }
  };
}

export function layerAIds(spec) {
  return (spec?.puzzles || []).filter((item) => item.layer === "A").map((item) => item.id);
}

export function puzzleById(spec, id) {
  return (spec?.puzzles || []).find((item) => item.id === id) || null;
}

export function puzzleUse(ctx) {
  const roles = new Set(ctx.challengeState?.workingRoles || []);
  const sorts = (ctx.obsIntState?.sorts || []).filter((row) => row.ok).length;
  const revised =
    (ctx.invState?.concluded && (ctx.invState?.attempts || 0) > 1) ||
    Boolean(ctx.challengeState?.conflicted && ctx.challengeState?.revised) ||
    Boolean(ctx.flumeState?.setupRevised) ||
    Boolean(ctx.dataState?.datasets?.["cedar-hollow-flow"]?.revised) ||
    Boolean(ctx.puzzleState?.conflict?.repaired);
  const systemsDone = Boolean(ctx.puzzleState?.systems?.concluded);
  const clocks =
    Boolean(ctx.invState?.concluded) && ctx.invState?.selectedProcess === (ctx.investigation?.hypothesis?.requiredProcess || "two-clocks");
  return {
    "CH-01": sorts >= 2,
    "CH-02": Boolean(ctx.missionState?.concluded),
    "CH-03": Boolean(ctx.hasFairComparison),
    "CH-04": Boolean(ctx.dataState?.datasets?.["cedar-hollow-flow"]?.interpreted),
    "CH-05": Boolean(ctx.challengeState?.concluded) && roles.has("weather") && roles.has("join") && roles.has("source"),
    "CH-06": clocks,
    "CH-07": systemsDone,
    "CH-08": revised,
    "CH-09": ctx.puzzleState?.aar?.result === "clearance"
  };
}

export function incompletePuzzles(spec, use) {
  return layerAIds(spec).filter((id) => id !== "CH-09" && !use[id]);
}

export function aarEligible(spec, use) {
  return incompletePuzzles(spec, use).length === 0;
}

export function classifySite(state, spec, featureId, choiceId) {
  const inquiry = spec?.siteInquiries?.[featureId];
  if (!inquiry) return { ok: false, reason: "none" };
  const option = inquiry.options.find((item) => item.id === choiceId);
  if (!option) return { ok: false, reason: "unknown" };
  const attempts = (state.siteReads[featureId]?.attempts || 0) + 1;
  state.siteReads[featureId] = { choiceId, ok: option.ok, attempts };
  return {
    ok: option.ok,
    already: false,
    hint: option.ok ? inquiry.prompt : option.hint,
    option
  };
}

export function trySystemsRole(state, spec, roleId, optionId) {
  const role = spec.systems.roles.find((item) => item.id === roleId);
  if (!role) return { ok: false, hint: "Choose a part of the system." };
  const option = role.options.find((item) => item.id === optionId);
  if (!option) return { ok: false, hint: "Choose a part of the system." };
  state.systems.roles = { ...state.systems.roles, [roleId]: optionId };
  if (!option.ok) return { ok: false, hint: option.hint };
  return { ok: true };
}

export function trySystemsPredict(state, spec, optionId) {
  const option = spec.systems.predict.options.find((item) => item.id === optionId);
  if (!option) return { ok: false, hint: spec.systems.predict.prompt };
  state.systems.predict = optionId;
  if (!option.ok) return { ok: false, hint: option.hint };
  return { ok: true };
}

export function concludeSystems(state, spec) {
  const rolesOk = spec.systems.roles.every((role) => {
    const pick = role.options.find((item) => item.id === state.systems.roles[role.id]);
    return pick?.ok;
  });
  const pred = spec.systems.predict.options.find((item) => item.id === state.systems.predict);
  if (!rolesOk || !pred?.ok) {
    return { ok: false, hint: "Every part still needs a role that matches what you walked." };
  }
  state.systems.concluded = true;
  return { ok: true };
}

export function tryConflict(state, spec, optionId) {
  const option = spec.conflict.options.find((item) => item.id === optionId);
  if (!option) return { ok: false };
  state.conflict.seen = true;
  if (!option.ok) {
    return { ok: false, hint: option.hint };
  }
  state.conflict.repaired = true;
  return { ok: true };
}

export function tabletEvidence(spec, use, ctx) {
  const rows = [];
  for (const puzzle of spec.puzzles || []) {
    if (!use[puzzle.id] || puzzle.id === "CH-09") continue;
    rows.push({
      id: puzzle.id,
      title: puzzle.name,
      category: puzzle.evidenceCategory,
      competencyIds: puzzle.competencyIds,
      note: evidenceNote(puzzle.id, ctx)
    });
  }
  return rows;
}

function evidenceNote(id, ctx) {
  if (id === "CH-01") return "Sorted seen sentences from guessed sentences at two sites.";
  if (id === "CH-02") return "Traced last night's water from high ground to still-moving water.";
  if (id === "CH-03") return "Fair slope trials on the runoff table. Extra water was a second change.";
  if (id === "CH-04") return "Read the pattern in the times I actually recorded.";
  if (id === "CH-05") return "Rain, a loose slope, and Fox Run — not the whole creek equally.";
  if (id === "CH-06") return "Last night's creek is one clock. The mismatched boulder needs a longer one.";
  if (id === "CH-07") return "Atmosphere, water, and rock took part. Living things were in the way, not the cause.";
  if (id === "CH-08") return "A first story broke. The repaired case dropped the false cause.";
  return "";
}
