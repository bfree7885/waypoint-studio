# Quality Control & Stabilization Review

**Session:** Quality Control & Stabilization Block  
**Date:** 2026-07-10 (local review; tree HEAD at start ≈ `407fefb`)  
**Scope:** Production readiness pass — verify, harden, document. No new features.  
**Commit status:** **Not committed. Not pushed.** Owner review required.

---

## Verdict

Waypoint Studio’s public routes load cleanly, smoke/console checks are green, and the photography core (Photo Coach, Hidden Landscapes, Photo Library) passes unit + smoke coverage. This block removed dead scaffold modules that still contained “Coming next / TODO / placeholder” copy, fixed several user-facing honesty and mobile issues, and repaired stale automation that was testing an obsolete home route.

Remaining risk is concentrated in **dashboard provider edge cases** (slow network, no dedicated offline mode, large stub registry) and **format gaps** (HEIC not supported in coach/HL). Nothing found that blocks a careful private Beta, but public launch should still treat provider failure UX and upload formats as follow-ups.

---

## 1. Everything inspected

### Routes (HTTP 200)

Studio home, Dashboard (+ `dashboard.html` redirect), Scenes + all module landings, Photo Coach (+ profile, guide), Photo Library (app + Scenes alias), Hidden Landscapes (Studio, gallery, learn), Animal Vision, ForageCast (+ property/setup), Fieldry, Sheds, Steepleaf, Signalterrain, Savant, Terrainbound→Fieldry, Waypoint Scenes builder, kiosk, status, debug.

### Automated suites run

| Suite | Result |
|-------|--------|
| `smoke-browser.mjs` | **PASS** (console errors: none on covered pages) |
| `test-photo-coach-shoot-review.mjs` | **PASS** (41) |
| `test-photo-library.mjs` | **PASS** (26) |
| `test-hidden-landscapes.mjs` | **PASS** (134) |
| `test-photographer-profile.mjs` | **PASS** |
| `test-personalized-coaching.mjs` | **PASS** |
| `test-animal-vision.mjs` | **PASS** (37) after QC nav assertion fix |
| `test-foragecast-land.mjs` | **PASS** (22) |
| `test-fieldry-mvp.mjs` | **PASS** |
| `test-kiosk-modules.mjs` | **PASS** |
| `test-kiosk-location-boot.mjs` | **PASS** |
| `test-knowledge-platform.mjs` | **PASS** |
| `test-platform-foundation.mjs` | **PASS** |
| `test-platform-hardening.mjs` | **PASS** |
| `test-profile-migration.mjs` | **PASS** |
| `test-trail-conditions.mjs` | **PASS** |
| `test-trail-browser.mjs` | **PASS** after targeting `/apps/dashboard/` |
| `test-qc-copy.mjs` (**new**) | **PASS** |

### Manual / CDP spot checks

- Broken internal `href` / script / stylesheet targets on product HTML: **none found** (resolved against local `:8080`).
- Responsive: desktop 1440, tablet 768, phone 390, phone landscape 844×390 on Dashboard, Photo Coach, Photo Library, HL, Scenes, ForageCast, Fieldry.
- A11y basics: `lang="en"`, skip links present on primary apps; Dashboard now ships an `h1` before hydrate.
- Photo Coach shoot-review matrix covered by unit tests: multi-upload, folder input, cancel/queue semantics, single upload, summary weather note copy.
- Dashboard widgets: registry review (morning live cluster vs educational stubs); loading / unavailable / timeout patterns mapped in code.

---

## 2. Issues found

### Fixed in this block

1. **Animal Vision unit test falsely failed** — asserted a standalone `animal-vision` nav feature after product nav folded AV under Hidden Landscapes.
2. **Trail browser smoke targeted studio home `/`** — outdoor dashboard no longer lives there; always reported empty widgets.
3. **ForageCast user-facing “placeholder” language** — video label, model confidence reason, factor panel copy.
4. **Dead Hidden Landscapes scaffold stack** — `hl-home.js`, `hl-boot.js`, `hl-models.js`, `hl-store.js` still contained “Coming next”, “Scaffold only”, and `TODO(...)` UI strings though no HTML loaded them.
5. **Dead modules** — `apps/scenes/js/scenes-platform.js`, `apps/fieldry/js/fieldry-dashboard.js` unused by any HTML.
6. **HL gallery/learn** still carried obsolete `data-hl-page` scaffolding hooks.
7. **Photo Coach guide** Milky Way trust chip: “Not yet available”.
8. **Shoot summary** weather fallback string could render as bare “Future”.
9. **Dashboard educational topic map drift** — catalog IDs `visible-planets`, `volunteer-opportunities`, `invasive-species-alerts`, `habitat-projects` missing from `WIDGET_TOPICS`.
10. **Widgets could remain `aria-busy` Loading forever** if a mount job failed without settling (engine now settles leftovers in `finally`).
11. **Dashboard lacked an `h1` until content-engine hydrate** (a11y).
12. **ForageCast phone horizontal document overflow** caused by wide pillar strip expanding page scroll width.

