/**
 * High Country Topic 2 gameplay. Evidence from use, not from opening tools.
 */

import {
  worldToLatLon,
  formatLatLon,
  formatFixed,
  elevationMeters,
  routeMetrics,
  trailById,
  sampleProfile,
  profileShapeId,
  contourCrossings,
  layerGeometry,
  createMapState,
  toggleMapLayer,
  hasLayer
} from "./geomap.js";
import { dist } from "./geomap.js";

export function createHcState() {
  return {
    introSeen: false,
    mapOpened: false,
    markers: {},
    measuredRoutes: [],
    routeChoice: null,
    routeReasons: [],
    routeCompared: false,
    mapMode: "world",
    terrainCompares: [],
    stakes: [],
    contourLine: [],
    contourOk: false,
    contourHint: "",
    profilePredict: null,
    profileGenerated: false,
    profileMatch: false,
    mapState: createMapState(),
    gisSite: null,
    gisOk: false,
    layerTypesInspected: [],
    imageryCompared: false,
    washoutSeen: false,
    depths: [],
    challengeRoute: null,
    challengeReasons: [],
    challengeOk: false,
    challengePresented: false,
    foundIds: [],
    notes: [],
    lastHint: "",
    scaleEstimates: [],
    cacheFound: false,
    slopePredict: null,
    terrainChoices: {}
  };
}

export function hcToolsFlags(state) {
  return {
    coordinatesUsed: recordedMarkerCount(state) >= 2 && Boolean(state.cacheFound),
    scaleUsed: (state.scaleEstimates || []).filter((row) => row.ok).length >= 2,
    topoRead: state.contourOk || state.terrainCompares.length >= 2,
    elevationRead: state.stakes.length >= 3,
    profileUsed: state.profileMatch === true,
    gisUsed: state.gisOk === true
  };
}

function near(player, x, y, range = 64) {
  return dist(player.x, player.y, x, y) <= range;
}

export function markerPrecision(player, marker) {
  const d = dist(player.x, player.y, marker.x, marker.y);
  if (d <= 28) return 5;
  if (d <= 70) return 4;
  return 3;
}

export function liveReading(region, player, digits) {
  return formatLatLon(worldToLatLon(region, player.x, player.y), digits);
}

export function recordMarker(state, spec, markerId, region, player) {
  const marker = spec.markers.find((item) => item.id === markerId);
  if (!marker) return { ok: false, reason: "unknown" };
  if (!near(player, marker.x, marker.y, 86)) {
    return {
      ok: false,
      reason: "far",
      hint: "Walk to the brass cap. A reading from here would belong to a different place."
    };
  }
  const digits = markerPrecision(player, marker);
  const ll = worldToLatLon(region, player.x, player.y);
  const reading = formatLatLon(ll, digits);
  const already = Boolean(state.markers[markerId]);
  state.markers[markerId] = {
    id: markerId,
    name: marker.name,
    digits,
    lat: ll.lat,
    lon: ll.lon,
    reading,
    x: player.x,
    y: player.y
  };
  addNote(state, `${marker.name}: ${reading}`);
  return {
    ok: true,
    already,
    digits,
    reading,
    evidence: digits >= 4 ? [{ competencyId: "location", kind: "record-marker" }] : []
  };
}

export function recordedMarkerCount(state, minDigits = 4) {
  return Object.values(state.markers).filter((item) => item.digits >= minDigits).length;
}

export function compareMarkerAxes(state) {
  const rows = Object.values(state.markers);
  if (rows.length < 2) return null;
  const north = [...rows].sort((a, b) => b.lat - a.lat)[0];
  const east = [...rows].sort((a, b) => b.lon - a.lon)[0];
  return { farthestNorth: north.name, farthestEast: east.name };
}

export function measureRoute(state, spec, region, heightAtFn, trailId) {
  const trail = trailById(region, trailId);
  if (!trail) return { ok: false };
  const first = !state.measuredRoutes.includes(trailId);
  const metrics = routeMetrics(region, heightAtFn, trail);
  if (first) state.measuredRoutes = [...state.measuredRoutes, trailId];
  const a = trailById(region, spec.routes.a.id);
  const b = trailById(region, spec.routes.b.id);
  const pair =
    a && b
      ? {
          a: routeMetrics(region, heightAtFn, a),
          b: routeMetrics(region, heightAtFn, b)
        }
      : null;
  return {
    ok: true,
    metrics,
    pair,
    evidence: []
  };
}

