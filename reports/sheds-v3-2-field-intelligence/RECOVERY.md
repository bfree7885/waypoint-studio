# Sheds V3.2 Recovery — Inspect Intelligence

**Date:** 2026-08-25  
**Branch at recovery:** `chore/product-direction-reconciliation`  
**HEAD at recovery:** `fa6c820f`  
**Pre-V3.2 baseline (not reset):** `f26e841d`

This recovery run did **not** restart the full V3.2 Field Intelligence roadmap. It preserved committed Inspect work, classified remaining roadmap items, and finished one bounded slice: **Inspect Intelligence**.

---

## Git state at recovery

| Item | Value |
| --- | --- |
| Current branch | `chore/product-direction-reconciliation` |
| Working tree | Clean of Sheds implementation diffs (untracked noise only: OpenPA, Chrome profiles, worktrees, unrelated docs) |
| Commits since `f26e841d` | 4 |

### Previous-run commits

1. `d9eb6bb9` — `feat(sheds): V3.2 Inspect field intelligence for landscape reading.` (real implementation)
2. `a827fa22` — `docs(sheds): record V3.2 final commit SHA in acceptance report.`
3. `ab2b545b` — `docs(sheds): point V3.2 report at branch tip.`
4. `fa6c820f` — `docs(sheds): align V3.2 report tip SHA.`

The last three commits are a SHA-alignment loop on `FINAL-REPORT.md` (1-line changes). That loop, plus leftover headless Chrome / HTTP servers from earlier Sheds CDP work, is the most likely stall pattern — not missing Inspect code.

### Uncommitted work at recovery

No uncommitted Sheds source changes. Untracked files were unrelated (`.tmp-*-chrome-profile*`, `.worktrees/`, OpenPA, automation artifacts). Not staged.

---

## What survived (salvaged)

| Artifact | Status |
| --- | --- |
| `apps/shed-hunting/js/sheds-inspect-intel.js` | Salvaged — slope/aspect from Open-Meteo neighborhood; GIS pack land-cover sample; banned-language guard |
| Inspect HUD wiring in `sheds-map-app.js` | Salvaged — generation-guarded fetches, GIS pack sample at Inspect, Done dismiss |
| Marker semantics YOU ≠ SEARCH ≠ INSPECT ≠ OBS | Salvaged — distinct Inspect marker/tooltip; Measure/Inspect still isolate SEARCH |
| `automation/test-sheds-v3-2-inspect-intel.mjs` | Salvaged (then extended in this recovery) |
| `automation/capture-sheds-v3-2-inspect.mjs` | Salvaged (then extended) |
| `docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md` | Salvaged (then aligned to this slice) |
| `AUDIT.md` | Salvaged — still the pre-implementation inventory |
| Screenshots | Partial — map-initial 375/390/430/1280; one 390 inspect tap (default Midwest view, outside Pike pack) |

---

## What was incomplete / broken relative to this slice

| Gap | Notes |
| --- | --- |
| HUD structure | Dense `<pre>` dump mixed facts, interpretation, evidence labels, and long solar notes. Spec wants **Terrain / Habitat / Why this may matter / Limits**. |
| No-data copy | Used “Insufficient information” / “Habitat: unavailable” instead of the honest no-intelligence line. |
| Failed vs unavailable | Fetch errors were labeled the same as offline/missing pack (`unavailable`). |
| Habitat band in Why | “Search potential band” could be read as wildlife presence. |
| Tests | Missing failed-data, panel dismissal wiring, and several truth cases required by this prompt. |
| Mobile/desktop proof | Only one inspect screenshot; default map center is Midwest overview, so habitat pack rarely appeared in CDP. |
| Report SHA loop | Three follow-up commits after the feature — stall, not product work. |

---

## Feature classification (V3.2 roadmap vs this slice)

| Area | Status |
| --- | --- |
| Inspect Intelligence | **PARTIAL** at recovery → finished in this run (presentation + truth states). Data pipeline was already present. |
| Terrain (elevation) | **COMPLETE** (Open-Meteo) |
| Terrain (slope) | **COMPLETE** (neighborhood elev; GIS pack slope as fallback inside Pike pack) |
| Terrain (aspect) | **COMPLETE** where neighborhood elev succeeds; **not** in GIS pack (deferred raster) |
| Habitat interpretation | **PARTIAL** — NLCD + edge inside Pike pack only; honest unavailable elsewhere |
| Explainability | **PARTIAL** at recovery → **COMPLETE** for this slice (FACT / INTERPRETATION / LIMITATION) |
| Suitability | **NOT STARTED** as a new model — reuses Phase 2 heuristic band internally; HUD does not treat it as wildlife presence |
| Confidence percentages | **NOT STARTED** (correct — do not fabricate) |
| Search Areas | **NOT STARTED** (already shipped in Phase 3; out of scope) |
| Hunt planning | **NOT STARTED** |
| Weather context | **NOT STARTED** |
| Seasonal context | **NOT STARTED** |
| Mobile field UX (Inspect panel) | **PARTIAL** at recovery → verified/finished for Inspect Intelligence only |

---

## Abandoned processes cleaned

Killed long-running **Sheds GPS diagnostic** headless Chrome parents (`/tmp/sheds-gps-*`) and a leftover `python3 -m http.server 8088` from `.worktrees/sheds-2-field-validation`.

Left running (not this V3.2 slice): homepage/debug Chrome and `http.server` 8765/8766 from other Studio work. Not killed.

Likely stall contributors: many concurrent `--headless=new` Chrome instances + HTTP servers that never exited after CDP scripts, plus the report SHA commit loop.
