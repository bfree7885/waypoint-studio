# Dashboard Speed Audit — Product Recovery Phase 1

**Date:** 2026-07-18  
**Surface:** `apps/dashboard/` (vanilla WDS, not React)  
**Mode:** Measure → fix safely → document remaining risk

---

## Executive findings

| Issue | Severity | Status |
|-------|----------|--------|
| Eager mount of **all** specialty dashboards on first paint | High | **Fixed** — tab-scoped lazy mounts |
| Duplicate condition surfaces (brief + vitals + outdoor-weather + briefing package + category grid) | High | **Fixed** — recovery shell |
| Opacity fade-in on hydrate (felt like flash / jump) | Medium | **Fixed** |
| Blocking Google Fonts in `<head>` | Medium | **Mitigated** — print/onload swap + fewer weights |
| ~108 sequential `async=false` scripts via `wds.js` | High (structural) | **Documented** — deferred to Phase 2 bundle split |
| 5‑minute full `startDashboard` refresh | Medium | Unchanged (needed for freshness); same-key hydrate path retained |
| Experiences / field-tools / methodology below fold | Low–Med noise | **Removed** from dashboard boot sections |
| `live.json` + OIP parallel fan-out | OK | Kept; still the correct critical path |

---

## Load path (instrumented)

```
HTML parse → wdb-html-parsed
  → deferred wds.js chain (~108 files, ordered)
  → home-boot waits for location + contentEngine + OIP + weather APIs
  → shell paint (region JSON) → wdb-shell-paint
  → OIP Promise.all (Open-Meteo, NWS, AQ, elevation, USGS) + live.json
  → hydrateDashboardInPlace → recovery HTML
  → mount only active tab (Today/Alerts = zero specialty mounts)
```

**Performance marks added**

- `wdb-html-parsed`
- `wdb-shell-paint` / `wdb-shell-paint-start|end`
- `wdb-boot-start-dashboard` → `wdb-boot-hydrated` (`wdb-boot-to-hydrated`)
- `wdb-dashboard-refresh`
- `wdb-tab-mount-<tabId>` on first visit to a detail tab

Inspect in DevTools → Performance → Timings, or:

```js
performance.getEntriesByType('measure').filter(m => m.name.startsWith('wdb-'))
```

---

## Measured / expected gains (broadband, warm DNS)

These are **engineering estimates from architecture change**, not lab CDP runs in this session. Re-verify on device.

| Milestone | Before (typical) | After (target) | Mechanism |
|-----------|------------------|----------------|-----------|
| First meaningful shell | Skeleton only until JS chain finishes | Same JS gate, but skeleton matches final layout (less jump) | Critical CSS + skeleton |
| Structure with Today summary | After OIP + mounting **all** widgets | After OIP; **no** specialty mounts on Today | Lazy tabs |
| Time to interactive tabs | N/A (stacked page) | Instant CSS show/hide after first HTML | `hidden` / `.is-active` |
| First Weather tab open | Already paid at boot | Pays mount cost once on first open | `data-wdb-mounted` |
| Main-thread mount work at boot | outdoor + sky + water + photo + safety + … | ~0 specialty mounts | Recovery mount path |

**Largest win:** removing multi-dashboard `mountAll` from the critical path when the default tab is Today.

---

## Duplicate information removed

| Was duplicated | Where | Recovery treatment |
|----------------|-------|--------------------|
| Temp / conditions | Outdoor Weather + glance-temp + brief stats | Weather tab only |
| Sunrise / UV | glance chips + brief + sun-moon | Summary interpretation + Sun & Moon tab |
| AQI | air-quality widget + brief/safety | Air tab + one Today bullet |
| Rain / alerts | brief + outdoor-weather + safety | Today bullets + Alerts tab |
| Morning briefing package | Large card stack under brief | Not rendered in recovery mode |
| Category section grid | Full catalog sections | Not rendered; Customize retained |
| Field tools / Experiences | Below dashboard | Dropped from dashboard `sections` |

---

## Remaining issues (future work)

1. **Script graph** — Split dashboard-critical modules from wildlife/flora/foraging/education loaders; or ship a single hashed bundle for Dashboard only.  
2. **Font CDN** — Self-host Inter + Cormorant subset to remove third-party RTT.  
3. **CSS `@import` chain** in `wds-dashboard-home.css` — concatenate for production to cut request waterfalls.  
4. **Interval remount** — Prefer silent OIP refresh into Today summary without rewriting tab DOM when location unchanged.  
5. **Air tab** — Still a small widget card; could be prose-only later (not done — would be feature churn).  
6. **Automated CDP budget CI** — Wire marks into `automation/` smoke with thresholds.

---

## How to disable recovery (escape hatch)

```js
localStorage.setItem('waypoint-dashboard-recovery-v1', '0');
location.reload();
```

Set to `'1'` (or remove) to re-enable.
