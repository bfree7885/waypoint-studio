# Home RC1.1 — Production Report

**Date:** 2026-07-23  
**Domain:** https://waypointstudio.org/  
**Authority:** `docs/rebuild-2026/home-rc1.1-navigation-owner-review.md`

---

## Release commit SHA

| Item | Value |
|------|--------|
| **Release commit** | **`5c4121f`** (`5c4121fe64aafb145b23225cad1e753a475d51c9`) |
| Message | `fix(home): finalize navigation and remove kiosk terminology` |
| Pre-release `origin/main` | `6f050ed` |
| Push | Fast-forward `6f050ed..5c4121f` → `origin/main` |

---

## Deployment status

| Step | Result |
|------|--------|
| Pages workflow | [29977825511](https://github.com/bfree7885/waypoint-studio/actions/runs/29977825511) — **completed / success** |
| Live `data/build-info.json` | **`shortCommit`: `5c4121f`** · `source`: `github-pages` · `builtAt`: `2026-07-23T03:46:04.731Z` |
| Deploy verify harness | `EXPECTED_SHA=5c4121f node automation/verify-production-deploy.mjs` — **OK** (home fingerprint match, **0** failed critical routes) |

Product release SHA and live build SHA matched at verification time: **`5c4121f`**.

---

## Files changed

Release commit only (unrelated `data/*`, `debug.html`, `status.html`, phase2/phase3 docs noise excluded):

### Navigation / shell
- `design-system/ecosystem/nav-registry.json`
- `design-system/js/platform/wds-app-nav-config.js`
- `design-system/js/platform/wds-app-shell.js`
- `design-system/js/platform/wds-platform-catalog.js`
- `design-system/js/platform/wds-platform-boot.js`
- `design-system/js/platform/wds-platform-workflows.js`

### Rebuild (user chrome)
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js`

### Public pages / links
- `404.html`, `about.html`, `support.html`, `settings.html`, `sitemap.xml`
- `apps/dashboard/contact.html`
- `articles/manifest.json`, `articles/samples/reading-todays-conditions.html`
- `articles/categories/*/index.html`

### Tests / evidence / docs
- `automation/test-home-rc1.mjs`, `automation/test-dashboard-rebuild-phase1.mjs`, `automation/test-dashboard-os-routes.mjs`
- `automation/capture-home-rc1.1.mjs`
- `docs/rebuild-2026/home-rc1.1-navigation-owner-review.md`
- `docs/rebuild-2026/home-rc1.1/` (owner-review screenshots)
- `docs/ENGINEERING-PLAYBOOK.md` (RC1.1 lessons)

---

## Pre-ship regression

| Suite | Result |
|-------|--------|
| `automation/test-home-rc1.mjs` | **46 passed** |
| `automation/test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `automation/test-dashboard-rebuild-phase2.mjs` | **94 passed** |
| `automation/test-dashboard-rebuild-phase3.mjs` | **100 passed** |
| `automation/test-dashboard-os-routes.mjs` | **40 passed** |
| `automation/validate-production-links.mjs` | **0 broken** (6 pre-existing empty `aria-busy` warnings) |
| `automation/test-waypoint-constitution.mjs` | **All passed** |
| `automation/a11y-smoke.mjs` | Soft-skip (missing `audits/live-site-qa` deps) — not a hard fail |

---

## Navigation verification

Live CDP capture against `https://waypointstudio.org/` (`docs/rebuild-2026/home-rc1.1/production/capture-meta.json`):

| Check | Desktop | Phone |
|-------|---------|-------|
| `productName` | Home | Home |
| Rebuild mount | yes | yes |
| Local nav | **Workspace · Customize** | **Workspace · Customize** |
| Kiosk in local nav | **absent** | **absent** |
| Kiosk chrome | **absent** | **absent** |
| Customize toolbar | Default · Minimal · Restore — **no Kiosk** | same |

Cache-busted curl of `/` and `/apps/dashboard/`: Rebuild Home host, `data-product-name="Home"`, SHA marker `5c4121f`, no static `Kiosk` / `Open Dashboard` / `Outdoor OS`.

---

## Footer verification

Live footer text (desktop + phone):

> Home · Private by default · Waypoint Studio  
> Contact · Support · Coming later · Something wrong? · Suggest an idea · About · Privacy

Contact ghost CTA remains **Back to Home**. Product line uses **Home**, not Dashboard.

---

## Broken-link results

| Check | Result |
|-------|--------|
| Local `validate-production-links.mjs` (pre-ship) | Checked **1671** · Broken **0** · Warnings **6** (pre-existing) |
| Live critical routes (`verify-production-deploy.mjs`) | **0** failures |
| Redirect loops (`/`, `/dashboard.html`, `/apps/dashboard/`) | **none** (`redirects=0`, HTTP 200) |

---

## Desktop screenshots

Live production (post-deploy):

| Viewport | File |
|----------|------|
| Workspace | [`home-rc1.1/production/01-desktop-home-workspace.png`](./home-rc1.1/production/01-desktop-home-workspace.png) |
| Customize | [`home-rc1.1/production/02-desktop-home-customize.png`](./home-rc1.1/production/02-desktop-home-customize.png) |

Owner-review (pre-ship local) retained under [`home-rc1.1/`](./home-rc1.1/).

---

## Mobile screenshots

| Viewport | File |
|----------|------|
| Workspace | [`home-rc1.1/production/03-phone-home-workspace.png`](./home-rc1.1/production/03-phone-home-workspace.png) |
| Customize | [`home-rc1.1/production/04-phone-home-customize.png`](./home-rc1.1/production/04-phone-home-customize.png) |

---

## Production verification

| Criterion | Evidence |
|-----------|----------|
| Home loads at `/` | HTTP 200 · Rebuild · `data-product-name="Home"` · live shot |
| Today Outside · Workspace · Customize | Visible desktop + phone |
| Kiosk absent from public UI | CDP localNav + Customize text assertions; curl |
| Footer / nav Home architecture | Footer says Home; Contact Back to Home; 404/About/Support Home · Scenes · Sheds · Articles · About |
| No visible “Open Dashboard” on Home | Curl + CDP |
| `/apps/dashboard/` same implementation | Same Rebuild host + Home product name + SHA |
| No broken links / redirect loops | Verify harness + curl |
| Desktop + mobile nav | Workspace · Customize only |
| Deployed SHA matches release | Live `build-info.json` = **`5c4121f`** |

---

## Final link audit

Scanned public HTML / sitemap / manifests / nav registry / platform catalog at release `5c4121f` for: Dashboard, Outdoor OS, Old Homepage, Volunteer, SignalTerrain, Steepleaf, Fieldry, Savant Sommelier, Kiosk, Open Dashboard.

### Intentional compatibility
- **`/apps/dashboard/`** path and internal `dashboard` product id (Home alias)
- Platform **nav-registry / nav-config / catalog** entries for incubator apps (Coming later): Volunteer, SignalTerrain, Steepleaf, Fieldry, Savant Sommelier
- App trees under `apps/{fieldry,signalterrain,steepleaf,savant-sommelier,waypoint-volunteer}/`
- Internal `#/kiosk` parse / `kiosk.html` (not linked from Home nav)
- Operational `debug.html` / `status.html` wording

### Archived documentation
- `reports/*` historical audits and council notes
- Rebuild docs under `docs/` (not Pages-primary product UI)

### Production UI (remaining copy outside RC1.1 approved file list)
These were **not** part of the approved RC1.1 commit set; Home chrome itself is clean. Track for a later cleanup:

| Surface | Remaining |
|---------|-----------|
| `articles/index.html` | “Dashboard” / Volunteer in lead copy |
| `articles/templates/article.html` | “Launch Dashboard” CTA |
| `settings.html` | “Dashboard” in places copy; Fieldry mention |
| `incubator/index.html` | Still names Dashboard among primaries |
| `apps/terrainbound/index.html` | Link labeled Dashboard |

**Not found on live Home `/` or `/apps/dashboard/`:** Outdoor OS, Old Homepage, Open Dashboard, Kiosk (user chrome), Volunteer / SignalTerrain / Steepleaf as primary nav.

---

## Known issues

1. **`#/kiosk` still parses** into internal glance mode without user-facing chrome — intentional keep from RC1.1.
2. **Articles index / template / settings / incubator** still contain some “Dashboard” wording outside approved RC1.1 files.
3. **a11y-smoke** could not run fully (missing `audits/live-site-qa` deps); constitution + route + Home suites covered the release gate.
4. Docs follow-up commit (this report + live screenshots) may advance live `build-info` SHA after product release `5c4121f`; product verification above was against **`5c4121f`**.

---

HOME RC1.1 LIVE AND VERIFIED
