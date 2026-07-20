# Platform Experience & Discoverability — RC2 Sprint 4

**Status:** Implemented on `main` working tree  
**Date:** 2026-07-20  
**Goal:** Users discover capable apps naturally and reach useful functionality within 1–2 clicks.

## Summary

Sprint 4 reshapes Studio discovery around **Observe / Understand / Create / Share**, enriches every app with purpose · maturity · start-here · related apps, shortens click depth from homepage Launch buttons, and scaffolds an Articles architecture without shipping a large content library.

Dashboard V2 widget engine work from parallel sprints is intentionally untouched.

## UX changes

| Surface | Change |
|---------|--------|
| Homepage | Journey sections (Observe / Understand / Create / Share); cards show purpose, maturity chip, “Start here”, Launch → best experience, optional Overview |
| Nav registry | `purpose`, `maturity`, `startHere`, `journeys`, `related` on every public app |
| App landings | Related-app mounts via `WDS.platformDiscover`; foundation apps already expose primary CTAs |
| Cross-links | Workflows expanded (Dashboard→Scenes/Fieldry/ForageCast; Sheds→Dashboard; Scenes/Photo Coach→Dashboard; Volunteer→Fieldry; SignalTerrain→Dashboard) |
| Articles | Scaffold only — categories, template, sample, manifest, search prep |
| Nav copy | Homepage secondary links trimmed (Contact/Support live in footer) to reduce duplication |

## Click-depth improvements

| From | Before | After |
|------|--------|-------|
| Home → Volunteer utility | Home → landing → Discover | Home **Launch** → `discover.html` |
| Home → SignalTerrain brief | Home → landing → cyber brief | Home **Launch** → `cyber/live.html#brief` |
| Home → Sheds map | Home → landing → map | Home **Launch** → `map/` |
| Home → Scenes coaching | Home → Scenes hub → Photo Coach | Home **Launch** → `photo-coach/` |
| Home → Fieldry capture | Home → Fieldry hub | Home **Launch** → `#/new` |

Overview links remain for visitors who want context first.

## Cross-links added

Defined in `wds-platform-workflows.js` and/or `related` on nav apps:

- Dashboard → Photography (Scenes / Photo Coach), Hiking notes (Fieldry), Rivers/seasonal land (ForageCast)
- Sheds → Dashboard (+ Fieldry existing)
- Photography (Scenes / Photo Coach) → Dashboard
- Volunteer → Fieldry (existing) + related Landscape / Dashboard
- SignalTerrain → Dashboard (existing) + related mount on landing

## Articles scaffold paths

```
articles/
  index.html
  manifest.json
  templates/article.html
  samples/reading-todays-conditions.html
  categories/{observe,understand,create,share,field-craft,outdoor-intelligence}/index.html
design-system/js/platform/wds-articles.js
```

## Product consistency

- Terminology aligned to Observe / Understand / Create / Share (see also product framework).
- Maturity labels: Live · Early access · Foundation · Experimental.
- No “coming soon / lorem / placeholder” language on homepage cards.
- Start-here labels name the real first experience.

## Tests

- `automation/test-platform-experience-rc2.mjs`

## Related docs

- `NAVIGATION-ARCHITECTURE.md`
- `PLATFORM-CROSS-APP-WORKFLOWS.md`
- `WAYPOINT-PRODUCT-FRAMEWORK.md`

## Remaining gaps

1. Dashboard in-app “Continue in Studio” UI mount left for a non-conflicting Dashboard V2 surface (workflows are defined).
2. Articles library is scaffold-only — one sample piece.
3. Some SPA landings still boot straight into the app; related mounts are present but modest.
4. Launcher still groups by product category (Core / Outdoor / …) while homepage uses journeys — intentional dual views.
