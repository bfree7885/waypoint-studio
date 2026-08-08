# Global Signals — Industry Intelligence Data Model

**Status:** Curated baseline / sample-demo on `feature/global-signals-industry-intelligence`  
**Routes:** `/side-trails/global-signals/industries/` · `/side-trails/global-signals/industries/<slug>/`  
**Dataset:** `data/global-signals/industries/industries.json` (`mode: curated-baseline`)

## Purpose

Industry pages answer: What is happening? Why? Threats? Opportunities? Major countries? Supply chain? Related articles? Waypoint’s Take? Citizen impacts? Top dependencies?

Not a live news ticker. Structural intelligence with honest provenance.

## Record fields (v1)

| Field | Role |
| --- | --- |
| `id` | Stable `gsi_*` id |
| `slug` | URL segment |
| `name` / `tagline` / `summary` | Identity |
| `whatIsHappening` | Claim object (`text`, `confidence`, `horizon`) — curated context, not a live ticker |
| `why` | Claim object — structural rationale (predicted surface) |
| `threats[]` / `opportunities[]` | Items with `label`, `detail`, `confidence`, `horizon` — never Observed |
| `majorCountries[]` | `{ id: gsc_*, name, slug, role }` soft-links to Country Intelligence |
| `supplyChain` | `{ overview, nodes[{ label, type, note }] }` |
| `relatedArticles[]` | `{ id: gsa_*, headline }` → Articles `?id=` |
| `waypointsTake` | `{ whyItMatters, analysis }` — analysis only, never established fact |
| `citizenImpacts[]` | `{ id: gsci_*, label, detail, confidence, horizon }` soft-links |
| `topDependencies[]` | `{ industryId, name, slug, relation, confidence }` |
| `relatedIndustries[]` | `gsi_*` ids |
| `taxonomyAliases[]` | Optional Articles label aliases (e.g. Shipping ↔ Logistics) |

## Entity ID alignment

| Prefix | Entity | Notes |
| --- | --- | --- |
| `gsi_*` | Industry | This module |
| `gsa_*` | Article | See `articles-data-model.md` |
| `gsc_*` | Country | Intended Country Intelligence ids |
| `gsci_*` | Citizen-impact category | Intended Citizen Impact ids |

`taxonomies.articleIndustryLabelMap` maps Articles `affectedIndustries` strings (including **Logistics → Shipping**) to `gsi_*` ids. Labels without a dedicated industry page map to `null` (e.g. Manufacturing, Travel, Insurance) until expanded.

## Cross-links

| Target | Pattern |
| --- | --- |
| Articles | `/side-trails/global-signals/articles/?id=<gsa_*>` (exists on main) |
| Countries | `/side-trails/global-signals/countries/<slug>/` (soft-link; may ship in parallel) |
| Citizen Impact | `/side-trails/global-signals/citizen-impact/?category=<gsci_*>` |
| Relationship Explorer | `/side-trails/global-signals/relationship-graph/?focus=industry&id=<gsi_*>` |

## Confidence / horizon

Same discipline as Articles:

- **Observed** — established facts only.
- Threats, opportunities, citizen impacts, dependency confidence, and `why` normalize with `predicted: true` (Observed → Unknown).
- Horizons: Immediate · Days · Weeks · Months · Long-term · Unknown.

## Provenance

`mode: curated-baseline` with an honest banner. Sample article links point at the existing Articles sample-demo set (`example.invalid` citations). Do not present this dataset as live breaking intelligence.
