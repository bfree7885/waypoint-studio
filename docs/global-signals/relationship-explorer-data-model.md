# Global Signals Relationship Explorer — Data Model

**Status:** Sample / demo runtime on `feature/global-signals-relationship-explorer`  
**Route:** `/side-trails/global-signals/relationships/`  
**Dataset:** `data/global-signals/relationships/relationships.json` (`mode: sample-demo`)

## Purpose

Interactive cascading explorer answering **What depends on this?**  
Not a force-directed graph or network canvas. Curated downward cascades only.

Aligns with Articles Sprint 1 confidence / time-horizon rules and the Relationship Engine design contract (`docs/GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md`) so future Relationship Graph / Cascading Impact can consume the same structures.

## Top-level dataset

| Field | Role |
| --- | --- |
| `version` | Schema version string |
| `mode` | `sample-demo` until live curated ingest exists |
| `modeLabel` / `honesty` | Banner + confidence / evidence honesty copy |
| `entityTypes` | Catalog of selectable type keys |
| `entities` | Nodes (`gsn_*`) |
| `relationships` | Directed edges (`gsr_*`) with required facets |
| `cascades` | Curated ordered walks (`gsc_*`) from a root |

## Entity fields

| Field | Role |
| --- | --- |
| `id` | Stable `gsn_*` id |
| `type` | `country` · `industry` · `commodity` · `port` · `company` · `conflict` · `tariff` · `policy` · `weather` |
| `label` | Human-readable name |
| `summary` | Short calm description |
| `selectable` | Whether the entity appears as an explorer root |

UI label for `weather` is **Weather Event**.

## Relationship (edge) fields

Every edge must include:

| Field | Role |
| --- | --- |
| `id` | Stable `gsr_*` id |
| `from` / `to` | Entity ids (influence / dependency downstream) |
| `relationType` | Typed verb (`affects`, `inputs`, `constrains`, …) |
| `why` | Plain-language rationale |
| `confidence` | Observed · High · Medium · Low · Unknown |
| `timeHorizon` | Immediate · Days · Weeks · Months · Long-term |
| `evidence` | `{ kind, label, url?, notes? }` — honest about demo vs real |

Direction convention: **from A to B** means “B depends on A / A feeds into B” for the cascading display.

## Cascade fields

| Field | Role |
| --- | --- |
| `id` | Stable `gsc_*` id |
| `rootId` | Starting entity |
| `title` / `summary` | Cascade narration |
| `edgeIds` | Ordered list of relationship ids forming the primary path |

## Confidence rules

- **Observed** — established facts only.
- Relationship Explorer edges are dependency / influence hops → **must never** use Observed.
- `normalizeConfidence(value, { predicted: true })` forces Observed → Unknown.
- Missing or invalid values normalize to **Unknown**.

Same contract as Articles `likelyImpactPath` steps.

## Time-horizon rules

Coarse buckets only: Immediate, Days, Weeks, Months, Long-term.  
Invalid → Unknown. No invented precise dates.

## Evidence rules

- Prefer citable public sources when live ingest exists.
- Demo dataset uses `example.invalid` citations and `kind: sample-demo`.
- Never fabricate current events as live news.
- Missing evidence renders an honest unavailable state.

## Compatibility

| Consumer | How it reuses this model |
| --- | --- |
| Relationship Graph | Same `entities` + `relationships`; graph UX may add layout metadata later |
| Cascading Impact Explorer | Same edges + cascade walks; may add expand-on-demand branching |
| Articles | `likelyImpactPath` remains a lightweight chain; soft-link to `gsr_*` ids later |

Do not fork confidence / horizon enums across Global Signals modules.
