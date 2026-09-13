/**
 * Dark Sky Basin DS-03–DS-10. Light remains field evidence.
 * Does not replace DS-01/DS-02. Authored catalog only.
 */

export const CAIRN_NEAR = "cairn-near";
export const CAIRN_FAR = "cairn-far";
export const PLOT_STARS = ["west-twin", "cooler-ember", "cairn-far"];
export const GALAXY_IDS = ["galaxy-near", "galaxy-mid", "galaxy-far"];
export const ORIGIN_LINES = ["expansion", "abundance", "leftover"];
export const DS_LATER_IDS = ["DS-03", "DS-04", "DS-05", "DS-06", "DS-07", "DS-08", "DS-09", "DS-10"];

const PLOT_ZONES = {
  "west-twin": { x: [6, 42], y: [28, 64] },
  "cooler-ember": { x: [58, 96], y: [20, 60] },
  "cairn-far": { x: [8, 46], y: [58, 96] }
};

export function completeEmptyFields() {
  return {
    cairnRadioSeen: false,
    floorRadioSeen: false,
    originRadioSeen: false,
    envelopeRadioSeen: false,
    plotRadioSeen: false,
    visitedWest: false,
    visitedEast: false,
    visitedFloor: false,
    visitedGlow: false,
    visitedPicnic: false,
    plateSet: "A",
    westPlateSeen: false,
    eastPlateSeen: false,
    shiftStarId: null,
    cairnCompared: false,
    brightnessGuess: null,
    cairnConcluded: false,
    plotDraftId: "west-twin",
    plotPlacements: {},
    plotLogged: false,
    massHot: null,
    massSun: null,
    remnantPick: null,
    remnantMatch: false,
    massLogged: false,
    rockPicked: false,
    metalMarkNm: null,
    metalCompared: false,
    nucleoClaim: null,
    nucleosynthesisLogged: false,
    redshiftGalaxyId: "galaxy-far",
    redshiftShiftNm: 0,
    redshiftTried: false,
    redshiftMarks: [],
    redshiftPoints: {},
    redshiftTrend: false,
    competingRejected: false,
    hornPoint: null,
    hornTried: [],
    originPinned: [],
    originLogged: false,
    laterTonight: false,
    nearbyChanged: false,
    distantPosterSeen: false,
    lookbackClaim: null,
    lookbackLogged: false,
    envelopeObserved: [],
    envelopeInferred: [],
    envelopeUnknown: [],
    envelopeRefused: [],
    envelopeLogged: false,
    aar: {
      result: null,
      answers: {},
      itemIds: [],
      attempts: 0,
      remediation: [],
      lastJudge: null
    }
  };
}

export function completeSnapshot(state = {}) {
  const empty = completeEmptyFields();
  return {
    ...empty,
    ...state,
    plotPlacements: { ...(state.plotPlacements || {}) },
    redshiftMarks: [...(state.redshiftMarks || [])],
    redshiftPoints: { ...(state.redshiftPoints || {}) },
    hornTried: [...(state.hornTried || [])],
    originPinned: [...(state.originPinned || [])],
    envelopeObserved: [...(state.envelopeObserved || [])],
    envelopeInferred: [...(state.envelopeInferred || [])],
    envelopeUnknown: [...(state.envelopeUnknown || [])],
    envelopeRefused: [...(state.envelopeRefused || [])],
    aar: {
      ...empty.aar,
      ...(state.aar || {}),
      answers: { ...(state.aar?.answers || {}) },
      itemIds: [...(state.aar?.itemIds || [])],
      remediation: [...(state.aar?.remediation || [])]
    }
  };
}

export function markCompleteVisit(state, place) {
  if (place === "west") state.visitedWest = true;
  if (place === "east") state.visitedEast = true;
  if (place === "floor") state.visitedFloor = true;
  if (place === "glow") state.visitedGlow = true;
  if (place === "picnic") state.visitedPicnic = true;
}

export function logBrightnessGuess(state, guess) {
  if (state.brightnessGuess) return { ok: true, already: true };
  state.brightnessGuess = guess === "one-closer-by-eye" ? "one-closer-by-eye" : "same-distance";
  pushNote(
    state,
    "brightness-guess",
    state.brightnessGuess === "same-distance"
      ? "First take: they look equally bright, so I treated them as the same distance."
      : "First take: I tried to rank distance by eye even though they look similar."
  );
  return { ok: true, already: false };
}

export function setPlateSet(state, plateSet) {
  state.plateSet = plateSet === "B" ? "B" : "A";
  return { ok: true, plateSet: state.plateSet };
}

export function viewRimPlate(state, rim) {
  if (rim === "west") {
    state.visitedWest = true;
    state.westPlateSeen = true;
  } else if (rim === "east") {
    state.visitedEast = true;
    state.eastPlateSeen = true;
  } else {
    return { ok: false, reason: "rim" };
  }
  return { ok: true, both: Boolean(state.westPlateSeen && state.eastPlateSeen) };
}

