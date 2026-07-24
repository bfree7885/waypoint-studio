# Dashboard RC3 — Release Candidate — Owner Review

**Status:** Awaiting owner gate — **not merged · not deployed**  
**Date:** 2026-07-24  
**Sprint:** Dashboard RC3 Sprint 6 — Production Readiness, Final QA & RC3 Release Candidate  
**Authority:** Product standards · Engineering playbook · Rebuild architecture · Sprints 1–5 owner reviews  
**Release candidate branch:** `release/dashboard-rc3`  
**Base tip:** Sprint 5 stack (`feature/dashboard-rc3-sprint5-personal-workspace`) — linear S1→S5 feature commits  
**Stabilization commit SHA:**  ()  
**Deployment status:** **Not deployed**

---

## Executive summary

RC3 stacks Outdoor Intelligence (S1–S2), Daily Brief (S3), Discovery (S4), and Personal Workspace (S5) into a single release candidate. Sprint 6 did **not** add features — it audited, stabilized, and QA’d for production quality: unified cache-busting, dead CSS/JS removal, interest catalog DRY via Prefs-first load order, accessibility repairs (pill contrast, Customize focus steal, honest filter roles, ≥44px targets), UX polish (Reset interests vs Reset layout, last-interest guard), and full rebuild regression + fixture screenshots.

**Recommendation:** **APPROVE FOR RC3 MERGE**

---

## RC3 accomplishments (Sprints 1–5 + Sprint 6)

| Sprint | Deliverable |
|--------|-------------|
| 1 | Outdoor Intelligence engine — score, activities, windows, Explain |
| 2 | Refinement — bands, icons, observational voice, confidence honesty |
| 3 | Daily Brief + Waypoint’s Take |
| 4 | Discovery Engine — cards, Educational Moment, This Week Outside |
| 5 | Personal Workspace — local interest profiles reorder emphasis only |
| 6 | Production readiness — audit, a11y, UX polish, regression, RC branch |

Product posture preserved: observational voice, no fabricated live numbers, alerts/public safety always first, Phase 2 visual lock, mobile tile editing + draft Save/Cancel intact.

---

## Files modified (Sprint 6 stabilization)

### Updated

| Path | Change |
|------|--------|
| `apps/dashboard/index.html` / `index.html` | Unified `?v=dash-rc3` cache-bust on all dashboard assets |
| `design-system/js/wds.js` | Load prefs → intelligence (single interest source) |
| `wds-dashboard-rebuild.js` | RC3 version; Customize focus only on enter + restore after actions |
| `wds-dashboard-rebuild-customize.js` | Filter `role="group"`; focus restore; Reset copy; last-On disabled; customize `h2` |
| `wds-dashboard-rebuild-prefs.js` | Guard disable when only one interest remains |
| `wds-dashboard-rebuild-intelligence.js` | Prefs-backed normalize; RC3 version |
| `wds-dashboard-rebuild-today.js` | Drop empty alerts host; RC3 version |
| `wds-dashboard-rebuild-data.js` | Drop unused `isLiveWidget` export; RC3 version |
| `wds-dashboard-rebuild-workspace.js` | Disable Move up/down at ends; RC3 version |
| `wds-dashboard-rebuild-{registry,kiosk,deepeners}.js` | RC3 version stamps |
| `wds-dashboard-rebuild.css` | Light ink level pills; dead CSS removed; baseline 2.75rem targets; explain focus; discovery border consistency; interest opacity fix |
| `automation/test-dashboard-rebuild-*.mjs` | Cache-bust / version / a11y / load-order contracts |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |

### New

| Path | Role |
|------|------|
| `automation/capture-dashboard-rc3-rc.mjs` | Fixture CDP capture |
| `docs/rebuild-2026/dashboard-rc3-rc/*` | RC screenshots + capture-meta |
| `docs/rebuild-2026/dashboard-rc3-release-candidate-owner-review.md` | This review |

---

## Performance

| Check | Result |
|-------|--------|
| `generate` ×40 fixture batch | **Under 500ms** (intelligence suite) |
| Progressive hydrate | Lazy widgets + IntersectionObserver retained; shell paints before settle |
| Customize repaint | Focus no longer steals on every action (less layout thrash / SR churn) |
| CLS / repaint | No new layout animations; `prefers-reduced-motion` honored for settle/transitions |
| Behavior | No intentional product behavior change beyond a11y/UX polish |

---

## Accessibility

