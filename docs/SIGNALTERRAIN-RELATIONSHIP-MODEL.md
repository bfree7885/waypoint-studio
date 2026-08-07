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

## Relationship types (living graph)

Canonical catalog: [RELATIONSHIP-TYPES.md](RELATIONSHIP-TYPES.md) · `relationship-types.json` v2.

Includes `affects`, `uses`, `targets`, `references`, `published_by`, `patched_by`, `related_to`, `depends_on`, `replaces`, `supersedes`, `detects`, `mitigates`, `documented_in`, `discovered_by`, `reported_by`, `associated_with`, `communicates_over`, `interrupts`, `caused_by`, `supports`, `conflicts_with`, `observed_with`.

Foundation aliases (`advises-on`, `exploits-or-involves`, …) resolve to the canonical set.

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
- [GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md](GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md) — Global Signals cascade UX (design only; reuses edge honesty)  
- **Global Signals Relationship Engine (design only):** [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md) — broader node catalog with mandatory why / strength / confidence / direction / time delay
