# Placeholder audit — production quality sprint

**Branch:** `feature/quality-placeholder-audit`  
**Date:** 2026-08-08  
**Base:** `origin/main` @ `1245c7c`  
**Author:** Bryan Freeman \<bfree7885@gmail.com\>

## Goal

Find every user-facing placeholder that leaves production users at a dead end
(Coming Soon, empty roadmap shells, feature announcements without usable
software, misleading “Coming later” links) and replace with real wiring,
helpful explanation, graceful unavailable, or hide-until-ready.

Honest **Experimental** maturity and **sample/demo** data labels remain where
accurate — they are trust signals, not blockers.

## Method

Searched production HTML/JS/JSON for: `coming soon`, `Coming later`,
`placeholder`, `roadmap`, `not implemented`, `honest empty shell`,
`on the horizon`, `Features in development`, `sample-demo`, WIP, lorem.

Scoped surfaces: Homepage/Dashboard, Scenes, Sheds, Articles, Side Trails,
SignalTerrain, Global Signals, Support, About, Incubator, related apps.

## Inventory & dispositions

| ID | Location | Severity | Finding | Disposition |
|----|----------|----------|---------|-------------|
| GS-1 | `side-trails/global-signals/waypoint-take/` | **High** | “Coming soon · not implemented” empty shell | **Wire** — explain + CTAs to Articles & dashboard |
| GS-2 | `side-trails/global-signals/supply-chains/` | **High** | Same empty shell | **Wire** — Industries + Relationship Graph |
| GS-3 | `side-trails/global-signals/scenario-explorer/` | **High** | Same empty shell | **Wire** — Explain This + Relationship Explorer |
| GS-4 | `side-trails/global-signals/about/` Roadmap | **High** | User-facing roadmap listing dead-end shells | **Explain** — “What you can use today”; remove Coming soon links |
| GS-5 | `wds-gs-industries.js` cross-nav | **Med** | Linked to Supply Chains shell | **Wire** — Relationship Explorer instead |
| GS-6 | `wds-gs-countries.js` + `countries.json` | **Med** | Stale “Citizen Impact is Coming soon shell” copy | **Explain** — Citizen Impact is live |
| ST-1 | `side-trails/signalterrain/` Roadmap | **Med** | Now/Next/Later product roadmap for users | **Explain** — Status & boundaries; primary CTA → existing app |
| ST-2 | SignalTerrain dashboard mockup | **Low** | Labeled sample mockup (honest) | **Keep** — banner says sample-only; CTA demoted |
| SC-1 | `apps/scenes/living-scenes/` | **Med** | Preview-only dead end (Back only) | **Wire** — Photo Coach, Hidden Landscapes, Scene Builder |
| SC-2 | `apps/waypoint-scenes/` “On the horizon” panel | **High** | Feature announcement grid without software | **Hide** — replaced with “What works in this studio” |
| SC-3 | Photo Coach → Scene bridge pending options | **Med** | Cinematic/3D/wallpaper “Coming later” | **Hide** — only live options shown |
| SC-4 | Scene Builder copy / learn / export notes | **Low** | “come later” / “on the horizon” | **Explain** — not available yet |
| NAV-1 | About / Support / Side Trails / 404 | **Med** | Link text “Coming later” → incubator (apps exist) | **Explain** — label **Incubator** |
| APP-1 | `wds-app-preview.js` | **Med** | Always rendered “Features in development” | **Hide** empty; rename to “Honest limits” when present |
| APP-2 | `apps/terrainbound/data/preview.json` | **Low** | `placeholder` label + roadmap-ish comingSoon | **Explain** — retirement limits; drop “placeholder” word |
| APP-3 | `apps/savant-sommelier/data/preview.json` | **Low** | Feature roadmap as comingSoon | **Explain** — honest data limits |
| APP-4 | `apps/signalterrain/data/preview.json` | **Low** | “later roadmap phases” learn item | **Explain** — out of scope wording |

### Intentionally retained (not placeholders that block use)

| Item | Why keep |
|------|----------|
| Global Signals **Experimental · sample/demo** labels | Honest maturity + curated-demo trust |
| Scenes **Experimental / Preview / Future experience** status chips | Accurate maturity (Living Scenes remains Future; actions now link out) |
| Dashboard weather `isPlaceholder` recovery | Internal honesty for failed weather packages — not UI copy |
| Input `placeholder=` attributes | Form UX hints, not product stubs |
| Scenes engine stubs (`*Engine.* is not implemented`) | Dev interfaces; UI routes to real Photo Coach / Scene Builder |
| `apps/waypoint-scenes/js/coming-soon.js` | Orphaned after panel removal; unused at runtime |
| Platform `planned` → “Coming later” chip in foundation/shell | System maturity for truly planned catalog entries; incubator link text fixed |
| Phenology `comingSoon` species groups labeled “On watch” | Seasonal watch lists, not feature stubs |
| SignalTerrain mockup page | Explicitly sample-only; not presented as live app |
| Articles “sample” editorial essays | Labeled samples; full publishers remain destinations |
| Hidden Landscapes `image-sets.json` scaffold | Data model scaffold; not a user-facing dead page |

### Remaining gaps (owner review)

1. **Living Scenes** module page is still a Future experience (no animation UI) — now exits to working tools; building real Living Scenes is out of scope for this sprint.
2. **GS named routes** (`waypoint-take`, `supply-chains`, `scenario-explorer`) remain as soft entry points that redirect attention to live modules — not full studios. Long-term: 301 to live modules or remove routes.
3. **Scene Builder** still lacks video/wallpaper export — honestly unavailable; no fake buttons.
4. **Platform “Coming later”** chip string for `planned` catalog status — consider renaming to “Planned” site-wide in a follow-up (studio-home already uses “Planned”).
5. **SVG portfolio placeholders** under `apps/waypoint-scenes/images/portfolio/` — decorative; replace with real photos when available (not blocking navigation).

## Tests touched

- `automation/test-global-signals.mjs` — shells must **not** contain Coming soon / not implemented; must offer primary CTAs
- `automation/test-signalterrain-landing.mjs` — Status & boundaries instead of Roadmap

Ran: `test-global-signals`, `test-signalterrain-landing`, `test-global-signals-industries`, `test-global-signals-countries` — pass.

## Owner review path

1. Review this branch (do **not** merge until approved).
2. Spot-check: GS shells, GS About, SignalTerrain landing, Living Scenes, Scene Builder Field Guide, Incubator link labels.
3. Confirm Experimental / sample-demo labels still feel honest, not apologetic.
4. Decide follow-ups: hard redirects for GS soft routes; rename platform “Coming later” chip; Living Scenes implementation milestone.

## Recommendation

**Approve and merge after owner review** of the three former GS shells and Scene Builder Field Guide change — highest user-impact fixes. Defer full Living Scenes implementation and platform chip rename to separate milestones.
