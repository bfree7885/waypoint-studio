# SignalTerrain — Platform Architecture

**Status:** Active foundation  
**Vision:** [SIGNALTERRAIN-VISION.md](SIGNALTERRAIN-VISION.md)  
**Studio map:** [PLATFORM-ARCHITECTURE.md](PLATFORM-ARCHITECTURE.md) (Waypoint Studio layers — not replaced by this file)

This document describes SignalTerrain’s **product platform architecture**: workspaces, shared systems, topic graph, and how Signal Intelligence contracts plug in.

---

## Layering

```
Studio kernel (WDS, Trust, Knowledge, Constitution)
        │
        ├── Signal Intelligence engine (observations / Signal Cards)
        │
        └── SignalTerrain product platform
              ├── Workspaces (RF · Cyber · Infrastructure · Research)
              ├── Topic model (everything becomes a topic)
              ├── Relationship engine (typed edges)
              ├── Shared platform systems (collections, timeline, notes, …)
              └── Surfaces (Overview, Topics demo, future Watch / Library)
```

SignalTerrain is the **UI home**. Signal Intelligence remains the shared awareness engine — not a second Studio nav product.

---

## Workspaces

Catalog: `design-system/signalterrain/workspaces.json`.

| Workspace | Examples (future) | Foundation stance |
|-----------|-------------------|-------------------|
| **RF** | SDR literacy, receivers, frequency DB, propagation, logging, audio, transcripts, signal catalog | Receivers/incidents local helpers exist; no advanced RF tools in this block |
| **Cyber** | Vulnerabilities, threat literacy, actors, malware families (awareness), advisories, vendor guidance, defensive knowledge | Educational only — no scanning, no offense |
| **Infrastructure** | Routing, cloud, communications, power, cellular, GPS, critical infrastructure, disruptions | Cited status / awareness later |
| **Research** | Papers, tech docs, RFCs, standards, conferences, government pubs, historical docs, Waypoint knowledge | Topic + Knowledge links |

Each workspace consumes the **same** topic and relationship contracts.

---

## Shared platform systems

Catalog: `design-system/signalterrain/platform-systems.json`.

Designed for reuse across workspaces (contracts now; full UI later):

| System | Job |
|--------|-----|
| Topics | Canonical entities that evolve |
| Collections | Curated sets of topics / signals |
| Bookmarks | Personal saved topics |
| Saved searches | Reusable query presets |
| Timeline | Chronology on a topic or across a collection |
| Knowledge relationships | Links to `wk_*` / research |
| Source management | Cited sources & verification |
| Notes | User private notes (local-first) |
| Attachments | Local files / audio references |
| Tags | Lightweight labels |
| Cross references | Explicit see-also beyond graph edges |
| Search | Find topics and notes |
| Import / Export | Portable bundles |
| Future synchronization | Opt-in sync — not default |

**Privacy default:** private notes, receivers, audio, and precise locations stay local until an explicit trusted path exists.

---

## Core information model

1. **Topic** — durable entity (`st_*`) with overview, timeline, sources, analysis, confidence, unknowns.  
2. **Relationship** — typed edge between topics (and optionally Knowledge / Signal Cards).  
3. **Signal Card / Observation** — time-bound awareness unit from Signal Intelligence (may attach to topics).  
4. **Workspace view** — filtered lens over the same graph.

Schemas: `design-system/signalterrain/schema-topic-v1.json`, `schema-relationship-v1.json`.

---

## Relationship to Signal Intelligence

| SI concept | SignalTerrain use |
|------------|-------------------|
| Modules | Workspace / library grouping |
| Signal Card | Event-like update that can attach to topics |
| Taxonomy | Category hints on topics |
| Sources catalog | Future connectors — not implemented here |
| Dashboard wireframe | Future Overview composition |

Do not fork a second alert schema. Map into topics + Signal Cards.

---

## Navigation (product IA)

Aligned with SI navigation blueprint:

```
SignalTerrain
├── Overview (foundation landing)
├── Topics (foundation demo — sample graph)
├── Watch (planned)
├── Library by workspace (planned)
├── Receivers / Incidents / Audio (planned; local models exist)
└── About & Limits (planned)
```

No parallel “Cyber” Studio product.

---

## Runtime today

| Piece | Status |
|-------|--------|
| Foundation landing | `apps/signalterrain/index.html` |
| Topics demonstration | `apps/signalterrain/topics.html` |
| Topic / relationship package | `design-system/signalterrain/` |
| Local receivers / incidents | `js/signalterrain-models.js` |
| Live ingestion | Not implemented |
| Advanced RF / scanners / SIEM | Out of scope |

---

## Future roadmap (product)

1. Deepen topic UI (full knowledge structure sections)  
2. Bridge receivers/incidents → topics / Signal Cards  
3. Workspace Library filters  
4. Four-panel Overview when real digests exist  
5. Narrow cited sources (prefer space weather / status pages first)  

See also [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md).

---

## Boundaries

**In:** architecture, models, sample graph, calm demo, documentation.  
**Out:** vulnerability scanning, packet capture, offensive tools, SIEM, RSS-reader product, fake live threat feeds.

---

## Related

- [SIGNALTERRAIN-TOPIC-MODEL.md](SIGNALTERRAIN-TOPIC-MODEL.md)  
- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md)  
- [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md)
