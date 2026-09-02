# ShedHunting.org V1.5 — Hunt Plans

**Status:** merged to Studio main as Hunt Plans. Dedicated-host V1.5 is live on ShedHunting.org. V1.6 Field Hunt Mode is a separate product increment — do not treat this doc as authorization to deploy V1.6.

V1.1–V1.2 answer **Should I go today?** and **what are conditions like?** V1.3 answers **Where should I look?** V1.4 saves **candidate places**. V1.5 connects those into a local field-planning workflow: **Where am I going to search?**

A Hunt Plan is **not** social, a cloud account, navigation, a deer route, an optimized route, or a probability of finds.

## Product questions

1. Should I go shed hunting today? — V1.1 / V1.2. Unchanged.
2. Where should I look? — V1.3 Search Areas + Inspect. Unchanged.
3. Which places do I want to check? — V1.4 Scout Spots. Unchanged.
4. Where am I going to search? — V1.5 **Hunt Plans** (ordered Scout Spots on this device).

## Honesty

A Hunt Plan is:

> A private field plan containing candidate locations you intend to check.

Never imply:

- sheds or deer are present
- the sequence is an optimized, hiking, driving, or trail route
- numbered markers are a known travel path
- Today on the plan card is the weather from when the plan was created
- Hunt Plan status (`Planned` / `Active` / `Completed`) changes Scout Spot status (`Plan` / `Checked` / `Revisit`)

Preserve:

> A Hunt Plan is an intended search sequence of candidate locations — not a route and not evidence that sheds are present.

## Data model

Each Hunt Plan (`kind: "hunt-plan"`, `schemaVersion: 1`):

| Field | Meaning |
| --- | --- |
| `id` | Stable local id (`plan_…`) |
| `name` | User label (max 80) |
| `status` | `Planned` \| `Active` \| `Completed` |
| `createdAt` / `updatedAt` | ISO timestamps |
| `scoutSpotIds` | Ordered Scout Spot ids (max 20). Canonical location records stay on the Scout Spot. |
| `note` | Optional (max 400) |
| `privacy` | `private-local` |
| `fieldNote` | Honesty sentence |

The Scout Spot remains the canonical saved candidate-location record. Plans do **not** copy terrain or `savedToday` snapshots.

Caps: **40** Hunt Plans per origin; **20** Scout Spots per plan. Further creates fail honestly.

A Scout Spot may belong to more than one Hunt Plan. Duplicate ids inside one plan are rejected.

## Persistence

| | |
| --- | --- |
| Key | `waypoint-sheds-hunt-plans-v1` |
| Module | `apps/shed-hunting/js/sheds-hunt-plan-store.js` |
| Global | `window.WaypointShedsHuntPlans` |
| Shape | `{ schemaVersion: 1, huntPlans: [...] }` |

**Migration:** a legacy bare array of plans still loads. Corrupt JSON or a non-list object yields an empty list without throwing.

No cloud sync. No accounts. No public coordinates.

## Relationship to Scout Spots

- Create a plan by selecting existing Scout Spots (tap order = intended search order).
- From a Scout Spot card: **Add to Hunt Plan** (choose among plans, or create one).
- Deleting a Hunt Plan does **not** delete Scout Spots.
- Deleting a Scout Spot removes that id from every Hunt Plan. Missing ids are not fabricated. If a plan still lists an id that is gone (import), the UI says **Scout Spot unavailable**.

## Status semantics

Hunt Plan status is the hunter’s plan of record for the outing:

- **Planned** — intend to use this sequence
- **Active** — using it now
- **Completed** — finished with this sequence

Scout Spot **Plan / Checked / Revisit** is independent. Changing one never auto-updates the other.

## Ordering semantics

Move Up / Move Down (44px). The list order is an **intended search sequence**, not a recommended or fastest route. There is no routing engine. No path is drawn between points.

When a Hunt Plan is open, those Scout Spots show numbers **1, 2, 3…** on the existing diamond markers. Outside an open plan, V1.4 diamonds remain.

## Today behavior

The plan card **Current conditions** block shows the live Today’s Hunt already composed for this map session (`state.lastHunt`).

It is **current** information — not a snapshot from when the plan was created. It must not mutate Scout Spot `savedToday`.

If Today is unavailable (Need location / Not rated / missing weather), the card says so honestly.

If the session has no place yet, a Hunt Plan may expose an average of its Scout Spot coordinates as `source: "hunt-plan-centroid"` for documentation — **not conditions at every point**. V1.5 does not refetch weather per Scout Spot.

## Distance

When two or more plan Scout Spots have locations, the card may show **Approx. straight-line sequence** plus per-leg **straight-line distance**. Never hiking, driving, trail, or route distance.

## Create workflow

1. Open the map. Search Areas do not need to be on. Today does not need to be rated.
2. More → Hunt Plans → Create Hunt Plan, or Scout Spots → Create Hunt Plan.
3. Tap Scout Spot markers to select (gold ring, not Plan/Checked/Revisit color).
4. Create Hunt Plan → name → save.
5. The Hunt Plan card opens with numbered markers.

## Privacy

Private / local device data only. Export JSON remains a private field file (`waypoint-sheds-field-private-v1`) including `huntPlans`.

## Import / export

Legacy exports without `huntPlans` still import. Scout-only and observation-only payloads still import.

Merge-by-id. Reimport does not duplicate. Extra **new** plans past 40 are **skipped**, not counted as added. Malformed plans skip without destroying other records. Scout Spots import first, then Hunt Plans. Missing Scout Spot ids stay listed; they are not invented.

The import alert reports added / replaced / skipped for Hunt Plans, matching what persisted.

## Failure states

| State | Behavior |
| --- | --- |
| Corrupt storage | Empty list, no throw |
| Malformed import | Skipped; other records kept |
| Missing Scout Spot id | Shown as unavailable; not fabricated |
| Scout Spot deleted after plan creation | Id removed from plans |
| Zero Scout Spots in a plan | Card says none remain |
| One Scout Spot | Allowed; distance needs two locations |
| Today unavailable | Honest live copy |
| Storage quota | Honest error; nothing silent |
| Unknown status | Rejected; stored value stays Planned / Active / Completed |
| Caps | Honest refusal |

## Limitations

- No routing, navigation, or trail distance
- No cloud backup
- No automatic coupling of Hunt Plan status to Scout Spot status
- Numbered markers only while a plan is open
- Plan Today uses the session hunt pipeline, not a per-spot forecast

## Tests

- `automation/test-sheds-v1-5-hunt-plans.mjs`
- `automation/test-sheds-v1-5-map-mobile.mjs`

Generate the dedicated host locally with `node scripts/prepare-shed-hunting-host.mjs`. Do not publish.
