# ShedHunting.org V1.9 — Condition Snapshots

**Status:** Studio branch implementation. Do **not** merge, deploy, or publish the dedicated host from this increment unless the owner asks. May run `scripts/prepare-shed-hunting-host.mjs`. Do **not** run `scripts/publish-shed-hunting-host.mjs`. Do not move tag `legacy-terrain-intelligence-2026-03-10`.

V1.1–V1.2 answer **Should I go today?** and **what are conditions like?** V1.3 **Where should I look?** V1.4 Scout Spots. V1.5 Hunt Plans. V1.6 Field Hunt. V1.7 Hunt Track / observations / Hunt Records. V1.8 Hunt History. V1.9 records **what the conditions were** when a hunt happened.

## Product purpose

The product question is:

**When this hunt happened — or when Sheds evaluates an area — what were the actual environmental conditions?**

A Condition Snapshot is a compact factual record for a **real location and time**. It is the data foundation for a later V2.x dynamic search-priority map. V1.9 does **not** build that map.

Facts first. No shed probability, heat-map score, likely shed coordinate, likely deer location, guaranteed search result, or hidden magic number.

## Architecture

Modules (not map-UI internals):

| Layer | Module | Job |
| --- | --- | --- |
| Acquisition | `WaypointShedsConditionService` + existing `WaypointShedsWeather.fetchForecast` | Request Open-Meteo forecast for a lat/lng/time |
| Normalization | `WaypointShedsWeather.parseForecast` → `WaypointShedsConditionSnapshot.fromWeatherPackage` | Named fields, units, unavailable vs measured |
| Derived environmental facts | freeze/thaw + measured-snow classification already in weather | Evidence stored beside the classification |
| Future search-priority | **not implemented** | V2.0 |

Future V2.0 call shape (already the V1.9 API):

```js
WaypointShedsConditionService.getConditionSnapshot({ lat, lng, time })
```

The service never rejects. Callers must not block Start Hunt or Finish Hunt on it.

Conceptual pipeline to preserve:

Raw inputs → normalized facts → derived environmental facts → **future** search-priority model → **future** dynamic map visualization.

Do not collapse these into one opaque score in V1.9.

## Capture choice (Hunt Records)

Smallest useful model: **one `conditionSnapshot` captured around hunt start**.

| Option | Decision |
| --- | --- |
| `startConditions` + `finishConditions` | Rejected — extra network, little extra honesty for a walk of typical length |
| Map-center substitute when GPS is missing | Rejected — that invents hunt location |
| Finish-time refetch | Rejected — hunt must finish offline; start is the search-time context |

Behavior:

1. On Start Hunt, if GPS is absent, store an unavailable snapshot with `acquisition.status = "no-location"`. Conditions are not invented from the map center.
2. On the first accepted Hunt Track point, retry once while the snapshot is still `no-location`.
3. If Today’s Hunt weather is already `ready`, was fetched for **GPS** (never map-center), and is within **0.01° (~1.1 km)** of hunt GPS, pass it as `weatherPackage` (no second Open-Meteo call). A looser 0.5° window would attach conditions from an inappropriate location.
4. Otherwise fetch via the existing forecast query, 8 s timeout, 10-minute in-flight / last-ok de-dupe at 4-decimal lat/lng.
5. An `ok` snapshot is never overwritten.
6. Finish Hunt does **not** wait on weather. If the request has not completed, the Hunt Record still saves (placeholder unavailable, or whatever was already stored).

## Schema (`kind: "condition-snapshot"`, `schemaVersion: 1`)

Identity: `id`, `schemaVersion`, `kind`, `createdAt`, `validAt`, `captureContext` (`hunt-start` | `on-demand`), `dataClass: "sheds-derived-facts"`, `privacy: "private-local"`.

Location: `{ lat, lng }` only when coordinates pass validation. Never repaired. Invalid or missing → no location object.

`acquisition`: `status` (`ok` | `unavailable` | `offline` | `timeout` | `malformed` | `invalid-coordinate` | `no-location`), `reason`, `provider`, `fetchedAt`, `dataset`.

`facts` (provider/measured; `null` + flags when unknown):

- `airTemperatureC`
- `recentMinTemperatureC` / `recentMaxTemperatureC`
- `precipitationMm24h` / `precipitationNowMm`
- `snowfallSumCm` — Open-Meteo `snowfall_sum` (cm of snowfall). **Not depth.**
- `snowDepthM` + `snowDepthKnown` — measured `snow_depth` (meters) only
- `windSpeedMs`
- `temperatureTrendStatus` / `temperatureTrendDeltaC` / `temperatureTrendLookbackHours`

`derived` (classification, not search priority):

- `freezeThaw`: `classification`, `freezeThawOccurred`, `nightMinC`, `dayMaxC`, `deadbandC`, `evidenceSource` (`hourly` | `daily`), `ruleId: "overnight-min-daytime-max-deadband-1C"`
- `snowCover`: `status` from measured depth only, `depthM`, `ruleId: "measured-snow-depth-only"`

`season`: `localDate`, `month`, `dayOfYear`, `phaseId`, `phaseLabel`, `phaseRule`. Phase comes from `WaypointShedsTiming.evaluate` (regional photoperiod heuristic, **not** a cast date).

`terrain`: optional `elevationM` from **device GPS altitude already on hand**. No extra Open-Meteo elevation fetch at hunt start. No Search Areas grid copy. Slope/aspect stay unset unless already supplied.

`provenance`: weather = `open-meteo-forecast`; elevation = `device-gps-altitude-if-present`; season = `sheds-timing`.

Hourly arrays are **not** stored. Compact facts only.

## Source vs derived

