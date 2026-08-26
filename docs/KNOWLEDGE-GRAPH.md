# Deck-internal knowledge graph notes

**Status:** Internal architecture  
**Tagline:** Everything is connected.  
**Package:** `design-system/deck-signals/`  
**Not a public product.** Canonical portfolio: [`PRODUCT-DIRECTION.md`](PRODUCT-DIRECTION.md).

Information should never exist in isolation. Typed **relationships** can connect durable objects — topics, research, infrastructure — for future Waypoint Deck situational awareness. This is not a news river or a public product surface.

---

## Mission

Begin on one topic. Discover what it connects to. Understand how the pieces fit together.

Users should leave thinking: **“I understand how these pieces fit together.”**  
Not: “I just read another article.”

---

## What this is not

- Not new RF tools, scanners, packet analyzers, or offensive capabilities  
- Not a SIEM topology map  
- Not an endless article feed that resets daily  

Current events **attach** to existing topics so knowledge accumulates.

---

## Node model

Every important object is a topic (`st_*`). Node kinds include (extensible carefully):

CVE · threat group · malware · vendor · protocol · frequency · satellite · research paper · government advisory · company · country · organization · technology · cloud provider · software · product · infrastructure · internet / communications / power / weather / space-weather events · academic publication · conference presentation · technical standard · RFC · mitigation · historical incident · future development

Schema: `schema-topic-v1.json`.  
Catalog notes: [TOPIC-LIFECYCLE.md](TOPIC-LIFECYCLE.md).

---

## Relationship model

Typed edges (`str_*`) carry confidence and optional citations. Canonical types live in `relationship-types.json` and [RELATIONSHIP-TYPES.md](RELATIONSHIP-TYPES.md).

Edges are created by editorial judgment + sources — never by inventing attribution.

---

## How information enters the graph

```
Source (advisory, paper, note, status page, user log)
        │
        ▼
 Normalize → Topic create-or-update (prefer evolve-in-place)
        │
        ├── Timeline entry
        ├── Research / citations
        ├── Confidence + unknowns
        └── Relationship proposals (reviewed)
        │
        ▼
 Living graph (search · explorer · topic pages)
```

Details: [TOPIC-LIFECYCLE.md](TOPIC-LIFECYCLE.md) · [RESEARCH-INTEGRATION.md](RESEARCH-INTEGRATION.md).

---

## Surfaces

| Surface | Role |
|---------|------|
| **Graph explorer** | Expand/collapse neighbors, filter types & confidence, search, open topics |
| **Topics** | List + detail (foundation) |
| **Topic page** | Overview, timeline, research, analysis, connections |
| **Search** | Fielded graph search across topics and relationships |

Demo: `apps/signalterrain/graph.html` · sample: `samples/living-graph.json`.

---

## Waypoint Analysis (never blur)

Every important topic distinguishes:

| Layer | Meaning |
|-------|---------|
| Observed facts | What is treated as established *for this topic* |
| Primary evidence | Citations that support those facts |
| Technical explanation | How it works (plain language) |
| Historical context | Longer arc |
| Connections | What the graph highlights (and why) |
| Unknowns | Required honesty |
| Confidence | Shared labels — no decorative % |
| Questions worth investigating | Calm next curiosities — not panic |

Perspective (`waypointAnalysis`) stays labeled editorial judgment.

---

## Current events rule

News does not replace knowledge.

```
New advisory
  → existing vendor / product topic
  → related CVEs
  → threat groups (if cited)
  → research
  → historical incidents
  → mitigations
  → watch-for / future developments
```

---

## Confidence

Confidence can rise or fall as sources corroborate, conflict, or go stale. Lifecycle rules: [TOPIC-LIFECYCLE.md](TOPIC-LIFECYCLE.md). Aligns with [WAYPOINT-TRUST-FRAMEWORK.md](WAYPOINT-TRUST-FRAMEWORK.md).

---

## Success criteria

1. Sample chain demonstrates CVE → vendor → advisory → research → actor → history → mitigation → tech → future.  
2. Explorer lets users expand, filter, search, and open timelines without overwhelm.  
3. Research enriches topics instead of living as a separate pile.  
4. Fact and interpretation stay distinct.  
5. No scanners or offensive tooling shipped.

---

## Related

- [SIGNALTERRAIN-TOPIC-MODEL.md](SIGNALTERRAIN-TOPIC-MODEL.md)  
- [SIGNALTERRAIN-RELATIONSHIP-MODEL.md](SIGNALTERRAIN-RELATIONSHIP-MODEL.md)  
- [SIGNAL-INTELLIGENCE-ARCHITECTURE.md](SIGNAL-INTELLIGENCE-ARCHITECTURE.md)