export function estimateScale(state, spec, region, heightAtFn, trailId, estimateMeters) {
  const trail = trailById(region, trailId);
  if (!trail) return { ok: false };
  const actual = routeMetrics(region, heightAtFn, trail).distance;
  const guess = Number(estimateMeters);
  if (!Number.isFinite(guess) || guess <= 0) {
    return { ok: false, hint: "Use the scale bar. Enter a distance in meters." };
  }
  const err = Math.abs(guess - actual) / actual;
  const ok = err <= 0.3;
  const row = { trailId, guess, actual: Math.round(actual), ok };
  state.scaleEstimates = [...(state.scaleEstimates || []).filter((item) => item.trailId !== trailId), row];
  if (!ok) {
    state.lastHint = `The sketch bar is ${spec.scaleBarMeters || 200} m. Count bars along the trail. Your ${Math.round(guess)} m does not match the land.`;
    return { ok: false, hint: state.lastHint, actual, guess };
  }
  if (!state.measuredRoutes.includes(trailId)) state.measuredRoutes = [...state.measuredRoutes, trailId];
  state.lastHint = `You estimated ${Math.round(guess)} m. The walk is about ${Math.round(actual)} m. Close enough to trust the scale.`;
  return {
    ok: true,
    hint: state.lastHint,
    actual,
    guess,
    evidence: [{ competencyId: "scale", kind: "measure-route" }]
  };
}

export function recordCache(state, spec, region, player) {
  const cache = spec.cache;
  if (!cache) return { ok: false };
  if (!near(player, cache.x, cache.y, 48)) {
    const live = liveReading(region, player, 4);
    state.lastHint = `Keep walking. Live reading ${live}. Match the cache pair.`;
    return { ok: false, hint: state.lastHint, live };
  }
  const already = state.cacheFound;
  state.cacheFound = true;
  const reading = liveReading(region, player, 5);
  addNote(state, `Cache: ${reading}`);
  return {
    ok: true,
    already,
    reading,
    evidence: already ? [] : [{ competencyId: "location", kind: "navigate-coord" }]
  };
}

export function cacheTarget(region, spec) {
  if (!spec?.cache) return "";
  return formatLatLon(worldToLatLon(region, spec.cache.x, spec.cache.y), 4);
}

export function compareRoutes(state, spec, choiceId, reasonIds) {
  const reasons = reasonIds || [];
  state.routeChoice = choiceId;
  state.routeReasons = reasons;
  const heavyOk = spec.routes.strongHeavy.includes(choiceId);
  const usedGentle = reasons.includes("gentler") || reasons.includes("heavy-case");
  const usedMap =
    reasons.includes("tight-contours") ||
    reasons.includes("wide-contours") ||
    reasons.includes("shorter") ||
    usedGentle;
  const ok = heavyOk && usedGentle && usedMap;
  state.routeCompared = ok;
  state.lastHint = ok
    ? "The longer trail asks less of anyone carrying a case."
    : heavyOk
      ? "You picked the gentler trail. Say why the map agrees."
      : "The west trail is shorter. A heavy case cares more about steepness than about minutes.";
  return {
    ok,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "gradient", kind: "compare-routes" }] : []
  };
}

export function toggleHcTopo(state) {
  state.mapMode = state.mapMode === "topo" ? "world" : "topo";
  state.mapState.mode = state.mapMode;
  return state.mapMode;
}

export function compareTerrain(state, spec, featureId, spacingChoice) {
  const item = spec.terrainCompares.find((entry) => entry.id === featureId);
  if (!item) return { ok: false };
  state.terrainChoices = { ...(state.terrainChoices || {}), [featureId]: spacingChoice };
  if (spacingChoice !== item.expect) {
    state.lastHint = "Walk the land. Then look at how close the topo lines sit. Do not guess from a vocabulary word.";
    return { ok: false, hint: state.lastHint, prompt: item.prompt };
  }
  if (!state.terrainCompares.includes(featureId)) {
    state.terrainCompares = [...state.terrainCompares, featureId];
  }
  return {
    ok: true,
    prompt: item.prompt,
    evidence: [
      { competencyId: "contours", kind: "terrain-compare" },
      { competencyId: "spatial", kind: "terrain-compare" }
    ]
  };
}

