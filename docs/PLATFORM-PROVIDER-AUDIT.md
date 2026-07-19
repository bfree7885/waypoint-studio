# Platform Provider Audit

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Provider inventory (production-facing)

| Provider / source | Used by | Timeout | Retry | Cache | Fallback / honesty | Health recording |
|---|---|---|---|---|---|---|
| Open-Meteo weather | Dashboard OIP, Volunteer, weather services | 8s (OIP / resilience) | Yes (resilience paths) | Memory + session (resilience); OIP lastPackage | Empty/demo weather; OIP `fallback: true` | `open-meteo` / OIP labels |
| NWS alerts | Dashboard OIP | Soft timeout in OIP | Soft-fail | lastPackage | Provider Unavailable panels | Via OIP → resilience |
| Air quality | Dashboard OIP | Soft timeout | Soft-fail | lastPackage | Unavailable honesty | Via OIP |
| USGS water | Dashboard OIP | Soft timeout | Soft-fail | lastPackage | Unavailable | Via OIP |
| Elevation | Dashboard OIP | Soft timeout | Soft-fail | lastPackage | Unavailable | Via OIP |
| Overpass / trails | Dashboard OIP | Soft timeout | Soft-fail | trail cache patterns | Unavailable / cached | Via OIP |
| Content-engine JSON | Most outdoor apps | Resilience when via getJson | Yes | Yes | Error / empty UI helpers | `foragecast-data` / URL keys |
| SignalTerrain JSON samples | ST cyber surfaces | Via util `loadJson` | Yes | Yes | Throw → UI error panels | `signalterrain` |
| Geocode / IP geo | Location bootstrap | Service-specific | Mixed | Location state | Fallback location labeled | Partial |
| Leaflet tiles (CDN) | Sheds map | Browser/CDN | Browser | Browser tile cache | Blank map tiles | **Not integrated** |

---

## Rules enforced this block

1. No provider may freeze the UI indefinitely — soft timeout ≤ 8s on shared paths.  
2. Stale/cached/fallback data must be **labeled** (freshness / honesty copy).  
3. Failures record into `WDS.resilience` provider snapshot when on shared paths.  
4. Weather may degrade; it must not invent a confident live forecast.

---

## Provider health UX

- ForageCast **Settings** and Savant **Settings → Platform** render `providerHealthHtml()` for the current session.  
- Offline banner is global when resilience is loaded.

---

## Gaps before V1

| Gap | Risk | Recommendation |
|---|---|---|
| Weather services still have parallel implementations (Volunteer vs `wds-weather-service`) | Drift | Consolidate on weather service + resilience |
| Sheds tile provider | Map blank / slow | Add tile error UI + timeout messaging |
| Cyber live ingest polling | Battery / jank | Cap interval; pause when hidden |
| No centralized provider status page | Support friction | Studio Settings “Diagnostics” using `providerSnapshot()` |

---

## Verdict

Core outdoor providers are **timeout-bounded and honesty-labeled** on the OIP path. Shared resilience extends that contract to JSON and Volunteer weather. Remaining provider risk is **duplication** and **non-WDS map tiles**.
