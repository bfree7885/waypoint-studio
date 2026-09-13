/**
 * Short travel title cards. SELECT REGION → route → title → station arrival → control.
 */

export const TRAVEL_MS = 1600;

export function travelTitleFor(presentation, regionId) {
  return (
    presentation?.travelTitles?.[regionId] || {
      region: "TerrainBound",
      station: "Field Station"
    }
  );
}

export function createTravelState() {
  return { active: false, regionId: null, until: 0, fromId: null };
}

export function beginTravel(state, regionId, fromId, now = performance.now()) {
  state.active = true;
  state.regionId = regionId;
  state.fromId = fromId;
  state.until = now + TRAVEL_MS;
}

export function travelProgress(state, now = performance.now()) {
  if (!state.active) return 0;
  const left = state.until - now;
  if (left <= 0) {
    state.active = false;
    return 0;
  }
  return Math.min(1, 1 - left / TRAVEL_MS);
}

export function travelBlocking(state, now = performance.now()) {
  return Boolean(state.active && now < state.until);
}
