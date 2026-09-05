# Waypoint Studio — Product Direction (canonical)

**Status:** Canonical · supersedes conflicting portfolio lists in older docs  
**Last updated:** 2026-09-04  
**Audience:** Owners, engineers, and coding agents

When documents disagree, **this file wins** for what Waypoint is building now.

Related: [`PRODUCT_STANDARDS.md`](PRODUCT_STANDARDS.md) (feel / trust / privacy) · [`APP-SURFACE-ARCHITECTURE.md`](APP-SURFACE-ARCHITECTURE.md) (one app = one surface) · [`ENGINEERING-PLAYBOOK.md`](ENGINEERING-PLAYBOOK.md) (how we ship)

---

## Mission

**Observe. Discover. Understand.**

*Capture what you find. Learn why it matters.*

Waypoint helps curious people pay attention to landscapes, nature, geography, environmental phenomena, and the physical world — without becoming a social network, LMS, newsroom, or engagement platform.

---

## Authoritative public portfolio

Do **not** restore the retired peer architecture of **Dashboard + Scenes + Sheds** as three equal Studio applications.

There are **four** active public Waypoint efforts:

### 1. Waypoint Studio (web) = Dashboard

**Waypoint Studio’s core public product is Dashboard.**

| Experience | Job |
|------------|-----|
| **Dashboard** | The Studio itself. Ambient situational awareness: what is happening, what is changing, what is worth attention. Conditions, weather, astronomy/light, outdoor opportunities — interpretation rather than a raw dump. Implementation: `docs/DASHBOARD-DISCOVER.md`. |

The site homepage (`/`) remains the Studio **front door**. It must not redirect to `/apps/dashboard/`. It should present Dashboard as the Studio product — not a trio of equal apps.

### 2. Shed Hunting (public sibling destination)

**ShedHunting.org** · **Powered by Waypoint**

Public identity is **ShedHunting.org · Powered by Waypoint**. The dedicated host is live. Waypoint Studio treats `https://shedhunting.org` as the canonical public Shed Hunting product. `shedDedicatedHostEnabled` is **true**. See [`docs/sheds/SHEDHUNTING-ORG-PHASE-3C.md`](sheds/SHEDHUNTING-ORG-PHASE-3C.md).

| Surface | URL | Job |
|----------|-----|-----|
| **Overview (public entrance)** | `https://shedhunting.org/` | **Should I go shed hunting today?** Today’s Hunt / current shed-hunting intelligence. |
| **Map (field interface)** | `https://shedhunting.org/map/` | **Where should I look?** Reached from the overview. Field Hunt Mode works a Hunt Plan in the field (V1.6). Hunt Track and field observations (V1.7) record where this device reported travel — private, local, not navigation. |

Legacy Waypoint Studio URLs (`/apps/shed-hunting/`, `/apps/shed-hunting/map/`, `/sheds/`, `/map/`) are not canonical. They noindex and send visitors to the dedicated host. Field engines stay in this repo.

Preserve all working Sheds engines (Leaflet, GPS, measurement, inspect, observations, sessions, Today’s Search, habitat/biological model, likelihood grid, heat layer, search areas, planner, field-plan UI, GIS packs, tile-provider architecture). Do not rename internal modules, storage keys, or implementation terminology for a public identity change.

Keep the Waypoint visual family (dusk-desert). Do not redesign Shed Hunting into a camouflage/green generic hunting site.

Shed Hunting version sequence and the V2.x intelligence milestone: [`docs/sheds/SHEDS-PRODUCT-ROADMAP.md`](sheds/SHEDS-PRODUCT-ROADMAP.md).

