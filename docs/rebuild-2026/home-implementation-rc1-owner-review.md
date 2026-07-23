# Waypoint Studio 2026 Rebuild — Home Implementation RC1

**Status:** Awaiting owner review — **stop here; do not commit / push / merge / deploy**
**Date:** 2026-07-22
**Authority:** `docs/WAYPOINT-STUDIO-CONSTITUTION.md` (Home lock) · `docs/rebuild-2026/home-vision-lock-owner-review.md` · Phase 1/2 owner reviews
**Git:** Nothing committed, pushed, merged, or deployed in this work block

---

## Verdict

Public entry `/` now mounts the **same Rebuild Phase 2 experience** as `/apps/dashboard/` (strategy A — thin Rebuild host, shared `home-boot.js`). User-facing name is **Home**; internal module path remains `apps/dashboard/`. Below-fold deepeners append only. Phase 2 chrome, widgets, prefs key, and observational voice are unchanged.

**Production is still pre-unification:** live `https://waypointstudio.org/` still serves the marketing homepage until this RC is deployed. Live `/apps/dashboard/` still serves Rebuild (older title “Dashboard”).

---

## What shipped (local)

### Routing (strategy A)

| URL | Role |
|-----|------|
| `/` | Canonical **Home** — Rebuild host (`index.html`) |
| `/apps/dashboard/` | Permanent alias — same UI, shared boot |
| `/dashboard.html` | Redirect → `/` (hash preserved) |

No redirect loops. Same prefs key (`waypoint-dashboard-rebuild-prefs-v1`). Canonical tag on both hosts points at `https://waypointstudio.org/`.

### Labels

- Shell / title / product name: **Home**
- Internal `data-product="dashboard"` retained
- Studio primary nav (non-quiet surfaces): **Home · Scenes · Sheds · Articles · About**
- Quiet Rebuild chrome preserved: brand + **Workspace · Customize · Kiosk**
- Volunteer / SignalTerrain / incubator not in primary nav

### Default workspace (first visit)

| Widget | Default |
|--------|---------|
| Conditions | On (live) |
| Light | On (live) |
| Air | On (live) |
| Astronomy | On (live) |
| Alerts | On (honest empty until available) |
| Photography / Rivers / … | Off until enabled in Customize |

No separate Weather catalog id — Conditions covers weather. Users can still customize; prefs persist.

### Below the fold (append only)

1. Latest Articles (manifest; Sample chip when status=sample)
2. Waypoint’s Take (editorial; not AI briefing)
3. Featured Photography (identity manifest; honest placeholder)
4. Scenes (intro + Open Scenes → — no embed)
5. Sheds (intro + Open Sheds → — no embed)

Shown on Workspace only; omitted on Customize / Kiosk.

### Constitution

`docs/WAYPOINT-STUDIO-CONSTITUTION.md` — **Home lock** section added.
`docs/WAYPOINT-CONSTITUTION.md` — document map notes Home lock.
`automation/test-waypoint-constitution.mjs` asserts lock language.

---

## Screenshots

Directory: [`docs/rebuild-2026/home-rc1/`](./home-rc1/)

| Viewport | File |
|----------|------|
| Desktop Home (`/`) | [01-desktop-home-root.png](./home-rc1/01-desktop-home-root.png) |
| Tablet Home | [02-tablet-home-root.png](./home-rc1/02-tablet-home-root.png) |
| Phone Home | [03-phone-home-root.png](./home-rc1/03-phone-home-root.png) |
| Desktop deepeners | [04-desktop-home-deepeners.png](./home-rc1/04-desktop-home-deepeners.png) |
| Tablet deepeners | [05-tablet-home-deepeners.png](./home-rc1/05-tablet-home-deepeners.png) |
| Phone deepeners | [06-phone-home-deepeners.png](./home-rc1/06-phone-home-deepeners.png) |
| Desktop alias `/apps/dashboard/` | [07-desktop-alias-dashboard.png](./home-rc1/07-desktop-alias-dashboard.png) |

Capture meta: `docs/rebuild-2026/home-rc1/capture-meta.json` (Pike County, PA; defaults Conditions · Light · Air · Astronomy · Alerts).

