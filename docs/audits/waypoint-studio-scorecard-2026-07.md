# Scorecard — Waypoint Studio Production (2026-07)

**Overall: 63 / 100** — functional prototype requiring substantial work (60–69).

Production SHA: `59c09de`. Scores award **live, user-reachable behavior only**. Unmerged feature branches earn zero points.

---

## Weighted categories

| Category | Weight | Raw | Weighted | Strongest | Largest problem | Next band needs |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Core functionality | 20 | 12 | 12 | Home shell + Photo Coach work | Thin Dashboard; unfinished Scenes pillars | Ship Dashboard depth; complete one Scenes create/remember path |
| Reliability & data integrity | 15 | 10 | 10 | Honest trust chips | Provider fallback empties Light/Air; moonrise row | Local sun calc; fix alerts empty trust; fewer false Partials |
| Navigation & link integrity | 10 | 8 | 8 | 0 broken internal probes | Links to unfinished / legacy surfaces | Remove Coming later; stop promoting monolith |
| Mobile & responsive | 10 | 7 | 7 | Dashboard mobile full-width held | Sheds map tiles; customize edge cases | Map reliability; verify customize DOM |
| UX & clarity | 10 | 6 | 6 | Scenes hub journey copy | Home≡Dashboard naming; empty tiles dominate | Stronger first screen; deeper defaults |
| Accessibility | 10 | 7 | 7 | Home snapshot clean | Incomplete WCAG depth across apps | Keyboard/screen-reader pass on Coach + Sheds |
| Performance | 10 | 5 | 5 | No SW thrash | 164-module `wds.js` load incl. dead eras | Trim loader to Rebuild + shared deps |
| Visual design & consistency | 5 | 3.5 | 3.5 | Within-product dark systems | Accent/nav differ Dashboard vs Scenes | Shared shell tokens |
| Security & privacy | 5 | 3.5 | 3.5 | No secrets found; HSTS | No CSP/XFO/XCTO; public debug/status | Headers + restrict operator pages |
| Product completeness & differentiation | 5 | 2 | 2 | Distinct craft vs field vs home | Three unfinished products at once | Finish one product deeply |
| **Total** | **100** | | **63** | | | |

---

## Product scores

### Dashboard — 71 / 100

Usable beta with manageable gaps **inside its current five-tile scope**, but the product claim (“customizable outdoor workspace”) is **not earned**.

| Sub-area | Score | Notes |
| --- | ---: | --- |
| Shell / mount | 85 | Rebuild boots reliably |
| Data honesty | 80 | Strong empty/error language |
| Catalog depth | 35 | Five tiles; customization theater |
| Today Outside | 70 | Useful when weather answers |
| Layout | 85 | Repair held on mobile/desktop |
| Performance | 45 | Dead eras loaded |

### Scenes — 58 / 100

Partial craft product. Photo Coach is real; Living Scenes and Journals are not; portfolio suite is source-only.

### Sheds — 48 / 100

Honest foundation / prototype. Ethics strong; map reliability and product depth weak.

### Importer workflow — 52 / 100

Local import path solid; eject + Scenes handoff + create loop fail the end-to-end story.

---

## Band interpretations applied

| Band | Meaning | This audit |
| --- | --- | --- |
| 90–100 | Production-grade and compelling | — |
| 80–89 | Strong public product | — |
| 70–79 | Usable beta | Dashboard alone approaches this |
| 60–69 | Functional prototype, substantial work | **Platform overall (63)** |
| 40–59 | Unstable / incomplete alpha | Scenes, Sheds, Importer |
| ≤39 | Fragmented / nonfunctional | — |

---

## What would move overall to 70+

1. Merge/ship Dashboard functional catalog (≥24 honest tiles) with category customize.
2. Trim dead Dashboard loader weight.
3. Remove unfinished language from Support / stop promoting legacy Scene Builder as primary.
4. One reliable Scenes create-or-portfolio path on production (not preview pages).
5. Security headers + favicon + operator-page policy.

## What would move overall to 80+

All of the above, plus: Importer→Coach handoff working; Journals or Living Scenes as a real product (not both half-done); Sheds either polished to a single clear milestone or demoted from primary nav.
