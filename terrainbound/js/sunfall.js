/**
 * Sunfall Desert Topic 10 gameplay. Evidence from observing the sky, not from opening tools.
 */

import { dist, worldToLatLon, formatLatLon, formatFixed } from "./geomap.js";
import {
  createSkyState,
  skySnapshot,
  setHour,
  addDays,
  addHours,
  namedSeasonDay,
  MINUTES_PER_DAY,
  shadowFromSun,
  sunPosition,
  compassLabel,
  moonPhase,
  moonPosition,
  eclipseGeometry,
  tidalKind,
  tidalRangeM,
  orbitPoint,
  advanceTrueAnomaly,
  keplerCheck,
  periodFromA,
  PLANETS,
  rockyFromDensity,
  planetPeriodTrend,
  DEFAULT_LAT,
  GNOMON_M,
  minutesForPhase
} from "./celestial.js";

export function createSfState() {
  return {
    introSeen: false,
    sky: createSkyState(),
    clockUsed: false,
    shadows: [],
    rotationExplain: null,
    seasonObs: [],
    seasonExplain: null,
    distanceConfronted: false,
    orbit: { a: 1, e: 0.05, nuDeg: 20, measured: false, eccentricCompared: false },
    kepler: { a: 4, predictedP: null, checked: false, ok: false, modelChecked: false },
    moonLog: [],
    moonGeometry: false,
    moonPredict: null,
    moonPredictOk: false,
    eclipse: { aligned: false, tiltOn: true, understood: false, seenHit: false, seenMiss: false },
    tides: { compared: false, pattern: null, predict: null },
    planets: { classified: false, pattern: null },
    challenge: {
      site: null,
      when: null,
      moon: null,
      period: null,
      reasons: [],
      checked: false,
      ok: false,
      revised: false,
      presented: false
    },
    identifiedIds: [],
    foundIds: [],
    notes: [],
    lastHint: "",
    compareSampleSeen: false,
    pendingMoon: null,
    visitedSite: null
  };
}

export function sfToolsFlags(state) {
  return {
    solarUsed: state.shadows.length >= 3,
    clockUsed: state.clockUsed === true,
    orbitUsed: state.orbit.measured === true || state.orbit.eccentricCompared === true,
    skyLogUsed: state.moonLog.length >= 2
  };
}

function near(player, x, y, range = 70) {
  return dist(player.x, player.y, x, y) <= range;
}

function addNote(state, text) {
  if (!state.notes.includes(text)) state.notes = [...state.notes, text];
}

export function playerLat(region, player) {
  if (!region?.grid || !player) return DEFAULT_LAT;
  return worldToLatLon(region, player.x, player.y).lat;
}

export function liveSky(state, region, player) {
  return skySnapshot(state.sky, playerLat(region, player));
}

export function jumpObservation(state, kind, region, player) {
  const lat = playerLat(region, player);
  if (kind === "morning" || kind === "noon" || kind === "sunset" || kind === "night" || kind === "afternoon") {
    setHour(state.sky, kind, lat);
  } else if (kind === "+1h") addHours(state.sky, 1);
  else if (kind === "+1d") addDays(state.sky, 1);
  else if (kind === "+7d") addDays(state.sky, 7);
  else if (kind === "+1m") addDays(state.sky, 30);
  else if (kind === "winter" || kind === "equinox" || kind === "summer") {
    const hour = skySnapshot(state.sky, lat).hour;
    state.sky.minutes = namedSeasonDay(kind) * MINUTES_PER_DAY + hour * 60;
    setHour(state.sky, "noon", lat);
  }
  state.clockUsed = true;
  return { ok: true, sky: liveSky(state, region, player) };
}

