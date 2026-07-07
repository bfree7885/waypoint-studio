# Production Gap Analysis — Waypoint Studio

**Audit date:** July 2026  
**Scope:** Homepage dashboard, OIP platform, location flow, all 69 catalog widgets  
**Standard:** Production = honest labeling, nationwide coordinates, no fake agency data

---

## Architecture summary

| Layer | Role | Production state |
|-------|------|------------------|
| `wds-location.js` | Geo/manual location, state inference | **Production** — nationwide US |
| `wds-us-national-context.js` | Pike vs national mode, trust banner | **Production** |
| `wds-oip-service.js` | Platform assembly | **Production** — weather + NWS alerts parallel fetch |
| Open-Meteo | Forecast, sun, moon, UV, wind | **Production** — Level 1 |
| NWS `alerts/active` | Active warnings/watches by point | **Production** — added this session |
| Content bundles | Editorial ecology (Pike local zone) | **Partial** — one county bundle |
| Intel dashboards | Domain synthesis cards | **Partial** — mix live + educational |

---

## Widget inventory (69)

| Widget | Purpose | Current Status | Data Source | Trust Level | Production Ready | Blocking Issue | Exact Engineering Task |
|--------|---------|----------------|-------------|-------------|------------------|----------------|------------------------|
| outdoor-weather | Anchor weather card | LIVE | Open-Meteo | B | Yes | No NWS cross-check on forecast | Optional: dual-source validation layer |
| todays-outdoor-highlights | Composite daily summary | LIVE / EDITORIAL | OIP + highlights engine | C | Partial | Mixes live wx with editorial species nationally | Scope highlights to live-only outside local zone |
| glance-temp | Current temperature | LIVE | Open-Meteo | B | Yes | — | — |
| glance-sunrise | Sunrise time | LIVE | Open-Meteo daily | B | Yes | — | — |
| glance-uv | UV index glance | LIVE / EDUCATIONAL | Open-Meteo / fallback | B | Yes | — | — |
| current-weather | Full current conditions | LIVE | Open-Meteo | B | Yes | — | — |
| hourly-forecast | 24h forecast | LIVE | Open-Meteo | B | Yes | — | — |
| weekly-forecast | 7-day forecast | LIVE | Open-Meteo | B | Yes | — | — |
| air-quality | AQI and smoke | NOT IMPLEMENTED | — (AirNow pending) | F | No | No provider connected | Integrate AirNow AQI by lat/lng |
| wind | Wind and gusts | LIVE | Open-Meteo | B | Yes | — | — |
| uv-index | UV detail | LIVE | Open-Meteo | B | Yes | — | — |
| sun-moon-dashboard | Sun/moon full panel | LIVE | Open-Meteo + daylight utils | B | Yes | — | — |
| sunrise | Sunrise single | LIVE | Open-Meteo | B | Yes | — | — |
| sunset | Sunset single | LIVE | Open-Meteo | B | Yes | — | — |
| golden-hour | Photography sun windows | ESTIMATED | Derived from Open-Meteo sun times | B | Yes | — | — |
| blue-hour | Twilight windows | ESTIMATED | Derived from Open-Meteo sun times | B | Yes | — | — |
| moon-phase | Lunar phase | LIVE | Open-Meteo daily | B | Yes | — | — |
| moonrise | Moonrise time | LIVE | Open-Meteo daily | B | Yes | — | — |
| moonset | Moonset time | LIVE | Open-Meteo daily | B | Yes | — | — |
| wildlife-dashboard | Wildlife intel panel | EDITORIAL / EDUCATIONAL | OIP species + observations | C | Partial | No eBird/live agency feed | eBird recent observations API |
| wildlife-activity | Species activity single | EDITORIAL / EDUCATIONAL | Content bundle / national fallback | C | Partial | Local ecology only in Pike zone | County bundles or national phenology API |
| bird-migration | Migration window | EDITORIAL / EDUCATIONAL | Bundle species filters | D | No | No BirdCast/eBird | BirdCast or eBird migration endpoint |
| amphibian-activity | Amphibian season | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No phenology API | USA-NPN or state phenology |
| insect-activity | Pollinator/hatch | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No phenology API | Phenology network integration |
| foraging-dashboard | Foraging intel panel | EDITORIAL / EDUCATIONAL | OIP + weather rainfall | C | Partial | No species-level live data | Regional phenology + ethics layer |
| mushroom-outlook | Fruiting outlook | EDITORIAL | Pike foragecastPreview | C | Partial (local only) | Not nationwide ecology | Per-region foraging editorial with citations |
| berry-conditions | Berry ripening | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No live phenology | Phenology or citizen-science feed |
| seasonal-edibles | Season windows | EDITORIAL | Bundle species groups | C | Partial | Pike-only editorial nationally off | Expand bundles |
| recent-rainfall | Moisture context | LIVE / EDITORIAL | Open-Meteo precip + bundle | B | Yes | — | — |
| flora-dashboard | Flora/phenology panel | EDITORIAL / EDUCATIONAL | OIP phenology | C | Partial | No live bloom data | USA-NPN or iNaturalist phenology |
| bloom-calendar | What's blooming | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No phenology API | Phenology integration |
| tree-phenology | Leaf-out timing | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No phenology API | Phenology integration |
| wildflower-activity | Forest floor blooms | EDITORIAL / EDUCATIONAL | Bundle species | D | No | No phenology API | Phenology integration |
| fall-color | Foliage forecast | EDUCATIONAL | Educational fallback | D | No | No foliage provider | State forestry or SmokyMountains-style API |
| water-dashboard | Hydrology panel | LIVE / EDITORIAL | Rainfall + NWS flood alerts | B | Partial | No USGS gauges | USGS IV nearest gauge |
| river-levels | Main stem stage | NOT IMPLEMENTED | — | F | No | USGS not connected | USGS IV stage by HUC/nearest |
| stream-flow | Tributary cfs | NOT IMPLEMENTED | — | F | No | USGS not connected | USGS IV discharge parameter 00060 |
| water-temperature | Surface water temp | NOT IMPLEMENTED | — | F | No | USGS not connected | USGS IV parameter 00010 |
| flood-status | Flood watches | LIVE / EDITORIAL | NWS alerts + rainfall cues | A | Yes | Only flood-class alerts; no river stage | USGS stage + NWS river forecast points |
| trail-dashboard | Trail conditions panel | EDITORIAL / EDUCATIONAL | Observations + weather | C | Partial | No agency trail API | OSM trails + NPS/USFS alerts |
| trail-conditions | Mud/tread status | EDITORIAL / EDUCATIONAL | Bundle observations + wx | C | Partial | Editorial not verified | Trail report aggregator |
| trail-closures | Closed trails | NOT IMPLEMENTED | — | F | No | No provider | NPS/USFS closure feeds |
| park-alerts | Park notices | NOT IMPLEMENTED | — | F | No | No NPS API | NPS alerts API |
| parking-updates | Lot availability | NOT IMPLEMENTED | — | F | No | No crowd data | Out of scope V1 — honest unavailable |
| photography-conditions-dashboard | Photo conditions | LIVE | Open-Meteo + daylight | B | Yes | — | — |
| sunrise-quality | Dawn shoot potential | EDITORIAL | Weather conditions heuristics | C | Partial | Not a forecast product | Cloud-layer analysis from hourly |
| sunset-quality | Evening shoot potential | EDITORIAL | Weather heuristics | C | Partial | Same | Hourly cloud trend |
| fog-potential | Valley fog likelihood | EDITORIAL | Weather keyword match | D | No | No radiation fog model | Humidity/dewpoint/wind model |
| milky-way | Night sky window | EDUCATIONAL / ESTIMATED | Moon phase from Open-Meteo | C | Partial | No cloud/sky darkness API | Bortle + cloud forecast composite |
| aurora | Northern lights | EDUCATIONAL | Educational fallback | F | No | No NOAA SWPC feed | NOAA aurora forecast API |
| cloud-cover | Cloud % | LIVE | Open-Meteo | B | Yes | — | — |
| visible-planets | Planet visibility | NOT IMPLEMENTED | — | F | No | No astronomy API | Ephemeris service (USNO or similar) |
| iss-passes | ISS overhead | NOT IMPLEMENTED | — | F | No | No tracker | Open Notify or CelesTrak |
| meteor-showers | Shower peaks | NOT IMPLEMENTED | — | F | No | Static calendar not loaded | IAU meteor calendar dataset |
| dark-sky-rating | Light pollution | EDITORIAL / ESTIMATED | Astronomical twilight derived | D | No | No Bortle data | Light pollution map API |
| safety-dashboard | Safety intel panel | LIVE / EDUCATIONAL | Open-Meteo + NWS alerts | B | Yes | Tick/mosquito models heuristic | AirNow + fire weather index |
| tick-activity | Tick season risk | EDUCATIONAL | Temp/humidity heuristic | D | No | Not epidemiological data | CDC or state tick index when available |
| mosquito-activity | Bite pressure | EDUCATIONAL | Temp/humidity heuristic | D | No | No entomology feed | Regional mosquito forecast |
| fire-danger | Wildfire risk | EDUCATIONAL | Weather dryness heuristic | D | No | No fire weather index | NWS fire weather / state forestry |
| heat-risk | Heat stress | LIVE | Open-Meteo feels-like | B | Yes | — | — |
| storm-risk | Thunderstorm risk | LIVE / EDITORIAL | NWS alerts + Open-Meteo pop | A | Yes | Forecast leg weaker than NWS | Already integrated NWS; tune priority |
| conservation-news | Stewardship updates | EDITORIAL | Bundle conservation | C | Partial | Pike-only content | Multi-region conservation editorial |
| volunteer-opportunities | Habitat work events | NOT IMPLEMENTED | — | F | No | No calendar API | Partner event feed or honest unavailable |
| invasive-species-alerts | Invasive pests | NOT IMPLEMENTED | — | F | No | No watch API | State invasive species feeds |
| habitat-projects | Restoration projects | EDUCATIONAL | Educational fallback | D | No | No project database | Curated editorial per region |
| recent-fieldry-observations | User field notes | LIVE | localStorage Fieldry | B | Yes | Device-local only | Optional cloud sync |
| favorite-locations | Saved places | LIVE | localStorage | B | Yes | — | — |
| observation-goals | Weekly targets | EDUCATIONAL | Educational fallback | F | No | Not implemented | User goal storage + UI |
| recently-viewed-species | WSKB history | LIVE | localStorage | B | Yes | — | — |

