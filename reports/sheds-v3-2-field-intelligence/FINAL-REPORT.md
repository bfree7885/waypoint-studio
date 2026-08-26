# Sheds V3.2 — Field Intelligence FINAL REPORT

**Facts-only follow-up (2026-08-26):** Inspect HUD shows physical and land-cover facts only. “Why this may matter,” solar interpretation, and habitat suitability bands are omitted. See [`FACTS.md`](./FACTS.md) and [`RECOVERY.md`](./RECOVERY.md).

**Verdict:** PASS for the Inspect Facts slice  
**Date:** 2026-08-26  
**Product test:** Inspect reports elevation / slope / aspect / land cover without inventing sheds/deer; mobile HUD dismisses and leaves the map usable.

---

## 1. Branch

`chore/product-direction-reconciliation`

## 2. Starting commit

`4fa26378` (Inspect Intelligence with Terrain/Habitat/Why/Limits)

## 3. Final commit

Recorded in git on this branch after the facts-only change (do not SHA-chase this file).

## 4. Exact files changed

See git commit. Primary:

- `apps/shed-hunting/js/sheds-inspect-intel.js`
- `apps/shed-hunting/js/sheds-map-app.js`
- `apps/shed-hunting/map/index.html`
- `automation/test-sheds-v3-2-inspect-intel.mjs`
- `automation/capture-sheds-v3-2-inspect.mjs`
- `docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md`
- `docs/ENGINEERING-PLAYBOOK.md`
- `reports/sheds-v3-2-field-intelligence/FACTS.md`
- `reports/sheds-v3-2-field-intelligence/A_strong.txt`
- `reports/sheds-v3-2-field-intelligence/C_weak.txt`
- this report + CDP artifacts

## 5. Exact files added/deleted

**Added:** `reports/sheds-v3-2-field-intelligence/FACTS.md`  
**Deleted:** none

## 6. Audit findings

See [`AUDIT.md`](./AUDIT.md). Inspect previously mixed FACT with INTERPRETATION (“Why this may matter”) and called `HabitatGis.scorePoint`. This pass removes interpretation from the HUD.

## 7. Existing data sources

Open-Meteo weather/elev; NLCD + 3DEP-derived slope packs; CARTO/Esri tiles; browser GPS; private OBS/Search Areas; PASDA SGL (access context only).

## 8. REAL / DERIVED / INFERENCE / EDITORIAL

Elevation: **REAL**. Neighborhood slope/aspect: **DERIVED**. NLCD class: **REAL**. Edge distance: **DERIVED**. Solar notes / habitat bands: **EDITORIAL/HEURISTIC** and **not shown** on Inspect.

## 9. V3.2 features selected (this pass)

1. Inspect Facts HUD (elevation, slope, aspect, land cover / edge)
2. Honest partial / unavailable / failed / zero-value distinction
3. Limits: no wildlife presence claim; Inspect ≠ OBS
4. Mobile scrollable Inspect + Done

## 10. Deferred

Statewide packs; aspect rasters in pack; polygon Search Area editor; Planning/Field mode split; DeviceOrientation compass; observation type expansion; LLM narratives; full offline tiles; weather duplication of Dashboard; **Inspect interpretation / suitability** (explicitly not this pass).

## 11. Inspect changes

HUD shows labeled elevation, slope (including 0°), aspect when slope ≥ 2°, land cover / edge when pack covers, Limits / honesty, Done dismiss. No Why section. No `scorePoint`. Generation-guarded fetches; offline → unavailable (no fabricate).

## 12. Terrain intelligence

Finite-diff slope/aspect from 5-point Open-Meteo elev (~60 m). Flat terrain marks aspect **not defined**.

## 13. Habitat intelligence

`GisPack.sample` land-cover class + edge meters when pack covers Inspect point. No habitat-signal band.

## 14. Aspect / seasonal

Aspect cardinal only on the HUD. Solar-exposure helper remains in the module for tests, not rendered.

## 15. Suitability / relevance model

Not shown on Inspect. Phase 2 habitat scoring unchanged for SEARCH heat.

## 16. Explainability

Facts and Limits only. Provenance in Limits (NLCD year, neighborhood slope).

## 17. Confidence / uncertainty

Coverage ids remain internal (strong / moderate / limited / insufficient). HUD does not advertise “supporting signals.”

## 18. Hunt-planning improvements

None in this pass (facts readout only).

## 19. Search Area decision

**Preserve existing** circular Search Area.

## 20. Observation changes

None.

## 21. Weather / environmental

No new weather UI; Inspect uses elev/aspect/land cover only.

## 22. Mobile UX

Scrollable Inspect max-height; Done; CDP 375/390/430: no overflow; mapShare stays dominant.

## 23. Desktop UX

Same Inspect doorway; no GIS dashboard chrome added.

## 24. Offline / failure

Elev/terrain fetch short-circuits offline; habitat unavailable outside pack; honesty lines retained.

## 25. Performance

Bounded: one elev point + one 5-point neighborhood fetch per Inspect; GIS sample is O(1) pack lookup.

## 26. Accessibility

Inspect `role="dialog"`, aria-label “Inspect location facts”, Done button, aria-live content; text via `textContent`.

## 27. Prediction-truth safeguards

Banned “shed found” / find probability / Why-this-may-matter / habitat-signal language in report builder; tests assert; Inspect excludes observations and suitability scoring.

## 28. YOU ≠ SEARCH ≠ INSPECT ≠ OBS

Inspect marker + tooltip distinct (`not YOU, not SEARCH, not OBS`); Measure/Inspect still short-circuit SEARCH; Close/Done clears Inspect.

## 29. Tests and exact results

| Suite | Result |
| --- | --- |
| `test-sheds-v3-2-inspect-intel.mjs` | PASS (facts / partial / none / failed / semantics) |
| `test-sheds-phase1-prediction-truth.mjs` | PASS (68) |
| `test-sheds-phase2-habitat-gis.mjs` | PASS (99) |
| `test-sheds-v3-mapping-foundation.mjs` | PASS (17) |
| `test-sheds-tile-provider.mjs` | PASS (39) |
| `test-sheds-phase3-field-workflow.mjs` | PASS (65) |
| `test-sheds-phase4-ux-polish.mjs` | PASS (64) |
| `test-sheds-field-ux.mjs` | PASS (36) |
| `test-sheds-map.mjs` | PASS (46) |

## 30. Browser / CDP verification

`capture-sheds-v3-2-inspect.mjs` — 375/390/430 + 1280. Pike point showed Elevation 607 ft, Slope 7.9°, southeast-facing, Land cover Developed, edge 0 m. `hasWhy=false`, `hasInterpretation=false`, `banned=false`, `overflow=false`, dismiss `hidden=true` / `hudHeight=0` / inspect marker removed.

## 31. Screenshots generated

`reports/sheds-v3-2-field-intelligence/screens/` — 375/390/430/1280 inspect-after-tap; `390-inspect-dismissed.png`; `cdp-inspect-390.json`.

## 32. Known issues

- GIS land cover at Inspect only inside bundled Pike pack (honest elsewhere).
- Default map view may land outside pack — Pike point is used in CDP.
- Desktop `prompt×here` overlap WARN from V3.1 remains deferred.

## 33. Deferred ideas

See §10; plus Field Plan discoverability polish; multi-county pack catalog; a later interpretation slice **only if** owners ask.

## 34. Recommended next three priorities only

1. **Additional GIS packs** (NE PA counties) so Inspect land cover works beyond Pike
2. **Field Plan discoverability** (pre-hunt planning surface without burying under Tools)
3. Interpretation / suitability **only after** facts-only Inspect is validated in the field
