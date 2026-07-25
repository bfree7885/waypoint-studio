# Scenes Portfolio Health — Owner Review

**Date:** 2026-07-25  
**Branch:** `feature/scenes-portfolio-health`  
**Cut from:** `feature/scenes-auto-portfolio-builder`  
**Starting SHA:** `8629ef168346f6066fad8bb21cfc79e3623c8062` (publish tip after builder docs stamp `17e4049`; brief expected `17e4049` — advanced by automated `[skip ci]` Publish live engine artifacts commits)  
**Implementation commit:** _(filled at commit)_  
**Final / tip SHA:** _(filled after push)_  
**Base builder implementation:** `09a2146` · **Base coach:** `ef7ed25` · **Base assistant tip:** `714d7ce` · **Base foundation (meaningful):** `87fbd76`  
**Deployment status:** **Not deployed** · **Not merged**  
**Dashboard / Sheds:** **Untouched** (no Dashboard or Sheds product files in diff)

---

## Executive summary

Portfolio Foundation stores purpose sets; Assistant recommends candidates; Coach
explains pairs; Builder drafts coherent first sets. This sprint adds **Portfolio
Health**: reflective, explainable observations about the *shape* of a
photographer’s body of work — concentration, underrepresentation (only vs the
user’s own library or purpose signals), repetition, metadata coverage, purpose
alignment, strength patterns from real decisions, and optional opportunities.

There is **no universal health score**, ranking, streak, badge, or cross-user
comparison. Language stays observational. Analysis is local-first, deterministic,
versioned, and free of fabricated subjects/seasons/locations.

Prior owner-review and signal-audit docs for Foundation, Assistant, Coach, and
Builder are preserved unchanged.

---

## Inherited portfolio capabilities

| Layer | Capability retained |
|-------|---------------------|
| Foundation | Create/edit/reorder/cover/rename/delete purpose portfolios |
| Assistant | Candidate sessions, categories, similar groups, overrides |
| Coach | Comparative coaching, evidence, notes, decisions |
| Builder | Purpose drafts, roles, sequence, alternatives, save/rebuild |

Health links into Coach (pair deep-link via Assistant) and Builder without
silently mutating portfolios.

---

## Health-signal audit summary

Full inventory: [`docs/scenes/portfolio-health-signal-audit.md`](./portfolio-health-signal-audit.md).

**Used:** portfolio membership/order/cover/purpose/roles; Assistant/Coach/Builder
session outputs as soft priors; favorites/Keep/rating; soft Photo Coach when
analyzed; Assistant similarity groups; orientation/dimensions; capture-date →
season/time-of-day; tags when present; camera/lens/focal when present; collection
+ shoot linkage; stale/missing refs; library-vs-portfolio comparison basis.

**Excluded:** universal scores; industry norms; GPS claims when absent; pixel
ML; perceptual hash; shoot-store styleSignals; external AI; auto portfolio
alteration.

---

## Exact sprint scope

**In:** Health workspace (`health.html`), insight pipeline, persistence of
save/dismiss/intentional/notes, descriptive portfolio comparison, tests,
screenshots, signal audit + this owner review.

**Out:** books, calendars, journals, printing, website publishing, Living Scenes,
Dashboard, Sheds, universal scoring, gamification.

---

## User-visible workflow

1. Open **Portfolio Health** from Portfolios toolbar (`health.html`).  
2. Choose scope: one / multiple / all / descriptive compare.  
3. Optionally tune dimensions; exclude incomplete-metadata dimensions.  
4. **Analyze** → overview (available vs unavailable areas) + insight cards.  
5. Open an insight → evidence, comparison basis, confidence, affected photos.  
6. Save / dismiss / restore / not-relevant / personal note / mark intentional
   repetition; confirm before remove; open Coach or Builder.  
7. **Refresh analysis** reuses versioned cache; dismissed insights stay dismissed
   unless the insight fingerprint materially changes.

---

## Supported analysis scopes

- One selected portfolio  
- Multiple selected portfolios (union membership)  
- All portfolios  
- Descriptive compare (two+)  
- Library used as **comparison basis** for underrepresentation only (not a fake
  “library portfolio”)

---

## Concentration behavior

