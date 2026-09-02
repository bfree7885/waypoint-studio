# ShedHunting.org V1.6 — Field Hunt Mode

**Status:** product work on Studio. Not merged. Not deployed. Do not run `scripts/publish-shed-hunting-host.mjs`. Do not begin V1.7.

V1.1–V1.2 answer **Should I go today?** and **what are conditions like?** V1.3 answers **Where should I look?** V1.4 saves **candidate places**. V1.5 builds a **Hunt Plan**. V1.6 is **work that plan in the field**.

A Field Hunt is **not** turn-by-turn navigation, route optimization, trail routing, deer tracking, shed prediction, find probability, automatic success detection, social sharing, cloud sync, or an account.

## Product questions

1. Should I go shed hunting today? — V1.1 / V1.2. Unchanged.
2. Where should I look? — V1.3. Unchanged.
3. Which places do I want to check? — V1.4 Scout Spots. Unchanged.
4. Where am I going to search? — V1.5 Hunt Plans. Unchanged.
5. How do I work this plan while walking? — V1.6 **Field Hunt Mode**.

## Honesty

Required distinctions:

| Term | Meaning |
| --- | --- |
| Scout Spot | Candidate place the hunter chose to investigate |
| Search priority | Terrain/search interpretation — not find probability |
| Hunt Plan | User-created ordered field plan of Scout Spot ids |
| Hunt Session | Device workflow: the hunter is working that plan now |
| Checked | Hunter explicitly marked the location checked |
| Revisit | Hunter explicitly chose to revisit it |
| Straight-line distance | Geometric distance only |

Never imply:

- sheds or deer are present
- Checked means an antler was found
- Higher search priority means an antler is likely there
- reaching a Scout Spot proves anything
- Field Hunt Mode is navigation
- GPS proximity auto-completes a Scout Spot

Preserve:

> Field Hunt Mode is working a Hunt Plan in the field — not navigation and not evidence that sheds are present.

## Hunt Plan vs Hunt Session

A **Hunt Plan** is durable field-planning data (`waypoint-sheds-hunt-plans-v1`). Export JSON includes it.

A **Hunt Session** is transient UI/workflow state (`waypoint-sheds-hunt-session-v1`): which plan is being worked, which Scout Spot is current, when the hunt started. It is **not** durable field dataset content. It is **not** included in normal field JSON export.

## Session model

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `kind` | `hunt-session` |
| `sessionId` | Local id (`hsess_…`) |
| `huntPlanId` | Hunt Plan being worked |
| `startedAt` / `updatedAt` | ISO timestamps |
| `activeScoutSpotId` | Current candidate in plan order (or null if none remain) |
| `status` | `active` while stored; finish **removes** the record |

One active session per origin. Progress is **not** stored as a second count. It is derived from current Scout Spot records (`Checked` among available ids).

The session does **not** copy Scout Spot terrain or `savedToday`.

## Scout Spot source of truth

V1.4 Scout Spot remains canonical for:

- status: `Plan` / `Checked` / `Revisit`
- notes
- location, terrain snapshot, saved Today

Checked / Revisit / Quick Note in Field Hunt Mode call `WaypointShedsScoutSpots.setStatus` / `setNote` (Quick Note may append via `appendScoutNote` in tests, and the HUD saves the Scout Spot note through `setNote`).

Starting a Hunt does not change Scout Spot status, terrain, or saved Today.

Finishing a Hunt does not revert Scout Spot edits.

## Start Hunt

On an open Hunt Plan card: **Start Hunt** (or **Resume Hunt** if a session already exists for that plan).

Requires a valid Hunt Plan with at least one available Scout Spot.

Creates or restores the local session, opens Field Hunt Mode, selects the first available Scout Spot unless the restored session already has a valid active id.

Does **not**:

- set Hunt Plan to Completed or Active
- change Scout Spot status
- modify terrain or saved Today
- invent a route

## Resume

Reloading the map restores Field Hunt Mode when an active session exists.

If the Hunt Plan was deleted: the session is ended. Honest copy: the plan is no longer on this device.

If the active Scout Spot was deleted: the session stays; the next valid Scout Spot is selected, or none honestly.

## Finish Hunt

**Finish Hunt** ends/removes session state, returns to the Hunt Plan card, keeps Scout Spot edits and the Hunt Plan. Hunt Plan status is unchanged unless the hunter sets Planned / Active / Completed themselves.

## Location and distance

Uses the existing map geolocation (YOU marker). Field Hunt Mode works without location permission.

If location is unavailable: **Location unavailable**. Distance is not shown and is not invented as zero.

When current location and the active Scout Spot both have valid coordinates, show **Straight-line distance** using the V1.5 Haversine helper. Never walking, hiking, travel, or route distance.

Malformed coordinates yield unavailable distance.

## Active / next Scout Spot

Uses V1.5 Hunt Plan order. Next Spot / Previous Spot move among **available** Scout Spots. Numbered map markers remain. The active marker is more prominent. Tapping a plan Scout Spot selects it.

Next Spot means next candidate in the hunter’s list — not a recommended route.

## Progress

`N of M Scout Spots checked` where M is available Scout Spots and N is those with status `Checked`. Unavailable ids are not counted as Checked. Missing references stay honest.

## No automatic GPS check-in

Walking near a Scout Spot does **not** mark it Checked. Location updates refresh distance only.

## Map behavior

The map stays the primary surface. The Field Hunt HUD is compact (left, limited height). Search Areas, pan, and zoom remain. Scout diamonds stay distinct; numbering stays V1.5 sequence, not a path.

## Failure behavior

| State | Behavior |
| --- | --- |
| No geolocation / timeout / malformed location | Hunt Mode works; distance unavailable |
| Hunt Plan deleted | Session ended; honest message |
| Active Scout Spot deleted | Session kept; next valid or none |
| All Scout Spots gone | Session kept; no active spot; no invented replacements |
| Malformed session storage | Treated as no session; no throw |
| Storage quota | Honest error; nothing silent |
| Empty Hunt Plan | Start Hunt refused |
| Missing / malformed Scout coordinates | Distance unavailable |
| One-spot plan | Next/Previous stay on that spot |
| 20-spot plan | Full V1.5 cap; no wrap past last |

## Mobile UX

First-class at 320 / 375 / 390 / 430. Primary controls target 44px. Finish, Checked, Revisit, Quick Note, Next Spot, and Start Hunt stay reachable. No horizontal page overflow. HUD must not cover the whole map.

## Privacy

Local / private / this device only. No cloud sync. No accounts. No social.

## Import / export

Hunt Plans and Scout Spots remain in `waypoint-sheds-field-private-v1`. The active Hunt Session is **not** exported. Importing a legacy payload without Hunt Plans still works.

## Tests

- `automation/test-sheds-v1-6-field-hunt.mjs`
- `automation/test-sheds-v1-6-map-mobile.mjs`

CI also still runs V1.5, V1.4, V1.3, Today’s Hunt, Inspect, Import JSON, and dedicated-host readiness.

## Dedicated host

Generate with `node scripts/prepare-shed-hunting-host.mjs` only. Do not publish. Do not push `sheds-site`.

## Limitations

- No routing, trails, or turn-by-turn
- No GPS auto-check-in (by design)
- No per-spot live weather refetch in Field Hunt Mode
- One Hunt Session at a time
- Session is device-local and lost if storage is cleared
- Distance is straight-line only
