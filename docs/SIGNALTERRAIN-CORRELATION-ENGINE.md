# SignalTerrain — Correlation Engine

**Status:** Architecture V0.1  
**Core:** [SIGNALTERRAIN-INTELLIGENCE-CORE.md](SIGNALTERRAIN-INTELLIGENCE-CORE.md)  
**Patterns:** `design-system/signalterrain/intelligence/correlation-patterns.json`  
**Living graph:** [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)

The correlation engine is the beginning of an **intelligence graph** over Unified Intelligence Objects (events) and durable Topics. It lets people see how pieces connect — without becoming a conspiracy board or a news maze.

---

## Purpose

Allow events to connect so understanding compounds:

```
Geopolitical conflict
  → shipping disruption
  → energy / market pressure (structured event, not a headline)
  → cyber retaliation literacy (cited only)
  → government advisory
  → relevant CVEs / mitigations
```

```
New vulnerability
  → public research / PoC awareness note (no exploit packaging)
  → active exploitation reports (cited)
  → vendor patch
  → recommended mitigation
```

---

## Graph layers

| Layer | Node | Edge home |
|-------|------|-----------|
| Events | UIO (`uio_*`) | `relatedEventIds` + correlation edges |
| Topics | Topic (`st_*`) | Living graph `str_*` edges |
| Bridge | UIO `topicIds` | Attach event → durable entity |

Correlation may propose:

- `uio` → `uio` (event sequence)  
- `uio` → `st` (event lands on topic)  
- reuse topic relationship types when bridging into the living graph  

---

## Pattern object

Each pattern in `correlation-patterns.json` declares:

| Field | Meaning |
|-------|---------|
| `id` | Stable pattern id |
| `label` | Human name |
| `domainPath` | Domains involved |
| `steps` | Ordered hop kinds (category or topic kind) |
| `exampleChain` | Sample UIO/topic ids |
| `confidenceCeiling` | Max confidence without primary sources |
| `editorialGate` | Whether human review is required |
| `answers` | Which of the four questions it helps |

---

## Rules

1. Prefer attaching to existing topics over spawning orphan events.  
2. Speculative hops stay `speculative` or are omitted.  
3. `targets` / retaliation / causation edges require editorial gates.  
4. Never encode exploit steps in correlation metadata.  
5. Geopolitical nodes are structured events — not op-eds.  
6. Correlation suggests; Summary and Topic pages decide what to show.

---

## Runtime (future)

```text
Correlate.propose(uio, context) → edgeCandidates[]
Correlate.apply(approvedEdges) → graph mutation
Correlate.explain(edge) → why / evidence / unknowns
```

V0.1 ships patterns + sample chains only — no autonomous correlator.

---

## Sample chains in V0.1

1. **Geo → maritime → advisory → CVE** (`pattern_geo_shipping_cyber`)  
2. **Vuln → exploitation → patch → mitigation** (`pattern_vuln_exploit_patch`)  
3. **Space weather → RF / communications** (`pattern_spacewx_radio`) — cross-domain calm link  

See `samples/uio-bundle.sample.json`.

---

## Related

- [RELATIONSHIP-TYPES.md](RELATIONSHIP-TYPES.md)  
- [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md)