export function plateStarLayout(catalog, rim, plateSet) {
  const near = target(catalog, CAIRN_NEAR);
  const far = target(catalog, CAIRN_FAR);
  const reverse = rim === "east" ? -1 : 1;
  const season = plateSet === "B" ? 1 : 0;
  return [
    {
      id: CAIRN_NEAR,
      label: "Star 1",
      x: 34 + reverse * season * (near?.parallaxShiftPx || 0),
      y: 42,
      brightness: near?.visual?.brightness || 0.84
    },
    {
      id: CAIRN_FAR,
      label: "Star 2",
      x: 62 + reverse * season * (far?.parallaxShiftPx || 0),
      y: 38,
      brightness: far?.visual?.brightness || 0.86
    }
  ];
}

export function markShiftedStar(state, id) {
  if (!state.westPlateSeen || !state.eastPlateSeen) {
    state.lastHint = "You need season plates from both rims before deciding which star moved with the baseline.";
    return { ok: false, reason: "need-both-rims" };
  }
  if (id !== CAIRN_NEAR) {
    state.lastHint = "Compare plate A and B from both cairns. Only one star reverses with the walked baseline.";
    return { ok: false, reason: "wrong-star" };
  }
  const already = Boolean(state.cairnCompared);
  state.shiftStarId = id;
  state.cairnCompared = true;
  pushNote(state, "cairn-shift", "Only one of the equally bright pair shifted when I changed rims and season plates.");
  state.lastHint = "";
  return { ok: true, already };
}

export function logCairnClaim(state) {
  if (!state.cairnCompared || !state.visitedWest || !state.visitedEast) {
    state.lastHint = "Walk both rims and mark the star that actually shifted.";
    return { ok: false, reason: "incomplete" };
  }
  const already = Boolean(state.cairnConcluded);
  state.cairnConcluded = true;
  if (state.brightnessGuess === "same-distance") {
    pushNote(
      state,
      "brightness-revision",
      "My first explanation — equal brightness means equal distance — no longer works. Only the nearer star shifted."
    );
  }
  pushNote(
    state,
    "cairn-claim",
    "Apparent brightness was not enough to rank distance. The walked baseline was."
  );
  state.lastHint = "";
  return { ok: true, already };
}

export function ds03Complete(state) {
  return Boolean(state.cairnConcluded && state.visitedWest && state.visitedEast && state.cairnCompared);
}

export function placePlotStar(state, id, xPct, yPct) {
  if (!PLOT_STARS.includes(id)) return { ok: false, reason: "star" };
  state.plotPlacements = {
    ...(state.plotPlacements || {}),
    [id]: { x: clamp(xPct, 4, 96), y: clamp(yPct, 4, 96) }
  };
  return { ok: true, placement: state.plotPlacements[id] };
}

export function logPlot(state) {
  if (!ds03Complete(state) || !state.emberConcluded) {
    state.lastHint = "The board only takes stars you already measured — peaks and a distance rank.";
    return { ok: false, reason: "need-prior" };
  }
  for (const id of PLOT_STARS) {
    const put = state.plotPlacements?.[id];
    if (!inZone(put, PLOT_ZONES[id])) {
      state.lastHint =
        id === "cairn-far"
          ? "The far cairn star looked as bright as the near one, so it belongs higher — intrinsically brighter after distance."
          : id === "cooler-ember"
            ? "The ember's peak sat at longer wavelength. It belongs on the cooler side."
            : "The hot white star's peak was at shorter wavelength. It belongs on that side of the board.";
      return { ok: false, reason: "zone", id };
    }
  }
  const already = Boolean(state.plotLogged);
  state.plotLogged = true;
  pushNote(state, "plot-built", "I placed three measured stars on unlabeled axes. A pattern showed up after the points, not before a legend.");
  state.lastHint = "";
  return { ok: true, already };
}

export function ds04Complete(state) {
  return Boolean(state.plotLogged && ds03Complete(state));
}

export function pickMassBranch(state, which, fate) {
  if (which === "hot") state.massHot = fate;
  if (which === "sun") state.massSun = fate;
  return { ok: true, massHot: state.massHot, massSun: state.massSun };
}

export function checkRemnant(state, pickId) {
  state.remnantPick = pickId;
  if (pickId !== "blue-remnant") {
    state.lastHint = "The outburst leftover does not match a quiet sun-like future.";
    state.remnantMatch = false;
    return { ok: false, reason: "mismatch" };
  }
  state.remnantMatch = true;
  pushNote(state, "remnant-match", "The remnant plate matched the massive star's branch, not a one-life cartoon.");
  return { ok: true };
}

export function logMassClaim(state) {
  if (!ds04Complete(state)) {
    state.lastHint = "Place the measured stars first. Mass has to sit on a pattern you built.";
    return { ok: false, reason: "need-plot" };
  }
  if (state.massHot !== "remnant" || state.massSun !== "no-supernova" || !state.remnantMatch) {
    state.lastHint = "Massive and sun-like stars do not share one ending. Check the remnant against the massive branch.";
    return { ok: false, reason: "branch" };
  }
  const already = Boolean(state.massLogged);
  state.massLogged = true;
  pushNote(state, "mass-claim", "Initial mass changed the path. Not every star becomes a supernova.");
  state.lastHint = "";
  return { ok: true, already };
}

export function ds05Complete(state) {
  return Boolean(state.massLogged && ds04Complete(state));
}

export function pickUpRock(state, atFloor) {
  if (!atFloor) {
    state.lastHint = "The silicate sits on the Quiet Floor, not in the dome.";
    return { ok: false, reason: "not-at-floor" };
  }
  state.visitedFloor = true;
  const already = Boolean(state.rockPicked);
  state.rockPicked = true;
  pushNote(state, "floor-rock", "I picked up a pale silicate on the quiet pan.");
  state.lastHint = "";
  return { ok: true, already };
}

