# Build Pipeline Report

**Sprint:** Production Recovery 1 · 2026-07-19

## Model

Waypoint Studio is a **static site** (no webpack/vite bundler for the design system).

| Stage | Mechanism |
| --- | --- |
| Source of truth | Git repository root |
| CI | `.github/workflows/ci.yml` — static server + smoke + unit validators |
| Deploy | `.github/workflows/pages.yml` — GitHub Pages artifact = repo root (minus `private/`) |
| Metadata | `scripts/inject-build-metadata.mjs` stamps commit into `data/build-info.json` + HTML meta |
| Live intelligence data | Separate publish path → root `data/live.json` + `data/health.json` |

## Asset delivery

- CSS hub: `design-system/css/wds.css` with sibling `@import` modules
- JS hub: `design-system/js/wds.js` sequential script loader (`async=false`)
- Apps may also load platform scripts directly (boot, shell, app-specific modules)

## Failure modes this sprint addresses

| Failure | Cause | Fix |
| --- | --- | --- |
| `/apps/*/data/live.json` 404 | Document-relative `data/live.json` | Site-root `/data/live.json` |
| Deploying broken boot CSS import | Untracked boot CSS | Track `wds-platform-boot.css` + validate |
| Shipping missing HTML/CSS/JS refs | No pre-deploy gate | `validate-production-assets.mjs` in CI + Pages |
| `/map/` 404 | Absolute path + no redirect | `routeHref` + `map/index.html` redirect |

## Honest limits

- There is still an **@import waterfall** (many CSS round-trips). Concatenation would be a future performance sprint, not required for correctness.
- Pages deploy does **not** wait on CI historically for shipping surfaces; this sprint **adds asset validation inside the Pages job** so missing files block that deploy path.
