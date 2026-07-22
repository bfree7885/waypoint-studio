# Dashboard Outdoor OS — Owner Review (Milestone 1 Closeout)

**Date:** 2026-07-22  
**Status:** STOP — **Milestone 1 closeout complete.** **Milestone 1.5 (readability / hierarchy / presence) is also complete and awaiting owner approval** — see [`docs/dashboard-os-m1.5-review/OWNER-REVIEW.md`](./dashboard-os-m1.5-review/OWNER-REVIEW.md).  
**Do not deploy. Do not merge. Do not begin Milestone 2.**  
**Authority:** Manifesto → Screen Specification → Architecture Reset  

---

## Owner decisions (IQ-1..IQ-4) — RESOLVED

| ID | Decision | Applied |
|----|----------|---------|
| **IQ-1** | Quiet Waypoint Studio brand chrome only (`data-quiet-chrome="true"`); **no** Apps launcher / peer tabs / control-room chrome | Yes — `apps/dashboard/index.html` + `wds-app-shell.js` quiet header |
| **IQ-2** | Location detail panel per Screen Spec **§3.10** (not only generic prompt) | Yes — OS Location panel: current place, privacy sentence, Use my location, search/choose |
| **IQ-3** | `.obsolete` Dashboard presentation files **permanently deleted** after verification; V2 render tests retargeted to OS compose/render | Yes — see § Obsolete deletions; `test-dashboard-v2.mjs` asserts OS render |
| **IQ-4** | **No** automatic audio/tones — alerts **visual only** | Yes — alert interrupt is a calm severity band; no Audio APIs |

Volunteer remains **only** as exclusion filters in OS prefs (intentional; not product copy / not prefs catalog UI).

---

## 1. Screenshots (hydrated)

Location: `docs/dashboard-os-m1-screenshots/`  
Index: `docs/dashboard-os-m1-screenshots/SCREENSHOT-INDEX.md`  
Capture: `automation/capture-dashboard-os-m1-screenshots.mjs` (Chrome CDP; waits for real briefing, not “Updating…” / “Finding today’s…”).

| File | What it shows |
|------|----------------|
| `01-desktop-hydrated.png` | Desktop hydrated Outside briefing (Pike / Blooming Grove) |
| `02-mobile-hydrated.png` | Mobile 390×844 hydrated briefing |
| `03-desktop-loading.png` | Desktop §5.1 loading skeleton |
| `04-mobile-loading.png` | Mobile loading skeleton |
| `05-active-alert.png` | Alert interrupt (console-injected synthetic alert; visual only) |
| `06-partial-data.png` | Partial trust / narrowed briefing (console-injected) |
| `07-location-detail-panel.png` | §3.10 Location panel |
| `08-conditions-detail-panel.png` | Conditions environmental detail |
| `09-sources-panel.png` | Sources panel |
| `10-after-scroll-dayarc-look-closer.png` | After-scroll Day arc context + Look closer |

Stale loading-only captures (`desktop-briefing.png`, etc.) were replaced.

---

## 2. Before / after

| Before | After |
|--------|-------|
| Recovery topic tabs | None (`data-hide-local`, empty features, Recovery stub `isEnabled: false`) |
| V2 gauge overview strip | Gone |
| Widget grid / Customize | Gone from product path; customize file deleted |
| Apps launcher on Outside | Quiet brand only (IQ-1) |
| Location = bootstrap prompt only | §3.10 Location panel (IQ-2) |
| Monitoring “Dashboard V2” chrome | **Outside** briefing |
| Peer domain apps | Detail sheets on demand |

---

## 3. Obsolete files permanently deleted

| Path | Notes |
|------|-------|
| `design-system/js/dashboard/v2/wds-dashboard-v2-render.js` | Deleted (was presentation; engines retained) |
| `design-system/js/dashboard/v2/wds-dashboard-v2-render.js.obsolete` | Deleted |
| `design-system/js/dashboard/wds-dashboard-customize.js` | Deleted |
| `design-system/js/dashboard/wds-dashboard-customize.js.obsolete` | Deleted |
| `design-system/js/dashboard/wds-dashboard-recovery.js.obsolete` | Deleted |

