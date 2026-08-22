# Owner Review — Global Signals Explain This

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-explain-this`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-explain`  
**Base tip at start:** `feature/global-signals-relationship-explorer` @ `0018a5455541eb91f4a5c8299b8a7c4fad7643d7`  
**Author / committer:** Bryan Freeman <bfree7885@gmail.com>  
**Deployed:** No  
**Merged:** No — stop for owner review

## Verdict

**Approve for review; do not merge until owner sign-off.**

Delivers **Explain This** — Global Signals’ signature question → structured graph explanation. Matching and traversal are deterministic (curated prompts, keywords, aliases, entity labels). Answers are assembled only from existing relationship edges and linked industries / countries / citizen-impact / articles records. No LLM. Honest empty states when the graph cannot answer.

## Starting / tip SHAs

| | SHA |
| --- | --- |
| Starting (branch point) | `0018a5455541eb91f4a5c8299b8a7c4fad7643d7` |
| Feature commit | `c39a1287c336ebeb21e903def3b23d03741ab9a4` |
| Tip | `3d8620e335d220263b95b9d12dcabdd3437db988` (branch HEAD may include later docs stamps) |

## Route

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/explain/` | Canonical Explain This UI |
| `/side-trails/global-signals/explain/?q=…` | Deep-linked question |
| `/side-trails/global-signals/` | Landing CTA + roadmap entry |

## How matching / traversal works

1. **Normalize** the question (lowercase, strip punctuation).
2. **Match** (first hit wins):
   - Exact curated prompt (`question-seeds.json` → `questions[].prompts`)
   - Longest curated keyword
   - Longest entity alias → `gsn_*`
   - Unique entity label contain
3. **Traverse** (no invented edges):
   - Preferred cascade id if present
   - Else curated cascade for seed root
   - Else bounded BFS along existing outbound edges
4. **Assemble** Summary, optional Waypoint’s Take (only if present on a linked industry `waypointsTake`), relationship chain, industries, countries, citizen impacts, confidence (weakest hop), time horizon (furthest hop), evidence, deep links.
5. **Gaps:** missing Take / industries / countries / citizen / articles are listed honestly — never fabricated.

## Example question coverage

| Prompt | Seed / cascade | Linked records |
| --- | --- | --- |
| Why are food prices increasing? | `gsn_drought` → `gsc_drought` | Food / Agriculture industries; Citizen Impact `#food` |
| Why does Taiwan matter? | `gsn_taiwan` → `gsc_taiwan` | Country `gsc_taiwan`; Semiconductors / Technology Takes |
| Why are airlines affected? | `gsn_corridor_conflict` → `gsc_airlines` | Travel / fuel citizen sections; Transportation industry |
| What does this tariff change? | `gsn_steel_tariff` → `gsc_steel_tariff` | Construction / Automotive; article `gsa_demo-steel-tariff` |

### Seed provenance (labeled)

To make the airlines example traversable against the existing oil → transportation structure, this branch adds (labeled `provenance: explain-this-seed-extension`):

- Entity `gsn_travel` (aligned with Citizen Impact registry)
- Edge `gsr_transport_travel`
- Cascade `gsc_airlines`

Demo evidence remains `example.invalid` / `sample-demo`.

## Data

| File | Role |
| --- | --- |
| `data/global-signals/explain/question-seeds.json` | Curated prompts, aliases, crosswalk, routes |
| `data/global-signals/relationships/relationships.json` | Graph (+ explain-this seed extension) |
| `data/global-signals/industries/industries.json` | Linked industries + Waypoint Takes (from Industry Intelligence) |
| `data/global-signals/countries/countries.json` | Linked countries (from Country Intelligence) |
| `data/global-signals/citizen-impact/citizen-impact.json` | Linked citizen statements |
| `data/global-signals/articles/articles.json` | Linked demo articles (unchanged count) |

## UI notes

- Calm Global Signals chrome (IBM Plex, sample/demo banner)
- Question input + four curated example buttons
- Readable sections: Summary, Take, chain, industries, countries, citizen impacts, evidence, explore further, honest gaps
- Deep links to Relationship Explorer (`?entity=`), Relationship Graph, Articles, and intended Countries / Industries / Citizen Impact routes (parallel modules may still be coming-soon shells on this branch)
- Desktop + mobile CSS; skip link; reduced-motion respect
- Side Trails shell not redesigned

## Tests

```bash
node automation/test-global-signals-explain.mjs
node automation/test-global-signals.mjs
node automation/test-global-signals-articles.mjs
node automation/test-global-signals-relationships.mjs
```

Coverage: four example questions, no-match, empty query, alias match, confidence / horizon aggregation, Observed→Unknown coercion, no invented edges, Articles regression (still 5 sample briefs, no Coming soon).

## Screenshots

`docs/global-signals/explain/` — see `SCREENSHOT-INDEX.md`

## Design notes (brief)

- Signature UX is **question → structured path**, not chat.
- Prefer curated cascades for demos; BFS is a fallback, never a fabricator.
- Waypoint’s Take is **sourced or absent** — never paraphrased by the engine.
- Countries / Industries / Citizen Impact deep links use stable IDs (`gsc_*`, `gsi_*`, section anchors) so parallel branches can land without rewiring Explain This.

## Limitations

1. Countries / Industries / Citizen Impact full UIs may still be coming-soon on this branch; Explain This inlines structured excerpts and soft-links.
2. Demo evidence uses `example.invalid`.
3. No LLM fallback by design — odd questions get an honest no-match.
4. Parallel agents (home, search, entity, graph) may need a later integrate pass for shared nav / entity registry.

## Owner decisions

1. Keep airlines seed extension (`gsn_travel` / `gsc_airlines`) in the shared relationships JSON, or move to an explain-only overlay?
2. Should landing primary CTA stay Explain This, or Relationship Explorer?
3. When Countries / Industries / Citizen Impact merge, confirm deep-link paths (`../countries/<slug>/`, `#section`).
4. Approve sample/demo mode until curated live ingest exists?

## Recommendation

**Do not merge.** Feature branch only — push for owner review.