export function logMetalCompare(state, nm) {
  if (!state.rockPicked) {
    state.lastHint = "Walk down and pick up the floor rock first. This comparison needs the stone in hand.";
    return { ok: false, reason: "no-rock" };
  }
  if (!Number.isFinite(nm) || (Math.abs(nm - 518) > 22 && Math.abs(nm - 589) > 22)) {
    state.lastHint = "Mark a metal line that is strong in one stellar trace and nearly missing in the other.";
    return { ok: false, reason: "line" };
  }
  state.metalMarkNm = nm;
  state.metalCompared = true;
  pushNote(
    state,
    "metal-lines",
    `A metal feature near ${Math.round(nm)} nm was present in one stellar trace and nearly absent in the other.`
  );
  return { ok: true };
}

export function logNucleosynthesis(state, claimId) {
  if (!state.metalCompared || !state.rockPicked || !ds05Complete(state)) {
    state.lastHint = "The rock and the metal-line comparison have to exist before a material claim.";
    return { ok: false, reason: "incomplete" };
  }
  if (claimId === "all-in-stars" || claimId === "all-at-start") {
    state.lastHint =
      claimId === "all-in-stars"
        ? "Not every element was made in stars. Hydrogen and helium have an earlier chapter."
        : "The metals were not all sitting here equally at the beginning.";
    return { ok: false, reason: "misconception", claimId };
  }
  if (claimId !== "heavy-from-stars") {
    return { ok: false, reason: "claim" };
  }
  const already = Boolean(state.nucleosynthesisLogged);
  state.nucleoClaim = claimId;
  state.nucleosynthesisLogged = true;
  pushNote(
    state,
    "nucleo-claim",
    "The floor rock connects ordinary matter to cosmic processes. Light elements are earlier; many heavier ones need stars, and the heaviest need explosions or neutron-star events."
  );
  state.lastHint = "";
  return { ok: true, already };
}

export function ds06Complete(state) {
  return Boolean(state.nucleosynthesisLogged && state.rockPicked && ds05Complete(state));
}

export function tryGalaxyAlign(state, catalog, galaxyId, shiftNm) {
  state.redshiftGalaxyId = galaxyId;
  state.redshiftShiftNm = shiftNm;
  state.redshiftTried = true;
  const gal = target(catalog, galaxyId);
  const rest = gal?.restLines || [486, 656];
  const want = gal?.redshiftNm ?? 0;
  const score = rest.reduce((sum, nm) => {
    const moved = nm + shiftNm;
    const best = (gal?.lines || []).reduce((min, line) => Math.min(min, Math.abs(line.nm - moved)), 80);
    return sum + best;
  }, 0) / rest.length;
  return { ok: true, score, matched: Math.abs(shiftNm - want) <= 8 && score < 18, want };
}

export function markRedshiftFeature(state, nm) {
  const marks = [...(state.redshiftMarks || [])];
  marks.push(nm);
  state.redshiftMarks = marks.slice(-6);
  return { ok: true };
}

export function placeRedshiftPoint(state, galaxyId, xPct, yPct) {
  if (!GALAXY_IDS.includes(galaxyId)) return { ok: false };
  state.redshiftPoints = {
    ...(state.redshiftPoints || {}),
    [galaxyId]: { x: clamp(xPct, 4, 96), y: clamp(yPct, 4, 96) }
  };
  return { ok: true };
}

export function logRedshiftTrend(state, catalog) {
  const points = state.redshiftPoints || {};
  const ranks = GALAXY_IDS.map((id) => ({
    id,
    rank: target(catalog, id)?.distanceRank || 0,
    shift: target(catalog, id)?.redshiftNm || 0,
    put: points[id]
  }));
  if (ranks.some((row) => !row.put)) {
    state.lastHint = "Place all three galaxy plates on shift versus distance rank.";
    return { ok: false, reason: "points" };
  }
  const ordered = [...ranks].sort((a, b) => a.rank - b.rank);
  const rising = ordered.every((row, i) => i === 0 || row.put.y >= ordered[i - 1].put.y - 4);
  if (!rising) {
    state.lastHint = "In this set, farther plates sit higher on the shift axis. The pattern is not a red color.";
    return { ok: false, reason: "trend" };
  }
  state.redshiftTrend = true;
  pushNote(state, "redshift-trend", "The known line pattern sat at longer wavelength on farther plates. That is a moved pattern, not a red star.");
  state.lastHint = "";
  return { ok: true };
}

export function rejectCompeting(state, storyId) {
  if (!state.redshiftTrend) {
    state.lastHint = "Plot the three plates first. Then see which competing story fails the farthest one.";
    return { ok: false, reason: "need-trend" };
  }
  if (storyId !== "all-same") {
    state.lastHint = "The story that fails is that every plate shifts by the same amount.";
    return { ok: false, reason: "story" };
  }
  state.competingRejected = true;
  state.lastHint = "";
  pushNote(state, "redshift-reject", "A single shared shift cannot fit the farthest plate.");
  return { ok: true };
}

export function ds07Complete(state) {
  return Boolean(state.redshiftTrend && state.competingRejected && ds06Complete(state));
}

