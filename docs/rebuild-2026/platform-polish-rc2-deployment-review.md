# Platform Polish RC2 / Dashboard Sprint 6 — Deployment Review

**Date:** 2026-07-24  
**Domain:** https://waypointstudio.org/  
**Authority:** `docs/rebuild-2026/platform-polish-rc2-owner-review.md`  
**Follow-ups:** `docs/rebuild-2026/platform-polish-rc2-follow-ups.md`  
**Recommendation honored:** APPROVE WITH DOCUMENTED FOLLOW-UPS  

---

## Final status

**MERGED AND DEPLOYED**

---

## SHA ledger

| Ref | SHA | Notes |
|-----|-----|-------|
| Previous production / `origin/main` before merge | `a349e68068fd4ed3f0d3644ed53a36207c993a53` (`a349e68`) | Mobile tile editing tip |
| Backup branch | `backup/main-pre-dashboard-rc25-sprint6` @ `a349e68068fd4ed3f0d3644ed53a36207c993a53` | Pushed to origin |
| Approved integration | `integration/dashboard-rc25-sprint6` @ `e6a76d99b60c3cbf0fb12e60a6740fb702800447` (`e6a76d9`) | Exact approved tip verified before merge |
| Merge commit | `3d28fb66ecb4a604271bee198edbf84ca73c3045` (`3d28fb6`) | `merge: dashboard RC2.5 Sprint 6 polish` |
| `origin/main` after push | `3d28fb66ecb4a604271bee198edbf84ca73c3045` | Matches merge commit |
| Live production (product gate) | `3d28fb66ecb4a604271bee198edbf84ca73c3045` | Via `data/build-info.json` + `meta[name=waypoint-build]` |

Docs follow-up commit (this report + follow-ups + prod captures) may advance the live tip after this product gate; product verification below was against **`3d28fb6`**.

---

## Phase summary

### Phase 1 — Validate approved commit

- `git fetch origin --prune` OK  
- `origin/main` = `a349e68` (unchanged from expected)  
- Integration local + remote = **`e6a76d99b60c3cbf0fb12e60a6740fb702800447`** (exact match — merge proceeded)  
- Working tree clean on integration at start; unrelated prior stash preserved (`stash` entries not dropped)  
- Owner review tracked on integration tip  
- Local `main` had diverged from `origin/main` (stale local tip `6062b41`); **local-only** `reset --hard origin/main` to `a349e68` before merge (no force-push)

### Phase 2 — Follow-ups doc

Created `docs/rebuild-2026/platform-polish-rc2-follow-ups.md` from owner review only (no invented items). None block this merge.

### Phase 3 — Pre-merge verification (on `e6a76d9`)

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **94 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **103 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **39 passed** |
| Sprint-relevant total | **324 passed** |
| `test-home-rc1.mjs` | **1 failure** — `support.html` architecture assert (disclosed main baseline) |
| `test-dashboard-today-outside.mjs` | **4 failures** — Outdoor OS asserts vs Rebuild-at-root (disclosed main baseline) |
| `node --check` on touched rebuild JS + capture harness | OK |
| Root format / lint / typecheck / npm build | **N/A** (static site; no root `package.json` pipeline) |
| CDP capture `capture-dashboard-rc25-sprint6.mjs` @ `127.0.0.1:8765` | **EXIT 0** — desktop+phone hydrate `pending:0`, facts=4; overflow **false** at 320/375/430/768 |

No critical regression beyond disclosed baselines → merge allowed.

### Phase 4 — Backup

- Branch `backup/main-pre-dashboard-rc25-sprint6` created from `origin/main`  
- Pushed to origin  
- Backup SHA = **`a349e68`**

### Phase 5 — Merge

- Checked out `main`, synced to `origin/main` (`a349e68`)  
- `git merge --no-ff integration/dashboard-rc25-sprint6`  
- Message: `merge: dashboard RC2.5 Sprint 6 polish`  
- Merge SHA: **`3d28fb6`**  
- Ancestry confirmed: mobile repair `26b3f32`, polish `794e7f2`, integration tip `e6a76d9`  
- Post-merge re-run: phase1/2/3 + mobile tile-editing all green again (324)

### Phase 6 — Build-info

