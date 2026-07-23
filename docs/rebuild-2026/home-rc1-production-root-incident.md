# HOME RC1 — Production Root Incident

**Status:** HOME ROOT LIVE AND VERIFIED  
**Date:** 2026-07-23  
**Domain:** `https://waypointstudio.org/`

---

## Root cause

Home RC1 was **never committed or pushed** to `origin/main`.

| Fact | Value |
|------|--------|
| What “READY TO SHIP” meant | Local working-tree audit only |
| What production served | `origin/main` @ **`bbfdfb2`** — Phase 2 Dashboard at `/apps/dashboard/`, **marketing `studio-home`** at `/` |
| Live HTML before fix | `data-product="studio-home"`, H1 **“Observe. Discover. Understand.”**, `js/studio-home.js` |
| Not cache | Direct `curl` of `/` returned marketing HTML matching `git show bbfdfb2:index.html` |

No second Pages project, no workflow overwrite, no artifact swap. The deployment pipeline correctly published the commit that was on `main`. That commit simply **did not include** the Home RC1 root host.

---

## SHAs

| Item | SHA |
|------|-----|
| Pre-incident `origin/main` / live | `bbfdfb2` (`bbfdfb24fcbe3cbfe052ed5deffb5e3650befa4a`) |
| Local HEAD before commit (same as main) | `bbfdfb2` |
| **Release commit** | **`1251ccb`** (`1251ccb64777e7784c44a857b1d77300f6bfd9aa`) — `fix(home): ship Home RC1 — Rebuild at public root` |
| Post-deploy live `data/build-info.json` | **`1251ccb`** |
| Pages workflow | [29976755159](https://github.com/bfree7885/waypoint-studio/actions/runs/29976755159) — **completed success** |

---

## Fix performed

1. Established facts (local dirty Home RC1 vs committed marketing root).  
2. Ran suites: Home RC1 37 · Phase1 88 · Phase2 94 · Phase3 100 · constitution · routes 40.  
3. Committed Home RC1 (root `index.html` Rebuild host + shared rebuild modules + nav/constitution/docs/tests).  
4. Fast-forward pushed to `origin/main` (`bbfdfb2..1251ccb`).  
5. Waited for Pages deploy; verified **artifact fingerprint and live HTML**, not workflow status alone.

No second Home implementation. `/apps/dashboard/` remains the same Rebuild host (alias). Phase 2 visual lock preserved.

---

## Files changed (release commit)

Primary product:

- `index.html` — Rebuild Home host (replaces marketing studio-home)
- `apps/dashboard/index.html`, `apps/dashboard/js/home-boot.js`
- `dashboard.html`, `site.webmanifest`, `support.html`
- `design-system/css/wds-dashboard-rebuild.css`
- `design-system/js/dashboard/rebuild/*` (including deepeners)
- `design-system/js/wds.js`, platform nav/shell/take
- `design-system/ecosystem/nav-registry.json`
- Home RC1 / constitution / routing docs + tests + verify harness

Excluded from commit: `data/*`, `debug.html`, `status.html`, route-inventory timestamp noise.

---

## Direct production HTML evidence (post-deploy)

```bash
curl -sS -H 'Cache-Control: no-cache' "https://waypointstudio.org/?t=…"
```

Markers present:

- `data-product-name="Home"`
- `wds-dashboard-rebuild.css`
- `Opening workspace…`
- `apps/dashboard/js/home-boot.js?v=1251ccb`

Markers absent:

- `studio-home`
- `Observe. Discover. Understand.` (count **0**)
- `js/studio-home.js`

`/apps/dashboard/` returns the same Rebuild boot + shared `home-boot.js` / rebuild CSS.

`data/build-info.json`: `shortCommit=1251ccb`, `workflowRunId=29976755159`, `source=github-pages`.

---

## Live screenshots

| File | Notes |
|------|--------|
| [`home-rc1-production-root/live/01-desktop-root.png`](./home-rc1-production-root/live/01-desktop-root.png) | Home: Today Outside, Workspace, Customize, Kiosk |
| [`home-rc1-production-root/live/02-phone-root.png`](./home-rc1-production-root/live/02-phone-root.png) | Mobile Home |

---

## Mandatory live checklist

| Requirement | Result |
|-------------|--------|
| `/` returns Rebuild Home host | **PASS** |
| Today Outside visible | **PASS** (live screenshot) |
| Workspace visible | **PASS** |
| Customize available | **PASS** |
| Kiosk available | **PASS** |
| Old marketing hero absent from `/` | **PASS** |
| `/apps/dashboard/` still works | **PASS** |
| Same underlying implementation | **PASS** (shared home-boot + rebuild) |
| Deployed SHA = intended release | **PASS** (`1251ccb`) |

---

## Rollback

Restore root marketing page from `bbfdfb2` if needed:

```bash
git revert 1251ccb   # or reset/redeploy bbfdfb2 with owner approval
```

`/apps/dashboard/` Rebuild remains available as alias even if root is reverted carefully.

---

## Why earlier “READY TO SHIP” failed delivery honesty

The RC1 audit correctly assessed **local** behavior and said production `/` was still marketing until deploy — but the release was never committed. Treating audit readiness as production success without a push/Pages/HTML gate caused this incident.

---

## Final status

# HOME ROOT LIVE AND VERIFIED
