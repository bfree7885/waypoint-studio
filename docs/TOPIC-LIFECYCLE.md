# SignalTerrain — Topic Lifecycle

**Status:** Active foundation  
**Parent:** [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)  
**Schema:** `design-system/signalterrain/schema-topic-v1.json`

Topics are living records. They accumulate timeline, research, relationships, and revised confidence instead of becoming disposable articles.

---

## States

| Status | Meaning |
|--------|---------|
| `sample` | Educational / demo only |
| `draft` | In editorial work |
| `active` | Honestly usable for stated scope |
| `archived` | Superseded or retired; keep for history |

---

## How a topic is born

1. **Identify the durable entity** (CVE, vendor, frequency, paper, event class).  
2. **Search the graph** — merge into an existing topic when it is the same entity.  
3. **Create** only when no honest match exists.  
4. **Seed** overview, at least one unknown, confidence, verification, and labeled Perspective when editorial voice is used.  
5. **Attach** sources and an initial timeline entry (`discovered`, `disclosed`, `noted`, etc.).

---

## How topics evolve

| Change | Where it lands |
|--------|----------------|
| New fact | `knownFacts` + timeline + maybe confidence up |
| New source | `primarySources` / research / governmentRefs |
| Disagreement | `conflicts` via edges `conflicts_with` + unknowns |
| Patch / mitigation | relationship `patched_by` / `mitigates` + timeline |
| Stale claim | confidence down; timeline note; verification limitations |
| Current event | timeline entry on **existing** topics — do not spawn a disconnected article |

---

## Living timeline

Every topic should support a chronology such as:

- Discovery  
- Disclosure  
- Patch  
- Government advisory  
- Research publication  
- Major historical incidents (cited)  
- Mitigations  
- Historical references  
- Related developments / watch items  

Timeline entries use `at`, `text`, optional `kind`, and `sourceLabel`.

---

## Confidence changes

Confidence is not a trophy. It moves with evidence:

- Corroboration from primary sources → may rise  
- Single-source or rumor → stay low / speculative  
- Conflict → expose `conflicts_with`; do not hide  
- Staleness → freshness/limitations; may lower trust label  

Align with Trust recommendation labels via crosswalk.

---

## Editorial review

Required review before promoting speculative `targets` / `caused_by` / actor links to higher confidence.  
Samples stay `sample` forever unless replaced by real cited records.

Process complements [SIGNALTERRAIN-EDITORIAL-STANDARDS.md](SIGNALTERRAIN-EDITORIAL-STANDARDS.md) and [RESEARCH-INTEGRATION.md](RESEARCH-INTEGRATION.md).

---

## Merge & supersede

- Prefer merge when two topics are the same entity.  
- Use `supersedes` / `replaces` edges when a newer advisory or standard formally replaces another.  
- Keep archived topics for historical navigation.

---

## Related

- [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)  
- [SIGNALTERRAIN-TOPIC-MODEL.md](SIGNALTERRAIN-TOPIC-MODEL.md)
