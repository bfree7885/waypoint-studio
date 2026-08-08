# Global Signals — Graph Backbone ID Mapping

**Branch:** `feature/global-signals-graph-backbone`  
**Canonical deep link:** `/side-trails/global-signals/relationship-graph/?focus=<graph-node-id>`

Honest provenance: sample/demo curated ids only. No invented live entities.

## Prefixes

| Prefix | Module meaning | Graph node? |
| --- | --- | --- |
| `gsn_*` | Relationship Explorer entities / events | Yes (primary entity nodes) |
| `gsi_*` | Industry Intelligence industries | Yes (`type: industry`) |
| `gsc_*` | Country Intelligence countries | Yes for most countries; **Taiwan exception** |
| `gsci_*` | Citizen Impact categories | Yes (`type: citizen_impact`) |
| `gsa_*` | Articles briefs | **No** — use `relatedGraphNodeIds` |
| `gsr_*` | Relationship / graph edges | Edges only |

## Critical collisions (do not deep-link blindly)

| Id pattern | Country Intelligence | Relationship Explorer | Citizen Impact |
| --- | --- | --- | --- |
| `gsc_*` | Country profile id | Cascade walk id (root often `gsn_*`) | **Statement** id scheme |

Only Country Intelligence country profile ids are safe as graph `?focus=` targets (plus Taiwan alias).

## Aliases / bridges

| Source id | Graph focus id | Mechanism |
| --- | --- | --- |
| `gsc_taiwan` | `gsn_taiwan` | `graph.json` → `idAliases` + node `countryId` |
| Other `gsc_<slug>` | same id | Direct country nodes in graph |
| `gsi_<slug>` | same id | Direct industry nodes |
| Citizen section `food` | `gsci_food` | `gsci_` prefix / `section.graphNodeId` |
| Article `gsa_*` | first of `relatedGraphNodeIds` | Curated bridge field on each brief |
| Legacy `?focus=industry&id=gsi_*` | `gsi_*` | Compat read in `queryFocus()` |

Runtime helpers: `design-system/js/global-signals/wds-gs-graph-links.js`  
Resolver: `WDS.globalSignals.relationshipGraph.resolveFocusId(bundle, id)`

## Module → focus matrix

| Surface | Focus rule | Example |
| --- | --- | --- |
| Article card / detail | `relatedGraphNodeIds[0]` | `gsa_demo-canal-slots` → `gsn_canal_corridor` |
| Country detail | `countryFocusId(id)` | `gsc_china` → `gsc_china`; `gsc_taiwan` → `gsn_taiwan` |
| Industry card / detail | industry id | `gsi_semiconductors` |
| Citizen section | `gsci_<section>` | Food → `gsci_food` |
| Cascade Explorer entity | same `gsn_*` | `?entity=gsn_taiwan` → graph `?focus=gsn_taiwan` |

## Article bridge table (sample/demo)

| Article id | Primary focus | Also linked |
| --- | --- | --- |
| `gsa_demo-canal-slots` | `gsn_canal_corridor` | drought, container freight, availability |
| `gsa_demo-steel-tariff` | `gsn_steel_tariff` | steel, construction, housing |
| `gsa_demo-shipping-diversion` | `gsn_corridor_conflict` | shipping, freight, fuel prices |
| `gsa_demo-pipeline-cyber` | `gsn_fuel_pipeline` | energy, gasoline, fuel |
| `gsa_demo-port-labor` | `gsn_port_complex` | retail, availability, food prices |

## On load behavior

Resolved `?focus=` expands the focus node and reveals **first-hop neighbors** (existing graph behavior). Aliased ids rewrite the URL to the canonical node id.
