# ShedHunting.org — Phase 2 (preparation)

**Status:** Preparation only · do **not** activate `shedhunting.org`  
**Date:** 2026-08-29  
**Canonical portfolio:** `docs/PRODUCT-DIRECTION.md`

This document is the Phase 2 contract. It is **not** a cutover runbook to execute now.

Phase 2 prepares the existing Shed Hunting application so it can later run from a dedicated origin **without rebuilding the product**. It does **not** change DNS, the `waypointstudio.org` CNAME, production redirects, or public `https://shedhunting.org` links.

---

## What Phase 2 is / is not

| Do | Do not |
|----|--------|
| Origin-aware configuration with the dedicated-host flag **off** | DNS / registrar / CNAME changes |
| Path and asset independence for overview + map | Deploy a second site |
| Document future routes, redirects, SEO, hosting | Merge or deploy this work as a live domain |
| Classify localStorage and plan migration | Build a complex migration importer unless a tiny export already exists |
| Focused dedicated-host shell (generated artifact) | Copy the entire Studio homepage/nav onto ShedHunting.org |
| Keep Scenes as a **contact** category | Restore Scenes to public discovery |
| Tests for current production **and** future-host readiness | Rename internal `WaypointSheds*` engines or storage keys |

---

## Origin / config architecture

**Source of truth:** `design-system/ecosystem/origin-config.json`

| Field | Phase 2 value | Meaning |
|-------|----------------|---------|
| `studioOrigin` | `https://waypointstudio.org` | Waypoint Studio |
| `shedOrigin` | `https://shedhunting.org` | Future dedicated host (not active) |
| `shedDedicatedHostEnabled` | **`false`** | Public hrefs stay on Studio |

Runtime helpers:

- `design-system/js/platform/wds-origins.js` — `WDS.origins.*`
- Vendored copy: `apps/shed-hunting/vendor/wds/wds-origins.js` (map + dedicated host; no `../../../design-system` traversal)
- Studio primary nav reads `origins` from `nav-registry.json` / `wds-app-nav-config.js` via `WDS.appNav.shedHuntingPublicHref()`

**Until the flag is true, `shedHuntingPublicHref()` returns `/apps/shed-hunting/`.** Tests fail if public HTML/nav emits `https://shedhunting.org`.

Sync the WDS subset after design-system CSS/helper changes:

```
node scripts/sync-shed-hunting-wds.mjs
```

---

## Asset / path architecture

**Problem:** overview used `../../design-system/...`; map used `../../../design-system/css/wds-experience-v2.css`. Those depths break if the app is served from `/` and `/map/` on another host.

**Smallest clean approach (not a DS fork):**

1. **Production overview** (`/apps/shed-hunting/`) stays on the Studio shell and may keep Studio-relative design-system URLs. It is not the dedicated-host document.
2. **Production map** vendors only `wds-experience-v2.css` + `wds-origins.js` under `apps/shed-hunting/vendor/wds/`. Map CSS/JS/Leaflet/GIS stay app-owned. Studio support pages use **site-root** `/support.html` (etc.) plus `data-studio-path` so a dedicated host can rewrite them to `studioOrigin`.
3. **Dedicated-host artifact** is generated, not hand-duplicated:

```
node scripts/prepare-shed-hunting-host.mjs
```

Writes `dist/shedhunting/` (gitignored): `/` overview, `/map/` field map, copied `css/`, `js/`, `gis/`, `data/`, `vendor/`. The generate step rewrites Studio legal/support hrefs to `https://waypointstudio.org/...` and forbids leftover `../../design-system` traversal.

The in-repo preview `apps/shed-hunting/host/` is **noindex** and `robots` Disallow. It is not the public entrance.

Essential map CSS/JS do **not** fetch `waypointstudio.org` at runtime. Fonts may still use Google Fonts (same as today).

---

## Future route contract

Dedicated host (Phase 3, not now):

| URL | Job |
|-----|-----|
| `https://shedhunting.org/` | Overview — **Should I go shed hunting today?** |
| `https://shedhunting.org/map/` | Field map — **Where should I look?** |

Support / About / Privacy / Terms / Contact stay on **Waypoint Studio** (`https://waypointstudio.org/support.html`, …). ShedHunting.org links to them as Studio pages (Powered by Waypoint), not a second legal stack.

Current Studio paths **must keep working** until Phase 3:

| Current | Role today |
|---------|-----------|
| `/apps/shed-hunting/` | Public overview |
| `/apps/shed-hunting/map/` | Field map |
| `/sheds/` | Silent redirect to the **map** (legacy) |
| `/map/` | Silent redirect to the **Sheds map** |

