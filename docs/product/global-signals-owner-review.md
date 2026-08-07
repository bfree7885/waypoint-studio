# Owner Review — Global Signals foundation

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-foundation`  
**Base tip:** `f9b5d70` (prior Global Signals Side Trails WIP on `feature/global-signals-side-trails`; lineage includes SignalTerrain landing/mockups)  
**Start SHA:** `f9b5d70`  
**End SHA:**   
**Product:** Waypoint Studio · Side Trails · Global Signals  
**Deployed:** No  
**Merged:** No  
**Author attribution:** Bryan Freeman \<bfree7885@gmail.com\>

---

## Verdict

**Approve Global Signals as a new Experimental Side Trails project foundation.**

No engines, ingest, live data, or module functionality were built. This block ships
story, catalog membership, documentation, schematic specimens, and honest empty
placeholder routes.

---

## Requested copy (as shipped)

| Element | Copy |
| --- | --- |
| Title | Global Signals |
| Tagline | Understanding how world events shape everyday life. |
| Purpose | Global Signals is an intelligence platform that explores how geopolitics, trade, infrastructure, policy, weather, cyber events, conflict, and economics ripple through industries and eventually affect citizens. |
| Boundaries | **NOT** a news website. **NOT** financial advice. **Is** a relationship intelligence platform. |
| Status | Experimental |

---

## What shipped

| Item | Detail |
| --- | --- |
| Landing | `/side-trails/global-signals/` |
| Catalog | Third card in `data/side-trails/catalog.json` (Civic Trails + SignalTerrain retained) |
| Placeholders | articles, waypoint-take, relationship-graph, supply-chains, citizen-impact, scenario-explorer, global-dashboard |
| Illustrations | Labeled mock/schematic SVGs under `assets/images/global-signals/` |
| Docs | Architecture, roadmap, relationship-engine design, Side Trails notes |
| Tests | `automation/test-global-signals.mjs`, catalog asserts in `test-side-trails.mjs` |
| About / index | Mentions Global Signals beside other Side Trails |

### Key paths

- `side-trails/global-signals/index.html`  
- `docs/GLOBAL-SIGNALS-ARCHITECTURE.md`  
- `docs/GLOBAL-SIGNALS-ROADMAP.md`  
- `docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md`  
- `docs/side-trails/global-signals.md`  
- `docs/product/global-signals-owner-review.md`  

---

## Honesty notes

- Placeholders say **Coming soon · not implemented** — no fake dashboards.  
- Illustrations are labeled mock/schematic — not live graphs.  
- Catalog remains JSON-driven; Side Trails HTML does not hardcode card titles.  
- Footer: **Part of Side Trails.**

---

## Tests

```bash
node automation/test-side-trails.mjs
node automation/test-global-signals.mjs
node automation/test-global-signals-relationship-engine-docs.mjs
node automation/test-global-signals-citizen-impact-docs.mjs
node automation/test-global-signals-cascading-impact-docs.mjs
```

---

## Risks / remaining

1. Module implementation must not drift into news-feed or trading UX.  
2. Relationship Engine remains design-only until a dedicated implementation review.  
3. Optional: primary-nav discoverability for Side Trails (intentionally quiet today).

---

## Recommendation

**Approve foundation.** Push-only; do not merge until owner confirms catalog membership and copy.
