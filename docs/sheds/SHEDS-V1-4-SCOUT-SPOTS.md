# ShedHunting.org V1.4 — Scout Spots

**Status:** product work on Studio branch `cursor/sheds-v1-4-scout-spots-3501`. Not deployed. Do not merge or publish in this phase.

V1.3 answered **Where should I look?** with Search Areas + Inspect. V1.4 turns that into a **field-planning** workflow: inspect terrain, save a candidate place, return to it later.

A Scout Spot is **not** a social pin, a deer location, an antler probability, a route, or a map redesign.

## Product questions

1. Should I go shed hunting today? — V1.1 / V1.2. Unchanged.
2. Where should I look? — V1.3 Search Areas + Inspect. Unchanged.
3. Which places do I want to check? — V1.4 **Scout Spots**.

## Honesty

Terrain search priority is search guidance only.

Never imply:

- sheds are present
- deer are present
- a saved spot is likely to contain an antler
- Higher means probability of finding a shed
- Today context changes biological likelihood

Use: terrain search priority, candidate search location, terrain worth inspecting, field planning, search effort.

Preserve:

> Use the terrain as a search guide, not evidence that sheds are present.

## Data model

Each Scout Spot (kind `scout-spot`, schemaVersion `1`):

| Field | Meaning |
| --- | --- |
| `id` | Stable local id (`spot_…`) |
| `name` | User label (max 80). Default from terrain feature or “Scout Spot” |
| `status` | `Plan` \| `Checked` \| `Revisit` |
| `location.lat/lng` | Required. Privacy `private` |
| `createdAt` / `updatedAt` | ISO timestamps |
| `note` | Optional (max 400) |
| `terrain` | Snapshot of V1.3 evaluatePoint at save time |
| `savedToday` | Historical Today’s Hunt snapshot at save time |
| `fieldNote` | Honesty sentence (always stored) |

`terrain` never invents Moderate. Missing/failed/loading/idle → `available: false`, `searchPriority: null`.

`savedToday.available === false` when hunt is missing, loading, or needs location. Do not invent weather.

Cap: **120** spots per origin. Further saves fail honestly rather than silently dropping older pins.

## Persistence

Separate store from observations (what was seen) and saved Search Areas (named map extents).

| | |
| --- | --- |
| Key | `waypoint-sheds-scout-spots-v1` |
| Module | `apps/shed-hunting/js/sheds-scout-spot-store.js` |
| Global | `window.WaypointShedsScoutSpots` |
| Shape | `{ schemaVersion: 1, scoutSpots: [...] }` |

**Migration:** a legacy bare array of spots still loads. Corrupt JSON or a non-list object yields an empty list without throwing. Existing observation / session / area keys are never rewritten by this store.

No cloud account.

## Today context (historical)

When saving, the store may snapshot:

- hunt rating / band
- season category + label
- freeze/thaw
- temperature trend
- snow-cover class

The Scout Spot card always distinguishes:

- **Saved context** — when the spot was saved. Disclaimer: not today’s conditions.
- **Today** — live composer output if available, labeled as separate from the snapshot.

Live Today may refresh while the card is open. It must not mutate `savedToday`.

If live comparison is unavailable, only the saved snapshot is shown, still labeled historical.

## Inspect integration

1. Hunter opens Inspect and taps a location.
2. **Save Scout Spot** appears (44px, full width, sticky at the bottom of the Inspect HUD).
3. Save writes terrain + Today snapshots as they exist (including unavailable).
4. Inspect closes; the Scout Spot card opens.

Save is allowed when terrain or Today is unavailable. Missing values stay empty.

## Map markers

Restrained **diamonds** (rotated 12px squares), subordinate to Search Areas:

| Status | Color |
| --- | --- |
| Plan | gold |
| Checked | sage |
| Revisit | amber |

- Always on the map (Search Areas on or off).
- Distinct from observation/waypoint circles.
- Open marker slightly larger (`zIndexOffset` 400 vs 120).
- No clustering in V1.4. Prefer visual restraint if many spots are visible.
- Usable over Esri World Street.

## Status / rename / notes

- Status: three equal 44px buttons. Unknown statuses rejected; stored value stays Plan / Checked / Revisit.
- Rename: required non-empty name; empty rename restores the previous name.
- Note: optional; blank is allowed.
- Delete: confirm, then remove from this device only. Does not change terrain layers.

## Import / export

Export JSON (`waypoint-sheds-field-private-v1`) includes `scoutSpots` (wrapped `{ schemaVersion, scoutSpots }` or a raw array). Import unwraps either shape and **merge-by-id**.

Malformed records (no coordinates, non-objects) are skipped. Valid existing spots are not destroyed.

A scout-only payload is a valid import.

## Failure states

| Case | Behavior |
| --- | --- |
| Terrain unavailable at save | Spot exists; card says intelligence was unavailable |
| Today unavailable at save | Saved context says hunt was unavailable |
| Pre-V1.4 / legacy fields | Defaults: Plan, empty note, unavailable terrain/today |
| Malformed import | Skip; count in `skipped` |
| localStorage full / blocked | Honest error; no silent success |
| 120-spot cap | Honest error; delete one to add another |

## Mobile

First-class at **320 / 375 / 390 / 430**.

- Save Scout Spot reachable without covering the whole map.
- Scout card max-width `min(20rem, 100vw - 1rem)`; `overflow-x: hidden`.
- Done stays sticky at the top of the card.
- Status / name / note do not overflow horizontally.
- Map remains the primary surface.

## Limitations

- Local origin only. New origin (dedicated host vs Studio) is a separate store.
- No sync, sharing, or accounts.
- No clustering, routing, or “best next spot”.
- Saved weather is not a forecast and is not current conditions.
- Search Areas overlay is independent; saving a spot does not change base terrain priority.
- V1.4 does not deploy. Generate host with `node scripts/prepare-shed-hunting-host.mjs` only. Do not run `publish-shed-hunting-host.mjs`.

## Tests

- `automation/test-sheds-v1-4-scout-spots.mjs`
- `automation/test-sheds-v1-4-map-mobile.mjs`
- Import JSON coverage in `automation/test-sheds-import-json.mjs`
- Dedicated-host assertions in `automation/test-shedhunting-host-readiness.mjs`
