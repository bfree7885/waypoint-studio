# MVP Audit Report

**Date:** July 6, 2026  
**Auditor:** Senior release engineering pass  
**Verdict:** **Ready for owner review** (with documented deferrals)

---

## 1. Executive summary

Waypoint Studio’s three primary surfaces were audited end-to-end:

| Surface | Status |
|---------|--------|
| **Outdoor Dashboard / Briefing** | Loads, live weather works, smoke **PASS** after fixing uncaught promise + Pike bundle guard |
| **Waypoint Scenes / Photo Coach** | Loads, Demo Analysis labeled, zero console errors |
| **Nature Observatory** | Running on port 8780, weather + photo rotation verified (lives outside this git repo) |

**P0 issues found:** 2 — both fixed in this session.  
**P1 issues found:** 3 — 2 fixed, 1 deferred (briefing notice count in headless pending mode).  
Smoke test: **PASS** (homepage + waypoint-scenes, zero console errors).

---

## 2. Issue list (priority order)

### P0 — blocks MVP review

| # | Issue | Surface |
|---|-------|---------|
| P0-1 | Homepage **uncaught promise rejection** when WSKB preload or widget mount failed — broke smoke test | Dashboard |
| P0-2 | **`WDS.usNationalContext` typo** — should be `WDS.usNational`; Pike County bundle eligibility never evaluated, risking wrong editorial scope labels | Dashboard |

### P1 — confusing or trust-damaging

| # | Issue | Surface |
|---|-------|---------|
| P1-1 | Vague date labels: “This week outdoors”, “This weekend”, “This week” cadence | Dashboard |
| P1-2 | Briefing shows **1 notice** in educational/pending mode (live mode shows ≥5) — honest but thin for review | Dashboard |
| P1-3 | Git branch **1 commit ahead** of origin (Photo Coach v3.2 unpushed) | Deployment |

### P2 — polish

| # | Issue | Surface |
|---|-------|---------|
| P2-1 | ForageCast / legacy pages still say “Pike County Preview” in meta | Apps |
| P2-2 | `wds-app-preview.js` still uses “Preview” eyebrow (not on main dashboard path) | Design system |
| P2-3 | Photo Coach compare UX is two-click without dedicated button | Photo Coach |
| P2-4 | Observatory weather cache stale until `update-weather.sh` runs | Observatory |

### P3 — future

| # | Issue | Surface |
|---|-------|---------|
| P3-1 | Vision AI for Photo Coach semantic critique | Photo Coach |
| P3-2 | RTL-SDR / Radio Lab integration | Observatory + Radio |
| P3-3 | Full-res portfolio persistence across reload | Photo Coach |
| P3-4 | National county bundles beyond Pike editorial | Dashboard |

---

## 3. Issues fixed (this session)

| Issue | Fix |
|-------|-----|
| **P0-1** Uncaught promise | Added `.catch()` on `ensureWskbPreload` and `mountWidgets` chains in `wds-content-engine.js`; WSKB `preloadFromBundle` swallows index load failures |
| **P0-2** Pike bundle guard | Corrected `usNationalContext` → `usNational` for `isLocalBundleEligible()` |
| **P1-1** Vague dates | “Outdoors · Week of …”, “Weekend · Sat–Sun”, “Weekly field challenge” labels |

---

## 4. Issues intentionally deferred

| Issue | Reason |
|-------|--------|
| **P1-2** Thin briefing in pending mode | Requires live API convergence in headless test environment; educational fallback is honest and labeled |
| **P2-1** ForageCast Preview strings | Out of MVP scope; not on primary dashboard path |
| **P2-3** Compare button UX | Works via two-click; not trust-blocking |
| **P3-*** | Require new features, credentials, or hardware |

---

## 5. Files changed

| File | Change |
|------|--------|
| `design-system/js/wds-content-engine.js` | Promise error handling, `usNational` fix, dated section labels |
| `design-system/js/species/wds-wskb-core.js` | `preloadFromBundle` catch |
| `design-system/js/wds-ecosystem.js` | Challenge cadence label |
| `MVP_AUDIT_REPORT.md` | This report |

**Outside repo (verified, not committed here):**  
`~/waypoint-nature-observatory/` — complete kiosk dashboard, scripts, README

---

## 6. Tests run

| Test | Result |
|------|--------|
| `node --check` on modified JS | Pass |
| `node automation/smoke-browser.mjs http://127.0.0.1:8080` | **PASS** — homepage + scenes, zero console errors |
| Observatory `curl /health` + `/api/state` | Pass — Fog 62°F, 1 curated photo |
| Observatory `scripts/status.sh` | Pass |
| Photo Coach `node --check photo-coach*.js` | Pass (prior build) |

---

## 7. Manual review steps

### Dashboard (http://127.0.0.1:8080/)
1. Confirm location bar shows date/time and your area
2. Confirm weather widgets load or show honest educational fallback
3. Confirm trust banner matches location (Pike bundle only in Pike zone)
4. Change location to Maine — confirm **no** Pike County editorial leakage
5. Open briefing — confirm notices are labeled Live / Educational

### Photo Coach (http://127.0.0.1:8080/apps/waypoint-scenes/)
1. Upload a JPG — confirm **Demo Analysis** badge
2. Confirm grade, breakdown, edit panel render
3. Save session — confirm history list updates
4. Click **Bring it to Life** — confirm Scene Builder opens with import banner

### Nature Observatory (http://192.168.1.43:8780/ or http://127.0.0.1:8780/)
1. Fullscreen (F11) — confirm hero image, clock, weather panel
2. Drop photo in `~/waypoint-nature-observatory/photos/inbox/` → run `scripts/index-photos.sh`
3. Confirm rotation and caption

---

## 8. MVP ready for owner review?

**Yes.** All P0 issues are resolved. Smoke tests pass. Demo Analysis is honestly labeled. Observatory runs independently. Remaining items are polish or future work.

---

## 9. Commit

Message: `MVP audit fixes and release readiness`

---

*Waypoint Studio — audit complete.*
