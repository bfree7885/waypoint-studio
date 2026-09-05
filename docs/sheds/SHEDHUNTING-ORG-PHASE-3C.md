# ShedHunting.org — Phase 3C (Waypoint Studio cutover)

**Status:** Studio cutover source is ready for owner review. Do not merge or deploy Waypoint Studio until reviewed.  
**Date:** 2026-08-30  
**Canonical portfolio:** `docs/PRODUCT-DIRECTION.md`

This phase makes **Waypoint Studio** treat `https://shedhunting.org` as the canonical public Shed Hunting product. It does **not** change DNS, Pages/CNAME, MX/SPF, or republish `bfree7885/sheds-site`.

## What is live (already verified on the dedicated host)

- `https://shedhunting.org/` overview
- `https://shedhunting.org/map/` field map
- Esri Street default, no API KEY REQUIRED watermark
- Powered by Waypoint branding
- March 2026 Terrain Intelligence site is gone

## Origin flag

| Field | Value |
|-------|--------|
| `shedDedicatedHostEnabled` | **`true`** |
| `studioOrigin` | `https://waypointstudio.org` |
| `shedOrigin` | `https://shedhunting.org` |

Keep `design-system/ecosystem/origin-config.json`, `nav-registry.json` origins, `wds-app-nav-config.js` origins, and `wds-origins.js` in sync. Then `node scripts/sync-shed-hunting-wds.mjs`.

## Navigation

Primary **Shed Hunting** → `https://shedhunting.org/`  
Secondary map links → `https://shedhunting.org/map/`

Public nav order is unchanged: Dashboard · Shed Hunting · Deck · Articles · Support · About. Scenes stays unpublished.

## Legacy Studio routes

GitHub Pages **cannot** emit HTTP 301/308. Cutover is static:

| From | Target | Mechanism |
|------|--------|-----------|
| `/apps/shed-hunting/` | `https://shedhunting.org/` | `noindex` + canonical + hostname-aware `location.replace`. No meta refresh (this document is also the local/CI overview). |
| `/apps/shed-hunting/map/` | `https://shedhunting.org/map/` | Same JS helper. No meta refresh — this file is copied into `dist/shedhunting/map/` and must not refresh itself. |
| `/sheds/` | `https://shedhunting.org/` | `noindex` + canonical + meta refresh + `location.replace` + visible fallback |
| `/map/` | `https://shedhunting.org/map/` (direct, no Studio hop) | `noindex` + canonical + meta refresh + `location.replace` + visible fallback |

The JS helper stays on:

- `shedhunting.org` / `www.shedhunting.org`
- `data-shed-host="1"`
- `?local=1` (Export JSON on the old Studio map)
- loopback (`localhost`, `127.0.0.1`) so local development and CI smoke still load the product

Alias pages (`/map/`, `/sheds/`) pass `forcePublic: true` so they still cut over on loopback.

## SEO

On Waypoint Studio:

- Legacy Shed routes are `noindex, follow`
- Canonical/OG point at the matching shedhunting.org URL
- `sitemap.xml` no longer lists Studio Shed URLs

On dedicated-host **source generation** (`scripts/prepare-shed-hunting-host.mjs`):

- `robots.txt` Allow `/`
- `sitemap.xml` lists `/` and `/map/`
- Host overview and map are `index, follow` with shedhunting.org canonicals
- Dist `/map/` strips the Studio cutover fallback `<div id="sheds-studio-cutover">` **and** its `showFallback` script with an exact script match. A replace of `id="…"…</div>` leaves a broken `<div` that turns the next `<script>` into visible page text. A `[\s\S]*?showFallback` script replace is also wrong: it starts at the earlier head `redirectLegacyStudio` script and eats `</head>` / CSS.

This phase does **not** push those generate changes to `sheds-site`. Live host files stay as last published until an explicit republish. The pre-cutover republish is a separate owner-local `sheds-site` push; prefer that over `publish-shed-hunting-host.mjs` for metadata-only passes. Tag `legacy-terrain-intelligence-2026-03-10` is an immutable historical cutover marker (not a rolling pointer); each publish records the previous sheds-site commit SHA for rollback.

## Data migration

localStorage does not cross origins. Export JSON / Import JSON remains the path.

Copy on legacy routes:

> Existing field data can be moved by exporting from the old Waypoint Studio Shed Hunting page and importing it at ShedHunting.org.

`/apps/shed-hunting/map/?local=1` stays on Studio for export. No cross-origin sync.

## Tests

- `automation/test-shedhunting-phase3c-cutover.mjs`
- `automation/test-shedhunting-host-readiness.mjs`
- Existing `automation/test-sheds-*.mjs` product regressions