**Retained stub:** `wds-dashboard-recovery.js` — permanent no-op (`isEnabled → false`) so accidental references do not crash.

**Preserved (backend / intelligence):** OIP, location, weather/AQ/NWS/USGS, photography, V2 **model/briefing/activity/timeline/trust/prefs** engines, reliability/trust classification.

---

## 4. Components added (Outdoor OS)

| Path | Role |
|------|------|
| `design-system/js/dashboard/os/wds-dashboard-os-compose.js` | Happening / Matters / Do / DayArc / trust composition |
| `design-system/js/dashboard/os/wds-dashboard-os-render.js` | Outside HTML + detail sheets |
| `design-system/js/dashboard/os/wds-dashboard-os.js` | Mount / bind / place / prefs |
| `design-system/css/wds-dashboard-os.css` | Hierarchy, whitespace, atmosphere, quiet shell |
| `automation/capture-dashboard-os-m1-screenshots.mjs` | Hydrated screenshot capture for closeout |

---

## 5. Screen Specification compliance checklist

### Mission & first viewport

| Item | Result |
|------|--------|
| Happening / Matters / Do without scroll (decision contract) | **PASS** (verified hydrated desktop + mobile) |
| Vertical order §1.2 (Alert? → Chrome → Place·time → Happening → Matters → Do → Day arc → Sources) | **PASS** |
| Happening headline largest text on calm screen | **PASS** |
| What matters 1–3, visually ranked | **PASS** (typically 1 on calm/night) |
| Exactly 1 primary Do; ≤1 alternate | **PASS** |
| Zero cards / widget walls / gauge strips | **PASS** (audit: cards=0, gauges=0) |
| Zero peer domain tabs | **PASS** |
| Word budget ~≤90 composition (calm) | **PASS** (audit ~64–70 words on night calm capture) |
| Alerts as interrupt (visual only) | **PASS** (IQ-4) |
| Quiet Sources cue | **PASS** (`Live` / `Cached` / `Partial`) |
| No Customize-first / system-health / developer chrome | **PASS** |
| No Volunteer in active product path | **PASS** (exclusion filter only) |
| No placeholders that look real | **PASS** |
| Empty location §4.1 | **PASS** (copy + CTAs; Location panel for choose) |
| Loading §5.1 calm structure | **PASS** |
| Detail panels §3 (Conditions/Light/Air/Water/Alerts/Day Arc/Plan/Sources/Prefs/Location) | **PASS** |
| Trust states honest | **PASS** |
| Mobile / desktop same hierarchy | **PASS** |

### Absolute Rules (§8) spot-check

| Rule theme | Result |
|------------|--------|
| No widget walls / peer tabs / card grids | **PASS** |
| No fake hometown / Live when cached | **PASS** |
| Alerts interrupt; Sources never dominate | **PASS** |
| Max 3 matters; one primary Do | **PASS** |

---

## 6. Remaining deviations (however minor)

1. **Atmosphere motion** — Static gradients only (Spec allows ≤2 ambient motions). Deferred to Milestone 2 (no motion in M1 closeout by instruction).
2. **Day arc on-fold vs scroll** — Peek is in the composition stack always; no fold-height measurement to omit on short phones.
3. **Day arc beat quality** — Timeline can still emit duplicate clock labels (e.g. two “2:00 PM” beats) or odd photography labels; intelligence polish / M2, not layout.
4. **Night × daytime timeline** — At night, Do/Matters are night-labeled, but Day arc may still show midday UV/warmest beats from the timeline engine.
5. **Word-budget CI** — Compose clips by words; no automated ≤90 visible-word assert in CI.
6. **Specialty `*-dashboard-ui` / catalog on disk** — Unused by Outside product path; hard-delete of remaining specialty UI deferred (not M1 presentation path).
7. **Alert / partial screenshots** — States 05–06 use documented console injection after real place hydrate (live NWS/partial not always available in capture environment).
8. **Headless loading race** — Loading captures prefer real boot; if hydrate wins, script may force `mode:loading` via render API (noted in screenshot index when it occurs).
9. **WAS quiet brand still present** — Intentional per IQ-1 (Waypoint Studio mark + name only).

