# Savant Sommelier

Savant Sommelier is a local foundation for discovering land and, later, learning which wine grapes can grow there. The first version is a map you can move, a property search box, and panels for parcel details, vineyard suitability, grape varieties, and future climate.

The opening view frames **New York and Pennsylvania**. The basemap itself continues nationwide. Analysis data is not loaded for any region yet.

This folder is a new application inside the Waypoint Studio repository. It is not linked from the Studio homepage or the primary navigation. The older files in `apps/savant-sommelier/` are unchanged.

## What you can trust on this screen

| On screen | Status |
| --- | --- |
| Basemap tiles from OpenFreeMap | Real. Attribution stays visible. |
| A coordinate you click or type | Real. It is only a coordinate. |
| New York and Pennsylvania frame | A rectangle for the opening camera. Not a state boundary and not a parcel. |
| Property search | Not connected. No listings are retrieved. |
| Parcel details | Not connected. No boundaries are drawn. |
| Vineyard suitability | Not connected. No score is calculated. |
| Grape varieties | Not connected. No varieties are listed. |
| Future climate | Not connected. No 2050 projection is shown. |
| Database | Not required. If a URL is set, it is not used. |

## Launch

From the repository root:

```bash
./savant-sommelier/scripts/dev.sh
```

Open **http://127.0.0.1:5173**

The same command starts the analysis API at **http://127.0.0.1:8000**. Interactive API docs are at **http://127.0.0.1:8000/docs**. The map still works if you start only the web app and the API is down. Search will say the service is not running, and the panels stay labeled “Not connected.”

The first launch installs Python and Node dependencies if they are missing. To install without starting the app:

```bash
./savant-sommelier/scripts/setup.sh
```

## Tests and build

```bash
./savant-sommelier/scripts/test.sh
```

That runs the API tests, the web tests, and the production build.

## Recommended stack

| Piece | Choice |
| --- | --- |
| Interface | React, TypeScript, Vite |
| Map | MapLibre GL JS |
| Tiles | [OpenFreeMap](https://openfreemap.org) positron style. No API key. © OpenMapTiles. Data from [OpenStreetMap](https://www.openstreetmap.org/copyright). |
| API | Python and FastAPI |
| Later database | PostgreSQL with PostGIS |

React and MapLibre keep the map and the explanation panels in one typed interface. FastAPI is the gate for any future parcel, climate, or variety work, so the browser does not invent scientific results. PostGIS is the right store once parcel polygons exist. It is not installed or queried in this version.

More detail is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Project layout

```
savant-sommelier/
├── README.md
├── shared/honesty.json          # Shared map frame and “not connected” copy
├── docs/ARCHITECTURE.md
├── frontend/                    # React app
├── backend/                     # FastAPI app
└── scripts/                     # setup, dev, test
```

## How to use the first screen

1. Wait for the basemap. The opening view shows New York and Pennsylvania.
2. Pan or zoom if you want. Use **Show New York and Pennsylvania** to return.
3. Type a place into Property search. The app reports that no listings were retrieved.
4. Click the map, or type a latitude and longitude. The parcel panel records that coordinate and still says parcel records are not connected.

## Not in this version

No paid API keys, no deployment, and no scientific data. Soil, climate normals, variety thresholds, and property listings wait for a later decision.
