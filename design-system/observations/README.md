# Waypoint Observation Standard (WOS)

Canonical schema designed to support research-grade environmental observations across all Waypoint Studio products.

## Files

| File | Purpose |
|------|---------|
| [`schema-v1.json`](schema-v1.json) | JSON Schema (draft 2020-12) |
| [`examples/minimal-field-note.json`](examples/minimal-field-note.json) | Approachable three-field sighting |
| [`examples/research-grade-morel.json`](examples/research-grade-morel.json) | Full research contribution example |

## Documentation

**Primary reference:** [`docs/WAYPOINT-OBSERVATION-STANDARD.md`](../../docs/WAYPOINT-OBSERVATION-STANDARD.md)

Every field, enum, privacy rule, and Darwin Core mapping is documented there. That document is a core architectural artifact of Waypoint Studio.

## JavaScript API

Loaded via `wds.js` or directly:

```html
<script src="design-system/js/observations/wds-wos-core.js" defer></script>
```

```javascript
var obs = WDS.observations.emptyObservation({ source: "foragecast", taxonLabel: "morel" });
var normalized = WDS.observations.normalizeObservation(obs);
```

## Distinction from OIP editorial observations

The [Outdoor Intelligence Platform](../outdoor-intelligence/schema-v2.json) `observations` slice holds **regional editorial field notes** from content bundles. User-submitted records use **WOS** (`schema-v1.json`).