export function collectStake(state, spec, stakeId, player) {
  const stake = spec.stakes.find((item) => item.id === stakeId);
  if (!stake) return { ok: false };
  if (!near(player, stake.x, stake.y, 70)) {
    return { ok: false, hint: "Stand at the stake to read the number on it." };
  }
  if (!state.stakes.includes(stakeId)) state.stakes = [...state.stakes, stakeId];
  addNote(state, `Stake ${stake.elev} m`);
  return {
    ok: true,
    elev: stake.elev,
    evidence: [{ competencyId: "elevation", kind: "read-elevation" }]
  };
}

export function connectContour(state, spec, pointIds) {
  const target = spec.contour.targetElev;
  const ids = pointIds || [];
  state.contourLine = ids;
  const wrong = ids
    .map((id) => spec.stakes.find((item) => item.id === id))
    .filter((item) => item && item.elev !== target);
  if (wrong.length) {
    state.contourOk = false;
    state.contourHint = spec.contour.wrongCrossHint
      .replace("{elev}", String(wrong[0].elev))
      .replace("{target}", String(target));
    return { ok: false, hint: state.contourHint };
  }
  const needed = spec.contour.correctIds;
  const hasAll = needed.every((id) => ids.includes(id));
  if (!hasAll || ids.length < needed.length) {
    state.contourOk = false;
    state.contourHint = `A ${target} m line should meet the stakes marked ${target} m.`;
    return { ok: false, hint: state.contourHint };
  }
  state.contourOk = true;
  state.contourHint = `${target} m contour. Interval ${spec.contour.interval} m.`;
  return {
    ok: true,
    hint: state.contourHint,
    evidence: [{ competencyId: "contours", kind: "connect-contour" }]
  };
}

export function predictProfile(state, spec, shapeId) {
  state.profilePredict = shapeId;
  return { ok: true, predicted: shapeId, correct: shapeId === spec.profile.correctShape };
}

export function generateProfile(state, spec, region, heightAtFn) {
  if (!state.profilePredict) {
    state.lastHint = "Guess the side view from the map first. Then generate the profile.";
    return { ok: false, hint: state.lastHint, profile: null, match: false };
  }
  const a = spec.profile.a;
  const b = spec.profile.b;
  const profile = sampleProfile(region, heightAtFn, a.x, a.y, b.x, b.y);
  const shape = profileShapeId(profile);
  state.profileGenerated = true;
  const predicted = state.profilePredict;
  const match = predicted === spec.profile.correctShape || predicted === shape;
  state.profileMatch = Boolean(predicted) && match;
  state.lastHint = state.profileMatch
    ? "The rise, a small drop, then the last climb. Side view from plan view."
    : "The generated line is not a steady ramp. Walk the last rise or look at the topo. Then predict again.";
  if (!state.profileMatch) state.profileGenerated = true;
  return {
    ok: true,
    profile,
    shape,
    match: state.profileMatch,
    hint: state.lastHint,
    evidence: state.profileMatch ? [{ competencyId: "profile", kind: "profile-compare" }] : []
  };
}

export function pickGisSite(state, spec, siteId) {
  const site = spec.gis.sites.find((item) => item.id === siteId);
  if (!site) return { ok: false };
  const layers = state.mapState.layersOn;
  const need = spec.gis.needLayers;
  const used = need.filter((id) => layers.includes(id) || id === "trails");
  const enoughLayers = used.length >= 2 || need.every((id) => hasLayer(state.mapState, id) || id === "trails");
  state.gisSite = siteId;
  if (!site.ok) {
    state.gisOk = false;
    state.lastHint = site.why;
    return { ok: false, hint: site.why };
  }
  if (!enoughLayers) {
    state.gisOk = false;
    state.lastHint = "Turn on more than one layer. Trails alone cannot tell you about wet ground or slope.";
    return { ok: false, hint: state.lastHint };
  }
  state.gisOk = true;
  state.lastHint = site.why;
  return {
    ok: true,
    hint: site.why,
    evidence: [{ competencyId: "gis", kind: "combine-layers" }]
  };
}

