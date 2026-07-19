# Dashboard Provider Audit — Sprint 2

## Providers

| Provider | Module | Critical? | Failure isolation |
| --- | --- | --- | --- |
| Weather (Open-Meteo) | `wds-weather-service` via OIP | **Yes** | Settled with timeout; dashboard usable when live |
| NWS alerts | `wds-nws-alerts-service` | **Yes** | Skipped without coords; empty ≠ failure |
| Air quality | `wds-air-quality-service` | **Yes** | Skipped without coords |
| Elevation | `wds-elevation-service` | No | Skipped / unavailable does not force Partial |
| USGS rivers | `wds-usgs-water-service` | No | `no-nearby` / unavailable do not force Partial |
| Trails (OSM) | trail conditions | No | Late hydrate; **pending** on first paint |

## Coordinate safety (Sprint 1 + 2)

- `isFiniteCoord` rejects `null`
- Provisional / national / pending shells → no point API calls
- NWS refuses Null Island `0,0`

## Trust classification

- **Live:** critical providers OK (skipped/pending secondary allowed)
- **Partial:** a critical provider failed while another critical succeeded
- **Cached / Offline:** connectivity meta from reliability module

## Remaining provider debt

- Trail Overpass can still be slow or empty in rural areas
- Air Quality UI chrome is thinner than Weather
- No per-provider Retry button inside each tab (global Retry on hard boot only)