Surfaces dominant subject/season/orientation/time-of-day/role/camera/lens/focal/
shoot/collection/location-cluster **when data exists**. Framed as information;
“may be intentional”; never “bad” or “unbalanced” as judgment.

## Underrepresentation behavior

Only with clear basis (`library-vs-portfolio` or `purpose-signals`). Example:
library has winter frames; portfolio includes none. Never industry norms.

## Repetition behavior

Reuses Assistant `buildGroups` (fingerprint / name+size / burst / aspect+month).
Actions: open group, Coach, mark intentional, Builder, remove with confirm.

## Metadata-health behavior

Coverage summaries for dates, subjects, camera, orientation, GPS absence,
missing/stale refs, Photo Coach coverage. Explicitly **not** photo quality.

## Purpose-alignment behavior

Descriptive notes for all eight Builder purposes + free-text soft mapping.
No invented contest rules; no print/web quality guarantees.

## Strength-pattern behavior

Grounded in Keep/favorite/rating, Assistant strong-candidate overlap, Coach notes.
Language: “Your selections suggest…” — not definitive style claims.

## Opportunity suggestions

Derived from real underrepresentation/gaps; optional; dismissible/savable/
not-relevant; no urgency, streaks, or obligations.

---

## Comparison-basis model

| Basis | Use |
|-------|-----|
| `portfolio-internal` | Distribution inside selected set |
| `library-vs-portfolio` | User library counts vs inclusion |
| `purpose-signals` | Soft purpose priorities |
| `user-decisions` | Favorites, ratings, Keep, notes |
| `insufficient` | Honest withhold / lower confidence |

---

## Confidence and evidence model

Every insight: `higher` | `moderate` | `lower` (qualitative only), `evidence[]`,
`comparisonBasis`, `affectedImageIds`, `analysisVersion` (`1.0.0`).

---

## Save, dismiss, restore, and notes behavior

Persisted in `waypoint-scenes-portfolio-health-v1` as lightweight insight state
(saved, dismissed, notRelevant, intentionalRepetition, note, fingerprint).
Refresh merges without silently restoring dismissed insights unless fingerprint
changes (then visibility restores; note may remain).

## Intentional repetition behavior

Repetition insights can be marked intentional; flag persists across refresh.

## Portfolio comparison behavior

Side-by-side descriptive table; notes that neither set is a winner; handles
identical membership and missing data.

---

## Persistence changes

| Key | Contents |
|-----|----------|
| `waypoint-scenes-portfolio-health-v1` | Analyses cache, insight decisions, dimensions, last scope/version |
| `waypoint-scenes-portfolio-health-meta-v1` | Schema stamp |

`Portfolio.health` remains available as a reserved field; this sprint does not
write a numeric score into it.

---

## Architecture changes

```
collect/normalize     health-engine.js (+ assistant-signals / recommend groups)
  → coverage / concentration / underrep / repetition / metadata
  → purpose / strength / opportunities / confidence
  → merge persisted decisions
compare               health-compare.js
catalog/language      health-catalog.js
persistence           health-store.js
presentation          health-ui.js + health.html + scenes-portfolio-health.css
```

No insight logic in UI components beyond rendering and user actions.

---

## Files added

- `apps/scenes/portfolio/health.html`
- `apps/scenes/portfolio/css/scenes-portfolio-health.css`
- `apps/scenes/portfolio/js/health-catalog.js`
- `apps/scenes/portfolio/js/health-engine.js`
- `apps/scenes/portfolio/js/health-compare.js`
- `apps/scenes/portfolio/js/health-store.js`
- `apps/scenes/portfolio/js/health-ui.js`
- `apps/scenes/portfolio/js/health-boot.js`
- `automation/test-scenes-portfolio-health.mjs`
- `automation/capture-scenes-portfolio-health.mjs`
- `docs/scenes/portfolio-health-signal-audit.md`
- `docs/scenes/portfolio-health-owner-review.md` (this file)
- `docs/scenes/portfolio-health/*.png` (+ capture-summary.json)

## Files substantially changed

- `apps/scenes/portfolio/index.html` — toolbar link to Health  
- `docs/ENGINEERING-PLAYBOOK.md` — Lessons Learned entry

## Dependencies added

**None.**

---

## Privacy behavior

Local-only analysis; no new network calls; no third-party AI; no photo uploads;
sessions store ids + derived text only.

## Performance behavior

