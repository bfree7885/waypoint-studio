# Accessibility Findings — Version 1 Readiness

**Date:** 2026-07-18  
**Method:** Code/CSS review + prior playbooks. Not a full assistive-technology pass.

## Strengths
- Skip links on major shells  
- Many controls at **44px** min-height (platform UI / buttons / task nav)  
- `prefers-reduced-motion` handling for skeletons; Settings can set `data-wds-reduce-motion`  
- Honesty text often plain language  
- Form labels present on Settings / Savant / Fieldry patterns  

## Gaps
| Gap | Risk |
|---|---|
| No systematic VoiceOver/NVDA pass this session | Unknown SR regressions |
| Focus order in complex Dashboard widget grids | Easy to get lost |
| Map keyboard alternatives (Sheds Leaflet) | Pointer-first |
| Contrast not audited with automated tooling this session | Possible AA misses in accents |
| Live regions uneven (`aria-live` present in places, not universal) | Loading announcements |
| Hash SPA (Fieldry) focus management on route change | May not move focus to H1 |

## Closed beta guidance
Ask 1–2 testers to complete Fieldry record + Photo Coach upload + Dashboard location prompt with keyboard only; log defects.
