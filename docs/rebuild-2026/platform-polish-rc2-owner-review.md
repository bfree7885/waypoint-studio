# Sprint 6 Polish — Merge Gate Owner Review

**Date:** 2026-07-24  
**Canonical path:** `docs/rebuild-2026/platform-polish-rc2-owner-review.md`  
**Scope:** Dashboard RC2.5 Sprint 6 experience polish merge gate (not a feature sprint; not Platform public-chrome RC2)  
**Status:** Reconciled onto `origin/main` (`a349e68`) for owner merge decision. **Not deployed. Not merged to main.**  
**Supporting doc (superseded for merge decision):** `docs/dashboard-rc25-sprint6/OWNER-REVIEW.md`

---

## 1. Executive summary

Sprint 6 is a **dashboard experience quality pass** on Rebuild Home: quieter density, family grouping (Environmental · Astronomy · Photography), shared card chrome, skeleton loading, and human empty/offline copy. Architecture from Phases 1–3 and the mobile tile-editing repair is preserved (Today Outside, Workspace, Customize draft Save/Cancel, prefs key, kiosk).

**Reconciliation:** Cherry-picked original polish commit `4478365` onto `origin/main` (`a349e68`) as `794e7f2` on `integration/dashboard-rc25-sprint6`. Mobile repair (`26b3f32`) is already on main and therefore on the integration branch. Unrelated dirty-tree privacy/RC2 HTML was stashed and excluded.

**Verification:** Phase 1/2/3 + mobile tile-editing contracts green; CDP capture hydrated on desktop + phone; no horizontal overflow at 320 / 375 / 430 / 768 (390 covered by phone workspace/customize shots). Pre-existing `home-rc1` support.html failure and stale `today-outside` Outdoor OS asserts fail on main identically — not introduced by Sprint 6.

**Recommendation:** **APPROVE WITH DOCUMENTED FOLLOW-UPS**

---

## 2. Branch and commit state

| Ref | SHA | Notes |
|-----|-----|-------|
| `origin/main` | `a349e68068fd4ed3f0d3644ed53a36207c993a53` | Includes mobile tile editing (`26b3f32`) + tip docs |
| Original Sprint 6 polish | `447836524aefa77c3c2e88c5161d212ad17dd3d1` | Experience quality pass on `polish/dashboard-rc25-sprint6` |
| Original Sprint 6 branch tip | `8ba9fac832f1ed393a79b398b9154a040c12e59e` | Polish + tip-SHA docs + prior Platform RC2 walkthrough docs commit |
| `backup/dashboard-rc25-sprint6-pre-reconcile` | `8ba9fac832f1ed393a79b398b9154a040c12e59e` | Safety copy of polish tip before reconcile |
| `integration/dashboard-rc25-sprint6` (pre-review) | `794e7f210ad5df81111d597f40eac00aae913f45` | Cherry-pick of `4478365` onto `a349e68` |
| This merge-gate review commit | *(filled after commit — see tip of integration branch)* | Rewrites this file as the merge-gate package |
| Production live | `a349e68` | Confirmed via `https://waypointstudio.org/data/build-info.json` |

**Phase 1 dirty tree (preserved, not in integration):** Unrelated modified HTML/JS/JSON (privacy/nav/RC2-ish) + untracked phase2/phase3 docs were stashed as `stash@{0}` (`wip: unrelated privacy/RC2/phase docs before sprint6 merge-gate reconcile …`) before branch work. Do not drop that stash without restoring onto a non-integration branch.

**Divergence at reconcile start:** `origin/main...polish/dashboard-rc25-sprint6` = `0 ahead / 6 behind` from main’s perspective (polish = main + 6 commits). Merge-base was already `a349e68`.

---

## 3. Reconciliation details

**Method:** Cherry-pick (preferred over rebase) of the single product polish commit onto a fresh integration branch from `origin/main`.

1. Stashed unrelated dirty/untracked work (non-destructive).
2. Created `backup/dashboard-rc25-sprint6-pre-reconcile` at polish tip `8ba9fac`.
3. Created `integration/dashboard-rc25-sprint6` from `origin/main` (`a349e68`).
4. Cherry-picked `4478365` → landed as `794e7f2` (clean).
5. **Excluded** tip-SHA noise docs (`efe2e0a`…`9521efa`) and Platform RC2 walkthrough commit `8ba9fac` (wrong scope for this merge gate; content replaced here).

