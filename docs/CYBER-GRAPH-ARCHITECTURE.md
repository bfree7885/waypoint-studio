# Cyber Graph Architecture

**Status:** Architecture V0.1  
**Runtime:** `design-system/js/signalterrain/wds-signalterrain-cyber-graph.js`  
**Sample:** `design-system/signalterrain/intelligence/cyber/samples/cyber-intelligence.sample.json`

---

## Goal

A reusable relationship engine for Cyber Awareness that can traverse educational chains such as:

```
CVE
 ↓ affects
Affected software
 ↓ linked_advisory / documented_in
Vendor advisory / KEV literacy
 ↓ fixes (inbound from patch)
Available patch
 ↓ exploited_in
Known exploitation / campaign
 ↓ priority engine
Suggested priority (explained)
```

The same graph ideas must remain reusable across SignalTerrain (topics, living graph, UIO correlation).

---

## Graph model

| Element | Id prefix | Notes |
|---------|-----------|-------|
| Entity | `cy_` | Typed cyber awareness object |
| Edge | `cyr_` | Typed relationship |
| Living topic (optional link) | `st_` | Attach durable topics when ready |
| UIO (optional link) | `uio_` | Time-bound events from Intelligence Core |

Edges are first-class. Entities may mirror edge lists for convenience; the bundle-level `relationships[]` is authoritative for traversal.

---

## API (prototype)

`WDS.signalTerrainCyberGraph`

| Method | Behavior |
|--------|----------|
| `createGraph(bundle)` | Index entities + relationships |
| `get(id)` | Entity lookup |
| `neighbors(id, { type, bidirectional })` | Adjacent edges |
| `findPath(from, to, maxDepth)` | Short BFS path |
| `traverseAttentionChain(cveId)` | CVE → software → advisory → patch → exploitation |
| `byKind(kind)` / `listKinds()` | Section browsing |
| `loadBundle(url)` | Fetch sample/production bundle later |

---

## Relationship catalog

Cyber kinds in `relationship-kinds.json` map to living-graph types in `design-system/signalterrain/relationship-types.json`.

Prefer canonical living-graph ids when writing durable `st_*` edges. Cyber aliases (`fixes`, `linked_advisory`, `exploited_in`) exist for domain clarity and map back.

Editorial gates: `targets`, `caused_by`, `associated_with`, `exploited_in` — require calm wording and citations; never store exploit steps.

---

## Reuse with living knowledge graph

| Concern | Living graph | Cyber engine |
|---------|--------------|--------------|
| Durable understanding | `st_*` topics | May link via `topicIds` |
| Time-bound events | UIOs | May link via `uioIds` |
| Cyber teaching cases | Sample topics | `cy_*` sample bundle |
| UI | `graph.html` / `topics.html` | `cyber/` sections |

V0.1 keeps the cyber sample bundle self-contained so Cyber UI can run without merging into `living-graph.json` yet. A later sprint can project `cy_*` into `st_*` without schema break.

---

## Extensibility for live feeds

Ingestion connectors should:

1. Normalize to `cy_*` entities (or UIOs that attach to them)  
2. Emit typed `cyr_*` edges  
3. Never invent relationships without sources  
4. Label confidence and unknowns  

No change to traversal API required when NVD/KEV/advisory providers activate.

---

## Related

- [CYBER-INTELLIGENCE-MODEL.md](CYBER-INTELLIGENCE-MODEL.md)  
- [CYBER-DATA-MODEL.md](CYBER-DATA-MODEL.md)  
- [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)  
- [SIGNALTERRAIN-CORRELATION-ENGINE.md](SIGNALTERRAIN-CORRELATION-ENGINE.md)
