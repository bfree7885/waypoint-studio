# OWNER-REVIEW — Dashboard Contact + language fixes

**Status:** Ready for owner review  
**Date:** 2026-07-22  
**Branch:** `integration/dashboard-os-m3`  
**Commit / push / merge / deploy:** **none** (dirty working tree only)

---

## Verdict

1. **Contact stays in the Outside quiet shell** (`apps/dashboard/contact.html`). Footer Contact no longer exits to studio-root Contact from Outside.  
2. **“Do this” is gone** from Outdoor OS UI; slot is **Best window** with observational generators. Night copy matches owner intent.  
3. **Centralized copy helper** blocks homework/assignment phrases on Best window output.

---

## Files changed (this block)

### Product / shell
- `apps/dashboard/contact.html` *(new)*
- `apps/dashboard/index.html`
- `apps/dashboard/js/home-boot.js`
- `design-system/js/platform/wds-app-shell.js`
- `design-system/js/platform/wds-app-nav-config.js`
- `design-system/js/wds.js`

### Outdoor OS copy
- `design-system/js/dashboard/os/wds-dashboard-os-copy.js` *(new)*
- `design-system/js/dashboard/os/wds-dashboard-os-interpret.js`
- `design-system/js/dashboard/os/wds-dashboard-os-compose.js`
- `design-system/js/dashboard/os/wds-dashboard-os-render.js`

### Spec / docs / automation
- `docs/DASHBOARD-SCREEN-SPECIFICATION.md` (label [F] Best window)
- `docs/dashboard-owner-fixes/*` (audit, review, screenshots, inventory)
- `docs/ENGINEERING-PLAYBOOK.md` (lessons)
- `automation/test-dashboard-os-copy.mjs` *(new)*
- `automation/test-dashboard-os-routes.mjs` *(new)*
- `automation/capture-dashboard-owner-fixes.mjs` *(new)*
- `automation/test-dashboard-os-interpret.mjs`
- `automation/test-dashboard-v2.mjs`

**Not modified:** Sheds, Scenes, Volunteer, importer.

---

## Link audit

- Persistent Outside footer + noscript links audited.  
- Contact / Something wrong? / Suggest an idea → in-product Contact.  
- Brand → rebuilt studio home.  
- Support / About / Privacy / Coming later → current studio pages (documented, not legacy `ws-topnav`).  
- Inventory: `docs/dashboard-owner-fixes/route-inventory.json` + table in `contact-and-language-audit.md`.

---

## Copy audit

- Outdoor OS interpret / compose / render + Spec label updated.  
- Banned-phrase helper: `WDS.dashboardOSCopy`.  
- Night Best window: “Tomorrow morning looks more promising” / “Tonight remains quiet and overcast”.  
- No “Do this”, “then rest”, or “Take a walk” from generators under copy tests.

---

## Tests

| Command | Result |
|---------|--------|
| `node automation/test-dashboard-os-copy.mjs` | PASS (28) |
| `node automation/test-dashboard-os-routes.mjs` | PASS (40) |
| `node automation/test-dashboard-os-interpret.mjs` | PASS (80) |
| `node automation/test-dashboard-v2.mjs` | PASS (59) |
| `node automation/test-dashboard-today-outside.mjs` | PASS |
| `node automation/test-dashboard-reliability.mjs` | PASS (41) |

**Build / typecheck:** unavailable (static site; no package typecheck script).

---

## Screenshots

| Path | Shows |
|------|--------|
| `docs/dashboard-owner-fixes/before/01-desktop-do-this.png` | Pre-fix Do this |
| `docs/dashboard-owner-fixes/after/01-desktop-best-window.png` | Best window |
| `docs/dashboard-owner-fixes/after/02-desktop-contact.png` | Contact in quiet shell |
| `docs/dashboard-owner-fixes/after/03-mobile-best-window.png` | Mobile Best window |
| `docs/dashboard-owner-fixes/after/04-mobile-contact.png` | Mobile Contact |

---

## Owner checklist

- [x] Contact stays in Outside shell (quiet chrome + form)  
- [x] No assignment / Do this language on Best window  
- [x] Route + copy tests pass  
- [x] Nothing committed / pushed / merged / deployed  

---

## Git status (expected dirty)

Uncommitted local changes from this block plus any pre-existing workspace dirt (`data/*`, other docs). Owner must commit explicitly if desired.
