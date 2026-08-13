# Dashboard V1 visual finish — owner report

Branch: `feat/dashboard-v1-visual-finish`  
Graphics version: `5.3.0-v1-visual-finish`  
Base: production `main` @ `3eadd0be` (Instrument Depth)

## Intent

Final V1 visual consistency pass only — replace cartoon/placeholder art weaknesses, restrain composition, bump tiny secondary type, quiet Details affordance. No new instruments, no IA/intelligence changes, moon renderer untouched.

## Art states replaced / corrected

| State | Before risk | After |
| --- | --- | --- |
| Cloud families | One reusable soft blob feel | Distinct cirrus / cumulus(3 variants) / stratus / storm / fog with soft SVG blur |
| Alerts · none | `cloudBank("light")` weather-icon cloud | Calm atmospheric horizon + ridges only |
| Rain · dry (≤10% NOW) | Light cloud bank | Clear dry atmosphere/horizon; no streaks; no cloud icon |
| Conditions clear/partly | Adequate | Slightly stronger mesa + light; still outdoor feel |
| Next Hours | Tick-mark mini-infographic | Transition-aware atmospheres (`stable`, `clearing`, `clouds-building`, `rain-approaching`, `day-evening`) |

## Composition / type / Details

- Art footprint tightened toward right ~30–40% with stronger left wash; Air/UV/Light/Astronomy keep a slightly fuller plane.
- Optional stable `data-art-span="compact|wide"` CSS hooks (no grid jumping).
- Secondary labels bumped only: family `0.75rem`, category `0.6875rem`, WIND/HUMIDITY/PRECIP `0.7rem`, depth fact labels `0.75rem`.
- Details affordance → `Details ›` (quiet, no bright CTA); aria/keyboard/Escape/customize omit preserved.

## Fixtures

- Matrix: `docs/rebuild-2026/dashboard-v1-visual-finish-matrix.html`
- Comparison checklist: `docs/rebuild-2026/dashboard-v1-visual-finish-compare.html`
- Gate: `automation/test-dashboard-v1-visual-finish.mjs` (also CI)

## Preserved

- Air / UV / Light quality markers
- Astronomy lunar geometry / illumination / waxing-waning
- Precip NOW honesty (0–10% ⇒ `precip-dry`)
- Palette, luminous edges, grid architecture

## Feature opportunities (documented only — not built)

- Derive hours transition from solar altitude / civil twilight when available
- Registry wiring of `data-art-span` per instrument size
- CI screenshot diffs against the fixture matrix
