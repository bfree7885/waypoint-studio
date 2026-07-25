# Scenes Portfolio Health — Signal Audit

**Date:** 2026-07-25  
**Branch:** `feature/scenes-portfolio-health`  
**Cut from:** `feature/scenes-auto-portfolio-builder` @ `8629ef1` (publish tip after builder docs stamp `17e4049`)  
**Base builder implementation:** `09a2146` · **Base coach:** `ef7ed25` · **Base assistant tip:** `714d7ce` · **Base foundation (meaningful):** `87fbd76`  
**Scope:** Reflective body-of-work analysis (Portfolio Health).  
**Not in scope:** books · calendars · journals · printing · website publishing · Living Scenes · Dashboard · Sheds · universal scores · rankings · gamification.

---

## Purpose of this audit

Before writing concentration, underrepresentation, repetition, metadata, purpose
alignment, strength, or opportunity logic, this document inventories signals
Waypoint Scenes **actually produces today** that can support honest observations
about the *shape* of a photographer’s body of work. Every insight must trace to
a signal listed here. Missing data yields an unavailable / lower-confidence
state — never invented subjects, seasons, locations, or moods.

Guiding product principle: **describe patterns; never grade the photographer.**
Language stays observational (“leans heavily toward…”, “fewer images
representing…”, “this pattern may be intentional”, “opportunity, not a
requirement”). Banned: portfolio weak / score N / you must / you failed /
professional portfolios require / unbalanced as judgment.

Inherited audits remain authoritative for field-level honesty:

- [`portfolio-assistant-signal-audit.md`](./portfolio-assistant-signal-audit.md)
- [`portfolio-coach-signal-audit.md`](./portfolio-coach-signal-audit.md)
- [`auto-portfolio-builder-signal-audit.md`](./auto-portfolio-builder-signal-audit.md)

---

## 1. Available health-analysis signals

### Portfolio-level

| Signal | Source | Reliability | Can support | Cannot prove |
|--------|--------|-------------|-------------|--------------|
| Title / description / notes | `Portfolio` | High (user text) | Soft purpose keyword overlap | Semantic understanding of intent |
| Purpose text / purpose id | `purpose` or Builder purpose enum | High when set; often free text | Descriptive purpose alignment | Industry norms or contest rules |
| Ordered membership | `imageIds` | High | Count, order runs, consecutive similarity | Artistic narrative |
| Cover assignment | `coverImageId` | High when set | Cover vs orientation/resolution notes | Marketing-grade cover science |
| Per-item roles / rationales | `items[].selectionRationale`, Builder roles, Coach role overrides | Moderate — only when recorded | Role concentration / missing roles | That missing role = failure |
| Reserved `health` field | `Portfolio.health` | Was null; this sprint writes observational analysis refs only | Persistence hook | A numeric health score |
| Stale / missing refs | `imageIds` vs Library index | High | Metadata-health “missing file / stale id” | Photo quality |

### Assistant / Coach / Builder outputs

| Signal | Source | Reliability | Can support | Cannot prove |
|--------|--------|-------------|-------------|--------------|
| Assistant categories | candidate sessions | Moderate — soft priors | Strength patterns, review opportunities | Override of user taste |
| Assistant confidence | higher/moderate/lower | Qualitative only | Insight confidence when reused | Percentage certainty |
| User overrides / preferred / excluded | Assistant decisions | **Authoritative** | Respect exclusions; strength from preferences | Silent discard |
| Coach observations / evidence | Coach sessions | Soft comparative | Strength / tradeoff patterns | Objective winner |
| Personal coaching notes | Coach notes store | High (user text) | Strength / intention cues | Critique authority |
| Builder selections / omissions | Builder sessions | High for draft history | Why frames were included/omitted | That draft = final portfolio |
| Builder roles / explanations | Builder draft | Soft | Role distribution insights | Forced role completeness |
| Builder alternatives | Builder session | Soft | Repetition → Builder alternatives action | Auto-swap without approval |

### Per-image (LibraryImage via `assistant-signals.js`)

