# Waypoint Studio — Full Platform Engineering Audit Report

**Document:** `docs/PLATFORM-AUDIT-2026-07.md`  
**Sprint:** Full Platform Audit, Stability, and Hardening  
**Audit date:** 2026-07-12  
**Repository:** `bfree7885/waypoint-studio` (local path `waypoint-scenes`)  
**Branch:** `main`  
**Hardening commit:** `0b748364f4ece7c5ffef4ecc54fdf4e078ca9bbe` (`0b74836`)  
**Preceding product commits in scope:**

| Commit | Summary |
|--------|---------|
| `3a28bc1` | Unified Platform Foundation |
| `3900125` | Shared Knowledge Platform |
| `f26eb40` | Fieldry Life List MVP |
| `0b74836` | Platform stability hardening (this audit’s primary fix commit) |

**Authors of this report:** Platform audit / hardening sprint (lead architect + reliability + QA synthesis)  
**Audience:** Senior engineers inheriting Waypoint Studio maintenance and roadmap decisions

---

# Executive Summary

## Overall assessment of the repository

Waypoint Studio is a multi-application, shared-kernel frontend platform for outdoor intelligence, observation, photography coaching, and domain foundations (sheds, tea, radio terrain, wine). The architecture is coherent: a design-system loader (`wds.js` / `wds-platform.js`) provides Outdoor Intelligence Platform (OIP), location, weather, Waypoint Observation Schema (WOS), Knowledge Platform, and shared shell/stores. Product apps consume those APIs rather than inventing parallel stacks—with important historical exceptions (Photo Coach dual storage, kiosk dual boot lineage, dashboard favorites dual-read).

The July 2026 audit found that the platform was **feature-rich and largely shippable**, but several **initialization and location-correctness defects** could produce silent wrong geography, broken Fieldry/ForageCast boot, or wiped WOS extension APIs depending on script order. Those defects were fixed in `0b74836`.

## Major improvements made

1. **Lazy app boot** for Fieldry and ForageCast (wait for `WDS.appBoot` instead of capturing `null` once).
2. **WOS module merge** so `normalizeObservation` APIs and `observations.extensions` coexist across load order.
3. **Knowledge module merge** so `search` / `related` survive core reload.
4. **Location hardening:** reject only the engine publish point (US center), not an entire Kansas bounding box; stop silent Pike County substitution on OIP failure; require explicit `allowDefaultLocation` for defaults.
5. **XSS hardening** on species profile URL ids and Scenes photography attribute ids.
6. **CI expansion** to run foundation, Knowledge, Fieldry, hardening, photographer profile, and coaching unit tests; expanded headless smoke route list.
7. **Documentation:** this audit, storage inventory, unified-platform cross-links.

## Current production readiness

| Surface | Readiness |
|---------|-----------|
| Outdoor Intelligence Dashboard | Production-capable; location validators green; engine data guarded from user weather/river paths |
| Kiosk | Production-capable for display; still consumes engine artifacts under guards |
| ForageCast | Live; boot race fixed |
| Fieldry | Usable Life List MVP; boot race fixed; WOS + Knowledge wired |
| Waypoint Scenes / Photo Coach | Live public products; dual storage debt remains |
| Sheds / Steepleaf / SignalTerrain / Savant | Architecture-ready foundations, not finished products |
| Terrainbound | Correctly retired → Fieldry redirect |
| Future data / marketplace | Disabled by design |

**Verdict:** Safe to keep shipping on `main` for the public portfolio. Not “finished platform”—foundations and Photo Coach storage consolidation remain intentional follow-on work.

## Overall platform health

**Healthy shared kernel, improved reliability posture, residual architectural debt that is documented rather than hidden.**  
Platform health is best described as **B+ / shippable**: critical silent-geography and boot bugs are closed; test gates are stronger; privacy defaults remain private-by-default; sample Knowledge data is honestly labeled. Remaining risk concentrates in dual storage families, dual regional-intelligence stacks, ops HTML/JSON git churn, and national editorial honesty outside Pike-indexed content.

---

# Repository Overview

## High-level architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Public HTML surfaces (index, kiosk, apps/*, design-system)  │
└────────────────────────────┬────────────────────────────────┘
                             │ script loaders
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
   wds.js (full dashboard)              wds-platform.js (apps/OIP)
         │                                       │
         └───────────────┬───────────────────────┘
                         ▼
        Design System JS (WDS.* namespaces)
                         │
     ┌───────────┬───────┼────────┬──────────┬──────────┐
     ▼           ▼       ▼        ▼          ▼          ▼
  Location     OIP/RI   Weather  WOS     Knowledge   Platform
  + guards     + OIE    services schema  search/rel  shell/stores
                         │
                         ▼
              App modules (Fieldry, Photo Coach, …)
                         │
                         ▼
              localStorage / sessionStorage families
