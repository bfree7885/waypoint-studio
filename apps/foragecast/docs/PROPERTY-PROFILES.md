# ForageCast Property Profiles

Foundational land inventory for personalized recommendations.

## Privacy

Private by default. Profile metadata lives in `localStorage` (`waypoint-foragecast-property-v1`). Photos are stored in IndexedDB on this device only. Cloud sync is not enabled.

## Shape (v2)

- Basics: name, location label, USDA zone, acreage, goals
- Land types (multi-select)
- Orchard trees (species, quantity, age, notes)
- Berries, garden systems, wildlife, water, infrastructure
- Optional photos by category
- Derived `features[]` for the Today action planner

## Surfaces

| Page | Role |
|------|------|
| `property-setup.html` | Skippable first-run / edit wizard |
| `property.html` | Property Overview dashboard |
| Today home | Uses derived features + goals |

## Derivation

`ForageCastProfile.deriveFeatures(property, catalog)` maps rich inventory → planner feature ids (`apple-trees`, `vegetable-garden`, `wild-edges`, …). Recommendations only fire for features present on the property.

## Catalog

`data/property-catalog.json` is the source of truth for selectable options.
