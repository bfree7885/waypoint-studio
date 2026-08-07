# Owner Review — Global Signals Cascading Impact Explorer

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-cascading-impact`  
**Base:** `feature/global-signals-foundation` / `origin/feature/global-signals-side-trails` (`f9b5d70`)  
**Tip:** `d1e7d8a`  
**Product:** Global Signals  
**Deployed:** No  
**Merged:** No  
**Implementation:** None — design documentation and schematic visuals only

---

## Verdict

**Approve the Cascading Impact Explorer design for direction.**

From one sourced event, users explore downstream domains through expand-on-demand
branches. Every connection carries **reason**, **confidence**, **evidence**, and
**expected timeframe**. Fields map to Relationship Engine facets (`why`,
`confidence`, evidence, `delay`); strength/direction surface when present.
Language stays estimated — never certain. Examples are schematic literacy
patterns (tariffs→consumers; conflict→inflation pressure), not live forecasts.
No application runtime in this branch.

---

## What shipped

| Artifact | Path |
| --- | --- |
| Design | `docs/GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md` |
| Owner review | this document |
| Visual — tariffs cascade | `assets/images/global-signals/cascading-impact/tariffs-cascade.svg` |
| Visual — conflict/oil cascade | `assets/images/global-signals/cascading-impact/conflict-oil-cascade.svg` |
| Visual — interaction model | `assets/images/global-signals/cascading-impact/interaction-model.svg` |
| Smoke test | `automation/test-global-signals-cascading-impact-docs.mjs` |

### Documented examples

1. Tariffs → Imports → Manufacturing → Retail → Consumers  
2. Conflict → Oil → Transportation → Food → Inflation  

### Interaction model (docs only)

- Seed dossier → Explore cascading impacts  
- First hop limited; expand/collapse per domain  
- Edge inspector: reason · confidence · evidence · timeframe  
- Speculative hops demoted / hidden by default (proposed)  
- Soft depth limit with escalating speculative labeling (proposed)

### Hard rules

- No edge without all four required fields  
- Never imply certainty  
- No fabricated live events  
- Citizen impact literacy — not surveillance, targeting, or trading advice  
- SAMPLE / schematic labels on educational illustrations  
- No invented intermediate hops for prettier 2°/3° stories  

---

## Cross-links

- Relationship Engine (graph layer): `docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md`  
- Relationship honesty baseline: `docs/SIGNALTERRAIN-RELATIONSHIP-MODEL.md`, `docs/RELATIONSHIP-TYPES.md`  
- Articles context join (optional related reading): `docs/articles/articles-architecture.md`  

---

## Owner decisions requested

1. Soft depth limit of 4–5 hops with escalating speculative labeling?  
2. Speculative edges hidden by default?  
3. One deep branch at a time vs multi-branch pin/compare in v1?  
4. Reuse SignalTerrain / Relationship Engine confidence enums (`high` · `moderate` · `low` · `speculative`) verbatim?

---

## Recommendation

**Approve design.** Push-only review branch. Do not merge as product
functionality — documentation and schematic visuals only.
