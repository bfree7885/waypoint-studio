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
├── Cyber Awareness (educational workspace — not a separate Studio product)
│     ├── Daily Brief
│     ├── Intelligence Explorer
│     ├── Adaptive Defense Advisor
│     ├── Defensive Knowledge
│     └── Ingest Health (internal)
├── Watch (planned)
├── Library by workspace (planned)
├── Receivers / Incidents / Audio (planned; local models exist)
└── About & Limits (planned)
```

No parallel “Cyber” Studio product. Cyber lives under SignalTerrain.

---

## Runtime today

| Piece | Status |
|-------|--------|
| Foundation landing | `apps/signalterrain/index.html` |
| Topics demonstration | `apps/signalterrain/topics.html` |
| Topic / relationship package | `design-system/signalterrain/` |
| Shared browser util | `js/signalterrain/wds-signalterrain-util.js` (`esc`, `loadJson`, hash, `STORAGE_KEYS`) |
| Cyber graph + priority | `wds-signalterrain-cyber-graph.js`, `wds-signalterrain-cyber-priority.js` |
| Cyber Awareness UI | `apps/signalterrain/cyber/` + `wds-signalterrain-cyber.js` |
| Daily briefing | `intelligence/cyber/briefing/` + `wds-signalterrain-cyber-brief.js` |
| Explorer | `intelligence/cyber/explorer/` + `wds-signalterrain-cyber-explorer.js` |
| Advisor + inventory | `intelligence/cyber/advisor/` + advisor/inventory runtimes |
| Knowledge platform | `intelligence/cyber/knowledge/` + `wds-signalterrain-cyber-knowledge.js` |
| Mock ingestion | `wds-signalterrain-cyber-ingest.js` + connectors |
| Local receivers / incidents | `js/signalterrain-models.js` |
| Live ingestion | Mock only — no live harvesting |
| Advanced RF / scanners / SIEM | Out of scope |

### Cyber dependency sketch

```
wds-signalterrain-util.js
        │
        ├── cyber-graph.js ──► explorer / knowledge / advisor / cyber.js
        ├── cyber-priority.js ──► brief / advisor / cyber.js
        ├── inventory.js ──► advisor
        ├── research.js ──► explorer / knowledge
        └── cyber-ingest.js (+ connectors) ──► brief / ingest-health
```

Graph objects expose read-only `entities` and `listEntities()` — callers must not reassign entity arrays.

---

## Work Block 8 (platform quality)

Review set (owner gate — not auto-committed):

- [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md)  
- [TECHNICAL-DEBT.md](TECHNICAL-DEBT.md)  
- [SCALABILITY-REVIEW.md](SCALABILITY-REVIEW.md)  
- [UX-REVIEW.md](UX-REVIEW.md)  
- [PERFORMANCE-REVIEW.md](PERFORMANCE-REVIEW.md)  
- [ACCESSIBILITY-REVIEW.md](ACCESSIBILITY-REVIEW.md)  
- [PLATFORM-HARDENING.md](PLATFORM-HARDENING.md)  

Hardening already applied in-tree (pending owner commit approval): shared util, graph entity invariant, ingest escaping, shared cyber nav CSS, aligned peer links.

---

## Future roadmap (product)

1. Deepen topic UI (full knowledge structure sections)  
2. Bridge receivers/incidents → topics / Signal Cards  
3. Workspace Library filters  
4. Four-panel Overview when real digests exist  
5. Narrow cited sources (prefer space weather / status pages first)  
6. Execute platform hardening roadmap (fonts/CSP, chunked intelligence, brief generation, a11y focus)

See also [SIGNAL-INTELLIGENCE-ROADMAP.md](SIGNAL-INTELLIGENCE-ROADMAP.md).

---

## Boundaries

**In:** architecture, models, sample graph, calm demo, documentation, educational cyber awareness.  
**Out:** vulnerability scanning, packet capture, offensive tools, SIEM, RSS-reader product, fake live threat feeds, hidden scoring.

---

## Related

- [SIGNALTERRAIN-TOPIC-MODEL.md](SIGNALTERRAIN-TOPIC-MODEL.md)  
- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md)  
- [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md)  
- [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md)  
- [PLATFORM-HARDENING.md](PLATFORM-HARDENING.md)
