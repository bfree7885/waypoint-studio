# ForageCast Changelog — Production Recovery Sprint 4

DO NOT COMMIT / DO NOT PUSH was requested for this sprint; this file records work in the tree.

## Location honesty

- Platform `WDS.location`: `isUsablePlacePart`, `sanitizePlaceLabel`, hardened `formatRegionLabel` / status / hero / bar
- `applyPlaceDisplay` rejects `"null, NY"` and city `"NULL"`
- `WDS.usNational.displayTitle` same guards
- `ForageCastLocation` delegates + reliability states (Ready / Cached / Offline / Provider unavailable / Location unavailable)

## Startup reliability

- Season table: `platformBoot` mount/watch (15s), 1.8s location soft-start, platform fetch catch, fail + retry
- Overview: reliability chip on summary

## Outdoor intelligence

- Interpretive condition bullets (soil moisture after rain; dry heat reduces likelihood)
- Home summary subtitle: “Why conditions favor (or limit) them”
- Species detail restructured: Overview, Season, Habitat, Drivers, Outlook, Confidence, Similar, Safety

## Design / mobile

- Reliability badge styles; species detail heading rhythm; larger task-nav / CTA touch targets ≤720px

## Testing & docs

- `automation/test-foragecast-sprint4.mjs`
- Recovery report, location system review, provider audit, performance, technical debt, readiness, this changelog
