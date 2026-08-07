# Owner Review — Global Signals Relationship Engine

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-relationship-engine`  
**Base:** `feature/global-signals-foundation` (`3eb2f2c`)  
**Product:** Global Signals (Side Trails intelligence platform)  
**Deployed:** No  
**Merged:** No  
**Implementation:** None — design documentation and schematic visuals only

---

## Verdict

**Approve the Global Signals Relationship Engine design for direction.**

The platform treats the world as **connected nodes**. Every relationship carries
**why, strength, confidence, direction, and time delay**. Cascades explain
first-, second-, and third-order effects without fabricating live data, without
offensive cyber, and with **citizens as impact literacy** — not surveillance.

---

## What shipped

| Artifact | Path |
| --- | --- |
| Design | `docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md` (on base tip `3eb2f2c`) |
| Cascade overview SVG | `assets/images/global-signals/relationship-engine/cascade-overview.svg` |
| Maritime cascade SVG | `assets/images/global-signals/relationship-engine/cascade-maritime.svg` |
| Policy cascade SVG | `assets/images/global-signals/relationship-engine/cascade-policy.svg` |
| Weather cascade SVG | `assets/images/global-signals/relationship-engine/cascade-weather.svg` |
| Edge anatomy SVG | `assets/images/global-signals/relationship-engine/edge-anatomy.svg` |
| Smoke test | `automation/test-global-signals-relationship-engine-docs.mjs` |
| Cross-links | Side Trails README · `docs/side-trails/global-signals.md` · SignalTerrain relationship model |
| Playbook lessons | `docs/ENGINEERING-PLAYBOOK.md` |
| Owner review | this document |

Design and cascade SVGs were included in Global Signals foundation (`3eb2f2c`); this
branch completes the owner-review package, smoke coverage, and doc cross-links.

### Node types covered

Countries · Ports · Canals · Shipping lanes · Companies · Industries ·
Commodities · Energy · Policies · Tariffs · Wars · Sanctions · Weather ·
Cyber attacks · Currencies · Infrastructure · Citizens (impact literacy)

### Required relationship facets

why connected · strength · confidence · direction · time delay

### Cascade orders

1° direct effect · 2° downstream system · 3° industry / citizen literacy

---

## Product standards check

| Standard | How addressed |
| --- | --- |
| Calm / trustworthy | Schematic tone; no urgency chrome |
| No fabricated live data | Explicit “schematic / not live” on docs and SVGs |
| No offensive cyber | Cyber nodes are defensive literacy only |
| Evidence-oriented confidence | Confidence separate from strength; speculative labeled |
| Citizens ≠ surveillance | Impact literacy nodes only |
| Design-only honesty | Status banners; Implementation: None |

---

## Relationship to existing graphs

Extends ideas from SignalTerrain’s relationship model and correlation engine with
a broader Global Signals node catalog and **mandatory delay + strength** on every
edge. Does not merge id spaces with `st_*` / `uio_*` in this branch.

---

## Owner decisions requested

1. Keep all five facets mandatory on every stored edge (vs. allow draft edges with explicit “incomplete” status)?  
2. Default cascade max depth to 3 for citizen-facing views?  
3. Treat `cyber_attack` as a first-class Global Signals type or bridge-only to SignalTerrain topics?  
4. Approve schematic SVG palette (quiet navy / teal / gold) for future Global Signals landing reuse?

---

## Recommendation

**Approve design.** Push-only review branch. Do not merge as product
functionality — documentation and visuals only. Do not open a PR unless useful
for discussion; owner asked push-only.
