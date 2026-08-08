# Owner Review — Global Signals Relationship Graph

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-relationship-graph`  
**Base:** `feature/global-signals-relationship-explorer` @ `0018a54` (extends Cascade Explorer; primary graph supersedes the coming-soon shell)  
**Author:** Bryan Freeman <bfree7885@gmail.com>  
**Deployed:** No  
**Merged:** No — stop for owner review

## Verdict

**Approve for review; do not merge until owner sign-off.**

Delivers the first true Relationship Graph as the **primary** Global Signals relationship feature: expand-on-click nearby relationships, typed nodes, evidenced edges, radial-from-focus layout (not force-directed). Dataset is labeled sample/demo and assembled only from curated existing sources — no AI-invented edges.

## Route choice

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/relationship-graph/` | **Canonical primary graph** |
| `/side-trails/global-signals/relationship-graph/?focus=<id>` | Deep-linked focus |
| `/side-trails/global-signals/relationships/` | Cascade Explorer companion (linear “What depends on this?”) |
| `/side-trails/global-signals/` | Landing CTA elevated to Relationship Graph |

Kept `/relationship-graph/` as the canonical path (already reserved) rather than renaming `/relationships/`, so Cascade Explorer remains a distinct literacy surface.

## Starting / tip SHAs

| | SHA |
| --- | --- |
| Starting (worktree base) | `0018a5455541eb91f4a5c8299b8a7c4fad7643d7` |
| Tip | `1b8a85aa983a6cf57252f8647cf945cf53e68f04` |

## Data

- **Mode:** `sample-demo`
- **File:** `data/global-signals/relationship-graph/graph.json`
- **Nodes:** 79
- **Edges:** 312
- **Live ingest:** not enabled
- **Schema doc:** `docs/global-signals/relationship-graph-data-model.md`

### Node types present

Country · Industry · Commodity · Port · Conflict · Policy · Company · Citizen Impact · Tariff · Weather Event

### Source datasets integrated (curated hops only)

1. `data/global-signals/relationships/relationships.json`
2. `data/global-signals/citizen-impact/citizen-impact.json`
3. `data/global-signals/industries/industries.json`
4. `data/global-signals/countries/countries.json`

## Layout approach

**Radial-from-focus** with progressive expand-on-click:

- Focus node centered; neighbors on stable rings (sorted, equal-angle — not physics simulation)
- Click node → expand nearby; click again / promote to focus for readability
- Edge selection shows Why connected · Confidence · Time horizon · Evidence
- **Mobile:** canvas hidden; stacked expand panels keep the list readable
- Keyboard: focusable nodes/edges; neighbor list is the primary accessible path
- Screen reader: list + edge detail `aria-live`; SVG described as complementary

## UI notes

- Sample/demo honesty banner
- Type filter + focus picker + seed chips
- Honest empty neighbor / missing data / load error states
- Observed never seeded on edges; normalize coerces Observed → Unknown for hops
- Matches Global Signals design system (IBM Plex, calm dark surface, existing CTA patterns)

## Tests

- `node automation/test-global-signals-relationship-graph.mjs`
- `node automation/test-global-signals.mjs`
- `node automation/test-global-signals-relationships.mjs`
- `node automation/test-global-signals-articles.mjs` (no Articles regression)

Coverage: expand visibility, edge metadata facets, required node types, empty/missing focus, confidence coerce, a11y status/banner, mobile CSS stacked panels, HTTP smoke, Articles still live.

## Screenshots

`docs/global-signals/relationship-graph/` — see `SCREENSHOT-INDEX.md`

## Limitations

1. Density is high when industry + country citizen pathways are expanded — progressive disclosure mitigates, but focus seeds should stay curated.
2. Demo / curated-baseline evidence still uses `example.invalid` citations.
3. Country ↔ industry links only when `majorCountries` resolve to known country nodes — no guessed partners.
4. Cascade Explorer remains a separate linear UX; not deleted.

## Owner decisions

1. Keep sample/demo until curated live sources exist?
2. Confirm `/relationship-graph/` as primary vs folding cascade into the same route?
3. Should country→all-eight citizen category edges stay, or trim to higher-confidence pathways only?
4. When should Articles `likelyImpactPath` soft-link to `gsr_*` edges?

## Recommendation

**Do not merge yet.** Review honesty labeling, layout readability (especially dense expands), confidence rules, and nav elevation of Graph over Cascade Explorer; merge when owner accepts.
