# Waypoint Engineering

**Permanent autonomous engineering organization for Waypoint Studio.**

This is not a chat feature. It is repository infrastructure: roles, backlog, sprints, gates, playbooks, and an orchestrator that decides what happens next.

> **Agent Ops / Product Board (2026-08):** The product-management execution
> layer lives at [`ops/product-board/`](../ops/product-board/README.md).
> Use it for P0–P4 board state, the discover→release loop, failed-review
> routing, and the formal **Subscriber Ready** gate. This Engineering OS
> remains the recovered sprint/agent substrate.

Primary board command:

```bash
node ops/product-board/board.mjs status
```

## Quick commands

```bash
node engineering/orchestrator/run.mjs "Start Sprint"
node engineering/orchestrator/run.mjs "Continue Sprint"
node engineering/orchestrator/run.mjs "Review Production"
node engineering/orchestrator/run.mjs "Plan Next Release"
node engineering/orchestrator/run.mjs "Fix Production"
node engineering/orchestrator/run.mjs "Generate Roadmap"
node engineering/orchestrator/run.mjs status
```

Aliases also work: `start-sprint`, `continue-sprint`, `review-production`, etc.

## Architecture

```
User command
    ↓
Orchestrator (single coordinator)
    ↓
Assigns work to specialized agents (in order)
    ↓
Quality gates
    ↓
Release Manager → Deploy → Production verification
    ↓
Sprint report
```

Individual agents **never** choose work independently. The orchestrator owns priority, assignment, and sequencing.

### Data formats

| Kind | Format | Why |
|------|--------|-----|
| Mutable state (backlog, sprint, orchestrator state, roadmap, production status, pipeline, gates) | JSON | Reliable round-trip; CLI reads/writes |
| Agent role definitions | YAML | Human-authored role contracts |
| Knowledge docs / playbooks | YAML or Markdown | Durable guidance |

## Folder map

| Path | Purpose |
|------|---------|
| `orchestrator/` | CLI (`run.mjs`), `state.json`, `pipeline.json`, `gates.json` |
| `agents/` | Twelve role definitions + `index.yaml` |
| `backlog/` | Prioritized work (`backlog.json`) |
| `sprints/` | Active/historical sprints (`*.json`) |
| `knowledge/` | Architecture, patterns, standards, debt, bugs, roadmap |
| `playbooks/` | Operating procedures for each command and gate |
| `production/` | Monitors + `status.json` |
| `reports/` | Sprint / executive report templates and outputs |
| `schemas/` | JSON Schema for task and sprint files |

## Agent roster

| ID | Role |
|----|------|
| `ceo` | Product direction, priorities, release approval |
| `product-manager` | Specs, acceptance criteria, backlog |
| `software-architect` | Structure, debt, reusable systems |
| `ux-designer` | Usability, navigation, a11y, consistency |
| `frontend-engineer` | HTML/CSS/JS, design system |
| `backend-engineer` | APIs, engine, data, integrations |
| `qa-engineer` | Tests, regressions, edge cases |
| `security-engineer` | Security review, secrets, CSP |
| `performance-engineer` | Lighthouse, load, memory |
| `devops-engineer` | Actions, Pages, CI, monitoring |
| `documentation-engineer` | Docs, changelogs, release notes |
| `release-manager` | Gates, checklist, production verify |

## Default pipeline

`direction` (CEO → PM) → `design` (Architect → UX) → `build` (Frontend → Backend) → `verify` (QA → Security → Performance) → `ship` (Docs → DevOps → Release) → `confirm` (Release → CEO)

Production incidents use a separate triage → fix → verify → report sequence and pause feature work.

## Quality gates (no deploy without)

1. All required automated tests pass  
2. Smoke tests pass  
3. Accessibility checklist pass  
4. Performance acceptable  
5. Security review pass  
6. Production verification pass  

See `orchestrator/gates.json`.

## Relationship to other docs

- Supreme product law remains `docs/WAYPOINT-STUDIO-CONSTITUTION.md`.
- Cursor prompt roles in `docs/ai-agents/` are **content helpers**; Waypoint Engineering is the **operating system** that assigns and sequences work.
- Live deploy/CI lives under `.github/workflows/` and is observed via `production/`.

## Rules

- Do not modify application behavior from Engineering OS files alone.
- Agent runs must record handoffs in the active sprint.
- Production failures pause feature work (`Fix Production` takes priority).
