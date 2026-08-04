# Waypoint Studio — Complete Status & Reconciliation Audit

**Audit date:** 2026-08-03 (America/New_York; evidence stamped 2026-08-04T01:18Z UTC)  
**Audit branch:** `audit/waypoint-studio-complete-status-2026-08-03`  
**Starting SHA (base = `origin/main`):** `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` (`59c09de`)  
**Ending SHA:** (tip of this audit branch; see `git rev-parse HEAD` after push)  
**Repository:** `/home/bryan/Projects/waypoint-studio` (`bfree7885/waypoint-studio`)  
**Host:** System76 Meerkat  
**Constraint confirmation:** Audit-only — no application code modified, merged, deleted, or deployed.

**Evidence companions:**
- `docs/project-audit/2026-08-03-test-results.txt`
- Prior July audit (reference, not re-trusted without re-verification): `origin/audit/waypoint-studio-complete-production-review-2026-07` → `docs/audits/waypoint-studio-complete-production-audit-2026-07.md`

---

## 1. Executive summary

Waypoint Studio production (`https://waypointstudio.org`) **equals** `origin/main` at **`59c09de`**. Local checkout `main` on the Meerkat is **stale** (`63fc457`, **36 commits behind** `origin/main`) — operators must not treat local `main` as production truth.

| Product | Status | Confidence | One-line |
| --- | --- | --- | --- |
| **Dashboard** | FUNCTIONAL BUT INCOMPLETE | High | Rebuild workspace live with **5** tiles; 32-tile catalog exists only on unmerged branch |
| **Scenes (overall)** | PARTIAL | High | Live craft loop: Photo Coach + Photo Library + Hidden Landscapes; four-pillar IA mostly unmerged |
| **Learn** | FUNCTIONAL BUT INCOMPLETE | High | Photo Coach / Shoot Review production; portfolio suite + Photo Coach 2.0 unmerged/WIP |
| **Create** | PROTOTYPE | High | Living Scenes is preview-only on main/production |
| **Remember** | MISSING / PLANNED ONLY | High | Outdoor Journals absent on production; foundation only on Scenes feature branches |
| **Explore** | FUNCTIONAL BUT INCOMPLETE | High | Hidden Landscapes live; Animal Vision incubator |
| **Sheds** | PARTIAL | High | Map foundation with real model + localStorage; regs/species routes planned |

**Strongest live product:** Dashboard Rebuild (Today Outside + 5-tile workspace).  
**Closest to next genuine usability leap:** merge-gate `feature/dashboard-functional-tile-catalog` (32 tiles @ `c975958`).  
**Highest loss risk:** unpushed Photo Coach 2.0 WIP on `feature/scenes-photo-coach-2-architecture` + Scenes portfolio branch family + Scenes sprint branches still based on pre-`59c09de` history.

**Immediate priority recommendation:** **Dashboard** (integrate functional tile catalog) — then Scenes reconciliation — pause Sheds expansion.

---

## 2. Current repository state

| Fact | Value | Evidence |
| --- | --- | --- |
| `origin/main` | `59c09de` — `docs(dashboard): record tile layout repair merge and production SHA` (2026-07-25) | `git log -1 origin/main` |
| Local `main` | `63fc457` — RC3 merge (2026-07-21); **36 behind** origin/main | `git rev-list --count main..origin/main` → 36 |
| Primary checkout branch | `feature/scenes-photo-coach-2-architecture` @ `89129f4` (= sprint3 tip) with **uncommitted/staged Photo Coach 2.0 files** | `git status -sb` |
| Audit worktree | `/tmp/waypoint-studio-audit-2026-08-03` checked out from `origin/main` | `git worktree list` |
| Tags | `pre-rc3-consolidation-2026-07`, `v0.3.0-rc3`, `v1.0.0` | `git tag -l` |
| Stashes | `stash@{0}` rc4 audit WIP; `stash@{1}` sprint4 scene-native WIP | `git stash list` |
| Remote branch count | **40** refs under `origin/` (excl. HEAD) | `for-each-ref` |
| Feature/fix/turnaround remotes | **25** | inventory §12 |
| Package / npm root | **None** — static site; tests are Node `.mjs` scripts | no `package.json` at root |
| Deploy | GitHub Pages via `.github/workflows/pages.yml` on push to `main` | workflow file |

Canonical Dashboard implementation on main: `design-system/js/dashboard/rebuild/*` booted by `apps/dashboard/js/home-boot.js`. Legacy V2/V3/Outdoor-OS modules still present in the loader graph (maintenance tax).

---

## 3. Current production state

Fetched 2026-08-03 (Meerkat):

### `https://waypointstudio.org/data/build-info.json`
```json
{
  "commit": "59c09debbe8d9c7d36acf74607bd4ebfa55359fc",
  "shortCommit": "59c09de",
  "builtAt": "2026-07-26T02:47:56.539Z",
  "workflowRunId": "30185121429",
  "source": "github-pages",
  "deployedAt": "2026-07-26T02:47:56.539Z",
  "locationSchema": 4,
  "loaderVersion": 2,
  "migrationEpoch": 3,
  "minRecoveryBuild": "cf51ce4"
}
```

