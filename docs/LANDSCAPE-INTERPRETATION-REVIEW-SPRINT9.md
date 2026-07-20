# Landscape Interpretation Review — Sprint 9

## Identity

**Landscape Interpretation** answers: *Why does this place look the way it does?*

It is **not** Hidden Landscapes (Scenes spectral remaps). Sprint 9 ships the first educational **field reader + offline evaluator** over the existing v0.1 schemas and Northeast sample rules.

| Surface | Path |
| --- | --- |
| Field reader | `/apps/landscape-interpretation/` |
| Learn | `/apps/landscape-interpretation/learn.html` |
| Engine | `design-system/js/landscape-interpretation/wds-lie-engine.js` |
| Rules | `design-system/landscape-interpretation/rules/samples/northeast-land-use.sample.json` |

## Field experience

Users check observation tags (walls, flood debris, glacial debris, fire char, stumps, corridors…). The evaluator fires transparent IF→THEN rules and returns:

- Hedged statement
- Evidence
- Alternative explanations
- Suggested next looks
- Confidence ceiling (never invents when empty)

Example presets cover agricultural abandonment, flood valleys, glacial bowls, logging, and fire.

## Knowledge experience

Learn page covers glaciation, historic agriculture, logging, fire, flooding/hydrology, mining, succession, soils/topography, and infrastructure in plain language, with cross-links to Fieldry, Sheds, ForageCast, Scenes, and Volunteer.

## Expanded process coverage

Sample rules now include glacial deposits, flood activity, logging, fire influence, mining, infrastructure edges, and kettle depressions — still educational, regional, and map-free.

## Limits

- No live DEM, soils, historic aerials, or fire-history services
- Northeast-leaning sample pack
- Hidden Landscapes remains a separate creative tool
