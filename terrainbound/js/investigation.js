/**
 * Reading the Landscape — evidence, measurements, hypothesis.
 * No DOM. Curriculum metadata stays off the player path.
 */

export function createInvestigationState() {
  return {
    introSeen: false,
    active: false,
    measuredIds: [],
    evidenceIds: [],
    selectedProcess: null,
    selectedEvidenceIds: [],
    lastHint: "",
    concluded: false,
    interpreted: false,
    attempts: 0
  };
}

export function evidenceById(investigation, id) {
  return investigation.evidence.find((item) => item.id === id) || null;
}

export function measurementById(investigation, id) {
  return investigation.measurements.find((item) => item.id === id) || null;
}

export function isMeasured(state, id) {
  return state.measuredIds.includes(id);
}

export function hasEvidence(state, id) {
  return state.evidenceIds.includes(id);
}

export function shouldIntroduceInvestigation(state, discoveryState, missionComplete) {
  if (state.introSeen) return false;
  if (missionComplete) return true;
  if (discoveryState.foundIds.includes("glacial-erratic")) return true;
  return discoveryState.foundIds.length >= 3;
}

export function beginInvestigation(state, investigation, discoveryState) {
  state.introSeen = true;
  state.active = true;
  syncPassiveEvidence(state, investigation, discoveryState);
  return state;
}

export function syncPassiveEvidence(state, investigation, discoveryState) {
  if (!state.active) return state;
  const found = new Set(discoveryState.foundIds);
  for (const card of investigation.evidence) {
    if (card.source !== "discovery") continue;
    if (!found.has(card.discoveryId)) continue;
    if (!state.evidenceIds.includes(card.id)) {
      state.evidenceIds = [...state.evidenceIds, card.id];
    }
  }
  return state;
}

export function recordMeasurement(state, investigation, measurementId, discoveryState) {
  const spec = measurementById(investigation, measurementId);
  if (!spec) return { ok: false, reason: "unknown" };
  if (discoveryState && !requirementsMet(spec, discoveryState)) {
    return { ok: false, reason: "unfound", spec };
  }
  if (isMeasured(state, spec.id)) return { ok: true, already: true, spec };
  state.measuredIds = [...state.measuredIds, spec.id];
  if (spec.evidenceId && !state.evidenceIds.includes(spec.evidenceId)) {
    state.evidenceIds = [...state.evidenceIds, spec.evidenceId];
  }
  return { ok: true, already: false, spec };
}

function requirementsMet(measurement, discoveryState) {
  return measurement.requires.every((id) => discoveryState.foundIds.includes(id));
}

export function availableMeasurementAt(investigation, state, discoveryState, discoveryId) {
  if (!state.active || state.concluded) return null;
  for (const spec of investigation.measurements) {
    if (!spec.siteIds.includes(discoveryId)) continue;
    if (isMeasured(state, spec.id)) continue;
    if (!requirementsMet(spec, discoveryState)) continue;
    return spec;
  }
  return null;
}

export function blockedMeasurementAt(investigation, state, discoveryState, discoveryId) {
  if (!state.active || state.concluded) return null;
  for (const spec of investigation.measurements) {
    if (!spec.siteIds.includes(discoveryId)) continue;
    if (isMeasured(state, spec.id)) continue;
    if (requirementsMet(spec, discoveryState)) continue;
    return spec;
  }
  return null;
}

export function requiredMeasurementsComplete(investigation, state) {
  const needed = investigation.hypothesis.requiredEvidenceIds
    .map((id) => evidenceById(investigation, id))
    .filter((card) => card?.source === "measurement")
    .map((card) => card.measurementId);
  return needed.every((id) => isMeasured(state, id));
}

export function canProposeExplanation(investigation, state) {
  return state.active && !state.concluded && requiredMeasurementsComplete(investigation, state);
}

export function evidenceModel(investigation, state) {
  const found = investigation.evidence.filter((card) => hasEvidence(state, card.id));
  const groups = investigation.timescales.map((scale) => ({
    id: scale.id,
    label: scale.label,
    cards: found.filter((card) => card.timescale === scale.id)
  }));
  return {
    active: state.active,
    concluded: state.concluded,
    interpreted: state.interpreted,
    cards: found,
    groups: groups.filter((group) => group.cards.length),
    hiddenIds: investigation.evidence.filter((card) => !hasEvidence(state, card.id)).map((card) => card.id)
  };
}

export function logRevealsEvidenceTitle(model, title) {
  return model.cards.some((card) => card.title === title);
}

