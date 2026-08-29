# ShedHunting.org — Phase 3B recovery (`sheds-site`)

**Status:** Street default fixed; **not published** (this Cloud Agent token still cannot write `sheds-site`)  
**Date:** 2026-08-29  
**Do not:** flip `shedDedicatedHostEnabled`, add Studio redirects, change `waypointstudio.org` CNAME, create `bfree7885/shedhunting.org`

## 2026-08-29 — Esri Street default (this change)

Default Street is **Esri World Street Map**. `WAYPOINT_MAP_TILE_CONFIG` is an **optional** overlay. Publisher refuses unauthenticated CARTO Street URLs even if some JSON is present.

Write access is still the remaining publish blocker. Do not replace live `shedhunting.org` until a token that can push `sheds-site` is available.

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

Publisher correctly refused (`exit 3`) at that time because dist map HTML had no `waypoint-map-tiles` meta and Street still defaulted to watermarked CARTO. **Superseded:** Street now defaults to Esri World Street Map; the publisher checks the effective Street URL.

### Remaining blockers (exact)

1. **Write access (still blocking publish):** this Cloud Agent token’s `/installation/repositories` is `selected` / `bfree7885/waypoint-studio` only. `git push --dry-run` to `sheds-site` returns `403 Permission … denied to cursor[bot]`. Tag create is 403. Pages metadata is readable. Grant `sheds-site` to a **new** token (or `SHEDHUNTING_DEPLOY_TOKEN` in the agent env). Changing the GitHub App to All repositories did not expand this run’s credentials.
2. **Tile config:** no longer a publish requirement. Do not invent a CARTO API key.

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

1. **No write access** to `bfree7885/sheds-site` (this Cloud Agent token still `selected` / `waypoint-studio` only).
2. Tile secret is **no longer required**. Street defaults to Esri World Street Map. Do not invent a CARTO API key.

Owner unblock (minimum):

1. Issue a token that includes `bfree7885/sheds-site` (new Cloud Agent after the App actually lists that repo, **or** `SHEDHUNTING_DEPLOY_TOKEN` in the agent environment).
2. Then: `node scripts/prepare-shed-hunting-host.mjs` and `node scripts/publish-shed-hunting-host.mjs` (or workflow **Publish Shed Hunting host**). Confirm `/installation/repositories` lists `sheds-site` before publishing.

Do not change Namecheap DNS. Preserve MX/SPF. Keep `sheds-site` Pages on branch `main` (do not switch to Actions Pages — that ignores the `CNAME` file).

## Studio (unchanged)

- `CNAME` = `waypointstudio.org`
- `shedDedicatedHostEnabled` = `false`
- Public Shed Hunting still `/apps/shed-hunting/`
