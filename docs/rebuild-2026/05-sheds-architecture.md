# 05 — Sheds Architecture

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [01-product-vision.md](./01-product-vision.md), [02-information-architecture.md](./02-information-architecture.md)

---

## Product definition

**Sheds** is Waypoint’s **wildlife / shed-hunting field companion**: **mapping, conditions in context, and observations** — ethical, privacy-first, map-first.

Soul: help someone search well in real terrain. Not photography craft. Not a customizable widget dashboard.

---

## Relationship to existing code (research snapshot)

Today’s tree (reference for rebuild planning — not binding IA):

| Path | Role today |
|------|------------|
| `apps/shed-hunting/` | Product root |
| `apps/shed-hunting/map/` | Primary map workspace |
| `/map/` | Historical redirect toward Sheds map |
| `docs/SHEDS-FIELD-EXPERIENCE-V1.md` et al. | Prior field UX direction (historical; useful lessons) |
| WOS (`docs/WAYPOINT-OBSERVATION-STANDARD.md`) | Shared observation schema |

Prior Sheds work established: full-screen map, FAB rail, Today’s Search bottom sheet, GPS honesty, heat/priority layers, outdoor contrast. Rebuild architecture **keeps the map-first soul** and may redesign chrome/data freely — it does not import Outdoor OS briefing IA.

---

## Product job

When someone opens Sheds they should think: *“This feels like a real outdoor field map for shed hunting.”*

Primary jobs:

1. **See terrain** clearly (basemap + overlays that do not erase the land)
2. **Know where I am** (GPS with honest denial, timeout, accuracy)
3. **Read conditions in place** (field briefing over the map — observational)
4. **Log observations** quickly and privately
5. **Learn seasonality and ethics** without turning the map into a classroom homepage

---

## Surfaces

```
┌──────────────────────────────────────────────┐
│ MAP (absolute full-viewport product)         │
│  · basemap + overlays                        │
│  · locate / track / accuracy                 │
│  · floating FAB rail                         │
│  · optional brand chip / status              │
│  · bottom sheet: field briefing / search     │
└──────────────────────────────────────────────┘
        │
        ├── Layers / model controls
        ├── Observation capture
        ├── Notes / session
        └── Education / ethics (secondary routes or sheets)
```

Marketing/landing pages may exist; **start-here for the product is the map**.

---

## Map-first principles

1. **The map is the product** — chrome floats; it does not stack the map into a webpage column.
2. **Terrain readability wins** — overlay opacity defaults conservative; heat deferred until useful.
3. **Glove-friendly targets** — large FABs; short labels.
4. **Honest GPS** — denial memory, timeout survivable, accuracy visible; never fake a fix.
5. **Offline honesty** — banner when tiles/providers fail; no dark empty hole without explanation.
6. **Ethics** — demo zones and private observations; no encouragement of illegal access or harassment of wildlife.

---

## Field briefing (not Dashboard Today Outside)

Sheds may show a **Today’s Search / field briefing** sheet:

- Confidence and direction/distance when a model suggests effort areas — labeled as model/estimate
- Conditions that matter *for this search* (snow cover proxies, wind, access notes — as available)
- Observational voice — not Outdoor OS “Do this” homework
- Collapsed peek vs expanded detail so the map stays usable

This sheet **must not** become a port of Dashboard’s widget workspace or Outdoor OS Happening/Matters/Do stack.

---

## Observations

- Fast path: few taps to drop a private note/find
- Shape toward **Waypoint Observation Standard (WOS)** for interoperability
- Local-first; sharing explicit later
- Photos optional (historical debt: photo attach may still be deferred — plan honestly)
- Provenance and confidence over false precision

Dashboard does not own Sheds observation IA. Scenes does not own wildlife finds.

---

## Conditions & intelligence

Sheds **consumes** outdoor conditions and habitat models as **map context**:

| Input | Use |
|-------|-----|
| Weather / season | Field briefing + layer hints |
| Habitat / land cover | Priority wash, legends |
| User finds / heat | Session and historical effort (privacy-respecting) |
| GPS | Locate, track, accuracy circle |

Prediction and teaching layers must disclose uncertainty. No black-box certainty theater.

---

## Layers & controls (baseline)

- Basemap switch (e.g. OSM / topo) with reliable defaults
- Habitat / priority opacity
- Heat / effort (compute on demand; status visible)
- Personal pins / notes visibility
- Legend with honest coverage limits

---

## Cross-product rules

| From Sheds | Allowed | Forbidden |
|------------|---------|-----------|
| → Dashboard | Deep link for richer instruments | Embedding Dashboard workspace as Sheds home |
| → Scenes | Rare (e.g. field photography ethics) | Photo Coach as primary Sheds flow |
| ← Dashboard | Link “Open map” | Dashboard hosting the shed map as a widget home |

---

## Performance

- First paint: map shell + basemap ASAP; overlays progressive
- Coarse-first elevation/habitat where prior art proved valuable
- Abort expensive computes on navigation away
- Mobile outdoor: contrast, landscape peek, battery-aware refresh where practical

---

## Accessibility

- FAB and sheet focus order
- Non-color legend encodings where possible
- Reduced motion for sheet animation
- Screen reader names for map controls (map canvas limitations disclosed honestly)

---

## Explicit non-goals

- Becoming Dashboard (widgets) or Scenes (coaching)
- Social hunt feeds or public competitive leaderboards
- Silent tracking or forced accounts
- Guaranteeing finds or fabricating habitat certainty
- Reviving Outdoor OS as Sheds presentation law
