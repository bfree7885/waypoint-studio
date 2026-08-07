# Owner Review — Global Signals Relationship Explorer

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-relationship-explorer`  
**Base:** `origin/main` @ `f942c7b` (Global Signals Sprint 1 live)  
**Author:** Bryan Freeman <bfree7885@gmail.com>  
**Deployed:** No  
**Merged:** No — stop for owner review

## Verdict

**Approve for review; do not merge until owner sign-off.**

Delivers the first interactive Relationship Explorer after Articles Sprint 1: cascading “What depends on this?” with why / confidence / time horizon / evidence on every edge. Explicitly **not** a graph visualization. Dataset is labeled sample/demo.

## Starting / tip SHAs

| | SHA |
| --- | --- |
| Starting (main) | `f942c7b177512b59bf3807c28814ccbe69820c2c` |
| Tip |  |

## Routes

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/relationships/` | Canonical Relationship Explorer |
| `/side-trails/global-signals/relationships/?entity=<gsn_*>` | Deep-linked cascade |
| `/side-trails/global-signals/` | Landing links to explorer |
| `/side-trails/global-signals/articles/` | Cross-link to explorer |

`/side-trails/global-signals/relationship-graph/` remains the honest coming-soon graph placeholder.

## Data

- **Mode:** `sample-demo`
- **File:** `data/global-signals/relationships/relationships.json`
- **Entities:** 26 (12 selectable roots across all 9 types)
- **Relationships (edges):** 24
- **Cascades:** 12 curated paths
- **Live ingest:** not enabled
- **Schema doc:** `docs/global-signals/relationship-explorer-data-model.md`

Entity types: Country, Industry, Commodity, Port, Company, Conflict, Tariff, Policy, Weather Event.

## UI notes

- Cascading ordered list with ↓ connectors (Articles impact-path pattern)
- Each edge shows Why, Confidence, Time horizon, Evidence (demo-labeled)
- Type filter + entity select + chip picker
- Sample/demo banner; empty cascade and missing entity states are honest
- Desktop + mobile CSS; skip link; reduced-motion respect

## Tests

- `node automation/test-global-signals-relationships.mjs`
- `node automation/test-global-signals.mjs`
- `node automation/test-global-signals-articles.mjs` (no Articles regression)
- `node automation/test-side-trails.mjs`

Coverage: render, selection, missing cascade/entity, confidence predicted coerce, nav/Side Trails integration, HTTP smoke.

## Screenshots

`docs/global-signals/relationships/` — see `SCREENSHOT-INDEX.md`

## Limitations

1. Curated primary paths only — no expand-on-demand branching yet.
2. Demo evidence uses `example.invalid` citations.
3. No live Relationship Engine ingest; graph layout deferred to Relationship Graph module.
4. Sibling edges (e.g. steel → automotive) exist in the edge set but are not always on the primary cascade.

## Owner decisions

1. Keep sample/demo until curated live sources exist?
2. Confirm canonical path `/relationships/` vs renaming to `/explorer/`?
3. When should Articles `likelyImpactPath` soft-link to `gsr_*` edges?
4. Prefer expanding branching next, or Relationship Graph canvas next?

## Recommendation

**Do not merge yet.** Review honesty of demo labeling, confidence rules, cascade literacy, and nav integration; merge when owner accepts.

