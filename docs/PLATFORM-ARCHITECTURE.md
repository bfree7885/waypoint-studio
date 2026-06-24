# Waypoint Studio — Platform Architecture

**These are foundations, not public products.**

Visitors use the **dashboard** and **instruments** (ForageCast, Fieldry, Scenes). Builders work on the layers below.

---

## Layer map

```
┌─────────────────────────────────────────────────────────┐
│  Public surfaces: Dashboard · ForageCast · Fieldry · Scenes │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Outdoor Intelligence Platform (OIP)                      │
│  WDS.outdoorIntelligence.get() — regional package         │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│ Regional      │  │ Content Engine │  │ Weather / Location │
│ Intelligence  │  │ regional JSON  │  │ services           │
│ Engine        │  │ bundles        │  │                    │
└───────────────┘  └────────────────┘  └──────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────────┐
│ Waypoint      │  │ Species        │  │ Educational      │
│ Observation   │  │ Knowledge Base │  │ Framework (WEF)  │
│ Standard WOS  │  │ WDS.species    │  │ WDS.educationTopic│
└───────────────┘  └────────────────┘  └──────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌───────────────────┐               ┌───────────────────┐
│ Research Integrity│               │ Outdoor Ethics    │
│ WDS.researchIntegrity│            │ WDS.outdoorEthics │
└───────────────────┘               └───────────────────┘
```

---

## Layer reference

| Layer | Location | Purpose |
|-------|----------|---------|
| **Outdoor Intelligence Platform** | `design-system/js/outdoor-intelligence/` | Canonical regional package for dashboard and apps |
| **Regional Intelligence Engine** | `design-system/js/regional-intelligence/` | County profiles, phenology, species slices |
| **Content Engine** | `design-system/content-engine/` | Editorial regional bundles (Pike County Preview) |
| **Waypoint Observation Standard** | `design-system/observations/`, `docs/WAYPOINT-OBSERVATION-STANDARD.md` | Research-grade observation schema; Fieldry will capture |
| **Species Knowledge Base** | `design-system/js/wds-species.js`, species templates | Shared species/habitat content for ForageCast |
| **Educational Framework** | `docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md`, `design-system/education/` | Nine pillars; WEF lesson engine |
| **Outdoor Ethics Standard** | `docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md`, `design-system/ethics/` | WOES — feature gate and UI reminders |
| **Research Integrity** | `docs/RESEARCH-INTEGRITY.md`, `design-system/js/wds-research-integrity.js` | Provenance, confidence, disclaimers |

---

## Shared modules (not products)

| Module | Status | Used by |
|--------|--------|---------|
| Map / schematic terrain | Active | ForageCast heat map, dashboard |
| Navigation lessons | Planned | Fieldry Learn, dashboard |
| Botany / phenology track | Planned | ForageCast Learn (from Steepleaf concept) |
| Winter wildlife track | Planned | Dashboard seasonal content |

---

## Data honesty rules

- **Editorial** ≠ **live** ≠ **verified** ≠ **prediction** — always labeled  
- OIP `observations` slice = editorial field notes, not user WOS records  
- `platform.ethics` and `platform.integrity` annotate packages at finalize  

---

## See also

- [STRATEGIC-DIRECTION.md](STRATEGIC-DIRECTION.md)  
- [WAYPOINT-OBSERVATION-STANDARD.md](WAYPOINT-OBSERVATION-STANDARD.md)  
- [RESEARCH-INTEGRITY.md](RESEARCH-INTEGRITY.md)  
- [design-system/outdoor-intelligence/schema-v2.json](../design-system/outdoor-intelligence/schema-v2.json)