| Increment | Job |
| --- | --- |
| V1.1–V1.2 | Should I go today? / what are conditions like? |
| V1.3–V1.5 | Where to look, Scout Spots, Hunt Plans |
| V1.6 | Work the plan in the field |
| V1.7 | Hunt Track, field observations, durable Hunt Records (private / local) |
| V1.8 | Hunt History |
| V1.9 | Condition Snapshots — factual environmental foundation for later intelligence. Not the heat map. |
| **V2.x** | **Flagship Sheds+ intelligence:** a **dynamic, shifting search-priority / opportunity map** that changes with real conditions and explains why ranks change. Not an antler-location predictor. |
| V3.0 | Production iOS/Android, serious offline, Sheds/Sheds+ commercial system, field beta, hard public launch |

Do **not** implement the V2.x dynamic map in V1.7–V1.9. V1.7 field history, V1.8 Hunt History, and V1.9 Condition Snapshots exist so later intelligence can use private first-party hunt records and factual conditions without claiming known shed locations.

### 3. Waypoint Deck (distinct project)

Local-first / offline Linux field computer. Direction includes offline maps, GPS, local knowledge, local AI, radio/SDR, communications, weather, sensors, field data, incident/resilience tools, and system/power/connectivity awareness.

Public copy must distinguish **existing**, **in development**, and **planned**. Do not claim planned functionality is operational. Do not implement Deck OS unless explicitly instructed.

Canonical public URL: `/side-trails/waypoint-deck/`. Primary navigation uses the label **Deck**. The `/side-trails/` collection URL silently redirects here. Do not rebuild a Side Trails catalog of discontinued projects.

### 4. Waypoint Publishing

Editorial layer — useful outdoor / environmental / geographic storytelling. **Deep Forest Dispatch** is an active series inside Publishing. Publishing is not a fourth Studio software app. Articles, the DFD hub, stories, and video/content infrastructure stay public.

---

## Scenes — retained, unpublished

**Scenes stays intact but unpublished.** Preserve all Scenes code, routes, models, assets, experiments, and related photography technology. Internal photography + publishing joins: `docs/SCENES-PUBLISHING.md`.

Remove Scenes from:

- primary public navigation
- homepage active-product presentation
- About / Support active-product architecture
- sitemap
- Dashboard public CTAs / deepeners
- other obvious public product promotion

Keep URLs working. Do **not** delete Scenes. Do **not** 404 it. Apply `noindex` / `robots` Disallow so it is absent from normal public discovery.

---

## Predictive intelligence honesty (Shed Hunting)

Heat / habitat / Today’s Search / V1.3 search priority is **decision support**, not a find oracle.

Use: likelihood, opportunity, habitat interest, search conditions, promising areas, search priority, decision support.

Never imply that Waypoint knows an antler or a deer is actually present at a location. Never market heat/habitat as proven antler-location probability.

The **flagship future intelligence feature** is a **dynamic, shifting shed-hunting search-priority map** (V2.x / Sheds+). It should change with season, weather, snow/melt, freeze/thaw, terrain, aspect, elevation, land cover, access/searchability, and eventually private hunt history. An area may be Moderate today and Higher after warming and melt — and the product must explain why. It must never claim sheds or deer are present, that an antler exists at a coordinate, or a probability unsupported by evidence.

Do not implement that map in V1.7–V1.8.

---

## Sheds / Sheds+ (product direction only)

Do **not** implement payments. Do **not** hide currently working features behind a paywall.

| Tier | Question the product answers |
|------|------------------------------|
| **Sheds (free)** | **Is today a good day to search?** Work a Hunt Plan. Keep a private local Hunt Record and Hunt History. |
| **Sheds+ (future paid)** | **Flagship:** the dynamic shifting search-priority map, plus richer private historical intelligence built on Hunt History. |

Today’s Hunt on the overview is the closest existing expression of the free question. Current map search-priority and habitat tools remain available — they are not a paywall and they are not the V2.x dynamic map.

---

## Data classes (Shed Hunting)

Keep provenance separate. Do **not** assume private user field data can be commercially licensed.

