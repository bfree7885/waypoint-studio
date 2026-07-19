# Platform Component Inventory

**Date:** 2026-07-18

## Shared (design-system)

| Component | CSS | JS | Status |
|-----------|-----|-----|--------|
| App shell (global/local/footer) | `wds-app-shell.css` | `wds-app-shell.js` | Mature |
| Apps launcher | `wds-app-shell.css` | `wds-app-shell.js` | Mature |
| Buttons | `wds-components.css` `.wds-btn*` | — | Mature (+44px) |
| Cards / panels / tabs / topbar | `wds-components.css` | — | Mature |
| Empty (page-level) | `.wds-empty` | — | Mature |
| Empty/error/loading (inline) | `wds-platform-ui.css` | `wds-platform-ui.js` | **New** |
| Task navigation | `.wds-task-nav` (+ fc/ss aliases) | `taskNav()` | **New** |
| Search field | `.wds-search*` | — | **New** |
| Skeleton | `.wds-skeleton*` | `skeletonHtml()` | **New** |
| Map viewport / map btn | `.wds-map*` | `wds-map-view.js` | Mature (+44px btn) |
| Foundation pages | `wds-platform-foundation.css` | foundation boot | Mature |
| Tokens / typography / motion | `wds-tokens.css`, `wds-core.js` | reduced-motion, announce, trapFocus | Mature |
| Fetch + escape | — | `WDS.platformUi.getJson`, `WDS.escapeHtml` | **New** |

## Product-local (still present)

| Product | Local UI | Notes |
|---------|----------|-------|
| ForageCast | recovery summary, heat map | Task nav now shared structure |
| Savant | recovery GIS palette | Body font aligned to Inter |
| Steepleaf | `.sl-nav`, tea chrome | Next adoption candidate |
| SignalTerrain | `.st-cyber-nav`, parchment | Partial |
| Photo Coach | `.pc-*`, breadcrumbs | Under Scenes |
| Sheds map | Leaflet HUD, IBM Plex | Intentional immersive exception for now |
| Volunteer | discover Leaflet | Mini-nav removed |
| Fieldry | SPA hash UI | Shell features |
| Photo Pipeline | off-platform review CSS | Lowest priority |

## Dialogs / bottom sheets / charts

No universal dialog or bottom-sheet primitive yet — listed as debt. Prefer `WDS.core.trapFocus` when adding modals.