export function recordShadow(state, spec, region, player) {
  const gnomon = spec.gnomon;
  if (!near(player, gnomon.x, gnomon.y, 80)) {
    return { ok: false, hint: "Stand at the solar marker if you want a shadow that belongs to this post." };
  }
  const sky = liveSky(state, region, player);
  if (!sky.shadow.visible) {
    return { ok: false, hint: "No useful shadow until the Sun is up." };
  }
  if (sky.timeName === "night" || sky.timeName === "sunset") {
    return { ok: false, hint: "Wait for daylight. The marker needs the Sun." };
  }
  const slot = sky.timeName === "noon" ? "noon" : sky.timeName === "morning" ? "morning" : "afternoon";
  const row = {
    slot,
    label: sky.label,
    length: Number(sky.shadow.length.toFixed(2)),
    direction: compassLabel(sky.shadow.directionDeg),
    directionDeg: sky.shadow.directionDeg,
    altitude: Number(sky.sun.altitudeDeg.toFixed(1)),
    minutes: state.sky.minutes
  };
  const existing = state.shadows.findIndex((item) => item.slot === slot);
  if (existing >= 0) state.shadows[existing] = row;
  else state.shadows = [...state.shadows, row];
  addNote(state, `Shadow ${slot}: ${row.length} m toward ${row.direction}`);
  return {
    ok: true,
    row,
    evidence: state.shadows.length >= 3 ? [{ competencyId: "rotation", kind: "shadow-log" }] : []
  };
}

export function explainRotation(state, choiceId) {
  state.rotationExplain = choiceId;
  const ok = choiceId === "earth-rotates";
  state.lastHint = ok
    ? "The Sun appeared to move because Earth turned under a sky that stays."
    : "The three shadows already show a path. What is moving — the Sun, or the ground you stand on?";
  return {
    ok,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "rotation", kind: "rotation-explain" }] : []
  };
}

export function recordSeasonNoon(state, spec, region, player) {
  const gnomon = spec.gnomon;
  if (!near(player, gnomon.x, gnomon.y, 90)) {
    return { ok: false, hint: "Use the same solar marker so the dates can be compared." };
  }
  const sky = liveSky(state, region, player);
  if (sky.timeName !== "noon") {
    return { ok: false, hint: "Advance to solar noon at this same post." };
  }
  const key = sky.seasonKey;
  const row = {
    key,
    season: sky.season,
    label: sky.label,
    altitude: Number(sky.sun.altitudeDeg.toFixed(1)),
    daylight: Number(sky.daylight.toFixed(2)),
    shadow: sky.shadow.visible ? Number(sky.shadow.length.toFixed(2)) : null,
    earthSunAu: Number(sky.earthSunAu.toFixed(4)),
    minutes: state.sky.minutes
  };
  const idx = state.seasonObs.findIndex((item) => item.key === key);
  if (idx >= 0) state.seasonObs[idx] = row;
  else state.seasonObs = [...state.seasonObs, row];
  addNote(state, `${row.season} noon: Sun ${row.altitude}°, day ${row.daylight} h, Earth–Sun ${row.earthSunAu} AU`);
  return {
    ok: true,
    row,
    evidence: state.seasonObs.length >= 3 ? [{ competencyId: "seasons", kind: "season-obs" }] : []
  };
}

export function seasonDistanceContradiction(obs) {
  const winter = obs.find((item) => item.key === "winter");
  const summer = obs.find((item) => item.key === "summer");
  if (!winter || !summer) return null;
  return {
    winterCloser: winter.earthSunAu < summer.earthSunAu,
    winterHigherSun: winter.altitude > summer.altitude,
    winterLongerDay: winter.daylight > summer.daylight
  };
}

export function explainSeasons(state, choiceId) {
  state.seasonExplain = choiceId;
  const contradiction = seasonDistanceContradiction(state.seasonObs);
  const distanceOk = contradiction?.winterCloser === true;
  const ok = choiceId === "tilt" && distanceOk;
  if (choiceId === "closer") {
    state.lastHint =
      "Winter noon here was closer to the Sun, not farther. Distance alone would predict the wrong season.";
    state.distanceConfronted = true;
  } else if (ok) {
    state.lastHint = "Tilt changes Sun angle and day length. Distance did not decide the season.";
    state.distanceConfronted = true;
  } else {
    state.lastHint = "Compare winter and summer noon: height of the Sun, length of the day, and Earth–Sun distance.";
  }
  return {
    ok,
    hint: state.lastHint,
    evidence: ok
      ? [
          { competencyId: "seasons", kind: "reject-distance" },
          { competencyId: "seasons", kind: "season-explain" }
        ]
      : []
  };
}

export function setOrbitEccentricity(state, e) {
  const next = Math.max(0, Math.min(0.7, Number(e)));
  const prev = state.orbit.e;
  state.orbit.e = next;
  if ((prev < 0.2 && next >= 0.35) || (prev >= 0.35 && next < 0.2)) {
    state.orbit.eccentricCompared = true;
  }
  if (next >= 0.3) state.orbit.eccentricCompared = true;
  return { ok: true, e: next };
}

