# Scenes V1 Attack 1 — Implementation Map

**Branch:** `feat/scenes-v1-coach-library-excellence`  
**Scope:** Photo Coach + Photo Library + handoff only. Dashboard frozen.

## Authoritative production paths (ONLY these)

| Concern | Path |
|---------|------|
| Coach UI shell | `apps/photo-coach/index.html`, `css/photo-coach-*.css` |
| Coach controller | `apps/waypoint-scenes/js/photo-coach.js` |
| On-device analysis | `apps/waypoint-scenes/js/photo-coach-analysis-demo.js` (engine v5; filename legacy) |
| Shoot / summary / labels | `apps/waypoint-scenes/js/photo-coach-shoot.js` |
| Queue / grouping | `photo-coach-queue.js`, `photo-coach-grouping.js` |
| EXIF | `apps/waypoint-scenes/js/exif-reader.js` |
| Outdoor context reader | `photo-coach-outdoor-context.js` (+ ecosystem bridge read-only) |
| Library UI | `apps/photo-library/index.html`, `js/pl-*.js`, `css/*` |
| Library client handoff | `apps/waypoint-scenes/js/photo-library-client.js` |
| Profile (history) | `apps/photo-coach/profile/` + `photo-coach-profile-*.js` |
| Coach CSS | `apps/waypoint-scenes/css/photo-coach.css` + folio overlays |

## Ignore (do not build against)

- `apps/scenes/js/engines/*` stubs  
- Living Scenes / journals / books / calendars  
- Dashboard edits  
- `apps/photo-pipeline/`  
- Parallel field-guide as rival product (keep secondary)

## Change plan

1. **Sharpness trust** — Laplacian + scene-type ambiguity gates; soft language; fixtures.  
2. **Review hierarchy** — PHOTO → Overall read → What worked → What to watch → Next time (1–2 field actions).  
3. **Confidence language** — HIGH / REASONABLE / LOW; omit weak critiques.  
4. **Shoot summary** — mentor tone; favorites; supported patterns only; progression; keeper counts.  
5. **Labels** — Keep/Maybe/Reject/Favorite keyboard + touch; never auto-reject.  
6. **Library SoT** — shoot membership, coach summary carry, storage failure UX, organize quietly.  
7. **Trust copy** — retire user-facing “Demo”; local-first / no upload messaging.  
8. **Visual** — image-first darkroom; mobile photo→review→decisions.  
9. **Tests + screenshots** — automation + `docs/rebuild-2026/scenes-v1-coach-library-screenshots/`.

## 30 acceptance gates (owner YES/NO)

1. Review hierarchy PHOTO → Overall → What worked → What to watch → Next time  
2. Local on-device analysis only (no cloud AI swap)  
3. Confidence language HIGH / REASONABLE / LOW  
4. Weak critiques omitted; no invented EXIF/subject/settings/env/species  
5. Sharpness gated; never “blurry” without support  
6. Sharpness fixtures cover sharp / shallow DOF / smooth sky-water / low-light / blurred / landscape  
7. Multi-image shoot summary (strongest, patterns, progression, tip, keeper counts)  
8. Summary mentor tone (not analytics dashboard)  
9. Favorites respected in summary  
10. Keep/Maybe/Reject/Favorite first-class, fast, reversible  
11. Keyboard + touch labeling  
12. Never auto-reject by score  
13. Library carries original, stable ID, datetime, EXIF, labels, Favorite, Coach summary, shoot ID  
14. Outdoor context only when legitimate; source distinguished  
15. No unnecessary blob duplication; backward-compatible contracts  
16. Library organize: shoots, date, Favorites, labels, EXIF filters when real  
17. Open Coach result + return to shoot summary from Library  
18. Shoot/session hardened: stable ID, time range, counts, optional outdoor, summary, member IDs  
19. Visual: photographic / immersive / quiet craft (not SaaS dashboard)  
20. Desktop image-dominant + readable critique; mobile one-column progressive disclosure  
21. Coaching default ~10s read; deeper metrics optional  
22. 20-image shoot practical; progress UI; no needless reanalyze/leak  
23. Storage failures honest (IDB/quota/missing blob)  
24. Privacy: local-first messaging; no silent photo upload; GPS sensitive  
25. Profile = photography history only; insufficient history stated honestly  
26. No paywall / no crippled basics  
27. Guide secondary; Profile = history; no user-facing “demo analysis”  
28. Automated tests cover upload/analyze/labels/shoot/library/failure/privacy/responsive  
29. Visual screenshots captured + inspected for all required states  
30. No regression: Scenes Hub / HL / Animal Vision / global nav / Dashboard untouched  

## Storage keys (unchanged contract)

- `waypoint-photo-coach-shoots-v1`  
- `waypoint-photo-records-v1` / growth entities  
- `waypoint-photo-library-index-v1` + IndexedDB `waypoint-photo-library-media-v1`  
- `sessionStorage` outdoor: `waypoint-outdoor-context-v1`  
