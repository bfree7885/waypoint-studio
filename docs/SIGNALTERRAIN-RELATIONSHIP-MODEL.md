# SignalTerrain — Relationship Model

**Status:** Active foundation  
**Schema:** `design-system/signalterrain/schema-relationship-v1.json`  
**Types:** `design-system/signalterrain/relationship-types.json`  
**Vision:** [SIGNALTERRAIN-VISION.md](SIGNALTERRAIN-VISION.md)

The relationship engine lets SignalTerrain show how signals **connect** — technologies, protocols, actors, campaigns, vendors, research, infrastructure, organizations, countries, communications, and events — without turning the product into a conspiracy board or a news maze.

---

## Principle

Everything should be capable of connecting **naturally**.

Edges are typed, cited when possible, and honest about confidence. Weak or speculative links stay labeled — or omitted.

---

## Edge shape

| Field | Meaning |
|-------|---------|
| `id` | `str_*` stable id |
| `from` | Topic id (`st_*`) |
| `to` | Topic id (`st_*`) |
| `type` | Relationship type id |
| `label` | Short human phrase |
| `confidence` | `high` · `moderate` · `low` · `speculative` |
| `notes` | Optional limit / caveat |
| `sources` | Optional citations |

Optional: link outward to Knowledge (`wk_*`) or Signal Cards via topic fields rather than mixed id spaces on every edge. Foundation edges are **topic → topic**.

---

## Relationship types (initial)

| Type | Intent |
|------|--------|
| `related-to` | General association |
| `affects` | Condition or event impacts another topic |
| `exploits-or-involves` | Literacy only — vulnerability/campaign association (**never** exploit instructions) |
| `advises-on` | Advisory or guidance about a topic |
| `observed-on` | Frequency / signal observed in a context |
| `documents` | Paper or standard documents a topic |
| `operates` | Org / actor operates capability (awareness) |
| `uses-protocol` | System uses a protocol |
| `depends-on` | Infrastructure or tech dependency |
| `located-in` | Geographic or jurisdictional framing |
| `part-of` | Membership / component |
| `see-also` | Editorial cross-reference |
| `historically-related` | Past connection still useful for context |
| `watch-with` | Calm co-monitoring suggestion |

Full list and notes: `relationship-types.json`.

---

## Non-goals

- Guilt-by-association theater  
- Forced dense graphs for visual spectacle  
- Edges that imply verified attribution without sources  
- Encoding attack procedures in edge metadata  

---

## Query patterns (foundation runtime)

`WDS.signalTerrainTopics` (demo):

- `getTopic(id)`  
- `neighbors(id)`  
- `listByWorkspace(workspace)`  
- `listEdges()`  

Apps should query the graph rather than hard-coding chains.

---

## Sample demonstration

The Foundation demo connects:

- Sample CVE ↔ sample advisory (`advises-on`)  
- Sample threat actor ↔ sample CVE (`exploits-or-involves`, speculative/educational)  
- Sample frequency ↔ sample propagation (`affects` / `observed-on`)  
- Sample research paper ↔ propagation (`documents`)  
- Advisory ↔ research / infrastructure cross-links via `see-also` / `related-to`  

All samples are educational and labeled as such.

---

## Relationship to Knowledge graph

Studio Knowledge uses `kn_*` / `wk_*` edges in `design-system/knowledge/relationships.json`.  
SignalTerrain topics may cite `relatedKnowledgeIds` without merging id spaces. Future bridges can add typed cross-store edges — not required for Foundation V1.

---

## Related

- [SIGNALTERRAIN-TOPIC-MODEL.md](SIGNALTERRAIN-TOPIC-MODEL.md)  
- [SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md](SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md)  
- [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md)
