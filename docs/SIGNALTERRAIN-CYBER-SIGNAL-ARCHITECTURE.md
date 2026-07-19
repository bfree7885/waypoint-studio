# SignalTerrain Cyber — Signal Intelligence Architecture (Phase 2)

**Date:** 2026-07-18  
**Live engine:** `signalterrain-cyber-live-engine` **1.2.0**  
**Signal engine:** `scripts/cyber-signal/signal-engine.mjs` **2.0.0**  
**Commit policy:** Not committed / not pushed (owner review)

---

## Goal

Turn thousands of provider-backed cyber events into a **prioritized operational picture**: enrich, dedupe, correlate, recommend, brief, trend, and hide noise — without inventing incidents or substituting samples.

---

## Pipeline

```
Providers (KEV, NVD, advisories, GHSA, vendor RSS, cloud status)
        │
        ▼
Normalize + primary CVE dedupe          ← live-engine
        │
        ▼
Priority score (transparent factors)    ← live-engine
        │
        ▼
Signal Intelligence Engine 2.0          ← signal-engine.mjs
  · narrative merge (supporting sources)
  · enrichment metadata
  · recommendation + risk explanation
  · noise flags
  · persona relevance hooks
  · correlation graph
  · operational briefings
  · trend interpretation
  · unified timeline
        │
        ▼
Artifacts
  data/cyber/live.json       — records + signal.* + brief
  data/cyber/correlation.json — full relationship graph
  data/cyber/graph.json       — existing entity graph
  data/cyber/history.json     — brief snapshots
  data/cyber/health.json      — provider + signal timings
        │
        ▼
UI (live.html) — Overview / Briefings / Timeline / Trends / noise toggle / personas
```

---

## Layers

| Layer | Responsibility | Invents data? |
|-------|----------------|---------------|
| Providers | Fetch official/public feeds | No |
| Live engine | Normalize, score, write artifacts | No |
| Signal engine | Interpret & structure for operators | No — labels heuristics |
| UI | Present, filter, local profile/persona | No |

---

## Enrichment fields (per record)

`severity`, `confidence`, `freshness`, `exploitMaturity`, `knownExploitation`, `ransomwareAssociated`, `industryRelevance`, `affectedPlatforms`, `operationalImpact`, `patchAvailability`, `mitigationAvailability`, `likelihoodSmallOrg`, `likelihoodEnterprise`, `publicInterest`, `technicalComplexity`, `edgeExposure`, `supplyChainContext`, `attackHints` (heuristic ATT&CK).

---

## Recommendation vocabulary

`patch-immediately` · `disable-exposed-service` · `increase-monitoring` · `review-vendor-advisory` · `monitor` · `investigate-further` · `ignore`

Every recommendation includes a plain-English **why**.

---

## Persona framework

Architectural hooks for: Windows/Linux admin, home lab, education, healthcare, manufacturing, critical infrastructure, networking, cloud.

Stored preference is local-only (`localStorage`). Full adaptive ranking is deferred to later versions; relevance tags are already attached to records.

---

## Honesty constraints

- No sample/fixture substitution on the live path  
- ATT&CK links marked **heuristic**  
- Recommendations are decision support, not compliance mandates  
- Briefings interpret provider facts only  
