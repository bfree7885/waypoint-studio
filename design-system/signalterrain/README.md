# SignalTerrain Foundation (package)

**Version:** 1.0.0 · **Runtime:** topic demo helpers (`WDS.signalTerrainTopics`)  
**Tagline:** Understand the world's signals.

Canonical docs:

- [SIGNALTERRAIN-VISION.md](../../docs/SIGNALTERRAIN-VISION.md)
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
| Relationship types | `relationship-types.json` |
| Workspaces | `workspaces.json` |
| Platform systems | `platform-systems.json` |
| Demo graph | `samples/demo-graph.json` |
| Runtime | `../js/signalterrain/wds-signalterrain-topics.js` |
| Demo UI | `../../apps/signalterrain/topics.html` |

## Developer rules

1. Topics evolve — prefer updating `st_*` records over disposable news cards.  
2. Samples stay labeled `sample` / `educational-sample`.  
3. No scanners, SIEM, packet capture, or exploit content.  
4. Relationship edges must not encode attack procedures.  
5. Perspective stays labeled (`waypointAnalysis`).  
6. Unknowns are required on topics.  
7. SignalTerrain remains the UI home for Signal Intelligence — no parallel Cyber nav product.

## Demo

Open `apps/signalterrain/topics.html` to browse the sample graph (CVE, actor, advisory, frequency, propagation, research paper) and follow relationship edges across workspaces.
