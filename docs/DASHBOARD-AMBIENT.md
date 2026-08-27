# Dashboard Ambient

**Status:** Phase 1 shell implemented. Not billed. Not a standalone app.  
**Route:** `#/ambient` on `/apps/dashboard/`  
**Canonical plan:** `docs/DASHBOARD-AMBIENT-PHASE-0.md`  
**Discover (unchanged):** `docs/DASHBOARD-DISCOVER.md`

Ambient is a **Dashboard mode**. It answers, at a glance:

> What is happening around me, what is changing, and what is worth my attention?

Pricing intent ($4.99/month) remains documentation-only. Phase 1 does not implement accounts, Stripe, gating, radio, AI, history, or change detection.

---

## Hierarchy

| Region | Question | Sources (existing production only) |
|--------|----------|-------------------------------------|
| **NOW** | Conditions around me | Hydrated Open-Meteo / NWS recovery, daylight, moon |
| **DEVELOPING** | What is changing / worth notice | Happening Now, NWS alerts, natural-events catalog |
| **OPPORTUNITIES** | Outdoor attention | Sky intelligence for photography / night sky; foraging and Sheds stay **Unknown** until a validated Dashboard path exists |

Quiet days stay calm. Missing, stale, or incomplete data is labeled waiting / cached / unknown — never filled with invented scores.

---

## AmbientSnapshot

The UI does not bind to individual APIs. `WDS.dashboardRebuildAmbientSnapshot.compose(platform, place, now)` builds a normalized snapshot:

```text
AmbientSnapshot
  schemaVersion    1
  capturedAt       ISO timestamp
  place            label, lat, lng, timezone, trust, source
  conditions       status, summary, temperatureF, wind, precip, daylight, moon
  developing       state (quiet | attention | urgent | unknown), headline, items[]
  opportunities    domain, status (ready | unknown), headline, detail, level, sourceId
  signals          flat list (happening + events) for later snapshot(t-1) → snapshot(t)
  sources          id, label, trust, usedFor[]
  meta             weatherLive, stale, history: false, changeDetection: false
```

Composer rules:

- No network. Reads the already-hydrated rebuild `platform` package.
- Foraging / Sheds: `status: "unknown"` in Phase 1 (no ForageCast or Sheds scoring imported).
- Milky Way / aurora remain unavailable via sky intel; night photography uses moon + cloud when weather is live.
- `meta.history` / `meta.changeDetection` stay false until Phase 3.

Renderer: `WDS.dashboardRebuildAmbient.render(snapshot)`.

---

## Display

Designed for a future 24/7 dedicated screen: large type, high contrast, three regions, calm when quiet, elevated when urgent. At roughly 1280×720 and up, primary information is intended to fit without scrolling. Smaller viewports stack NOW → DEVELOPING → OPPORTUNITIES.

Refresh while Ambient is open reuses the existing Outdoor Intelligence refresh (~5 minutes). That is a tab-open display, not cloud watching.

---

## Out of scope (still)

Stripe, auth, subscriptions, paid gating, radio / SDR / Node, LLM query, snapshot persistence, change detection, new weather providers, standalone Foraging or Radio apps, Discover redesign, production deploy of a billed product.
