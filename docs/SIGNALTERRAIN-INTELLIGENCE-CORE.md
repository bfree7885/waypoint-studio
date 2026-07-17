# SignalTerrain — Intelligence Core V0.1

**Status:** Architecture (contracts + prototype — no IDS/IPS, no live ingestion)  
**Tagline:** What changed? Why does it matter? Who is affected? What should happen next?  
**Package:** `design-system/signalterrain/intelligence/`  
**Product home:** SignalTerrain  

This sprint elevates SignalTerrain from a collection of cyber ideas into a coherent **Intelligence Platform** architecture. It does **not** build IDS or IPS. It designs the intelligence engine those capabilities may eventually consume.

---

## Four questions (product law)

Every surface, schema, and recommendation must reinforce:

| # | Question | Primary fields / artifacts |
|---|----------|----------------------------|
| 1 | **What changed?** | UIO `summary`, `firstSeen`, `updated`, timeline deltas |
| 2 | **Why does it matter?** | `whyItMatters`, severity, confidence, context |
| 3 | **Who is affected?** | `affectedSystems`, `industries`, `geographicScope` |
| 4 | **What should happen next?** | Recommendation objects (guidance only — never auto-execute) |

If a feature cannot answer at least one of these honestly, it does not belong in Core.

---

## What this is not

- Not IDS / IPS / packet inspection products  
- Not a SIEM replacement  
- Not a news website or RSS reader  
- Not offensive security tooling  
- Not automatic defensive execution  

Geopolitical and infrastructure items become **structured intelligence events**, not articles.

---

## Architecture overview

```
Providers (interfaces only in V0.1)
        │  normalize()
        ▼
 Unified Intelligence Object (UIO)
        │
        ├── attach → Topics (living knowledge graph)
        ├── correlate → Intelligence graph edges
        └── recommend → Recommendation objects (human review)
        │
        ▼
 Surfaces
   ├── Intelligence Summary (prototype)
   ├── Knowledge graph / Topics
   └── Future: personal relevance, inventory, passive IDS (roadmap only)
```

**Layering with existing work:**

| Existing | Role beside Core |
|----------|------------------|
| Signal Intelligence Engine | Observation / Signal Card contracts |
| Living Knowledge Graph | Durable topics + relationships |
| Trust / Evidence | Confidence labels, Evidence Card |
| Intelligence Core (this) | Event normalization, correlation patterns, recommendations, summary |

UIOs are **time-bound intelligence events**. Topics are **durable entities**. Correlation links both.

---

## Intelligence domains

Catalog: `intelligence/domains.json`.

| Domain | Status | Examples |
|--------|--------|----------|
| **Cyber** | Architecture + samples | CVE, KEV, vendor advisories, malware, ransomware, threat actors, CISA alerts, active exploitation (awareness) |
| **Infrastructure** | Blueprint | Internet / cloud / power / communications outages |
| **Geopolitical** | Blueprint | Conflicts, maritime disruptions, sanctions, supply chain, international incidents — as structured events |
| **Radio** | Blueprint (RF foundations exist elsewhere) | SDR observations, receiver logs, NOAA, aviation, marine, amateur, AIS, ADS-B |

Domains share one UIO schema. They do not become separate products in Studio nav.

---

## Unified Intelligence Object (UIO)

Schema: `schema-uio-v0.1.json`.

Normalized fields include:

`id` · `title` · `summary` · `category` · `domain` · `confidence` · `severity` · `source` · `references` · `tags` · `affectedSystems` · `industries` · `geographicScope` · `firstSeen` · `updated` · `expiration` · `relatedEventIds` · `topicIds` · `whyItMatters` · `unknowns`

Ids use prefix `uio_`. Samples are labeled `sample`.

---

## Correlation engine

Design: [SIGNALTERRAIN-CORRELATION-ENGINE.md](SIGNALTERRAIN-CORRELATION-ENGINE.md).  
Patterns: `correlation-patterns.json`.

Example chains (educational):

```
Geopolitical conflict → shipping disruption → energy pressure
  → cyber retaliation literacy → government advisory → related CVEs
```

```
New vulnerability → public PoC note (awareness) → active exploitation reports
  → vendor patch → recommended mitigation
```

Correlation proposes edges; editorial confidence gates apply. No automatic attribution theater.

---

## Defensive guidance (recommendations)

Design: [SIGNALTERRAIN-RECOMMENDATIONS.md](SIGNALTERRAIN-RECOMMENDATIONS.md).  
Schema: `schema-recommendation-v0.1.json`.

Each recommendation answers: Why? Who? Priority? Evidence? Recommended action? Expected duration? Dependencies?

**No automatic execution.** Recommendations only.

---

## Provider interfaces

Contract: `schema-provider-v0.1.json`.

Providers declare `id`, `domain`, `capabilities`, `normalize(raw) → UIO[]`, honesty limits, and rate/freshness expectations. **No connectors ship in V0.1.**

---

## Intelligence Summary (dashboard vision)

Prototype: `apps/signalterrain/summary.html`.

Summarize the day — do not list endless feeds:

> Today: active ransomware campaign targeting healthcare · vendor released critical patches · maritime disruption affecting shipping · new CISA-style advisory · phishing themes tied to current events  

Concise intelligence. Not news.

---

## Document map

| Document | Role |
|----------|------|
| **This file** | Core architecture & four questions |
| [Roadmap](SIGNALTERRAIN-INTELLIGENCE-ROADMAP.md) | Phases 1–7 (ingestion → carefully bounded IPS) |
| [Correlation Engine](SIGNALTERRAIN-CORRELATION-ENGINE.md) | Graph design for events + topics |
| [Recommendations](SIGNALTERRAIN-RECOMMENDATIONS.md) | Defensive guidance objects |
| [Knowledge Graph](KNOWLEDGE-GRAPH.md) | Durable topic graph |
| [SI Vision](SIGNAL-INTELLIGENCE-VISION.md) | Shared SI platform vision |

---

## Success criteria (V0.1)

1. Four questions are explicit product law.  
2. UIO + recommendation + provider contracts exist.  
3. Correlation patterns document multi-hop chains.  
4. Intelligence Summary prototype summarizes, does not scroll feeds.  
5. Roadmap places IDS/IPS **after** intelligence maturity — and never in this sprint.  
6. No commit/push without owner review.

---

## Related package

`design-system/signalterrain/intelligence/`
