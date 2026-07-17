# SignalTerrain Foundation (package)

**Version:** 2.0.0 · **Runtime:** topics + living knowledge graph explorers  
**Tagline:** Understand the world's signals. · Everything is connected.

Canonical docs:

- [SIGNALTERRAIN-VISION.md](../../docs/SIGNALTERRAIN-VISION.md)
- [KNOWLEDGE-GRAPH.md](../../docs/KNOWLEDGE-GRAPH.md)
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
| Topics UI | `../../apps/signalterrain/topics.html` |
| Graph explorer | `../../apps/signalterrain/graph.html` |

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

1. Open `apps/signalterrain/graph.html`  
2. Start on the sample CVE  
3. Expand neighbors through vendor → advisory → research → actor → history → mitigation → technology → future  
4. Filter relationship types / confidence; search the graph; read the living timeline
