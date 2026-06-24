# Waypoint Outdoor Ethics Standard (WOES)

Company-wide outdoor ethics for every Waypoint Studio product and feature.

## Documentation

**Primary reference:** [`docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md`](../../docs/WAYPOINT-OUTDOOR-ETHICS-STANDARD.md)

## Domains

| Key | Topic |
|-----|--------|
| `leaveNoTrace` | Leave No Trace principles |
| `wildlife` | Ethical wildlife observation |
| `foraging` | Responsible foraging |
| `conservation` | Stewardship |
| `habitat` | Habitat protection |
| `privateProperty` | Permission and trespass |
| `research` | Research and source honesty |
| `citizenScience` | Opt-in, private-by-default sharing |

## Files

| File | Purpose |
|------|---------|
| [`schema-v1.json`](schema-v1.json) | JSON Schema for ethics package + feature specs |
| [`../js/ethics/wds-outdoor-ethics.js`](../js/ethics/wds-outdoor-ethics.js) | `WDS.outdoorEthics` API |

## Feature gate

```javascript
var result = WDS.outdoorEthics.evaluateFeature({
  name: "Public harvest map",
  domains: ["foraging", "privateProperty"],
  sharesLocationPrecisely: true,
  sharesLocationPublicly: true
});
// result.pass === false
```

## OIP integration

`WDS.outdoorIntelligence.get()` attaches `platform.ethics` via `WDS.outdoorEthics.annotatePackage()`.

```javascript
WDS.outdoorEthics.renderFootnote(platform, { domain: "foraging" });
WDS.outdoorEthics.citizenScienceDisclosure();
```

## Related

- [Constitution](../../docs/WAYPOINT-STUDIO-CONSTITUTION.md)
- [Research Integrity](../../docs/RESEARCH-INTEGRITY.md)
- [Educational Framework](../../docs/WAYPOINT-EDUCATIONAL-FRAMEWORK.md)
- [Observation Standard](../../docs/WAYPOINT-OBSERVATION-STANDARD.md) — WOS privacy aligns with citizen science domain
