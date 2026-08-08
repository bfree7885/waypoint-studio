# Global Signals — Entity System owner review

**Branch:** `feature/global-signals-entity-system`  
**Author:** Bryan Freeman \<bfree7885@gmail.com\>  
**Status:** Ready for owner review — **do not merge**  
**Start SHA:** `f942c7b177512b59bf3807c28814ccbe69820c2c` (origin/main at branch creation)  
**End SHA:** `020cfa2daa137677b0443c1c285c7f6ccabe4f13`

## Objective

Unify Countries, Industries, Citizen Impact, and Articles around one reusable Entity layout — parameterized by type — with honest empty states and Relationship Explorer deep-links (`?focus=`).

## What shipped

### Shared shell

| Artifact | Path |
| --- | --- |
| Entity JS | `design-system/js/global-signals/wds-gs-entities.js` |
| Entity CSS | `design-system/css/wds-global-signals-entities.css` |
| Registry | `data/global-signals/entities/entities.json` |
| Builder | `scripts/build-global-signals-entities.mjs` |
| Data model | `docs/global-signals/entity-system-data-model.md` |

### Routes

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/entities/` | Index |
| `/side-trails/global-signals/entities/<type>/` | Type index |
| `/side-trails/global-signals/entities/<type>/<slug>/` | **Canonical** entity page |
| `/side-trails/global-signals/countries/<slug>/` | Alias → shared shell + canonical link |
| `/side-trails/global-signals/industries/<slug>/` | Alias → shared shell + canonical link |

### Entity types + counts (seeded)

See `entities.json` `counts` (rebuild may refresh totals):

- country · industry · article · citizen-impact · port · company · commodity · policy · conflict · tariff · weather

### Required sections (every entity page)

Overview · Waypoint’s Take · Relationship Graph · Related Articles · Dependencies · Dependent Entities · Current Risks · Time Horizon · Confidence

### Graph focus

Explorer accepts `?focus=` (and legacy `?entity=`). Entity CTAs set both.

## Tests

```bash
node automation/test-global-signals-entities.mjs
node automation/test-global-signals-articles.mjs
node automation/test-global-signals-countries.mjs
node automation/test-global-signals-industries.mjs
node automation/test-global-signals.mjs
```

## Screenshots

`docs/global-signals/entities/` — see `SCREENSHOT-INDEX.md`.

## Risks / follow-ups

1. Country/Industry **index** hubs still use module JS; only detail pages migrated to the shared shell. A later pass can restyle indexes without changing data.
2. Graph-backbone (`?focus=` radial UI) is parallel work — this branch deep-links the cascade Relationship Explorer already on the branch.
3. `gsc_*` namespace collision across countries / cascades / citizen statements remains documented; not renamed in this branch to avoid breaking module IDs.

## Recommendation

**Do not merge** until owner review of layout feel, ID crosswalk, and alias/canonical strategy. After approval, integrate with home/search/graph-backbone carefully (avoid colliding worktrees).