### HTML meta
- Home `/`: `<meta name="waypoint-build" content="59c09de">`
- `/version.json`: **HTTP 404** (custom 404 page)

### Route probes (HTTP)
| Path | Code |
| --- | ---: |
| `/apps/scenes/` | 200 |
| `/apps/shed-hunting/` | 200 |
| `/apps/shed-hunting/map/` | 200 |
| `/apps/photo-coach/` | 200 |
| `/apps/waypoint-scenes/` | 200 |
| `/apps/scenes/living-scenes/` | 200 |
| `/apps/animal-vision/` | 200 |
| `/dashboard/` | 200 (redirect) |
| `/kiosk.html` | 200 |
| `/knowledge.html` | 200 |
| `/data/build-info.json` | 200 |

| Comparison | Result |
| --- | --- |
| Production vs `origin/main` | **Equal** (`59c09de`) |
| Production vs local `main` | Production **ahead** of local main by 36 commits |
| Production vs `feature/dashboard-functional-tile-catalog` | Production **behind** feature (catalog not deployed) |
| Production vs Scenes sprint / portfolio / turnaround tips | Production does **not** include those feature tips |

**Production build identifier:** `59c09de` / `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` (workflow `30185121429`, built 2026-07-26T02:47:56.539Z).

---

## 4. Dashboard status

**Overall:** FUNCTIONAL BUT INCOMPLETE — **High** confidence.

### Shell & navigation
- Canonical UI: `/apps/dashboard/` (also linked from Home “See today’s outdoors”).
- Redirects: `/dashboard.html`, `/dashboard/` → `apps/dashboard/`.
- Shared WDS app shell (`data-wds-app-shell`, `wds.js`).
- Home (`/`) is marketing/studio home, not the Rebuild workspace (README still partially outdated).

### Mobile layout & tile editing
- Layout repair merge on main: `73d60de` / `35bbb0a` / docs `59c09de`.
- Mobile customize tests **PASS** (39) on main.
- Tile layout repair tests **PASS** (48) on main.

### Working tile catalog (production / main)
Exactly **five** selectable tiles in `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js`:

| ID | Title | Classification | Notes |
| --- | --- | --- | --- |
| `ph-conditions` | Conditions | Fully functional (when provider answers) | `live: true`; Open-Meteo/NWS |
| `ph-air` | Air | Partially functional | Often Unavailable without AQ answer |
| `ph-alerts` | Alerts | Partially functional | `live: false` in registry; empty = “No active alerts” |
| `ph-astronomy` | Astronomy | Partially functional | Weak fields (e.g. moonrise not computed) |
| `ph-light` | Light | Partially functional | Degrades under NWS fallback (no sunrise/UV) |

**Placeholder / Coming Soon tiles on production catalog:** none (explicitly removed).  
**Half-size / malformed:** layout repair intended to enforce equal-width; repair tests pass. Residual customize nested-selector risk noted in July audit — not re-browsed this run (**Medium** residual confidence).

### Today Outside
- Implemented in `wds-dashboard-rebuild-today.js` + summary modules.
- `automation/test-dashboard-today-outside.mjs` **FAILS (4)** on main — assertions still expect older “Outdoor OS / Outside” naming (`Outside entry loads Outdoor OS CSS`, product titled Outside, empty nav features, home-boot sections). **Tests drift**, not proof Today Outside is absent. Rebuild today panel code exists.

### Discovery / personal workspace
- Workspace customize: enable/disable, favorite, reorder, size, columns, presets — present.
- Favorites family exists but only over 5 tiles → thin choice.
- Broader “discovery” product features from RC3 sprint4 branch **not** verified as merged into Rebuild surface.

### Kiosk / display
- Hash/deep-link kiosk support in `home-boot.js` + `wds-dashboard-rebuild-kiosk.js`.
- Comment in kiosk module: not user-facing chrome; Workspace is canonical.
- `/kiosk.html` live HTTP 200.
- `test-kiosk-modules.mjs` PASS; `test-kiosk-location-boot.mjs` **broken** (missing `ws` dependency).

### Unmerged Dashboard work
| Branch | Tip | Ahead/Behind main | Recommendation |
| --- | --- | --- | --- |
| `feature/dashboard-functional-tile-catalog` | `c975958` | 6 ahead / 0 behind | **Integrate** after merge-gate — 32 tiles |
| `feature/dashboard-rc3-sprint6-functional-catalog` | `7311a0c` | 69 / 4 | Investigate/archive vs newer catalog branch |
| `turnaround/sprint-04-canonical-dashboard-loader` | `6db767a` | 3 / 0 | Preserve; review before integrate |
| `fix/dashboard-production-tile-layout` | `f6842b2` | 0 / 2 | Already merged ancestor — archive OK |
| RC3 sprint1–5 feature branches | various | behind main | Archive after confirming no unique commits |

