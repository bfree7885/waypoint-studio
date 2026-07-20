# Dashboard V3 — Architecture (quick reference)

See **[OUTDOOR-INTELLIGENCE-DASHBOARD.md](../OUTDOOR-INTELLIGENCE-DASHBOARD.md)** for the full developer guide.

```
apps/dashboard/index.html
        ↓
home-boot → contentEngine → dashboardEngine → recovery
        ↓
┌─ dashboardV3.render(ctx)     [flag: waypoint-dashboard-v3]
│     shell: Header → Brief → Widgets → Customize → Footer
│     contract + layout engine
│     reuses dashboardV2 model / prefs / take / widget bodies
└─ fallback: dashboardV2 board  [v3 flag "0"]
        ↓
OIP parallel providers → incremental hydrate (unchanged)
```

## Versioning

- DOM: `data-dashboard-version="3"` on `.wdb-v3`
- `WDS.dashboardV3.VERSION` = `3.0.0`
