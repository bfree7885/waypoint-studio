# Waypoint Studio

**Learn · Go outside · Observe.**

Digital field laboratories for people who love nature — an outdoor intelligence and environmental education platform, not a collection of utility apps.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

| URL | What you see |
|-----|----------------|
| [http://localhost:8080/](http://localhost:8080/) | **Regional dashboard** — Pike County Preview trailhead |
| [http://localhost:8080/apps/foragecast/](http://localhost:8080/apps/foragecast/) | **ForageCast** — flagship habitat & season laboratory |
| [http://localhost:8080/apps/fieldry/](http://localhost:8080/apps/fieldry/) | **Fieldry** — private WOS field notebook (local MVP) |
| [http://localhost:8080/design-system/species/profile.html?id=morchella-americana](http://localhost:8080/design-system/species/profile.html?id=morchella-americana) | **WSKB** — species profile (shared knowledge base) |
| [http://localhost:8080/apps/waypoint-scenes/](http://localhost:8080/apps/waypoint-scenes/) | **Waypoint Scenes** — creative reflection from field photographs |

Other directories under `apps/` hold **content track concepts** and shared-module previews — not equal standalone products. See [Strategic Direction](docs/STRATEGIC-DIRECTION.md).

## Core platform

One regional laboratory with specialized instruments:

1. **Dashboard** — what is happening outdoors this week  
2. **ForageCast** — why species appear where and when they do  
3. **Fieldry** — structured observations building toward research-grade records  
4. **Scenes** — honest photography and visual storytelling  

Beginning with **Pike County Preview** until county-specific bundles and observation capture ship.

## Repository structure

```
/
├── index.html              # Regional outdoor dashboard
├── design-system/          # WDS, OIP, WOS, WSKB, WEF, ethics, integrity
├── docs/                   # Constitution, strategic direction, architecture
└── apps/
    ├── foragecast/         # Flagship application
    ├── fieldry/            # WOS field notebook (local MVP)
    ├── waypoint-scenes/    # Creative studio (live)
    └── …                   # Content track & module previews (not equal products)
```

## Governance

| Document | Path |
|----------|------|
| Strategic direction | [`docs/STRATEGIC-DIRECTION.md`](docs/STRATEGIC-DIRECTION.md) |
| Theory of change | [`docs/WAYPOINT-THEORY-OF-CHANGE.md`](docs/WAYPOINT-THEORY-OF-CHANGE.md) |
| Platform architecture | [`docs/PLATFORM-ARCHITECTURE.md`](docs/PLATFORM-ARCHITECTURE.md) |
| Product portfolio audit | [`docs/PRODUCT-PORTFOLIO-AUDIT.md`](docs/PRODUCT-PORTFOLIO-AUDIT.md) |
| Constitution | [`docs/WAYPOINT-STUDIO-CONSTITUTION.md`](docs/WAYPOINT-STUDIO-CONSTITUTION.md) |
| Observation standard (WOS) | [`docs/WAYPOINT-OBSERVATION-STANDARD.md`](docs/WAYPOINT-OBSERVATION-STANDARD.md) |
| Outdoor ethics (WOES) | [`docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md`](docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md) |
| Research integrity | [`docs/RESEARCH-INTEGRITY.md`](docs/RESEARCH-INTEGRITY.md) |

## Requirements

- Modern browser  
- No build step  
- `python3 -m http.server` or any static file server from repo root
