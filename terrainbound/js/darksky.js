/**
 * Dark Sky Basin — Topic 11 region engine.
 * DS-01/DS-02 remain the approved 8B foundation. DS-03–10 live in darksky-complete.js.
 * Light as field evidence. Authored catalog. No live astronomy.
 */

export {
  CAIRN_NEAR,
  CAIRN_FAR,
  PLOT_STARS,
  GALAXY_IDS,
  ORIGIN_LINES,
  ds03Complete,
  ds04Complete,
  ds05Complete,
  ds06Complete,
  ds07Complete,
  ds08Complete,
  ds09Complete,
  ds10Complete,
  dsAarEligible,
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
  markRedshiftFeature,
  placeRedshiftPoint,
  logRedshiftTrend,
  rejectCompeting,
  pointHorn,
  pinOrigin,
  logOriginCase,
  setLaterTonight,
  readDistantPoster,
  logLookback,
  toggleEnvelope,
  logEnvelope,
  completePuzzleUse,
  completeAarState,
  drawSeasonPlates,
  drawUnlabeledPlot,
  drawRedshiftPlot,
  drawHornField,
  debugCompleteThrough
} from "./darksky-complete.js";

import {
  completeEmptyFields,
  completeSnapshot,
  markCompleteVisit,
  appendCompleteEvidence,
  appendCompleteNotes,
  appendCompleteTruth,
  completeGuidance,
  completeActivePuzzle,
  completeNext,
  completePuzzleUse,
  ds03Complete,
  ds04Complete,
  ds05Complete,
  ds06Complete,
  ds07Complete,
  ds08Complete,
  ds09Complete,
  ds10Complete,
  dsAarEligible
} from "./darksky-complete.js";

export const DARK_SKY_ID = "dark-sky-basin";
export const TWIN_IDS = ["west-twin", "east-twin"];
export const EMBER_ID = "cooler-ember";
export const LAMP_ID = "cal-lamp";

const WAVE_MIN = 380;
const WAVE_MAX = 760;

export function emptyDarkSkySave() {
  return {
    introSeen: false,
    twinsRadioSeen: false,
    emberRadioSeen: false,
    visitedStation: false,
    visitedLamp: false,
    lampOn: false,
    logRead: false,
    eyepieceSeen: false,
    observedIds: [],
    lampMarkers: [],
    lampCalibrated: false,
    spectrographOpened: false,
    spectrographWashed: false,
    stellarShiftNm: 0,
    stellarTriedAlign: false,
    stellarMarks: [],
    stellarCompared: false,
    twinsConcluded: false,
    emberObserved: false,
    emberPeakMark: null,
    whitePeakMark: null,
    emberCompared: false,
    emberConcluded: false,
    notes: [],
    lastHint: "",
    ...completeEmptyFields()
  };
}

export function snapshotDarkSky(state) {
  const empty = emptyDarkSkySave();
  if (!state) return empty;
  const extra = completeSnapshot(state);
  return {
    ...empty,
    ...state,
    ...extra,
    observedIds: [...(state.observedIds || [])],
    lampMarkers: [...(state.lampMarkers || [])],
    stellarMarks: [...(state.stellarMarks || [])],
    notes: [...(state.notes || [])]
  };
}

export function catalogTarget(catalog, id) {
  return (catalog?.targets || []).find((row) => row.id === id) || null;
}

export function twinTargets(catalog) {
  return TWIN_IDS.map((id) => catalogTarget(catalog, id)).filter(Boolean);
}

export function walkDistance(a, b) {
  return Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
}

export function lampWalkDistance(region) {
  const spawn = region?.spawn || { x: 0, y: 0 };
  const lamp = region?.lampBench || (region?.features || []).find((row) => row.id === "lamp-bench");
  return walkDistance(spawn, lamp);
}

export function atFeature(region, player, id, extra = 0) {
  const feat = (region?.features || []).find((row) => row.id === id);
  if (!feat || !player) return false;
  return Math.hypot(player.x - feat.x, player.y - feat.y) <= (feat.radius || 70) + extra;
}

export function nmToX(nm, width, pad = 28) {
  const t = (clamp(nm, WAVE_MIN, WAVE_MAX) - WAVE_MIN) / (WAVE_MAX - WAVE_MIN);
  return pad + t * (width - pad * 2);
}

export function xToNm(x, width, pad = 28) {
  const t = (x - pad) / Math.max(1, width - pad * 2);
  return clamp(WAVE_MIN + t * (WAVE_MAX - WAVE_MIN), WAVE_MIN, WAVE_MAX);
}

