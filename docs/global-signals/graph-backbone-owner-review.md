# Global Signals — Relationship Graph Backbone Owner Review

**Status:** Ready for owner review — **do not merge**  
**Branch:** `feature/global-signals-graph-backbone`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-graph-backbone`  
**Author:** Bryan Freeman \<bfree7885@gmail.com\>

## Objective

Make the existing Relationship Graph the **navigation backbone** of Global Signals by wiring honest deep links from Articles, Country Intelligence, Industry Intelligence, Citizen Impact, and Cascade Explorer — without redesigning the graph UI.

## Session SHAs

| | SHA |
| --- | --- |
| **Start** (from Relationship Graph tip) | `2e3f271618a06c04f1de432de28f83a096a83c7c` |
| **End** | `f1a555add99ec89f4581643d619726e1d56d0508` |

## Modules integrated

| Module | Source tip | Integration |
| --- | --- | --- |
| Relationship Graph | `2e3f271` (base) | Alias resolver + focus expand verified |
| Relationship Explorer | already on base | Graph CTA on cascade panels |
| Articles | already on base (sprint-1) | `relatedGraphNodeIds` + CTAs |
| Country Intelligence | `f7f45bf` files | Routes + `countryGraphCta` |
| Industry Intelligence | `435ecda` files | Routes + fixed `?focus=gsi_*` |
| Citizen Impact | `50c8c41` files | Per-section `gsci_*` CTAs |

Home dashboard left alone (parallel agent).

## Link matrix

| Surface | CTA | Focus target |
| --- | --- | --- |
| Articles card / detail | Open in Relationship Graph | `relatedGraphNodeIds[0]` |
| Country detail | Open in Relationship Graph | `gsc_*` (Taiwan → `gsn_taiwan`) |
| Industry index / detail | Open in Relationship Graph | `gsi_*` |
| Citizen Impact section | Open in Relationship Graph | `gsci_<section>` |
| Cascade Explorer panel | Open in Relationship Graph | selected `gsn_*` |
| GS landing hero | Relationship Graph (primary) | hub (no focus) |
| Module hubs | Explore in Relationship Graph | hub |

Canonical URL: `/side-trails/global-signals/relationship-graph/?focus=<id>`

ID mapping: `docs/global-signals/graph-backbone-id-mapping.md`

## Focus / expand behavior

- `resolveFocusId` applies `idAliases`, reverse `countryId`, and `gsci_` section slugs.
- Legacy industry soft-link `?focus=industry&id=gsi_*` still resolves.
- On load, focus expands and first-hop neighbors are visible (existing graph behavior).
- Aliased deep links rewrite the URL to the canonical node id (verified: `gsc_taiwan` → `gsn_taiwan`).
- Unknown focus shows an honest idle note (no invented node).

## Tests

```bash
node automation/test-global-signals-graph-backbone.mjs
node automation/test-global-signals-relationship-graph.mjs
node automation/test-global-signals-articles.mjs
node automation/test-global-signals-countries.mjs
node automation/test-global-signals-industries.mjs
node automation/test-global-signals-citizen-impact.mjs
node automation/test-global-signals-relationships.mjs
node automation/test-global-signals.mjs
```

All passed in this session. Backbone suite covers article/country/industry/citizen → focus URL resolution, neighbor expand, Taiwan alias, and Articles non-regression.

## Screenshots

See `docs/global-signals/graph-backbone/` + `SCREENSHOT-INDEX.md`.

## Commits on branch

- `66c45fa` feat(global-signals): make Relationship Graph the navigation backbone
- docs stamps aligning owner-review End SHA (tip = End above)

## Recommendation

**Do not merge yet.** Owner should click through:

1. Articles feed → Open in Relationship Graph → neighbors visible  
2. Taiwan country → CTA → focuses `gsn_taiwan`  
3. Semiconductors industry → `?focus=gsi_semiconductors`  
4. Citizen Impact Food → `?focus=gsci_food`  
5. Confirm sample/demo provenance banners remain  

After owner approval, merge via an integration branch that also reconciles any parallel home-dashboard work.

## Risks

- Article labels remain free-text; only curated `relatedGraphNodeIds` deep-link. New articles need that field.
- `gsc_*` collision across cascade walks / CI statements — documented; do not pass statement ids as graph focus.
- Foundation test now treats Countries / Industries / Citizen Impact as live sample/demo (not Coming soon).
