/**
 * Mastery evidence. Content completion is not travel clearance.
 * Player-facing copy never includes standards codes or scores.
 */

export function createMasteryState() {
  return { records: [] };
}

export function competencyById(profile, id) {
  return profile.competencies.find((item) => item.id === id) || null;
}

export function recordEvidence(state, entry) {
  const record = {
    id: entry.id || `ev-${state.records.length + 1}`,
    competencyId: entry.competencyId,
    regionId: entry.regionId || "cedar-hollow",
    source: entry.source || "gameplay",
    type: entry.type || entry.kind,
    kind: entry.kind,
    action: entry.action || "",
    result: entry.result || "recorded",
    strength: entry.strength || "developing",
    confidence: entry.confidence ?? 0.6,
    attempts: entry.attempts ?? 1,
    at: entry.at ?? Date.now(),
    session: entry.session || null,
    demonstrated: entry.demonstrated === true,
    synthetic: entry.synthetic === true
  };
  state.records = [...state.records, record];
  return record;
}

export function recordsFor(state, competencyId) {
  return state.records.filter((item) => item.competencyId === competencyId);
}

export function gameplaySnapshot({
  discoveryState,
  missionState,
  invState,
  flumeState,
  dataState,
  challengeState,
  flumeSpec,
  obsIntState,
  puzzleState
}) {
  const challengeMeasured = challengeState?.measuredIds?.length || 0;
  const roles = new Set(challengeState?.workingRoles || []);
  return {
    foundCount: discoveryState?.foundIds?.length || 0,
    observationCount: missionState?.observations?.length || 0,
    measurementCount: (invState?.measuredIds?.length || 0) + challengeMeasured,
    waterComplete: Boolean(missionState?.concluded),
    landscapeComplete: Boolean(invState?.concluded),
    landscapeAttempts: invState?.attempts || 0,
    landscapeInterpreted: Boolean(invState?.interpreted),
    fairVariableTest: Boolean(flumeSpec && flumeState && hasFairFlag(flumeState, flumeSpec)),
    dataInterpreted: Boolean(dataState?.datasets?.["cedar-hollow-flow"]?.interpreted),
    dataRevised: Boolean(dataState?.datasets?.["cedar-hollow-flow"]?.revised),
    setupRevised: Boolean(flumeState?.setupRevised),
    challengeConcluded: Boolean(challengeState?.concluded),
    challengePresented: Boolean(puzzleState?.aar?.result === "clearance"),
    challengeRevised: Boolean(challengeState?.conflicted || (challengeState?.revised && challengeState?.conflicted)),
    challengeObserved: (challengeState?.observedIds?.length || 0) >= 1,
    challengeSystems: Boolean(
      (challengeState?.concluded &&
        roles.has("weather") &&
        roles.has("join") &&
        roles.has("source")) ||
        puzzleState?.systems?.concluded
    ),
    obsIntCount: (obsIntState?.sorts || invState?.classifications || []).filter((row) => row.ok).length,
    conflictRepaired: Boolean(puzzleState?.conflict?.repaired)
  };
}

function hasFairFlag(flumeState, flumeSpec) {
  const need = flumeSpec.minTrialsPerSlope || 2;
  const per = {};
  for (const trial of flumeState.trials || []) {
    if (!trial.fair) continue;
    per[trial.slope] = (per[trial.slope] || 0) + 1;
  }
  return (flumeSpec.slopes || []).every((slope) => (per[slope.id] || 0) >= need);
}

export function isContentComplete(snapshot, profile) {
  const need = profile?.contentCompletion?.discoveries ?? 12;
  return Boolean(
    snapshot.waterComplete &&
      snapshot.landscapeComplete &&
      snapshot.foundCount >= need
  );
}

function derivedRecord(competencyId, kind, source, snapshot, extra = {}) {
  return {
    competencyId,
    regionId: extra.regionId || "cedar-hollow",
    source,
    type: kind,
    kind,
    action: extra.action || kind,
    result: extra.result || "demonstrated",
    strength: extra.strength || "strong",
    confidence: extra.confidence ?? 0.85,
    attempts: extra.attempts ?? 1,
    at: extra.at || 1,
    demonstrated: true,
    synthetic: false
  };
}

