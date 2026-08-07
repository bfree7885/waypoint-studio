# Global Signals — Articles System

**Status:** Design only — **not implemented**  
**Product:** Global Signals (Side Trails intelligence platform)  
**Related:** [GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md](GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md) (sibling design; may land on a parallel branch), [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md) (cyber analog), [articles/articles-architecture.md](articles/articles-architecture.md) (outdoor curated feed — **separate product**), [side-trails/README.md](side-trails/README.md)

---

## 1. Purpose

Global Signals Articles are **intelligence briefs**, not a news feed.

Each article helps a reader understand how a sourced world event connects through
trade, infrastructure, policy, energy, weather, conflict, cyber, and industry —
and what ordinary people might notice.

It answers:

> What happened (sourced), what does it connect to, and what might cascade — with honest confidence?

It does **not** answer:

> What should I click next to stay anxious? Who is winning a culture war? How do I exploit a system?

This document is a **design contract**. No article runtime, ingest pipeline, or UI is shipped in this branch.

---

## 2. Product stance

| Prefer | Refuse |
| --- | --- |
| Calm intelligence briefs | News-site urgency, autoplay, countdown theater |
| Evidence-required claims | Fabricated events or “demo drama” stories |
| Honest confidence labels | Fake precision percentages |
| Graph-linked affected nodes | Orphan headlines with no relational context |
| Distinct Waypoint’s Take | Restating the summary in different words |
| Citizen impact literacy | Surveillance framing of individuals |
| Source attribution always visible | Republishing full publisher articles |

Global Signals is an **intelligence platform**. Outdoor Waypoint Articles
(`/articles/`) remain a separate curated outdoor reading product. Shared lessons
(Take ≠ summary, provenance labels, no full-text scrape) apply; domain,
node model, and ranking goals do not merge.

---

## 3. Article record (every article)

Every published article record must include all of the following fields.

| Field | Role | Honesty rule |
| --- | --- | --- |
| **Headline** | Short, non-sensational title | No ALL-CAPS clickbait; no invented drama |
| **Summary** | Neutral condensation of what sources report | Facts vs estimates labeled; no Take content |
| **Source** | Primary publisher / agency attribution | Name + link when public URL exists |
| **Evidence** | One or more citable evidence items | **No evidence → no article** |
| **Date** | Event / publication timing | Distinguish event date vs first-seen vs updated |
| **Topics** | Controlled topic tags | Prefer graph topic ids when available |
| **Affected Nodes** | Graph node ids this brief touches | Must resolve in the Relationship Engine |
| **Waypoint’s Take** | Waypoint interpretation (see §5) | **Must never repeat the summary** |
| **Likely Impacts** | Ordered, hedged impact hypotheses | Each impact carries confidence + optional horizon |
| **Confidence** | Overall brief confidence | Discrete labels only — see §6 |

Optional (design-allowed, not required for V1 contract):

- `id` (`gsa_*` stable id)
- `updatedAt`
- `takeProvenance` (`editor-written` · `assisted` · `unavailable`)
- `limitations` / `unknowns`
- `relatedArticleIds`
- `cascadeHints` (pointers into Cascading Impact Explorer when that surface exists)

Illustrative sketch (non-runtime):  
[`design-system/global-signals/schema-article-v1.example.json`](../design-system/global-signals/schema-article-v1.example.json)

---

## 4. Field contracts

### 4.1 Headline

- One line; plain language; no emoji; no “BREAKING”.
- Prefer “what + where/scope” over emotional framing.
- Must remain understandable if the brand chrome is removed — still not a news teaser.

### 4.2 Summary

- What reputable sources say happened (or is reported).
- Length target: ~40–90 words.
- May quote short phrases with attribution; never paste full articles.
- Explicitly separate **observed** vs **estimated** vs **claimed**.
- Empty or thin source material → `summaryProvenance: unavailable` and do not invent filler.

### 4.3 Source

| Subfield | Meaning |
| --- | --- |
| `name` | Publisher or agency display name |
| `url` | Canonical public URL when available |
| `type` | `agency` · `regulator` · `operator` · `research` · `reputable-news` · `other` |
| `retrievedAt` | When Waypoint recorded the citation |

Multiple sources allowed; the primary source is listed first.

### 4.4 Evidence

Each evidence item:

