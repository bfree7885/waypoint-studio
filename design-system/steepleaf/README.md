# Steepleaf Knowledge Graph package

Shared tea knowledge for Waypoint Studio’s Steepleaf product.

## What this is

Normalized **entities**, **typed relationships**, **flavor ontology**, **brewing styles**, and a **demo graph** that powers:

- Explore / search
- Explainable discovery (“if I like this…”)
- Entity education pages
- Graph-grounded AI answers

Personal brew journals remain separate (on-device). Vendor offers are **sample edges**, not checkout.

## Files

| File | Role |
|------|------|
| `entity-kinds.json` | Canonical kinds (tea, region, cultivar, …) |
| `relationship-types.json` | Typed edges + aliases |
| `flavor-ontology.json` | Hierarchical sensory vocabulary |
| `brewing-styles.json` | Western, Gongfu, Grandpa, Cold Brew, … |
| `schema-entity-v0.1.json` | Entity contract |
| `schema-relationship-v0.1.json` | Edge contract |
| `samples/demo-graph.json` | Educational sample graph |
| `index.json` | Package manifest |

## Runtime

Loaded by `WDS.steepleafGraph` and companions under `design-system/js/steepleaf/`.

## Honesty

Demo data is labeled. Coverage is intentionally incomplete. No social rankings.
