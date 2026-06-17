# FGDS & ecosystem inheritance

Waypoint Scenes is a **full workspace app** — parallax, effects, collections, export. Editorial and Learn surfaces inherit shared systems:

| System | How Scenes inherits |
|--------|---------------------|
| CSS / FGDS | `../../design-system/css/wds.css` |
| WEF lessons | `WDS.education` + `js/learn-content.js` |
| Gallery | `WDS.gallery` in Collections |
| Field guide pages | `design-system/field-guide/templates/` for future species/editorial routes |
| Homepage sections | Registry slug `scenes` in `product-registry.json` |
| Content library | `design-system/content/*.json` filtered by photography, weather, habitat domains |
| Citizen science | Constitution copy via `WDS.ecosystem` citizen-science section |

Audit: [`docs/PRODUCT-FGDS-AUDIT.md`](../../docs/PRODUCT-FGDS-AUDIT.md)

Do not duplicate FGDS markup in this app — use shared templates and `WDS.ecosystem` for product home when adding a marketing/landing route.