**Dashboard on main version:** Rebuild post tile-layout repair @ `59c09de`.  
**Dashboard on production:** same SHA `59c09de`.

---

## 5. Scenes overall status

**Overall:** PARTIAL — **High** confidence.

### What production/main actually ships
| Surface | Route | Role |
| --- | --- | --- |
| Scenes hub | `/apps/scenes/` | Journey: Review → Import → Learn; Living Scenes demoted |
| Photo Coach | `/apps/photo-coach/` | Primary LEARN tool |
| Photo Library | `/apps/photo-library/` | Local IndexedDB library |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Experimental explore tool |
| Living Scenes preview | `/apps/scenes/living-scenes/` | “Future experience” — no controls |
| Legacy studio | `/apps/waypoint-scenes/` | Reachable monolith / builder experiments |

### What is **not** on main/production
- Four-pillar landing IA (`feature/scenes-sprint1-four-pillar-foundation`)
- Scene Library (`feature/scenes-sprint3-scene-library` @ `89129f4`)
- Entire portfolio suite (assistant/coach/builder/health/website) — feature branches only; production 404 historically for portfolio routes
- Photo Coach 2.0 architecture — **local unpushed WIP**

### Dual hub problem
Production still exposes both `/apps/scenes/` and `/apps/waypoint-scenes/`. Sprint1 intended redirects making `waypoint-scenes` the entry — **not merged**. Turnaround sprint5 demotes legacy studio honesty — **not on main**.

### Tests (main)
Photo Coach shoot review 41 PASS; photographer profile PASS; personalized coaching PASS; photo library 26 PASS; hidden landscapes 134 PASS.

---

## 6. Scenes Learn pillar status

**Pillar status:** FUNCTIONAL BUT INCOMPLETE — **High**.

| Feature | Distinction | Status | Location |
| --- | --- | --- | --- |
| Photo Coach / Shoot Review | Integrated | FUNCTIONAL BUT INCOMPLETE | main + production `/apps/photo-coach/` |
| Photographer Profile | Integrated (early) | PROTOTYPE / PARTIAL | `/apps/photo-coach/` profile paths |
| Personalized coaching | Integrated | PARTIAL | main; tests PASS |
| Image analysis (heuristic) | Integrated | PARTIAL | `apps/waypoint-scenes/js/photo-coach*.js` consumed by Coach |
| Editing recommendations | Partial | PARTIAL | Coach critique language; not a full editor |
| Automated editing | Missing | MISSING | — |
| Purpose selector | Partial / branch | PARTIAL | Portfolio branches / Coach folio CSS |
| Portfolio Assistant | Unmerged branch | PARTIAL | `feature/scenes-portfolio-assistant` |
| Portfolio Coach | Unmerged branch | PARTIAL | `feature/scenes-portfolio-coach` |
| Auto Portfolio Builder | Unmerged branch | PARTIAL | `feature/scenes-auto-portfolio-builder` |
| Portfolio Health | Unmerged branch | PARTIAL | `feature/scenes-portfolio-health` |
| Portfolio website output | Unmerged branch | PARTIAL | `feature/scenes-portfolio-website-output` |
| Photo Coach 2.0 architecture | Local WIP unpushed | PROTOTYPE | staged on `feature/scenes-photo-coach-2-architecture` |
| Scene Library | Unmerged branch | PARTIAL | `feature/scenes-sprint3-scene-library` |
| Blurry preview fix | Unmerged | PARTIAL | `fix/waypoint-coach-blurry-preview` (36 behind main) |

Owner-review docs claiming “implemented” for portfolio/sprint work **do not** prove merge/deploy — verified absent from `origin/main` and production SHA.

---

## 7. Scenes Create pillar status

**Pillar status:** PROTOTYPE — **High**.

| Feature | Distinction | Status | Evidence |
| --- | --- | --- | --- |
| Living Scenes (production) | Integrated as preview | PROTOTYPE | `apps/scenes/living-scenes/index.html` — “Future experience”, no animation controls |
| Living Scenes studio | Unmerged (sprint1 `create/`) | PARTIAL | `apps/waypoint-scenes/create/` on sprint1/3 branches |
| Parallax / motion / depth | Partial in legacy studio | PROTOTYPE | `apps/waypoint-scenes/js/parallax*.js`, effects engine on main legacy tree |
| Animated environmental effects | Docs + preview | PLANNED ONLY / PROTOTYPE | Preview copy only on hub |
| Export / sharing | Partial | PARTIAL | `apps/waypoint-scenes/export/` exists on sprint3 tree; limited on main hub |
| Scene Builder | Legacy / preview | PROTOTYPE | `/apps/scenes/scene-builder/` |

---

## 8. Scenes Remember pillar status

**Pillar status:** MISSING (production) / PARTIAL (unmerged foundation) — **High**.