| Subfield | Meaning |
| --- | --- |
| `label` | Human-readable citation label |
| `url` | Public document / status / advisory URL (preferred) |
| `kind` | `primary` · `corroborating` · `context` |
| `note` | Optional limit (e.g. single-source) |

**Hard gate:** at least one `primary` or resolvable official identifier.  
No evidence → article must not publish (same trust pattern as Intelligence Map markers).

### 4.5 Date

| Subfield | Meaning |
| --- | --- |
| `eventDate` | When the underlying event occurred (if known) |
| `publishedAt` | When the source published |
| `recordedAt` | When Global Signals recorded the brief |
| `timezoneNote` | Optional honesty note when times are coarse |

Prefer ISO-8601 dates. Unknown event dates stay `null` — never invent.

### 4.6 Topics

Controlled vocabulary aligned with Global Signals domains, for example:

geopolitics · trade · infrastructure · weather · conflict · energy · cyber · policy · supply-chain · finance · public-health · transport

Topics are filters and search aids. **Affected Nodes** carry the relational truth.

### 4.7 Affected Nodes

Array of Relationship Engine node ids (design target namespace `gsn_*`).

Node types the Articles system must be able to reference (aligned with the
Relationship Engine node model):

Countries · Ports · Canals · Shipping lanes · Companies · Industries ·
Commodities · Energy · Policies · Tariffs · Wars · Sanctions · Weather ·
Cyber attacks · Currencies · Infrastructure · Citizens

**Citizens** nodes mean **impact literacy for ordinary people** — not profiles,
watchlists, or surveillance.

Every article must list **at least one** affected node. Prefer the smallest set
that is evidence-justified; do not spray the graph for visual density.

### 4.8 Likely Impacts

Ordered list of hedged impact statements. Each item:

| Subfield | Meaning |
| --- | --- |
| `statement` | Plain-language possible effect |
| `confidence` | Same discrete scale as §6 |
| `horizon` | Optional: `hours` · `days` · `weeks` · `months` · `uncertain` |
| `relatedNodeIds` | Optional subset of affected / downstream nodes |
| `evidenceRefs` | Optional indexes into the article’s evidence list |

Never present likely impacts as certainties. Prefer “may”, “could”, “sources suggest”.

### 4.9 Confidence (article-level)

Overall confidence that the brief’s **core reported event** and **primary node links** are warranted by evidence — not a prediction score for the future.

---

## 5. Waypoint’s Take (critical)

Waypoint’s Take is the interpretive layer. It is **not** a second summary.

### 5.1 Must explain

1. **Why this matters** — stakes in plain language  
2. **Who is affected** — roles, regions, sectors (not named private individuals)  
3. **What industries are exposed** — concrete industry / commodity exposure  
4. **What citizens may notice** — prices, availability, travel, utilities, jobs, services  
5. **Possible downstream consequences** — second-/third-order hints, hedged  

### 5.2 Must never

- Repeat or paraphrase the **Summary** as the Take  
- Invent events, casualty counts, or attributions not supported by Evidence  
- Use urgency hacks, partisan framing, or engagement farming  
- Imply surveillance of citizens or name private persons as targets  
- Claim predictive certainty (“will cause inflation next Tuesday”)  
- Duplicate outdoor Waypoint Articles product CTAs unless genuinely relevant  

### 5.3 Structure (recommended)

```text
Why it matters — …
Who / industries — …
What citizens may notice — …
Downstream (hedged) — …
Limits — what we do not know yet
```

If material is too thin for an honest Take → `takeProvenance: unavailable` and a
calm empty state. Never fabricate a Take to fill the layout.

### 5.4 Distinction from Summary

| Summary | Waypoint’s Take |
| --- | --- |
| What sources report | Why those reports matter in the graph of life |
| Neutral condensation | Interpretation with labeled confidence |
| Stays close to evidence wording | Explains exposure, noticeability, cascade |
| No industry/citizen coaching required | Must cover the five Take duties above |

QA gate (design): reject Takes whose token overlap with Summary exceeds an
editorial threshold **and** that fail to introduce mattering / exposure /
citizen-notice language.

---

## 6. Confidence labels

Use shared discrete labels (aligned in spirit with SignalTerrain / studio trust):

| Label | Meaning |
| --- | --- |
| `high` | Multiple strong primary sources; node links well supported |
| `moderate` | Credible primary source; some links inferential but labeled |
| `low` | Thin or single-source; proceed carefully |
| `speculative` | Plausible cascade thinking; must not be read as reported fact |

