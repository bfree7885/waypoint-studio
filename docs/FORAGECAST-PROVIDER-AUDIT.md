# ForageCast — Provider Audit (Sprint 4)

| Provider / feed | Role | Failure mode | User outcome |
| --- | --- | --- | --- |
| Browser geolocation | Precise coords | Denied / timeout | IP or cache or “location unavailable” |
| IP geolocation | Approximate coords | Unavailable | Cache or unavailable |
| Nominatim reverse geocode | Place names | Timeout / bad tokens | Coords · state; never `null, ST` |
| Open-Meteo (via OIP / appBoot) | Weather package | Timeout / error | Summary with uncertain weather; Ready → Provider unavailable |
| `/data/live.json` + `/data/health.json` | Optional live engine feed | 404 / stale | Soft miss; ForageCast still builds from OIP weather + educational models |
| Local JSON (`species-model`, `conditions`, `terrain-zones`, `home`) | Educational index | Fetch fail | Fail UI with retry (home/shell/season table) |
| Map tiles (if used on other surfaces) | Basemap | Abort / offline | Schematic zones remain primary on season table |

## Terminal reliability labels (Overview)

Implemented via `ForageCastLocation.reliabilityState`:

- **Ready** — live weather linked
- **Cached** — recent weather package
- **Offline** — navigator offline
- **Provider unavailable** — weather/platform error
- **Location unavailable** — no usable place

## Notes

- Sprint 1 already moved live/health URLs to **site-root absolute** paths; relative `/apps/foragecast/data/live.json` 404s should not recur once that deploy is live.
- Weather failover across multiple providers remains backlog.