export function sampleContinuum(nm, peakNm) {
  const span = 140;
  const d = (nm - peakNm) / span;
  return Math.max(0.12, Math.exp(-d * d) * 0.86 + 0.14);
}

export function sampleAbsorption(nm, target) {
  let y = sampleContinuum(nm, target.peakNm);
  for (const line of target.lines || []) {
    const d = (nm - line.nm) / 6.2;
    y -= (line.depth || 0.5) * Math.exp(-d * d) * 0.72;
  }
  return clamp(y, 0.04, 1);
}

export function sampleEmission(nm, lamp) {
  let y = 0.08;
  for (const line of lamp.emission || []) {
    const d = (nm - line.nm) / 4.4;
    y += (line.height || 0.8) * Math.exp(-d * d);
  }
  return clamp(y, 0, 1);
}

export function sampleTrace(nm, spec, shiftNm = 0) {
  if (spec?.emission) return sampleEmission(nm - shiftNm, spec);
  return sampleAbsorption(nm - shiftNm, spec);
}

export function alignmentScore(a, b, shiftNm) {
  const linesA = a?.lines || [];
  const linesB = (b?.lines || []).map((line) => ({ ...line, nm: line.nm + shiftNm }));
  if (!linesA.length || !linesB.length) return 1;
  let sum = 0;
  for (const line of linesA) {
    let best = 80;
    for (const other of linesB) {
      best = Math.min(best, Math.abs(line.nm - other.nm));
    }
    sum += best;
  }
  return sum / linesA.length;
}

export function tracesCanMatch(a, b) {
  let best = Infinity;
  for (let shift = -80; shift <= 80; shift += 2) {
    best = Math.min(best, alignmentScore(a, b, shift));
  }
  return best < 12;
}

export function lampMarkersOk(placedNm, lamp, tol = 18) {
  const need = strongestLampLines(lamp, 2);
  const marks = (placedNm || []).map(Number).filter((n) => Number.isFinite(n));
  if (marks.length < need.length) return false;
  return need.every((line) => marks.some((nm) => Math.abs(nm - line.nm) <= tol));
}

export function strongestLampLines(lamp, n = 2) {
  return [...(lamp?.emission || [])].sort((a, b) => (b.height || 0) - (a.height || 0)).slice(0, n);
}

export function peakMarkerOk(placedNm, peakNm, tol = 26) {
  return Number.isFinite(placedNm) && Math.abs(placedNm - peakNm) <= tol;
}

export function observeTarget(state, id) {
  if (!id) return { ok: false, already: false };
  const ids = new Set(state.observedIds || []);
  const already = ids.has(id);
  ids.add(id);
  state.observedIds = [...ids];
  if (id === EMBER_ID) state.emberObserved = true;
  return { ok: true, already };
}

export function readTwinsLog(state) {
  const already = Boolean(state.logRead);
  state.logRead = true;
  return { ok: true, already };
}

export function markEyepieceSeen(state) {
  const already = Boolean(state.eyepieceSeen);
  state.eyepieceSeen = true;
  return { ok: true, already };
}

export function setLampOn(state, on) {
  state.lampOn = Boolean(on);
  return { ok: true, lampOn: state.lampOn };
}

export function markVisited(state, place) {
  if (place === "station") state.visitedStation = true;
  if (place === "lamp") state.visitedLamp = true;
  markCompleteVisit(state, place);
}

export function logLampCalibration(state, catalog, placedNm, atLamp) {
  if (!atLamp) {
    state.lastHint = "The known light is on the south pad, out of the dome wash.";
    return { ok: false, reason: "not-at-lamp" };
  }
  if (!state.lampOn) {
    state.lastHint = "Turn the bench lamp on first. You need to see the light you are measuring.";
    return { ok: false, reason: "lamp-off" };
  }
  if (!lampMarkersOk(placedNm, catalog.lamp)) {
    state.lastHint = "Slide markers onto the two strongest spikes. The pattern has to be placed, not guessed.";
    return { ok: false, reason: "markers" };
  }
  const already = Boolean(state.lampCalibrated);
  state.lampMarkers = [...placedNm];
  state.lampCalibrated = true;
  pushNote(state, "lamp-calibration", "The bench lamp made the same spike pattern each time I inspected it.");
  return { ok: true, already };
}

