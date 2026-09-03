# Sheds data provenance registry

**Status:** V1.9 start of a durable registry for every external dataset Sheds uses.  
**Audience:** owners, engineers, future licensing / Sheds+ / API work  
**Last updated:** 2026-09-03

This is a **product requirement**, not a nice-to-have. Future paid intelligence and any data/API business depend on knowing what we may use, derive, cache, display, and (later) license.

Do **not** assume a dataset can be resold, bundled, or offered as an API merely because the map can fetch it.

When rights are not confirmed in writing for our use, mark **UNVERIFIED**.

Related: data classes in `docs/sheds/SHEDS-PRODUCT-ROADMAP.md` and `docs/sheds/SHEDS-V1-9-CONDITION-SNAPSHOTS.md`.

---

## Data classes (keep distinct)

| Class | Meaning | V1.9 |
| --- | --- | --- |
| **A. Third-party source data** | Weather, elevation, terrain, land cover, snow, map tiles | Used in-app; not resold |
| **B. Sheds-derived data** | Normalized/derived features Sheds produces from A and/or private facts | V1.9: freeze/thaw classification, snow-cover class of measured depth, seasonal phase heuristic. **Not** search-priority scores |
| **C. Private user data** | Scout Spots, Hunt Plans, Hunt Tracks, observations, Shed Found, Hunt Records, notes, Condition Snapshots attached to hunts | Private by default; local only |
| **D. Future explicit opt-in aggregated data** | Crowdsourced / pooled hunter data | **Not implemented.** No upload, no consent flow, no commercialization |

---

## What Open-Meteo receives from Condition Snapshots

Minimum location/time needed for the existing forecast query:

- `latitude` and `longitude` rounded to **4 decimal places**
- the existing `FORECAST_QUERY` field list (current/hourly/daily weather variables, `timezone=auto`, `forecast_days=3`, `past_days=2`)

**Not sent:** Hunt Record ID, Scout Spot ID, Hunt Plan, notes, Shed Found, track points, user identity, or any first-party account token.

Search Areas / Inspect still request Open-Meteo **elevation** for visible-map / inspect coordinates (not Hunt Record IDs). Esri tile servers receive the visible tile `z/x/y` for the map viewport.

---

## Registry

### 1. Open-Meteo Weather Forecast API

| Field | Value |
| --- | --- |
| Provider | Open-Meteo |
| Dataset / API | Forecast API `https://api.open-meteo.com/v1/forecast` |
| Purpose | Today’s Hunt live conditions; V1.9 Condition Snapshots (hunt-start facts) |
| Fields used | `temperature_2m`, `wind_speed_10m`, `surface_pressure`, `precipitation`, `snow_depth` (current + hourly); daily `snowfall_sum`, `precipitation_sum`, `temperature_2m_min/max`, sunrise/sunset |
| Docs | https://open-meteo.com/en/docs |
| License / terms | Data offered as CC BY 4.0; **free API is non-commercial** per https://open-meteo.com/en/terms and https://open-meteo.com/en/licence |
| Commercial-use status | **UNVERIFIED for a future paid Sheds+ product on the free endpoint.** Open-Meteo states commercial use of the hosted API requires a paid customer endpoint (`customer-api.open-meteo.com` + API key). CC BY 4.0 covers the *data* with attribution; it does not by itself authorize unbounded use of their free infrastructure. |
| Redistribution status | **UNVERIFIED** as a standalone weather API / bulk dump. CC BY 4.0 allows sharing with attribution; Open-Meteo terms still restrict free-API commercial use. Do not ship a weather API that is just their response. |
| Derivative-work status | Condition Snapshots store compact normalized facts + documented freeze/thaw classification. Treat that as a Sheds-derived fact layer on third-party source data — **not** a license to resell Open-Meteo. |
| Attribution | Required next to displayed Open-Meteo data: “Weather data by Open-Meteo.com” linking https://open-meteo.com/ (CC BY 4.0). |
| Retention / cache | In-memory 10-minute de-dupe for snapshot fetches. Durable copy only when attached to a private Hunt Record on-device. Today’s Hunt keeps a session weather package in memory, not as a public dataset. |
| Notes | Legacy field `snowMm` is daily `snowfall_sum` in **cm**, not snow depth. `snow_depth` is meters. Do not substitute. Underlying NWP model licenses (GFS, ECMWF, etc.) are **UNVERIFIED** beyond Open-Meteo’s CC BY 4.0 statement. |

### 2. Open-Meteo Elevation API

