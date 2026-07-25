# Scenes Portfolio Coach — Signal Audit

**Date:** 2026-07-24
**Branch:** `feature/scenes-portfolio-coach`
**Cut from:** `feature/scenes-portfolio-assistant` @ `714d7ce`
**Base foundation:** `feature/scenes-portfolio-foundation` @ `87fbd76`
**Scope:** Comparative Portfolio Coach (mentor explanations between photographs).
**Not in scope:** Auto Portfolio Builder · Portfolio Health · Living Scenes · books · calendars · journals.

---

## Purpose of this audit

Before writing coaching logic, this document inventories signals the Waypoint Scenes
codebase **actually produces today** that can support *comparative* coaching —
side-by-side explanations that help a photographer decide between frames, roles, or
portfolio fit. Every coaching point must trace to a signal listed here. If a signal
is absent, the Coach must say **evidence is limited** and leave the decision to the
userographer. No fabricated visual analysis.

Guiding product principle: **Assistant recommends. Coach explains. User decides.**
Calm photography mentor voice. No objective art criticism, grades-as-product,
homework, quizzes, streaks, rankings, or achievement badges.

Inherited Assistant signal inventory remains authoritative for single-image
fields: [`portfolio-assistant-signal-audit.md`](./portfolio-assistant-signal-audit.md).
This audit focuses on what those signals (plus portfolio membership) can
legitimately support **in comparison**.

---

## 1. Sources inspected

| Area | Location | Relevant to Coach? |
|------|----------|--------------------|
| Assistant recommendations / rationales | `assistant-recommend.js` | Yes — categories, group membership, confidence as soft priors |
| Candidate sessions / overrides | `assistant-session.js` | Yes — preferred-in-group, user decisions, never overwritten |
| Similar / comparison groups | `assistant-recommend.js` `buildGroups` | Yes — primary entry into Coach |
| Photo Coach linkage | `LibraryImage.moduleRefs.photoCoach` | Soft only when `analysisStatus === "analyzed"` |
| Shoot Review styleSignals | `waypoint-photo-coach-shoots-v1` | **No direct read** — incompatible model; not on LibraryImage |
| EXIF / camera | `LibraryImage.camera.*` | Bonus metadata diffs when present (usually null) |
| Dimensions / orientation | `width`, `height`, `aspectRatio`, `orientation` | Yes — framing, cover suitability, variety |
| Capture sequence | `captureDate` + burst window | Yes — timing / burst coaching |
| Similarity | fingerprint, filename+size, aspect+month | Yes — repetition / near-duplicate |
| Quality heuristics (pixel) | — | **None on LibraryImage** |
| Portfolio contents / purpose / order | `waypoint-scenes-portfolios-v1` | Yes — fit, cover, sequence context |
| Tests / UI architecture | `automation/test-scenes-portfolio-assistant.mjs`, assistant UI | Patterns to extend, not replace |

---

## 2. Available coaching signals (and source)

### Per-image (from Assistant signal collection)

| Signal | Source field | Can support | Cannot support |
|--------|--------------|-------------|----------------|
| Favorite | `favorite` | Soft “you already valued this” in subject presentation / cover | Aesthetic quality, “better photo” |
| Selection label | `selectionLabel` keep/maybe/reject | Honest recount of prior review intent | Composition correctness |
| Private rating | `rating` 1–5 | Relative preference you already expressed | Objective score / professionalism |
| Coach letter / score | `moduleRefs.photoCoach` when analyzed | Soft assistive contrast between frames | Ranking, rejection authority |
| Capture time | `captureDate` | Burst timing, gesture-window tradeoffs | Which gesture is “correct” |
| Import fingerprint | `contentFingerprint` | Near-duplicate / same-file identity | Perceptual similarity of different files |
| Filename + byte size | `filename`, `byteSize` | Likely duplicate import | Visual distinction |
| Aspect / orientation | dimensions or `orientation` | Framing contrast, cover orientation, variety | Subject separation, negative space (unknown) |
| Resolution | `width` × `height` | Technical clarity for print/cover candidates | Sharpness or focus quality |
| Camera EXIF | `camera.*` | Metadata diffs when present | Exposure “correctness” without pixels |
| Tags / subject hints | `tags[]`, `subjectHints[]` | Weak environmental / subject variety notes | Scene understanding if empty |
| Media completeness | thumbnail / original flags | Missing-file honesty | Image quality |
| Assistant category / group | session recommendations | Entry context (“similar frame group”) | Overriding your decision |

### Portfolio-level

| Signal | Source | Can support | Cannot support |
|--------|--------|-------------|----------------|
| Membership | `portfolio.imageIds` | Already-in / both-in / neither-in | Health scores |
| Order | `imageIds` sequence | Consecutive near-duplicates, orientation runs | Auto-reorder “fixes” |
| Cover id | `coverImageId` | Cover suitability contrast vs current cover | Marketing-grade cover science |
| Purpose text | `purpose` | Soft alignment when tags/hints overlap purpose words | Semantic understanding of intent |
| Item notes / rationales | `items[].notes`, `selectionRationale` | Revisit prior reasons | Invented critique history |
| Health field | `health` | Reserved null — **unused** | Portfolio Health analytics |

