# Dashboard V2 — Architecture

```
apps/dashboard/index.html
        ↓
home-boot.js → contentEngine → dashboardEngine
        ↓
dashboardRecovery.renderDashboard()
        ↓
┌─ dashboardV2.render(ctx)  [flag: waypoint-dashboard-v2]
│     model.normalizeFromContext
│     briefing.build / activity / timeline / observe / trust
│     render.* → HTML
└─ recovery tabs (V1 widgets, lazy mount)
        ↓
OIP parallel providers → incremental hydrate
```

## Modules

| Module | Role |
|--------|------|
| `wds-dashboard-v2-model.js` | Boundary validation, location labels |
| `wds-dashboard-v2-briefing.js` | Today Outside rules + traces |
| `wds-dashboard-v2-activity.js` | Suitability + windows |
| `wds-dashboard-v2-timeline.js` | 24h events |
| `wds-dashboard-v2-observe.js` | Mission-linked observation cards |
| `wds-dashboard-v2-trust.js` | Cache + provider status rows |
| `wds-dashboard-v2-prefs.js` | `waypoint-dashboard-v2-prefs-v1` |
| `wds-dashboard-v2-render.js` | Presentation |
| `wds-dashboard-v2.js` | Feature flag + orchestration |

## Versioning

- Internal: `data-dashboard-version="2"` on `.wdb-v2`
- `WDS.dashboardV2.VERSION` = `2.0.0`
- V1 recovery remains; flag `"0"` restores V1 summary header

## Migration

V2 is additive. No URL changes. Disable via `localStorage.setItem('waypoint-dashboard-v2','0')`.

> Superseded for **presentation shell** by V3 — see `docs/OUTDOOR-INTELLIGENCE-DASHBOARD.md`. Model/briefing modules below remain relevant.
