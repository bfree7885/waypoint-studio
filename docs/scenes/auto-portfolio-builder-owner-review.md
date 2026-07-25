# Scenes Auto Portfolio Builder — Owner Review

**Date:** 2026-07-25  
**Branch:** `feature/scenes-auto-portfolio-builder`  
**Cut from:** `feature/scenes-portfolio-coach`  
**Starting SHA:** `86ca1bf5d8f87c748c4db8c3d7a19bb172a07f27` (coach publish tip after docs stamp `353f4a8`; later than brief’s “near 353f4a8” as expected)  
**Implementation commit:** *(this sprint’s `feat(scenes): add explainable auto portfolio builder`)*  
**Final SHA:** branch tip after commit (see `git log -1`; publish commits may advance tip later)  
**Base coach implementation:** `ef7ed25` · **Base assistant tip:** `714d7ce` · **Base foundation (meaningful):** `87fbd76`  
**Deployment status:** **Not deployed** · **Not merged**  
**Dashboard / Sheds:** **Untouched** (no Dashboard or Sheds product files in diff)

---

## Executive summary

Portfolio Foundation stores purpose sets; Assistant recommends candidates; Coach
explains pairs. This sprint adds **Auto Portfolio Builder**: an explainable
**suggested first draft** from a real photograph group — selection, variety,
roles, proposed sequence, alternatives, and explicit save/rebuild — using only
on-device signals the repo already produces. The system builds a draft; the
photographer edits and approves. No external AI, no uploads, no aesthetic
certainty, no silent publish/replace, no score-chase UX.

Prior owner-review and signal-audit docs for Foundation, Assistant, and Coach
are preserved unchanged.

---

## Starting state / branch verification

```text
git fetch origin --prune
git switch feature/scenes-portfolio-coach
# local already matched origin @ 86ca1bf (publish tip)
git switch -c feature/scenes-auto-portfolio-builder
```

- Working tree carried only operational noise (`data/publish-state.json`) — left
  uncommitted per playbook.
- Confirmed branch contains Foundation + Assistant + Coach modules and docs.
- Fetch briefly failed once under sandbox; succeeded with unrestricted network.
  Local coach tip already matched `origin/feature/scenes-portfolio-coach`.

---

## Product principle honored

Calm photography language only: Suggested draft / Proposed sequence / Strong
opening candidate / Adds useful variety / Similar to another selection /
Possible supporting image / Alternative choice / Lower-confidence placement /
Review recommended. Banned definitive / scored portfolio language is absent and
asserted in tests.

---

## Phase 1 — Signal audit

Full inventory: [`docs/scenes/auto-portfolio-builder-signal-audit.md`](./auto-portfolio-builder-signal-audit.md).

**Used:** favorites, Keep/Maybe/Reject, ratings, soft Photo Coach grades when
analyzed, Assistant categories/groups/decisions, Coach keep-both/roles as
constraints, capture timing/month, fingerprints, filename+size, aspect/
orientation/resolution, tags when present, media completeness, portfolio
membership/order/cover/purpose, builder purpose enum + size guide, explicit
builder decisions (include/exclude/pins/cover/opening/closing/roles/swaps).

**Excluded (honestly):** pixel sharpness/exposure/subject separation, perceptual
hashing, GPS, shoot-store `styleSignals`, ML aesthetics, Portfolio Health,
invented competition/calendar rules.

---

## What was built

| Capability | Behavior |
|------------|----------|
| Source choose | Library, collection, shoot (via library linkage), portfolio rebuild, candidate-review session, selected ids |
| Purpose | 8 explainable purposes with soft priorities + honest limitation notes |
| Size guide | Small 6–10 / Medium 12–20 / Large 24–40 / Custom — guides, does not hard-break |
| Limitations panel | Shown before generate and on draft |
| Generate draft | Deterministic pipeline → selection + roles + sequence + explanations |
| Review selection | Per-image reasons, confidence, roles, exclude / cover / opening / closing |
| Omitted inspectable | Similarity collapses + size-trim with include-anyway |
| Sequence | Proposed order; drag (desktop); Move up/down (keyboard/mobile); pin; apply/undo; regenerate unpinned |
| Alternatives | Cover / opening / closing / similarity omissions / low-confidence — swap persists |
| Regeneration | Regenerate remaining (keeps decisions) vs rebuild (confirm); optional full reset confirm |
| Save new | Title, description, purpose, order, cover, roles/explanations as rationales |
| Rebuild existing | Diff preview (add/remove/order/cover); confirm required; cancel path |
| Empty / thin sources | Honest empty; never invent photographs |