UI must show the label in plain language near the headline and near Likely Impacts.
No decorative “87% confidence” meters.

---

## 7. Graph integration

Articles are first-class participants in the **Relationship Engine** graph.

### 7.1 Automatic connection

On accept/publish (future runtime):

1. Resolve **Affected Nodes** to existing `gsn_*` nodes (or create draft nodes
   only when evidence justifies a new entity — human review for V1).
2. Create typed edges from the article node (`gsa_*`) to each affected node,
   typically `affects` / `references` / `documented_in` (exact type catalog lives
   with the Relationship Engine).
3. Carry relationship metadata consistent with the engine contract:
   **why connected**, **strength**, **confidence**, **direction**, **time delay**.
4. Optionally attach **Likely Impacts** as soft, speculative edges or annotated
   cascade hints — always labeled below factual report edges.

If the Relationship Engine branch is not merged yet, implementers still design
Articles against that node model. Do not invent a second incompatible graph.

### 7.2 Click → highlight affected nodes

Interaction contract (when UI exists):

1. User opens or focuses an article brief.
2. The relationship graph (map or network view) **highlights** all Affected Nodes
   for that article.
3. Edges from the article to those nodes are emphasized; unrelated nodes dim
   (not deleted).
4. Clicking a highlighted node filters or scrolls to articles that affect it
   (bidirectional literacy).
5. Clearing selection restores the calm default graph — no sticky alarm state.

Accessibility: highlight must not rely on color alone (pattern, label, or
`aria-current` / text “N nodes linked”).

### 7.3 Cascade literacy

Articles may deep-link into Cascading Impact Explorer / Citizen Impact surfaces
(sibling designs) using the same node ids. The article remains the **evidence
anchor**; explorers remain the **what-if / downstream** surfaces. Never imply
that a cascade sketch is reported fact.

---

## 8. Editorial pipeline (design)

```text
Candidate signal (manual or future ingest)
        │
        ▼
 Evidence gate (reject if no primary citation)
        │
        ▼
 Neutral Summary (sourced) + Source/Date/Topics
        │
        ▼
 Map Affected Nodes (Relationship Engine ids)
        │
        ▼
 Waypoint’s Take (five duties; never = Summary)
        │
        ▼
 Likely Impacts (hedged) + article Confidence
        │
        ▼
 Graph edges article → nodes (why/strength/confidence/direction/delay)
        │
        ▼
 Publish brief (static JSON or future store)
```

V1 expectation: **editor-written or carefully assisted** briefs. Automated
outdoor-style RSS summarization is **not** the Global Signals default — world
events demand stricter evidence and Take discipline.

---

## 9. Non-goals

- Competing with wire services or becoming a general news homepage  
- Full-text republication or paywall bypass  
- Fabricated sample “live” events in production UI  
- Offensive cyber, exploit detail, or victim targeting  
- Engagement farming (infinite rage scroll, sensational ranking)  
- Merging id spaces with outdoor `/articles/` or SignalTerrain topics without an explicit bridge  

---

## 10. Relationship to other Waypoint surfaces

| Surface | Relationship |
| --- | --- |
| Relationship Engine | Source of node/edge truth; Articles attach and highlight |
| Cascading Impact Explorer | Downstream exploration from the same nodes |
| Citizen Impact dashboard | Citizen-notice layer; Articles feed evidence, not vibes |
| Outdoor Waypoint Articles | Separate product; shared Take≠summary ethic only |
| SignalTerrain | Sister Side Trails project; cyber events may appear as nodes when public and sourced |

---

## 11. Acceptance criteria (when implementation begins)

- [ ] Every shipped article includes all ten required fields  
- [ ] Evidence gate enforced (no evidence → no publish)  
- [ ] Take QA rejects summary restatements  
- [ ] Affected Nodes resolve in the Relationship Engine  
- [ ] Clicking an article highlights those nodes  
- [ ] Confidence uses discrete honest labels  
- [ ] No fabricated events in production paths  
- [ ] Desktop and mobile brief layouts remain calm and accessible  

---

## 12. Document control

| | |
| --- | --- |
| Status | Design only / not implemented |
| Owner review | [product/global-signals-articles-owner-review.md](product/global-signals-articles-owner-review.md) |
| Schema sketch | [schema-article-v1.example.json](../design-system/global-signals/schema-article-v1.example.json) |
| Smoke test | `automation/test-global-signals-articles-docs.mjs` |
