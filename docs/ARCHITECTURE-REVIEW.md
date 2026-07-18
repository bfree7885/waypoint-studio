# SignalTerrain — Architecture Review (Work Block 8)

**Date:** 2026-07-18  
**Scope:** Cyber workspace + shared SignalTerrain platform surfaces built through Work Blocks 4–7  
**Stance:** Principal architecture review for decade-scale maintainability — not a feature audit

---

## Verdict

SignalTerrain’s cyber stack is a coherent **multi-page, schema-first prototype**: shared intelligence sample, graph helpers, priority rules, briefing, explorer, advisor, knowledge, and mock ingestion. Boundaries (educational / defensive / local-first / explainable) are clear in docs and mostly respected in code.

The largest long-term risks are **runtime duplication**, **MPA chrome drift**, **closed-over graph entity mutation footguns** (mitigated in this block), and **missing shared UI/state abstractions** before the dataset or team grows.

---

## Findings

### F1 — Shared platform vs per-surface runtimes

| Item | Detail |
|------|--------|
| **Findings** | Core contracts (topic/relationship schemas, workspaces, platform-systems catalogs) are sound. Cyber runtimes (`brief`, `explorer`, `advisor`, `knowledge`, `ingest`) each re-implemented browser helpers and page chrome. |
| **Evidence** | Identical `esc` / `loadJson` copies across four+ scripts before Work Block 8; near-duplicate hash routers in explorer/knowledge; peer link sets differed per HTML page. |
| **Recommendations** | Keep domain logic in surface modules; put cross-cutting browser helpers in `wds-signalterrain-util.js`; converge hash routing and peer chrome over time. |
| **Priority** | High |
| **Estimated effort** | 1–2 days (util done); 3–5 days for full chrome/nav unification |
| **Expected impact** | Fewer divergent bugs; faster surface addition |

### F2 — Graph API ownership

| Item | Detail |
|------|--------|
| **Findings** | `createGraph` closed over `entities` while exposing `entities` as a mutable property. Advisor/knowledge reassigned `graph.entities`, which would desync `byId` / `get` / `byKind` if a *new* array were assigned. |
| **Evidence** | `wds-signalterrain-cyber-graph.js`; `graph.entities = …` in advisor/knowledge (removed this block). |
| **Recommendations** | Treat graph as immutable after create; expose `listEntities()`; make `entities` a read-only view (done). Prefer `createGraph(bundle)` rebuilds over mutation. |
| **Priority** | High |
| **Estimated effort** | Done (small); follow-up: freeze relationships similarly |
| **Expected impact** | Prevents silent correctness bugs as callers proliferate |

### F3 — Dependency boundaries

| Item | Detail |
|------|--------|
| **Findings** | Good: explorer/knowledge/advisor consume graph API rather than forking entity schemas. Weak: HTML pages each wire long script chains; no module bundler or explicit dependency graph. |
| **Evidence** | Script tags in `apps/signalterrain/cyber/*.html`; IIFE globals under `WDS.*`. |
| **Recommendations** | Document load order; eventually ES modules or a tiny bootstrap registry. Do not introduce a heavy framework yet. |
| **Priority** | Medium |
| **Estimated effort** | 0.5 day docs; 2–4 days modules when needed |
| **Expected impact** | Safer onboarding; fewer “forgot script” failures |

### F4 — State management

| Item | Detail |
|------|--------|
| **Findings** | State is local to each mount + `localStorage` keys. No shared session model across Brief → Explorer → Advisor. |
| **Evidence** | Keys cataloged in `WDS.signalTerrainUtil.STORAGE_KEYS`; research/inventory/profile/ingest caches. |
| **Recommendations** | Keep local-first. Add a thin `st_session_v1` only when cross-page continuity is a product need. Document key ownership. |
| **Priority** | Medium |
| **Estimated effort** | 1 day catalog/docs; 3–5 days session if required |
| **Expected impact** | Privacy clarity; less key sprawl |

### F5 — Data models vs UI models

| Item | Detail |
|------|--------|
| **Findings** | Intelligence sample + knowledge indexes are clean. UI still rebuilds large `innerHTML` trees from hash changes — presentation logic mixed with routing. |
| **Evidence** | Explorer/knowledge mount paint functions; brief scenario switcher. |
| **Recommendations** | Extract pure “view model” builders testable without DOM; keep paint thin. |
| **Priority** | Medium |
| **Estimated effort** | 3–6 days per large surface |
| **Expected impact** | Testability and safer refactors |

### F6 — Nav / registry coupling

| Item | Detail |
|------|--------|
| **Findings** | Studio nav config and SignalTerrain cyber peer links can diverge; cyber is correctly *not* a separate Studio product, but in-app peer discovery is inconsistent. |
| **Evidence** | `wds-app-nav-config.js` vs per-page `st-cyber-peers` (partially aligned this block). |
| **Recommendations** | Single cyber peer-link helper or data file consumed by HTML or mount. |
| **Priority** | Medium |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Cohesive IA |

---

## Subsystem notes (brief)

| Subsystem | Strength | Weakness |
|-----------|----------|----------|
| Data models / schemas | Versioned, documented | Sample is the runtime source of truth |
| Intelligence graph | Typed entities + traversal helpers | No pagination / incremental load |
| Priority / reasoning | Transparent factors | Rule packs grow with surface count |
| Daily briefing | Explainable, calm tone | Large pre-rendered sample JSON |
| Ingestion | Mock connectors + provenance story | Not live; cache keys opaque to users |
| Knowledge platform | Shared graph links | Search is in-memory token match |
| Visualization | SVG / list graph, coarse map | Not engine-backed; full redraws |
| Shared UI | Foundation CSS growing | Still page-local style islands |

---

## Prioritized architecture roadmap

1. **Stabilize shared util + graph invariants** (started)  
2. **Unify cyber chrome / peer nav**  
3. **Split large sample payloads** (intelligence + briefs)  
4. **Extract view-model builders** for explorer/knowledge/advisor  
5. **Optional ES module bootstrap** when script-order pain exceeds cost  

See also: [TECHNICAL-DEBT.md](TECHNICAL-DEBT.md), [SCALABILITY-REVIEW.md](SCALABILITY-REVIEW.md), [PLATFORM-HARDENING.md](PLATFORM-HARDENING.md).
