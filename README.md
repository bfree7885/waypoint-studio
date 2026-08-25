# Waypoint Studio

**Observe. Discover. Understand.**

*Capture what you find. Learn why it matters.*

Outdoor tools for attention in the field — a coherent Studio, not a pile of unrelated apps.

## Canonical product direction

**Read first:** [`docs/PRODUCT-DIRECTION.md`](docs/PRODUCT-DIRECTION.md)

| Experience | Job |
|------------|-----|
| **Dashboard** | Discover — what’s interesting outdoors / worth exploring |
| **Scenes** | Explore & understand — craft, stories, articles & video |
| **Sheds** | Go — specialized shed-hunting field map & habitat tools |

**Publishing** (articles, Deep Forest Dispatch, content engine) is shared Studio infrastructure, not a fourth consumer product.

**Paused / retired:** Fieldry (paused), OpenRoad PA (retired), Savant (not a priority). Cyber / Global Signals are not standalone Studio apps (research may feed a separate **Waypoint Deck** project later).

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

| URL | What you see |
|-----|----------------|
| [http://localhost:8080/](http://localhost:8080/) | Studio front door |
| [http://localhost:8080/apps/dashboard/](http://localhost:8080/apps/dashboard/) | **Dashboard** |
| [http://localhost:8080/apps/scenes/](http://localhost:8080/apps/scenes/) | **Scenes** |
| [http://localhost:8080/apps/shed-hunting/map/](http://localhost:8080/apps/shed-hunting/map/) | **Sheds** field map |
| [http://localhost:8080/articles/](http://localhost:8080/articles/) | Articles (publishing) |
| [http://localhost:8080/deep-forest-dispatch/](http://localhost:8080/deep-forest-dispatch/) | Visual Earth stories (publishing) |

## Repository structure (simplified)

```
/
├── index.html                 # Studio front door
├── apps/dashboard/            # Discover
├── apps/scenes/               # Explore & understand
├── apps/shed-hunting/         # Field exploration (Sheds)
├── articles/                  # Publishing entry
├── deep-forest-dispatch/      # Owned visual stories
├── design-system/             # Shared WDS + platform
├── docs/PRODUCT-DIRECTION.md  # Canonical strategy
└── side-trails/               # Archived / research (not flagships)
```

## Governance

| Document | Path |
|----------|------|
| **Product direction (canonical)** | [`docs/PRODUCT-DIRECTION.md`](docs/PRODUCT-DIRECTION.md) |
| Product standards | [`docs/PRODUCT_STANDARDS.md`](docs/PRODUCT_STANDARDS.md) |
| App surface architecture | [`docs/APP-SURFACE-ARCHITECTURE.md`](docs/APP-SURFACE-ARCHITECTURE.md) |
| Engineering playbook | [`docs/ENGINEERING-PLAYBOOK.md`](docs/ENGINEERING-PLAYBOOK.md) |
| Content / publishing engine | [`docs/WAYPOINT-CONTENT-ENGINE.md`](docs/WAYPOINT-CONTENT-ENGINE.md) |
| Constitution | [`docs/WAYPOINT-STUDIO-CONSTITUTION.md`](docs/WAYPOINT-STUDIO-CONSTITUTION.md) |

Older roadmaps that describe a “four-instrument” ForageCast/Fieldry portfolio are **historical** — use `PRODUCT-DIRECTION.md` instead.

## Requirements

- Modern browser  
- No build step for static surfaces  
- `python3 -m http.server` or any static file server from repo root