| Signal | Source field | Reliability | Can support | Cannot prove |
|--------|--------------|-------------|-------------|--------------|
| Favorite / Keep / Maybe / Reject | `favorite`, `selectionLabel` | High user intent | Strength patterns, eligibility context | Aesthetic superiority |
| Private rating | `rating` 1–5 | High; sparse | Relative preference concentration | Objective quality score |
| Photo Coach letter / score | `moduleRefs.photoCoach` when `analyzed` | Soft assistive | Soft strength contrast | Ranking / professionalism |
| Shoot membership | `moduleRefs.photoCoach.shootId` | Moderate when linked | Shoot concentration / underrepresentation vs library | Style without bridge to shoot store |
| Collection membership | `collectionIds[]` | High when used | Collection concentration | Completeness of organization |
| Capture date / time | `captureDate` | Often null | Season/month/time-of-day when present | Invented seasons |
| Season (derived) | month from `captureDate` | Only when date exists | Seasonal concentration / gaps vs library | Climate or mood |
| Orientation / dimensions | `width`, `height`, `aspectRatio`, `orientation` | Reliable for uploads; null for some migrated | Orientation mix, resolution soft notes | Sharpness / focus |
| Focal length / lens / camera | `camera.*` | **Usually null** | Usage patterns only when present | Technical mastery |
| Location / GPS | `gps.*` | Almost always null | Honest “location unavailable” | Place clustering |
| Subject / tags | `tags[]`, `subjectHints[]` | Sparse | Subject concentration when labels exist | Scene understanding if empty |
| Similarity / duplicate groups | fingerprint, filename+size, burst, aspect+month | Import-identity / metadata similarity | Repetition insights | Perceptual near-duplicates |
| Media completeness | thumb / original flags | High | Missing-media metadata health | Image quality |
| Import / update dates | `importDate`, `updatedAt` | System | Chronology of library activity only | Capture chronology when EXIF missing |

### Explicitly unavailable on LibraryImage today

Pixel sharpness, exposure histograms, noise, subject separation, background
distraction, perceptual hashing, face/aesthetic ML, shoot-store `styleSignals`
(incompatible SoT — not bridged).

---

## 2. Signals selected for this sprint

1. **Portfolio structure:** membership, order, cover, purpose text/id, item rationales/roles when present, stale refs.  
2. **User intent:** favorite, selectionLabel, rating.  
3. **Soft Photo Coach** letter/score only when analyzed.  
4. **Similarity groups** via existing Assistant `buildGroups` (fingerprint, name+size, burst, aspect+month).  
5. **Orientation / dimensions / resolution** when present.  
6. **Capture date → month / meteorological season / time-of-day** when present.  
7. **Tags / subjectHints** when present.  
8. **Camera / lens / focal** only when present (bonus; usually unavailable).  
9. **Collection + shoot linkage** when present.  
10. **Assistant / Coach / Builder session outputs** as soft priors and action bridges — never as silent portfolio mutation.  
11. **Library comparison basis** for underrepresentation (user’s own library counts only).

All insights carry: category, title, observation, whyItMayMatter, comparisonBasis,
confidence (`higher` | `moderate` | `lower`), evidence[], affectedImageIds,
suggestedActions, analysisVersion.

---

## 3. Signals excluded this sprint

| Excluded | Why |
|----------|-----|
| Universal health / quality / readiness / completeness score | Product ban |
| Cross-user comparison, streaks, badges, rankings | Product ban |
| Pixel sharpness / exposure / noise / composition ML | Not on LibraryImage |
| Perceptual hashing | Not computed |
| GPS / location clustering claims | Almost always null — never invent places |
| Industry / “professional portfolio” norms | Forbidden comparison basis |
| Shoot-store `styleSignals` direct read | Incompatible SoT |
| External AI / photo upload | Privacy ban |
| Automatic portfolio alteration / silent deletes | User approval required |
| Invented competition or calendar rules | Honesty contract |

---

## 4. Missing-metadata behavior

| Missing field | Behavior |
|---------------|----------|
| No capture dates | Season / chronology / time-of-day dimensions marked **unavailable**; no invented months |
| No GPS | Location concentration/underrepresentation **unavailable** |
| No tags / subjectHints | Subject dimension **unavailable** or lower confidence |
| No camera.* | Camera/lens/focal dimensions **unavailable** |
| No dimensions | Orientation mix unavailable for those frames |
| No Assistant / Coach / Builder history | Strength/opportunity insights that need those priors omit or lower confidence; UI states honestly |
| Stale image ids | Metadata-health insight; thumbnails skip gracefully |
| Empty / one-image portfolio | Honest empty / thin states; no fabricated patterns |
| Insufficient library comparison | Underrepresentation withheld (no comparison basis) |

---

## 5. Bias risks

