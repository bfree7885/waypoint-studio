# TerrainBound public hosting

TerrainBound is a standalone static site. It is **not** the Waypoint Studio Pages project.

This repository's root `CNAME` is `waypointstudio.org`. Do not replace it.

## Observed production state (2026-09-12)

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
| Server-side runtime | **none** (static files only) |
| Live cache-bust observed | `?v=p77` (Phase 7.7; last-modified 2026-09-10). **Not** the 7.9I/7.9J field-test branch. |

GitHub Pages cannot run `terrainbound/server/summit-proxy.mjs`. The Groq key must stay off the client, off git, and off Pages. The loopback proxy is **development / supervised field-test only** (`127.0.0.1`, CORS limited to localhost).

Do not put `terrainbound.org` in this repository's root `CNAME`. Do not deploy the field-test RC to Pages in this phase.

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

## DNS (already attached; do not change in this phase)

GitHub Pages apex:

```
@  A     185.199.108.153
@  A     185.199.109.153
@  A     185.199.110.153
@  A     185.199.111.153
www CNAME  bfree7885.github.io
```

Preserve MX/SPF if email forwarding is in use.

## Rollback

Companion Pages rollback is an operator action on `bfree7885/terrainbound-site`, not a CNAME swap in this repo.

## Cache

Cache-bust query: `?v=p79j` on `main.js` / `game.js`.
