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

## Elevation rate limits

Chunked Open-Meteo `/v1/elevation` requests may return **429**. Map app retries with exponential backoff (≤5 attempts), uses larger chunks (160), and mild inter-chunk pacing. Live browser proof must not use elevation fixtures for the main gate.

### Live browser proof status (this branch)

| Check | Result |
|-------|--------|
| Live Open-Meteo weather | **PASS** (fresh condition frame in Chrome) |
| Elevation requests wired | **PASS** (Network shows `/v1/elevation` Fetch) |
| Full aspect enrichment | **FAIL in agent env** — Open-Meteo **429** mid-chunk after repeated proofs |
| Classification | **A** environment/provider rate limit (+ **B** mitigated by retry/pacing) |
| Fixture used for main proof | **No** |

Re-run `automation/capture-sheds-radar-production-readiness.mjs` from a non-rate-limited network before publish.

## Deployment

Decision recorded in PR / session report. This doc does not authorize publish.
