# ShedHunting.org V1.7 — Hunt Track & Field Observations

**Status:** product work on Studio. Not merged to main. Not deployed to ShedHunting.org. Do not run `scripts/publish-shed-hunting-host.mjs`. Do not begin V1.8 Hunt History UI in this increment.

V1.1–V1.2 answer **Should I go today?** and **what are conditions like?** V1.3 **Where should I look?** V1.4 **Save candidate places.** V1.5 **Plan the search.** V1.6 **Work the plan in the field.** V1.7 **Record where I searched and what I observed.**

## Product purpose

Turn an active V1.6 Field Hunt from a temporary workflow into a useful **private** record of actual field activity:

START HUNT → walk/search → see where this device reported travel → record observations → FINISH HUNT

This is **not** navigation, routing, trail guidance, shed/deer prediction, find probability, or a social product.

## Honesty

| Term | Meaning |
| --- | --- |
| Hunt Track | Where this device’s geolocation API reported the hunter traveled |
| Searched distance | Approximate distance along **accepted** track points |
| Hunt time | Elapsed time from Hunt start timestamps |
| Observation | Hunter-entered field note (optional mapped point) |
| Shed Found | The hunter **reported** finding a shed here — not a model prediction |
| Hunt Record | Durable private snapshot written on Finish Hunt |

A Hunt Track is **not** a planned route, recommended route, deer route, or guaranteed exact path. GPS is not survey-grade.

Search Priority remains terrain/search interpretation. Shed Found does not change Search Priority.

## Hunt Track architecture

V1.6 Hunt Session (`waypoint-sheds-hunt-session-v1`) stays a small workflow record: which plan, which Scout Spot, startedAt.

V1.7 does **not** stuff a GPS array into that session.

| Store | Key | Lifetime |
| --- | --- | --- |
| Hunt Session | `waypoint-sheds-hunt-session-v1` | Transient. Cleared on Finish. Not exported. |
| Hunt Activity | `waypoint-sheds-hunt-activity-v1` | One in-progress hunt. Survives reload. Holds track + observations. |
| Hunt Records | `waypoint-sheds-hunt-records-v1` | Finished hunts. Durable. Exported. |

Globals: `WaypointShedsHuntActivity`, `WaypointShedsHuntRecords`.

Field Hunt Mode starts a **separate** `watchPosition` (`state.huntWatchId`) so it does not fight Start Search. If geolocation is missing, denied, or times out, Field Hunt continues. No invented coordinates.

## Persistence choice

**localStorage**, same as V1.4–V1.6. **This is safe enough for V1.7.**

IndexedDB is not used in V1.7. Caps keep a typical origin quota (~5 MB) usable:

- 1,800 track points per hunt
- 80 observations per hunt
- 12 finished Hunt Records

Hunt History and V2.x personalization are expected to outgrow localStorage. IndexedDB (or equivalent) is **V1.8 / V1.9 / V2.x technical debt**, not a V1.7 migration.

If the finished-hunt write fails (quota or storage unavailable), the UI reports the error and **does not discard** the in-progress hunt. Oldest **finished** records may be dropped **only** to make room for a new successful save, with an explicit warning.

## GPS filtering

`classifyTrackPoint` / `shouldAcceptTrackPoint` drop noise. They do **not** smooth a fictional route.

| Rule | Reject when |
| --- | --- |
| Malformed | Non-finite lat/lng |
| Impossible | `|lat| > 90` or `|lng| > 180` |
| Duplicate | Move &lt; 3 m |
| Jitter | Move &lt; 8 m and dt &lt; 8 s |
| Too frequent | dt &lt; 4 s unless move ≥ 25 m |
| Jump | Move &gt; 2,000 m in &lt; 3 s |

Keep accuracy when the browser supplies a finite value in range. Keep altitude only when it is finite and in −500…9000 m. Missing values are omitted, never fabricated.

If the live cap is exceeded, oldest **in-progress** points are dropped and a quota warning is stored on the activity.

## Distance calculation

Haversine sum of consecutive **accepted** points.

A leg is skipped (not interpolated) when either endpoint reports accuracy &gt; 120 m.

Labels: **Searched distance** / **Track distance**. Never route / hiking / trail / recommended distance.

Zero or unusable points → **Unavailable**. Poor-accuracy-only legs → **Partial — accuracy poor**.

## Duration