export function openSpectrograph(state, atStation) {
  state.spectrographOpened = true;
  if (!state.lampCalibrated) {
    state.spectrographWashed = true;
    state.lastHint = "Dome wash. Take a known light on the bench south of here first.";
    return { ok: false, reason: "uncalibrated", washed: true };
  }
  if (!atStation) {
    state.lastHint = "The plate spectrograph stays at North Rim Station.";
    return { ok: false, reason: "not-at-station" };
  }
  return { ok: true, washed: false };
}

export function tryStellarAlign(state, catalog, shiftNm) {
  state.stellarShiftNm = shiftNm;
  state.stellarTriedAlign = true;
  const [west, east] = twinTargets(catalog);
  const score = alignmentScore(west, east, shiftNm);
  return { ok: true, score, matched: score < 12 };
}

export function markStellarFeature(state, nm, kind) {
  const marks = [...(state.stellarMarks || [])];
  marks.push({ nm, kind });
  state.stellarMarks = marks.slice(-8);
  return { ok: true, marks: state.stellarMarks };
}

export function logStellarCompare(state) {
  const diffs = (state.stellarMarks || []).filter((row) => row.kind === "diff");
  if (!state.stellarTriedAlign || diffs.length < 2) {
    state.lastHint = "Slide one trace against the other, then mark two places that refuse to match.";
    return { ok: false, reason: "need-marks" };
  }
  const already = Boolean(state.stellarCompared);
  state.stellarCompared = true;
  pushNote(state, "stellar-mismatch", "The two white targets did not produce the same absorption pattern.");
  return { ok: true, already };
}

export function logTwinsConclusion(state) {
  if (!twinsObservationReady(state) || !state.lampCalibrated || !state.stellarCompared) {
    state.lastHint = "The tablet only holds what you actually saw, tested, and compared.";
    return { ok: false, reason: "incomplete" };
  }
  const already = Boolean(state.twinsConcluded);
  state.twinsConcluded = true;
  pushNote(state, "twins-claim", "Appearance alone does not make them the same kind of star.");
  return { ok: true, already };
}

export function logEmberPeaks(state, catalog, emberNm, whiteNm) {
  const ember = catalogTarget(catalog, EMBER_ID);
  const white = catalogTarget(catalog, "west-twin");
  if (!peakMarkerOk(emberNm, ember?.peakNm) || !peakMarkerOk(whiteNm, white?.peakNm)) {
    state.lastHint = "Slide each marker to the brightest place on that trace. Use the wavelength ticks.";
    return { ok: false, reason: "peaks" };
  }
  const already = Boolean(state.emberCompared);
  state.emberPeakMark = emberNm;
  state.whitePeakMark = whiteNm;
  state.emberCompared = true;
  pushNote(
    state,
    "ember-peak",
    `The reddish target's brightest mark sat near ${Math.round(emberNm)} nm. The white target's sat near ${Math.round(whiteNm)} nm.`
  );
  return { ok: true, already };
}

export function logEmberConclusion(state) {
  if (!state.twinsConcluded || !state.emberCompared) {
    state.lastHint = "Compare the peaks you marked before claiming anything about heat.";
    return { ok: false, reason: "incomplete" };
  }
  if ((state.emberPeakMark || 0) <= (state.whitePeakMark || 0)) {
    state.lastHint = "The reddish target's peak was not on the shorter-wavelength side.";
    return { ok: false, reason: "direction" };
  }
  const already = Boolean(state.emberConcluded);
  state.emberConcluded = true;
  pushNote(state, "ember-claim", "Redder light here is not evidence of a hotter source.");
  return { ok: true, already };
}

export function twinsObservationReady(state) {
  const seen = new Set(state.observedIds || []);
  return Boolean(state.eyepieceSeen || (seen.has("west-twin") && seen.has("east-twin")));
}

export function ds01Complete(state) {
  return Boolean(state.twinsConcluded && state.lampCalibrated && state.stellarCompared && twinsObservationReady(state));
}

export function ds02Complete(state) {
  return Boolean(state.emberConcluded && ds01Complete(state));
}

