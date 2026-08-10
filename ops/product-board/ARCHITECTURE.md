# Product Board — Architecture

## Recovery posture

Waypoint Studio already had an **Engineering OS** under `engineering/`:

- Orchestrator CLI (`engineering/orchestrator/run.mjs`)
- Twelve agent YAML contracts
- JSON backlog / sprints / gates / production status
- Playbooks for sprint + production incident flows

That system is **recovered and retained**. It remains the role/sprint substrate.

**Product Board** (`ops/product-board/`) is the Agent Ops **execution layer**
that was missing:

| Need | Where it lives now |
|------|--------------------|
| Persistent board state | `ops/product-board/state/board.json` |
| P0–P4 backlog | `ops/product-board/state/backlog.json` |
| Discover→…→Release loop | `lib/loop.mjs` + `board.mjs next` |
| Failed review → repair → retest | `lib/routing.mjs` |
| Subscriber Ready gate | `gates/subscriber-ready.json` + `board.mjs gate` |
| Exact verdicts | `lib/verdicts.mjs` — `NOT READY` \| `CONDITIONALLY READY` \| `SUBSCRIBER READY` |
| Evidence packages | `lib/evidence.mjs` → `state/evidence/<runId>/` |
| Policy attestations | `lib/attestations.mjs` + `board.mjs attest` |
| Commercial Reviewer | `lib/commercial-reviewer.mjs` |
| Red Team (disprove) | `lib/red-team.mjs` |
| Static trust probes | `lib/probes.mjs` |
| Self-tests | `tests/board.test.mjs` |
| Infrastructure inventory | `lib/inventory.mjs` / `INVENTORY.md` |

```
Human / autonomous agent
        │
        ▼
ops/product-board/board.mjs   ← primary Agent Ops command surface
        │
        ├── state/*.json      ← durable board + backlog + attestations
        ├── state/evidence/   ← machine-readable gate evidence
        ├── gates/            ← Subscriber Ready definition
        ├── lib/*             ← severity, roles, loop, routing, verdicts,
        │                       probes, commercial, red-team, evidence
        │
        ├── synces open work ▶ engineering/backlog/backlog.json
        ├── maps roles      ▶ engineering/agents/*.yaml
        └── runs gate cmds  ▶ automation/*.mjs (+ attestations)
```

## Why not replace Engineering OS?

Engineering OS already encodes sprint pipelines and production-incident pause.
Replacing it would discard working CLI + agent contracts. Product Board
**extends** it: broader severity, continuous product loop, and a release bar
stricter than “CI green.”

## Subscriber Ready vs engineering gates

`engineering/orchestrator/gates.json` = required engineering checks before ship.

`ops/product-board/gates/subscriber-ready.json` = **product trust bar**:

- Tests may pass and the gate still fails (`CONDITIONALLY READY` or `NOT READY`)
- Open P0–P1 board items → `NOT READY` (automatic)
- Open P2 → blocks `SUBSCRIBER READY` (may be `CONDITIONALLY READY`)
- Failed-review repair queue → `NOT READY`
- Commercial Reviewer asks cancel/refund/trust — independent of eng green
- Red Team tries to **disprove** readiness — never auto-accepts QA
- Policy criteria require honest attestation (never auto-fake `SUBSCRIBER READY`)
- Evidence package required kinds recorded under `state/evidence/`

## Consolidation

| Artifact | Action |
|----------|--------|
| `engineering/` | Keep — recovered Agent Ops core |
| `docs/ai-agents/` | Mark obsolete — Scenes-era prompts; see inventory |
| Product/QA/Release playbooks | Keep — docs authority; board encodes executable subset |
| Playwright | Honest **missing** unless `audits/live-site-qa` deps installed |

## Next phase

Sheds autonomous repair pilot — **not** started in this gate-hardening mission.
Gate must stay executable and evidence-based before that pilot.
