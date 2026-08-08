# Owner Review — Global Signals Beta (cross-module)

**Date:** 2026-08-07  
**Branch:** `release/global-signals-beta`  
**Base:** `origin/main` @ `f00b4ae` (Articles Sprint 1 live + curated feed refresh)  
**Author / committer:** Bryan Freeman \<bfree7885@gmail.com\>  
**Worktree:** `/home/bryan/Projects/waypoint-studio-gs-beta-review`  
**Deployed:** No  
**Merged to main:** No — **do not merge; do not deploy**

---

## Verdict

**Conditional GO for Experimental Beta (sample/demo).**  
**NO-GO for production / live intelligence.**

A coherent intelligence shell ships on `release/global-signals-beta`: landing, Explain This, Universal Search, Relationship Graph, Cascade Explorer, Countries, Industries, Citizen Impact, and Articles. Honesty labeling is strong. Cross-module navigation is fragmented. Home Dashboard / Story Mode / Entity System are incomplete. Treat as Side Trails Experimental — not a finished product.

| Gate | Result |
| --- | --- |
| Sample/demo honesty | Pass |
| Working modules (not marketing-only) | Pass for listed live routes |
| Shared app chrome / one polished app | Fail — nav fragmented |
| Real Home Dashboard | Fail — `/global-dashboard/` still coming soon |
| Entity system + Story Mode | Incomplete — wait |
| Live ingest / non-demo data | Out of scope / not ready |
| Merge to main | **Blocked** until owner polish pass |

---

## Branch inventory (tips at review)

| Area | Branch | Tip | Remote | Status |
| --- | --- | --- | --- | --- |
| Articles (on main) | `origin/main` | `f00b4ae` | yes | Live |
| Relationship Explorer | `feature/global-signals-relationship-explorer` | `0018a54` | yes | Integrated via home umbrella |
| Citizen Impact | `feature/global-signals-citizen-impact` | `50c8c41` | yes | Integrated |
| Country Intelligence | `feature/global-signals-country-intelligence` | `f7f45bf` | yes | Integrated |
| Industry Intelligence | `feature/global-signals-industry-intelligence` | `435ecda` | yes | Integrated |
| Relationship Graph | `feature/global-signals-relationship-graph` | `2e3f271` | yes | Integrated |
| Explain This | `feature/global-signals-explain-this` | `3528c3f` | yes | Integrated |
| Home / Dashboard | `feature/global-signals-home-dashboard` | `bac5862` | local (tip moved mid-review) | **Integrated** — real `gsh-board` home |
| Universal Search | `feature/global-signals-universal-search` | `4f788ee` | yes | Integrated on release |
| Entity system | `feature/global-signals-entity-system` | `86f5f34` | local (tip moved mid-review) | **Integrated** — shared entity shell |
| Graph backbone | `feature/global-signals-graph-backbone` | `2e3f271` | local only | Alias of Relationship Graph tip |
| Story Mode | `feature/global-signals-story-mode` | `3528c3f` | local only | Alias of Explain This tip — not a separate feature |

**Late tips integrated during review close:** Entity System (`86f5f34`) and Home Dashboard board (`bac5862` / feat `b31a819`) landed while review was in progress and were merged onto the release branch. **Still incomplete:** Story Mode (tip still equals Explain This — no distinct feature). `/global-dashboard/` remains an honest empty shell; the real home is `/side-trails/global-signals/` (`gsh-board`).

---

## What is on the release branch

Integrated in order:

1. `origin/main` (Articles already present)
2. `feature/global-signals-home-dashboard` @ `f7ade1e` (umbrella: Explorer, Citizen, Country, Industry, Graph, Explain)
3. `origin/feature/global-signals-universal-search` @ `4f788ee` (conflicts resolved: relationships.json kept from release tip / Explain This extensions; search index rebuilt; landing kept Explain-primary CTAs + Search)

**Not integrated:** Entity system, Story Mode (nonexistent as distinct module), any unfinished home-dashboard feature work beyond umbrella merges.

