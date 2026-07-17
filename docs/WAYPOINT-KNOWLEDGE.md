# Waypoint Knowledge

**Status:** Foundation (curated research layer)  
**Platform canon:** [Waypoint Knowledge Platform V1](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
**Editorial:** [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md)  
**Entity platform:** `design-system/knowledge/` · **Curated research:** `design-system/knowledge/curated/`

Waypoint Knowledge is a **trusted research companion**, not a generic news feed and not a chatbot.

Tagline: **The best information, thoughtfully organized.**

---

## Two layers

| Layer | Purpose | Path |
|-------|---------|------|
| Entity WKP | Species, habitats, concepts apps can query | `design-system/knowledge/` |
| Curated research | Papers, reports, guides, advisories as cards | `design-system/knowledge/curated/` |

Do not scrape or republish copyrighted full texts. Store metadata, original summaries, Waypoint Perspective, short compliant excerpts when needed, and links to originals.

---

## Entry model

Schema: `design-system/knowledge/curated/schema-v1.json`  
Taxonomy: `design-system/knowledge/curated/taxonomy.json`

Core fields include: id, title, subtitle, sourceName, sourceType, authors, publicationName, publicationDate, originalUrl, accessType, peerReviewed, topics, products, locations, species, summary, keyFindings, whyItMatters, waypointAnalysis (UI: **Waypoint Perspective**), limitations, practicalContext, relatedEntries, citation, dateReviewed, reviewStatus, featured, contextualHooks, category.

### Review status

`verified` · `editorial-draft` · `demonstration` · `archived` · `needs-review`

Demonstration fixtures must never be presented as real published research.

### Source Summary vs Waypoint Perspective

- **Source Summary** — faithful account of what the source reports.  
- **Waypoint Perspective** — Studio interpretation; always labeled; never implied to be the authors’ words.

---

## Card UI

- CSS: `design-system/css/wds-knowledge.css`
- JS: `design-system/js/knowledge/wds-knowledge-curated.js` → `WDS.knowledgeCurated`
- Helpers: `renderCard`, `renderList`, `renderRelatedReading`, `filterByProduct`, `byHook`
- Demo page: `knowledge.html`

Cards support progressive disclosure, calm metadata, related reading, no likes/rankings/trending bait.

---

## Product integration

Use guide CTAs only: *Why this matters · Worth noticing · Related research · Background · If you’re curious*.

```js
mount.innerHTML = WDS.knowledgeCurated.renderRelatedReading(bundle, {
  product: "sheds",
  hookId: "sheds-south-aspect",
  heading: "If you're curious",
  compact: true
});
```

Full strategy: [Knowledge Platform V1](WAYPOINT-KNOWLEDGE-PLATFORM.md).

---

## Copyright and citation

- Prefer linking to originals.  
- Do not fabricate researchers, journals, findings, dates, URLs, or statistics.  
- Demo content uses `reviewStatus: "demonstration"` and `accessType: "demo-only"`.  
- Corrections and archives: [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md).

---

## Related

- [Knowledge Platform V1](WAYPOINT-KNOWLEDGE-PLATFORM.md)  
- [Waypoint Editorial Standards](WAYPOINT-EDITORIAL-STANDARDS.md)  
- [Product Framework](WAYPOINT-PRODUCT-FRAMEWORK.md)  
- [Research Integrity](RESEARCH-INTEGRITY.md)  
- [Guide Experience](WAYPOINT-GUIDE-EXPERIENCE.md)  
