# Scenes Portfolio Assistant — Signal Audit

**Date:** 2026-07-24
**Branch:** `feature/scenes-portfolio-assistant`
**Base foundation:** `feature/scenes-portfolio-foundation` (meaningful tip `87fbd76`;
current remote tip `0a298e6` adds one automated `Publish live engine artifacts [skip ci]` commit)
**Scope:** Portfolio Assistant (explainable candidate review). **Not** Portfolio Coach or Auto Builder.

---

## Purpose of this audit

Before writing any recommendation logic, this document inventories the signals the
Waypoint Scenes codebase **actually produces today** — on device, with no new backend
or third‑party AI. Every category, confidence level, and rationale the Assistant shows
must trace back to a signal listed here. If a signal is not listed, the Assistant must
not claim it. When evidence is thin, the honest outcome is **Needs review / manual
selection**, never a fabricated score.

Guiding product principle: **the system recommends; the photographer decides.** No
definitive "good/bad/artistic/professional/portfolio‑worthy" claims.

---

## 1. Where the data lives (persistence reality)

| Store | Key / DB | Contents | Used by Assistant? |
|-------|----------|----------|--------------------|
| Photo Library index | `localStorage` `waypoint-photo-library-index-v1` | `LibraryImage[]` metadata (ratings, labels, EXIF-when-present, coach refs, dimensions, fingerprint, thumbnail data URL) | **Yes — primary source of truth** |
| Photo Library collections | `localStorage` `waypoint-photo-library-collections-v1` | Named `Collection` sets referencing library ids | **Yes — session source** |
| Photo Library media | IndexedDB `waypoint-photo-library-media-v1` | Original blobs (+ some thumbs) | Indirect — thumbnails preferred; originals never required, never mutated |
| Portfolios | `localStorage` `waypoint-scenes-portfolios-v1` | Purpose portfolios referencing library ids (foundation) | **Yes — session source + destination** |
| Portfolio meta | `localStorage` `waypoint-scenes-portfolios-meta-v1` | Schema/updated stamp | Read-only context |
| Photo Coach shoots | `localStorage` `waypoint-photo-coach-shoots-v1` | Shoot Review sessions with a *different* image model (`img.analysis.styleSignals`, `img.exif`) | **No direct read** — see §5 |
| Coach session history | `localStorage` `waypoint-photo-coach-sessions-v1` | Legacy "portfolio" critique history | No — already migrated into Library additively |

**New Assistant store (this sprint):** `localStorage`
`waypoint-scenes-portfolio-candidate-sessions-v1` — candidate review sessions only
(refs, assistant output, and user decisions). No blobs. Local‑first, same trust model
as the foundation.

---

## 2. Available signals on a `LibraryImage`

Source of truth: `apps/photo-library/js/pl-models.js` `createLibraryImage()`. Every
field is **honestly nullable** — the model never fabricates EXIF or scores.

