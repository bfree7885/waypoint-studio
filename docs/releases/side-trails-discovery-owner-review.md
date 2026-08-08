# Side Trails discovery release — owner review

**Date:** 2026-08-07  
**Branch:** `release/side-trails-discovery`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-st-discovery-release`  
**Author/committer:** Bryan Freeman \<bfree7885@gmail.com\>  
**Base:** `origin/main` @ `f00b4ae`  
**Production before:** `f942c7b` (homepage `waypoint-build`)  
**Recommendation:** **GO** — discovery acceptance gates pass locally; authorized to merge → main → Pages.

---

## Goal

First-time visitors should discover Civic Trails, SignalTerrain, and Global Signals
naturally from waypointstudio.org — without obsolete nav screens, without displacing
Home flagships, with honest Global Signals labels.

---

## Production baseline (before)

| Check | Result |
| --- | --- |
| Homepage SHA | `f942c7b` |
| Quiet Home primary nav | Hidden — only local HOME / Workspace / Customize |
| Homepage Side Trails section | Absent |
| Direct GS / ST / Civic from Home | Fail |
| `/side-trails/` | 200 (already on site; stamp `local` on some pages) |
| `/side-trails/global-signals/` | 200 marketing/roadmap landing (not dashboard) |
| `/side-trails/signalterrain/` | 200 |
| `/side-trails/civic-trails/` | 404 (expected — Civic Trails is external GitHub) |
| Journey Home → Side Trails → GS | Blocked at Home discovery |

Baseline screenshots: `docs/releases/side-trails-discovery/baseline/`

---

## Integrated branches

| Branch | Tip | Role |
| --- | --- | --- |
| `feature/homepage-side-trails-section` | `5a46285` | Homepage deepeners teaser (Civic / ST / GS) |
| `feature/side-trails-primary-nav` | `0400a06` | Quiet Home keeps architecture primary nav |
| `feature/global-signals-home-dashboard` | (via direct-entry) | GS primary route = intelligence board |
| `feature/global-signals-direct-entry` | `81f9de4` | Catalog/nav/redirects → dashboard; About secondary |

**Skipped:** `feature/homepage-global-signals-teaser` — tip empty vs main; GS board is
honestly **sample/demo**, so a live homepage teaser would be misleading.

**Not merged:** GS entity / story / live-data incomplete stacks (not ancestors of home-dashboard).

Conflict: `side-trails/global-signals/index.html` — kept dashboard primary; retained
studio escape links (Home / Side Trails / Support) from nav work.

---

## Acceptance gates

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Side Trails visibly present on homepage | **PASS** — deepeners section after Sheds |
| 2 | Side Trails one-click from site navigation | **PASS** — Quiet Home primary nav |
| 3 | Global Signals reachable directly from homepage | **PASS** — card → `/side-trails/global-signals/` |
| 4 | SignalTerrain reachable directly from homepage | **PASS** — card → `/apps/signalterrain/` |
| 5 | No obsolete navigation screen required | **PASS** — no incubator/explore detour |
| 6 | Mobile discovery equally clear | **PASS** — stacked cards + primary nav |
| 7 | Flagship experiences not visually displaced | **PASS** — Workspace/Scenes/Sheds remain primary; ST section lighter |

### Journey tests (local)

1. Home → primary **Side Trails** → catalog → **Open Global Signals** → dashboard board  
2. Home deepeners → Civic Trails (GitHub) / SignalTerrain app / Global Signals dashboard  

### Direct URLs

- https://waypointstudio.org/side-trails/
- https://waypointstudio.org/side-trails/global-signals/ (dashboard; sample/demo)
- https://waypointstudio.org/side-trails/global-signals/about/
- https://waypointstudio.org/side-trails/signalterrain/
- https://waypointstudio.org/apps/signalterrain/
- https://github.com/bfree7885/civic-trails (Civic Trails destination)

### Stale navigation fixed

- Quiet Home no longer hides architecture primary nav (Explore stays hidden)
- Primary hrefs are site-root absolute (`/side-trails/`, …)
- Shell depth uses directory segments (fixes Articles → Side Trails dead peers)
- `global-dashboard/` redirects to primary GS dashboard (not “coming soon”)
- GS primary route is the board, not the obsolete marketing hero

---

## Tests run

```bash
node automation/test-home-rc1.mjs                         # 63 PASS
node automation/test-studio-nav-architecture.mjs          # 62 PASS
node automation/test-side-trails.mjs                      # PASS
node automation/test-signalterrain-side-trails-move.mjs   # PASS (updated for GS in homeSideTrails)
node automation/test-global-signals.mjs                   # PASS
node automation/test-global-signals-direct-entry.mjs      # PASS
node automation/test-global-signals-home.mjs              # PASS
```

---

## Screenshots (local verify)

| File | What |
| --- | --- |
| `local/01b-homepage-desktop-top.png` | Quiet Home primary nav with Side Trails |
| `local/01c-homepage-desktop-side-trails.png` | Side Trails teaser under Scenes/Sheds |
| `local/02b-homepage-mobile-side-trails.png` | Mobile Side Trails block |
| `local/03-side-trails.png` | Side Trails catalog |
| `local/04-global-signals-dashboard.png` | GS dashboard + sample/demo honesty |
| `local/05-signalterrain.png` | SignalTerrain landing |

Also: feature-branch owner screenshots under
`docs/releases/homepage-side-trails-section/` and
`docs/product/side-trails-primary-nav-screenshots/`.

---

## Risks / notes

1. GS dashboard remains **sample/demo** — correct honesty; not live risk scoring.
2. Civic Trails has no in-studio app route; homepage/catalog open GitHub.
3. Homepage location prompt can obscure first paint; discovery lives below-fold + in nav.
4. Production Side Trails pages previously showed `waypoint-build=local` while Home was
   `f942c7b` — Pages inject will unify stamps on next main deploy.

---

## Go / no-go

**GO** — merge `release/side-trails-discovery` → `main`, push, verify Pages deploy and
public journeys against the new SHA.