| Finding | Fix |
|---------|-----|
| Dark level-pill text on dark panels | Light tinted ink + tinted backgrounds |
| Customize `focusEditor` on every paint | Focus bar only on first enter; restore focus to acted control |
| Incomplete `role="tablist"` without APG keys | Demoted to `role="group"` + `aria-pressed` |
| Touch targets &lt;44px on tablet/desktop | Baseline `.wdb-r-btn` / library tabs / Explain summary → `2.75rem` |
| Explain summary missing focus ring | `:focus-visible` accent ring |
| Off interests at 0.72 opacity (label contrast) | Dim actions only; labels stay full ink |
| Last interest silent snap to `general` | Disable Off when last; prefs no-ops disable |
| Customize chrome not in heading outline | `h2.wdb-r-customize-bar__label` |

Retained: skip link, sr-only Home `h1`, trust chips as text, reduced-motion, Save/Cancel draft, interests `aria-live` preview.

---

## Regression results

| Suite | Result |
|-------|--------|
| `test-dashboard-rebuild-intelligence.mjs` | **256 passed** |
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **101 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **103 passed** |
| `test-dashboard-mobile-tile-editing.mjs` | **45 passed** |
| `test-dashboard-reliability.mjs` | **41 passed** |
| `test-dashboard-v2.mjs` | **59 passed** |
| `test-dashboard-v3.mjs` | **50 passed** |
| `test-dashboard-os-routes.mjs` | **36 passed** |
| `test-dashboard-os-interpret.mjs` | **80 passed** |

### Known baseline failures (not introduced by RC3)

| Suite | Note |
|-------|------|
| `test-dashboard-today-outside.mjs` | Outdoor OS / Recovery asserts vs Rebuild-at-root — identical on main (RC2 follow-up) |
| `test-dashboard-os-copy.mjs` | 1 pre-existing observational copy assert (`night primary`) |
| `test-home-rc1.mjs` | `support.html` architecture assert — disclosed main baseline |

Manual / capture probes: Today Outside, Outdoor Score, Daily Brief, Discovery, Personal Workspace interests, widget Customize, mobile/desktop editing, prefs persistence, kiosk mode (no chrome), honest loading/waiting, responsive stack — **pass** on fixture hydrate.

---

## Screens verified

Fixture CDP (`http://127.0.0.1:8765`, Pike County platform seed) → `docs/rebuild-2026/dashboard-rc3-rc/`:

| File | View |
|------|------|
| `01-desktop-workspace.png` | Desktop Today Outside (photography-first) |
| `02-desktop-customize-interests.png` | Customize · My interests · Reset layout/interests |
| `03-desktop-discovery.png` | Brief + Discovery |
| `04-phone-workspace.png` | Phone Today Outside (astronomy-first) |
| `05-phone-customize-interests.png` | Phone Customize + Save/Cancel |
| `capture-meta.json` | Score/Brief/Discovery/10 activities/10 interest rows |

Compared to Sprint 5 captures: same composition and personalization behavior; RC3 adds clearer Reset copy, light level pills, and stable Customize focus.

---

## Remaining risks

1. **Live-network visual QA** still owner-side (fixture CDP does not prove provider latency / partial packages).
2. **Returning users with old prefs** may not see calmer default tile rhythm until Reset layout (RC2 follow-up).
3. **Today Outside density** on phone remains high (Brief + Discovery + 10 activities) — polish backlog, not a correctness defect.
4. **Dual “Waypoint’s Take”** (Brief h4 vs deepeners h2) — naming follow-up.
5. **Stale suites** (`today-outside`, `home-rc1` support) can hide real CI signal until retired/rewritten.

---

## Known follow-ups

- Full WCAG audit beyond contract tests (RC2 #7).
- Soft “Emphasizing …” cue under Today title when interests ≠ general.
- Shared `escapeHtml` / banned-phrase util (deferred — drift documented, not blocking).
- Retire or rewrite `test-dashboard-today-outside.mjs` and `home-rc1` support assert.
- Optional phone density: collapse Activity guide behind `<details>` on narrow viewports.

---

## Recommendation

**APPROVE FOR RC3 MERGE**

Evidence: linear S1–S5 stack on `release/dashboard-rc3`, Sprint 6 stabilization without feature scope creep, rebuild + mobile + reliability suites green, fixture screens confirm intelligence surfaces and Personal Workspace, HIGH a11y items repaired, deployment explicitly withheld pending owner gate.

**Do not deploy** until owner approves merge and a separate deploy decision.

---

## Release candidate git

| Field | Value |
|-------|--------|
| Branch | `release/dashboard-rc3` |
| Push | _(filled after push)_ |
| Deployment status | **Not deployed** |