| Class | Examples in V1.9 |
| --- | --- |
| Third-party source | Open-Meteo air temperature, precipitation, snowfall_sum, snow_depth, wind |
| Sheds-derived facts | freeze/thaw classification; snow-cover class of **measured** depth; seasonal phase heuristic |
| Private user data | Hunt Record, snapshot attachment, GPS altitude |
| Future opt-in aggregate | not implemented |

`freezeThawOccurred` is a derived **environmental** fact. It is not search priority.

## Snow depth

- Measured `snow_depth` (m) and `snowfall_sum` (cm) stay distinct.
- Missing depth → `snowDepthKnown: false`, `snowDepthM: null`, UI **Unavailable**.
- Explicit `0` is known bare ground.
- Never fill depth from precipitation or snowfall.
- Legacy weather field `snowMm` is snowfall in **cm**, not millimeters of depth.

## Freeze / thaw

Reuse `WaypointShedsWeather.deriveFreezeThaw`:

- `freeze_thaw` when overnight min ≤ −1 °C and daytime max ≥ +1 °C
- `below_freezing` / `above_freezing` / `near_freezing` / `insufficient`

Store evidence (`nightMinC`, `dayMaxC`, `deadbandC`, `evidenceSource`) separately from `freezeThawOccurred`.

## Hunt Detail

Compact **Conditions at hunt time** section on Hunt Detail only — not on History cards.

| Record | Copy |
| --- | --- |
| No `conditionSnapshot` (V1.7 / V1.8) | **Conditions not recorded.** This Hunt Record predates Condition Snapshots. |
| Snapshot present, no usable weather facts | **Conditions unavailable during this hunt.** Fields show **Unavailable**. Hunt Record remains valid. |
| Snapshot with facts | Temperature, recent min/max, snow depth (measured only), freeze/thaw, precipitation/snowfall, seasonal context |

Do not imply historical weather was recorded if the record predates V1.9. Do not fabricate backfill.

## Offline / failure

Field Hunt must work without network and without weather.

A failed environmental request must never prevent Start Hunt, observations, Finish Hunt, or Hunt Record persistence.

Statuses: offline, timeout, malformed, unavailable, invalid-coordinate, no-location.

## Storage decision

**Keep localStorage.** Same key: `waypoint-sheds-hunt-records-v1`. Cap remains **24**. No automatic IndexedDB migration.

Evidence (independent serialized JSON, 2026-09-03 review):

| Piece | Measured size |
| --- | --- |
| Condition Snapshot | ~1.6 KB |
| Small hunt (few points) | ~5–6 KB stored |
| Medium realistic hunt | ~35 KB stored |
| Large hunt | ~104 KB stored |
| Maximum hunt (1,800 points + 80 observations + snapshot) | ~183 KB JSON / ~189 KB stored |
| 24 maximum hunts (records key only) | ~4.54 MB |
| Typical origin (24 medium hunts + spots + GIS pack + SGL + in-progress activity) | ~0.50 MB |
| Heavy origin (24 maximum hunts + 80 spots + GIS pack + SGL) | ~4.84 MB of a typical 5.00 MiB / 5.24 MB quota (~0.40 MB remaining) |

Keep the **24-record cap**. Typical use is comfortable. Pathological 24×-max hunts leave a thin origin margin beside GIS pack and Scout Spots. V1.9 therefore **retries quota writes by dropping the oldest finished Hunt Record** and never drops the hunt being saved. If even that hunt cannot fit, the write is refused and Field Hunt stays in progress.

IndexedDB remains later debt for photos, offline tiles, or measured quota failure after this eviction path — not for this compact snapshot.

## Field JSON

Format remains `waypoint-sheds-field-private-v1`.

- V1.7 / V1.8 exports still import.
- V1.9 snapshots round-trip on Hunt Records.
- IDs stay stable; re-import replaces rather than duplicates.
- Transient Hunt Session and Hunt Activity are still excluded.
- Today’s Hunt weather cache is not exported unless it was copied into a durable Hunt Record snapshot.

## Privacy / network

Open-Meteo receives **only** latitude and longitude at 4 decimal places plus the existing forecast query fields.

Not sent: Hunt Record ID, Scout Spot ID, Hunt Plan, notes, Shed Found, track history, user identity.

`credentials: "omit"`. No first-party upload. No new analytics.

See `docs/sheds/SHEDS-DATA-PROVENANCE.md`.

## Future V2.0 interface

V2.0 should combine, as separate layers:

- terrain facts (Search Areas / elevation halo / slope / aspect)
- condition facts (this snapshot, or a fresh `getConditionSnapshot`)
- seasonal facts
- optionally private history facts (tracks, observations, Shed Found)

into a **documented** search-priority model. V1.9 leaves those layers unmerged.

## Future spatial heat-map readiness

Search Areas `evaluateGrid` already evaluates **per-cell terrain** from an Open-Meteo elevation halo.

Architectural blocker for a *dynamic spatial* map (not implemented):

- Today’s Hunt / Condition Snapshot weather is **one point**, not per cell.
- `evaluateGrid` currently accepts Today but **must not** change cell priority from it.
- V2.0 needs a way to evaluate conditions per area/cell/feature (aspect × snow × temperature, etc.). V1.9 does not add that evaluation.

## Explicit non-goals

Dynamic heat map · search-priority scoring on snapshots · proprietary shed probability · habitat/land-cover integration beyond existing packs · snow raster · satellite analysis · ML / AI prediction · cloud sync · accounts · paid tier · native apps · photos · crowdsourcing · B2B API · user-data monetization · giant redesign.

## Tests

- `automation/test-sheds-v1-9-condition-snapshots.mjs`
- `automation/test-sheds-v1-9-map-mobile.mjs` (320 / 375 / 390 / 430)
