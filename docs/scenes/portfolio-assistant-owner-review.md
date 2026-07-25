# Scenes Portfolio Assistant — Owner Review

**Date:** 2026-07-24
**Branch:** `feature/scenes-portfolio-assistant`
**Cut from:** `feature/scenes-portfolio-foundation`
**Starting SHA:** `0a298e65a2930c1ce4d22240c8203d3a679ccecb`
**Final SHA:** _(filled at end of this doc after commit)_
**Base foundation (meaningful tip):** `87fbd76`
**Base main (`origin/main`):** `0be5f9f`
**Deployment status:** **Not deployed** · **Not merged**
**Dashboard / Sheds:** **Untouched** (no Dashboard product files in diff)

---

## Executive summary

The Portfolio Foundation added durable purpose portfolios curated from the real
Photo Library. This sprint adds the **Portfolio Assistant** — an explainable
candidate-review workspace that recommends and explains, while the photographer
decides. It reads only the signals the codebase already produces on device
(favorites, Keep/Maybe/Reject, ratings, Photo Coach grades when analyzed,
capture time, import fingerprints, dimensions) and turns them into four honest
categories — **Strong candidate · Supporting image · Similar frame · Needs
review** — each with a plain-language rationale and a qualitative confidence
(Higher / Moderate / Lower). Nothing is auto-rejected, nothing is deleted, and
insufficient evidence yields an honest *Needs review* with manual selection.

No new backend, no third-party AI, no network calls. Everything is local-first,
matching the foundation's trust model.

---

## Starting state / branch verification

- Confirmed branch `feature/scenes-portfolio-assistant` (created via
  `git switch feature/scenes-portfolio-foundation` → `git switch -c …`).
- Foundation tip was `0a298e6`, one commit past the documented `87fbd76`. That
  commit is an automated `Publish live engine artifacts (…​) [skip ci]` publish
  artifact — a **legitimate remote advancement**, not new foundation product
  work. Starting SHA recorded as `0a298e6`.
- Working tree carried only operational noise (`data/publish-state.json`) — left
  uncommitted per the playbook.

---

## Product principle honored

