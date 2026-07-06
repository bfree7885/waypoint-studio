# Waypoint Studio — Master Development Roadmap

**Status:** Official  
**Last updated:** July 2026  
**Basis:** Project Health Report (July 2026)

This roadmap organizes Waypoint Studio into five phases. Each phase builds on the last. Phases 3 and 4 may overlap after Phase 1 is complete, but Phase 1 must finish first.

**Guiding constraints (do not violate):**

- Static-first, no-build deployment
- OIP as the single intelligence API
- Research integrity labeling (editorial ≠ live ≠ verified ≠ prediction)
- Four-instrument portfolio: Dashboard · ForageCast · Fieldry · Scenes
- No accounts or cloud sync until explicitly scoped post–Phase 4

---

## Phase 1 — Stability

### Goal

Make the dashboard and cross-app navigation trustworthy, fast, and field-usable on mobile and desktop — without adding new features or changing product direction.

### Why it matters

The health report identified broken links, dead nav targets, a 65-script loader waterfall, touch targets below field-use standards, and uncommitted automation hardening. Users cannot build a morning dashboard habit when the first click fails or the page loads slowly. Every later phase depends on a stable foundation.

### Definition of done

- Zero broken navigation links on the homepage and the four instrument entry points (manual checklist pass)
- Top nav section hashes resolve to visible DOM on the default dashboard layout
- Homepage cold load measurably improved (lazy-load or split of non-critical scripts)
- Dashboard touch targets meet 44px minimum on primary controls
- Week-away reliability files committed; preflight checklist passes
- Legacy render paths documented as deprecated or removed from the hot path
- No regressions in: location, weather, customize, ForageCast, Fieldry, or Scenes load

### First 3 tasks

1. **Fix broken navigation** — Audit and repair `#experiences`, `#how-waypoint-works`, `#conservation-update`, and orphan hash links across apps; align homepage top nav with sections that actually render on the default morning preset.
2. **Reduce homepage JS load** — Address the 65 sequential scripts in `wds.js`; lazy-load or defer domain dashboard modules not needed on first paint.
3. **Mobile touch-target pass** — Bring widget toggles, customize controls, refresh buttons, and section collapse to 44px minimum on dashboard and shared nav.

---

## Phase 2 — Outdoor Intelligence

### Goal

Expand real regional intelligence beyond Pike editorial plus Open-Meteo — county by county, provider by provider — through OIP adapters, with honest labeling at every layer.

### Why it matters

The dashboard is the product users open every morning. All ten indexed counties currently point to the Pike bundle. Most of the ~69 registered widgets are editorial previews or `futureProvider` stubs. Outdoor intelligence is Waypoint Studio's core differentiation — contextual field knowledge tied to place and season, not another generic weather app.

### Definition of done

- At least two distinct county content bundles live (not Pike narrative with a different label)
- At least three new live data domains connected through OIP (e.g. weather+, water, wildlife, or trails)
- Every widget displays the correct integrity tag (Live / Editorial / Preview / Unavailable)
- No widget implies live agency data when showing editorial or placeholder content
- Dashboard presets (Morning / Explorer / Forager / Photographer) expose new intelligence appropriately

### First 3 tasks

1. **Second county bundle** — Create an honest regional bundle (e.g. Monroe or Wayne PA) with distinct phenology, trails, and conservation copy; wire `regions-index.json` to the correct bundle.
2. **Live weather expansion** — Expose hourly/daily widgets via customize; refine the morning brief with weather-driven go/caution/wait logic.
3. **First live domain adapter** — Connect one high-value provider through OIP (e.g. USGS water gauges or eBird migration) with unavailable states when no nearby station or data exists.

---

## Phase 3 — ForageCast

### Goal

Make ForageCast the definitive educational instrument for why species appear where and when — grounded in habitat, season, and honest uncertainty.

### Why it matters

ForageCast is the flagship laboratory in Strategic Direction. The dashboard answers "what's happening today"; ForageCast answers "why here, why now" — the Understand step in *Observe · Understand · Create · Share*. Today, `teachersNotebook` exists in the Pike bundle but is never rendered, `relatedLessons` IDs have no routes, and the heat map is illustrative without clear integrity labeling.

### Definition of done

- `teachersNotebook` or equivalent educational content visible on ForageCast or the dashboard
- Zero dead lesson links; `relatedLessons` wired to real routes or removed
- WSKB expanded to a priority forage species set (target: 15+ records)
- Heat map and habitat copy pass research integrity review
- ForageCast navigation to dashboard and Fieldry works without broken hashes

### First 3 tasks

1. **Render `teachersNotebook`** — Surface the rich JSON already in `pike-county-pa.json` on ForageCast or a dedicated dashboard module.
2. **Fix education links** — Wire `relatedLessons` to WEF routes or remove dead IDs; align "How Waypoint works" copy across apps.
3. **WSKB species expansion** — Add priority forage taxa (e.g. Morchella, Cantharellus) with ForageCast deep links from heat map and species spotlight.

