# Dashboard Ambient

**Status:** Phase 1.5 implemented (local snapshot history + deterministic change detection). Not billed. Not a standalone app.  
**Route:** `#/ambient` on `/apps/dashboard/`  
**Canonical plan:** `docs/DASHBOARD-AMBIENT-PHASE-0.md`  
**Discover (unchanged):** `docs/DASHBOARD-DISCOVER.md`

Ambient is a **Dashboard mode**. It answers, at a glance:

> What is happening around me, what is changing, and what is worth my attention?

Pricing intent ($4.99/month) remains documentation-only. Phase 1.5 does not implement accounts, Stripe, gating, radio, AI, or cloud history.

---

## Hierarchy

| Region | Question | Sources (existing production only) |
|--------|----------|-------------------------------------|
| **NOW** | Conditions around me | Hydrated Open-Meteo / NWS recovery, daylight, moon |
| **DEVELOPING** | What is changing / worth notice | Happening Now, NWS alerts, natural-events catalog, **plus local snapshot comparison** |
| **OPPORTUNITIES** | Outdoor attention | Sky intelligence for photography / night sky; foraging and Sheds stay **Unknown** until a validated Dashboard path exists |

Quiet days stay calm. Missing, stale, or incomplete data is labeled waiting / cached / unknown — never filled with invented scores. Meaningful local changes surface in DEVELOPING; trivial numerical jitter does not.

---

## AmbientSnapshot

The UI does not bind to individual APIs. `WDS.dashboardRebuildAmbientSnapshot.compose(platform, place, now)` builds a normalized snapshot:

```text
AmbientSnapshot
  schemaVersion    1
  capturedAt       ISO timestamp
  place            label, lat, lng, timezone, trust, source
  conditions       status, summary, temperatureF, apparentTemperatureF,
                   windMph, precipChancePct, precipitating, daylight, moon
  developing       state (quiet | attention | urgent | unknown), headline, items[]
  opportunities    domain, status (ready | unknown), headline, detail, level, sourceId
  signals          flat list (happening + events)
  sources          id, label, trust, usedFor[]
  meta             weatherLive, stale, history, changeDetection
```

Composer rules:

- No network. Reads the already-hydrated rebuild `platform` package.
- Foraging / Sheds: `status: "unknown"` (no ForageCast or Sheds scoring imported).
- Composer `meta.history` / `meta.changeDetection` stay false. The shell sets those flags after local history + the change engine run.

Renderer: `WDS.dashboardRebuildAmbient.render(snapshot)`.

---

## Phase 1.5 flow

```text
existing production sources
        ↓
existing Dashboard intelligence
        ↓
AmbientSnapshot.compose   (no network)
        ↓
local IndexedDB history   (this device only)
        ↓
deterministic diff        (no LLM)
        ↓
decorate DEVELOPING
        ↓
Ambient UI
```

Comparison never calls Open-Meteo, NWS, or any other upstream. It only reads two already-composed snapshots.

---

## Persistence

| | |
|--|--|
| **Engine** | IndexedDB `waypoint-ambient-history-v1`, object store `snapshots` |
| **Record version** | `recordVersion: 1` wrapping AmbientSnapshot `schemaVersion: 1` |
| **Trigger** | Successful Ambient compose/paint (hydrate or the existing ~5 minute Ambient refresh). Not a 1-second poll. |
| **Throttle** | Identical fingerprint for the same place: at most one write per **15 minutes** (heartbeat). |
| **Material writes** | Fingerprint change (weather, alerts, daylight state, opportunities) persists immediately. |
| **Dedupe** | Same placeKey + fingerprint inside the heartbeat window is skipped. |
| **Retention** | **36 hours** and a hard cap of **72** records. Oldest dropped first. |
| **Failure** | Missing IndexedDB, quota errors, malformed or obsolete records fail open. Ambient still renders. |

Stored record:

```text
id, recordVersion, schemaVersion, capturedAt,
placeKey, placeLabel, timezone, fingerprint, snapshot
```

Malformed, wrong `recordVersion`, or obsolete snapshot schema is ignored for comparison and pruned. It does not break Ambient.

### Geographic data persisted