| Risk | Mitigation |
|------|------------|
| Sparse tags over-weighted as “what you shoot” | Only claim subject concentration when labels exist; state coverage % |
| Ratings / coach grades treated as quality | Cited as *your* prior preference / soft assistive signal |
| Burst timing ≠ better frame | Repetition language is identity/similarity, not quality |
| Fingerprint duplicates as artistic failure | Frame as possible duplicate imports; mark intentional allowed |
| Purpose keyword match overreach | Descriptive overlap only; no NLP / contest rules |
| Concentration = bad | Always optional review language; intentional marker |
| Underrepresentation vs industry | **Forbidden** — only vs user’s library or stated purpose signals |
| Large portfolios quadratic cost | Reuse Assistant groups; cap analysis size; cache versioned output |

---

## 6. Privacy considerations

- Local-only: `localStorage` / existing IndexedDB; no new network endpoints.  
- No third-party AI; no photo uploads.  
- Health store keeps ids, derived text, user decisions — never blobs.  
- Originals never deleted or altered by Health.  
- Portfolio membership changes require explicit confirmation.  
- Same private-by-default framing as Foundation / Assistant / Coach / Builder.

---

## 7. Performance considerations

- Reuse `assistant-signals.collectSignals` and `assistant-recommend.buildGroups`.  
- Prefer thumbnails; never require full-res for analysis.  
- Persist versioned analysis; skip recompute when portfolio + library signature unchanged.  
- Cap practical analysis size (documented: prefer ≤200 portfolio images / ≤2000 library comparison images; beyond that, sample with honest notice).  
- Avoid O(n²) similarity when groups already available.  
- Progress only while real work runs; interruptible refresh.

---

## 8. Risk of overinterpreting technical analysis

Technical fields (resolution, focal length, camera model) are **coverage and
usage patterns**, not quality. Metadata health is explicitly labeled as distinct
from photographic quality. Soft Photo Coach grades remain assistive. Health must
never present EXIF completeness as artistic completeness.

---

## 9. Safeguards against turning health into a score

1. No aggregate percentage, grade, RYG, stars, readiness, or completeness meter in model or UI.  
2. Insights are independent observational cards — not rolled into one number.  
3. Confidence is qualitative (`higher` / `moderate` / `lower`) only.  
4. Banned-language regex asserted in tests (score / weak / must shoot / failed / professional require / unbalanced-as-judgment / ranking).  
5. Portfolio comparison is descriptive and never declares a winner.  
6. Opportunities are dismissible, savable, optional — no streaks or obligations.  
7. `Portfolio.health` stores analysis metadata refs, never a numeric score field named as such.

---

## 10. Future extension points (documented, not built)

- On-device perceptual hashing for stronger near-duplicate detection.  
- Richer EXIF at import (aperture/ISO/lens) to enable technical-variety insights.  
- Library-side styleSignals (brightness/contrast) computed once at import.  
- Optional shoot-store bridge when SoT alignment exists.  
- Richer purpose schemas without inventing contest rules.  
- Multi-portfolio trend timelines once enough dated portfolios exist.

All remain local-first and additive; analysisVersion allows re-analysis without
silently restoring dismissed insights unless the insight fingerprint materially
changes.

---

## 11. Comparison-basis model (Health-specific)

Every underrepresentation and opportunity insight must state one of:

| Basis id | Meaning |
|----------|---------|
| `portfolio-internal` | Distribution within the selected portfolio only |
| `library-vs-portfolio` | Counts in user’s library vs inclusion in portfolio |
| `purpose-signals` | Soft match to stated purpose / Builder purpose priorities |
| `user-decisions` | Favorites, ratings, Keep labels, Coach/Assistant decisions |
| `insufficient` | Explicitly insufficient — insight withheld or marked lower confidence |

Never: `industry-norm`, `other-users`, or fabricated seasonal calendars.

---

## 12. Analysis pipeline layers (implementation contract)

Deterministic, testable, versioned — **no insight logic in UI components**:

1. Data collection  
2. Normalization  
3. Signal coverage  
4. Concentration  
5. Underrepresentation  
6. Repetition  
7. Metadata coverage  
8. Purpose alignment  
9. Strength patterns  
10. Opportunity generation  
11. Confidence assignment  
12. Persistence merge (respect dismiss/save/intentional)  
13. Presentation  

`ANALYSIS_VERSION` starts at `1.0.0`.