| Feature | Distinction | Status |
| --- | --- | --- |
| Outdoor Journals | Unmerged foundation page | PARTIAL on sprint1 `remember/`; **MISSING** on production |
| Hiking / wildlife / mushroom journals | Idea / docs | PLANNED ONLY / MISSING |
| Year in Nature books | Idea | MISSING |
| Calendars / print layouts / PDF export | Idea / templates | PLANNED ONLY (`design-system/field-guide/templates/seasonal-journal.html` only) |
| Photo selection workflows | Portfolio branches | PARTIAL (unmerged) |

Production hub language (and turnaround sprint5) correctly treats Outdoor Journals as not available — but that honesty branch itself is unmerged.

---

## 9. Scenes Explore pillar status

**Pillar status:** FUNCTIONAL BUT INCOMPLETE — **High**.

| Feature | Distinction | Status | Evidence |
| --- | --- | --- | --- |
| Hidden Landscapes | Integrated | FUNCTIONAL BUT INCOMPLETE | `/apps/hidden-landscapes/`; 134 tests PASS |
| Infrared / full-spectrum / UV concepts | Via Hidden Landscapes + Animal Vision | PARTIAL / PROTOTYPE | HL transformations; Animal Vision app |
| Animal Vision | Incubator/app | PROTOTYPE | `/apps/animal-vision/` HTTP 200 |
| Scientific visualization tools | Partial | PARTIAL | HL engine `applyTransformation` / `exportImage` |
| Explore pillar overview page | Unmerged | PARTIAL | sprint1 `apps/waypoint-scenes/explore/` |

---

## 10. Sheds status

**Overall:** PARTIAL — **High**.

| Area | Real vs mock | Status | Evidence |
| --- | --- | --- | --- |
| Sheds shell / home | Real static experience | FUNCTIONAL BUT INCOMPLETE | `apps/shed-hunting/index.html`; foundation.json |
| Full-screen map | Real Leaflet map app | PARTIAL | `apps/shed-hunting/map/` + `sheds-map-app.js` |
| Whitetail deer focus | Real biological model with citations | PARTIAL | `sheds-biological-model.js` (MU Ext, NH F&G, etc.) |
| Heat maps | Real computed likelihood surfaces | PARTIAL | `sheds-heat-layer.js` + model; not GPS antler heatmap of finds |
| Day/time/location analysis | Real local model inputs | PARTIAL | planner + bio model |
| Today’s Search | Real planner UI | PARTIAL | `sheds-search-planner.js`; tests PASS |
| GPS / location | Real browser geolocation + deny memory | PARTIAL | `GPS_DENIED_KEY` in map app; depends on user permission |
| Offline behavior | Real offlineForced / localStorage | PARTIAL | model `inputMode: offline`; integration tests mention offline control |
| Weather overlays | Best-effort provider; honest unavailable | PARTIAL | `weatherModifiers`; neutral if missing |
| Regulations | Planned | PLANNED ONLY | foundation.json module `status: planned`; route `ready: false` |
| Saved observations | Real localStorage | FUNCTIONAL BUT INCOMPLETE | `sheds-observation-store.js` |
| Data ingestion | Local user entry only | PARTIAL | no cloud ingest |
| Species / finds routes | Not ready | MISSING / PLANNED | foundation routes `ready: false` |
| Branches / owner reviews | Historical sprints on main lineage | — | tests on main mostly PASS |
| Main status | Foundation shipped | PARTIAL | present @ `59c09de` |
| Production | Equal to main | PARTIAL | `/apps/shed-hunting/map/` 200; build `59c09de` |

`automation/test-sheds-map.mjs`: **1 FAIL** (`skip link uses sheds-skip`) — minor; other Sheds suites PASS.

---

## 11. Shared platform status

**Overall:** PARTIAL — products share WDS shell/nav more than data/auth — **High**.

| System | Status | Notes |
| --- | --- | --- |
| Global navigation | FUNCTIONAL BUT INCOMPLETE | `wds-app-nav*.js`, product switching via shell |
| Product switching | FUNCTIONAL BUT INCOMPLETE | Dashboard / Scenes / Sheds / Volunteer links |
| Authentication | MISSING | No real user accounts; local-only identity helpers |
| User accounts | MISSING | — |
| Data storage | PARTIAL | localStorage / IndexedDB per product; not unified sync |
| APIs | PARTIAL | Client-side providers (Open-Meteo, NWS, USGS); no first-party backend |
| Design system | FUNCTIONAL BUT INCOMPLETE | `design-system/` WDS; RC4 unified DS unmerged |
| Mobile app shell | PARTIAL | Responsive web; kiosk scripts exist; not a store app |
| Offline support | PARTIAL | Per-product; Sheds/Dashboard honesty paths |
| Photo storage | PARTIAL | Photo Library IDB + importer disk paths; Drive via rclone/scripts |
| Importer integration | PARTIAL | Studio scripts + separate `waypoint-importer` repo; handoff incomplete |
| Google Drive | PARTIAL | rclone / Node importer paths in docs — not a Studio web feature |
| Deployment | COMPLETE (for static site) | Pages workflow + build-info injection |
| Testing infrastructure | FUNCTIONAL BUT INCOMPLETE | Many `.mjs` suites; some dependency gaps (`ws`); no root package.json |
| Build/version stamping | COMPLETE | `waypoint-build` meta + `data/build-info.json` |

