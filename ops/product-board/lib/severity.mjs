/**
 * Severity model for Product Board work items.
 * P0–P4 only — never invent P5 or "nice-to-have" without a severity.
 */
export const SEVERITIES = Object.freeze([
  {
    id: "P0",
    title: "Security / data integrity",
    blocksSubscriberReady: true,
    description:
      "Security, privacy, data corruption, fabricated Live data, or trust-breaking honesty failures."
  },
  {
    id: "P1",
    title: "Subscriber blocker",
    blocksSubscriberReady: true,
    description:
      "Primary workflows broken, dead controls, broken nav, unreadable UI, silent failures, or unfinished paid/value path."
  },
  {
    id: "P2",
    title: "Major UX",
    blocksSubscriberReady: true,
    description:
      "Major usability, responsive breakage, accessibility blockers, or misleading presentation that hurts trust."
  },
  {
    id: "P3",
    title: "Polish",
    blocksSubscriberReady: false,
    description:
      "Visual/copy polish that does not block primary journeys when known and documented."
  },
  {
    id: "P4",
    title: "Enhancement",
    blocksSubscriberReady: false,
    description: "Improvements that add value without fixing a current defect."
  }
]);

export const SEVERITY_ORDER = Object.freeze(
  SEVERITIES.reduce((acc, s, i) => {
    acc[s.id] = i;
    return acc;
  }, {})
);

export function isValidSeverity(id) {
  return Object.prototype.hasOwnProperty.call(SEVERITY_ORDER, id);
}

export function compareSeverity(a, b) {
  return (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99);
}

export function blocksSubscriberReady(severity) {
  const row = SEVERITIES.find((s) => s.id === severity);
  return Boolean(row?.blocksSubscriberReady);
}

export function assertSeverity(id) {
  if (!isValidSeverity(id)) {
    throw new Error(`Invalid severity "${id}". Use P0–P4.`);
  }
  return id;
}
