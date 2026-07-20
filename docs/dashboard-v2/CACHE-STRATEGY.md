# Dashboard V2 — Cache Strategy

**Module:** `design-system/js/dashboard/v2/wds-dashboard-v2-trust.js`

| Setting | Value |
|---------|-------|
| Key | `waypoint-dashboard-v2-cache-v1` |
| Schema version | `1` |
| Location scope | lat/lng rounded to 0.01° |
| Fresh TTL | 5 minutes |
| Max stale | 60 minutes |
| Offline | Serve stale briefing with `partial: true` |

## What is cached

- Briefing object (sections + traces metadata stripped in storage is full briefing)
- Location label + trust snapshot

## What is not cached separately

- Raw provider payloads (OIP retains `lastPackage` in memory)
- Activity recompute always from current model when live

## Invalid-data rejection

- Model layer rejects `0,0`, legacy defaults, invalid place strings
- No API requests issued from V2 with invalid coords (inherits OIP guards)

## Stale presentation

- Header badge via `dashboardReliability.classifyPackageTrust`
- Briefing note when `partial: true`
- Trust table marks `cached` when `fromCache` or offline