export function pointHorn(state, dir, atFloor) {
  if (!atFloor) {
    state.lastHint = "The horn only belongs on the Quiet Floor. Station lights are the noise.";
    return { ok: false, reason: "not-at-floor" };
  }
  state.visitedFloor = true;
  state.hornPoint = dir;
  const tried = new Set(state.hornTried || []);
  tried.add(dir);
  state.hornTried = [...tried];
  if (dir === "zenith") {
    pushNote(state, "horn-zenith", "Overhead the horn was quieter — leftover sky, not the station wall.");
  }
  return { ok: true, dir, quiet: dir === "zenith", noisy: dir === "wall" };
}

export function pinOrigin(state, id) {
  if (!ORIGIN_LINES.includes(id)) return { ok: false };
  const set = new Set(state.originPinned || []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  state.originPinned = [...set];
  return { ok: true, pinned: state.originPinned };
}

export function logOriginCase(state) {
  if (!ds07Complete(state) || !ds06Complete(state)) {
    state.lastHint = "Expansion and abundance have to be in the tablet before a third line can join them.";
    return { ok: false, reason: "need-prior" };
  }
  if (state.hornPoint !== "zenith" || !(state.hornTried || []).includes("wall")) {
    state.lastHint = "Point the horn at the wall and then overhead. One noisy line stays weak by itself.";
    return { ok: false, reason: "horn" };
  }
  const pinned = new Set(state.originPinned || []);
  if (!ORIGIN_LINES.every((id) => pinned.has(id))) {
    state.lastHint = "Pin expansion, leftover glow, and abundance. A famous name is not a substitute.";
    return { ok: false, reason: "pins" };
  }
  const already = Boolean(state.originLogged);
  state.originLogged = true;
  pushNote(
    state,
    "origin-case",
    "Three lines of evidence: galaxy shifts, leftover quiet sky overhead, and metals that were not all present equally at the start."
  );
  state.lastHint = "";
  return { ok: true, already };
}

export function ds08Complete(state) {
  return Boolean(state.originLogged && ds07Complete(state));
}

export function setLaterTonight(state, on) {
  state.laterTonight = Boolean(on);
  if (state.laterTonight) state.nearbyChanged = true;
  return { ok: true, laterTonight: state.laterTonight };
}

export function readDistantPoster(state) {
  state.distantPosterSeen = true;
  pushNote(state, "poster-now", "The station poster captioned a distant outburst as happening now.");
  return { ok: true };
}

export function logLookback(state, claimId) {
  if (!ds03Complete(state) || !ds07Complete(state)) {
    state.lastHint = "Lookback needs a distance rank and the moved-line work already in the tablet.";
    return { ok: false, reason: "need-prior" };
  }
  if (!state.distantPosterSeen || !state.nearbyChanged) {
    state.lastHint = "Read the poster, then use later tonight at the eyepiece. The nearby star can change; the distant plate does not become live weather.";
    return { ok: false, reason: "need-contrast" };
  }
  if (claimId === "happening-now") {
    state.lastHint = "The distant plate is not a live feed. Happening now is an overclaim.";
    return { ok: false, reason: "overclaim" };
  }
  if (claimId !== "earlier-light") {
    return { ok: false, reason: "claim" };
  }
  const already = Boolean(state.lookbackLogged);
  state.lookbackClaim = claimId;
  state.lookbackLogged = true;
  pushNote(
    state,
    "lookback-claim",
    "The nearby variable changed later tonight. The distant outburst's light had already left. I cannot claim what is happening there now."
  );
  state.lastHint = "";
  return { ok: true, already };
}

export function ds09Complete(state) {
  return Boolean(state.lookbackLogged && ds07Complete(state));
}

export function toggleEnvelope(state, bucket, id) {
  const key = {
    observed: "envelopeObserved",
    inferred: "envelopeInferred",
    unknown: "envelopeUnknown",
    refuse: "envelopeRefused"
  }[bucket];
  if (!key) return { ok: false };
  const set = new Set(state[key] || []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  state[key] = [...set];
  return { ok: true, [key]: state[key] };
}

export function logEnvelope(state) {
  if (!ds08Complete(state) || !ds09Complete(state)) {
    state.lastHint = "The unlabeled envelope comes after the rest of the basin is in the tablet.";
    return { ok: false, reason: "need-prior" };
  }
  const obs = state.envelopeObserved || [];
  const inf = state.envelopeInferred || [];
  const unk = state.envelopeUnknown || [];
  const refuse = state.envelopeRefused || [];
  if (obs.includes("happening-now") || inf.includes("happening-now") || obs.includes("famous-name")) {
    state.lastHint = "Present-tense weather and a famous name are not observations of this envelope.";
    return { ok: false, reason: "overclaim" };
  }
  if (!obs.includes("spectrum-shape") && !obs.includes("peak-place")) {
    state.lastHint = "Start with what the trace actually showed.";
    return { ok: false, reason: "obs" };
  }
  if (!inf.includes("not-hotter")) {
    state.lastHint = "You can infer it is not hotter than the white star you already marked — from the peak, not from a nickname.";
    return { ok: false, reason: "inf" };
  }
  if (!unk.includes("distance") || !unk.includes("present-state")) {
    state.lastHint = "Distance and what is happening there now stay unknown.";
    return { ok: false, reason: "unk" };
  }
  if (!refuse.includes("happening-now") && !refuse.includes("famous-name") && !refuse.includes("exact-kelvin")) {
    state.lastHint = "Refuse at least one overclaim. Stopping is part of the case.";
    return { ok: false, reason: "refuse" };
  }
  const already = Boolean(state.envelopeLogged);
  state.envelopeLogged = true;
  pushNote(
    state,
    "envelope-claim",
    "Unlabeled target: I recorded a trace and a peak, inferred it is not hotter than the white comparison star, and left distance and present state unknown."
  );
  state.lastHint = "";
  return { ok: true, already };
}

export function ds10Complete(state) {
  return Boolean(state.envelopeLogged && ds08Complete(state) && ds09Complete(state));
}

export function dsAarEligible(state, ds01, ds02) {
  return Boolean(ds01 && ds02 && ds03Complete(state) && ds04Complete(state) && ds05Complete(state) && ds06Complete(state) && ds07Complete(state) && ds08Complete(state) && ds09Complete(state) && ds10Complete(state));
}

export function completeGuidance(state, ds01, ds02) {
  if (!ds03Complete(state)) {
    if (!state.visitedWest) {
      return pack("Two stars look equally bright. Is brightness distance?", "WALK", "Leave the station for the west rim cairn.", "West Rim Stake");
    }
    if (!state.visitedEast) {
      return pack("Does the shift reverse if you change ends of the baseline?", "WALK", "Carry the plates to the east rim.", "East Rim Stake");
    }
    return pack("Which star actually moved with the baseline?", "COMPARE", "Switch plate A and plate B from both cairns.", "West and East Rim Stakes");
  }
  if (!ds04Complete(state)) {
    return pack("What pattern appears if you place your own measurements?", "PLOT", "Put three measured stars on the unlabeled board.", "North Rim Station · unlabeled plot");
  }
  if (!ds05Complete(state)) {
    return pack("Do all stars live the same life?", "PREDICT", "Branch massive vs sun-like, then check the remnant plate.", "Station spectrograph");
  }
  if (!ds06Complete(state)) {
    if (!state.rockPicked) {
      return pack("What is the quiet pan made of?", "WALK", "Descend to the Quiet Floor and pick up the silicate.", "Quiet Floor");
    }
    return pack("Where did the metals in ordinary rock come from?", "COMPARE", "Mark a metal line present in one star and nearly absent in the other.", "Station spectrograph · Quiet Floor rock");
  }
  if (!ds07Complete(state)) {
    return pack("Did the known line pattern move?", "ALIGN", "Compare rest marks with galaxy plates, then plot shift against distance rank.", "Plate desk");
  }
  if (!ds08Complete(state)) {
    return pack("Can one famous name replace evidence?", "ASSEMBLE", "Point the horn on the Quiet Floor and pin three independent lines.", "Quiet Floor horn");
  }
  if (!ds09Complete(state)) {
    return pack("Is the distant outburst happening now?", "WATCH", "Read the poster, then use later tonight at the eyepiece.", "Station poster · dome eyepiece");
  }
  if (!ds10Complete(state)) {
    return pack("What can you honestly say about an unlabeled target?", "BOUND", "Sort observed, inferred, unknown, and a sentence you refuse.", "Plate desk · unlabeled envelope");
  }
  if (state.aar?.result !== "clearance") {
    return pack("What case does the tablet actually support?", "REPORT", "Make the case with Wren using evidence you earned.", "Wren's radio");
  }
  void ds01;
  void ds02;
  return pack("What did the light allow — and what did it refuse?", "HOLD", "Field clearance is earned. Painted Badlands stays closed.", "Field tablet");
}

export function completeActivePuzzle(state, ds01, ds02) {
  if (!ds01) return "DS-01";
  if (!ds02) return "DS-02";
  if (!ds03Complete(state)) return "DS-03";
  if (!ds04Complete(state)) return "DS-04";
  if (!ds05Complete(state)) return "DS-05";
  if (!ds06Complete(state)) return "DS-06";
  if (!ds07Complete(state)) return "DS-07";
  if (!ds08Complete(state)) return "DS-08";
  if (!ds09Complete(state)) return "DS-09";
  if (!ds10Complete(state)) return "DS-10";
  return "DS-10";
}

export function appendCompleteEvidence(groups, state) {
  const saw = groups.find((row) => row.label === "What I saw") || groups[0];
  const tested = groups.find((row) => row.label === "What I tested") || groups[1];
  const light = groups.find((row) => row.label === "What the light showed") || groups[2];
  let pattern = groups.find((row) => row.label === "Pattern");
  if (!pattern) {
    pattern = { label: "Pattern", cards: [] };
    groups.push(pattern);
  }
  let measure = groups.find((row) => row.label === "Measurement");
  if (!measure) {
    measure = { label: "Measurement", cards: [] };
    groups.push(measure);
  }
  let system = groups.find((row) => row.label === "System / relationship");
  if (!system) {
    system = { label: "System / relationship", cards: [] };
    groups.push(system);
  }
  let revised = groups.find((row) => row.label === "Revised explanation");
  if (!revised) {
    revised = { label: "Revised explanation", cards: [] };
    groups.push(revised);
  }
  const claim = groups.find((row) => row.label === "What I can claim") || groups[3];

  if (state.visitedWest) {
    saw.cards.push({
      id: "ds-saw-west",
      kind: "observation",
      title: "West Rim Stake",
      observation: "A cairn and baseline mark on the west rim."
    });
  }
  if (state.visitedEast) {
    saw.cards.push({
      id: "ds-saw-east",
      kind: "observation",
      title: "East Rim Stake",
      observation: "The matching cairn on the opposite rim."
    });
  }
  if (state.rockPicked) {
    saw.cards.push({
      id: "ds-saw-rock",
      kind: "observation",
      title: "Floor rock",
      observation: "A pale silicate picked up on the quiet pan."
    });
  }
  if (state.distantPosterSeen) {
    saw.cards.push({
      id: "ds-saw-poster",
      kind: "observation",
      title: "Event poster",
      observation: "The caption treated a distant outburst as happening now."
    });
  }
  if (state.cairnCompared) {
    tested.cards.push({
      id: "ds-tested-baseline",
      kind: "measurement",
      title: "Walked baseline",
      observation: "Season plates from both rims. Only one equally bright star reversed with the baseline."
    });
  }
  if (state.hornPoint) {
    tested.cards.push({
      id: "ds-tested-horn",
      kind: "measurement",
      title: "Horn pointing",
      observation:
        state.hornPoint === "zenith"
          ? "Overhead was quieter than the station wall."
          : `Last pointing: ${state.hornPoint}.`
    });
  }
  if (state.nearbyChanged) {
    tested.cards.push({
      id: "ds-tested-later",
      kind: "measurement",
      title: "Later tonight",
      observation: "The nearby variable changed. The distant plate did not become a live feed."
    });
  }
  if (state.metalCompared) {
    light.cards.push({
      id: "ds-light-metals",
      kind: "comparison",
      title: "Metal lines",
      observation:
        state.metalMarkNm != null
          ? `A metal feature near ${Math.round(state.metalMarkNm)} nm was strong in one star and nearly absent in the other.`
          : "Metal lines differed between the two stellar traces."
    });
  }
  if (state.redshiftTrend) {
    light.cards.push({
      id: "ds-light-redshift",
      kind: "pattern",
      title: "Moved lines",
      observation: "Known rest lines sat at longer wavelength together on farther galaxy plates."
    });
  }
  if (state.plotLogged) {
    pattern.cards.push({
      id: "ds-pattern-plot",
      kind: "pattern",
      title: "Player-built diagram",
      observation: "Three measured stars placed on unlabeled axes. The pattern arrived after the points."
    });
  }
  if (state.cairnCompared) {
    measure.cards.push({
      id: "ds-measure-shift",
      kind: "measurement",
      title: "Shift vs none",
      observation: "Equal apparent brightness. Different geometric shift."
    });
  }
  if (state.massLogged) {
    system.cards.push({
      id: "ds-system-mass",
      kind: "system",
      title: "Mass branches lives",
      observation: "The massive star's remnant plate did not match a sun-like future."
    });
  }
  if (state.nucleosynthesisLogged) {
    system.cards.push({
      id: "ds-system-matter",
      kind: "relationship",
      title: "Matter and stars",
      observation: "Floor rock plus missing metal lines: light elements earlier; many heavier ones need stellar processes."
    });
  }
  if (state.notes?.some((row) => row.id === "brightness-revision") || (state.brightnessGuess === "same-distance" && state.cairnConcluded)) {
    revised.cards.push({
      id: "ds-revised-brightness",
      kind: "revised-explanation",
      title: "Brightness revision",
      observation: "Equal brightness as equal distance no longer holds."
    });
  }
  if (state.cairnConcluded) {
    claim.cards.push({
      id: "ds-claim-cairn",
      kind: "revised-explanation",
      title: "Distance claim",
      observation: "Apparent brightness was insufficient to rank distance."
    });
  }
  if (state.originLogged) {
    claim.cards.push({
      id: "ds-claim-origin",
      kind: "revised-explanation",
      title: "Origin case",
      observation: "Expansion, leftover glow, and abundance — not a slogan."
    });
  }
  if (state.lookbackLogged) {
    claim.cards.push({
      id: "ds-claim-lookback",
      kind: "revised-explanation",
      title: "Lookback",
      observation: "The distant outburst is not a present-tense report."
    });
  }
  if (state.envelopeLogged) {
    claim.cards.push({
      id: "ds-claim-envelope",
      kind: "revised-explanation",
      title: "Bounded envelope",
      observation: "Observed a trace and peak; inferred not-hotter; left distance and present state unknown."
    });
  }
  return groups;
}

export function appendCompleteNotes(rows, state) {
  if (state.visitedWest) {
    rows.push({ id: "west-rim", title: "West Rim Stake", text: "End A of the baseline. Season plates live here because the viewpoint lives here." });
  }
  if (state.visitedEast) {
    rows.push({ id: "east-rim", title: "East Rim Stake", text: "End B. A nearby shift should reverse, not leap." });
  }
  if (state.rockPicked) {
    rows.push({ id: "quiet-rock", title: "Quiet Floor rock", text: "Ordinary silicate with a history that did not start in this hollow." });
  }
  if (state.originLogged) {
    rows.push({ id: "origin", title: "Three lines", text: "Expansion, leftover glow, abundance. No famous-name stamp." });
  }
  if (state.envelopeLogged) {
    rows.push({ id: "envelope", title: "Unlabeled envelope", text: "Honest properties only. A refused sentence is part of the case." });
  }
  return rows;
}

export function appendCompleteTruth(truth, state, catalog) {
  if (state.visitedWest) truth.known.push("the player stood at West Rim Stake");
  else {
    truth.unknown.push("West Rim Stake: not visited");
    truth.doNotClaim.push("a west-rim plate comparison");
  }
  if (state.visitedEast) truth.known.push("the player stood at East Rim Stake");
  else {
    truth.unknown.push("East Rim Stake: not visited");
    truth.doNotClaim.push("an east-rim plate comparison");
  }
  if (state.cairnCompared) truth.known.push("only one equally bright cairn star shifted with the baseline");
  else {
    truth.unknown.push("cairn shift comparison: not logged");
    truth.doNotClaim.push("that the brighter star is closer");
    truth.doNotClaim.push("stellar distances in parsecs");
  }
  if (state.cairnConcluded) truth.known.push("apparent brightness was insufficient to rank distance");
  if (state.plotLogged) truth.known.push("three measured stars were placed on unlabeled axes");
  else truth.doNotClaim.push("HR diagram region names as if the player labeled a poster");
  if (state.massLogged) truth.known.push("massive and sun-like stars do not share one life path");
  else truth.doNotClaim.push("that every star becomes a supernova");
  if (state.rockPicked) truth.known.push("a Quiet Floor silicate was picked up");
  else {
    truth.unknown.push("Quiet Floor rock: not collected");
    truth.doNotClaim.push("a floor-rock inspection");
  }
  if (state.nucleosynthesisLogged) {
    truth.known.push("heavy elements in the comparison require stellar processes; not all elements were made in stars");
  } else {
    truth.doNotClaim.push("that everything was made in stars");
  }
  if (state.redshiftTrend) truth.known.push("galaxy rest-line patterns sat at longer wavelength on farther plates");
  else {
    truth.unknown.push("galaxy line shift: not plotted");
    truth.doNotClaim.push("redshift as a red color");
    truth.doNotClaim.push("invented recession speeds");
  }
  if (state.originLogged) truth.known.push("origin case used expansion, leftover glow, and abundance");
  else truth.doNotClaim.push("a completed Big Bang proof from one slogan");
  if (state.lookbackLogged) truth.known.push("the distant outburst is not a present-tense observation");
  else truth.doNotClaim.push("the current state of a distant outburst");
  if (state.envelopeLogged) truth.known.push("the unlabeled target has bounded claims and explicit unknowns");
  else truth.doNotClaim.push("a catalog name or magnitude for the unlabeled envelope");
  if (state.aar?.result === "clearance") truth.known.push("Wren accepted the Dark Sky case");
  else truth.doNotClaim.push("field clearance for Dark Sky Basin");

  truth.expected.push("apparent brightness is not a distance rule");
  truth.expected.push("redshift is a shifted line pattern, not a red object");
  truth.expected.push("looking farther can mean seeing earlier");
  truth.science.push("initial mass strongly affects stellar evolution");
  truth.science.push("hydrogen and helium have an earlier origin than many heavier elements");
  truth.science.push("claims must stay inside recorded light");
  void catalog;
  return truth;
}

export function completeNext(state, ds01, ds02) {
  const guide = completeGuidance(state, ds01, ds02);
  return { id: guide.verb.toLowerCase(), text: `${guide.next} ${guide.where}` };
}

export function completePuzzleUse(state, ds01, ds02) {
  return {
    "DS-01": Boolean(ds01),
    "DS-02": Boolean(ds02),
    "DS-03": ds03Complete(state),
    "DS-04": ds04Complete(state),
    "DS-05": ds05Complete(state),
    "DS-06": ds06Complete(state),
    "DS-07": ds07Complete(state),
    "DS-08": ds08Complete(state),
    "DS-09": ds09Complete(state),
    "DS-10": ds10Complete(state)
  };
}

export function completeAarState(state) {
  return state.aar || completeEmptyFields().aar;
}

export function drawSeasonPlates(ctx, view) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#10141c";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#c8d0dc";
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${view.rimLabel || "Rim"} · plate ${view.plateSet || "A"}`, 16, 22);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(16, 32, width - 32, height - 48);
  for (const star of view.stars || []) {
    const x = (star.x / 100) * (width - 48) + 24;
    const y = (star.y / 100) * (height - 80) + 48;
    ctx.fillStyle = "#f4f6fb";
    ctx.globalAlpha = 0.35 + star.brightness * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d7e0ee";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(star.label, x, y + 22);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#9aa6b8";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Same apparent brightness. Watch which one moves.", 16, height - 8);
}

export function drawUnlabeledPlot(ctx, view) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#12141c";
  ctx.fillRect(0, 0, width, height);
  const left = 46;
  const top = 18;
  const plotW = width - 64;
  const plotH = height - 48;
  ctx.strokeStyle = "rgba(200, 210, 230, 0.4)";
  ctx.strokeRect(left, top, plotW, plotH);
  ctx.fillStyle = "#9aa6b8";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("shorter-wavelength peak", left + 70, height - 8);
  ctx.fillText("longer-wavelength peak", left + plotW - 80, height - 8);
  ctx.save();
  ctx.translate(14, top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("brighter after distance", 0, 0);
  ctx.restore();
  for (const [id, put] of Object.entries(view.placements || {})) {
    const x = left + (put.x / 100) * plotW;
    const y = top + (1 - put.y / 100) * plotH;
    ctx.fillStyle = id === "cooler-ember" ? "#f09a68" : id === "cairn-far" ? "#d7e7ff" : "#f4f6fb";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef8";
    ctx.font = "10px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(view.labels?.[id] || id, x + 10, y + 4);
  }
}

export function drawRedshiftPlot(ctx, view) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#12141c";
  ctx.fillRect(0, 0, width, height);
  const left = 48;
  const top = 16;
  const plotW = width - 68;
  const plotH = height - 46;
  ctx.strokeStyle = "rgba(200, 210, 230, 0.4)";
  ctx.strokeRect(left, top, plotW, plotH);
  ctx.fillStyle = "#9aa6b8";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("distance rank →", left + plotW / 2, height - 8);
  ctx.save();
  ctx.translate(16, top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("line-pattern shift", 0, 0);
  ctx.restore();
  for (const [id, put] of Object.entries(view.points || {})) {
    const x = left + (put.x / 100) * plotW;
    const y = top + (1 - put.y / 100) * plotH;
    ctx.fillStyle = "#c8b8e8";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eef8";
    ctx.font = "10px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(view.labels?.[id] || id, x + 10, y + 4);
  }
}

export function drawHornField(ctx, view) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#10141c";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#2a3040";
  ctx.fillRect(20, height - 70, width - 40, 42);
  ctx.fillStyle = "#9aa6b8";
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("horizon", width / 2, height - 18);
  ctx.fillText("wall (station)", 70, height - 80);
  ctx.fillText("zenith", width / 2, 28);
  const dir = view.hornPoint;
  const spots = { zenith: [width / 2, 70], wall: [70, height / 2], horizon: [width / 2, height - 88] };
  for (const [id, xy] of Object.entries(spots)) {
    ctx.fillStyle = dir === id ? "#c8e48a" : "#6a7388";
    ctx.beginPath();
    ctx.arc(xy[0], xy[1], dir === id ? 16 : 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d7e0ee";
  ctx.fillText(dir === "zenith" ? "Quieter leftover sky" : dir === "wall" ? "Noisy station" : dir === "horizon" ? "Local rim" : "Point the horn", width / 2, 48);
}

export function debugCompleteThrough(state, catalog, stopId, helpers) {
  const { seed01, seed02 } = helpers || {};
  seed01?.(state, catalog);
  if (stopId === "DS-01") return state;
  seed02?.(state, catalog);
  if (stopId === "DS-02") return state;
  logBrightnessGuess(state, "same-distance");
  viewRimPlate(state, "west");
  viewRimPlate(state, "east");
  markShiftedStar(state, CAIRN_NEAR);
  logCairnClaim(state);
  if (stopId === "DS-03") return state;
  placePlotStar(state, "west-twin", 24, 44);
  placePlotStar(state, "cooler-ember", 78, 38);
  placePlotStar(state, "cairn-far", 28, 78);
  logPlot(state);
  if (stopId === "DS-04") return state;
  pickMassBranch(state, "hot", "remnant");
  pickMassBranch(state, "sun", "no-supernova");
  checkRemnant(state, "blue-remnant");
  logMassClaim(state);
  if (stopId === "DS-05") return state;
  pickUpRock(state, true);
  logMetalCompare(state, 518);
  logNucleosynthesis(state, "heavy-from-stars");
  if (stopId === "DS-06") return state;
  placeRedshiftPoint(state, "galaxy-near", 22, 28);
  placeRedshiftPoint(state, "galaxy-mid", 48, 52);
  placeRedshiftPoint(state, "galaxy-far", 78, 82);
  logRedshiftTrend(state, catalog);
  rejectCompeting(state, "all-same");
  if (stopId === "DS-07") return state;
  pointHorn(state, "wall", true);
  pointHorn(state, "zenith", true);
  pinOrigin(state, "expansion");
  pinOrigin(state, "abundance");
  pinOrigin(state, "leftover");
  logOriginCase(state);
  if (stopId === "DS-08") return state;
  readDistantPoster(state);
  setLaterTonight(state, true);
  logLookback(state, "earlier-light");
  if (stopId === "DS-09") return state;
  toggleEnvelope(state, "observed", "spectrum-shape");
  toggleEnvelope(state, "observed", "peak-place");
  toggleEnvelope(state, "inferred", "not-hotter");
  toggleEnvelope(state, "unknown", "distance");
  toggleEnvelope(state, "unknown", "present-state");
  toggleEnvelope(state, "refuse", "happening-now");
  logEnvelope(state);
  return state;
}

function target(catalog, id) {
  return (catalog?.targets || []).find((row) => row.id === id) || null;
}

function inZone(put, zone) {
  if (!put || !zone) return false;
  return put.x >= zone.x[0] && put.x <= zone.x[1] && put.y >= zone.y[0] && put.y <= zone.y[1];
}

function pushNote(state, id, text) {
  const notes = state.notes || [];
  if (notes.some((row) => row.id === id)) return;
  notes.push({ id, text });
  state.notes = notes;
}

function pack(question, verb, next, where) {
  return { question, verb, next, where, lookingFor: next, done: [], pairs: [] };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