Not a location-history product.

- **placeLabel** (display name, e.g. Pike County, PA)
- **timezone**
- **placeKey** — ~0.05° cell (~5.5 km) plus timezone (`geo:41.35,-75.05|America/New_York`)
- **lat/lng inside the stored snapshot** — rounded to that same cell

Precise GPS is not accumulated as a movement trail. Snapshots whose placeKeys differ are never compared.

---

## Reference window

Phase 1.5 is not a time-series query UI. One strategy:

1. Same `placeKey`, valid schema, at least 60 seconds older than current.
2. Prefer the snapshot nearest **3 hours ago** (±90 minutes). That supports “since this afternoon” without a query language.
3. Else the latest snapshot at least **15 minutes** old.
4. Else the latest snapshot at least **2 minutes** old (so a 5-minute Ambient refresh can start talking).
5. If none of those exist: **Building recent context**. No fake changes.

---

## Change engine

`WDS.dashboardRebuildAmbientChanges.diff(previous, current)` → `{ status, referenceCapturedAt, windowLabel, items[] }`.

Statuses: `warming` · `quiet` · `changed` · `incomparable` · `unavailable`.

### Materiality rules

| Signal | Rule | Why |
|--------|------|-----|
| Temperature | Both snapshots have live/cached weather **and** numeric °F on both sides, **and** \|Δ\| ≥ **4°F** | 1°F is sensor/diurnal noise. 4°F is enough to notice or dress for. 43°F → 34°F fires; 34.0 → 33.8 does not. |
| Apparent temperature | \|Δ\| ≥ **5°F** only when temperature itself did not already fire | Avoids a second line for the same cold snap; still catches wind-chill arrival. |
| Wind | \|Δ\| ≥ **8 mph**, **or** either side crosses **18 mph** (Happening Now breezy gate) | 6 → 7 is noise. 6 → 22 is a real shift. Crossing breezy still matters even if Δ is smaller. |
| Precipitation | `precipitating` boolean flip, or chance crosses **50%** with \|Δ\| ≥ **25** | Beginning/ending rain is a state change. 10% → 15% is not. |
| Weather text | Wet/hazard class only (rain / snow / thunder / fog), not cloudy vs partly cloudy | Condition-string churn is not intelligence. |
| Alerts | Event-name add/remove **only when both snapshots have live NWS trust** | Source failure is not resolution. UNKNOWN is not NONE. |
| Daylight | `day` ↔ `night` only | Remaining-until-sunset is clock progression, not a change. Civil twilight is deferred until the daylight package exposes it. |
| Opportunities | Photography / astronomy only. Level rank change ≥ **2** steps, and **weatherLive on both sides**. Unknown from a failed weather source is not “opportunity ended.” | Foraging and Sheds stay UNKNOWN. Fake precision is forbidden. |

Missing value on the current side is never a drop to 0. A previously known alert is never “ended” because alerts could not load.

When the placeKey changes, status is `incomparable` and DEVELOPING starts a new local context instead of inventing a 25°F drop.

---

## DEVELOPING copy

| History state | What the user sees |
|---------------|--------------------|
| No comparable history | **Building recent context** — unless an official alert is already active, which still shows. |
| History, nothing material | Phase 1 quiet: **Nothing important is developing.** |
| Material changes | Top change (or current urgent alert) as the headline; `Changed since 3:12 PM` as the lede; at most four items. Not a raw changelog. |

NOW and OPPORTUNITIES are unchanged aside from additive condition fields on the snapshot.

---

## Display

Designed for a future 24/7 dedicated screen: large type, high contrast, three regions, calm when quiet, elevated when urgent. At roughly 1280×720 and up, primary information is intended to fit without scrolling. Smaller viewports stack NOW → DEVELOPING → OPPORTUNITIES.

Refresh while Ambient is open reuses the existing Outdoor Intelligence refresh (~5 minutes). Snapshot comparison does not add weather requests.

---

## Out of scope (still)

Stripe, auth, subscriptions, paid gating, radio / SDR / Node, LLM query, cloud history, cross-device sync, new weather providers, standalone Foraging or Radio apps, Discover redesign, production deploy of a billed product.