export function inspectLayerType(state, spec, layerId) {
  const geometry = layerGeometry(spec.layers, layerId);
  if (!geometry) return { ok: false };
  if (!state.layerTypesInspected.includes(layerId)) {
    state.layerTypesInspected = [...state.layerTypesInspected, layerId];
  }
  const specLayer = spec.layers.find((item) => item.id === layerId);
  return {
    ok: true,
    geometry,
    example: specLayer.example,
    evidence:
      state.layerTypesInspected.length >= 1 && state.gisOk
        ? [{ competencyId: "representation", kind: "inspect-layer-type" }]
        : []
  };
}

export function predictWashoutSlope(state, choiceId) {
  state.slopePredict = choiceId;
  const ok = choiceId === "west";
  state.lastHint = ok
      ? "Steep ground sheds water faster. That is why this bank failed."
    : "Walk the west face, then the meadow. Which slope made your knees work?";
  return { ok, hint: state.lastHint };
}

export function compareImagery(state, spec, player, washout) {
  const sawGround = state.washoutSeen || (washout && near(player, washout.x, washout.y, 90));
  if (sawGround) state.washoutSeen = true;
  if (!state.slopePredict) {
    return { ok: false, hint: "Before the image: predict which trail sheds water faster after rain." };
  }
  const layersOn = hasLayer(state.mapState, "imagery");
  if (!sawGround && !layersOn) {
    return { ok: false, hint: "Look at the newer image, or walk the west switchback." };
  }
  state.imageryCompared = true;
  addNote(state, spec.imagery.note);
  return {
    ok: true,
    note: spec.imagery.note,
    evidence: [{ competencyId: "remote", kind: "compare-imagery" }]
  };
}

export function recordDepth(state, spec, pointId, player) {
  const point = spec.bathymetry.points.find((item) => item.id === pointId);
  if (!point) return { ok: false };
  if (!near(player, point.x, point.y, 80)) {
    return { ok: false, hint: "Take the depth from the dock line." };
  }
  if (!state.depths.includes(pointId)) state.depths = [...state.depths, pointId];
  addNote(state, `Depth ${point.depth} m`);
  return { ok: true, depth: point.depth, count: state.depths.length };
}

export function planChallengeRoute(state, spec, routeId, reasonIds) {
  const route = spec.challenge.routes.find((item) => item.id === routeId);
  if (!route) return { ok: false };
  const reasons = reasonIds || [];
  state.challengeRoute = routeId;
  state.challengeReasons = reasons;
  const hasNeed = spec.challenge.needReasons.every((id) => reasons.includes(id));
  const extra =
    reasons.includes("gentler") ||
    reasons.includes("avoids-cliff") ||
    reasons.includes("profile-ok") ||
    reasons.includes("dry");
  const ok = route.ok && hasNeed && extra;
  state.challengeOk = ok;
  state.lastHint = ok ? "A route you can defend." : route.ok ? "Say why this trail still works after the washout." : route.hint;
  return {
    ok,
    hint: state.lastHint,
    evidence: ok ? [{ competencyId: "decision", kind: "plan-route" }] : []
  };
}

export function presentChallenge(state) {
  if (!state.challengeOk) return { ok: false };
  state.challengePresented = true;
  return { ok: true };
}

export function addHcFind(state, id) {
  if (!state.foundIds.includes(id)) state.foundIds = [...state.foundIds, id];
}

function addNote(state, text) {
  if (!state.notes.includes(text)) state.notes = [...state.notes, text];
}

