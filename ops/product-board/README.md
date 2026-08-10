# Product Board (Agent Ops)

**Standing bar: SUBSCRIBER READY** — never approve because “tests passed.”

Executable product-management and engineering orchestration for Waypoint Studio.
This layer **recovers** the existing Engineering OS (`engineering/`) and adds the
missing loop, severity model, failed-review routing, and formal release gate.

## Runnable command

```bash
node ops/product-board/board.mjs status
node ops/product-board/board.mjs inventory
node ops/product-board/board.mjs discover
node ops/product-board/board.mjs prioritize
node ops/product-board/board.mjs next
node ops/product-board/board.mjs gate
node ops/product-board/board.mjs test
```

Help: `node ops/product-board/board.mjs help`

Recovered predecessor CLI (still valid):

```bash
node engineering/orchestrator/run.mjs status
```

## Long-term loop

`DISCOVER → PRIORITIZE → FIX → TEST → VISUAL REVIEW → RED TEAM → RETEST → RELEASE GATE → REPEAT`

Failed visual/red-team/QA review **must** create actionable work and route back
to fix/retest via:

```bash
node ops/product-board/board.mjs fail-review --findings "…" --severity P1
node ops/product-board/board.mjs retest-result --item WB-00N --pass
```

## Severity (P0–P4)

| ID | Meaning | Blocks Subscriber Ready |
|----|---------|-------------------------|
| P0 | Security / data integrity | yes |
| P1 | Subscriber blocker | yes |
| P2 | Major UX | yes |
| P3 | Polish | no |
| P4 | Enhancement | no |

## Docs in this folder

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — current system map
- [`INVENTORY.md`](./INVENTORY.md) — recovered / partial / obsolete / missing
- [`gates/subscriber-ready.json`](./gates/subscriber-ready.json) — formal gate
- [`state/`](./state/) — persistent machine-readable board + backlog

## Permanent roles

Product Director · Senior Software Engineer · UX/UI Lead · QA · Data/Reliability ·
Accessibility · Security · Content/Editorial · Commercial/Subscriber · Red-Team ·
Release Manager

See `node ops/product-board/board.mjs roles`.