**Route:** `/apps/scenes/portfolio/builder.html`  
Linked from Portfolios index toolbar.

---

## Architecture (separated, testable without UI)

```
source normalize     assistant-signals.js (extended: candidate-session, selected)
  → signals          assistant-signals.js + assistant-recommend.js (groups/categories)
  → catalog          builder-catalog.js (purposes, sizes, roles, banned language)
  → draft engine     builder-engine.js (ANALYSIS_VERSION 1.0.0)
       eligibility → user constraints → weighting → similarity → diversity
       → roles → sequencing → explanations → alternatives
  → persistence      builder-session.js (waypoint-scenes-portfolio-builder-sessions-v1)
  → presentation     builder-ui.js + builder.html + scenes-portfolio-builder.css
```

Pipeline stages are pure functions inside `buildDraft` — unit-tested via Node/vm
without DOM.

---

## Files added / changed

**Added:**
- `apps/scenes/portfolio/builder.html`
- `apps/scenes/portfolio/css/scenes-portfolio-builder.css`
- `apps/scenes/portfolio/js/builder-catalog.js`
- `apps/scenes/portfolio/js/builder-engine.js`
- `apps/scenes/portfolio/js/builder-session.js`
- `apps/scenes/portfolio/js/builder-ui.js`
- `apps/scenes/portfolio/js/builder-boot.js`
- `automation/test-scenes-auto-portfolio-builder.mjs`
- `automation/capture-scenes-auto-portfolio-builder.mjs`
- `docs/scenes/auto-portfolio-builder-signal-audit.md`
- `docs/scenes/auto-portfolio-builder-owner-review.md` (this file)
- `docs/scenes/auto-portfolio-builder/*.png`

**Changed:**
- `apps/scenes/portfolio/index.html` — Builder entry link
- `apps/scenes/portfolio/js/assistant-signals.js` — candidate-session + selected sources
- `apps/scenes/portfolio/js/portfolio-engine.js` — createPortfolio accepts items/rationales
- `automation/smoke-browser.mjs` — builder smoke route
- `apps/scenes/docs/ARCHITECTURE.md` — Assistant/Coach/Builder note
- `docs/ENGINEERING-PLAYBOOK.md` — Lessons Learned

**Preserved (not modified):**
- `docs/scenes/portfolio-*-signal-audit.md` / `*-owner-review.md` for foundation/assistant/coach
- Dashboard / Sheds product trees

**Uncommitted (intentional):** `data/publish-state.json` operational noise

---

## Tests

```bash
node automation/test-scenes-auto-portfolio-builder.mjs   # 114 assertions — PASS
node automation/test-scenes-portfolio.mjs                # 52 — PASS
node automation/test-scenes-portfolio-assistant.mjs      # 94 — PASS
node automation/test-scenes-portfolio-coach.mjs          # 344 — PASS
node automation/test-photo-library.mjs                   # 26 — PASS
node automation/test-photo-coach-shoot-review.mjs        # 41 — PASS
```

Coverage: selection, diversity, roles, sequencing, alternatives/swaps,
persistence, saving + rebuild diff, empty/edge, banned language, interface/a11y
surface, prior docs preserved, source extensions.

### Headless page verification

`node automation/capture-scenes-auto-portfolio-builder.mjs`:
- **0 console errors**
- Desktop: setup (8 purposes), selection (9 cards), sequence (move/pin),
  alternatives, save
- Phone: selection tabs + sequence move controls; **no horizontal overflow**
- Screenshots under `docs/scenes/auto-portfolio-builder/`

---

## Screenshots

| File | View |
|------|------|
| `01-desktop-setup.png` | Desktop — source / purpose / size / limitations |
| `02-desktop-selection.png` | Desktop — suggested draft selection |
| `03-desktop-sequence.png` | Desktop — proposed sequence + reorder |
| `04-desktop-alternatives.png` | Desktop — alternatives |
| `05-desktop-save.png` | Desktop — save panel |
| `06-phone-selection.png` | Phone — selection |
| `07-phone-sequence.png` | Phone — sequence with Move up/down |
| `08-phone-save.png` | Phone — save |

> Screenshots use SVG placeholder thumbnails seeded for review only. Production
> never seeds fake photographs.

---

## Accessibility & mobile

- Tablist / tab / tabpanel pattern for Selection · Sequence · Alternatives · Save  
- `:focus-visible` on controls; skip link to main  
- Confidence via text + dots (never color alone)  
- `[hidden] { display: none !important }`  
- `prefers-reduced-motion` honored  
- Mobile non-drag reorder via Move up / Move down; pins available  
- No fake AI animations  

