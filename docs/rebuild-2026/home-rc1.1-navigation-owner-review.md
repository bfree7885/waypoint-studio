# Waypoint Studio 2026 Rebuild — Home RC1.1 Navigation & Duplicate Mode Fix

**Status:** Awaiting owner review — **stop here; do not commit / push / merge / deploy**
**Date:** 2026-07-22
**Authority:** Home lock · Home RC1 · Phase 2 visual lock
**Git:** Nothing committed, pushed, merged, or deployed in this work block

---

## Summary

Home RC1.1 removes the user-facing **Kiosk** duplicate of Workspace and updates public navigation/footer/below-page links to the Home architecture.

- Local chrome is now **Workspace · Customize** only (Kiosk removed from nav, Customize presets, and chrome labels).
- Internal glance/auto-refresh module remains loadable for hash/tests; it no longer paints user-facing “Kiosk” UI.
- Public pages (404, About, Support, Contact, settings, sitemap, sample article, platform catalog/boot) speak **Home**, not Dashboard / Explore-era directories.
- Phase 2 visual language (Today Outside, widget cards, spacing, quiet chrome) is unchanged.

---

## Files changed

### Navigation / shell
- `design-system/ecosystem/nav-registry.json` — remove Kiosk feature; `startHere` → Open Home → `/`
- `design-system/js/platform/wds-app-nav-config.js` — same
- `design-system/js/platform/wds-app-shell.js` — Contact comment (Home wording)
- `design-system/js/platform/wds-platform-catalog.js` — Dashboard product renamed Home for catalog display
- `design-system/js/platform/wds-platform-boot.js` — boot failure “return to Home”
- `design-system/js/platform/wds-platform-workflows.js` — Home wording