export function measureOrbit(state) {
  const peri = orbitPoint({ a: state.orbit.a, e: state.orbit.e, nuDeg: 0 });
  const apo = orbitPoint({ a: state.orbit.a, e: state.orbit.e, nuDeg: 180 });
  const now = orbitPoint({ a: state.orbit.a, e: state.orbit.e, nuDeg: state.orbit.nuDeg });
  state.orbit.measured = true;
  addNote(
    state,
    `Orbit e=${state.orbit.e.toFixed(2)}: peri ${peri.r.toFixed(2)} AU faster than apo ${apo.r.toFixed(2)} AU`
  );
  return {
    ok: true,
    peri,
    apo,
    now,
    fasterAtPeri: peri.v > apo.v,
    evidence:
      state.orbit.eccentricCompared
        ? [
            { competencyId: "orbit", kind: "orbit-eccentric" },
            { competencyId: "orbit", kind: "orbit-speed" }
          ]
        : [{ competencyId: "orbit", kind: "orbit-speed" }]
  };
}

export function nudgeOrbit(state, dtYears = 0.05) {
  state.orbit.nuDeg = advanceTrueAnomaly(state.orbit.nuDeg, state.orbit.a, state.orbit.e, dtYears);
  return orbitPoint({ a: state.orbit.a, e: state.orbit.e, nuDeg: state.orbit.nuDeg });
}

export function predictKepler(state, predictedP) {
  state.kepler.predictedP = Number(predictedP);
  const check = keplerCheck(state.kepler.a, state.kepler.predictedP);
  state.kepler.checked = true;
  state.kepler.ok = check.ok;
  state.kepler.modelChecked = false;
  const a = state.kepler.a;
  state.lastHint = check.ok
    ? "That period fits P² = a³. Advance the model. The rock should come back."
    : `P² should equal a³. Here a = ${a} AU, so a³ = ${Math.pow(a, 3)}. P is in years.`;
  addNote(state, `Sandskip-1: a=${a} AU → predicted P=${predictedP}`);
  return {
    ok: false,
    pendingModel: check.ok,
    check,
    hint: state.lastHint,
    evidence: []
  };
}

export function advanceKeplerModel(state) {
  if (!state.kepler.ok) {
    state.lastHint = "Enter a period that satisfies P² = a³ before you advance the model.";
    return { ok: false, hint: state.lastHint };
  }
  state.kepler.modelChecked = true;
  state.lastHint = "The model returned on that schedule. The relation held.";
  return {
    ok: true,
    hint: state.lastHint,
    evidence: [{ competencyId: "math-orbit", kind: "kepler-predict" }]
  };
}

export function recordMoon(state, spec, region, player) {
  const site = spec.moonSite;
  if (!near(player, site.x, site.y, 100)) {
    return { ok: false, hint: "The night viewpoint is on the mesa rim. The station lights wash the sky here." };
  }
  if (!state.moonGeometry || !state.pendingMoon) {
    return { ok: false, hint: "Predict the phase from the model first. Then check it from the mesa." };
  }
  const sky = liveSky(state, region, player);
  if (!sky.night) {
    return { ok: false, hint: "The Moon is a night observation. Advance to night." };
  }
  const row = {
    label: sky.label,
    name: sky.moon.name,
    illumination: Number(sky.moon.illumination.toFixed(2)),
    altitude: Number(sky.moon.altitudeDeg.toFixed(1)),
    sunDown: sky.night,
    minutes: state.sky.minutes
  };
  const matched = row.name === state.pendingMoon;
  if (!matched) {
    state.lastHint = `The mesa showed ${row.name}. Your prediction was ${state.pendingMoon}. Fix the geometry, then look again.`;
    return { ok: false, hint: state.lastHint, row };
  }
  state.moonLog = [...state.moonLog, row].slice(-8);
  addNote(state, `Moon ${row.label}: ${row.name}, ${Math.round(row.illumination * 100)}% lit`);
  return {
    ok: true,
    row,
    evidence: [
      ...(state.moonLog.length >= 2 ? [{ competencyId: "moon", kind: "moon-log" }] : []),
      { competencyId: "moon", kind: "moon-predict" }
    ]
  };
}

