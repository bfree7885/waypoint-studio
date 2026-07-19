# Platform Consistency — Technical Debt

**Date:** 2026-07-18

## High

1. ~80 local `escapeHtml` copies remain — migrate call sites to `WDS.escapeHtml` gradually.
2. Sheds map HUD still off-shell (fonts, chrome, Leaflet CDN).
3. Photo Coach / waypoint-scenes parallel radius & button systems (`.pc-btn`).
4. No shared modal / bottom-sheet component yet.
5. Leaflet used from multiple CDNs (Volunteer vs Sheds vs ST).

## Medium

6. Steepleaf `.sl-nav` and SignalTerrain `.st-cyber-nav` not yet on `.wds-task-nav`.
7. Dashboard widget skeletons still duplicated per dashboard CSS file.
8. Light educational surfaces (FC/Savant) vs dark studio tokens — dual visual modes need a documented `data-surface` strategy.
9. Photo Pipeline remains outside shell/nav.

## Low

10. Legacy `.btn` aliases beside `.wds-btn`.
11. Foundation apps still feel thinner than recovered products (expected).

## Performance

- Deduping fetch helpers reduces future drift more than immediate bytes.
- Platform UI CSS is small; loaded via existing `wds.css` import chain.