| Field | Value |
| --- | --- |
| Provider | Open-Meteo |
| Dataset / API | Elevation API `https://api.open-meteo.com/v1/elevation` |
| Purpose | Search Areas per-cell slope/aspect; Inspect elevation; **not** copied into every Hunt Record snapshot |
| Fields used | `elevation` (meters) for requested lat/lng lists |
| Docs | https://open-meteo.com/en/docs/elevation-api |
| License / terms | Same Open-Meteo hosted-API terms as forecast. Open-Meteo documents the DEM as Copernicus DEM 2021 GLO-90 (~90 m). |
| Commercial-use status | **UNVERIFIED** for paid productization on the free endpoint (same customer-API requirement as forecast). Copernicus DEM GLO-90 licence for *derived commercial products* is **UNVERIFIED** — confirm before selling elevation-derived surfaces. |
| Redistribution status | **UNVERIFIED**. Do not harvest DEM tiles for a public elevation API. |
| Derivative-work status | Slope/aspect from a local elevation halo is a Sheds-derived terrain fact for on-device Search Areas. Not a V1.9 Hunt Record field except optional **device GPS altitude**. |
| Attribution | Open-Meteo CC BY 4.0 attribution when elevation/weather from them is shown. Copernicus DEM attribution **UNVERIFIED** beyond Open-Meteo’s documentation. |
| Retention / cache | In-memory / session elevation cache for the visible search grid. Not written into Condition Snapshots. |
| Notes | Hunt-start snapshots do **not** extra-fetch this API. |

### 3. Esri ArcGIS Online basemap tiles

| Field | Value |
| --- | --- |
| Provider | Esri and data partners (USGS, NOAA, GIS User Community, etc.) |
| Dataset / API | World Street Map, World Topo Map, World Imagery, World Boundaries and Places (hybrid labels) via `server.arcgisonline.com` |
| Purpose | Default Street / Topo / Imagery / Hybrid basemap on the Sheds map |
| Fields used | Raster tiles `{z}/{y}/{x}` for the visible viewport |
| Docs / terms | https://www.arcgis.com/home/termsofuse.html · Esri ArcGIS Online item FAQ https://www.esri.com/content/dam/arcgisonline/docs/tou_summary.pdf |
| License / terms | On-map attribution required. Systematic harvest / self-host / redistribute of tiles is prohibited except via Esri Content Packages used with licensed Esri software. |
| Commercial-use status | **UNVERIFIED** for a future revenue-generating Sheds+ app. Esri distinguishes ArcGIS Online vs ArcGIS Location Platform; public tile URLs are not a confirmed commercial license for a paid consumer product. |
| Redistribution status | **Not permitted** to scrape, bundle, or resell the tiles. Offline packs from these URLs are not a V1.9/V3 path. |
| Derivative-work status | Display-only. Do not derive a Sheds terrain product by sampling these raster tiles. |
| Attribution | Existing Leaflet attribution strings (Esri, USGS, NOAA, GIS User Community). Must remain visible on the map. |
| Retention / cache | Browser HTTP cache only. Do not build a tile warehouse. |
| Notes | OSMF public raster is **not** used. Unauthenticated CARTO Voyager is not the default (watermark). |

### 4. USGS NLCD (bundled GIS pack)

| Field | Value |
| --- | --- |
| Provider | U.S. Geological Survey / MRLC (National Land Cover Database) |
| Dataset / API | Bundled compact pack `apps/shed-hunting/gis/packs/pa-pike-milford-v1.json` (NLCD class + edge + slope for a Pike/Milford AOI) |
| Purpose | Habitat / land-cover sampling inside that AOI (existing Search / habitat tools). **Not** written into V1.9 Condition Snapshots. |
| Fields used | NLCD class codes, derived edge distance, slope degrees |
| Docs | https://www.usgs.gov/centers/eros/science/annual-nlcd-data-access · USGS copyrights https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits |
| License / terms | USGS-authored information is generally U.S. public domain. Citation requested, not always required. |
| Commercial-use status | USGS works of the U.S. government are typically usable commercially in the U.S. Pack **derivation pipeline** (how the JSON was built) and any non-USGS inputs remain **UNVERIFIED**. |
| Redistribution status | Public-domain NLCD may be redistributed; confirm the pack contains **only** USGS/public inputs before treating the JSON as a commercial dataset. **UNVERIFIED** for selling the pack as a standalone product. |
| Derivative-work status | Edge metrics and packed JSON are Sheds-derived from NLCD. Habitat scores that use the pack are Sheds-derived intelligence (pre-V1.9) — still not a find probability. |
| Attribution | Credit USGS NLCD / MRLC when land cover is explained to users. |
| Retention / cache | Shipped in-repo; optional `localStorage` pack cache keyed `waypoint-sheds-gis-pack-v1:`. |
| Notes | V1.9 does not add land-cover to Condition Snapshots. |

### 5. USGS 3DEP-derived slope in the GIS pack

