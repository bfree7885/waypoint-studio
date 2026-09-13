/**
 * Observation vs interpretation. Clicking a discovery is not mastery.
 * Students sort a seen sentence from a guessed sentence.
 */

export function createObsIntState() {
  return { sorts: [] };
}

export function cardsForFound(spec, foundIds) {
  return (spec?.cards || []).filter((card) => foundIds.includes(card.discoveryId));
}

export function sortById(state, cardId) {
  return state.sorts.find((row) => row.cardId === cardId) || null;
}

export function classifyCard(state, spec, cardId, choice) {
  const card = (spec?.cards || []).find((item) => item.id === cardId);
  if (!card) return { ok: false, reason: "unknown" };
  const ok = choice === "observation";
  const existing = sortById(state, cardId);
  const row = { cardId, choice, ok, attempts: (existing?.attempts || 0) + 1 };
  state.sorts = [...state.sorts.filter((item) => item.cardId !== cardId), row];
  return {
    ok,
    already: Boolean(existing?.ok),
    hint: ok
      ? "That is what you can see. Keep guesses for later."
      : "That sentence goes beyond the rock in front of you. What did you actually see?",
    evidence: ok && !existing?.ok ? [{ competencyId: "observation", kind: "obs-int-sort" }] : []
  };
}

export function successfulSorts(state) {
  return state.sorts.filter((row) => row.ok).length;
}

export function pendingCard(spec, state, foundIds) {
  return cardsForFound(spec, foundIds).find((card) => !sortById(state, card.id)?.ok) || null;
}
