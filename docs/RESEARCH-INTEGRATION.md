# SignalTerrain — Research Integration

**Status:** Active foundation  
**Parent:** [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)  
**Complements:** [WAYPOINT-KNOWLEDGE-PLATFORM.md](WAYPOINT-KNOWLEDGE-PLATFORM.md) · [RESEARCH-INTEGRITY.md](RESEARCH-INTEGRITY.md)

Research should **enrich topics**, not pile up as a separate unread library.

---

## Principle

A paper, RFC, conference talk, or vendor write-up attaches to the topics it illuminates — CVEs, protocols, vendors, propagation, infrastructure — through citations and `documented_in` / `references` / `published_by` edges.

---

## Research kinds on a topic

| Slot | Examples |
|------|----------|
| Academic papers | Journals, preprints (labeled) |
| Vendor research | Vendor blogs, security notes |
| Government guidance | Advisories, frameworks |
| Industry reports | Named orgs; quality-gated |
| Conference talks | Slides/talk pages when citable |
| Books | Canonical references |
| Technical documentation | Manuals, developer docs |
| Standards / RFCs | Formal specs |
| Historical publications | Labeled historical |
| Waypoint Analysis | Labeled Perspective — never merged into source voice |

Schema fields: `research`, `technicalDocs`, `governmentRefs`, `primarySources`, `relatedKnowledgeIds`, `waypointAnalysis`.

---

## Integration flow

```
Research item discovered
        │
        ▼
 Find or create research-paper / standard / advisory topic
        │
        ├── documented_in / references → subject topics
        ├── published_by → org/vendor
        └── timeline entry on subject topics (“research published”)
        │
        ▼
 Optional: link wk_* curated knowledge for studio-wide library depth
```

---

## Current events → research → history

```
Breaking advisory
  → vendor + product topics
  → CVE topics
  → cited research
  → historical incident topics
  → mitigation topics
  → watch-for / future-development topics
```

Knowledge grows; the feed does not reset understanding to zero.

---

## Honesty

- Distinguish preprint vs peer-reviewed vs adopted standard.  
- Cite DOIs / RFC numbers / canonical URLs when available.  
- Unknowns required when the paper’s applicability is unclear.  
- No exploit PoCs as “research attachments.”

---

## Editorial ownership

Perspective is human-owned. AI may draft with `aiAssisted` disclosure; it does not auto-publish unverified incidents or attributions.

---

## Related

- [TOPIC-LIFECYCLE.md](TOPIC-LIFECYCLE.md)  
- [RELATIONSHIP-TYPES.md](RELATIONSHIP-TYPES.md)  
- [SIGNALTERRAIN-EDITORIAL-STANDARDS.md](SIGNALTERRAIN-EDITORIAL-STANDARDS.md)