**Coherence verdict:** Shared chrome and design tokens — **mostly separate product implementations** underneath (separate stores, registries, engines).

---

## 12. Git branch inventory

### Local branches (Meerkat)
| Branch | Tip | Notes |
| --- | --- | --- |
| `main` | `63fc457` | **Stale** — 36 behind `origin/main` |
| `audit/waypoint-studio-complete-status-2026-08-03` | `59c09de`+ | This audit |
| `feature/scenes-photo-coach-2-architecture` | `89129f4` | **Dirty WIP** Photo Coach 2.0 (unpushed branch name) |
| `feature/scenes-sprint3-scene-library` | `89129f4` | Tracks origin |
| `feature/scenes-sprint1-four-pillar-foundation` | `e8258e1` | Tracks origin |
| `feature/scenes-sprint4-scene-native-photo-coach` | `89129f4` | Local-only tip alias; stash exists |
| `feature/rc4-platform-sprint1-unified-experience` | `0b019db` | 36 behind main |
| `feature/production-route-consolidation` | `c4ece63` | 2 ahead of main |
| `fix/waypoint-coach-blurry-preview` | `64ac12a` | 36 behind |
| `backup/pre-rc3-consolidation` | `f68c5b2` | Backup |
| `recovery/rc3-consolidation` | `af7da25` | Historical |

### Important remote feature branches (vs `origin/main`)

Legend for **Action:** Preserve / Integrate / Archive / Investigate.

| Branch | Tip | Ahead | Behind | Merge-base | Product | Action |
| --- | --- | ---: | ---: | --- | --- | --- |
| `feature/dashboard-functional-tile-catalog` | `c975958` | 6 | 0 | `59c09de` | Dashboard 32-tile catalog | **Integrate** |
| `turnaround/sprint-01-reconciliation` | `89c1ce0` | 1 | 0 | `59c09de` | Ops reconciliation docs | Preserve |
| `turnaround/sprint-02-public-surface-cleanup` | `60ad770` | 9 | 0 | `59c09de` | Public surface cleanup | Investigate → Integrate |
| `turnaround/sprint-03-security-hardening` | `3901080` | 2 | 0 | `59c09de` | Security headers/meta | Investigate → Integrate |
| `turnaround/sprint-04-canonical-dashboard-loader` | `6db767a` | 3 | 0 | `59c09de` | Dashboard loader | Investigate → Integrate |
| `turnaround/sprint-05-scenes-surface-cleanup` | `38c757a` | 369* | 0 | `59c09de` | Scenes honesty cleanup | Investigate (*mostly `[skip ci]` publish spam; ~4 real commits) |
| `feature/production-route-consolidation` | `c4ece63` | 2 | 0 | `59c09de` | Routes | Investigate |
| `feature/scenes-sprint1-four-pillar-foundation` | `e8258e1` | 3 | 36 | `63fc457` | Scenes pillars | Preserve; rebase before integrate |
| `feature/scenes-sprint3-scene-library` | `89129f4` | 5 | 36 | `63fc457` | Scene Library | Preserve; rebase |
| `fix/waypoint-coach-blurry-preview` | `64ac12a` | 6 | 36 | `63fc457` | Coach UX fix | Preserve; rebase |
| `feature/rc4-platform-sprint1-unified-experience` | `0b019db` | 8 | 36 | `63fc457` | Design system | Preserve |
| `feature/scenes-portfolio-foundation` | `0a298e6` | 8 | 4 | `0be5f9f` | Portfolio | Preserve |
| `feature/scenes-portfolio-assistant` | `714d7ce` | 11 | 4 | `0be5f9f` | Portfolio | Preserve |
| `feature/scenes-portfolio-coach` | `86ca1bf` | 35 | 4 | `0be5f9f` | Portfolio | Preserve |
| `feature/scenes-auto-portfolio-builder` | `8629ef1` | 45 | 4 | `0be5f9f` | Portfolio | Preserve |
| `feature/scenes-portfolio-health` | `6a38dbb` | 48 | 4 | `0be5f9f` | Portfolio | Preserve |
| `feature/scenes-portfolio-website-output` | `c672f8d` | 61 | 4 | `0be5f9f` | Portfolio | Preserve (tip of chain) |
| `feature/dashboard-rc3-sprint6-functional-catalog` | `7311a0c` | 69 | 4 | `0be5f9f` | Older catalog path | Investigate vs `functional-tile-catalog` |
| Dashboard RC3 sprint1–5 | various | — | — | — | Historical | Archive after diff check |
| `integration/*`, `backup/*`, `recovery/*`, `release/dashboard-rc3`, `polish/*` | various | 0 ahead or behind | — | Historical | Archive/keep as backups |
| `audit/waypoint-studio-complete-production-review-2026-07` | `80c9d11` | 34 | 0 | — | Prior audit + publish noise | Preserve docs |

