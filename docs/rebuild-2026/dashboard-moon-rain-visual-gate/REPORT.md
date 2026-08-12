# Dashboard moon + rain visual gate

Branch: `fix/dashboard-moon-rain-visual-gate` (from production `main`)

## Root cause (why previous work failed owner review)

Production Dashboard uses **Southwestern pastel instrument art** in
`wds-dashboard-rebuild-graphics.js` — not the parallel `feature/dashboard-moon-accuracy`
MoonPhase rewrite.

1. **Moon:** `moonDisc()` used a two-circle mask *and* painted unmasked maria/crater
   ellipses whenever illumination ≤ 2%. At **1% New Moon** those interior blobs read as
   illuminated surface. Separately, `illumPct === 1` was sometimes treated as a unit
   fraction and scaled to **100%** (full disk).
2. **Rain Timing:** `precipGraphic()` could feed **peak** probability into artwork when
   “now” was missing, and `precipArt()` drew **virga streaks for any prob &lt; 18%** —
   so NOW 0% / PEAK 7% still looked like rain.

## Fixes

### Moon renderer
- Replaced mask+texture moon with orthographic lit-area path only:
  terminator `x = (1 − 2k)·√(1 − y²)`, waxing lit right / waning lit left.
- Paint: dark disk + solid lit path + faint rim. **No craters, maria, glow, or blobs.**
- Illumination scaling: values in `(0, 1)` may be fractions; **exact `1` stays 1%.**

### Rain renderer
- Artwork authority is **NOW** probability / observed intensity — never peak alone.
- Bands: 0–10 dry (no streaks), 11–30 clouds only, 31+ curtain, stronger above 60/80.
- `rainCurtain()` hard-stops streak paths at ≤10% unless intensity is active.

## Test pages (local only)

- `docs/rebuild-2026/dashboard-moon-rain-visual-gate/phase-harness.html`
- `docs/rebuild-2026/dashboard-moon-rain-visual-gate/dashboard-fixtures.html`
- `docs/rebuild-2026/dashboard-moon-rain-visual-gate/moon-closeups.html`

## Screenshots inspected

| File | Viewport | Result |
|---|---|---|
| `moon-closeups.png` | large disks | 0→1→3→25→50→75→100 progression clear; opposite limbs |
| `harness-desktop-1440.png` | 1440 | Full ladder + dry rain fixtures |
| `harness-mobile-390.png` | 390 | Same geometry, readable |
| `fixtures-desktop-1440.png` | 1440 | Live acceptance: 1% hairline crescent; 0%/7% **zero** streaks |
| `fixtures-mobile-390.png` | 390 | Same fixture state |

DOM audit on fixtures: `l-1.8` rain paths = **0**; moon `data-illum="1"`; no texture ellipses.

## Visual gate answers

| Question | Answer |
|---|---|
| Does 1% moon LOOK ~1% illuminated? | **YES** — hairline crescent |
| Is ~99% of the disk visibly dark? | **YES** |
| Decorative blobs mistaken for illumination? | **NO** — texture removed |
| Does 0% rain show ZERO falling rain? | **YES** |
| Mobile communicates the same states? | **YES** |
| Inspected actual rendered screenshots? | **YES** |