export function hcNoteModel(spec, state) {
  const notes = [];
  if (state.introSeen) {
    notes.push({ title: "Field season", text: spec.intro.lines.join(" ") });
  }
  const recorded = Object.values(state.markers);
  if (recorded.length) {
    notes.push({
      title: "Marker readings",
      text: recorded.map((item) => `${item.name} ${item.reading}`).join(" · ")
    });
  }
  if (state.routeCompared) {
    notes.push({ title: "Heavy case", text: state.lastHint || spec.routes.goal });
  }
  if (state.contourOk) notes.push({ title: "Basin contour", text: state.contourHint });
  if (state.profileMatch) notes.push({ title: "Profile", text: "Plan view is not the same as the walk." });
  if (state.gisOk) notes.push({ title: "Observation pad", text: spec.gis.prompt });
  if (state.imageryCompared) notes.push({ title: "Image and ground", text: spec.imagery.note });
  if (state.challengeOk) notes.push({ title: spec.challenge.title, text: spec.completeJournalEntry.text });
  for (const extra of state.notes) {
    if (!notes.some((item) => item.text.includes(extra))) {
      notes.push({ title: "Field note", text: extra });
    }
  }
  return notes;
}

export function applyHcEvidence(mastery, recordEvidenceFn, events) {
  const applied = [];
  for (const event of events || []) {
    recordEvidenceFn(mastery, {
      competencyId: event.competencyId,
      regionId: "high-country",
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

export function hcReadyForChallenge(state) {
  return (
    recordedMarkerCount(state) >= 2 &&
    state.cacheFound &&
    (state.scaleEstimates || []).filter((row) => row.ok).length >= 2 &&
    state.routeCompared &&
    state.terrainCompares.length >= 2 &&
    state.contourOk &&
    state.profileMatch &&
    state.gisOk &&
    state.imageryCompared &&
    Boolean(state.slopePredict)
  );
}

export function hcInspectTarget(spec, catalog, region, player, state) {
  let best = null;
  let bestD = 70;
  if (spec.cache) {
    const d = dist(player.x, player.y, spec.cache.x, spec.cache.y);
    if (d < 56) {
      best = { kind: "cache", id: spec.cache.id, spec: spec.cache, x: spec.cache.x, y: spec.cache.y };
      bestD = d;
    }
  }
  for (const marker of spec.markers) {
    const d = dist(player.x, player.y, marker.x, marker.y);
    if (d < bestD) {
      best = { kind: "marker", id: marker.id, spec: marker, x: marker.x, y: marker.y };
      bestD = d;
    }
  }
  for (const stake of spec.stakes) {
    const d = dist(player.x, player.y, stake.x, stake.y);
    if (d < bestD) {
      best = { kind: "stake", id: stake.id, spec: stake, x: stake.x, y: stake.y };
      bestD = d;
    }
  }
  for (const site of spec.gis.sites) {
    const d = dist(player.x, player.y, site.x, site.y);
    if (d < 64 && d < bestD) {
      best = { kind: "gis-site", id: site.id, spec: site, x: site.x, y: site.y };
      bestD = d;
    }
  }
  for (const point of spec.bathymetry.points) {
    const d = dist(player.x, player.y, point.x, point.y);
    if (d < 64 && d < bestD) {
      best = { kind: "depth", id: point.id, spec: point, x: point.x, y: point.y };
      bestD = d;
    }
  }
  const wash = region.props.find((prop) => prop.kind === "washout");
  if (wash) {
    const d = dist(player.x, player.y, wash.x, wash.y);
    if (d < 70 && d < bestD) {
      best = { kind: "washout", id: "washout", spec: wash, x: wash.x, y: wash.y };
      bestD = d;
    }
  }
  for (const item of catalog.items) {
    const d = dist(player.x, player.y, item.x, item.y);
    if (d < (item.radius || 56) && d < bestD + 8) {
      best = { kind: "discovery", id: item.id, item, x: item.x, y: item.y };
      bestD = d;
    }
  }
  const cliff = spec.terrainCompares[0];
  for (const feature of region.features) {
    const d = dist(player.x, player.y, feature.x, feature.y);
    const compare = spec.terrainCompares.find((entry) => entry.id === feature.id);
    if (compare && d < (feature.radius || 70) && d < bestD + 10) {
      best = { kind: "terrain", id: feature.id, feature, compare, x: feature.x, y: feature.y };
    }
  }
  void cliff;
  if (near(player, spec.profile.a.x, spec.profile.a.y, 70) && state.contourOk && !state.profileMatch) {
    return { kind: "profile", id: "profile", x: spec.profile.a.x, y: spec.profile.a.y };
  }
  return best;
}

export { toggleMapLayer, hasLayer };