export function useMoonGeometry(state) {
  state.moonGeometry = true;
  return {
    ok: true,
    evidence: [{ competencyId: "moon", kind: "moon-geometry" }]
  };
}

export function predictMoonNow(state, predictedName) {
  state.moonGeometry = true;
  state.pendingMoon = predictedName;
  const current = moonPhase(state.sky.minutes);
  const ok = predictedName === current.name;
  state.lastHint = ok
    ? "The model names that phase. Check it from the mesa at night."
    : "The lit face in the model is not that name. Move the geometry.";
  return {
    ok,
    current: current.name,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "moon", kind: "moon-geometry" }] : []
  };
}

export function predictMoon(state, predictedName) {
  const current = moonPhase(state.sky.minutes);
  state.moonPredict = predictedName;
  state.pendingMoon = current.name;
  const later = moonPhase(state.sky.minutes + 7 * MINUTES_PER_DAY);
  const ok = later.name === predictedName;
  state.moonPredictOk = ok;
  state.lastHint = ok
    ? "A week later the geometry showed what you named."
    : `After seven days the Moon was ${later.name}, not ${predictedName}.`;
  return {
    ok,
    later: later.name,
    current: current.name,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "moon", kind: "moon-predict" }] : []
  };
}

export function alignEclipse(state, tiltOn) {
  state.eclipse.tiltOn = tiltOn !== false;
  state.sky.tiltDeg = state.eclipse.tiltOn ? 5.1 : 0;
  state.eclipse.aligned = true;
  const geo = eclipseGeometry(state.sky.minutes, state.sky.tiltDeg, state.sky.nodeDeg);
  if (state.eclipse.tiltOn) state.eclipse.seenMiss = true;
  else state.eclipse.seenHit = true;
  const happening = Boolean(geo.solar || geo.lunar);
  state.lastHint = happening
    ? "This alignment produces an eclipse in the model."
    : "This alignment misses. The shadows do not meet.";
  return { ok: true, geo, happening, hint: state.lastHint };
}

export function predictEclipse(state, willEclipse) {
  const geo = eclipseGeometry(state.sky.minutes, state.eclipse.tiltOn ? 5.1 : 0, state.sky.nodeDeg);
  const happening = Boolean(geo.solar || geo.lunar || (!state.eclipse.tiltOn && (geo.isNew || geo.isFull)));
  const ok = Boolean(willEclipse) === happening;
  state.lastHint = ok
    ? happening
      ? "The model agrees: this one eclipses."
      : "The model agrees: this one misses."
    : happening
      ? "The shadows meet in the model. Your prediction said they would miss."
      : "The shadows miss. Tilt or nodes kept them apart.";
  return { ok, happening, hint: state.lastHint };
}

export function explainEclipse(state, choiceId) {
  const geo = eclipseGeometry(state.sky.minutes, state.eclipse.tiltOn ? 5.1 : 0, state.sky.nodeDeg);
  if (!state.eclipse.seenHit || !state.eclipse.seenMiss) {
    state.lastHint = "Predict a hit and a miss. Turn tilt off, then on. Watch the model.";
    return { ok: false, hint: state.lastHint, geo };
  }
  const ok = choiceId === "tilt";
  state.eclipse.understood = ok;
  state.lastHint = ok
    ? "The Moon goes around every month. The path is tilted, so most months the shadows miss."
    : "You already saw a month that lined up and a month that did not. What was different?";
  return {
    ok,
    geo,
    hint: state.lastHint,
    evidence: ok
      ? [
          { competencyId: "eclipses", kind: "eclipse-align" },
          { competencyId: "eclipses", kind: "eclipse-tilt" }
        ]
      : []
  };
}

export function predictTide(state, kind) {
  state.tides.predict = kind;
  state.lastHint =
    kind === "larger"
      ? "You predicted a large range at new Moon. Open the station table and test it."
      : "You predicted a small range at new Moon. Open the station table and test it.";
  return { ok: true, hint: state.lastHint };
}