export function darkSkyEvidence(state) {
  const groups = [
    { label: "What I saw", cards: [] },
    { label: "What I tested", cards: [] },
    { label: "What the light showed", cards: [] },
    { label: "What I can claim", cards: [] }
  ];
  if (twinsObservationReady(state)) {
    groups[0].cards.push({
      id: "ds-saw-twins",
      kind: "observation",
      title: "Eyepiece twins",
      observation: "Both basin targets appeared bright and white."
    });
  }
  if (state.logRead) {
    groups[0].cards.push({
      id: "ds-saw-log",
      kind: "observation",
      title: "Inherited log",
      observation: "The old page treated that shared look as identity."
    });
  }
  if (state.emberObserved) {
    groups[0].cards.push({
      id: "ds-saw-ember",
      kind: "observation",
      title: "Reddish target",
      observation: "One later target looked redder than the white pair."
    });
  }
  if (state.lampCalibrated) {
    groups[1].cards.push({
      id: "ds-tested-lamp",
      kind: "measurement",
      title: "Bench lamp",
      observation: "The controlled lamp produced a repeatable spike pattern."
    });
  }
  if (state.stellarCompared) {
    groups[2].cards.push({
      id: "ds-light-twins",
      kind: "comparison",
      title: "Stellar traces",
      observation: "The two apparently similar stars did not produce identical spectral evidence."
    });
  }
  if (state.emberCompared) {
    groups[2].cards.push({
      id: "ds-light-ember",
      kind: "pattern",
      title: "Peak marks",
      observation:
        state.emberPeakMark != null && state.whitePeakMark != null
          ? `Reddish peak near ${Math.round(state.emberPeakMark)} nm; white peak near ${Math.round(state.whitePeakMark)} nm.`
          : "Peak positions were marked on both traces."
    });
  }
  if (state.twinsConcluded) {
    groups[3].cards.push({
      id: "ds-claim-twins",
      kind: "revised-explanation",
      title: "Twins claim",
      observation: "Appearance alone was insufficient to justify the inherited twins log."
    });
  }
  if (state.emberConcluded) {
    groups[3].cards.push({
      id: "ds-claim-ember",
      kind: "revised-explanation",
      title: "Ember claim",
      observation: "Redder light, with a longer-wavelength peak, is not evidence that the source is hotter."
    });
  }
  appendCompleteEvidence(groups, state);
  const cards = groups.flatMap((group) => group.cards);
  return { cards, groups: groups.filter((group) => group.cards.length) };
}

export function darkSkyPuzzleEvidence(state) {
  const use = completePuzzleUse(state, ds01Complete(state), ds02Complete(state));
  const names = {
    "DS-01": "The twins that aren't",
    "DS-02": "The cooler ember",
    "DS-03": "Two cairns",
    "DS-04": "Unlabeled plot",
    "DS-05": "Not one life",
    "DS-06": "What the floor is made of",
    "DS-07": "Lines that moved",
    "DS-08": "Three lines, no label",
    "DS-09": "Not tonight",
    "DS-10": "The unlabeled envelope"
  };
  const categories = {
    "DS-01": "comparison",
    "DS-02": "pattern",
    "DS-03": "measurement",
    "DS-04": "pattern",
    "DS-05": "system",
    "DS-06": "relationship",
    "DS-07": "pattern",
    "DS-08": "revised-explanation",
    "DS-09": "measurement",
    "DS-10": "claim"
  };
  const notes = {
    "DS-01": "Two white stars. The traces did not match.",
    "DS-02": "The reddish target's peak sat at longer wavelength — not hotter.",
    "DS-03": "Equal apparent brightness. Only one star reversed with the walked baseline.",
    "DS-04": "I placed measured stars on unlabeled axes. The pattern arrived after the points.",
    "DS-05": "Massive and sun-like stars do not share one ending.",
    "DS-06": "Floor silicate and metal lines. Heavier nuclei are not all from the first minutes.",
    "DS-07": "A known line pattern sat at longer wavelength on farther plates — not a red color.",
    "DS-08": "Expansion, leftover glow, and abundance. A famous name is not a substitute.",
    "DS-09": "Nearby changed later tonight. The distant plate is not happening now.",
    "DS-10": "Observed, inferred, unknown, and one refused overclaim."
  };
  return Object.keys(names)
    .filter((id) => use[id])
    .map((id) => ({
      id,
      title: names[id],
      category: categories[id],
      competencyIds: [id],
      note: notes[id]
    }));
}

export function darkSkyNotes(state, spec) {
  const rows = [];
  if (state.logRead) {
    rows.push({
      id: "twins-log",
      title: "Inherited field log",
      text: "Two bright white stars. Logged as twins because they look the same through the eyepiece."
    });
  }
  if (twinsObservationReady(state)) {
    rows.push({
      id: "eyepiece",
      title: "Dome eyepiece",
      text: "Two bright points, both white. Easy to treat as the same object if you only look."
    });
  }
  if (state.lampCalibrated) {
    rows.push({
      id: "lamp",
      title: "Lamp Bench",
      text: "A known light, walked to on purpose. The spike pattern repeated."
    });
  }
  if (state.emberObserved) {
    rows.push({
      id: "ember",
      title: "Reddish target",
      text: "The old notes call it an ember, like a coal."
    });
  }
  appendCompleteNotes(rows, state);
  if (!rows.length && spec?.question) {
    return [];
  }
  return rows;
}

