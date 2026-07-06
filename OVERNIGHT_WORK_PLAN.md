# Overnight Work Plan — Phase 1 Stability

**Session:** July 2026  
**Branch:** `main` (clean at session start)  
**Completed before tonight:** navigation fix, educational fallbacks, performance baseline, homepage CSS trim

## Next 3 safest Phase 1 tasks (in order)

### Task 1 — Mobile touch-target pass (44px minimum)

**Why:** Roadmap Phase 1 Task 3; CSS-only; no architecture risk.  
**Scope:** Dashboard widget toggles, refresh buttons, section collapse, customize panel controls, homepage top nav links.  
**Files:** `design-system/css/wds-dashboard-widgets.css`, `css/home-dashboard.css`  
**Test:** Visual check at 375px width; confirm controls remain tappable without layout break.  
**Commit:** `Phase 1: Enlarge dashboard touch targets to 44px`

### Task 2 — Honest integrity labeling for placeholder widgets

**Why:** Builds on educational fallback work; small JS change; aligns tags with “Educational ≠ Live” philosophy.  
**Scope:** Change dashboard `tagFromSource("placeholder")` from “Preview” to “Educational”; keep `Unavailable` only for true errors.  
**Files:** `design-system/js/dashboard/wds-dashboard-widget-data.js`  
**Test:** Load homepage offline/throttled; verify widget headers show “Educational” not “Preview” when live data absent.  
**Commit:** `Phase 1: Label placeholder widgets as Educational`

### Task 3 — Reliability documentation (no risky code)

**Why:** Roadmap definition-of-done items for smoke testing and legacy path documentation.  
**Scope:** Add `docs/HOMEPAGE_SMOKE_TEST.md` and `docs/DEPRECATED_RENDER_PATHS.md`; sync `automation/week-away/TASK_QUEUE.md` with completed work.  
**Files:** New docs + task queue update  
**Test:** Read-through; verify doc paths and function names match repo.  
**Commit:** `Phase 1: Add homepage smoke test and legacy path docs`

## Explicitly out of scope tonight

- 65-script loader rewrite or JS bundling
- Backend, accounts, new product pages
- Photography coach / Scenes product direction changes beyond docs
- Large CSS or JS architecture changes

## Per-task verification template

| Task | Manual verify |
|------|----------------|
| 1 | `python3 -m http.server 8080` → open `/` on mobile or DevTools 375px; tap nav, section toggles, widget refresh, Customize |
| 2 | Block network or use county without live feeds; confirm widget tags say Educational |
| 3 | Follow smoke-test checklist once on local server |
