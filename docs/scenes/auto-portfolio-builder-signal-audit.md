# Scenes Auto Portfolio Builder — Signal Audit

**Date:** 2026-07-25  
**Branch:** `feature/scenes-auto-portfolio-builder`  
**Cut from:** `feature/scenes-portfolio-coach` @ `86ca1bf` (publish tip after coach docs stamp `353f4a8`)  
**Base assistant tip:** `714d7ce` · **Base foundation (meaningful):** `87fbd76`  
**Scope:** Explainable first-draft Auto Portfolio Builder.  
**Not in scope:** Portfolio Health · books · calendars · journals · printing · website publishing · Living Scenes · Dashboard · Sheds.

---

## Purpose of this audit

Before writing selection, diversity, sequencing, or cover logic, this document
inventories signals Waypoint Scenes **actually produces today** that can support
a coherent **suggested draft** portfolio. Every inclusion reason, omission
reason, role hint, and sequence choice must trace to a signal listed here.

Guiding product principle: **the system builds a draft; the photographer edits
and approves.** Language stays observational (Suggested draft / Proposed
sequence / Strong opening candidate / Adds useful variety / Similar to another
selection / Possible supporting image / Alternative choice / Lower-confidence
placement / Review recommended). Banned: Perfect portfolio / Best possible /
Guaranteed professional / Objective winner / Final portfolio / AI-certified /
Portfolio score: N.

Inherited audits remain authoritative for field-level honesty:

- [`portfolio-assistant-signal-audit.md`](./portfolio-assistant-signal-audit.md)
- [`portfolio-coach-signal-audit.md`](./portfolio-coach-signal-audit.md)

---

## 1. Sources inspected

| Area | Location | Relevant to Builder? |
|------|----------|----------------------|
| Portfolio model | `portfolio-models.js` / `waypoint-scenes-portfolios-v1` | Yes — purpose, order, cover, items, notes; save target |
| Portfolio purpose / description / notes | Portfolio fields | Yes — soft purpose keyword overlap; never invent rules |
| Ordering + cover | `imageIds`, `coverImageId` | Yes — rebuild diffs; never silent replace of user cover |
| Portfolio Assistant | `assistant-*.js`, candidate sessions | Yes — categories, groups, user decisions as priors |
| Portfolio Coach | `coach-*.js` | Soft — prefer/keep-both/roles/notes as user-decision constraints |
| Photo Library | `LibraryImage` via `assistant-signals.js` | Yes — primary SoT |
| EXIF / camera | `camera.*` | Bonus only when present (usually null) |
| Similarity | fingerprint, filename+size, burst, aspect+month | Yes — repetition reduction |
| Overrides / roles / notes | Assistant decisions + Coach store + builder session | Yes — authoritative user decisions |
| Pixel sharpness / ML aesthetics | — | **None on LibraryImage** |
| Portfolio Health | `health: null` | **Unused** — Health sprint not started |

---

## 2. Selection signals (include / weight / exclude)

| Signal | Source | Legitimate use | Cannot claim |
|--------|--------|----------------|--------------|
| Favorite | `favorite` | Soft priority for inclusion / hero | Aesthetic superiority |
| Keep / Maybe / Reject | `selectionLabel` | Keep prioritized; Reject stays out unless user re-includes | Composition correctness |
| Private rating | `rating` 1–5 | Relative preference weight | Objective quality score |
| Coach letter / score | `moduleRefs.photoCoach` when `analyzed` | Soft assistive weight only | Ranking / “professional” |
| Assistant category | session recommendations | Strong → candidate weight; Needs review → lower confidence | Override of user exclude |
| Assistant / Coach decisions | preferred, excluded, keep-both, roles | **Authoritative constraints** | Silent discard of decisions |
| Media completeness | thumb / original flags | Prefer frames with visible media; flag missing | Image quality |
| Capture date | `captureDate` | Chronology, season/month buckets when present | Emotional narrative without data |
| Dimensions / orientation | width/height/aspect | Cover suitability, orientation rhythm | Sharpness |
| Tags / subjectHints | arrays when present | Weak diversity / purpose keyword overlap | Scene understanding if empty |
| Purpose text | portfolio / builder purpose id + keywords | Soft weighting for website/gallery/calendar/etc. | Invented competition rules |

**Eligibility defaults:** Reject-labeled frames are ineligible unless the user
explicitly includes them. Missing-media frames may be selected only with
**Review recommended** + honest explanation. Empty source → honest empty draft.

---

## 3. Diversity signals

