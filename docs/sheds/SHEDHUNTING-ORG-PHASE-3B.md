# ShedHunting.org — Phase 3B recovery (`sheds-site`)

**Status:** Stopped before live overwrite  
**Date:** 2026-08-29  
**Do not:** flip `shedDedicatedHostEnabled`, add Studio redirects, change `waypointstudio.org` CNAME, create `bfree7885/shedhunting.org`

## Architecture (this recovery)

| Role | Location |
|------|----------|
| Canonical source | `bfree7885/waypoint-studio` |
| Generated artifact | `dist/shedhunting/` |
| Deploy target | `bfree7885/sheds-site` |
| Public domain | `https://shedhunting.org/` (already attached to `sheds-site`) |

Do **not** create `bfree7885/shedhunting.org`.

## Safety audit (2026-08-29)

| Item | Value |
|------|--------|
| Default branch | `main` |
| HEAD SHA | `238cbe15b3a74ce8b278574137a82997edaeafc6` (2026-03-10, “Update project state for development continuity”) |
| Pages | `legacy` / branch `main` / path `/` |
| Custom domain | `shedhunting.org` (keep) |
| HTTPS cert | Let’s Encrypt approved, expires 2026-11-23, apex only, **not** enforced |
| `CNAME` file | `shedhunting.org` |
| Workflow | `.github/workflows/publish.yml` — field-notes publisher on `publish.json` only (not Pages) |
| This App’s access | **read/clone public only; `permissions.push: false`; tag create 403** |

### Unique content not in waypoint-studio

Preserved in git history at the HEAD SHA above (no force-push):

- `briefs/late-winter-whitetail-movement.html`
- `briefs/winter-weather-pressure-2026.html`
- `heatmap/generate_heatmap.py` (and a committed `.venv` that must not be redeployed)
- `fieldview.html`, `field-guide/`, `api/observations.json` (one dummy observation near 39.5, −98.2)
- Legacy docs: `PRODUCT.md`, `PAYWALL.md`, `DEVELOPMENT_PLAN.md`, `PROJECT_STATE.md`

These are the March 2026 “Terrain Intelligence” prototype, not the current Shed Hunting product. Replacing **deployed** files is intended; **history** at `238cbe15` is the rollback.

Rollback tag the publisher will try to push: `legacy-terrain-intelligence-2026-03-10`.

## Why overwrite did not run

1. **No write access** to `bfree7885/sheds-site`.
2. **Tile config** `WAYPOINT_MAP_TILE_CONFIG` is not available in this environment. Live CARTO Voyager defaults paint **API KEY REQUIRED** into tiles. Publisher refuses a watermarked public replace.

Owner unblock (minimum):

1. Grant the Cursor GitHub App access to **`bfree7885/sheds-site`**, **or** set waypoint-studio secret `SHEDHUNTING_DEPLOY_TOKEN` with `contents:write` on `sheds-site`.
2. Ensure waypoint-studio secret `WAYPOINT_MAP_TILE_CONFIG` is non-empty JSON (same secret Studio Pages already references). This agent cannot list secrets (403). If it is empty, set it before cutover.

Then: `node scripts/prepare-shed-hunting-host.mjs` and `node scripts/publish-shed-hunting-host.mjs` (or workflow **Publish Shed Hunting host**).

Do not change Namecheap DNS. Preserve MX/SPF. Keep `sheds-site` Pages on branch `main` (do not switch to Actions Pages — that ignores the `CNAME` file).

## Studio (unchanged)

- `CNAME` = `waypointstudio.org`
- `shedDedicatedHostEnabled` = `false`
- Public Shed Hunting still `/apps/shed-hunting/`