### Remaining / deferred

| Issue | Severity | Notes |
|-------|----------|-------|
| No first-class **offline** dashboard state | Medium | Failures look like generic Unavailable; no `navigator.onLine` path |
| Outdoor weather **8s timeout** → Unavailable without strong “still trying” UX | Medium | Refresh exists per widget |
| **~74 widget registry** with many educational stubs | Medium | Morning defaults are fine; Customise can re-enable clutter |
| **River** story split (`water-dashboard` vs stub `river-levels`) | Low–Med | Documented; hide/parity is architectural-ish |
| **Alerts** consumed in briefing/safety, not a dedicated tile | Low–Med | Easy to miss when storm widgets off |
| Photo Coach / HL **HEIC/HEIF not supported** | Medium | Honest accept lists (JPEG/PNG/WebP); HEIC fails decode in most Chromium |
| Shoot **weather context** still future-linked | Low | Honest copy now; no live OIP attach |
| ForageCast / Fieldry foundation apps still illustrative in places | Low | Honesty improved; not live-forecast products |
| Dashboard **hydrate can take tens of seconds** under provider pressure | Medium | Trail smoke waits 90s; IP geolocation may 429 |
| Script load order on some coach pages (`defer` inconsistency) | Low | Not failing smoke today |
| Large unused **image-sets / wavelength scaffold JSON** for HL | Low | Data retained for future ImageSets; no UI exposes TODOs now |
| Engine interface stubs under `apps/scenes/js/engines/` | Info | Intentionally unimplemented; not wired to UI |
| Unrelated tree dirt (`data/*`, `status.html`, `debug.html`, importer desktop, audit PDF scripts) | Out of scope | Do not include in QC commit |

---

## 3. Issues fixed (change list)

### Product / UX

- Softened ForageCast honesty copy (`foragecast-home.js`, `foragecast-model.js`, `foragecast-prediction.js`).
- Photo Coach conditions chip + shoot summary weather fallback (`photo-coach-conditions.js`, `photo-coach-shoot.js`).
- Dashboard shell `h1.wds-sr-only` (`apps/dashboard/index.html`).
- ForageCast mobile overflow clip (`foragecast-home.css`).
- Removed orphan HL/Scenes/Fieldry dead JS; updated HL + Scenes architecture docs.
- Cleared obsolete `data-hl-page` on gallery/learn.

### Platform

- `settleStaleMounts` after dashboard mount jobs (`wds-dashboard-engine.js`).
- Aligned `WIDGET_TOPICS` IDs with catalog (`wds-educational-fallback.js`).

### Tests

- `test-animal-vision.mjs` — assert HL match groups Animal Vision.
- `test-trail-browser.mjs` — navigate to `/apps/dashboard/`.
- **New** `automation/test-qc-copy.mjs` — ban reintroduction of scaffold/placeholder UI strings in key surfaces.

---

## 4. Remaining known issues

See table in §2. Highest-impact leftovers for a follow-up block:

1. Dedicated offline / slow-network messaging on Dashboard.
2. Provider timeout + retry UX polish on `outdoor-weather`.
3. HEIC support strategy (convert client-side vs clear reject messaging + accept list).
4. Cull or quarantine Customise stubs that re-duplicate weather/river surfaces.
5. Optional smoke asserts that `#widget-outdoor-weather` / `#widget-sun-moon-dashboard` are not stuck Loading after hydrate.

---

## 5. Test results (summary)

- Full browser smoke: **PASS**, no console errors on covered routes.
- Photography suites (Coach shoot review, Library, HL, Animal Vision, Profile, Personalized coaching): **PASS**.
- Trail browser live mount (Pike County seed): **PASS** after route fix.
- QC copy regression: **PASS**.
- Responsive CDP: no clipping on primary apps after ForageCast fix; Dashboard h1 present.

---

## 6. Accessibility summary

**Good**

- Skip links on primary app shells.
- `lang="en"` on inspected pages.
- Dashboard always exposes an `h1` (sr-only) even during loading.
- Live regions / `aria-busy` used on content-engine and widget mounts; settle path clears stale busy.

