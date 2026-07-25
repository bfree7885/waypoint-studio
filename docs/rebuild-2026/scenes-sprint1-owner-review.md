# Owner review — Scenes Sprint 1  
## Coach source-of-truth + four-pillar foundation

**Date:** 2026-07-24  
**Focus:** Scenes only  
**Status:** Stop for owner review — **no merge, no deploy**

---

## Repository and branch

| | |
|--|--|
| **Repository** | `/home/bryan/Projects/waypoint-studio` |
| **Branch** | `feature/scenes-sprint1-four-pillar-foundation` |
| **Starting SHA** | `63fc45748ef9e283e413025c24f73cf476415b39` |
| **Ending SHA** | `d277ec5c1410da70c898789f347abde8c68dfac3` (feature commit; docs sync commits may follow on branch tip) |
| **Working-tree status** | Clean on feature branch after push (unrelated local placeholder SVG edits may remain uncommitted). |

---

## Implementation summary

Sprint 1 establishes one coherent Scenes foundation:

1. **`/apps/photo-coach/`** is the sole consumer Photo Coach source of truth.
2. **`/apps/waypoint-scenes/`** is the Scenes entry experience with four clear paths: LEARN / CREATE / REMEMBER / EXPLORE.
3. The duplicate Coach host formerly on `waypoint-scenes` was **removed** (not CSS-hidden); Living Scenes moved to **`/apps/waypoint-scenes/create/`**.
4. Consumer schoolwork language (Grade / Assignment / report-card UI) was replaced with calm coaching language where it surfaces in the consumer UI.
5. Owner **`photo_pipeline`** remains untouched and separate from consumer LEARN.

**Mission:** Observe. Discover. Understand.  
**Tagline:** Capture what you find. Learn why it matters.

---

## Route changes

| Route | Role after Sprint 1 |
|-------|---------------------|
| `/apps/waypoint-scenes/` | Scenes landing — four-pillar foundation |
| `/apps/photo-coach/` | Canonical LEARN / Photo Coach |
| `/apps/waypoint-scenes/create/` | CREATE / Living Scenes studio (functional) |
| `/apps/waypoint-scenes/remember/` | REMEMBER / Outdoor Journals foundation |
| `/apps/waypoint-scenes/explore/` | EXPLORE overview + links to live studios |

---

## Redirects added / tightened

| From | To |
|------|----|
| `/scenes/` | `/apps/waypoint-scenes/` |
| `/apps/scenes/` | `/apps/waypoint-scenes/` |
| `/apps/scenes/living-scenes/` | `/apps/waypoint-scenes/create/` |
| `/apps/scenes/scene-builder/` | `/apps/waypoint-scenes/create/` |
| `?mode=coach` / `#coach` on Scenes landing or create | `/apps/photo-coach/` |

Legacy bookmarks fail gracefully via redirect HTML + client replace.

---

## Duplicate code removed

- Dual Coach+Builder page removed from `apps/waypoint-scenes/index.html` (replaced by landing).
- Coach host (`mode-coach` UI) no longer ships on the Scenes entry or Living Scenes CREATE page.
- Coach-mode product toggles now **navigate** to `/apps/photo-coach/` instead of embedding a second Coach.
- `photo-coach-scene-bridge` hands off to `/apps/waypoint-scenes/create/` when Coach is not co-hosted.

Shared Coach JS under `apps/waypoint-scenes/js/photo-coach*.js` remains the library consumed by `/apps/photo-coach/` (single implementation).

---

## Terminology changes (consumer)

| Before | After (consumer-facing) |
|--------|-------------------------|
| Grade / letter+/100 hero | **Overall reading** (`renderReadingCard`) |
| Field assignment | **`nextObservation` / `fieldSuggestion`** (aliases retained for storage compatibility) |
| `completeAssignment` | **`markSuggestionTried`** (`completeAssignment` kept as alias) |
| Filmstrip letter grades | Frame index labels |
| Session letter report card | Quiet session reading note (no letter badge) |
| Bring it to Life (Coach-sequence tone) | **Create a Living Scene** / **Open Living Scenes** |

Internal analysis fields such as `overallGrade` / numeric scores remain in the data model for ranking logic; they are no longer the primary consumer UI.

---

## Retained Photo Coach functionality