| Signal | Field | Origin | Reliability limits |
|--------|-------|--------|--------------------|
| Favorite | `favorite` (bool) | Explicit user action in Library / Shoot Review | High trust (user intent). Absent by default. |
| Selection label | `selectionLabel` ∈ `keep\|maybe\|reject\|null` | Explicit user action in Shoot Review | High trust (user intent). Often null if never reviewed. |
| Private rating | `rating` 1–5 or `null` | Explicit user rating | High trust. Sparse; many images unrated. |
| Coach analysis status | `moduleRefs.photoCoach.analysisStatus` ∈ `not-analyzed\|analyzing\|analyzed\|error` | Photo Coach linkage / migration | Only meaningful when `analyzed`. |
| Coach letter grade | `moduleRefs.photoCoach.letterGrade` (A–F) | Photo Coach critique | **Assistive, not truth.** Only present when analyzed. Model-derived; treat as one soft signal. |
| Coach overall score | `moduleRefs.photoCoach.overallScore` (0–100) | Photo Coach critique | Same caveats as grade. Never shown as a public/ranking score. |
| Coach analyzed date | `moduleRefs.photoCoach.analyzedAt` | Photo Coach | Context only. |
| Shoot linkage | `moduleRefs.photoCoach.shootId` / `shootImageId` | Migration / linkage | Lets us scope a session to one shoot **without** reading the shoot store. Sparse. |
| Capture date | `captureDate` (ISO) | EXIF at import (when present) | Frequently null (stripped EXIF, screenshots, legacy imports). |
| Content fingerprint | `contentFingerprint` | Import fingerprint `name::size::lastModified` (uploads) | **Import-identity only, not perceptual.** Exact match ⇒ very likely same file re-imported. Null for migrated rows. |
| Filename / original | `filename`, `originalFilename` | File name at import | Weak alone; combined with byte size hints at duplicate imports. |
| Byte size | `byteSize` | File size | Null for migrated rows. |
| Dimensions | `width`, `height`, `aspectRatio`, `orientation` | Decoded at import | Null for migrated (thumbnail‑only) rows. Reliable for uploads. |
| Camera EXIF | `camera.{make,model,lens,focalLengthMm,fNumber,iso,shutter,exposureTimeSec}` | EXIF at import | **Usually null in this codebase** (import path does not yet parse full EXIF). Treat as bonus context only. |
| GPS | `gps.{lat,lon,accuracyM}` | EXIF | Almost always null; never inferred. Not used by Assistant. |
| Tags / subjects | `tags[]`, `subjectHints[]` | User / migration | Sparse; useful for variety hints only. |
| Collection membership | `collectionIds[]` | User organization | Defines a session source. |
| Thumbnail | `media.thumbnailDataUrl`, `media.hasThumbnail` | Generated at import (≤320px JPEG) | Preferred render asset. May be null for some migrated rows. |
| Has original | `media.hasOriginal`, `media.originalBlobKey` | Import into IndexedDB | Missing‑file handling depends on this. |
| Import / update dates | `importDate`, `updatedAt` | System | Ordering/context only. |
| Source | `source` | Provenance tag | Context only. |

---

## 3. Signals SELECTED for this sprint

The Assistant derives categories and rationale **only** from these, and only when the
field is actually present:

1. **User intent signals (highest trust):** `favorite`, `selectionLabel` (keep/maybe/reject), `rating`.
2. **Coach signals (soft, assistive):** `moduleRefs.photoCoach` `letterGrade` / `overallScore` **only when `analysisStatus === "analyzed"`**.
3. **Similarity / duplicate signals:**
   - `contentFingerprint` exact match ⇒ *Possible duplicate* (strongest).
   - `filename` + `byteSize` exact match ⇒ likely duplicate import.
   - `captureDate` proximity (burst window) + matching `aspectRatio` bucket ⇒ *Similar frame* (burst).
   - `aspectRatio` bucket + same capture month ⇒ weak *Similar frame* (variety hint).
4. **Completeness signals (for honest "Needs review"):** presence/absence of any of the
   above; missing thumbnail/original; conflicting signals (e.g. high rating but labeled reject).

