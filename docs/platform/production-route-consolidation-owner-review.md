# Production route consolidation — owner review

**Branch:** `feature/production-route-consolidation`  
**Starting SHA:** `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` (production `main` tip / build `59c09de`)  
**Implementation / branch-tip SHA:** `a4c5d4409db228ee4c3c2fe98276d9216b7709c9`  
**Scope:** Targeted routing + shared-shell correction. No broad redesign. Not merged. Not deployed.

## Confirmed pre-change route map (production `59c09de`)

| Route | What production served |
|-------|------------------------|
| `/` | Full Dashboard rebuild (duplicate of `/apps/dashboard/`) |
| `/apps/dashboard/` | Full Dashboard rebuild |
| `/apps/scenes/` | RC3 marketing / journey landing (`scenes-home.css`) |
| `/apps/waypoint-scenes/` | Interactive Scenes studio (Photo Coach + Scene Builder) |
| `/apps/shed-hunting/` | Sheds product |
| `/articles/` | Articles hub (`waypoint-build=local` stamp bug) |
| Global nav **Scenes** | Pointed at `/apps/scenes/` (marketing), not the interactive app |

## Exact root cause

GitHub Pages deploys one static tree from `main`. Dashboard rebuild commits landed on `main`, so Home looked current. The interactive Scenes product remained at `/apps/waypoint-scenes/`, while primary nav continued to send people to the older `/apps/scenes/` landing. Those routes did not redirect to each other, so the Studio appeared to ship two generations at once.

## Final route map

| Route | Behavior after this branch |
|-------|----------------------------|
| `/` | Permanent client redirect → `/apps/dashboard/` (query + hash preserved) |
| `/apps/dashboard/` | **Canonical Dashboard** implementation |
| `/apps/scenes/` | **Canonical interactive Scenes** (moved from `/apps/waypoint-scenes/`) |
| `/apps/waypoint-scenes/` | Permanent redirect → `/apps/scenes/` (query + hash preserved) |
| `/scenes/` | Redirect → `/apps/scenes/` |
| `/apps/shed-hunting/` | Unchanged product |
| `/articles/` | Unchanged product; now included in build stamping |
| `/version.json` | Build identity endpoint (`buildSha`, `builtAt`, `environment`) |
| Unknown routes | GitHub Pages `404.html` (now stamped) |

## Redirect table

| From | To | Method | Query/hash |
|------|----|--------|------------|
| `/` | `/apps/dashboard/` | `meta refresh` + `location.replace` | Preserved |
| `/apps/waypoint-scenes/` | `/apps/scenes/` | `meta refresh` + `location.replace` | Preserved |
| `/scenes/` | `/apps/scenes/` | `meta refresh` + `location.replace` | Preserved |
| `/apps/scenes/photo-coach/` | `/apps/photo-coach/` | Existing | Preserved |
| `/dashboard/` / `dashboard.html` | `/apps/dashboard/` | Existing | Preserved |

No redirect loops: legacy Scenes is redirect-only; canonical Scenes is the interactive app; root redirects only to Dashboard.

## Canonical URL decisions

1. **Scenes:** `/apps/scenes/` is the single public interactive product URL.  
2. **Dashboard:** `/apps/dashboard/` is the single Dashboard implementation. `/` remains a public entry that immediately redirects.  
3. **Canonical tags:** Dashboard and Scenes declare absolute canonicals to those URLs.  
4. **Nav:** Home → `apps/dashboard/`; Scenes → `apps/scenes/`.

Approach chosen for Dashboard: **redirect `/` → `/apps/dashboard/`** so there is one rendered implementation and predictable history (entry hits `/`, then lands on the canonical app URL).

## Shared-shell changes

- Canonical Scenes keeps the existing `was-shell` mounts plus platform scripts (`wds-app-nav-config.js`, `wds-app-nav.js`, `wds-app-shell.js`, platform boot/UI).
- Marketing landing (`data-scenes-page="landing"` + `scenes-home.css` + stub engines) removed from the active path and archived under `apps/scenes/_retired-landing/`.
- Product-mode controls (Photo Coach / Scene Builder) remain — they are product UI, not a second Studio header.
- Photo Coach and profile pages now load shared CSS/JS from `../scenes/` (no dependency on `/apps/waypoint-scenes/` assets).

## Build-stamping correction

| Issue | Fix |
|-------|-----|
| `/articles/` missing from `HTML_FILES` | Added `articles/index.html` |
| `404.html` unstamped | Added to `HTML_FILES` + `waypoint-build` meta |
| No public version endpoint | `scripts/inject-build-metadata.mjs` writes `/version.json` |
| Local accidentally looking “production-like” | `WAYPOINT_FORCE_LOCAL=1`; CI without `GITHUB_SHA` throws |

