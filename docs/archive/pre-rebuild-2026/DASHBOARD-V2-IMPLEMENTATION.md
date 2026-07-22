# Dashboard V2 — Implementation Notes

**Status:** RC2 Sprint 3 — Personalized Outdoor Intelligence board  
**Version:** `2.1.0`  
**Entry:** `apps/dashboard/index.html` via recovery shell → `WDS.dashboardV2.render(ctx)`

## Architecture

```
dashboardEngine.buildContext(opts)
        │
        ▼
dashboardV2Model.normalizeFromContext(ctx)
        │
        ├─► dashboardV2Prefs.load() / selectedIds()
        ├─► dashboardV2Widgets (registry + availability)
        ├─► dashboardV2WidgetRender.renderGrouped()
        ├─► dashboardV2Take.generateWaypointsTake()
        └─► dashboardV2Trust.providerRows() / writeCache()
                │
                ▼
        dashboardV2Engine.renderBoard()  ← shared by Dashboard + Kiosk
                │
                ▼
        recovery shell inserts [data-wdb-v2] above detail tabs
```

Legacy Today Outside briefing modules (`briefing`, `activity`, `timeline`, `observe`) remain loaded for compatibility and unit reuse but are **not** the primary V2 surface.

## Shared engine contract

```js
WDS.dashboardV2Engine = {
  loadPrefs, savePrefs, selectedIds,
  buildPayload(ctx, { kiosk }),
  renderBoard(ctx, { kiosk }),
  mount(host, ctx, opts),
  storageKeys(), syncSnapshot(),
  isKioskMode, setKioskMode
}
```

Dashboard orchestrator (`dashboardV2.render`) delegates board HTML to the engine when present so kiosk fullscreen and the main board cannot drift.

## Prefs schema (`waypoint-dashboard-v2-widgets-v1`)

```json
{
  "version": 1,
  "enabled": ["wx-current", "wx-hourly", "..."],
  "order": ["wx-current", "...all widget ids..."]
}
```

- Unknown ids are stripped on load/save
- `order` is normalized to include every catalog id
- Legacy `waypoint-dashboard-v2-prefs-v1.favoritePanels` migrates once into enabled widgets

## Customize UX

- Browse by category with Live/Derived/Planned/Experimental badges
- Toggle enable → immediate save + board refresh
- Drag reorder within category **or** ↑/↓ keyboard buttons
- Reset defaults / Apply / Done

## Take engine summary

Rules push prioritized bullets, then sort and cap (5–8; up to 10 with active hazards):

1. Trust notes (offline / cached / partial)
2. Safety (NWS alerts, flood/heat/fire/storm, elevated AQI, heat/cold stress)
3. Time-sensitive (sunset, golden hour, precip, UV)
4. Current conditions interpretation
5. Photography / hiking summaries
6. Air (when manageable), rivers, seasonal/moon

Padding lines only when live evidence is thin — never fabricated provider readings.

## Widget load states

Each widget card exposes `data-availability` and an availability badge. Bodies:

- **Planned** — explicit “not connected” copy
- **Unavailable** — honest empty state (no invented numbers)
- **Live/Derived/Experimental** — values only from normalized model / heuristics

Independent of tab mount: V2 board renders from the shared context package; detail tabs still mount via recovery as before.

## CSS

`design-system/css/wds-dashboard-v2.css` — header, category grids, widget cards, Take, customize dialog, kiosk density, mobile breakpoints.

## Tests

`automation/test-dashboard-v2.mjs` — persistence, order, category grouping, planned honesty, provider failure Take, kiosk sync snapshot/payload parity, customize keyboard controls.

```bash
node automation/test-dashboard-v2.mjs
```

## Gaps / honest remaining work

- Standalone `kiosk.html` display surface still uses its own panels; Dashboard **Kiosk** button is the shared-engine fullscreen path
- Optional providers still Planned: pollen, smoke, primary pollutant, eBird/migration, water temperature
- Playwright viewport matrix not in repo (unit coverage only)
- Incremental DOM patch on OIP tick still full re-render
- Activity comfort bands exist in prefs defaults but Settings UI for them is deferred
- Dashboard V3 presentation shell exists under `design-system/js/dashboard/v3/` behind `waypoint-dashboard-v3` (**default off**) — maps Alerts→Emergency and Seasonal→Wildlife when opted in; does not change the Sprint 3 V2 catalog

## Related docs

- Product overview: [`DASHBOARD-V2.md`](./DASHBOARD-V2.md)
- Historical Today Outside notes: `docs/dashboard-v2/`
