# Owner Review — Homepage Global Signals teaser

**Date:** 2026-08-07  
**Branch:** `feature/homepage-global-signals-teaser`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-home-gs-teaser`  
**Product:** Waypoint Studio · Home · Global Signals (Side Trails)  
**Deployed:** No  
**Merged:** No — stop for owner review  
**Author attribution:** Bryan Freeman \<bfree7885@gmail.com\>

---

## Verdict

**Approve for review as a compact live-only teaser.** Ships UI + loader + honest unavailable path. Does **not** invent sample content when live artifacts are missing.

---

## Goal

Small homepage strip that feels alive without becoming a geopolitical dashboard:

- 1 important current event  
- 1 affected industry  
- 1 potential citizen impact  
- freshness timestamp  
- Explore → `/side-trails/global-signals/`

---

## What shipped

| Item | Detail |
| --- | --- |
| Loader | `design-system/js/global-signals/wds-gs-loader.js` — refuses `sample-demo` / fixture modes |
| Teaser | `design-system/js/global-signals/wds-gs-home-teaser.js` |
| Mount | Compact section in Home deepeners after Sheds (`data-deepen="global-signals-teaser"`) |
| Styles | Compact strip in `wds-dashboard-rebuild.css` |
| Explore link | `side-trails/global-signals/` |
| Tests | `automation/test-homepage-global-signals-teaser.mjs` (+ Home RC1 asserts) |
| Screenshots | `docs/product/homepage-gs-teaser/` |

### Coordination (parallel work)

- **Side Trails cards section** (`feature/homepage-side-trails-section`) is separate. This teaser is a compact strip, not catalog cards.  
- Place after Sheds so Side Trails cards can follow without redesigning Home.  
- Nav / GS live-data architecture remain parallel — teaser consumes their production artifact paths.

---

## Data source (live pipeline only)

Primary:

- `data/global-signals/production/events/events.json`  
- `data/global-signals/production/impacts/impacts.json`  
- `data/global-signals/ingestion/status.json`  

Compat fallbacks (same live gate):

- `data/global-signals/events/events.json`  
- `data/global-signals/impacts/impacts.json`  

**Modes allowed:** `live`, `live-empty`  
**Modes refused:** `sample-demo`, `fixture`, `demo`, `curated-baseline`

### Dependency note

Live ingest/pipeline work lives on `feature/global-signals-live-data-architecture` (WIP in sibling worktree at review time; not yet on `main`). Homepage teaser is ready; until production artifacts are published, Home shows the **honest unavailable/empty** state — never sample fixtures.

---

## Behavior when unavailable

| Condition | UI state |
| --- | --- |
| Missing / HTTP failure | “Live Global Signals data is unavailable…” + Freshness unavailable |
| Non-production mode (e.g. sample-demo) | Refused → unavailable (sample titles never render) |
| `live-empty` or no events | Empty honesty copy — no invented signal |
| Live events but no paired industry+citizen ripple | Empty (`no_complete_ripple`) — no partial invention |

Explore link remains available so curiosity can continue into Global Signals.

---

## Screenshots

Directory: `docs/product/homepage-gs-teaser/`

| File | State |
| --- | --- |
| `01-desktop-gs-teaser-unavailable.png` | Honest unavailable (no production artifacts) |
| `02-phone-gs-teaser-unavailable.png` | Phone unavailable |
| `03-desktop-gs-teaser-live.png` | Live strip (local temp artifacts for capture only; not committed) |
| `04-phone-gs-teaser-live.png` | Phone live |

Capture helper: `automation/capture-homepage-gs-teaser.mjs`

---

## Tests

```bash
node automation/test-homepage-global-signals-teaser.mjs
node automation/test-home-rc1.mjs
```

Coverage:

- Live present selection (event + industry + citizen)  
- Unavailable / empty honesty  
- Sample-demo refused — sample titles never appear in pick/render  
- Deepeners mount + Explore href  
- Production files (if present) must be `live` / `live-empty`

---

## Recommendation

1. **Approve** teaser UX + honesty contract.  
2. **Land / publish** `feature/global-signals-live-data-architecture` artifacts so Home can leave unavailable.  
3. Merge Side Trails cards section after/beside this strip without combining into a dashboard.  
4. Do **not** merge this branch until owner sign-off.

---

## Risks

- Parallel deepeners edits (Side Trails section) may conflict on `wds-dashboard-rebuild-deepeners.js` — resolve by keeping GS teaser as its own section after Sheds, Side Trails after teaser.  
- Without live artifacts, Home stays unavailable — correct, but quieter than “alive.”  
- Capture script’s temporary live JSON must never be committed as production.