**Contains:** `a349e68` (main) + mobile repair ancestry (`26b3f32`) + Sprint 6 polish only.  
**Does not contain:** Unrelated privacy/RC2 HTML experiments; duplicate mobile-repair commits; Platform public-route walkthrough as the merge decision.

---

## 4. User-visible changes only

Completed and observable on Rebuild Home (`/` and `/apps/dashboard/`):

1. **Quieter workspace density** — Slightly tighter shell/widget min-heights; less empty row waste.
2. **Family grouping** — Quiet section labels for Environmental · Astronomy · Photography when consecutive widgets share a family.
3. **Card chrome** — Shared radius/padding/elevation tokens; softer category glow; title-row icons; denser fact rows.
4. **Default calm sizes** — Air / Alerts default to `md` for a calmer 3-up rhythm (Restore defaults applies new order/sizes).
5. **Skeleton loading** — Shimmer placeholders + SR-only “Settling…”; hydrate fade; `prefers-reduced-motion` disables motion.
6. **Empty / offline copy** — Titled empty workspace; human offline/unavailable chip copy (no raw error strings).
7. **Cache-bust** — Asset query `dash-rc25-s6` on root + apps dashboard shells.

No new widgets, no Photography Library, no IA/nav redesign, no mobile tile-editing rework.

---

## 5. Files changed by purpose

| Path | Purpose |
|------|---------|
| `design-system/css/wds-dashboard-rebuild.css` | Density, groups, skeletons, softer glow, motion, deepeners alignment |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | Family headers, skeleton frames, empty titles, icons |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Families, default order/sizes, human empty/offline render |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | Clearer Light waiting/unavailable copy |
| `index.html`, `apps/dashboard/index.html` | Cache-bust `dash-rc25-s6` |
| `automation/test-dashboard-rebuild-phase3.mjs` | Empty/skeleton/family asserts; accept new cache-bust |
| `automation/capture-dashboard-rc25-sprint6.mjs` | Screenshot / overflow harness |
| `docs/dashboard-rc25-sprint6/*` | Supporting captures + sprint notes |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |
| `docs/rebuild-2026/platform-polish-rc2-owner-review.md` | **This merge-gate review** (replaces prior Platform RC2 walkthrough content at the same path) |

---

## 6. Mobile verification (all viewports)

CDP capture `2026-07-24T03:04:20Z` against local `http://127.0.0.1:8765` (integration tree). Evidence: `docs/dashboard-rc25-sprint6/`.

| Viewport | Evidence | Result |
|----------|----------|--------|
| 320 | `06-phone-320-workspace.png` + meta | Hydrated; **overflow false** |
| 375 | `07-phone-375-workspace.png` + meta | Hydrated; **overflow false** |
| 390 | `04-phone-workspace.png`, `05-phone-customize.png` | Hydrated (4 facts); Customize seeded |
| 430 | `08-phone-430-workspace.png` + meta | Hydrated; **overflow false** |
| 768 | `09-tablet-768-workspace.png` + meta | Hydrated; **overflow false** |
| Desktop | See §7 | — |

Customize on phone: enable/disable/reorder/save contract covered by `test-dashboard-mobile-tile-editing.mjs` (39 passed) — not re-implemented in this sprint. Capture shows customize view paint with columns=1.

---

## 7. Desktop verification

| Surface | Evidence | Result |
|---------|----------|--------|
| Workspace | `01-desktop-workspace.png` | Hydrated; Today Outside + widgets; place Pike County, PA |
| Customize | `02-desktop-customize.png` | Library + favorites/columns seed paints |
| Kiosk | `03-desktop-kiosk.png` | Kiosk view paints; no user-facing “Kiosk” chrome regression in contracts |

Desktop editing (add/remove/reorder/save) remains on the mobile-tile-editing draft session APIs already on main; Sprint 6 does not alter prefs commit semantics.

---

## 8. Accessibility

Observed / contract-covered (not a full WCAG audit):

- Skeleton pending state exposes SR-only “Settling…”
- Family labels use presentation grouping (`role="presentation"` pattern from prior review; group markup present in DOM)
- Focus rings / trust chips retained from Phase 2/3 + mobile repair
- `prefers-reduced-motion` disables skeleton shine / enter motion
- Touch targets ≥44px from mobile tile editing retained (CSS not regressed in Sprint 6 scope)

