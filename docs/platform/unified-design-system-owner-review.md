# RC4 Platform Sprint 1 — Unified Waypoint Studio Experience

**Branch:** `feature/rc4-platform-sprint1-unified-experience`  
**Date:** 2026-07-25  
**Status:** Ready for owner review (not merged)

---

## Root causes

Navigating Dashboard → Scenes felt like switching products because several layers drifted apart:

1. **Duplicated color systems**  
   Scenes foundation (`scenes-foundation.css`) defined a private `--sf-*` palette (charcoal, aurora green, magenta, violet) instead of `--wds-*` tokens.  
   `apps/scenes/css/scenes-home.css` recolored the shared `.was-global` header for Scenes only (cream ink + moss accent), so the platform chrome visually “reset.”

2. **Duplicated typography**  
   Dashboard used **Inter**; Scenes / Photo Coach / Sheds loaded **Source Sans 3**. Same shell, different body voice.

3. **Duplicated / conflicting chrome**  
   Living Scenes kept a legacy `.topbar` look (`rgba(6,9,8)`) beside the shared `was-shell` header. Dashboard and Scenes both use `data-wds-app-shell`, but product CSS overrode the shared header.

4. **Dashboard density**  
   `.wdb-v2-widget { min-height: 8.5rem }` and large panel/skeleton min-heights forced empty vertical space even when content was thin. Status chips still used light-theme availability colors (`#e0efe6` on dark surfaces).

5. **Status language**  
   Trust labels existed (`Live`, `Cached`, `Partial`) but were plain text without a shared badge component, so meaning was easy to miss across apps.

---

## Shared components created / centralized

| Component | Location | Role |
|-----------|----------|------|
| **Platform Unity stylesheet** | `design-system/css/wds-platform-unity.css` (imported by `wds.css`) | One chrome + badge + card-density layer for every app that loads WDS |
| **`.wds-status` badges** | Unity CSS + Dashboard V2/V3 status maps | Live / Waiting / Estimated / Offline / Foundation pills |
| **Content-proportional widgets** | Unity + `wds-dashboard-v2.css` | Removes forced tall empty cards |
| **Scenes foundation on WDS tokens** | `apps/waypoint-scenes/css/scenes-foundation.css` | Landing matches studio navy / lime / purple |
| **Scenes chrome bridge** | `apps/scenes/css/scenes-home.css` | Stops Scenes-only header recolor; aliases `--scenes-*` → `--wds-*` |

Existing shared shell (unchanged contract, now consistently styled):

- `design-system/js/platform/wds-app-shell.js` + `wds-app-shell.css`
- `design-system/css/wds-tokens.css` / `wds-components.css` (buttons, cards)

---

## Files changed

- `design-system/css/wds-platform-unity.css` *(new)*
- `design-system/css/wds.css`
- `design-system/css/wds-dashboard-v2.css`
- `design-system/js/dashboard/v2/wds-dashboard-v2-render.js`
- `design-system/js/dashboard/v3/wds-dashboard-v3-shell.js`
- `apps/waypoint-scenes/css/scenes-foundation.css`
- `apps/waypoint-scenes/css/studio-shell.css`
- `apps/waypoint-scenes/index.html`
- `apps/waypoint-scenes/create/index.html`
- `apps/scenes/css/scenes-home.css`
- `apps/dashboard/index.html`
- `apps/photo-coach/index.html`
- `apps/shed-hunting/index.html`
- `articles/index.html`
- `automation/test-rc4-platform-unity.mjs` *(new)*
- `docs/platform/screenshots/rc4-sprint1/*`
- `docs/platform/unified-design-system-owner-review.md` *(this file)*

---

## Before / after screenshots

Directory: `docs/platform/screenshots/rc4-sprint1/`

| Surface | Before | After |
|---------|--------|-------|
| Dashboard 1440 | `before-dashboard-1440.png` | `after-dashboard-1440.png` |
| Scenes 1440 | `before-scenes-1440.png` | `after-scenes-1440.png` |
| Sheds 1440 | `before-sheds-1440.png` | `after-sheds-1440.png` |
| Dashboard 390 | — | `after-dashboard-390.png` |
| Scenes 390 | — | `after-scenes-390.png` |
| Articles 1440 | — | `after-articles-1440.png` |

**What to look for**

- Same Waypoint Studio global header (brand + product links + Explore) on Dashboard, Scenes, Sheds, Articles.
- Scenes landing uses studio navy / lime (no private aurora/magenta page skin).
- Dashboard status chips read as pills (Live / Estimated / Waiting).
- Widget cards no longer force ~8.5rem empty height.

---

## Responsive verification

Verified via screenshots and CSS at **1440** and **390**. Unity rules include a ≤720px pass for global inner padding and single-column widget grids. Platform foundation automation still passes.

```bash
node automation/test-rc4-platform-unity.mjs
# → 16 passed

node automation/test-platform-foundation.mjs
# → All platform foundation tests passed
```

---

## Implementation summary

1. Added **one** platform unity layer on top of WDS so chrome, badges, and card density cannot fork per app.  
2. Migrated Scenes foundation + scenes-home chrome overrides onto `--wds-*`.  
3. Aligned Inter across Scenes, Photo Coach, Sheds, Articles (with Cormorant display).  
4. Tightened Dashboard widget/panel/skeleton spacing; refined trust badges to communicate Live / Waiting / Estimated / Offline.  
5. Hid legacy `.topbar` when `was-shell` is present so Living Scenes does not flash an older header language.

---

## Remaining technical debt

- Many product CSS files still define local aliases (`--ws-*`, `--scenes-*`, `--coach-*`). Next sprint should delete aliases after call-site migration.
- Dashboard “Current location” empty state still looks sparse when no place is chosen — content, not chrome.
- Not every Scenes sub-route was visually QA’d (Portfolio Advisor, Hidden Landscapes deep pages); they inherit WDS via `wds.css` + shell, but product CSS may still carry Source Sans on some HTML heads.
- Full visual regression matrix (all apps × 6 widths) should be automated in CI with Playwright once `ws`/browser tooling is reliable in this environment.
- Experience System V2 / aurora bridge still loads; long-term, collapse overlapping “atmosphere” layers into unity tokens only.

---

## Verdict

Sprint 1 establishes a **single shared design system path** for platform chrome and Scenes/Dashboard presentation. Navigation no longer invents a Scenes-only header skin; Dashboard cards are content-sized; status badges share one vocabulary. Ready for owner review — **do not merge until approved**.