**Gaps**

- Full keyboard matrix across Customise / Photo Coach filmstrip / Library collections was not exhaustively exercised this session.
- Contrast audit (AA) not automated; visual sampling only.
- Some foundation apps may still lean on icon-only chrome in shell — rely on design-system labels.

---

## 7. Performance summary

- No intentional prefetch/render architecture changes.
- Dashboard settle-on-failure avoids infinite Loading CPU/repaint confusion; does not reduce request volume.
- Smoke pages remain acceptable on local static server; live OIP hydrate can be slow (tens of seconds) when geolocation/provider endpoints throttle.
- Recommendation: avoid premature caching layers; instrument provider timing before optimizing.

---

## 8. Mobile summary

| Surface | Phone / landscape | Notes |
|---------|-------------------|-------|
| Dashboard | OK structure | Hydrate-bound; location prompt flows need real-device check |
| Photo Coach | OK | Upload CTA stack readable; folder picker desktop-prefered |
| Photo Library | OK | Grid densifies; search present |
| Hidden Landscapes | OK | Studio dual-panel stacks |
| Scenes landing | OK | |
| ForageCast | **Fixed** doc overflow from pillar strip | Strip still scrolls horizontally inside page (intentional) |
| Fieldry | OK at spot check | |

Landscape phone: no button clipping found on primary apps at 844×390.

---

## 9. Photo Coach upload matrix

| Scenario | Status |
|----------|--------|
| Small JPEG/PNG | Covered (unit + expected path) |
| Large within 20 MB | Supported by product limits |
| Portrait / landscape | Analysis path agnostic |
| Multiple uploads / folder | Covered by shoot-review tests |
| Invalid files | Rejection messaging path exists in coach |
| Cancel / clear / refresh | Queue cancel + session persistence exercised in prior block; smoke refresh OK |
| HEIC | **Not supported** in Chromium accept path — remaining product honesty item |
| Repeated uploads | Supported via queue; watch memory on very large sessions |

---

## 10. Dashboard tiles

| Surface | Status |
|---------|--------|
| Weather / Hourly / Forecast | Live inside `outdoor-weather` |
| Sun / Moon / Golden / Blue | Live via `sun-moon-dashboard` (legacy singles mostly hidden) |
| AQI / UV | Live (AQI depends on platform hydration) |
| River | Partial via `water-dashboard`; standalone stub remains |
| Photography Conditions | Live when weather present; Milky Way/aurora marked limited |
| Alerts | Via briefing / safety — not dedicated widget |
| Location / Timezone | Briefing chrome |
| Loading / unavailable | Present; offline distinct state **missing** |
| Slow / failure recovery | Timeout + per-widget refresh; settle stale Loading **added** |

---

## 11. Risk assessment

| Area | Risk | Rationale |
|------|------|-----------|
| Photography local tools | **Low** | Strong unit coverage; prior HL canvas wipe regression locked |
| Navigation / routes | **Low** | Smoke + HTTP coverage clean |
| Dashboard live data | **Medium** | Provider flakiness, slow hydrate, stub sprawl |
| Mobile polish | **Low–Med** | Fixed ForageCast overflow; broader device farm not run |
| Accessibility | **Low–Med** | Basics OK; deep interaction audit unfinished |
| Dead code reintroduction | **Lower** | Scaffold modules deleted; QC copy test guards key strings |
| Public launch | **Conditional** | Safe for careful Beta if Dashboard fails honestly and HEIC messaging is clear |

---

## 12. Recommended next work block

**Offline & Provider Resilience (Dashboard)** — 6–10 hours

1. Distinct Offline / Slow / Unavailable copy paths.
2. Outdoor-weather timeout retry UX.
3. Smoke assertions for morning widgets not stuck Loading.
4. Customise defaults: hide duplicate legacy weather/river stubs.
5. HEIC strategy decision + coach/HL reject messaging QA.
6. Real-device pass (iOS Safari + Android Chrome) for upload + dashboard.

Optional parallel: shallow keyboard audit for Photo Coach filmstrip + Library collections.

---

## 13. Owner handoff checklist

- [ ] Review diff excluding unrelated `data/*`, `status.html`, `debug.html`, importer desktop, audit PDF scripts
- [ ] Run `node automation/smoke-browser.mjs http://127.0.0.1:8080`
- [ ] Run `node automation/test-qc-copy.mjs` and photography suites
- [ ] Spot-check ForageCast on a phone-width viewport
- [ ] Approve commit when satisfied (**agent will not commit/push**)

---

*End of Quality Review.*
