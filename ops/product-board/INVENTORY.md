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

## Summary table

| ID | Path | Class | Notes |
|----|------|-------|-------|
| engineering-os | `engineering/` | partial | Orchestrator + backlog; no Subscriber Ready / fail-route |
| engineering-orchestrator | `engineering/orchestrator/run.mjs` | implemented | Sprint/production CLI |
| engineering-agents | `engineering/agents/` | implemented | Twelve YAML role contracts |
| engineering-backlog | `engineering/backlog/backlog.json` | partial | WE-* P0–P3; syncable into WB-* |
| engineering-gates | `engineering/orchestrator/gates.json` | partial | Eng checks ≠ Subscriber Ready |
| docs-ai-agents | `docs/ai-agents/` | obsolete | Scenes-era; superseded |
| ai-team-constitution | `docs/AI_TEAM_CONSTITUTION.md` | docs_only | Process constitution |
| product-standards | `docs/PRODUCT_STANDARDS.md` | docs_only | Trust/privacy product law |
| engineering-playbook | `docs/ENGINEERING-PLAYBOOK.md` | docs_only | Session model + lessons |
| qa-playbook | `docs/QA_PLAYBOOK.md` | docs_only | QA philosophy |
| release-playbook | `docs/RELEASE_PLAYBOOK.md` | docs_only | Ship checklist |
| a11y-playbook | `docs/ACCESSIBILITY_PLAYBOOK.md` | docs_only | A11y depth |
| security-playbook | `docs/SECURITY_PLAYBOOK.md` | docs_only | Security depth |
| cursor-rules | `.cursor/rules/` | implemented | Always-on agent contracts |
| automation-tests | `automation/test-*.mjs` | implemented | Area regression suites |
| smoke-browser | `automation/smoke-browser.mjs` | implemented | Shell/nav smoke |
| a11y-smoke | `automation/a11y-smoke.mjs` | implemented | May need audit deps |
| visual-regression | `automation/capture-platform-visual-regression.mjs` | partial | Not loop-wired yet |
| playwright | `reports/playwright-capability.txt` | missing | Not installed |
| github-actions | `.github/workflows/` | implemented | CI / Pages / articles |
| live-site-qa | `audits/live-site-qa/` | partial | Dep gaps in prior reports |
| readiness-reports | various `*READINESS*` docs | docs_only | Historical scorecards |
| articles-release-gate | `docs/articles/articles-release-gate.md` | docs_only | Product-specific gate precedent |
| product-board | `ops/product-board/` | implemented | This foundation |
| autonomous-pilot | `ops/product-board/` | missing | Needs attestations + runners |

## Obsolete / do-not-extend

- **`docs/ai-agents/`** — markdown agent prompts for early Scenes work. Use
  `engineering/agents/` + Product Board roles instead.
- Duplicate readiness PDFs/scripts under dirty trees / importer desktops — do
  not stage into Agent Ops commits (Engineering Playbook dirty-tree rule).
