# SignalTerrain — Scalability Review (Work Block 8)

**Date:** 2026-07-18  
**Horizon:** ~10 years of product evolution  
**Assumption:** Privacy-first, local-first whenever practical; educational cyber awareness — not SIEM

---

## What will become difficult

| Growth pressure | Why it hurts | When |
|-----------------|--------------|------|
| Entity/relationship count ≫ sample (~hundreds → tens of thousands) | Full-bundle load + in-memory graph + full UI redraw | Early if live feeds arrive |
| Briefing corpus growth | Pre-baked multi-hundred-KB JSON per scenario | Already visible in samples |
| Knowledge encyclopedia growth | Token search rebuilds; no inverted index persistence | Medium term |
| Cross-workspace topics (RF + Cyber + Infra) | Duplicate graphs or one mega-bundle | Medium term |
| Multi-device sync | localStorage keys + export/import ad hoc | When sync is opted in |
| Contributor count | IIFE globals + undocumented load order | As soon as second active engineer |

---

## What becomes expensive

| Cost center | Driver | Mitigation while young |
|-------------|--------|------------------------|
| Rewriting paint logic | `innerHTML` routers without view models | Extract pure builders now |
| Re-normalizing connectors | Ad-hoc connector shapes | Keep normalization + provenance contracts sacred |
| Debugging priority rules | Opaque stacks of factors | Keep explainability artifacts mandatory |
| Hosting privacy story | Third-party fonts/CDN + missing CSP | Self-host + CSP early |
| Data migration | Unversioned localStorage blobs | Version every key (`_v01`) — already started |

---

## Redesign-now recommendations

### R1 — Treat intelligence as versioned packages, not one JSON file

| Item | Detail |
|------|--------|
| **Findings** | Single `cyber-intelligence.sample.json` (~117 KB) is both demo and de facto store. |
| **Evidence** | Sample size; all surfaces `loadBundle` the same file. |
| **Recommendations** | Package manifest + chunked entity files; graph build from chunks; retain sample as one fixture for tests. |
| **Priority** | High |
| **Estimated effort** | 3–5 days |
| **Expected impact** | Startup time, memory, incremental updates |

### R2 — Separate “reasoning inputs” from “rendered brief”

| Item | Detail |
|------|--------|
| **Findings** | Scenario briefs store fully expanded output (up to ~378 KB). |
| **Evidence** | `briefing/samples/patch-tuesday.brief.json` et al. |
| **Recommendations** | Persist scenario seeds + profile; generate brief client-side; cache last brief locally. |
| **Priority** | High |
| **Estimated effort** | 2–3 days |
| **Expected impact** | Repo size, freshness, testability |

### R3 — Keep graph API immutable; expand query API carefully

| Item | Detail |
|------|--------|
| **Findings** | Traversal is fine at sample scale; no indexes beyond `byId`. |
| **Evidence** | `createGraph` neighbors/path helpers. |
| **Recommendations** | Add `byKind` indexes (exists) + optional adjacency lists; avoid premature DB. Document max recommended in-memory size. |
| **Priority** | Medium |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Predictable performance envelope |

### R4 — Plan workspace federation before mega-graph

| Item | Detail |
|------|--------|
| **Findings** | Platform architecture promises shared topic model across RF/Cyber/Infra. |
| **Evidence** | `SIGNALTERRAIN-PLATFORM-ARCHITECTURE.md` workspaces table. |
| **Recommendations** | Define cross-workspace edge types + ID namespaces now; do not merge all entities into one file. |
| **Priority** | Medium |
| **Estimated effort** | 2 days design |
| **Expected impact** | Avoid decade of ID collisions |

### R5 — Delay framework rewrite; invest in module boundaries

| Item | Detail |
|------|--------|
| **Findings** | Vanilla IIFEs work; a React rewrite would burn calendar without fixing data boundaries. |
| **Evidence** | ~6.5k LOC cyber JS; working smoke tests. |
| **Recommendations** | ES modules + shared util first; UI framework only if interaction complexity demands it. |
| **Priority** | Medium |
| **Estimated effort** | Modules 3–5 days |
| **Expected impact** | Lower rewrite risk |

---

## Architecture decisions to change while young

1. **Payload strategy** — generate briefs; chunk intelligence.  
2. **Storage catalog** — one documented namespace for all client state.  
3. **Surface chrome** — one cyber shell, not N peer-link variants.  
4. **Test pyramid** — keep contract tests; add one browser smoke path before live connectors.  
5. **Hosting defaults** — self-hosted fonts + CSP baseline before public traffic.

---

## What should *not* be redesigned yet

- Priority factor explainability model  
- Educational / non-offensive product boundary  
- Local-first privacy default  
- Schema-first topic/relationship contracts  
- Mock ingestion until cited connectors exist  

Related: [PERFORMANCE-REVIEW.md](PERFORMANCE-REVIEW.md), [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md).
