# Landscape Interpretation Engine (package)

**Version:** 0.1.1 · **Runtime:** educational offline evaluator + field UI (Sprint 9)

Canonical docs:

- [LANDSCAPE-INTERPRETATION-ENGINE.md](../../docs/LANDSCAPE-INTERPRETATION-ENGINE.md)
- [LANDSCAPE-INTERPRETATION-REVIEW-SPRINT9.md](../../docs/LANDSCAPE-INTERPRETATION-REVIEW-SPRINT9.md)
- [LANDSCAPE-INTERPRETATION-INTEGRATIONS.md](../../docs/LANDSCAPE-INTERPRETATION-INTEGRATIONS.md)
- [PLATFORM-ENGINES.md](../../docs/PLATFORM-ENGINES.md)

## Quick map

| Artifact | Path |
|----------|------|
| Package manifest | `index.json` |
| Result schema | `schema-v0.1.json` |
| Taxonomy | `taxonomy.json` |
| Confidence model | `confidence.json` |
| Rule schema | `rules/schema-v0.1.json` |
| Sample rule pack | `rules/samples/northeast-land-use.sample.json` |
| Sample result | `samples/interpretation-result.sample.json` |
| Evaluator | `../js/landscape-interpretation/wds-lie-engine.js` |
| Field UI | `../../apps/landscape-interpretation/` |

## Developer rules

1. **No invented layers** — do not claim live DEM/soils/aerial evaluation without documented sources.
2. **Observation ≠ interpretation** — keep them separate in every API and UI.
3. **Alternatives required** — every interpretation carries alternatives and field checks.
4. **Offline first** — rule packs and taxonomy must load as static JSON.
5. **AI optional** — generative text must set `meta.aiAssisted: true` and still cite observations/rules.
6. **Not GIS-complete** — engine explains process stories; it does not replace surveyors or historians.
7. **Not Hidden Landscapes** — spectral photo remaps live under `/apps/hidden-landscapes/`.


## Adding a rule

1. Pick a `taxonomyId` from `taxonomy.json`.
2. Author IF conditions with plain-language `if.plainLanguage` / `then.plainLanguage`.
3. Cap `confidenceCeiling` honestly (usually `moderate` or lower without historic sources).
4. Supply ≥1 alternative and ≥1 field check.
5. Declare `regionalScope` on the pack.
6. Keep pack `status: sample` until domain review.

## Future runtime (not started)

A later evaluator may:

1. Collect observation tags (Fieldry / user / layers).
2. Match `rules[].if` predicates.
3. Emit `schema-v0.1` interpretation objects.
4. Compose optional `narrative` with confidence ceiling = min(cited).

Until that exists, consumers must treat this package as **documentation and contracts only**.