| Axis | Available today? | How used | Honesty when absent |
|------|------------------|----------|---------------------|
| Subject / tags | Sparse `tags` / `subjectHints` | Soft bucket balancing | State “subject tags unavailable” |
| Category (Assistant) | Yes in session-sourced builds | Prefer mix of strong + supporting | Transparent when all Needs review |
| Season / month | From `captureDate` when present | Month-bucket spacing | “Capture dates missing — seasonal balance unavailable” |
| Date / chronology | `captureDate` | Sequence + spacing | Chronology skipped when null |
| Location / GPS | Almost always null | **Not used** | Never invent places |
| Orientation | aspect bucket | Rhythm in sequence + diversity | Honest when dimensions missing |
| Framing (aspect+month) | Weak similarity groups | Limit near-identical framing clusters | Metadata-only similarity |
| Roles | Builder-assigned + user overrides | Ensure opening/supporting/closing coverage when evidence allows | Don’t force unsupported roles |
| Lighting | Not on LibraryImage | **Not used** | Never claim lighting variety |
| Chronology gaps | captureTime deltas | Soft “breathing room” in sequence | Only when times exist |

No artificial exclusion of a stronger candidate without an inspectable reason
(similarity collapse, purpose fit, size target, or user constraint).

---

## 4. Sequencing signals

| Signal | Use |
|--------|-----|
| Capture chronology | Default soft spine when ≥2 dated frames |
| Subject / tag progression | Soft adjacency avoidance when tags exist |
| Similarity spacing | No consecutive near-duplicates from same group |
| Orientation rhythm | Alternate landscape/portrait when both exist |
| Wide → detail | Landscape / higher-res early; portrait / tighter later — **soft hint only** |
| Roles | Opening early, hero early-mid, supporting mid, environmental/detail mid, closing late |
| Purpose priorities | e.g. website favors strong opening + cover; book favors chronology + transitions |
| Pinned positions | User pins / opening / closing / cover **never auto-moved** |

**Never claimed:** emotional-story understanding, guaranteed narrative arc, or
“perfect sequence.” Sequence is a **proposed sequence** the user can apply,
undo, or edit.

---

## 5. Cover / opening signals

| Signal | Cover / opening use |
|--------|---------------------|
| Landscape + resolution | Soft “cover / opening candidate” |
| Favorite / Keep / high rating | Soft priority |
| Assistant strong-candidate | Soft priority |
| Existing user cover | **Authoritative** — not silently replaced on regenerate |
| Purpose = photography website / gallery | Slightly prefer orientation/resolution when present |
| Missing dimensions | Lower-confidence placement; review recommended |

---

## 6. Purpose signals (explainable influence)

Purposes are product enums with **documented weight priorities**, not invented
competition rules or seasonal calendars when metadata is absent:

| Purpose id | Priorities (soft) | Honest limitation |
|------------|-------------------|-------------------|
| `general` | Balance strong + variety + sequence | Default; no special claims |
| `photography-website` | Strong opening, cover, limited repetition | No web layout engine |
| `gallery-presentation` | Impact early, orientation rhythm, breathing room | No wall-hanging physics |
| `calendar-image-set` | Month diversity when dates exist; even count bias | **No months invented** if dates missing |
| `book-visual-story` | Chronology, transitions, supporting/detail roles | No claim of story understanding |
| `competition-shortlist` | Prefer Keep/favorite/strong; tighter size | **No invented contest rules** |
| `wall-print-collection` | Resolution soft weight; fewer near-duplicates | Sharpness unknown |
| `hiking-outdoor-journal` | Chronology + environmental tags when present | GPS unused (null) |

---

## 7. Known limitations

1. No pixel sharpness, exposure, noise, subject separation, or background distraction.  
2. Similarity is import-identity / burst / framing metadata — not perceptual hash.  
3. Camera EXIF usually null; never a hard driver.  
4. GPS unused.  
5. Shoot-store `styleSignals` not bridged (incompatible SoT).  
6. Purpose alignment is keyword + enum priorities only.  
7. Portfolio Health unused.  
8. Large libraries: analysis is O(n) with bucketed similarity; UI never blocks on full-res decode.

---

## 8. Missing metadata (honest behavior)

| Missing | Builder behavior |
|---------|------------------|
| No ratings / labels / coach | Draft still possible from variety + chronology; many **Review recommended** reasons |
| No capture dates | Skip seasonal / chronological claims; say so in limitations panel |
| No dimensions | Skip orientation rhythm / resolution cover boost |
| No tags | Skip subject diversity claims |
| Empty source | Empty state; never seed fake photos |
| Source smaller than target size | Guide: draft uses all eligible; explain shortfall |
| Source very large | Cap consideration with transparent note; thumbnails only |

