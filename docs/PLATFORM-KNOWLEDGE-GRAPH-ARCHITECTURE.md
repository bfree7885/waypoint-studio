# Knowledge Graph Architecture (Platform)

**Date:** 2026-07-18  
**Runtime:** `WDS.platformGraph` (+ existing `WDS.knowledge` / `WDS.knowledgeRelationships`)

---

## Intent

Support future intelligence **without overengineering**:

- Keep a small, local edge store for Studio-wide relationships.  
- Seed **architecture** edges (product ↔ capability).  
- Derive edges only from **real user observations** (taxon ↔ app, taxon ↔ place label).  
- Leave SignalTerrain’s cyber graph and `WDS.knowledge` entity graph as specialized systems that can later federate.

---

## Node ID conventions

| Prefix | Meaning | Example |
|---|---|---|
| `app:` | Studio product | `app:fieldry` |
| `capability:` | Shared engine | `capability:oip` |
| `taxon:` | User/taxon label | `taxon:eastern-bluebird` |
| `place:` | Place label | `place:pike,-pa` |
| `concept:` | Abstract relation target | `concept:habitat` |
| `record:` / `media:` / `wine:` / `tea:` / `threat:` | Domain seeds | architecture only |

---

## Edge types

| Type | Use |
|---|---|
| `feeds` | Data from A can inform B |
| `workflow` | Natural user handoff |
| `uses` | Product depends on capability |
| `related` | Conceptual seed |
| `observed-in` / `observed-at` | Derived from private observations |

Every edge carries `honesty`.

---

## Storage

- Key: `waypoint-platform-graph-edges-v1`  
- Cap: 400 edges  
- Seed flag: `waypoint-platform-graph-seeded-v1`

---

## Relationship to other graphs

| System | Role |
|---|---|
| `WDS.knowledge` + relationships | Curated outdoor / species knowledge |
| SignalTerrain topic graph | RF / cyber educational entities |
| `WDS.platformGraph` | Cross-app Studio cohesion + user-derived links |

Do **not** merge these stores yet. Query federation can come later via adapters.

---

## Future (not built)

- Path queries in UI (“how is this connected?”)  
- Landscape Interpretation edges (geology ↔ form) when that engine ships runtime  
- Wine ↔ climate edges from Savant sites once places are saved  
- Explicit opt-in export of anonymized edge stats
