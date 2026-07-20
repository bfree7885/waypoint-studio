# Dashboard V2 — Provider Inventory

| Provider | ID | Status | Used by V2 |
|----------|-----|--------|------------|
| Open-Meteo | `weather` | Live | Briefing, panels, timeline, activities |
| Open-Meteo AQ | `airQuality` | Live | Briefing, panels, activities |
| NWS | `nwsAlerts` | Live | Alerts unified, briefing caution |
| USGS Water IV | `usgsStreamflow` | Live | River intel, activities (paddling) |
| Nominatim | `geocode` | Live | Header place names |
| Open-Meteo DEM | `elevation` | Live | Trust table |
| OSM Overpass | `nearbyTrails` | Live | Trust table |
| Derived daylight | — | From coords | Timeline, photography |
| Derived photography | — | From weather+sky | Briefing, photo intel |
| eBird | `ebird` | Pending | Not used in V2 |
| Recreation.gov | `recreationGov` | Pending | Not used |
| NOAA tides | `tides` | Pending | Not used |

Registry source: `design-system/js/dashboard/wds-integrations-registry.js`

OIP orchestration: `design-system/js/outdoor-intelligence/wds-oip-service.js`
