# Shared Services Inventory — Phase 3

**Date:** 2026-07-18

---

## Canonical services (use these)

| Service | Namespace | Persistence | Consumers |
|---|---|---|---|
| Profile | `WDS.platform.Profile` | `waypoint-platform-profile-v1` | Settings, identity |
| Settings | `WDS.platform.Settings` | `waypoint-platform-settings-v1` | Settings, notifications gate, theme |
| Locations (saved) | `WDS.platform.Locations` | `waypoint-platform-locations-v1` | Places service, Settings |
| Collections | `WDS.platform.Collections` | `waypoint-platform-collections-v1` | Fieldry, Settings |
| Active location | `WDS.location` | `wds-location-v3` | Dashboard, ForageCast, OIP |
| Places facade | `WDS.platformPlaces` | + `waypoint-platform-recent-places-v1` | Settings, search, Dashboard favorites preference |
| Observation ledger | `WDS.platformObservations` | Reads app keys (no new write store) | Settings, search, Dashboard wildlife |
| Global search | `WDS.platformSearch` | — | Studio Home, Settings |
| Notifications | `WDS.platformNotifications` | `waypoint-platform-notifications-v1` | Settings |
| Graph | `WDS.platformGraph` | `waypoint-platform-graph-edges-v1` | Identity seed, Settings derive |
| Workflows | `WDS.platformWorkflows` | — | FC, Fieldry, Sheds, Savant |
| Identity helpers | `WDS.platformIdentity` | uses Profile/Settings | Auto on load |
| Resilience / UI | `WDS.resilience` / `WDS.platformUi` | session cache | Platform-wide |
| WOS schema | `WDS.observations` | helpers only | Fieldry |
| Knowledge | `WDS.knowledge*` | content bundles | Knowledge, Fieldry, search provider |
| Catalog / shell | `WDS.platformCatalog` / app shell | — | All apps |

---

## App stores still authoritative (bridged, not replaced)

| App store | Key | Bridge |
|---|---|---|
| Fieldry observations | `waypoint-fieldry-observations-v1` | observations adapter |
| Sheds observations | `waypoint-sheds-observations-v1` | observations adapter |
| ForageCast journal | `foragecast.journal.v1` | observations adapter |
| Volunteer planning | `waypoint-volunteer-planning-v1` | observations adapter |
| Savant settings / wines | `waypoint-savant-*` | soft unit mirror only |
| Photo Coach profiles | `waypoint-photo-coach-*` | not merged yet |
| ST research workspace | `st_*` | separate collections model |

---

## Duplicate reduction progress

| Before | After |
|---|---|
| Orphan platform Profile/Settings | Settings page + identity ensure |
| Orphan Locations API | Places service + Settings UI |
| Dashboard raw Fieldry localStorage | `wildlifeContext()` preferred |
| Scattered “favorites” | Platform places favorites preferred; legacy dashboard key fallback |
| No cross-app search | `platformSearch` |
| No notification system | Local opt-in inbox |

---

## Still duplicated (accepted for now)

- Per-app specialty settings (Savant cellar prefs, Sheds model prefs, ST security profile)  
- Photo Library collections vs platform collections  
- ST research collections vs platform collections  
- Leaflet Sheds map vs WDS MapView
