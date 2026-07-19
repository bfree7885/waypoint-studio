# Production Recovery Sprint 1 — Changelog

**Date:** 2026-07-19  
**Scope:** Build output, asset delivery, routing, startup/boot, provider resilience, Dashboard foundation  
**Constraint:** No new features, no redesign, **no commit / no push** (owner will ship)

---

## Summary

This sprint closes the **real** production infrastructure defects identified by the live Playwright audit and by re-verification against https://waypointstudio.org.

Important clarification on CSS: the audit’s mass `wds-*.css` 404s were largely **axe-core false positives** (axe re-fetches `@import` names against the **document** URL). Real browser resolution under `/design-system/css/` is healthy. Validation now resolves `@import` against the **stylesheet** file so deploy gates stay honest.

---

## Changes by area

### Build / assets

- Confirmed static GitHub Pages deploy (no bundler); entire tree is the artifact.
- Ensured `wds-platform-boot.js` / `wds-platform-boot.css` are present and referenced from `wds.js` / `wds.css`.
- Added `automation/validate-production-assets.mjs` — fails if HTML refs, CSS `@import`s, `wds.js` modules, or critical data/boot files are missing.
- Wired asset + link validation into **CI** and **Pages** workflows (deploy fails on missing assets).

### Live engine feed paths (P1)

- `wds-live-engine-feed.js`: `LIVE_URL` / `HEALTH_URL` → **`/data/live.json`** and **`/data/health.json`** (site-root absolute).
- Stops apps under `/apps/*/ ` from requesting `/apps/*/data/live.json` (404).

### Provider / coordinate safety (P1)

- Fixed `isFiniteCoord` in `wds-oip-model.js` and `wds-oip-location.js` — **rejects `null`/`undefined`/""** (`Number(null)===0` bug).
- `wds-oip-service.js` `coordsFromRequest`: skips pending / national-educational shells; rejects Null Island `0,0`.
- `wds-nws-alerts-service.js`: no network call for missing coords or `0,0` (returns `unavailable`).
- Dashboard `isSafeEarlyLocation`: same null/`0,0`/`pending` guards.

### Routing (P0)

- Prior repair: `routeHref` strips leading `/` so foundation `map/` stays app-relative.
- Prior repair: Sheds `foundation.json` uses `"path": "map/"`.
- **New:** `map/index.html` redirects legacy `/map/` → `/apps/shed-hunting/map/`.

### Startup / shared boot

- Shared `WDS.platformBoot` (mount / watch / fail / retry) already wired across apps.
- **Steepleaf explore/entity:** use platformBoot + timeout watch; **`.catch` with retry**; fixed fatal quote bug (`"</div><ul class="stl-list">'`) that prevented explore JS from parsing.

### ForageCast location clarity (P1 trust)

- `formatRegionLabel` guards against `null`/`undefined` string coercion → **“null, NY”**.
- Applied in home, location helpers, heat map meta, land, property overview.

### Testing

- `automation/test-production-recovery.mjs` — regressions for URLs, coords, NWS, routeHref, map redirect, boot assets, Steepleaf, ForageCast labels.
- Existing `validate-production-links.mjs` + `test-production-repair.mjs` remain green.

---

## Commands verified locally

```bash
node automation/validate-production-assets.mjs   # Missing: 0
node automation/validate-production-links.mjs    # Broken: 0
node automation/test-production-recovery.mjs     # All passed
node automation/test-production-repair.mjs       # All passed
```

---

## Not in this sprint

- Application redesigns or new features
- Full CWV / Lighthouse optimization
- Committing or pushing (explicitly deferred to owner)
