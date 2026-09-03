# ShedHunting.org V1.8 — Hunt History

**Status:** merged to Studio `main` (`62a81e8b`). Dedicated-host artifact can be prepared with `scripts/prepare-shed-hunting-host.mjs`. Do **not** run `scripts/publish-shed-hunting-host.mjs` unless the owner publishes ShedHunting.org. Do not implement the V2.x dynamic search-priority map in V1.8.

V1.1–V1.2 answer **Should I go today?** and **what are conditions like?** V1.3 **Where should I look?** V1.4 **Save candidate places.** V1.5 **Plan the search.** V1.6 **Work the plan in the field.** V1.7 **Record where I searched and what I observed.** V1.8 **Remember my hunts.**

## Product purpose

The product question is:

**Where have I already searched, and what happened there?**

Hunt History makes durable V1.7 Hunt Records useful to the hunter. After several hunts they should be able to answer, from **recorded facts only**:

- Where have I searched?
- When did I search it?
- How far did I search?
- How long was I out?
- What did I observe?
- Where did I find sheds?
- Which Hunt Plan did this come from?
- What areas have I recorded searching more than once (by looking at tracks)?
- What areas have I not recorded searching (by absence of tracks — never inferred as “empty of sheds”)?

Do not infer answers that are not supported by recorded data.

This increment is a bridge toward the flagship V2.x **dynamic shed search-priority heat map**. V1.8 does **not** implement that map.

## Hunt History UX

Open **Hunt History** from More on the Shed Hunting map (`#btn-history`). History is for reviewing previous hunts. It is not on the Field Hunt HUD.

The sheet lists **completed** Hunt Records, newest-first (`finishedAt`, then `startedAt`).

Each summary shows, when recorded:

- date
- Hunt Plan name snapshot
- hunt duration
- searched distance
- observation count
- Shed Found count

Honest unavailable states:

| Missing fact | UI |
| --- | --- |
| No date timestamps | Date unavailable |
| No start or finish time | Unavailable |
| No duration | Unavailable |
| No GPS track / no accepted distance | No GPS track / Unavailable |
| No observations | 0 observations |
| No Shed Found | 0 Shed Found |

Empty state (not an error):

**No hunts recorded yet** — Finish a Field Hunt to build your private Hunt History.

A collapsed **Earlier search sessions** section keeps the pre-V1.7 Start Search dump. That is a different, older session log — not Hunt Records.

## Hunt Detail

Selecting a hunt opens Hunt Detail (`#sheet-hunt-detail`):

- date, start time, finish time, duration
- searched distance
- Hunt Plan name snapshot
- observation list and Shed Found count

Hunt Track on the map when accepted points exist. Mapped observations only when coordinates were recorded. Unmapped observations still appear in the list with **Not mapped — no invented position**.

Semantic distinction (unchanged from V1.7):

| Term | Meaning |
| --- | --- |
| Hunt Track | Device-reported travel |
| Observation | Hunter-entered field evidence |
| Shed Found | Hunter-reported shed evidence |

Historical records are not predictions.

## Historical map view

**Show on map** / **Hide from map** displays a finished Hunt Track as **previous search**. Multiple finished tracks may be shown together.

They represent only:

**Places I have recorded searching.**

They do **not** mean:

- fewer sheds because the area was searched
- more sheds because the area was searched
- a probability surface
- a heat map

Visual rules:

- Historical tracks: muted sage `#6d7a6c`, weight 2, opacity ~0.42, class `sheds-history-track`
- Live Field Hunt track: sand/olive `#b89a62`, weight 3, opacity ~0.78, class `sheds-hunt-track`
- History layers are added **under** the live hunt layers so an active Hunt Track stays distinguishable

No blurring, no density raster, no “heat score.”

## Observations and Shed Found history

The **Shed Found** tab lists hunter-reported finds from finished Hunt Records, newest-first.

Preserved facts only:

- timestamp
- hunt relationship (Hunt Record id + Hunt Plan name snapshot)
- coordinates if recorded
- note if recorded

Not added in V1.8: species inference, antler score, size/age inference, trophy ranking, AI identification, or other fake metadata.

Unmapped finds stay in the list without a map pin.

## Storage architecture

**Decision: keep localStorage.** Do not migrate to IndexedDB in V1.8.

Reasoning:

- Canonical key remains `waypoint-sheds-hunt-records-v1` (schemaVersion 1).
- History UI does not change the write path introduced in V1.7.
- A typical origin quota (~5 MB) still holds a season of capped records.
- Photos, offline map tiles, multi-season archives, and native apps are still out of scope.

