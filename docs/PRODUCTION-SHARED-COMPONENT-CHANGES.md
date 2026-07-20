# Shared Component Changes — Production Repair

**Date:** 2026-07-18

| Component | Path | Role |
|---|---|---|
| Platform boot | `wds-platform-boot.js` + CSS | Branded loading / timeout / retry |
| Foundation routes | `wds-platform-foundation.js` | App-relative `routeHref` |
| Platform UI | existing | Still used for task nav / honesty; boot preferred for first paint |
| App shell footer | existing | Canonical legal links |

## Adoption

- Loaded via `wds.js` / `wds-platform.js`
- Injected on HTML pages that already load `wds-platform-ui.js`
- Static boot markup embedded in critical landings (works before JS)

## Still duplicated (accepted)

- SignalTerrain cyber custom skels (partially coexist with boot)
- Dashboard recovery skeleton (product-specific; keep)
- Leaflet map chrome (Sheds)
