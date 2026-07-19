# Waypoint Studio — Platform Design System Report

**Date:** 2026-07-18  
**Phase:** Product Recovery Phase 1 — Platform Design System & Consistency  
**Commit status:** Not committed / not pushed

## Mission outcome

Waypoint Studio now has an explicit **platform UI consistency layer** so applications share navigation structure, loading/empty/error language, touch targets, escape/fetch helpers, and typography policy — while keeping product accents via `[data-product]`.

## What was added

| Asset | Role |
|-------|------|
| `design-system/css/wds-platform-ui.css` | Shared task nav, loading, skeleton, empty/error, search, map chrome, section rhythm |
| `design-system/js/platform/wds-platform-ui.js` | `escapeHtml`, `getJson`, `loadingHtml`, `skeletonHtml`, `emptyHtml`, `errorHtml`, `taskNav` |
| `WDS.escapeHtml` / `WDS.core.escapeHtml` | Core alias to stop helper drift |
| Docs + `automation/test-platform-consistency.mjs` | Inventory, guidelines, debt, app follow-ups |

## Consistency fixes applied

1. **Task navigation** — `.wds-task-nav` unifies ForageCast (`.fc-task-nav`) and Savant (`.ss-task-nav`) structure; product CSS only paints backgrounds.
2. **Shell local nav** — touch targets raised to **44px**; radius aligned to `--wds-radius-md`.
3. **Buttons & map controls** — `.wds-btn` / `.wds-btn--sm` / `.wds-map-btn` min-height **44px**.
4. **Typography** — Savant switched from Source Sans 3 → **Inter** (platform body token).
5. **Fetch** — ForageCast/Savant fetch modules **delegate** to `WDS.platformUi.getJson`.
6. **Script injection** — `wds-platform-ui.js` loaded on **64** shell HTML pages before `wds-app-shell.js`.
7. **Volunteer** — removed duplicate `.wv-nav-mini` (shell local nav owns IA).
8. **ForageCast shell nav restored** — task features (Overview…Settings) re-synced after an earlier registry regression.

## Design principles (platform)

1. One shell philosophy: global Apps launcher + local feature nav + optional product task nav using the same link metrics.
2. Every async path gets loading → result or clear error with retry affordance (helpers provided).
3. Empty states explain *what to do next*, not just “no data.”
4. Accents differ by product; **structure does not**.
5. Prefer tokens (`--wds-space-*`, `--wds-radius-*`, `--wds-duration-*`) over one-off rem values.

## Honest limits

Not every app fully adopts the new primitives yet (Photo Coach, Sheds map HUD, SignalTerrain cyber, Photo Pipeline). See Apps Needing Work.