---

## Files changed

### New

| Path | Role |
|------|------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js` | Below-fold sections |
| `automation/test-home-rc1.mjs` | Home routing / defaults / deepeners / anti-regression |
| `automation/capture-home-rc1.mjs` | Screenshot harness |
| `docs/rebuild-2026/home-rc1/*` | Screenshots + meta |
| `docs/rebuild-2026/home-implementation-rc1-owner-review.md` | This review |

### Updated (selected)

| Path | Change |
|------|--------|
| `index.html` | Rebuild Home host (replaces marketing homepage) |
| `apps/dashboard/index.html` | Home labels; shared cache-bust `home-rc1` |
| `apps/dashboard/js/home-boot.js` | Home error copy; still depth-aware |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Mount deepeners on workspace |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Thoughtful defaults |
| `design-system/css/wds-dashboard-rebuild.css` | Deepener styles (append) |
| `design-system/js/wds.js` | Load deepeners + take |
| `design-system/js/platform/wds-app-nav-config.js` | Home nav; `^/$` match |
| `design-system/js/platform/wds-app-shell.js` | Home active state |
| `dashboard.html` | Redirect → `/` |
| `site.webmanifest` | Home-oriented description |
| `support.html` | Remove “Outdoor overview” |
| `docs/WAYPOINT-STUDIO-CONSTITUTION.md` | Home lock |
| Phase 1/2/3 + constitution tests | Align with Home |

---

## Tests

```bash
node automation/test-home-rc1.mjs
node automation/test-dashboard-rebuild-phase1.mjs
node automation/test-dashboard-rebuild-phase2.mjs
node automation/test-dashboard-rebuild-phase3.mjs
node automation/test-waypoint-constitution.mjs
node automation/test-dashboard-os-routes.mjs
```

**Result (local):** all passed (Home RC1 37 · Phase1 88 · Phase2 94 · Phase3 100 · Constitution · routes 40).

### Production verification (practical)

| Surface | Live now | Expected after deploy |
|---------|----------|----------------------|
| `/` | Marketing homepage (not Rebuild) | Home = Rebuild |
| `/apps/dashboard/` | Rebuild (title still “Dashboard”) | Same Rebuild; title Home |

Ordinary multi-UA Rebuild proof for `/` is **blocked until deploy**. Do not claim production Home success from local captures alone.

---

## Anti-regression checklist

- [x] No Outdoor OS / Recovery as Home
- [x] No marketing `was-home-hero` / `studio-home.js` on `/`
- [x] No Volunteer / SignalTerrain in primary nav
- [x] Scenes / Sheds not embedded
- [x] Phase 2 visual tokens / layout intent preserved
- [x] Prefs key unchanged
- [x] `/apps/dashboard/` still works
- [x] No commit / push / merge / deploy

---

## Risks

| Risk | Mitigation |
|------|------------|
| Cache / Fastly serves old `/` after deploy | Multi-UA ordinary URL verify; build stamp |
| Root path asset depth bugs | Shared boot already depth-aware; local captures passed |
| Users with old prefs still see Photography/Rivers | Intentional — only fresh defaults change; Customize remains |
| SEO dual URL | Canonical → `/` on both hosts |

### Rollback

1. Restore previous root `index.html` from last known good SHA.
2. Leave `/apps/dashboard/` intact.
3. Revert nav/manifest/support copy if needed.
4. Do **not** roll back to Outdoor OS or Recovery.

---

## Owner checklist

- [ ] `/` is Home = Rebuild Phase 2 (approve for deploy when ready)
- [ ] `/apps/dashboard/` alias accepted forever
- [ ] Defaults (Conditions · Light · Air · Astronomy · Alerts) accepted
- [ ] Below-fold deepeners accepted (append-only)
- [ ] Primary nav set accepted
- [ ] Constitution Home lock accepted
- [ ] No deploy until owner authorizes

---

## Final status

**HOME IMPLEMENTATION RC1 COMPLETE (local)**
**NO COMMIT / PUSH / MERGE / DEPLOY**
**OWNER REVIEW PATH:** `docs/rebuild-2026/home-implementation-rc1-owner-review.md`
