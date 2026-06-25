# Waypoint Species Knowledge Base (WSKB)

Canonical species education records for Waypoint Studio products.

## Layout

- `schema-v1.json` — JSON Schema
- `index.json` — species catalog
- `records/{id}.json` — full species profiles
- `profile.html` — shared profile viewer (`?id=morchella-americana`)

## JavaScript API

Loaded via `WDS.wskb` (`design-system/js/species/wds-wskb-core.js`).

```javascript
WDS.wskb.configure({ base: "design-system/species/" });
WDS.wskb.loadIndex();
WDS.wskb.loadRecord("morchella-americana");
WDS.wskb.getSync("morchella-americana");
WDS.wskb.projectForSpotlight(record, regionalOverlay);
WDS.wskb.profileHref("morchella-americana");
```

## Consumers

- **Dashboard** — `speciesSpotlight.entries[].speciesId` + regional overlay
- **ForageCast** — spotlight + links to `profile.html`
- **Fieldry** — `taxon.taxonId` / WSKB lookup (prepared)
- **Species spotlight module** — `enrichSpotlightEntry()`

## Adding a species

1. Add entry to `index.json`
2. Create `records/{id}.json` following schema
3. Reference `speciesId` from regional bundles — do not duplicate full copy