---

## Location flow

| Step | Status | Trust | Issue |
|------|--------|-------|-------|
| Browser geolocation | LIVE | B | No reverse geocode (city name approximate) |
| Manual US location pick | LIVE | B | County centroid, not user point |
| State inference (`wds-us-states.js`) | LIVE | A | — |
| National vs Pike mode | LIVE | A | — |
| Trust banner | LIVE | A | — |

---

## API integrations

| API | Status | Used by | Trust |
|-----|--------|---------|-------|
| Open-Meteo | **Connected** | Weather, sun, moon, UV, wind, rain | B |
| NWS active alerts | **Connected** | OIP, safety, water flood, storm-risk, brief | A |
| AirNow AQI | Not connected | air-quality widget | — |
| USGS IV | Not connected | water widgets | — |
| NOAA tides | Not connected | — | — |
| eBird | Not connected | wildlife | — |
| NPS alerts | Not connected | park-alerts | — |

---

## Remaining engineering tasks (ranked)

| Rank | Task | Impact | Effort | Risk | Dependencies |
|------|------|--------|--------|------|--------------|
| 1 | **AirNow AQI** — replace `pending(air-quality)` | High | Medium | Low | Free API key registration |
| 2 | **USGS IV nearest gauge** — river/stream/temp widgets | High | Medium–High | Medium | HUC lookup, gauge distance labeling |
| 3 | **Automated homepage smoke test** (CI) | High | Low | Low | `docs/HOMEPAGE_SMOKE_TEST.md` |
| 4 | **eBird recent observations** (radius, labeled) | Medium | Medium | Medium | API key, rate limits |
| 5 | **NPS/USFS alerts** for park-alerts, trail-closures | Medium | Medium | Low | Agency API research |
| 6 | **Loader deferral Phase R2** | Medium | Medium | Low | `PERFORMANCE_BASELINE.md` |
| 7 | **Second county content bundle** | Medium | High | Low | Editorial workflow |
| 8 | **USA-NPN phenology** | Medium | High | Medium | Phenology network terms |
| 9 | **Reverse geocoding** for location bar | Low | Medium | Low | Nominatim or Census geocoder |
| 10 | **Bortle / dark sky** | Low | Medium | Low | Light pollution GIS |

