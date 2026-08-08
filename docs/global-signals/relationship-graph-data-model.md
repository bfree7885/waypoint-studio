# Global Signals Relationship Graph — Data Model

**Status:** Sample / demo runtime on `feature/global-signals-relationship-graph`  
**Canonical route:** `/side-trails/global-signals/relationship-graph/`  
**Dataset:** `data/global-signals/relationship-graph/graph.json` (`mode: sample-demo`)  
**Layout:** Radial-from-focus with progressive expand-on-click (mobile: stacked expand panels). **Not** force-directed.

## Purpose

Primary Global Signals relationship surface: typed nodes, evidenced edges, click-to-expand nearby relationships.  
Companion cascade UX remains at `/side-trails/global-signals/relationships/`.

Edges are **curated only** — assembled from existing Relationship Explorer, Citizen Impact cause chains, Industry Intelligence dependencies, and Country Intelligence citizen pathways. No AI-invented edges.

## Top-level dataset

| Field | Role |
| --- | --- |
| `version` | Schema version string |
| `mode` | `sample-demo` until live curated ingest exists |
| `modeLabel` / `honesty` | Banner + confidence / evidence / layout honesty copy |
| `layout` | `{ approach: "radial-from-focus", mobile: "stacked-expand-panels", forceDirected: false }` |
| `entityTypes` | Catalog of node type keys |
| `defaultFocusId` | Initial focus when no `?focus=` query |
| `focusSeeds` | Picker chips / select options |
| `sourceDatasets` | Paths of datasets edges were derived from |
| `nodes` | Graph nodes (`gsn_*` / `gsi_*` / `gsc_*` / `gsci_*`) |
| `edges` | Directed relationships (`gsr_*`) with required facets |

## Node fields

| Field | Role |
| --- | --- |
| `id` | Stable id (`gsn_*`, `gsi_*`, `gsc_*`, `gsci_*`) |
| `type` | `country` · `industry` · `commodity` · `port` · `conflict` · `policy` · `company` · `citizen_impact` · `tariff` · `weather` |
| `label` | Human-readable name |
| `summary` | Short calm description |
| `focusable` | Whether the node may be a focus seed |
| `sources` | Which curated datasets contributed the node |

UI label for `citizen_impact` is **Citizen Impact**. UI label for `weather` is **Weather Event**.

## Edge fields

Every edge must include:

| Field | Role |
| --- | --- |
| `id` | Stable `gsr_*` id |
| `from` / `to` | Node ids |
| `relationType` | Typed verb (`affects`, `inputs`, `depends_on`, `citizen_pathway`, …) |
| `why` | Plain-language rationale (**Why connected**) |
| `confidence` | Observed · High · Medium · Low · Unknown |
| `timeHorizon` | Immediate · Days · Weeks · Months · Long-term |
| `evidence` | `{ kind, label, url?, notes? }` — honest about demo vs curated |
| `sources` | Provenance tags for the curated hop |

Direction convention matches Relationship Explorer: **from A to B** means influence / dependency flow downstream for literacy display.

## Source integration (no invention)

| Source | What is reused |
| --- | --- |
| `relationships/relationships.json` | Entities + `gsr_*` edges + cascades (cascades remain explorer-only) |
| `citizen-impact/citizen-impact.json` | Category nodes (`gsci_*`) + consecutive `causeChain` hops + statement evidence |
| `industries/industries.json` | `gsi_*` nodes, `topDependencies`, `citizenImpacts`, `majorCountries` links when resolvable |
| `countries/countries.json` | Country nodes (`gsc_*`); Taiwan aliases to `gsn_taiwan`; `citizenImpactConnections` → `gsci_*` |

Identity alignment edges (`aligns_with`) may bridge `gsn_*` ↔ `gsi_*` when both represent the same curated industry concept — labeled as structural id bridges, not causal claims.

## Confidence rules

- **Observed** — established facts only; never on predicted / dependency hops.
- Graph edge normalize uses `normalizeConfidence(value, { predicted: true })` → Observed becomes **Unknown**.
- Missing or invalid values normalize to **Unknown**.

## Time-horizon rules

Coarse buckets only: Immediate, Days, Weeks, Months, Long-term.  
Invalid → Unknown. No invented precise dates.

## Evidence rules

- Prefer citable public sources when live ingest exists.
- Demo / curated-baseline evidence may use `example.invalid` citations with honest `kind`.
- Never fabricate current events as live news.
- Missing evidence renders an honest unavailable state.

## Interaction model

1. Choose a focus node (picker, chip, or `?focus=<id>`).
2. First hop neighbors appear (radial ring + accessible list).
3. Click a node to expand its nearby relationships (progressive disclosure).
4. Click an edge (list or SVG midpoint) to show Why · Confidence · Horizon · Evidence.
5. Collapse expansions to return to a focused view.
6. Mobile (`max-width: 40rem`) hides the canvas and keeps stacked expand panels for readability.

## Compatibility

| Consumer | How it relates |
| --- | --- |
| Cascade Explorer (`/relationships/`) | Same edge facet contract; linear curated walks |
| Articles | Soft-link later via `gsr_*` / entity ids; do not fork enums |
| Citizen Impact / Country / Industry modules | Source datasets for curated hops |

Do not fork confidence / horizon enums across Global Signals modules.