| Field | Value |
| --- | --- |
| Provider | USGS 3DEP (via the bundled pack; Search Areas otherwise uses Open-Meteo elevation) |
| Dataset / API | Slope degrees inside `pa-pike-milford-v1.json` |
| Purpose | Habitat slope fallback in pack AOI |
| License / terms | USGS 3DEP is generally public domain; confirm pack build notes. |
| Commercial-use / redistribution / derivative | **UNVERIFIED** as a standalone DEM product. Same caution as NLCD pack. |
| Attribution | USGS 3DEP when this source is cited. |
| Notes | Not stored on Hunt Record snapshots. |

### 6. PASDA / Pennsylvania Game Commission State Game Lands

| Field | Value |
| --- | --- |
| Provider | PASDA (Penn State) distributing Pennsylvania Game Commission State Game Lands |
| Dataset / API | ArcGIS MapServer query `https://mapservices.pasda.psu.edu/server/rest/services/pasda/PAGC_StateGameLands/MapServer/0/query` |
| Purpose | Access **context** overlay only — not habitat weights |
| Fields used | Boundary geometry for the requested bbox |
| Docs | https://www.pasda.psu.edu/ · dataset summary https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=86 |
| License / terms | PASDA presents data as free public access; originating agency disclaimers apply. Commercial reuse of PGC boundaries as a paid GIS layer is **UNVERIFIED**. |
| Redistribution status | **UNVERIFIED**. Do not republish PGC boundaries as a Sheds data product without agency confirmation. |
| Derivative-work status | Display overlay; must not feed habitat or search-priority scores (existing product rule). |
| Attribution | Pennsylvania Game Commission / PASDA. Overlay copy already says to verify current access regulations. |
| Retention / cache | `localStorage` key `waypoint-sheds-sgl-cache-v1` (bbox GeoJSON). |
| Notes | Access context ≠ permission to hunt. |

### 7. Google Fonts (UI only)

| Field | Value |
| --- | --- |
| Provider | Google Fonts CDN |
| Dataset / API | CSS/font files for IBM Plex Sans, Source Serif 4, Cormorant Garamond, Source Sans 3 |
| Purpose | Typography on overview/map HTML — **not** intelligence data |
| License / terms | Fonts under their respective OFL / SIL licenses; CDN request reveals that a browser loaded the page (referrer), not hunt coordinates. |
| Commercial-use status | Font licenses generally allow app embedding; confirm each family’s OFL terms before selling a packaged font file. **UNVERIFIED** only for font *file* redistribution, not for live CDN use. |
| Redistribution | Do not claim Google Fonts as a Sheds dataset. |
| Attribution | SIL OFL reserved-name rules if fonts are bundled later. |
| Notes | Not a Condition Snapshot input. |

### 8. Leaflet

| Field | Value |
| --- | --- |
| Provider | Leaflet (BSD-2-Clause) vendored at `apps/shed-hunting/vendor/leaflet/` |
| Purpose | Map library |
| Commercial-use | Permitted under BSD-2-Clause with copyright notice |
| Notes | Not a geospatial dataset. |

---

## Commercial / licensing unknowns (do not guess)

1. **Paid Sheds+ on Open-Meteo’s free `api.open-meteo.com`** — terms say commercial use needs a customer subscription. Status: **UNVERIFIED / likely not allowed** until a contract exists.
2. **Reselling weather, elevation, or “Sheds condition APIs”** that are thin wrappers of Open-Meteo — **UNVERIFIED / treat as not allowed**.
3. **Esri public basemap URLs inside a paid consumer app** — **UNVERIFIED**; may require ArcGIS Location Platform or another licensed path.
4. **Copernicus DEM GLO-90** (via Open-Meteo elevation) for a commercial derived search-priority surface — **UNVERIFIED**.
5. **PASDA / PGC SGL** as a redistributable commercial layer — **UNVERIFIED**.
6. **Underlying NWP model terms** inside Open-Meteo CC BY 4.0 packaging — **UNVERIFIED**.
7. **GIS pack build pipeline** (exact NLCD vintage, 3DEP processing, any non-USGS cells) — **UNVERIFIED** as a sellable dataset until the build is documented.

V1.9 does not create a B2B API, does not upload user data, and does not monetize private Hunt Records.

---

## What V2.0 still owes legally

Before a dynamic heat map or paid data product ships:

- Confirm Open-Meteo customer API (or self-host AGPLv3 implications).
- Confirm Esri (or replacement) basemap license for the commercial surface.
- Confirm DEM / snow / land-cover licenses for **derived search-priority rasters** (class B), which are not the same as displaying class A tiles.
- Keep class C private user data out of any commercial dataset unless there is explicit opt-in (class D) — not designed in V1.9.