---

## 9. Authoritative user decisions (outrank recommendations)

| Decision | Rule |
|----------|------|
| Preferred / forced include | Always eligible and prioritized |
| Excluded | Stay excluded across regenerate unless user clears |
| User-set cover | Not silently replaced |
| Pinned sequence positions | Preserved on regenerate-remaining |
| Manual opening / closing marks | Authoritative |
| Manual roles | Authoritative; multi-role ok |
| Keep-both (Coach) | Not auto-collapsed unless user permits |
| Swaps from alternatives | Persist through regeneration |
| Overrides / notes | Survive regenerate; rebuild-from-scratch confirms first |

---

## 10. Signals USED this sprint

1. User intent: favorite, selectionLabel, rating  
2. Soft Photo Coach letter/score when analyzed  
3. Assistant categories / groups / decisions when session-sourced  
4. Coach prefer / keep-both / roles when present as constraints  
5. Similarity: fingerprint, filename+size, burst window, aspect+month  
6. Dimensions / orientation / resolution  
7. Capture time / month when present  
8. Tags / subjectHints when present  
9. Media completeness  
10. Portfolio membership, order, cover, purpose (for rebuild + keyword soft fit)  
11. Builder purpose enum + target size  
12. Explicit builder decisions: include/exclude, pins, cover, opening/closing, roles, swaps  

---

## 11. Signals EXCLUDED this sprint

| Excluded | Why |
|----------|-----|
| Pixel sharpness / exposure / subject separation | Not on LibraryImage |
| Perceptual hashing | Not computed |
| GPS clustering | Almost always null |
| Direct shoot-store styleSignals | Incompatible SoT |
| Face / aesthetic ML / external AI | Privacy + forbidden |
| Portfolio Health analytics | Reserved null; separate sprint |
| Invented competition / calendar month rules | No data |
| Score-chase “Portfolio score: 97” UX | Product ban |

---

## 12. Privacy

- Local only (`localStorage` / IndexedDB already on device).  
- No new network calls, no third-party AI, no photo upload.  
- Builder sessions store ids, derived explanations, decisions — **never blobs**.  
- Originals never deleted or altered.  
- Saving to a portfolio only on explicit user action (new or approved rebuild).

---

## 13. Performance

| Risk | Mitigation |
|------|------------|
| Large library (≤2000) | Bucketed similarity; O(n) weighting; optional consider-cap with honesty note |
| Full-res decode | Never required — thumbnails only |
| UI freeze | Pure sync engine; shell interactive; progress only while real work runs |
| Recompute thrash | Versioned draft + signal signature; reuse when unchanged |
| Unnecessary loads | Source resolution uses library index metadata only |

**Realistic source-size guidance:** Small drafts (6–10) are comfortable on typical
session sources. Medium (12–20) fine for collections/shoots. Large (24–40)
works from library/collections; very large libraries may consider a transparent
candidate pool cap (e.g. strongest + diverse subset) rather than blocking the UI.

---

## 14. Repetition / score-chase bias risks

| Risk | Safeguard |
|------|-----------|
| Selecting only high coach scores / ratings | Diversity + similarity reduction + purpose variety; supporting/detail roles; explanations cite soft signals only |
| Collapsing intentional pairs | Keep-both / pin / user include preserve pairs; intentional repetition flag |
| Silent omission of strong near-dupes | Omitted high-rank list with reason + alternatives |
| Treating fingerprint identity as “worse” | Explain sameness; pick one with reason; expose alternative |
| Cover always = highest score | Cover uses orientation/resolution soft hints + user cover authority |
| Fake aesthetic certainty | Banned language asserts; confidence qualitative |

---

## 15. Honesty checklist

- [x] No invented analysis signals  
- [x] No external AI / upload  
- [x] User decisions outrank draft logic  
- [x] Missing metadata → transparent limitations, not fabrication  
- [x] Draft language only — never “final” / “perfect” / scored portfolio  
- [x] Originals untouched; no silent publish/replace  
- [x] Prior owner-review and signal-audit docs preserved  
- [x] Dashboard / Sheds / Health / Living Scenes out of scope  

---

## 16. Future opportunities (documented, not built)

- On-device dHash for perceptual near-duplicates  
- Library-side styleSignals at import  
- Richer EXIF at import  
- Shoot-store bridge when session is shoot-sourced  
- Portfolio Health observational diagnostics (separate sprint)  