Production Pages continues to inject `GITHUB_SHA`. Local trees stamp `local`.

## Dashboard tile adjustments

In `design-system/css/wds-dashboard-rebuild.css` (cache `dash-tile-density-2`):

- Removed large fixed widget `min-height` / `contain-intrinsic-size` floors (`8.35rem` / `9.5rem` / `10rem`).
- Widget body uses content-driven `flex-start` instead of stretching empty vertical space.
- Compact status / badge / state padding to reclaim header chrome.
- Category grouping and tile functionality preserved; no “Coming soon” tiles introduced.

## Files changed (high level)

- Moved interactive Scenes tree (`css/`, `js/`, `images/`, `assets/`, `index.html`) from `apps/waypoint-scenes/` → `apps/scenes/`
- Replaced `apps/waypoint-scenes/index.html` with redirect
- Replaced root `index.html` with Dashboard redirect
- Updated nav config, Photo Coach asset paths, experiences/scene-builder links, ecosystem hrefs, sitemap, 404
- `scripts/inject-build-metadata.mjs`, `version.json`, Dashboard rebuild CSS
- Automation path retargets + new `automation/test-production-route-consolidation.mjs`
- Screenshots under `docs/platform/screenshots/route-consolidation/`
- Archived former marketing landing in `apps/scenes/_retired-landing/`

## Before-and-after screenshots

Directory: `docs/platform/screenshots/route-consolidation/`

**Before (live production at audit time):**

- `before-scenes-1440.png` — marketing landing at `/apps/scenes/`
- `before-waypoint-scenes-1440.png` — interactive studio at legacy URL
- `before-dashboard-1440.png` — Dashboard rebuild

**After (this branch, static server):**

- `after-scenes-canonical-{375,390,430,768,1024,1440}.png` — interactive app at `/apps/scenes/`
- `after-scenes-legacy-redirect-*.png` — legacy URL resolves to the same interactive app
- `after-dashboard-*.png`, `after-root-redirect-*.png`, `after-articles-*.png`, `after-sheds-*.png`

## Tests run and exact results

| Suite | Result |
|-------|--------|
| `node automation/test-production-route-consolidation.mjs` | **45 passed**, 0 failed |
| `node automation/test-dashboard-tile-layout-repair.mjs` | **48 passed**, 0 failed |
| `node automation/test-photo-coach-shoot-review.mjs` | **41 passed**, 0 failed |
| `node automation/test-personalized-coaching.mjs` | All passed |
| `node automation/test-photographer-profile.mjs` | All passed |
| `node automation/test-waypoint-ai-guide.mjs` | All passed |
| Production stamp simulation (`GITHUB_ACTIONS=true GITHUB_SHA=…`) | Stamped **63** HTML files including articles + 404; wrote production `version.json` |
| Local restore (`WAYPOINT_FORCE_LOCAL=1`) | Restored `local` stamps |

**Totals counted for this sprint’s primary gates:** 45 + 48 + 41 = **134** automated assertions green on the consolidation-critical suites (plus supporting Coach/profile/AI suites above).

Note: `test-stabilization-scene-dashboard.mjs` still reports 2 pre-existing location-shell failures unrelated to this routing move.

## Production-equivalent verification

Local static server checks covered:

- `/` → Dashboard redirect document
- `/apps/dashboard/` → rebuild CSS present
- `/apps/scenes/` → interactive Coach/Builder + `data-wds-app-shell`
- `/apps/waypoint-scenes/` → redirect to `/apps/scenes/` (no second app tree)
- `/apps/shed-hunting/`, `/articles/`, `/version.json`
- Critical Scenes/design-system assets HTTP 200
- Mobile/desktop screenshot matrix at 375 / 390 / 430 / 768 / 1024 / 1440

## Remaining risks

1. **Hardcoded absolute bookmarks** to old `/apps/waypoint-scenes/js/*` or `/css/*` asset URLs will 404 (HTML redirects only). Photo Coach was retargeted; third-party bookmarks to deep assets may need follow-up asset redirects if they matter.
2. **Preview marketing subpages** under `/apps/scenes/living-scenes/`, `scene-builder/`, `photographer-profile/` still exist as secondary pages; primary nav no longer depends on them.
3. **PWA `start_url`** remains `/` (now a redirect). Acceptable; can be pointed directly at `/apps/dashboard/` later.
4. **Not deployed** until owner merge to `main`.
5. Large media under `apps/scenes/assets/` moved with the app; confirm Pages artifact size remains acceptable.

## Owner decision asked

Approve merge to `main` (which will deploy via Pages), or request follow-up before merge. This branch intentionally stops short of merge/deploy.
