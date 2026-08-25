# Sheds V3.2 — Field Intelligence FINAL REPORT

**Verdict:** PASS for the Inspect-first V3.2 slice  
**Date:** 2026-08-25  
**Product test:** Inspect explains landscape signals without inventing sheds/deer; mobile HUD dismisses and leaves the map usable.

---

## 1. Branch

`chore/product-direction-reconciliation`

## 2. Starting commit

`f26e841d`

## 3. Final commit

`3ff38f3d`


## 4. Exact files changed

See git commit. Primary:

- `apps/shed-hunting/js/sheds-inspect-intel.js` (new)
- `apps/shed-hunting/js/sheds-map-app.js`
- `apps/shed-hunting/map/index.html`
- `apps/shed-hunting/css/sheds-map.css`
- `automation/test-sheds-v3-2-inspect-intel.mjs` (new)
- `automation/capture-sheds-v3-2-inspect.mjs` (new)
- `docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md` (new)
- `docs/PRODUCT-DIRECTION.md`
- `docs/ENGINEERING-PLAYBOOK.md`
- `reports/sheds-v3-2-field-intelligence/**`

## 5. Exact files added/deleted

**Added:** inspect intel module, tests, capture harness, AUDIT, this report, docs, screenshots/JSON artifacts  
**Deleted:** none

## 6. Audit findings

See [`AUDIT.md`](./AUDIT.md). Inspect was lat/elev/relations only; habitat GIS existed for SEARCH grids but not Inspect; aspect not in pack; Search Areas already shipped (Phase 3).

## 7. Existing data sources

Open-Meteo weather/elev; NLCD + 3DEP-derived slope packs; CARTO/Esri tiles; browser GPS; private OBS/Search Areas; PASDA SGL (access context only).

## 8. REAL / DERIVED / INFERENCE / EDITORIAL

Documented in AUDIT §4. Inspect adds: neighborhood elev → **DERIVED** slope/aspect; solar notes → **EDITORIAL/HEURISTIC** (physical geography); habitat bands → existing **EDITORIAL/HEURISTIC**.

## 9. V3.2 features selected

1. Inspect Field Intelligence report  
2. Terrain slope/aspect at Inspect (network neighborhood)  
3. Habitat sample + explainable `scorePoint` when GIS pack covers the point  
4. Deterministic coverage labels + Why/Limits  
5. Mobile scrollable Inspect + Done  

## 10. Deferred

Statewide packs; polygon Search Area editor; Planning/Field mode split; DeviceOrientation compass; observation type expansion; LLM narratives; full offline tiles; weather duplication of Dashboard.

## 11. Inspect changes

HUD shows elev, slope, aspect (when slope ≥ 2°), land cover / edge / search-potential band when pack covers, Why / Limits / Evidence label, Done dismiss. Generation-guarded fetches; offline → unavailable (no fabricate).

## 12. Terrain intelligence

Finite-diff slope/aspect from 5-point Open-Meteo elev (~60 m). Flat terrain suppresses aspect/solar claims.

## 13. Habitat intelligence

`GisPack.sample` + `HabitatGis.scorePoint` (MODEL only, observations off) when pack covers Inspect point.

## 14. Aspect / seasonal

Northern-Hemisphere solar exposure notes only; not bedding/wildlife. Timing channel unchanged.

## 15. Suitability / relevance model

Reuses Phase 2 habitat bands (Limited / Some / Stronger) — never find %.

## 16. Explainability

Deterministic Why bullets from structure/edge/slope/solar; Limits list provenance + honesty.

## 17. Confidence / uncertainty

Strong / Moderate / Limited / Insufficient from presence of elev, slope/aspect, habitat sample.

## 18. Hunt-planning improvements

Inspect usable pre-hunt on desktop/mobile; Field Plan / Search Areas unchanged (already Phase 3). No new polygon editor.

## 19. Search Area decision

**Preserve existing** circular Search Area — do not force polygons in V3.2.

## 20. Observation changes

None (types preserved; no auto wildlife OBS).

## 21. Weather / environmental

No new weather UI; Inspect uses elev/aspect only.

## 22. Mobile UX

Scrollable Inspect max-height; Done; CDP 390: no overflow; mapShare stays dominant.

## 23. Desktop UX

Same Inspect doorway; no GIS dashboard chrome added.

## 24. Offline / failure

Elev/terrain fetch short-circuits offline; habitat unavailable outside pack; honesty lines retained.

## 25. Performance

Bounded: one elev point + one 5-point neighborhood fetch per Inspect; GIS sample is O(1) pack lookup.

## 26. Accessibility

Inspect `role="dialog"`, aria-label, Done button, aria-live content; text via `textContent`.

## 27. Prediction-truth safeguards

Banned “shed found” / find probability in report builder; tests assert; MODEL excludes observations.

## 28. YOU ≠ SEARCH ≠ INSPECT ≠ OBS

Inspect marker + tooltip distinct; Measure/Inspect still short-circuit SEARCH; Close/Done clears Inspect.

## 29. Tests and exact results

| Suite | Result |
| --- | --- |
| `test-sheds-v3-2-inspect-intel.mjs` | PASS |
| `test-sheds-phase1-prediction-truth.mjs` | PASS (68) |
| `test-sheds-phase2-habitat-gis.mjs` | PASS (99) |
| `test-sheds-v3-mapping-foundation.mjs` | PASS (17) |
| `test-sheds-tile-provider.mjs` | PASS (39) |
| `test-sheds-phase3-field-workflow.mjs` | PASS (65) |
| `test-sheds-phase4-ux-polish.mjs` | PASS (64) |
| `test-sheds-field-ux.mjs` | PASS (36) |
| `SHEDS_CDP=1 test-sheds-field-ux.mjs` | PASS (48) |
| `test-sheds-map.mjs` | PASS (46) |

## 30. Browser / CDP verification

`capture-sheds-v3-2-inspect.mjs` — Inspect armed; HUD showed Why/Limits; `banned=false`; `overflow=false`. Outside pack → honest Habitat unavailable.

## 31. Screenshots generated

`reports/sheds-v3-2-field-intelligence/screens/` — 375/390/430/1280 initial; `390-inspect-after-tap.png`; `cdp-inspect-390.json`.

## 32. Known issues

- GIS habitat at Inspect only inside bundled Pike pack (honest elsewhere).  
- Default map view may land outside pack — Scenario D (strong habitat) validated in unit tests + pack coverage, not always in default CDP center.  
- Desktop `prompt×here` overlap WARN from V3.1 remains deferred.

## 33. Deferred ideas

See §10; plus Field Plan discoverability polish; multi-county pack catalog.

## 34. Recommended next three priorities only

1. **Additional GIS packs** (NE PA counties) so Inspect habitat works beyond Pike  
2. **Field Plan discoverability** (pre-hunt planning surface without burying under Tools)  
3. **Sheds V3.3** only after field validation of Inspect explanations with a real hunt walk