### Live routes (sample/demo)

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/` | Landing / product entry |
| `/side-trails/global-signals/explain/` | Explain This (signature Q→graph) |
| `/side-trails/global-signals/search/` | Universal Search |
| `/side-trails/global-signals/relationship-graph/` | Primary Relationship Graph |
| `/side-trails/global-signals/relationships/` | Cascade Explorer |
| `/side-trails/global-signals/countries/` (+ slugs) | Country Intelligence |
| `/side-trails/global-signals/industries/` (+ slugs) | Industry Intelligence |
| `/side-trails/global-signals/citizen-impact/` | Citizen Impact board |
| `/side-trails/global-signals/articles/` | Articles briefs |

### Honest empty shells (coming soon)

| Route | Note |
| --- | --- |
| `/global-dashboard/` | Labeled coming soon — **not** a dashboard |
| `/waypoint-take/` | Coming soon (Takes also embedded in Articles / Industries / Explain) |
| `/supply-chains/` | Coming soon |
| `/scenario-explorer/` | Coming soon |

---

## Screenshots

Directory: [`docs/releases/global-signals-beta/`](global-signals-beta/) — see [`SCREENSHOT-INDEX.md`](global-signals-beta/SCREENSHOT-INDEX.md).

| # | File | Finding |
| --- | --- | --- |
| 01–02 | Landing desktop/mobile | Strong brand + Experimental badge; full nav; Explain primary CTA |
| 03–04 | Articles feed + steel-tariff detail | Working intelligence brief; facts vs Take vs impact path |
| 05–06, 17 | Relationship Graph | Working radial-from-focus graph (canvas below picker); demo honesty clear |
| 07 | Cascade Explorer Taiwan | Working linear “What depends on this?” |
| 08–09 | Countries index + Taiwan | Structural profiles — not live news |
| 10–11 | Industries + Semiconductors | Working industry baselines |
| 12 | Citizen Impact | Eight-category literacy board |
| 13 | Explain This Taiwan | Signature module working; confidence / path / match disclosed |
| 14–15 | Global Dashboard / Waypoint’s Take | Honest coming-soon shells |
| 16 | Search Taiwan | Working structured search results |
| 18 | Home dashboard board | Real `gsh-board` after late home tip |
| 19 | Entity Taiwan | Shared entity shell |

Module-level screenshot packs also remain under `docs/global-signals/{articles,relationships,relationship-graph,countries,industries,citizen-impact,explain,search}/`.

---

## Findings by severity

### P0 — release blockers for “one polished app” (not blockers for Experimental Beta)

None that falsify sample/demo Experimental Beta. Production claims would be P0.

### P1 — should fix before wider beta audience

| ID | Finding | Evidence |
| --- | --- | --- |
| P1-1 | **Fragmented product nav.** Landing has full module nav; module pages each ship a different subset (Articles misses Countries/Industries/Citizen/Search/Explain; Countries/Industries/Citizen only link Articles + home). | Nav audit + screenshots 03–13 |
| P1-2 | **Two “homes”.** Real board is `/side-trails/global-signals/`; `/global-dashboard/` is still coming soon. Keep primary entry on the board; hide/demote the empty shell. | Screenshots 01/18 vs 14 |
| P1-3 | **Duplicate relationship surfaces without clear hierarchy in chrome.** Graph vs Explorer vs Explain all “do relationships.” Landing elevates Explain; module headers still bury the hierarchy. | Landing CTAs vs module page chrome |
| P1-4 | **Entity shell integrated but not yet the universal deep-link target.** Search/Explain/Graph still often point at module routes; Countries/Industries alias entities — finish rewiring for one app feel. | Entities module + Search index |

### P2 — polish for cohesion

| ID | Finding | Evidence |
| --- | --- | --- |
| P2-1 | Roadmap list on landing still advertises coming-soon modules beside live ones — correct honesty, but reads like a prospectus rather than an app. | Landing `#gs-roadmap` |
| P2-2 | Redundant “Back to Global Signals / Side Trails” CTA rows on every module compete with top nav. | Screenshots 03–13 |
| P2-3 | Graph first viewport is dense (banner + filters + chip grid) before canvas — tall screenshot required to see the graph. | Screenshots 05 vs 17 |
| P2-4 | Search results may still surface “intended module route” semantics for partial integrations depending on index `moduleStatus` — verify after entity shell lands. | Search owner review |
| P2-5 | Demo evidence still uses `example.invalid` citations across relationship edges. | Module owner reviews |
| P2-6 | Story Mode branch tip equals Explain This — no narrative mode yet. | SHA equality `3528c3f` |

