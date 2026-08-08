# Global Signals — Home Dashboard Owner Review

**Branch:** `feature/global-signals-home-dashboard`  
**Author:** Bryan Freeman \<bfree7885@gmail.com\>  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-home`  
**Status:** Ready for owner review — **do not merge**

## SHAs

| | SHA |
| --- | --- |
| Start (branched from `origin/main`) | `f942c7b` — Merge release/global-signals-sprint-1 into main |
| Tip (this review package) | `eaec7eb0b9b9ea308c12c58f02d21cc0787be993` |

## Goal achieved

`/side-trails/global-signals/` is now an **application intelligence dashboard** answering **“What matters today?”** — dense, calm, sample/demo-labeled — not a marketing landing and not a module catalog.

Coming-soon / roadmap-shell messaging has been removed from the primary entry surface. Unused shells (`waypoint-take`, `supply-chains`, `scenario-explorer`, `global-dashboard`) still exist as honest empty routes but are **not linked** from the dashboard.

## Modules integrated (feature tips)

| Module | Branch tip | Route |
| --- | --- | --- |
| Relationship Explorer | `0018a54` | `/side-trails/global-signals/relationships/` |
| Citizen Impact | `50c8c41` | `/side-trails/global-signals/citizen-impact/` |
| Country Intelligence | `f7f45bf` | `/side-trails/global-signals/countries/` |
| Industry Intelligence | `435ecda` | `/side-trails/global-signals/industries/` |
| Relationship Graph | `2e3f271` | `/side-trails/global-signals/relationship-graph/` |
| Explain This | `3528c3f` | `/side-trails/global-signals/explain/` |
| Articles (already on main) | `f942c7b` | `/side-trails/global-signals/articles/` |

Universal search / entity-system branches were **not present** on origin at build time.

## Dashboard sections → live destinations

| Section | Data / composition | Links |
| --- | --- | --- |
| Relationship Explorer search | Selectable entities from `relationships.json` | `./relationships/?entity=` |
| Current Events | Featured articles + country structural currentEvents | `./articles/?id=`, `./countries/<slug>/` |
| Featured Waypoint’s Take | Article `waypointsTake` (canal slots) | Article, Industry Intelligence, Explain This |
| Featured Relationship | Taiwan cascade | Explorer, Graph (`?focus=`), Explain (`?q=`) |
| Most Affected Countries | Curated country slugs + top risk | Country Intelligence |
| Industries Under Pressure | Curated industry slugs + threats | Industry Intelligence |
| Citizen Impact Summary | Fuel/food/technology/travel statements | `./citizen-impact/#section-*` |
| Latest Articles | Featured article ids | Articles |

Config: `data/global-signals/home/home.json`  
UI: `design-system/js/global-signals/wds-gs-home.js` + `wds-global-signals-home.css`

## Screenshots

See `docs/global-signals/home/` and `SCREENSHOT-INDEX.md`.

## Tests run

- `node automation/test-global-signals.mjs`
- `node automation/test-global-signals-home.mjs`
- `node automation/test-side-trails.mjs`
- `node automation/test-global-signals-articles.mjs`
- `node automation/test-global-signals-relationships.mjs`
- `node automation/test-global-signals-citizen-impact.mjs`
- `node automation/test-global-signals-countries.mjs`
- `node automation/test-global-signals-industries.mjs`
- `node automation/test-global-signals-relationship-graph.mjs`
- `node automation/test-global-signals-explain.mjs`

All passed in this worktree.

## Limitations

1. **Sample/demo / curated-baseline only** — not live news, not a scored risk feed.
2. **Featured picks are curated** in `home.json` among existing ids (not algorithmic ranking).
3. **Dedicated Waypoint’s Take module** remains an unimplemented shell; featured take content comes from Articles (+ Industry link).
4. **Chrome headless screenshots** capture above-the-fold / configured viewport; lower panels are present in the live page after scroll.
5. **Not rebased onto newer `origin/main`** after `f942c7b` (main has moved); merge/rebase is an owner decision before landing.

## Recommendation

**Do not merge yet.** Review the dashboard UX against product standards, confirm section density on desktop + mobile, then decide whether to rebase onto current main and land as a Global Signals release slice.