---

## 9. Performance (observed only)

- Reserved pending heights + skeleton lines remain CLS-oriented; no new network fan-out observed in capture.
- Hydrate completed with `pending: 0` on desktop and phone in capture-meta.
- No formal Lighthouse/RUM run in this gate — **not claimed**.

---

## 10. Test / build commands + totals

Static site — **no npm build / typecheck pipeline** at repo root (N/A). Syntax check on touched JS: OK.

```bash
node automation/test-dashboard-rebuild-phase1.mjs          # 88 passed, 0 failed
node automation/test-dashboard-rebuild-phase2.mjs          # 94 passed, 0 failed
node automation/test-dashboard-rebuild-phase3.mjs          # 103 passed, 0 failed
node automation/test-dashboard-mobile-tile-editing.mjs     # 39 passed
node automation/test-home-rc1.mjs                          # 1 failure (pre-existing on origin/main)
node automation/test-dashboard-today-outside.mjs           # 4 failures (pre-existing on origin/main)
node --check design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js
node --check design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js
node --check design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js
node --check automation/capture-dashboard-rc25-sprint6.mjs
node automation/capture-dashboard-rc25-sprint6.mjs http://127.0.0.1:8765  # EXIT 0
```

**Sprint-relevant totals:** 88 + 94 + 103 + 39 = **324 passed** on rebuild/MTE suites.  
**Baseline-on-main failures (not Sprint 6 regressions):** `home-rc1` support experiences assert; `today-outside` Outdoor OS CSS/title/nav/home-boot asserts (Rebuild replaced Outdoor OS product surface).

---

## 11. Regression review

| Area | Status |
|------|--------|
| Mobile tile editing (entry, draft Save/Cancel, reorder) | **Pass** — 39/39; CSS/JS not reworked in Sprint 6 |
| Today Outside compact panel | **Pass** — present in desktop/phone captures + hydrate meta |
| Widgets hydrate / facts | **Pass** — desktop 4 facts, phone 4 facts in latest capture |
| Kiosk | **Pass** — capture + phase3 kiosk constraints |
| Saved layouts (`waypoint-dashboard-rebuild-prefs-v1`) | **Pass** — prefs key unchanged; draft APIs unchanged |
| Nav / quiet chrome | **Pass** — home-rc1 nav labels pass; Customize entry retained |
| Loading / error honesty | **Pass** — skeleton + human offline/unavailable copy; no fabricated readings |
| Horizontal overflow | **Pass** — false at 320/375/430/768 |

---

## 12. Remaining risks

1. **Existing local prefs** keep prior `order` / `sizes` until user hits Restore defaults — family labels still appear for consecutive same-family widgets.
2. **Pre-existing `support.html` home-rc1 failure** on main (copy still mentions patterns the assert rejects) — unrelated dirty-tree privacy work may address this later; not in this integration commit.
3. **`test-dashboard-today-outside.mjs` is stale** vs Rebuild-at-root architecture (fails identically on `origin/main`).
4. Phone CDP can occasionally race OIP hydrate (mitigated in this run: phone facts=4).

---

## 13. Deployment status

| Item | Status |
|------|--------|
| Mobile tile editing on production | **Yes** — live `build-info` / `waypoint-build` = **`a349e68`** (includes `26b3f32`) |
| Sprint 6 polish on production | **No — not deployed** |
| Sprint 6 merged to `main` | **No — do not merge in this block** |
| Integration branch purpose | Owner merge-gate review only |

Do **not** confuse production `a349e68` (mobile repair tip) with Sprint 6 polish (`4478365` / integration `794e7f2`+).

---

## 14. Owner recommendation

**APPROVE WITH DOCUMENTED FOLLOW-UPS**

Safe to merge `integration/dashboard-rc25-sprint6` when ready (owner action — not performed here), after acknowledging:

1. Fix or waive pre-existing `home-rc1` support.html architecture assert (main baseline).
2. Retire or rewrite `test-dashboard-today-outside.mjs` for Rebuild Home (main baseline).
3. Optional: call out Restore defaults in release notes for family order/sizes.

**Do not deploy until after an explicit merge + Pages publish decision.**
