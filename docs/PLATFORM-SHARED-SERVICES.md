# Platform Shared Services Report

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Goal

Identify duplicate platform services and consolidate toward single sources of truth.

---

## Service map

| Concern | Canonical module(s) | Duplicates / forks | Action this block |
|---|---|---|---|
| JSON fetch + cache | `WDS.resilience` ← `WDS.platformUi` | Per-app `fetch()` helpers | FC prediction/property/land/wizard + ST util + Volunteer weather routed |
| Escape HTML | `WDS.escapeHtml` / `platformUi.escapeHtml` | Many local `esc()` | Left (safe); prefer platform going forward |
| Offline / connectivity | `WDS.resilience` + Dashboard reliability | Older ad-hoc checks | Banner + dataset flag shared |
| Provider health | `WDS.resilience.recordProvider` | OIP `providerTelemetry` array | OIP now also writes resilience |
| Location | `WDS.location` + OIP location | App-specific location wrappers | Unchanged (already central) |
| Weather | `weather/wds-weather-service.js` + OIP | Volunteer Open-Meteo direct | Volunteer now resilient; full merge still open |
| Maps | `wds-map-view.js` | Leaflet Sheds | MapView hardened; Leaflet open |
| Observations | WOS core + extensions | Fieldry/Sheds stores | Prior merge-load hardening retained |
| Knowledge search | `WDS.knowledge.search` | App filters | Debounce helper shared |
| Auth | None (local-first) | N/A | Still no accounts — correct for beta |
| Settings / storage keys | Platform stores + app keys | ST `STORAGE_KEYS` catalog | Documented; no key collision fix needed |
| Notifications | Minimal / none platform-wide | — | Out of scope |
| Navigation / shell | `wds-app-nav` + foundation | Product task nav aliases | Consistency phase retained |

---

## Consolidation wins

1. **One resilience primitive** for timeouts/retries/cache/coalesce/offline.  
2. **Loader wiring** so Dashboard (`wds.js`) and OIP (`wds-platform.js`) get it without per-page forgetfulness.  
3. **ForageCastFetch** remains a thin alias (compat) but delegates + formats freshness correctly.  
4. **SignalTerrain util** is the ST fetch choke point — cyber modules using it inherit resilience.

---

## Still duplicated (intentional short-term)

- Dashboard reliability vocabulary vs platform freshness strings (compatible; unify copy later).  
- Multiple weather entry points (Volunteer vs core weather service).  
- Leaflet vs MapView.  
- Local `esc()` copies (low risk).

---

## Recommendation

Treat `WDS.resilience` + `WDS.platformUi` + OIP + WOS + location as the **platform spine**. New app code must not introduce new fetch stacks.
