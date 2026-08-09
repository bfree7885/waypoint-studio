# Visual production repair — owner review

**Branch:** `feature/visual-production-repair`  
**Date:** 2026-08-08  
**Scope:** Visual coherence and polish only (not functional production-reality).

## Reused work

Cherry-picked onto `origin/main` (with conflict resolution):

- `1f15200` — Articles Waypoint’s Take contrast / scanability
- `b061651` — Studio continuity strip + WDS shell alignment
- `6e43ad2` — Studio polish release (contrast, spacing, wording)

Conflict policy: kept Sheds local Leaflet vendor (map reliability) while adopting continuity CSS/JS; kept dark-shell Side Trails status tokens; preserved both playbook lessons.

## Routes inspected (rendered)

At ~375 / ~430 / ~768 / desktop (1280):

Home, About, Support, Contact, Privacy, Terms, Articles (+ sample), Side Trails, Incubator, Dashboard, Scenes, Sheds (+ map), Photo Coach, SignalTerrain (Side Trails), Global Signals (+ explain/articles/countries/industries/citizen/relationships/graph/take/about), ForageCast, Fieldry, SignalTerrain app, Knowledge, Settings, 404.

Second-pass screenshots: `docs/visual-production-repair/screenshots/second-pass/`.

## Major repairs

1. **GS badge contrast** — `.gsh-banner p` overrode `.gsh-badge` ink (light on mint). Scoped badge color wins.
2. **GS / ST primary CTAs** — `.gs-landing a` / `.st-landing a { color: inherit }` beat primary button ink. Higher-specificity dark ink on solid mint/blue fills.
3. **Continuity strip vs product chrome** — absolute product tops clipped brand marks under a wrapping strip. Sticky one-line strip on phones; product tops in normal flow; hide duplicate studio links from product nav.
4. **ForageCast reliability banner** — parchment text on light pastel wash; force dark ink on reliability surfaces; deepen moderate heatmap fills for zone labels.
5. **Muted captions / notes / footers** — `#6d7c93` → `#9aa8bd` on ST/GS dark surfaces; Leaflet attribution links brightened on Sheds map.
6. **Contact fallbacks** — light-theme token fallbacks updated to dark-shell parchment so missing tokens cannot flash brown-on-dark.
7. **Explain hub CTA wrap** — primary full-width; secondary pair at 50% on narrow viewports.

## Accessibility / contrast

Regression gates in `automation/test-visual-production-repair.mjs` (Playwright):

- GS badge, Explore, Explain primary, Sheds primary, Articles Take body, Contact H1, ForageCast reliability, ST brand not clipped.

## Tests / build

- `node automation/test-visual-production-repair.mjs` — PASS
- `node automation/mobile-layout.mjs` — PASS (fast matrix)
- `node automation/test-articles-rss.mjs` — PASS (provenance label assertion updated for clearer “Publisher feed summary” copy)
- Static server only; no app build step

## Owner judgment

- Continuity strip + product top still stack on ST/GS — intentional family bridge; further collapsing into a single chrome is a product decision.
- Articles view chips wrap on narrow phones; shortening labels further would lose clarity.
- Functional production-reality sweep remains separate.
