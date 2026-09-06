# Sheds V2.0 Phase 1 — Search Priority Today

**Status:** Model foundation in development (not wired to production map UI).  
**Baseline:** Studio main at housekeeping merge (PR #80).  
**Brand / Option K / host publish:** closed — do not revisit in this increment.

## Product question

Inside my **active Search Area**, given the terrain/habitat evidence we actually have and **today’s** derived conditions, **where should I spend relatively more time?**

This is **relative search interest**, not find probability.

## Explicitly not

- Shed / antler probability
- Deer location prediction
- Evidence that sheds exist at a coordinate
- A guarantee of success
- A replacement for field judgment
- A universal 0–100 “shed score”
- Decorative wash when spatial data is missing

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Stronger search interest** | Relatively more attention inside this Search Area today |
| **Moderate search interest** | Mid relative attention inside this Search Area today |
| **Lower search interest** | Relatively less attention inside this Search Area today |
| **Insufficient spatial data** | No defensible base terrain/habitat priority for this cell/area |
| **Limited conditions** | Some condition inputs missing; modifiers may be skipped |

Avoid: hotspot, likely shed, shed probability, chance of finding, sheds are here.

## Layered architecture

```
RAW INPUTS (weather package, elev neighbors, GIS sample)
    → FACTS (temps, snow depth known?, slope°, aspect°)
    → DERIVED CONDITIONS (freeze/thaw, snow class, temp trend, season category)
    → BASE SPATIAL PRIORITY (V1.3 terrain feature OR Phase-2 GIS band)
    → SEARCH PRIORITY MODIFIERS (condition × spatial only)
    → RELATIVE BAND (stronger / moderate / lower)
    → later: VISUALIZATION (not in Phase 1 foundation)
```

Do not collapse these into one opaque score.

## Base priority paths

### Path A — GIS pack available

Use existing habitat GIS band for the cell (`limited` / `some` / `stronger` from `WaypointShedsHabitatGis`).

Do not invent new habitat classes.

### Path B — No GIS pack; terrain priority available

Use existing V1.3 search-priority feature priority (`Higher` / `Moderate` / `Lower` from `WaypointShedsSearchPriority`).

### Path C — Insufficient spatial data

Return `status: "insufficient_spatial"`. Do not manufacture a wash.

## Condition modifiers (Phase 1)

Modifiers consume **already-derived** condition facts. They do **not** call weather APIs.

A modifier is allowed only when it changes **relative** value of one spatial class versus another inside the same Search Area.

### Implemented

| Id | When | Spatial interaction | Effect |
| --- | --- | --- | --- |
| `solar_searchability` | `freezeThawStatus === "freeze_thaw"` **or** `tempTrendStatus === "warming"` | Cell has southish aspect (`S` / `SE` / `SW`) with usable slope | +δ to southish cells (snow/ice leave sun-facing ground sooner — searchability, not wildlife) |
| `snow_practicality` | Measured snow `limiting` or `deep` | Feature kind / slope class present | −δ on `steep`; +δ on `bench` / gentle walkable kinds (effort under deep snow) |

### Considered but rejected (Phase 1)

| Idea | Why rejected |
| --- | --- |
| Global “good day” boost on every cell | Does not change *where* inside the area |
| Season category alone as a spatial reorder | Season is area-wide; no spatial discriminator |
| Habitat structure × weather without aspect | Habitat GIS module forbids weather weights; packs lack aspect |
| Personal hunt history / observations | Explicitly out of scope for Phase 1 |
| LLM / AI scoring | Non-deterministic; not allowed |
| New external APIs | Not required for foundation |

If aspect is null (too flat) or snow depth unknown, the related modifier is **skipped** (not invented).

## Output shape (per cell)

```js
{
  status: "ready" | "insufficient_spatial",
  band: "stronger_interest" | "moderate_interest" | "lower_interest" | null,
  score: number | null,           // relative numeric for ordering/tests
  base: {
    source: "gis" | "terrain" | "none",
    label: string | null,         // e.g. Higher / some
    score: number | null
  },
  modifiers: [{ id, delta, reason }],
  reasons: string[],              // human-readable, matches applied modifiers + base
  inputsUsed: string[],
  limited: boolean,               // partial condition inputs
  flags: { /* honesty */ }
}
```

Area helper may aggregate cells and report whether ordering is condition-sensitive.

## Normalization

1. Map base label → score `{Higher|stronger: 2, Moderate|some: 1, Lower|limited: 0}`.
2. Apply modifier deltas (typically ±1 each; clamp final score to `[0, 3]`).
3. Band thresholds on final score:  
   - `≥ 2` → stronger_interest  
   - `≥ 1` → moderate_interest  
   - else → lower_interest  

Bands are **relative communication aids**, not probabilities.

## Degraded / missing data

| Situation | Behavior |
| --- | --- |
| No base spatial priority | `insufficient_spatial` |
| Weather/conditions object missing | Base only; `limited: true`; no modifiers |
| Snow depth unknown | Skip `snow_practicality` |
| Aspect null | Skip `solar_searchability` |
| Partial freeze/thaw or trend | Use only statuses that are known; skip others |
| Stale snapshot | Caller responsibility; model is pure given inputs |

## Determinism

Identical Search Area cells + identical condition snapshot ⇒ identical outputs. No randomness, no network, no hidden globals.

## Integration gate

Production map / Today’s Hunt UI wiring is **out of scope** until this foundation is reviewed and accepted.

## Acceptance proof

Controlled fixture with mixed aspects/feature kinds must show that Condition Set A vs B can change **relative ordering** of at least two zones for a defensible reason (see automation tests).
