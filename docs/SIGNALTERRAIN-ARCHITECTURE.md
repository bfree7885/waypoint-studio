# SignalTerrain — Living Architecture

**Status:** Living document  
**Updated:** 2026-07-18  
**Roadmap:** [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md)  
**Detailed platform map:** [SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md](SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md)  
**Decisions:** [DECISIONS.md](DECISIONS.md) · **Changelog:** [CHANGELOG-ARCHITECTURE.md](CHANGELOG-ARCHITECTURE.md)

This file is the **synchronized architecture summary**. Prefer depth in linked docs; keep this page accurate and short enough to onboard a contributor in one sitting.

---

## What SignalTerrain is

An educational, defensive **intelligence platform** (UI home for Signal Intelligence) spanning RF, Cyber, Infrastructure, and Research workspaces.

**Not:** SIEM · EDR · vulnerability scanner · offensive toolkit · alert firehose · parallel “Cyber Studio” nav product.

---

## Layering

```
Waypoint Studio kernel (WDS, Trust, Knowledge, Constitution)
        │
        ├── Signal Intelligence (observations / Signal Cards)
        │
        └── SignalTerrain
              ├── Workspaces (RF · Cyber · Infrastructure · Research)
              ├── Topic + relationship contracts
              ├── Shared systems (research store, timeline, search, …)
              └── Surfaces (Overview, Topics, Cyber tools, Workspace, …)
```

---

## Core contracts

| Contract | Location / ids |
|----------|----------------|
| Topics | `st_*` · `schema-topic-v1.json` |
| Relationships | typed edges · `schema-relationship-v1.json` |
| Cyber entities | `cy_*` · intelligence sample + graph runtime |
| Research items | `rw_*` · **one** local store for RF+Cyber |
| Inventory | `inv_*` · advisor matching |
| Knowledge | `enc_*` / `pb_*` / `inc_*` / `lp_*` → `subjectIds` into graph |

**Rule:** Do not fork entity models per surface. Link with ids.

---

## Shared services (runtime)

| Service | Global | Role |
|---------|--------|------|
| Util | `WDS.signalTerrainUtil` | `esc`, `loadJson`, hash, `STORAGE_KEYS` |
| Research | `WDS.signalTerrainResearch` | Notes, collections, investigations, watchlists, queue, activity |
| Cyber graph | `WDS.signalTerrainCyberGraph` | Traversal; read-only `entities` |
| Priority | `WDS.signalTerrainCyberPriority` | Transparent scoring factors |
| Inventory | `WDS.signalTerrainInventory` | Local tech inventory |
| Brief | `WDS.signalTerrainCyberBrief` | Daily brief generator |
| Explorer | `WDS.signalTerrainCyberExplorer` | Graph / timeline / map UI |
| Advisor | `WDS.signalTerrainCyberAdvisor` | Exposure + recommendations |
| Knowledge | `WDS.signalTerrainCyberKnowledge` | Encyclopedia index + search |
| Workspace | `WDS.signalTerrainCyberWorkspace` | Operations dashboard |
| Ingest | `WDS.signalTerrainCyberIngest` | Normalize, provenance, cache (mock live) |

---

## Storage (privacy)

| Key | Contents |
|-----|----------|
| `st_research_workspace_v01` | All personal research content |
| `st_cyber_workspace_layout_v01` | Dashboard panel order/visibility only |
| `st_inventory_v1` | Technology inventory |
| `st_security_profile_v1` | Security profile |
| `st_advisor_snapshot_v1` | Advisor “what changed” snapshot |
| `wds.st.cyber.ingest.v01.*` | Ingest caches |

Notes, inventory, and precise personal context stay **local** until an explicit trusted sync path exists.

---

## Cyber surface map

| Surface | Path |
|---------|------|
| Awareness hub | `apps/signalterrain/cyber/` |
| Daily brief | `cyber/brief.html` |
| Explorer | `cyber/explorer.html` |
| Advisor | `cyber/advisor.html` |
| Knowledge | `cyber/knowledge.html` |
| Operations workspace | `cyber/workspace.html` |
| Ingest health (internal) | `cyber/ingest-health.html` |

---

## Current architectural posture

| Area | Posture |
|------|---------|
| Data | Schema-first samples; live connectors not yet active |
| UI | Multi-page app (MPA); calm editorial visual language |
| Coupling | Surfaces → shared graph/research; avoid per-page stores |
| Security | Educational HTML escaping; CSP/fonts hardening deferred |
| Scale | Sample-sized graphs; chunking/generation recommended before growth |

---

## Non-goals (permanent)

Vulnerability scanning · packet capture · exploit PoCs · SIEM/SOC case management · hidden ranking · fake live threat theatre · fear-driven UX.

---

## When you change architecture

1. Record a decision in [DECISIONS.md](DECISIONS.md)  
2. Append [CHANGELOG-ARCHITECTURE.md](CHANGELOG-ARCHITECTURE.md)  
3. Update milestone status in [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md)  
4. Adjust this summary if layering or contracts changed  