```

Content regionalization uses the Content Engine under `design-system/content-engine/` with county/region indices. Live-engine publish artifacts live under `data/` and ops pages (`status.html`, `debug.html`)—these must not drive user-facing weather/river coordinates.

## Shared Platform Foundation

**Commits:** `3a28bc1` and subsequent adoption.

| Module | Path | Role |
|--------|------|------|
| Catalog | `design-system/js/platform/wds-platform-catalog.js` | Product registry for nav |
| Shell | `design-system/js/platform/wds-platform-shell.js` | Shared topbar/footer mount markers |
| Stores | `design-system/js/platform/wds-platform-stores.js` | Profile, locations, collections, settings |
| Foundation UI | `design-system/js/platform/wds-platform-foundation.js` | Landing renderer for unfinished products |
| Future data | `design-system/js/platform/wds-platform-future-data.js` | Disabled APIs / GIS / licensing hooks |

Docs: `docs/UNIFIED-PLATFORM.md`, `docs/PLATFORM-ARCHITECTURE.md`.

## Knowledge Platform

**Commit:** `3900125`.

- Schema + domains + index + relationships under `design-system/knowledge/`
- Runtime: `wds-knowledge-core.js`, `wds-knowledge-search.js`, `wds-knowledge-relationships.js`
- Public API: `WDS.knowledge`, `WDS.knowledge.search`, `WDS.knowledge.related`
- Demo bundle is representative sample data, not production completeness
- Species essays remain in WSKB; Knowledge entries may link via `wskbId`

Docs: `docs/WAYPOINT-KNOWLEDGE-PLATFORM.md`.

## Waypoint Observation Schema (WOS)

- Schema: `design-system/observations/schema-v1.json`
- Runtime: `wds-wos-core.js` + `wds-wos-extensions.js`
- App-specific data belongs in `observation.extensions[appId]`
- Privacy / location precision enums live on the observation
- Taxon id sources include `wskb` and `knowledge`

Docs: `docs/WAYPOINT-OBSERVATION-STANDARD.md`.

## Application architecture

| App | Path | Role |
|-----|------|------|
| Dashboard | `index.html` + `js/home-boot.js` | Outdoor Intelligence home |
| Kiosk | `kiosk.html` + `js/kiosk*.js` | Full-screen live display |
| ForageCast | `apps/foragecast/` | Seasonal / habitat lab |
| Fieldry | `apps/fieldry/` | Life list + WOS notebook |
| Scenes landing | `apps/scenes/` | Photography product entry |
| Scene Builder | `apps/waypoint-scenes/` | Scene studio |
| Photo Coach | `apps/photo-coach/` | Coaching + profile |
| Sheds | `apps/shed-hunting/` | Foundation |
| Steepleaf | `apps/steepleaf/` | Foundation |
| SignalTerrain | `apps/signalterrain/` | Foundation |
| Savant | `apps/savant-sommelier/` | Foundation |
| Terrainbound | `apps/terrainbound/` | Retired redirect → Fieldry |

## Shared services

- **Location:** `wds-location.js` (coordinates-first, no silent fake “your location” for geo denial after prior hardening work; defaults only when user explicitly chooses)
- **Platform guard:** `wds-platform-guard.js` strips engine-classified packages from user surfaces
- **Weather / alerts / AQI / elevation / USGS water:** modular services under `design-system/js/weather/` and `water/`
- **Regional Intelligence:** engine + v2 core (both still loaded—debt)
- **Outdoor Intelligence Platform:** `wds-oip-*` package assembly
- **App boot:** `wds-app-boot.js` shared location + OIP bootstrap helper
- **Ethics / research integrity / provenance:** shared footnotes for scientific honesty

---

# Audit Scope

This sprint reviewed the following areas end-to-end (read/inspect, then fix highest-value defects):

## Shared platform

- Catalog, shell mount markers, stores, foundation renderer, future-data gate
- Loaders `wds.js` and `wds-platform.js` dependency order
- Repeated-load safety of `WDS.*` namespaces
- Navigation consistency across core instruments

## Every application

- Dashboard, kiosk, status, debug
- ForageCast, Fieldry, Scenes, Scene Builder, Photo Coach (+ profile + guide)
- Sheds, Steepleaf, SignalTerrain, Savant Sommelier
- Terrainbound redirect
- Species profile and major design-system demos (asset path resolution)

## Shared design system

- CSS entry points (`wds.css`, dashboard CSS, base components)
- Shared buttons, focus, skip link
- Gallery / photography helpers used by Scenes

## Routing

- Hash routes (Fieldry SPA)
- Static HTML routes and meta-refresh redirect
- Smoke coverage of public paths

## Storage

- Inventory of localStorage/sessionStorage families
- Migration markers and legacy keys
- Malformed payload behavior (Fieldry)

## Knowledge Platform

- Schema, domains, demo bundle, search, relationships, WSKB delegation
- Unavailable / offline honesty in Fieldry capture

## WOS

- Normalize/extensions preservation
- Privacy levels and location precision
- Fieldry extension namespace

## Documentation

- UNIFIED-PLATFORM, ROADMAP, Knowledge, WOS, Fieldry MVP, architecture
- Gaps filled with STORAGE-INVENTORY and this audit

## Tests

- All `automation/test-*.mjs` unit suites runnable without browser
- Validators under `scripts/validate-*.mjs`
- Headless Chrome smoke (`automation/smoke-browser.mjs`)
- GitHub Actions `smoke.yml`

## Build / deployment

- `wds-build.js` version query / script tracking
- Live-engine artifact generation (not re-architected this sprint)
- `.gitignore` gaps for local churn

## Accessibility

- Shared focus-visible, skip link, touch targets
- Form labels and status regions in Fieldry (prior MVP) and location prompt

## Performance

- Duplicate listeners, dual RI stacks, Knowledge demo preload behavior
- No bundler migration (explicitly out of scope)

## Privacy

- Private-by-default observations and platform profile
- Coordinate display gating in Fieldry
- Engine publish coordinates rejection

## Security

- Secret scanning (no committed cloud keys found)
- XSS hotspots in `innerHTML` construction
- Future-data / marketplace disabled

**Out of scope / not claimed:** Formal penetration test, WCAG certification audit, every viewport on physical devices, backend auth, cloud sync, marketplace enablement.

---

# Findings

## Critical

### C1 — Fieldry and ForageCast permanently null `WDS.appBoot`

| Field | Detail |
|-------|--------|
| **Description** | App boot modules captured `global.WDS.appBoot` once at script evaluation time. Under `defer` + dynamic `wds-platform.js` chain, `appBoot` was not yet defined, so `boot` stayed `null` forever. |
| **Impact** | Location/OIP bootstrap always rejected; Fieldry/ForageCast ran without shared location intelligence. |
| **Root cause** | Eager binding incompatible with deferred platform loader ordering. Photo Coach already used lazy `getBoot()` + `waitForAppBoot()`. |
| **Resolution** | Rewrote both boots to lazy-create and wait for `WDS.appBoot` (Photo Coach pattern). |
| **Files affected** | `apps/fieldry/js/fieldry-boot.js`, `apps/foragecast/js/foragecast-boot.js` |

### C2 — WOS core hard-replace wiped extensions API

| Field | Detail |
|-------|--------|
| **Description** | `wds-wos-extensions.js` could attach `WDS.observations.extensions` before `wds-wos-core.js` assigned a brand-new `WDS.observations = {…}` object, dropping `.extensions`. Fieldry also loaded extensions as a sibling while core arrived via platform loader. |
| **Impact** | Intermittent loss of `setExtension` / `getExtension`; Fieldry extension writes could fail depending on race. |
| **Root cause** | Hard assignment instead of merge; platform loader omitted extensions script. |
| **Resolution** | Core now `Object.assign`s onto existing observations object and preserves `.extensions`. `wds-platform.js` loads `observations/wds-wos-extensions.js` immediately after core. |
| **Files affected** | `design-system/js/observations/wds-wos-core.js`, `design-system/js/wds-platform.js` |

### C3 — Kansas bounding box treated real users as “test coordinates”

| Field | Detail |
|-------|--------|
| **Description** | `isKnownTestCoords` rejected any cache with `lat ∈ [37,40]` and `lng ∈ [-102,-94]`—most of Kansas—in addition to the engine publish point. |
| **Impact** | Legitimate Kansas users could have valid caches cleared / treated as stale; conflated engine artifact rejection with geography. |
| **Root cause** | Over-broad heuristic intended to catch engine US-center leakage. |
| **Resolution** | `isKnownTestCoords` now only delegates to `isEnginePublishPoint` (≈ `39.8283, -98.5795`). |
| **Files affected** | `design-system/js/wds-location.js` |

## High

### H1 — OIP `get()` catch silently substituted Pike County

| Field | Detail |
|-------|--------|
| **Description** | On failure, OIP built a package from `buildFallbackLocationState()` (default region Pike County, PA). |
| **Impact** | Users could see Pike editorial/coords after errors without understanding it was fallback geography. |
| **Root cause** | Fail-soft design that preferred “something to render” over honesty. |
| **Resolution** | Catch now returns an **unavailable** empty package (`meta.unavailable`, null coords, blockStatus unavailable)—no Pike substitution. |
| **Files affected** | `design-system/js/outdoor-intelligence/wds-oip-service.js` |

### H2 — Location resolve silently defaulted to Pike / engine default

| Field | Detail |
|-------|--------|
| **Description** | `resolveLocation` (RI engine + OIP location) fell back to `defaultState` / `buildFallbackLocationState` whenever no coordinates existed. |
| **Impact** | Silent default geography for callers that omitted location. |
| **Root cause** | Historical “always return a region” contract. |
| **Resolution** | Defaults only when `request.allowDefaultLocation === true`. Otherwise return `unavailable` location state. |
| **Files affected** | `design-system/js/regional-intelligence/wds-regional-intelligence-engine.js`, `design-system/js/outdoor-intelligence/wds-oip-location.js` |

### H3 — Knowledge core hard-replace dropped `search` / `related`

| Field | Detail |
|-------|--------|
| **Description** | Search/relationships modules attach methods onto `WDS.knowledge`. Reloading core replaced the object and could drop satellites. |
| **Impact** | `WDS.knowledge.search` / `.related` could vanish after reload order quirks. |
| **Root cause** | Hard assignment without re-attach. |
| **Resolution** | Core merge-assigns and re-wires from `knowledgeSearch` / `knowledgeRelationships` if present. |
| **Files affected** | `design-system/js/knowledge/wds-knowledge-core.js` |

### H4 — Duplicate `location.onChange` listeners on reload

| Field | Detail |
|-------|--------|
| **Description** | OIP service and RI engine registered `WDS.location.onChange` refresh handlers without once-guards. |
| **Impact** | Repeated script evaluation → duplicate fetches / refresh storms. |
| **Root cause** | No idempotent subscribe flag. |
| **Resolution** | Once-guards (`OIP._locationBound`, `global.__wdsRiEngineLocBound`). |
| **Files affected** | `wds-oip-service.js`, `wds-regional-intelligence-engine.js` |

## Medium

### M1 — Reflected XSS risk in species profile boot

| Field | Detail |
|-------|--------|
| **Description** | `?id=` query value concatenated into `innerHTML` on not-found path. |
| **Impact** | Potential HTML injection via crafted URL. |
| **Root cause** | Missing escape helper. |
| **Resolution** | Added `escapeHtml(id)` before interpolation. |
| **Files affected** | `design-system/species/profile-boot.js` |

### M2 — Unescaped `photo.id` in Scenes photography attributes

| Field | Detail |
|-------|--------|
| **Description** | Titles/captions escaped; `data-photo-id` attributes used raw `photo.id`. |
| **Impact** | Attribute injection if ids ever become untrusted. |
| **Root cause** | Incomplete escaping discipline. |
| **Resolution** | Wrap ids with existing `escapeHtml`. |
| **Files affected** | `apps/waypoint-scenes/js/photography.js` |

### M3 — Platform unit tests outside CI; smoke route list incomplete

| Field | Detail |
|-------|--------|
| **Description** | Foundation/Knowledge/Fieldry/etc. tests existed locally but were not in `smoke.yml`; smoke omitted Fieldry, ForageCast, foundations, Terrainbound. |
| **Impact** | Regressions could merge without CI signal. |
| **Root cause** | CI grew slower than the test inventory. |
| **Resolution** | Expanded `smoke.yml` and `smoke-browser.mjs` page list. |
| **Files affected** | `.github/workflows/smoke.yml`, `automation/smoke-browser.mjs`, `automation/test-platform-hardening.mjs` |

### M4 — Generated engine / status file churn in working tree

| Field | Detail |
|-------|--------|
| **Description** | `data/live.json`, `health.json`, `status.html`, `debug.html`, etc. frequently dirty and historically risk committing Kansas engine snapshots. |
| **Impact** | Noisy diffs; accidental commits of ops artifacts. |
| **Root cause** | Tracked publish artifacts without strong local ignore strategy. |
| **Resolution** | Expanded `.gitignore` for local override patterns; documented in storage/audit docs. Did **not** untrack already-tracked files this sprint (ops publish model still uses them). |
| **Files affected** | `.gitignore`, docs |

## Low

### L1 — Dashboard favorites dual-read

| Field | Detail |
|-------|--------|
| **Description** | Favorites may be read from `waypoint-dashboard-widgets-v4` and legacy `waypoint-dashboard-favorites-v1`. |
| **Impact** | Dual source of truth; mild consistency risk. |
| **Root cause** | Incremental migration incomplete. |
| **Resolution** | Documented; not consolidated this sprint (data-loss risk). |
| **Files affected** | `wds-dashboard-widget-data.js` (read path; unchanged) |

### L2 — Photo Coach legacy + growth storage families

| Field | Detail |
|-------|--------|
| **Description** | Parallel keys for legacy coach vs entity repository / profile / coaching memory. |
| **Impact** | Confusion; migration complexity. |
| **Root cause** | Growth model layered without full cutover. |
| **Resolution** | Explicitly retained; inventory documented. |
| **Files affected** | Photo Coach repositories (unchanged this sprint) |

### L3 — Dual Regional Intelligence v1 + v2 in loader

| Field | Detail |
|-------|--------|
| **Description** | Both stacks load via `wds.js`. |
| **Impact** | Bundle weight; dual fallbacks historically. |
| **Root cause** | Incremental RI rewrite. |
| **Resolution** | Documented debt; no loader surgery this sprint. |
| **Files affected** | `design-system/js/wds.js` (unchanged) |

### L4 — Terrainbound residue in education maps / tokens

| Field | Detail |
|-------|--------|
| **Description** | Retired product still appears in some education/registry accents. |
| **Impact** | Mild discoverability confusion (redirect itself is correct). |
| **Root cause** | Incomplete residue cleanup. |
| **Resolution** | Deferred; redirect + catalog retired tier are correct. |
| **Files affected** | Various education maps (unchanged) |

---

# Stability Improvements

## Initialization

- Fieldry/ForageCast wait for `WDS.appBoot` before creating boot instances.
- Hardening tests assert source patterns (`getBoot`, `waitForAppBoot`) and absence of eager null capture.

## Routing

- Terrainbound meta-refresh + fallback links to Fieldry verified in smoke (lands on Fieldry title).
- Smoke route inventory expanded to cover foundations and primary instruments.

## Module loading

- `wds-platform.js` now includes WOS extensions after core.
- WOS and Knowledge use merge-assign + preserve/re-attach satellites.
- Once-guards prevent stacked location listeners.

## Storage

- Fieldry migration v2 remains idempotent; corrupt JSON does not crash `list()`.
- Storage inventory documented for all major families.
- No destructive consolidations performed.

## Migration

- Runtime location migration continues to clear known stale engine/weather keys.
- Fieldry maps legacy `observationType` → life-list category when missing.
- Photo Coach migrations left dual-read (safe).

## Caching

- Engine publish coordinates still rejected for user location caches.
- Kansas bbox no longer invalidates real caches.
- No service worker present (confirmed); cache-busting via `?v=` on dashboard loader path.

## Error handling

- OIP failures → unavailable package with telemetry and blockStatus, not fake region.
- Location resolve → unavailable unless explicit default opt-in.
- Fieldry Knowledge search already surfaces offline/unavailable messaging (MVP).

## Retry logic

- Not redesigned this sprint. Existing provider retries remain bounded by prior services.
- Duplicate refresh amplification from stacked listeners was reduced (once-guards).

## Graceful degradation

- Per-module `blockStatus` on unavailable OIP packages.
- Dashboard platform guard continues to strip engine packages (“Refreshing local conditions…” when applicable).
- Knowledge optional for Fieldry capture (manual/unidentified still works).

## Race-condition fixes

- AppBoot race (C1)
- WOS extensions wipe race (C2)
- Knowledge satellite drop (H3)
- Listener stacking (H4)

## Duplicate code removed / avoided

- Did not rewrite kiosk onto `wds-app-boot` this sprint (larger behavioral risk); documented as debt.
- Did not delete RI v1.
- Prefer shared Photo Coach boot pattern over new abstractions.

---

# Dashboard Review

## Outdoor Intelligence

- Primary surface: `index.html` + dashboard engine modules.
- User package path is coordinates-first OIP (`liveFeedSource: user-oip` in smoke).
- Smoke (2026-07-12): homepage hydrated; weather/alerts/AQI/elevation/usgsWater/trailConditions reported live; **no Kansas river leak** on homepage.

## Kiosk

- `kiosk.html` boot completes (`bootDone`, `notLocating` in smoke).
- Still related to live-engine display concerns; platform guard / normalize path validated by scripts.
- Dual boot lineage (`wds-app-boot` vs `kiosk-boot`) remains architectural debt.

## Location detection

- `wds-location.js` v3 storage; geo + IP + manual county/state search.
- Explicit default region button remains user-initiated (Pike / indexed default)—acceptable.
- Silent defaults on resolve/get failures removed.

## Weather

- Modular weather service; validators confirm photography/weather inputs use user coords.
- Remaining opportunity: in-flight request dedupe under load.

## Rivers

- USGS gauges constrained; location-sensitive tests reject Kansas gauges for Pike users and accept local gauges.
- Homepage smoke showed no Kansas river leak.

## Sunrise / sunset

- Daylight UTC harness PASS (Montgomery NY windows; regression times absent).
- Homepage smoke showed sunrise/sunset text for resolved location.

## AQI

- Part of OIP block status; smoke showed live AQI on homepage during audit run (environment-dependent).

## Photography conditions

- Canonical photography source is user-OIP (surface consistency validators PASS).
- Photo Coach / kiosk aligned to canonical module (no live.json photography fetch in coach).

## Shared platform integration

- Dashboard uses full `wds.js` (includes platform shell/stores/future-data).
- Catalog-driven nav marks Fieldry/Scenes/etc.

## Remaining concerns

1. National educational content still Pike-centric for distant coords (honesty/trust UX).
2. Ops `status.html` may legitimately show Kansas engine content—do not confuse with user dashboard.
3. Kiosk consolidation onto shared boot still pending.
4. Widget favorites dual-read pending cleanup.

---

# Knowledge Platform Review

## Architecture

Shared reference backbone: schema → domains → records → relationships → search API. Apps query Knowledge instead of copying encyclopedias. Species long-form stays in WSKB.

## Schema

- `design-system/knowledge/schema-v1.json`
- Domains include fieldry, forage, sheds, steepleaf, etc. (`domains.json`)
- Entries carry names (common/scientific/aliases), categories, tags, taxonomy, geography, citations, optional `wskbId`

## Search

- `WDS.knowledge.search(query, options)` with domain/category/geo filters
- Deterministic scoring over names, aliases, tags, categories, keywords
- Fieldry capture uses `{ domain: "fieldry", category }`

## Relationships

- Graph in `relationships.json`
- `related(id)` BFS neighbors; `path(from, to)` short ecology chains
- Loop protection via visited set in BFS

## WSKB integration

- `resolveSpeciesDetail` loads WSKB when `wskbId` present
- WOS `taxonIdSource` allows `wskb` and `knowledge`

## Sample data

- `samples/demo-bundle.json` (~21 representative entries)
- UI must label as sample (Fieldry does)
- Not production species completeness

## Future expansion

- Domain packs per product
- Richer citations / seasonality
- Sensitive-species flags for auto-obscuring (designed, not fully automated)

## Remaining work

- Expand beyond demo honesty without implying completeness
- Ensure all consuming apps tolerate Knowledge unavailable (Fieldry does; foundations less dependent)
- Relationship coverage growth

---

# Observation Platform Review

## Schema

WOS v1 research-grade observation package: meta, observer, taxon, observedAt, location (+ privacy precision), habitat, context, record, media, verification, research, license, privacy, revisions.

## Extensions

```js
observation.extensions[appId] = { schemaVersion, updatedAt, …payload }
```

Fieldry uses `extensions.fieldry` (category, unidentified, tags, knowledgeId, privacyLevel, …) mirrored into `meta.fieldry` for resilience.

`normalizeObservation` shallow-copies extension objects per appId (fixed earlier in Fieldry sprint; merge-load fixed in hardening).

## Privacy

- Extension privacy levels: `private` | `shared` | `public` | `anonymized` (default private in Fieldry)
- Location precision: `exact` | `obfuscated` | `county` | `hidden`
- `publicCoordinates()` respects precision
- Fieldry UI never shows exact coords when precision is regional/hidden

## Storage

- Fieldry: `waypoint-fieldry-observations-v1` on device
- No cloud sync in MVP
- Export JSON/CSV for personal archive

## Migrations

- Marker `waypoint-fieldry-migration-v2`
- Idempotent enrichment; malformed payloads preserved
- Legacy observationType → category mapping

## Future scalability

- Shared WOS across apps is the correct path
- Avoid per-app observation schemas
- Sensitive-species auto-obscuring and media blobs are next-layer work
- Account sync reserved in retention enums but not enabled

---

# Application Review

## Dashboard

| Aspect | Detail |
|--------|--------|
| **Maturity** | Live production surface |
| **Completed** | OIP integration, widgets, briefing, location pipeline, platform guard, validators |
| **Remaining MVP** | National-mode honesty UX outside Pike zone; favorites single source of truth |
| **Technical debt** | Dual RI stacks; widget favorites dual-read; large dashboard bundle |
| **Recommendations** | Next focus: national honesty + weather coalescing; keep engine artifacts off user paths |

## Waypoint Scenes (Scene Builder + landing)

| Aspect | Detail |
|--------|--------|
| **Maturity** | Live |
| **Completed** | Scene studio, photography gallery, outdoor context bridge, XSS id escaping |
| **Remaining MVP** | Continued polish; ensure all dynamic HTML remains escaped |
| **Technical debt** | Some effect defs rendered via innerHTML (static today) |
| **Recommendations** | Keep attribute escaping discipline; avoid data-driven unsanitized HTML |

## Photo Coach

| Aspect | Detail |
|--------|--------|
| **Maturity** | Live public product (critique, batch, profile, personalized coaching) |
| **Completed** | Growth models, profile engine, coaching memory, correct lazy boot |
| **Remaining MVP** | Storage consolidation UX clarity; collections polish |
| **Technical debt** | Legacy vs growth localStorage families |
| **Recommendations** | Dedicated migration sprint with dual-read + user-visible confirmation; do not delete legacy keys opportunistically |

## Fieldry

| Aspect | Detail |
|--------|--------|
| **Maturity** | Usable Life List MVP |
| **Completed** | Home, capture, Knowledge suggestions, unidentified records, history, life list, stats, achievements, privacy, collections hooks, boot fix |
| **Remaining MVP** | Media attach UI; sensitive-species auto-obscure; richer Knowledge packs |
| **Technical debt** | Dual write meta.fieldry + extensions.fieldry; migration-on-read |
| **Recommendations** | Media + obscuring sprint after platform stability; keep non-competitive tone |

## ForageCast

| Aspect | Detail |
|--------|--------|
| **Maturity** | Live seasonal/habitat lab |
| **Completed** | Shared boot (now fixed), season table, OIP context |
| **Remaining MVP** | Daily recommendation package (roadmap) |
| **Technical debt** | Ensure all entry points use lazy boot if additional scripts added |
| **Recommendations** | Product deepening on recommendations without forking location/OIP |

## Sheds

| Aspect | Detail |
|--------|--------|
| **Maturity** | Foundation landing + models |
| **Completed** | Find/species models, foundation JSON, private-by-default finds store |
| **Remaining MVP** | Personal finds UI with private coordinates |
| **Technical debt** | Scripts may lack `?v=` cache bust |
| **Recommendations** | Build finds UI on shared shell + WOS extensions when capture deepens |

## Steepleaf

| Aspect | Detail |
|--------|--------|
| **Maturity** | Foundation (tea/brew models) |
| **Completed** | Landing, stores, Knowledge domain samples |
| **Remaining MVP** | Brew session UX |
| **Technical debt** | Same foundation cache-bust gap |
| **Recommendations** | Grow from Knowledge tea domain; avoid parallel encyclopedia |

## SignalTerrain

| Aspect | Detail |
|--------|--------|
| **Maturity** | Foundation (receiver/incident models) |
| **Completed** | Landing + local stores |
| **Remaining MVP** | Receiver management UI |
| **Technical debt** | Foundation-level only |
| **Recommendations** | Keep radio domain in Knowledge; private incident locations |

## Savant Sommelier

| Aspect | Detail |
|--------|--------|
| **Maturity** | Foundation (site/winery/wine) |
| **Completed** | Landing + models + Knowledge wine/soil samples |
| **Remaining MVP** | Tasting/site workflows |
| **Technical debt** | Foundation-level only |
| **Recommendations** | Shared shell; no marketplace features |

---

# Storage Audit

Canonical companion doc: `docs/STORAGE-INVENTORY.md`. Consolidated table:

| Storage key | Owner | Schema / version | Migration behavior | Status |
|-------------|-------|------------------|--------------------|--------|
| `waypoint-platform-profile-v1` | platform stores | Profile v1 | create-on-load | **Current** |
| `waypoint-platform-locations-v1` | platform stores | Locations[] | overwrite save | **Current** |
| `waypoint-platform-collections-v1` | platform stores | Collections[] | favorites helper | **Current** |
| `waypoint-platform-settings-v1` | platform stores | Settings | patch merge | **Current** |
| `wds-location-v3` | wds-location | Location state | migrate from v1/v2 clear | **Current** |
| `wds-location-v2` / `v1` | legacy | — | cleared by runtime migration | **Legacy** |
| `wds-location-prompted` | wds-location | flag | — | **Current** |
| `waypoint-runtime-migration` | runtime migration | marker | idempotent purge | **Current** |
| `waypoint-active-build` | wds-build | commit id | — | **Current** |
| `waypoint-briefing-snapshot-v1` | briefing | cache | — | **Current** |
| `waypoint-outdoor-context-v1` | ecosystem bridge | **sessionStorage** | — | **Current** |
| `waypoint-dashboard-widgets-v4` | dashboard | layout+favorites | from v1–v3 | **Current** |
| `waypoint-dashboard-widgets-v1`…`v3` | dashboard | — | migrated | **Legacy** |
| `waypoint-dashboard-favorites-v1` | dashboard | favorites | dual-read | **Legacy** |
| `waypoint-fieldry-observations-v1` | Fieldry | WOS[] | migration v2 enrich | **Current** |
| `waypoint-fieldry-device-id` | Fieldry | device id | create once | **Current** |
| `waypoint-fieldry-migration-v2` | Fieldry | marker | idempotent | **Current** |
| `waypoint-photo-records-v1` | Photo Coach growth | PhotoRecord[] | — | **Current** |
| `waypoint-photo-shoots-entity-v1` | Photo Coach growth | Shoot[] | — | **Current** |
| `waypoint-photographer-profile-v1` | profile engine | profile | migrate helpers | **Current** |
| `waypoint-photo-coaching-memory-v1` | coaching | memory | — | **Current** |
| `waypoint-photo-coaching-prefs-v1` | coaching | prefs | — | **Current** |
| `waypoint-photo-coach-journey-v1` | Photo Coach UI | progress | — | **Current** |
| `waypoint-photo-coach-profile-v1` | legacy coach | profile | retained | **Legacy** |
| `waypoint-photo-coach-sessions-v1` | legacy coach | sessions | retained | **Legacy** |
| `waypoint-photo-coach-shoots-v1` | legacy coach | shoots | retained | **Legacy** |
| `waypoint-sheds-finds-v1` | Sheds | finds | — | **Current** |
| `waypoint-steepleaf-teas-v1` | Steepleaf | teas | — | **Current** |
| `waypoint-steepleaf-brews-v1` | Steepleaf | brews | — | **Current** |
| `waypoint-signalterrain-receivers-v1` | SignalTerrain | receivers | — | **Current** |
| `waypoint-signalterrain-incidents-v1` | SignalTerrain | incidents | — | **Current** |
| `waypoint-savant-wineries-v1` | Savant | wineries | — | **Current** |
| `waypoint-savant-wines-v1` | Savant | wines | — | **Current** |
| `waypoint-savant-sites-v1` | Savant | sites | — | **Current** |
| `waypoint-wskb-recent-v1` | WSKB | recent | — | **Current** |
| Debug keys (`waypoint-debug-location`, `waypointDebugSnapshot`) | debug tools | — | — | Ops |

**Rules:** never silently erase valid history; prefer dual-read; migrations idempotent; malformed JSON quarantine/preserve.

---

# Security & Privacy Review

## Secrets review

- No committed `sk-`, `AIza`, `ghp_`, `AKIA`, or PEM private keys found in audit pass.
- eBird and commercial weather keys are environment/runtime-config only.
- `.env` under automation week-away is gitignored.

## Privacy protections

- Platform profile default private.
- Fieldry observations default `privacyLevel: private`, location precision default `county` (regional).
- No public social feeds, followers, or leaderboards in Fieldry MVP.
- Future-data marketplace/licensing APIs return disabled.

## Coordinate handling

- Engine publish point rejected for user caches.
- Fieldry `formatLocation` suppresses exact coords unless precision is `exact`.
- OIP no longer injects Pike coordinates on failure.
- Darwin Core / public coordinate helpers respect precision enums.

## Future data safeguards

```js
WDS.futureData.ENABLED === false
WDS.futureData.enable() → { ok: false, enabled: false, … }
```

Hard gate until product + legal review.

## Remaining concerns

- Client-only enforcement (anyone with DevTools can read localStorage)—expected for this architecture; cloud sync must not weaken defaults.
- Ops pages expose engine diagnostics by design—keep them non-public or clearly ops-only in deployment.
- `innerHTML` remains a recurring footgun; escaping is mostly disciplined but requires review on every new UI.

---

# Accessibility Review

## Improvements this sprint

- Shared CSS: `.wds-btn` and `.ws-topnav a` minimum height 44px; `.wds-btn--sm` 36px (`wds-base.css`).
- Existing `:focus-visible` outline and `.wds-skip` retained.
- Location prompt already uses dialog semantics + `aria-live` status.
- Fieldry MVP (prior commit) includes labels, status regions, reduced-motion CSS.

## Remaining issues

- Not a full WCAG audit of every page.
- Some foundation landings may lack exhaustive keyboard dialogs (simple pages).
- Kiosk/status ops UIs are display-oriented; a11y priority is user instruments.
- Color contrast not instrumented automatically this sprint.

## Recommendations

1. Add axe/lighthouse CI sample on homepage + Fieldry + Photo Coach.
2. Audit modal focus traps in Scenes gallery/Photo Coach.
3. Ensure all new forms use visible labels (no placeholder-only).

---

# Performance Review

## Improvements

- Once-guards stop duplicate OIP/RI refresh subscriptions (reduces fetch amplification).
- No large new bundles introduced by hardening.

## Remaining bottlenecks

- `wds.js` loads a very large ordered script list (dashboard cold start).
- Dual RI v1+v2.
- Fieldry preloads Knowledge demo bundle (acceptable for MVP; watch size as packs grow).
- Foundation apps often load platform scripts without `?v=` (stale cache risk more than CPU).

## Future opportunities

- Split dashboard widgets into lazy chunks (without framework migration).
- Deduplicate in-flight weather requests.
- Remove RI v1 after call-site audit.
- Knowledge: load domain packs on demand instead of full demo always.

---

# Documentation Review

## Updated

- `docs/UNIFIED-PLATFORM.md` — links to audit + storage inventory; last-updated notes in prior commits
- `docs/ROADMAP.md` — Fieldry status / next phase (Fieldry MVP commit)
- `docs/FIELDRY-LIFE-LIST-MVP.md` — product/technical MVP doc (Fieldry commit)

## Added

- `docs/PLATFORM-AUDIT-2026-07.md` (this report; expanded)
- `docs/STORAGE-INVENTORY.md`

## Still needed

- Runbook for live-engine publish vs user dashboard (ops vs product)
- Photo Coach storage migration design doc before consolidation sprint
- National-mode content honesty UX spec
- Optional: ADRs for “no silent default location” and “extensions merge-load”

---

# Tests

## Unit / Node suites (2026-07-12 hardening verification)

| Test | Result | Coverage / notes |
|------|--------|------------------|
| `automation/test-platform-hardening.mjs` | **PASS** | WOS/Knowledge merge-load, KS coords, futureData, boot patterns, privacy display, corrupt storage, Terrainbound redirect, XSS escape |
| `automation/test-platform-foundation.mjs` | **PASS** | Catalog, shell, stores, extensions, futureData, foundations, Fieldry categories |
| `automation/test-knowledge-platform.mjs` | **PASS** | Schema, search, relationships, domains, WSKB link fields |
| `automation/test-fieldry-mvp.mjs` | **PASS** | Capture, life list, stats, achievements, privacy, migration |
| `automation/test-photographer-profile.mjs` | **PASS** | Tiers, niches, exclusions, corrections, privacy |
| `automation/test-personalized-coaching.mjs` | **PASS** | Growth narratives, outing plans, memory prefs |
| `automation/test-profile-migration.mjs` | **PASS** (when server available) | Persistent profile migration in browser context |
| `automation/test-kiosk-modules.mjs` | **PASS** (earlier full run) | Kiosk module integrity |
| `automation/test-kiosk-location-boot.mjs` | **PASS** (Chrome + server) | Includes stale Kansas cache rejection |
| `automation/test-trail-browser.mjs` / `test-trail-conditions.mjs` | Present | Trail surfaces; not all in CI |

## Validators

| Script | Result |
|--------|--------|
| `scripts/validate-location.mjs` | **PASS** |
| `scripts/validate-dashboard-data.mjs` | **PASS** |
| `scripts/validate-surface-consistency.mjs` | **PASS** |
| `scripts/validate-location-sensitive.mjs` | **PASS** (daylight, rivers, weather coords, platform guard) |

## Headless smoke (`automation/smoke-browser.mjs`)

**Result: SMOKE: PASS** (local Chrome, 2026-07-12)

Routes exercised: homepage, kiosk, status, debug, ForageCast, Fieldry, waypoint-scenes, scenes, photo-coach, photo-coach-profile, sheds, steepleaf, signalterrain, savant, terrainbound-redirect, species-profile.

**Observations:**

- Homepage: no Kansas river leak; user-oip source; hydrated.
- Status page may flag Kansas content (ops engine page—expected).
- Fieldry/ForageCast may still show `aria-busy` briefly during location prompt at capture time; **no console errors**.
- Terrainbound redirect resolved to Fieldry title.

## CI

`.github/workflows/smoke.yml` now runs smoke + profile migration + platform foundation + knowledge + fieldry + hardening + photographer profile + personalized coaching + validators.

---

# Git Summary

| Item | Value |
|------|-------|
| **Branch** | `main` |
| **Final hardening commit** | `0b748364f4ece7c5ffef4ecc54fdf4e078ca9bbe` |
| **Pushed to `origin/main`** | Yes (`f26eb40..0b74836` at time of hardening push) |
| **This report commit** | See follow-up commit if created after expansion |

## Commits created during the broader July platform arc

1. `3a28bc1` — Unified Platform Foundation  
2. `3900125` — Knowledge Platform  
3. `f26eb40` — Fieldry Life List MVP  
4. `0b74836` — Hardening (boot, location, XSS, CI, initial audit/storage docs)

## Files changed in hardening commit `0b74836` (19 files)

`.github/workflows/smoke.yml`, `.gitignore`, Fieldry/ForageCast boots, photography.js, smoke-browser, test-platform-hardening, wds-base.css, knowledge-core, wos-core, oip-location, oip-service, regional-intelligence-engine, wds-location, wds-platform, profile-boot, PLATFORM-AUDIT-2026-07.md, STORAGE-INVENTORY.md, UNIFIED-PLATFORM.md

## Working tree note (post-push)

Local dirty files typically remain for **generated/ops churn** and were **not** committed:

- `data/build-info.json`, `data/health.json`, `data/live.json`, `data/publish-state.json`
- `status.html`, `debug.html`, `kiosk.html`
- design-system demo/shell HTML, `wds-build.js`
- `waypoint-importer/assets/waypoint-importer.desktop`

---

# Technical Debt

Prioritized:

1. **P1 — Photo Coach legacy vs growth storage consolidation** (data-loss risk if rushed)
2. **P1 — Dashboard favorites single source of truth**
3. **P1 — National-mode content honesty** outside Pike editorial zone
4. **P2 — Consolidate kiosk boot onto `wds-app-boot.js`**
5. **P2 — Remove or isolate RI v1** after call-site audit
6. **P2 — Weather in-flight request dedupe**
7. **P2 — Foundation script `?v=` cache busting**
8. **P2 — Untrack or segregate engine publish artifacts** from everyday git status
9. **P3 — Terrainbound residue cleanup** in education maps
10. **P3 — Fieldry dual meta/extensions mirror consolidation**
11. **P3 — Automated a11y CI**

---

# Risks

| Risk | Severity | Monitoring |
|------|----------|------------|
| Silent geography regressions | High (mitigated) | Keep location-sensitive validators + hardening tests in CI |
| Engine `live.json` leaking into user weather/rivers | High (guarded) | `validate-location-sensitive`, homepage smoke `hasKansasRiverLeak` |
| Accidental commit of Kansas engine snapshots | Medium | Review diffs; prefer ignore/untrack strategy |
| Photo Coach storage split user confusion | Medium | Document; migrate deliberately |
| Knowledge sample mistaken for completeness | Medium | Keep UI labels; expand docs |
| Large dashboard bundle regressions | Low–Medium | Performance budget optional |
| XSS via new innerHTML features | Medium | Code review checklist; escape helpers |
| Client-side privacy only | Accepted | Disclose; backend later |

---

# Recommended Next Sprint

## Single highest-value next sprint: **National-mode honesty + weather request coalescing + dashboard favorites cleanup**

### Why this over alternatives

- Location correctness bugs that caused wrong *coordinates* are largely closed; the remaining user-trust issue is **wrong editorial framing** (Pike-centric content presented as local for distant users).
- Weather coalescing reduces provider load and flaky UI under refresh storms—pairs naturally with dashboard work.
- Favorites dual-read is a small, high-clarity consistency win on the same surface.
- Photo Coach storage consolidation is valuable but higher data-loss risk—better as its own dedicated sprint with migration fixtures.
- Fieldry media attach is product expansion, not stability—lower priority immediately after a hardening sprint.

### Success criteria (suggested)

1. Distant users see explicit “national educational” framing—not implied local Pike intelligence.
2. Weather service dedupes identical in-flight requests.
3. Favorites read/write only `widgets-v4` (legacy key read-only migrate-once).
4. Validators + smoke remain green.

---

# Overall Assessment

Waypoint Studio after this audit is a **credible multi-product platform with a real shared kernel**, not a loose collection of demos. The July work closed the class of bugs that most damage trust: **wrong place, wrong boot, wiped APIs, and quiet fallbacks**. Test coverage and CI now better match the architecture’s importance.

The repository is **not** “done.” Foundations are intentionally incomplete; Photo Coach carries parallel storage; the dashboard bundle is heavy; national content honesty remains a product-engineering problem. Those are **known, documented debts**, not unknown footguns.

For a senior engineer joining tomorrow: trust `WDS.observations`, `WDS.knowledge`, `WDS.platform`, and coordinates-first OIP; never reintroduce silent Pike/Kansas defaults; keep future-data disabled; treat `data/live.json` as engine ops, not user truth; run the hardening + location validators before merging location-sensitive changes.

**Engineering grade after sprint: shippable core instruments, disciplined foundations, improved reliability posture.**

---

## Appendix A — Verification commands

```bash
node automation/test-platform-hardening.mjs
node automation/test-platform-foundation.mjs
node automation/test-knowledge-platform.mjs
node automation/test-fieldry-mvp.mjs
node automation/test-photographer-profile.mjs
node automation/test-personalized-coaching.mjs
node scripts/validate-location.mjs
node scripts/validate-dashboard-data.mjs
node scripts/validate-surface-consistency.mjs
node scripts/validate-location-sensitive.mjs
# With static server + Chrome:
python3 -m http.server 8080 &
node automation/smoke-browser.mjs http://127.0.0.1:8080
node automation/test-kiosk-location-boot.mjs http://127.0.0.1:8080
```

## Appendix B — Related documents

- `docs/UNIFIED-PLATFORM.md`
- `docs/PLATFORM-ARCHITECTURE.md`
- `docs/WAYPOINT-KNOWLEDGE-PLATFORM.md`
- `docs/WAYPOINT-OBSERVATION-STANDARD.md`
- `docs/FIELDRY-LIFE-LIST-MVP.md`
- `docs/STORAGE-INVENTORY.md`
- `docs/ROADMAP.md`

---

*End of report.*
