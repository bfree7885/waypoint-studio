# Shared UI Guidelines

**Date:** 2026-07-18

## Navigation

1. Always mount `wds-app-shell` with correct `data-product` / `shellDepth`.
2. Put primary app sections in `nav-registry` / `wds-app-nav-config` features.
3. If a product needs a second task strip (ForageCast/Savant), use `WDS.platformUi.taskNav(...)` with classes `wds-task-nav` + product alias.
4. Do **not** invent a third mini-nav (Volunteer lesson).
5. Touch targets ≥ 44px; keep labels scannable.

## Typography

- Display: `--wds-font-display` (Cormorant Garamond)
- Body: `--wds-font-body` (Inter)
- Product pages may theme color; they should not load a competing body family without setting `--wds-font-body`.

## Spacing

Use `--wds-space-1`…`16`. Section padding pattern: `var(--wds-space-5) clamp(1rem, 4vw, 2rem)`.

## Loading & errors

| State | Helper | Class |
|-------|--------|-------|
| Loading | `loadingHtml(msg)` | `.wds-loading` |
| Skeleton | `skeletonHtml(n)` | `.wds-skeleton` |
| Empty | `emptyHtml({title,text})` | `.wds-state` |
| Error / timeout / offline | `errorHtml({kind,text,retry})` | `.wds-error` + actions |

Never leave an endless spinner without timeout copy. Prefer `getJson` (8s default timeout, stale-cache fallback).

## Maps

- Prefer `WDS` MapView + `.wds-map-btn` (44px).
- Loading/offline banners: `.wds-map-loading` / `.wds-map-offline`.
- New Leaflet embeds should match CDN + control placement conventions (document per app until a shared wrapper lands).

## Accessibility

- Preserve skip link `.wds-skip`.
- Active nav: `aria-current="page"`.
- Announce important async results via `WDS.core.announce`.
- Honor `prefers-reduced-motion` (skeleton animation already gated).

## Search

Use `.wds-search` structure for new search fields; keep results and suggestions keyboard reachable.