`/map/` is a **route conflict risk**. Today it is Shed Hunting’s map, not a generic Studio map. Phase 3 must not invent a different Studio `/map/` without an explicit redirect decision.

---

## Cross-product navigation

**Waypoint Studio (flag false today):** primary nav **Shed Hunting** → `/apps/shed-hunting/`. After Phase 3 flag-on: `https://shedhunting.org/`.

**ShedHunting.org (artifact / Phase 3):** focused product chrome only:

- Brand: ShedHunting.org
- **Powered by Waypoint** → `https://waypointstudio.org/`
- Support, About, Privacy, Terms (and Dashboard / Articles as honest outbound jobs)
- No Studio portfolio nav (no Deck / Articles / Dashboard as equal primary peers)

The field map stays immersive. Escape is the overview (`../` today, `/` on the dedicated host).

---

## localStorage / state audit

Moving from `waypointstudio.org` to `shedhunting.org` is a **new origin**. Browser storage does **not** copy automatically.

### A — Shed Hunting-specific; new origin starts empty (safe if user accepts a fresh device)

| Key | Module | Notes |
|-----|--------|--------|
| `waypoint-sheds-map-view-v1` | `sheds-observation-store.js` | Map camera |
| `waypoint-sheds-model-prefs-v1` | same | Model weights / presets |
| `waypoint-sheds-basemap-v1` | `sheds-tile-provider.js` | Basemap choice |
| `waypoint-sheds-sgl-cache-v1` | `sheds-sgl-overlay.js` | Rebuildable cache |
| `waypoint-sheds-gis-manifest-v1` + `waypoint-sheds-gis-pack-v1:*` | `sheds-gis-pack.js` | Rebuildable pack cache |
| `waypoint-sheds-first-run-coach-v1` | `sheds-ux-polish.js` | Coach dismiss |
| `waypoint-sheds-gps-denied-v1` | `sheds-map-app.js` | Permission sticky |
| `waypoint-sheds-heat-ui-v1` | `sheds-map-app.js` | Overlay UI |
| `waypoint-sheds-ethics-seen-v1` | `sheds-map-app.js` | Ethics ack |

### B — Valuable user-created field data; **must not silently vanish at cutover**

| Key | Module |
|-----|--------|
| `waypoint-sheds-observations-v1` | `sheds-observation-store.js` |
| `waypoint-sheds-finds-v1` | `sheds-models.js` |
| `waypoint-sheds-sessions-v1` | `sheds-session-store.js` |
| `waypoint-sheds-coverage-v1` | `sheds-session-store.js` |
| `waypoint-sheds-search-areas-v1` | `sheds-search-area-store.js` |
| `waypoint-sheds-validation-v1` | `sheds-validation-store.js` |

**Existing mechanism:** map **Export JSON** (`sheds-field-private.json`) already packages observations, sessions, search areas, validations, and model prefs. Phase 2 does **not** add an importer. Phase 3 should: (1) keep Export JSON prominent before cutover, (2) add a small **Import JSON** on the new origin (or document a one-time owner-assisted import), (3) tell users that saved areas and notes will not appear on the new host until imported.

Do not assume a silent background transfer. There is no shared cookie domain.

### C — Shared Waypoint state; do **not** assume it exists on `shedhunting.org`

| Key | Module |
|-----|--------|
| `wds-location-v3` (and legacy v1/v2) | `wds-location.js` |
| `waypoint-platform-profile-v1` | `wds-platform-stores.js` |
| `waypoint-platform-locations-v1` | same |
| `waypoint-platform-collections-v1` | same |
| `waypoint-platform-settings-v1` | same |
| `waypoint-platform-recent-places-v1` | `wds-platform-places.js` |
| other `waypoint-platform-*` graph/notification keys | platform modules |

The dedicated-host overview does **not** mount platform stores or the articles feed. Location for Today’s Search on the map continues to use on-device GPS / map tap, not Studio profile location.

---

## SEO / canonical cutover (Phase 3 only)

**Do not set canonical/OG/sitemap to `shedhunting.org` while the host is inactive.**

