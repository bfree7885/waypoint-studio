# Global Signals — Entity System data model

**Status:** Sample / demo unified registry  
**Canonical data:** `data/global-signals/entities/entities.json`  
**Builder:** `scripts/build-global-signals-entities.mjs`

## Purpose

One shared entity record shape powers a single page shell for Countries, Industries, Articles, Citizen Impact categories, and Relationship Explorer node types (ports, commodities, companies, policies, conflicts, tariffs, weather).

## ID schemes

| Prefix | Meaning |
| --- | --- |
| `gsn_*` | Canonical graph / focus id (Relationship Explorer `?focus=` / `?entity=`) |
| `gsc_*` | Country module id (`countries.json`) — do **not** conflate with cascade/statement `gsc_*` ids in other modules |
| `gsi_*` | Industry module id |
| `gsa_*` | Article id |
| `gsci_*` | Citizen Impact section entity id (and industry soft-link category ids) |

`moduleIds` on each entity records crosswalks without collapsing namespaces.

## Required sections (always rendered)

1. Overview  
2. Waypoint’s Take  
3. Relationship Graph (deep-link / focus panel — not a new force-graph)  
4. Related Articles  
5. Dependencies  
6. Dependent Entities  
7. Current Risks  
8. Time Horizon  
9. Confidence  

Missing data → honest empty copy. Predicted surfaces never use **Observed**.

## Graph focus contract

Entity Relationship Graph CTAs use:

`/side-trails/global-signals/relationships/?focus=<gsn_*>&entity=<gsn_*>`

`wds-gs-relationships.js` accepts `focus` as an alias of `entity` and writes both when selection changes.

## Provenance

Entities are assembled from:

- `data/global-signals/countries/countries.json`
- `data/global-signals/industries/industries.json`
- `data/global-signals/articles/articles.json`
- `data/global-signals/citizen-impact/citizen-impact.json`
- `data/global-signals/relationships/relationships.json`

Rebuild after module data changes:

```bash
node scripts/build-global-signals-entities.mjs
```

## Routes

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/entities/` | Registry index |
| `/side-trails/global-signals/entities/<type>/` | Type index |
| `/side-trails/global-signals/entities/<type>/<slug>/` | **Canonical** entity page |
| `/side-trails/global-signals/countries/<slug>/` | Alias → shared entity shell (`rel=canonical` to entities) |
| `/side-trails/global-signals/industries/<slug>/` | Alias → shared entity shell |

## Components

| Path | Role |
| --- | --- |
| `design-system/js/global-signals/wds-gs-entities.js` | Shared mount / normalize / render |
| `design-system/css/wds-global-signals-entities.css` | Shared layout styles |
| `design-system/js/global-signals/wds-gs-relationships.js` | Graph focus deep-link target (cascade explorer) |
