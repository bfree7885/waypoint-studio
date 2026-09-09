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

## Elevation request limits

Open-Meteo `/v1/elevation` allows **≤100 coordinates** per request. RADAR
`fetchRadarElevations` batches at **80** (same as Search Areas). A brief
regression used **160**, which returned HTTP **400**
(`must not exceed 100 coordinates`) and blocked live aspect enrichment.

Chunked requests may still return **429**; the map retries with backoff and
mild inter-chunk pacing. Live browser proof must not use elevation fixtures
for the main gate.

### Live browser proof status

| Check | Result |
|-------|--------|
| Live Open-Meteo weather | **PASS** (`fresh`) |
| Coordinate-cap defect | **Fixed** — RADAR chunk **80** (was 160 → HTTP 400) |
| Full aspect enrichment | **Still blocked** — after fix, elev sequence starts with **200×8** then sustained **429** (no `Retry-After`); `terrainEnriched` false |
| Classification (post-fix) | **A** external Open-Meteo rate limit on agent IP |
| Fixture used for main proof | **No** |
| Model | Unchanged (+0.20 solar / −0.20 snow steep) |

Re-run `automation/capture-sheds-radar-production-readiness.mjs` from a cool network before publish.

## Deployment

Decision recorded in PR / session report. This doc does not authorize publish.