| Class | Rule |
| --- | --- |
| Third-party / raw licensed data | Use only under the vendor license; keep provenance. |
| Sheds-derived intelligence | Search-priority interpretations computed from defensible inputs. May become licensable only if it does not embed private user tracks/observations. |
| Private user field data | Hunt Tracks, observations, Shed Found, Scout Spots, Hunt Plans, Hunt Records — local to the device in V1.7–V1.8. |
| Opted-in aggregated data | Only if a future system is explicitly built with informed opt-in. Never silent upload. |

A future **B2B data licensing** direction is valid for third-party-licensed datasets and for Sheds-derived intelligence that does not include private hunter GPS. It is **not** a license to sell Hunt Tracks or Shed Found points.

---

## Shared platform (not separate consumer products)

- Content engine — articles, videos, visual stories, Dashboard cards, relevant Shed Hunting education. Scenes content remains internally available.
- Shared services — mapping/geospatial, location, weather, design system, navigation, accounts (when present), analytics.

### Business model (intent)

One **subscription** across the Studio web ecosystem. Deck commercial intent is a one-time OS purchase, not the Studio subscription. Do not invent public pricing. Do not implement payments in this phase.

---

## Primary navigation

**Dashboard · Shed Hunting · Deck · Articles · Support · About**

- **Dashboard** — Waypoint Studio’s core public product (`/apps/dashboard/`).
- **Shed Hunting** — sibling destination; `https://shedhunting.org/` (overview). Not the map. Not a Studio-hosted product page.
- **Articles** — public entry to Publishing (content surface, not a fourth Studio instrument).
- **Deck** — distinct field-computing project.
- Do not expose Scenes, discontinued product names, or a Side Trails catalog in primary nav, footer, homepage, About, Support, or sitemaps.

Homepage introduces **Dashboard-first Studio**, then Shed Hunting as a sibling, then Publishing and Deck as distinct.

---

## Visual identity

Southwestern-inspired family palette (deep plum, burnt orange, golden yellow, desert tan, warm brown, restrained Southwest purple). Dashboard, unpublished Scenes, Shed Hunting, Deck, and Publishing belong to one family. Avoid generic SaaS blue. Do not restyle Shed Hunting as generic camo hunting.

---

## Deployment / Phase 1 vs Phase 2 vs Phase 3

**Phase 1 (current production architecture):** public architecture and identity on the existing `waypointstudio.org` deployment. Same-origin only. Dashboard-first Studio; Shed Hunting sibling; Scenes unpublished.

**Phase 2 (preparation, this work):** host/path/asset independence, origin config with `shedDedicatedHostEnabled: false`, redirect/SEO/storage/hosting documentation, generated `dist/shedhunting/` artifact that is **not** deployed. See `docs/sheds/SHEDHUNTING-ORG-PHASE-2.md`.

Do **not**:

- perform DNS changes
- change the `waypointstudio.org` CNAME
- deploy `shedhunting.org` or create the companion Pages project yet
- split the source repository
- implement production redirects
- implement payments
- delete or 404 Scenes
- rebuild Sheds

**Phase 3A (hosting, no Studio cutover):** companion GitHub Pages site for the generated `dist/shedhunting/` artifact, verified on github.io. Origin flag stays **false**. See `docs/sheds/SHEDHUNTING-ORG-PHASE-3A.md`.

**Phase 3B (custom domain via `sheds-site`):** publish `dist/shedhunting/` to `bfree7885/sheds-site`, which already owns `shedhunting.org`. Origin flag stays **false**. See `docs/sheds/SHEDHUNTING-ORG-PHASE-3B.md`. Street default is Esri World Street Map (no tile secret required). **Do not publish until this Cloud Agent token can push `sheds-site`.** Live domain is still March 2026 Terrain Intelligence.

**Phase 3C (Studio cutover, this work):** `shedDedicatedHostEnabled: true`. Waypoint Studio primary nav and public links use `https://shedhunting.org/`. Legacy Studio Shed routes noindex and redirect with static client-side cutover (GitHub Pages cannot emit HTTP 301/308). Do not merge/deploy until the owner reviews. Do not republish `sheds-site` from this phase. See `docs/sheds/SHEDHUNTING-ORG-PHASE-3C.md`.

