# Route Inventory — Waypoint Studio Production (2026-07)

**Base:** `https://waypointstudio.org`  
**Production SHA:** `59c09de`  
**Evidence:** `docs/audits/evidence/2026-07/json/route-results.json`

## Summary

| Metric | Value |
| --- | --- |
| Routes crawled | 84 |
| HTTP 200 | 77 |
| HTTP 404 | 7 |
| Visual: current | 49 |
| Visual: incomplete | 16 |
| Visual: broken | 9 |
| Visual: asset / internal | 10 |

## Primary product routes

| URL | Title / purpose | Status | Visual | Notes |
| --- | --- | ---: | --- | --- |
| `/` | Home — Dashboard Rebuild | 200 | current | Canonical Home; `dash-tile-layout-1` |
| `/apps/dashboard/` | Same Rebuild shell | 200 | current | Alias of Home |
| `/apps/scenes/` | Scenes hub | 200 | current | Review → Import journey |
| `/apps/photo-coach/` | Photo Coach | 200 | current | Live craft tool |
| `/apps/photo-library/` | Photo Library | 200 | incomplete* | Live; unfinished-language heuristic may flag |
| `/apps/hidden-landscapes/` | Hidden Landscapes | 200 | current | Experimental studio |
| `/apps/scenes/living-scenes/` | Living Scenes preview | 200 | incomplete | “Future experience” — no controls |
| `/apps/scenes/scene-builder/` | Scene Builder preview | 200 | incomplete | Links to early monolith |
| `/apps/waypoint-scenes/` | Legacy Scenes monolith | 200 | incomplete | Competing implementation |
| `/apps/shed-hunting/` | Sheds home | 200 | current | CTA to map |
| `/apps/shed-hunting/map/` | Sheds map | 200 | incomplete* | Foundation; tile paint issues observed |
| `/sheds/`, `/map/`, `/scenes/` | Redirects | 200 | current | To canonical apps |
| `/about.html` | About / mission | 200 | incomplete* | Mission clear; incubator language |
| `/contact.html` | Contact + FormSubmit | 200 | incomplete* | Works with mailto fallback |
| `/privacy.html` | Privacy | 200 | current | |
| `/terms.html` | Terms | 200 | incomplete* | |
| `/support.html` | Support FAQ | 200 | incomplete | “Coming later” incubator card |
| `/incubator/` | Future products | 200 | incomplete | Correctly de-emphasized |
| `/settings.html` | Settings | 200 | incomplete* | |
| `/knowledge.html` | Knowledge | 200 | current | |
| `/articles/` | Articles | 200 | incomplete* | |
| `/status.html` | Live engine status | 200 | internal | robots-disallowed, publicly fetchable |
| `/debug.html` | Debug snapshot | 200 | incomplete | robots-disallowed, publicly fetchable |
| `/kiosk.html` | Standalone kiosk | 200 | current | Uses V3 brief path |
| `/dashboard.html` | Redirect → `/` | 200 | current | |
| `/favicon.ico` | Favicon | **404** | broken | Browser failed request |

\* “incomplete” often from heuristic matching words like incubator/coming/future in page body — verify individually.

## 404 / missing product routes

| URL | Expected? | Finding |
| --- | --- | --- |
| `/apps/scenes/portfolio/` | Portfolio suite | **404** — unmerged feature branch only |
| `/apps/scenes/portfolio/assistant.html` | Portfolio Assistant | **404** |
| `/apps/scenes/portfolio/builder.html` | Auto Portfolio Builder | **404** |
| `/apps/scenes/portfolio/health.html` | Portfolio Health | **404** |
| `/apps/scenes/portfolio/output.html` | Website output | **404** |
| `/private/` | Gated university | **404** on Pages (removed from artifact) |
| `/waypoint-importer/` | Desktop importer docs | **404** on Pages |

## Incubator / lifestyle apps (public, not flagships)

All returned 200 in crawl unless noted: SignalTerrain (+ cyber), Steepleaf, Savant Sommelier, Volunteer, ForageCast, Fieldry, Landscape Interpretation, Terrainbound, Animal Vision, Photo Pipeline.

## Assets

| URL | Status | Role |
| --- | ---: | --- |
| `/data/build-info.json` | 200 | Deploy fingerprint — commit `59c09de` |
| `/data/live.json` | 200 | Live engine payload |
| `/data/health.json` | 200 | Health payload |
| `/sitemap.xml` | 200 | Crawl seed |
| `/robots.txt` | 200 | Disallows status/debug/importer/private |
| `/site.webmanifest` | 200 | PWA metadata (no SW) |

## Classification legend

- **current** — appears to be an active intended surface
- **incomplete** — preview, unfinished language, or foundation UX
- **broken** — 404 / unreachable / error page behavior
- **internal** — operator tooling exposed over HTTPS
- **asset** — non-HTML payload
