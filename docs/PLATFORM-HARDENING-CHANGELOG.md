# Platform Hardening Changelog — Performance, Reliability & Production Hardening

**Work block:** Waypoint Studio Product Recovery Phase 2 — Platform Performance, Reliability & Production Hardening  
**Date:** 2026-07-18  
**Commit status:** **Not committed. Not pushed.** Owner review required.

---

## Summary

Introduced a shared platform resilience layer (`WDS.resilience`) and wired it through shell loaders, ForageCast, Savant, SignalTerrain, Volunteer weather, OIP, and MapView. Goal: timeouts, retries, coalescing, offline cache fallback, provider health, and honesty-labeled freshness — without inventing live data.

---

## Changes

### Shared platform

- **New** `design-system/js/platform/wds-platform-resilience.js`
  - 8s default timeouts
  - Retries with exponential backoff + jitter (5xx / 429 / timeout / network)
  - In-flight request coalescing
  - Memory + `sessionStorage` persistent cache fallback
  - Offline detection + `#wds-offline-banner`
  - Provider health registry + `providerHealthHtml()`
  - Freshness formatting + `debounce()` for incremental search
- **Updated** `wds-platform-ui.js` — `getJson` / `fetchWithTimeout` / `clearCache` delegate to resilience; `freshnessHtml` helper
- **Updated** `wds-platform-ui.css` — offline banner, provider health, freshness, map stage hint
- **Updated** `wds.js` and `wds-platform.js` — load resilience + platform-ui early (Dashboard / OIP apps benefit)
- Injected resilience script **before** platform-ui on ~64 HTML pages (prior session + verified)

### Outdoor Intelligence / weather

- OIP weather assemble uses `fallback: true` (graceful placeholder instead of hard fail)
- OIP `withTimeout` records provider outcomes into `WDS.resilience.recordProvider`

### Maps

- `wds-map-view.js` — `will-change: transform` while interactive; cleared on `destroy` (listener cleanup already present)

### Apps

- **ForageCast** — fetch helpers expose `formatFreshness`; prediction / property / land / wizard use platform `getJson`; Settings shows provider health + online state
- **Savant** — Discover + Cellar search debounced; Settings Platform section shows provider health
- **SignalTerrain** — `loadJson` routes through resilience (coalesce + cache + provider id)
- **Volunteer** — Open-Meteo weather fetch routes through resilience
- **Sheds map** — fixed broken `../../` links to site `knowledge` / `contact` / `support` (now `../../../`)

### Automation & docs

- `automation/test-platform-reliability.mjs`
- `automation/audit-platform-routes.mjs` (+ results doc)
- Full audit doc suite (performance, reliability, providers, shared services, debt, risks, beta recommendations)

---

## Explicit non-goals (this block)

- No new product features
- No UI redesign sprint
- No fabricated live scores
- No commit / push
