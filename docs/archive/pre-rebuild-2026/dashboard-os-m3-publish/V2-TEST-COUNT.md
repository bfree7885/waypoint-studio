# V2 / shared test count — M3 publish gate

**Date:** 2026-07-22  
**Suite:** `automation/test-dashboard-v2.mjs`  
**Result on `integration/dashboard-os-m3`:** **58 passed, 0 failed**

## Why 58 vs historical ~21

Pre-reconcile M2 line retired many V2 HTML presentation asserts in favor of Outdoor OS (~21–22). Integration onto RC3 deliberately **kept** modular V2/V3 coverage because those modules remain in tree for:

- Shared models used by Outdoor OS (`buildPayload`, prefs, briefing, activity, timeline, trust)
- Kiosk / engine APIs
- Unit isolation of widget catalog honesty

Plus **7 Outdoor OS asserts** appended for product-path smoke inside this suite.

## Inventory (no accidental duplicates; no obsolete production-UI snapshots)

| Bucket | Role | Keep? |
|--------|------|-------|
| Shared model / coords / catalog / take / trust | Protects OS inputs | Yes |
| Prefs / defaults / persistence | Shared preference layer | Yes |
| V2 `render()` / customize / category HTML | Modular V2 still on disk; **not** production Outside route | Yes (module health) |
| Kiosk sync | Non-product surface | Yes |
| Outdoor OS compose/render (7) | Product path | Yes |

There are **no snapshot files** in this suite validating legacy production Outside chrome. Asserts that mention “Customize widgets” exercise `dashboardV2.render()` / kiosk board HTML in VM only — product Outside is gated by engine → `dashboardOS` and by `test-dashboard-today-outside.mjs` regressions.

## Decision

Do **not** reduce count to match earlier milestones. 58 is the legitimate reconciled baseline unless a future milestone removes V2/V3 modules from the tree.
