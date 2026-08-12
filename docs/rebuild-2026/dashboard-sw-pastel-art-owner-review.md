# Dashboard Southwestern pastel identity + unique instrument art

Owner visual review. Screenshots: `docs/rebuild-2026/screenshots-dashboard-sw-pastel/`.
Art matrix (all instruments, live-data-independent): `dashboard-sw-art-matrix.html`.

## What changed

- Dashboard chrome shifted from muted-purple-on-aubergine to **high-desert dusk**: charcoal / volcanic / dusty blue foundations with Southwestern pastel accents (dusty rose, adobe, peach, coral, sand, sage, turquoise, dusty sky). Lavender dusk remains **one astronomy ingredient**, not the product color.
- Active nav is dusty rose / peach underline — no glowing nav bars.
- Today Outside uses charcoal → adobe → peach twilight. Data stays dominant.
- Instrument art is no longer one mountain+sun drawing recolored. Each instrument composes different primitives:
  - **Conditions** — flat-topped high-desert mesas + sage; weather state (clear / storm / snow / …)
  - **Light** — flat horizon + sun; sunrise / day / golden / sunset / blue hour / night afterglow
  - **Air** — receding visibility planes; AQI band
  - **Moon** — close-up cratered disc; real phase + waxing/waning
  - **Precipitation** — rain curtain vs dry virga; probability / intensity / type
  - **Wind** — sage grass + directional flow; speed / direction
  - **Snow** — winter drifts + flakes, not recolored rain
- Mobile remains one column; Moon / Light / Air / Wind / Precip subjects stay on-canvas.

## Live data driving art

| Instrument | Drivers |
| --- | --- |
| Conditions | Sky summary + cloud cover + night context |
| Light | Sunrise/sunset ISO (fallback local hour) |
| Air | US AQI |
| Moon | Phase label, illumination %, synodic `phaseValue` |
| Precipitation | Probability, intensity, snow vs rain from conditions |
| Wind | Speed + direction degrees |
| Alerts | Active flag (lightning only when active) |

## Visual inspect

Captured at 1440 / 768 / 375 / 390 / 430. Art matrix proves uniqueness independent of tonight’s overcast. Live Pike County night is mainly clear — Conditions shows mesas + stars; Light would show night afterglow if that tile is in view.

## Remaining limitations

- Overcast/night live weather is honestly dark; uniqueness is clearest in the art matrix and in daytime/clear/precip states.
- Phase 1 tests still expect historic `data-product-name="Home"` on Dashboard index (pre-existing vs origin/main).
- Global `--wp-aubergine-*` tokens remain for other products; Dashboard overrides `--wp-bg` / `--wds-bg` locally.

## Tests

`automation/test-dashboard-sw-pastel-art.mjs` plus atmospheric / refinement / visual-target / depth gates.
