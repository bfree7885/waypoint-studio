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

export function syncToolsFromGameplay(state, catalog, { journalOpened, datasetInterpreted } = {}) {
  if (journalOpened) earnTool(state, catalog, "field-journal");
  if (datasetInterpreted) earnTool(state, catalog, "field-data");
  return state;
}

export function earnedTools(catalog, state) {
  return state.earnedIds.map((id) => toolById(catalog, id)).filter(Boolean);
}
