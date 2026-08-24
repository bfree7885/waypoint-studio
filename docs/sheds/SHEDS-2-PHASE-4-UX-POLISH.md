# Sheds 2.0 — Phase 4 UX Polish

**Branch:** `feat/sheds-2-phase-4-ux-polish`  
**Base:** Phase 3 `8a12d061` (`feat/sheds-2-phase-3-field-workflow`)  
**Scope:** Validation + UX polish only — **no** new GIS packs, habitat intelligence, biological weights, find %, sync, or Phase 5.

Preserved audits:

- [`SHEDS-2-PHASE-4-DIRECTION-AUDIT.md`](./SHEDS-2-PHASE-4-DIRECTION-AUDIT.md)
- [`SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md`](./SHEDS-2-PRODUCT-STATE-AFTER-PHASE-3.md)

---

## Goal

Make the existing Sheds product understandable within ~30–60 seconds without teaching architecture.

Primary questions:

1. **When** — seasonal timing appropriate?
2. **Where** — which Search Area?
3. **Landscape** — what does the MODEL say?
4. **Today** — field conditions?
5. **My observations** — what did I record?
6. **Next** — what can I do now?

---

## What changed (presentation)

| Area | Change |
| --- | --- |
| Trip hierarchy | Field briefing sheet uses When / Where / Landscape MODEL / Today’s conditions / My observations / Next |
| Map language | Legend for YOU / SEARCH / AREA TO INSPECT / OBS; TARGET label → **INSPECT** |
| Timing | Hunter-facing plain labels (`Outside main window`, `Main search window`, …) via `plainLabel` |
| Landscape | MODEL pill + mapped-structure language; honest unavailable copy |
| Observations | Primary-surface summary for active Search Area; include-obs opt-in under Advanced (default OFF) |
| Today | Field-conditions framing; calm offline / weather-unavailable copy |
| Field Plan | FAB + briefing CTA + More menu (not buried under expert tools) |
| Session | Start / End primary FAB; active session strip; factual End summary |
| First-run | Dismissible coach; persists in `localStorage` (`waypoint-sheds-first-run-coach-v1`) |
| Advanced | Model weights, Validate, Explain, diagnostics demoted into Advanced |
| Empty states | Shared copy in `sheds-ux-polish.js` |

Architecture underneath (channels, GIS pack, stores, observation influence default OFF) is preserved.

---

## Modules

| File | Role |
| --- | --- |
| `apps/shed-hunting/js/sheds-ux-polish.js` | Coach persistence, empty-state strings, observation summary helpers |
| `apps/shed-hunting/js/sheds-timing.js` | `CATEGORY_PLAIN` / `plainLabel` |
| `apps/shed-hunting/map/index.html` | Trip UI, coach, legend, tools split |
| `apps/shed-hunting/css/sheds-map.css` | Coach / legend / session strip / trip / Advanced |
| `apps/shed-hunting/js/sheds-map-app.js` | Wiring |
| `apps/shed-hunting/js/sheds-field-ui.js` | Field Plan hunter labels |

---

## Validation artifacts

- Protocol: [`SHEDS-2-FIELD-VALIDATION-PROTOCOL.md`](./SHEDS-2-FIELD-VALIDATION-PROTOCOL.md)
- Log (empty templates): [`SHEDS-2-FIELD-VALIDATION-LOG.md`](./SHEDS-2-FIELD-VALIDATION-LOG.md)

**No fabricated field walks.**

---

## Tests

- `automation/test-sheds-phase4-ux-polish.mjs`
- Regressions: Phase 1 / 2 / 3 suites must remain green.

---

## Owner review (local)

```bash
cd /home/bryan/projects/waypoint-scenes/.worktrees/sheds-2-phase-2-habitat-gis
python3 -m http.server 8080
```

Open: http://127.0.0.1:8080/apps/shed-hunting/map/

Use Pike/Milford SEARCH (pack `pa-pike-milford-v1`). Follow the 17-step owner checklist in the Phase 4 implementation brief. Do not claim owner validation until performed.

---

## Explicit non-goals (still out)

Statewide GIS, new packs, new habitat intelligence, new biological weights, deer density, exact cast dates, find probability, AI, accounts, cloud sync, social, public hotspots, multi-species, gamification, full offline maps, Phase 5.
