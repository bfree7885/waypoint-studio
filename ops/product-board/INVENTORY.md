# Product Board — Infrastructure Inventory

Classification key:

1. **implemented** — executable today  
2. **partial** — present but incomplete for Agent Ops loop  
3. **docs_only** — authoritative guidance without orchestration  
4. **obsolete** — superseded / duplicated; do not extend  
5. **missing** — required for long-term loop / pilot  

Generated from `lib/inventory.mjs`. Re-print anytime:

```bash
node ops/product-board/board.mjs inventory
```

## Summary

Total: 26 — {"implemented":9,"partial":6,"docs_only":9,"obsolete":1,"missing":1}

| ID | Path | Class | Notes |
|----|------|-------|-------|
| engineering-os | `engineering/` | partial | Executable orchestrator CLI + backlog/sprints/gates/agents. Advances role state but does not run reviews, Subscriber Ready, or failed-review→repair routing. |
| engineering-orchestrator | `engineering/orchestrator/run.mjs` | implemented | start/continue sprint, review/fix production, roadmap, status. |
| engineering-agents | `engineering/agents/` | implemented | Role contracts; mapped into Product Board permanent roles. |
| engineering-backlog | `engineering/backlog/backlog.json` | partial | Machine-readable but stale timestamps; no P4; Product Board syncs open items. |
| engineering-gates | `engineering/orchestrator/gates.json` | partial | Tests/smoke/a11y/perf/security/production checklists — not Subscriber Ready. |
| docs-ai-agents | `docs/ai-agents/` | obsolete | Superseded by engineering/agents + ops/product-board roles. Kept for historical prompts; see OBSOLETE.md. |
| ai-team-constitution | `docs/AI_TEAM_CONSTITUTION.md` | docs_only | Governing process law for AI engineering sessions. |
| product-standards | `docs/PRODUCT_STANDARDS.md` | docs_only | Mirrored in .cursor/rules/product-standards.mdc. |
| engineering-playbook | `docs/ENGINEERING-PLAYBOOK.md` | docs_only | Session operating model; append lessons after substantial blocks. |
| qa-playbook | `docs/QA_PLAYBOOK.md` | docs_only | Severity/smoke philosophy; Product Board encodes P0–P4 executably. |
| release-playbook | `docs/RELEASE_PLAYBOOK.md` | docs_only | Ship checklist; does not define formal Subscriber Ready gate. |
| a11y-playbook | `docs/ACCESSIBILITY_PLAYBOOK.md` | docs_only | Paired with automation/a11y-smoke.mjs. |
| security-playbook | `docs/SECURITY_PLAYBOOK.md` | docs_only | Paired with engineering security-gate playbook. |
| cursor-rules | `.cursor/rules/` | implemented | Always-applied product + engineering contracts. |
| automation-tests | `automation/test-*.mjs` | implemented | Large suite of product/area regression scripts. |
| smoke-browser | `automation/smoke-browser.mjs` | implemented | Referenced by engineering gates + Subscriber Ready commands. |
| a11y-smoke | `automation/a11y-smoke.mjs` | implemented | May need live-site-qa deps for full depth. |
| visual-regression | `automation/capture-platform-visual-regression.mjs` | partial | Capture tooling exists; not wired into Product Board loop yet. |
| playwright | `reports/playwright-capability.txt` | missing | Capability note: Playwright not installed in repo node_modules. |
| github-actions | `.github/workflows/` | implemented | ci.yml, pages.yml, articles-refresh.yml. |
| live-site-qa | `audits/live-site-qa/` | partial | Present; prior reports noted missing deps for full a11y-smoke. |
| readiness-reports | `docs/*READINESS*, PRODUCTION_READINESS_REPORT.md, MVP_AUDIT_REPORT.md` | docs_only | Many product-specific readiness assessments; not a living board. |
| articles-release-gate | `docs/articles/articles-release-gate.md` | docs_only | Good product-specific gate pattern; Subscriber Ready generalizes the bar. |
| product-board | `ops/product-board/` | implemented | Execution/orchestration layer, board state, P0–P4, routing, Subscriber Ready, tests. |
| autonomous-pilot | `ops/product-board/` | partial | Attestations, evidence packages, Commercial Reviewer, and Red Team are executable. Unattended visual/browser runners and campaign pilots still pending (Sheds pilot is next phase). |
| subscriber-ready-evidence | `ops/product-board/state/evidence/` | implemented | Gate runs write manifest/summary + per-kind JSON under state/evidence/<runId>/. |

## Obsolete / do-not-extend

- **`docs/ai-agents/`** — markdown agent prompts for early Scenes work. Use `engineering/agents/` + Product Board roles instead.
