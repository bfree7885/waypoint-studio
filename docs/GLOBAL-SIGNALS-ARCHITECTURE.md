# Global Signals — Architecture Overview

**Status:** Design / documentation only — **not implemented**  
**Product:** Global Signals (Side Trails)  
**Related:** [GLOBAL-SIGNALS-ROADMAP.md](GLOBAL-SIGNALS-ROADMAP.md), [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md), [GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md](GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md), [GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md](GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md), [docs/side-trails/global-signals.md](side-trails/global-signals.md)

---

## 1. What this is

Global Signals is a **relationship intelligence platform**. It explores how public
world signals — geopolitics, trade, infrastructure, policy, weather, cyber events,
conflict, and economics — ripple through industries and eventually affect citizens.

It is **not**:

- a news website or breaking-alert feed  
- financial advice or trading guidance  
- a surveillance or offensive cyber product  
- a live-data dashboard in this foundation block  

Schematic art under `assets/images/global-signals/` is labeled mock / schematic only.

---

## 2. Layered model (v0)

```
Presentation modules   → Articles, Take, Graph, Chains, Impact, Scenarios, Dashboard
Citizen impact layer   → everyday consequences with confidence + unknowns
Relationship graph     → typed nodes + evidenced edges (design contract)
Public signal sources  → future ingest from citable public sources
```

Illustration: `assets/images/global-signals/architecture-layers.svg`

| Layer | Responsibility today | Responsibility later |
| --- | --- | --- |
| Presentation | Landing + honest empty shells | Module UIs with progressive enhancement |
| Citizen impact | Story + schematic | Sourced explanations; never invent effects |
| Relationship graph | Design doc only | Graph runtime with provenance |
| Signal sources | Out of scope | Public, citable ingest; honest empty states |

---

## 3. Trust contracts

1. **Facts vs estimates vs placeholders** stay visually and verbally distinct.  
2. **No fabricated live events** on landings, mocks, or placeholders.  
3. **Empty is honest** — missing sources produce empty/sparse UI, not filler.  
4. **Citizens are impact-literacy nodes**, never surveillance targets.  
5. **No engagement farming** — no urgency hacks, scarcity, or doom ranking.

---

## 4. Surface map (this foundation)

| Surface | Path | Notes |
| --- | --- | --- |
| Catalog card | `data/side-trails/catalog.json` | Experimental |
| Product landing | `/side-trails/global-signals/` | Brand-first story |
| Module placeholders | `/side-trails/global-signals/{module}/` | Coming soon / not implemented |
| Side Trails index | `/side-trails/` | JSON-driven cards |

No engines, APIs, or live providers ship in the foundation branch.

---

## 5. Deeper design (design-only companions)

| Document | Role |
| --- | --- |
| [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md) | Node/edge contract, confidence, cascading literacy |
| [GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md](GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md) | Everyday impact panels (no surveillance) |
| [GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md](GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md) | Expand-on-demand cascade UX |

None of these ship engines or live data in the foundation branch.

---

## 6. Alignment with Side Trails

Global Signals sits beside OpenRoad PA and SignalTerrain as a sister experiment.
Primary outdoor Home tools remain separate. Incubator remains “Coming later.”
Footer and landing copy: **Part of Side Trails.**