Each selected signal maps to a **plain‑language rationale string** citing the concrete
value (e.g. "Private rating is 5 of 5", "Shares an import fingerprint with another
frame"). No rationale is emitted without its backing field.

---

## 4. Signals EXCLUDED this sprint (and why)

| Excluded | Reason |
|----------|--------|
| Pixel-level sharpness / exposure / noise / composition heuristics | **The Library import path does not produce these.** The only pixel-derived analysis (`analysis.styleSignals`) lives in the Photo Coach *shoot* model, not on `LibraryImage`. Inventing them would violate the honesty contract. |
| Perceptual image hashing (aHash/pHash/dHash) | Not computed anywhere today. `contentFingerprint` is import-identity only. Perceptual hashing is a viable *future* signal (see §6) but out of scope — would require decoding originals and new compute. |
| GPS / location clustering | Almost always null; no reliable data. |
| Full EXIF (aperture/ISO/lens) driven recommendations | Import path rarely populates `camera.*`. Shown as context if present, but never a category driver. |
| Face / subject detection, aesthetic ML scoring | No such model on device; would require new third‑party AI upload — **forbidden** by the privacy contract. |
| Direct read of `waypoint-photo-coach-shoots-v1` | Incompatible image model and a separate SoT; the trustworthy bridge is `moduleRefs.photoCoach.shootId` already on library rows (see §5). |

---

## 5. Session sources supported by the architecture

All sources resolve to **`LibraryImage` ids** so the Assistant reads one SoT and never
mutates originals:

| Source | How it resolves | Notes |
|--------|-----------------|-------|
| **Whole library** | `WaypointPhotoLibraryStore.loadIndex()` | Default. Honest empty state when library is empty. |
| **Collection** | Library images where `collectionIds` contains the chosen collection id | Uses existing Collections. |
| **Existing portfolio** | The portfolio's `imageIds` (review what's already curated) | Also the natural destination. |
| **Shoot** | Library images where `moduleRefs.photoCoach.shootId` matches | Architecture‑supported bridge; avoids reading the incompatible shoot store. Only appears when such linkage exists. |

"Selected library photos" is expressed as filtering/curating within a library‑sourced
session (the user chooses what to keep). No fake or demo production data is ever seeded.

---

## 6. Future‑supportable signals (documented, not built)

- **Perceptual hashing** for true near‑duplicate detection (decode thumbnails on device, compute dHash) — extends the *Similar frame* / *Possible duplicate* logic without leaving the device.
- **On‑device EXIF parsing** at import (aperture/ISO/shutter/lens) — would enrich rationale and enable technical‑variety hints.
- **Library‑side style signals** (brightness/contrast/orientation) mirroring the shoot model's `styleSignals`, computed once at import and cached on `LibraryImage`.
- **Shoot store bridge** to pull `analysis.styleSignals` for grouping when a session is shoot‑sourced.
- **Portfolio Health** metadata (`Portfolio.health`, reserved null today) once observational balance diagnostics exist.

All would remain local‑first and additive. The candidate‑session model versions its
output (`analysisVersion`) so richer signals can re‑analyze without discarding user
decisions.

---

## 7. Privacy implications

- **Local only.** All reads are from `localStorage` / IndexedDB already on the device.
- **No new network calls, no third‑party AI, no upload.** The Assistant introduces zero
  outbound requests.
- Sessions store **ids and derived text only** — never blob bytes.
- Originals are never deleted or altered; "dismiss"/"exclude" affect the session, not the library.
- Same trust framing as the foundation: private by default, honest about what is a
  suggestion vs. a user decision.

---

## 8. Performance risks & mitigations

| Risk | Mitigation |
|------|------------|
| Large libraries (up to `MAX_INDEX` = 2000 rows) | Analysis is O(n) for scoring; similarity grouping is bucketed by aspect/month/fingerprint to avoid full O(n²). |
| Recomputing on every open | Session caches recommendations keyed by image id + a per‑image signal signature + `analysisVersion`; unchanged images/groups are not recomputed. |
| Full‑res decode | Never required — rendering uses `thumbnailDataUrl`; missing thumbnails degrade to an honest filename fallback. |
| Duplicate analysis requests | Single synchronous analysis pass per session render; no polling, no fake spinner. Progress is only shown while real work runs. |
| Blocking the UI | Analysis is pure/fast and runs on demand; the shell renders immediately and degrades gracefully if a signal is missing. |

---

## 9. Honesty checklist applied to the design

- [x] Every category is backed by a listed signal.
- [x] Confidence is qualitative (Higher / Moderate / Lower) — no fabricated percentages.
- [x] Coach grades/scores are framed as soft, assistive signals, never as truth or ranking.
- [x] Insufficient evidence ⇒ *Needs review* + manual selection, never auto‑reject and never a fake score.
- [x] No pixel analysis is claimed because none is produced for `LibraryImage`.
- [x] No new third‑party/AI/network dependency.
