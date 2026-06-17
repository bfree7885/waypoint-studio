# Waypoint Studio

**Observe. Understand. Create. Share.**

Digital field laboratories for people who love nature — not social media, not dashboards, not technology for its own sake.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

| URL | What you see |
|-----|----------------|
| [http://localhost:8080/](http://localhost:8080/) | **Waypoint Studio** homepage — trailhead |
| [http://localhost:8080/apps/waypoint-scenes/](http://localhost:8080/apps/waypoint-scenes/) | **Waypoint Scenes** — living photographs studio |

Other experiences have placeholder pages under `apps/`.

## Repository structure

```
/
├── index.html              # Waypoint Studio homepage
├── assets/                 # Shared ecosystem imagery
├── css/                    # Root homepage styles
├── design-system/          # WDS + WEF (shared)
├── docs/                   # Constitution, Method, blueprint, agents
└── apps/
    ├── waypoint-scenes/    # Runnable app (Living Scene, Parallax, …)
    ├── foragecast/
    ├── fieldry/
    ├── shed-hunting/
    ├── steepleaf/
    ├── savant-sommelier/
    ├── signalterrain/
    └── terrainbound/
```

## Governance

| Document | Path |
|----------|------|
| Constitution (supreme law) | [`docs/WAYPOINT-STUDIO-CONSTITUTION.md`](docs/WAYPOINT-STUDIO-CONSTITUTION.md) |
| Waypoint Method | [`docs/WAYPOINT-METHOD.md`](docs/WAYPOINT-METHOD.md) |
| Experience blueprint | [`docs/ECOSYSTEM-BLUEPRINT.md`](docs/ECOSYSTEM-BLUEPRINT.md) |
| Design system | [`design-system/README.md`](design-system/README.md) |
| Content engine | [`docs/WAYPOINT-CONTENT-ENGINE.md`](docs/WAYPOINT-CONTENT-ENGINE.md) |
| Field guide standard | [`docs/FIELD-GUIDE-STANDARDS.md`](docs/FIELD-GUIDE-STANDARDS.md) |
| AI agents | [`docs/ai-agents/README.md`](docs/ai-agents/README.md) |

## Waypoint Scenes

The first shipping experience — see [`apps/waypoint-scenes/README.md`](apps/waypoint-scenes/README.md).

## Requirements

- Modern browser
- No build step
- `python3 -m http.server` or any static file server from repo root