---

## In development — SignalTerrain (SOTA, unpublished; not a public peer)

**SignalTerrain** (`/apps/summit-signal/`) is an unpublished Waypoint field application for SOTA summit discovery and activation planning. It combines SOTA summit intelligence with terrain/access intelligence (V0.2 OpenStreetMap candidate trails, trailheads, and parking), V0.3 user-selected pedestrian routing plus USGS 3DEP elevation, V0.4 terrain-derived Activation Zone contours, V0.5 fixture coverage for a second W2/GC summit, V0.6 Route to Activation Zone, V0.7 Activation Plan + Field Readiness, and V0.8 field-test start inspection with a Maps handoff to the selected trailhead. V0.9 implements an isolated github.io companion-host publish path (`waypoint-studio-site`); **the host publish is blocked** until contents:write exists on that repo (the current deploy token can write only to `sheds-site`, which must not be used). It is not merged to `main`, not on `waypointstudio.org`, and **not** Shed Hunting.

**SignalTerrain (SOTA/outdoor, unpublished) is a new product definition and is not the retired SignalTerrain Cyber product.** Do not occupy `/apps/signalterrain/` or `/side-trails/signalterrain/`. Do not import `design-system/signalterrain/**` or `wds-signalterrain-*`. Historical cyber docs remain at `docs/SIGNALTERRAIN-*.md`. Do not restore cyber copy such as “Understand the world's signals.”

Treat it like other in-development / unpublished apps:

- `noindex` + `robots.txt` Disallow
- absent from primary nav, homepage product presentation, About/Support active lists, and the sitemap
- do not present it as a fifth public architecture destination
- the product name may appear in the unpublished app and development docs only; public-portfolio tests still treat `SignalTerrain` as a discontinued *public* name for the retired cyber product — do not weaken those lists

Canonical write-up: [`docs/signal-terrain/V0.1.md`](signal-terrain/V0.1.md) · [`docs/signal-terrain/V0.2.md`](signal-terrain/V0.2.md) · [`docs/signal-terrain/V0.3.md`](signal-terrain/V0.3.md) · [`docs/signal-terrain/V0.4.md`](signal-terrain/V0.4.md) · [`docs/signal-terrain/V0.5.md`](signal-terrain/V0.5.md) · [`docs/signal-terrain/V0.6.md`](signal-terrain/V0.6.md) · [`docs/signal-terrain/V0.7.md`](signal-terrain/V0.7.md) · [`docs/signal-terrain/V0.8.md`](signal-terrain/V0.8.md) · [`docs/signal-terrain/V0.9.md`](signal-terrain/V0.9.md).

> SignalTerrain is an independent application and is not affiliated with or endorsed by Summits on the Air (SOTA).

---

## Agent contract

1. Build toward **Dashboard (Studio) + Shed Hunting (sibling) + Deck + Publishing**. Do not restore Dashboard · Scenes · Sheds as equal Studio apps.  
2. Do not revive discontinued public products, experiments, or incubator catalogs. Reusable engineering may stay internal. Reusing the **name** SignalTerrain for the unpublished SOTA app at `/apps/summit-signal/` is authorized; do **not** restore SignalTerrain Cyber.  
3. Do not promote unpublished Scenes in public discovery. Keep the code.  
4. Do not build Waypoint Deck OS in this repo unless explicitly instructed.  
5. Prefer KEEP / REFACTOR over DELETE for useful code; remove obsolete **public identity**.  
6. Prefer incremental consolidation over theoretical rewrites.  
7. Public Shed Hunting links use `https://shedhunting.org`. Origin-config flag is true. Do not revert it without an explicit rollback.  
8. Shed Hunting versions follow [`docs/sheds/SHEDS-PRODUCT-ROADMAP.md`](sheds/SHEDS-PRODUCT-ROADMAP.md). Do not implement the V2.x dynamic search-priority heat map in V1.7. Do not treat private Hunt Tracks as licensable B2B data.