---

## 3. What each comparison mode can / cannot claim

### Frame comparison

**Legitimate with current signals:** metadata diffs (dimensions, orientation, capture Δt, camera fields when present); user-intent diffs (favorite, keep/maybe/reject, rating); soft coach-grade diffs when both analyzed; duplicate / burst / framing-group membership; missing-media honesty.

**Not legitimate (excluded):** pixel sharpness, exposure histograms, subject separation, background distraction, compositional “rules,” gesture quality from pixels, “professional quality.”

### Portfolio-fit comparison

**Legitimate:** similarity to current selections via fingerprint / aspect+month buckets; orientation mix vs portfolio; season/month clustering when capture dates exist; repetition against portfolio members; cover orientation/resolution relative to portfolio purpose text (keyword overlap only); whether one/both already included.

**Not legitimate:** lighting variety without data; true wide/medium/close balance without reliable focal length; invented narrative arcs; Portfolio Health scores.

### Role comparison

**Legitimate soft role suggestions** grounded in signals: e.g. landscape + higher resolution → may suit cover/opening; tighter portrait orientation → may suit detail/supporting; favorite/keep → may suit hero; maybe/lower rating → may suit supporting; environmental tags → may suit establishing. Always framed as possibility. **Never force a winner.**

---

## 4. Bias / false-positive risks

| Risk | Mitigation |
|------|------------|
| Fingerprint duplicates treated as “better/worse” | Coach explains identity sameness; roles/fit only; no winner forced |
| Burst timing ≠ better gesture | Timing points say “different moment in a short window,” not which is correct |
| Coach grades treated as truth | Soft language + lower confidence on creative interpretation |
| Sparse EXIF over-interpreted | Camera/EXIF points only when both sides have values; else insufficient-evidence |
| Aspect “environment” inference | Creative, lower confidence: wider *may* carry more context — never asserted as fact |
| Ratings as quality | Cited as *your* prior preference, not objective merit |
| Purpose keyword match | Honest weak overlap only; no NLP claims |
| Large groups / sessions | Cap coaching points; progress only while real work runs |

---

## 5. Signals USED this sprint

1. User intent: favorite, selectionLabel, rating  
2. Soft Photo Coach letter/score when analyzed  
3. Similarity: fingerprint, filename+size, capture-time burst, aspect+month framing  
4. Dimensions / orientation / resolution  
5. Capture time deltas within groups  
6. Tags / subjectHints when present  
7. Media completeness (missing thumb/original)  
8. Portfolio membership, order, coverImageId, purpose text (keyword overlap)  
9. Assistant group membership + prior preferred-in-group decisions  

All coaching points cite evidence objects `{ signal, label, valueA, valueB }` so the UI can show *why*.

---

## 6. Signals EXCLUDED this sprint

| Excluded | Why |
|----------|-----|
| Pixel sharpness / exposure / noise / subject separation / background distraction | Not produced on `LibraryImage` |
| Perceptual hashing | Not computed |
| GPS clustering | Almost always null |
| Direct shoot-store `styleSignals` | Incompatible SoT; would invent a bridge |
| Face / aesthetic ML | Forbidden privacy + not on device |
| Portfolio Health analytics | Field reserved null; Health sprint not started |
| Definitive winner language | Product ban |

---

## 7. Future opportunities (documented, not built)

- On-device dHash for true near-duplicates  
- Library-side styleSignals (brightness/contrast) at import  
- Shoot-store bridge when session is shoot-sourced  
- Richer EXIF at import for technical variety  
- Learning history from personal notes (no lesson/quiz system)  
- Portfolio Health observational diagnostics (separate sprint)

---

## 8. Privacy

- Local only (`localStorage` / IndexedDB already on device).  
- No new network calls, no third-party AI, no upload.  
- Coach persistence stores ids, derived coaching text, notes, and decisions — never blobs.  
- Originals never deleted or altered; portfolio changes only on explicit user action.  
- Personal notes stay on device for future learning history without gamification.

---

## 9. Performance

| Risk | Mitigation |
|------|------------|
| Pairwise O(n²) over large sessions | Coach opens on an explicit pair or small group subset; generation is O(points) capped |
| Recompute thrash | Versioned output + signature of pair signals + portfolio stamp; reuse when unchanged |
| Full-res decode | Never required — thumbnails only |
| UI blocking | Pure sync generation on open; shell remains interactive; real progress only |

---

## 10. Honesty checklist

- [x] No pixel analysis claimed that LibraryImage cannot provide  
- [x] Creative points use cautious mentor language (“may,” “might,” “could serve”)  
- [x] Confidence qualitative (Higher / Moderate / Lower) — no fake %  
- [x] Insufficient evidence is a first-class category and empty state  
- [x] Roles never force a single winner  
- [x] No Dashboard / Sheds / Auto Builder / Portfolio Health scope creep  