### P3 — post-beta / roadmap

| ID | Finding |
| --- | --- |
| P3-1 | No live ingest; all intelligence is curated sample/demo. |
| P3-2 | Waypoint’s Take standalone route empty while Takes appear inline — decide route vs inline-only. |
| P3-3 | Supply Chains / Scenario Explorer placeholders remain. |
| P3-4 | Articles `likelyImpactPath` not yet soft-linked to `gsr_*` / graph edges. |

---

## Module review notes

### Dashboard / Home

**Shippable as application home.** `/side-trails/global-signals/` is now a dense sample/demo intelligence board (`gsh-board`) composing live module datasets. `/global-dashboard/` remains an honest empty shell — do not confuse the two. Home tip moved mid-review from umbrella-only to feat `b31a819`.

### Articles

On main; solid sample briefs with fact/Take/impact-path separation. Nav thinner than landing. Trust labeling excellent.

### Relationship Graph

Primary visual graph works (radial-from-focus, expand-on-click, edge metadata). Dense chrome above canvas. Companion Cascade Explorer retained — good literacy split if nav explains it.

### Relationship Explorer

Working cascading UI. Distinct from Graph. Keep both; clarify naming in shared nav (“Graph” vs “Explorer”).

### Country / Industry Intelligence

Working structural profiles with soft-links. Not live news — labeled. Nav omission of peer modules is the main cohesion gap.

### Citizen Impact

Working eight-category board with cause chains and confidence rules. Soft-links improved once Explorer/Graph exist on release.

### Explain This

Signature module works; deterministic matching; honest gaps; no LLM. Best Beta front door (landing already treats it as primary CTA).

### Navigation

**Largest cohesion failure.** Recommend one shared GS nav partial used by every live module: Explain · Search · Graph · Explorer · Countries · Industries · Citizen · Articles (+ Side Trails). Drop per-page inventiveness.

### Entity system

**Integrated late.** Canonical `/entities/<type>/<slug>/` with Countries/Industries as aliases. Dual `?entity=` / `?focus=` contract for graph soft-links. Module nav still fragmented vs home chrome.

### Search

Integrated on release; deterministic structured index; not AI. Captured Taiwan query results. Rebuild index whenever relationship seeds change (done after merge).

### Story Mode

Not present as a distinct feature. Do not list in Beta marketing.

---

## Duplicate pages / dead ends / marketing shells

| Pattern | Assessment |
| --- | --- |
| Graph + Explorer + Explain | Related, not duplicates — need hierarchy copy |
| Waypoint’s Take route vs inline Takes | Duplicate *concept*; route is dead-end shell |
| Global Dashboard vs Landing | Landing is real; dashboard is shell |
| Roadmap “modules” that explain future | Marketing shells — keep honest, demote from primary nav |
| Coming-soon Product nav (`Product` only) | Dead-end chrome vs live modules |

**Pages that explain instead of doing:** Coming-soon shells (appropriate). Landing “How it works” / roadmap (appropriate for Experimental). Live modules generally *do* intelligence work with sample data rather than only describing it.

---

## Tests run (release tip)

```text
node automation/test-global-signals.mjs                         OK
node automation/test-global-signals-articles.mjs                OK
node automation/test-global-signals-search.mjs                  OK
node automation/test-global-signals-relationships.mjs           OK
node automation/test-global-signals-relationship-graph.mjs      OK
node automation/test-global-signals-citizen-impact.mjs          OK
node automation/test-global-signals-countries.mjs               OK
node automation/test-global-signals-industries.mjs              OK
node automation/test-global-signals-explain.mjs                 OK
node automation/test-side-trails.mjs                            OK
```

