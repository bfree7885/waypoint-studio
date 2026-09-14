# TerrainBound public hosting

TerrainBound is a standalone static site. It is **not** the Waypoint Studio Pages project.

This repository's root `CNAME` is `waypointstudio.org`. Do not replace it.

## Production baseline (2026-09-13)

First public release with Summit. Source SHA `db2b7cc04bcbcd548657b5daa5addd42520c0eff`. Published site SHA `1618cd695e0b6b8b6473867671678c0895eb4ca1`. Tag `terrainbound-summit-production-2026-09`.

## Observed production state (2026-09-13)

`https://terrainbound.org/` serves a **static** TerrainBound build from the companion GitHub Pages repository `bfree7885/terrainbound-site`.

| Fact | Value |
| --- | --- |
| Source repo for the live site | `bfree7885/terrainbound-site` (public; copies `terrainbound/` from this repo) |
| Canonical game source | this repo, folder `terrainbound/` |
| Studio Pages repo | `bfree7885/waypoint-studio` → `https://waypointstudio.org/` (`CNAME` `waypointstudio.org`, Actions Pages) |
| terrainbound.org Pages | GitHub Pages **legacy** (branch `main`, site root `/`) |
| Custom domain | `terrainbound.org` (HTTPS enforced); `www` 301s to the apex |
| Apex DNS | GitHub Pages A records `185.199.108.153`–`185.199.111.153` |
| `www` DNS | CNAME `bfree7885.github.io` |
| Server-side runtime on Pages | **none** (static files only) |
| Summit language layer | Cloudflare Worker at `https://terrainbound-summit.bfree7885.workers.dev` (separate origin; not Pages) |
| `summit.terrainbound.org` | **Deferred** — not required for production Summit |
| Live cache-bust | `?v=p8ds` on `main.js` / `game.js` (Dark Sky Basin Topic 11 RC). Prior Summit-only live cache was `?v=p79l`. |

GitHub Pages cannot run the Summit gateway or hold `SUMMIT_API_KEY`. The Groq key stays in the Worker secret store (or the local loopback proxy for development). Ordinary Cedar Hollow play on `terrainbound.org` uses the production Worker and does not need `?summit=fieldtest`.

Do not put `terrainbound.org` in this repository's root `CNAME`. Publish static files with `terrainbound/scripts/publish-static.mjs`. See `docs/SUMMIT-PRODUCTION.md`.

## Field-test delivery (Phase 7.9J)

Supervised human tests use a **local** one-command build:

```bash
npm run fieldtest:summit
```

Printed URL:

```
http://127.0.0.1:8086/terrainbound/?summit=fieldtest
```

Credentials load from gitignored `terrainbound/data/summit/.env` (`SUMMIT_API_KEY`). See `docs/SUMMIT-FIELD-TEST.md`.

## Older parking note (2026-09-09)

Before the companion Pages attach, Namecheap parked the domain (`192.64.119.222` / `parkingpage.namecheap.com`). That is no longer the live DNS.

## Required host (unchanged)

GitHub Pages companion repository:

- Repo: `bfree7885/terrainbound-site`
- Pages: branch `main`, site root `/`
- Custom domain: `terrainbound.org`
- Publish the contents of `terrainbound/` (not the Studio repo root)

## DNS (Pages apex already attached)

GitHub Pages apex:

```
@  A     185.199.108.153
@  A     185.199.109.153
@  A     185.199.110.153
@  A     185.199.111.153
www CNAME  bfree7885.github.io
```

Preserve MX/SPF if email forwarding is in use.

Do not change Pages A records. `summit.terrainbound.org` is a deferred DNS enhancement, not a release blocker. Production Summit currently uses the Worker `workers.dev` URL. Details: `docs/SUMMIT-PRODUCTION.md`.

## Rollback

Companion Pages rollback is an operator action on `bfree7885/terrainbound-site`, not a CNAME swap in this repo.

## Cache

Cache-bust query: `?v=p8ds` on `main.js` / `game.js`.

Production Summit language layer is a Cloudflare Worker at `https://terrainbound-summit.bfree7885.workers.dev/summit`. Pages never holds `SUMMIT_API_KEY`. See `docs/SUMMIT-PRODUCTION.md`.