export function compareTides(state, patternId) {
  if (!state.tides.predict) {
    state.lastHint = "Before the table: at new Moon, should tidal range be larger or smaller?";
    return { ok: false, hint: state.lastHint };
  }
  state.tides.pattern = patternId;
  const predictOk = state.tides.predict === "larger";
  const patternOk = patternId === "spring-new-full";
  const ok = predictOk && patternOk;
  if (!predictOk && patternOk) {
    state.lastHint = "New and full sit with the large ranges. That first prediction missed. The geometry is spring tides.";
  } else if (!patternOk) {
    state.lastHint = "Look at range next to phase. Largest numbers sit with new and full.";
  } else {
    state.lastHint = "Spring tides sit with new and full Moon. Neap tides sit with the quarters. Geometry predicted the table.";
  }
  state.tides.compared = ok;
  return {
    ok,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "data", kind: "tide-compare" }] : []
  };
}

export function classifyPlanets(state, patternId) {
  state.planets.pattern = patternId;
  const ok = patternId === "distance-period";
  state.planets.classified = ok;
  state.lastHint = ok
    ? "Farther objects take longer. Density, not a memorized list, sorted rocky from giant."
    : "Sort by density, then look at distance and period together.";
  return {
    ok,
    rocky: rockyFromDensity(),
    trend: planetPeriodTrend(),
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "data", kind: "planet-class" }] : []
  };
}

export function sfReadyForChallenge(state) {
  return (
    state.shadows.length >= 3 &&
    state.rotationExplain === "earth-rotates" &&
    state.seasonObs.length >= 3 &&
    state.seasonExplain === "tilt" &&
    state.orbit.measured &&
    state.kepler.ok &&
    state.kepler.modelChecked &&
    state.moonLog.length >= 2 &&
    state.moonGeometry &&
    state.eclipse.understood &&
    state.tides.compared &&
    state.planets.classified
  );
}

export function planObservation(state, spec, plan) {
  const site = spec.challenge.sites.find((item) => item.id === (plan.site || state.challenge.site));
  const when = plan.when || state.challenge.when;
  const moon = plan.moon || state.challenge.moon;
  const period = plan.period || state.challenge.period;
  state.challenge.site = site?.id || null;
  state.challenge.when = when;
  state.challenge.moon = moon;
  state.challenge.period = period;
  state.challenge.reasons = plan.reasons || state.challenge.reasons || [];
  const reasons = state.challenge.reasons;
  const siteOk = site?.ok === true;
  const whenOk = when === "night";
  const moonOk = moon === "thin";
  const periodOk = state.kepler.modelChecked && state.kepler.ok;
  const reasonOk =
    reasons.includes("open-horizon") && reasons.includes("dark-sky") && reasons.includes("return-time");
  const siteWalked = state.visitedSite === site?.id;
  const wasChecked = state.challenge.checked;
  const wasOk = state.challenge.ok;
  const ok = siteOk && whenOk && moonOk && periodOk && reasonOk && siteWalked;
  state.challenge.checked = true;
  if (ok && wasChecked && !wasOk) state.challenge.revised = true;
  state.challenge.ok = ok;
  state.lastHint = ok
    ? "The window holds: dark sky, open horizon, thin Moon, and the return you predicted."
    : !siteWalked
      ? "Walk to the coordinate pair. The map still matters here."
      : !siteOk
        ? "That pair sits where a wall eats the eastern sky. Try the other pair."
        : !whenOk
          ? "Daylight will wash a faint object. Night is the window."
          : !moonOk
            ? "A bright Moon will drown the target. Choose a thinner phase."
            : !periodOk
              ? "Use the period you computed from P² = a³."
              : "Say why: horizon, darkness, and return time.";
  return {
    ok,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "prediction", kind: "observe-plan" }] : []
  };
}

export function visitChallengeSite(state, spec, player) {
  for (const site of spec.challenge.sites) {
    if (near(player, site.x, site.y, 90)) {
      state.visitedSite = site.id;
      return { ok: true, site };
    }
  }
  return { ok: false };
}

export function presentSfChallenge(state) {
  if (!state.challenge.ok) return { ok: false };
  state.challenge.presented = true;
  return { ok: true };
}

export function addSfFind(state, id) {
  if (!state.foundIds.includes(id)) state.foundIds = [...state.foundIds, id];
}

export function identifyFind(state, id) {
  if (!state.foundIds.includes(id)) return { ok: false };
  if (!state.compareSampleSeen && id === "sf-dark-rock") {
    return { ok: false, hint: "A dark rock is still a dark rock until you compare it with something." };
  }
  if (!state.identifiedIds.includes(id)) state.identifiedIds = [...state.identifiedIds, id];
  return { ok: true };
}

