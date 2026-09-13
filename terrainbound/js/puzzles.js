/**
 * Cedar Hollow Layer A puzzle state.
 * Science use is derived from world work. Reasoning is the After Action Report.
 */

export function createPuzzleState() {
  return {
    siteReads: {},
    systems: { roles: {}, predict: null, concluded: false, active: false },
    conflict: { seen: false, repaired: false, seed: "crate-marsh" },
    aar: { itemIds: [], answers: {}, result: null, attempts: 0, remediation: [], lastJudge: null }
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

export function systemsSiteById(spec, id) {
  return (spec?.systems?.sites || []).find((item) => item.id === id) || null;
}

export function systemsSiteForWorld(spec, worldId) {
  if (!worldId) return null;
  return (spec?.systems?.sites || []).find((item) => (item.worldIds || []).includes(worldId)) || null;
}

export function currentSystemsPrompt(state, spec) {
  const roles = spec?.systems?.roles || [];
  const next = roles.find((role) => !state.systems.roles[role.id]);
  if (next) {
    const assigned = systemsSiteById(spec, state.systems.roles[next.id]);
    return { kind: "role", role: next, assigned, prompt: next.prompt, where: next.where };
  }
  if (!state.systems.predict) {
    return {
      kind: "predict",
      prompt: spec.systems.predict.prompt,
      where: spec.systems.predict.where,
      role: null
    };
  }
  if (!state.systems.concluded) {
    return { kind: "ready", prompt: "That's one event with parts. Check it against the land.", where: "Back to the hollow" };
  }
  return { kind: "done", prompt: "The hollow is one event with parts.", where: "" };
}

export function trySystemsTap(state, spec, siteId) {
  const site = systemsSiteById(spec, siteId);
  if (!site) return { ok: false, hint: "Tap a place you walked." };
  const prompt = currentSystemsPrompt(state, spec);
  if (prompt.kind === "role") {
    if (site.role !== prompt.role.id) {
      const hint = site.hints?.[prompt.role.id] || prompt.role.miss;
      return { ok: false, hint, site };
    }
    state.systems.roles = { ...state.systems.roles, [prompt.role.id]: site.id };
    return { ok: true, site, roleId: prompt.role.id };
  }
  if (prompt.kind === "predict") {
    state.systems.predict = site.id;
    if (site.id !== spec.systems.predict.ok) {
      const hint = spec.systems.predict.hints?.[site.id] || "The station reach stayed relatively clear.";
      return { ok: false, hint, site };
    }
    return { ok: true, site, predict: true };
  }
  return { ok: false, hint: "That's already on the map." };
}

export function concludeSystems(state, spec) {
  const rolesOk = (spec.systems.roles || []).every((role) => {
    const site = systemsSiteById(spec, state.systems.roles[role.id]);
    return site?.role === role.id;
  });
  if (!rolesOk || state.systems.predict !== spec.systems.predict.ok) {
    return { ok: false, hint: "Every part still needs a place that matches what you walked." };
  }
  state.systems.concluded = true;
  state.systems.active = false;
  return { ok: true };
}

export function completeSystems(state, spec) {
  state.systems.active = true;
  for (const role of spec.systems.roles || []) {
    const site = (spec.systems.sites || []).find((item) => item.role === role.id);
    if (site) trySystemsTap(state, spec, site.id);
  }
  trySystemsTap(state, spec, spec.systems.predict.ok);
  return concludeSystems(state, spec);
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

export function hitSystemsSite(spec, width, height, localX, localY) {
  const x = (localX / width) * 100;
  const y = (localY / height) * 100;
  let best = null;
  let bestD = 12;
  for (const site of spec?.systems?.sites || []) {
    const d = Math.hypot(site.x - x, site.y - y);
    if (d < bestD) {
      bestD = d;
      best = site;
    }
  }
  return best;
}

export function drawSystemsSketch(ctx, width, height, spec, state) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#e7f0d8";
  ctx.fillRect(0, 0, width, height);

  const px = (x) => (x / 100) * width;
  const py = (y) => (y / 100) * height;

  ctx.fillStyle = "#d5e4c4";
  ctx.beginPath();
  ctx.ellipse(px(52), py(22), width * 0.22, height * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3d7ea8";
  ctx.lineWidth = Math.max(3, width / 90);
  ctx.beginPath();
  ctx.moveTo(px(22), py(30));
  ctx.quadraticCurveTo(px(28), py(48), px(36), py(58));
  ctx.quadraticCurveTo(px(48), py(70), px(50), py(90));
  ctx.stroke();

  ctx.strokeStyle = "#5a8fb0";
  ctx.lineWidth = Math.max(2, width / 120);
  ctx.beginPath();
  ctx.moveTo(px(18), py(38));
  ctx.quadraticCurveTo(px(24), py(46), px(30), py(50));
  ctx.stroke();

  ctx.fillStyle = "#8fb7c9";
  ctx.beginPath();
  ctx.ellipse(px(38), py(66), width * 0.07, height * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a9a58";
  ctx.fillRect(px(74), py(46), width * 0.12, height * 0.1);

  ctx.fillStyle = "#6b8f4e";
  ctx.beginPath();
  ctx.ellipse(px(50), py(82), width * 0.08, height * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  const assigned = new Set(Object.values(state?.systems?.roles || {}));
  if (state?.systems?.predict) assigned.add(state.systems.predict);

  ctx.font = `${Math.max(11, Math.round(width / 32))}px Trebuchet MS, sans-serif`;
  ctx.textBaseline = "middle";

  for (const site of spec?.systems?.sites || []) {
    const on = assigned.has(site.id);
    ctx.beginPath();
    ctx.fillStyle = on ? "#2f6b3a" : "#f4efe2";
    ctx.strokeStyle = on ? "#1f4a28" : "#2f6b3a";
    ctx.lineWidth = 2;
    ctx.arc(px(site.x), py(site.y), Math.max(13, width / 24), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const lx = site.lx ?? site.x;
    const ly = site.ly ?? site.y + (site.y > 78 ? -12 : 13);
    const labelW = ctx.measureText(site.label).width;
    let tx = px(lx);
    const ty = py(ly);
    let align = lx < site.x - 1 ? "right" : lx > site.x + 1 ? "left" : "center";
    if (align === "right" && tx - labelW < 6) align = "left";
    if (align === "left" && tx + labelW > width - 6) align = "right";
    if (align === "center") tx = Math.min(width - 6 - labelW / 2, Math.max(6 + labelW / 2, tx));
    else if (align === "right") tx = Math.max(6 + labelW, Math.min(width - 6, tx));
    else tx = Math.min(width - 6 - labelW, Math.max(6, tx));
    ctx.textAlign = align;
    ctx.fillStyle = "rgba(231, 240, 216, 0.92)";
    const pad = 4;
    const left = align === "right" ? tx - labelW - pad : align === "left" ? tx - pad : tx - labelW / 2 - pad;
    ctx.fillRect(left, ty - 8, labelW + pad * 2, 16);
    ctx.fillStyle = on ? "#1f4a28" : "#243226";
    ctx.fillText(site.label, tx, ty);
  }
}

function evidenceNote(id, ctx) {
  if (id === "CH-01") return "Sorted seen sentences from guessed sentences at two sites.";
  if (id === "CH-02") return "Traced last night's water from high ground to still-moving water.";
  if (id === "CH-03") return "Fair slope trials on the runoff table. Extra water was a second change.";
  if (id === "CH-04") return "Read the pattern in the times I actually recorded.";
  if (id === "CH-05") return "Rain, a loose slope, and Fox Run — not the whole creek equally.";
  if (id === "CH-06") return "Last night's creek is one clock. The mismatched boulder needs a longer one.";
  if (id === "CH-07") return "Rain, Westface, Fox Run, the marsh, and the willows took part as one event — not four separate stories.";
  if (id === "CH-08") return "A first story broke. The repaired case dropped the false cause.";
  return "";
}
