# Dashboard semi-realistic field art pass

Branch: `feat/dashboard-semi-realistic-art`  
Graphics version: `5.2.0-semi-realistic-field-art`

## Intent

Keep Dashboard structure, palette, luminous edges, layout, and corrected moon/rain data rules. Upgrade instrument SVG art from flat geometric illustration toward semi-realistic atmospheric field art.

## Changes

- Organic cloud families: cirrus / cumulus / stratus / storm / fog (distinct silhouettes)
- Air: receding terrain ridges + particulate haze + soft far blur (no stacked ellipses)
- UV / Light: soft atmospheric bloom (no geometric ring sun icon)
- Astronomy: illumination-accurate lit path preserved; clipped maria/crater texture only when lit ≥ ~8%
- Precip: atmospheric streak depth; NOW ≤10% remains `precip-dry`
- Alerts: quiet landscape vs hazard-aware atmospheres (event hint from data)
- Subtle film grain overlay across scenes

## Validation

- `node automation/test-dashboard-semi-realistic-art.mjs`
- `node automation/test-dashboard-sw-pastel-art.mjs`
- `node automation/test-dashboard-atmospheric-art.mjs`
- Visual matrix: `docs/rebuild-2026/dashboard-semi-realistic-art-matrix.html`
- Screenshots: `docs/rebuild-2026/dashboard-semi-realistic-art-screenshots/` (390 / 430 / 768 / 1440 / 1728)
