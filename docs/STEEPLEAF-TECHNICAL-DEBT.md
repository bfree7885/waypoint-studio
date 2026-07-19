# Steepleaf — Remaining Technical Debt

| Item | Severity | Notes |
| --- | --- | --- |
| Dual product surfaces (companion + graph) share brand but separate stores | Medium | Intentional; needs ongoing copy discipline so samples ≠ journal |
| No service worker / offline package for companion | Medium | localStorage works offline after first load; scripts/CSS still need network once |
| Hash-router companion re-paints full shell each navigation | Low | Fine for MVP; virtualize later if collections grow large |
| Explore “Ask the graph” is rule/template AI, not a model | Low | Labeled educational; rename already away from “AI summary” on entity |
| Sample vendor offers on entity pages | Low | Explicitly non-checkout; could move behind a disclosure |
| Inter + Cormorant from Google Fonts | Low | Matches existing Steepleaf DS; self-host later for privacy/perf |
| Platform boot shared change (`status` helper) | Low | Used by Steepleaf; safe for other apps |
| Automated browser smoke for timer + complete session | Medium | Covered in unit store tests; add Playwright when CI allows |

## Out of scope (by design this sprint)

- Account sync, cloud backup, marketplace checkout  
- Redesigning Dashboard / ForageCast / other apps  
- Replacing the demo knowledge graph with user-uploaded catalogs