export function sfNoteModel(spec, state) {
  const notes = [];
  if (state.introSeen) notes.push({ title: "Observing campaign", text: spec.intro.lines.join(" ") });
  if (state.shadows.length) {
    notes.push({
      title: "Moving shadow",
      text: state.shadows.map((row) => `${row.slot}: ${row.length} m ${row.direction}`).join(" · ")
    });
  }
  if (state.rotationExplain === "earth-rotates") {
    notes.push({ title: "Daily sky", text: "Apparent solar motion from Earth's rotation." });
  }
  if (state.seasonObs.length) {
    notes.push({
      title: "Yearly Sun",
      text: state.seasonObs.map((row) => `${row.season} noon ${row.altitude}° / ${row.earthSunAu} AU`).join(" · ")
    });
  }
  if (state.seasonExplain === "tilt") {
    notes.push({ title: "Seasons", text: "Tilt, not Earth–Sun distance." });
  }
  if (state.orbit.measured) notes.push({ title: "Orbit", text: `Eccentricity ${state.orbit.e.toFixed(2)} measured.` });
  if (state.kepler.ok) notes.push({ title: "Sandskip-1", text: `Period ${state.kepler.predictedP} from a = ${state.kepler.a} AU.` });
  if (state.moonLog.length) {
    notes.push({
      title: "Moon log",
      text: state.moonLog.map((row) => `${row.name}`).join(" → ")
    });
  }
  if (state.eclipse.understood) notes.push({ title: "Eclipses", text: "Tilt keeps most months from lining up." });
  if (state.tides.compared) notes.push({ title: "Coastal tide station", text: "Spring with new/full; neap with quarters." });
  if (state.planets.classified) notes.push({ title: "Sky data", text: "Distance and period rise together." });
  if (state.challenge.ok) notes.push({ title: spec.challenge.title, text: spec.completeJournalEntry.text });
  for (const extra of state.notes) {
    if (!notes.some((item) => item.text.includes(extra))) {
      notes.push({ title: "Field note", text: extra });
    }
  }
  return notes;
}

export function applySfEvidence(mastery, recordEvidenceFn, events) {
  const applied = [];
  for (const event of events || []) {
    recordEvidenceFn(mastery, {
      competencyId: event.competencyId,
      regionId: "sunfall-desert",
      kind: event.kind,
      source: "gameplay",
      demonstrated: true,
      action: event.kind,
      result: "demonstrated"
    });
    applied.push(event);
  }
  return applied;
}

export function tideRows() {
  const phases = ["new", "first quarter", "full", "last quarter", "waxing crescent", "waning gibbous"];
  return phases.map((name, i) => {
    const minutes = minutesForPhase(name);
    const moon = moonPhase(minutes);
    return {
      id: `t${i}`,
      date: `Day ${i + 1}`,
      phase: moon.name,
      range: tidalRangeM(moon),
      kind: tidalKind(moon)
    };
  });
}

