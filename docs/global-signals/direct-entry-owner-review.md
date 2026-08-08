# Global Signals — Direct Entry Owner Review

**Branch:** `feature/global-signals-direct-entry`  
**Author:** Bryan Freeman \<bfree7885@gmail.com\>  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-direct`  
**Status:** Ready for owner review — **do not merge**

## SHAs

| | SHA |
| --- | --- |
| Base (`origin/main` at branch creation) | `f00b4ae` — chore(articles): refresh curated feed artifacts |
| Integrated home dashboard tip | `bac5862` — docs(global-signals): align owner-review branch HEAD with tip |
| Merge of home dashboard onto branch | `0525763` — Integrate Global Signals home dashboard as primary experience base |
| Feature tip | `81f9de42450a38a1f2741080c263f4de361b93b3` |
| Branch HEAD | `b1f597d32a572e2059a54c1dcdc0907ff184eff5` |

## Goal

Remove friction between homepage / Side Trails / nav and the live Global Signals experience. Clicks must open the **intelligence dashboard**, not a marketing or roadmap landing.

## What changed

1. **Integrated** `feature/global-signals-home-dashboard` so `/side-trails/global-signals/` is already the real board.
2. **Homepage Side Trails** — added `global-signals` to `homeSideTrails` with `productLanding` / `startHere` → `side-trails/global-signals/`.
3. **Nav registry + embedded config** — new `global-signals` app entry (modules + About feature).
4. **Side Trails catalog** — URL already correct; CTA label → “Open Global Signals”.
5. **Studio About** — lists and links Global Signals to the dashboard.
6. **Secondary About** — mission / philosophy / roadmap at `/side-trails/global-signals/about/` (footer link only on primary).
7. **Redirect** — `/side-trails/global-signals/global-dashboard/` → primary dashboard (superseded shell).

## Link matrix

| Entry point | Before | After |
| --- | --- | --- |
| `/side-trails/global-signals/` | Marketing landing (on main); dashboard after home-dashboard merge | **Intelligence dashboard** (`gsh-board`) |
| Side Trails catalog CTA | `side-trails/global-signals/` | Same URL → dashboard; CTA “Open Global Signals” |
| Side Trails hero text link | `./global-signals/` | Unchanged → dashboard |
| Homepage Side Trails list | SignalTerrain only | SignalTerrain + **Global Signals** → dashboard via `productLanding` |
| Studio `about.html` | SignalTerrain only among sisters | + Global Signals → dashboard |
| Global nav “Side Trails” | Catalog | Catalog → card → dashboard (unchanged path) |
| Dashboard footer About | Missing | `./about/` (secondary) |
| `/global-dashboard/` | Coming soon placeholder | **Redirect** to `../` |
| `/about/` (GS) | Did not exist | Secondary explanatory page |
| `/waypoint-take/`, `/supply-chains/`, `/scenario-explorer/` | Honest empty shells | Unchanged; **not** in primary entry flow |

## Dashboard sections verified

Present in `wds-gs-home.js` composition (sample/demo labeled):

| Section | Present |
| --- | --- |
| Current Events | Yes |
| Articles (Latest + links) | Yes |
| Waypoint’s Take (featured) | Yes |
| Relationship Explorer (search + module) | Yes |
| Relationship Graph (featured link) | Yes |
| Countries (Most Affected) | Yes |
| Industries (Under Pressure) | Yes |
| Citizen Impact Summary | Yes |

Primary HTML also links Explain, Graph, Explorer, Countries, Industries, Citizen Impact, Articles in header/footer.

## Redirects

| Old URL | Behavior |
| --- | --- |
| `/side-trails/global-signals/global-dashboard/` | `meta refresh` + `location.replace("../")` → dashboard |

Marketing content that previously occupied the primary route now lives at `/about/` (no redirect needed — same primary path now serves the board).

## Screenshots

See `docs/global-signals/direct-entry/` and `SCREENSHOT-INDEX.md`.

## Tests run

- `node automation/test-global-signals-direct-entry.mjs`
- `node automation/test-global-signals.mjs`
- `node automation/test-global-signals-home.mjs`
- `node automation/test-side-trails.mjs`
- `node automation/test-global-signals-articles.mjs`
- `node automation/test-global-signals-relationships.mjs`
- `node automation/test-global-signals-explain.mjs`
- `node automation/test-global-signals-citizen-impact.mjs`
- `node automation/test-global-signals-countries.mjs`
- `node automation/test-global-signals-industries.mjs`
- `node automation/test-global-signals-relationship-graph.mjs`

All passed in this worktree.

## Limitations / honesty

1. Dashboard remains **sample/demo / curated** — not a live news engine.
2. Dedicated Waypoint’s Take / Supply Chains / Scenario Explorer modules remain unimplemented shells (not primary entry).
3. Did **not** merge live-data WIP; not required for the board to function.
4. Chrome headless screenshots are above-the-fold for configured viewports.
5. Homepage Global Signals link depends on nav config load (same pattern as SignalTerrain).

## Recommendation

**Do not merge yet.** Review entry friction (Home → GS, catalog → GS, About → GS), confirm About stays secondary, then decide rebase/merge order with other Global Signals slices.
