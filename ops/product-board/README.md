# Product Board (Agent Ops)

**Standing bar: SUBSCRIBER READY** — never approve because “tests passed.”

Exact verdicts:

- `NOT READY`
- `CONDITIONALLY READY`
- `SUBSCRIBER READY`

Executable product-management and engineering orchestration for Waypoint Studio.
This layer **recovers** the existing Engineering OS (`engineering/`) and adds the
missing loop, severity model, failed-review routing, evidence store, Commercial
Reviewer, Red Team, and formal release gate.

## Runnable commands

```bash
node ops/product-board/board.mjs status
node ops/product-board/board.mjs inventory
node ops/product-board/board.mjs discover
node ops/product-board/board.mjs prioritize
node ops/product-board/board.mjs next
node ops/product-board/board.mjs gate
node ops/product-board/board.mjs subscriber-ready   # alias
node ops/product-board/board.mjs attest --criterion ID --role ROLE --verdict pass --notes "…"
node ops/product-board/board.mjs evidence
node ops/product-board/board.mjs test
```

Help: `node ops/product-board/board.mjs help`

Gate options: `gate [--skip-commands] [--skip-probes] [--campaign NAME]`

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

## Subscriber Ready gate

Evaluates (minimum): primary workflows, functionality, live-data integrity,
placeholder/sample detection, dead controls, broken links/nav, HTML leakage,
loading/empty/error honesty, responsive/mobile/tablet/desktop, contrast, a11y,
keyboard, console, network/API, performance, security, privacy, content quality,
visual consistency, discoverability, onboarding, persistence, commercial
usefulness.

**Commercial Reviewer** — paid today: cancel / refund / loss of trust?

**Red Team** — independent stage that tries to **disprove** readiness; never
rubber-stamps engineering/QA.

**Evidence** — machine-readable under `ops/product-board/state/evidence/<runId>/`
(automated tests, Playwright capability, screenshots hooks, console/network,
production URL checks, a11y, data-source, commercial, red-team).

P0 or P1 **automatically prevent** `SUBSCRIBER READY`. Fake/sample as real →
not ready. Broken primary workflows → not ready. Tests pass alone → insufficient
(`CONDITIONALLY READY` at best until Commercial + Red Team + attestations).

## Severity (P0–P4)

| ID | Meaning | Blocks Subscriber Ready |
|----|---------|-------------------------|
| P0 | Security / data integrity | yes → `NOT READY` |
| P1 | Subscriber blocker | yes → `NOT READY` |
| P2 | Major UX | yes for `SUBSCRIBER READY`; may yield `CONDITIONALLY READY` |
| P3 | Polish | no |
| P4 | Enhancement | no |

## Docs in this folder

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — current system map
- [`INVENTORY.md`](./INVENTORY.md) — recovered / partial / obsolete / missing
- [`gates/subscriber-ready.json`](./gates/subscriber-ready.json) — formal gate
- [`state/`](./state/) — persistent machine-readable board + backlog + evidence

## Permanent roles

Product Director · Senior Software Engineer · UX/UI Lead · QA · Data/Reliability ·
Accessibility · Security · Content/Editorial · Commercial/Subscriber · Red-Team ·
Release Manager

See `node ops/product-board/board.mjs roles`.
