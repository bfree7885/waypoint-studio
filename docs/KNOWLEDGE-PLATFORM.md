# Defensive Knowledge Platform

**Status:** V0.1  
**UI:** `apps/signalterrain/cyber/knowledge.html`  
**Runtime:** `wds-signalterrain-cyber-knowledge.js`  
**Package:** `design-system/signalterrain/intelligence/cyber/knowledge/`

---

## Mission

Intelligence answers “What is happening?”  
Knowledge answers “What is this — and how do we defend?”

SignalTerrain preserves understanding so users can move between today’s intelligence and lasting reference material.

---

## Synchronization model

```
Today’s intelligence (cy_* graph, briefs, advisor)
              │
              │ subjectIds / topicIds / neighbors
              ▼
Defensive knowledge (enc_*, pb_*, inc_*, lp_*)
              │
              │ crossLinks() + knowledgeMap() + search()
              ▼
Shared research workspace (rw_* bookmarks / saved searches)
```

Knowledge objects **reference** shared graph entities. They do **not** fork CVE/campaign/product models.

| Layer | Purpose | Freshness |
|-------|---------|-----------|
| Intelligence | Attention, change, exposure | Time-bound |
| Knowledge | Explanation, practice, history | Durable, reviewed |

---

## Surfaces

| Panel | Content |
|-------|---------|
| Encyclopedia | Concepts, vulns, campaigns, tech literacy |
| Playbooks | Defensive how-to only |
| Incident Library | Historical literacy records |
| Learning Paths | Guided curiosity tracks |
| Knowledge Map | Visual relationships |
| Search | Unified discovery |

---

## Related docs

- [CYBER-ENCYCLOPEDIA.md](CYBER-ENCYCLOPEDIA.md)
- [PLAYBOOKS.md](PLAYBOOKS.md)
- [INCIDENT-LIBRARY.md](INCIDENT-LIBRARY.md)
- [LEARNING-PATHS.md](LEARNING-PATHS.md)
- [CYBER-GRAPH-ARCHITECTURE.md](CYBER-GRAPH-ARCHITECTURE.md)