| Surface | Phase 2 (now) | Phase 3 cutover |
|--------|----------------|-----------------|
| Overview canonical | none today (Studio URL is implied by sitemap) | `https://shedhunting.org/` |
| Map canonical | none on map HTML; `/sheds/` canonical is the Studio map URL | `https://shedhunting.org/map/` |
| OpenGraph `og:url` | not present on Sheds pages | Match canonicals on the new host |
| Studio `sitemap.xml` | lists `https://waypointstudio.org/apps/shed-hunting/` | Keep **or** drop after 301s exist; do not list `shedhunting.org` here unless that host is live |
| New host sitemap | not deployed | `/` and `/map/` on `shedhunting.org` |
| `robots.txt` | Studio Allow `/`; Disallow unpublished apps + `/apps/shed-hunting/host/` | New host: Allow `/`; Studio may keep old paths crawlable if 301 |
| Titles / descriptions | already Shed Hunting identity | Keep; point “Powered by Waypoint” at Studio |
| Internal `waypointstudio.org/apps/shed-hunting/` | correct public URLs | Nav uses flag-on absolute shed origin |

Structured data: Shed Hunting pages do not currently emit Product/App JSON-LD. Do not invent it at cutover unless an owner asks.

---

## Recommended hosting architecture

**One GitHub Pages project can have only one custom domain.** This repo’s Pages site is `waypointstudio.org`. A second custom domain cannot share that project.

**Preferred (do not implement in Phase 2):**

Keep **source in this repository**. Add a **companion GitHub repository** whose only job is GitHub Pages for `shedhunting.org`. A workflow in *this* repo (or a path-filter in the companion) publishes the `dist/shedhunting/` artifact from `scripts/prepare-shed-hunting-host.mjs`. Point the `shedhunting.org` CNAME at **that** Pages project. Leave this repo’s `CNAME` as `waypointstudio.org`.

Why this option:

- Low cost (second free Pages site)
- Independent addresses without replacing the Studio CNAME
- Reuses the existing Shed Hunting codebase (no product rewrite, no full-repo split)
- Minimal duplication (generated artifact + small WDS subset, not a second design system)
- Studio and Shed Hunting stay independently deployable

**Not preferred:** splitting the product into two source monorepos; putting two custom domains on one Pages project (not supported); making Shed Hunting CSS/JS depend on `waypointstudio.org` at runtime; Cloudflare/proxy complexity unless the owner already runs it.

---

## Redirect map (document only — do not implement)

| From (Studio) | Eventual target | Notes |
|---------------|------------------|--------|
| `waypointstudio.org/apps/shed-hunting/` | `https://shedhunting.org/` | Overview |
| `waypointstudio.org/apps/shed-hunting/map/` | `https://shedhunting.org/map/` | Field map |
| `waypointstudio.org/sheds/` | `https://shedhunting.org/` | **Overview**, even though today `/sheds/` goes to the **map**. Call this out in Phase 3 copy so bookmark users who expected the map are not surprised — or 302 to `/map/` if the owner prefers continuity over the new overview-first rule. **Recommended:** overview, matching the public entrance contract. |
| `waypointstudio.org/map/` | `https://shedhunting.org/map/` | **Conflict:** today this *is* the Sheds map. After cutover, Studio should **not** reclaim `/map/` as a different product without a 301. Preferred: keep the alias as a Shed Hunting map redirect forever, or add a Studio note page. Do not silently make `/map/` a Dashboard/Scenes map. |

Preserve query + hash on redirects.

---

## Contact / Scenes compatibility

`design-system/ecosystem/contact-config.json` still lists **Scenes** (and Photo Coach / Scene Builder) as contact **app** categories.

This is **intentional**. Unpublished Scenes URLs remain reachable for bookmarks and internal users. Support forms must still name the product they are talking about.

Do **not** restore Scenes to primary nav, homepage, sitemap, or related-product chips.

---

## Phase 3 (later — do not perform now)

Exact actions for a future Phase 3:

1. Confirm `shedhunting.org` DNS + TLS on the companion Pages site; **do not** change this repo’s `waypointstudio.org` CNAME.
2. Set `shedDedicatedHostEnabled` to `true` in `origin-config.json`, `nav-registry.json`, `wds-app-nav-config.js`, and `wds-origins.js`.
3. Deploy `dist/shedhunting/` to the companion Pages project.
4. Implement the Studio 301/refresh map above (including the `/map/` decision).
5. Switch canonical/OG/sitemap on the **new** host; update Studio sitemap only after redirects work.
6. Ship Export reminder + small Import JSON (or an owner-supported migration) for class B storage.
7. Verify overview → map, GPS, GIS packs, tiles, and Studio outbound links.
8. Only then treat ShedHunting.org as publicly active.

---

## Tests

- `automation/test-shedhunting-host-readiness.mjs` — Phase 1 production contract + dedicated-host readiness
- Existing `automation/test-sheds-*.mjs` suites remain the product regression gate
