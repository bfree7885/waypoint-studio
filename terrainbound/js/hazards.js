/**
 * Hazard / respond architecture. No arcade damage. Nothing fires in Phase 4.
 */

export function createHazardState() {
  return { activeId: null, prepared: false, lastResponse: null };
}

export function hazardById(catalog, id) {
  return catalog.hazards.find((item) => item.id === id) || null;
}

export function hazardsForRegion(catalog, regionId) {
  return catalog.hazards.filter((item) => item.regions.includes(regionId));
}

export function isHazardImplemented(catalog, id) {
  const spec = hazardById(catalog, id);
  return Boolean(spec?.implemented);
}

export function evaluateResponse(catalog, hazardId, actionId) {
  const spec = hazardById(catalog, hazardId);
  if (!spec) return { ok: false, reason: "unknown" };
  if (!spec.implemented) {
    return { ok: false, reason: "not-implemented", spec };
  }
  return { ok: true, authentic: actionId === spec.authenticResponse, spec };
}
