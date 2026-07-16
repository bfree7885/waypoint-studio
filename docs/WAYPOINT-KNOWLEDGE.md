# Waypoint Knowledge

**Status:** Foundation (curated research layer)  
**Working name:** Waypoint Knowledge  
**Entity platform (existing):** `docs/WAYPOINT-KNOWLEDGE-PLATFORM.md` + `design-system/knowledge/`  
**Curated research (this layer):** `design-system/knowledge/curated/`

Waypoint Knowledge is a **trusted research companion**, not a generic news feed and not a chatbot.

It combines:

- Live information (elsewhere in apps)
- Personal observation (elsewhere in apps)
- Trusted research metadata and summaries
- Clear Source Summary vs Waypoint Analysis
- Practical interpretation
- User autonomy

---

## Two layers

| Layer | Purpose | Path |
|-------|---------|------|
| Entity WKP | Species, habitats, concepts apps can query | `design-system/knowledge/` |
| Curated research | Papers, reports, guides, advisories as cards | `design-system/knowledge/curated/` |

Do not scrape or republish copyrighted full texts. Store metadata, original summaries, Waypoint analysis, short compliant excerpts when needed, and links to originals.

---

## Entry model

Schema: `design-system/knowledge/curated/schema-v1.json`

Core fields include: id, title, subtitle, sourceName, sourceType, authors, publicationName, publicationDate, originalUrl, accessType, peerReviewed, topics, products, locations, species, summary, keyFindings, whyItMatters, waypointAnalysis, limitations, practicalContext, relatedEntries, citation, dateReviewed, reviewStatus, featured, contextualHooks.

### Review status

`verified` · `editorial-draft` · `demonstration` · `archived` · `needs-review`

Demonstration fixtures must never be presented as real published research.

### Source Summary vs Waypoint Analysis

- **Source Summary** — faithful account of what the source reports.  
- **Waypoint Analysis** — Studio interpretation; always labeled; never implied to be the authors’ words.

---

## Card UI

- CSS: `design-system/css/wds-knowledge.css`
- JS: `design-system/js/knowledge/wds-knowledge-curated.js` → `WDS.knowledgeCurated`
- Demo page: `knowledge.html`

Cards support progressive disclosure, calm metadata, no likes/rankings/trending bait.

---

## Product categories

Initial categories live in `product-framework.json` per product (Sheds cervid biology, ForageCast fungal ecology, SignalTerrain space weather, etc.).

### Contextual hooks (structure only)

Entries may declare `contextualHooks` such as `sheds-south-aspect` or `foragecast-rain-timing`. Apps may later surface “Why this may matter” without a recommendation engine in this block.

Sheds already offers an optional reading link from the plan “Why this area?” details.

---

## Copyright and citation

- Prefer linking to originals.  
- Do not fabricate researchers, journals, findings, dates, URLs, or statistics.  
- Demo content uses `reviewStatus: "demonstration"` and `accessType: "demo-only"`.  
- Corrections, retractions, and broken-link handling: see Editorial Standards.

---

## Future ingestion

Possible later: editorial CMS, verified import pipelines, advisory monitors.  
Out of scope now: scraping farms, AI daily news at scale, social engagement ranking.

---

## Accessibility

Readable type, adequate contrast, expand/collapse with `aria-expanded`, keyboard focus, reduced-motion respect, mobile reading width.
