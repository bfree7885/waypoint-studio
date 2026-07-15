# Waypoint Studio — Shared Platform Engines

**Status:** Architectural vision (planned capabilities)  
**Last updated:** 2026-07-15  
**Do not confuse with shipped features.** Engines listed as *planned* have no runtime implementation unless noted elsewhere. Landscape Interpretation and Signal Intelligence v0.1 add **schemas and docs only** — still not product UIs.

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
| **Landscape Interpretation** | **Architecture v0.1** (no runtime) | Why a landscape looks the way it does |
| **Signal Intelligence** | **Architecture v0.1** (no runtime) | Reading RF and cyber environments calmly |

Exact boundaries may shift; this list is the account of intent.

---

## Landscape Interpretation (architecture v0.1)

### Purpose

Help people understand **why a place looks the way it does** — ecology, geology, water, succession, and land-use history — so Fieldry notes, Sheds walks, ForageCast seasons, Dashboard context, and Scenes photographs gain deeper place literacy.

### Package

| Artifact | Path |
|----------|------|
| Engine doc | [LANDSCAPE-INTERPRETATION-ENGINE.md](LANDSCAPE-INTERPRETATION-ENGINE.md) |
| Integrations | [LANDSCAPE-INTERPRETATION-INTEGRATIONS.md](LANDSCAPE-INTERPRETATION-INTEGRATIONS.md) |
| Schemas / taxonomy / rules | `design-system/landscape-interpretation/` |

**No UI, maps, AI chat, or live evaluator.** Sample rule packs are educational contracts only.

### Future users

Naturalists, photographers, foragers, shed hunters, educators, and anyone trying to read habitat transitions with humility.

### Planned relationships

| Application | Relationship |
|-------------|--------------|
| Dashboard (Studio) | Regional “how this land was shaped” context |
| Fieldry | Observation place literacy |
| ForageCast | Habitat and succession framing |
| Sheds | Winter cover / edge / land-history context |
| Waypoint Scenes | Photographing and understanding place |

See the integrations doc for consumer rules and honesty checklists.

---

## Signal Intelligence (architecture v0.1 / SignalTerrain home)

### Purpose

Help people observe **invisible environments** — radio-frequency space and everyday cyber situational awareness — with clarity, privacy, and education.

SignalTerrain is the primary product home. Signal Intelligence is the shared capability framing (RF + Cyber + Infrastructure), not a second navigable product.

### Package

| Artifact | Path |
|----------|------|
| Engine doc | [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md) |
| Integrations | [SIGNAL-INTELLIGENCE-INTEGRATIONS.md](SIGNAL-INTELLIGENCE-INTEGRATIONS.md) |
| Schemas / taxonomy / attention | `design-system/signal-intelligence/` |

**No dashboards, live APIs, monitoring services, SDR interfaces, or cybersecurity tools.** Sample observation is educational only.

### Capability groups

#### RF Intelligence (radio / spectrum)

Examples for future work: SDR · NOAA · Amateur Radio · ADS-B · AIS · satellites · spectrum monitoring · signal logging · propagation

Aligns with SignalTerrain’s existing foundation (receivers, incidents, private audio).

#### Cyber Intelligence (educational awareness)

Examples for future work: CVE and advisory digests · campaign literacy · ransomware awareness · patch reminders · ISP/DNS/BGP notes

**Not an enterprise SOC.** Not threat hunting for hire. Not surveillance of people. Aimed at individuals, hobbyists, homelabs, and small organizations.

#### Infrastructure Intelligence

Examples for future work: internet/cloud/CDN status · GPS interference · space weather · cellular issues

### Planned relationships

| Application | Relationship |
|-------------|--------------|
| SignalTerrain | Primary consumer and UI home |
| Dashboard | Ambient environmental awareness (future) |
| Waypoint Scenes | Propagation / condition context (future) |
| Outdoor Intelligence | Weather / space-weather cross-links |
| Landscape Interpretation | Terrain literacy for propagation teaching |

**Cyber and expanded RF/infrastructure services remain architecture-only until real data paths exist — do not advertise them as available.**

---

## How engines relate to products

```
Shared engines (query / compose)
        │
        ├── Outdoor Intelligence ──► Dashboard, kiosk, apps
        ├── Species Knowledge ──► Fieldry, ForageCast, Sheds, …
        ├── Landscape Interpretation (v0.1 arch) ──► Dashboard, Fieldry, ForageCast, Sheds, Scenes
        ├── Signal Intelligence (v0.1 arch) ──► SignalTerrain (+ peers later)
        ├── Photo Intelligence ──► Scenes / Photo Coach
        └── Observation / Mapping ──► Fieldry and field apps
```

Registry keys live in `design-system/ecosystem/product-registry.json` under `sharedEngines` for future expansion.

---

## See also

- [PLATFORM-ARCHITECTURE.md](PLATFORM-ARCHITECTURE.md)
- [UNIFIED-PLATFORM.md](UNIFIED-PLATFORM.md)
- [LANDSCAPE-INTERPRETATION-ENGINE.md](LANDSCAPE-INTERPRETATION-ENGINE.md)
- [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md)
- [SIGNALTERRAIN_PLAYBOOK.md](SIGNALTERRAIN_PLAYBOOK.md)
- [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md)
