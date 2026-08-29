# ShedHunting.org — Phase 3B recovery (`sheds-site`)

**Status:** Stopped before live overwrite (resume recheck 2026-08-29)  
**Date:** 2026-08-29  
**Do not:** flip `shedDedicatedHostEnabled`, add Studio redirects, change `waypointstudio.org` CNAME, create `bfree7885/shedhunting.org`

## Resume recheck (2026-08-29, after owner said blockers were addressed)

Both publish prerequisites are **still missing**. No files were written to `sheds-site`. Live `https://shedhunting.org/` is still the March 2026 Terrain Intelligence site.

| Check | Result |
|------|--------|
| GitHub App installation | `repository_selection: selected`, **1 repo**: `bfree7885/waypoint-studio` only |
| `sheds-site` `permissions.push` | `false` |
| `git push` to `sheds-site` | `403 Permission to bfree7885/sheds-site.git denied to cursor[bot]` |
| Tag `legacy-terrain-intelligence-2026-03-10` | API 403; tag **not** created |
| Agent env `SHEDHUNTING_DEPLOY_TOKEN` | unset |
| Agent env `WAYPOINT_MAP_TILE_CONFIG` | unset |
| Studio Pages secret (run `33194284224`, 2026-08-28) | workflow env dump shows `WAYPOINT_MAP_TILE_CONFIG:` **empty** (not masked `***`) |
| `shedhunting-host.yml` on default branch | **no** — `workflow_dispatch` 404; cannot use Actions secrets from this branch |
| `shedDedicatedHostEnabled` | `false` |
| Studio `CNAME` | `waypointstudio.org` |
| `sheds-site` HEAD | still `238cbe15b3a74ce8b278574137a82997edaeafc6` |
| Pages | `legacy` / `main` / `cname: shedhunting.org` / `https_enforced: false` |
| Live `/` | `200` title **Sheds \| Terrain Intelligence for Shed Hunting** (`Last-Modified: 10 Mar 2026`) |
| Live `/map/` | `404` |

Publisher correctly refused (`exit 3`) because dist map HTML has no `waypoint-map-tiles` meta.

### Remaining blockers (exact)

1. **Write access:** add `bfree7885/sheds-site` to the Cursor GitHub App installation (selected repos), **or** put a PAT with `contents:write` on `sheds-site` in **this Cloud Agent environment** as `SHEDHUNTING_DEPLOY_TOKEN`. A GitHub Actions secret on waypoint-studio is **not** visible here. `gh secret list` is 403. The publish workflow is also not on `main`, so `gh workflow run shedhunting-host.yml` cannot run until that file exists on the default branch.
2. **Tile config:** set `WAYPOINT_MAP_TILE_CONFIG` to **non-empty JSON** (starts with `{`) in the environment that will generate `dist/shedhunting/`. Latest Studio Pages deploy injected an empty value, and this agent has no env var. Do not publish CARTO Voyager defaults (those tiles paint **API KEY REQUIRED**).

Rollback SHA to keep (do not force-push): `238cbe15b3a74ce8b278574137a82997edaeafc6`.

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
