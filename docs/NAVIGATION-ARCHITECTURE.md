# Navigation Architecture — Waypoint Studio

**Status:** Current as of RC2 Sprint 4  
**Sources of truth:** `design-system/ecosystem/nav-registry.json` ↔ `design-system/js/platform/wds-app-nav-config.js`

## Layers (do not duplicate roles)

| Layer | Role | Implementation |
|-------|------|----------------|
| **Global** | Brand home + Apps launcher | `wds-app-shell.js` → `.was-global` |
| **Local** | In-app feature tabs | `.was-local` from `app.features` |
| **Launcher** | Cross-app directory by category | `.was-launcher` (Apps button) |
| **Homepage** | Journey discovery + Launch CTAs | `index.html` + `js/studio-home.js` |
| **Footer** | Contact / Support / About / Privacy | Shared footer only — not a second app directory |
| **Breadcrumbs** | Rare; prefer local tabs + brand home | Avoid inventing a third trail |
| **Mobile** | Same layers; 44px targets; launcher dialog | Experience System V2 + shell CSS |

## Principles

1. **One job per layer** — global finds apps; local moves within an app; footer is support, not navigation.
2. **Start here over gateways** — Launch buttons target `startHere.href`, not always the marketing overview.
3. **Depth-aware hrefs** — `WDS.appNav.resolveRoute(route, depth)` / `startHereHref(app, depth)`.
4. **No mixed horizontal mega-nav** — apps are not listed as a top row of peer links on every page.
5. **Honesty** — Foundation / Early access / Experimental chips stay visible.

## Registry fields (v2.1)

Per app:

- `route`, `match`, `category`, `features` — navigation
- `description` — short launcher blurb
- `purpose` — why the app exists (homepage cards)
- `maturity` — display maturity label
- `startHere` — `{ label, href }` best first experience
- `journeys` — `observe` | `understand` | `create` | `share`
- `related` — peer app ids for cross-links

Top-level `journeys[]` describes the four pillars for homepage grouping (`appsByJourney()`).

## Cross-links

- Workflows: `WDS.platformWorkflows` (contextual “Continue in Studio”)
- Related mounts: `WDS.platformDiscover` + `[data-wds-related-apps]`

## Audit notes (Sprint 4)

| Finding | Resolution |
|---------|------------|
| Homepage hero duplicated Contact/Support already in footer | Trimmed hero to Articles / Knowledge / About / Settings |
| Volunteer / SignalTerrain / Sheds hid best UX behind landing | Homepage Launch deep-links; landings keep primary CTA above the fold |
| Category vs journey grouping | Launcher keeps categories; homepage uses journeys |
| Landscape Interpretation missing from nav-registry sync | Restored in registry + config |

## Editing checklist

1. Edit `nav-registry.json`
2. Regenerate or sync `wds-app-nav-config.js`
3. Keep `startHere` pointing at a real, working route
4. Prefer related-app mounts over inventing per-app mini-navs
