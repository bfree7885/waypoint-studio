# SignalTerrain — Technical Debt Audit (Work Block 8)

**Date:** 2026-07-18  
**Method:** Code + sample + test inventory; prioritize by decade maintainability risk

---

## Priority legend

- **High** — Correctness, security, or coupling that will compound  
- **Medium** — Friction or cost that grows with features/data  
- **Low** — Polish / nice-to-have cleanup  

---

## High

| ID | Debt | Evidence | Recommendation | Effort | Impact |
|----|------|----------|----------------|--------|--------|
| TD-H1 | Duplicated `esc` / `loadJson` / hash helpers | Pre-WB8 copies in brief/explorer/advisor/knowledge | Shared util (done); migrate remaining surfaces (`cyber.js`, summary, topics, connectors) | 0.5–1 d | Maintainability |
| TD-H2 | `createGraph` entity reassignment footgun | Advisor/knowledge assigned `graph.entities` | Read-only `entities` + `listEntities()` (done) | Done | Correctness |
| TD-H3 | Ingest `esc` was identity (XSS footgun if ever HTML-rendered) | Former `return String(s)` | Real HTML escape via util (done) | Done | Security |
| TD-H4 | MPA peer nav / chrome drift | Different back-link sets per page | Shared peers + foundation `.st-cyber-nav` (partially done) | 1 d finish | UX / IA |
| TD-H5 | No CSP; third-party Google Fonts on every cyber page | `<link href="fonts.googleapis.com">` | Self-host fonts; add CSP when hosting model is clear | 1–2 d | Security / privacy |
| TD-H6 | Nav registry duplication risk | Studio nav vs cyber peers | Single cyber IA source | 1–2 d | Consistency |

---

## Medium

| ID | Debt | Evidence | Recommendation | Effort | Impact |
|----|------|----------|----------------|--------|--------|
| TD-M1 | Large briefing samples (342–378 KB) | `briefing/samples/*.brief.json` | Store scenario seeds; generate briefs at runtime in demos | 2–3 d | Perf / repo size |
| TD-M2 | Monolithic intelligence sample (~117 KB) | `cyber-intelligence.sample.json` | Split by kind or lazy chunk; cache with ETag/version | 2–4 d | Startup / memory |
| TD-M3 | Full `innerHTML` paints on hash change | Explorer/knowledge routers | Diff paint or fragment replace; preserve focus | 2–4 d | A11y / perf |
| TD-M4 | Research actions HTML only rich in explorer | Explorer vs knowledge | Shared research-actions renderer | 1 d | Reuse |
| TD-M5 | localStorage key sprawl | Multiple `st_*` / `wds.st.*` prefixes | Use `STORAGE_KEYS` catalog everywhere; privacy doc | 1 d | Privacy / DX |
| TD-M6 | Contract tests load scripts without util | `automation/test-signalterrain-cyber-*.mjs` | Include util in sandbox load order | 0.5 d | Test fidelity |
| TD-M7 | Hash routing vs query params inconsistency | Brief uses query; explorer uses hash | Document convention; unify later | 1 d | DX |
| TD-M8 | Simulation architecture placeholders in advisor | `simulation-architecture.json` status | Keep architecture-only until product decision | — | Clarity |

---

## Low

| ID | Debt | Evidence | Recommendation | Effort | Impact |
|----|------|----------|----------------|--------|--------|
| TD-L1 | Page-local CSS islands remain | Brief/advisor style blocks | Move common patterns to foundation gradually | Ongoing | Consistency |
| TD-L2 | Inter + Cormorant via Google CDN | All cyber HTML | Self-host (ties to TD-H5) | 1 d | Privacy |
| TD-L3 | No visual regression / e2e suite | Smoke tests only | Playwright smoke for mount + hash | 2–3 d | Confidence |
| TD-L4 | Master architecture doc lagged cyber stack | Pre-WB8 runtime table | Updated in WB8 | Done | Docs |

---

## Temporary / placeholder inventory

| Area | Status | Migration note |
|------|--------|----------------|
| Mock ingestion connectors | Intentional | Replace with cited, rate-limited connectors behind consent |
| Sample inventories / profiles | Demo | User-owned local profiles remain primary |
| Pre-baked brief JSON | Demo convenience | Prefer runtime generation |
| Simulation “what if” UI | Architecture-only | Do not ship as live prediction |
| RF / Infrastructure workspaces | Catalog only | Reuse cyber patterns; do not fork |

---

## Completed in Work Block 8

- `wds-signalterrain-util.js` (`esc`, `loadJson`, hash helpers, `STORAGE_KEYS`)  
- Graph `entities` read-only + `listEntities()`  
- Removed unsafe `graph.entities =` reassignments  
- Fixed ingest HTML escaping  
- Shared `.st-cyber-nav` / list styles in foundation CSS  
- Aligned cyber peer links across brief/explorer/advisor/knowledge  

---

## Intentionally deferred

- Full ES module migration  
- Live connectors / auth  
- Indexed search engine  
- Graph visualization engine  
- End-to-end a11y automation  
- CSP headers in production hosting  
- Unifying brief query-param routing with hash panels  

Owner review required before commit.
