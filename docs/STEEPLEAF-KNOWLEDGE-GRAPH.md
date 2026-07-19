# Steepleaf Knowledge Graph

Work Block 2 foundation for Steepleaf as a **tea knowledge platform** — not a thin database, and not a social marketplace.

## Mission

Every piece of information should connect to related knowledge so people can move naturally:

Tea → Region → Producer → Harvest → Cultivar → Processing → Flavor → Brewing → History → Buying → Similar teas

## Package

Canonical package: `design-system/steepleaf/`

| Artifact | Purpose |
|----------|---------|
| `entity-kinds.json` | Shared kinds for educational pages |
| `relationship-types.json` | Typed edges; recommendations must cite WHY |
| `flavor-ontology.json` | Hierarchical flavor graph |
| `brewing-styles.json` | Brewing methods + variables |
| `schema-entity-v0.1.json` / `schema-relationship-v0.1.json` | Contracts |
| `samples/demo-graph.json` | Educational interconnected sample |

Runtime: `WDS.steepleafGraph`, `steepleafSearch`, `steepleafRecommend`, `steepleafAI`, `steepleafUI`.

Apps: `/apps/steepleaf/`, `/explore/`, `/entity/?id=…`

## Principles

- Educational first
- Every recommendation explains **why**
- Vendors ≠ teas (multiple vendors may sell the same tea)
- No social media, follower counts, influencers, or engagement tricks
- Demo / sample data labeled honestly
- Private catalog & brew journal stay on-device (separate from public KG)

## Search fields

Name, flavor, producer, vendor, country, region, estate, cultivar, tea type, processing, harvest, price, availability, brewing style, health topics, history.

## Discovery lenses

Similar / if I like this · more oxidized · lighter roast · sweeter · more floral · less astringent · lower caffeine · rare · seasonal · excellent value · under $20 · spring greens · low bitterness.

## AI

Deterministic, graph-grounded answers only (sample graph). Supported prompts include uniqueness, comparisons, next cups, under $20, low bitterness, spring greens, and relative sensory lenses.

## Entity page sections

Overview · Quick facts · Timeline · Map hint · AI summary · Related entities · Recommendations (with why) · Shopping samples · Unknowns · Educational links via related article/history/science edges.

## Future hooks (architected, not shipped)

Barcode scanning · OCR / label recognition · Photo identification · Marketplace APIs · Vendor feeds · Scientific reference ingest · AI image analysis.

## Tests

`node automation/test-steepleaf-knowledge-graph.mjs`

## Related

- `docs/STEEPLEAF_PLAYBOOK.md` — product standards
- Private journal models remain in `apps/steepleaf/js/steepleaf-models.js`
