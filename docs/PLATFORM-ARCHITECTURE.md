# Waypoint Studio — Platform Architecture

**These are foundations, not only public products.**

Visitors use the **dashboard** and **instruments** (ForageCast, Fieldry, Scenes). Builders extend the layers below. Product foundations (Sheds, Steepleaf, Savant Sommelier) share the same kernel. **SignalTerrain** lives under **Side Trails** (Waypoint Studio → Side Trails → SignalTerrain), not as a studio primary peer.

See also: [UNIFIED-PLATFORM.md](UNIFIED-PLATFORM.md)

---

## Layer map

```
┌──────────────────────────────────────────────────────────────────┐
│  Public: Dashboard · ForageCast · Fieldry · Scenes / Photo Coach │
│  Foundations: Sheds · Steepleaf · Savant                         │
│  Side Trails: SignalTerrain (sister project — not a primary peer)│
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  Shared platform kernel                                          │
│  Catalog · Shell · Profile · Locations · Collections · Settings  │
│  Foundation landings · Future data (disabled)                    │
│  Platform UI layer (task nav · loading/empty/error · fetchJson)  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  Shared intelligence engines (see PLATFORM-ENGINES.md)           │
│  Active: Outdoor Intelligence · Species Knowledge · Phenology    │
│           Photo Intelligence · Mapping / Observation (WOS)       │
│  Planned: Landscape Interpretation · Signal Intelligence         │
│           (RF + Cyber — SignalTerrain home)                      │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  Outdoor Intelligence Platform (OIP)                             │
│  WDS.outdoorIntelligence.get() — regional package                │
└───────────────────────────────┬──────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│ Regional      │  │ Content Engine │  │ Weather / Location │
│ Intelligence  │  │ regional JSON  │  │ services           │
└───────────────┘  └────────────────┘  └──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│ WOS +         │  │ Species KB     │  │ Educational      │
│ extensions    │  │ WDS.species    │  │ Framework (WEF)  │
└───────────────┘  └────────────────┘  └──────────────────┘
```

---

## Layer reference

| Layer | Location | Purpose |
|-------|----------|---------|
| **Platform kernel** | `design-system/js/platform/` | Shared chrome, profile, collections, foundation UI |
| **Shared engines (vision)** | `docs/PLATFORM-ENGINES.md` · registry `sharedEngines` | Long-term capability map; planned ≠ shipped |
| **Landscape Interpretation** | `design-system/landscape-interpretation/` · [docs](LANDSCAPE-INTERPRETATION-ENGINE.md) | Architecture v0.1: schemas, taxonomy, confidence, sample rules — no UI/runtime |
| **Signal Intelligence** | `design-system/signal-intelligence/` · [Vision](SIGNAL-INTELLIGENCE-VISION.md) · [Engine](SIGNAL-INTELLIGENCE-ENGINE.md) | Foundation V1 architecture: Signal Card, modules, nav, dashboard wireframe — no live UI/APIs |
| **Knowledge Platform** | `design-system/knowledge/`, `design-system/js/knowledge/` | Shared reference knowledge, search, relationships |
| **Outdoor Intelligence Platform** | `design-system/js/outdoor-intelligence/` | Canonical regional package for dashboard and apps |
| **Regional Intelligence Engine** | `design-system/js/regional-intelligence/` | County profiles, phenology, species slices |
| **Content Engine** | `design-system/content-engine/` | Editorial regional bundles (Pike County Preview) |
| **Waypoint Observation Standard** | `design-system/observations/` | Research-grade observation schema + extensions |
| **Species Knowledge Base** | `design-system/js/wds-species.js` | Shared species/habitat content |
| **Educational Framework** | `design-system/education/` | WEF lesson engine |
| **Outdoor Ethics Standard** | `design-system/ethics/` | WOES feature gate |
| **Research Integrity** | `design-system/js/wds-research-integrity.js` | Provenance and confidence |
| **Future data platform** | `design-system/js/platform/wds-platform-future-data.js` | Disabled APIs / GIS / research exports |

---

## Data honesty rules

- **Editorial** ≠ **live** ≠ **verified** ≠ **prediction** — always labeled
- AI-generated metadata must be explicitly labeled
- Future data features stay disabled until intentionally enabled
- Private by default across observations, finds, brews, and sites
- **Planned engines** must not be presented as available features in product UI

---

## See also

- [PLATFORM-ENGINES.md](PLATFORM-ENGINES.md) — shared engine map (Landscape Interpretation, Signal Intelligence)
- [LANDSCAPE-INTERPRETATION-ENGINE.md](LANDSCAPE-INTERPRETATION-ENGINE.md) — Landscape Interpretation v0.1
- [SIGNAL-INTELLIGENCE-VISION.md](SIGNAL-INTELLIGENCE-VISION.md) — Signal Intelligence Foundation V1
- [SIGNAL-INTELLIGENCE-ENGINE.md](SIGNAL-INTELLIGENCE-ENGINE.md) — Signal Intelligence engine contracts
- [UNIFIED-PLATFORM.md](UNIFIED-PLATFORM.md)
- [STRATEGIC-DIRECTION.md](STRATEGIC-DIRECTION.md)
- [WAYPOINT-OBSERVATION-STANDARD.md](WAYPOINT-OBSERVATION-STANDARD.md)
- [ROADMAP.md](ROADMAP.md)
