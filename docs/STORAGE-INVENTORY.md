# Waypoint Studio — Browser Storage Inventory

**Last updated:** 2026-07 platform audit  
**Owning principle:** Private by default. Migrations must be idempotent and must not silently erase user history.

---

## Shared platform

| Key | Owner | Schema | Status |
|-----|-------|--------|--------|
| `waypoint-platform-profile-v1` | `wds-platform-stores.js` | Profile object | **Current** |
| `waypoint-platform-locations-v1` | `wds-platform-stores.js` | Saved locations[] | **Current** |
| `waypoint-platform-collections-v1` | `wds-platform-stores.js` | Collections / favorites | **Current** |
| `waypoint-platform-settings-v1` | `wds-platform-stores.js` | Settings | **Current** |

## Location & runtime

| Key | Owner | Schema | Status |
|-----|-------|--------|--------|
| `wds-location-v3` | `wds-location.js` | Location state | **Current** |
| `wds-location-v2` | migration | — | **Legacy** (cleared) |
| `wds-location-v1` | migration | — | **Legacy** (cleared) |
| `wds-location-prompted` | `wds-location.js` | Flag | **Current** |
| `waypoint-runtime-migration` | `wds-runtime-migration.js` | Migration marker | **Current** |
| `waypoint-active-build` | `wds-build.js` | Build commit | **Current** |
| `waypoint-debug-location` | debug tools | Flag | Ops / debug |
| `waypointDebugSnapshot` | debug tools | Snapshot | Ops / debug |
| `waypoint-briefing-snapshot-v1` | dashboard briefing | Cache | **Current** |
| `waypoint-outdoor-context-v1` | ecosystem bridge | **sessionStorage** | **Current** |

## Dashboard

| Key | Owner | Schema | Status |
|-----|-------|--------|--------|
| `waypoint-dashboard-widgets-v4` | dashboard widgets | Layout + favorites | **Current** |
| `waypoint-dashboard-widgets-v1`…`v3` | migration | — | **Legacy** |
| `waypoint-dashboard-favorites-v1` | widget-data (read path) | Favorites | **Legacy / dual-read** — prefer v4 |

## Fieldry / WOS

| Key | Owner | Schema | Status |
|-----|-------|--------|--------|
| `waypoint-fieldry-observations-v1` | `fieldry-storage.js` | WOS observations[] | **Current** (schema family v2 via migration flag) |
| `waypoint-fieldry-device-id` | `fieldry-storage.js` | Device id | **Current** |
| `waypoint-fieldry-migration-v2` | `fieldry-storage.js` | Marker | **Current** |

## Photo Coach

| Key | Owner | Schema | Status |
|-----|-------|--------|--------|
| `waypoint-photo-records-v1` | photo-coach-repository | PhotoRecord[] | **Current (growth)** |
| `waypoint-photo-shoots-entity-v1` | photo-coach-repository | Shoot[] | **Current (growth)** |
| `waypoint-photographer-profile-v1` | photographer profile | Profile | **Current (growth)** |
| `waypoint-photo-coaching-memory-v1` | personalized coaching | Memory | **Current** |
| `waypoint-photo-coaching-prefs-v1` | personalized coaching | Prefs | **Current** |
| `waypoint-photo-coach-journey-v1` | Photo Coach UI | Progress | **Current** |
| `waypoint-photo-coach-profile-v1` | legacy coach | Profile | **Legacy** — retained; do not delete without migration |
| `waypoint-photo-coach-sessions-v1` | legacy coach | Sessions | **Legacy** |
| `waypoint-photo-coach-shoots-v1` | legacy coach | Shoots | **Legacy** |

Photo Coach intentionally retains parallel legacy + growth families until a dedicated migration sprint consolidates them without data loss.

## Product foundations

| Key | Owner | Status |
|-----|-------|--------|
| `waypoint-sheds-finds-v1` | Sheds | Current |
| `waypoint-steepleaf-teas-v1` | Steepleaf | Current |
| `waypoint-steepleaf-brews-v1` | Steepleaf | Current |
| `waypoint-signalterrain-receivers-v1` | SignalTerrain | Current |
| `waypoint-signalterrain-incidents-v1` | SignalTerrain | Current |
| `waypoint-savant-wineries-v1` | Savant | Current |
| `waypoint-savant-wines-v1` | Savant | Current |
| `waypoint-savant-sites-v1` | Savant | Current |

## Species

| Key | Owner | Status |
|-----|-------|--------|
| `waypoint-wskb-recent-v1` | WSKB | Current |

## Purged / blocked stale keys

Runtime migration clears engine/weather caches that historically caused Kansas / stale publish leakage, including former OIP last-package and weather cache keys. See `wds-runtime-migration.js`.

---

## Migration rules

1. Never silently discard malformed JSON — preserve or quarantine.
2. Migrations must be idempotent (marker keys).
3. Prefer dual-read during transitions.
4. Do not consolidate Photo Coach legacy keys in opportunistic cleanups.