export function darkSkyGuidance(state) {
  if (!twinsObservationReady(state) || !state.logRead) {
    return pack(
      "Are two stars the same kind because they look alike?",
      "OBSERVE",
      "Read the inherited log and look at both white targets.",
      "North Rim Station · eyepiece and plate desk"
    );
  }
  if (!state.lampCalibrated) {
    return pack(
      "What does a known light look like when you actually measure it?",
      "TEST",
      "Leave the dome wash. Walk to Lamp Bench.",
      "South of the station, across the basin floor"
    );
  }
  if (!state.stellarCompared || !state.twinsConcluded) {
    return pack(
      "Does the inherited twins claim survive a fair trace?",
      "COMPARE",
      "Bring the lamp pattern back to the plate spectrograph.",
      "North Rim Station · spectrograph"
    );
  }
  if (!state.emberCompared || !state.emberConcluded) {
    return pack(
      "Does redder light mean a hotter source?",
      "MEASURE",
      "Mark the brightest place on each trace. Use wavelength, not folklore.",
      "North Rim Station · spectrograph"
    );
  }
  return completeGuidance(state, ds01Complete(state), ds02Complete(state));
}

export function activeDarkSkyPuzzle(state) {
  return completeActivePuzzle(state, ds01Complete(state), ds02Complete(state));
}

export function darkSkyPuzzleStage(state) {
  const id = activeDarkSkyPuzzle(state);
  if (id === "DS-01") {
    if (ds01Complete(state)) return "complete";
    if (state.stellarTriedAlign || state.lampCalibrated) return "testing";
    if (twinsObservationReady(state) || state.logRead) return "in-progress";
    return "in-progress";
  }
  if (id === "DS-02") {
    if (ds02Complete(state)) return "complete";
    if (state.emberCompared) return "testing";
    return "in-progress";
  }
  const done = {
    "DS-03": ds03Complete(state),
    "DS-04": ds04Complete(state),
    "DS-05": ds05Complete(state),
    "DS-06": ds06Complete(state),
    "DS-07": ds07Complete(state),
    "DS-08": ds08Complete(state),
    "DS-09": ds09Complete(state),
    "DS-10": ds10Complete(state)
  };
  if (done[id]) return "complete";
  if (id === "DS-03" && (state.visitedWest || state.visitedEast)) return "testing";
  if (id === "DS-10" && (state.envelopeObserved || []).length) return "testing";
  return "in-progress";
}

