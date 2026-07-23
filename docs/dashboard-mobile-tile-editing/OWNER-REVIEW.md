# Mobile tile editing — Owner Review

**Status:** Repair complete on branch — **not deployed to production**  
**Date:** 2026-07-23  
**Branch:** `fix/mobile-tile-editing`  
**Base:** `integration/dashboard-phase2-publish`  
**Final commit SHA:** `26b3f32b6188095e793c9a2df73d8e4d70dd63f6` (repair); branch tip `5bbacb3` (docs SHA note)

---

## Root cause

Quiet-chrome CSS migrated from Outdoor OS into `wds-app-shell.css` (commit `721909c`) included:

```css
[data-product="dashboard"] .was-local { display: none !important; }
```

Rebuild Home’s **only** Customize entry was app-shell local nav (Workspace · Customize). Hiding it made tile editing unreachable on iPhone/mobile Safari (and easy to miss on desktop unless the user knew `#/customize`). Editing itself was button-based (not hover/DnD-only); the production failure was **missing entry + no Save/Cancel draft session + weak mobile chrome**.

---

## Files changed

| Path | Role |
|------|------|
| `design-system/css/wds-app-shell.css` | Stop hiding Home local nav; soften quiet label only |
| `design-system/css/wds-dashboard-rebuild.css` | Touch targets, safe-area, fixed Save/Cancel bar, overflow guards |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js` | Draft session: `beginDraft` / `commitDraft` / `discardDraft` |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` | Save / Cancel; Escape; focus into editor |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | In-page Customize entry; Move up / Move down labels |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Draft lifecycle on view change; focus restore |
| `index.html` / `apps/dashboard/index.html` | Cache-bust `home-rc1-mte` |
| `automation/test-dashboard-mobile-tile-editing.mjs` | Contract tests |
| `automation/test-home-rc1.mjs` | Asserts local nav not hidden + Customize entry |
| `automation/capture-dashboard-mobile-tile-editing.mjs` | CDP touch-emulation verify + screenshots |
| `docs/ENGINEERING-PLAYBOOK.md` | Lessons Learned |
| `docs/dashboard-mobile-tile-editing/*` | This review + captures |

Unrelated dirty-tree work (privacy polish, seasons, `data/*`, etc.) was left untouched.

---

## Repaired mobile interaction

1. **Enter:** Local nav **Customize** (visible again) **or** Workspace header **Customize** button (≥44×44 CSS px).
2. **See enabled tiles:** Customize view shows workspace with controls + widget library Add/Remove.
3. **Add/remove:** Library Add/Remove and tile Hide; draft only until Save.
4. **Reorder:** **Move up** / **Move down** buttons (no HTML5 DnD dependency).
5. **Save:** Commits draft to `waypoint-dashboard-rebuild-prefs-v1` and returns to Workspace.
6. **Cancel / Escape / leave without Save:** Discards draft; storage unchanged.
7. **Reload:** Same prefs key; arrangement retained after Save.
8. **Exit:** Returns to Workspace; focus moves back to Customize entry; no trapped overlay.

---

## Screens / viewports tested

CDP touch emulation (`automation/capture-dashboard-mobile-tile-editing.mjs`):

| Viewport | Evidence |
|----------|----------|
| 390×844 phone workspace | `01-phone-workspace.png` |
| 390×844 phone customize | `02-phone-customize.png` |
| 390×844 after Save (astro removed) | `03-phone-workspace-after-save.png` |
| 1440×900 desktop workspace | `04-desktop-workspace.png` |
| 1440×900 desktop customize | `05-desktop-customize.png` |
| 320 / 375 / 430 customize | `06`–`08-phone-*-customize.png` |

`capture-meta.json`: VERIFY PASS — local nav visible, entry 44px tall, Save/Cancel present, no horizontal overflow, disable+save persisted, desktop entry intact. Console errors: none recorded.

---

## Automated tests added

- `automation/test-dashboard-mobile-tile-editing.mjs` (39 assertions): entry, draft Save/Cancel, reorder, persistence, desktop path, CSS guards
- `automation/test-home-rc1.mjs`: quiet chrome must not hide local nav; Customize entry present in workspace module

---

## Commands run

```bash
node automation/test-dashboard-mobile-tile-editing.mjs
node automation/test-home-rc1.mjs
node automation/test-dashboard-rebuild-phase1.mjs
node automation/test-dashboard-rebuild-phase2.mjs
node automation/test-dashboard-rebuild-phase3.mjs
python3 -m http.server 8765 --bind 127.0.0.1   # already running
node automation/capture-dashboard-mobile-tile-editing.mjs http://127.0.0.1:8765
```

---

## Test and build results

| Suite | Result |
|-------|--------|
| `test-dashboard-mobile-tile-editing.mjs` | **39 passed** |
| `test-home-rc1.mjs` | **54 passed** |
| `test-dashboard-rebuild-phase1.mjs` | **88 passed** |
| `test-dashboard-rebuild-phase2.mjs` | **94 passed** |
| `test-dashboard-rebuild-phase3.mjs` | **100 passed** |
| CDP capture / verify | **VERIFY PASS** |
| Production build / deploy | **Not run — static site; not deployed** |

---

## Persistence verification

- Same storage key: `waypoint-dashboard-rebuild-prefs-v1` (no mobile-specific store).
- Unit: draft mutations do not write storage until `commitDraft`; `discardDraft` restores prior.
- CDP: hide Astronomy → Save → workspace DOM and `loadFromStorage()` omit `ph-astronomy`.

---

## Desktop regression verification

- Local nav Workspace · Customize visible (`display: block`).
- In-page Customize entry present.
- Customize catalog + Save/Cancel + Move up/down intact.
- Phase 1–3 rebuild suites green.

---

## Remaining risks

1. Mid-edit refresh still loses unsaved draft (by design — not persisted until Save).
2. Child scripts still load with `wds-build` `?v=local` query — production cache may need a build-info bump on deploy.
3. `#/kiosk` internal glance mode unchanged; not linked from nav.
4. Real device WebKit not exercised in this block — Chrome CDP touch emulation + contracts only.

---

## Exact production deployment status

**Not deployed.** Repair exists on branch `fix/mobile-tile-editing` only. Live waypointstudio.org was not updated or verified with this SHA.

---

## Final commit SHA

`26b3f32b6188095e793c9a2df73d8e4d70dd63f6` on `fix/mobile-tile-editing`.
