# Waypoint Studio

**Independent software, tools & experiments.**

*Ideas explored through software—some useful, some creative, some simply worth building.*

Waypoint Studio is a place for making things. Some projects become useful tools or finished products. Others remain experiments, prototypes, or personal projects.

## Canonical product direction

**Read first:** [`docs/PRODUCT-DIRECTION.md`](docs/PRODUCT-DIRECTION.md)

| Project | Role (examples) |
|---------|-----------------|
| **Dashboard** | Outdoor conditions & attention tools |
| **Shed Hunting** | Dedicated shed-hunting product (ShedHunting.org) |
| **Waypoint Deck** | Local-first Linux field computer (building) |
| **TerrainBound** | Creative / educational exploration game (building) |
| **Publishing** | Articles & Deep Forest Dispatch |
| **Scenes** | Creative-technology experiment |
| **Global Watch** | Standalone OSINT field test (experiment) |

Future projects can be added to the studio catalog when they exist.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

| URL | What you see |
|-----|----------------|
| [http://localhost:8080/](http://localhost:8080/) | Studio front door / project gallery |
| [http://localhost:8080/apps/dashboard/](http://localhost:8080/apps/dashboard/) | Dashboard |
| [https://shedhunting.org/](https://shedhunting.org/) | Shed Hunting |
| [http://localhost:8080/side-trails/waypoint-deck/](http://localhost:8080/side-trails/waypoint-deck/) | Waypoint Deck |
| [http://localhost:8080/terrainbound/](http://localhost:8080/terrainbound/) | TerrainBound |
| [http://localhost:8080/articles/](http://localhost:8080/articles/) | Articles |
| [http://localhost:8080/apps/scenes/](http://localhost:8080/apps/scenes/) | Scenes (experiment) |

## Studio project catalog

Public gallery entries are data-driven from [`data/studio-projects.json`](data/studio-projects.json).

To add a future project, add a catalog row (title, slug, description, image, status, category, href) — do not rebuild homepage markup by hand.

Statuses: `available` · `building` · `experiment` · `personal` · `open-source` · `archived`

## Repository structure (simplified)

```
/
├── index.html                 # Studio front door (maker gallery)
├── data/studio-projects.json  # Project/status catalog
├── apps/dashboard/            # Dashboard
├── apps/scenes/               # Scenes experiments
├── apps/shed-hunting/         # Shed Hunting engines (canonical host is shedhunting.org)
├── articles/                  # Publishing entry
├── terrainbound/              # TerrainBound game
├── design-system/             # Shared WDS + Studio V2 shell tokens
├── docs/PRODUCT-DIRECTION.md  # Canonical strategy
└── side-trails/               # Deck, Global Watch bridges, unlisted paths
```

## Governance

| Document | Path |
|----------|------|
| **Product direction (canonical)** | [`docs/PRODUCT-DIRECTION.md`](docs/PRODUCT-DIRECTION.md) |
| Product standards | [`docs/PRODUCT_STANDARDS.md`](docs/PRODUCT_STANDARDS.md) |
| App surface architecture | [`docs/APP-SURFACE-ARCHITECTURE.md`](docs/APP-SURFACE-ARCHITECTURE.md) |
| Engineering playbook | [`docs/ENGINEERING-PLAYBOOK.md`](docs/ENGINEERING-PLAYBOOK.md) |

## Requirements

- Modern browser
- No build step for static Studio surfaces
- `python3 -m http.server` or any static file server from repo root