V1.8 adjustment (not a migration): `MAX_RECORDS` **12 → 24**. Same key, same normalize/import path. Oldest **finished** records may still be dropped only to make room for a new successful save, with the existing warning. Quota failure still refuses the write and does not discard the in-progress hunt.

Caps otherwise unchanged: 1,800 track points and 80 observations per record.

### Technical debt and migration trigger

IndexedDB (or equivalent) remains **documented debt**. Migrate when one of these is true — not for elegance:

1. Users regularly hit the 24-record cap or localStorage quota warnings during Finish Hunt.
2. Later increments add photos or other binary field evidence. V1.9 Condition Snapshots are compact JSON (~1–2 KB) and did not trigger this migration.
3. Offline basemap/pack caching needs the same origin storage budget.
4. Multi-season history becomes a product requirement beyond a bounded recent set.
5. Native apps need a shared local database.

Any future migration must be backward-compatible: read `waypoint-sheds-hunt-records-v1` (and V1.4–V1.6 Scout Spot / Hunt Plan / Search Area keys) and **never silently drop** private field data.

## Privacy

All Hunt History is **private local user data**.

Do not send Hunt Tracks, Scout Spots, observations, Shed Found locations, Hunt Plans, or Hunt Records to Waypoint, GitHub, analytics, telemetry, or another first-party service.

Existing third-party map/weather/elevation requests may remain (Esri tiles, Open-Meteo).

V1.8 does not add cloud sync, accounts, or social sharing.

## Field JSON

Format remains `waypoint-sheds-field-private-v1`.

- V1.8 reads the same durable Hunt Records V1.7 exports.
- Existing V1.7 exports import.
- Older exports without `huntRecords` still import.
- Hunt Records survive export/import.
- Same `huntRecordId` replaces; it does not duplicate.
- IDs stay stable where present.
- Active Hunt Session and in-progress Hunt Activity stay **excluded**.

No schema bump. Unknown fields such as `heatScore` / predicted probabilities are **dropped** on normalize so derived intelligence cannot hide inside facts.

## Deletion

Individual Hunt Record deletion is implemented.

- Deliberate confirm: “Delete this Hunt Record from this device? Scout Spots and Hunt Plans are kept. This cannot be undone.”
- Removes only that record from `waypoint-sheds-hunt-records-v1`.
- Does not delete Scout Spots or Hunt Plans.
- Clears that hunt from the historical map overlay and returns to Hunt History.

No trash, archive, or versioning.

## Relationship to V1.7

V1.8 does **not** create a parallel history system. Canonical source is `WaypointShedsHuntRecords` / `waypoint-sheds-hunt-records-v1`.

V1.7 Hunt Track, observations, Finish Hunt persist-then-clear, and field JSON behavior are unchanged except the finished-record cap (24).

## Relationship to the future dynamic heat map

**Do not implement the heat map in V1.8.**

Hunt Records keep raw facts later intelligence can consume:

- timestamps
- coordinates
- track points (device-reported)
- observations
- Shed Found
- Hunt Plan name snapshot
- searched distance when available

Facts stay separate from future derived intelligence. Do **not** store:

- predicted shed probability
- magic heat score
- likely deer location

A future V2.x search-priority map may change with season, weather, snow/melt, freeze/thaw, terrain, slope, aspect, solar exposure, elevation, land cover, access/searchability, and the hunter’s **private** historical search effort and finds. That map must still never claim sheds or deer are present.

## Data provenance / licensing architecture

V1.8 does not sell data, upload private hunter data, or add user-data monetization.

Keep these classes distinct:

| Class | Examples | V1.8 rule |
| --- | --- | --- |
| **A. Third-party source data** | Weather, terrain, land cover, government GIS, snow products, property/access | Track source/provenance/license when new datasets are introduced. Existing Esri / Open-Meteo requests stay. |
| **B. Sheds-derived data** | Future proprietary search-priority intelligence | Not generated from Hunt History in V1.8. Must not embed private GPS. |
| **C. Private user data** | Scout Spots, Hunt Plans, Hunt Tracks, observations, Shed Found, Hunt Records | Private by default. Not licensable. |
| **D. Future opt-in aggregated data** | Contributor program | Requires explicit consent and privacy/legal design. Not assumed. |

Long-term commercial possibility: Sheds+ subscription **plus** licensing of legitimate Sheds-created/derived datasets and APIs — never silent licensing of private hunter records.

## Non-goals (do not implement in V1.8)

- dynamic heat map
- shed prediction
- AI shed detection
- photos
- cloud accounts / cloud sync
- social sharing, leaderboards, gamification
- routing / turn-by-turn navigation
- native iOS / Android apps
- subscription / paywall
- B2B data sales
- user-data aggregation
- giant redesign

V1.8 is Hunt History. Make that one thing excellent.
