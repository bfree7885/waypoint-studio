# Sheds RADAR — Production Readiness

Branch: `cursor/sheds-radar-production-readiness`  
Studio main baseline: `1db1ca34d5f71bc3dabebac2a9050e4fe107d4b6` (P2 merged)  
Scope: inspection + small cleanup only. **No deploy. No P3.**

## Product surface (normal users)

Visible: **Today**, **Landscape**, status line, Show Pike AOI, tap explain, standard map controls.

Hidden unless query-gated:

| Flag | Effect |
|------|--------|
| (none) | Interest surface always on; proof fixtures hidden; Interest On/Off hidden |
| `?radarProof=1` | Cold / Thaw / Neutral evidence fixtures |
| `?radarDebug=1` | Interest On/Off toggle; `radarP0=0` may disable surface |

Internal CDP/test hook: `WaypointShedsMapApp._radarP0` (not product UI).

## Clock-skew freshness

`FUTURE_SKEW_MS = 5 minutes` in `sheds-radar-condition-frame.js`.

- `fetchedAt` ≤ now + 5 min → age clamped to ≥ 0 (still subject to 75 min fresh window)
- `fetchedAt` > now + 5 min → **stale** (no unlimited freshness)

## Host prepare

`scripts/prepare-shed-hunting-host.mjs` copies `apps/shed-hunting` → `dist/shedhunting/` with exclusions for `host/`, `antler-options`, evidence/sample dirs, and a post-scan forbidding proof/report/fixture/docs leaks. Required RADAR runtime files are asserted present.

Does **not** publish shedhunting.org.

## Tests

`automation/test-sheds-radar-production-readiness.mjs` — gates A–L.

## Model (unchanged)

- Solar: **+0.20**
- Snow steep: **−0.20**
- No positive snow boost on RADAR unit path

## Elevation / pack terrain

Open-Meteo `/v1/elevation` is **not** used for normal Pike RADAR.

RADAR terrain now comes from the GIS pack:

- `slopeDeg` (existing, USGS 3DEP–derived)
- `aspectCardinal` (uint8 0–8, coarse ~90 m, same 3DEP DEM at pack build)

Steep snow eligibility on the RADAR unit path uses pack `slopeDeg >= 22°`
(same `STEEP_PENALTY` gate as SearchPriority `featureKind === "steep"`).

Search Areas / Inspect may still call Open-Meteo elevation.

Weather remains Open-Meteo forecast.

Raw DEM is **not** shipped in the pack.

### Live browser proof status

| Check | Result |
|-------|--------|
| Pack aspect | Required for Pike RADAR |
| Normal RADAR elev requests | Must be **0** |
| Live weather | Open-Meteo forecast |
| Model | Unchanged (+0.20 / −0.20) |

## Deployment

Decision recorded in PR / session report. This doc does not authorize publish.

## Deployment

Decision recorded in PR / session report. This doc does not authorize publish.