- Upload (single, multi, folder)
- On-device analysis / shoot review
- Filmstrip + selection labels (Keep / Maybe / Reject / Favorite)
- Strengths, opportunities, editing direction, next observation
- Living Scenes handoff from Coach → CREATE
- Session history / portfolio / profile hooks (existing modules)

---

## Owner `photo_pipeline` boundary

- **Not merged** into consumer LEARN.
- No consumer routes, copy, storage keys, or controls from `photo_pipeline` were pulled into Scenes landing or Photo Coach.

---

## Navigation

Updated:

- `design-system/js/platform/wds-app-nav-config.js`
- `design-system/ecosystem/nav-registry.json`
- `design-system/ecosystem/product-registry.json` (Scenes `toolHref`)
- Platform catalog / workflows Scenes path
- Homepage Scenes card → `/apps/waypoint-scenes/`

Scenes local nav: Scenes · Photo Coach · Living Scenes · Outdoor Journals · Hidden Landscapes · Your photographs.

---

## Test results

| Suite | Result |
|-------|--------|
| `automation/test-scenes-sprint1-foundation.mjs` | **53 passed** |
| `automation/test-photo-coach-shoot-review.mjs` | **41 passed** |
| `automation/test-photographer-profile.mjs` | **passed** |
| `automation/test-personalized-coaching.mjs` | **passed** |
| `automation/test-hidden-landscapes.mjs` | **134 passed** |
| `automation/test-photo-library.mjs` | **26 passed** |
| `automation/validate-production-assets.mjs` | **OK — 0 missing** |

**Lint / typecheck / production JS build:** N/A for this static HTML/JS site (no package lint/tsc pipeline for Scenes). Syntax checks on touched Coach/app modules: OK.

New coverage includes: four-pillar landing, LEARN → photo-coach, legacy redirects, Grade/Assignment absence on landing + Coach HTML, remember disabled/truthful CTA, filmstrip/summary language, foundation CSS + reduced-motion.

---

## Screenshot paths

Under `docs/rebuild-2026/screenshots/sprint1/`:

| File | Viewport |
|------|----------|
| `desktop-1440-scenes-landing.png` | 1440 |
| `desktop-1440-photo-coach.png` | 1440 |
| `desktop-1440-outdoor-journals.png` | 1440 |
| `desktop-1440-hidden-landscapes.png` | 1440 |
| `desktop-1440-living-scenes.png` | 1440 |
| `tablet-768-scenes-landing.png` | 768 |
| `tablet-768-photo-coach.png` | 768 |
| `mobile-430-scenes-landing.png` | 430 |
| `mobile-430-pillars-stacked.png` | 430 (tall) |
| `mobile-430-photo-coach.png` | 430 |
| `mobile-430-outdoor-journals.png` | 430 |
| `mobile-390-scenes-landing.png` | 390 |
| `mobile-390-photo-coach.png` | 390 |

---

## Known limitations

1. Internal Coach data still uses `overallGrade` / numeric scores for ranking — not fully renamed (UI softened; full model rename deferred).
2. Living Scenes handoff from Coach transfers critique/exif via `sessionStorage`; blob image transfer across pages is not fully restored (user re-opens the photograph in CREATE if needed).
3. REMEMBER is foundation-only (no journal builder).
4. EXPLORE foundation links to existing Hidden Landscapes / Animal Vision studios; no new spectral simulation in this sprint.
5. Some legacy Field Guide / WEF “lesson” strings may still exist inside Living Scenes Field Guide tab (educational curriculum, not Coach grading).
6. Dashboard/Sheds surfaces were not redesigned; only Scenes entry links updated where they pointed at old `apps/scenes/`.

---

## Explicit recommendation for Sprint 2

**Deepen LEARN without rebuilding the host again:**

1. Continue consumer language cleanup inside shoot-summary / profile companion copy (retire remaining score-forward phrasing where it still leaks).
2. Finish Coach → Living Scenes image handoff (blob or IndexedDB) so CREATE opens with the same frame.
3. Begin REMEMBER Outdoor Journals MVP scope (structure + one output type), or SELECT / portfolio assistant if owner prefers craft over memory next.
4. Optional: soft visual pass on Photo Coach shell to fully match Scenes foundation tokens (charcoal / violet / aurora) without classroom dashboard patterns.

Do **not** reintroduce a Coach host on `/apps/waypoint-scenes/`.

---

## Decision requested

Approve merge of `feature/scenes-sprint1-four-pillar-foundation` after review, or request adjustments before merge.  
**No deploy from this sprint.**
