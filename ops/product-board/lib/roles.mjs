/**
 * Permanent executable Product Board roles (not role-play only).
 * Maps to recovered engineering/agents YAML where possible.
 */
export const LOOP_PHASES = Object.freeze([
  "discover",
  "prioritize",
  "fix",
  "test",
  "visual_review",
  "red_team",
  "retest",
  "release_gate"
]);

export const ROLE_CATALOG = Object.freeze([
  {
    id: "product-director",
    title: "Product Director",
    engineeringAgent: "ceo",
    owns: ["discover", "prioritize", "release_gate"],
    mission: "Protect subscriber value and product direction; approve Subscriber Ready."
  },
  {
    id: "senior-software-engineer",
    title: "Senior Software Engineer",
    engineeringAgent: "frontend-engineer",
    owns: ["fix", "retest"],
    mission: "Root-cause fixes; smallest correct change; no fake functionality."
  },
  {
    id: "ux-ui-lead",
    title: "UX/UI Lead",
    engineeringAgent: "ux-designer",
    owns: ["visual_review", "fix"],
    mission: "Readable, calm, responsive UI; kill dead controls and clutter."
  },
  {
    id: "qa",
    title: "QA",
    engineeringAgent: "qa-engineer",
    owns: ["test", "retest"],
    mission: "Honest pass/fail evidence; failed review creates actionable work."
  },
  {
    id: "data-reliability",
    title: "Data / Reliability",
    engineeringAgent: "backend-engineer",
    owns: ["test", "fix"],
    mission: "Live vs estimate honesty; no silent fetch/load failures."
  },
  {
    id: "accessibility",
    title: "Accessibility",
    engineeringAgent: "ux-designer",
    owns: ["test", "visual_review"],
    mission: "Keyboard, focus, contrast, and inclusive responsive behavior."
  },
  {
    id: "security",
    title: "Security",
    engineeringAgent: "security-engineer",
    owns: ["red_team", "release_gate"],
    mission: "Privacy, secrets, CSP, and trust-breaking security defects."
  },
  {
    id: "content-editorial",
    title: "Content / Editorial",
    engineeringAgent: "documentation-engineer",
    owns: ["visual_review", "fix"],
    mission: "No HTML leakage, placeholder copy as finished, or misleading labels."
  },
  {
    id: "commercial-subscriber",
    title: "Commercial / Subscriber",
    engineeringAgent: "product-manager",
    owns: ["discover", "release_gate"],
    mission:
      "Paid customer today — what would cause cancel, refund, or loss of trust? Never approve on tests alone."
  },
  {
    id: "red-team",
    title: "Red-Team",
    engineeringAgent: "security-engineer",
    owns: ["red_team"],
    mission:
      "Independently DISPROVE Subscriber Ready; never rubber-stamp engineering or QA conclusions."
  },
  {
    id: "release-manager",
    title: "Release Manager",
    engineeringAgent: "release-manager",
    owns: ["release_gate", "retest"],
    mission: "Run Subscriber Ready gate; never waive P0–P2 without recorded owner decision."
  }
]);

export function roleById(id) {
  return ROLE_CATALOG.find((r) => r.id === id) || null;
}

export function rolesForPhase(phase) {
  return ROLE_CATALOG.filter((r) => r.owns.includes(phase));
}

export function nextPhase(phase) {
  const i = LOOP_PHASES.indexOf(phase);
  if (i < 0) return LOOP_PHASES[0];
  if (i + 1 >= LOOP_PHASES.length) return LOOP_PHASES[0];
  return LOOP_PHASES[i + 1];
}
