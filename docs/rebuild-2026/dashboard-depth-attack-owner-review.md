# Dashboard Depth Attack — Owner Review (2026-08-11)

**Branch:** `feature/dashboard-depth-attack`  
**Baseline:** `016ea16c` / main after instrument-panel attack

## Mission answer

Dashboard now answers: *What is happening outside right now, what will happen soon, and is there anything worth knowing before I go outside?*

## Tile inventory (12)

| Id | Title | Group | Default | Honesty |
|----|-------|-------|---------|---------|
| ph-conditions | Conditions | Core | yes (featured) | LIVE |
| ph-next-hours | Next hours | Core | yes (wide) | LIVE |
| ph-doorway | Before you go | Field | yes (wide) | DERIVED |
| ph-alerts | Alerts | Core | yes | LIVE (wired to NWS) |
| ph-air | Air | Air | yes | LIVE |
| ph-precip-window | Rain timing | Weather | yes | LIVE |
| ph-uv | UV | Sky | yes (small) | LIVE + derived band |
| ph-light | Light | Sky | yes | LIVE / Estimated windows |
| ph-astronomy | Astronomy | Sky | yes | PARTIAL / Computed |
| ph-wind | Wind | Weather | no | LIVE |
| ph-comfort | How it feels | Air | no | DERIVED |
| ph-day-range | Today’s range | Weather | no | LIVE |

## Fixes / depth

- Wired `ph-alerts` to OIP NWS package (was always waiting)
- Fixed Light trust inversion (live daylight no longer forced Estimated)
- Condition-aware SVG graphics (sky/aqi/moon/sun/uv/wind/precip/doorway)
- Customize: grouped Add instruments UI (Core / Sky / Air / Weather / Field)
- Sizes: Small / Standard / Wide / Featured
- Default hierarchy without config: Now → Soon → Before you go → Alerts → Air → Rain → UV → Light → Astronomy

## Gates

- `automation/test-dashboard-depth.mjs`
- Existing instrument-panel + surface-isolation + home-rc1 + phase2/3

## Screenshots

`docs/rebuild-2026/screenshots-dashboard-depth/`
