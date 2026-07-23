# Dashboard RC2.5 Sprint 6 — Owner Review

**Status:** Polish complete on branch — **not deployed to production**  
**Date:** 2026-07-23  
**Sprint:** Dashboard Experience Polish & Product Quality (not a feature sprint)  
**Branch:** `polish/dashboard-rc25-sprint6`  
**Base:** `fix/mobile-tile-editing` (`a349e68`)  
**Final commit SHA:** _(filled after commit)_  
**Deployment status:** **Not deployed** — branch pushed for owner review only; no merge to main / no production publish in this block.

---

## Verdict

Rebuild Home / Dashboard feels closer to a morning outdoor-intelligence product: quieter density, consistent card chrome, family grouping (Environmental · Astronomy · Photography), skeleton loading, and human empty/offline states — without redesigning Phase 2 visual lock or adding widgets.

Architecture preserved: Today Outside + Workspace + Customize + Kiosk + prefs key + mobile tile editing draft Save/Cancel.

---

## Polish highlights

1. **Visual hierarchy** — Quiet family labels + default order groups Conditions / Air / Alerts, then Astronomy, then Light; deepeners use the same radius / shadow language.
2. **Card polish** — Shared radius/padding/elevation tokens; softer category glow; title-row icons; denser fact rows; Air/Alerts default to `md` for calm 3-up.
3. **Density** — Tighter shell padding, shorter Today panel, lower widget min-heights, less empty row waste on desktop.
4. **Loading** — Skeleton shimmer + SR-only “Settling…”; hydrate fade-in; `prefers-reduced-motion` disables motion.
5. **Empty / error** — Titled empty workspace; state chips for waiting / unavailable / offline with human copy (no raw errors).
6. **Mobile** — Safe-area + 44px targets retained from mobile tile editing; no h-overflow at 320 / 375 / 430 / 768 (see `capture-meta.json`).
7. **Motion** — Restrained enter / fade / skeleton shine; reduced-motion safe.
8. **Personality** — Morning instrument feel within deep navy / off-white / category accents (strengthened consistency, not a new look).
9. **Performance** — Reserved pending heights, `content-visibility`, lazy hydrate unchanged in contract.
10. **Accessibility** — Focus rings, SR settling copy, family `role="presentation"` labels, trust chips retained.
11. **Consistency** — Customize bar, catalog items, deepeners aligned to the same surface tokens.

---

## Architecture preserved confirmation

| Gate | Status |
|------|--------|
| Phase 1/2/3 shell & visual language | **Yes** |
| Today Outside compact panel | **Yes** |
| Prefs key `waypoint-dashboard-rebuild-prefs-v1` | **Yes** |
| Mobile tile editing (draft Save/Cancel, ≥44px entry) | **Yes** |
| No new widget families / Photography Library | **Yes** |
| No production mocks replacing live OIP | **Yes** |
| Not merged / not deployed | **Yes** |

---

## Files changed

| Path | Role |
|------|------|
| `design-system/css/wds-dashboard-rebuild.css` | Density, groups, skeletons, softer glow, motion, deepeners |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | Family headers, skeleton frames, empty copy, icons |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Families, default order/sizes, human empty/offline render |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-data.js` | Clearer Light waiting/unavailable copy |
| `index.html` / `apps/dashboard/index.html` | Cache-bust `dash-rc25-s6` |
| `automation/test-dashboard-rebuild-phase3.mjs` | Empty/skeleton/family asserts; cache-bust accept |
| `automation/capture-dashboard-rc25-sprint6.mjs` | Screenshot harness |
| `docs/dashboard-rc25-sprint6/*` | This review + captures |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |

Unrelated dirty-tree work (privacy polish, platform-rc2, `data/*`, etc.) left untouched.

---

## Screenshots

Directory: [`docs/dashboard-rc25-sprint6/`](./)

| Viewport | File |
|----------|------|
| Desktop workspace | [01-desktop-workspace.png](./01-desktop-workspace.png) |
| Desktop customize | [02-desktop-customize.png](./02-desktop-customize.png) |
| Desktop kiosk | [03-desktop-kiosk.png](./03-desktop-kiosk.png) |
| Phone 390 workspace | [04-phone-workspace.png](./04-phone-workspace.png) |
| Phone 390 customize | [05-phone-customize.png](./05-phone-customize.png) |
| Phone 320 | [06-phone-320-workspace.png](./06-phone-320-workspace.png) |
| Phone 375 | [07-phone-375-workspace.png](./07-phone-375-workspace.png) |
| Phone 430 | [08-phone-430-workspace.png](./08-phone-430-workspace.png) |
| Tablet 768 | [09-tablet-768-workspace.png](./09-tablet-768-workspace.png) |

`capture-meta.json`: overflow **false** at 320 / 375 / 430 / 768; three family groups + five default widgets when seeded.

---

## Tests

```bash
node automation/test-dashboard-rebuild-phase1.mjs   # 88 passed
node automation/test-dashboard-rebuild-phase2.mjs   # 94 passed
node automation/test-dashboard-rebuild-phase3.mjs   # 103 passed
node automation/test-dashboard-mobile-tile-editing.mjs  # 39 passed
node automation/test-home-rc1.mjs                   # 54 passed
node automation/capture-dashboard-rc25-sprint6.mjs http://127.0.0.1:8765
```

---

## Risks / notes

- Existing local prefs keep prior `order` / `sizes`; family labels still appear when consecutive widgets share a family. **Restore defaults** applies the new Environmental → Astronomy → Photography order.
- Phone CDP captures can occasionally show fewer live facts if OIP hydrate races; contracts and desktop captures remain green.
- Category accents remain luminous by design (Phase 2 lock); Sprint 6 only softens bloom intensity.

---

## How to review locally

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# open http://127.0.0.1:8765/ and http://127.0.0.1:8765/apps/dashboard/
```

---

## Stop

Await owner visual/product review. Do **not** merge to main or deploy until approved.