### Rebuild (Kiosk user chrome only)
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js` — `renderChrome()` empty; keep enter/exit
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` — remove “Kiosk layout” preset button
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` — comments only

### Public pages / links
- `apps/dashboard/contact.html` — Home labels; Back to Home
- `404.html` — Home · Scenes · Sheds · Articles · About (+ Support/Contact/Coming later)
- `about.html` — primary products = Home architecture
- `support.html` — Experiences = Home · Scenes · Sheds · Articles · About · Coming later
- `settings.html` — Home link label
- `sitemap.xml` — Home-first priorities; demote Volunteer/incubator as primary
- `articles/manifest.json` + `articles/samples/reading-todays-conditions.html` — Home wording / Open Home
- `articles/categories/*/index.html` — “Studio home” → “Home”

### Tests / capture
- `automation/test-home-rc1.mjs` — Kiosk/nav/404/about/support contracts
- `automation/test-dashboard-rebuild-phase1.mjs` — nav omits kiosk
- `automation/test-dashboard-os-routes.mjs` — Back to Home
- `automation/capture-home-rc1.1.mjs` — RC1.1 screenshots

### Deliverable
- `docs/rebuild-2026/home-rc1.1-navigation-owner-review.md` (this file)
- Screenshots under `docs/rebuild-2026/home-rc1.1/`

---

## Navigation changes

| Surface | Before | After |
|---------|--------|-------|
| Home local nav | Workspace · Customize · **Kiosk** | Workspace · Customize |
| Studio primary nav | Home · Scenes · Sheds · Articles · About | Unchanged (already correct) |
| `startHere` CTA | Open Dashboard / Open workspace → apps/dashboard | **Open Home** → `./` |
| Quiet Rebuild chrome | Unchanged brand + local features | Kiosk feature removed from config |

Quiet Home still hides studio primary (Phase 2 lock). Non-quiet pages keep primary **Home · Scenes · Sheds · Articles · About**.

---

## Removed Kiosk references (user-facing)

| Location | Change |
|----------|--------|
| Local nav feature `id: kiosk` | Removed from nav-registry + nav-config |
| Customize “Kiosk layout” button | Removed (Default / Minimal / Restore remain) |
| Kiosk chrome label + “Exit kiosk” | `renderChrome()` returns `""` |
| Capture / CDP checks | Assert localNav = Workspace, Customize only |

**Kept (internal):** `wds-dashboard-rebuild-kiosk.js` module, `#/kiosk` parseView, prefs `kiosk` preset id, CSS `wdb-r-kiosk` hooks, Phase 1–3 unit tests that call `Kiosk.enter()` directly.

---

## Updated footer links

Footer composition unchanged (Contact, Support, Coming later, Something wrong?, Suggest an idea, About, Privacy). Product line now consistently says **Home** (via `app.title`), not Dashboard.

| Link | Destination (from Home root) | Notes |
|------|------------------------------|-------|
| Waypoint Studio | `/` | Brand → Home |
| Contact | `apps/dashboard/contact.html` when on Home alias; root `contact.html` otherwise | Product-scoped |
| Support | `support.html` | Experiences aligned to Home IA |
| Coming later | `incubator/` | Incubator, not primary nav |
| About / Privacy | studio pages | Copy updated on About |

---

## Updated internal links

- Contact ghost CTA: **Back to Home**
- 404: Home architecture only (no Volunteer / SignalTerrain / ForageCast as recovery destinations)
- About primary products: Home, Scenes, Sheds, Articles
- Support Experiences: Home, Scenes, Sheds, Articles, About, Coming later
- Sample article CTA: **Open Home** → `/`
- Articles category crumbs: **Home** (was Studio home)
- Platform boot fail: return to **Home**
- Sitemap: `/` priority 1.0; `/apps/dashboard/` alias demoted; Volunteer no longer high-priority primary

---

## Broken-link results

`node automation/validate-production-links.mjs`

- Checked local refs: **1671**
- Broken: **0**
- Warnings: 6 (existing articles category empty `aria-busy` mounts — pre-existing, not introduced here)

---

## Desktop screenshots

Directory: [`docs/rebuild-2026/home-rc1.1/`](./home-rc1.1/)

| Viewport | File |
|----------|------|
| Desktop Workspace | [01-desktop-home-workspace.png](./home-rc1.1/01-desktop-home-workspace.png) |
| Desktop Customize | [02-desktop-home-customize.png](./home-rc1.1/02-desktop-home-customize.png) |

Verified in capture: localNav `Workspace`, `Customize`; no Kiosk chrome; Customize toolbar has no Kiosk word.

---

## Mobile screenshots

| Viewport | File |
|----------|------|
| Phone Workspace | [03-phone-home-workspace.png](./home-rc1.1/03-phone-home-workspace.png) |
| Phone Customize | [04-phone-home-customize.png](./home-rc1.1/04-phone-home-customize.png) |

---

## Regression results

| Suite | Result |
|-------|--------|
| `automation/test-home-rc1.mjs` | **46 passed** |
| `automation/test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `automation/test-dashboard-rebuild-phase2.mjs` | **94 passed** |
| `automation/test-dashboard-rebuild-phase3.mjs` | **100 passed** |
| `automation/test-dashboard-os-routes.mjs` | **40 passed** |
| `automation/validate-production-links.mjs` | **0 broken** |
| `automation/test-waypoint-constitution.mjs` | **All passed** |
| CDP capture (`capture-home-rc1.1.mjs`) | **PASS** (no Kiosk nav/chrome/labels) |

Today Outside, widget layout, colors, and deepeners structure were not redesigned.

---

## Known limitations

1. **`#/kiosk` still parses** and can enter internal glance mode without user-facing chrome. Not linked from nav. Full redirect-to-Workspace can be a later cleanup if desired.
2. **Explore launcher** still exists on non-quiet studio pages (About/Support). Quiet Home hides it. Not redesigned in RC1.1.
3. **Historical V2/V3 / docs** still mention Kiosk; product path is Rebuild Home only.
4. **Scenes / Sheds app trees** untouched per mandate.
5. **Not committed / not deployed** — local only until owner approval.

---

## Owner checklist

- [ ] Local nav shows Workspace · Customize only (no Kiosk)
- [ ] Customize has Default / Minimal / Restore — no Kiosk layout
- [ ] Footer and Contact say Home
- [ ] 404 / About / Support match Home · Scenes · Sheds · Articles · About
- [ ] Phase 2 visual lock preserved
- [ ] Approve before commit / push / deploy
