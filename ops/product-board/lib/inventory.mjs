/**
 * Static inventory of recovered Agent Ops / readiness infrastructure.
 * Classification:
 *   implemented | partial | docs_only | obsolete | missing
 */
export const INFRASTRUCTURE_INVENTORY = Object.freeze([
  {
    id: "engineering-os",
    path: "engineering/",
    title: "Engineering OS (Agent Ops predecessor)",
    classification: "partial",
    notes:
      "Executable orchestrator CLI + backlog/sprints/gates/agents. Advances role state but does not run reviews, Subscriber Ready, or failed-review→repair routing."
  },
  {
    id: "engineering-orchestrator",
    path: "engineering/orchestrator/run.mjs",
    title: "Engineering orchestrator CLI",
    classification: "implemented",
    notes: "start/continue sprint, review/fix production, roadmap, status."
  },
  {
    id: "engineering-agents",
    path: "engineering/agents/",
    title: "Twelve engineering agent YAML contracts",
    classification: "implemented",
    notes: "Role contracts; mapped into Product Board permanent roles."
  },
  {
    id: "engineering-backlog",
    path: "engineering/backlog/backlog.json",
    title: "Engineering backlog (WE-*, P0–P3)",
    classification: "partial",
    notes: "Machine-readable but stale timestamps; no P4; Product Board syncs open items."
  },
  {
    id: "engineering-gates",
    path: "engineering/orchestrator/gates.json",
    title: "Engineering release gates",
    classification: "partial",
    notes: "Tests/smoke/a11y/perf/security/production checklists — not Subscriber Ready."
  },
  {
    id: "docs-ai-agents",
    path: "docs/ai-agents/",
    title: "Scenes-era AI agent markdown roles",
    classification: "obsolete",
    notes:
      "Superseded by engineering/agents + ops/product-board roles. Kept for historical prompts; see OBSOLETE.md."
  },
  {
    id: "ai-team-constitution",
    path: "docs/AI_TEAM_CONSTITUTION.md",
    title: "AI Engineering Team Constitution",
    classification: "docs_only",
    notes: "Governing process law for AI engineering sessions."
  },
  {
    id: "product-standards",
    path: "docs/PRODUCT_STANDARDS.md",
    title: "Product Standards",
    classification: "docs_only",
    notes: "Mirrored in .cursor/rules/product-standards.mdc."
  },
  {
    id: "engineering-playbook",
    path: "docs/ENGINEERING-PLAYBOOK.md",
    title: "Engineering Playbook + Lessons Learned",
    classification: "docs_only",
    notes: "Session operating model; append lessons after substantial blocks."
  },
  {
    id: "qa-playbook",
    path: "docs/QA_PLAYBOOK.md",
    title: "QA Playbook",
    classification: "docs_only",
    notes: "Severity/smoke philosophy; Product Board encodes P0–P4 executably."
  },
  {
    id: "release-playbook",
    path: "docs/RELEASE_PLAYBOOK.md",
    title: "Release Playbook",
    classification: "docs_only",
    notes: "Ship checklist; does not define formal Subscriber Ready gate."
  },
  {
    id: "a11y-playbook",
    path: "docs/ACCESSIBILITY_PLAYBOOK.md",
    title: "Accessibility Playbook",
    classification: "docs_only",
    notes: "Paired with automation/a11y-smoke.mjs."
  },
  {
    id: "security-playbook",
    path: "docs/SECURITY_PLAYBOOK.md",
    title: "Security Playbook",
    classification: "docs_only",
    notes: "Paired with engineering security-gate playbook."
  },
  {
    id: "cursor-rules",
    path: ".cursor/rules/",
    title: "Cursor agent contracts",
    classification: "implemented",
    notes: "Always-applied product + engineering contracts."
  },
  {
    id: "automation-tests",
    path: "automation/test-*.mjs",
    title: "Node automation test suites",
    classification: "implemented",
    notes: "Large suite of product/area regression scripts."
  },
  {
    id: "smoke-browser",
    path: "automation/smoke-browser.mjs",
    title: "Browser smoke",
    classification: "implemented",
    notes: "Referenced by engineering gates + Subscriber Ready commands."
  },
  {
    id: "a11y-smoke",
    path: "automation/a11y-smoke.mjs",
    title: "Accessibility smoke",
    classification: "implemented",
    notes: "May need live-site-qa deps for full depth."
  },
  {
    id: "visual-regression",
    path: "automation/capture-platform-visual-regression.mjs",
    title: "Platform visual regression capture",
    classification: "partial",
    notes: "Capture tooling exists; not wired into Product Board loop yet."
  },
  {
    id: "playwright",
    path: "reports/playwright-capability.txt",
    title: "Playwright visual testing",
    classification: "missing",
    notes: "Capability note: Playwright not installed in repo node_modules."
  },
  {
    id: "github-actions",
    path: ".github/workflows/",
    title: "CI / Pages / articles refresh",
    classification: "implemented",
    notes: "ci.yml, pages.yml, articles-refresh.yml."
  },
  {
    id: "live-site-qa",
    path: "audits/live-site-qa/",
    title: "Live site QA audit package",
    classification: "partial",
    notes: "Present; prior reports noted missing deps for full a11y-smoke."
  },
  {
    id: "readiness-reports",
    path: "docs/*READINESS*, PRODUCTION_READINESS_REPORT.md, MVP_AUDIT_REPORT.md",
    title: "Historical readiness / MVP / production reports",
    classification: "docs_only",
    notes: "Many product-specific readiness assessments; not a living board."
  },
  {
    id: "articles-release-gate",
    path: "docs/articles/articles-release-gate.md",
    title: "Articles release-gate precedent",
    classification: "docs_only",
    notes: "Good product-specific gate pattern; Subscriber Ready generalizes the bar."
  },
  {
    id: "product-board",
    path: "ops/product-board/",
    title: "Product Board (this system)",
    classification: "implemented",
    notes: "Execution/orchestration layer, board state, P0–P4, routing, Subscriber Ready, tests."
  },
  {
    id: "autonomous-pilot",
    path: "ops/product-board/",
    title: "Fully autonomous discover→ship pilot loop",
    classification: "partial",
    notes:
      "Attestations, evidence packages, Commercial Reviewer, and Red Team are executable. Unattended visual/browser runners and campaign pilots still pending (Sheds pilot is next phase)."
  },
  {
    id: "subscriber-ready-evidence",
    path: "ops/product-board/state/evidence/",
    title: "Subscriber Ready machine-readable evidence store",
    classification: "implemented",
    notes: "Gate runs write manifest/summary + per-kind JSON under state/evidence/<runId>/."
  }
]);

export function summarizeInventory() {
  const counts = {
    implemented: 0,
    partial: 0,
    docs_only: 0,
    obsolete: 0,
    missing: 0
  };
  for (const row of INFRASTRUCTURE_INVENTORY) {
    counts[row.classification] = (counts[row.classification] || 0) + 1;
  }
  return { total: INFRASTRUCTURE_INVENTORY.length, counts };
}
