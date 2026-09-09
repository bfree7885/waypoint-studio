/**
 * Field tools earned by learning, kept across regions. No shops or currency.
 */

export function createToolState() {
  return { earnedIds: [] };
}

export function toolById(catalog, id) {
  return catalog.tools.find((item) => item.id === id) || null;
}

export function hasTool(state, id) {
  return state.earnedIds.includes(id);
}

export function earnTool(state, catalog, id) {
  const spec = toolById(catalog, id);
  if (!spec) return { ok: false, reason: "unknown" };
  if (hasTool(state, id)) return { ok: true, already: true, spec };
  state.earnedIds = [...state.earnedIds, id];
  return { ok: true, already: false, spec };
}

export function syncToolsFromGameplay(state, catalog, flags = {}) {
  if (flags.journalOpened) earnTool(state, catalog, "field-journal");
  if (flags.datasetInterpreted) earnTool(state, catalog, "field-data");
  if (flags.coordinatesUsed) earnTool(state, catalog, "coordinates");
  if (flags.scaleUsed) earnTool(state, catalog, "scale-distance");
  if (flags.topoRead) earnTool(state, catalog, "topo-layer");
  if (flags.elevationRead) earnTool(state, catalog, "elevation");
  if (flags.profileUsed) earnTool(state, catalog, "profile-tools");
  if (flags.gisUsed) earnTool(state, catalog, "gis-layers");
  if (flags.solarUsed) earnTool(state, catalog, "solar-observation");
  if (flags.clockUsed) earnTool(state, catalog, "celestial-clock");
  if (flags.orbitUsed) earnTool(state, catalog, "orbit-model");
  if (flags.skyLogUsed) earnTool(state, catalog, "sky-log");
  return state;
}

export function earnedTools(catalog, state) {
  return state.earnedIds.map((id) => toolById(catalog, id)).filter(Boolean);
}
