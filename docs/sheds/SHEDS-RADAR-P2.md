# Sheds RADAR P2 — Live current-condition Today surface

**Status:** Implemented on Studio feature branch (draft PR). **Not** published to shedhunting.org.  
**Depends on:** RADAR P1 continuous base landscape (`WaypointShedsRadarBaseLandscape`).

## Product concept

```text
STATIC LANDSCAPE (P1)
+ CURRENT CONDITION FRAME (shared Weather derivation)
+ SPATIALLY SELECTIVE MODIFIERS
= TODAY relative search-interest surface
```

This is **not** shed probability, encounter probability, deer prediction, or ML.

## Condition frame

Module: `apps/shed-hunting/js/sheds-radar-condition-frame.js`

- **Does not** call Open-Meteo.
- Adapts existing `WaypointShedsWeather` package and/or Condition Snapshot.
- Freshness threshold: **75 minutes** (`FRESH_MS`) — mid of the 60–90 min inspection band.
- Missing snow depth ≠ zero. Snowfall cm is never treated as depth.

RADAR scoring consumes `RadarConditionFrame` → `toModelConditions()` → `SearchPriorityToday.evaluateCell`.

## Scoring (unit / RADAR path)

```text
todayScore = clamp01(landscapeScore + Σ applicable deltas)
```

| Modifier | Trigger | Spatial gate | Delta |
|----------|---------|--------------|-------|
| `solar_searchability` | `freeze_thaw` **or** `warming` | S/SE/SW and slope ≥ 2° | **+0.20** |
| `snow_practicality` | snow `limiting` **or** `deep` | `featureKind === steep` | **−0.20** |

**Positive snow boost on benches/gentle/transition is removed from the RADAR unit path.** Gentler ground is relatively favored only because it is not suppressed.

### Legacy tri-scale (Search Areas / Phase 1)

Unchanged: model Δ ±1, including **+1** snow on bench/gentle/transition. Documented split so Search Area regression stays intact.

## Water / developed

- Water (`landscapeScore === 0` / water flag): **locked at 0** — conditions cannot resurrect it.
- Developed remains suppressed by the P1 base; modifiers must not create absurd hotspots.

## Today vs Landscape

| Mode | Meaning |
|------|---------|
| **Today** | P1 base + live condition modifiers when frame is **fresh** and actionable |
| **Landscape** | P1 static base only |

Customer UI uses **Today / Landscape** — not P0/P1/P2. Controlled fixtures A/B/N are evidence-only (`?radarProof=1`).

### Fallback

If weather is unavailable, offline, or **stale**: show **Landscape** and say so honestly. Missing snow alone does not invalidate solar when freeze/thaw or warming is known.

## Cache separation

| Cache | Key ideas | Invalidates when |
|-------|-----------|------------------|
| Static base | pack, bounds, zoom, scorer | viewport / pack change |
| Terrain | elev hash + bounds | viewport change |
| Condition frame | lat4,lng4 + fetchedAt + freshness | weather refresh / stale |
| Today surface | base + terrain + frame | any of the above |

Condition changes must **not** rebuild GisPack or refetch elevation.

## Weather reuse

`ensureWeatherForView` → existing Open-Meteo fetch → Weather package → RadarConditionFrame. One weather point for ~4.5 km viewport; terrain supplies spatial differentiation.

Map refresh also treats weather older than **75 minutes** as needing refresh (in addition to ~0.5° anchor movement).

## Evidence

`docs/sheds/samples/radar-p2/`

- `distribution-report.json` — Landscape / cold / thaw / neutral metrics
- `live-proof.json` — real Open-Meteo attempt (ok or environmental block)

## Production blockers (remaining)

- Live browser TODAY/LANDSCAPE screenshots on a network that can reach Open-Meteo
- Hide remaining prototype chrome (`radarP0Enabled` query, proof hooks, Interest toggle wording polish)
- shedhunting.org publish decision (out of scope for this PR)

## Exclusions

No playback, forecast animation, SNODAS, nationwide packs, Field Signals, personal history, access scoring, ML/LLM scoring, brand redesign, or production deploy in this milestone.
