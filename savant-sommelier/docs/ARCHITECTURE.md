# Architecture

Savant Sommelier is a local foundation for land discovery and later viticulture analysis. This version draws a real basemap and reserves the analysis panels. It does not invent listings, parcels, suitability scores, grape lists, or climate projections.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Web UI | React, TypeScript, Vite | Typed interface, fast local dev, room for later map layers |
| Map | MapLibre GL JS | Vector basemap, no vendor lock-in, future parcel and climate layers can be added as sources |
| Basemap | OpenFreeMap positron | Free vector tiles, no API key, required attribution included |
| API | Python, FastAPI, Pydantic | A clear boundary so the browser cannot fabricate scientific results |
| Tests | pytest, Vitest | Lock the “not connected” contract |
| Later database | PostgreSQL + PostGIS | Parcel polygons, spatial indexes, and a path from New York and Pennsylvania to the rest of the country |

The API starts with no `DATABASE_URL`. If a URL is present, health reports `configured_unused` and does not open a connection. The URL is never returned to the browser.

## What is real

- OpenFreeMap vector tiles, with OpenMapTiles and OpenStreetMap attribution
- The scale bar and navigation control, which describe the basemap
- A coordinate the user clicks or types
- A rectangular camera frame around New York and Pennsylvania

## What is not connected

- Property listings
- Parcel boundaries and ownership
- Vineyard suitability
- Grape varieties
- Climate projections, including 2050 and later

The web app refuses a payload that claims an integration is connected, includes search hits, or marks a panel as anything other than `not_connected`.

## Region expansion

The first camera frame lives in `shared/honesty.json` as `ny-pa`. Adding a state later is a new registry entry plus a data adapter. The UI does not contain a scoring formula.

Store future geometries in EPSG:4326. When area, slope, or distance math is added, calculate it in a projected system such as EPSG:5070 (NAD83 / Conus Albers) and keep the stored geometry in latitude and longitude. The camera frame is not a state boundary and must not be used as one.

Planned PostGIS tables, with no rows in this foundation:

- `parcels` — `geom geometry(MultiPolygon, 4326)`, source, vintage
- `listings` — provider, external id, parcel link, status
- `climate_normals` and `climate_scenarios` — variable, horizon, source, geometry or raster reference
- `grape_requirements` — variety, cited thresholds, citation

No migration is applied automatically.

## Adapters

Future integrations should sit behind the API:

- listings
- parcels
- suitability
- varieties
- climate

Each one stays `not_connected` until that source is approved and cited. The browser reads status. It does not calculate suitability.

## Privacy

Search text and coordinates are not written to disk. A database URL in the environment is not echoed. There is no account system in this foundation.
