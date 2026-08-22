# Global Signals — Country Intelligence Data Model

**Status:** Sample / demo runtime on `feature/global-signals-country-intelligence`  
**Routes:** `/side-trails/global-signals/countries/` · `/side-trails/global-signals/countries/<slug>/`  
**Dataset:** `data/global-signals/countries/countries.json` (`mode: sample-demo`)

## Purpose

Structural country profiles that help readers connect public geography, trade, infrastructure, and everyday impact literacy.

Not a news site. Not political commentary. Not live risk alerting.

## Record fields (v1)

| Field | Role |
| --- | --- |
| `id` | Stable `gsc_<slug>` id |
| `slug` | Clean URL segment |
| `name` | Display name |
| `iso2` | ISO 3166-1 alpha-2 when applicable |
| `region` | Broad region label |
| `summary` | Short structural overview |
| `currentEvents` | Labeled sample/demo structural or historical-context entries — **never live breaking news** |
| `majorIndustries` | Named industries (+ optional notes) |
| `exports` / `imports` | Named commodity or goods groups |
| `criticalInfrastructure` | Named nodes with optional `type` |
| `majorPorts` | Named ports / complexes |
| `tradeRelationships` | Partner `partnerSlug` + nature + confidence |
| `currentRisks` | Illustrative risks (predicted confidence — never Observed) |
| `relatedArticles` | Existing GS article ids (`gsa_*`) |
| `citizenImpactConnections` | Category + summary + confidence + horizon |

## Confidence / time-horizon

Same discipline as Articles (`docs/global-signals/articles-data-model.md`):

- **Observed** — established structural facts only (e.g. long-running geographic/trade facts).
- Predictive risks and citizen-impact links **must never** use Observed.
- Horizons: Immediate · Days · Weeks · Months · Long-term · Unknown.

## Citizen Impact categories

Stable ids aligned for later Citizen Impact Dashboard integration:

`food` · `fuel` · `utilities` · `housing` · `travel` · `healthcare` · `insurance` · `technology`

(`fuel` maps to the Gasoline everyday lens in the Citizen Impact design doc.)

## Cross-links (soft)

| Target | Route / pattern | Notes |
| --- | --- | --- |
| Articles | `/side-trails/global-signals/articles/?id=<gsa_*>` | Links only to existing demo article ids where thematically fit |
| Citizen Impact | `/side-trails/global-signals/citizen-impact/#<category>` | Shell may still be Coming soon on main |
| Relationship Explorer | `/side-trails/global-signals/relationship-graph/` | Intended soft-link; Coming soon shell on main |

Entity ids stay compatible with Articles `affectedCountries` tags via human-readable country names and stable `gsc_*` / slug ids for future graph nodes.

## Honesty rules

1. Dataset `mode: sample-demo` with visible banner.
2. Current Events entries carry explicit “not live news” labels.
3. Missing sections render honest unavailable copy — no fabricated filler.
4. No AI-generated fake breaking news presented as live.
