# TerrainBound public hosting

TerrainBound is a standalone static site. It is **not** the Waypoint Studio Pages project.

This repository's root `CNAME` is `waypointstudio.org`. Do not replace it.

## Observed production state (2026-09-09)

`https://terrainbound.org/` does **not** currently serve the game.

DNS (Namecheap registrar `dns1.registrar-servers.com` / `dns2.registrar-servers.com`):

| Name | Type | Value |
| --- | --- | --- |
| `@` | A | `192.64.119.222` (Namecheap parking) |
| `www` | CNAME | `parkingpage.namecheap.com` |
| `@` | TXT | SPF for Namecheap email forward |

HTTP `terrainbound.org` 302-forwards to `www.terrainbound.org`, which is a Namecheap parking / auction lander. HTTPS on the apex timed out. There is no GitHub Pages A/AAAA set and no CNAME to `*.github.io`.

No service workers ship with TerrainBound. Asset URLs are relative (`./css`, `./js`, `./data`) and are safe if the `terrainbound/` folder is published as the **site root**.

## Required host

GitHub Pages companion repository (same pattern as other dedicated domains). Suggested:

- Repo: `bfree7885/terrainbound-site` (or equivalent)
- Pages: branch `main`, site root `/`
- Custom domain: `terrainbound.org`
- Publish the contents of `terrainbound/` (not the Studio repo root)

Do not put `terrainbound.org` in this repository's root `CNAME`.

## DNS to attach after Pages is ready

GitHub Pages apex:

```
@  A     185.199.108.153
@  A     185.199.109.153
@  A     185.199.110.153
@  A     185.199.111.153
www CNAME  <github-user>.github.io
```

Optional IPv6 AAAA records from GitHub's current Pages docs. Preserve MX/SPF if email forwarding is in use.

These registrar changes cannot be made from this repository.

## Rollback

Pre-launch parking is the current live state. After a successful attach, the rollback is:

1. Restore the companion Pages repo to the annotated tag `terrainbound-prelaunch-2026-09` (created on the source SHA before first publish).
2. Or restore Namecheap parking A/`www` CNAME records recorded above.

## Cache

Cache-bust query: `?v=p77` on `main.js` / `game.js`.