export function buildDarkSkyTruth(state = emptyDarkSkySave(), catalog = { targets: [], lamp: {} }) {
  const known = [];
  const unknown = [];
  const doNotClaim = [
    "magnitudes the player did not measure",
    "spectral class names as identity",
    "invented line lists",
    "locations the player has not walked",
    "a completed lamp calibration that did not happen",
    "field clearance for Dark Sky Basin"
  ];
  const observed = new Set(state.observedIds || []);

  if (twinsObservationReady(state)) {
    known.push("both white targets appeared bright and white through the eyepiece");
  } else {
    unknown.push("visual appearance of both white targets: not yet logged");
    doNotClaim.push("that the player already compared the two white stars by eye");
  }
  if (state.logRead) known.push("the inherited log treats eyepiece resemblance as identity");
  else unknown.push("inherited twins log: not read");

  if (state.visitedLamp) known.push("the player walked to Lamp Bench");
  else {
    unknown.push("Lamp Bench: not visited");
    doNotClaim.push("a Lamp Bench visit");
  }
  if (state.lampCalibrated) {
    known.push("the bench lamp produced a repeatable emission pattern");
    if (state.lampMarkers?.length) {
      known.push(`lamp markers placed near ${state.lampMarkers.map((n) => `${Math.round(n)} nm`).join(" and ")}`);
    }
  } else {
    unknown.push("lamp calibration: not completed");
    doNotClaim.push("lamp emission wavelengths as measured");
  }
  if (state.stellarCompared) {
    known.push("the two white stellar traces did not match");
  } else {
    unknown.push("stellar trace comparison: not logged");
    doNotClaim.push("that the two stars have identical spectra");
    doNotClaim.push("that the two stars have different spectra");
  }
  if (state.twinsConcluded) {
    known.push("appearance alone was insufficient for the twins claim");
  } else {
    unknown.push("bounded twins conclusion: not logged");
  }
  if (observed.has(EMBER_ID) || state.emberObserved) {
    known.push("a reddish target was observed");
  } else {
    unknown.push("reddish target: not observed");
    doNotClaim.push("the color of a star the player has not inspected");
  }
  if (state.emberCompared) {
    known.push(
      `peak marks: reddish near ${Math.round(state.emberPeakMark)} nm, white near ${Math.round(state.whitePeakMark)} nm`
    );
  } else {
    unknown.push("peak-wavelength comparison: not marked");
    doNotClaim.push("stellar temperatures in kelvin");
    doNotClaim.push("that redder means hotter");
    doNotClaim.push("that bluer means cooler");
  }
  if (state.emberConcluded) {
    known.push("redder light with a longer-wavelength peak is not evidence of a hotter source");
  }

  const west = catalogTarget(catalog, "west-twin");
  const east = catalogTarget(catalog, "east-twin");
  const ember = catalogTarget(catalog, EMBER_ID);

  const truth = {
    known,
    expected: [
      "a spectrum can hold structure that color and brightness do not show",
      "two objects can look alike and still differ in their light",
      "a longer-wavelength peak is not evidence that a source is hotter"
    ],
    unknown,
    science: [
      "starlight can be treated as evidence about objects you will never visit",
      "visible appearance is limited evidence",
      "a controlled lamp is a known light you can compare against",
      "temperature inference has to follow peak or color evidence actually recorded"
    ],
    doNotClaim,
    nextAction: chooseDarkSkyNext(state),
    comparisonValid: Boolean(state.stellarCompared),
    catalog: {
      observedIds: [...(state.observedIds || [])],
      westPeakNm: state.stellarCompared ? west?.peakNm ?? null : null,
      eastPeakNm: state.stellarCompared ? east?.peakNm ?? null : null,
      emberPeakNm: state.emberCompared ? ember?.peakNm ?? null : null,
      lampLines: state.lampCalibrated ? (catalog.lamp?.emission || []).map((row) => row.nm) : []
    }
  };
  appendCompleteTruth(truth, state, catalog);
  truth.nextAction = chooseDarkSkyNext(state);
  return truth;
}

export function chooseDarkSkyNext(state) {
  if (!twinsObservationReady(state) || !state.logRead) {
    return {
      id: "observe-twins",
      text: "Look at both white targets and read the inherited log before treating the nickname as a fact."
    };
  }
  if (!state.lampCalibrated) {
    return {
      id: "walk-lamp",
      text: "Walk south to Lamp Bench and inspect a known light away from the dome wash."
    };
  }
  if (!state.stellarCompared || !state.twinsConcluded) {
    return {
      id: "compare-traces",
      text: "Return to the plate spectrograph and see whether the two traces actually match."
    };
  }
  if (!state.emberCompared || !state.emberConcluded) {
    return {
      id: "mark-peaks",
      text: "Mark the brightest place on the reddish trace and on a white trace you already logged."
    };
  }
  return completeNext(state, ds01Complete(state), ds02Complete(state));
}