- Pages workflow injects metadata via `scripts/inject-build-metadata.mjs` on deploy (`.github/workflows/pages.yml`)  
- **No local fabrication** of `data/build-info.json` before push  
- Live post-deploy `build-info` matched merge SHA (see Phase 7–8)

### Phase 7 — Push and deploy

| Step | Result |
|------|--------|
| `git push origin main` | `a349e68..3d28fb6` |
| Pages workflow | [30063808027](https://github.com/bfree7885/waypoint-studio/actions/runs/30063808027) — **completed / success** |
| Live `data/build-info.json` | `commit=3d28fb66…`, `shortCommit=3d28fb6`, `source=github-pages`, `workflowRunId=30063808027`, `builtAt=2026-07-24T03:16:41.615Z` |
| `verify-production-deploy.mjs` | **OK** — fingerprint match, 0 failed critical routes |

Green workflow alone was not treated as sufficient; live build-info + HTML meta were checked.

### Phase 8 — Production verification

**URL:** https://waypointstudio.org/ (cache-busted probes)

| Check | Result |
|-------|--------|
| Live build-info = `3d28fb6` | **Pass** |
| `meta[name=waypoint-build]=3d28fb6` | **Pass** |
| Cache-bust `dash-rc25-s6` on root assets | **Pass** |
| `verify-dashboard-production.mjs` ordinary probes | **Pass** — 15/15 agree on Rebuild `3d28fb6`, 0 failures, no multi-version |
| Desktop workspace CDP | Today Outside present; family groups=3; widgets=5; Conditions live facts; honest Air/Light unavailable; Alerts waiting; overflow false |
| Desktop Customize | Save + Cancel present; library/columns chrome present |
| Phone Customize | Save + Cancel fixed bar; move controls present; overflow false |
| Overflow 320 / 375 / 390 / 430 / 768 | **false** |
| Console critical / raw API errors in CDP filter | **none** |
| Kiosk probe | Widgets present; no user-facing “Kiosk” chrome label in probe |

**Evidence directory:** `docs/rebuild-2026/platform-polish-rc2-prod/`  
(`01`–`09` PNGs + `capture-meta.json`, captured against live production at `2026-07-24T03:19:35Z`)

Behavior notes (honest, not regressions of this deploy):

- Air / Light may show human **Unavailable** for some places (e.g. Westerlo, NY in CDP) — trust chips retained; no fabricated readings.  
- Desktop fact-count selector in ad-hoc CDP returned 0 while widgets/groups painted correctly (visual confirm: Conditions facts visible). Phone/tablet fact counts 4–7.

---

## What shipped (user-visible)

1. Quieter workspace density  
2. Family grouping (Environmental · Astronomy · Photography)  
3. Shared card chrome / softer glow / title icons  
4. Default calm sizes for Air / Alerts (`md`) on Restore defaults / new prefs  
5. Skeleton loading + SR “Settling…” + reduced-motion respect  
6. Human empty/offline copy  
7. Cache-bust `dash-rc25-s6`  

Preserved: mobile tile editing (`26b3f32`), Today Outside, draft Save/Cancel, prefs key, kiosk constraints.

---

## Remaining risks / follow-ups

See `docs/rebuild-2026/platform-polish-rc2-follow-ups.md`. None block this deploy.

Highest engineering hygiene items still open on main baseline:

1. Fix or waive `home-rc1` `support.html` assert  
2. Retire/rewrite stale `test-dashboard-today-outside.mjs`  
3. Existing local prefs keep prior order/sizes until Restore defaults  

---

## Build / deploy mechanics

| Item | Value |
|------|--------|
| Build pipeline | Static site; Pages Action validates assets/links and injects build metadata |
| Local npm build | N/A |
| Deploy mechanism | GitHub Pages (`pages.yml`) on push to `main` |
| Rollback | Reset/re-deploy from `backup/main-pre-dashboard-rc25-sprint6` @ `a349e68` (owner action) |

---

## Stash / dirty-tree note

- Pre-merge capture refresh stashed as `wip: sprint6 capture refresh before merge …` (not discarded)  
- Older unrelated privacy/RC2 stash from reconcile remains (`wip: unrelated privacy/RC2/phase docs…`) — do not drop without restore onto a non-main branch  

---

## Final status (exact)

**MERGED AND DEPLOYED**
