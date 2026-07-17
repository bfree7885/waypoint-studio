# SignalTerrain — Relationship Types

**Status:** Active foundation  
**Catalog:** `design-system/signalterrain/relationship-types.json`  
**Schema:** `schema-relationship-v1.json`  
**Parent:** [KNOWLEDGE-GRAPH.md](KNOWLEDGE-GRAPH.md)

Typed relationships let knowledge connect without sensational graphs. Prefer a precise type over dumping everything into `related_to`. Speculative edges must stay labeled — or omitted.

---

## Canonical types

| Type | Intent | Notes |
|------|--------|-------|
| `affects` | Condition/event impacts a topic | Outages, space weather, campaigns (literacy) |
| `uses` | Subject uses an object (tech, protocol, product) | |
| `targets` | Literacy: actor/campaign targets a product or CVE | **Never** exploit steps |
| `references` | Cites or points to another topic | |
| `published_by` | Paper/advisory published by org | |
| `patched_by` | Fix/mitigation published by vendor | Defensive |
| `related_to` | General useful association | Use sparingly |
| `depends_on` | Technical or operational dependency | |
| `replaces` | Newer topic replaces older | |
| `supersedes` | Formal supersession (advisory, standard) | |
| `detects` | Guidance/tooling detects a condition | Awareness — not a scanner product |
| `mitigates` | Guidance or control reduces risk | Defensive |
| `documented_in` | Topic is documented in a paper/standard | Inverse of older `documents` |
| `discovered_by` | Discovery credit (researcher/org) | |
| `reported_by` | Report attribution | |
| `associated_with` | Cautious association | Prefer higher precision when possible |
| `communicates_over` | System communicates over a medium/protocol/freq | |
| `interrupts` | Event interrupts a service or medium | |
| `caused_by` | Effect linked to a cause topic | Require sources when strong |
| `supports` | Evidence or capability supports a claim/topic | |
| `conflicts_with` | Sources or claims disagree | Surface in UI |
| `observed_with` | Co-occurrence worth noting | Calm; not forced causality |

### Compatibility aliases (still accepted)

| Alias | Prefer |
|-------|--------|
| `related-to` | `related_to` |
| `see-also` | `related_to` or `references` |
| `advises-on` | `references` + advisory kind (or `mitigates` when guidance) |
| `documents` | inverse edge using `documented_in` |
| `exploits-or-involves` | `targets` or `associated_with` (literacy only) |
| `uses-protocol` | `uses` |
| `observed-on` | `observed_with` or `communicates_over` |
| `watch-with` | `related_to` (product habit) |
| `historically-related` | `related_to` with timeline context |
| `operates` | `associated_with` / `uses` |
| `part-of` | `depends_on` or `related_to` |
| `located-in` | `associated_with` (geo) |

---

## Creating relationships

1. Prefer evolve-in-place topics before new near-duplicates.  
2. Require a plain-language `label`.  
3. Set `confidence` honestly (`high` → `speculative`).  
4. Attach `sources` when claiming attribution, causation, or targeting.  
5. Editorial review for `targets`, `caused_by`, and actor links.  
6. Never encode attack procedures in edge metadata.

---

## Filtering in the explorer

Users may filter by type and confidence so the view stays calm. Default explorer views show a **small neighbor set**; expansion is explicit.

---

## Related

- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md)  
- [TOPIC-LIFECYCLE.md](TOPIC-LIFECYCLE.md)  
- [RESEARCH-INTEGRATION.md](RESEARCH-INTEGRATION.md)
