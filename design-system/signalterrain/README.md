# SignalTerrain Foundation (package)

**Version:** 2.0.0 · **Runtime:** topics + living knowledge graph explorers  
**Tagline:** Understand the world's signals. · Everything is connected.

Canonical docs:

- [SIGNALTERRAIN-VISION.md](../../docs/SIGNALTERRAIN-VISION.md)
- [KNOWLEDGE-GRAPH.md](../../docs/KNOWLEDGE-GRAPH.md)
- [SIGNALTERRAIN-INTELLIGENCE-CORE.md](../../docs/SIGNALTERRAIN-INTELLIGENCE-CORE.md)
- [RELATIONSHIP-TYPES.md](../../docs/RELATIONSHIP-TYPES.md)
- [TOPIC-LIFECYCLE.md](../../docs/TOPIC-LIFECYCLE.md)
- [RESEARCH-INTEGRATION.md](../../docs/RESEARCH-INTEGRATION.md)
- [SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md](../../docs/SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md)
- [SIGNALTERRAIN-TOPIC-MODEL.md](../../docs/SIGNALTERRAIN-TOPIC-MODEL.md)
- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](../../docs/SIGNALTERRAIN-RELATIONSHIP-MODEL.md)
- [SIGNALTERRAIN-EDITORIAL-STANDARDS.md](../../docs/SIGNALTERRAIN-EDITORIAL-STANDARDS.md)

## Quick map

| Artifact | Path |
|----------|------|
| Manifest | `index.json` |
| Topic schema | `schema-topic-v1.json` |
| Relationship schema | `schema-relationship-v1.json` |
| Relationship types v2 | `relationship-types.json` |
| Workspaces | `workspaces.json` |
| Platform systems | `platform-systems.json` |
| Foundation demo graph | `samples/demo-graph.json` |
| Living knowledge graph | `samples/living-graph.json` |
| Topics runtime | `../js/signalterrain/wds-signalterrain-topics.js` |
| Graph runtime | `../js/signalterrain/wds-signalterrain-graph.js` |
| Summary runtime | `../js/signalterrain/wds-signalterrain-summary.js` |
| Topics UI | `../../apps/signalterrain/topics.html` |
| Graph explorer | `../../apps/signalterrain/graph.html` |
| Intelligence Summary | `../../apps/signalterrain/summary.html` |
| Intelligence Core | `intelligence/` |

## Developer rules

1. Topics evolve — prefer updating `st_*` records over disposable news cards.  
2. Samples stay labeled `sample` / `educational-sample`.  
3. No scanners, SIEM, packet capture, or exploit content.  
4. Relationship edges must not encode attack procedures.  
5. Perspective stays labeled (`waypointAnalysis`).  
6. Unknowns are required on topics.  
7. Current events attach to existing topics.  
8. SignalTerrain remains the UI home for Signal Intelligence — no parallel Cyber nav product.

## Demo path

1. Open `apps/signalterrain/summary.html` — concise Intelligence Summary  
2. Open `apps/signalterrain/graph.html` — expand the CVE correlation neighborhood  
3. Open `apps/signalterrain/topics.html` — durable topic detail  
4. Read `docs/SIGNALTERRAIN-INTELLIGENCE-CORE.md` for the four questions and UIO architecture