export function sketchModel(investigation, state) {
  const marks = investigation.evidence
    .filter((card) => hasEvidence(state, card.id) && card.sketch)
    .map((card) => ({
      id: card.id,
      timescale: card.timescale,
      ...card.sketch
    }));
  return {
    marks,
    iceArrows: state.interpreted === true,
    connections: state.interpreted
      ? [
          ["transported-boulder", "bedrock-grooves"],
          ["bedrock-grooves", "rounded-valley"],
          ["rounded-valley", "pond-basin"]
        ].filter(([a, b]) => hasEvidence(state, a) && hasEvidence(state, b))
      : []
  };
}

export function toggleSelectedEvidence(state, evidenceId) {
  if (!hasEvidence(state, evidenceId)) return state;
  if (state.concluded) return state;
  if (state.selectedEvidenceIds.includes(evidenceId)) {
    state.selectedEvidenceIds = state.selectedEvidenceIds.filter((id) => id !== evidenceId);
  } else {
    state.selectedEvidenceIds = [...state.selectedEvidenceIds, evidenceId];
  }
  return state;
}

export function setSelectedProcess(state, processId) {
  if (state.concluded) return state;
  state.selectedProcess = processId;
  return state;
}

export function clearHypothesisDraft(state) {
  if (state.concluded) return state;
  state.selectedProcess = null;
  state.selectedEvidenceIds = [];
  state.lastHint = "";
  return state;
}

function allModern(investigation, evidenceIds) {
  const modern = new Set(investigation.hypothesis.modernEvidenceIds || []);
  return evidenceIds.length > 0 && evidenceIds.every((id) => modern.has(id));
}

export function evaluateHypothesis(investigation, state, processId, evidenceIds) {
  const spec = investigation.hypothesis;
  state.attempts += 1;
  state.selectedProcess = processId || null;
  state.selectedEvidenceIds = [...(evidenceIds || [])];

  if (state.concluded) {
    return { ok: true, already: true, successText: spec.success };
  }
  if (!processId) {
    state.lastHint = spec.noProcess;
    return { ok: false, reason: "no-process", hint: spec.noProcess };
  }
  if (!evidenceIds.length) {
    state.lastHint = spec.noEvidence;
    return { ok: false, reason: "no-evidence", hint: spec.noEvidence };
  }
  if (evidenceIds.some((id) => !hasEvidence(state, id))) {
    state.lastHint = spec.unrecorded;
    return { ok: false, reason: "unrecorded", hint: spec.unrecorded };
  }

  if (processId !== spec.requiredProcess) {
    const hint = spec.weakResponses[processId] || spec.weakResponses["flowing-water"];
    state.lastHint = hint;
    return { ok: false, reason: "weak-process", hint };
  }

  const required = spec.requiredEvidenceIds;
  const hasRequired = required.every((id) => evidenceIds.includes(id));
  if (!hasRequired) {
    if (allModern(investigation, evidenceIds)) {
      state.lastHint = spec.iceWithoutHistory;
      return { ok: false, reason: "modern-only", hint: spec.iceWithoutHistory };
    }
    const missing = required.find((id) => !evidenceIds.includes(id));
    const hint = spec.missing[missing] || spec.iceWithoutHistory;
    state.lastHint = hint;
    return { ok: false, reason: "missing-history", hint, missing };
  }

  state.concluded = true;
  state.interpreted = true;
  state.lastHint = spec.success;
  return { ok: true, reason: "success", successText: spec.success };
}

export function nextLandscapeHint(investigation, state, discoveryState) {
  if (!state.active || state.concluded) return null;
  for (const spec of investigation.measurements) {
    if (isMeasured(state, spec.id)) continue;
    const hint = investigation.wren.hints[spec.id];
    const foundReq = spec.requires.filter((id) => discoveryState.foundIds.includes(id));
    if (foundReq.length < spec.requires.length || !hint) {
      return hint || investigation.wren.activeNudge;
    }
    return hint;
  }
  if (canProposeExplanation(investigation, state)) {
    return investigation.wren.ready[0];
  }
  return investigation.wren.activeNudge;
}

export function pickLandscapeWren(investigation, state, discoveryState) {
  if (state.concluded) return [...investigation.wren.afterSuccess];
  if (canProposeExplanation(investigation, state)) return [...investigation.wren.ready];
  const hint = nextLandscapeHint(investigation, state, discoveryState);
  return [investigation.wren.activeNudge, hint].filter(Boolean);
}

