# Owner Review — Global Signals Story Mode

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-story-mode`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-story`  
**Base tip at start:** `feature/global-signals-explain-this` @ `3528c3f3c995260f256edf0186bcc49a10692379`  
**Author / committer:** Bryan Freeman <bfree7885@gmail.com>  
**Deployed:** No  
**Merged:** No — stop for owner review

## Verdict

**Approve for review; do not merge until owner sign-off.**

Delivers **Story Mode** — Global Signals intelligence briefings assembled only from curated story seeds, the relationship graph, and linked industries / countries / citizen-impact / articles records. Matching and traversal are deterministic. No LLM. Honest empty states when linked records or paths are missing.

## Starting / tip SHAs

| | SHA |
| --- | --- |
| Starting (branch point) | `3528c3f3c995260f256edf0186bcc49a10692379` |
| Tip |  |

## Routes

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/story/` | Canonical Story Mode UI |
| `/side-trails/global-signals/story/?id=<story_id>` | Deep-linked story |
| `/side-trails/global-signals/story/?id=<article_id>` | Article→story map |
| `/story/?id=…` | Short alias redirect → canonical route |
| `/side-trails/global-signals/articles/?id=…` | Article detail → “Open Story Mode briefing” when `storyId` present |
| `/side-trails/global-signals/` | Landing primary CTA → China demo story |

## How assembly works

1. **Resolve** story by id, slug, article→story map, entry label, or default (`gss_china_export`).
2. **Traverse** (no invented edges):
   - Preferred cascade id if present
   - Else curated cascade for seed root
   - Else bounded BFS along existing outbound edges
3. **Assemble** sections from structured sources only:
   - **What happened** — linked article `factualSummary`, else cascade summary, else seed summary + first edge `why`
   - **Why it matters** — article or industry `waypointsTake` only (sourced or absent)
   - **Industries / countries / citizen / articles** — resolve linked IDs; missing IDs become honest gaps
   - **Relationship graph** — inline chain + deep links to Explorer (`?entity=`) and Graph module (no graph redesign)
   - **Confidence** — weakest hop; **Evidence** — per-edge evidence rows
4. **Gaps:** missing Take / industries / countries / citizen / articles listed honestly — never fabricated.

## Demo stories (4)

| Story id | Seed / cascade | Notes |
| --- | --- | --- |
| `gss_china_export` | `gsn_china` → `gsc_china_export` | Full demo: all nine sections present |
| `gss_taiwan_chips` | `gsn_taiwan` → `gsc_taiwan` | Honest articles gap (no linked briefs) |
| `gss_drought_food` | `gsn_drought` → `gsc_drought` | Food / agriculture + citizen food |
| `gss_steel_tariff` | `gsn_steel_tariff` → `gsc_steel_tariff` | Tariff ripple + steel article |

### Seed provenance (labeled)

To make the China export-restrictions briefing traversable against existing policy→chips→devices edges, this branch adds (labeled `provenance: story-mode-seed-extension`):

- Entity `gsn_china`
- Edge `gsr_china_export_controls`
- Cascade `gsc_china_export`
- Article `gsa_demo-china-export` (`storyId: gss_china_export`)

Demo evidence remains `example.invalid` / `sample-demo`.

## Data

| File | Role |
| --- | --- |
| `data/global-signals/story/story-seeds.json` | Curated stories, article map, routes |
| `data/global-signals/relationships/relationships.json` | Graph (+ story-mode seed extension) |
| `data/global-signals/articles/articles.json` | +1 China export demo brief (6 total) |
| `data/global-signals/industries/industries.json` | Linked industries + Takes |
| `data/global-signals/countries/countries.json` | Linked countries |
| `data/global-signals/citizen-impact/citizen-impact.json` | Linked citizen statements |

## UI notes

- Calm Global Signals chrome (IBM Plex, sample/demo banner)
- Briefing-style reading: TOC, sequential sections, present/missing status
- Every section links into real modules (articles, countries, industries, citizen impact, explorer/graph)
- Desktop + mobile CSS; skip link; reduced-motion respect
- Side Trails shell not redesigned

## Tests

```bash
node automation/test-global-signals-story.mjs
node automation/test-global-signals.mjs
node automation/test-global-signals-articles.mjs
node automation/test-global-signals-explain.mjs
node automation/test-global-signals-relationships.mjs
```

Coverage: four curated stories, China full sections, Taiwan articles gap, unknown id no-match, no invented edges, module deep links, Articles regression (6 sample briefs, no Coming soon), landing/story routes live.

## Screenshots

`docs/global-signals/story/` — see `SCREENSHOT-INDEX.md`

## Design notes (brief)

See `docs/global-signals/story-mode-design-notes.md`.

- Signature UX is **seed → structured briefing**, not chat.
- Prefer curated cascades for demos; BFS is a fallback, never a fabricator.
- Waypoint’s Take is **sourced or absent**.
- Soft-link parallel modules by stable IDs (`gsc_*`, `gsi_*`, citizen section anchors).

## Limitations

1. Countries / Industries full UIs may still be coming-soon on this branch; Story Mode inlines structured excerpts and soft-links.
2. Relationship Graph module remains a shell; Story Mode embeds the chain and deep-links Explorer / Graph without redesigning the graph.
3. Demo evidence uses `example.invalid`.
4. No LLM fallback by design — unknown story ids get an honest no-match.
5. Parallel agents (home, search, entity, graph) may need a later integrate pass for shared nav.

## Owner decisions

1. Keep China seed extension (`gsn_china` / `gsc_china_export` / `gsa_demo-china-export`) in shared JSON, or move to a story-only overlay?
2. Should landing primary CTA stay Story Mode (China demo), or revert to Explain This?
3. When Countries / Industries / Citizen Impact merge, confirm deep-link paths (`../countries/<slug>/`, `#section`).
4. Accept article count 5 → 6 for the China export demo brief?

## Recommendation

**Do not merge** until owner review. Feature branch is pushed for inspection only.
