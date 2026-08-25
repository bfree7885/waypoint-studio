# Sheds V3.1 mapping — hostile acceptance QA

**Verdict: CONDITIONAL PASS — recommend MERGE V3.1**

Date: 2026-08-24 (America/New_York)  
Base commit under test: `fead5bb3cbf90b1815e9169942dc7bd3a0392070`  
QA repair commit: `6b2b35beaf96bfa0e82e822d8284f646a5135f0f`  
Package: `reports/sheds-v3-mapping-acceptance/`  
Harness: `automation/hostile-qa-sheds-v3-mapping.mjs`

Accepted mobile field shell from PR #52 remains intact (dock, session strip, Field Briefing, YOU≠SEARCH≠INSPECT≠OBS). No V3.2 work. No push/merge performed by this QA pass.

---

## 1. Overall

| Gate | Result |
|------|--------|
| Hostile CDP torture | **0 FAIL / 1 WARN** (desktop `prompt×here` pre-existing) |
| Defects found & fixed | **Yes** (see §2–3) |
| Mobile primary state 390 active+prompt+YOU | **Collision-free** |
| Satellite ≠ biological evidence | **PASS** (Map & layers lede) |

---

## 2. Defects discovered

| ID | Severity | Finding |
|----|----------|---------|
| D1 | High | Map click debounce of **450ms** applied to Measure/Inspect as well as SEARCH — rapid multi-point measure dropped vertices (hostile run landed only “Point 1”). |
| D2 | Medium | Inspect elevation did not short-circuit when offline; also lacked a fetch timeout — hung/offline paths could look “stuck loading” or rely only on network failure. |
| D3 | Medium | Hybrid label-layer tile errors were attached to reliability alongside imagery — a label-overlay failure could mark the whole Hybrid basemap degraded while imagery still worked. |
| D4 | Low | Orphan Hybrid child layers (`hybridRef` / `hybridImagery`) were not explicitly removed when switching away — risk of label bleed onto Street/Topo/Satellite. |
| D5 | Low | Area copy `Approx. area (if closed):` was confusing in use; large acre values used noisy one-decimal formatting (`3435959.9 ac`). |
| D6 | Low | While Measure/Inspect armed, SEARCH prompt still invited “tap map…” — taps were correctly short-circuited, but the prompt lied about intent. |
| W1 | Known | Desktop 1280 `prompt×here≈20.6` overlap — documented in PR #52 mobile validation; **not a V3.1 regression**; deferred. |

False positive (harness only): early biology-lede check matched honesty wording (“not proof of deer presence”). Corrected in harness — not a product defect.

---

## 3. Defects repaired

| ID | Fix |
|----|-----|
| D1 | Measure/Inspect use **80ms** double-tap guard; SEARCH keeps **450ms**. |
| D2 | `fetchInspectElevation` returns **unavailable** when `offlineForced` / `navigator.onLine === false`; **8s AbortController** timeout. Generation guard retained. |
| D3 | Reliability attached to **`hybridImagery` only**. |
| D4 | `applyBasemap` removes orphan `hybridRef` / `hybridImagery` if present bare. |
| D5 | Copy → `Approx. enclosed area: … (not survey-grade)`; ≥1000 ac formatted as whole acres. |
| D6 | Hide `#search-prompt` while measuring/inspect-armed; restore via `syncSearchPrompt` on exit. |

---

## 4–12. Verdict matrix

