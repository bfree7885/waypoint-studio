# Cyber Graph UI

**Status:** V0.1  
**Surface:** Intelligence Explorer → Relationship Graph  
**Logic source:** `WDS.signalTerrainCyberGraph` (shared)

---

## Principle

No unexplained graph connections.

Selecting a focus entity lists every neighbor with:

| Question | Answered by |
|----------|-------------|
| Why is this connected? | Edge `type` + optional `note` via `explainEdge()` |
| Where did this originate? | Bundle relationship id / sample provenance |
| When was it updated? | Linked entity `updatedAt` |
| How confident are we? | Edge `confidence` |
| Which sources support it? | Union of entity `citations` |

---

## Interaction

1. Focus a node (default teaching focus: Log4Shell CVE).  
2. **Expand** loads neighbors incrementally into the visible set.  
3. Relationship-type chips filter visible edges without changing the underlying graph.  
4. Selecting an edge opens the same explainability block.

Visible nodes/edges are a **view** over the shared graph — not a second graph model.

---

## Reuse (not duplication)

```
explorer.visibleNeighbors(id)
        └── cyberGraph.neighbors(id, { bidirectional: true })

explorer attention demo
        └── cyberGraph.traverseAttentionChain(cveId)
```

Relationship labels come from `relationship-kinds.json`.

---

## Accessibility

- Buttons for node focus/expand (keyboard reachable)  
- Text labels on relationship confidence  
- No flashing urgency chrome
