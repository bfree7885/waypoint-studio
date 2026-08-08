# Global Signals Citizen Impact — Data Model

**Status:** Sample / demo runtime on `feature/global-signals-citizen-impact`  
**Route:** `/side-trails/global-signals/citizen-impact/`  
**Dataset:** `data/global-signals/citizen-impact/citizen-impact.json` (`mode: sample-demo`)

## Purpose

Translate geopolitics into everyday literacy across eight household categories.
Each statement answers: What changed? Why? What caused it? How confident are we?
Expected time horizon — with structured links to entities, evidence, and cause chains.

Not live news. Not financial, medical, or political advice.

## Alignment with Articles

Reuses the Articles vocabulary from [`articles-data-model.md`](articles-data-model.md):

| Shared concept | Values |
| --- | --- |
| Confidence | Observed · High · Medium · Low · Unknown |
| Time horizon | Immediate · Days · Weeks · Months · Long-term |
| Sample/demo mode | `mode: sample-demo` + honesty banner |
| Impact path steps | label · type · confidence · timeframe · explanation |

Citizen Impact **does not fork** confidence or horizon rules. Statement-level and
cause-chain hops are treated as predicted / downstream surfaces: **Observed is
never allowed** (normalized away via `predicted: true`).

## ID schemes

| Prefix | Role |
| --- | --- |
| `gsc_*` | Citizen Impact statement |
| `gsn_*` | Entity (aligned with Relationship Explorer entity ids) |
| `gsa_*` | Related Articles brief |
| `gev_*` | Evidence citation |

## Dataset root fields

| Field | Role |
| --- | --- |
| `version` | Schema version |
| `mode` / `modeLabel` | Honesty labeling (`sample-demo`) |
| `honesty` | Banner + confidence/evidence rule text |
| `sectionOrder` | Canonical eight category ids |
| `linkage` | Soft-link notes for Articles / Relationship Graph / Explorer |
| `entities` | Compact entity registry (`id`, `type`, `label`) |
| `sections` | Category sections with statements |

## Section fields

| Field | Role |
| --- | --- |
| `id` | food · fuel · utilities · housing · travel · healthcare · insurance · technology |
| `label` | Display name |
| `blurb` | Short everyday lens |
| `statements` | One or more impact statements |

## Statement fields

| Field | Role |
| --- | --- |
| `id` | Stable `gsc_*` |
| `whatChanged` | What changed (sample/reported) |
| `why` | Analysis — never presented as established fact |
| `causedBy` | Plain-language cause summary |
| `confidence` | Normalized; predicted → never Observed |
| `timeHorizon` | Horizon bucket |
| `entityIds` | Related `gsn_*` entities |
| `relatedArticleIds` | Optional `gsa_*` links |
| `evidence` | Citations (`id`, `label`, `url`, `kind`) |
| `causeChain` | Ordered relationship hops (same shape as Articles `likelyImpactPath` + `entityId`) |

## Cause-chain step fields

| Subfield | Role |
| --- | --- |
| `entityId` | Stable `gsn_*` |
| `label` | Short node label |
| `type` | event · infrastructure · commodity · industry · citizen-impact · weather · policy · … |
| `confidence` | Normalized; predicted hops never Observed |
| `timeframe` | Horizon bucket |
| `explanation` | Plain-language hop rationale |

Lightweight chain only — **not** a graph UI on this page.

## Relationship Explorer linkage

- Soft-link to `/side-trails/global-signals/relationships/` **only when that route exists on main**.
- On this branch base (`origin/main` Sprint 1), Relationship Explorer is **not** present.
- Intended join key: shared `gsn_*` entity ids + Articles `gsa_*` ids.
- Placeholder Relationship Graph route (`/relationship-graph/`) remains linked as the current main shell.

## Source / evidence rules

- Prefer citable public sources when live ingest exists.
- This ship uses **labeled sample/demo** citations (`example.invalid`).
- Never fabricate current events as live news.
- Empty / missing fields render honest unavailable states.

## Future module compatibility

Designed to join Relationship Explorer, Cascading Impact, and Articles via stable
ids and shared confidence/horizon vocabulary — no throwaway structures.
