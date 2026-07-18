# Public Site Audit — waypointstudio.org

**Date:** 2026-07-18  
**Scope:** Public marketing surfaces + product landings served from the repo root via GitHub Pages  
**Status:** Local fixes applied in this work block — **awaiting owner review** (do not commit until approved)  
**Live site note:** Production still lags local until deploy (e.g. Volunteer was 404 on live at audit time).

---

## Method

Inspected:

- Root marketing pages (`index`, `about`, `support`, `contact`, `privacy`, `knowledge`)
- Product landings under `apps/*`
- Navigation / footer (nav-registry + app shell)
- SEO assets, contact pathway, JS-disabled readability
- Live `https://waypointstudio.org` probes (headers + HTML samples)

Severity: **P0** blocks understanding or trust · **P1** wrong/missing platform representation · **P2** technical/SEO hygiene · **P3** polish

---

## Issue inventory

### P0 — Product explanation depends on JavaScript

| ID | Issue | Reproduction | Proposed fix | Status |
|----|-------|--------------|--------------|--------|
| A-01 | Homepage app directory showed only “Loading applications…” without JS | Open `/` with JS disabled | Ship static app cards in `#was-home-apps`; JS replaces when ready | **Fixed locally** |
| A-02 | SignalTerrain / Volunteer / Steepleaf / Savant / Sheds foundation mounts showed only “Opening…” | Open each `apps/*/index.html` without JS | Progressive static HTML inside foundation mount; keep content if JSON fetch fails | **Fixed locally** |
| A-03 | ForageCast / Fieldry / Dashboard heroes were loading-only | Open those landings without JS | Static product explanation (+ `<noscript>` where useful); loading copy explains the product | **Fixed locally** |

### P1 — Platform representation

| ID | Issue | Reproduction | Proposed fix | Status |
|----|-------|--------------|--------------|--------|
| A-10 | SignalTerrain underrepresented: one RF-heavy line; capability groups in JSON never rendered | Open SignalTerrain landing; read nav card | Two major areas (Radio & Spectrum + Cyber Awareness); render `capabilityGroups`; update nav/product copy | **Fixed locally** |
| A-11 | Waypoint Volunteer missing from Support app list and Contact “Related app” | Support → Applications; Contact → app select | Add Volunteer to Support cards + `contact-config.json` | **Fixed locally** |
| A-12 | Homepage hero framed as “Outdoor tools only” | Read `/` H1/lead | Observe · Understand · Create · Share across nature, photography, stewardship, volunteer service, signal intelligence, learning | **Fixed locally** |
| A-13 | About missing explicit privacy/education/curiosity/calm + anti-gamification language | Read About | Expand shared philosophy section; list full product family | **Fixed locally** |
| A-14 | Photo Coach not a top-level nav app | Apps launcher | **Intentional:** Photo Coach is an experience inside Scenes; Support + Scenes landings remain explicit entry points (documented in reconciliation) | Documented |

### P2 — Technical / SEO / discoverability

| ID | Issue | Reproduction | Proposed fix | Status |
|----|-------|--------------|--------------|--------|
| A-20 | No `robots.txt` | `GET /robots.txt` → 404 | Add allowlist + sitemap pointer; disallow ops paths | **Fixed locally** |
| A-21 | No `sitemap.xml` | `GET /sitemap.xml` → 404 | Add marketing + product URLs | **Fixed locally** |
| A-22 | No favicon / web manifest | Browser tab / install prompts | `favicon.svg` + `site.webmanifest` | **Fixed locally** |
| A-23 | Missing Open Graph / Twitter / canonical on key pages | View source on home/about/contact/support/privacy/ST/Volunteer | Add meta + canonical | **Fixed locally** (key pages) |
| A-24 | No custom `404.html` | Hit unknown path on Pages | Calm 404 with product links | **Fixed locally** |
| A-25 | Contact form categories/apps empty without JS | Contact with JS off | Mailto fallback `<noscript>`; keep FormSubmit path with JS | **Fixed locally** |
| A-26 | Live FormSubmit delivery for `contact@waypointstudio.org` | Prior verification report | Owner: deploy + activation + second delivery test | **Owner action** — see Contact docs |

