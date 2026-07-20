# Performance Improvements — Sprint 9

## Volunteer

- Discover boot watch (18s) with retry instead of indefinite busy
- Geolocation capped (~8s) before sample-region fallback
- Search input debounced (~140ms)
- Weather still via resilience cache (Open-Meteo)
- Catalog remains small demo JSON — full filter scan is fine

## Landscape Interpretation

- Offline rule evaluation (no remote layers)
- Boot watch until taxonomy + rule pack load
- Preset evaluation is synchronous after first paint

## Console / network

- Systemic relative `wds-*.css` 404s from axe crawls remain a platform measurement issue; app pages load design-system CSS via absolute-relative `/design-system/css/` links as before.

## Deferred

- Indexed search if live regional catalogs arrive
- Map marker clustering at higher densities
- Rule-pack code-splitting by region
