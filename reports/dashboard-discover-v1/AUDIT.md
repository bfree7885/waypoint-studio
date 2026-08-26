# Dashboard Discover — Audit

**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Canonical:** `docs/PRODUCT-DIRECTION.md` (Dashboard = Discover)  
**Live surface:** `/apps/dashboard/` (2026 rebuild via `home-boot.js` → `WDS.dashboardRebuild`)

---

## Entry & boot

| Item | Detail |
|------|--------|
| URL | `/apps/dashboard/` |
| Boot | `apps/dashboard/js/home-boot.js` → OIP hydrate (`WDS.outdoorIntelligence.get`) |
| Shell | `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` |
| Intel | `wds-dashboard-rebuild-intel.js` (deterministic; no LLM) |

---

## Modules (classification)

| Module | Data | Decision |
|--------|------|----------|
| **Today Outside** | Place + observational weather/air/light lines | **IMPROVE** — Discover framing, provenance, season label |
| **Happening Now** | Ranked `dashboardRebuildIntel.happeningNow` | **KEEP / IMPROVE** — primary “Right Now”; Discover copy |
| **Quiet / no-signal** | (was: hide section) | **IMPROVE** — calm honest empty strip (separate from HN) |
| **Instrument widgets** (12) | Open-Meteo / NWS / AQ / daylight | **KEEP** |
| **Before you go** (`ph-doorway`) | Derived brief from intel | **KEEP** |
| **Customize / kiosk** | Local prefs | **KEEP** |
| **Waypoint’s Take** (deepeners) | Hardcoded editorial | **IMPROVE** — drive from intel brief when available; label honesty |
| **Explore further** | Missing | **ADD** — Articles / Scenes / DFD as publishing pathways (not promo widgets) |
| **Editorial season** | OIP calendar / phenology stage | **ADD** — labeled Editorial only |
| Outdoor OS / V2 / V3 UIs | Legacy | **REMOVE from Discover path** (already not mounted; leave files) |
| Wildlife/trail widgets | No live feeds on rebuild | **REMOVE from Discover** (already absent) |
| Cross-product deepeners | Banned by surface architecture | **KEEP removed** |

---

## Real data sources

- Open-Meteo forecast (+ NWS recovery)
- Open-Meteo air quality
- NWS alerts
- Open-Meteo elevation (package)
- Browser / IP geolocation (`wds-location.js`)
- Daylight / moon derived from weather + daylight utils
- Regional content bundles (editorial) — `design-system/content-engine/regions/*.json`

## Ranking (existing)

`dashboardRebuildIntel`: normalize → deriveSignals → rank by score/severity → `happeningNow(minScore:25, limit:4)`. Deterministic thresholds. Documented in Discover docs after this pass.

## Gaps addressed in Discover v1

1. ~~Hardcoded Take~~ → prefers live `beforeYouGo.brief`  
2. ~~Empty HN hides Discover question~~ → calm `data-wdb-r-discover-quiet`  
3. ~~No labeled editorial seasonal note~~ → Today Outside season line  
4. ~~No publishing handoffs~~ → Explore links (Articles / Scenes / DFD)  
5. ~~No provider provenance~~ → “Based on …” on Today Outside  

## Final KEEP / IMPROVE / REPOSITION / REMOVE

| Element | Decision |
|---------|----------|
| Happening Now | **KEEP / IMPROVE** — “Right now / What to notice” |
| Quiet strip | **ADD** — separate from HN |
| Today Outside | **IMPROVE / REPOSITION** — Outside today / What the day looks like |
| Instruments | **KEEP** |
| Before you go | **KEEP** |
| Waypoint’s Take | **IMPROVE** — intel-backed when possible |
| Explore further | **ADD** — publishing pathways |
| Legacy OS/V2/V3 | **REMOVE from Discover path** (already unmounted) |
| Wildlife as live | **REMOVE** (never surface as detected) |
| Cross-product promo deepeners | **KEEP removed** |