| Topic | Verdict |
|-------|---------|
| **Basemap switching** | **PASS** — Street→Topo→Satellite→Hybrid→Street (rapid, during session, after pan/persist). Final layer count=1; invalid preference → street; satellite honesty lede present. |
| **Hybrid** | **PASS** — Labels readable on Midwestern aerial sample; no duplicate layer accumulate after cycle; imagery survives label-path degradation design. No custom cartography added. |
| **Measure** | **PASS** after D1 — multi-point path + Undo/Clear/Done; session survives; basemap switch during measure OK; area honesty label OK; SEARCH not stolen while measuring. |
| **Inspect / elevation stale** | **PASS** — gen guard present; rapid A→B→C showed single coherent result; offline → `Elevation: unavailable` (no fabricate); context disclaimer present. |
| **YOU / SEARCH / INSPECT / OBS** | **PASS** — measure/inspect short-circuit ahead of `setSearchLocation`; prompt hidden while tools armed; no evidence of location-kind overwrite in harness. |
| **Active-search survival** | **PASS** — session stayed active across basemap torture, measure, inspect; End Search remaining reachable in chrome. |
| **Mobile visual** | **PASS** — 320 / 390 matrix / 430 / landscape clean collisions; primary `02`/`11` active+prompt+YOU clean. |
| **Outdoor readability** | **PASS** — measure vertices / inspect marker / session strip / Locate remain identifiable over Hybrid/Satellite; no Sheds chrome recolor. |
| **Provider / offline** | **PASS** (with limits) — invalid basemap fallback OK; Hybrid reliability scoped to imagery; inspect offline honest. Full tile-failure CDP not fully simulated (architecture + reliability hooks covered by unit suite). |

---

## 13. Test results

| Suite | Result |
|-------|--------|
| `node --check` map-app / tile-provider / field-tools | PASS |
| `automation/test-sheds-tile-provider.mjs` | PASS (39) |
| `automation/test-sheds-v3-mapping-foundation.mjs` | PASS (17) |
| `automation/test-sheds-map.mjs` | PASS (46) |
| `automation/test-sheds-phase4-ux-polish.mjs` | PASS (64) |
| `automation/test-sheds-field-ux.mjs` (static) | PASS (36) |
| `SHEDS_CDP=1 automation/test-sheds-field-ux.mjs` | PASS (48) |
| `automation/test-sheds-map-cdp.mjs` | PASS |
| `automation/test-app-surface-isolation.mjs` | PASS |
| `automation/hostile-qa-sheds-v3-mapping.mjs` | **0 FAIL / 1 WARN** |
| `automation/test-contact-platform.mjs` | **FAIL (3)** — unrelated contact/mailbox links; **not Sheds V3.1** |

Machine-readable: `SUMMARY.json`.

---

## 14. Files changed (QA repair)

- `apps/shed-hunting/js/sheds-map-app.js` — debounce, offline elev, prompt hide, area copy
- `apps/shed-hunting/js/sheds-tile-provider.js` — `hybridImagery` export; orphan removal
- `apps/shed-hunting/js/sheds-map-field-tools.js` — large-area formatting
- `automation/hostile-qa-sheds-v3-mapping.mjs` — torture harness
- `automation/test-sheds-tile-provider.mjs` / `test-sheds-v3-mapping-foundation.mjs` — regression asserts
- `docs/ENGINEERING-PLAYBOOK.md` — lessons
- `reports/sheds-v3-mapping-acceptance/**` — this package

---

## 15. Screenshot index

| File | State |
|------|--------|
| `01-390-after-basemap-torture.png` | After Street↔… cycle |
| `02-390-active-prompt-you-PRIMARY.png` | Primary active + prompt + YOU |
| `03-390-active-hybrid.png` | Active + Hybrid |
| `04-390-active-measure.png` | Active + Measure (multi-point) |
| `05-390-inspect-result.png` | Inspect HUD + elevation |
| `06-320-initial.png` … `15-1280-desktop.png` | Visual matrix |
| `12b-390-active-measure.png` | Active measure (matrix) |
| `12c-390-field-briefing.png` | Field Briefing |

Failure evidence for D1 was observational (first harness run: only “Point 1” after four rapid taps) — repaired before re-shot `04`.

---

## 16. Recommendation

**MERGE V3.1** (after landing the QA repair commit on `main`).

Hold only if owners want desktop `prompt×here` fixed in the same ship window — that is outside V3.1 mapping scope and was already deferred in PR #52.

Do **not** begin V3.2 from this package.