export function sfInspectTarget(spec, catalog, region, player, state) {
  let best = null;
  let bestD = 74;
  const gnomon = spec.gnomon;
  const dG = dist(player.x, player.y, gnomon.x, gnomon.y);
  if (dG < bestD) {
    best = { kind: "gnomon", id: "gnomon", spec: gnomon, x: gnomon.x, y: gnomon.y };
    bestD = dG;
  }
  const moonSite = spec.moonSite;
  const dM = dist(player.x, player.y, moonSite.x, moonSite.y);
  if (dM < bestD) {
    best = { kind: "moon-site", id: "moon-site", spec: moonSite, x: moonSite.x, y: moonSite.y };
    bestD = dM;
  }
  const board = spec.orbitBoard;
  const dB = dist(player.x, player.y, board.x, board.y);
  if (dB < bestD) {
    best = { kind: "orbit-board", id: "orbit-board", spec: board, x: board.x, y: board.y };
    bestD = dB;
  }
  const tides = spec.tideDesk;
  const dT = dist(player.x, player.y, tides.x, tides.y);
  if (dT < bestD) {
    best = { kind: "tide-desk", id: "tide-desk", spec: tides, x: tides.x, y: tides.y };
    bestD = dT;
  }
  const planets = spec.planetDesk;
  const dP = dist(player.x, player.y, planets.x, planets.y);
  if (dP < bestD) {
    best = { kind: "planet-desk", id: "planet-desk", spec: planets, x: planets.x, y: planets.y };
    bestD = dP;
  }
  const eclipse = spec.eclipseDesk;
  const dE = dist(player.x, player.y, eclipse.x, eclipse.y);
  if (dE < bestD) {
    best = { kind: "eclipse-desk", id: "eclipse-desk", spec: eclipse, x: eclipse.x, y: eclipse.y };
    bestD = dE;
  }
  const sample = spec.compareSample;
  const dS = dist(player.x, player.y, sample.x, sample.y);
  if (dS < bestD) {
    best = { kind: "compare-sample", id: "compare-sample", spec: sample, x: sample.x, y: sample.y };
    bestD = dS;
  }
  for (const item of catalog.items) {
    const d = dist(player.x, player.y, item.x, item.y);
    const reach = item.radius || 56;
    if (d <= reach && d < bestD) {
      best = { kind: "discovery", id: item.id, item, x: item.x, y: item.y };
      bestD = d;
    }
  }
  for (const feature of region.features || []) {
    const d = dist(player.x, player.y, feature.x, feature.y);
    if (d < 64 && d < bestD && feature.kind !== "station") {
      best = { kind: "feature", id: feature.id, spec: feature, x: feature.x, y: feature.y };
      bestD = d;
    }
  }
  for (const site of spec.challenge?.sites || []) {
    const d = dist(player.x, player.y, site.x, site.y);
    if (d < 90 && d < bestD) {
      best = { kind: "sf-site", id: site.id, spec: site, x: site.x, y: site.y };
      bestD = d;
    }
  }
  return best;
}