export function deriveGameplayRecords(snapshot, regionId = "cedar-hollow") {
  const records = [];
  const extra = { regionId };
  if (snapshot.obsIntCount >= 2) {
    records.push(
      derivedRecord("observation", "obs-int-sort", "observation", snapshot, {
        ...extra,
        action: "sort-observation-interpretation",
        attempts: snapshot.obsIntCount
      })
    );
  }
  if (snapshot.observationCount >= 3) {
    records.push(
      derivedRecord("evidence", "mission-observation", "observation", snapshot, {
        ...extra,
        action: "record-field-notes",
        attempts: snapshot.observationCount
      })
    );
  }
  if (snapshot.measurementCount >= 1) {
    records.push(
      derivedRecord("evidence", "field-measurement", "measurement", snapshot, {
        ...extra,
        action: "measure",
        attempts: snapshot.measurementCount
      })
    );
  }
  if (snapshot.waterComplete) {
    records.push(
      derivedRecord("patterns", "water-path", "investigation", snapshot, {
        ...extra,
        action: "trace-water"
      })
    );
  }
  if (snapshot.challengeSystems) {
    records.push(
      derivedRecord("systems", "systems-link", "investigation", snapshot, {
        ...extra,
        action: "rain-slope-tributary"
      })
    );
  }
  if (snapshot.landscapeComplete) {
    records.push(
      derivedRecord("explanation", "supported-explanation", "explanation", snapshot, {
        ...extra,
        action: "construct-explanation",
        attempts: snapshot.landscapeAttempts
      })
    );
  }
  if (snapshot.landscapeComplete && snapshot.landscapeAttempts > 1) {
    records.push(
      derivedRecord("revision", "revised-explanation", "explanation", snapshot, {
        ...extra,
        action: "revise-after-conflict",
        attempts: snapshot.landscapeAttempts
      })
    );
  }
  if (snapshot.fairVariableTest) {
    records.push(
      derivedRecord("variables", "variable-test", "investigation", snapshot, {
        ...extra,
        action: "fair-slope-comparison"
      })
    );
  }
  if (snapshot.dataInterpreted) {
    records.push(
      derivedRecord("data", "dataset-interpret", "data-analysis", snapshot, {
        ...extra,
        action: "interpret-flow-graph"
      })
    );
    records.push(
      derivedRecord("patterns", "water-path", "investigation", snapshot, {
        ...extra,
        action: "graph-trend"
      })
    );
  }
  if (snapshot.challengeConcluded) {
    records.push(
      derivedRecord("explanation", "supported-explanation", "explanation", snapshot, {
        ...extra,
        action: "challenge-explanation"
      })
    );
  }
  if (snapshot.challengePresented) {
    records.push(
      derivedRecord("communication", "present-findings", "regional-challenge", snapshot, {
        ...extra,
        action: "after-action-report"
      })
    );
  }
  if (snapshot.setupRevised || snapshot.dataRevised || snapshot.challengeRevised || snapshot.conflictRepaired) {
    records.push(
      derivedRecord("revision", "revised-explanation", "explanation", snapshot, {
        ...extra,
        action: "revise-model"
      })
    );
  }
  return records;
}

export function syncFromGameplay(state, snapshot, regionId = "cedar-hollow") {
  const keep = state.records.filter((item) => item.synthetic || item.regionId !== "cedar-hollow");
  state.records = [...keep, ...deriveGameplayRecords(snapshot, regionId)];
  return state;
}

function kindCount(state, competencyId, kind) {
  return recordsFor(state, competencyId).filter((item) => item.kind === kind).reduce((sum, item) => {
    return sum + Math.max(1, item.attempts || 1);
  }, 0);
}

export function competencyStatus(profile, state, competencyId) {
  const spec = competencyById(profile, competencyId);
  if (!spec) return "not-yet-observed";
  let met = 0;
  for (const req of spec.requires) {
    const n = kindCount(state, competencyId, req.kind);
    if (n >= (req.count || 1)) met += 1;
    else if (n > 0) {
      return "developing";
    }
  }
  if (met === spec.requires.length) return "demonstrated";
  if (met > 0) return "developing";
  return "not-yet-observed";
}

export function fieldRecord(profile, state) {
  return profile.competencies
    .filter((item) => item.fieldRecord)
    .map((item) => {
      const status = competencyStatus(profile, state, item.id);
      return {
        id: item.id,
        label: item.studentLabel,
        status,
        statusLabel: profile.statusWords[status === "not-yet-observed" ? "none" : status],
        elicitedNow: item.elicitedNow !== false
      };
    });
}

export function journeyRecord(profiles, state) {
  return (profiles || [])
    .map((profile) => ({
      regionId: profile.regionId,
      title: profile.regionTitle || profile.curriculumTitle,
      items: fieldRecord(profile, state)
    }))
    .filter((block) => block.items.length);
}

export function missingEvidence(profile, state) {
  return profile.travelRequirements
    .map((id) => competencyById(profile, id))
    .filter(Boolean)
    .filter((item) => competencyStatus(profile, state, item.id) !== "demonstrated")
    .map((item) => {
      const unmet = item.requires.filter((req) => kindCount(state, item.id, req.kind) < (req.count || 1));
      return {
        id: item.id,
        studentLabel: item.studentLabel,
        internalLabel: item.internalLabel,
        elicitedNow: item.elicitedNow !== false,
        missingKinds: unmet.map((req) => req.kind),
        missingNote: item.missingNote || null
      };
    });
}

export function regionMastered(profile, state) {
  return missingEvidence(profile, state).length === 0;
}

export function remediationLine(profile, state) {
  const missing = missingEvidence(profile, state);
  if (!missing.length) return "";
  const preferred = missing.find((item) => item.id === "data") || missing.find((item) => item.id === "variables") || missing[0];
  return profile.remediationVoice[preferred.id] || profile.remediationVoice.fallback;
}

export function simulateMastery(profile, state, regionId = "cedar-hollow") {
  const at = Date.now();
  for (const id of profile.travelRequirements) {
    const spec = competencyById(profile, id);
    if (!spec) continue;
    for (const req of spec.requires) {
      recordEvidence(state, {
        competencyId: id,
        regionId,
        source: "development-harness",
        kind: req.kind,
        type: req.kind,
        action: "simulate-mastery",
        result: "demonstrated",
        strength: "strong",
        confidence: 1,
        attempts: req.count || 1,
        at,
        demonstrated: true,
        synthetic: true
      });
    }
  }
  return state;
}

export function playerFacingMasteryStrings(profile, world) {
  const text = [];
  if (profile) {
    for (const item of profile.competencies) {
      text.push(item.studentLabel, item.internalLabel, item.description);
    }
    text.push(profile.remediationVoice.data, profile.remediationVoice.variables, profile.remediationVoice.fallback);
    text.push(...Object.values(profile.statusWords));
  }
  if (world) {
    for (const region of world.regions || []) {
      text.push(
        region.name,
        region.subtitle,
        region.shortPreview,
        region.visualIdentity,
        region.curriculumTitle,
        region.lockCopy,
        region.travelCopy
      );
    }
  }
  return text.filter(Boolean);
}
