# Owner Review — Global Signals Universal Intelligence Search

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-universal-search`  
**Base:** `origin/main` @ `f942c7b` (Global Signals Sprint 1 live)  
**Author:** Bryan Freeman <bfree7885@gmail.com>  
**Deployed:** No  
**Merged:** No — stop for owner review

## Verdict

**Approve for review; do not merge until owner sign-off.**

Delivers a reusable Universal Search module: one search box over a structured sample/demo index built from curated Global Signals JSON (articles, countries, industries, relationships, citizen impact). Explicitly **not AI** — deterministic token/substring ranking with relationship-aware hints from edges and cascades.

Primary experience lives at `/side-trails/global-signals/search/` so the parallel home-dashboard agent can keep landing ownership. Landing gets soft-links only.

## Starting / tip SHAs

| | SHA |
| --- | --- |
| Starting (main) | `f942c7b177512b59bf3807c28814ccbe69820c2c` |
| Tip | `9a515c7335461f56742d7e4bdd6ec70ad446d343` |

## Routes

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/search/` | Canonical Universal Search UI |
| `/side-trails/global-signals/search/?q=Taiwan&types=country` | Deep-linked query + type filters |
| `/side-trails/global-signals/` | Soft-links (nav, hero CTA, modules list) |
| Embed | `WDS.globalSignals.search.mount(el, opts)` — dashboard can embed later |

## Data / index approach

1. **Source JSON** (integrated from sibling module branches; articles already on main):
   - `data/global-signals/articles/articles.json`
   - `data/global-signals/countries/countries.json`
   - `data/global-signals/industries/industries.json`
   - `data/global-signals/relationships/relationships.json`
   - `data/global-signals/citizen-impact/citizen-impact.json`
2. **Builder:** `scripts/build-global-signals-search-index.mjs`
3. **Index:** `data/global-signals/search/search-index.json` (~127 entries)
4. **Runtime:** client loads the static index and filters/ranks in-browser — no LLM, no remote ranking API.

### Result types covered

`country` · `commodity` · `industry` · `company` · `port` · `conflict` · `tariff` · `policy` · `weather` · `article` · `citizen-impact`

Ports include relationship-graph port nodes **and** nested `majorPorts` from country profiles.

### Deep links

| Type / module | Href pattern |
| --- | --- |
| Articles | `/side-trails/global-signals/articles/?id=gsa_*` (**live** on main) |
| Countries | `/side-trails/global-signals/countries/{slug}/` (intended; sibling branch) |
| Industries | `/side-trails/global-signals/industries/{slug}/` (intended; sibling branch) |
| Relationship Explorer | `/side-trails/global-signals/relationships/?entity=gsn_*` (intended; sibling branch) |
| Citizen Impact | `/side-trails/global-signals/citizen-impact/#section-{id}` (intended; sibling branch) |

Results from non-live modules show an honest **Intended module route** badge. Relationship hints (cascade membership, related entities, cross-module links) are derived only from structured fields.

## UI notes

- One labeled search input; optional type chips; Clear + Escape
- Results grouped by type with short context, provenance, confidence when present
- Relationship-aware hint chips under results
- Idle and no-match empty states are honest
- Reuses Global Signals landing chrome (IBM Plex, `gs-landing`)
- Desktop + mobile CSS; skip link; focus-visible; `role="search"`; `aria-live` status
- Reduced-motion respected on hub animation

## Tests

```bash
node automation/test-global-signals-search.mjs
node automation/test-global-signals.mjs
node automation/test-global-signals-articles.mjs
```

Coverage: required types, empty/idle/no-match, ranking/groups, type filters, deep-link hrefs, landing soft-link, Articles regression, HTTP smoke, no AI/LLM references.

## Screenshots

`docs/global-signals/search/` — see `SCREENSHOT-INDEX.md`

## Limitations

1. Sibling module HTML routes may still be Coming soon / absent on main until those feature branches merge — search deep-links use stable intended URLs anyway.
2. Index is sample/demo only; regenerating requires re-running the builder after source JSON changes.
3. Ranking is lexical + structured boosts (cascades, boost, live module) — not semantic embeddings.
4. Country-nested ports can dominate the port type count; filters help.
5. Does not own or redesign the Global Signals home dashboard.

## Owner decisions

1. Merge search before or after home-dashboard / sibling module UIs?
2. Keep primary route at `/search/` (recommended) vs embedding only on the dashboard?
3. Prefer regenerating the index in CI when source JSON changes, or keep committed snapshots?
4. When sibling modules land, drop “Intended module route” badges automatically via `moduleStatus: live`?

## Recommendation

**Do not merge yet.** Owner should click through Search on desktop/mobile, try `Taiwan`, `semiconductor`, `steel tariff`, and a nonsense query, confirm provenance labeling feels honest, then decide merge order relative to Countries / Industries / Relationship Explorer / Citizen Impact / home dashboard.
