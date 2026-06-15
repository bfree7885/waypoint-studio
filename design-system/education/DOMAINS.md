# WEF Domains

Domains classify lessons for filtering, search, and cross-product discovery. Use the slug in lesson `domains` arrays.

| Slug | Label | Typical products |
|------|-------|------------------|
| `species` | Species | ForageCast, Steepleaf, Shed Hunting |
| `habitats` | Habitats | ForageCast, Steepleaf, Fieldry |
| `ecology` | Ecology | ForageCast, Steepleaf, Terrainbound |
| `weather` | Weather | ForageCast, SignalTerrain, Scenes |
| `geology` | Geology | SignalTerrain, Terrainbound, Shed Hunting |
| `astronomy` | Astronomy | SignalTerrain, Scenes |
| `tea` | Tea | Fieldry, Steepleaf |
| `wine` | Wine | Savant Sommelier |
| `wildlife` | Wildlife | Shed Hunting, ForageCast, Terrainbound |
| `navigation` | Navigation | SignalTerrain, Terrainbound, Fieldry |
| `photography` | Photography | Scenes, Fieldry |
| `conservation` | Conservation | Steepleaf, ForageCast, Terrainbound |
| `field-skills` | Field skills | All products |

## Rules

1. **At least one domain** per lesson
2. **Prefer specific over generic** — use `species` + `ecology` rather than only `field-skills`
3. **Tracks may also declare domains** — inherited as defaults when authoring legacy content
4. **Cross-product links** — `related` ids should resolve within the same curriculum file unless building a shared master index later

## Domain → section emphasis

Not every section applies equally. Use `skipped: true` when a section is intentionally empty.

| Domain | Usually required | Often skipped |
|--------|------------------|---------------|
| species | identify, ethics, safety | — |
| habitats | identify, fieldObservations | — |
| ecology | howItWorks, why | identify (if abstract) |
| weather | howItWorks, fieldObservations | identify |
| geology | identify, howItWorks | — |
| astronomy | howItWorks, fieldObservations | ethics (unless dark-sky) |
| tea / wine | identify, howItWorks, ethics | safety (unless foraging overlap) |
| wildlife | identify, ethics, safety | — |
| navigation | howItWorks, mistakes, safety | identify |
| photography | howItWorks, mistakes, challenge | safety |
| conservation | why, ethics | identify |
| field-skills | fieldObservations, challenge | quiz (until ready) |

## API

```js
WDS.education.DOMAINS.species.label; // "Species"
WDS.education.filterByDomain(curriculum, "wine");
```
