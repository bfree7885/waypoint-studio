# Global Signals Articles — Data Model (Sprint 1)

**Status:** Sample / demo runtime on `feature/global-signals-articles-sprint-1`  
**Route:** `/side-trails/global-signals/articles/`  
**Dataset:** `data/global-signals/articles/articles.json` (`mode: sample-demo`)

## Purpose

Intelligence briefs that answer: What happened? Why does it matter? What could this affect next? How might industries and citizens feel impact?

Not a generic geopolitical news feed. Full copyrighted articles are never republished.

## Record fields (v1)

| Field | Role |
| --- | --- |
| `id` | Stable `gsa_*` id |
| `headline` | Non-sensational title |
| `publisher` | Source / agency display name |
| `date` / `publishedAt` | Publication timing |
| `factualSummary` | Observed / reported facts only |
| `sourceUrl` | Citation URL when available |
| `eventType` | Event taxonomy label |
| `waypointsTake` | Analysis object (`whyItMatters`, `analysis`) — never a summary restatement |
| `affectedCountries` | Countries / regions |
| `affectedIndustries` | Industries |
| `affectedCommodities` | Commodities |
| `citizenImpacts` | Citizen-impact categories |
| `timeHorizon` | Immediate · Days · Weeks · Months · Long-term |
| `confidence` | Observed · High · Medium · Low · Unknown |
| `likelyImpactPath` | Ordered chain of impact steps |

## Confidence rules

- **Observed** — established facts only.
- Predicted / downstream / analysis surfaces **must never** use Observed.
- Missing or invalid values normalize to **Unknown**.
- `normalizeConfidence(value, { predicted: true })` forces Observed → Unknown.

## Time-horizon rules

Coarse buckets only: Immediate, Days, Weeks, Months, Long-term.  
No invented precise dates without evidence. Invalid values → Unknown.

## Likely impact path steps

Each step:

| Subfield | Role |
| --- | --- |
| `label` | Short node label |
| `type` | event · infrastructure · commodity · industry · citizen-impact · … |
| `confidence` | Normalized; predicted hops never Observed |
| `timeframe` | Horizon bucket |
| `explanation` | Plain-language hop rationale |

Lightweight chain only — **not** a graph engine.

## Source / evidence rules

- Prefer citable public sources when live ingest exists.
- Sprint 1 ships a **labeled sample/demo** dataset (`example.invalid` citations).
- Never fabricate current events.
- Empty / missing fields render honest unavailable states.

## Ingestion strategy (future)

1. Editor-curated briefs with required evidence gate.  
2. Optional assisted drafting with human QA (Take ≠ summary).  
3. Live public feeds only when licensing + provenance allow.  
4. Graph modules consume `likelyImpactPath` + affected-* tags — do not fork schemas.

## Future module compatibility

Designed for Relationship Graph, Cascading Impact, World Map, Supply Chain, Citizen Impact Dashboard, Scenario Builder, and AI Analyst — via stable ids, taxonomied tags, and path steps. No throwaway structures in Sprint 1.

**Citizen Impact join:** household statements use the same confidence / horizon vocabulary and may reference `gsa_*` article ids plus Relationship Explorer `gsn_*` entity ids. See [`citizen-impact-data-model.md`](citizen-impact-data-model.md).