---

## Completed this session

1. **NWS active alerts service** (`wds-nws-alerts-service.js`) — point query, 5-min cache, honest empty/unavailable states  
2. **OIP parallel fetch** — alerts merged into `platform.alerts` on every `get()`  
3. **Safety dashboard** — storm risk and general advisories prefer live NWS  
4. **Water dashboard** — flood status uses NWS flood-class alerts  
5. **Morning brief** — NWS warnings elevate verdict to wait  
6. **Catalog widgets** — `storm-risk`, `flood-status` resolve from NWS when active  
7. **Golden/blue hour** — correct `Estimated` integrity tag  

---

## Production confidence

| Dimension | Score |
|-----------|-------|
| Level 1 (wx/sun/moon) | 85% |
| Level 2 safety (NWS alerts) | 70% |
| Level 2 air/water | 15% |
| Ecological integrity (nationwide) | 55% |
| Labeling honesty | 90% |
| **Overall dashboard production readiness** | **68%** |

---

## Regression verification

```bash
# Syntax
node --check design-system/js/weather/wds-nws-alerts-service.js

# NWS API (requires User-Agent)
curl -H "User-Agent: (waypoint.studio, test)" \
  -H "Accept: application/geo+json" \
  "https://api.weather.gov/alerts/active?point=39.9526,-75.1652"

# Browser: clear wds-location-v1, load homepage, confirm OIP fetches alerts
# (Network tab: api.weather.gov/alerts/active)
```

---

*Next sprint: AirNow AQI (rank 1).*