`now - startedAt` from ISO timestamps. A one-second HUD clock is display-only.

Compact display: `MM:SS` under one hour, `HH:MM` at one hour or more. Backgrounding the tab does not freeze the true elapsed time.

## Observations

Field control: **+ Observation**. Tap a type to save. Optional note.

Types: Shed Found, Deer Sign, Trail / Crossing, Bedding, Feeding Sign, Access / Obstacle, Other.

Each observation: `id`, `type`, `createdAt`, `lat`/`lng` **only if** a valid current location exists, optional `note`, hunt/session ids, `privacy: private-local`.

If location is unavailable, the observation **still saves**. It is not mapped. Coordinates are not invented.

### Shed Found

User-entered evidence that the hunter found a shed. Distinct marker (`sheds-hunt-obs-mark--shed`). No scoring, antler measurements, species ID, photo AI, or trophy systems.

## Map

Hunt Track polyline: muted sand/olive (`#b89a62`), no direction arrows, class `sheds-hunt-track`. Distinct from Start Search tracks, Hunt Plan numbers, Search Areas, Scout Spots, and measure lines.

Mapped observations are small restrained markers. Tapping shows type, time, optional note, and honest location state.

Unmapped observations appear only in the Hunt Record, not as invented map pins.

## Reload / recovery

V1.6 already restores the Hunt Session. V1.7 restores the Hunt Activity for the same `sessionId` (same `huntRecordId`, track, observations). Duration recomputes from `startedAt`. Tracking resumes via `watchPosition`.

Finish Hunt writes **one** Hunt Record for that `huntRecordId`. Reloading mid-hunt does not create a second record.

If a Hunt Plan is missing on boot or deleted during a hunt, V1.7 attempts to persist the activity as an interrupted Hunt Record using the **name snapshot** already stored.

## Finish Hunt → Hunt Record

The durable record includes:

`schemaVersion`, `kind: hunt-record`, `huntRecordId`, `huntPlanId` (may be null later), `huntPlanNameSnapshot`, `startedAt`, `finishedAt`, `trackPoints`, `trackDistanceM` / availability, `observations`, Scout Spot **ids** (not copied Scout Spot objects), summary counts, privacy.

The plan name snapshot remains after the plan is renamed or deleted.

If persist fails, Finish aborts and the hunt stays active.

## Privacy / network

Hunt Track and hunt-scoped observations are **private and local to this device/browser**. They are not uploaded to Waypoint, GitHub, analytics, or another first-party service.

Normal map tile requests still fetch the visible map. Weather/elevation still send approximate coordinates to Open-Meteo (existing). Hunt Track coordinates are not included in those requests.

## Field JSON

Format remains `waypoint-sheds-field-private-v1`.

**Exported:** Scout Spots, Hunt Plans, finished Hunt Records (and their observations), plus existing observations/sessions/search areas/finds.

**Not exported:** transient Hunt Session, in-progress Hunt Activity.

Old payloads without `huntRecords` still import. Hunt-Records-only payloads are valid. Malformed records are skipped.

Track-heavy JSON can be large; caps keep it bounded. Import merge is by `huntRecordId`.

## Failure behavior

| Case | Behavior |
| --- | --- |
| Permission denied / timeout / no geolocation | Field Hunt works. Track status honest. Observations allowed unmapped. Duration works. |
| Temporary GPS loss | Existing points kept. No invented fillers. Tracking can resume. |
| Malformed stored activity/records | Treated as empty. No crash. |
| Old V1.6 session only | Hunt Session restores; activity is created on resume/start. |
| Storage quota on finish | Error shown. Hunt not discarded. |

## Mobile

First-class widths: 320 / 375 / 390 / 430. Primary controls remain ~44px (`2.75rem`). Map stays the primary surface. Observation chooser and note input must stay usable; focusing the note must not permanently break layout.

## Future

- **V1.8** Hunt History reads these Hunt Records.
- **V1.9** may add richer private records and a larger local store (IndexedDB is technical debt, not V1.7 work).
- **V2.x flagship (Sheds+):** a **dynamic, shifting search-priority / opportunity map**. It is not an antler-location predictor. See `docs/sheds/SHEDS-PRODUCT-ROADMAP.md`.

V1.7 does **not** implement accounts, cloud sync, sharing, leaderboards, payment, or the V2.x map.

Do not treat this document as authorization to run `scripts/publish-shed-hunting-host.mjs`.
