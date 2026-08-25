# Sheds V3.2 — Field Intelligence & Hunt Planning

**Status:** Implemented (Inspect-first slice)  
**Date:** 2026-08-25  
**Branch:** `chore/product-direction-reconciliation`  
**Audit:** [`reports/sheds-v3-2-field-intelligence/AUDIT.md`](../../reports/sheds-v3-2-field-intelligence/AUDIT.md)

---

## Goal

Help a hunter **read the landscape** at a tapped point without inventing sheds or deer.

Inspect is the doorway: coordinates + elevation + (when available) slope/aspect, land cover, habitat-transition distance, explainable search-potential band, and explicit limits.

---

## Shipped in V3.2

1. **`sheds-inspect-intel.js`** — pure report builder (testable).
2. **Inspect HUD enrichment** — GIS pack sample + `HabitatGis.scorePoint` when covered; Open-Meteo neighborhood elev → derived slope/aspect; solar exposure note (physical geography only).
3. **Confidence labels** — Strong / Moderate / Limited / Insufficient (deterministic from input presence).
4. **Mobile progressive disclosure** — scrollable Inspect panel + Done; map remains dominant.

## Explicitly deferred

- Statewide GIS packs  
- Polygon Search Area editor  
- Explicit Planning vs Field modes  
- DeviceOrientation compass  
- Observation type expansion  
- LLM narratives  

---

## Prediction truth

- Never “shed found” / find probability from Inspect.
- MODEL habitat score at Inspect uses GIS only (`includeObservations: false`).
- Aspect language is solar/physical — not bedding claims.
- Missing pack → honest unavailable.

---

## Tests

`node automation/test-sheds-v3-2-inspect-intel.mjs` plus existing Phase 1 / Phase 2 / V3 mapping suites.