Screenshot capture: `node automation/capture-gs-beta-owner-review-screenshots.mjs`

---

## Recommended release plan

### Merge order used (already on `release/global-signals-beta`)

1. `origin/main` (Articles)
2. Home-dashboard umbrella @ `f7ade1e` (Explorer → Citizen → Country → Industry → Graph → Explain)
3. Universal Search @ `4f788ee` (after umbrella; conflict policy: release/WDS tip wins on shared relationships data)

### Gates before calling Beta “audience-ready”

1. **Shared nav partial** on every live module (P1-1).
2. **Landing cleanup:** primary CTAs = Explain · Search · Graph · Articles; demote Roadmap; keep Experimental + sample/demo banners.
3. **Clarify Graph vs Explorer** in one sentence on both pages.
4. **Do not link Global Dashboard** from primary nav until implemented.
5. Re-run GS automation suite + visual smoke of Taiwan path: Explain → Graph → Country → Industry → Citizen → Article → Search.
6. Owner sign-off on Experimental Beta labeling (never “live news”).

### Wait / do not merge yet

| Branch | Reason |
| --- | --- |
| `feature/global-signals-story-mode` | No distinct feature |
| Further churn on home/entity after `bac5862` / `86f5f34` | Re-fetch before audience Beta if tips move again |

### Explicitly out of scope

- Merge to `main`
- Deploy / Pages publish
- Live ingest

---

## Remaining roadmap (post-beta)

1. **Shared shell** — one nav, one footer, consistent CTA budget.
2. **Entity system** — unified entity pages; Search/Graph/Explain deep-link to entities.
3. **Home Dashboard** — calm overview of live sample modules (not a fake ops console).
4. **Story Mode** — guided narrative over curated cascades (separate from Explain).
5. **Graph backbone hardening** — shared graph JSON as single source; trim low-value citizen×country edges if density hurts.
6. **Articles ↔ relationships soft-links** (`likelyImpactPath` → `gsr_*`).
7. **Retire or implement** Waypoint’s Take / Supply Chains / Scenario Explorer placeholders.
8. **Curated live sources** — graduate off `sample-demo` with verified evidence only.
9. **Mobile graph** — keep stacked panels; ensure first viewport shows an answer, not only chrome.

---

## Polished-app recommendations (only cohesion)

Deprioritize new features. Prefer:

1. Shared GS chrome (nav + honesty banner pattern).
2. Single entry story: **Ask (Explain) → See (Graph) → Read (Articles) → Situate (Country/Industry) → Feel (Citizen) → Find (Search).**
3. Remove primary-nav access to coming-soon shells.
4. Fold redundant module CTA strips once top nav is complete.
5. Entity shell as the join key across modules.

---

## Product standards check

| Standard | Beta assessment |
| --- | --- |
| Trust / no fabricated news | Pass — sample/demo banners ubiquitous |
| Facts vs estimates vs placeholders | Pass on Articles / Explain / edges |
| Honest AI | Pass — Explain/Search explicitly non-LLM |
| Coming soon honesty | Pass on empty shells |
| Calm Experimental Side Trail | Pass |

---

## Go / no-go

| Decision | Call |
| --- | --- |
| Experimental Beta branch | **GO** — prepared on `release/global-signals-beta` (includes late Home + Entity tips) |
| Merge to main | **NO** |
| Deploy | **NO** |
| Market as finished Global Signals product | **NO** |
| Wait for Story Mode + shared-nav polish before main | **YES** |

---

## SHAs

| Role | SHA |
| --- | --- |
| `origin/main` base | `f00b4ae` |
| Home umbrella tip integrated | `f7ade1e` |
| Search tip integrated | `4f788ee` |
| Review package commit | `e5e5368` |
| Branch HEAD after stamps | _(reported at push; may include docs SHA stamps)_ |