export function buildDarkSkySummitContext({ state, catalog, region, player, spec, summitState }) {
  const truth = buildDarkSkyTruth(state, catalog);
  const puzzleId = activeDarkSkyPuzzle(state);
  const puzzle = spec?.puzzles?.[puzzleId] || { name: puzzleId };
  const evidence = darkSkyEvidence(state);
  const use = completePuzzleUse(state, ds01Complete(state), ds02Complete(state));
  const near = [];
  if (atFeature(region, player, "lamp-bench", 12)) near.push("Lamp Bench");
  if (atFeature(region, player, "north-rim-station", 40) || atFeature(region, player, "eyepiece", 8)) {
    near.push("North Rim Station");
  }
  if (atFeature(region, player, "west-rim-stake", 12)) near.push("West Rim Stake");
  if (atFeature(region, player, "east-rim-stake", 12)) near.push("East Rim Stake");
  if (atFeature(region, player, "quiet-floor", 20) || atFeature(region, player, "floor-horn", 8) || atFeature(region, player, "floor-rock", 8)) {
    near.push("Quiet Floor");
  }
  if (atFeature(region, player, "glow-notch", 12)) near.push("Glow Notch");
  const clearance = state.aar?.result === "clearance";
  return {
    regionId: DARK_SKY_ID,
    location: { x: player?.x || 0, y: player?.y || 0, near },
    activePuzzleId: puzzleId,
    puzzleName: puzzle.name || puzzleId,
    puzzleStage: darkSkyPuzzleStage(state),
    competencyIds: puzzle.competencyIds || [],
    observations: [...(state.observedIds || [])],
    foundIds: [],
    measuredIds: [
      state.lampCalibrated ? "lamp-calibration" : null,
      state.stellarCompared ? "stellar-traces" : null,
      state.emberCompared ? "peak-marks" : null,
      state.cairnCompared ? "baseline-shift" : null,
      state.plotLogged ? "unlabeled-plot" : null,
      state.metalCompared ? "metal-lines" : null,
      state.redshiftTrend ? "redshift-trend" : null
    ].filter(Boolean),
    predictions: { flume: null, pulse: null },
    evidenceEarned: Object.entries(use).filter(([, ok]) => ok).map(([id]) => id),
    evidenceMissing: Object.entries(use).filter(([, ok]) => !ok).map(([id]) => id),
    tablet: evidence.cards.map((card) => ({ id: card.id, title: card.title })),
    raw: {
      flume: { prediction: null, unfairAttempted: false, trials: [], fairTrials: [] },
      graph: { interpreted: false, xField: null, yField: null, rowCount: 0 },
      darkSky: {
        lampOn: Boolean(state.lampOn),
        lampCalibrated: Boolean(state.lampCalibrated),
        visitedLamp: Boolean(state.visitedLamp),
        visitedWest: Boolean(state.visitedWest),
        visitedEast: Boolean(state.visitedEast),
        visitedFloor: Boolean(state.visitedFloor),
        logRead: Boolean(state.logRead),
        twinsConcluded: Boolean(state.twinsConcluded),
        emberConcluded: Boolean(state.emberConcluded),
        cairnConcluded: Boolean(state.cairnConcluded),
        plotLogged: Boolean(state.plotLogged),
        massLogged: Boolean(state.massLogged),
        rockPicked: Boolean(state.rockPicked),
        nucleosynthesisLogged: Boolean(state.nucleosynthesisLogged),
        redshiftTrend: Boolean(state.redshiftTrend),
        originLogged: Boolean(state.originLogged),
        lookbackLogged: Boolean(state.lookbackLogged),
        envelopeLogged: Boolean(state.envelopeLogged),
        hornPoint: state.hornPoint || null,
        plateSet: state.plateSet || "A",
        laterTonight: Boolean(state.laterTonight),
        aarResult: state.aar?.result || null,
        observedIds: [...(state.observedIds || [])],
        lampMarkers: [...(state.lampMarkers || [])],
        emberPeakMark: state.emberPeakMark,
        whitePeakMark: state.whitePeakMark,
        metalMarkNm: state.metalMarkNm
      }
    },
    rejected: { lastHint: state.lastHint || "", conflictSeen: Boolean(state.notes?.some((row) => row.id === "brightness-revision")), unfairAttempted: false },
    revisions: { conflictRepaired: Boolean(state.notes?.some((row) => row.id === "brightness-revision")), flumeRevised: false, landscapeAttempts: 0 },
    aar: {
      open: false,
      eligible: dsAarEligible(state, ds01Complete(state), ds02Complete(state)),
      result: state.aar?.result || null,
      claimId: null,
      claimText: "",
      required: [],
      useful: [],
      misconception: [],
      pinned: [],
      pinnedNotes: [],
      judged: null,
      lastJudge: null
    },
    puzzlesComplete: Object.entries(use).filter(([, ok]) => ok).map(([id]) => id),
    puzzlesIncomplete: Object.entries(use).filter(([, ok]) => !ok).map(([id]) => id),
    systemsPrompt: null,
    summit: {
      level: 0,
      hintAsks: 0,
      conceptsExplained: [...(summitState?.conceptsExplained || [])],
      misconceptionsAddressed: [...(summitState?.misconceptionsAddressed || [])],
      idea: Boolean(summitState?.idea),
      turns: summitState?.turns || 0,
      struggle: { ...(summitState?.struggle || {}) }
    },
    use,
    darkSkyTruth: truth,
    clearance
  };
}