export function interpretiveLabels(investigation, state, catalog, region, player, range = 150) {
  if (!state.interpreted) return [];
  const labels = [];
  for (const spec of investigation.worldLabels || []) {
    let x = 0;
    let y = 0;
    if (spec.kind === "discovery") {
      const item = catalog.items.find((entry) => entry.id === spec.id);
      if (!item) continue;
      x = item.x;
      y = item.y;
    } else {
      const feature = region.features.find((entry) => entry.id === spec.id);
      if (!feature) continue;
      x = feature.x;
      y = feature.y;
    }
    const d = Math.hypot(player.x - x, player.y - y);
    if (d > range) continue;
    labels.push({ x, y, text: spec.text });
  }
  return labels;
}

export function playerFacingInvestigationText(investigation) {
  const texts = [
    investigation.title,
    investigation.question,
    ...(investigation.intro?.lines || []),
    ...(investigation.wren?.ready || []),
    ...(investigation.wren?.afterSuccess || []),
    investigation.wren?.activeNudge,
    ...Object.values(investigation.wren?.hints || {}),
    investigation.hypothesis?.success,
    investigation.hypothesis?.noProcess,
    investigation.hypothesis?.noEvidence,
    investigation.hypothesis?.unrecorded,
    investigation.hypothesis?.iceWithoutHistory,
    ...Object.values(investigation.hypothesis?.weakResponses || {}),
    ...Object.values(investigation.hypothesis?.missing || {}),
    investigation.completeJournalEntry?.title,
    investigation.completeJournalEntry?.text
  ];
  for (const item of investigation.measurements || []) {
    texts.push(item.actionLabel, item.prompt, item.result, item.missingHint);
  }
  for (const card of investigation.evidence || []) {
    texts.push(card.title, card.observation, card.significance, card.question, card.sketch?.label);
  }
  for (const process of investigation.processes || []) texts.push(process.label);
  for (const label of investigation.worldLabels || []) texts.push(label.text);
  return texts.filter(Boolean);
}

export function drawFieldSketch(ctx, width, height, investigation, sketch) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#efe6d2";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#cbbca0";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  const px = (x) => (x / 100) * width;
  const py = (y) => (y / 100) * height;

  ctx.strokeStyle = "#b7a888";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px(18), py(18));
  ctx.quadraticCurveTo(px(50), py(78), px(84), py(22));
  ctx.stroke();

  ctx.strokeStyle = "#6a8f4e";
  ctx.beginPath();
  ctx.ellipse(px(62), py(20), 28, 16, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#3d7ea8";
  ctx.beginPath();
  ctx.moveTo(px(36), py(28));
  ctx.quadraticCurveTo(px(32), py(48), px(40), py(58));
  ctx.quadraticCurveTo(px(50), py(70), px(48), py(88));
  ctx.stroke();

  ctx.strokeStyle = "#5c6b54";
  ctx.strokeRect(px(76), py(46), 12, 10);

  ctx.font = "10px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#8a7a62";
  ctx.fillText("N", px(8), py(10));
  ctx.fillText("Cedar Hollow — field sketch", px(22), py(10));

  const colorFor = (timescale) => {
    if (timescale === "history") return "#8a6238";
    if (timescale === "river") return "#2f6b3a";
    return "#2f8fbe";
  };

  for (const mark of sketch.marks) {
    const x = px(mark.x);
    const y = py(mark.y);
    ctx.fillStyle = colorFor(mark.timescale);
    ctx.strokeStyle = colorFor(mark.timescale);
    ctx.lineWidth = 1.5;
    if (mark.kind === "grooves") {
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 4);
      ctx.lineTo(x + 10, y + 2);
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 10, y + 6);
      ctx.moveTo(x - 8, y + 4);
      ctx.lineTo(x + 10, y + 10);
      ctx.stroke();
    } else if (mark.kind === "valley") {
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 8);
      ctx.quadraticCurveTo(x, y + 18, x + 22, y - 8);
      ctx.stroke();
    } else if (mark.kind === "pond" || mark.kind === "marsh") {
      ctx.beginPath();
      ctx.ellipse(x, y, mark.kind === "marsh" ? 10 : 8, 5, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4a4030";
    ctx.font = "9px Trebuchet MS, sans-serif";
    ctx.fillText(mark.label, x + 6, y - 4);
  }

  if (sketch.iceArrows) {
    ctx.strokeStyle = "rgba(90, 110, 140, 0.85)";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(28), py(8));
    ctx.lineTo(px(58), py(24));
    ctx.lineTo(px(50), py(70));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(90, 110, 140, 0.9)";
    ctx.beginPath();
    ctx.moveTo(px(50), py(70));
    ctx.lineTo(px(46), py(64));
    ctx.lineTo(px(54), py(66));
    ctx.closePath();
    ctx.fill();
    ctx.font = "9px Trebuchet MS, sans-serif";
    ctx.fillText("inferred former ice", px(30), py(96));
  }
}