\*Turnaround sprint-05 tip is flooded with automated `Publish live engine artifacts` commits; evaluate merge from non-publish commits only.

### Stashes / tags
- Stashes: keep until contents triaged.
- Tags: historical release markers; not equal to current production SHA.

---

## 13. Unmerged work inventory

**Must-not-lose unmerged work (priority order):**
1. **Photo Coach 2.0 local WIP** (staged, **not on origin**) on `feature/scenes-photo-coach-2-architecture`
2. `feature/dashboard-functional-tile-catalog` (`c975958`) — 32-tile catalog + 177 tests claimed in owner review
3. Scenes portfolio chain tip `feature/scenes-portfolio-website-output` (`c672f8d`) and ancestors
4. `feature/scenes-sprint3-scene-library` / sprint1 four-pillar (`89129f4` / `e8258e1`)
5. Turnaround sprints 02–05 (security, loader, Scenes honesty) based on `59c09de`
6. `fix/waypoint-coach-blurry-preview`
7. `feature/rc4-platform-sprint1-unified-experience`
8. Stashes `wip-audit-doc-rc4`, `wip-sprint4-scene-native`

**Already on main/production:** Dashboard tile layout repair, RC2.5 Sprint 6 polish lineage, Sheds foundation, Photo Coach v1 craft loop.

---

## 14. Documentation contradictions

| Document / claim | Reality | Class |
| --- | --- | --- |
| Root `README.md` still describes regional Pike County dashboard / ForageCast as primary mental model | Production Home is Studio hero → Dashboard Rebuild | **Outdated** |
| Owner reviews “implemented, pending merge” (tile catalog, Scenes sprints, portfolio) | Correct that code exists on branches; easy to misread as shipped | **Current for branch; contradictory if read as production** |
| `docs/audits/waypoint-studio-complete-production-audit-2026-07.md` (on audit branch) | Still largely accurate for SHA `59c09de`; production unchanged since | **Current reference** |
| Local `main` @ `63fc457` vs docs citing production `59c09de` | Local main stale | **Operator hazard** |
| Scenes sprint1 owner review: `/apps/scenes/` redirects to `waypoint-scenes` | **Not true on production/main** — both live | **Contradictory vs deploy** |
| foundation.json Sheds `status: flagship` vs preview.json `foundation` | Mixed self-description | **Contradictory** |
| Multiple RC3 / recovery / dashboard-v2 docs under `docs/` and `docs/archive/` | Many abandoned eras still in tree | **Duplicated / abandoned** |
| `test-dashboard-today-outside.mjs` expectations | Drift vs Rebuild naming | **Tests contradict product chrome** |

---

## 15. Test and build health

Ran on audit worktree @ `59c09de` (see `2026-08-03-test-results.txt`).

### PASS
| Suite | Result |
| --- | --- |
| `test-dashboard-tile-layout-repair.mjs` | 48 passed |
| `test-dashboard-mobile-tile-editing.mjs` | 39 passed |
| `test-dashboard-rebuild-phase1.mjs` | 88 passed |
| `test-dashboard-rebuild-phase2.mjs` | 96 passed |
| `test-dashboard-rebuild-phase3.mjs` | 94 passed |
| `test-dashboard-reliability.mjs` | 41 passed |
| `test-kiosk-modules.mjs` | PASS |
| `test-platform-foundation.mjs` | PASS |
| `test-platform-hardening.mjs` | PASS |
| `test-platform-reliability.mjs` | PASS |
| `test-sheds-biological-model.mjs` | 33 passed |
| `test-sheds-planner.mjs` | 38 passed |
| `test-sheds-field-ux.mjs` | 30 passed |
| `test-sheds-sprint6.mjs` | PASS |
| `test-sheds-integration-v1.1.mjs` | 30 passed |
| `test-photo-coach-shoot-review.mjs` | 41 passed |
| `test-photographer-profile.mjs` | PASS |
| `test-personalized-coaching.mjs` | PASS |
| `test-photo-library.mjs` | 26 passed |
| `test-hidden-landscapes.mjs` | 134 passed |
| `validate-surface-consistency.mjs` | PASS |
| `generate-build-info.mjs` | PASS (stamps local) |

### FAIL / broken (not repaired)
| Suite | Result | Likely cause |
| --- | --- | --- |
| `test-dashboard-today-outside.mjs` | 4 failures | Assertion drift vs Rebuild |
| `test-platform-consistency.mjs` | 1 failure | error timeout kind |
| `test-platform-integration.mjs` | 2 failures | home settings/search link expectations |
| `test-platform-experience-rc2.mjs` | 9 failures | RC2 experience expectations vs current Home |
| `test-sheds-map.mjs` | 1 failure | skip-link id |
| `test-kiosk-location-boot.mjs` | **broken** | missing `node_modules/ws` |
| `check-morning-briefing.mjs` | **broken** | missing package `ws` |

