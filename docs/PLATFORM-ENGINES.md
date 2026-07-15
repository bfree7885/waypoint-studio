# Waypoint Studio — Shared Platform Engines

**Status:** Architectural vision (planned capabilities)  
**Last updated:** 2026-07-15  
**Do not confuse with shipped features.** Engines listed as *planned* have no runtime implementation unless noted elsewhere.

Waypoint Studio grows as a set of **shared intelligence engines** that applications can eventually query. Engines are not standalone consumer apps. They are reusable capabilities that keep products honest, consistent, and free of duplicated domain logic.

---

## Design philosophy

- **Understand first, recommend second** — engines explain environments; they do not invent certainty.
- **Observation over engagement** — no rankings, follower graphs, or viral incentives.
- **Honest availability** — missing data is labeled Unavailable; planned work is labeled Planned.
- **Private by default** — personal observations and logs stay local unless the user opts in.
- **Educational situational awareness** — for individuals, hobbyists, homelabs, and small groups — not enterprise SOCs, not surveillance products.

---

## Engine map (evolving)

| Engine | Status | Purpose (one line) |
|--------|--------|--------------------|
| Outdoor Intelligence | Active foundation | Regional weather, light, trails, stewardship context |
| Species Knowledge (WSKB) | Active foundation | Shared species and habitat literacy |
| Phenology / Regional Intelligence | Active foundation | Seasonal timing and regional slices |
| Mapping / Observation Platform (WOS) | Active foundation | Places, notes, research-grade observations |
| Photo Intelligence | Active / evolving | Careful looking, craft feedback, visual scenes |
| **Landscape Interpretation** | **Planned** | Why a landscape looks the way it does |
| **Signal Intelligence** | **Planned** (home: SignalTerrain) | Reading RF and cyber environments calmly |

Exact boundaries may shift; this list is the account of intent.

---

## Landscape Interpretation (planned)

### Purpose

Help people understand **why a place looks the way it does** — ecology, geology, water, succession, and land-use history — so Fieldry notes, Sheds walks, ForageCast seasons, Dashboard context, and Scenes photographs gain deeper place literacy.

### Future users

Naturalists, photographers, foragers, shed hunters, educators, and anyone trying to read habitat transitions with humility.

### Possible future inputs (none wired yet)

Historical aerials · historic maps · topography · geology · soils · watersheds · forest succession · old farm fields · stone walls · logging history · glaciation · wetlands · habitat edges

### Example insight vocabulary (illustrative only)

Former pasture · old orchard · historic logging · beaver influence · floodplain · young forest · mature forest · successional habitat · ancient shoreline · glacial deposit

### Planned relationships

| Application | Relationship |
|-------------|--------------|
| Dashboard (Studio) | Regional “how this land was shaped” context |
| Fieldry | Observation place literacy |
| ForageCast | Habitat and succession framing |
| Sheds | Winter cover / edge / land-history context |
| Waypoint Scenes | Photographing and understanding place |

**No UI, layers, or APIs are shipped for this engine in this documentation step.**

---

## Signal Intelligence (planned / SignalTerrain home)

### Purpose

Help people observe **invisible environments** — radio-frequency space and everyday cyber situational awareness — with clarity, privacy, and education.

SignalTerrain is the primary product home. Signal Intelligence is the shared capability framing (RF + Cyber), not a second navigable product.

### Capability groups

#### RF Intelligence (radio / spectrum)

Examples for future work: SDR · NOAA · Amateur Radio · ADS-B · AIS · satellites · spectrum monitoring · signal logging

Aligns with SignalTerrain’s existing foundation (receivers, incidents, private audio).

#### Cyber Intelligence (educational awareness)

Examples for future work: CVE tracking · advisory digests · campaign awareness · ransomware news literacy · vulnerability prioritization hints · vendor advisories · patch reminders · ISP outage notes · DNS incidents · BGP disruption notices · a calm security-awareness dashboard

**Not an enterprise SOC.** Not threat hunting for hire. Not surveillance of people. Aimed at individuals, hobbyists, homelabs, and small organizations who want clearer situational awareness.

### Planned relationships

| Application | Relationship |
|-------------|--------------|
| SignalTerrain | Primary consumer and UI home |

Other studio apps do not currently claim Signal Intelligence surfaces.

**Cyber Intelligence and expanded RF services remain Planned — do not advertise them as available.**

---

## How engines relate to products

```
Shared engines (query / compose)
        │
        ├── Outdoor Intelligence ──► Dashboard, kiosk, apps
        ├── Species Knowledge ──► Fieldry, ForageCast, Sheds, …
        ├── Landscape Interpretation (planned) ──► Dashboard, Fieldry, ForageCast, Sheds, Scenes
        ├── Signal Intelligence (planned) ──► SignalTerrain
        ├── Photo Intelligence ──► Scenes / Photo Coach
        └── Observation / Mapping ──► Fieldry and field apps
```

Registry keys live in `design-system/ecosystem/product-registry.json` under `sharedEngines` for future expansion.

---

## See also

- [PLATFORM-ARCHITECTURE.md](PLATFORM-ARCHITECTURE.md)
- [UNIFIED-PLATFORM.md](UNIFIED-PLATFORM.md)
- [SIGNALTERRAIN_PLAYBOOK.md](SIGNALTERRAIN_PLAYBOOK.md)
- [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md)