export function darkSkyPacketFacts(context) {
  const truth = context.darkSkyTruth || buildDarkSkyTruth();
  const raw = context.raw?.darkSky || {};
  const numbers = [];
  for (const nm of raw.lampMarkers || []) if (Number.isFinite(nm)) numbers.push(nm);
  if (Number.isFinite(raw.emberPeakMark)) numbers.push(raw.emberPeakMark);
  if (Number.isFinite(raw.whitePeakMark)) numbers.push(raw.whitePeakMark);
  if (Number.isFinite(raw.metalMarkNm)) numbers.push(raw.metalMarkNm);
  return {
    region: "Dark Sky Basin",
    puzzle: context.puzzleName || "field work",
    stage: context.puzzleStage || "",
    near: (context.location?.near || []).slice(0, 3),
    competencies: (context.competencyIds || []).slice(0, 3),
    lampOn: Boolean(raw.lampOn),
    lampCalibrated: Boolean(raw.lampCalibrated),
    visitedLamp: Boolean(raw.visitedLamp),
    logRead: Boolean(raw.logRead),
    observedIds: [...(raw.observedIds || [])],
    twinsConcluded: Boolean(raw.twinsConcluded),
    emberConcluded: Boolean(raw.emberConcluded),
    cairnConcluded: Boolean(raw.cairnConcluded),
    visitedWest: Boolean(raw.visitedWest),
    visitedEast: Boolean(raw.visitedEast),
    visitedFloor: Boolean(raw.visitedFloor),
    rockPicked: Boolean(raw.rockPicked),
    redshiftTrend: Boolean(raw.redshiftTrend),
    originLogged: Boolean(raw.originLogged),
    lookbackLogged: Boolean(raw.lookbackLogged),
    envelopeLogged: Boolean(raw.envelopeLogged),
    aarResult: raw.aarResult || null,
    numbers,
    known: truth.known,
    expected: truth.expected,
    unknown: truth.unknown,
    science: truth.science,
    doNotClaim: truth.doNotClaim,
    clearance: raw.aarResult === "clearance",
    inspectedHighLook: false,
    fairTrialCount: 0,
    measurements: [],
    prediction: null,
    unfairAttempted: false,
    missingCount: (context.evidenceMissing || []).length,
    wrenClaim: "",
    judgeKind: "",
    judgeHint: "",
    supportLevel: context.summit?.level || 0,
    comparisonValid: truth.comparisonValid,
    comparisonStatus: { comparisonReady: truth.comparisonValid },
    evidenceStatus: {
      lampCalibrated: Boolean(raw.lampCalibrated),
      tracesCompared: Boolean(raw.twinsConcluded) || (context.measuredIds || []).includes("stellar-traces")
    },
    concepts: {},
    pinned: []
  };
}

export function drawSpectrumBench(ctx, view) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#12141c";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(18, 18, width - 36, height - 52);
  drawAxis(ctx, width, height);
  const traces = view.traces || [];
  traces.forEach((trace, i) => {
    drawTrace(ctx, width, height, trace, i);
  });
  for (const mark of view.markers || []) {
    const x = nmToX(mark.nm, width);
    ctx.strokeStyle = mark.kind === "diff" ? "#f0a070" : mark.kind === "peak" ? "#d8e6ff" : "#c8e48a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, height - 38);
    ctx.stroke();
  }
  ctx.fillStyle = "#c8d0dc";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(view.readout || "", 22, height - 12);
}

export function nightSkyState(catalog) {
  return {
    night: true,
    darkSky: true,
    moon: null,
    catalog
  };
}

function pack(question, verb, next, where) {
  return { question, verb, next, where, lookingFor: next, done: [], pairs: [] };
}

function pushNote(state, id, text) {
  const notes = state.notes || [];
  if (notes.some((row) => row.id === id)) return;
  notes.push({ id, text });
  state.notes = notes;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function drawAxis(ctx, width, height) {
  ctx.strokeStyle = "rgba(200, 210, 230, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, height - 40);
  ctx.lineTo(width - 28, height - 40);
  ctx.stroke();
  ctx.fillStyle = "#9aa6b8";
  ctx.font = "10px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  for (const nm of [400, 500, 600, 700]) {
    const x = nmToX(nm, width);
    ctx.fillText(`${nm} nm`, x, height - 26);
  }
  ctx.textAlign = "left";
  ctx.fillText("shorter", 28, 16);
  ctx.textAlign = "right";
  ctx.fillText("longer", width - 28, 16);
}

function drawTrace(ctx, width, height, trace, index) {
  const top = 28;
  const plotH = height - 78;
  ctx.beginPath();
  for (let x = 28; x <= width - 28; x += 2) {
    const nm = xToNm(x, width);
    const yVal = sampleTrace(nm, trace.spec, trace.shiftNm || 0);
    const y = top + (1 - yVal) * plotH;
    if (x === 28) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = trace.color || (index === 0 ? "#d7e7ff" : "#f3d2a8");
  ctx.lineWidth = 2.2;
  ctx.stroke();
  if (trace.label) {
    ctx.fillStyle = trace.color || "#d7e7ff";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(trace.label, 36, 36 + index * 14);
  }
}