### Missing on main
- `test-dashboard-functional-tile-catalog.mjs` — exists only on catalog feature branch (owner review claims 177 passed there).

### Coverage gaps
- No meaningful automated browser E2E in this run for production.
- Create/Remember pillars largely untested on main (absent).
- Importer GUI not covered by Studio suites.
- Auth N/A.

---

## 16. Major risks

1. **Unpushed Photo Coach 2.0 WIP** can be lost if machine/worktree cleaned.
2. **Stale local `main`** causes wrong operator decisions.
3. **Scenes branch divergence** (36 behind) makes integration painful; portfolio stack separate again.
4. **Publish-commit noise** on turnaround/sprint-05 (369 ahead) obscures real changes.
5. **Thin Dashboard catalog** vs marketing “customizable outdoor workspace”.
6. **Dead dashboard module tax** in `wds.js` loader (perf/maintainability).
7. **Dual Scenes doors** confuse users (`/apps/scenes/` vs `/apps/waypoint-scenes/`).
8. **Test suite rot** (today-outside, platform-experience) reduces signal.
9. **Missing `ws` dependency** breaks some automation on clean trees.
10. **Docs overclaim** relative to production SHA.

---

## 17. Recommended preservation actions

1. **Immediately commit + push** Photo Coach 2.0 WIP to `origin/feature/scenes-photo-coach-2-architecture` (separate from this audit).
2. Snapshot/tag portfolio chain tip `c672f8d` and Scenes sprint3 `89129f4`.
3. Keep `feature/dashboard-functional-tile-catalog` as next Dashboard integrate candidate.
4. Do not delete turnaround branches until non-publish commits are cherry-picked or merged.
5. Fast-forward local `main` to `origin/main` on Meerkat (operator action; not done by this audit).
6. Export stash contents to branches before `stash drop`.

---

## 18. Recommended integration order

1. Fast-forward operator local `main` → `origin/main` (`59c09de`).
2. Merge-gate **`feature/dashboard-functional-tile-catalog`** → main → deploy.
3. Integrate turnaround **security (03)** + **public surface (02)** + **dashboard loader (04)** as small PRs.
4. Rebase Scenes sprint1→sprint3 onto new main; reconcile with turnaround sprint5 honesty rules; single Scenes entry.
5. Rebase portfolio chain OR restart portfolio on reconciled Scenes base.
6. Land Photo Coach 2.0 after Learn entry is singular.
7. Only then expand Sheds (regs/species) or RC4 design-system unification.

---

## 19. Recommended next five sprints

1. **Dashboard Catalog Ship** — merge-gate + deploy 32-tile functional catalog; fix today-outside test drift.  
2. **Platform Hygiene** — turnaround security/surface/loader; trim dead dashboard modules; restore `ws` or drop broken scripts.  
3. **Scenes Single Door** — rebase sprint1/3 + sprint5 honesty; one canonical Scenes entry; demote legacy clearly.  
4. **Learn Depth** — push/land Photo Coach 2.0 architecture + blurry-preview fix; Scene Library read path for importer.  
5. **Portfolio Workflow Foundation** — integrate portfolio Keep/Maybe/Reject queue without claiming AI; defer Sheds expansion.

---

## 20. Features or branches that must not be lost

| Item | Why |
| --- | --- |
| Local Photo Coach 2.0 staged files | Only copy of new architecture; **unpushed** |
| `feature/dashboard-functional-tile-catalog` | 32-tile implementation + tests |
| `feature/scenes-portfolio-website-output` (+ ancestors) | Portfolio suite investment |
| `feature/scenes-sprint3-scene-library` | Scene Library + Shoot Review workspace |
| `feature/scenes-sprint1-four-pillar-foundation` | Four-pillar IA + Coach SoT cleanup |
| `turnaround/sprint-03-security-hardening` | Security headers within Pages limits |
| `turnaround/sprint-05-scenes-surface-cleanup` | Production honesty for Scenes (real commits) |
| `fix/waypoint-coach-blurry-preview` | UX fix for Coach previews |
| `feature/rc4-platform-sprint1-unified-experience` | Design-system unification start |
| Stashes `stash@{0}`, `stash@{1}` | Unknown unique WIP |

---

## Master status table

