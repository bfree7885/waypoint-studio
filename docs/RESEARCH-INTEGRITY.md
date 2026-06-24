# Research Integrity Framework

**Version 1.0.0**

Waypoint Studio’s Research Integrity framework is the shared trust layer for every product surface. It makes provenance, confidence, and uncertainty visible without adding visual noise.

Works alongside:

- [Outdoor Intelligence Platform](../design-system/outdoor-intelligence/README.md) — `platform.integrity` per slice
- [Waypoint Observation Standard](WAYPOINT-OBSERVATION-STANDARD.md) — observation records
- [Constitution — Privacy Philosophy](WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy)

---

## Design principles

1. **One footnote beats five badges** — Prefer `renderFootnote()` over stacking chips.
2. **Show uncertainty when it matters** — Hide `not_recorded` / `not_assessed` / `unverified` unless context requires it.
3. **Distinguish content types** — Editorial, prediction, observation, verified, live, and preview are never interchangeable.
4. **Calm typography** — Small caps badges, muted footnotes, no alert banners.
5. **Machine + human** — Same integrity context powers UI and future export validators.

---

## Artifacts

| Artifact | Path |
|----------|------|
| JS API | [`design-system/js/wds-research-integrity.js`](../design-system/js/wds-research-integrity.js) |
| Styles | [`design-system/css/wds-research-integrity.css`](../design-system/css/wds-research-integrity.css) |
| Provenance badges | [`design-system/css/wds-provenance.css`](../design-system/css/wds-provenance.css) |
| Legacy alias | `WDS.provenance` → delegates to this module |

---

## Provenance kinds

| Kind | When to use |
|------|-------------|
| `educational` | Regional bundles, field notes, phenology watch |
| `prediction` | ForageCast indices, rule-based “happening now” heuristics |
| `observation` | User WOS records (default before review) |
| `verified` | Expert/community/research-confirmed records or cited official sources |
| `live` | Weather provider forecasts |
| `placeholder` | Preview UI, disconnected gauges, sample media |

```javascript
WDS.researchIntegrity.renderBadge("educational");
WDS.researchIntegrity.renderFootnote({
  provenance: "educational",
  disclaimer: "Phenology watch · not survey data"
});
```

---

## Component reference

### Data provenance — `renderBadge` / `renderFootnote`

Compact badge + optional detail line. Default pattern for section headers and cards.

### Confidence levels — `renderConfidence`

Aligned with WOS `record.confidence`: `certain`, `likely`, `possible`, `uncertain`, `not_recorded`.

Omit when `not_recorded`. Renders a small meta chip or full “Confidence: …” line.

### Source citations — `renderCitation`

```javascript
WDS.researchIntegrity.renderCitation({
  label: "PA Game Commission",
  url: "https://…",
  accessedAt: "2026-05-29"
}, { prefix: "Source: " });
```

### Evidence quality — `renderEvidence`

WOS `record.evidenceQuality`: `excellent` → `not_assessed`. Hidden when not assessed.

### Verification status — `renderVerification`

WOS `verification.status`. `unverified` hidden by default (`hideUnverified: true`).

### Uncertainty indicators — `renderUncertainty`

Italic muted text for approximations, obfuscated coordinates, model estimates.

### Educational disclaimers — `renderDisclaimer`

`role="note"` block for species spotlight, tool intros, citizen science.

```javascript
WDS.researchIntegrity.renderDisclaimer({
  provenance: "prediction",
  text: "Educational index · schematic map · not georeferenced"
});
```

### Composite — `renderBlock`

Footnote + citation in one call for research briefs and export previews.

---

## Outdoor Intelligence integration

Every `WDS.outdoorIntelligence.get()` package includes:

```javascript
platform.integrity.weather   // { provenance, source, uncertainty, … }
platform.integrity.phenology
platform.integrity.species
platform.integrity.observations  // editorial field notes slice
platform.integrity.meta
```

Build from a slice:

```javascript
var ctx = WDS.researchIntegrity.fromOipSlice("weather", platform.weather, platform);
document.getElementById("foot").innerHTML = WDS.researchIntegrity.renderFootnote(ctx);
```

OIP `status` mapping:

| `status` | Provenance |
|----------|------------|
| `live` | `live` (weather) |
| `editorial` | `educational` |
| `placeholder` | `placeholder` |

---

## Observation (WOS) integration

```javascript
var obs = WDS.observations.normalizeObservation(raw);
var ctx = WDS.researchIntegrity.fromObservation(obs);

WDS.researchIntegrity.renderFootnote(ctx, {
  showConfidence: true,
  showEvidence: true,
  showVerification: true,
  hideUnverified: true
});
```

Maps verification tier to provenance (`expert` / `research_confirmed` → `verified`), surfaces location privacy as uncertainty, and exposes license as citation when not private.

---

## When to use what

| Surface | Recommended component |
|---------|----------------------|
| Dashboard card header | Existing card tag via `dashboardTag()` |
| Section intro | `renderFootnote` once |
| Species spotlight | `renderDisclaimer` |
| Research brief | `renderFootnote` + `renderCitation` |
| Weather panel | `renderFootnote` in attribution row |
| ForageCast index badge | `readinessBandLabel` + prediction provenance in intro |
| Future observation detail | `renderBlock(fromObservation(obs))` |
| Field action, maps, harvest | `WDS.outdoorEthics.evaluateFeature()` before ship |

**Avoid:** multiple badges per list item, red warning colors, modal disclaimers, or “AI generated” without source.

For outdoor ethics surfaces use `WDS.outdoorEthics.renderFootnote()` or `citizenScienceDisclosure()` — see [Outdoor Ethics Standard](WAYPOINT-OUTDOOR-ETHICS-STANDARD.md).

---

## Loading

Included in `wds.js` and `wds-platform.js` (with `ethics/wds-outdoor-ethics.js` for WOES):

```html
<script src="design-system/js/wds-research-integrity.js" defer></script>
<script src="design-system/js/ethics/wds-outdoor-ethics.js" defer></script>
```

`WDS.provenance` remains for backward compatibility.

---

## See also

- [Waypoint Observation Standard](WAYPOINT-OBSERVATION-STANDARD.md)
- [Constitution](WAYPOINT-STUDIO-CONSTITUTION.md)
