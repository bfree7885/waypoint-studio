# Navigation Architecture — Waypoint Studio

**Status:** Current as of Shed Hunting public-architecture Phase 1 (2026-08-29)  
**Sources of truth:** `design-system/ecosystem/nav-registry.json` ↔ `design-system/js/platform/wds-app-nav-config.js`  
**Canonical portfolio:** `docs/PRODUCT-DIRECTION.md`

## Studio primary / architecture nav

Shared global primary nav (`.was-primary-nav`) must expose:

**Dashboard · Shed Hunting · Deck · Articles · Support · About**

- **Shed Hunting** href is `/apps/shed-hunting/` (overview), not `/map/` and not `shedhunting.org`, while `shedDedicatedHostEnabled` is false (`design-system/ecosystem/origin-config.json`).
- Dedicated-host navigation (Phase 3) is documented in `docs/sheds/SHEDHUNTING-ORG-PHASE-2.md`. Do not emit live `https://shedhunting.org` hrefs in Phase 2.
- **Scenes is unpublished** — keep routes working; omit from primary nav, Explore public lists, homepage, About, Support, and sitemap.

- Hrefs are **site-root absolute** (`/side-trails/`, …) so nested routes cannot break peers.
- Depth for relative app/feature links uses **directory segment count** from the pathname.
- Legacy `data-shell-depth` / `shellDepth` values are **not** used for resolution (apps-era encoding assumed `/apps/*` only).

## Layers (do not duplicate roles)

| Layer | Role | Implementation |
|-------|------|----------------|
| **Global** | Brand + architecture primary nav (+ Explore launcher when not quiet) | `wds-app-shell.js` → `.was-global` |
| **Local** | In-app feature tabs | `.was-local` from `app.features` |
| **Launcher** | Cross-app directory by category | `.was-launcher` (Explore button) |
| **Homepage** | Journey discovery + Launch CTAs | Legacy `js/studio-home.js` surfaces; Quiet Home `/` is Rebuild workspace |
| **Footer** | Contact / Privacy / Terms | Trust footer — not a second app directory |
| **Breadcrumbs** | Rare; prefer local tabs + brand home | Avoid inventing a third trail |
| **Mobile** | Same layers; 44px targets; launcher dialog | Experience System V2 + shell CSS |

## Principles

1. **One job per layer** — global carries architecture destinations; local moves within an app; footer is trust, not navigation.
2. **Start here over gateways** — Launch buttons target `startHere.href`, not always the marketing overview.
3. **Depth-aware hrefs** — `WDS.appNav.resolveRoute(route, depth)` / `startHereHref(app, depth)`; primary nav prefers absolute `/` paths.
4. **Quiet Home** — hides Explore launcher, keeps calm primary nav (including Side Trails).
5. **Honesty** — Foundation / Early access / Experimental chips stay visible.

### Intentional exceptions

| Surface | Exception |
|---------|-----------|
| Shed Hunting field map | Immersive HUD — no studio primary nav; escape via Shed Hunting overview |
| Side Trails product landings | Custom product chrome (extended with studio destinations); not a second shell |
| Explore launcher | Secondary discovery; may still list demoted apps |

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
