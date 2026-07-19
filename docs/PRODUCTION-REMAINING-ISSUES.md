# Production Remaining Issues (post Recovery Sprint 1)

Updated 2026-07-19. Supersedes earlier “repair sprint” notes for infrastructure items that are now fixed **locally**.

## Fixed locally (awaiting deploy)

- Live/health JSON path (site-root `/data/...`)
- `isFiniteCoord(null)` → NWS 0,0
- `/map/` redirect + foundation `routeHref`
- Steepleaf explore syntax + boot failure path
- ForageCast “null, NY” label coercion
- Pre-deploy asset validation in CI + Pages

## Still open

1. Dashboard / studio **cold-start performance** (large sequential JS load)
2. Systemic **color-contrast** accessibility
3. Occasional **partial provider** honesty banners when APIs fail
4. CSS **@import waterfall** (correctness OK; perf debt)
5. Product-level ForageCast place resolution before scoring (labels guarded; model still early)
6. Sample/demo disclosure copy on some foundation apps

See `docs/PRODUCTION-REMAINING-RISKS-SPRINT1.md` for severity table.
