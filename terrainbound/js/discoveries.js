/**
 * Optional discoveries. Separate from missions. No DOM.
 */

export function createDiscoveryState() {
  return {
    foundIds: [],
    acknowledgedIds: [],
    wrenTalks: 0,
    lastFoundId: null
  };
}

export function discoveryById(catalog, id) {
  return catalog.items.find((item) => item.id === id) || null;
}

export function isFound(state, id) {
  return state.foundIds.includes(id);
}

export function displayName(item, interpreted = false) {
  if (interpreted && item.interpretedName) return item.interpretedName;
  return item.name;
}

export function displayText(item, interpreted = false) {
  if (interpreted && item.interpretedText) return item.interpretedText;
  return item.text;
}

export function addDiscovery(state, catalog, id) {
  const spec = discoveryById(catalog, id);
  if (!spec) return null;
  if (isFound(state, spec.id)) return { already: true, spec, entry: null };
  const entry = {
    id: spec.id,
    name: spec.name,
    symbol: spec.symbol,
    text: spec.text,
    location: spec.location
  };
  state.foundIds = [...state.foundIds, spec.id];
  state.lastFoundId = spec.id;
  return { already: false, spec, entry };
}

export function nearestDiscovery(catalog, x, y, range = 56) {
  let best = null;
  let bestD = Infinity;
  for (const item of catalog.items) {
    const reach = item.radius || range;
    const d = Math.hypot(x - item.x, y - item.y);
    if (d <= reach && d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

export function discoveryLogModel(catalog, state, interpreted = false) {
  const found = catalog.items
    .filter((item) => isFound(state, item.id))
    .map((item) => ({
      id: item.id,
      name: displayName(item, interpreted),
      symbol: item.symbol,
      text: displayText(item, interpreted),
      location: item.location,
      interpreted: Boolean(interpreted && item.interpretedName)
    }));
  return {
    regionId: catalog.regionId,
    found,
    foundCount: found.length,
    total: catalog.items.length,
    remaining: catalog.items.length - found.length
  };
}

export function logRevealsName(model, name) {
  return model.found.some((item) => item.name === name);
}

export function playerFacingDiscoveryText(catalog) {
  const texts = [...(catalog.wren?.idle || []), catalog.wren?.missionNudge, catalog.wren?.afterComplete];
  for (const item of catalog.items) {
    texts.push(item.name, item.prompt, item.text, item.location, item.wrenHint, item.wrenAck);
  }
  return texts.filter(Boolean);
}

export function playerFacingObservationText(catalog) {
  return playerFacingDiscoveryText(catalog);
}

export function pickWrenLines(catalog, discoveryState, missionReady, missionComplete) {
  discoveryState.wrenTalks += 1;
  const unfound = catalog.items.filter((item) => !isFound(discoveryState, item.id));
  const pendingAck = discoveryState.foundIds.find(
    (id) => !discoveryState.acknowledgedIds.includes(id)
  );

  if (pendingAck) {
    const spec = discoveryById(catalog, pendingAck);
    discoveryState.acknowledgedIds = [...discoveryState.acknowledgedIds, pendingAck];
    return spec?.wrenAck ? [spec.wrenAck] : [catalog.wren.afterComplete];
  }

  if (missionComplete) {
    const hint = unfound[0];
    if (hint) return [catalog.wren.afterComplete, hint.wrenHint];
    return [catalog.wren.afterComplete, "The hollow will keep teaching if you keep walking."];
  }

  if (missionReady) {
    return ["You've got mud on your boots and notes in the tablet. Trace the water with me."];
  }

  const lines = [];
  if (discoveryState.wrenTalks === 1) {
    lines.push(catalog.wren.idle[0]);
  } else if (unfound.length && discoveryState.wrenTalks % 2 === 0) {
    const hint = unfound[(discoveryState.wrenTalks / 2) % unfound.length];
    lines.push(hint.wrenHint);
  } else {
    lines.push(catalog.wren.idle[discoveryState.wrenTalks % catalog.wren.idle.length]);
    lines.push(catalog.wren.missionNudge);
  }
  return lines;
}