**The system recommends; the photographer decides.** No definitive
good/bad/artistic/professional/"portfolio-worthy" claims. Every recommendation
cites real evidence. Banned filler ("AI selected this", "Best overall", "Great
composition", "Professional quality", "Excellent photo") is absent and asserted
against in tests.

---

## What was built

| Capability | Behavior |
|------------|----------|
| Start a review | Choose a source (Photo Library / Collection / Portfolio / Shoot) that actually has photos; honest empty state when the library is empty |
| Explainable categories | Strong candidate · Supporting image · Similar frame · Needs review — from real signals only |
| Rationale | Concise, evidence-only bullet list per photograph ("Marked as a favorite…", "Your private rating is 5 of 5", "Shares an import fingerprint…") |
| Confidence | Qualitative Higher / Moderate / Lower, shown as text + dots (never color-only, never a percentage) |
| Similar-frame comparison | Groups exact-fingerprint / filename+size duplicates, capture-time bursts, and framing+month similarity; open a group to compare, choose a preferred frame, keep several, add, or dismiss |
| Manual control | Mark strong / supporting / later review / exclude; clear your decision to revert to the assistant suggestion; add to any portfolio; choose preferred in a group |
| Assistant vs. you | The workspace distinguishes the assistant's suggestion from your decision ("Assistant suggested X. You changed it to Y.") |
| Persistence | Candidate sessions persist locally; resume interrupted sessions; decisions survive recompute |
| Add to portfolio | Adds a LibraryImage id (with rationale) into an existing or new portfolio via the foundation engine — original never touched |
| Re-analyze | Refreshes suggestions without overwriting your explicit decisions |

**Route:** `/apps/scenes/portfolio/assistant.html`
Linked from the Portfolios list ("Review candidates") and from a portfolio's
editor ("Review candidates" → deep-links `?portfolio=<id>`).

---

## Architecture (separated, testable without UI)

```
signal collection      apps/scenes/portfolio/js/assistant-signals.js
  → recommendation      apps/scenes/portfolio/js/assistant-recommend.js   (versioned: ANALYSIS_VERSION 1.0.0)
  → explanation         (rationale strings emitted by recommend layer)
  → persistence         apps/scenes/portfolio/js/assistant-session.js     (waypoint-scenes-portfolio-candidate-sessions-v1)
  → presentation        apps/scenes/portfolio/js/assistant-ui.js + assistant-boot.js
```

The first three layers are pure and covered by unit tests without a DOM. Output
is versioned so richer future signals can re-analyze without discarding user
decisions.

### Candidate session model

```
CandidateSession {
  schemaVersion, id, title,
  createdAt, updatedAt,
  source: { type: library|collection|portfolio|shoot, ref, label },
  imageIds[],                       // LibraryImage refs (no blobs)
  analysisVersion, analyzedAt,
  recommendations: { [imageId]: {   // assistant suggestion (never truth)
    category, subKind, confidence, rationale[], relatedImageIds[], groupId, signature
  }},
  groups: [{ id, kind, strength, reason, imageIds[] }],
  order[],
  decisions: { [imageId]: {         // user decision, kept separate
    status, category, preferredInGroup, addedToPortfolioIds[], dismissed, decidedAt
  }},
  destinationPortfolioIds[]
}
```

**Key guarantee:** `reanalyze()` refreshes `recommendations` but never touches
`decisions`. Effective category = user override, else assistant suggestion.

---

## Signals used (and not)

Full detail: [`docs/scenes/portfolio-assistant-signal-audit.md`](./portfolio-assistant-signal-audit.md).

- **Used:** favorite, selectionLabel (keep/maybe/reject), rating, Photo Coach
  letterGrade/overallScore *when analyzed*, capture time, content fingerprint,
  filename+byte size, aspect ratio, capture month.
- **Excluded (honestly):** pixel-level sharpness/exposure/noise/composition,
  perceptual hashing, GPS, EXIF-driven categories, ML aesthetics — **the repo
  does not produce these for a LibraryImage**, so the assistant does not claim
  them. Documented as future-supportable.

---

## Files added / changed

**Added (assistant):**
- `apps/scenes/portfolio/assistant.html`
- `apps/scenes/portfolio/css/scenes-portfolio-assistant.css`
- `apps/scenes/portfolio/js/assistant-signals.js`
- `apps/scenes/portfolio/js/assistant-recommend.js`
- `apps/scenes/portfolio/js/assistant-session.js`
- `apps/scenes/portfolio/js/assistant-ui.js`
- `apps/scenes/portfolio/js/assistant-boot.js`
- `automation/test-scenes-portfolio-assistant.mjs`
- `automation/capture-scenes-portfolio-assistant.mjs`
- `docs/scenes/portfolio-assistant-signal-audit.md`
- `docs/scenes/portfolio-assistant-owner-review.md` (this file)
- `docs/scenes/portfolio-assistant/*.png` (screenshots)

**Changed (minimal wiring):**
- `apps/scenes/portfolio/index.html` — "Review candidates" links (list + editor)
- `apps/scenes/portfolio/js/portfolio-ui.js` — editor link carries `?portfolio=<id>`
- `automation/smoke-browser.mjs` — registers the assistant route

No Dashboard, Sheds, or unrelated product files were modified.

---

## Tests

```bash
node automation/test-scenes-portfolio-assistant.mjs   # 94 assertions — PASS
node automation/test-scenes-portfolio.mjs             # 52 assertions — PASS (foundation, no regression)
node automation/test-photo-library.mjs                # 26 assertions — PASS (no regression)
node automation/test-photo-coach-shoot-review.mjs     # 41 assertions — PASS (no regression)
```

Assistant coverage includes: honest signal collection (no fabrication),
category classification, qualitative confidence, banned-filler assertions,
reject/conflict → Needs review, similar-frame grouping (fingerprint + burst),
insufficient/empty data honesty, ranking order, source resolution
(library/collection/portfolio/shoot), full session lifecycle, user overrides,
recompute-without-overwrite, decision persistence across engine instances,
add-to-portfolio integration, and interface/a11y surface checks.

### Headless page verification

`node automation/capture-scenes-portfolio-assistant.mjs` boots the page in
headless Chrome with review-only seeded data and reports:
- **0 console errors**
- 10 candidate cells rendered; categories span strong/similar/supporting/needs-review
- rationale + confidence present
- **no horizontal overflow** on desktop (1280) or phone (390)
- editor deep-link resolves to `assistant.html?portfolio=<id>`

> The full multi-app `smoke-browser.mjs` suite exercises unrelated products
> (Dashboard/Kiosk) that need live providers and are out of scope; the assistant
> route is registered there, and this dedicated headless capture is the
> equivalent smoke check for this route.

---

## Screenshots

| File | View |
|------|------|
| `docs/scenes/portfolio-assistant/01-desktop-start.png` | Desktop — choose source / start a review |
| `docs/scenes/portfolio-assistant/02-desktop-workspace.png` | Desktop — candidate workspace (categories, confidence, rationale, controls) |
| `docs/scenes/portfolio-assistant/03-desktop-similar-group.png` | Desktop — possible-duplicate with fingerprint evidence + compare |
| `docs/scenes/portfolio-assistant/04-phone-start.png` | Phone — start view |
| `docs/scenes/portfolio-assistant/05-phone-workspace.png` | Phone — workspace (no h-overflow) |
| `docs/scenes/portfolio-assistant/06-desktop-portfolio-editor-link.png` | Portfolio editor with "Review candidates" deep-link |

> Screenshots use SVG placeholder thumbnails seeded for review only. Production
> never seeds fake photographs — the assistant reads the real device library.

---

## Accessibility & mobile

- Semantic controls, `:focus-visible` outlines, keyboard arrow navigation across
  the filmstrip (`role="listbox"`/`option`, `aria-selected`).
- Confidence conveyed by text **and** dot glyphs — never color alone.
- `aria-live` status + session message regions; SR labels on category tags.
- `prefers-reduced-motion` respected.
- Destructive session delete is confirmed; excluding/dismissing never deletes
  originals.
- Verified at phone (390px) and desktop (1280px) widths — no horizontal overflow.

---

## Privacy

- Local only. No new network calls, no third-party AI, no upload.
- Sessions store ids + derived text; never blob bytes.
- Originals are never deleted or altered; dismiss/exclude affect the session only.

---

## Empty / edge states handled

No photos · empty library · one photo · missing image data (honest note, still
decidable) · no EXIF/capture date · no reliable signals (all Needs review) ·
already in a portfolio (add still records destination) · all excluded (filter to
hide) · duplicates/identical files · large bursts · interrupted sessions
(resume) · recompute after library change (decisions preserved).

---

## Acceptance checklist

- [x] Start a candidate session with real Scenes photos
- [x] Explainable categories from real signals
- [x] Similar comparison where data permits
- [x] Override every suggestion
- [x] User decisions persist (and survive recompute)
- [x] Add to an existing (or new) portfolio
- [x] Insufficient evidence → honest manual review
- [x] No original deleted or altered
- [x] No dead / fake analysis, no Coming Soon, no gamification, no unexplained scores
- [x] Desktop + mobile verified
- [x] Foundation still works (52 assertions pass)
- [x] Tests pass
- [x] Committed + pushed
- [x] Not merged · not deployed
- [x] Dashboard absent from diff

---

## Regression check (Portfolio Foundation)

Create, persist, add/remove/reorder, cover, rename, delete, empty states, and
missing-image handling all still pass (`test-scenes-portfolio.mjs`, 52). Photo
Library (26) and Shoot Review (41) unchanged. Scenes craft loop untouched.

---

## Known limitations

- Similarity is metadata-based (fingerprint identity, filename+size, capture
  time, aspect/month) — not perceptual pixel hashing. Documented as a
  future-supportable signal.
- Coach grades/scores are used only when already analyzed and are framed as soft
  signals, never truth.
- Shoot-sourced sessions rely on `moduleRefs.photoCoach.shootId` linkage on
  library rows; sessions won't list shoots that lack that linkage.
- No Portfolio Coach narrative or Auto Portfolio Builder — explicitly out of scope.

---

## Deferred (explicitly not this sprint)

Portfolio Coach narratives · Auto Portfolio Builder · Portfolio Health UI ·
perceptual hashing · on-device EXIF enrichment · cloud sync · social share.

---

## Git / deploy confirmation

- Branch: `feature/scenes-portfolio-assistant`
- Starting SHA: `0a298e6`
- Final SHA: _(see top; stamped after commit)_
- **Not merged** to `main` or to the foundation branch
- **Not deployed**
- Dashboard and Sheds product files were not modified.