---

## Privacy

- Local only. No new network calls, no third-party AI, no upload.  
- Builder store holds ids + derived text + decisions — never blobs.  
- Originals never deleted/altered; portfolio changes only on explicit Save /
  confirmed rebuild.

---

## Empty / edge states handled

Empty library · empty source · source smaller than size guide · very large
source (consider-cap with honesty note) · Reject labels · forced include ·
user cover · pins · keep-both · thin metadata · missing dates for calendar
purpose · competition without invented rules · cancelled rebuild · missing
target portfolio.

---

## Acceptance checklist (28)

1. [x] Signal audit documenting real, usable, excluded signals + limitations  
2. [x] Real workflow in Scenes Portfolio area (`builder.html`)  
3. [x] Real sources only (library / collection / shoot / portfolio / candidate session / selected)  
4. [x] Purpose selection with explainable soft influence  
5. [x] Size guide (small/medium/large/custom) without hard-breaking UI  
6. [x] Separated, versioned, UI-free selection engine pipeline  
7. [x] User decisions outrank recommendations (include/exclude/cover/pins/roles/swaps)  
8. [x] Similarity / repetition limited with inspectable omissions + alternatives  
9. [x] Diversity balancing where metadata exists; transparent when absent  
10. [x] Roles assigned softly; multi-role; user overrides authoritative  
11. [x] Deterministic explainable sequencing (no emotional-story claims)  
12. [x] Sequence controls: drag + keyboard/mobile reorder, pin, opening/closing/cover, apply/undo, regenerate unpinned  
13. [x] Every included image has concise evidence-based reasons  
14. [x] Omitted high-ranking / similar frames inspectable  
15. [x] Alternatives for cover/opening/closing/similarity/low-confidence; swaps persist  
16. [x] Builder session persistence (purpose, size, selection, order, roles, alts, omissions, swaps, pins, cover, history)  
17. [x] Regeneration preserves decisions; rebuild/reset confirm before discard  
18. [x] Save as new portfolio with name/description/purpose/order/cover/rationales  
19. [x] Rebuild existing with preview + approval + cancel; never silent replace  
20. [x] Empty/edge honesty; never invent photographs  
21. [x] Privacy local-only; no new third-party AI/upload  
22. [x] Performance: thumbnails only; consider-cap for large sources; non-blocking shell  
23. [x] Photograph-first Scenes language; banned certainty/score copy absent  
24. [x] Desktop + tablet-friendly layout; mobile-native tabs + non-drag reorder  
25. [x] Accessibility (tabs, focus, live status, reduced motion, hidden override)  
26. [x] Automated tests + capture script; Foundation/Assistant/Coach/Library/Shoot regressions green  
27. [x] Docs + screenshots; prior audits/reviews preserved  
28. [x] Committed + pushed on feature branch; **not merged · not deployed**; Dashboard/Sheds untouched  

---

## Regression check

| Suite | Result |
|-------|--------|
| Auto Portfolio Builder | 114 PASS |
| Portfolio Foundation | 52 PASS |
| Portfolio Assistant | 94 PASS |
| Portfolio Coach | 344 PASS |
| Photo Library | 26 PASS |
| Shoot Review | 41 PASS |

Diff scoped to Scenes portfolio builder + small assistant-signals / portfolio-engine /
smoke / architecture / playbook — **no Dashboard/Sheds product files**.

---

## Known limitations

- No pixel sharpness/exposure/subject-separation analysis.  
- Similarity remains metadata-based (fingerprint / name+size / burst / framing).  
- Purpose alignment is enum priorities + weak keyword context only.  
- Calendar month diversity only when capture dates exist.  
- Competition shortlist does not encode contest rules.  
- Consider-cap (240) for very large sources is transparent, not a secret cull.

---

## Deferred (explicitly not this sprint)

Portfolio Health · books · calendars · journals · printing · website publishing ·
Living Scenes · perceptual hashing · on-device EXIF enrichment · Dashboard/Sheds
changes · cloud sync · social share · score-chase gamification.

---

## Git / deploy confirmation

- Branch: `feature/scenes-auto-portfolio-builder`  
- Starting SHA: `86ca1bf`  
- Implementation commit: see `git log` for `feat(scenes): add explainable auto portfolio builder`  
- Tip SHA: may advance if publish bots land `[skip ci]` commits — record tip separately from implementation SHA  
- **Not merged** to `main` or coach/assistant/foundation branches  
- **Not deployed**  
- Dashboard and Sheds product files were not modified  