### P3 — Layout / a11y / polish

| ID | Issue | Reproduction | Proposed fix | Status |
|----|-------|--------------|--------------|--------|
| A-30 | Global chrome (nav/footer) requires JS | Disable JS | Acceptable for shell; static main content now explains products | Partial — shell still JS |
| A-31 | Dark-first visual system; limited explicit light-mode product skins | Toggle OS light mode | Prefer system tokens over time; not blocking | Open |
| A-32 | Inter + Cormorant still Google Fonts network dependency | Block fonts.googleapis.com | Optional self-host later | Open |
| A-33 | Design-system demos publicly reachable | `/design-system/...` | Not marketed; optional robots disallow later | Open |
| A-34 | Ops pages public (`status`, `debug`, `kiosk`) | Direct URLs | Disallowed in robots; not linked from marketing | Mitigated |
| A-35 | Structured data (JSON-LD Organization/SoftwareApplication) absent | Rich results test | Optional follow-up | Open |
| A-36 | Apple touch icon / PNG favicon pack absent | iOS home screen | SVG only for now | Open |

### Links & forms

| ID | Issue | Reproduction | Proposed fix | Status |
|----|-------|--------------|--------------|--------|
| A-40 | Support deep-links to contact categories | Click Report a bug | Works with JS | OK |
| A-41 | Footer Contact / Support / About / Privacy | App shell footer | Injected by JS; links correct when shell loads | OK with JS |
| A-42 | External maps/weather third parties | Privacy page | Honestly disclosed | OK |
| A-43 | Knowledge page labels demo fixtures | Knowledge | Correct honesty | OK |

### Mobile / tablet / desktop

| ID | Finding | Severity | Notes |
|----|---------|----------|-------|
| A-50 | Marketing pages use shared WDS shell + clamp typography | — | Generally responsive |
| A-51 | Foundation landings single-column ≤48rem | — | Fine on phone/tablet |
| A-52 | Dashboard / ForageCast / Fieldry denser when live | P3 | Live tools need real-device smoke after deploy |

### Console / JS failures (local contracts)

| ID | Finding | Status |
|----|---------|--------|
| A-60 | `automation/test-contact-platform.mjs` — 122 PASS | OK |
| A-61 | `automation/test-waypoint-volunteer.mjs` — PASS | OK |
| A-62 | Foundation boot: if JSON fails, preserve static HTML | **Fixed locally** |

---

## Accessibility snapshot

| Check | Result |
|-------|--------|
| Skip link to `#main` | Present on audited pages |
| Landmark `<main>` | Present |
| Visible H1 without JS (after fixes) | Present on audited landings |
| Keyboard / ARIA for Apps launcher | Depends on app shell JS |
| Form labels on Contact | Present; selects filled by JS |
| Color contrast | Dark theme generally strong; not Lighthouse-certified this sprint |

---

## Images & icons

| Asset | Finding |
|-------|---------|
| Homepage | No hero image (composition is typography + app directory) — intentional, not broken |
| Scenes | Local hero/mist assets present |
| Favicon | Was missing → **added** `favicon.svg` |
| OG image | Points at `assets/images/hero.jpg` |

---

## Redirects & routes

| Route | Behavior |
|-------|----------|
| `/dashboard.html` | Canonical stub → `apps/dashboard/` |
| `/apps/terrainbound/` | Retired → Fieldry/Dashboard messaging |
| `/apps/waypoint-volunteer/` | Local OK; **live was 404** until deploy |
| Unknown paths | GitHub default 404 → custom `404.html` after deploy |

---

## Severity summary

| Severity | Count (open after local fixes) |
|----------|--------------------------------|
| P0 | 0 remaining (fixed locally; need deploy) |
| P1 | 0 remaining (Photo Coach hierarchy documented) |
| P2 | A-26 owner activation; A-35/A-36 optional |
| P3 | A-31–A-34 polish |

---

## Recommended owner review order

1. Homepage, About, SignalTerrain, Volunteer landings (JS on and off)  
2. Support + Contact related-app list includes Volunteer  
3. `robots.txt` / `sitemap.xml` / favicon / 404  
4. FormSubmit activation after deploy (A-26)