Reuses Assistant groups; thumbnail-only UI; versioned analysis cache; caps at
200 portfolio images / 2000 library compare rows with honest truncation notes;
progress only while real work runs.

## Accessibility verification

Semantic controls, keyboard focus on detail/back/confirm, visible focus styles,
text badges (not color-only), chart `aria-label` + SR summary, confirm dialog
before remove, reduced-motion respected on bar fills, meaningful empty states.

---

## Tests added

`automation/test-scenes-portfolio-health.mjs` — **96 passed**  
Covers concentration, underrepresentation, repetition, metadata, purpose
alignment (8 purposes), strength, opportunities, insight model, comparison,
interface surface, banned score/judgment language.

Capture: `automation/capture-scenes-portfolio-health.mjs` — desktop/tablet/phone
screenshots; no score ring; no horizontal overflow; no console errors.

## Complete test results

| Suite | Result |
|-------|--------|
| Portfolio Health | 96 passed |
| Portfolio Foundation | 52 passed |
| Portfolio Assistant | 94 passed |
| Portfolio Coach | 344 passed |
| Auto Portfolio Builder | 114 passed |
| Photo Library | 26 passed |
| Shoot Review | 41 passed |

## Regression results

Foundation / Assistant / Coach / Builder / Library / Shoot Review all green after
Health changes. No Dashboard/Sheds files touched.

---

## Desktop / tablet / mobile verification

Screenshots under [`docs/scenes/portfolio-health/`](./portfolio-health/):

| File | View |
|------|------|
| `01-desktop-scope.png` | Scope chooser |
| `02-desktop-overview.png` | Overview + insights |
| `03-desktop-insight.png` | Insight detail |
| `04-desktop-repetition.png` | Repetition detail |
| `05-desktop-compare.png` | Descriptive compare |
| `06-tablet-overview.png` | Tablet overview |
| `07-phone-scope.png` | Phone scope |
| `08-phone-overview.png` | Phone overview |
| `09-phone-insight.png` | Phone insight detail |

Capture summary recorded no overflow and no score-ring markup.

---

## Known limitations

1. Subject/season/location insights require real metadata — otherwise unavailable.  
2. Similarity is import-identity / metadata grouping — not perceptual hash.  
3. Camera/lens/focal usually null in current imports.  
4. GPS unused when absent (almost always).  
5. Soft Photo Coach grades remain assistive only.  
6. Multi-portfolio scope unions membership (does not invent cross-portfolio narrative).

## Analysis-size limits

- Portfolio images analyzed: ≤ **200** (truncate + note)  
- Library comparison pool: ≤ **2000** (truncate + note)

## Intentionally excluded features

Universal score/grade/RYG/stars/readiness; rankings; streaks; badges; industry
norms; auto portfolio mutation; external AI; books/calendars/journals/printing/
Living Scenes.

## Recommended next sprint

Owner choice among: perceptual near-duplicate hashing on device; richer EXIF at
import; books/calendars/journals printing paths; or Living Scenes — **not** a
health scoreboard.

---

## Diff-scope confirmation

Intentional Health product + docs + tests only. Operational noise
(`data/publish-state.json`, `data/health.json`, `data/live.json`, generated
`status.html` / `debug.html`) left **uncommitted**.

**Dashboard product files:** not modified.  
**Sheds product files:** not modified.

---

## Branch / SHAs / commit / push

| Item | Value |
|------|-------|
| Branch | `feature/scenes-portfolio-health` |
| Starting SHA | `8629ef168346f6066fad8bb21cfc79e3623c8062` |
| Sprint implementation commit | _(filled at commit)_ |
| Current branch tip | _(filled after push)_ |
| Commit message | `feat(scenes): add portfolio health insights` |
| Push | `git push -u origin feature/scenes-portfolio-health` |
| Merged | **No** |
| Deployed | **No** |

---

## Acceptance criteria (28)

1–8 capabilities delivered · 9–10 no score/ranking · 11 evidence model · 12–15
user controls + Coach/Builder bridges · 16 descriptive compare · 17 honest
insufficient data · 18–21 desktop/tablet/mobile/a11y verified via capture ·
22–23 regressions + new tests pass · 24 commit+push · 25–26 not merged/deployed ·
27–28 Dashboard/Sheds absent from diff.
