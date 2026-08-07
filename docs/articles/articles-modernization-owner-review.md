# Owner Review — Articles Design Modernization

**Branch:** `feature/articles-design-modernization`  
**Base tip:** Side Trails + SignalTerrain nav context (`aa408fa` on studio nav / Side Trails lineage)  
**Starting SHA:** `aa408fa5a6ef9e76712242bc06edbcaf2d557f82`  
**Ending SHA:** _(stamp after push)_  
**Decision needed:** Approve visual + architecture alignment for Articles (no merge until owner sign-off)

## Related nav work included

This branch also carries the shared-nav architecture alignment (Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About) and SignalTerrain Side Trails placement required so Articles navigation matches the rest of the site. See also `docs/product/waypoint-studio-nav-architecture-owner-review.md` and `docs/product/signalterrain-side-trails-move-owner-review.md`.

## Ask

Approve modernizing the **Articles** experience onto the current Waypoint design language and shared site navigation, elevating **Waypoint’s Take** as the official editorial component, and documenting Side Trails–ready reusable article architecture — **without** changing feeds, routes, reading behavior, or inventing Takes on live items.

## What changed (visual / docs)

| Area | Change |
|------|--------|
| Articles hub + categories + sample/template | `wcs-page` / `wcs-hero` shell (About/Support language), Cormorant+Inter, shared WDS CSS |
| Feed cards CSS | WDS tokens; Summary labeled as source facts; Take uses official `.wds-take` |
| Waypoint’s Take | `wds-take.js` `renderArticleHtml`; restrained empty when absent/unavailable/redundant with summary |
| Shared primary nav | Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About |
| Docs | Reusable architecture, Take component, this owner review |
| Tests | Articles smoke hooks for Take + nav; Home RC1 nav expectations updated |

## What was preserved (functionality)

- `/articles/` route and curated RSS/JSON contracts
- Feed registry, refresh pipeline, views/filters, related mounts (Dashboard Field Notes, Scenes, Sheds)
- Original-publisher CTAs; no full-article republish
- Existing `waypointTake` / provenance fields — no fabricated editorial Takes on live RSS cards
- One-off primary menus were **not** added; Articles uses shared shell nav

## Product checklist

- [ ] Articles first paint matches Studio calm surfaces (not a one-off dark home skin)
- [ ] Primary nav matches site architecture on Articles pages
- [ ] Summary vs Waypoint’s Take are visually and semantically distinct
- [ ] Empty/unavailable Take is honest (no invention)
- [ ] Side Trails extension points are clear in docs without shipping a CMS
- [ ] Owner approves before merge

## Risks / follow-ups

1. Home RC1 historically locked nav to `Home|Scenes|Sheds|Articles|About` — this branch aligns to Dashboard + Side Trails + Support per current site architecture ask; confirm naming with owner.
2. Shell `data-shell-depth` on nested Articles paths remains as before (depth math for non-`/apps/` routes is a separate reliability follow-up).
3. Optional: cherry-pick or merge SignalTerrain→Side Trails catalog WIP from stash `wip-signalterrain-side-trails-nav-before-articles-modernization` separately.

## Tests

```bash
node automation/test-articles-rss.mjs
node automation/test-home-rc1.mjs
node automation/test-side-trails.mjs
```

## Recommendation

**Approve for owner visual review**; merge only after explicit owner sign-off. Push-only until then.
