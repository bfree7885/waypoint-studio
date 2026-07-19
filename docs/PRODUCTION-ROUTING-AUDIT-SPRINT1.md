# Routing Audit — Recovery Sprint 1

## Canonical map

| Public intent | Canonical URL |
| --- | --- |
| Studio home | `/` |
| Dashboard | `/apps/dashboard/` |
| Sheds map | `/apps/shed-hunting/map/` |
| Legacy `/map/` | **Redirects** → `/apps/shed-hunting/map/` via `map/index.html` |
| Photo Coach | `/apps/photo-coach/` (Scenes stubs redirect) |
| ForageCast | `/apps/foragecast/` |

## Repairs

1. **`WDS.platformFoundation.routeHref`** — leading `/` stripped to app-relative (`/map/` → `map/`).
2. **Foundation JSON** — ready routes use relative paths (`map/`, not `/map/`).
3. **Legacy bookmark** — `/map/` now serves a redirect page (GitHub Pages has no server rewrite API).
4. **Scenes stubs** — photo-coach / hidden-landscapes / photo-library redirect to live apps (prior repair).

## Validation

```bash
node automation/validate-production-links.mjs
```

Last local run: **0 broken**, **0 warnings**.

## Remaining routing risks

- Any hard-coded absolute paths in content markdown or future foundation files must stay relative or use full `/apps/...` intentionally.
- External bookmarks to deleted surfaces still hit branded `404.html` (acceptable).
