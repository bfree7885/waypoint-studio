# SignalTerrain — Performance Review (Work Block 8)

**Date:** 2026-07-18  
**Method:** Payload sizing, runtime patterns, smoke-test topology (no load-lab run)

---

## Current envelope (evidence)

| Asset | Approx size |
|-------|-------------|
| `cyber-intelligence.sample.json` | ~117 KB |
| Quiet-day brief sample | ~146 KB |
| Critical / ransomware / patch-tuesday briefs | ~342–378 KB |
| Cyber JS (surface runtimes + helpers) | ~6.5k LOC |

| Pattern | Observation |
|---------|-------------|
| App model | MPA — full reload between Brief/Explorer/Advisor/Knowledge |
| Graph paint | Rebuild HTML lists / SVG-ish nodes; not virtualized |
| Timeline | Windowed (`TIMELINE_PAGE = 12`) — good precedent |
| Search | In-memory token index per Knowledge mount |
| Caching | Ingest localStorage caches; research cache prefix |
| Fonts | Google Fonts network dependency on first paint |

---

## Findings

### P1 — Large JSON payloads on critical paths

| Item | Detail |
|------|--------|
| **Findings** | Brief demos can download hundreds of KB of pre-expanded JSON; intelligence sample loads on most cyber tools. |
| **Evidence** | Sample sizes above; mount `Promise.all` loaders. |
| **Recommendations** | Generate briefs; chunk intelligence; gzip at host; prefer scenario seeds. |
| **Priority** | High |
| **Estimated effort** | 2–4 days |
| **Expected impact** | Faster first paint; lower memory |

### P2 — Full document paints on navigation within a page

| Item | Detail |
|------|--------|
| **Findings** | Hash changes rebuild large `innerHTML` trees; focus and scroll reset. |
| **Evidence** | Explorer/knowledge routers. |
| **Recommendations** | Replace only `#panel` region; reuse static chrome; preserve focus target. |
| **Priority** | High |
| **Estimated effort** | 2–3 days |
| **Expected impact** | Perceived performance + a11y |

### P3 — MPA cost vs SPA temptation

| Item | Detail |
|------|--------|
| **Findings** | Full reload re-parses scripts and re-fetches samples when switching tools. |
| **Evidence** | Separate HTML entries per tool. |
| **Recommendations** | Keep MPA for isolation; add `Cache-Control`/service worker only after privacy review; optional soft-nav later. Avoid heavy SPA until needed. |
| **Priority** | Medium |
| **Estimated effort** | Caching 1–2 d |
| **Expected impact** | Repeat-visit speed |

### P4 — Graph / map scaling

| Item | Detail |
|------|--------|
| **Findings** | Fine for dozens–low hundreds of nodes; will degrade with dense relationship sets. |
| **Evidence** | Neighbor listing + full list rendering. |
| **Recommendations** | Cap visible degree; “show more”; no force-directed engine until necessary. |
| **Priority** | Medium |
| **Estimated effort** | 1–2 days |
| **Expected impact** | Stable interaction at 1k+ edges |

### P5 — Background refresh

| Item | Detail |
|------|--------|
| **Findings** | Mock ingest can rewrite caches; no backoff/jitter story for future live pulls. |
| **Evidence** | Ingest health “Run mock pipeline”. |
| **Recommendations** | Design rate limits + stale-while-revalidate before live connectors. |
| **Priority** | Medium |
| **Estimated effort** | 1–2 days design |
| **Expected impact** | Reliability when live |

### P6 — Offline behavior

| Item | Detail |
|------|--------|
| **Findings** | Local samples work offline if already cached by browser; Google Fonts break calm offline. |
| **Evidence** | CDN font links. |
| **Recommendations** | Self-host fonts; document offline demo mode. |
| **Priority** | Medium |
| **Estimated effort** | 1 day |
| **Expected impact** | Offline demos / privacy |

### P7 — Startup / memory / CPU

| Item | Detail |
|------|--------|
| **Findings** | Main cost is JSON parse + string HTML build, not continuous CPU. Memory scales with retained graphs + last brief. |
| **Evidence** | Mount patterns; no workers. |
| **Recommendations** | Avoid retaining multiple full brief samples; drop unused scenario JSON after parse. |
| **Priority** | Low–Medium |
| **Estimated effort** | 0.5–1 d |
| **Expected impact** | Lower peak memory |

---

## Recommended order

1. Shrink / generate briefs  
2. Chunk intelligence package  
3. Partial DOM updates on hash change  
4. Self-host fonts  
5. Degree caps on graph UI  
6. Connector rate-limit design  

Avoid premature WebGL/graph DBs. Prefer measured limits documented in product.

Related: [SCALABILITY-REVIEW.md](SCALABILITY-REVIEW.md), [PLATFORM-HARDENING.md](PLATFORM-HARDENING.md).
