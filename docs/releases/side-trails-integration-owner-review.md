# Side Trails integration — owner review

**Date:** 2026-08-06  
**Branch:** `release/side-trails-integration`  
**Worktree:** `/home/bryan/Projects/waypoint-studio-st-release`  
**Starting SHA (origin/main):** `52c4656178c738baaa130dbf0d5b0b46d4cf2542`  
**Ending SHA (release tip before merge):** `911069a6a97d59187b8a56ebbba34ae1973fbd1b`  
**Production before:** `4aa39b3` (live Pages artifact ahead-lag vs main documented in `docs/production-reconciliation.md`)

**Decision:** **Approve for merge + GitHub Pages deploy** — integration clean, required smoke tests pass, `/side-trails/` serves with Civic Trails + SignalTerrain + Global Signals cards.

---

## Commits integrated (ordered)

| Step | Source | Tip / range | Method |
| --- | --- | --- | --- |
| 1 | `feature/side-trails-production-integration` | `064c3ea` (+ `0c10bf2`, `e84f8d9`) | `merge --no-ff` |
| 2 | `feature/signalterrain-move-to-side-trails` | `1629a2e` (contains step 1) | `merge --no-ff` |
| 3 | Nav architecture (+ ST design docs) | `a3fdd38` → `dbd0f55` → `aa408fa` → `861e9ed` → `d7072e6` | cherry-pick onto tip (skipped parallel Side Trails landing commits `2c944cb` / `1ed2203`) |
| 4 | Articles modernization | `61b1a58` → `312ee7e` → `128c829` | cherry-pick |
| 5 | Global Signals foundation | `3eb2f2c` → `f9b5d70` → `e1dbbd4` → `8768912` → `a1ef214` → `4389e51` | cherry-pick |

**Release-only fixups**

- `3bbafb2` — restore nav architecture About/Support/sitemap/incubator copy after rebase
- `ad34638` — keep SignalTerrain in `portfolio.sideTrails` (not foundations); document GS in Side Trails README
- `911069a` — preserve `Side Trails → SignalTerrain` hierarchy phrase on About/Support

**Not folded (satellites left for later):** Global Signals cascading-impact / citizen-impact / relationship-engine / articles feature tips beyond the design docs already carried by foundation.

---

## Conflicts & resolution policy

Parallel lineages (nav / articles / GS) diverged from Side Trails production. Conflicts resolved conservatively:

- **Current WDS / newest shell / nav architecture** wins for primary nav labeling (Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About).
- **Side Trails production + ST IA move** wins for catalog membership, `portfolio.sideTrails`, dual URLs (`/side-trails/signalterrain/` + `/apps/signalterrain/`), Incubator “Looking for SignalTerrain?” pointer.
- **Global Signals foundation** wins for three-card catalog + GS landing/placeholders.
- **ENGINEERING-PLAYBOOK** lessons: keep both sides (append).
- No functioning apps removed; no unrelated page redesigns.

---

## Structure / routes verified (local static server)

| Route | HTTP | Notes |
| --- | ---: | --- |
| `/` | 200 | Homepage |
| `/side-trails/` | 200 | Three cards from `data/side-trails/catalog.json` |
| `/side-trails/signalterrain/` | 200 | Product landing |
| `/side-trails/global-signals/` | 200 | Foundation landing + placeholders |
| `/articles/` | 200 | Modernized shell + shared nav |
| `/apps/signalterrain/` | preserved | Dual URL (app unchanged by this release) |

**Catalog cards:** Civic Trails (GitHub outlink) · SignalTerrain · Global Signals.

**Civic Trails:** separate repo `bfree7885/civic-trails` — Studio links out only (no in-studio Civic Trails app expected).

---

## Tests

All relevant automation run from the release worktree (`node automation/test-*.mjs`):

| Suite | Result |
| --- | --- |
| `test-side-trails.mjs` | PASS |
| `test-signalterrain-landing.mjs` | PASS |
| `test-signalterrain-side-trails-move.mjs` | PASS |
| `test-studio-nav-architecture.mjs` | PASS |
| `test-articles-rss.mjs` | PASS |
| `test-global-signals.mjs` | PASS |
| `test-home-rc1.mjs` | PASS |
| `test-platform-foundation.mjs` | PASS |
| `test-signalterrain-dashboard-mockup.mjs` | PASS |
| `test-signalterrain-posture-engine-docs.mjs` | PASS |
| `test-signalterrain-intelligence-map-docs.mjs` | PASS |
| `test-global-signals-relationship-engine-docs.mjs` | PASS |
| `test-global-signals-cascading-impact-docs.mjs` | PASS |
| `test-global-signals-citizen-impact-docs.mjs` | PASS |
| `test-dashboard-rebuild-phase1.mjs` | PASS |

**Summary:** 15/15 PASS. No pre-existing failures observed in this set.

Browser console: not fully instrumented; headless DOM dump confirmed three cards rendered and primary nav labels correct. No freeze/blank shell observed on sampled routes.

---

## Screenshots

Under `docs/releases/side-trails-integration/`:

| File | Capture |
| --- | --- |
| `01-home-desktop.png` | Homepage desktop |
| `02-side-trails-desktop.png` | Side Trails + three cards |
| `03-signalterrain-desktop.png` | SignalTerrain landing |
| `04-global-signals-desktop.png` | Global Signals landing |
| `05-articles-desktop.png` | Articles hub (modernized) |
| `06-side-trails-mobile.png` | Side Trails ~390×844 |

---

## Limitations

- Global Signals is foundation-only (docs + placeholders); no live engines.
- Civic Trails product app is external; Studio card opens GitHub.
- Articles modernization owner-review originally asked for explicit visual sign-off; included here because reconciliation recommended order and Articles tests/screenshots look healthy on shared shell.
- Secondary Pages lag from `GITHUB_TOKEN` bot pushes remains a deploy concern — this release must explicitly trigger `pages.yml`.

---

## Deploy recommendation

**Merge `release/side-trails-integration` → `main`, push, and run `pages.yml` via `workflow_dispatch` (do not assume push alone updates production).** Then verify live `build-info.json` / meta SHA and `/side-trails/` HTTP 200.
