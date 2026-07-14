# Photo Coach V2 — Shoot Review

Work Block 3 architecture for session-based review.

## Purpose

Help photographers answer **“How did today’s shoot go?”** instead of only grading one frame.

Single-image upload remains fully supported. Multi-image (1–20) is the Shoot Review path.

## Session model

`WaypointPhotoCoachShoot` (`apps/waypoint-scenes/js/photo-coach-shoot.js`) schema **2.0.0**:

| Field | Role |
|-------|------|
| `id`, `createdAt`, `status` | Session identity |
| `images[]` | Per-photo records + analysis + private `selectionLabel` |
| `groups[]` | Similar-frame groups (burst / near-duplicate / similar composition) |
| `summary` | Shoot Summary object (insights, best-of, stats, edits…) |
| `analysisStartedAt` / `analysisFinishedAt` / `analysisDurationMs` | Queue timing |
| `importerHandoffId` | Reserved for Waypoint Importer |

Persisted in `localStorage` key `waypoint-photo-coach-shoots-v1` (max 12 shoots). Growth entities remain in `waypoint-photo-records-v1` / `waypoint-photo-shoots-entity-v1`.

Private labels: `keep` | `maybe` | `reject` | `favorite` — no scores, rankings, or sharing.

## Queue architecture

`WaypointPhotoCoachQueue` (`photo-coach-queue.js`):

- In-memory sequential queue
- Duplicate skip by `name::size::lastModified`
- Progress: current file, remaining, percent, optional ETA
- Cancel remaining (in-flight item may finish)
- Yield between items so the UI stays responsive
- Not durable across reload (completed analyses/summaries are)

## Grouping logic

`WaypointPhotoCoachGrouping` (`photo-coach-grouping.js`):

1. **Burst** — EXIF capture times within 2.5s
2. **Near-duplicate / similar composition** — style-signal distance (+ optional same genre)

Groups collapse by default. Nothing is deleted.

## Shoot Summary sections

- Session date, count, camera/lens, analysis duration, locations (when EXIF GPS exists), weather placeholder
- Session observations (cautious, evidence-based)
- Strongest compositions, interesting subjects, worth another attempt
- Best of session (multiple categories, deduped picks)
- Shared editing suggestions for the set
- Lightweight subject-mix statistics (profile-ready)
- Similar frames
- Quiet next-outing focus

## Future Waypoint Importer integration

`WaypointPhotoCoachImporterBridge` (`photo-coach-importer-bridge.js`):

- Protocol `1.0.0` payload validate / stage / peek / clear
- `receiveSession()` stub — returns `not-implemented` until Importer supplies `File`/`Blob` handles
- Handoff key: `sessionStorage` `waypoint-photo-coach-importer-handoff-v1`

Photo Coach does **not** require the Importer.

## Future Photographer Profile integration

Summary `profileHints` and `sessionStats` feed growth ingest via existing `Repo.ingestShoot`. Private labels on image records (and `PhotoRecord.selectionLabel`) prepare preference learning without social features.

## Entry points

- `/apps/photo-coach/` — live critique + Shoot Review
- `/apps/scenes/photo-coach/` — module landing (unchanged path)

## Tests

```bash
node automation/test-photo-coach-shoot-review.mjs
node automation/test-photographer-profile.mjs
node automation/test-personalized-coaching.mjs
node automation/test-hidden-landscapes.mjs
node automation/smoke-browser.mjs http://127.0.0.1:8080
```
