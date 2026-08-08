# Owner Review — Side Trails in primary / global navigation

**Date:** 2026-08-07  
**Branch:** `feature/side-trails-primary-nav`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-nav-side-trails`  
**Base:** `origin/main` @ `f00b4aedf086db9bbd02b1f9006c40053ec4839a`  
**Deployed:** No  
**Merged:** No — stop for owner review  
**Author commit identity:** Bryan Freeman \<bfree7885@gmail.com\>

**Coordination:** Homepage Side Trails *section* work may land separately on `feature/homepage-side-trails-section`. This branch is **global/primary navigation only** — it does not edit `js/studio-home.js` homepage cards.

---

## Verdict

**Approve for owner visual check, then merge when satisfied.**  
Do **not** merge from this agent.

Side Trails is now a first-class item in the shared studio primary nav, reachable in one click from Quiet Home and from shell-mounted major pages, with depth-safe hrefs.

---

## Audit findings (production / `origin/main` before this branch)

| Surface | Before | Gap |
| --- | --- | --- |
| Config `studioPrimaryNav` | Already listed Side Trails (seven-item contract) | Config OK; delivery incomplete |
| Quiet Home `/` + `/apps/dashboard/` | `data-quiet-chrome` hid **all** primary nav + Explore | **No one-click Side Trails** from main shell |
| Articles / Side Trails catalog | Shell mounted, but `data-shell-depth="0"` + apps-era depth math | Primary links like `side-trails/` resolved as `/articles/side-trails/` (dead) |
| Scenes / Sheds overview | Shell + primary nav included Side Trails | OK when depth correct under `/apps/*` |
| Sheds field map | Custom HUD only | Intentional field exception — escape via Sheds brand → overview (has shell) |
| SignalTerrain / Global Signals landings | Custom product nav; Side Trails + About only | Missing Home / Articles / Support in product chrome |
| Explore launcher | Still lists demoted apps | Secondary discovery — not primary architecture (unchanged) |

### Architecture contract (unchanged labels)

**Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About**

(Quiet Home product name may still read **Home**; architecture label remains **Dashboard**.)

---

## What changed

1. **Quiet Home keeps Explore hidden**, but **renders the seven-item primary nav** (calm/quiet styling) so Side Trails is one click from `/`.
2. **Path depth** is directory-segment based (`/articles/` → 1, `/apps/scenes/` → 2). Legacy `data-shell-depth` / `shellDepth` apps-era encoding is **ignored** for href resolution.
3. **Primary nav hrefs** are **site-root absolute** (`/side-trails/`, `/articles/`, …) so nesting cannot invent peer-relative dead ends.
4. **SignalTerrain / Global Signals** product headers gain Home · Articles · Side Trails · Support · About (no second shell system).
5. Quiet Home **noscript** fallback lists Articles / Side Trails / Support / About.

---

## Intentional exceptions

1. **Sheds field map** — immersive HUD; not the studio shell. Reach Side Trails via Sheds overview (brand) or other shell pages.
2. **Explore launcher** — still a secondary catalog; not the architecture contract.
3. **Homepage content section** — left to the parallel homepage agent; not required for chrome one-click access after this branch.
4. **Product landings** under Side Trails keep their visual language; they extend product nav rather than mounting the full app shell.

---

## Tests

```bash
node automation/test-studio-nav-architecture.mjs
node automation/test-home-rc1.mjs
node automation/test-side-trails.mjs
node automation/test-platform-foundation.mjs
node automation/test-signalterrain-side-trails-move.mjs
```

---

## Screenshots

See `docs/product/side-trails-primary-nav-screenshots/` (local server capture on this branch).

---

## Risks / follow-ups

1. Quiet Home primary nav is denser than the previous brand-only chrome — owner should confirm the quieter typography is acceptable on mobile.
2. Absolute `/…` hrefs assume site hosting at domain root (current production).
3. Stale `data-shell-depth="0"` attributes remain in HTML for documentation/tests (e.g. home-rc1 root assert) but no longer drive resolution.

---

## Recommendation

**Do not merge yet.** Owner: spot-check Quiet Home, Articles → Side Trails, Scenes → Side Trails, and Side Trails landings on a phone-width viewport, then merge when ready.
