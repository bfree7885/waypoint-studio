# Dashboard V2 — Implementation Report

**Status:** Initial V2 shipped in working tree — **not committed**  
**Internal version:** `2.0.0`

## Executive summary

Dashboard Version 2 introduces **Today Outside**: a deterministic, traceable outdoor briefing layered above the existing Product Recovery tabs. V1 detail panels (weather, photography, rivers, air, sun/moon, alerts) are preserved. The experience is mobile-first, privacy-respecting, and honest about partial/cached data.

## What was built

1. **Header** — location, local time, source, refresh status, refresh/location/settings controls
2. **Overview panels** — compact grid linking to detail tabs
3. **Today Outside briefing** — five interpretive sections with rule traces
4. **24h timeline** — scrollable, touch-friendly
5. **Activity intelligence** — suitability labels + reasoning
6. **Good time to go windows** — with confidence and caveats
7. **Unified alerts** — official NWS vs dashboard cautions vs provider status
8. **River & photography intel** — interpreted, not raw-only
9. **Observe Today** — optional Studio links
10. **Provider trust** — collapsible table
11. **Local prefs storage** — defaults; UI editor deferred
12. **Briefing cache** — per-location, stale-aware

## Architecture changes

- New namespace: `WDS.dashboardV2*` under `design-system/js/dashboard/v2/`
- Recovery shell calls `dashboardV2.render(ctx)` when flag enabled
- No changes to OIP service contracts or other Studio apps

## Honest limitations

- No generative AI; rules only
- Prefs not yet exposed in Settings UI
- Playwright suite not added (repo has none)
- Pollen / trail closures not added
- Incremental DOM patch not implemented (full re-render on hydrate)

See `REMAINING-WORK.md` for Version 2 completion checklist.
