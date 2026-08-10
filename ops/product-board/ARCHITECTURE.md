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
| Self-tests | `tests/board.test.mjs` |
| Infrastructure inventory | `lib/inventory.mjs` / `INVENTORY.md` |

```
Human / autonomous agent
        │
        ▼
ops/product-board/board.mjs   ← primary Agent Ops command surface
        │
        ├── state/*.json      ← durable board + backlog
        ├── gates/            ← Subscriber Ready definition
        ├── lib/*             ← severity, roles, loop, routing
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

- Tests may pass and the gate still fails
- Open P0–P2 board items block approval
- Failed-review repair queue blocks approval
- Policy criteria require honest attestation (never auto-fake APPROVED)

## Consolidation

| Artifact | Action |
|----------|--------|
| `engineering/` | Keep — recovered Agent Ops core |
| `docs/ai-agents/` | Mark obsolete — Scenes-era prompts; see `OBSOLETE.md` |
| Product/QA/Release playbooks | Keep — docs authority; board encodes executable subset |
| Playwright | Honest **missing**; tracked as WB-002 |

## Autonomous pilot (not yet)

Foundation supports inventory, prioritization, routing, and gate evaluation.
Unattended pilot still needs attestation recording, campaign scoping, and
visual/red-team runners wired into phases (see inventory `autonomous-pilot`).