export function sfBoardView(kind, state, spec, sky) {
  if (kind === "shadow") {
    return {
      title: "Why does the shadow move?",
      lead: spec.gnomon.prompt,
      status: state.lastHint,
      ok: state.rotationExplain === "earth-rotates",
      table: {
        columns: ["Time", "Length", "Direction", "Sun height"],
        rows: state.shadows.map((row) => [row.slot, `${row.length} m`, row.direction, `${row.altitude}°`])
      },
      groups: state.shadows.length >= 3
        ? [{ id: "explain", label: "What moved?", selected: state.rotationExplain, items: spec.rotationChoices }]
        : [],
      hideTry: state.shadows.length < 3
    };
  }
  if (kind === "seasons") {
    return {
      title: "The yearly Sun",
      lead: "Same marker. Winter, equinox, summer — noon. Compare height, day length, and Earth–Sun distance.",
      status: state.lastHint,
      ok: state.seasonExplain === "tilt",
      table: {
        columns: ["Season", "Noon Sun", "Day length", "Earth–Sun"],
        rows: state.seasonObs.map((row) => [row.season, `${row.altitude}°`, `${row.daylight} h`, `${row.earthSunAu} AU`])
      },
      groups: state.seasonObs.length >= 3
        ? [{ id: "explain", label: "What causes the seasons here?", selected: state.seasonExplain, items: spec.seasonChoices }]
        : [],
      hideTry: state.seasonObs.length < 3
    };
  }
  if (kind === "orbit") {
    return {
      title: "Reading an orbit",
      lead: "The Sun sits at a focus. Change eccentricity. Measure perihelion against aphelion.",
      status: state.lastHint || `e = ${state.orbit.e.toFixed(2)}`,
      ok: state.orbit.measured && state.orbit.eccentricCompared,
      diagram: { kind: "orbit", a: state.orbit.a, e: state.orbit.e, nuDeg: state.orbit.nuDeg, sectors: true },
      groups: [
        {
          id: "ecc",
          label: "Eccentricity",
          selected: String(state.orbit.e),
          items: [
            { id: "0.05", label: "Near circular" },
            { id: "0.45", label: "More elliptical" }
          ]
        }
      ],
      tryLabel: "Record measurements"
    };
  }
  if (kind === "kepler") {
    return {
      title: "When does Sandskip-1 return?",
      lead: `a = ${state.kepler.a} AU. In these units P² = a³ (P in years). Compute P, then advance the model.`,
      status: state.lastHint,
      ok: state.kepler.modelChecked,
      numberInput: {
        id: "period",
        label: "Period (years)",
        value: state.kepler.predictedP ?? ""
      },
      tryLabel: state.kepler.ok && !state.kepler.modelChecked ? "Advance the model" : "Check P² = a³"
    };
  }
  if (kind === "moon") {
    return {
      title: "Why did the Moon change shape?",
      lead: "The Moon is always half lit. The phase is the geometry we see.",
      status: state.lastHint,
      ok: state.moonPredictOk,
      diagram: { kind: "moon", moon: sky?.moon },
      table: {
        columns: ["When", "Appearance", "Lit"],
        rows: state.moonLog.map((row) => [row.label, row.name, `${Math.round(row.illumination * 100)}%`])
      },
      groups: [
        {
          id: "now",
          label: "From this geometry, the phase is",
          selected: state.pendingMoon,
          items: spec.moonChoices
        }
      ],
      hideTry: false,
      tryLabel: "Lock prediction"
    };
  }
  if (kind === "eclipse") {
    return {
      title: "Why not every month?",
      lead: "Align Sun, Earth, and Moon. Then turn the tilt on.",
      status: state.lastHint,
      ok: state.eclipse.understood,
      diagram: { kind: "eclipse", geo: eclipseGeometry(state.sky.minutes, state.eclipse.tiltOn ? 5.1 : 0, state.sky.nodeDeg) },
      groups: [
        {
          id: "tilt",
          label: "Moon path",
          selected: state.eclipse.tiltOn ? "on" : "off",
          items: [
            { id: "off", label: "No tilt" },
            { id: "on", label: "Tilt on" }
          ]
        },
        {
          id: "will",
          label: "Does this alignment eclipse?",
          selected: state._eclipseWill,
          items: [
            { id: "yes", label: "Yes — shadows meet" },
            { id: "no", label: "No — they miss" }
          ]
        },
        { id: "explain", label: "Why isn't there an eclipse every month?", selected: null, items: spec.eclipseChoices }
      ]
    };
  }
  if (kind === "tides") {
    const rows = tideRows();
    const revealed = Boolean(state.tides.predict);
    return {
      title: "A coastal tide station",
      lead: revealed
        ? "Remote numbers. Compare range with Moon phase."
        : "Before the table: at new Moon, should tidal range be larger or smaller?",
      status: state.lastHint,
      ok: state.tides.compared,
      table: revealed
        ? {
            columns: ["Date", "Moon", "Range (m)", "Kind"],
            rows: rows.map((row) => [row.date, row.phase, String(row.range), row.kind])
          }
        : null,
      groups: revealed
        ? [{ id: "pattern", label: "What does the table show?", selected: state.tides.pattern, items: spec.tideChoices }]
        : [
            {
              id: "predict",
              label: "New Moon range",
              selected: state.tides.predict,
              items: [
                { id: "larger", label: "Larger (spring)" },
                { id: "smaller", label: "Smaller (neap)" }
              ]
            }
          ]
    };
  }
  if (kind === "planets") {
    return {
      title: "Observatory planet log",
      lead: "Do not memorize the names. Ask which worlds behave alike.",
      status: state.lastHint,
      ok: state.planets.classified,
      table: {
        columns: ["Object", "Density", "Distance", "Period"],
        rows: PLANETS.map((p) => [p.name, String(p.density), String(p.a), String(p.p)])
      },
      groups: [{ id: "pattern", label: "What relationship holds?", selected: state.planets.pattern, items: spec.planetChoices }]
    };
  }
  if (kind === "challenge") {
    return {
      title: spec.challenge.title,
      lead: spec.challenge.goal,
      status: state.lastHint,
      ok: state.challenge.ok,
      groups: [
        { id: "site", label: "Coordinate pair (walk there)", selected: state.challenge.site, items: spec.challenge.sites },
        { id: "when", label: "When", selected: state.challenge.when, items: spec.challenge.when },
        { id: "moon", label: "Moon", selected: state.challenge.moon, items: spec.challenge.moon },
        { id: "reason", label: "Why this plan", selected: state.challenge.reasons, items: spec.challenge.reasons }
      ],
      tryLabel: state.challenge.checked && !state.challenge.ok ? "Revise the plan" : "Try this plan"
    };
  }
  return { title: "Field observation", lead: "", groups: [] };
}
