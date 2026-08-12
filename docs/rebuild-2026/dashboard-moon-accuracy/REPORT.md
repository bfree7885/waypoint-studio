# Dashboard moon accuracy — rendering-level fix

Branch: `feature/dashboard-moon-accuracy`

## Data path (astronomy → pixels)

1. **Source.** Live engine `data/live.json` → `feed.moon.{phase, illumination, phaseValue}` and Open-Meteo daily `moonPhase` via `wds-daylight-utils.js` (`moonPhaseFromDate` / `moonIlluminationPercent`).
2. **Adapter.** `wds-live-engine-feed.js` `toDaylight()` copies `moonPhase`, `moonIllumination`, `moonPhaseValue` onto the daylight package.
3. **Parser.** `wds-dashboard-rebuild-data.js` `moonInput()` prefers daylight, then liveFeed.moon, then platform.moon.
4. **lunarState.** `WDS.dashboardLunar.normalize()` / `WDS.MoonPhase.normalize()`:
   - printed `illumination` (0–100) is authoritative for the mask
   - `phaseValue` (lunation 0–1) drives limb / waxing-waning / phase label
   - `k = illumination/100`; `α = acos(2k−1)`; terminator offset `cos α = 2k−1`
5. **UI.** Astronomy facts (`Moon`, `Illumination N%`) and `Lunar.renderDisk(lunarState)` share that one object.
6. **Renderer.** Orthographic unit disk. Lit iff `s·x ≥ (1−2k)·√(1−y²)`. SVG path is sampled limb + terminator polygon; surface + maria are **clip-masked** to that path. Unlit disk is near-black (`#07040c`). No full-disk glow.

Northern-hemisphere convention (default when lat missing or ≥ 0): waxing lit on the **right**, waning on the **left**. Southern lat flips the disk. Hemisphere is not invented when lat is absent.

## Exact root cause

Two rendering bugs, not a data bug. Live numbers already said New moon / 3%.

**A. Empty-path full fill.** `litPath()` returned `""` at k≈0, then `renderDisk` treated `!path` as “draw the lit gradient over the whole circle.” 0% New Moon rendered as a full cream disk. Near-new (3%) used a two-arc SVG whose area was not the disk fraction k.

**B. Two-arc terminator ≠ illuminated area.** Previous “invert the sweep” patch (`7d1f02cd`) flipped crescent vs gibbous *look*, but:
- elliptical `rx` was not the orthographic terminator for k = (1+cos α)/2
- unlit fill `#140e1c` plus maria/glow still read as a lit moon
- 3% could still look like a large pale disk

The printed 3% was never inverted in the data layer. The **geometry** was wrong.

## New logic

Reusable `WDS.MoonPhase` (`dashboardLunar`):
- `k ∈ [0,1]` = visible **disk** fraction
- terminator x = `(1−2k) √(1−y²)`
- polygon = far limb semicircle + terminator ellipse samples
- raster + path-area tests require |measured − k| ≲ 0.03 at the 3% / 97% ends

Painted SVG (Chrome canvas): **3% → 4.6% lit pixels**, **50% → 50.0%**, **97% → 97.4%**.

## Rain timing

Rebuild catalog has no separate “Rain Timing” tile. Precip art lived on **Conditions** (`skyKind` / rain icon) and `current.precipitation.probability` was the **daily forecast** (often 20%), not now.

Fix:
- NOW = first hourly POP (fallback current)
- PEAK = max hourly, labeled as future when higher than now
- bands: dry &lt;15%, low 15–39%, possible 40–59%, likely 60–79%, active ≥80% or measurable rain
- rain/storm **icons only** when band is possible/likely/active
- 1% now + 5% at 3 AM → “Precip now 1% · Very low / dry” and “Precip peak 5% at 3 AM”; sun icon, not rain

## Other art audit (contradictions only)

| Tile | Finding | Change |
|---|---|---|
| Conditions | Rain glyph on dry/1% POP | Band-gated sky icon; now vs peak facts |
| Air | AQI band already matched | none |
| Alerts | Empty copy when none | none |
| Astronomy | 3% disk mostly lit | MoonPhase mask |
| Light | Windows match daylight | none |
| Today Outside | “new moon” text already matched numbers | none |
| UV | No dedicated rebuild tile | none |

## Validation

Viewports captured: 375, 430, 768, 1440, 1728. Mobile 375/430 one-column. Moon circular, 3% thin waning crescent on live Astronomy, texture clipped, no text overlap.

Harness (not public): `docs/rebuild-2026/dashboard-moon-accuracy/moon-phase-harness.html`

## Gates

1 YES 0% dark  
2 YES 3% thin crescent  
3 YES 25% crescent  
4 YES 50% half  
5 YES 75% gibbous  
6 YES 100% full  
7 YES waxing ≠ waning  
8 YES live Astronomy uses same lunarState as numbers  
9 YES live 3% New Moon is a sliver, not mostly lit  
10 YES Rain Timing / Conditions: 1% is dry, not active rain  
11 YES other art audited  
12 YES contradictions corrected  
13 YES live-data preserved  
14 YES Waypoint visual language preserved  
15 YES mobile one column  
16 YES visually inspected rendered PNGs (not tests only)