---

## 7. Build / lint / type-check / tests

| Check | Result |
|-------|--------|
| Formal project `tsc` / TypeScript config | **None** (`no-tsconfig`) |
| Formal dashboard ESLint gate in `package.json` | **None** dedicated dashboard lint script |
| `node automation/test-dashboard-v2.mjs` | **21 passed** |
| `node automation/test-dashboard-today-outside.mjs` | **All passed** (includes obsolete-deletion + quiet-chrome + no Volunteer UI asserts) |
| `node automation/test-dashboard-reliability.mjs` | **41 passed** |

---

## 8. Git status (do not commit)

Working tree includes Outdoor OS modules, Spec/Manifesto/Reset docs, screenshot set, IQ-1..4 shell/location/test changes, and unrelated dirty noise (`data/*`, `status.html`, `debug.html`, importer desktop, `__pycache__`). **Do not commit unless owner explicitly asks.** Exclude operational noise if committing later.

---

## 9. Commit recommendation (message only — do not commit)

```
Complete Outdoor OS Dashboard Milestone 1 Outside briefing.

Replace Recovery/V2 presentation with Screen Spec Outside composition,
apply owner IQ-1..4 (quiet chrome, location panel, obsolete deletion,
visual-only alerts), and attach hydrated M1 screenshot evidence.
```

Suggested stage set (when asked): OS JS/CSS, dashboard `index.html` / boot / shell / nav / engine / content-engine / `wds.js`, automation tests + capture script, Spec/Manifesto/Reset + Owner Review + `docs/dashboard-os-m1-screenshots/`. Exclude `data/*`, generated status/debug, `__pycache__`, importer desktop unless requested.

---

# Milestone 1 Closeout Report

### 1. Exact changes made

**Prior M1 (parent / earlier session):** Outdoor OS compose/render/orchestrator; Recovery stubbed off; V2 gauge/tabs removed from product path; empty/loading/briefing/detail panels; backend engines preserved; quiet chrome + Location panel + obsolete deletion groundwork; tests retargeted to OS.

**This closeout session:**
- Strict Screen Spec audit against live hydrated Outside
- Fixed place·time **browser-default button chrome** (gray bar + unreadable night text) — transparent button reset
- Night: skip daytime “changes/opportunities” matters (§4.5)
- Alert band contrast improved for night atmosphere; day-arc best-beat night color
- Day arc: prefer timed beats; avoid orphan untimed labels after first beat
- Hard verification that obsolete presentation files are gone; strengthened automation asserts
- Hydrated screenshot set (10) + `SCREENSHOT-INDEX.md` + capture script
- Owner Review updated: IQ-1..4 resolved; closeout awaiting approval

### 2. Obsolete files permanently deleted

- `design-system/js/dashboard/v2/wds-dashboard-v2-render.js` (+ `.obsolete`)
- `design-system/js/dashboard/wds-dashboard-customize.js` (+ `.obsolete`)
- `design-system/js/dashboard/wds-dashboard-recovery.js.obsolete`  
(Stub `wds-dashboard-recovery.js` retained, disabled.)

### 3. Build / lint / type-check / tests

- No formal dashboard TypeScript / lint gate in repo scripts  
- Tests: V2 **21**, Today Outside **all**, Reliability **41** — all passed

### 4. Screen Spec compliance checklist

See §5 above — **all M1-scope checklist items PASS**, with deviations listed in §6.

### 5. Remaining deviations

See §6 (motion deferred; day-arc intelligence polish; specialty UI still on disk unused; injected alert/partial captures; etc.).

### 6. Screenshot index

See §1 and `docs/dashboard-os-m1-screenshots/SCREENSHOT-INDEX.md`.

### 7. Git status

Dirty tree with OS + docs + tests; unrelated `data/*` / status / debug / pycache noise present. **Not committed.**

### 8. Commit recommendation

See §9 (message suggestion only).

---

*STOP. Await owner approval before Milestone 2, deploy, or merge.*