---

## Phase 4 — Fieldry

### Goal

Complete the observation loop — from field capture to structured WOS records to WSKB-aware species documentation — still local-first and private by default.

### Why it matters

Fieldry is how users contribute to the platform's long-term mission without compromising privacy. The Constitution requires optional, honest citizen science — not gamified collection. Fieldry MVP works (hash routing, local WOS, JSON/CSV export), but taxon matching is unprepared, mobile forms are unpolished, and WOS validation is incomplete. The platform promises an observation loop it has not yet closed.

### Definition of done

- New observation completable on mobile in under 60 seconds
- WOS validation prevents incomplete "research-grade" claims
- WSKB taxon linking works for indexed species; unmatched taxa labeled honestly
- WOES ethics check on the observation submission path
- Dashboard Fieldry widget reflects local observation count accurately
- Export produces valid WOS JSON documented for users
- No cloud accounts or sync (explicitly out of scope until post–Phase 4 gate)

### First 3 tasks

1. **WOS validation on save** — Enforce required fields and integrity tiers; block research-grade claims without supporting data.
2. **WSKB taxon autocomplete** — Connect `fieldry-form.js` to the WSKB index for species search and profile linking.
3. **Mobile field form flow** — Single-thumb layout for new observations; verify offline-first UX messaging and geolocation ethics prompt.

---

## Phase 5 — Waypoint Scenes (AI-Powered Outdoor Photography Coach)

### Product direction

Waypoint Scenes evolves from a creative studio centered on animated "Living Scenes" into an **AI-powered outdoor photography coach**. Its primary purpose becomes helping users improve nature, wildlife, landscape, hiking, and outdoor photography through:

- Overall assessment
- Composition analysis
- Lighting analysis
- Subject analysis
- Suggested edits with explained rationale
- Learning-focused photography coaching
- Portfolio tracking

**Animated Living Scenes remain a future feature inside Scenes** — not the primary purpose of the app.

### Why this direction better supports the Waypoint Studio mission

| Mission step | How coaching serves it |
|--------------|------------------------|
| **Observe** | Users already go outside with cameras; Scenes meets them at capture and review |
| **Understand** | Composition, lighting, and subject analysis teach *why* a photograph works |
| **Create** | Suggested edits and explained improvements build skill over seasons |
| **Share** | Better photographs shared honestly advance outdoor storytelling without gamification |

Animation-first positioning competes with generic creative tools and underuses Waypoint's outdoor intelligence context (light, season, species, place). Coaching tied to outdoor photography is differentiated, defensible, and reusable across hikers, birders, foragers, and educators. It stays educational, private-by-default, and anti-gamification per the Constitution. The dashboard says "go outside"; Scenes helps users *bring back* what they saw with more skill.

### Goal

Transform Waypoint Scenes into a local-first outdoor photography coach that analyzes user photos and teaches improvement — with portfolio tracking and optional future Living Scenes animation.

### Why it matters

Completes the *Create · Share* arc. Users who observe and understand through Dashboard, ForageCast, and Fieldry need a tool to improve how they visually communicate what they found. Scenes v0.1.0 (upload, parallax, collections, export) is 78% mature — the foundation exists; the product purpose should evolve to match the mission.

### Definition of done

- User can upload or select a photo and receive structured coaching (assessment plus one actionable improvement)
- Every AI output labeled as Interpretation with honesty caveats
- Portfolio stores coached sessions locally (localStorage or IndexedDB)
- Living Scenes available but not the primary entry point
- Photography coaching ties to outdoor context (light, season) where OIP data exists
- WOES review passed for wildlife photography ethics (distance, nesting, baiting)
- Constitution and research integrity review passed for coaching flows

### First 3 tasks

1. **Coaching MVP spec** — Define the analysis schema (assessment, composition, lighting, subject, one suggested edit with rationale); decide AI execution model respecting privacy defaults.
2. **Single-photo coaching flow** — Upload/select → structured feedback → learning explanation; preserve original; label all output as Interpretation.
3. **Local portfolio store** — Save coached sessions with date, location, tags, and coach notes; optional link to a Fieldry observation from the same outing.

---

## Recommended execution order

```
Phase 1 (Stability) → Phase 2 (Outdoor Intelligence, iterative)
                              ↓
            Phase 3 (ForageCast) ←→ Phase 4 (Fieldry) — parallel after Phase 1
                              ↓
                    Phase 5 (Scenes coaching)
```

---

## Highest-value next task

**Phase 1, Task 1: Fix broken navigation.**

Broken links are the fastest trust failure on a morning dashboard. They require no new APIs, no county bundles, and no architectural changes. Every other Phase 1 task — performance, mobile polish, automation — is harder to verify until navigation works.

---

*Update this document when phase gates are met or product direction is formally revised.*