| Product | Pillar/Area | Feature | Status | Location/Branch | Integrated into Main | Deployed | Tests | Confidence | Evidence | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Platform | Deploy | GitHub Pages + build-info | COMPLETE | `main` / production | Yes | Yes | generate-build-info PASS | High | build-info.json `59c09de` | Maintain |
| Platform | Auth | User accounts | MISSING | — | No | No | — | High | no auth modules | Defer |
| Platform | Nav | WDS global/local shell | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | platform suites mixed | High | `wds-app-shell.js` | Hygiene sprint |
| Platform | Storage | localStorage/IDB | PARTIAL | per-app | Yes | Yes | hardening PASS | High | photo-library/sheds stores | Keep local-first |
| Platform | Design system | WDS | FUNCTIONAL BUT INCOMPLETE | main; RC4 branch | Partial | Partial | — | High | `design-system/` | Preserve RC4 |
| Platform | Importer | SD → library/Drive | PARTIAL | scripts + external repo | Partial | N/A web | validate scripts exist | Medium | IMPORTER-AUDIT.md | Parallel track |
| Dashboard | Shell | Rebuild workspace | FUNCTIONAL BUT INCOMPLETE | main `59c09de` | Yes | Yes | phase1–3 PASS | High | rebuild/* | Continue |
| Dashboard | Mobile | Tile editing/layout | COMPLETE | main | Yes | Yes | 39+48 PASS | High | repair merges | Maintain |
| Dashboard | Today Outside | Observational summary | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | suite FAIL (drift) | Medium | today.js + failing tests | Fix tests |
| Dashboard | Catalog | 5 production tiles | FUNCTIONAL BUT INCOMPLETE | main registry | Yes | Yes | phase2 PASS | High | registry CATALOG length 5 | Expand via branch |
| Dashboard | Tile | `ph-conditions` | COMPLETE* | main | Yes | Yes | covered | High | registry+data | Keep (*when provider ok) |
| Dashboard | Tile | `ph-air` | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | covered | High | often unavailable | Improve providers |
| Dashboard | Tile | `ph-alerts` | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | covered | High | live:false | Improve |
| Dashboard | Tile | `ph-astronomy` | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | covered | High | weak moonrise | Improve ephemeris |
| Dashboard | Tile | `ph-light` | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | covered | High | NWS fallback gaps | Prefer OM daylight |
| Dashboard | Catalog | 32-tile expansion | PARTIAL | `feature/dashboard-functional-tile-catalog` | **No** | **No** | claimed 177 on branch | High | owner review + tip `c975958` | **Integrate next** |
| Dashboard | Kiosk | Display mode | PARTIAL | main + kiosk.html | Yes | Yes | modules PASS; boot broken deps | Medium | rebuild-kiosk.js | Optional |
| Dashboard | Discovery | RC3 discovery sprint | PARTIAL | old feature branches | No | No | — | Medium | remote sprint4 tip | Archive/investigate |
| Scenes | Overall | Craft constellation | PARTIAL | main | Yes | Yes | coach/library/HL PASS | High | apps/scenes hub | Reconcile doors |
| Scenes | Learn | Photo Coach | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | 41 PASS | High | /apps/photo-coach/ | Deepen |
| Scenes | Learn | Photo Coach 2.0 | PROTOTYPE | local WIP branch | No | No | local test file unpushed | High | git status staged files | **Push immediately** |
| Scenes | Learn | Portfolio suite | PARTIAL | portfolio feature branches | No | No | branch-local | Medium | tips 0a298e6…c672f8d | Preserve |
| Scenes | Learn | Scene Library | PARTIAL | sprint3 branch | No | No | — | High | `89129f4` | Rebase/integrate |
| Scenes | Create | Living Scenes | PROTOTYPE | main preview | Preview only | Preview | — | High | living-scenes copy | Honesty OK |
| Scenes | Create | Parallax/effects | PROTOTYPE | waypoint-scenes JS | Legacy | Legacy | — | Medium | parallax.js | Don't market |
| Scenes | Remember | Outdoor Journals | MISSING | sprint1 remember/ only | No | No | — | High | no prod route | Build later |
| Scenes | Explore | Hidden Landscapes | FUNCTIONAL BUT INCOMPLETE | main | Yes | Yes | 134 PASS | High | /apps/hidden-landscapes/ | Keep experimental |
| Scenes | Explore | Animal Vision | PROTOTYPE | apps/animal-vision | Yes (incubator) | Yes | animal-vision suite exists | Medium | HTTP 200 | Incubator |
| Sheds | Map | Field map | PARTIAL | main | Yes | Yes | mostly PASS | High | sheds-map-app.js | Stabilize |
| Sheds | Model | Deer likelihood | PARTIAL | main | Yes | Yes | 33 PASS | High | biological-model.js | Real calc |
| Sheds | Search | Today’s Search planner | PARTIAL | main | Yes | Yes | 38 PASS | High | search-planner.js | Continue |
| Sheds | GPS | Geolocation | PARTIAL | main | Yes | Yes | map tests | Medium | needs permission | Honest offline |
| Sheds | Weather | Overlays | PARTIAL | main | Yes | Yes | model tests | Medium | weatherModifiers | Optional |
| Sheds | Regs | Regulations | PLANNED ONLY | foundation.json | No | No | — | High | status planned | Later |
| Sheds | Obs | Saved observations | FUNCTIONAL BUT INCOMPLETE | localStorage | Yes | Yes | map CRUD tests | High | observation-store | Keep private |

---

## Audit metadata

| Field | Value |
| --- | --- |
| Starting SHA | `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` |
| Ending SHA | (tip of this audit branch) |
| Application code modified | **No** |
| Branches merged | **No** |
| Deploy performed | **No** |
| Files deleted | **No** |
